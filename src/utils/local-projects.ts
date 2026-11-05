import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import { CommandToXRPMgr } from '@/managers/commandstoxrpmgr';
import { UserProfile } from '@/services/google-auth';
import LocalDriveService from '@/services/local-drive';
import { Constants } from '@/utils/constants';

/**
 * Switching between the two places projects can live when "My projects" is enabled:
 * - My projects: kept in this browser (LocalDriveService). It uses the same session slot as Google
 *   Drive in XRPWeb, so the file tree, open, save and Run (which copies the program to the robot)
 *   work unchanged.
 * - Robot memory: the files stored on the connected XRP, exactly as XRPWeb without Google.
 */

/** Profile used for the My projects session. */
export const LOCAL_PROFILE: UserProfile = {
    id: 'local',
    email: 'local@xrp-studio',
    name: 'XRP Studio',
    picture: '',
};

const EMPTY_PROFILE: UserProfile = { id: '', email: '', name: '', picture: '' };

/** Whether a robot is connected; false while the connection manager is not started yet. */
export function isRobotConnected(): boolean {
    try {
        return AppMgr.getInstance().getConnection()?.isConnected() ?? false;
    } catch {
        return false;
    }
}

/** Whether the project tree currently shows My projects (as opposed to the robot memory). */
export function isMyProjectsActive(): boolean {
    return AppMgr.getInstance().authService.isLogin;
}

/**
 * Open the My projects session: make sure the root folder exists and mark the session as signed
 * in. Returns the profile for the sign-in callback, which loads the project tree.
 */
export async function startMyProjects(): Promise<UserProfile> {
    const appMgr = AppMgr.getInstance();
    await (appMgr.driveService as LocalDriveService).ensureRootFolder(Constants.XRPCODE);
    appMgr.authService.userProfile = LOCAL_PROFILE;
    appMgr.authService.isLogin = true;
    return LOCAL_PROFILE;
}

/**
 * Show the robot memory instead of My projects: close the My projects session and load the
 * connected robot's files, as XRPWeb does without Google. Editors opened from My projects stay
 * open but read-only until My projects is chosen again.
 */
export async function showRobotMemory(): Promise<void> {
    const appMgr = AppMgr.getInstance();
    appMgr.authService.isLogin = false;
    appMgr.authService.userProfile = EMPTY_PROFILE;
    appMgr.emit(EventType.EVENT_LOGIN_STATUS, LoginStatus.LOGGED_OUT);
    if (isRobotConnected()) {
        await CommandToXRPMgr.getInstance().getOnBoardFSTree();
    } else {
        appMgr.emit(EventType.EVENT_FILESYS, '{}');
    }
}
