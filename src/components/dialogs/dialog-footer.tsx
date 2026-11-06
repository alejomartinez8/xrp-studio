import Button from '@/widgets/button';
import { useTranslation } from 'react-i18next';
import { DialogCloseAction, useDialogClose } from '@/components/dialogs/dialog-close';

type DialogFooterProps = {
    hideCancelBtn?: boolean;
    disabledAccept?: boolean;
    btnAcceptLabel: string;
    btnCancelLabel?: string;
    btnAcceptCallback: () => void;
    btnCancelCallback: () => void;
    closeCallback?: DialogCloseAction;
};

/**
 * Dialog buttons. Also registers the dialog's close button (X) and Escape: by default they do
 * the same as Cancel, and are hidden while a cancel-less dialog has its only button disabled
 * (for example while copying). `closeCallback` overrides this: `'host'` for a plain close when
 * Cancel is a different action, `null` for no close button.
 */
function DialogFooter({
    hideCancelBtn,
    disabledAccept,
    btnAcceptLabel,
    btnCancelLabel,
    btnAcceptCallback,
    btnCancelCallback,
    closeCallback,
}: DialogFooterProps) {
    const { t } = useTranslation();
    useDialogClose(
        closeCallback !== undefined
            ? closeCallback
            : hideCancelBtn && disabledAccept
              ? undefined
              : btnCancelCallback,
    );
    return (
        <div className="flex w-full flex-row flex-wrap items-center justify-end gap-2">
            {!hideCancelBtn && (
                <Button onClicked={btnCancelCallback}>{btnCancelLabel ?? t('cancelButton')}</Button>
            )}
            <Button onClicked={btnAcceptCallback} disabled={disabledAccept}>
                {btnAcceptLabel}
            </Button>
        </div>
    );
}

export default DialogFooter;
