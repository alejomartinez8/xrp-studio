import { useTranslation } from 'react-i18next';
import { TbCloudCheck, TbCloudOff, TbDeviceLaptop, TbLoader2 } from 'react-icons/tb';
import { SyncStatus, useSyncStatus } from '@/services/drive-sync';

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
 * StatusBar - thin bar at the bottom of the screen (spec 020). Its first element is the cloud
 * that shows whether the projects are saved in the account: a check when everything is there, a
 * spinner while changes are uploaded, a crossed cloud without connection, and a device when no
 * account is signed in (projects on this device only). The full text is in the tooltip.
 */
function StatusBar() {
    const { t } = useTranslation();
    const status = useSyncStatus();
    const Icon = SYNC_ICONS[status];
    const label = t(SYNC_LABELS[status]);

    return (
        <footer
            role="status"
            aria-label={t('statusBar')}
            style={{ height: STATUS_BAR_HEIGHT_PX }}
            className="flex items-center gap-3 border-t border-mountain-mist-300 bg-mountain-mist-100 px-3 text-mountain-mist-800 dark:border-shark-700 dark:bg-shark-900 dark:text-mountain-mist-300"
        >
            <span
                data-testid="sync-status"
                data-status={status}
                title={label}
                aria-label={label}
                className="flex items-center"
            >
                <Icon size={18} className={status === 'syncing' ? 'animate-spin' : undefined} />
            </span>
        </footer>
    );
}

export default StatusBar;
