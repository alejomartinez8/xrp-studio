import { beforeEach, describe, expect, it } from 'vitest';
import LocalDriveService, {
    FOLDER_MIME_TYPE,
    MemoryDriveStore,
    TRASH_DAYS,
} from '@/services/local-drive';
import { Constants } from '@/utils/constants';

describe('LocalDriveService', () => {
    let store: MemoryDriveStore;
    let drive: LocalDriveService;
    let rootId: string;

    beforeEach(async () => {
        store = new MemoryDriveStore();
        drive = new LocalDriveService(store);
        rootId = (await drive.createFolder(Constants.XRPCODE))!.id;
    });

    it('creates, reads and updates a file', async () => {
        const file = await drive.uploadFile(
            new Blob(['print(1)']),
            'main.py',
            'text/x-python',
            rootId,
        );
        expect(await drive.getFileContents(file!.id)).toBe('print(1)');

        await drive.upsertFileToGoogleDrive(
            new Blob(['print(2)']),
            'main.py',
            'text/x-python',
            file!.id,
        );
        expect(await drive.getFileContents(file!.id)).toBe('print(2)');
        expect(await drive.getFileListByFolderId(rootId)).toHaveLength(1);
    });

    it('upsert without an id creates a new file', async () => {
        const created = await drive.upsertFileToGoogleDrive(
            new Blob(['{}']),
            'robot.blocks',
            'application/json',
            undefined,
            rootId,
        );
        expect(created?.parents).toEqual([rootId]);
        expect(await drive.getFileContents(created!.id)).toBe('{}');
    });

    it('builds the folder tree used by the file explorer', async () => {
        const sub = await drive.createFolder('cars', rootId);
        await drive.uploadFile(new Blob(['a']), 'a.py', 'text/x-python', sub!.id);

        const tree = await drive.buildTree(Constants.XRPCODE);
        expect(tree.name).toBe(Constants.XRPCODE);
        expect(tree.children?.[0].name).toBe('cars');
        expect(tree.children?.[0].mimeType).toBe(FOLDER_MIME_TYPE);
        expect(tree.children?.[0].children?.[0].name).toBe('a.py');
    });

    it('finds the top-level folder before a nested one with the same name', async () => {
        await drive.createFolder(Constants.XRPCODE, rootId);
        expect((await drive.findFolderByName(Constants.XRPCODE))?.id).toBe(rootId);
    });

    it('renames, moves and deletes folders recursively', async () => {
        const a = await drive.createFolder('a', rootId);
        const b = await drive.createFolder('b', rootId);
        const file = await drive.uploadFile(new Blob(['x']), 'x.py', 'text/x-python', a!.id);

        await drive.renameFile(file!.id, 'y.py');
        await drive.moveFile(file!.id, a!.id, b!.id);
        expect((await drive.getFileListByFolderId(b!.id)).map((f) => f.name)).toEqual(['y.py']);
        expect(await drive.getFolderName(b!.id)).toBe('b');

        await drive.DeleteFile(b!.id);
        expect(await drive.getFileContents(file!.id)).toBeNull();
        expect((await store.loadAll()).map((r) => r.name).sort()).toEqual([Constants.XRPCODE, 'a']);
    });

    it('creates the root folder only once under concurrent calls', async () => {
        const fresh = new LocalDriveService(new MemoryDriveStore());
        const [a, b] = await Promise.all([
            fresh.ensureRootFolder(Constants.XRPCODE),
            fresh.ensureRootFolder(Constants.XRPCODE),
        ]);
        expect(a.id).toBe(b.id);
        expect((await fresh.buildTree(Constants.XRPCODE)).id).toBe(a.id);
    });

    it('persists to its store', async () => {
        await drive.uploadFile(new Blob(['saved']), 'keep.py', 'text/x-python', rootId);
        const reopened = new LocalDriveService(store);
        const tree = await reopened.buildTree(Constants.XRPCODE);
        expect(await reopened.getFileContents(tree.children![0].id)).toBe('saved');
    });
    it('marks changes for sync and keeps synced deletions as hidden records', async () => {
        const changes: number[] = [];
        drive.onChange = () => changes.push(1);
        const file = await drive.uploadFile(new Blob(['a']), 'a.py', 'text/x-python', rootId);
        expect((await drive.getRecord(file!.id))?.dirty).toBe(true);
        expect(changes.length).toBeGreaterThan(0);

        await drive.putRecord({
            ...(await drive.getRecord(file!.id))!,
            driveId: 'r1',
            dirty: false,
        });
        const local = await drive.uploadFile(new Blob(['b']), 'b.py', 'text/x-python', rootId);
        await drive.DeleteFile(file!.id);
        await drive.DeleteFile(local!.id);

        expect(await drive.getFileListByFolderId(rootId)).toHaveLength(0);
        expect(await drive.getRecord(file!.id)).toMatchObject({ deleted: true, dirty: true });
        expect(await drive.getRecord(local!.id)).toBeUndefined();
    });

    it('switches to another store and forgets the cached records', async () => {
        await drive.uploadFile(new Blob(['a']), 'a.py', 'text/x-python', rootId);
        drive.useStore(new MemoryDriveStore());
        expect(await drive.allRecords()).toHaveLength(0);
    });

    describe('trash', () => {
        const file = (name: string, parent = rootId) =>
            drive.uploadFile(new Blob(['x']), name, 'text/x-python', parent);

        it('hides a trashed folder with everything inside it, and lists it newest first', async () => {
            const folder = await drive.createFolder('box', rootId);
            await file('in.py', folder!.id);
            const loose = await file('loose.py');

            await drive.trashFile(folder!.id);
            await new Promise((resolve) => setTimeout(resolve, 2));
            await drive.trashFile(loose!.id);

            expect(await drive.getFileListByFolderId(rootId)).toHaveLength(0);
            expect(await drive.findFolderByName('box', rootId)).toBeNull();
            expect((await drive.trashItems()).map((f) => f.name)).toEqual(['loose.py', 'box']);
        });

        it('restores to the same folder, or to the top folder when that one is trashed', async () => {
            const folder = await drive.createFolder('box', rootId);
            const inner = await file('in.py', folder!.id);
            await drive.trashFile(inner!.id);
            await drive.restoreFile(inner!.id, rootId);
            expect((await drive.getFileListByFolderId(folder!.id)).map((f) => f.id)).toEqual([
                inner!.id,
            ]);

            await drive.trashFile(inner!.id);
            await drive.trashFile(folder!.id);
            await drive.restoreFile(inner!.id, rootId);
            expect((await drive.getFileListByFolderId(rootId)).map((f) => f.name)).toEqual([
                'in.py',
            ]);
            expect((await drive.trashItems()).map((f) => f.name)).toEqual(['box']);
        });

        it('gives a restored item a free name', async () => {
            const old = await file('main.py');
            await drive.trashFile(old!.id);
            await file('main.py');
            await drive.restoreFile(old!.id, rootId);
            expect((await drive.getFileListByFolderId(rootId)).map((f) => f.name)).toEqual([
                'main (2).py',
                'main.py',
            ]);
        });

        it(`deletes items for good after ${TRASH_DAYS} days`, async () => {
            const old = await file('old.py');
            await drive.trashFile(old!.id);
            const later = Date.now() + (TRASH_DAYS + 1) * 24 * 60 * 60 * 1000;
            expect(await drive.trashItems(later)).toHaveLength(0);
            expect(await drive.allRecords()).toHaveLength(1);
        });
    });
});
