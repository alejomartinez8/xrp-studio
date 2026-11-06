import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose } from 'react-icons/io5';
import { DialogCloseContext } from '@/components/dialogs/dialog-close';

type DialogProps = {
    children: React.ReactNode;
    isOpen: boolean;
    toggleDialog?: () => void;
};

/**
 * Shared modal. Shows a close button (X) in the top corner, and closes on Escape, when its
 * content registers a close action (see `dialog-close.ts`).
 */
const Dialog = forwardRef<HTMLDialogElement, DialogProps>((dlgProps, ref) => {
    const { t } = useTranslation();
    const [close, setClose] = useState<(() => void) | null>(null);
    const register = useCallback((fn: () => void) => setClose(() => fn), []);
    const unregister = useCallback(
        (fn: () => void) => setClose((current) => (current === fn ? null : current)),
        [],
    );
    const hostClose = dlgProps.toggleDialog;
    const context = useMemo(
        () => ({ register, unregister, hostClose }),
        [register, unregister, hostClose],
    );

    /** Escape runs the registered close action, so the host state is reset as with Cancel. */
    const onCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
        if (!close) return;
        event.preventDefault();
        close();
    };

    return (
        <dialog
            style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            open={dlgProps.isOpen}
            className="overflow-hidden rounded-md border-shark-400 shadow-md transition-all backdrop:bg-mountain-mist-500 backdrop:opacity-40 dark:border dark:border-shark-600 dark:bg-shark-950"
            ref={ref}
            onCancel={onCancel}
        >
            <DialogCloseContext.Provider value={context}>
                {dlgProps.children}
            </DialogCloseContext.Provider>
            {close && (
                <button
                    type="button"
                    onClick={close}
                    aria-label={t('closeButton')}
                    title={t('closeButton')}
                    data-testid="dialog-close"
                    className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-mountain-mist-700 hover:bg-mountain-mist-100 dark:text-mountain-mist-300 dark:hover:bg-shark-800"
                >
                    <IoClose size={24} />
                </button>
            )}
        </dialog>
    );
});
export default Dialog;
