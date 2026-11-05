import { Actions, BorderNode, type IJsonModel, type Model } from 'flexlayout-react';
import { Constants } from '@/utils/constants';
import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import { isOfflineBuild } from '@/utils/offline';

/**
 * Kids mode layout: the same panels as the full layout, simplified on screen.
 * - The folder tree must stay mounted, because it hosts the sign-in widget (the local session in
 *   offline builds) and listens for file system updates. flexlayout only mounts a border tab once
 *   it is shown, so the layout starts with the tree open and never unmounted;
 *   `hideFolderTreeWhenMounted()` then collapses and hides it once it has rendered.
 * - The editor tabset starts maximized, which hides the terminal without unmounting it; the
 *   "Robot messages" button toggles it.
 */
export function kidsLayout(json: IJsonModel): IJsonModel {
    const layout = structuredClone(json);
    layout.borders = layout.borders?.map((border) =>
        border.children.some((tab) => tab.id === Constants.FOLDER_TAB_ID)
            ? {
                  ...border,
                  selected: 0,
                  children: border.children.map((tab) => ({
                      ...tab,
                      enableRenderOnDemand: false,
                  })),
              }
            : border,
    );
    const maximizeEditor = (node: { type?: string; id?: string; children?: unknown[] }) => {
        if (node.type === 'tabset' && node.id === Constants.EDITOR_TABSET_ID) {
            (node as { maximized?: boolean }).maximized = true;
        } else if (node.type === 'row') {
            node.children?.forEach((child) => maximizeEditor(child as typeof node));
        }
    };
    maximizeEditor(layout.layout);
    return layout;
}

/**
 * Collapse and hide the folder tree border once the layout has rendered. The tree stays mounted
 * (see `kidsLayout`), so sign-in and file system updates keep working.
 */
export function hideFolderTree(model: Model): void {
    const tab = model.getNodeById(Constants.FOLDER_TAB_ID);
    const border = tab?.getParent();
    if (!tab || !(border instanceof BorderNode)) {
        return;
    }
    if (border.getSelected() !== -1) {
        model.doAction(Actions.selectTab(tab.getId()));
    }
    model.doAction(Actions.updateNodeAttributes(border.getId(), { show: false }));
}

/**
 * Hide the folder tree as soon as flexlayout has rendered its content (`/border/left/t0` has
 * children). Collapsing it earlier would keep it from ever mounting. Gives up after `timeoutMs`,
 * leaving the tree visible.
 */
export function hideFolderTreeWhenMounted(model: Model, timeoutMs = 10000): void {
    const start = performance.now();
    const check = () => {
        const content = document.querySelector('[data-layout-path="/border/left/t0"]');
        if (content && content.childElementCount > 0) {
            hideFolderTree(model);
        } else if (performance.now() - start < timeoutMs) {
            requestAnimationFrame(check);
        }
    };
    requestAnimationFrame(check);
}

/**
 * Hide the folder tree at the right time. In offline builds the tree hosts the local session, so
 * it is hidden once that session has signed in (`EVENT_LOGIN_STATUS`); otherwise it is hidden as
 * soon as it has rendered. The listener is not removed: `AppMgr.off(event)` would drop every
 * listener of the event, so it is guarded by a flag instead.
 */
export function hideFolderTreeForKids(model: Model): void {
    const appMgr = AppMgr.getInstance();
    if (!isOfflineBuild) {
        hideFolderTreeWhenMounted(model);
        return;
    }
    if (appMgr.authService.isLogin) {
        hideFolderTree(model);
        return;
    }
    let isHidden = false;
    const onLogin = (status: string) => {
        if (status === LoginStatus.LOGGED_IN && !isHidden) {
            isHidden = true;
            requestAnimationFrame(() => hideFolderTree(model));
        }
    };
    appMgr.on(EventType.EVENT_LOGIN_STATUS, onLogin);
}
