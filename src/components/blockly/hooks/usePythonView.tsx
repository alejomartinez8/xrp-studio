import { useEffect, useMemo, useState } from 'react';
import type { Workspace } from 'blockly/core';
import { pythonGenerator } from 'blockly/python';
import { getEditorView, onEditorViewChange } from '@/utils/editor-view';

/**
 * Whether tab `tabId` shows its Python (chosen in the top bar, spec 003 part 6) instead of its
 * blocks. The choice lives in `editor-view`, so it survives the editor being mounted again.
 */
function useIsPythonView(tabId: string): boolean {
    const [isPython, setIsPython] = useState(() => getEditorView(tabId) === 'python');

    useEffect(() => {
        setIsPython(getEditorView(tabId) === 'python');
        return onEditorViewChange((changedTab, view) => {
            if (changedTab === tabId) {
                setIsPython(view === 'python');
            }
        });
    }, [tabId]);

    return isPython;
}

/**
 * The Python of the blocks in tab `tabId` while "Python" is chosen, or null while the blocks show
 * (spec 003, part 8).
 *
 * Blocks load with Blockly events off, so nothing tells the workspace's listeners that they
 * arrived; the editor bumps `loadRevision` after each load and the Python is generated again.
 */
export function usePythonView(
    tabId: string,
    workspace: Workspace | null,
    loadRevision = 0,
): string | null {
    const isPython = useIsPythonView(tabId);

    return useMemo(() => {
        if (!isPython) {
            return null;
        }
        return workspace ? pythonGenerator.workspaceToCode(workspace) : '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPython, workspace, loadRevision]);
}
