import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppMgr, { EventType } from '@/managers/appmgr';
import { Constants } from '@/utils/constants';
import { getUsernameFromEmail } from '@/utils/google-utils';
import { newProjectData, ProjectKind } from '@/utils/new-project';
import logger from '@/utils/logger';
import blockIcon from '@assets/images/blockly.svg';
import pythonIcon from '@assets/images/python-svgrepo-com.svg';

/**
 * Welcome screen shown in the editor area when no tab is open, so the app never starts on an
 * empty space. Like MakeCode, one tap creates a project with a numbered name, saves it right away
 * in the user's projects (My projects or Google Drive) and opens the editor, without the New File
 * dialog. Without a place to save projects (signed out of Google), it asks to sign in first.
 */
function WelcomeScreen() {
    const { t } = useTranslation();
    const [isCreating, setIsCreating] = useState(false);
    const [needsSignIn, setNeedsSignIn] = useState(false);

    /** Create the project in the top folder of the user's projects and open it. */
    const createProject = async (kind: ProjectKind) => {
        const appMgr = AppMgr.getInstance();
        if (!appMgr.authService.isLogin) {
            setNeedsSignIn(true);
            return;
        }
        setIsCreating(true);
        try {
            const driveService = appMgr.driveService;
            const folder = await driveService.findFolderByName(Constants.XRPCODE);
            if (!folder) {
                throw new Error(`${Constants.XRPCODE} folder not found`);
            }
            const files = await driveService.getFileListByFolderId(folder.id);
            const username = getUsernameFromEmail(appMgr.authService.userProfile.email) ?? '';
            const data = newProjectData(
                kind,
                folder.id,
                files.map((file) => file.name),
                username,
                t('welcome.projectBaseName'),
            );
            appMgr.emit(EventType.EVENT_NEW_PROJECT, JSON.stringify(data));
        } catch (error) {
            logger
                .child({ module: 'welcome' })
                .error(
                    `Could not create a project: ${error instanceof Error ? error.message : String(error)}`,
                );
        } finally {
            setIsCreating(false);
        }
    };

    const card =
        'flex w-56 flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center shadow-sm transition ' +
        'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 ' +
        'focus-visible:ring-curious-blue-400 disabled:cursor-wait disabled:opacity-60';

    return (
        <div className="flex h-full w-full overflow-auto bg-mountain-mist-50 p-6 dark:bg-shark-950">
            <div className="m-auto flex flex-col items-center gap-8">
                <h2 className="text-center text-2xl font-bold text-shark-800 dark:text-mountain-mist-100">
                    {t('welcome.title')}
                </h2>
                <div className="flex flex-wrap justify-center gap-6">
                    <button
                        type="button"
                        className={`${card} bg-white border-curious-blue-300 dark:border-curious-blue-500 dark:bg-shark-800`}
                        onClick={() => void createProject('blocks')}
                        disabled={isCreating}
                    >
                        <img src={blockIcon} alt="" className="h-16 w-16" />
                        <span className="text-lg font-semibold text-shark-800 dark:text-mountain-mist-100">
                            {t('welcome.newBlocks')}
                        </span>
                        <span className="text-sm text-shark-600 dark:text-mountain-mist-300">
                            {t('welcome.newBlocksHint')}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={`${card} bg-white border-mountain-mist-300 dark:border-shark-600 dark:bg-shark-800`}
                        onClick={() => void createProject('python')}
                        disabled={isCreating}
                    >
                        <img src={pythonIcon} alt="" className="h-16 w-16" />
                        <span className="text-lg font-semibold text-shark-800 dark:text-mountain-mist-100">
                            {t('welcome.newPython')}
                        </span>
                        <span className="text-sm text-shark-600 dark:text-mountain-mist-300">
                            {t('welcome.newPythonHint')}
                        </span>
                    </button>
                </div>
                <p
                    role="status"
                    className="text-center text-sm text-shark-600 dark:text-mountain-mist-300"
                >
                    {needsSignIn ? t('welcome.signInFirst') : t('welcome.openHint')}
                </p>
            </div>
        </div>
    );
}

export default WelcomeScreen;
