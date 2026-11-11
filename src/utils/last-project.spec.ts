import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppMgr, { EventType } from '@/managers/appmgr';
import {
    findFileByXrpPath,
    lastProject,
    rememberLastProject,
    reopenLastProject,
    resetLastProjectForTests,
} from '@/utils/last-project';
import { FolderItem } from '@/utils/types';

/** A file or folder in the tree; files have `children: null`. */
function item(name: string, path: string, children: FolderItem[] | null = null): FolderItem {
    return { id: name, name, path, isReadOnly: false, children, fileId: `id-${name}` };
}

const tree: FolderItem[] = [
    item('XRPCode', '/XRPCode/', [
        item('robot.blocks', '/XRPCode/'),
        item('lessons', '/XRPCode/', [item('square.py', '/XRPCode/lessons/')]),
    ]),
];

/** XRP path of a tree item, like the folder tree builds it. */
const toXrpPath = (file: FolderItem) => file.path + file.name;

describe('last project', () => {
    let emit: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        localStorage.clear();
        resetLastProjectForTests();
        AppMgr.getInstance().authService.isLogin = true;
        emit = vi.spyOn(AppMgr.getInstance(), 'emit').mockImplementation(() => undefined);
    });

    afterEach(() => {
        emit.mockRestore();
        AppMgr.getInstance().authService.isLogin = false;
    });

    it('remembers the last project', () => {
        expect(lastProject()).toBeNull();
        rememberLastProject('/XRPCode/robot.blocks');
        expect(lastProject()).toBe('/XRPCode/robot.blocks');
    });

    it('finds files in nested folders', () => {
        expect(findFileByXrpPath(tree, '/XRPCode/lessons/square.py', toXrpPath)?.name).toBe(
            'square.py',
        );
        expect(findFileByXrpPath(tree, '/XRPCode/missing.py', toXrpPath)).toBeUndefined();
    });

    it('opens the remembered project once, when no tab is open', () => {
        rememberLastProject('/XRPCode/lessons/square.py');
        reopenLastProject(tree, toXrpPath, false);
        reopenLastProject(tree, toXrpPath, false);

        expect(emit).toHaveBeenCalledTimes(1);
        expect(emit).toHaveBeenCalledWith(
            EventType.EVENT_OPEN_FILE,
            JSON.stringify({ xrpPath: '/XRPCode/lessons/square.py', gPath: 'id-square.py' }),
        );
    });

    it('does nothing when tabs are already open or the file is gone', () => {
        rememberLastProject('/XRPCode/robot.blocks');
        reopenLastProject(tree, toXrpPath, true);
        resetLastProjectForTests();
        rememberLastProject('/XRPCode/deleted.blocks');
        reopenLastProject(tree, toXrpPath, false);

        expect(emit).not.toHaveBeenCalled();
    });

    it('waits for the user projects (not the robot memory) before trying', () => {
        rememberLastProject('/XRPCode/robot.blocks');
        AppMgr.getInstance().authService.isLogin = false;
        reopenLastProject(tree, toXrpPath, false);
        AppMgr.getInstance().authService.isLogin = true;
        reopenLastProject(tree, toXrpPath, false);

        expect(emit).toHaveBeenCalledTimes(1);
    });
});
