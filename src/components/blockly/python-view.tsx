import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { VscCopy } from 'react-icons/vsc';
import { makePythonCopy } from '@components/blockly/python-copy';
import { highlightPython, PYTHON_TOKEN_CLASS as TOKEN_CLASS } from '@/utils/python-highlight';

type PythonViewProps = {
    /** The editor tab of the blocks file. */
    tabId: string;
    /** The Python generated from the blocks. */
    code: string;
};

/**
 * PythonView - the Python of a blocks file, read-only and coloured, shown in place of the blocks
 * when "Python" is chosen in the top bar (spec 003, part 6). A strip on top says where the code
 * comes from and offers an editable Python copy.
 */
function PythonView({ tabId, code }: PythonViewProps) {
    const { t } = useTranslation();
    const lines = useMemo(() => {
        const rows: ReturnType<typeof highlightPython>[] = [[]];
        for (const token of highlightPython(code)) {
            token.text.split('\n').forEach((part, index) => {
                if (index > 0) {
                    rows.push([]);
                }
                if (part) {
                    rows[rows.length - 1].push({ type: token.type, text: part });
                }
            });
        }
        return rows;
    }, [code]);

    return (
        <div
            data-testid="python-view"
            className="absolute inset-0 z-[90] flex flex-col bg-mountain-mist-50 dark:bg-shark-950"
        >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mountain-mist-200 bg-mountain-mist-100 px-4 py-2 text-sm text-shark-700 dark:border-shark-700 dark:bg-shark-900 dark:text-mountain-mist-200">
                <span>{t('pythonFromBlocks')}</span>
                <button
                    type="button"
                    className="flex items-center gap-2 rounded-md bg-curious-blue-600 px-3 py-1.5 font-semibold text-mountain-mist-50 hover:bg-curious-blue-500"
                    onClick={() => void makePythonCopy(tabId, code)}
                >
                    <VscCopy aria-hidden="true" />
                    {t('makePythonCopy')}
                </button>
            </div>
            <pre
                aria-label={t('editorPython')}
                className="font-mono m-0 flex-1 overflow-auto py-3 text-sm leading-6 text-shark-800 dark:text-mountain-mist-100"
            >
                <code>
                    {lines.map((tokens, row) => (
                        <div key={row} className="flex">
                            <span
                                aria-hidden="true"
                                className="w-12 shrink-0 select-none pr-4 text-right text-mountain-mist-400 dark:text-shark-500"
                            >
                                {row + 1}
                            </span>
                            <span className="whitespace-pre">
                                {tokens.map((token, i) => (
                                    <span key={i} className={TOKEN_CLASS[token.type]}>
                                        {token.text}
                                    </span>
                                ))}
                            </span>
                        </div>
                    ))}
                </code>
            </pre>
        </div>
    );
}

export default PythonView;
