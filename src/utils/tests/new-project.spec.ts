import { describe, expect, it } from 'vitest';
import { newProjectData, nextProjectName } from '@/utils/new-project';
import { FileType } from '@/utils/types';

describe('new project', () => {
    it('picks the first free numbered name, ignoring case and other extensions', () => {
        expect(nextProjectName('my-project', '.blocks', [])).toBe('my-project-1.blocks');
        expect(
            nextProjectName('my-project', '.blocks', [
                'My-Project-1.blocks',
                'my-project-2.py',
                'my-project-3.blocks',
            ]),
        ).toBe('my-project-2.blocks');
    });

    it('builds the file data in the top folder of the user projects', () => {
        expect(
            newProjectData('python', 'folder-1', ['mi-proyecto-1.py'], 'local', 'mi-proyecto'),
        ).toEqual({
            name: 'mi-proyecto-2.py',
            path: '/gusers/local/mi-proyecto-2.py',
            gpath: '',
            gparentId: 'folder-1',
            filetype: FileType.PYTHON,
            parentId: 'folder-1',
        });
        expect(newProjectData('blocks', 'f', [], 'ana', 'my-project').filetype).toBe(
            FileType.BLOCKLY,
        );
    });
});
