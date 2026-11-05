import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppMgr, { EventType } from '@/managers/appmgr';
import { Constants } from '@/utils/constants';
import { getUsernameFromEmail } from '@/utils/google-utils';
import {
    cleanProjectName,
    newProjectData,
    nextProjectName,
    ProjectKind,
    projectExtension,
    projectNameProblem,
} from '@/utils/new-project';
import logger from '@/utils/logger';
import blockIcon from '@assets/images/blockly.svg';
import pythonIcon from '@assets/images/python-svgrepo-com.svg';

/** The project being named: its kind, the folder it goes in and the names already there. */
type Draft = {
    kind: ProjectKind;
    folderId: string;
    existingNames: string[];
};

const welcomeLogger = logger.child({ module: 'welcome' });

/**
 * Welcome screen shown in the editor area when no tab is open, so the app never starts on an
 * empty space. Like MakeCode, the child picks blocks or Python, names the project (a numbered name
 * is suggested, so it can be created in one more tap) and it is saved right away in the user's
 * projects (My projects or Google Drive) and opened, without the New File dialog. Without a place
 * to save projects (signed out of Google), it asks to sign in first.
 */
function WelcomeScreen() {
    const { t } = useTranslation();
    const [isBusy, setIsBusy] = useState(false);
    const [needsSignIn, setNeedsSignIn] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [name, setName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (draft) {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }
    }, [draft]);

    /** Look up the projects folder and suggest a numbered name for a new project of `kind`. */
    const startProject = async (kind: ProjectKind) => {
        const appMgr = AppMgr.getInstance();
        if (!appMgr.authService.isLogin) {
            setNeedsSignIn(true);
            return;
        }
        setIsBusy(true);
        try {
            const driveService = appMgr.driveService;
            const folder = await driveService.findFolderByName(Constants.XRPCODE);
            if (!folder) {
                throw new Error(`${Constants.XRPCODE} folder not found`);
            }
            const files = await driveService.getFileListByFolderId(folder.id);
            const existingNames = files.map((file) => file.name);
            const extension = projectExtension(kind);
            const suggested = nextProjectName(
                t('welcome.projectBaseName'),
                extension,
                existingNames,
            );
            setName(suggested.slice(0, -extension.length));
            setDraft({ kind, folderId: folder.id, existingNames });
        } catch (error) {
            welcomeLogger.error(
                `Could not start a project: ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            setIsBusy(false);
        }
    };

    const extension = draft ? projectExtension(draft.kind) : '';
    const problem = draft ? projectNameProblem(name, extension, draft.existingNames) : null;

    /** Create the named project and open it. */
    const createProject = (event: React.FormEvent) => {
        event.preventDefault();
        if (!draft || problem) {
            return;
        }
        const appMgr = AppMgr.getInstance();
        const username = getUsernameFromEmail(appMgr.authService.userProfile.email) ?? '';
        const data = newProjectData(
            draft.kind,
            draft.folderId,
            `${name.trim()}${extension}`,
            username,
        );
        appMgr.emit(EventType.EVENT_NEW_PROJECT, JSON.stringify(data));
        setDraft(null);
    };

    const card =
        'flex w-56 flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center shadow-sm transition ' +
        'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 ' +
        'focus-visible:ring-curious-blue-400 disabled:cursor-wait disabled:opacity-60';
    const title = 'text-center text-2xl font-bold text-shark-800 dark:text-mountain-mist-100';
    const hint = 'text-center text-sm text-shark-600 dark:text-mountain-mist-300';

    if (draft) {
        return (
            <div className="flex h-full w-full overflow-auto bg-mountain-mist-50 p-6 dark:bg-shark-950">
                <form
                    className="m-auto flex w-full max-w-md flex-col items-center gap-6"
                    onSubmit={createProject}
                >
                    <img
                        src={draft.kind === 'blocks' ? blockIcon : pythonIcon}
                        alt=""
                        className="h-14 w-14"
                    />
                    <label htmlFor="welcome-project-name" className={title}>
                        {t('welcome.nameTitle')}
                    </label>
                    <div className="flex w-full items-center gap-2 rounded-xl border-2 border-curious-blue-300 bg-shark-50 px-4 py-3 dark:border-curious-blue-500 dark:bg-shark-800">
                        <input
                            id="welcome-project-name"
                            ref={nameInputRef}
                            value={name}
                            onChange={(e) => setName(cleanProjectName(e.target.value))}
                            maxLength={60}
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={problem !== null}
                            aria-describedby="welcome-project-name-hint"
                            className="min-w-0 flex-1 border-0 bg-shark-50 p-0 text-lg text-shark-800 outline-none focus:ring-0 dark:bg-shark-800 dark:text-mountain-mist-100"
                        />
                        <span className="text-lg text-shark-500 dark:text-mountain-mist-400">
                            {extension}
                        </span>
                    </div>
                    <p id="welcome-project-name-hint" role="status" className={hint}>
                        {problem === 'exists'
                            ? t('welcome.nameExists')
                            : problem === 'invalid'
                              ? t('welcome.nameInvalid')
                              : t('welcome.nameHint')}
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setDraft(null)}
                            className="rounded-xl border-2 border-mountain-mist-300 px-6 py-3 text-lg text-shark-700 hover:bg-mountain-mist-100 dark:border-shark-600 dark:text-mountain-mist-200 dark:hover:bg-shark-800"
                        >
                            {t('welcome.back')}
                        </button>
                        <button
                            type="submit"
                            disabled={problem !== null}
                            className="rounded-xl bg-curious-blue-600 px-8 py-3 text-lg font-semibold text-shark-50 hover:bg-curious-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {t('welcome.create')}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-auto bg-mountain-mist-50 p-6 dark:bg-shark-950">
            <div className="m-auto flex flex-col items-center gap-8">
                <h2 className={title}>{t('welcome.title')}</h2>
                <div className="flex flex-wrap justify-center gap-6">
                    <button
                        type="button"
                        className={`${card} border-curious-blue-300 bg-shark-50 dark:border-curious-blue-500 dark:bg-shark-800`}
                        onClick={() => void startProject('blocks')}
                        disabled={isBusy}
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
                        className={`${card} border-mountain-mist-300 bg-shark-50 dark:border-shark-600 dark:bg-shark-800`}
                        onClick={() => void startProject('python')}
                        disabled={isBusy}
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
                <p role="status" className={hint}>
                    {needsSignIn ? t('welcome.signInFirst') : t('welcome.openHint')}
                </p>
            </div>
        </div>
    );
}

export default WelcomeScreen;
