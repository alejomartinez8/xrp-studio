import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveFirmwareLoaderPublicPath } from '@/utils/firmware-loader';
import { useTranslation } from 'react-i18next';
import { IoWarning } from 'react-icons/io5';
import AppMgr, { EventType } from '@/managers/appmgr';
import { CommandToXRPMgr } from '@/managers/commandstoxrpmgr';
import { USBConnection } from '@/connections/usbconnection';
import { ConnectionCMD } from '@/utils/types';
import ProgressBar from 'react-customizable-progressbar';
import Button from '@/widgets/button';

export type OsFamily = 'win' | 'mac' | 'linux';

export type WizardAssets = {
    powerOff: Record<string, string>;
    bootSel: Record<string, string>;
    selectDir: Record<string, string>;
};

function detectOsFamily(): OsFamily {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'win';
    if (ua.includes('mac')) return 'mac';
    return 'linux';
}

function boardIdToProcessor(boardId: string): 2040 | 2350 {
    return boardId === 'xrp-2350' ? 2350 : 2040;
}

/** The NanoXRP is RP2040-based but runs its own firmware build. */
function boardIdIsNanoXRP(boardId: string): boolean {
    return boardId === 'xrp-nano';
}

function pickImage(map: Record<string, string>, key: string, fallback: string): string {
    return map[key] ?? fallback;
}

/**
 * Wait for the XRP to reappear on USB after a UF2 flash + reboot, and for any
 * post-connect initialization to settle before the caller starts new commands.
 *
 * Approach:
 * 1. Wait a generous boot window so the board can finish rebooting. The
 *    browser's `navigator.serial` 'connect' event listener in USBConnection
 *    will auto-call `tryAutoConnect()` when the XRP re-enumerates — which
 *    silently connects only if exactly one authorized matching port exists.
 * 2. After the boot window, periodically call `tryAutoConnectIfSingle()`
 *    ourselves. This still won't fall through to `requestPort()` (which
 *    requires a user gesture we no longer have); it just retries the silent
 *    path in case the 'connect' event handler missed a beat.
 * 3. Returns false if we never reconnected — in that case the caller should
 *    show a "Connect to XRP" button so the user can supply a fresh gesture
 *    and trigger `connect()` (which will either auto-pick the single port or
 *    open the navigator.serial.requestPort() picker for first-time / multi-
 *    board cases).
 * 4. Once connected, also wait for `CommandToXRPMgr.BUSY` to clear. The
 *    auto-connect path runs `connectCallback` (getToREPL, getOnBoardFSTree,
 *    getToNormal, …) in the background, and uploadFile is a silent no-op
 *    while BUSY, so we must let that settle before copying project files.
 */
async function waitForUsbReady(timeoutMs: number, bootDelayMs: number = 6000): Promise<boolean> {
    const app = AppMgr.getInstance();
    const cmd = CommandToXRPMgr.getInstance();
    const start = Date.now();
    const deadline = start + timeoutMs;
    const isConnected = (): boolean => {
        try {
            return app.getConnection()?.isConnected() ?? false;
        } catch {
            return false;
        }
    };
    const trySilentReconnect = async (): Promise<void> => {
        const conn = app.getConnection();
        if (conn instanceof USBConnection) {
            try {
                await conn.tryAutoConnectIfSingle();
            } catch (e) {
                console.log('tryAutoConnectIfSingle failed:', e);
            }
        }
    };
    const settleAfterConnect = async (): Promise<boolean> => {
        const settleDeadline = Math.min(Date.now() + 20000, deadline);
        while (Date.now() < settleDeadline) {
            if (!isConnected()) return false;
            if (!cmd.BUSY) return true;
            await new Promise((r) => setTimeout(r, 250));
        }
        return isConnected();
    };

    if (isConnected()) {
        return await settleAfterConnect();
    }

    const bootWindowEnd = Math.min(start + bootDelayMs, deadline);
    while (Date.now() < bootWindowEnd) {
        if (isConnected()) return await settleAfterConnect();
        await new Promise((r) => setTimeout(r, 400));
    }

    let nextRetryAt = Date.now();
    while (Date.now() < deadline) {
        if (isConnected()) return await settleAfterConnect();
        if (Date.now() >= nextRetryAt) {
            void trySilentReconnect();
            nextRetryAt = Date.now() + 3000;
        }
        await new Promise((r) => setTimeout(r, 400));
    }
    return isConnected() ? await settleAfterConnect() : false;
}

type FirmwareInstallWizardProps = {
    boardId: string;
    /** Fully-resolved, site-relative URL of the UF2 to flash. */
    uf2Url: string;
    /** [deviceDestinationPath, fullyResolvedSourceUrl] entries to copy after flashing. */
    libraryEntries: [string, string][];
    /** XRPLib version label written to /lib/XRPLib/version.py (undefined when no library copy). */
    xrplibVersion?: string;
    assets: WizardAssets;
    onCancel: () => void;
    onComplete: () => void;
    /** Instruction step to open on (default 1). Use 3 to skip power-off / BOOTSEL hold. */
    initialStep?: 1 | 2 | 3;
    /** Skip the UF2 flash and copy library/project files only (MicroPython already current). */
    skipUf2?: boolean;
    /** Call machine.bootloader() when showing step 3 so the boot drive appears. */
    enterBootselOnStart?: boolean;
};

type WizardUiPhase =
    | { kind: 'instruction'; step: 1 | 2 | 3 }
    | { kind: 'uf2' }
    | { kind: 'libs'; waitingUsb: boolean; needsManualConnect: boolean }
    | { kind: 'success' };

/**
 * Multi-step install flow: instructional steps 1–3, UF2 copy (auto-starts after step 3),
 * optional USB reconnect + library copy, success.
 */
export default function FirmwareInstallWizard({
    boardId,
    uf2Url,
    libraryEntries,
    xrplibVersion,
    assets,
    onCancel,
    onComplete,
    initialStep = 1,
    skipUf2 = false,
    enterBootselOnStart = false,
}: FirmwareInstallWizardProps) {
    const { t } = useTranslation();
    const os = useMemo(() => detectOsFamily(), []);

    const boardCtx = boardIdIsNanoXRP(boardId) ? { context: 'nano' } : undefined;

    const cmd = CommandToXRPMgr.getInstance();

    useEffect(() => {
        cmd.setProcessorTypeForFirmwareLoader(
            boardIdToProcessor(boardId),
            boardIdIsNanoXRP(boardId),
        );
    }, [boardId, cmd]);

    const [phase, setPhase] = useState<WizardUiPhase>(() =>
        skipUf2
            ? { kind: 'libs', waitingUsb: true, needsManualConnect: false }
            : { kind: 'instruction', step: initialStep },
    );
    const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [uf2Pct, setUf2Pct] = useState(0);
    const [libPct, setLibPct] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const needsLibraryPhase = libraryEntries.length > 0;

    const selectDirKey = `${boardId}-${os}`;
    const fallbackBoardImg = resolveFirmwareLoaderPublicPath(
        pickImage(assets.powerOff, boardId, 'images/board-xrp-beta.jpg') ||
            'images/board-xrp-beta.jpg',
    );

    const imgPowerOff = pickImage(assets.powerOff, boardId, fallbackBoardImg);
    const imgBootSel = pickImage(assets.bootSel, boardId, fallbackBoardImg);
    const imgSelectDir = pickImage(assets.selectDir, selectDirKey, fallbackBoardImg);

    /**
     * Run the library/project file copy phase. Used both as the second half
     * of runFlashAndLibrary and as a standalone retry (e.g. after a manual
     * Connect click). The autoFirst flag controls whether to attempt a
     * silent auto-reconnect first; when the user has just clicked "Connect
     * to XRP" (which already triggered connect()), we skip the auto attempt
     * since the connection is already in flight.
     */
    const runLibraryCopy = useCallback(
        async (opts: { autoFirst: boolean }) => {
            setError(null);
            setPhase({ kind: 'libs', waitingUsb: true, needsManualConnect: false });
            setLibPct(0);

            try {
                // First try a short, silent auto-reconnect window. If that
                // fails, surface the manual Connect button so the user can
                // supply a fresh gesture for navigator.serial.requestPort().
                let connected = false;
                if (opts.autoFirst) {
                    connected = await waitForUsbReady(15000);
                }
                if (!connected) {
                    setPhase({ kind: 'libs', waitingUsb: true, needsManualConnect: true });
                    // Wait (up to ~2 min) for the user to click Connect and
                    // a connection to land. The click handler emits
                    // CONNECT_USB which eventually flips isConnected() true.
                    connected = await waitForUsbReady(120000, 0);
                }
                if (!connected) {
                    throw new Error(t('firmwareWizardConnectTimeout'));
                }

                setPhase({ kind: 'libs', waitingUsb: false, needsManualConnect: false });

                // Library entries are already fully resolved to source URLs by
                // the firmware-loader resolver, so the source resolver here is a
                // pass-through.
                await cmd.updateLibraryFromFirmwareManifest(
                    libraryEntries,
                    xrplibVersion,
                    (url) => url,
                    (pct) => setLibPct(Math.round(pct)),
                );

                await cmd.restartXRP();
                setPhase({ kind: 'success' });
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                setPhase({ kind: 'libs', waitingUsb: false, needsManualConnect: false });
            }
        },
        [cmd, libraryEntries, xrplibVersion, t],
    );

    const runFlashAndLibrary = useCallback(async () => {
        setError(null);
        setPhase({ kind: 'uf2' });
        setUf2Pct(0);
        cmd.setProcessorTypeForFirmwareLoader(
            boardIdToProcessor(boardId),
            boardIdIsNanoXRP(boardId),
        );

        try {
            if (!dirHandle) {
                throw new Error(t('firmwareWizardNoFolder'));
            }

            // Re-confirm readwrite access on the directory while the user
            // gesture from clicking "Start firmware copy" is still fresh.
            // The picker was opened with mode: 'readwrite' so this should
            // be a no-op on modern Chrome, but on older browsers (or if the
            // permission has since been downgraded) we get one more chance
            // to elevate before any awaits consume the gesture.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handle = dirHandle as any;
            if (typeof handle.requestPermission === 'function') {
                const perm = await handle.requestPermission({ mode: 'readwrite' });
                if (perm !== 'granted') {
                    throw new Error(t('firmwareWizardNoFolder'));
                }
            }

            // If the XRP is currently sitting at the MicroPython REPL, ask
            // it to drop into BOOTSEL. We do this *after* the permission
            // recheck above so that the await here can't strip our user
            // gesture before createWritable() runs.
            if (AppMgr.getInstance().getConnection()?.isConnected()) {
                try {
                    await cmd.enterBootSelect();
                } catch (e) {
                    console.log('enterBootSelect:', e);
                }
            }

            setUf2Pct(8);
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '8');

            const fileHandle = await handle.getFileHandle('firmware.uf2', { create: true });
            const writable = await fileHandle.createWritable();

            setUf2Pct(15);
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '15');
            const response = await fetch(uf2Url);
            if (!response.ok) {
                throw new Error(`${uf2Url}: ${response.status}`);
            }
            const data = await response.arrayBuffer();
            setUf2Pct(55);
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '55');
            await writable.write(data);
            setUf2Pct(100);
            AppMgr.getInstance().emit(EventType.EVENT_PROGRESS, '100');

            // Closing the writable is best-effort: as soon as the UF2 is
            // fully written, the RP2350 bootloader latches onto it and
            // disconnects the mass-storage drive, which can cause close()
            // to reject with NotFoundError or "aborted due to security
            // policy". The flash itself has already begun, so swallow the
            // error and proceed to the library copy phase.
            try {
                await writable.close();
            } catch (e) {
                console.log('writable.close (ignored, drive likely already rebooted):', e);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            setPhase({ kind: 'instruction', step: 3 });
            return;
        }

        if (!needsLibraryPhase) {
            setPhase({ kind: 'success' });
            return;
        }

        await runLibraryCopy({ autoFirst: true });
    }, [boardId, cmd, dirHandle, needsLibraryPhase, t, runLibraryCopy, uf2Url]);

    const runLibraryPhaseOnly = useCallback(async () => {
        await runLibraryCopy({ autoFirst: true });
    }, [runLibraryCopy]);

    const bootselStarted = useRef(false);
    useEffect(() => {
        if (skipUf2 || !enterBootselOnStart) {
            return;
        }
        if (phase.kind !== 'instruction' || phase.step !== 3) {
            return;
        }
        if (bootselStarted.current) {
            return;
        }
        bootselStarted.current = true;
        void cmd.enterBootSelect().catch((e) => {
            console.log('enterBootSelect:', e);
        });
    }, [phase, skipUf2, enterBootselOnStart, cmd]);

    const libCopyStarted = useRef(false);
    useEffect(() => {
        if (!skipUf2 || libCopyStarted.current) {
            return;
        }
        libCopyStarted.current = true;
        void runLibraryCopy({ autoFirst: true });
    }, [skipUf2, runLibraryCopy]);

    /**
     * Handler for the "Connect to XRP" button shown when silent auto-
     * reconnect doesn't land. This runs inside a fresh click handler so the
     * user gesture is alive — emit CONNECT_USB, which lets the connection
     * manager call connect() → tryAutoConnect (1-port case) or
     * navigator.serial.requestPort() (0-port first-time / multi-port cases).
     */
    const onConnectToXrpClicked = () => {
        AppMgr.getInstance().emit(EventType.EVENT_CONNECTION, ConnectionCMD.CONNECT_USB);
    };

    /**
     * Finish the wizard. The board was connected during the install via the
     * reconnect path, which may not have published the XRP id shown next to the
     * RUN button — re-publish it now so the IDE reflects the live connection.
     */
    const handleComplete = async () => {
        AppMgr.getInstance().emit(EventType.EVENT_MICROPYTHON_UPDATE_DONE, '');
        AppMgr.getInstance().emit(EventType.EVENT_XRPLIB_UPDATE_DONE, '');
        try {
            await AppMgr.getInstance().republishConnectionId();
            // Re-read on-device versions so the badge returns if something is still stale.
            await CommandToXRPMgr.getInstance().checkIfNeedUpdate();
        } catch (e) {
            console.log('post-update version refresh failed:', e);
        }
        onComplete();
    };

    const onInstructionNext = () => {
        if (phase.kind !== 'instruction') return;
        const s = phase.step;
        if (s < 3) {
            setPhase({ kind: 'instruction', step: (s + 1) as 2 | 3 });
            return;
        }
        void runFlashAndLibrary();
    };

    const pickFolder = async () => {
        setError(null);
        // A new selection replaces the old one. Keep firmware copy disabled
        // unless this picker result is the expected BOOTSEL drive.
        setDirHandle(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;
            if (typeof w.showDirectoryPicker !== 'function') {
                throw new Error(t('firmwareWizardNoFolderPicker'));
            }
            // Ask for readwrite up-front while we still have a fresh user
            // gesture (the click on "Choose folder"). If we leave it as the
            // default 'read', Chrome will need a second permission prompt
            // when createWritable() is called later, and after the awaits in
            // runFlashAndLibrary the user gesture has been consumed —
            // resulting in a SecurityError "aborted due to security policy".
            const h = await w.showDirectoryPicker({ mode: 'readwrite' });

            setDirHandle(h);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
        }
    };

    const headerSubtitle =
        phase.kind === 'instruction'
            ? t('firmwareWizardStepCounter', { step: phase.step })
            : phase.kind === 'uf2'
              ? t('firmwareWizardPhaseUf2')
              : phase.kind === 'libs'
                ? phase.waitingUsb
                    ? t('firmwareWizardPhaseWaitUsb')
                    : t('firmwareWizardPhaseLibs')
                : '';

    const exitDisabled =
        phase.kind === 'uf2' || (phase.kind === 'libs' && !phase.waitingUsb && !error);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-mountain-mist-600 dark:text-shark-400">
                    {headerSubtitle}
                </p>
                <Button onClicked={onCancel} disabled={exitDisabled}>
                    {t('firmwareWizardExitWizard')}
                </Button>
            </div>

            {error && (
                <div
                    role="alert"
                    className="text-white mb-4 flex items-start gap-3 rounded-lg border-l-8 border-red-700 bg-red-600 p-4 text-base font-semibold shadow-lg dark:border-red-400 dark:bg-red-700"
                >
                    <IoWarning size={28} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="wrap-break-word">{error}</span>
                </div>
            )}

            {phase.kind === 'instruction' && (
                <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
                    {phase.step === 1 && (
                        <>
                            <h2 className="text-center text-lg font-semibold">
                                {t('firmwareWizardStep1Title', boardCtx)}
                            </h2>
                            <img
                                src={imgPowerOff}
                                alt=""
                                className="max-h-72 w-full rounded-lg object-contain"
                            />
                            <p className="text-center text-sm text-mountain-mist-700 dark:text-shark-300">
                                {t('firmwareWizardStep1Body', boardCtx)}
                            </p>
                        </>
                    )}
                    {phase.step === 2 && (
                        <>
                            <h2 className="text-center text-lg font-semibold">
                                {t('firmwareWizardStep2Title', boardCtx)}
                            </h2>
                            <img
                                src={imgBootSel}
                                alt=""
                                className="max-h-72 w-full rounded-lg object-contain"
                            />
                            <p className="text-center text-sm text-mountain-mist-700 dark:text-shark-300">
                                {t('firmwareWizardStep2Body', boardCtx)}
                            </p>
                        </>
                    )}
                    {phase.step === 3 && (
                        <>
                            <h2 className="text-center text-lg font-semibold">
                                {t('firmwareWizardStep3Title', boardCtx)}
                            </h2>
                            <img
                                src={imgSelectDir}
                                alt=""
                                className="max-h-72 w-full rounded-lg object-contain"
                            />
                            <p className="mb-2 text-center text-sm text-mountain-mist-700 dark:text-shark-300">
                                {t('firmwareWizardStep3Body', {
                                    drive: cmd.getXRPDrive(),
                                    ...boardCtx,
                                })}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <Button onClicked={() => void pickFolder()}>
                                    {t('firmwareWizardChooseFolder')}
                                </Button>
                                <Button disabled={!dirHandle} onClicked={onInstructionNext}>
                                    {t('firmwareWizardStartFlash')}
                                </Button>
                            </div>
                            {dirHandle && (
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                    {t('firmwareWizardFolderReady')}
                                </p>
                            )}
                        </>
                    )}
                    {phase.step !== 3 && (
                        <div className="flex w-full justify-end gap-3">
                            <Button onClicked={onInstructionNext}>{t('firmwareWizardNext')}</Button>
                        </div>
                    )}
                </div>
            )}

            {phase.kind === 'uf2' && (
                <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-6 py-8">
                    <h2 className="whitespace-pre-line text-center text-lg font-semibold">
                        {t('firmwareWizardUf2Title')}
                    </h2>
                    <ProgressBar
                        radius={100}
                        progress={uf2Pct}
                        strokeColor="#0a96ed"
                        strokeLinecap="square"
                        trackStrokeWidth={18}
                    >
                        <div className="absolute flex h-full w-full items-center justify-center">
                            <span className="text-2xl text-mountain-mist-700 dark:text-shark-200">
                                {uf2Pct}%
                            </span>
                        </div>
                    </ProgressBar>
                    <p className="text-center text-sm text-mountain-mist-600 dark:text-shark-400">
                        {t('firmwareWizardUf2Wait')}
                    </p>
                </div>
            )}

            {phase.kind === 'libs' && (
                <div className="relative mx-auto flex w-full max-w-md flex-col items-center gap-6 py-8">
                    <h2 className="whitespace-pre-line text-center text-lg font-semibold">
                        {t('firmwareWizardLibsTitle')}
                    </h2>
                    {phase.waitingUsb ? (
                        <>
                            <p className="text-center text-sm text-mountain-mist-700 dark:text-shark-300">
                                {phase.needsManualConnect
                                    ? t('firmwareWizardManualConnectBody')
                                    : t('firmwareWizardConnectBody')}
                            </p>
                            {phase.needsManualConnect && (
                                <Button onClicked={onConnectToXrpClicked}>
                                    {t('firmwareWizardConnectToXrp')}
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="relative flex w-full items-center justify-center">
                            <ProgressBar
                                radius={100}
                                progress={libPct}
                                strokeColor="#0a96ed"
                                strokeLinecap="square"
                                trackStrokeWidth={18}
                            >
                                <div className="absolute flex h-full w-full items-center justify-center">
                                    <span className="text-2xl text-mountain-mist-700 dark:text-shark-200">
                                        {libPct}%
                                    </span>
                                </div>
                            </ProgressBar>
                        </div>
                    )}
                    {error && !phase.waitingUsb && (
                        <Button onClicked={() => void runLibraryPhaseOnly()}>
                            {t('firmwareWizardRetryLibrary')}
                        </Button>
                    )}
                </div>
            )}

            {phase.kind === 'success' && (
                <div className="bg-black/40 fixed inset-0 z-1002 flex items-center justify-center px-4">
                    <div className="bg-white w-full max-w-md rounded-lg border border-mountain-mist-200 p-8 shadow-xl dark:border-shark-600 dark:bg-shark-900">
                        <h2 className="mb-4 text-center text-lg font-bold text-mountain-mist-900 dark:text-shark-100">
                            {t('firmwareWizardSuccessTitle')}
                        </h2>
                        <div className="mb-6 space-y-3 text-center text-sm text-mountain-mist-700 dark:text-shark-300">
                            <p>{t('firmwareWizardSuccessBody')}</p>
                            {!skipUf2 && <p>{t('firmwareWizardSuccessBluetoothReset')}</p>}
                        </div>
                        <div className="flex justify-center">
                            <Button onClicked={() => void handleComplete()}>{t('okButton')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
