import i18n from 'i18next';
import AppMgr from '@/managers/appmgr';
import EditorMgr from '@/managers/editormgr';
import { UserProfile } from '@/services/google-auth';
import LocalDriveService, {
    FOLDER_MIME_TYPE,
    GUEST_DB_NAME,
    IndexedDbDriveStore,
    LocalDriveStore,
    deleteDriveDatabase,
} from '@/services/local-drive';
import { hasUnsyncedChanges, startSync, stopSync, syncNow } from '@/services/drive-sync';
import { ask } from '@/utils/ask';
import { flushAutosave } from '@/utils/autosave';
import { Constants } from '@/utils/constants';
import { fireGoogleUserTree, getUsernameFromEmail } from '@/utils/google-utils';
import { StorageKeys } from '@/utils/localstorage';
import { isDriveSyncEnabled } from '@/utils/offline';

/**
 * Accounts on this device (spec 005). Each one has its own space of projects (an IndexedDB
 * database); without an account the device's guest space is used.
 *
 * - The device setting "Keep me signed in" ({@link isKeepSignedIn}, off by default, in the
 *   settings menu) tells whether the device is the user's own. Off, the device counts as shared:
 *   the session is not remembered, it ends after {@link IDLE_SIGN_OUT_MS} without use, and the
 *   projects are removed from the device when it ends, or the next time the app opens if it was
 *   closed without signing out. On, the session is remembered and the projects stay. A teacher
 *   sets it once for the device.
 * - Signing out uploads what is left, warns when that is not possible, and removes the account's
 *   projects from this device. They stay in Drive and come back at the next sign-in.
 */

/** Time without use after which a shared device signs out. */
export const IDLE_SIGN_OUT_MS = 30 * 60 * 1000;

type ActiveAccount = { profile: UserProfile; shared: boolean };

type Dependencies = {
    makeStore: (name: string) => LocalDriveStore;
    deleteDatabase: (name: string) => Promise<void>;
};

const defaults: Dependencies = {
    makeStore: (name) => new IndexedDbDriveStore(name),
    deleteDatabase: deleteDriveDatabase,
};
let deps = defaults;

/** The space that is open: an account id, or '' for the guest space. */
let openSpaceId = '';
let startupDone = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let idleSignOut: (() => void) | null = null;

/** Database of an account's space. */
export function accountDatabase(id: string): string {
    return `${GUEST_DB_NAME}-${id}`;
}

function readJson<T>(key: string): T | null {
    try {
        const value = localStorage.getItem(key);
        return value ? (JSON.parse(value) as T) : null;
    } catch {
        return null;
    }
}

function readActive(): ActiveAccount | null {
    return readJson<ActiveAccount>(StorageKeys.ACCOUNT);
}

function writeActive(active: ActiveAccount | null): void {
    if (active) {
        localStorage.setItem(StorageKeys.ACCOUNT, JSON.stringify(active));
    } else {
        localStorage.removeItem(StorageKeys.ACCOUNT);
    }
}

/** Whether the device keeps the session and the projects (its own device); off by default. */
export function isKeepSignedIn(): boolean {
    try {
        return localStorage.getItem(StorageKeys.KEEP_SIGNED_IN) === 'on';
    } catch {
        return false;
    }
}

/**
 * Turns "Keep me signed in" on or off. It applies to the open session too: off starts the idle
 * sign-out and marks the projects to be removed when the session ends; on stops both.
 */
export function setKeepSignedIn(on: boolean): void {
    localStorage.setItem(StorageKeys.KEEP_SIGNED_IN, on ? 'on' : 'off');
    const active = readActive();
    if (!isDriveSyncEnabled || !active || active.shared === !on) {
        return;
    }
    writeActive({ profile: active.profile, shared: !on });
    if (on) {
        stopIdleTimer();
    } else {
        localStorage.removeItem(StorageKeys.GOOGLE_SESSION);
        startIdleTimer();
    }
}

function local(): LocalDriveService {
    return AppMgr.getInstance().driveService as LocalDriveService;
}

/** The account whose projects are shown, or null for the guest space. */
export function getActiveAccount(): UserProfile | null {
    return isDriveSyncEnabled ? (readActive()?.profile ?? null) : null;
}

/** Remove the tabs of project files (they belong to the space being closed). */
function closeProjectTabs(): void {
    const editors = EditorMgr.getInstance();
    for (const session of [...editors.getAllEditorSessions().values()]) {
        if (session.gpath) {
            editors.RemoveEditorTab(session.id);
            editors.RemoveEditor(session.id);
        }
    }
}

/** Open another space; `closeTabs` saves and closes the tabs of the space being left. */
async function openSpace(id: string, closeTabs = true): Promise<void> {
    if (openSpaceId === id) {
        return;
    }
    if (closeTabs) {
        await flushAutosave().catch(() => undefined);
        closeProjectTabs();
    }
    const previous = local().store;
    local().useStore(deps.makeStore(id ? accountDatabase(id) : GUEST_DB_NAME));
    if (previous instanceof IndexedDbDriveStore) {
        await previous.close();
    }
    openSpaceId = id;
}

/** Remove the editor tabs of project files kept for the next visit, before they are reopened. */
function forgetStoredProjectTabs(): void {
    const stored = readJson<{ gpath?: string }[]>(StorageKeys.EDITORSTORE);
    if (stored) {
        localStorage.setItem(
            StorageKeys.EDITORSTORE,
            JSON.stringify(stored.filter((tab) => !tab.gpath)),
        );
    }
}

/**
 * On startup, before the editor tabs are restored: when the app was closed on a shared device
 * without signing out, end that session and remove its projects and open tabs from this device.
 */
export function startAccounts(): void {
    const active = readActive();
    if (!isDriveSyncEnabled || !active?.shared) {
        return;
    }
    forgetStoredProjectTabs();
    writeActive(null);
    void deps.deleteDatabase(accountDatabase(active.profile.id)).catch(() => undefined);
    void AppMgr.getInstance().authService.logOut();
}

/**
 * Open the space of the account remembered on this device (own device), so its projects are there
 * even before the session is restored or without a network. Returns that account, or null for the
 * guest space.
 */
export async function openActiveSpace(): Promise<UserProfile | null> {
    if (!isDriveSyncEnabled) {
        return null;
    }
    const active = readActive();
    await openSpace(active?.profile.id ?? '', startupDone);
    startupDone = true;
    return active?.profile ?? null;
}

/** "cuadrado.py" → "cuadrado (this device).py": this device's copy when a file changed in both. */
export function conflictName(name: string): string {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    return `${base} (${i18n.t('account.thisDevice')})${ext}`;
}

/** Offer to move the guest space's projects into the account that just signed in. */
async function offerGuestProjects(): Promise<void> {
    const guest = deps.makeStore(GUEST_DB_NAME);
    const records = await guest.loadAll();
    const guestRoot = records.find((r) => !r.parents?.length && r.name === Constants.XRPCODE);
    const items = records.filter((r) => r.parents?.length);
    const files = items.filter((r) => r.mimeType !== FOLDER_MIME_TYPE).length;
    if (files > 0) {
        const choice = await ask({
            title: 'account.moveTitle',
            message: 'account.moveMessage',
            values: { count: String(files) },
            choices: [
                { value: 'move', label: 'account.moveYes', primary: true },
                { value: 'keep', label: 'account.moveNo' },
            ],
        });
        if (choice === 'move') {
            const root = await local().ensureRootFolder(Constants.XRPCODE);
            for (const record of items) {
                await local().putRecord({
                    ...record,
                    parents: record.parents!.map((p) => (p === guestRoot?.id ? root.id : p)),
                    dirty: true,
                });
            }
            for (const record of items) {
                await guest.delete(record.id);
            }
        }
    }
    if (guest instanceof IndexedDbDriveStore) {
        await guest.close();
    }
}

function resetIdleTimer(): void {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => idleSignOut?.(), IDLE_SIGN_OUT_MS);
}

function startIdleTimer(): void {
    window.addEventListener('pointerdown', resetIdleTimer, { passive: true });
    window.addEventListener('keydown', resetIdleTimer, { passive: true });
    resetIdleTimer();
}

function stopIdleTimer(): void {
    window.removeEventListener('pointerdown', resetIdleTimer);
    window.removeEventListener('keydown', resetIdleTimer);
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
}

/** What runs when a shared device has not been used for a while (the sign-in widget's sign-out). */
export function setIdleSignOut(handler: (() => void) | null): void {
    idleSignOut = handler;
}

/**
 * A Google account signed in: open the account's space (the session is kept or not following
 * {@link isKeepSignedIn}), offer the guest projects, and start syncing with its Drive.
 */
export async function enterAccount(profile: UserProfile): Promise<void> {
    if (!isDriveSyncEnabled) {
        return;
    }
    const shared = !isKeepSignedIn();
    writeActive({ profile, shared });
    if (shared) {
        localStorage.removeItem(StorageKeys.GOOGLE_SESSION);
        startIdleTimer();
    }
    const fromGuest = openSpaceId === '';
    await openSpace(profile.id);
    await local().ensureRootFolder(Constants.XRPCODE);
    if (fromGuest) {
        await offerGuestProjects();
    }
    const username = getUsernameFromEmail(profile.email) ?? '';
    startSync(local(), AppMgr.getInstance().remoteDriveService, {
        conflictName,
        onRemoteChange: () => void fireGoogleUserTree(username),
    });
    void syncNow({ pull: true });
}

/**
 * Sign the account out of this device: upload what is left (asking first when that is not
 * possible), then remove its projects from this device and open the guest space. Returns false
 * when the user chose to stay signed in.
 */
export async function leaveAccount(): Promise<boolean> {
    const active = readActive();
    if (!isDriveSyncEnabled || !active) {
        return true;
    }
    await flushAutosave().catch(() => undefined);
    await syncNow();
    if (await hasUnsyncedChanges(local())) {
        const choice = await ask({
            title: 'account.unsyncedTitle',
            message: 'account.unsyncedMessage',
            choices: [
                { value: 'stay', label: 'account.unsyncedStay', primary: true },
                { value: 'leave', label: 'account.unsyncedLeave' },
            ],
        });
        if (choice === 'stay') {
            return false;
        }
    }
    stopSync();
    stopIdleTimer();
    AppMgr.getInstance().remoteDriveService.clearToken();
    await openSpace('');
    await deps.deleteDatabase(accountDatabase(active.profile.id)).catch(() => undefined);
    writeActive(null);
    return true;
}

/** Use other stores in tests, and reset the module state. */
export function setAccountDependencies(next: Partial<Dependencies> | null): void {
    deps = next ? { ...defaults, ...next } : defaults;
    openSpaceId = '';
    startupDone = false;
    idleSignOut = null;
    stopIdleTimer();
}
