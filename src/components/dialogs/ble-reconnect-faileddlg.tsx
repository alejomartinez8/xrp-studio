import DialogFooter from '@/components/dialogs/dialog-footer';
import { BleConnectFailure } from '@/utils/types';
import { useTranslation } from 'react-i18next';

type BleReconnectFailedProps = {
    xrpId: string;
    reason: BleConnectFailure;
    otherXrpId?: string;
    onRetry: () => void;
    onSecondary: () => void;
};

/**
 * Shown when we could not reach the requested XRP: the user dismissed the
 * browser chooser, the robot never answered, the cable is still in, or the
 * cable turned out to hold a different robot.
 */
function BleReconnectFailedDlg({
    xrpId,
    reason,
    otherXrpId,
    onRetry,
    onSecondary,
}: BleReconnectFailedProps) {
    const { t } = useTranslation();

    const messageKey =
        reason === BleConnectFailure.CANCELLED
            ? 'bleConnectCancelled'
            : reason === BleConnectFailure.USB_STILL_CONNECTED
              ? 'bleSwitchUsbStillConnected'
              : reason === BleConnectFailure.WRONG_USB_XRP
                ? 'bleWrongUsbXrp'
                : 'bleReconnectFailed';

    const secondaryLabel =
        reason === BleConnectFailure.USB_STILL_CONNECTED
            ? t('cancelButton')
            : reason === BleConnectFailure.NOT_FOUND
              ? t('chooseDifferentXRP')
              : t('usbConnection');

    // The wrong-robot case names its actions outright, since retrying the same
    // cable would just find the same wrong XRP.
    const acceptLabel =
        reason === BleConnectFailure.WRONG_USB_XRP ? t('bluetoothConnection') : t('tryAgain');

    return (
        <div className="flex h-auto w-136 max-w-[92vw] flex-col gap-2 rounded-md border border-mountain-mist-700 p-6 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-col items-center">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('alert')}
                </h1>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <span className="text-md text-mountain-mist-900 dark:text-mountain-mist-300">
                {t(messageKey, { id: xrpId, otherId: otherXrpId })}
            </span>
            <hr className="w-full border-mountain-mist-600" />
            <DialogFooter
                hideCancelBtn={false}
                disabledAccept={false}
                btnAcceptLabel={acceptLabel}
                btnCancelLabel={secondaryLabel}
                btnAcceptCallback={onRetry}
                btnCancelCallback={onSecondary}
                closeCallback="host"
            />
        </div>
    );
}

export default BleReconnectFailedDlg;
