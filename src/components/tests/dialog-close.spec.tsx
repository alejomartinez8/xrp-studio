import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dialog from '@/components/dialogs/dialog';
import DialogFooter from '@/components/dialogs/dialog-footer';
import { useDialogClose } from '@/components/dialogs/dialog-close';

/** Tests for the shared dialog close button (X) and Escape key. */
describe('Dialog close button', () => {
    /** Content that registers a close action without a footer. */
    function Custom({ onClose }: { onClose?: () => void }) {
        useDialogClose(onClose);
        return <p>custom</p>;
    }

    it('closes with the Cancel action of the footer', () => {
        const cancel = vi.fn();
        render(
            <Dialog isOpen={true}>
                <DialogFooter
                    btnAcceptLabel="OK"
                    btnAcceptCallback={vi.fn()}
                    btnCancelCallback={cancel}
                />
            </Dialog>,
        );
        fireEvent.click(screen.getByTestId('dialog-close'));
        expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('has no close button while a cancel-less dialog is busy', () => {
        render(
            <Dialog isOpen={true}>
                <DialogFooter
                    hideCancelBtn
                    disabledAccept
                    btnAcceptLabel="Close"
                    btnAcceptCallback={vi.fn()}
                    btnCancelCallback={vi.fn()}
                />
            </Dialog>,
        );
        expect(screen.queryByTestId('dialog-close')).toBeNull();
    });

    it('uses the host close when Cancel is another action', () => {
        const host = vi.fn();
        const secondary = vi.fn();
        render(
            <Dialog isOpen={true} toggleDialog={host}>
                <DialogFooter
                    btnAcceptLabel="Retry"
                    btnAcceptCallback={vi.fn()}
                    btnCancelCallback={secondary}
                    closeCallback="host"
                />
            </Dialog>,
        );
        fireEvent.click(screen.getByTestId('dialog-close'));
        expect(host).toHaveBeenCalledTimes(1);
        expect(secondary).not.toHaveBeenCalled();
    });

    it('has no close button when the content registers nothing', () => {
        render(
            <Dialog isOpen={true}>
                <Custom />
            </Dialog>,
        );
        expect(screen.queryByTestId('dialog-close')).toBeNull();
    });

    it('runs the close action on Escape and removes it when the content changes', () => {
        const close = vi.fn();
        const { container, rerender } = render(
            <Dialog isOpen={true}>
                <Custom onClose={close} />
            </Dialog>,
        );
        const dialog = container.querySelector('dialog')!;
        const escape = new Event('cancel', { cancelable: true });
        act(() => {
            dialog.dispatchEvent(escape);
        });
        expect(close).toHaveBeenCalledTimes(1);
        expect(escape.defaultPrevented).toBe(true);
        rerender(
            <Dialog isOpen={true}>
                <p>busy</p>
            </Dialog>,
        );
        expect(screen.queryByTestId('dialog-close')).toBeNull();
    });
});
