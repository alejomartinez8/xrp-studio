import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type DriveApi from '@/services/drive-api';
import type { RemoteItem } from '@/services/drive-api';
import { hasUnsyncedChanges, startSync, stopSync, syncNow } from '@/services/drive-sync';
import LocalDriveService, { FOLDER_MIME_TYPE, MemoryDriveStore } from '@/services/local-drive';
import { Constants } from '@/utils/constants';

type RemoteFile = RemoteItem & { content?: string; trashed?: boolean };

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

    private view({ id, name, mimeType, parents, modifiedTime }: RemoteFile): RemoteItem {
        return { id, name, mimeType, parents, modifiedTime };
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
        Object.assign(this.files.get(id)!, change, { modifiedTime: this.stamp() });
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
                .filter((f) => f.parents?.includes(id) && !f.trashed)
                .map((f) => this.view(f));
        },
        create: async (name: string, mimeType: string, parent?: string, content?: string) => {
            this.check();
            const file = this.add(
                name,
                parent,
                mimeType === FOLDER_MIME_TYPE ? undefined : content,
            );
            return this.view(file);
        },
        update: async (
            id: string,
            change: { name: string; content?: string; addParent?: string; removeParent?: string },
        ) => {
            this.check();
            const file = this.files.get(id)!;
            const parents =
                change.addParent && change.removeParent ? [change.addParent] : file.parents;
            this.edit(id, {
                name: change.name,
                parents,
                ...(change.content !== undefined ? { content: change.content } : {}),
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

    beforeEach(async () => {
        remote = new FakeDrive();
        local = new LocalDriveService(new MemoryDriveStore());
        rootId = (await local.ensureRootFolder(Constants.XRPCODE)).id;
        remoteChanges = 0;
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        startSync(local, remote.api as unknown as DriveApi, {
            conflictName: (name) => name.replace('.py', ' (this device).py'),
            onRemoteChange: () => remoteChanges++,
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

    it('sends deleted files to the Drive trash', async () => {
        const file = await write('old.py', 'x');
        await syncNow();
        const id = remote.find('old.py')!.id;

        await local.DeleteFile(file!.id);
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(0);
        await syncNow();

        expect(remote.files.get(id)!.trashed).toBe(true);
        expect(await local.allRecords()).toHaveLength(1);
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

    it('removes local files deleted in Drive', async () => {
        await write('gone.py', 'x');
        await syncNow();
        remote.find('gone.py')!.trashed = true;
        await syncNow({ pull: true });
        expect(await local.getFileListByFolderId(rootId)).toHaveLength(0);
    });

    it('keeps both versions when a file changed here and in Drive', async () => {
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
        remote.edit(id, { content: 'theirs' });
        await syncNow({ pull: true });

        expect(remote.files.get(id)!.content).toBe('theirs');
        expect(remote.find('both (this device).py')!.content).toBe('mine');
        const names = (await local.getFileListByFolderId(rootId)).map((f) => f.name).sort();
        expect(names).toEqual(['both (this device).py', 'both.py']);
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
