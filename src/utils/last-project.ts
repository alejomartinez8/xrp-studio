import AppMgr, { EventType } from '@/managers/appmgr';
import { StorageKeys } from '@/utils/localstorage';
import { FolderItem } from '@/utils/types';

/**
 * Reopen the last project on startup. XRPWeb restores the tabs that were open when the page was
 * closed; if the user had closed them all, the editor area starts empty. XRP Studio remembers the
 * file of the last tab that was closed and, when the app starts with no tabs, opens it again as
 * soon as the user's projects are listed (My projects or Google Drive). A file that no longer
 * exists is skipped. The robot's own memory is never reopened this way.
 */

let hasTriedReopen = false;

/** Remember the XRP path of the project whose tab was the last one closed. */
export function rememberLastProject(xrpPath: string): void {
    try {
        localStorage.setItem(StorageKeys.LAST_PROJECT, xrpPath);
    } catch {
        return;
    }
}

/** The remembered XRP path, if any. */
export function lastProject(): string | null {
    try {
        return localStorage.getItem(StorageKeys.LAST_PROJECT);
    } catch {
        return null;
    }
}

/** Find the file whose XRP path (as computed by `toXrpPath`) is `xrpPath`. */
export function findFileByXrpPath(
    items: FolderItem[],
    xrpPath: string,
    toXrpPath: (item: FolderItem) => string,
): FolderItem | undefined {
    for (const item of items) {
        if (item.children === null) {
            if (toXrpPath(item) === xrpPath) {
                return item;
            }
        } else {
            const found = findFileByXrpPath(item.children, xrpPath, toXrpPath);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

/**
 * Called each time the folder tree is listed. The first time the user's projects are listed after
 * startup, open the remembered project if no tab is open (`hasOpenTabs`, for example the tabs
 * XRPWeb restored). Later listings do nothing, so closing every tab while working leaves the editor
 * area empty.
 */
export function reopenLastProject(
    items: FolderItem[],
    toXrpPath: (item: FolderItem) => string,
    hasOpenTabs: boolean,
): void {
    if (hasTriedReopen || !AppMgr.getInstance().authService.isLogin) {
        return;
    }
    hasTriedReopen = true;
    if (hasOpenTabs) {
        return;
    }
    const xrpPath = lastProject();
    const file = xrpPath ? findFileByXrpPath(items, xrpPath, toXrpPath) : undefined;
    if (!xrpPath || !file) {
        return;
    }
    AppMgr.getInstance().emit(
        EventType.EVENT_OPEN_FILE,
        JSON.stringify({ xrpPath, gPath: file.fileId, gparentId: file.gparentId }),
    );
}

/** Allow another reopen attempt (tests only). */
export function resetLastProjectForTests(): void {
    hasTriedReopen = false;
}
