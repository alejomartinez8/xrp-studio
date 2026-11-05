import { Constants } from '@/utils/constants';
import { FileType, NewFileData } from '@/utils/types';

/**
 * New projects created from the welcome screen, without the New File dialog. Like MakeCode, a new
 * project gets a numbered default name (for example `my-project-1.blocks`) in the top folder of
 * the user's projects (My projects or the Google Drive `XRPCode` folder), and is saved right away.
 */

export type ProjectKind = 'blocks' | 'python';

/** File extension for each kind of project. */
export function projectExtension(kind: ProjectKind): string {
    return kind === 'blocks' ? '.blocks' : '.py';
}

/**
 * First free name `<baseName>-<n><extension>` (n from 1) that is not in `existingNames`, ignoring
 * letter case.
 */
export function nextProjectName(
    baseName: string,
    extension: string,
    existingNames: string[],
): string {
    const taken = new Set(existingNames.map((name) => name.toLowerCase()));
    for (let n = 1; ; n++) {
        const name = `${baseName}-${n}${extension}`;
        if (!taken.has(name.toLowerCase())) {
            return name;
        }
    }
}

/**
 * File data for a new project in the folder `folderId` (the top folder of the user's projects),
 * which already holds `existingNames`. `username` maps it to the `/gusers/<username>/` folder used
 * on the robot, as the New File dialog does.
 */
export function newProjectData(
    kind: ProjectKind,
    folderId: string,
    existingNames: string[],
    username: string,
    baseName: string,
): NewFileData {
    const name = nextProjectName(baseName, projectExtension(kind), existingNames);
    return {
        name,
        path: `${Constants.GUSERS_FOLDER}${username}/${name}`,
        gpath: '',
        gparentId: folderId,
        filetype: kind === 'blocks' ? FileType.BLOCKLY : FileType.PYTHON,
        parentId: folderId,
    };
}
