import { useEffect, useMemo, useState } from 'react';
import type { Workspace } from 'blockly/core';
import { pythonGenerator } from 'blockly/python';
import { getEditorView, onEditorViewChange } from '@/utils/editor-view';

/**
 * The Python of the blocks in tab `tabId` while "Python" is chosen in the top bar (spec 003,
 * part 6), or null while the blocks show.
 *
 * The code always comes from the live blocks, so it is generated again every time the blocks
 * change under it: when Python is chosen, when the workspace is replaced, and when `loadRevision`
 * changes. Blocks are loaded with Blockly events disabled, so the workspace tells nobody that its
 * blocks arrived; the editor bumps `loadRevision` after each load (spec 003, part 7). The view
 * choice outlives the editor component (FlexLayout can remount a hidden tab) and is forgotten
 * only when the tab closes.
 */
export function usePythonView(
    tabId: string,
    workspace: Workspace | null,
    loadRevision = 0,
): string | null {
    const [isPython, setIsPython] = useState(() => getEditorView(tabId) === 'python');

    useEffect(() => {
        setIsPython(getEditorView(tabId) === 'python');
        return onEditorViewChange((changedTab, view) => {
            if (changedTab === tabId) {
                setIsPython(view === 'python');
            }
        });
    }, [tabId]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(
        () => (isPython ? (workspace ? pythonGenerator.workspaceToCode(workspace) : '') : null),
        [isPython, workspace, loadRevision],
    );
}
