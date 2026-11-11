import AppMgr from '@/managers/appmgr';
import LocalDriveService from '@/services/local-drive';
import { fireGoogleUserTree, getUsernameFromEmail } from '@/utils/google-utils';

/**
 * Helpers shared by the Trash and Archived rows of the Explorer, which
 * show My projects items hidden from the tree.
 */

/** The My projects service, or null while the tree shows something else. */
export function localDrive(): LocalDriveService | null {
    const service = AppMgr.getInstance().driveService;
    return service instanceof LocalDriveService ? service : null;
}

/** Reload the project tree after the trash (or the archive) changed it. */
export function refreshTree(): void {
    void fireGoogleUserTree(
        getUsernameFromEmail(AppMgr.getInstance().authService.userProfile.email) ?? '',
    );
}
