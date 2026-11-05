import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TbCpu, TbFolder } from 'react-icons/tb';
import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import { ConnectionState } from '@/connections/connection';
import {
    isMyProjectsActive,
    isRobotConnected,
    showRobotMemory,
    startMyProjects,
} from '@/utils/local-projects';
import { handleSignedIn } from '@/utils/session';

/** Open My projects again if the tree is showing the robot memory. */
async function chooseMyProjects(): Promise<void> {
    if (!isMyProjectsActive()) {
        await handleSignedIn(await startMyProjects());
    }
}

/**
 * StorageSwitch - "My projects | Robot memory" selector above the folder tree. My projects keeps
 * projects in this browser; Robot memory shows the connected XRP's files as XRPWeb does. Robot
 * memory needs a connected robot, and the switch returns to My projects when the robot
 * disconnects.
 */
function StorageSwitch() {
    const { t } = useTranslation();
    const appMgr = AppMgr.getInstance();
    const [isConnected, setConnected] = useState(isRobotConnected());
    const [isMyProjects, setMyProjects] = useState(isMyProjectsActive());

    useEffect(() => {
        const onConnection = (state: string) => {
            const connected = state === ConnectionState.Connected.toString();
            setConnected(connected);
            if (!connected && !isMyProjectsActive()) {
                void chooseMyProjects();
            }
        };
        const onLogin = (status: string) => setMyProjects(status === LoginStatus.LOGGED_IN);
        appMgr.on(EventType.EVENT_CONNECTION_STATUS, onConnection);
        appMgr.on(EventType.EVENT_LOGIN_STATUS, onLogin);
    }, [appMgr]);

    const option = (isActive: boolean, isDisabled = false) =>
        `flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1.5 text-sm ${isActive ? 'bg-curious-blue-600 text-white' : 'text-mountain-mist-800 hover:bg-mountain-mist-200 dark:text-mountain-mist-200 dark:hover:bg-shark-800'} ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`;

    return (
        <div
            role="group"
            aria-label={t('storage.label')}
            className="flex gap-1 bg-mountain-mist-100 p-1 dark:bg-mountain-mist-950"
        >
            <button
                id="storageMyProjects"
                type="button"
                aria-pressed={isMyProjects}
                className={option(isMyProjects)}
                onClick={() => void chooseMyProjects()}
            >
                <TbFolder size={16} />
                {t('storage.myProjects')}
            </button>
            <button
                id="storageRobotMemory"
                type="button"
                aria-pressed={!isMyProjects}
                disabled={!isConnected}
                title={isConnected ? undefined : t('storage.connectToSee')}
                className={option(!isMyProjects, !isConnected)}
                onClick={() => void showRobotMemory()}
            >
                <TbCpu size={16} />
                {t('storage.robotMemory')}
            </button>
        </div>
    );
}

export default StorageSwitch;
