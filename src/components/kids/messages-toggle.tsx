import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Actions } from 'flexlayout-react';
import { TbTerminal2 } from 'react-icons/tb';
import EditorMgr from '@/managers/editormgr';
import { Constants } from '@/utils/constants';

/**
 * MessagesToggle - kids mode button that shows or hides the robot messages (the terminal). The
 * kids layout starts with the editor maximized; toggling the maximize state reveals the terminal
 * underneath, so it stays mounted and keeps receiving output.
 */
function MessagesToggle() {
    const { t } = useTranslation();
    const [isShown, setShown] = useState(false);

    const toggle = () => {
        EditorMgr.getInstance()
            .getLayoutModel()
            ?.doAction(Actions.maximizeToggle(Constants.EDITOR_TABSET_ID));
        setShown(!isShown);
    };

    return (
        <button
            id="kidsMessagesBtn"
            type="button"
            onClick={toggle}
            aria-pressed={isShown}
            title={t('kidsMode.messages')}
            aria-label={t('kidsMode.messages')}
            className={`flex min-h-12 min-w-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-base xl:px-4 ${isShown ? 'text-white bg-curious-blue-600' : 'bg-shark-200 text-matisse-900 hover:bg-curious-blue-300 dark:bg-shark-600 dark:text-shark-100'}`}
        >
            <TbTerminal2 size={22} />
            <span className="hidden xl:inline">{t('kidsMode.messages')}</span>
        </button>
    );
}

export default MessagesToggle;
