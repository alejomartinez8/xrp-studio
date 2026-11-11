import { useTranslation } from 'react-i18next';
import { FiMinusCircle, FiPlusCircle } from 'react-icons/fi';
import AppMgr, { EventType } from '@/managers/appmgr';
import { FontSize } from '@/utils/types';

/**
 * ZoomControls - round "+" and "-" buttons in the bottom right corner of the Python editor, like
 * the zoom buttons of the blocks. They make the code bigger or smaller with the
 * font change the View menu used to offer, which is now hidden (`showFontMenu`).
 */
function ZoomControls() {
    const { t } = useTranslation();

    const button = (label: string, change: FontSize, icon: React.ReactNode) => (
        <button
            type="button"
            aria-label={label}
            title={label}
            className="rounded-full text-mountain-mist-400 hover:text-mountain-mist-600 dark:text-shark-400 dark:hover:text-shark-200"
            onClick={() => AppMgr.getInstance().emit(EventType.EVENT_FONTCHANGE, change)}
        >
            {icon}
        </button>
    );

    return (
        <div
            data-testid="python-zoom"
            className="absolute bottom-6 right-8 z-10 flex flex-col items-center gap-2"
        >
            {button(t('zoomIn'), FontSize.INCREASE, <FiPlusCircle size={30} strokeWidth={1.5} />)}
            {button(t('zoomOut'), FontSize.DESCREASE, <FiMinusCircle size={30} strokeWidth={1.5} />)}
        </div>
    );
}

export default ZoomControls;
