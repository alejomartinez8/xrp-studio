import { describe, expect, it } from 'vitest';
import { GoogleDriveFile } from '@/services/google-drive';
import { projectTitle, recentProjects, timeAgo } from '@/utils/recent-projects';

const FOLDER = 'application/vnd.google-apps.folder';

/** A file in the projects tree, modified at `modifiedTime`. */
function file(name: string, modifiedTime: string, parent = 'root'): GoogleDriveFile {
    return {
        id: `id-${name}`,
        name,
        mimeType: 'text/plain',
        kind: 'drive#file',
        modifiedTime,
        parents: [parent],
    };
}

/** A folder in the projects tree. */
function folder(name: string, children: GoogleDriveFile[]): GoogleDriveFile {
    return { id: `id-${name}`, name, mimeType: FOLDER, kind: 'drive#file', children };
}

const tree = folder('XRPCode', [
    file('square.blocks', '2026-11-03T10:00:00Z'),
    file('notes.txt', '2026-11-05T10:00:00Z'),
    folder('lessons', [file('zigzag.py', '2026-11-04T10:00:00Z', 'id-lessons')]),
    folder('trash', [file('old.blocks', '2026-11-05T11:00:00Z', 'id-trash')]),
    file('line follower.blocks', '2026-11-05T09:00:00Z'),
]);

describe('recentProjects', () => {
    it('lists projects newest first, with subfolders and without trash or other files', () => {
        const projects = recentProjects(tree, 'ana');
        expect(projects.map((p) => p.name)).toEqual([
            'line follower.blocks',
            'zigzag.py',
            'square.blocks',
        ]);
        expect(projects[1]).toEqual({
            name: 'zigzag.py',
            kind: 'python',
            xrpPath: '/gusers/ana/lessons/zigzag.py',
            fileId: 'id-zigzag.py',
            parentId: 'id-lessons',
            modifiedTime: '2026-11-04T10:00:00Z',
        });
    });

    it('keeps only the newest ones', () => {
        expect(recentProjects(tree, 'ana', 2)).toHaveLength(2);
    });
});

describe('projectTitle', () => {
    it('drops the project extension', () => {
        expect(projectTitle('line follower.blocks')).toBe('line follower');
        expect(projectTitle('zigzag.py')).toBe('zigzag');
    });
});

describe('timeAgo', () => {
    const now = new Date('2026-11-05T12:00:00Z');

    it('says how long ago in the app language', () => {
        expect(timeAgo('2026-11-05T11:55:00Z', now, 'en')).toBe('5 minutes ago');
        expect(timeAgo('2026-11-04T12:00:00Z', now, 'en')).toBe('yesterday');
        expect(timeAgo('2026-11-03T12:00:00Z', now, 'es')).toBe('anteayer');
        expect(timeAgo('2026-11-05T11:59:50Z', now, 'en')).toBeNull();
    });
});
