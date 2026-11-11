import FolderTree from '@/components/folder-tree';
import DialogFooter from './dialog-footer';
import { FileType, FolderItem, NewFileData } from '@/utils/types';
import { useCallback, useEffect, useState } from 'react';
import { useReadLocalStorage } from 'usehooks-ts';
import { StorageKeys } from '@/utils/localstorage';
import EditorMgr from '@/managers/editormgr';
import { useTranslation } from 'react-i18next';
import AppMgr from '@/managers/appmgr';
import { Constants } from '@/utils/constants';
import { getUsernameFromEmail } from '@/utils/google-utils';
import { EditorType } from '@/utils/types';

type FileSaveAsProps = {
    saveCallback: (fileData: NewFileData) => void;
    toggleDialog: () => void;
};

/**
 * FileSaveAs Dialog Content
 * @param fileSaveAsProps
 * @returns
 */
function FileSaveAsDialg(fileSaveAsProps: FileSaveAsProps) {
    const { t } = useTranslation();
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [gFolderId, setGFolderId] = useState<string>('');
    const activeTab = useReadLocalStorage<string>(StorageKeys.ACTIVETAB);
    const [isFileExists, setIsFileExists] = useState(false);
    const [isOkayToSubmit, setIsOkayToSubmit] = useState(false);
    const [filename, setFilename] = useState<string>('');
    const [folderList, setFolderList] = useState<FolderItem[] | null>(null);

    const buildDestinationPath = (folderPath: string, name: string): string => {
        if (!folderPath || folderPath === '/') {
            return `/${name}`;
        }
        const folder = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
        return `${folder}${name}`.replace(/\/+/g, '/');
    };

    const toTreeFolderPath = (folderPath: string): string => {
        if (folderPath.includes(Constants.GUSERS_FOLDER)) {
            const username = getUsernameFromEmail(
                AppMgr.getInstance().authService.userProfile.email,
            );
            if (username) {
                return folderPath.replace(`${Constants.GUSERS_FOLDER}${username}/`, '/XRPCode/');
            }
        }
        return folderPath;
    };

    const findFolderByPath = (items: FolderItem[], targetPath: string): FolderItem | null => {
        const normalizedTarget = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;
        for (const item of items) {
            if (item.children === null) {
                continue;
            }
            const itemPath = item.path.endsWith('/') ? item.path : `${item.path}/`;
            if (itemPath === normalizedTarget) {
                return item;
            }
            if (item.children) {
                const folders = item.children.filter((child) => child.children !== null);
                const found = findFolderByPath(folders, targetPath);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    };

    /**
     * get folder list from AppMgr
     */
    useEffect(() => {
        const appMgr = AppMgr.getInstance();
        setFolderList(appMgr.getFolderList());
    }, []);

    const validateFilename = useCallback((name: string, folderPath: string) => {
        const isValid = Constants.REGEX_FILENAME.test(name);
        const destinationPath = buildDestinationPath(folderPath, name);
        if (!isValid || AppMgr.getInstance().IsFileExistsAtPath(destinationPath)) {
            setIsFileExists(true);
            setIsOkayToSubmit(false);
        } else {
            setIsFileExists(false);
            setIsOkayToSubmit(true);
        }
    }, []);

    /**
     * handleFileSave - collects the selected file and save to XRP
     */
    const handleFileSave = () => {
        const tabId = activeTab?.replace(/^"|"$/g, '') ?? '';
        const session = tabId ? EditorMgr.getInstance().getEditorSession(tabId) : undefined;
        const filetype =
            filename.includes('.blocks') || session?.type === EditorType.BLOCKLY
                ? FileType.BLOCKLY
                : FileType.PYTHON;
        const fileData: NewFileData = {
            name: filename,
            path: selectedFolder,
            gpath: selectedFolder,
            gparentId: gFolderId,
            parentId: '',
            filetype,
        };
        fileSaveAsProps.saveCallback(fileData);
    };

    /**
     * handleFolderSelection - callback function to handle the selected folder
     * @param selectedItem
     */
    const handleFolderSelection = (selectedItem: FolderItem[]) => {
        const path = selectedItem[0].path === '/' ? `` : selectedItem[0].path;
        setSelectedFolder(path);
        setGFolderId(selectedItem[0].id);
        validateFilename(filename, path);
    };

    /**
     * handleFilenameInput
     * @param e
     */
    const handleFilenameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputName = e.target.value;
        setFilename(inputName);
        validateFilename(inputName, selectedFolder);
    };

    useEffect(() => {
        const tabId = activeTab?.replace(/^"|"$/g, '') ?? '';
        if (!tabId || !folderList) {
            return;
        }
        const session = EditorMgr.getInstance().getEditorSession(tabId);
        if (session) {
            const parentEnd = session.path.lastIndexOf('/');
            const parentFolder = parentEnd > 0 ? session.path.substring(0, parentEnd + 1) : '/';
            const treeFolderPath = toTreeFolderPath(parentFolder);
            const folderItem = findFolderByPath(folderList, treeFolderPath);
            const folderPath =
                folderItem?.path === '/'
                    ? ''
                    : (folderItem?.path ?? (treeFolderPath === '/' ? '' : treeFolderPath));
            setSelectedFolder(folderPath);
            setGFolderId(folderItem?.id ?? '');
            setFilename(session.name);
            validateFilename(session.name, folderPath);
        }
    }, [activeTab, folderList, validateFilename]);

    /**
     * handleFocus - selects the filename without the extension when the input is focused.
     * @param e
     */
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const dotIndex = e.target.value.lastIndexOf('.');
        const filenameWithoutExtension =
            dotIndex === -1 ? e.target.value : e.target.value.substring(0, dotIndex);
        e.target.setSelectionRange(0, filenameWithoutExtension.length);
    };

    return (
        <div className="flex h-auto w-96 flex-col gap-2 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('saveFileAs')}
                </h1>
                <p className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('choose-dest-file')}
                </p>
            </div>
            <hr className="w-full border-mountain-mist-600 dark:border-mountain-mist-200" />
            <label className="text-mountain-mist-700 dark:text-mountain-mist-300">
                {t('destFolder')}: {selectedFolder}
            </label>
            <div className="h-48 w-full overflow-y-auto border border-shark-300 dark:border-shark-600">
                <FolderTree
                    treeData={JSON.stringify(folderList)}
                    theme=""
                    onSelected={handleFolderSelection}
                />
            </div>
            <label className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                {t('filename')}
            </label>
            <div>
                <input
                    className={`text-md w-full rounded-sm border p-2 text-mountain-mist-700 dark:bg-shark-500 dark:text-mountain-mist-200 dark:placeholder-mountain-mist-200 ${isFileExists ? 'border-cinnabar-800' : 'border-shark-300 dark:border-shark-600'}`}
                    id="filenameId"
                    type="text"
                    placeholder={t('enterFilename')}
                    value={filename}
                    required
                    onChange={handleFilenameInput}
                    onFocus={handleFocus}
                    minLength={2}
                />
                {isFileExists && (
                    <span className="text-sm text-cinnabar-800 dark:text-cinnabar-400">
                        {t('fileExists')}
                    </span>
                )}
            </div>
            <label className="text-mountain-mist-700 dark:text-mountain-mist-300">
                {t('final-path')}
                {selectedFolder}
                {filename}
            </label>
            <hr className="w-full border-mountain-mist-600 dark:border-mountain-mist-200" />
            <DialogFooter
                disabledAccept={!isOkayToSubmit}
                btnCancelCallback={fileSaveAsProps.toggleDialog}
                btnAcceptLabel={t('save')}
                btnAcceptCallback={handleFileSave}
            />
        </div>
    );
}

export default FileSaveAsDialg;
