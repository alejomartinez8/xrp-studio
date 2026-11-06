import { useTranslation } from 'react-i18next';
import { TbRefresh } from 'react-icons/tb';
import { applyUpdate, dismissUpdate, usePwaState } from '@/utils/pwa';

/**
 * UpdateNotice - small card at the bottom of the screen when a new version of the installable app
 * is stored (spec 001). Reload switches to it; Later keeps working and the new version is used the
 * next time the app opens. It never reloads on its own, so no work is lost.
 */
function UpdateNotice() {
    const { t } = useTranslation();
    const { needRefresh } = usePwaState();

    if (!needRefresh) {
        return null;
    }
    return (
        <div
            role="status"
            data-testid="update-notice"
            className="fixed bottom-4 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-4 rounded-lg border border-shark-600 bg-curious-blue-700 px-4 py-3 text-shark-50 shadow-lg dark:bg-shark-800"
        >
            <TbRefresh size={22} />
            <span>{t('pwa.updateReady')}</span>
            <button
                type="button"
                onClick={() => applyUpdate()}
                className="rounded-md bg-curious-blue-600 px-3 py-1.5 font-semibold text-shark-50 hover:bg-curious-blue-500"
            >
                {t('pwa.reload')}
            </button>
            <button
                type="button"
                onClick={dismissUpdate}
                className="rounded-md px-3 py-1.5 hover:bg-matisse-400 dark:hover:bg-shark-500"
            >
                {t('pwa.later')}
            </button>
        </div>
    );
}

export default UpdateNotice;
