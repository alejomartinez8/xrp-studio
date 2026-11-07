// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details
import logo from '@assets/images/xrpstickerbot.png';
import fileadd from '@assets/images/file_add.svg';
import fileupload from '@assets/images/upload_file.svg';
import fileexport from '@assets/images/fileexport.svg';
import filesave from '@assets/images/file_save.svg';
import filesaveas from '@assets/images/save_as.svg';
import copyfiles from '@assets/images/copy-files.svg';
import fontplus from '@assets/images/text_increase.svg';
import fontminus from '@assets/images/text_decrease.svg';
import userguide from '@assets/images/developer_guide.svg';
import apilink from '@assets/images/api.svg';
import python from '@assets/images/python.svg';
import convert from '@assets/images/convert.svg';
import dashboard from '@assets/images/dashboard.svg';
import drivers from '@assets/images/drivers.svg';
import forum from '@assets/images/forum.svg';
import curriculum from '@assets/images/curriculum.svg';
import changelog from '@assets/images/changelog.svg';
import privacy from '@assets/images/privacy.svg';
import chatbot from '@assets/images/chatbot.svg';
import gamepad from '@assets/images/gamepad.svg';
import bugs from '@assets/images/bugs.svg';
import { TiArrowSortedDown } from 'react-icons/ti';
import { IoPlaySharp } from 'react-icons/io5';
import { IoStop } from 'react-icons/io5';
import { IoArrowUpCircle } from 'react-icons/io5';
import { IoBluetooth, IoChevronDown } from 'react-icons/io5';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@components/dialogs/dialog';
import ConnectionDlg from '@/components/dialogs/connectiondlg';
import FileSaveAsDialg from '@/components/dialogs/filesaveasdlg';
import {
    ConnectionType,
    ConnectionCMD,
    BleConnectFailure,
    BleConnectFailureInfo,
    NewFileData,
    FileType,
    FileData,
    EditorType,
    FontSize,
    Versions,
} from '@/utils/types';
import { useFilePicker } from 'use-file-picker';
import { MenuDataItem } from '@/widgets/menutypes';
import MenuItem from '@/widgets/menu';
import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import { ConnectionState } from '@/connections/connection';
import NewFileDlg from '@/components/dialogs/newfiledlg';
import { Constants } from '@/utils/constants';
import { CommandToXRPMgr } from '@/managers/commandstoxrpmgr';
import UploadFileDlg from '@/components/dialogs/uploadfiledlg';
import EditorMgr, { EditorSession, EdSearchParams } from '@/managers/editormgr';
import { useLocalStorage } from 'usehooks-ts';
import { StorageKeys } from '@/utils/localstorage';
import {
    clearRememberedXrp,
    getRememberedXrp,
    RememberedXrp,
    saveRememberedXrp,
} from '@/utils/rememberedxrp';
import { isAiBuddyMenuEnabled } from '@/utils/aiBuddyAccess';
import ConnectionStatus from '@components/navbar/connection-status';
import NavDropdown from '@components/navbar/nav-dropdown';
import QuickSettings from '@components/navbar/quick-settings';
import MobileMenu from '@components/navbar/mobile-menu';
import { flushAutosave } from '@/utils/autosave';
import LanguageDialog from '@components/dialogs/language-dlg';
import ThemeDialog from '@components/dialogs/theme-dlg';
import Login from '@/widgets/login';
import { UserProfile } from '@/services/google-auth';
import { handleSignedIn, handleSignedOut } from '@/utils/session';
import { TbEye, TbFile, TbHelpCircle, TbSettings } from 'react-icons/tb';
import { isLocalProjectsEnabled } from '@/utils/offline';
import FileSaver from 'file-saver';
import PowerSwitchAlert from '@/components/dialogs/power-switchdlg';
import SwitchToBluetoothDlg from '@/components/dialogs/switch-to-bluetoothdlg';
import ViewPythonDlg from '@/components/dialogs/view-pythondlg';
import { storeLoadedContent } from '@/utils/loaded-content';
import AlertDialog from '@/components/dialogs/alertdlg';
import BleReconnectFailedDlg from '@/components/dialogs/ble-reconnect-faileddlg';
import BatteryBadDlg from '@/components/dialogs/battery-baddlg';
import ProgressDlg from '@/components/dialogs/progressdlg';
import ConfirmationDlg from '@components/dialogs/confirmdlg';
import React from 'react';
import { CreateEditorTab } from '@/utils/editorUtils';
import ChangeLogDlg from '@components/dialogs/changelog';
import { Actions, IJsonTabNode } from 'flexlayout-react';
import { fireGoogleUserTree, getUsernameFromEmail } from '@/utils/google-utils';
import XRPDriverInstallDlg from '@components/dialogs/driver-installs';
import powerswitch_standard from '@assets/images/XRP-nonbeta-controller-power.jpg';
import powerswitch_beta from '@assets/images/XRP_Controller-Power.jpg';
import BusyDialog from '@components/dialogs/busydlg';
import { UAParser } from 'ua-parser-js';
import backup_restore from '@assets/images/backup_restore.svg';
import firmwareLoaderIcon from '@assets/images/firmware-loader.svg';
import BackupRestoreDlg from '@components/dialogs/backup-restoredlg';
import FirmwareLoaderDlg from '@components/dialogs/firmware-loaderdlg';
import FirmwareBackupPromptDlg from '@components/dialogs/firmware-backup-promptdlg';
import BackupDlg from '@components/dialogs/backupdlg';
import RestoreDlg from '@components/dialogs/restoredlg';
import CopyFileDlg from './dialogs/copyfiledlg';

type NavBarProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layoutref: any;
};

let hasSubscribed = false;

/**
 * parseBleFailure - decode the payload of EVENT_BLE_RECONNECT_FAILED, tolerating
 * a bare XRP id from older emitters.
 */
function parseBleFailure(payload: string): BleConnectFailureInfo {
    const known = [
        BleConnectFailure.CANCELLED,
        BleConnectFailure.USB_STILL_CONNECTED,
        BleConnectFailure.WRONG_USB_XRP,
    ];
    try {
        const parsed = JSON.parse(payload) as Partial<BleConnectFailureInfo>;
        if (typeof parsed.xrpId === 'string') {
            return {
                xrpId: parsed.xrpId,
                reason:
                    known.find((reason) => reason === parsed.reason) ?? BleConnectFailure.NOT_FOUND,
                otherXrpId: parsed.otherXrpId,
            };
        }
    } catch {
        // fall through to the legacy bare-id form
    }
    return { xrpId: payload, reason: BleConnectFailure.NOT_FOUND };
}

/**
 * NavBar component - create the navigation bar
 * @param layoutref
 * @returns
 */
function NavBar({ layoutref }: NavBarProps) {
    const { t } = useTranslation();
    const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
    const [isConnected, setConnected] = useState(false);
    const [isLogin, setLogin] = useState(false);
    const [isRunning, setRunning] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [isBlockly, setBlockly] = useState(false);
    const [isOtherTab, setIsOtherTab] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [isDlgOpen, setDlgOpen] = useState(false);
    const [isGamepadConnected, setGamepadConnected] = useState<boolean>(false);
    const [dialogContent, setDialogContent] = useState<React.ReactNode>(null);
    const { openFilePicker, loading, errors } = useFilePicker({
        multiple: true,
        accept: ['.py', '.blocks'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onFilesSuccessfullySelected: (data: any) => {
            console.log(data.plainFiles);
            const fileData: FileData[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.filesContent.forEach((content: any) => {
                console.log(content.path);
                fileData.push({ name: content.path, content: content.content });
            });
            setDialogContent(<UploadFileDlg files={fileData} toggleDialog={toggleDialog} />);
            setDlgOpen(true);
        },
    });
    const [xprID, setXrpId] = useState<{ platform?: string; XRPID?: string } | null>(null);
    const [rememberedXrp, setRememberedXrp] = useState<RememberedXrp | null>(() =>
        getRememberedXrp(),
    );
    const [connectionType, setConnectionType] = useState<ConnectionType | null>(null);
    const [availableUpdate, setAvailableUpdate] = useState<
        | { kind: 'mp'; versions: Versions }
        | { kind: 'lib'; versions: Versions }
        | { kind: 'must-mp' }
        | null
    >(null);
    const [activeTab, setActiveTab] = useLocalStorage(StorageKeys.ACTIVETAB, '');
    const authService = AppMgr.getInstance().authService;
    const driveService = AppMgr.getInstance().driveService;
    const dropdownRef = useRef<HTMLDivElement>(null);
    const stoppingRef = useRef(false);
    // True only when SHOW_SPINNER actually opened BusyDialog in this dialog slot.
    // Prevents HIDE_SPINNER from closing an unrelated dialog (firmware wizard).
    const connectingSpinnerShownRef = useRef(false);
    const browserCheckRef = useRef(false);

    // Check for Web Serial API support once on component mount.
    useEffect(() => {
        if (browserCheckRef.current) return;
        browserCheckRef.current = true;

        const parser = new UAParser();
        const browser = parser.getResult().browser;
        if (!('serial' in navigator)) {
            setDialogContent(
                <AlertDialog
                    alertMessage={t('firefox-not-supported', { browser: browser.name })}
                    toggleDialog={toggleDialog}
                />,
            );
            toggleDialog();
        }
    }, [t]);

    useEffect(() => {
        stoppingRef.current = isStopping;
    }, [isStopping]);

    useEffect(() => {
        if (!hasSubscribed) {
            // subscribe to the connection event
            AppMgr.getInstance().on(EventType.EVENT_CONNECTION_STATUS, async (state: string) => {
                if (state === ConnectionState.Connected.toString()) {
                    // clear the existing last file save time for Google Drive files
                    EditorMgr.getInstance().clearLastFileSaveTime();
                    setConnected(true);
                    setRunning(false);
                    setConnectionType(AppMgr.getInstance().getConnectionType());
                    setRememberedXrp(getRememberedXrp());
                } else if (state === ConnectionState.Disconnected.toString()) {
                    setConnected(false);
                    setXrpId(null);
                    setAvailableUpdate(null);
                    setConnectionType(null);
                    setRememberedXrp(getRememberedXrp());
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_ID, (id: string) => {
                setXrpId(JSON.parse(id));
                setRememberedXrp(getRememberedXrp());
            });

            AppMgr.getInstance().on(EventType.EVENT_EDITOR, (type: EditorType) => {
                if (type === EditorType.BLOCKLY) {
                    setBlockly(true);
                    setIsOtherTab(false);
                } else if (type === EditorType.PYTHON) {
                    setBlockly(false);
                    setIsOtherTab(false);
                } else {
                    setIsOtherTab(true);
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_NEW_PROJECT, (newFileDataJson: string) => {
                void createNewFile(JSON.parse(newFileDataJson) as NewFileData);
            });

            AppMgr.getInstance().on(EventType.EVENT_OPEN_FILE, async (filePathDataJson: string) => {
                const filePathData = JSON.parse(filePathDataJson);
                const filename = filePathData.xrpPath.split('/').pop();
                const searchParams: EdSearchParams = {
                    name: filename,
                    path: filePathData.xrpPath,
                };
                if (filename && EditorMgr.getInstance().hasEditorSessionByName(searchParams)) {
                    EditorMgr.getInstance().SelectEditorTabByName(searchParams);
                    return;
                }
                const fileType = filename?.includes('.blocks') ? FileType.BLOCKLY : FileType.PYTHON;
                const mewFileData: NewFileData = {
                    parentId: '',
                    path: filePathData.xrpPath,
                    gpath: filePathData.gPath,
                    gparentId: filePathData.gparentId,
                    name: filename || '',
                    filetype: fileType,
                };
                const tabId = CreateEditorTab(mewFileData, layoutref);
                setActiveTab(tabId);
                // Need to access the connection status directly from the manager because the React isConnected state available
                // isn't available in the thread context
                const isConnected = AppMgr.getInstance().getConnection()?.isConnected();
                if (authService.isLogin) {
                    // get the content from Google Drive
                    await loadGoogleEditor(mewFileData, fileType, filename);
                } else if (isConnected) {
                    await CommandToXRPMgr.getInstance()
                        .getFileContents(filePathData.xrpPath)
                        .then((content) => {
                            loadXRPEditor(content, fileType, filename, filePathData.xrpPath);
                        });
                }
            });

            // Update checks now surface a subtle indicator instead of an auto-popup.
            // The actual update is performed manually via the Firmware Loader.
            AppMgr.getInstance().on(EventType.EVENT_MICROPYTHON_UPDATE, (versions) => {
                try {
                    setAvailableUpdate({ kind: 'mp', versions: JSON.parse(versions) });
                } catch {
                    setAvailableUpdate({
                        kind: 'mp',
                        versions: { currentVersion: '', newVersion: '' },
                    });
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_XRPLIB_UPDATE, (versions) => {
                try {
                    setAvailableUpdate((prev) =>
                        prev && prev.kind === 'mp'
                            ? prev
                            : { kind: 'lib', versions: JSON.parse(versions) },
                    );
                } catch {
                    setAvailableUpdate((prev) =>
                        prev && prev.kind === 'mp'
                            ? prev
                            : {
                                  kind: 'lib',
                                  versions: { currentVersion: '', newVersion: '' },
                              },
                    );
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_MUST_UPDATE_MICROPYTHON, () => {
                setAvailableUpdate((prev) => prev ?? { kind: 'must-mp' });
            });

            AppMgr.getInstance().on(EventType.EVENT_MICROPYTHON_UPDATE_DONE, () => {
                setAvailableUpdate(null);
            });

            AppMgr.getInstance().on(EventType.EVENT_XRPLIB_UPDATE_DONE, () => {
                setAvailableUpdate(null);
            });

            AppMgr.getInstance().on(EventType.EVENT_SHOWCHANGELOG, (changelog) => {
                if (changelog === Constants.SHOW_CHANGELOG) {
                    setDialogContent(<ChangeLogDlg closeDialog={toggleDialog} />);
                    toggleDialog();
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_SHOWPROGRESS, (progress) => {
                if (progress === Constants.SHOW_PROGRESS) {
                    setDialogContent(<ProgressDlg title="saveToXRPTitle" />);
                    toggleDialog();
                    AppMgr.getInstance().on(EventType.EVENT_UPLOAD_DONE, () => {
                        toggleDialog();
                        AppMgr.getInstance().eventOff(EventType.EVENT_UPLOAD_DONE);
                        setDialogContent(<div />);
                    });
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_ALERT, (message) => {
                setDialogContent(
                    <AlertDialog alertMessage={message} toggleDialog={toggleDialog} />,
                );
                toggleDialog();
            });

            AppMgr.getInstance().on(EventType.EVENT_GAMEPAD_STATUS, (status: string) => {
                if (status === Constants.CONNECTED) {
                    setGamepadConnected(true);
                } else if (status === Constants.DISCONNECTED) {
                    setGamepadConnected(false);
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_LOGIN_STATUS, (status: string) => {
                if (status === LoginStatus.LOGGED_IN) {
                    setLogin(true);
                } else if (status === LoginStatus.LOGGED_OUT) {
                    setLogin(false);
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_SHOW_SPINNER_CONNECTING, (title: string) => {
                // The firmware install wizard (and other flows) already own this
                // shared dialog. Replacing their content with BusyDialog unmounts
                // the wizard mid-update after a UF2 reboot reconnect.
                // If we already own the slot (e.g. BLE spinner), allow USB to
                // retitle it — cable autoconnect during BLE must not no-op.
                if (dialogRef.current?.open && !connectingSpinnerShownRef.current) {
                    return;
                }
                connectingSpinnerShownRef.current = true;
                openDialog(<BusyDialog title={t(title)} />);
            });

            AppMgr.getInstance().on(EventType.EVENT_HIDE_SPINNER_CONNECTING, () => {
                if (connectingSpinnerShownRef.current) {
                    connectingSpinnerShownRef.current = false;
                    closeDialog();
                }
                if (stoppingRef.current) {
                    setIsStopping(false);
                    setRunning(false);
                    broadcastRunningState(false);
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_BLE_RECONNECT_FAILED, (payload: string) => {
                const { xrpId, reason, otherXrpId } = parseBleFailure(payload);
                setDialogContent(
                    <BleReconnectFailedDlg
                        xrpId={xrpId}
                        reason={reason}
                        otherXrpId={otherXrpId}
                        onRetry={() => {
                            toggleDialog();
                            if (isUsbConnected()) {
                                onSwitchToBluetooth();
                            } else {
                                AppMgr.getInstance().emit(
                                    EventType.EVENT_CONNECTION,
                                    ConnectionCMD.CONNECT_BLUETOOTH_KNOWN,
                                );
                            }
                        }}
                        onSecondary={() => {
                            if (reason === BleConnectFailure.NOT_FOUND) {
                                setDialogContent(<ConnectionDlg callback={onConnectionCommand} />);
                            } else if (reason === BleConnectFailure.USB_STILL_CONNECTED) {
                                toggleDialog();
                            } else {
                                toggleDialog();
                                AppMgr.getInstance().emit(
                                    EventType.EVENT_CONNECTION,
                                    ConnectionCMD.CONNECT_USB,
                                );
                            }
                        }}
                    />,
                );
                if (!dialogRef.current?.open) {
                    toggleDialog();
                }
            });

            hasSubscribed = true;
        }
    });

    /**
     * toggleMoreDropdown - toggle the more dropdown menu when the mouse click outside the menu
     */
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Check if the click is outside the dropdown menu
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setMoreMenuOpen(false);
            }
        }

        // Add event listener when the component mounts
        document.addEventListener('mousedown', handleClickOutside);

        // Clean up the event listener when the component unmounts
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (errors.length > 0) {
        return <div>Error: {errors.values.toString()}</div>;
    }

    /**
     * loadGoogleEditor - load the file content from Google Drive into the editor
     *
     * The content is also kept in the editor session: when the file opens while the app is still
     * starting (XRP Studio reopens the last project), the load event can arrive before the new tab
     * has mounted and subscribed, and the editor then loads the session content when it mounts.
     * @param filePathData
     * @param fileType
     * @param filename
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function loadGoogleEditor(filePathData: NewFileData, fileType: FileType, filename: any) {
        await driveService.getFileContents(filePathData.gpath || '').then((fileContent) => {
            let content;
            if (fileType === FileType.BLOCKLY) {
                const lines: string[] | undefined = fileContent?.split('##XRPBLOCKS ');
                content = lines?.slice(-1)[0];
            } else {
                content = fileContent;
            }
            const loadContent = { name: filename, path: filePathData.path, content: content };
            storeLoadedContent(filename, filePathData.path, fileContent);
            AppMgr.getInstance().emit(EventType.EVENT_EDITOR_LOAD, JSON.stringify(loadContent));
        });
    }

    /**
     * loadXRPEditor - load the file content from XRP into the editor
     * @param content
     * @param fileType
     * @param filename
     * @param path
     */
    function loadXRPEditor(content: number[], fileType: FileType, filename: string, path: string) {
        // if the file is a block files, extract the blockly JSON out of the comment ##XRPBLOCKS
        let bytes = content;
        storeLoadedContent(
            filename,
            path,
            typeof content === 'string' ? content : new TextDecoder().decode(new Uint8Array(content)),
        );
        if (fileType === FileType.BLOCKLY) {
            const data: string = new TextDecoder().decode(new Uint8Array(bytes));
            const lines: string[] = data.split('##XRPBLOCKS ');
            bytes = Array.from(new TextEncoder().encode(lines.slice(-1)[0]));
        }
        const text =
            typeof bytes === 'string' ? bytes : new TextDecoder().decode(new Uint8Array(bytes));
        // set the content in the editor
        const loadContent = { name: filename, path: path, content: text };
        AppMgr.getInstance().emit(EventType.EVENT_EDITOR_LOAD, JSON.stringify(loadContent));
    }

    /**
     * onNewFileSubmitted - get the form data and create a new file on the layout
     */
    async function onNewFileSubmitted(data: NewFileData) {
        toggleDialog();
        await createNewFile(data);
    }

    /**
     * createNewFile - open a tab for a new file and create it in Google Drive (or My projects) or
     * on the XRP, with `data.content` when given (an example from the welcome screen) or empty.
     * Shared by the New File dialog and the welcome screen (`EVENT_NEW_PROJECT`); the connection
     * is read from the manager because the welcome screen calls it from an event handler, where
     * React state is stale.
     */
    async function createNewFile(data: NewFileData) {
        const isConnected = AppMgr.getInstance().getConnection()?.isConnected() ?? false;
        const tabId = CreateEditorTab(data, layoutref);
        setActiveTab(tabId);
        if (authService.isLogin) {
            // create the file in Google Drive
            const minetype = data.name.includes('.py')
                ? 'text/x-python'
                : data.name.includes('.blocks')
                  ? 'application/json'
                  : 'text/plain';
            const blob = new Blob([data.content ?? ''], { type: minetype });
            await driveService
                .uploadFile(blob, data.name, minetype, data.parentId ?? undefined)
                .then((file) => {
                    console.log('New file created in Google Drive: ', file);
                    // update the file ID in the editor session
                    const editorMgr = EditorMgr.getInstance();
                    const searchParams: EdSearchParams = {
                        name: data.name,
                        path: data.path,
                    };
                    const session = editorMgr.getEditorSessionByName(searchParams);
                    if (session) {
                        session.gpath = file?.id;
                        // gpath is assigned after the tab was first rendered, so
                        // force a tab re-render to show the Google Drive icon now
                        // instead of waiting for the next tab switch.
                        editorMgr.SelectEditorTab(session.id);
                    }
                });
            await fireGoogleUserTree(getUsernameFromEmail(authService.userProfile.email) ?? '');
        } else if (isConnected) {
            // create the file in XRP
            await CommandToXRPMgr.getInstance()
                .uploadFile(data.path, data.content ?? '')
                .then(() => {
                    CommandToXRPMgr.getInstance().getOnBoardFSTree();
                });
        }
    }

    /**
     * NewFile - create either a new Python or Blockly file
     */
    function NewFile() {
        console.log(t('newFile'), layoutref);
        setDialogContent(
            <NewFileDlg submitCallback={onNewFileSubmitted} toggleDialog={toggleDialog} />,
        );
        toggleDialog();
    }

    /**
     * UploadFile - upload a file to XRP
     */
    function UploadFile() {
        console.log(t('uploadFile'));
        openFilePicker();
    }

    /**
     * ExportToPC - export the file to PC
     */
    function ExportToPC() {
        console.log(t('exportToPC'));
        const session = EditorMgr.getInstance().getEditorSession(activeTab);
        if (session) {
            if (authService.isLogin) {
                // download the file from Google Drive and save to PC
                driveService.getFileContents(session.gpath || '').then((fileContent) => {
                    FileSaver.saveAs(new Blob([fileContent || '']), session.name);
                });
            } else if (isConnected) {
                CommandToXRPMgr.getInstance()
                    .getFileContents(session.path)
                    .then((content) => {
                        const data: string = new TextDecoder().decode(new Uint8Array(content));
                        const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
                        FileSaver.saveAs(blob, session.name);
                    });
            }
        } else {
            setDialogContent(
                <AlertDialog alertMessage={t('no-activetab')} toggleDialog={toggleDialog} />,
            );
            toggleDialog();
        }
    }

    /**
     * SaveFile - Save file to XRP
     */
    function SaveFile() {
        console.log(t('saveFile'));
        if (EditorMgr.getInstance().hasEditorSession(activeTab)) {
            AppMgr.getInstance().emit(EventType.EVENT_SAVE_EDITOR, '');
            AppMgr.getInstance().on(EventType.EVENT_UPLOAD_DONE, () => {
                toggleDialog();
                AppMgr.getInstance().eventOff(EventType.EVENT_UPLOAD_DONE);
                setDialogContent(<div />);
                toggleDialog();
            });
        } else {
            setDialogContent(
                <AlertDialog alertMessage={t('no-activetab')} toggleDialog={toggleDialog} />,
            );
            toggleDialog();
        }
    }

    /**
     * hanleSaveFileAs
     * @param fileData
     */
    async function handleSaveFileAs(fileData: NewFileData) {
        // close the save as dialog first
        const editorMgr = EditorMgr.getInstance();
        const session = editorMgr.getEditorSession(activeTab);

        const RemoveAndSwitchTab = async (newFileData: NewFileData) => {
            editorMgr.RemoveEditorTab(activeTab);
            editorMgr.RemoveEditor(activeTab);
            const tabId = CreateEditorTab(newFileData, layoutref);
            setActiveTab(tabId);
            setDialogContent(<div />);
            if (authService.isLogin) {
                await loadGoogleEditor(newFileData, newFileData.filetype, newFileData.name);
            } else if (isConnected) {
                await CommandToXRPMgr.getInstance()
                    .getFileContents(newFileData.path)
                    .then(async (content) => {
                        loadXRPEditor(
                            content,
                            newFileData.filetype,
                            newFileData.name,
                            newFileData.path,
                        );
                    });
            }
            if (newFileData.filetype === FileType.BLOCKLY) {
                AppMgr.getInstance().emit(EventType.EVENT_SAVE_EDITOR, '');
            }
        };
        // close the save as dialog first
        toggleDialog();
        if (session) {
            if (isLogin) {
                // upload the file as new path and filename to Google Drive
                const minetype =
                    fileData.filetype === FileType.PYTHON
                        ? 'text/x-python'
                        : fileData.filetype === FileType.BLOCKLY
                          ? 'application/json'
                          : 'text/plain';
                const blob = new Blob([session.content || ''], { type: minetype });

                AppMgr.getInstance()
                    .driveService.uploadFile(blob, fileData.name, minetype, fileData.gparentId)
                    .then((file) => {
                        console.log(file);
                        const username = getUsernameFromEmail(
                            AppMgr.getInstance().authService.userProfile.email,
                        );
                        fireGoogleUserTree(username ?? '');
                        const newFileData: NewFileData = {
                            parentId: '',
                            path: fileData.path + '/' + fileData.name,
                            gpath: file?.id,
                            name: file?.name || '',
                            filetype: fileData.filetype,
                            content: session.content || '',
                        };
                        RemoveAndSwitchTab(newFileData);
                    });
            } else if (isConnected) {
                // upload the file as new file path and name to XRP
                AppMgr.getInstance().emit(EventType.EVENT_SHOWPROGRESS, Constants.SHOW_PROGRESS);
                const path = fileData.path + fileData.name;
                await CommandToXRPMgr.getInstance()
                    .uploadFile(path, session.content || '', true)
                    .then(async () => {
                        AppMgr.getInstance().emit(EventType.EVENT_UPLOAD_DONE, '');
                        const newFileData: NewFileData = {
                            parentId: '',
                            path: fileData.path + fileData.name,
                            name: fileData.name,
                            filetype: fileData.filetype,
                            content: session.content || '',
                        };
                        await CommandToXRPMgr.getInstance().getOnBoardFSTree();
                        RemoveAndSwitchTab(newFileData);
                    });
            }
        }
    }

    /**
     * SaveFileAs - save the current file as to the XRP
     */
    function SaveFileAs() {
        console.log(t('saveFileAs'));
        if (EditorMgr.getInstance().hasEditorSession(activeTab)) {
            setDialogContent(
                <FileSaveAsDialg saveCallback={handleSaveFileAs} toggleDialog={toggleDialog} />,
            );
            toggleDialog();
        } else {
            setDialogContent(
                <AlertDialog alertMessage={t('no-activetab')} toggleDialog={toggleDialog} />,
            );
            toggleDialog();
        }
    }

    /**
     * CopyFilesToGoogleDrive - copy the current file to Google Drive
     */
    function CopyFilesToGoogleDrive() {
        setDialogContent(<CopyFileDlg toggleDialog={toggleDialog} />);
        toggleDialog();
    }

    /**
     * ViewPythonFile - view the Python file
     */
    function ViewPythonFile() {
        console.log('View Python File', activeTab);
        if (isOtherTab) {
            return;
        }
        const viewPythonHandler = (code: string) => {
            setDialogContent(
                <ViewPythonDlg
                    code={code}
                    toggleDlg={toggleDialog}
                    clearDlg={clearDialogContent}
                />,
            );
            toggleDialog();
            appMgr.eventOff(EventType.EVENT_GENPYTHON_DONE);
        };
        const appMgr = AppMgr.getInstance();
        // signal the editor to generate the python content in this editor session
        appMgr.on(EventType.EVENT_GENPYTHON_DONE, viewPythonHandler);
        appMgr.emit(EventType.EVENT_GENPYTHON, activeTab);
    }

    /**
     * BlocksToPythonCallback - setup the conversion of the current active Blocks program to Python program
     */
    const BlocksToPythonCallback = async () => {
        const appMgr = AppMgr.getInstance();
        const convertToPythonHandler = async (code: string) => {
            // remove the active tab and create a new python editor tab with the code
            const editorSession = EditorMgr.getInstance().getEditorSession(activeTab);
            if (editorSession) {
                const newFileData: NewFileData = {
                    parentId: editorSession.id,
                    path: editorSession?.path,
                    name: editorSession.name.split('.blocks')[0] + '.py',
                    gpath: editorSession.gpath,
                    gparentId: editorSession.gparentId,
                    filetype: FileType.PYTHON,
                    content: code,
                };

                if (authService.isLogin) {
                    const blocksFileId = editorSession.gpath;
                    const blocksParentId = editorSession.gparentId;

                    const trashFolderId = await driveService.ensureTrashFolder();
                    if (trashFolderId && blocksFileId && blocksParentId) {
                        await driveService.moveFile(blocksFileId, blocksParentId, trashFolderId);
                    }

                    const minetype = 'text/x-python';
                    const blob = new Blob([code], { type: minetype });
                    const uploaded = await driveService.uploadFile(
                        blob,
                        newFileData.name,
                        minetype,
                        blocksParentId ?? undefined,
                    );

                    newFileData.gpath = uploaded?.id;
                    newFileData.gparentId = blocksParentId;
                    newFileData.path = editorSession.path.split('.blocks')[0] + '.py';

                    EditorMgr.getInstance().RemoveEditor(activeTab);
                    const tabId = CreateEditorTab(newFileData, layoutref);
                    setActiveTab(tabId);
                    const loadContent = {
                        name: newFileData.name,
                        path: newFileData.path,
                        content: code,
                    };
                    AppMgr.getInstance().emit(
                        EventType.EVENT_EDITOR_LOAD,
                        JSON.stringify(loadContent),
                    );
                    await fireGoogleUserTree(
                        getUsernameFromEmail(authService.userProfile.email) ?? '',
                    );
                } else if (isConnected) {
                    // move the converted blockly file to /trash
                    await CommandToXRPMgr.getInstance().buildPath(Constants.TRASH_FOLDER); // ensure the trash folder exists
                    await CommandToXRPMgr.getInstance()
                        .renameFile(
                            editorSession.path,
                            Constants.TRASH_FOLDER + '/' + editorSession.name,
                        )
                        .then(async () => {
                            // save the file to python
                            const path = editorSession.path.split('.blocks')[0] + '.py';
                            await CommandToXRPMgr.getInstance()
                                .uploadFile(path, code)
                                .then(() => {
                                    EditorMgr.getInstance().RemoveEditor(activeTab);
                                    const tabId = CreateEditorTab(newFileData, layoutref);
                                    setActiveTab(tabId);
                                });
                            await CommandToXRPMgr.getInstance()
                                .getFileContents(path)
                                .then((content) => {
                                    loadXRPEditor(content, FileType.PYTHON, newFileData.name, path);
                                });
                            await CommandToXRPMgr.getInstance().getOnBoardFSTree();
                        });
                }
            }
            EditorMgr.getInstance().RemoveEditorTab(activeTab);
            appMgr.eventOff(EventType.EVENT_GENPYTHON_DONE);
        };

        // Check to see if there is a python file match the name of the blockly file to be converted
        const editorSession = EditorMgr.getInstance().getEditorSession(activeTab);
        if (editorSession) {
            if (isLogin) {
                // check if existing python file exist with the same name in the Google drive
                if (editorSession.gparentId) {
                    const foldername = await AppMgr.getInstance().driveService.getFolderName(
                        editorSession.gparentId,
                    );
                    const filename = editorSession.name.split('.blocks')[0] + '.py';
                    if (AppMgr.getInstance().IsFileExists(foldername || '', filename)) {
                        toggleDialog();
                        setDialogContent(
                            <AlertDialog
                                alertMessage={t('file-exists-on-python-convert', {
                                    filename: filename,
                                })}
                                toggleDialog={toggleDialog}
                            />,
                        );
                        toggleDialog();
                        return;
                    }
                }
            } else if (isConnected) {
                const folderpath = editorSession.path.split(`/${editorSession.name}`);
                const foldername =
                    folderpath[0] !== '/' ? folderpath[0].split('/').pop() : folderpath[0];
                console.log('foldername: ', foldername);

                // check if existing python file exist with the same name
                const filename = editorSession.name.split('.blocks')[0] + '.py';
                if (AppMgr.getInstance().IsFileExists(foldername || '', filename)) {
                    toggleDialog();
                    setDialogContent(
                        <AlertDialog
                            alertMessage={t('file-exists-on-python-convert', {
                                filename: filename,
                            })}
                            toggleDialog={toggleDialog}
                        />,
                    );
                    toggleDialog();
                    return;
                }
            }
        }

        // signal the editor to generate the python content in this editor session
        appMgr.on(EventType.EVENT_GENPYTHON_DONE, convertToPythonHandler);
        appMgr.emit(EventType.EVENT_GENPYTHON, activeTab);
        toggleDialog();
    };

    /**
     * ConvertToPython - convert the current blockly file to Python
     */
    function ConvertToPython() {
        if (isOtherTab) {
            return;
        }
        if (!isConnected && !authService.isLogin) {
            setDialogContent(
                <AlertDialog alertMessage={t('XRP-not-connected')} toggleDialog={toggleDialog} />,
            );
            toggleDialog();
            return;
        }
        setDialogContent(
            <ConfirmationDlg
                acceptCallback={BlocksToPythonCallback}
                toggleDialog={toggleDialog}
                confirmationMessage={t('convert-to-python-desc')}
            />,
        );
        toggleDialog();
    }

    /**
     * FontPlusPlus - increase font in the current window
     */
    function FontPlusPlus() {
        console.log(t('increaseFont'));
        if (isOtherTab) {
            return;
        }
        AppMgr.getInstance().emit(EventType.EVENT_FONTCHANGE, FontSize.INCREASE);
    }

    /**
     * FontMinus - decrease font in the current window
     */
    function FontMinus() {
        console.log(t('decreaseFont'));
        if (isOtherTab) {
            return;
        }
        AppMgr.getInstance().emit(EventType.EVENT_FONTCHANGE, FontSize.DESCREASE);
    }

    /**
     * viewDashboard - view the dashboard
     */
    function viewDashboard() {
        console.log(t('dashboard'));
        // check if the dashboard tab is already open
        if (EditorMgr.getInstance().hasEditorSession(Constants.DASHBOARD_TAB_ID)) {
            const layoutModel = EditorMgr.getInstance().getLayoutModel();
            layoutModel?.doAction(Actions.selectTab(Constants.DASHBOARD_TAB_ID));
            setIsOtherTab(true);
            setActiveTab(Constants.DASHBOARD_TAB_ID);
            return;
        }
        const tabInfo: IJsonTabNode = {
            component: 'dashboard',
            name: t('dashboard'),
            id: Constants.DASHBOARD_TAB_ID,
            helpText: t('dashboard'),
        };
        layoutref!.current?.addTabToTabSet(Constants.EDITOR_TABSET_ID, tabInfo);
        EditorMgr.getInstance().AddEditor({
            id: Constants.DASHBOARD_TAB_ID,
            name: t('dashboard'),
            type: EditorType.OTHER,
            path: '',
            gpath: '',
            isSubscribed: false,
            fontsize: Constants.DEFAULT_FONTSIZE,
            content: undefined,
            lastUpdated: undefined,
            isModified: false,
        });
        setIsOtherTab(true);
        setActiveTab(Constants.DASHBOARD_TAB_ID);
    }

    /**
     * openAIChat - open the AI chat
     */
    function openAIChat() {
        console.log('Opening AI Chat');
        if (EditorMgr.getInstance().hasEditorSession(Constants.AI_CHAT_TAB_ID)) {
            const layoutModel = EditorMgr.getInstance().getLayoutModel();
            layoutModel?.doAction(Actions.selectTab(Constants.AI_CHAT_TAB_ID));
            setIsOtherTab(true);
            setActiveTab(Constants.AI_CHAT_TAB_ID);
            return;
        }
        const tabInfo: IJsonTabNode = {
            component: 'aichat',
            name: 'ai-chat',
            id: Constants.AI_CHAT_TAB_ID,
            helpText: t('ai-chat-help'),
        };
        layoutref!.current?.addTabToTabSet(Constants.EDITOR_TABSET_ID, tabInfo);
        EditorMgr.getInstance().AddEditor({
            id: Constants.AI_CHAT_TAB_ID,
            name: t('ai-chat'),
            type: EditorType.OTHER,
            path: '',
            gpath: '',
            isSubscribed: false,
            fontsize: Constants.DEFAULT_FONTSIZE,
            content: undefined,
            lastUpdated: undefined,
            isModified: false,
        });
        setIsOtherTab(true);
        setActiveTab(Constants.AI_CHAT_TAB_ID);
    }

    /**
     * onConnectionCommand - process a connection dialog choice
     */
    function onConnectionCommand(cmd: ConnectionCMD) {
        if (cmd === ConnectionCMD.CLEAR_DEFAULT_XRP) {
            clearRememberedXrp();
            setRememberedXrp(null);
            toggleDialog();
            return;
        }
        toggleDialog();
        AppMgr.getInstance().emit(EventType.EVENT_CONNECTION, cmd);
    }

    /**
     * onConnectBtnClicked - one-click connect to the default robot: USB if it is
     * plugged in, Bluetooth otherwise. With no default, open the chooser.
     */
    function onConnectBtnClicked() {
        const remembered = getRememberedXrp();
        if (remembered?.xrpId) {
            AppMgr.getInstance().emit(EventType.EVENT_CONNECTION, ConnectionCMD.CONNECT_KNOWN_XRP);
            return;
        }
        setDialogContent(<ConnectionDlg callback={onConnectionCommand} />);
        toggleDialog();
    }

    /**
     * onChooseDifferentXrp - the caret menu: clear the default, or fall back to
     * the standard Bluetooth / USB connections.
     */
    function onChooseDifferentXrp() {
        setDialogContent(<ConnectionDlg callback={onConnectionCommand} />);
        toggleDialog();
    }

    /**
     * isUsbConnected - is the cable currently owning the REPL?
     */
    function isUsbConnected(): boolean {
        return (
            (AppMgr.getInstance().getConnection()?.isConnected() ?? false) &&
            AppMgr.getInstance().getConnectionType() === ConnectionType.USB
        );
    }

    /**
     * onSwitchToBluetooth - USB session handoff to the known robot over BLE.
     * The robot only advertises on battery power, so confirm the power switch
     * is on and the cable is out before connecting.
     */
    function onSwitchToBluetooth() {
        // The robot on the cable, which is not necessarily today's default.
        const xrpId = xprID?.XRPID ?? getRememberedXrp()?.xrpId;
        if (!xrpId) {
            return;
        }
        // This is the only place the default XRP is set, and it also has to
        // survive the USB session ending when the cable comes out.
        saveRememberedXrp({ xrpId, lastConnectionType: ConnectionType.BLUETOOTH });
        setRememberedXrp(getRememberedXrp());
        const powerswitchImage = CommandToXRPMgr.getInstance().isNanoXRP()
            ? undefined
            : CommandToXRPMgr.getInstance().getXRPDrive() === Constants.XRP_PROCESSOR_BETA
              ? powerswitch_beta
              : powerswitch_standard;
        setDialogContent(
            <SwitchToBluetoothDlg
                xrpId={xrpId}
                powerswitchImage={powerswitchImage}
                needsPicker={!AppMgr.getInstance().hasPermittedBleDevice(xrpId)}
                isUsbConnected={isUsbConnected}
                cancelCallback={toggleDialog}
                okayCallback={() => {
                    toggleDialog();
                    AppMgr.getInstance().emit(
                        EventType.EVENT_CONNECTION,
                        ConnectionCMD.SWITCH_TO_BLUETOOTH,
                    );
                }}
            />,
        );
        toggleDialog();
    }

    /**
     * boadcastRunningState - broadcast the running state to the app manager
     * @param running
     */
    function broadcastRunningState(running: boolean) {
        AppMgr.getInstance().emit(EventType.EVENT_ISRUNNING, running ? 'running' : 'stopped');
    }

    /**
     * onRunBtnClicked
     */
    async function onRunBtnClicked() {
        console.log('onRunBtnClicked');

        const resetRunButtonStates = () => {
            AppMgr.getInstance().on(EventType.EVENT_PROGRAM_EXECUTED, () => {
                if (stoppingRef.current) {
                    // BLE stop reboots and reconnects; keep the spinner until reconnect
                    // finishes (EVENT_HIDE_BLUETOOTH_CONNECTING).
                    if (AppMgr.getInstance().getConnectionType() !== ConnectionType.BLUETOOTH) {
                        closeDialog();
                        setIsStopping(false);
                        setRunning(false);
                        broadcastRunningState(false);
                    }
                } else {
                    setRunning(false);
                    broadcastRunningState(false);
                }
                AppMgr.getInstance().eventOff(EventType.EVENT_PROGRAM_EXECUTED);
            });
        };

        if (!isRunning) {
            if (!isConnected) {
                setDialogContent(
                    <AlertDialog
                        alertMessage={t('XRP-not-connected')}
                        toggleDialog={toggleDialog}
                    />,
                );
                toggleDialog();
                return;
            }

            // Only run from a Python or Blockly tab — not Dashboard or AI Buddy
            const tabId = (activeTab ?? '').replace(/^"|"$/g, '');
            const canRun = !isOtherTab && EditorMgr.getInstance().isRunnableCodeTab(tabId);
            if (!canRun) {
                setDialogContent(
                    <AlertDialog alertMessage={t('no-editor-run')} toggleDialog={toggleDialog} />,
                );
                toggleDialog();
                return;
            }

            setRunning(true);
            broadcastRunningState(true);

            // Check battery voltage && version
            await CommandToXRPMgr.getInstance()
                .batteryVoltage()
                .then((voltage) => {
                    const connectionType = AppMgr.getInstance().getConnectionType();
                    const beginExecution = async () => {
                        try {
                            await flushAutosave();
                            // Save all unsaved editors before running
                            await EditorMgr.getInstance().saveAllUnsavedEditors(activeTab);

                            // Update the main.js
                            const session: EditorSession | undefined =
                                EditorMgr.getInstance().getEditorSession(activeTab);
                            if (session) {
                                if (isLogin && session.gpath) {
                                    // saving the Google drive parent directory to XRP first
                                    await EditorMgr.getInstance().saveAllFilesInGoogleDriveToXRP(
                                        session.name,
                                    );

                                    // if Google Drive, need to save the select tab to XRP first
                                    // get the file from Google Drive and save it to XRP
                                    AppMgr.getInstance()
                                        .driveService.getFileContents(session.gpath || '')
                                        .then(async (fileContent) => {
                                            await CommandToXRPMgr.getInstance()
                                                .uploadFile(
                                                    session?.path || '',
                                                    fileContent || '',
                                                    true,
                                                )
                                                .then(async () => {
                                                    await CommandToXRPMgr.getInstance()
                                                        .updateMainFile(session.path)
                                                        .then(async (lines) => {
                                                            resetRunButtonStates();
                                                            await CommandToXRPMgr.getInstance().executeLines(
                                                                lines,
                                                            );
                                                        });
                                                });
                                        });
                                } else {
                                    await CommandToXRPMgr.getInstance()
                                        .updateMainFile(session.path)
                                        .then(async (lines) => {
                                            resetRunButtonStates();
                                            await CommandToXRPMgr.getInstance().executeLines(lines);
                                        });
                                }
                            }
                        } catch (err) {
                            console.log(err);
                        }
                    };

                    const handlePowerSwitchOK = async () => {
                        setRunning(true);
                        toggleDialog();
                        beginExecution();
                    };

                    const handlePowerSwitchCancel = () => {
                        setRunning(false);
                        toggleDialog();
                    };

                    if (connectionType === ConnectionType.USB) {
                        if (voltage < 0.45 && !CommandToXRPMgr.getInstance().isNanoXRP()) {
                            // display a confirmation message to ask the user to turn on the power switch
                            const powerswitchImage =
                                CommandToXRPMgr.getInstance().getXRPDrive() ===
                                Constants.XRP_PROCESSOR_BETA
                                    ? powerswitch_beta
                                    : powerswitch_standard;
                            setDialogContent(
                                <PowerSwitchAlert
                                    powerswitchImage={powerswitchImage}
                                    cancelCallback={handlePowerSwitchCancel}
                                    okayCallback={handlePowerSwitchOK}
                                />,
                            );
                            toggleDialog();
                        } else {
                            beginExecution();
                        }
                    } else if (connectionType === ConnectionType.BLUETOOTH) {
                        if (voltage < 0.45 && !CommandToXRPMgr.getInstance().isNanoXRP()) {
                            // display a confirmation message to ask the user to turn on the power switch
                            //this one will only happen if they are using a power device plugged into the USB port and the power switch is off.
                            setDialogContent(
                                <PowerSwitchAlert
                                    cancelCallback={handlePowerSwitchCancel}
                                    okayCallback={handlePowerSwitchOK}
                                />,
                            );
                            toggleDialog();
                        } else if (
                            voltage < (CommandToXRPMgr.getInstance().isNanoXRP() ? 3.6 : 5.0)
                        ) {
                            const handleBatteryBadOK = async () => {
                                setRunning(true);
                                broadcastRunningState(true);
                                closeDialog();
                                beginExecution();
                            };
                            const handleBatteryBadCancel = () => {
                                setRunning(false);
                                broadcastRunningState(false);
                                closeDialog();
                            };
                            setDialogContent(
                                <BatteryBadDlg
                                    cancelCallback={handleBatteryBadCancel}
                                    okayCallback={handleBatteryBadOK}
                                />,
                            );
                            toggleDialog();
                        } else {
                            beginExecution();
                        }
                    }
                });
        } else {
            setIsStopping(true);
            // Own the shared dialog slot so EVENT_HIDE_SPINNER_CONNECTING
            // (after BLE reconnect) will close it. Without this flag, SHOW is
            // ignored (dialog already open) and HIDE becomes a no-op — spinner stuck.
            connectingSpinnerShownRef.current = true;
            openDialog(<BusyDialog title={t('stopRunningProgram')} />);
            CommandToXRPMgr.getInstance().stopProgram();
        }
    }

    /**
     * openFirmwareLoaderDialog - swap the current dialog out for the firmware loader
     */
    function openFirmwareLoaderDialog() {
        toggleDialog();
        setDialogContent(<FirmwareLoaderDlg toggleDialog={toggleDialog} />);
        toggleDialog();
    }

    /**
     * Open the firmware loader already targeting this connected board's
     * MicroPython project. Used by the "Update available" shortcut.
     */
    function openConnectedUpdateLoader() {
        const skipUf2 = availableUpdate?.kind === 'lib';
        toggleDialog();
        setDialogContent(
            <FirmwareLoaderDlg
                toggleDialog={toggleDialog}
                autoInstallBoardId={CommandToXRPMgr.getInstance().getBoardId()}
                skipUf2={skipUf2}
                initialWizardStep={skipUf2 ? undefined : 3}
            />,
        );
        toggleDialog();
    }

    /**
     * openBackupDialog - swap the firmware-loader warning prompt out for the
     * Backup/Restore entry screen. This is the start of the backup flow: it
     * verifies an XRP is connected and Google Drive is logged in (disabling the
     * actions and explaining what to do when it is not) before the user can
     * begin the actual backup.
     */
    function openBackupDialog() {
        toggleDialog();
        setDialogContent(
            <BackupRestoreDlg
                toggleDialog={toggleDialog}
                onBackup={onBackup}
                onRestore={onRestore}
            />,
        );
        toggleDialog();
    }

    /**
     * onFirmwareLoaderClicked - warn about possible file loss before opening the
     * full-screen firmware loader. Offers a backup-now path so users don't
     * accidentally wipe their XRP files during an update or project change.
     */
    function onFirmwareLoaderClicked() {
        setMoreMenuOpen(false);
        setDialogContent(
            <FirmwareBackupPromptDlg
                onBackupNow={openBackupDialog}
                onContinue={openFirmwareLoaderDialog}
                onCancel={toggleDialog}
            />,
        );
        toggleDialog();
    }

    /**
     * onAiClicked - handle the AI button click event
     */
    function onAiClicked() {
        setMoreMenuOpen(false);
        openAIChat();
    }

    /**
     * onDashboardClicked - handle the Dashboard button click event
     */
    function onDashboardClicked() {
        setMoreMenuOpen(false);
        viewDashboard();
    }

    /**
     * onDriverClicked - handle the Driver button click event
     */
    function onDriverClicked() {
        setMoreMenuOpen(false);
        const loginBlocksDrivers = isLogin && !isLocalProjectsEnabled;
        if (!isConnected || loginBlocksDrivers) {
            const message = loginBlocksDrivers ? t('driver-install-login') : t('XRP-not-connected');
            setDialogContent(<AlertDialog alertMessage={message} toggleDialog={toggleDialog} />);
            toggleDialog();
            return;
        }
        setDialogContent(<XRPDriverInstallDlg toggleDialog={toggleDialog} />);
        toggleDialog();
    }

    /**
     * ChangeLog
     */
    function ChangeLog() {
        setDialogContent(<ChangeLogDlg closeDialog={toggleDialog} />);
        toggleDialog();
    }

    /**
     * onUpdateAvailableClicked - start the firmware or library update for the
     * connected board. Requires USB. Offers a backup first, then either flashes
     * MicroPython (boot-drive picker) or copies the library if MicroPython is
     * already current.
     */
    function onUpdateAvailableClicked() {
        if (!isConnected || AppMgr.getInstance().getConnectionType() !== ConnectionType.USB) {
            setDialogContent(
                <AlertDialog
                    alertMessage={t('updateAvailableNeedUsb')}
                    toggleDialog={toggleDialog}
                />,
            );
            toggleDialog();
            return;
        }

        setDialogContent(
            <FirmwareBackupPromptDlg
                onBackupNow={openBackupDialog}
                onContinue={openConnectedUpdateLoader}
                onCancel={toggleDialog}
            />,
        );
        toggleDialog();
    }

    /**
     * toggleMoreDropdown - toggle the more dropdown menu
     */
    function toggleMoreDropdown() {
        setMoreMenuOpen(!isMoreMenuOpen);
    }

    /**
     * clearDialogContent - toggle the dialog open/close state
     */
    function clearDialogContent() {
        setDialogContent(<div />);
    }

    function openDialog(content: React.ReactNode) {
        setDialogContent(content);
        if (dialogRef.current && !dialogRef.current.open) {
            dialogRef.current.showModal();
        }
    }

    /** Close the dialog if open; never opens it (avoids ghost backdrop after BLE reconnect). */
    function closeDialog() {
        if (dialogRef.current?.open) {
            setDialogContent(null);
            dialogRef.current.close();
        }
    }

    /**
     * toggleDialog - toggle the dialog open and closed
     */
    function toggleDialog() {
        if (!dialogRef.current) {
            return;
        }
        if (dialogRef.current.open) {
            closeDialog();
        } else {
            dialogRef.current.showModal();
        }
    }

    /**
     * onBackup - handle the Backup button click event
     */
    function onBackup() {
        toggleDialog();
        // display the restore dialog to show the backup files process
        setDialogContent(<BackupDlg toggleDialog={toggleDialog} />);
        toggleDialog();
    }

    /**
     * onRestore - handle the Restore button click event
     */
    function onRestore() {
        toggleDialog();
        setDialogContent(<RestoreDlg toggleDialog={toggleDialog} />);
        toggleDialog();
    }

    /**
     * onBackupRestoreClicked - handle the Backup/Restore button click event
     */
    function onBackupRestoreClicked() {
        setMoreMenuOpen(false);
        setDialogContent(
            <BackupRestoreDlg
                toggleDialog={toggleDialog}
                onBackup={onBackup}
                onRestore={onRestore}
            />,
        );
        toggleDialog();
    }

    const navItems: MenuDataItem[] = [
        {
            label: t('file'),
            children: [
                {
                    label: t('newFile'),
                    iconImage: fileadd,
                    clicked: NewFile,
                    isFile: true,
                },
                {
                    label: t('uploadFiles'),
                    iconImage: fileupload,
                    clicked: UploadFile,
                    isFile: true,
                },
                {
                    label: t('exportToPC'),
                    iconImage: fileexport,
                    clicked: ExportToPC,
                    isFile: true,
                },
                {
                    label: t('saveFile'),
                    iconImage: filesave,
                    clicked: SaveFile,
                    isFile: true,
                },
                {
                    label: t('saveFileAs'),
                    iconImage: filesaveas,
                    clicked: SaveFileAs,
                    isFile: true,
                },
                {
                    label: t('copyfiles.menuTitle'),
                    iconImage: copyfiles,
                    clicked: CopyFilesToGoogleDrive,
                    isFile: true,
                    showif: isConnected && isLogin,
                },
            ],
        },
        {
            label: t('view'),
            children: [
                {
                    label: t('viewPythonFile'),
                    iconImage: python,
                    clicked: ViewPythonFile,
                    isView: true,
                },
                {
                    label: t('convertToPython'),
                    iconImage: convert,
                    clicked: ConvertToPython,
                    isView: true,
                },
            ],
            childrenExt: [
                {
                    label: t('increaseFont'),
                    iconImage: fontplus,
                    clicked: FontPlusPlus,
                    isView: true,
                },
                {
                    label: t('decreaseFont'),
                    iconImage: fontminus,
                    clicked: FontMinus,
                    isView: true,
                },
            ],
        },
    ];

    const navIcons = [<TbFile key="file" size={18} />, <TbEye key="view" size={18} />];

    /**
     * onSignInSuccess - sign-in from the top bar; shows the Google Drive notice the first time.
     */
    const onSignInSuccess = async (profile: UserProfile) => {
        if (await handleSignedIn(profile)) {
            setDialogContent(
                <AlertDialog toggleDialog={toggleDialog} alertMessage={t('googleDriveNotification')} />,
            );
            toggleDialog();
        }
    };

    /**
     * onChooseLanguage - open the language picker from the settings menu.
     */
    const onChooseLanguage = () => {
        setMoreMenuOpen(false);
        setDialogContent(<LanguageDialog toggleDialog={toggleDialog} />);
        toggleDialog();
    };

    /**
     * onChooseTheme - open the theme picker from the settings menu.
     */
    const onChooseTheme = () => {
        setMoreMenuOpen(false);
        setDialogContent(<ThemeDialog toggleDialog={toggleDialog} />);
        toggleDialog();
    };

    /**
     * onSignOut - sign-out from the top bar.
     */
    const onSignOut = () => {
        void handleSignedOut();
    };

    const helpItems: MenuDataItem[] = [
                {
                    label: t('userGuide'),
                    iconImage: userguide,
                    link: 'https://xrpusersguide.readthedocs.io/en/latest/course/introduction.html',
                },
                {
                    label: t('apiReference'),
                    iconImage: apilink,
                    link: 'https://open-stem.github.io/XRP_MicroPython/',
                },
                {
                    label: t('curriculum'),
                    iconImage: curriculum,
                    link: 'https://introtoroboticsv2.readthedocs.io/en/latest/',
                },
                {
                    label: t('userHelpForum'),
                    iconImage: forum,
                    link: 'https://xrp.discourse.group/',
                },
                {
                    label: t('bugs-submission'),
                    iconImage: bugs,
                    link: 'https://xrp.discourse.group/c/support/9',
                },
                {
                    label: t('changeLog'),
                    iconImage: changelog,
                    clicked: ChangeLog,
                },
                {
                    label: t('privacyPolicy'),
                    iconImage: privacy,
                    link: 'https://www.experiential.bot/privacy',
                },
    ];

    const moreMenu: MenuDataItem[] = [
        ...(isAiBuddyMenuEnabled()
            ? [
                  {
                      label: t('ai-chat'),
                      iconImage: chatbot,
                      clicked: onAiClicked,
                  },
              ]
            : []),
        {
            label: t('dashboard'),
            iconImage: dashboard,
            clicked: onDashboardClicked,
        },
        {
            label: t('drivers'),
            iconImage: drivers,
            clicked: onDriverClicked,
        },
        {
            label: t('backup-restore.title'),
            iconImage: backup_restore,
            clicked: onBackupRestoreClicked,
        },
        {
            label: t('firmwareLoader'),
            iconImage: firmwareLoaderIcon,
            clicked: onFirmwareLoaderClicked,
        },
    ];

    return (
        <div className="flex items-center justify-between p-1 px-2 text-shark-100 shadow-md md:px-5">
            <div className="flex flex-row gap-4 transition-all">
                {/** Logo */}
                <img src={logo} alt="logo" width="100" height="50" />
                {navItems.map((item, index) => (
                    <div key={index} className="group relative hidden transition-all md:block">
                        <p className="ml-2 mt-4 flex cursor-pointer items-center gap-1 text-matisse-100 group-hover:bg-curious-blue-700 dark:group-hover:bg-mountain-mist-950">
                            {navIcons[index]}
                            <span>{item.label}</span>
                            {item.children && (
                                <TiArrowSortedDown className="mt-1 rotate-180 transition-all group-hover:rotate-0" />
                            )}
                        </p>
                        {item.children && (
                            <div className="absolute left-2 top-[52] z-[100] mx-auto hidden flex-col bg-curious-blue-700 py-3 shadow-md transition-all group-hover:flex dark:bg-mountain-mist-950 dark:group-hover:bg-mountain-mist-950">
                                <ul id="pythonId" className="flex cursor-pointer flex-col">
                                    {item.children
                                        .filter((child) => child.showif ?? true)
                                        .map((child, ci) => (
                                            <li
                                                key={ci}
                                                className={`text-neutral-200 py-1 pl-4 pr-10 hover:bg-matisse-400 dark:hover:bg-shark-500 ${child.isFile && !isConnected && !isLogin ? 'pointer-events-none' : 'pointer-events-auto'} ${child.isView && !isBlockly ? 'hidden' : 'visible'}`}
                                                onClick={child.clicked}
                                            >
                                                <MenuItem
                                                    isConnected={
                                                        (isConnected || isLogin) && !isRunning
                                                    }
                                                    isOther={isOtherTab}
                                                    item={child}
                                                />
                                            </li>
                                        ))}
                                </ul>
                                {item.childrenExt && (
                                    <ul
                                        id="blockId"
                                        className={`${isBlockly ? 'hidden' : 'visible'} cursor-pointer flex-col`}
                                    >
                                        {item.childrenExt?.map((child, ci) => (
                                            <li
                                                key={ci}
                                                className="text-neutral-200 py-1 pl-4 pr-10 hover:bg-matisse-400 dark:hover:bg-shark-500"
                                                onClick={child.clicked}
                                            >
                                                <MenuItem
                                                    isConnected={isConnected && !isRunning}
                                                    isOther={isOtherTab}
                                                    item={child}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {/* place the joystick icon here after the menu*/}
                <img
                    className={`mt-1 ${isGamepadConnected ? 'visible' : 'hidden'}`}
                    src={gamepad}
                    alt="game pad"
                    width={40}
                    height={30}
                />
            </div>
            {/** platform infor and connect button*/}
            <div className="flex flex-row items-center gap-2 md:gap-4">
                <div className="flex flex-row items-center gap-2 text-sm text-shark-300">
                    <ConnectionStatus
                        isConnected={isConnected}
                        connectionType={connectionType ?? undefined}
                        xrpId={xprID?.XRPID}
                    />
                    {isConnected && connectionType === ConnectionType.USB && xprID?.XRPID && (
                        <button
                            type="button"
                            id="switchToBluetoothBtn"
                            onClick={onSwitchToBluetooth}
                            className="flex items-center gap-1 rounded-full bg-shark-200 px-2.5 py-1 text-xs font-medium text-matisse-900 hover:bg-curious-blue-300 dark:bg-shark-600 dark:text-shark-100 dark:hover:bg-shark-500"
                            title={t('switchToBluetooth')}
                            aria-label={t('switchToBluetooth')}
                        >
                            <IoBluetooth size={14} />
                            <span>{t('switchToBluetooth')}</span>
                        </button>
                    )}
                </div>
                {availableUpdate && (
                    <button
                        type="button"
                        id="updateAvailableBtn"
                        onClick={onUpdateAvailableClicked}
                        title={
                            availableUpdate.kind === 'mp'
                                ? t('updateAvailableMpTooltip', {
                                      current: availableUpdate.versions.currentVersion,
                                      next: availableUpdate.versions.newVersion,
                                  })
                                : availableUpdate.kind === 'lib'
                                  ? t('updateAvailableLibTooltip', {
                                        current: availableUpdate.versions.currentVersion,
                                        next: availableUpdate.versions.newVersion,
                                    })
                                  : t('updateAvailableMustMpTooltip')
                        }
                        aria-label={t('updateAvailable')}
                        className="flex items-center gap-1 rounded-full bg-curious-blue-100 px-2.5 py-1 text-xs font-medium text-curious-blue-900 ring-1 ring-curious-blue-300 hover:bg-curious-blue-200 dark:bg-curious-blue-900/40 dark:text-curious-blue-100 dark:ring-curious-blue-700 dark:hover:bg-curious-blue-900/70"
                    >
                        <IoArrowUpCircle size={14} />
                        <span>{t('updateAvailable')}</span>
                    </button>
                )}
                <div className={`flex h-full items-stretch ${isConnected ? 'hidden' : ''}`}>
                    <button
                        id="connectBtn"
                        title={
                            rememberedXrp?.xrpId
                                ? t('connectXRPNamed', { id: rememberedXrp.xrpId })
                                : t('connectXRP')
                        }
                        aria-label={
                            rememberedXrp?.xrpId
                                ? t('connectXRPNamed', { id: rememberedXrp.xrpId })
                                : t('connectXRP')
                        }
                        className="text-neutral-900 flex h-full min-w-0 items-center justify-center gap-2 rounded-l-3xl px-3 md:px-4 md:min-w-[200px] bg-shark-200 py-2 text-matisse-900 hover:bg-curious-blue-300 dark:bg-shark-600 dark:text-shark-100 dark:hover:bg-shark-500"
                        onClick={onConnectBtnClicked}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20">
                            <polygon points="11 4 12 4 12 8 16 8 16 9 11 9"></polygon>
                            <polygon points="4 11 9 11 9 16 8 16 8 12 4 12"></polygon>
                            <path
                                fill="none"
                                stroke="#000"
                                strokeWidth="1.1"
                                d="M12,8 L18,2"
                            ></path>
                            <path
                                fill="none"
                                stroke="#000"
                                strokeWidth="1.1"
                                d="M2,18 L8,12"
                            ></path>
                        </svg>
                        <span className="hidden whitespace-nowrap md:inline">
                            {rememberedXrp?.xrpId
                                ? t('connectXRPNamed', { id: rememberedXrp.xrpId })
                                : t('connectXRP')}
                        </span>
                    </button>
                    <button
                        id="chooseDifferentXrpBtn"
                        type="button"
                        className="flex items-center rounded-r-3xl border-l border-shark-300 bg-shark-200 px-2 text-matisse-900 hover:bg-curious-blue-300 dark:border-shark-500 dark:bg-shark-600 dark:text-shark-100 dark:hover:bg-shark-500"
                        onClick={onChooseDifferentXrp}
                        title={t('chooseDifferentXRP')}
                        aria-label={t('chooseDifferentXRP')}
                    >
                        <IoChevronDown size={16} />
                    </button>
                </div>
                <button
                    id="runBtn"
                    className={`text-white h-11 min-w-0 items-center md:min-w-[130px] justify-center gap-2 rounded-3xl px-4 py-2 font-semibold ${isRunning ? 'bg-cinnabar-600' : 'bg-chateau-green-500'} ${isConnected ? 'flex' : 'hidden'}`}
                    onClick={onRunBtnClicked}
                    disabled={isStopping}
                >
                    {isRunning ? (
                        <>
                            <span>{t('stop')}</span>
                            <IoStop />
                        </>
                    ) : (
                        <>
                            <span>{t('run')}</span>
                            <IoPlaySharp />
                        </>
                    )}
                </button>
                <div className="hidden md:block">
                <NavDropdown id="helpBtn" label={t('help')} icon={<TbHelpCircle size={26} />}>
                    {(close) => (
                        <ul className="flex cursor-pointer flex-col">
                            {helpItems.map((item, ci) => (
                                <li
                                    key={ci}
                                    role="menuitem"
                                    className="text-neutral-200 py-1 pl-4 pr-10 hover:bg-matisse-400 dark:hover:bg-shark-500"
                                    onClick={() => {
                                        close();
                                        item.clicked?.();
                                    }}
                                >
                                    <MenuItem isConnected={true} isOther={false} item={item} />
                                </li>
                            ))}
                        </ul>
                    )}
                </NavDropdown>
                </div>
                <div ref={dropdownRef} className="group relative hidden transition-all md:block">
                    <button
                        id="settingsId"
                        onClick={toggleMoreDropdown}
                        title={t('settings')}
                        aria-label={t('settings')}
                        aria-expanded={isMoreMenuOpen}
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-matisse-100 hover:bg-matisse-400 dark:hover:bg-shark-500 ${isMoreMenuOpen ? 'bg-matisse-500 dark:bg-shark-600' : ''}`}
                    >
                        <TbSettings size={26} />
                    </button>
                    {isMoreMenuOpen && (
                        <div className="absolute right-0 top-12 z-[100] mx-auto flex w-max min-w-56 flex-col bg-curious-blue-700 py-3 shadow-md transition-all dark:bg-mountain-mist-950 dark:group-hover:bg-mountain-mist-950">
                            <QuickSettings
                                onChooseLanguage={onChooseLanguage}
                                onChooseTheme={onChooseTheme}
                            />
                            <hr className="mb-2 border-matisse-400 dark:border-shark-600" />
                            <ul id="pythonId" className="flex cursor-pointer flex-col">
                                {moreMenu.map((item, ci) => (
                                    <li
                                        key={ci}
                                        className={`text-neutral-200 py-1 pl-4 pr-10 hover:bg-matisse-400 dark:hover:bg-shark-500`}
                                        onClick={item.clicked}
                                    >
                                        <MenuItem
                                            isConnected={isConnected && !isRunning}
                                            isOther={false}
                                            item={item}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <MobileMenu
                    footer={<Login compact onSuccess={onSignInSuccess} logoutCallback={onSignOut} />}
                >
                    {(close) => (
                        <>
                            {navItems.map((item, index) => {
                                const entries = [
                                    ...(item.children ?? []),
                                    ...(isBlockly ? [] : (item.childrenExt ?? [])),
                                ]
                                    .filter((child) => child.showif ?? true)
                                    .filter((child) => !child.isView || isBlockly);
                                if (entries.length === 0) {
                                    return null;
                                }
                                return (
                                    <section key={index} className="pb-1">
                                        <p className="text-neutral-200 flex items-center gap-1 px-4 pb-1 pt-2 text-xs font-semibold uppercase opacity-70">
                                            {navIcons[index]}
                                            {item.label}
                                        </p>
                                        <ul className="flex cursor-pointer flex-col">
                                            {entries.map((child, ci) => (
                                                <li
                                                    key={ci}
                                                    className={`text-neutral-200 py-3 pl-4 pr-4 text-base hover:bg-matisse-400 dark:hover:bg-shark-500 ${child.isFile && !isConnected && !isLogin ? 'pointer-events-none' : 'pointer-events-auto'}`}
                                                    onClick={() => {
                                                        close();
                                                        child.clicked?.();
                                                    }}
                                                >
                                                    <MenuItem
                                                        isConnected={
                                                            (isConnected || isLogin) && !isRunning
                                                        }
                                                        isOther={isOtherTab}
                                                        item={child}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                );
                            })}
                            <hr className="my-1 border-matisse-400 dark:border-shark-600" />
                            <p className="text-neutral-200 flex items-center gap-1 px-4 pb-1 pt-2 text-xs font-semibold uppercase opacity-70">
                                <TbHelpCircle size={18} />
                                {t('help')}
                            </p>
                            <ul className="flex cursor-pointer flex-col">
                                {helpItems.map((item, ci) => (
                                    <li
                                        key={ci}
                                        role="menuitem"
                                        className="text-neutral-200 py-3 pl-4 pr-4 text-base hover:bg-matisse-400 dark:hover:bg-shark-500"
                                        onClick={() => {
                                            close();
                                            item.clicked?.();
                                        }}
                                    >
                                        <MenuItem isConnected={true} isOther={false} item={item} />
                                    </li>
                                ))}
                            </ul>
                            <hr className="my-1 border-matisse-400 dark:border-shark-600" />
                            <p className="text-neutral-200 flex items-center gap-1 px-4 pb-1 pt-2 text-xs font-semibold uppercase opacity-70">
                                <TbSettings size={18} />
                                {t('settings')}
                            </p>
                            <QuickSettings
                                onChooseLanguage={() => {
                                    close();
                                    onChooseLanguage();
                                }}
                                onChooseTheme={() => {
                                    close();
                                    onChooseTheme();
                                }}
                            />
                            <ul className="flex cursor-pointer flex-col">
                                {moreMenu.map((item, ci) => (
                                    <li
                                        key={ci}
                                        className="text-neutral-200 py-3 pl-4 pr-4 text-base hover:bg-matisse-400 dark:hover:bg-shark-500"
                                        onClick={() => {
                                            close();
                                            item.clicked?.();
                                        }}
                                    >
                                        <MenuItem
                                            isConnected={isConnected && !isRunning}
                                            isOther={false}
                                            item={item}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </MobileMenu>
            </div>
            <Dialog isOpen={isDlgOpen} toggleDialog={toggleDialog} ref={dialogRef}>
                {dialogContent}
            </Dialog>
        </div>
    );
}

export default NavBar;
