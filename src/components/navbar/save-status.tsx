import { useTranslation } from 'react-i18next';
import { TbAlertTriangle, TbCircleCheck, TbLoader2 } from 'react-icons/tb';
import { useAutosaveStatus } from '@/utils/autosave';

/**
 * SaveStatus - small label next to the menus that shows the automatic save (spec 019): "Saving…"
 * while a change waits or is written, "Saved" once everything is stored, and a warning when a save
 * failed (the change stays in this browser and is tried again). Hidden until the first change.
 */
function SaveStatus() {
    const { t } = useTranslation();
    const status = useAutosaveStatus();

    if (status === 'idle') {
        return null;
    }
    return (
        <p
            role="status"
            data-testid="save-status"
            title={status === 'error' ? t('autosave.retry') : undefined}
            className="ml-2 mt-4 flex items-center gap-1 text-sm text-matisse-100 opacity-80"
        >
            {status === 'saving' && <TbLoader2 size={16} className="animate-spin" />}
            {status === 'saved' && <TbCircleCheck size={16} />}
            {status === 'error' && <TbAlertTriangle size={16} />}
            <span>{t(`autosave.${status}`)}</span>
        </p>
    );
}

export default SaveStatus;
