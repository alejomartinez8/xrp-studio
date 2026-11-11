import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import GoogleDriveService, { GoogleDriveFile } from '@/services/google-drive';

export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

/** A file or folder as stored in the browser. */
export interface LocalDriveRecord {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    createdTime: string;
    modifiedTime: string;
    content?: string;
    /** Id of the copy in the signed-in account's Drive, once uploaded. */
    driveId?: string;
    /** Drive's modified time of that copy when this record last matched it. */
    syncedTime?: string;
    /** Parent folder (local id) when this record last matched Drive, to detect moves. */
    syncedParent?: string;
    /** Changed in this browser and not uploaded yet. */
    dirty?: boolean;
    /** Deleted for good in this browser; kept until sync deletes the copy in Drive. */
    deleted?: boolean;
    /** In the trash. Whatever is inside a trashed folder is hidden with it. */
    trashed?: boolean;
    /** When it went to the trash. */
    trashedTime?: string;
    /** Whether the copy in Drive was in the trash when this record last matched it. */
    syncedTrashed?: boolean;
    /** Archived: hidden from the tree without being deleted. */
    archived?: boolean;
    /** When it was archived. */
    archivedTime?: string;
    /** Whether the copy in Drive was archived when this record last matched it. */
    syncedArchived?: boolean;
}

/** An item in the trash, with the time it went there. */
export type TrashItem = GoogleDriveFile & { trashedTime?: string };

/** An archived project, with the time it was archived. */
export type ArchivedItem = GoogleDriveFile & { archivedTime?: string };

/** Days an item stays in the trash before it is deleted for good, as in Google Drive. */
export const TRASH_DAYS = 30;

/** Persistence backend for LocalDriveService (IndexedDB in the app, memory in tests). */
export interface LocalDriveStore {
    loadAll(): Promise<LocalDriveRecord[]>;
    put(record: LocalDriveRecord): Promise<void>;
    delete(id: string): Promise<void>;
}

/** Database of the guest space: the projects of whoever uses the app without signing in. */
export const GUEST_DB_NAME = 'xrp-studio';
const DB_VERSION = 1;
const STORE_NAME = 'drive';

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Blob.text() with a FileReader fallback (jsdom lacks Blob.text). */
function blobToText(blob: Blob): Promise<string> {
    if (typeof blob.text === 'function') {
        return blob.text();
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
    });
}

/** IndexedDB-backed store: projects survive reloads and work without a network. */
export class IndexedDbDriveStore implements LocalDriveStore {
    private _db: Promise<IDBDatabase> | null = null;
    private _name: string;

    /** @param name database name: the guest space, or one per signed-in account */
    constructor(name: string = GUEST_DB_NAME) {
        this._name = name;
    }

    /** Close the connection, so the database can be deleted. */
    async close(): Promise<void> {
        if (this._db) {
            (await this._db).close();
            this._db = null;
        }
    }

    private db(): Promise<IDBDatabase> {
        if (!this._db) {
            this._db = new Promise((resolve, reject) => {
                const request = indexedDB.open(this._name, DB_VERSION);
                request.onupgradeneeded = () => {
                    request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return this._db;
    }

    private async objectStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
        return (await this.db()).transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    }

    async loadAll(): Promise<LocalDriveRecord[]> {
        return requestToPromise((await this.objectStore('readonly')).getAll());
    }

    async put(record: LocalDriveRecord): Promise<void> {
        await requestToPromise((await this.objectStore('readwrite')).put(record));
    }

    async delete(id: string): Promise<void> {
        await requestToPromise((await this.objectStore('readwrite')).delete(id));
    }
}

/** Delete a whole database (an account's space on this device). */
export function deleteDriveDatabase(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onblocked = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/** In-memory store, used by tests. */
export class MemoryDriveStore implements LocalDriveStore {
    private _records = new Map<string, LocalDriveRecord>();

    async loadAll(): Promise<LocalDriveRecord[]> {
        return [...this._records.values()].map((r) => ({ ...r }));
    }

    async put(record: LocalDriveRecord): Promise<void> {
        this._records.set(record.id, { ...record });
    }

    async delete(id: string): Promise<void> {
        this._records.delete(id);
    }
}

/**
 * LocalDriveService - a drop-in replacement for GoogleDriveService that keeps files in the
 * browser instead of Google Drive, so the existing "Google Drive" code paths (file tree, open,
 * save, autosave, run) work without an account or a network.
 *
 * Every change marks the record `dirty` and notifies {@link onChange}; Drive sync
 * uploads it. A deleted record that has a copy in Drive stays as a hidden `deleted` record until
 * sync moves that copy to the Drive trash. {@link useStore} switches between the guest space and
 * a signed-in account's space.
 */
class LocalDriveService extends GoogleDriveService {
    private _store: LocalDriveStore;
    private _records: Map<string, LocalDriveRecord> | null = null;
    private _loading: Promise<Map<string, LocalDriveRecord>> | null = null;
    private _localLogger = logger.child({ module: 'localdrive' });
    private _rootFolders = new Map<string, Promise<GoogleDriveFile>>();
    /** Called after each change made through the app (not by sync). */
    onChange: (() => void) | null = null;

    constructor(store: LocalDriveStore = new IndexedDbDriveStore()) {
        super();
        this._store = store;
        this.setAccessToken('local');
    }

    /** The store in use. */
    get store(): LocalDriveStore {
        return this._store;
    }

    /** Use another store (another account's space) from now on. */
    useStore(store: LocalDriveStore): void {
        this._store = store;
        this._records = null;
        this._loading = null;
        this._rootFolders.clear();
    }

    /** Every record, deleted ones included (for sync). */
    async allRecords(): Promise<LocalDriveRecord[]> {
        return [...(await this.records()).values()].map((r) => ({ ...r }));
    }

    /** One record, deleted or not (for sync). */
    async getRecord(id: string): Promise<LocalDriveRecord | undefined> {
        const record = (await this.records()).get(id);
        return record ? { ...record } : undefined;
    }

    /** Store a record as given, without marking it changed (for sync). */
    async putRecord(record: LocalDriveRecord): Promise<void> {
        (await this.records()).set(record.id, { ...record });
        await this._store.put({ ...record });
    }

    /** Remove a record for good, without marking anything changed (for sync). */
    async removeRecord(id: string): Promise<void> {
        (await this.records()).delete(id);
        await this._store.delete(id);
    }

    /** Records the app can see: everything but deleted, trashed and archived ones. */
    private async visible(): Promise<LocalDriveRecord[]> {
        return [...(await this.records()).values()].filter(
            (r) => !r.deleted && !r.trashed && !r.archived,
        );
    }

    /** Store a change made through the app: marks it for upload and notifies the listener. */
    private async change(record: LocalDriveRecord): Promise<void> {
        await this.save({ ...record, dirty: true });
        this.onChange?.();
    }

    private async records(): Promise<Map<string, LocalDriveRecord>> {
        if (this._records) {
            return this._records;
        }
        if (!this._loading) {
            this._loading = this._store.loadAll().then((all) => {
                this._records = new Map(all.map((r) => [r.id, r]));
                return this._records;
            });
        }
        return this._loading;
    }

    private async save(record: LocalDriveRecord): Promise<void> {
        (await this.records()).set(record.id, record);
        await this._store.put(record);
    }

    private toDriveFile(record: LocalDriveRecord): GoogleDriveFile {
        return {
            id: record.id,
            name: record.name,
            mimeType: record.mimeType,
            kind: 'drive#file',
            parents: record.parents,
            createdTime: record.createdTime,
            modifiedTime: record.modifiedTime,
        };
    }

    private async create(
        name: string,
        mimeType: string,
        parentFolderId?: string,
        content?: string,
    ): Promise<LocalDriveRecord> {
        const now = new Date().toISOString();
        const record: LocalDriveRecord = {
            id: uuidv4(),
            name,
            mimeType,
            parents: parentFolderId ? [parentFolderId] : undefined,
            createdTime: now,
            modifiedTime: now,
            content,
            dirty: true,
        };
        await this.change(record);
        return record;
    }

    async createFolder(
        folderName: string,
        parentFolderId?: string,
    ): Promise<GoogleDriveFile | null> {
        return this.toDriveFile(await this.create(folderName, FOLDER_MIME_TYPE, parentFolderId));
    }

    /**
     * ensureRootFolder - find or create a top-level folder. Concurrent calls share one promise so
     * React StrictMode's double mount cannot create the root twice.
     */
    ensureRootFolder(folderName: string): Promise<GoogleDriveFile> {
        if (!this._rootFolders.has(folderName)) {
            this._rootFolders.set(
                folderName,
                (async () =>
                    (await this.findFolderByName(folderName)) ??
                    (await this.createFolder(folderName))!)(),
            );
        }
        return this._rootFolders.get(folderName)!;
    }

    async getFileListByFolderId(folderId: string): Promise<GoogleDriveFile[]> {
        return (await this.visible())
            .filter((r) => r.parents?.includes(folderId))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => this.toDriveFile(r));
    }

    /** Find a folder by name; without a parent, a top-level folder (like the XRPCode root) wins. */
    async findFolderByName(
        folderName: string,
        parentFolderId?: string,
    ): Promise<GoogleDriveFile | null> {
        const folders = (await this.visible()).filter(
            (r) => r.mimeType === FOLDER_MIME_TYPE && r.name === folderName,
        );
        const match = parentFolderId
            ? folders.find((r) => r.parents?.includes(parentFolderId))
            : (folders.find((r) => !r.parents?.length) ?? folders[0]);
        return match ? this.toDriveFile(match) : null;
    }

    async getFolderName(folderId: string): Promise<string | null> {
        const record = (await this.records()).get(folderId);
        return record && !record.deleted ? record.name : null;
    }

    async downloadFile(
        fileId: string,
        downloadFileName?: string,
    ): Promise<{ blob: Blob; fileName: string; mimeType: string } | null> {
        const record = (await this.records()).get(fileId);
        if (!record || record.deleted) {
            this._localLogger.error(`File not found: ${fileId}`);
            return null;
        }
        return {
            blob: new Blob([record.content ?? ''], { type: record.mimeType }),
            fileName: downloadFileName || record.name,
            mimeType: record.mimeType,
        };
    }

    async getFileContents(fileId: string): Promise<string | null> {
        const record = (await this.records()).get(fileId);
        return record && !record.deleted ? (record.content ?? '') : null;
    }

    async uploadFile(
        fileBlob: Blob,
        fileName: string,
        mimeType: string,
        parentFolderId?: string,
    ): Promise<{ id: string; name: string; mimeType: string } | null> {
        const record = await this.create(
            fileName,
            mimeType,
            parentFolderId,
            await blobToText(fileBlob),
        );
        return { id: record.id, name: record.name, mimeType: record.mimeType };
    }

    async upsertFileToGoogleDrive(
        fileBlob: Blob,
        fileName: string,
        mimeType: string,
        existingFileId?: string,
        parentFolderId?: string,
    ): Promise<GoogleDriveFile | null> {
        const existing = existingFileId ? (await this.records()).get(existingFileId) : undefined;
        if (!existing || existing.deleted) {
            const created = await this.create(
                fileName,
                mimeType,
                parentFolderId,
                await blobToText(fileBlob),
            );
            return this.toDriveFile(created);
        }
        const updated: LocalDriveRecord = {
            ...existing,
            name: fileName,
            mimeType,
            content: await blobToText(fileBlob),
            modifiedTime: new Date().toISOString(),
        };
        await this.change(updated);
        return this.toDriveFile(updated);
    }

    async renameFile(fileId: string, newName: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (record && !record.deleted) {
            await this.change({ ...record, name: newName, modifiedTime: new Date().toISOString() });
        }
    }

    /**
     * Delete a file, or a folder and everything inside it, like Google Drive. A record with a copy
     * in Drive is kept, hidden, until sync moves that copy to the Drive trash.
     */
    async DeleteFile(fileId: string): Promise<void> {
        await this.deleteTree(fileId);
        this.onChange?.();
    }

    private async deleteTree(fileId: string): Promise<void> {
        const records = await this.records();
        for (const child of [...records.values()].filter((r) => r.parents?.includes(fileId))) {
            await this.deleteTree(child.id);
        }
        const record = records.get(fileId);
        if (record?.driveId) {
            await this.save({ ...record, deleted: true, dirty: true });
        } else {
            records.delete(fileId);
            await this._store.delete(fileId);
        }
    }

    /** Move a file or folder to the trash; a folder takes everything inside it along. */
    async trashFile(fileId: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (record && !record.deleted && !record.trashed) {
            await this.change({ ...record, trashed: true, trashedTime: new Date().toISOString() });
        }
    }

    /**
     * What is in the trash, newest first. Items trashed more than {@link TRASH_DAYS} days ago are
     * deleted for good first.
     */
    async trashItems(now: number = Date.now()): Promise<TrashItem[]> {
        const all = [...(await this.records()).values()].filter((r) => r.trashed && !r.deleted);
        const limit = now - TRASH_DAYS * 24 * 60 * 60 * 1000;
        const expired = all.filter((r) => Date.parse(r.trashedTime ?? '') < limit);
        for (const record of expired) {
            await this.DeleteFile(record.id);
        }
        return all
            .filter((r) => !expired.includes(r))
            .sort((a, b) => (b.trashedTime ?? '').localeCompare(a.trashedTime ?? ''))
            .map((r) => ({ ...this.toDriveFile(r), trashedTime: r.trashedTime }));
    }

    /**
     * Take an item out of the trash. It goes back to its folder, or to the top folder when that
     * folder is gone or hidden too; a name already used there gets a number.
     */
    async restoreFile(fileId: string, rootId: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (record?.trashed && !record.deleted) {
            await this.putBack(record, rootId, { trashed: false, trashedTime: undefined });
        }
    }

    /** Archive a project: hide it from the tree without deleting it, until it is unarchived. */
    async archiveFile(fileId: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (record && !record.deleted && !record.trashed && !record.archived) {
            await this.change({
                ...record,
                archived: true,
                archivedTime: new Date().toISOString(),
            });
        }
    }

    /** Archived projects (not in the trash), newest first. */
    async archivedItems(): Promise<ArchivedItem[]> {
        return [...(await this.records()).values()]
            .filter((r) => r.archived && !r.deleted && !r.trashed)
            .sort((a, b) => (b.archivedTime ?? '').localeCompare(a.archivedTime ?? ''))
            .map((r) => ({ ...this.toDriveFile(r), archivedTime: r.archivedTime }));
    }

    /** Bring an archived project back to the tree, the way {@link restoreFile} does. */
    async unarchiveFile(fileId: string, rootId: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (record?.archived && !record.deleted) {
            await this.putBack(record, rootId, { archived: false, archivedTime: undefined });
        }
    }

    /**
     * Show a hidden record again with `patch` applied: in its folder, or in the top folder when
     * that folder is gone or hidden; a name already used there gets a number.
     */
    private async putBack(
        record: LocalDriveRecord,
        rootId: string,
        patch: Partial<LocalDriveRecord>,
    ): Promise<void> {
        const records = await this.records();
        const reachable = (id: string | undefined): boolean => {
            const folder = id ? records.get(id) : undefined;
            if (!folder || folder.deleted || folder.trashed || folder.archived) {
                return false;
            }
            return !folder.parents?.length || reachable(folder.parents[0]);
        };
        const parent = reachable(record.parents?.[0]) ? record.parents![0] : rootId;
        const taken = new Set(
            (await this.visible()).filter((r) => r.parents?.includes(parent)).map((r) => r.name),
        );
        await this.change({
            ...record,
            ...patch,
            name: freeName(record.name, taken),
            parents: [parent],
        });
    }

    async moveFile(fileId: string, oldParentId: string, newParentId: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (!record || record.deleted) {
            throw new Error(`File not found: ${fileId}`);
        }
        const parents = (record.parents ?? []).filter((p) => p !== oldParentId);
        await this.change({ ...record, parents: [...parents, newParentId] });
    }
}

/** `name`, or `name (2).ext`, `name (3).ext`… when it is taken. */
function freeName(name: string, taken: Set<string>): string {
    if (!taken.has(name)) {
        return name;
    }
    const dot = name.lastIndexOf('.');
    const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
    let n = 2;
    while (taken.has(`${base} (${n})${ext}`)) {
        n++;
    }
    return `${base} (${n})${ext}`;
}

export default LocalDriveService;
