import { useTranslation } from 'react-i18next';
import {
    TbAlertTriangle,
    TbCloudCheck,
    TbCloudOff,
    TbDeviceLaptop,
    TbLoader2,
} from 'react-icons/tb';
import { SyncStatus, useSyncStatus } from '@/services/drive-sync';
import { useAutosaveStatus } from '@/utils/autosave';

const SYNC_ICONS: Record<SyncStatus, typeof TbCloudCheck> = {
    off: TbDeviceLaptop,
    syncing: TbLoader2,
    synced: TbCloudCheck,
    offline: TbCloudOff,
};

const SYNC_LABELS: Record<SyncStatus, string> = {
    off: 'sync.local',
    syncing: 'sync.syncing',
    synced: 'sync.synced',
    offline: 'sync.offline',
};

/** Height of the status bar, so the layout above it can leave the room. */
export const STATUS_BAR_HEIGHT_PX = 28;

/**
 * StatusBar - thin bar at the bottom of the screen (specs 004 and 005). It has one indicator: an
 * icon for where the projects are kept (a device when no account is signed in, a cloud with a
 * check when they are saved in the account, a spinner while changes are uploaded, a crossed cloud
 * without connection) and, after the first change, the automatic save text ("Saving…", "Saved",
 * or a warning when a save failed). The tooltip explains the icon in full.
 */
function StatusBar() {
    const { t } = useTranslation();
    const status = useSyncStatus();
    const autosave = useAutosaveStatus();
    const failed = autosave === 'error';
    const Icon = failed ? TbAlertTriangle : SYNC_ICONS[status];
    const spinning = !failed && (status === 'syncing' || autosave === 'saving');
    const label = failed
        ? `${t('autosave.error')}. ${t('autosave.retry')}`
        : t(SYNC_LABELS[status]);

    return (
        <footer
            role="status"
            aria-label={t('statusBar')}
            style={{ height: STATUS_BAR_HEIGHT_PX }}
            className="flex items-center gap-3 bg-[var(--app-frame)] px-3 text-mountain-mist-800 dark:text-mountain-mist-300"
        >
            <span
                data-testid="sync-status"
                data-status={status}
                title={label}
                aria-label={label}
                className="flex items-center gap-1.5 text-sm"
            >
                <Icon size={18} className={spinning ? 'animate-spin' : undefined} />
                {autosave !== 'idle' && (
                    <span data-testid="save-status">{t(`autosave.${autosave}`)}</span>
                )}
            </span>
        </footer>
    );
}

export default StatusBar;
