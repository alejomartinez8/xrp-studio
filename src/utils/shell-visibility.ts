import { Actions, Model, TabSetNode } from 'flexlayout-react';
import { Constants } from '@/utils/constants';
import { StorageKeys } from '@/utils/localstorage';

/** The terminal choice each model was last synced to. */
const lastState = new WeakMap<Model, boolean>();

/** Whether the user turned the terminal on (spec 021); off until they do. */
export function isTerminalOn(): boolean {
    try {
        return localStorage.getItem(StorageKeys.TERMINAL) === 'on';
    } catch {
        return false;
    }
}

/** Remembers the terminal choice. */
function setTerminalOn(on: boolean): void {
    try {
        localStorage.setItem(StorageKeys.TERMINAL, on ? 'on' : 'off');
    } catch {
        /* storage blocked: the choice lasts until reload */
    }
}

/** The editor tabset, or undefined when the model has none. */
function editorTabSet(model: Model): TabSetNode | undefined {
    const editors = model.getNodeById(Constants.EDITOR_TABSET_ID);
    return editors instanceof TabSetNode ? editors : undefined;
}

/** Whether the shell is on screen: the editor tabset is not maximized. */
export function isShellVisible(model: Model): boolean {
    const editors = editorTabSet(model);
    return !!editors && !editors.isMaximized();
}

/**
 * Shows the shell only while the terminal is turned on (XRP Studio, spec 021), with or without a
 * project open, like a code editor's panel. Otherwise the editor tabset is maximized, which hides
 * the shell tabset without unmounting the terminal, so its output is kept. It only acts when the
 * terminal choice changes, so a maximize or restore chosen by the user is kept.
 */
export function syncShellVisibility(model: Model): void {
    const editors = editorTabSet(model);
    if (!editors) {
        return;
    }
    const on = isTerminalOn();
    if (lastState.get(model) === on) {
        return;
    }
    lastState.set(model, on);
    if (on === editors.isMaximized()) {
        model.doAction(Actions.maximizeToggle(editors.getId()));
    }
}

/**
 * Turns the terminal off when the shell is on screen and on otherwise, remembers the choice and
 * applies it.
 */
export function toggleTerminal(model: Model): void {
    setTerminalOn(!isShellVisible(model));
    syncShellVisibility(model);
}
