import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type DriveApi from '@/services/drive-api';
import type { RemoteItem } from '@/services/drive-api';
import {
    hasUnsyncedChanges,
    PULL_INTERVAL_MS,
    startSync,
    stopSync,
    syncNow,
} from '@/services/drive-sync';
import LocalDriveService, { FOLDER_MIME_TYPE, MemoryDriveStore } from '@/services/local-drive';
import { Constants } from '@/utils/constants';

type RemoteFile = RemoteItem & { content?: string; trashed?: boolean; archived?: boolean };

const TRASH_TIME = new Date().toISOString();

/** A Drive held in memory, with the requests Drive sync makes. */
class FakeDrive {
    files = new Map<string, RemoteFile>();
    offline = false;
    private clock = 0;
    private next = 0;

    private stamp(): string {
        this.clock += 1;
        return new Date(Date.UTC(2026, 0, 1, 0, 0, this.clock)).toISOString();
    }

    private check(): void {
        if (this.offline) {
            throw new Error('offline');
        }
    }

    private view({
        id,
        name,
        mimeType,
        parents,
        modifiedTime,
        trashed,
        archived,
    }: RemoteFile): RemoteItem {
        return {
            id,
            name,
            mimeType,
            parents,
            modifiedTime,
            explicitlyTrashed: Boolean(trashed),
            trashedTime: trashed ? TRASH_TIME : undefined,
            appProperties: archived ? { xrpArchived: 'true' } : undefined,
        };
    }

    add(name: string, parent: string | undefined, content?: string): RemoteFile {
        const file: RemoteFile = {
            id: `r${++this.next}`,
            name,
            mimeType: content === undefined ? FOLDER_MIME_TYPE : 'text/x-python',
            parents: parent ? [parent] : [],
            modifiedTime: this.stamp(),
            content,
        };
        this.files.set(file.id, file);
        return file;
    }

    edit(id: string, change: Partial<RemoteFile>): void {
        Object.assign(this.files.get(id)!, change, {
            modifiedTime: change.modifiedTime ?? this.stamp(),
        });
    }

    find(name: string): RemoteFile | undefined {
        return [...this.files.values()].find((f) => f.name === name && !f.trashed);
    }

    api = {
        ensureRoot: async (name: string) => {
            this.check();
            const root = [...this.files.values()].find(
                (f) => f.name === name && !f.parents?.length,
            );
            return this.view(root ?? this.add(name, undefined));
        },
        listFolder: async (id: string) => {
            this.check();
            return [...this.files.values()]
                .filter((f) => f.parents?.includes(id))
                .map((f) => this.view(f));
        },
        create: async (
            name: string,
            mimeType: string,
            parent?: string,
            content?: string,
            archived?: boolean,
        ) => {
            this.check();
            const file = this.add(
                name,
                parent,
                mimeType === FOLDER_MIME_TYPE ? undefined : content,
            );
            file.archived = archived;
            return this.view(file);
        },
        update: async (
            id: string,
            change: {
                name: string;
                content?: string;
                addParent?: string;
                removeParent?: string;
                trashed?: boolean;
                archived?: boolean;
            },
        ) => {
            this.check();
            const file = this.files.get(id)!;
            const parents =
                change.addParent && change.removeParent ? [change.addParent] : file.parents;
            this.edit(id, {
                name: change.name,
                parents,
                ...(change.content !== undefined ? { content: change.content } : {}),
                ...(change.trashed !== undefined ? { trashed: change.trashed } : {}),
                ...(change.archived !== undefined ? { archived: change.archived } : {}),
            });
            return this.view(file);
        },
        trash: async (id: string) => {
            this.check();
            const file = this.files.get(id);
            if (file) {
                file.trashed = true;
            }
        },
        remove: async (id: string) => {
            this.check();
            const drop = (target: string) => {
                this.files.delete(target);
                [...this.files.values()]
                    .filter((f) => f.parents?.includes(target))
                    .forEach((f) => drop(f.id));
            };
            drop(id);
        },
        download: async (id: string) => {
            this.check();
            return this.files.get(id)!.content ?? '';
        },
    };
}

describe('drive sync', () => {
    let remote: FakeDrive;
    let local: LocalDriveService;
    let rootId: string;
    let remoteChanges: number;
    let openIds: Set<string>;

    beforeEach(async () => {
        remote = new FakeDrive();
        local = new LocalDriveService(new MemoryDriveStore());
        rootId = (await local.ensureRootFolder(Constants.XRPCODE)).id;
        remoteChanges = 0;
        openIds = new Set();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        startSync(local, remote.api as unknown as DriveApi, {
            onRemoteChange: () => remoteChanges++,
            isOpen: (id) => openIds.has(id),
        });
    });

    afterEach(() => {
        stopSync();
        vi.restoreAllMocks();
    });

    const write = (name: string, content: string, parent = rootId) =>
        local.uploadFile(new Blob([content]), name, 'text/x-python', parent);

    it('uploads new folders and files, parents first', async () => {
        const folder = await local.createFolder('cars', rootId);
        await write('main.py', 'print(1)', folder!.id);
        await syncNow();

        const cars = remote.find('cars')!;
        expect(cars.parents).toEqual([remote.find(Constants.XRPCODE)!.id]);
        expect(remote.find('main.py')).toMatchObject({ parents: [cars.id], content: 'print(1)' });
        expect(await hasUnsyncedChanges(local)).toBe(false);
    });

    it('uploads edits, renames and moves to the same Drive file', async () => {
        const file = await write('a.py', 'one');
        const folder = await local.createFolder('box', rootId);
        await syncNow();
        const id = remote.find('a.py')!.id;

        await local.upsertFileToGoogleDrive(new Blob(['two']), 'a.py', 'text/x-python', file!.id);
        await local.renameFile(file!.id, 'b.py');
        await local.moveFile(file!.id, rootId, folder!.id);
        await syncNow();

        expect(remote.files.get(id)).toMatchObject({
            name: 'b.py',
            content: 'two',
            parents: [remote.find('box')!.id],
        });
    });

    it('moves trashed items to the Drive trash and back, and deletes them for good', async () => {
        const folder = await local.createFolder('box', rootId);
        await write('in.py', 'x', folder!.id);
        await syncNow();
        const id = remote.find('box')!.id;

        await local.trashFile(folder!.id);
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(0);
        await syncNow();
        expect(remote.files.get(id)!.trashed).toBe(true);
        expect(remote.files.size).toBe(3);

        await local.restoreFile(folder!.id, rootId);
        await syncNow();
        expect(remote.files.get(id)!.trashed).toBe(false);

        await local.trashFile(folder!.id);
        await local.DeleteFile(folder!.id);
        await syncNow();
        expect(remote.files.has(id)).toBe(false);
        expect(remote.files.size).toBe(1);
        expect(await local.allRecords()).toHaveLength(1);
    });

    it('keeps items trashed before their first upload on this device only', async () => {
        const file = await write('draft.py', 'x');
        await local.trashFile(file!.id);
        await syncNow();
        expect(remote.find('draft.py')).toBeUndefined();
        expect(await hasUnsyncedChanges(local)).toBe(false);

        await local.restoreFile(file!.id, rootId);
        await syncNow();
        expect(remote.find('draft.py')!.content).toBe('x');
    });

    it('archives projects in Drive and brings them back', async () => {
        const file = await write('old.py', 'x');
        await syncNow();
        const id = remote.find('old.py')!.id;

        await local.archiveFile(file!.id);
        await syncNow();
        expect(remote.files.get(id)).toMatchObject({ archived: true });
        expect(remote.files.get(id)!.trashed).toBeFalsy();
        expect(await hasUnsyncedChanges(local)).toBe(false);

        await local.unarchiveFile(file!.id, rootId);
        await syncNow();
        expect(remote.files.get(id)!.archived).toBe(false);
    });

    it('uploads a project archived before its first upload, already archived', async () => {
        const file = await write('draft.py', 'x');
        await local.archiveFile(file!.id);
        await syncNow();
        expect(remote.find('draft.py')).toMatchObject({ archived: true, content: 'x' });
    });

    it('follows projects archived or brought back on another device', async () => {
        const file = await write('both.py', 'x');
        await syncNow();
        const id = remote.find('both.py')!.id;

        remote.files.get(id)!.archived = true;
        await syncNow({ pull: true });
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(0);
        expect((await local.archivedItems()).map((f) => f.id)).toEqual([file!.id]);
        expect(remoteChanges).toBe(1);

        remote.files.get(id)!.archived = false;
        await syncNow({ pull: true });
        expect((await local.getFileListByFolderId(rootId)).map((f) => f.id)).toEqual([file!.id]);

        remote.add('new.py', remote.find(Constants.XRPCODE)!.id, 'y').archived = true;
        await syncNow({ pull: true });
        expect((await local.archivedItems()).map((f) => f.name)).toEqual(['new.py']);
    });

    it('keeps an archive change made here when the file also changed in Drive', async () => {
        const file = await write('both.py', 'base');
        await syncNow();
        const id = remote.find('both.py')!.id;

        remote.offline = true;
        await local.archiveFile(file!.id);
        await syncNow();
        remote.offline = false;
        remote.edit(id, { content: 'theirs', modifiedTime: '2999-01-01T00:00:00.000Z' });
        await syncNow({ pull: true });

        expect(remote.files.get(id)).toMatchObject({ content: 'theirs', archived: true });
        expect((await local.archivedItems()).map((f) => f.id)).toEqual([file!.id]);
    });

    it('downloads files added or changed in Drive', async () => {
        await syncNow();
        const root = remote.find(Constants.XRPCODE)!;
        const folder = remote.add('remote', root.id);
        const file = remote.add('r.py', folder.id, 'print("hi")');
        await syncNow({ pull: true });

        const [localFolder] = await local.getFileListByFolderId(rootId);
        expect(localFolder.name).toBe('remote');
        const [localFile] = await local.getFileListByFolderId(localFolder.id);
        expect(await local.getFileContents(localFile.id)).toBe('print("hi")');
        expect(remoteChanges).toBe(1);

        remote.edit(file.id, { content: 'print("bye")' });
        await syncNow({ pull: true });
        expect(await local.getFileContents(localFile.id)).toBe('print("bye")');
    });

    it('looks for changes from other devices every minute while the app is visible', async () => {
        stopSync();
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
        });
        startSync(local, remote.api as unknown as DriveApi, {
            onRemoteChange: () => remoteChanges++,
        });
        await syncNow();
        remote.add('later.py', remote.find(Constants.XRPCODE)!.id, 'x');

        await vi.advanceTimersByTimeAsync(PULL_INTERVAL_MS);
        expect((await local.getFileListByFolderId(rootId)).map((f) => f.name)).toEqual([
            'later.py',
        ]);

        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        remote.add('hidden.py', remote.find(Constants.XRPCODE)!.id, 'y');
        await vi.advanceTimersByTimeAsync(PULL_INTERVAL_MS);
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(1);

        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        await vi.advanceTimersByTimeAsync(0);
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(2);
        vi.useRealTimers();
    });

    it('leaves a file that is open in an editor until its tab is closed', async () => {
        const file = await write('open.py', 'mine');
        await syncNow();
        const id = remote.find('open.py')!.id;
        openIds.add(file!.id);

        remote.edit(id, { content: 'theirs' });
        await syncNow({ pull: true });
        expect(await local.getFileContents(file!.id)).toBe('mine');

        openIds.clear();
        await syncNow({ pull: true });
        expect(await local.getFileContents(file!.id)).toBe('theirs');
    });

    it('follows items trashed, restored or deleted for good on another device', async () => {
        const file = await write('gone.py', 'x');
        await syncNow();
        const id = remote.find('gone.py')!.id;

        remote.files.get(id)!.trashed = true;
        await syncNow({ pull: true });
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(0);
        expect((await local.trashItems()).map((f) => [f.name, f.trashedTime])).toEqual([
            ['gone.py', TRASH_TIME],
        ]);
        expect(remoteChanges).toBe(1);

        remote.files.get(id)!.trashed = false;
        await syncNow({ pull: true });
        expect((await local.getFileListByFolderId(rootId)).map((f) => f.id)).toEqual([file!.id]);

        remote.files.delete(id);
        await syncNow({ pull: true });
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(0);
        expect(await local.trashItems()).toHaveLength(0);
    });

    it('keeps a trash change made here when the file also changed in Drive', async () => {
        const file = await write('both.py', 'base');
        await syncNow();
        const id = remote.find('both.py')!.id;

        remote.offline = true;
        await local.trashFile(file!.id);
        await syncNow();
        remote.offline = false;
        remote.edit(id, { content: 'theirs', modifiedTime: '2999-01-01T00:00:00.000Z' });
        await syncNow({ pull: true });

        expect(remote.files.get(id)).toMatchObject({ content: 'theirs', trashed: true });
        expect((await local.trashItems()).map((f) => f.id)).toEqual([file!.id]);
        expect(await local.getFileContents(file!.id)).toBe('theirs');
    });

    /** Edit `both.py` here without connection and in Drive; `driveIsNewer` tells whose edit is later. */
    async function changeInBothPlaces(driveIsNewer: boolean) {
        const file = await write('both.py', 'base');
        await syncNow();
        const id = remote.find('both.py')!.id;

        remote.offline = true;
        await local.upsertFileToGoogleDrive(
            new Blob(['mine']),
            'both.py',
            'text/x-python',
            file!.id,
        );
        await syncNow();
        remote.offline = false;
        remote.edit(id, {
            content: 'theirs',
            modifiedTime: driveIsNewer ? '2999-01-01T00:00:00.000Z' : undefined,
        });
        await syncNow({ pull: true });
        return { id, file: file! };
    }

    it('keeps a single file when it changed here and in Drive: the newer edit in Drive wins', async () => {
        const { id, file } = await changeInBothPlaces(true);
        expect(remote.files.get(id)!.content).toBe('theirs');
        expect(await local.getFileContents(file.id)).toBe('theirs');
        expect((await local.getFileListByFolderId(rootId)).map((f) => f.name)).toEqual(['both.py']);
    });

    it('keeps a single file when it changed here and in Drive: the newer edit here wins', async () => {
        const { id, file } = await changeInBothPlaces(false);
        expect(remote.files.get(id)!.content).toBe('mine');
        expect(await local.getFileContents(file.id)).toBe('mine');
        expect((await local.getFileListByFolderId(rootId)).map((f) => f.name)).toEqual(['both.py']);
    });

    it('keeps changes made without connection and uploads them later', async () => {
        remote.offline = true;
        await write('later.py', 'x');
        await syncNow();
        expect(await hasUnsyncedChanges(local)).toBe(true);

        remote.offline = false;
        await syncNow({ pull: true });
        expect(remote.find('later.py')!.content).toBe('x');
        expect(await hasUnsyncedChanges(local)).toBe(false);
    });
});
