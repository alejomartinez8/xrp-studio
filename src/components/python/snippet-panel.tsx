import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TbChevronDown, TbChevronRight, TbCode, TbLayoutSidebarLeftCollapse } from 'react-icons/tb';
import { CATEGORY_ICONS } from '@components/blockly/toolbox-ui';
import { getSnippetCategories, PythonSnippet, SNIPPET_MIME } from '@components/python/snippets';
import { activeBlockTheme } from '@/theme';
import { isMaxMd } from '@/utils/breakpoints';
import { highlightPython, PYTHON_TOKEN_CLASS } from '@/utils/python-highlight';

type SnippetPanelProps = {
    /** Insert a snippet at the editor's cursor. */
    onInsert: (snippet: PythonSnippet) => void;
};

/**
 * A snippet's code, coloured as in the Python view. A long line wraps after a `.`, `(` or `,`
 * (never inside a name or a number), so `differentialDrive.straight(20, 0.5)` stays readable in
 * the narrow panel.
 */
function SnippetCode({ code }: { code: string }) {
    return (
        <pre className="font-mono m-0 whitespace-pre-wrap break-words text-xs leading-5 text-shark-800 dark:text-mountain-mist-100">
            {highlightPython(code).map((token, i) => (
                <span key={i} className={PYTHON_TOKEN_CLASS[token.type]}>
                    {(token.type === 'text' ? token.text.split(/(?<=[.(,])/) : [token.text]).map(
                        (part, j) => (
                            <span key={j}>
                                {j > 0 && <wbr />}
                                {part}
                            </span>
                        ),
                    )}
                </span>
            ))}
        </pre>
    );
}

/**
 * SnippetPanel - the "Code" panel on the left of a Python file (spec 003, part 7): code snippets
 * grouped like the block toolbox, with its colours and icons, each with a short explanation.
 * A click inserts a snippet at the cursor; dragging it into the code inserts it where it is
 * dropped. The panel folds into a narrow strip; on phones it starts folded and opens as a drawer
 * over the code, which folds again after an insertion.
 */
function SnippetPanel({ onInsert }: SnippetPanelProps) {
    const { t } = useTranslation();
    const categories = useMemo(() => getSnippetCategories(), []);
    const [isOpen, setOpen] = useState(() => !isMaxMd());
    const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.id ?? null);

    const insert = (snippet: PythonSnippet) => {
        onInsert(snippet);
        if (isMaxMd()) setOpen(false);
    };

    if (!isOpen) {
        return (
            <div className="flex w-9 shrink-0 flex-col items-center border-r border-mountain-mist-200 bg-mountain-mist-50 pt-2 dark:border-shark-700 dark:bg-shark-900">
                <button
                    type="button"
                    data-testid="snippet-panel-open"
                    aria-label={t('pythonSnippets.show')}
                    title={t('pythonSnippets.show')}
                    className="flex flex-col items-center gap-1 rounded-md p-1 text-xs font-semibold text-curious-blue-700 hover:bg-mountain-mist-200 dark:text-curious-blue-300 dark:hover:bg-shark-700"
                    onClick={() => setOpen(true)}
                >
                    <TbCode size={20} aria-hidden="true" />
                    <span className="[writing-mode:vertical-rl]">{t('pythonSnippets.title')}</span>
                </button>
            </div>
        );
    }

    return (
        <aside
            data-testid="snippet-panel"
            aria-label={t('pythonSnippets.title')}
            className="absolute inset-y-0 left-0 z-20 flex w-72 max-w-[85%] shrink-0 flex-col border-r border-mountain-mist-200 bg-mountain-mist-50 shadow-lg dark:border-shark-700 dark:bg-shark-900 md:static md:w-64 md:max-w-none md:shadow-none"
        >
            <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <span className="flex items-center gap-2 font-semibold text-shark-800 dark:text-mountain-mist-100">
                    <TbCode size={20} aria-hidden="true" />
                    {t('pythonSnippets.title')}
                </span>
                <button
                    type="button"
                    aria-label={t('pythonSnippets.hide')}
                    title={t('pythonSnippets.hide')}
                    className="rounded-md p-1 text-mountain-mist-500 hover:bg-mountain-mist-200 hover:text-shark-700 dark:text-shark-300 dark:hover:bg-shark-700 dark:hover:text-mountain-mist-100"
                    onClick={() => setOpen(false)}
                >
                    <TbLayoutSidebarLeftCollapse size={20} aria-hidden="true" />
                </button>
            </div>
            <p className="px-3 pb-2 text-xs text-mountain-mist-600 dark:text-shark-300">
                {t('pythonSnippets.hint')}
            </p>
            <div className="flex-1 overflow-y-auto px-2 pb-3">
                {categories.map((category) => {
                    const colour = activeBlockTheme.categories[category.id];
                    const Icon = CATEGORY_ICONS[category.id];
                    const expanded = openCategory === category.id;
                    const name = t(`blockly.toolbox.${category.id}`);
                    return (
                        <section key={category.id} className="mb-1">
                            <button
                                type="button"
                                aria-expanded={expanded}
                                className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm font-semibold text-shark-800 hover:bg-mountain-mist-200 dark:text-mountain-mist-100 dark:hover:bg-shark-700"
                                onClick={() => setOpenCategory(expanded ? null : category.id)}
                            >
                                <span
                                    aria-hidden="true"
                                    className="text-white flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                                    style={{ backgroundColor: colour }}
                                >
                                    {Icon && <Icon size={18} />}
                                </span>
                                <span className="flex-1">{name}</span>
                                {expanded ? (
                                    <TbChevronDown aria-hidden="true" />
                                ) : (
                                    <TbChevronRight aria-hidden="true" />
                                )}
                            </button>
                            {expanded && (
                                <ul className="mt-1 flex flex-col gap-1.5 pl-1">
                                    {category.snippets.map((snippet) => (
                                        <li key={snippet.id}>
                                            <button
                                                type="button"
                                                draggable
                                                data-testid={`snippet-${snippet.id}`}
                                                className="bg-white w-full cursor-grab rounded-md border border-l-4 border-mountain-mist-200 px-2 py-1.5 text-left hover:border-mountain-mist-300 hover:shadow-sm active:cursor-grabbing dark:border-shark-700 dark:bg-shark-950 dark:hover:border-shark-500"
                                                style={{ borderLeftColor: colour }}
                                                onClick={() => insert(snippet)}
                                                onDragStart={(event) => {
                                                    event.dataTransfer.setData(
                                                        SNIPPET_MIME,
                                                        snippet.id,
                                                    );
                                                    event.dataTransfer.setData(
                                                        'text/plain',
                                                        snippet.code,
                                                    );
                                                    event.dataTransfer.effectAllowed = 'copy';
                                                }}
                                            >
                                                <SnippetCode code={snippet.code} />
                                                <span className="mt-1 block text-xs text-shark-600 dark:text-mountain-mist-300">
                                                    {t(`pythonSnippets.items.${snippet.id}`)}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    );
                })}
            </div>
        </aside>
    );
}

export default SnippetPanel;
