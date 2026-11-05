import { describe, expect, it } from 'vitest';
import {
    cleanProjectName,
    newProjectData,
    nextProjectName,
    projectNameProblem,
} from '@/utils/new-project';
import { FileType } from '@/utils/types';

describe('new project', () => {
    it('suggests the first free numbered name, ignoring case and other extensions', () => {
        expect(nextProjectName('my-project', '.blocks', [])).toBe('my-project-1.blocks');
        expect(
            nextProjectName('my-project', '.blocks', [
                'My-Project-1.blocks',
                'my-project-2.py',
                'my-project-3.blocks',
            ]),
        ).toBe('my-project-2.blocks');
    });

    it('drops accents from typed names', () => {
        expect(cleanProjectName('mi robot ñandú')).toBe('mi robot nandu');
    });

    it('explains why a name cannot be used', () => {
        expect(projectNameProblem('  ', '.blocks', [])).toBe('empty');
        expect(projectNameProblem('robot?', '.blocks', [])).toBe('invalid');
        expect(projectNameProblem('-robot', '.blocks', [])).toBe('invalid');
        expect(projectNameProblem('Robot', '.blocks', ['robot.blocks'])).toBe('exists');
        expect(projectNameProblem('robot', '.py', ['robot.blocks'])).toBeNull();
        expect(projectNameProblem('mi robot 2', '.blocks', [])).toBeNull();
    });

    it('builds the file data in the top folder of the user projects', () => {
        expect(newProjectData('python', 'folder-1', 'robot.py', 'local')).toEqual({
            name: 'robot.py',
            path: '/gusers/local/robot.py',
            gpath: '',
            gparentId: 'folder-1',
            filetype: FileType.PYTHON,
            parentId: 'folder-1',
        });
        expect(newProjectData('blocks', 'f', 'a.blocks', 'ana').filetype).toBe(FileType.BLOCKLY);
    });
});
