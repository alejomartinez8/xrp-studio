import { beforeEach, describe, expect, it } from 'vitest';
import { Actions, DockLocation, Model, TabSetNode } from 'flexlayout-react';
import { Constants } from '@/utils/constants';
import {
    isShellVisible,
    isTerminalOn,
    syncShellVisibility,
    toggleTerminal,
} from '@/utils/shell-visibility';
import { StorageKeys } from '@/utils/localstorage';

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

/** A layout model that applies the shell rule on every change, as the app does. */
function syncedModel(): Model {
    const model = layoutModel();
    model.addChangeListener(() => syncShellVisibility(model));
    syncShellVisibility(model);
    return model;
}

describe('syncShellVisibility', () => {
    beforeEach(() => localStorage.clear());

    it('keeps the terminal off by default, even with a project open', () => {
        const model = syncedModel();
        openTab(model, 'a');
        expect(isTerminalOn()).toBe(false);
        expect(shellHidden(model)).toBe(true);
    });

    it('toggles the terminal while a project is open and remembers the choice', () => {
        const model = syncedModel();
        openTab(model, 'a');
        toggleTerminal(model);
        expect(isShellVisible(model)).toBe(true);
        expect(localStorage.getItem(StorageKeys.TERMINAL)).toBe('on');

        const next = syncedModel();
        openTab(next, 'b');
        expect(isShellVisible(next)).toBe(true);

        toggleTerminal(next);
        expect(isShellVisible(next)).toBe(false);
        expect(isTerminalOn()).toBe(false);
    });

    it('toggles the terminal with no projects open, as on the welcome screen', () => {
        const model = syncedModel();
        expect(shellHidden(model)).toBe(true);
        toggleTerminal(model);
        expect(isShellVisible(model)).toBe(true);

        openTab(model, 'a');
        model.doAction(Actions.deleteTab('a'));
        expect(isShellVisible(model)).toBe(true);

        toggleTerminal(model);
        expect(isShellVisible(model)).toBe(false);
    });

    it('keeps a maximize chosen by the user while projects are open', () => {
        localStorage.setItem(StorageKeys.TERMINAL, 'on');
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
