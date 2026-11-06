/// <reference types="web-bluetooth" />
import Bluetooth from '@assets/images/Bluetooth_FM_Black.png';
import Usb from '@assets/images/USB_icon.svg.png';
import { ConnectionCMD, ListItem } from '@/utils/types';
import { getRememberedXrp } from '@/utils/rememberedxrp';
import { useTranslation } from 'react-i18next';
import { useDialogClose } from '@/components/dialogs/dialog-close';
import { useEffect, useState } from 'react';

type ConnProps = {
    callback: (cmd: ConnectionCMD) => void;
};

interface ConnectionItem extends ListItem {
    disabled?: boolean;
    cmd: ConnectionCMD;
    testId?: string;
}

/**
 * Connection Dialog content
 *
 * With a default XRP stored this is the way back to the standard connect:
 * clear the default, the normal Bluetooth chooser, or USB.
 */
function ConnectionDlg(connprops: ConnProps) {
    const { t } = useTranslation();
    useDialogClose('host');
    const [isBluetoothAvailable, setIsBluetoothAvailable] = useState<boolean>(true);
    const remembered = getRememberedXrp();

    useEffect(() => {
        if (navigator.bluetooth && typeof navigator.bluetooth.getAvailability === 'function') {
            navigator.bluetooth
                .getAvailability()
                .then((available) => {
                    setIsBluetoothAvailable(available);
                })
                .catch(() => {
                    setIsBluetoothAvailable(false);
                });
        } else {
            setIsBluetoothAvailable(false);
        }
    }, []);

    const items: ConnectionItem[] = [];
    if (remembered?.xrpId) {
        items.push({
            label: t('clearSavedXrpId'),
            image: Bluetooth,
            cmd: ConnectionCMD.CLEAR_DEFAULT_XRP,
            testId: 'clear-saved-xrp-id',
        });
    }
    items.push({
        label: t('bluetoothConnection'),
        image: Bluetooth,
        disabled: !isBluetoothAvailable,
        cmd: ConnectionCMD.CONNECT_BLUETOOTH_ALL,
        testId: t('bluetoothConnection'),
    });
    items.push({
        label: t('usbConnection'),
        image: Usb,
        cmd: ConnectionCMD.CONNECT_USB,
        testId: t('usbConnection'),
    });

    const handleItemClick = (item: ConnectionItem) => {
        if (item.disabled) return;
        connprops.callback(item.cmd);
    };

    return (
        <div className="border rounded-md border-mountain-mist-700 dark:border-shark-500 dark:bg-shark-950 flex h-auto w-96 flex-col items-center gap-2 p-4 shadow-md transition-all">
            <h1 className='text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300'>{t('connections')}</h1>
            <p className='text-sm text-mountain-mist-700 dark:text-mountain-mist-300'>{t('selectConnection')}</p>
            <hr className="w-full border-mountain-mist-600" />
            <ul className="w-full">
                {items.map((item) => (
                    <li
                        key={item.testId ?? item.label}
                        className={`flex flex-row items-center gap-2 px-3 py-1 text-neutral-900 ${
                            item.disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-matisse-300 dark:hover:bg-shark-400 hover:text-neutral-100 cursor-pointer'
                        }`}
                        onClick={() => handleItemClick(item)}
                        title={item.disabled ? t('bluetooth-not-supported') : ''}
                    >
                        <img data-testid={item.testId ?? item.label} src={item.image} height="28px" width="36px" />
                        <span className='text-mountain-mist-700 dark:text-mountain-mist-300'>{item.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ConnectionDlg;
