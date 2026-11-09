import mitt from 'mitt';

/**
 * Which editor a blocks file shows: its blocks, or the Python that comes from them (read-only).
 * The choice is kept per editor tab while the tab is open, like MakeCode's "Blocks | Python"
 * selector in the top bar (spec 003, part 6). Python files have no blocks, so they always show
 * Python.
 */
export type EditorView = 'blocks' | 'python';

type ViewChange = { tabId: string; view: EditorView };

const views = new Map<string, EditorView>();
const emitter = mitt<{ change: ViewChange }>();

/**
 * Whether the upstream View menu entries "View Python File" and "Convert to Python" (two modal
 * dialogs) are shown. The selector in the top bar replaces them; their code stays.
 */
export const showPythonDialogs = false;

/**
 * Whether the upstream View menu entries "Increase Font" and "Decrease Font" are shown. The zoom
 * buttons in the corner of the Python editor replace them, like the zoom buttons of the blocks.
 */
export const showFontMenu = false;

/** The view of the given tab; blocks until the user picks Python. */
export function getEditorView(tabId: string): EditorView {
    return views.get(tabId) ?? 'blocks';
}

/** Show the blocks or the Python of the given tab and tell the listeners. */
export function setEditorView(tabId: string, view: EditorView): void {
    if (getEditorView(tabId) === view) {
        return;
    }
    views.set(tabId, view);
    emitter.emit('change', { tabId, view });
}

/** Forget the view of a closed tab. */
export function forgetEditorView(tabId: string): void {
    views.delete(tabId);
}

/** Call `listener` whenever a tab changes view; returns a function that stops listening. */
export function onEditorViewChange(
    listener: (tabId: string, view: EditorView) => void,
): () => void {
    const handler = ({ tabId, view }: ViewChange) => listener(tabId, view);
    emitter.on('change', handler);
    return () => emitter.off('change', handler);
}

/**
 * Path of the editable Python copy of a blocks file: next to it, with the same name and `.py`
 * (`/folder/robot.blocks` → `/folder/robot.py`), or `robot 2.py`, `robot 3.py`, … when that name
 * is taken. `exists` tells whether a path is already used.
 */
export function pythonCopyPath(blocksPath: string, exists: (path: string) => boolean): string {
    const slash = blocksPath.lastIndexOf('/');
    const folder = blocksPath.slice(0, slash + 1);
    const base = blocksPath.slice(slash + 1).replace(/\.blocks$/, '');
    let path = `${folder}${base}.py`;
    for (let n = 2; exists(path); n++) {
        path = `${folder}${base} ${n}.py`;
    }
    return path;
}
