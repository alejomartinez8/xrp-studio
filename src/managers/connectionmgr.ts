import AppMgr, { EventType } from '@/managers/appmgr';
import {
    BleConnectFailure,
    BleConnectFailureInfo,
    ConnectionCMD,
    ConnectionType,
} from '@/utils/types';
import Connection, { ConnectionState } from '@/connections/connection';
import { USBConnection } from '@/connections/usbconnection';
import { BluetoothConnection } from '@/connections/bluetoothconnection';
import { CommandToXRPMgr } from './commandstoxrpmgr';
import PluginMgr from './pluginmgr';
import { getRememberedXrp, saveRememberedXrp } from '@/utils/rememberedxrp';
import { isOfflineBuild } from '@/utils/offline';

/**
 * ConnectionMgr - manages USB and Bluetooth connection to the XRP Robot
 */
export default class ConnectionMgr {
    private appMgr: AppMgr;
    private cmdToXRPMgr: CommandToXRPMgr = CommandToXRPMgr.getInstance();
    private pluginMgr: PluginMgr = PluginMgr.getInstance();
    private connections: Connection[] = [];
    private activeConnection: Connection | null = null;

    private xrpID: string | undefined = undefined;

    // Set when the connect button targets one specific robot, so a USB port
    // that turns out to hold a different XRP can be turned away.
    private requiredXrpId: string | undefined = undefined;

    constructor(appMgr: AppMgr) {
        this.appMgr = appMgr;

        // To support auto connect to USB connection, the USBConnection needs to be always instantiated during startup
        // When a user has used the USB connection previously, it will auto connect without the user clicking the
        // connection button.
        this.connections[ConnectionType.USB] = new USBConnection(this);
        this.cmdToXRPMgr.setConnection(this.connections[ConnectionType.USB]);
        this.activeConnection = this.connections[ConnectionType.USB];

        // Instantiate the Bluetooth Connection
        this.connections[ConnectionType.BLUETOOTH] = new BluetoothConnection(this);

        /*** Listen for Subscriptions ***/
        this.appMgr.on(EventType.EVENT_CONNECTION, (subType: string) => {
            console.log('Connection manager event, sub type: ' + subType);
            switch (subType) {
                case ConnectionCMD.CONNECT_USB:
                    this.connectUsb();
                    break;
                case ConnectionCMD.CONNECT_BLUETOOTH:
                    this.connectBluetooth({ xrpId: getRememberedXrp()?.xrpId });
                    break;
                case ConnectionCMD.CONNECT_BLUETOOTH_ALL:
                    this.connectBluetooth({ showAll: true });
                    break;
                case ConnectionCMD.CONNECT_BLUETOOTH_KNOWN:
                    this.connectBluetoothKnown();
                    break;
                case ConnectionCMD.CONNECT_KNOWN_XRP:
                    this.connectKnownXrp();
                    break;
                case ConnectionCMD.SWITCH_TO_BLUETOOTH:
                    this.switchToBluetooth();
                    break;
            }
        });
    }

    private connectUsb(): void {
        const usb = this.connections[ConnectionType.USB];
        if (!usb) {
            return;
        }
        usb.connect();
        this.cmdToXRPMgr.setConnection(usb);
    }

    private async connectBluetooth(options?: { xrpId?: string; showAll?: boolean }): Promise<void> {
        const ble = this.connections[ConnectionType.BLUETOOTH] as BluetoothConnection | undefined;
        if (!ble) {
            return;
        }
        this.cmdToXRPMgr.setConnection(ble);
        const ok = await ble.connect(options);
        if (!ok && options?.xrpId && !options.showAll) {
            this.reportBleFailure(
                options.xrpId,
                ble.wasLastConnectCancelled()
                    ? BleConnectFailure.CANCELLED
                    : BleConnectFailure.NOT_FOUND,
            );
        }
    }

    private reportBleFailure(xrpId: string, reason: BleConnectFailure, otherXrpId?: string): void {
        const info: BleConnectFailureInfo = { xrpId, reason, otherXrpId };
        this.appMgr.emit(EventType.EVENT_BLE_RECONNECT_FAILED, JSON.stringify(info));
    }

    private async connectBluetoothKnown(): Promise<void> {
        const remembered = getRememberedXrp();
        if (!remembered?.xrpId) {
            await this.connectBluetooth({ showAll: true });
            return;
        }
        await this.connectBluetooth({ xrpId: remembered.xrpId });
    }

    /**
     * connectKnownXrp - the default-XRP button. Prefer the cable, but only for
     * that robot: Web Serial cannot tell which XRP is on a port until the board
     * answers, so the port is opened and then vetted by rejectUnwantedUsbXrp.
     * With no cable present, fall through to Bluetooth.
     */
    private async connectKnownXrp(): Promise<void> {
        const remembered = getRememberedXrp();
        const usb = this.connections[ConnectionType.USB] as USBConnection | undefined;
        if (remembered?.xrpId && usb && (await usb.hasAuthorizedXrpPort())) {
            this.requiredXrpId = remembered.xrpId;
            this.cmdToXRPMgr.setConnection(usb);
            if (await usb.tryAutoConnectIfSingle()) {
                return;
            }
            this.requiredXrpId = undefined;
        }
        await this.connectBluetoothKnown();
    }

    /**
     * rejectUnwantedUsbXrp - the connect button asked for one robot but the
     * cable holds another. Drop that connection instead of driving the wrong
     * XRP, and let the user retry over Bluetooth or claim the plugged-in one.
     * Returns true when the connection was rejected.
     */
    private async rejectUnwantedUsbXrp(connType: ConnectionType): Promise<boolean> {
        const wanted = this.requiredXrpId;
        this.requiredXrpId = undefined;
        if (!wanted || connType !== ConnectionType.USB || this.xrpID === undefined) {
            return false;
        }
        const connectedId = this.xrpID.slice(-5);
        if (connectedId === wanted) {
            return false;
        }
        console.log(
            `USB port holds XRP-${connectedId}, not the requested XRP-${wanted}; disconnecting`,
        );
        const usb = this.connections[ConnectionType.USB] as USBConnection | undefined;
        await usb?.disconnect();
        this.reportBleFailure(wanted, BleConnectFailure.WRONG_USB_XRP, connectedId);
        return true;
    }

    /**
     * hasPermittedBleDevice - true when Bluetooth can connect to this robot
     * without showing the browser's device chooser.
     */
    public hasPermittedBleDevice(xrpId: string): boolean {
        const ble = this.connections[ConnectionType.BLUETOOTH] as BluetoothConnection | undefined;
        return ble?.hasPermittedDevice(xrpId) ?? false;
    }

    /**
     * switchToBluetooth - move the known robot onto Bluetooth.
     *
     * The cable must already be out: the REPL cannot be owned by both
     * transports, and the robot only advertises once it is running on battery.
     */
    private async switchToBluetooth(): Promise<void> {
        const remembered = getRememberedXrp();
        const xrpId = remembered?.xrpId ?? this.xrpID?.slice(-5);
        const ble = this.connections[ConnectionType.BLUETOOTH] as BluetoothConnection | undefined;
        const usb = this.connections[ConnectionType.USB] as USBConnection | undefined;
        if (!ble || !xrpId) {
            await this.connectBluetooth({ showAll: true });
            return;
        }

        if (usb?.isConnected()) {
            this.reportBleFailure(xrpId, BleConnectFailure.USB_STILL_CONNECTED);
            return;
        }

        await this.connectBluetooth({ xrpId });
    }

    /**
     * Cable was plugged in while the page is open. If Bluetooth still owns
     * the REPL, drop it and route commands to USB before auto-connect finishes.
     */
    public async handoffBluetoothToUsb(): Promise<void> {
        const ble = this.connections[ConnectionType.BLUETOOTH] as BluetoothConnection | undefined;
        await ble?.closeForUsbHandoff();
        const usb = this.connections[ConnectionType.USB];
        if (usb) {
            this.cmdToXRPMgr.setConnection(usb);
        }
    }

    /**
     * connectCallback
     */
    public async connectCallback(state: ConnectionState, connType: ConnectionType) {
        this.activeConnection = this.connections[connType];
        if (state === ConnectionState.Connected) {
            try {
                if (await this.activeConnection.getToREPL()) {
                    this.appMgr.emit(
                        EventType.EVENT_CONNECTION_STATUS,
                        ConnectionState.Connected.toString(),
                    );
                    await this.cmdToXRPMgr.getOnBoardFSTree();
                    await this.activeConnection.getToNormal();
                    if (connType == ConnectionType.USB) {
                        //if we connected via USB then we can release the BLE terminal
                        await this.cmdToXRPMgr.resetTerminal();
                    }
                    await this.cmdToXRPMgr.clearIsRunning();
                    this.xrpID = await this.cmdToXRPMgr.checkIfNeedUpdate();
                    if (await this.rejectUnwantedUsbXrp(connType)) {
                        return;
                    }
                    this.IDSet(connType);

                    // Check for plugins after connection is established
                    await this.pluginMgr.pluginCheck();

                    // After successufully connected to the bluetooth, hide the connecting dialog
                    AppMgr.getInstance().emit(
                        EventType.EVENT_HIDE_SPINNER_CONNECTING,
                        'hide-connection-spinner',
                    );
                }
            } catch (error) {
                console.error('Error in connectCallback', error);
                AppMgr.getInstance().emit(
                    EventType.EVENT_HIDE_SPINNER_CONNECTING,
                    'hide-connection-spinner',
                );
            }
        } else if (state === ConnectionState.Disconnected) {
            this.appMgr.emit(
                EventType.EVENT_CONNECTION_STATUS,
                ConnectionState.Disconnected.toString(),
            );
            // notify the folder tree to clear its data
            this.appMgr.emit(EventType.EVENT_FILESYS, '{}');
            // Reconnect timeout / failed first connect: drop the spinner.
            // An expected reboot (##XRPSTOP##) goes through disconnect() without
            // this callback, so the spinner stays up until reconnect finishes.
            if (connType === ConnectionType.BLUETOOTH) {
                AppMgr.getInstance().emit(
                    EventType.EVENT_HIDE_SPINNER_CONNECTING,
                    'hide-connection-spinner',
                );
            }
        }
    }

    IDSet = (connType: ConnectionType) => {
        //ID this would be a good spot to send window.xrpID to the database
        if (this.xrpID != undefined) {
            const isBLE = connType === ConnectionType.BLUETOOTH;
            const xrpType = this.cmdToXRPMgr.getXRPType();
            const data = {
                XRPID: this.xrpID.slice(-5),
                platform: 'XRP-react',
                BLE: isBLE,
                XRPType: xrpType,
            };

            // Send this information back to the WPI server (skipped in offline builds)
            try {
                if (!isOfflineBuild) fetch('https://xrpid-464879733234.us-central1.run.app/data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });
            } catch (err) {
                console.log(err);
            }
            if (isBLE) {
                // A robot reached over Bluetooth becomes the saved XRP. USB does
                // not: the cable is claimed only through Switch to Bluetooth.
                const ble = this.connections[ConnectionType.BLUETOOTH] as
                    | BluetoothConnection
                    | undefined;
                saveRememberedXrp({
                    xrpId: data.XRPID,
                    lastConnectionType: connType,
                    bleDeviceId: ble?.getDeviceId(),
                });
            }
            // notify to display to the UI
            this.appMgr.emit(EventType.EVENT_ID, JSON.stringify(data));
        }
    };

    /**
     * publishConnectionInfo - (re)publish the connected XRP's identity (the ID
     * shown to the left of the RUN button).
     *
     * Some flows connect to the XRP outside the normal connect-button path —
     * notably the firmware install wizard, which reconnects after a reboot and
     * then soft-resets the board. In those cases the EVENT_ID may never have
     * been emitted (the reconnect can land before the board is ready to answer
     * a version query). Calling this once the board has settled fills the ID in.
     *
     * No-op when not connected. Re-queries the board only if the id is unknown.
     */
    public async publishConnectionInfo(): Promise<void> {
        const conn = this.activeConnection;
        if (!conn || !conn.isConnected()) {
            return;
        }
        const connType =
            conn instanceof USBConnection ? ConnectionType.USB : ConnectionType.BLUETOOTH;
        if (this.xrpID === undefined) {
            this.xrpID = await this.cmdToXRPMgr.checkIfNeedUpdate();
        }
        this.IDSet(connType);
    }

    /**
     * getConnection
     * @returns Connection object or null
     */
    public getConnection(): Connection | null {
        return this.activeConnection;
    }
}
