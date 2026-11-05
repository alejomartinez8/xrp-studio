import { Constants } from '@/utils/constants';
import { ProjectKind } from '@/utils/new-project';
import { GoogleDriveFile } from '@/services/google-drive';

/**
 * Recent projects for the welcome screen: the newest `.blocks` and `.py` files in the user's
 * projects (My projects or the Google Drive `XRPCode` folder, subfolders included), so a child can
 * go back to yesterday's project with one tap. The trash folder is left out.
 */

/** A project file shown as a card, with what the `EVENT_OPEN_FILE` event needs to open it. */
export type RecentProject = {
    name: string;
    kind: ProjectKind;
    xrpPath: string;
    fileId: string;
    parentId?: string;
    modifiedTime: string;
};

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const TRASH_NAME = Constants.TRASH_FOLDER.slice(1);

/** Kind of project for a file name, or null for other files. */
function projectKind(name: string): ProjectKind | null {
    if (name.endsWith('.blocks')) {
        return 'blocks';
    }
    return name.endsWith('.py') ? 'python' : null;
}

/**
 * The `limit` most recently modified projects under `root` (the `XRPCode` folder tree), newest
 * first. `username` maps them to the `/gusers/<username>/` folder used on the robot, as the folder
 * tree does.
 */
export function recentProjects(
    root: GoogleDriveFile,
    username: string,
    limit = 6,
): RecentProject[] {
    const projects: RecentProject[] = [];
    const visit = (items: GoogleDriveFile[], folderPath: string, isTop: boolean) => {
        for (const item of items) {
            if (item.mimeType === FOLDER_MIME_TYPE) {
                if (!(isTop && item.name === TRASH_NAME)) {
                    visit(item.children ?? [], `${folderPath}${item.name}/`, false);
                }
                continue;
            }
            const kind = projectKind(item.name);
            if (kind && item.modifiedTime) {
                projects.push({
                    name: item.name,
                    kind,
                    xrpPath: `${Constants.GUSERS_FOLDER}${username}/${folderPath}${item.name}`,
                    fileId: item.id,
                    parentId: item.parents?.[0],
                    modifiedTime: item.modifiedTime,
                });
            }
        }
    };
    visit(root.children ?? [], '', true);
    return projects.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime)).slice(0, limit);
}

/** Project name without its extension, as the child typed it. */
export function projectTitle(name: string): string {
    return name.replace(/\.(blocks|py)$/, '');
}

/**
 * How long ago `time` was, in words a child understands ("5 minutes ago", "yesterday",
 * "hace 2 días"), in the app's language; null for less than a minute, which the welcome screen
 * shows as "Just now".
 */
export function timeAgo(time: string, now: Date, locale: string): string | null {
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const seconds = Math.round((new Date(time).getTime() - now.getTime()) / 1000);
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 365 * 24 * 3600],
        ['month', 30 * 24 * 3600],
        ['week', 7 * 24 * 3600],
        ['day', 24 * 3600],
        ['hour', 3600],
        ['minute', 60],
    ];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return format.format(Math.round(seconds / size), unit);
        }
    }
    return null;
}
