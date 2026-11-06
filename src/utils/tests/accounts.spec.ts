import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOLDER_MIME_TYPE, GUEST_DB_NAME, MemoryDriveStore } from '@/services/local-drive';
import { StorageKeys } from '@/utils/localstorage';

const ask = vi.fn();
const sync = {
    startSync: vi.fn(),
    stopSync: vi.fn(),
    syncNow: vi.fn(() => Promise.resolve()),
    hasUnsyncedChanges: vi.fn(() => Promise.resolve(false)),
};

vi.mock('@/utils/offline', () => ({
    isOfflineBuild: false,
    isLocalProjectsEnabled: true,
    isDriveSyncEnabled: true,
}));
vi.mock('@/utils/ask', () => ({ ask }));
vi.mock('@/services/drive-sync', () => sync);
vi.mock('@/utils/autosave', () => ({ flushAutosave: vi.fn(() => Promise.resolve()) }));
vi.mock('@/utils/google-utils', () => ({
    fireGoogleUserTree: vi.fn(),
    getUsernameFromEmail: (email: string) => email.split('@')[0],
}));

const { default: AppMgr } = await import('@/managers/appmgr');
const accounts = await import('@/utils/accounts');

const profile = { id: 'ana', email: 'ana@example.com', name: 'Ana', picture: '' };

describe('accounts', () => {
    let stores: Map<string, MemoryDriveStore>;
    let deleted: string[];

    beforeEach(() => {
        localStorage.clear();
        stores = new Map();
        deleted = [];
        accounts.setAccountDependencies({
            makeStore: (name) => {
                if (!stores.has(name)) {
                    stores.set(name, new MemoryDriveStore());
                }
                return stores.get(name)!;
            },
            deleteDatabase: async (name) => {
                deleted.push(name);
                stores.delete(name);
            },
        });
        ask.mockReset();
        Object.values(sync).forEach((fn) => fn.mockClear());
    });

    afterEach(() => {
        accounts.setAccountDependencies(null);
        vi.useRealTimers();
    });

    it('keeps the session on a device set to keep it signed in, without asking', async () => {
        await accounts.openActiveSpace();
        accounts.setKeepSignedIn(true);
        await accounts.enterAccount(profile);

        expect(ask).not.toHaveBeenCalled();
        expect(accounts.getActiveAccount()).toEqual(profile);
        expect(stores.has(accounts.accountDatabase('ana'))).toBe(true);
        expect(sync.startSync).toHaveBeenCalled();
        expect(sync.syncNow).toHaveBeenCalledWith({ pull: true });
        expect(JSON.parse(localStorage.getItem(StorageKeys.ACCOUNT)!).shared).toBe(false);
    });

    it('treats the device as shared by default: forgets the session and signs out after a while', async () => {
        vi.useFakeTimers();
        const signOut = vi.fn();
        accounts.setIdleSignOut(signOut);
        localStorage.setItem(StorageKeys.GOOGLE_SESSION, '1');
        expect(accounts.isKeepSignedIn()).toBe(false);
        await accounts.enterAccount(profile);

        expect(ask).not.toHaveBeenCalled();
        expect(localStorage.getItem(StorageKeys.GOOGLE_SESSION)).toBeNull();
        vi.advanceTimersByTime(accounts.IDLE_SIGN_OUT_MS - 1000);
        window.dispatchEvent(new Event('pointerdown'));
        vi.advanceTimersByTime(accounts.IDLE_SIGN_OUT_MS - 1000);
        expect(signOut).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(signOut).toHaveBeenCalledTimes(1);
    });

    it('applies the switch to the open session', async () => {
        vi.useFakeTimers();
        const signOut = vi.fn();
        accounts.setIdleSignOut(signOut);
        await accounts.enterAccount(profile);
        expect(JSON.parse(localStorage.getItem(StorageKeys.ACCOUNT)!).shared).toBe(true);

        accounts.setKeepSignedIn(true);
        expect(JSON.parse(localStorage.getItem(StorageKeys.ACCOUNT)!).shared).toBe(false);
        vi.advanceTimersByTime(accounts.IDLE_SIGN_OUT_MS + 1000);
        expect(signOut).not.toHaveBeenCalled();

        accounts.setKeepSignedIn(false);
        expect(JSON.parse(localStorage.getItem(StorageKeys.ACCOUNT)!).shared).toBe(true);
        vi.advanceTimersByTime(accounts.IDLE_SIGN_OUT_MS + 1000);
        expect(signOut).toHaveBeenCalledTimes(1);
    });

    it('moves the guest projects into the account when the user accepts', async () => {
        const guest = new MemoryDriveStore();
        stores.set(GUEST_DB_NAME, guest);
        const times = { createdTime: 't', modifiedTime: 't' };
        await guest.put({ id: 'g-root', name: 'XRPCode', mimeType: FOLDER_MIME_TYPE, ...times });
        await guest.put({
            id: 'g-file',
            name: 'car.py',
            mimeType: 'text/x-python',
            parents: ['g-root'],
            content: 'x',
            ...times,
        });
        ask.mockResolvedValueOnce('move');
        await accounts.enterAccount(profile);

        expect(ask).toHaveBeenLastCalledWith(
            expect.objectContaining({ title: 'account.moveTitle', values: { count: '1' } }),
        );
        const records = await stores.get(accounts.accountDatabase('ana'))!.loadAll();
        const root = records.find((r) => r.name === 'XRPCode')!;
        expect(records.find((r) => r.id === 'g-file')).toMatchObject({
            parents: [root.id],
            dirty: true,
        });
        expect((await guest.loadAll()).map((r) => r.id)).toEqual(['g-root']);
    });

    it('asks before signing out with changes not uploaded, and removes the copy on leave', async () => {
        await accounts.enterAccount(profile);
        sync.hasUnsyncedChanges.mockResolvedValue(true);

        ask.mockResolvedValueOnce('stay');
        expect(await accounts.leaveAccount()).toBe(false);
        expect(accounts.getActiveAccount()).toEqual(profile);

        ask.mockResolvedValueOnce('leave');
        expect(await accounts.leaveAccount()).toBe(true);
        expect(sync.stopSync).toHaveBeenCalled();
        expect(deleted).toEqual([accounts.accountDatabase('ana')]);
        expect(accounts.getActiveAccount()).toBeNull();
        sync.hasUnsyncedChanges.mockResolvedValue(false);
    });

    it('clears a shared session left open when the app was closed', () => {
        const logOut = vi.spyOn(AppMgr.getInstance().authService, 'logOut').mockResolvedValue();
        localStorage.setItem(StorageKeys.ACCOUNT, JSON.stringify({ profile, shared: true }));
        localStorage.setItem(
            StorageKeys.EDITORSTORE,
            JSON.stringify([{ id: '1', gpath: '/XRPCode/a.py' }, { id: '2' }]),
        );
        accounts.startAccounts();

        expect(JSON.parse(localStorage.getItem(StorageKeys.EDITORSTORE)!)).toEqual([{ id: '2' }]);
        expect(accounts.getActiveAccount()).toBeNull();
        expect(deleted).toEqual([accounts.accountDatabase('ana')]);
        expect(logOut).toHaveBeenCalled();
    });

    it('names this device’s copy of a file that changed in both places', () => {
        expect(accounts.conflictName('square.py')).toMatch(/^square \(.+\)\.py$/);
        expect(accounts.conflictName('README')).toMatch(/^README \(.+\)$/);
    });
});
