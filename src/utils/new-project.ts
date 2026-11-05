import { Constants } from '@/utils/constants';
import { FileType, NewFileData } from '@/utils/types';

/**
 * New projects created from the welcome screen, without the New File dialog. Like MakeCode, the
 * child names the project (a numbered name such as `my-project-1` is suggested); it goes in the top
 * folder of the user's projects (My projects or the Google Drive `XRPCode` folder) and is saved
 * right away.
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
 * File data for a new project named `fileName` (with extension) in the folder `folderId`, the top
 * folder of the user's projects. `username` maps it to the `/gusers/<username>/` folder used on
 * the robot, as the New File dialog does.
 */
export function newProjectData(
    kind: ProjectKind,
    folderId: string,
    fileName: string,
    username: string,
): NewFileData {
    return {
        name: fileName,
        path: `${Constants.GUSERS_FOLDER}${username}/${fileName}`,
        gpath: '',
        gparentId: folderId,
        filetype: kind === 'blocks' ? FileType.BLOCKLY : FileType.PYTHON,
        parentId: folderId,
    };
}

/**
 * Make a typed name safe for the robot's file system without bothering the child: accents are
 * dropped (`ñandú` becomes `nandu`), since file names allow only plain letters, numbers, spaces,
 * `.`, `-` and `_` (`Constants.REGEX_FILENAME`).
 */
export function cleanProjectName(input: string): string {
    return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export type ProjectNameProblem = 'empty' | 'invalid' | 'exists';

/** Why `name` (without extension) cannot be used for a new project, or null when it can. */
export function projectNameProblem(
    name: string,
    extension: string,
    existingNames: string[],
): ProjectNameProblem | null {
    const trimmed = name.trim();
    if (!trimmed) {
        return 'empty';
    }
    const fileName = `${trimmed}${extension}`;
    if (!Constants.REGEX_FILENAME.test(fileName)) {
        return 'invalid';
    }
    if (existingNames.some((existing) => existing.toLowerCase() === fileName.toLowerCase())) {
        return 'exists';
    }
    return null;
}
