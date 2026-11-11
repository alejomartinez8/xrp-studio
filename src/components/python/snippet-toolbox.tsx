import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TbGripVertical, TbSearch } from 'react-icons/tb';
import { CATEGORY_ICONS } from '@components/blockly/toolbox-ui';
import {
    getSnippetCategories,
    PythonSnippet,
    searchSnippets,
    SnippetHit,
} from '@components/python/snippets';
import { activeBlockTheme } from '@/theme';
import { isMaxMd } from '@/utils/breakpoints';
import { highlightPython, PYTHON_TOKEN_CLASS } from '@/utils/python-highlight';

/** Pixels the pointer must move before a press on a snippet becomes a drag. */
const DRAG_THRESHOLD = 8;

/** Id of the "Search" entry of the toolbox, which has no category of its own. */
const SEARCH_ID = 'search';

type SnippetToolboxProps = {
    /** Insert a snippet at the editor's cursor. */
    onInsert: (snippet: PythonSnippet) => void;
    /** The pointer moved while dragging a snippet: the editor follows it with its cursor. */
    onDragMove: (x: number, y: number) => void;
    /** A snippet was dropped at this point of the screen. */
    onDrop: (snippet: PythonSnippet, x: number, y: number) => void;
};

/** A snippet being dragged: what to show under the pointer and where it is. */
type Dragging = { snippet: PythonSnippet; title: string; colour: string; x: number; y: number };

/** A press on a snippet that may turn into a drag. */
type Pressed = { snippet: PythonSnippet; title: string; colour: string; x: number; y: number };

/** The coloured chip's code, highlighted as in the Python view. */
function SnippetCode({ code }: { code: string }) {
    return (
        <pre className="font-mono m-0 whitespace-pre-wrap break-words text-xs font-semibold leading-5 text-shark-800 dark:text-mountain-mist-100">
            {highlightPython(code).map((token, i) => (
                <span key={i} className={PYTHON_TOKEN_CLASS[token.type]}>
                    {token.text}
                </span>
            ))}
        </pre>
    );
}

/**
 * SnippetToolbox - the code toolbox of a Python file (spec 003, part 7), laid out like MakeCode's
 * Python editor: a column of coloured categories (icons only on phones) with a Search entry, and a
 * flyout over the code with the snippets of the chosen category as coloured chips.
 * - A chip expands on click or focus: explanation, code and an "Add to code" button.
 * - Dragging a chip (mouse, pen or finger) drops it in the code; the flyout hides while dragging
 *   and the cursor follows the pointer.
 * - Keyboard: Up and Down move between categories or chips, Enter or Right opens a category or
 *   adds the chip, Left or Escape goes back and closes.
 */
function SnippetToolbox({ onInsert, onDragMove, onDrop }: SnippetToolboxProps) {
    const { t } = useTranslation();
    const categories = useMemo(() => getSnippetCategories(), []);
    const [openId, setOpenId] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [dragging, setDragging] = useState<Dragging | null>(null);
    const pressed = useRef<Pressed | null>(null);
    const dragRef = useRef<Dragging | null>(null);
    const focusFirst = useRef(false);
    const flyoutRef = useRef<HTMLDivElement | null>(null);
    const callbacks = useRef({ onDragMove, onDrop });
    callbacks.current = { onDragMove, onDrop };

    const title = (snippet: PythonSnippet) => t(`pythonSnippets.items.${snippet.id}.title`);
    const text = (snippet: PythonSnippet) => t(`pythonSnippets.items.${snippet.id}.text`);
    const categoryName = (id: string) => t(`blockly.toolbox.${id}`);
    const colourOf = (id: string) =>
        id === SEARCH_ID
            ? activeBlockTheme.categories.advanced
            : (activeBlockTheme.categories[id] ?? activeBlockTheme.categories.advanced);

    const hits: SnippetHit[] = useMemo(
        () => (openId === SEARCH_ID ? searchSnippets(query, (s) => `${title(s)} ${text(s)}`) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [openId, query, t],
    );
    const flyoutItems: { category: string; snippet: PythonSnippet }[] =
        openId === SEARCH_ID
            ? hits
            : (categories
                  .find((category) => category.id === openId)
                  ?.snippets.map((snippet) => ({ category: openId as string, snippet })) ?? []);

    useEffect(() => {
        const move = (event: PointerEvent) => {
            const press = pressed.current;
            if (press && !dragRef.current) {
                const dx = event.clientX - press.x;
                const dy = event.clientY - press.y;
                const far = Math.hypot(dx, dy) >= DRAG_THRESHOLD;
                const horizontal = event.pointerType === 'mouse' || Math.abs(dx) >= Math.abs(dy);
                if (far && horizontal) {
                    dragRef.current = { ...press, x: event.clientX, y: event.clientY };
                    setDragging(dragRef.current);
                }
            }
            if (dragRef.current) {
                dragRef.current = { ...dragRef.current, x: event.clientX, y: event.clientY };
                setDragging(dragRef.current);
                callbacks.current.onDragMove(event.clientX, event.clientY);
            }
        };
        const end = (event: PointerEvent) => {
            const drag = dragRef.current;
            pressed.current = null;
            dragRef.current = null;
            if (drag) {
                setDragging(null);
                setOpenId(null);
                setSelected(null);
                if (event.type === 'pointerup') {
                    callbacks.current.onDrop(drag.snippet, event.clientX, event.clientY);
                }
            }
        };
        const outside = (event: PointerEvent) => {
            const target = event.target as Element | null;
            if (!target?.closest('[data-snippet-ui]')) {
                setOpenId(null);
                setSelected(null);
            }
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end);
        document.addEventListener('pointercancel', end);
        document.addEventListener('pointerdown', outside);
        return () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', end);
            document.removeEventListener('pointercancel', end);
            document.removeEventListener('pointerdown', outside);
        };
    }, []);

    useEffect(() => {
        if (openId && focusFirst.current) {
            focusFirst.current = false;
            flyoutRef.current?.querySelector<HTMLElement>('[data-snippet]')?.focus();
        }
    }, [openId, flyoutItems.length]);

    const openCategory = (id: string, focus = false) => {
        focusFirst.current = focus;
        setSelected(null);
        setQuery('');
        setOpenId((current) => (current === id && !focus ? null : id));
    };

    const insert = (snippet: PythonSnippet) => {
        onInsert(snippet);
        if (isMaxMd()) {
            setOpenId(null);
            setSelected(null);
        }
    };

    const onToolboxKey = (event: ReactKeyboardEvent<HTMLElement>, id: string) => {
        const buttons = Array.from(
            event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[data-category]') ??
                [],
        );
        const index = buttons.indexOf(event.currentTarget);
        if (event.key === 'ArrowDown') buttons[index + 1]?.focus();
        else if (event.key === 'ArrowUp') buttons[index - 1]?.focus();
        else if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
            openCategory(id, true);
        } else if (event.key === 'Escape') setOpenId(null);
        else return;
        event.preventDefault();
    };

    const onFlyoutKey = (event: ReactKeyboardEvent<HTMLElement>, snippet?: PythonSnippet) => {
        const chips = Array.from(
            flyoutRef.current?.querySelectorAll<HTMLElement>('[data-snippet]') ?? [],
        );
        const index = chips.indexOf(event.target as HTMLElement);
        if (event.key === 'ArrowDown') chips[index + 1]?.focus();
        else if (event.key === 'ArrowUp') chips[index - 1]?.focus();
        else if (event.key === 'Enter' && snippet && event.target === event.currentTarget) {
            insert(snippet);
        } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
            const id = openId;
            setOpenId(null);
            setSelected(null);
            document.querySelector<HTMLElement>(`[data-category="${id}"]`)?.focus();
        } else return;
        event.preventDefault();
    };

    const press = (event: ReactPointerEvent, snippet: PythonSnippet, colour: string) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if ((event.target as Element).closest('button, input')) return;
        pressed.current = {
            snippet,
            title: title(snippet),
            colour,
            x: event.clientX,
            y: event.clientY,
        };
    };

    const openColour = openId ? colourOf(openId) : '';
    const entries = [
        ...categories.map((category) => ({ id: category.id, search: false })),
        { id: SEARCH_ID, search: true },
    ];

    return (
        <>
            <nav
                data-snippet-ui
                data-testid="snippet-toolbox"
                aria-label={t('pythonSnippets.title')}
                className="flex w-12 shrink-0 flex-col gap-1 overflow-y-auto border-r border-mountain-mist-200 bg-mountain-mist-50 p-1 dark:border-shark-700 dark:bg-shark-900 md:w-28"
            >
                {entries.map(({ id, search }) => {
                    const Icon = search ? TbSearch : CATEGORY_ICONS[id];
                    const name = search ? t('pythonSnippets.search') : categoryName(id);
                    const isOpen = openId === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            data-category={id}
                            aria-label={name}
                            aria-expanded={isOpen}
                            title={name}
                            className="flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center text-[11px] font-semibold leading-tight text-shark-800 hover:bg-mountain-mist-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-curious-blue-500 dark:text-mountain-mist-100 dark:hover:bg-shark-700"
                            style={
                                isOpen
                                    ? { backgroundColor: colourOf(id), color: '#fff' }
                                    : undefined
                            }
                            onClick={() => openCategory(id)}
                            onKeyDown={(event) => onToolboxKey(event, id)}
                        >
                            <span
                                aria-hidden="true"
                                className="flex h-8 w-8 items-center justify-center rounded-md text-[#ffffff]"
                                style={{ backgroundColor: colourOf(id) }}
                            >
                                {Icon && <Icon size={20} />}
                            </span>
                            <span aria-hidden="true" className="hidden md:block">
                                {name}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {openId && (
                <div
                    ref={flyoutRef}
                    data-snippet-ui
                    data-testid="snippet-flyout"
                    role="region"
                    aria-label={
                        openId === SEARCH_ID ? t('pythonSnippets.search') : categoryName(openId)
                    }
                    className={`absolute inset-y-0 left-12 z-20 flex w-[min(20rem,calc(100%-3rem))] flex-col rounded-r-lg text-[#ffffff] shadow-lg md:left-28 ${dragging ? 'invisible' : ''}`}
                    style={{ backgroundColor: openColour }}
                    onKeyDown={(event) => onFlyoutKey(event)}
                >
                    <div className="flex items-center gap-2 px-4 pb-1 pt-3 text-xl font-semibold">
                        {(() => {
                            const Icon = openId === SEARCH_ID ? TbSearch : CATEGORY_ICONS[openId];
                            return Icon ? <Icon size={24} aria-hidden="true" /> : null;
                        })()}
                        {openId === SEARCH_ID ? t('pythonSnippets.search') : categoryName(openId)}
                    </div>
                    {openId === SEARCH_ID && (
                        <input
                            type="search"
                            autoFocus
                            value={query}
                            placeholder={t('pythonSnippets.searchHint')}
                            aria-label={t('pythonSnippets.searchHint')}
                            className="mx-4 mb-2 rounded-md border-0 bg-[#ffffff] px-3 py-1.5 text-sm text-shark-900 placeholder:text-mountain-mist-500 focus:ring-2 focus:ring-[#ffffffb3] dark:bg-shark-950 dark:text-mountain-mist-100"
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    flyoutRef.current
                                        ?.querySelector<HTMLElement>('[data-snippet]')
                                        ?.focus();
                                } else if (event.key === 'Escape') setOpenId(null);
                                event.stopPropagation();
                            }}
                        />
                    )}
                    <p className="px-4 pb-2 text-xs text-[#ffffffd9]">{t('pythonSnippets.hint')}</p>
                    <div role="list" className="flex-1 overflow-y-auto px-3 pb-4">
                        {openId === SEARCH_ID && query.trim() !== '' && hits.length === 0 && (
                            <p className="px-1 text-sm">{t('pythonSnippets.searchNone')}</p>
                        )}
                        {flyoutItems.map(({ category, snippet }) => {
                            const colour = colourOf(category);
                            const expanded = selected === snippet.id;
                            return (
                                <div
                                    key={snippet.id}
                                    role="listitem"
                                    data-snippet={snippet.id}
                                    data-testid={`snippet-${snippet.id}`}
                                    tabIndex={0}
                                    title={text(snippet)}
                                    className={`group relative mb-2 cursor-grab touch-pan-y select-none rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#ffffff] active:cursor-grabbing ${
                                        expanded
                                            ? 'bg-[#ffffff] text-shark-800 shadow dark:bg-shark-900 dark:text-mountain-mist-100'
                                            : 'bg-[#ffffff33] hover:bg-[#ffffff4d]'
                                    }`}
                                    style={
                                        expanded ? { borderLeft: `6px solid ${colour}` } : undefined
                                    }
                                    onPointerDown={(event) => press(event, snippet, colour)}
                                    onFocus={() => setSelected(snippet.id)}
                                    onClick={(event) => {
                                        if (!(event.target as Element).closest('button')) {
                                            event.currentTarget.focus();
                                        }
                                    }}
                                    onBlur={(event) => {
                                        if (!event.currentTarget.contains(event.relatedTarget)) {
                                            setSelected((current) =>
                                                current === snippet.id ? null : current,
                                            );
                                        }
                                    }}
                                    onKeyDown={(event) => onFlyoutKey(event, snippet)}
                                >
                                    <div className="flex items-center justify-between gap-2 font-semibold">
                                        <span>{title(snippet)}</span>
                                        <TbGripVertical
                                            aria-hidden="true"
                                            className={`shrink-0 ${expanded ? 'opacity-60' : 'opacity-0 group-hover:opacity-70'}`}
                                        />
                                    </div>
                                    {expanded && (
                                        <div className="mt-2 flex flex-col gap-2">
                                            <p className="m-0 text-sm">{text(snippet)}</p>
                                            <div className="rounded bg-mountain-mist-100 px-2 py-1.5 dark:bg-shark-950">
                                                <SnippetCode code={snippet.code} />
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    data-testid={`snippet-add-${snippet.id}`}
                                                    className="rounded-md px-3 py-1 text-sm font-semibold text-[#ffffff] hover:brightness-110"
                                                    style={{ backgroundColor: colour }}
                                                    onClick={() => insert(snippet)}
                                                >
                                                    {t('pythonSnippets.add')}
                                                </button>
                                                <span className="text-xs text-mountain-mist-600 dark:text-shark-300">
                                                    {t('pythonSnippets.drag')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {dragging && (
                <div
                    data-testid="snippet-ghost"
                    className="pointer-events-none fixed z-[1000] touch-none whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-[#ffffff] shadow-lg"
                    style={{
                        backgroundColor: dragging.colour,
                        left: dragging.x + 8,
                        top: dragging.y + 8,
                    }}
                >
                    {dragging.title}
                </div>
            )}
        </>
    );
}

export default SnippetToolbox;
