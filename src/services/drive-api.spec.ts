import { describe, expect, it, vi } from 'vitest';
import DriveApi, { ARCHIVED_PROPERTY, DriveApiError, isArchived } from '@/services/drive-api';
import { FOLDER_MIME_TYPE } from '@/services/local-drive';

const item = { id: 'f1', name: 'a.py', mimeType: 'text/x-python', modifiedTime: 't1' };

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
}

describe('DriveApi', () => {
    it('sends the token and reads every page of a folder', async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(json({ files: [item], nextPageToken: 'p2' }))
            .mockResolvedValueOnce(json({ files: [{ ...item, id: 'f2' }] }));
        const api = new DriveApi(fetch);
        api.setAccessToken('tok');

        const files = await api.listFolder('folder');
        expect(files.map((f) => f.id)).toEqual(['f1', 'f2']);
        expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
        expect(new URL(fetch.mock.calls[1][0]).searchParams.get('pageToken')).toBe('p2');
        expect(api.hasToken).toBe(true);
        api.clearToken();
        expect(api.hasToken).toBe(false);
    });

    it('finds the top-level folder or creates it', async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(json({ files: [] }))
            .mockResolvedValueOnce(json({ ...item, mimeType: FOLDER_MIME_TYPE }));
        const root = await new DriveApi(fetch).ensureRoot('XRPCode');
        expect(root.mimeType).toBe(FOLDER_MIME_TYPE);
        expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
            name: 'XRPCode',
            mimeType: FOLDER_MIME_TYPE,
        });
    });

    it('uploads files with their content and moves them between folders', async () => {
        const fetch = vi.fn().mockImplementation(() => Promise.resolve(json(item)));
        const api = new DriveApi(fetch);
        await api.create('a.py', 'text/x-python', 'parent', 'print(1)');
        expect(fetch.mock.calls[0][0]).toContain('/upload/drive/v3/files?uploadType=multipart');
        expect(fetch.mock.calls[0][1].body).toBeInstanceOf(FormData);

        await api.update('f1', {
            name: 'b.py',
            mimeType: 'text/x-python',
            content: 'print(2)',
            addParent: 'new',
            removeParent: 'old',
        });
        const url = new URL(fetch.mock.calls[1][0]);
        expect(url.pathname).toBe('/upload/drive/v3/files/f1');
        expect(url.searchParams.get('addParents')).toBe('new');
        expect(url.searchParams.get('removeParents')).toBe('old');
        expect(fetch.mock.calls[1][1].method).toBe('PATCH');
    });

    it('throws when Drive refuses or cannot be reached, except trashing a missing file', async () => {
        const refused = new DriveApi(vi.fn().mockResolvedValue(json({}, 403)));
        await expect(refused.download('f1')).rejects.toMatchObject({ status: 403 });

        const offline = new DriveApi(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        await expect(offline.listFolder('x')).rejects.toBeInstanceOf(DriveApiError);
        await expect(offline.listFolder('x')).rejects.toMatchObject({ status: 0 });

        const missing = new DriveApi(vi.fn().mockResolvedValue(json({}, 404)));
        await expect(missing.trash('gone')).resolves.toBeUndefined();
    });

    it('lists trashed items too, moves items in and out of the trash and deletes them', async () => {
        const fetch = vi.fn().mockImplementation(() => Promise.resolve(json({ files: [] })));
        const api = new DriveApi(fetch);
        await api.listFolder('folder');
        expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).toBe("'folder' in parents");

        await api.update('f1', { name: 'box', mimeType: FOLDER_MIME_TYPE, trashed: true });
        expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ name: 'box', trashed: true });

        await api.remove('f1');
        expect(fetch.mock.calls[2][1].method).toBe('DELETE');
        const missing = new DriveApi(vi.fn().mockResolvedValue(json({}, 404)));
        await expect(missing.remove('gone')).resolves.toBeUndefined();
    });

    it('marks archived projects with an app property and clears it', async () => {
        const fetch = vi.fn().mockImplementation(() => Promise.resolve(json({})));
        const api = new DriveApi(fetch);
        await api.create('box', FOLDER_MIME_TYPE, 'root', undefined, true);
        expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
            appProperties: { [ARCHIVED_PROPERTY]: 'true' },
        });

        await api.update('f1', { name: 'box', mimeType: FOLDER_MIME_TYPE, archived: false });
        expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
            name: 'box',
            appProperties: { [ARCHIVED_PROPERTY]: null },
        });
        expect(new URL(fetch.mock.calls[1][0]).searchParams.get('fields')).toContain(
            'appProperties',
        );
        expect(isArchived({ id: 'a', name: 'a', mimeType: '', modifiedTime: '' })).toBe(false);
        expect(
            isArchived({
                id: 'a',
                name: 'a',
                mimeType: '',
                modifiedTime: '',
                appProperties: { [ARCHIVED_PROPERTY]: 'true' },
            }),
        ).toBe(true);
    });
});
