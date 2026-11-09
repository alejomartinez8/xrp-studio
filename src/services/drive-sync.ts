import { useSyncExternalStore } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DriveApi, { RemoteItem } from '@/services/drive-api';
import LocalDriveService, { FOLDER_MIME_TYPE, LocalDriveRecord } from '@/services/local-drive';
import { Constants } from '@/utils/constants';

/**
 * Drive sync (spec 005): projects live in the browser (LocalDriveService); while a Google account
 * is signed in, its space is copied to the XRPCode folder of that account's Drive.
 *
 * - Push: every change made in the app is uploaded a moment later. Folders go first; deleted files
 *   go to the Drive trash.
 * - Pull (on sign-in, when the network comes back, when the app is shown again and every minute
 *   while it is visible): files added or changed in Drive by another device are downloaded. A
 *   file that is open in an editor is left as it is until its tab is closed. When the same file changed here and there, the newer edit
 *   wins and there is a single file, without copies.
 */

/** What the cloud in the status bar shows. `off`: no account signed in. */
export type SyncStatus = 'off' | 'syncing' | 'synced' | 'offline';

/** Wait after the last change before uploading. */
export const SYNC_DELAY_MS = 2000;

/** How often the open app looks for changes made on other devices while it is visible. */
export const PULL_INTERVAL_MS = 60000;

/** Minimum time between two pulls started by the app being shown again. */
export const PULL_MIN_GAP_MS = 10000;

/** Wait before trying again after a failure, when the network does not come back first. */
export const SYNC_RETRY_MS = 30000;

type SyncOptions = {
    /** Called after a pull changed what the tree shows. */
    onRemoteChange: () => void;
    /** Whether a file is open in an editor, so a pull must not replace it under the user. */
    isOpen?: (recordId: string) => boolean;
};

type Session = { local: LocalDriveService; api: DriveApi; options: SyncOptions };

let session: Session | null = null;
let status: SyncStatus = 'off';
let loop: Promise<void> | null = null;
let requested = false;
let pullRequested = false;
let changeTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let lastPull = 0;
const listeners = new Set<() => void>();

function setStatus(next: SyncStatus): void {
    if (next !== status) {
        status = next;
        listeners.forEach((listener) => listener());
    }
}

function clearTimers(): void {
    if (changeTimer) {
        clearTimeout(changeTimer);
        changeTimer = null;
    }
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
    if (pullTimer) {
        clearInterval(pullTimer);
        pullTimer = null;
    }
}

const onOnline = () => void syncNow({ pull: true });

/** Pull when the app is visible, if the last pull was not just now. */
function pullIfVisible(gap = 0): void {
    if (document.visibilityState === 'visible' && Date.now() - lastPull >= gap) {
        void syncNow({ pull: true });
    }
}

const onShown = () => pullIfVisible(PULL_MIN_GAP_MS);

/**
 * Start syncing `local` (an account's space) with that account's Drive. Uploads changes as they
 * happen; call {@link syncNow} with `pull` to bring Drive's changes in.
 */
export function startSync(local: LocalDriveService, api: DriveApi, options: SyncOptions): void {
    stopSync();
    session = { local, api, options };
    local.onChange = () => {
        setStatus('syncing');
        if (changeTimer) {
            clearTimeout(changeTimer);
        }
        changeTimer = setTimeout(() => void syncNow(), SYNC_DELAY_MS);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onShown);
    document.addEventListener('visibilitychange', onShown);
    pullTimer = setInterval(() => pullIfVisible(), PULL_INTERVAL_MS);
    setStatus('syncing');
}

/** Stop syncing (sign-out). Changes not uploaded yet stay in the local records. */
export function stopSync(): void {
    if (session) {
        session.local.onChange = null;
    }
    session = null;
    requested = false;
    pullRequested = false;
    clearTimers();
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onShown);
    document.removeEventListener('visibilitychange', onShown);
    setStatus('off');
}

/** Sync now; resolves when nothing more is waiting. Requests made meanwhile join the same run. */
export function syncNow(options: { pull?: boolean } = {}): Promise<void> {
    if (!session) {
        return Promise.resolve();
    }
    requested = true;
    pullRequested ||= Boolean(options.pull);
    if (changeTimer) {
        clearTimeout(changeTimer);
        changeTimer = null;
    }
    loop ??= (async () => {
        while (requested && session) {
            requested = false;
            const pull = pullRequested;
            pullRequested = false;
            await runOnce(session, pull);
        }
    })().finally(() => {
        loop = null;
    });
    return loop;
}

/** Whether the open space has changes that are not in Drive yet. */
export async function hasUnsyncedChanges(local: LocalDriveService): Promise<boolean> {
    return (await local.allRecords()).some((r) => r.parents?.length && (r.dirty || r.deleted));
}

async function runOnce(current: Session, pull: boolean): Promise<void> {
    setStatus('syncing');
    try {
        const root = await linkRoot(current);
        if (pull) {
            lastPull = Date.now();
        }
        if (pull && (await pullChanges(current, root))) {
            current.options.onRemoteChange();
        }
        await pushChanges(current);
        if (session !== current) {
            return;
        }
        if (await hasUnsyncedChanges(current.local)) {
            scheduleRetry();
            setStatus('offline');
        } else {
            setStatus('synced');
        }
    } catch (error) {
        console.warn('Drive sync failed:', error);
        if (session === current) {
            scheduleRetry();
            setStatus('offline');
        }
    }
}

function scheduleRetry(): void {
    if (retryTimer) {
        return;
    }
    retryTimer = setTimeout(() => {
        retryTimer = null;
        void syncNow({ pull: true });
    }, SYNC_RETRY_MS);
}

/** The local XRPCode folder, linked to the account's XRPCode folder in Drive. */
async function linkRoot({ local, api }: Session): Promise<LocalDriveRecord> {
    const localRoot = await local.ensureRootFolder(Constants.XRPCODE);
    const record = (await local.getRecord(localRoot.id))!;
    if (record.driveId) {
        return record;
    }
    const remote = await api.ensureRoot(Constants.XRPCODE);
    const linked = { ...record, driveId: remote.id, syncedTime: remote.modifiedTime, dirty: false };
    await local.putRecord(linked);
    return linked;
}

/** Bring Drive's changes into the local records. Returns whether anything changed. */
async function pullChanges({ local, api, options }: Session, root: LocalDriveRecord) {
    const records = await local.allRecords();
    const byDriveId = new Map(records.filter((r) => r.driveId).map((r) => [r.driveId!, r]));
    const localIdOf = new Map(records.filter((r) => r.driveId).map((r) => [r.driveId!, r.id]));
    const seen = new Set([root.driveId!]);
    let changed = false;

    const fromRemote = async (item: RemoteItem, parent: string, id = uuidv4()) => {
        const record: LocalDriveRecord = {
            id,
            name: item.name,
            mimeType: item.mimeType,
            parents: [parent],
            createdTime: item.modifiedTime,
            modifiedTime: item.modifiedTime,
            content: item.mimeType === FOLDER_MIME_TYPE ? undefined : await api.download(item.id),
            driveId: item.id,
            syncedTime: item.modifiedTime,
            syncedParent: parent,
        };
        await local.putRecord(record);
        localIdOf.set(item.id, id);
        changed = true;
    };

    const queue = [root.driveId!];
    while (queue.length) {
        const folderId = queue.shift()!;
        const parent = localIdOf.get(folderId)!;
        for (const item of await api.listFolder(folderId)) {
            seen.add(item.id);
            const record = byDriveId.get(item.id);
            if (!record) {
                await fromRemote(item, parent);
            } else if (item.modifiedTime === record.syncedTime) {
                localIdOf.set(item.id, record.id);
            } else if (options.isOpen?.(record.id)) {
                localIdOf.set(item.id, record.id);
            } else if (record.deleted || !record.dirty) {
                await fromRemote(item, parent, record.id);
            } else if (item.mimeType === FOLDER_MIME_TYPE) {
                await local.putRecord({ ...record, syncedTime: item.modifiedTime });
                localIdOf.set(item.id, record.id);
            } else if (Date.parse(record.modifiedTime) > Date.parse(item.modifiedTime)) {
                await local.putRecord({ ...record, syncedTime: item.modifiedTime });
                localIdOf.set(item.id, record.id);
            } else {
                await fromRemote(item, parent, record.id);
            }
            if (item.mimeType === FOLDER_MIME_TYPE) {
                queue.push(item.id);
            }
        }
    }

    const current = await local.allRecords();
    const hasLocalWork = (id: string): boolean =>
        current.some(
            (r) =>
                r.parents?.includes(id) &&
                !r.deleted &&
                (r.dirty || !r.driveId || hasLocalWork(r.id)),
        );
    for (const record of current) {
        if (!record.driveId || !record.parents?.length || seen.has(record.driveId)) {
            continue;
        }
        if (options.isOpen?.(record.id)) {
            continue;
        }
        if (!record.deleted && (record.dirty || hasLocalWork(record.id))) {
            await local.putRecord({
                ...record,
                driveId: undefined,
                syncedTime: undefined,
                syncedParent: undefined,
                dirty: true,
            });
        } else {
            await local.removeRecord(record.id);
            changed = changed || !record.deleted;
        }
    }
    return changed;
}

/** Upload local changes: new and changed records (parents first), then deletions. */
async function pushChanges({ local, api }: Session): Promise<void> {
    const records = await local.allRecords();
    const byId = new Map(records.map((r) => [r.id, r]));
    const depth = (record: LocalDriveRecord): number => {
        let level = 0;
        let parent = record.parents?.[0];
        while (parent && level < 100) {
            level++;
            parent = byId.get(parent)?.parents?.[0];
        }
        return level;
    };

    const pending = records
        .filter((r) => r.parents?.length && !r.deleted && (r.dirty || !r.driveId))
        .sort((a, b) => depth(a) - depth(b));
    for (const record of pending) {
        const parent = byId.get(record.parents![0]);
        if (!parent?.driveId) {
            continue;
        }
        const isFolder = record.mimeType === FOLDER_MIME_TYPE;
        let item: RemoteItem;
        if (!record.driveId) {
            item = await api.create(record.name, record.mimeType, parent.driveId, record.content);
        } else {
            const moved = record.syncedParent && record.syncedParent !== parent.id;
            item = await api.update(record.driveId, {
                name: record.name,
                mimeType: record.mimeType,
                content: isFolder ? undefined : (record.content ?? ''),
                addParent: moved ? parent.driveId : undefined,
                removeParent: moved ? byId.get(record.syncedParent!)?.driveId : undefined,
            });
        }
        const now = await local.getRecord(record.id);
        if (!now) {
            await api.trash(item.id);
            continue;
        }
        const unchanged =
            !now.deleted &&
            now.name === record.name &&
            now.content === record.content &&
            now.parents?.[0] === record.parents![0];
        const synced: LocalDriveRecord = {
            ...now,
            driveId: item.id,
            syncedTime: item.modifiedTime,
            syncedParent: parent.id,
            dirty: !unchanged,
        };
        await local.putRecord(synced);
        byId.set(record.id, synced);
    }

    for (const record of records.filter((r) => r.deleted)) {
        if (record.driveId) {
            await api.trash(record.driveId);
        }
        await local.removeRecord(record.id);
    }
}

/** Current sync state, for the cloud in the status bar. */
export function useSyncStatus(): SyncStatus {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => status,
    );
}
