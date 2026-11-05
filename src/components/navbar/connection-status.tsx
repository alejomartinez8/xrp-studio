import { useTranslation } from 'react-i18next';
import { TbBluetooth, TbRobot, TbUsb } from 'react-icons/tb';
import { ConnectionType } from '@/utils/types';

type ConnectionStatusProps = {
    isConnected: boolean;
    connectionType?: ConnectionType;
    xrpId?: string;
};

/**
 * ConnectionStatus - top bar pill shown while a robot is connected: how (USB or Bluetooth) and which
 * robot it is. Nothing is shown otherwise, since the Connect button already says it.
 */
function ConnectionStatus({ isConnected, connectionType, xrpId }: ConnectionStatusProps) {
    const { t } = useTranslation();

    if (!isConnected) {
        return null;
    }

    const isBluetooth = connectionType === ConnectionType.BLUETOOTH;
    return (
        <div
            id="connectionStatus"
            title={t('navbar.connected')}
            className="text-white flex items-center gap-2 whitespace-nowrap rounded-full bg-chateau-green-700 px-3 py-2 text-base xl:px-4"
        >
            <TbRobot size={22} />
            <span className="hidden font-semibold xl:inline">{t('navbar.connected')}</span>
            <span className="flex items-center gap-1 opacity-90">
                {isBluetooth ? <TbBluetooth size={18} /> : <TbUsb size={18} />}
                {isBluetooth ? t('navbar.bluetooth') : t('navbar.usb')}
            </span>
            {xrpId && <span className="hidden opacity-90 xl:inline">{`XRP-${xrpId}`}</span>}
        </div>
    );
}

export default ConnectionStatus;
