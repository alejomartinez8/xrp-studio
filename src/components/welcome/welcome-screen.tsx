import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { TbArrowBackUp, TbRadar, TbRoute, TbSquare } from 'react-icons/tb';
import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import { Constants } from '@/utils/constants';
import {
    Example,
    ExampleId,
    EXAMPLES,
    exampleContent,
    suggestedExampleName,
} from '@/utils/examples';
import { getUsernameFromEmail } from '@/utils/google-utils';
import {
    cleanProjectName,
    newProjectData,
    ProjectKind,
    projectExtension,
    projectNameProblem,
} from '@/utils/new-project';
import { projectTitle, RecentProject, recentProjects, timeAgo } from '@/utils/recent-projects';
import logger from '@/utils/logger';
import blockIcon from '@assets/images/blockly.svg';
import pythonIcon from '@assets/images/python-svgrepo-com.svg';

/**
 * The project being named: its kind, the folder it goes in, the names already there and, for a
 * copy of an example, its content.
 */
type Draft = {
    kind: ProjectKind;
    folderId: string;
    existingNames: string[];
    content?: string;
};

/** Icon of each example card. */
const EXAMPLE_ICONS: Record<ExampleId, IconType> = {
    driveAndTurn: TbArrowBackUp,
    square: TbSquare,
    avoidObstacles: TbRadar,
    followLine: TbRoute,
};

const welcomeLogger = logger.child({ module: 'welcome' });

/**
 * Welcome screen shown in the editor area when no tab is open, so the app never starts on an
 * empty space. Like MakeCode, the child picks blocks or Python and names the project (no name is
 * suggested, so the child thinks of one that is easy to find later); it is saved right away in the
 * user's projects (My projects or Google Drive) and opened, without the New File dialog. Without a place
 * to save projects (signed out of Google), it asks to sign in first. Below, the most recent
 * projects open with one tap, and examples start a blocks project from a working program: the
 * example's name is suggested (with a number when taken) and the copy goes through the same
 * naming step.
 */
function WelcomeScreen() {
    const { t, i18n } = useTranslation();
    const [recents, setRecents] = useState<RecentProject[]>([]);
    const [isBusy, setIsBusy] = useState(false);
    const [needsSignIn, setNeedsSignIn] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [name, setName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let isMounted = true;
        const appMgr = AppMgr.getInstance();
        /** List the most recent projects, or none while signed out. */
        const loadRecents = async () => {
            if (!appMgr.authService.isLogin) {
                setRecents([]);
                return;
            }
            try {
                const tree = await appMgr.driveService.buildTree(Constants.XRPCODE);
                const username = getUsernameFromEmail(appMgr.authService.userProfile.email) ?? '';
                if (isMounted) {
                    setRecents(recentProjects(tree, username));
                }
            } catch (error) {
                welcomeLogger.error(
                    `Could not list recent projects: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        };
        const onLogin = (status: string) => {
            if (status === LoginStatus.LOGGED_IN) {
                setNeedsSignIn(false);
            }
            void loadRecents();
        };
        void loadRecents();
        appMgr.on(EventType.EVENT_LOGIN_STATUS, onLogin);
        return () => {
            isMounted = false;
            appMgr.removeHandler(EventType.EVENT_LOGIN_STATUS, onLogin);
        };
    }, []);

    /** Open a recent project in a tab, as the folder tree does. */
    const openRecent = (project: RecentProject) => {
        AppMgr.getInstance().emit(
            EventType.EVENT_OPEN_FILE,
            JSON.stringify({
                xrpPath: project.xrpPath,
                gPath: project.fileId,
                gparentId: project.parentId,
            }),
        );
    };

    useEffect(() => {
        if (draft) {
            nameInputRef.current?.focus();
        }
    }, [draft]);

    /**
     * Look up the projects folder and the names already in it, then ask for a name: empty for a
     * new project, or the example's title for a copy of an example.
     */
    const startProject = async (kind: ProjectKind, example?: Example) => {
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
            setName(
                example
                    ? suggestedExampleName(
                          cleanProjectName(t(`welcome.examples.${example.id}.title`)),
                          projectExtension(kind),
                          existingNames,
                      )
                    : '',
            );
            setDraft({
                kind,
                folderId: folder.id,
                existingNames,
                content: example ? exampleContent(example) : undefined,
            });
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
        appMgr.emit(
            EventType.EVENT_NEW_PROJECT,
            JSON.stringify(draft.content ? { ...data, content: draft.content } : data),
        );
        setDraft(null);
    };

    const card =
        'flex w-56 flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center shadow-xs transition ' +
        'hover:-translate-y-0.5 hover:shadow-md focus:outline-hidden focus-visible:ring-4 ' +
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
                            placeholder={t('welcome.namePlaceholder')}
                            aria-invalid={problem !== null}
                            aria-describedby="welcome-project-name-hint"
                            className="min-w-0 flex-1 border-0 bg-shark-50 p-0 text-lg text-shark-800 outline-hidden focus:ring-0 dark:bg-shark-800 dark:text-mountain-mist-100"
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
                {recents.length > 0 && (
                    <section className="flex w-full max-w-3xl flex-col gap-3">
                        <h3 className="text-lg font-semibold text-shark-700 dark:text-mountain-mist-200">
                            {t('welcome.recentTitle')}
                        </h3>
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {recents.map((project) => (
                                <li key={project.fileId}>
                                    <button
                                        type="button"
                                        onClick={() => openRecent(project)}
                                        className="flex w-full items-center gap-3 rounded-xl border-2 border-mountain-mist-200 bg-shark-50 px-4 py-3 text-left transition hover:border-curious-blue-300 hover:shadow-xs focus:outline-hidden focus-visible:ring-4 focus-visible:ring-curious-blue-400 dark:border-shark-700 dark:bg-shark-800 dark:hover:border-curious-blue-500"
                                    >
                                        <img
                                            src={project.kind === 'blocks' ? blockIcon : pythonIcon}
                                            alt=""
                                            className="h-9 w-9 shrink-0"
                                        />
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate font-semibold text-shark-800 dark:text-mountain-mist-100">
                                                {projectTitle(project.name)}
                                            </span>
                                            <span className="text-sm text-shark-600 dark:text-mountain-mist-300">
                                                {timeAgo(
                                                    project.modifiedTime,
                                                    new Date(),
                                                    i18n.language,
                                                ) ?? t('welcome.justNow')}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                <section className="flex w-full max-w-3xl flex-col gap-3">
                    <h3 className="text-lg font-semibold text-shark-700 dark:text-mountain-mist-200">
                        {t('welcome.examplesTitle')}
                    </h3>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {EXAMPLES.map((example) => {
                            const Icon = EXAMPLE_ICONS[example.id];
                            return (
                                <li key={example.id}>
                                    <button
                                        type="button"
                                        data-testid={`example-${example.id}`}
                                        onClick={() => void startProject('blocks', example)}
                                        disabled={isBusy}
                                        className="flex w-full items-center gap-3 rounded-xl border-2 border-mountain-mist-200 bg-shark-50 px-4 py-3 text-left transition hover:border-curious-blue-300 hover:shadow-xs focus:outline-hidden focus-visible:ring-4 focus-visible:ring-curious-blue-400 disabled:cursor-wait disabled:opacity-60 dark:border-shark-700 dark:bg-shark-800 dark:hover:border-curious-blue-500"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-curious-blue-100 text-curious-blue-700 dark:bg-curious-blue-900 dark:text-curious-blue-200">
                                            <Icon size={24} aria-hidden="true" />
                                        </span>
                                        <span className="flex min-w-0 flex-col">
                                            <span className="font-semibold text-shark-800 dark:text-mountain-mist-100">
                                                {t(`welcome.examples.${example.id}.title`)}
                                            </span>
                                            <span className="text-sm text-shark-600 dark:text-mountain-mist-300">
                                                {t(`welcome.examples.${example.id}.hint`)}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
                <p role="status" className={hint}>
                    {needsSignIn
                        ? t('welcome.signInFirst')
                        : recents.length > 0
                          ? t('welcome.moreHint')
                          : t('welcome.openHint')}
                </p>
            </div>
        </div>
    );
}

export default WelcomeScreen;
