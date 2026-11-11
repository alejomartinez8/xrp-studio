import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPuzzlePiece } from 'react-icons/fa';
import { FaPython } from 'react-icons/fa6';
import { EditorView, getEditorView, onEditorViewChange, setEditorView } from '@/utils/editor-view';

type EditorSwitchProps = {
    /** The active editor tab. */
    tabId: string;
    /** Whether the active tab is a blocks file; a Python file shows only a "Python" label. */
    isBlocks: boolean;
};

/**
 * EditorSwitch - the "Blocks | Python" selector in the middle of the top bar, as in MakeCode.
 * For a blocks file it switches between the blocks and their Python
 * (read-only); a Python file has no blocks, so it only says "Python". On phones the options show
 * only their icons, so the selector fits between the logo and the connect button.
 */
function EditorSwitch({ tabId, isBlocks }: EditorSwitchProps) {
    const { t } = useTranslation();
    const [view, setView] = useState<EditorView>(() => getEditorView(tabId));

    useEffect(() => {
        setView(getEditorView(tabId));
        return onEditorViewChange((changedTab, changedView) => {
            if (changedTab === tabId) {
                setView(changedView);
            }
        });
    }, [tabId]);

    if (!isBlocks) {
        return (
            <div
                data-testid="editor-switch"
                className="flex items-center gap-2 px-3 py-1.5 font-semibold text-mountain-mist-50"
            >
                <FaPython aria-hidden="true" />
                {t('editorPython')}
            </div>
        );
    }

    const option = (value: EditorView, label: string, icon: React.ReactNode) => {
        const selected = view === value;
        return (
            <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                title={label}
                className={`flex items-center gap-2 rounded-full px-3 py-1 font-semibold transition-colors md:px-4 ${
                    selected
                        ? 'bg-mountain-mist-50 text-shark-900 shadow-xs'
                        : 'text-mountain-mist-100 hover:bg-matisse-500'
                }`}
                onClick={() => setEditorView(tabId, value)}
            >
                {icon}
                <span className="hidden sm:inline">{label}</span>
            </button>
        );
    };

    return (
        <div
            data-testid="editor-switch"
            role="radiogroup"
            aria-label={t('editorChoose')}
            className="flex items-center gap-1 rounded-full border border-matisse-500 bg-matisse-800 p-1 text-sm"
        >
            {option('blocks', t('editorBlocks'), <FaPuzzlePiece aria-hidden="true" />)}
            {option('python', t('editorPython'), <FaPython aria-hidden="true" />)}
        </div>
    );
}

export default EditorSwitch;
