/** The parts of `navigator.connection` (Network Information API, Chromium only) used here. */
type NetworkInformation = {
    saveData?: boolean;
    effectiveType?: string;
};

/** The parts of `window` used here, so tests can pass a fake one. */
export type PrefetchWindow = Pick<
    Window,
    'addEventListener' | 'removeEventListener' | 'setTimeout' | 'clearTimeout'
> & {
    document: Pick<Document, 'readyState'>;
    navigator: { connection?: NetworkInformation };
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
};

/** Longest wait for an idle moment once the page has loaded, in milliseconds. */
const IDLE_TIMEOUT_MS = 10000;
/** Wait used where `requestIdleCallback` does not exist (Safari), in milliseconds. */
const FALLBACK_DELAY_MS = 3000;

/**
 * True when the connection is slow or the user asked to save data (`saveData`, or a 2G
 * `effectiveType`), so nothing should be downloaded ahead of time.
 */
export function shouldSkipPrefetch(connection?: NetworkInformation): boolean {
    if (!connection) {
        return false;
    }
    return connection.saveData === true || (connection.effectiveType ?? '').endsWith('2g');
}

/**
 * Run `load` once the page has finished loading and the browser is idle, so a heavy download
 * that will probably be needed later does not compete with the first load. Skipped on slow or
 * metered connections. Errors from `load` are ignored: the real use downloads it again. Returns
 * a function that cancels the prefetch if it has not started yet.
 */
export function prefetchWhenIdle(
    load: () => Promise<unknown>,
    win: PrefetchWindow = window as unknown as PrefetchWindow,
): () => void {
    if (shouldSkipPrefetch(win.navigator.connection)) {
        return () => undefined;
    }
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    let isCancelled = false;

    const run = () => {
        if (!isCancelled) {
            load().catch(() => undefined);
        }
    };
    const whenIdle = () => {
        win.removeEventListener('load', whenIdle);
        if (isCancelled) {
            return;
        }
        if (win.requestIdleCallback) {
            idleHandle = win.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
        } else {
            timeoutHandle = win.setTimeout(run, FALLBACK_DELAY_MS);
        }
    };

    if (win.document.readyState === 'complete') {
        whenIdle();
    } else {
        win.addEventListener('load', whenIdle);
    }

    return () => {
        isCancelled = true;
        win.removeEventListener('load', whenIdle);
        if (idleHandle !== undefined) {
            win.cancelIdleCallback?.(idleHandle);
        }
        if (timeoutHandle !== undefined) {
            win.clearTimeout(timeoutHandle);
        }
    };
}
