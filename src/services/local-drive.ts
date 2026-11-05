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
}

/** Persistence backend for LocalDriveService (IndexedDB in the app, memory in tests). */
export interface LocalDriveStore {
    loadAll(): Promise<LocalDriveRecord[]>;
    put(record: LocalDriveRecord): Promise<void>;
    delete(id: string): Promise<void>;
}

const DB_NAME = 'xrp-studio';
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

    private db(): Promise<IDBDatabase> {
        if (!this._db) {
            this._db = new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
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
 * browser instead of Google Drive. Used by offline builds so the existing "Google Drive"
 * code paths (file tree, open, save, autosave, run) work without an account or a network.
 */
class LocalDriveService extends GoogleDriveService {
    private _store: LocalDriveStore;
    private _records: Map<string, LocalDriveRecord> | null = null;
    private _loading: Promise<Map<string, LocalDriveRecord>> | null = null;
    private _localLogger = logger.child({ module: 'localdrive' });
    private _rootFolders = new Map<string, Promise<GoogleDriveFile>>();

    constructor(store: LocalDriveStore = new IndexedDbDriveStore()) {
        super();
        this._store = store;
        this.setAccessToken('local');
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
        };
        await this.save(record);
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
        const records = await this.records();
        return [...records.values()]
            .filter((r) => r.parents?.includes(folderId))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => this.toDriveFile(r));
    }

    /** Find a folder by name; without a parent, a top-level folder (like the XRPCode root) wins. */
    async findFolderByName(
        folderName: string,
        parentFolderId?: string,
    ): Promise<GoogleDriveFile | null> {
        const folders = [...(await this.records()).values()].filter(
            (r) => r.mimeType === FOLDER_MIME_TYPE && r.name === folderName,
        );
        const match = parentFolderId
            ? folders.find((r) => r.parents?.includes(parentFolderId))
            : (folders.find((r) => !r.parents?.length) ?? folders[0]);
        return match ? this.toDriveFile(match) : null;
    }

    async getFolderName(folderId: string): Promise<string | null> {
        return (await this.records()).get(folderId)?.name ?? null;
    }

    async downloadFile(
        fileId: string,
        downloadFileName?: string,
    ): Promise<{ blob: Blob; fileName: string; mimeType: string } | null> {
        const record = (await this.records()).get(fileId);
        if (!record) {
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
        return record ? (record.content ?? '') : null;
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
        if (!existing) {
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
        await this.save(updated);
        return this.toDriveFile(updated);
    }

    async renameFile(fileId: string, newName: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (record) {
            await this.save({ ...record, name: newName, modifiedTime: new Date().toISOString() });
        }
    }

    /** Delete a file, or a folder and everything inside it, like Google Drive. */
    async DeleteFile(fileId: string): Promise<void> {
        const records = await this.records();
        for (const child of [...records.values()].filter((r) => r.parents?.includes(fileId))) {
            await this.DeleteFile(child.id);
        }
        records.delete(fileId);
        await this._store.delete(fileId);
    }

    async trashFile(fileId: string): Promise<void> {
        await this.DeleteFile(fileId);
    }

    async moveFile(fileId: string, oldParentId: string, newParentId: string): Promise<void> {
        const record = (await this.records()).get(fileId);
        if (!record) {
            throw new Error(`File not found: ${fileId}`);
        }
        const parents = (record.parents ?? []).filter((p) => p !== oldParentId);
        await this.save({ ...record, parents: [...parents, newParentId] });
    }
}

export default LocalDriveService;
