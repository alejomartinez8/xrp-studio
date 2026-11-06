import { Actions, Model, TabSetNode } from 'flexlayout-react';
import { Constants } from '@/utils/constants';

/** Whether the editor tabset was empty the last time each model was checked. */
const wasEmpty = new WeakMap<Model, boolean>();

/**
 * Shows the shell only while a project is open (XRP Studio). With no editor tabs the welcome
 * screen is on its own, so the editor tabset is maximized, which hides the shell tabset without
 * unmounting the terminal; the first open tab restores the layout. It only acts when the editor
 * tabset changes between empty and not empty, so a maximize or restore chosen by the user is kept.
 */
export function syncShellVisibility(model: Model): void {
    const editors = model.getNodeById(Constants.EDITOR_TABSET_ID);
    if (!(editors instanceof TabSetNode)) {
        return;
    }
    const isEmpty = editors.getChildren().length === 0;
    if (wasEmpty.get(model) === isEmpty) {
        return;
    }
    wasEmpty.set(model, isEmpty);
    if (isEmpty !== editors.isMaximized()) {
        model.doAction(Actions.maximizeToggle(editors.getId()));
    }
}
