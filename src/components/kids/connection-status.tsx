import { useTranslation } from 'react-i18next';
import { TbBluetooth, TbRobot, TbRobotOff, TbUsb } from 'react-icons/tb';
import { ConnectionType } from '@/utils/types';

type ConnectionStatusProps = {
    isConnected: boolean;
    connectionType?: ConnectionType;
    xrpId?: string;
};

/**
 * ConnectionStatus - kids mode pill that says in plain words whether the robot is connected, how
 * (USB or Bluetooth) and which robot it is.
 */
function ConnectionStatus({ isConnected, connectionType, xrpId }: ConnectionStatusProps) {
    const { t } = useTranslation();

    if (!isConnected) {
        return (
            <div
                id="kidsConnectionStatus"
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-shark-700 px-4 py-2 text-base text-shark-100"
            >
                <TbRobotOff size={22} />
                <span>{t('kidsMode.notConnected')}</span>
            </div>
        );
    }

    const isBluetooth = connectionType === ConnectionType.BLUETOOTH;
    return (
        <div
            id="kidsConnectionStatus"
            className="text-white flex items-center gap-2 whitespace-nowrap rounded-full bg-chateau-green-700 px-4 py-2 text-base"
        >
            <TbRobot size={22} />
            <span className="font-semibold">{t('kidsMode.connected')}</span>
            <span className="flex items-center gap-1 opacity-90">
                {isBluetooth ? <TbBluetooth size={18} /> : <TbUsb size={18} />}
                {isBluetooth ? t('kidsMode.bluetooth') : t('kidsMode.usb')}
            </span>
            {xrpId && <span className="hidden opacity-90 xl:inline">{`XRP-${xrpId}`}</span>}
        </div>
    );
}

export default ConnectionStatus;
