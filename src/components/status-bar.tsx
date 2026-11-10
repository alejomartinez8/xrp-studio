import { useTranslation } from 'react-i18next';
import {
    TbAlertTriangle,
    TbCloudCheck,
    TbCloudOff,
    TbDeviceLaptop,
    TbLoader2,
    TbRefresh,
} from 'react-icons/tb';
import { SyncStatus, useSyncStatus } from '@/services/drive-sync';
import { useAutosaveStatus } from '@/utils/autosave';
import { applyUpdate, usePwaState } from '@/utils/pwa';
import { APP_UPSTREAM_VERSION, APP_VERSION_TEXT } from '@/utils/version';

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
 * or a warning when a save failed). The tooltip explains the icon in full. In the installed app
 * it also shows an Update button when a new version is stored (spec 001). On the right it shows the
 * app version, `0.1.0 · a1b2c3d` (spec 006, part 6), with the XRPWeb base in the tooltip.
 */
function StatusBar() {
    const { t } = useTranslation();
    const status = useSyncStatus();
    const autosave = useAutosaveStatus();
    const { updateReady } = usePwaState();
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
            className="text-mountain-mist-800 dark:text-mountain-mist-300 flex items-center gap-3 bg-(--app-frame) px-3"
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
            <div className="ml-auto flex items-center gap-3">
                {updateReady && (
                    <button
                        type="button"
                        data-testid="update-app"
                        title={t('pwa.updateHint')}
                        onClick={() => void applyUpdate()}
                        className="flex items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-blue-700 hover:bg-black/[0.07] dark:text-blue-300 dark:hover:bg-white/[0.12]"
                    >
                        <TbRefresh size={16} />
                        {t('pwa.update')}
                    </button>
                )}
                <span
                    data-testid="app-version"
                    title={t('version.basedOn', { version: APP_UPSTREAM_VERSION })}
                    className="text-xs opacity-80"
                >
                    {APP_VERSION_TEXT}
                </span>
            </div>
        </footer>
    );
}

export default StatusBar;
