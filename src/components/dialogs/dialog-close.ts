import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Close button (X) and Escape key for the shared `<Dialog>`.
 *
 * Dialog contents register what closing means for them (usually the same as their Cancel
 * button). The dialog shows the X only while a close action is registered, so busy and progress
 * dialogs, which must not be dismissed, get none. `DialogFooter` registers its cancel action
 * automatically; other dialogs call `useDialogClose`.
 */

/**
 * What closing a dialog does: a function, `'host'` for the host's plain close (the dialog's
 * `toggleDialog` prop), or `undefined`/`null` for "cannot be closed" (no X).
 */
export type DialogCloseAction = (() => void) | 'host' | null | undefined;

/** Context provided by `<Dialog>` to its contents. */
export type DialogCloseContextValue = {
    register: (close: () => void) => void;
    unregister: (close: () => void) => void;
    hostClose?: () => void;
};

export const DialogCloseContext = createContext<DialogCloseContextValue | null>(null);

/** Register the close action of the current dialog content while it is mounted. */
export function useDialogClose(action: DialogCloseAction): void {
    const context = useContext(DialogCloseContext);
    const actionRef = useRef(action);
    useEffect(() => {
        actionRef.current = action;
    });
    const enabled = action !== undefined && action !== null;
    useEffect(() => {
        if (!context || !enabled) return;
        const close = () => {
            const current = actionRef.current;
            if (current === 'host') {
                context.hostClose?.();
            } else {
                current?.();
            }
        };
        context.register(close);
        return () => context.unregister(close);
    }, [context, enabled]);
}
