import { describe, expect, it } from 'vitest';
import { Actions, DockLocation, Model, TabSetNode } from 'flexlayout-react';
import { Constants } from '@/utils/constants';
import { syncShellVisibility } from '@/utils/shell-visibility';

/** A model with an empty editor tabset above the shell tabset, as in the app layout. */
function layoutModel(): Model {
    return Model.fromJson({
        global: {},
        borders: [],
        layout: {
            type: 'row',
            children: [
                {
                    type: 'tabset',
                    id: Constants.EDITOR_TABSET_ID,
                    enableDeleteWhenEmpty: false,
                    children: [],
                },
                {
                    type: 'tabset',
                    id: Constants.SHELL_TABSET_ID,
                    children: [{ type: 'tab', id: Constants.SHELL_TAB_ID, component: 'xterm' }],
                },
            ],
        },
    });
}

/** Whether the editor tabset is maximized, which hides the shell. */
function shellHidden(model: Model): boolean {
    return (model.getNodeById(Constants.EDITOR_TABSET_ID) as TabSetNode).isMaximized();
}

/** Open an editor tab, as the app does when a project opens. */
function openTab(model: Model, id: string): void {
    model.doAction(
        Actions.addNode(
            { type: 'tab', id, component: 'blockly' },
            Constants.EDITOR_TABSET_ID,
            DockLocation.CENTER,
            -1,
        ),
    );
}

describe('syncShellVisibility', () => {
    it('hides the shell with no projects open and shows it while one is open', () => {
        const model = layoutModel();
        model.addChangeListener(() => syncShellVisibility(model));
        syncShellVisibility(model);
        expect(shellHidden(model)).toBe(true);

        openTab(model, 'a');
        expect(shellHidden(model)).toBe(false);

        model.doAction(Actions.deleteTab('a'));
        expect(shellHidden(model)).toBe(true);
    });

    it('keeps a maximize chosen by the user while projects are open', () => {
        const model = layoutModel();
        model.addChangeListener(() => syncShellVisibility(model));
        syncShellVisibility(model);
        openTab(model, 'a');
        model.doAction(Actions.maximizeToggle(Constants.EDITOR_TABSET_ID));
        expect(shellHidden(model)).toBe(true);
        openTab(model, 'b');
        expect(shellHidden(model)).toBe(true);
    });
});
