import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import { CommandToXRPMgr } from '@/managers/commandstoxrpmgr';
import { UserProfile } from '@/services/google-auth';
import { Constants } from '@/utils/constants';
import { fireGoogleUserTree, getUsernameFromEmail } from '@/utils/google-utils';
import { StorageKeys } from '@/utils/localstorage';
import { isDriveSyncEnabled, isLocalProjectsEnabled } from '@/utils/offline';
import { enterAccount } from '@/utils/accounts';
import { LOCAL_PROFILE, startMyProjects } from '@/utils/local-projects';

/**
 * Sign-in and sign-out handling, shared by the sign-in widget wherever it is shown. In XRP Studio
 * the widget lives at the top right of the top bar instead of the folder tree header; the tree
 * follows the `EVENT_LOGIN_STATUS` event.
 */

/** Whether the sign-in widget is shown in the top bar (and not in the folder tree header). */
export const isSignInInNavbar = true;

/** Whether the robot is connected right now. */
function isRobotConnected(): boolean {
    return AppMgr.getInstance().getConnection()?.isConnected() ?? false;
}

/**
 * Handle a successful sign-in: announce it, create the user's folder on a connected XRP and load
 * the user's file tree. Returns true the first time a Google account signs in, so the caller can
 * show the Google Drive ownership notice.
 */
export async function handleSignedIn(profile: UserProfile): Promise<boolean> {
    if (isDriveSyncEnabled && profile.id !== LOCAL_PROFILE.id) {
        await enterAccount(profile);
    }
    AppMgr.getInstance().emit(EventType.EVENT_LOGIN_STATUS, LoginStatus.LOGGED_IN);
    const username = getUsernameFromEmail(profile.email);
    if (username !== undefined && isRobotConnected()) {
        await CommandToXRPMgr.getInstance().buildPath(Constants.GUSERS_FOLDER + username);
    }
    fireGoogleUserTree(username ?? '');

    const isFirstTime =
        localStorage.getItem(StorageKeys.GOOGLE_FIRST_TIME_LOGIN) === null ||
        localStorage.getItem(StorageKeys.GOOGLE_FIRST_TIME_LOGIN) === 'true';
    if (isFirstTime && !isLocalProjectsEnabled) {
        localStorage.setItem(StorageKeys.GOOGLE_FIRST_TIME_LOGIN, 'false');
        return true;
    }
    return false;
}

/**
 * Handle a sign-out: announce it and show the XRP's files again, or an empty tree. With Drive sync
 * the account's space was already closed (`leaveAccount`), so the guest's My projects
 * open instead.
 */
export async function handleSignedOut(): Promise<void> {
    await AppMgr.getInstance().authService.logOut();
    if (isDriveSyncEnabled) {
        await handleSignedIn(await startMyProjects());
        return;
    }
    AppMgr.getInstance().emit(EventType.EVENT_LOGIN_STATUS, LoginStatus.LOGGED_OUT);
    if (!isRobotConnected()) {
        AppMgr.getInstance().emit(EventType.EVENT_FILESYS, '{}');
    }
    await CommandToXRPMgr.getInstance().getOnBoardFSTree();
}
