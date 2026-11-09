import AppMgr, { EventType } from '@/managers/appmgr';
import EditorMgr from '@/managers/editormgr';
import { pythonCopyPath } from '@/utils/editor-view';
import i18n from '@/utils/i18n';
import { isRobotConnected } from '@/utils/local-projects';
import { FileType, NewFileData } from '@/utils/types';

/**
 * Create an editable Python copy of the blocks file in tab `tabId`, next to it, and open it. The
 * blocks file stays as it is. The copy is saved where the blocks file lives (My projects or the
 * robot), through the same path as a new project (`EVENT_NEW_PROJECT`). Names already used are
 * read from the folder in My projects, or from the robot's file tree.
 */
export async function makePythonCopy(tabId: string, code: string): Promise<void> {
    const appMgr = AppMgr.getInstance();
    const session = EditorMgr.getInstance().getEditorSession(tabId);
    if (!session) {
        return;
    }
    const inMyProjects = !!session.gpath;
    if (inMyProjects ? !appMgr.authService.isLogin : !isRobotConnected()) {
        appMgr.emit(
            EventType.EVENT_ALERT,
            i18n.t(inMyProjects ? 'editGoogleLoginRequired' : 'XRP-not-connected'),
        );
        return;
    }
    const folder = session.path.slice(0, session.path.lastIndexOf('/') + 1);
    const taken =
        inMyProjects && session.gparentId
            ? new Set(
                  (await appMgr.driveService.getFileListByFolderId(session.gparentId)).map(
                      (file) => `${folder}${file.name}`,
                  ),
              )
            : null;
    const path = pythonCopyPath(session.path, (candidate) =>
        taken ? taken.has(candidate) : appMgr.IsFileExistsAtPath(candidate),
    );
    const data: NewFileData = {
        name: path.slice(path.lastIndexOf('/') + 1),
        path,
        gpath: '',
        gparentId: session.gparentId,
        parentId: session.gparentId ?? '',
        filetype: FileType.PYTHON,
        content: code,
    };
    appMgr.emit(EventType.EVENT_NEW_PROJECT, JSON.stringify(data));
}
