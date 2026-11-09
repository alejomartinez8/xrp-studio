import { useSyncExternalStore } from 'react';
import { flushAutosave } from '@/utils/autosave';

/** What the installable app can offer the user right now. */
export type PwaState = {
    /** The browser lets the app be installed (Chrome and Edge). */
    canInstall: boolean;
    /** A new version is stored and waits for the user to update (installed app only). */
    updateReady: boolean;
};

/** The `beforeinstallprompt` event, not in the DOM types yet. */
type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Registers the service worker and reports new versions. */
type Register = (options: {
    onRegisteredSW: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
}) => void;

/** Time a version gets to take over before the update is forced. */
const TAKE_OVER_TIMEOUT_MS = 3000;

/** How often an open app checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

let state: PwaState = { canInstall: false, updateReady: false };
const listeners = new Set<() => void>();
let installPrompt: InstallPromptEvent | null = null;

/** Replace part of the state and tell the subscribed components. */
function setState(change: Partial<PwaState>): void {
    state = { ...state, ...change };
    listeners.forEach((listener) => listener());
}

/** Default registration through vite-plugin-pwa, loaded only when it is needed. */
const registerWithPlugin: Register = (options) => {
    void import('virtual:pwa-register').then(({ registerSW }) => {
        registerSW({ ...options, immediate: true });
    });
};

/** Session key set when a stored version was just applied, so the page does not reload in a loop. */
const APPLIED_KEY = 'PwaApplied';

/** Display modes of an installed app (the manifest asks for full screen). */
const INSTALLED_QUERY =
    '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)';

/** Whether the page runs as the installed app and not in a browser tab. */
export function isInstalledApp(): boolean {
    const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return ios || (typeof matchMedia === 'function' && matchMedia(INSTALLED_QUERY).matches);
}

/** Time during which a second automatic update is not tried after one was applied. */
const APPLIED_GUARD_MS = 20 * 1000;

/**
 * Starts the installable app (spec 001): registers the service worker, which stores the app for
 * offline use, looks for a new version when the app opens and every hour while it is open, and
 * keeps the browser's install prompt for the Install app button (`canInstall`).
 *
 * A new version is stored in the background and never changes the page being used. It is applied
 * when the app is opened or the page is reloaded: if a stored version is waiting at that moment,
 * it takes over and the page loads it. In the installed app, which can stay open for days, a
 * version found while it is open sets `updateReady` so the user chooses when to update; in a
 * browser tab nothing is shown. Does nothing where service workers are not available (an
 * `http://` address on the network).
 */
export function startPwa(register: Register = registerWithPlugin): void {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        installPrompt = event as InstallPromptEvent;
        setState({ canInstall: true });
    });
    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        setState({ canInstall: false });
    });
    if (!('serviceWorker' in navigator)) {
        return;
    }
    register({
        onRegisteredSW: (_url, registration) => {
            if (!registration) {
                return;
            }
            if (registration.waiting && !justApplied()) {
                void applyUpdate();
            }
            if (isInstalledApp()) {
                watchForUpdates(registration);
            }
            setInterval(() => registration.update(), UPDATE_CHECK_MS);
        },
    });
}

/** Sets `updateReady` when a new version finishes storing while the app is open. */
function watchForUpdates(registration: ServiceWorkerRegistration): void {
    registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                setState({ updateReady: true });
            }
        });
    });
}

/** Whether a stored version was applied a moment ago in this session. */
function justApplied(): boolean {
    try {
        return Date.now() - Number(sessionStorage.getItem(APPLIED_KEY) ?? 0) < APPLIED_GUARD_MS;
    } catch {
        return false;
    }
}

/**
 * Save the open files, activate the waiting version and reload the page once.
 *
 * vite-plugin-pwa's update function only asks the waiting worker to take over and reloads on a
 * workbox `controlling` event that is not sent when the page was opened without a worker (first
 * visit) or when the update was found by the hourly check, so Reload did nothing. Here the page
 * reloads when the new worker takes control (`controllerchange`) or reaches `activated` (pages
 * without a worker get no `controllerchange`), and right away when no worker is waiting, because
 * the active worker then already serves the new version. If the worker has not taken over after a
 * few seconds, the worker and its stored copy are removed and the page reloads from the network.
 */
export async function applyUpdate(): Promise<void> {
    try {
        sessionStorage.setItem(APPLIED_KEY, String(Date.now()));
    } catch {
        /* storage blocked: the page may try once more after the reload */
    }
    await flushAutosave().catch(() => undefined);
    let reloaded = false;
    const reload = () => {
        if (!reloaded) {
            reloaded = true;
            window.location.reload();
        }
    };
    const registration =
        'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    const waiting = registration?.waiting;
    if (!waiting) {
        reload();
        return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    waiting.addEventListener('statechange', () => {
        if (waiting.state === 'activated') {
            reload();
        }
    });
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => {
        if (!reloaded) {
            void forceUpdate(registration).finally(reload);
        }
    }, TAKE_OVER_TIMEOUT_MS);
}

/**
 * Last resort when the waiting version does not take over (some phone browsers): remove the
 * worker and its stored copy, so the next load fetches the new version from the network. The
 * offline copy is stored again by the new worker.
 */
async function forceUpdate(registration: ServiceWorkerRegistration): Promise<void> {
    await registration.unregister().catch(() => undefined);
    if ('caches' in window) {
        const names = await caches.keys().catch(() => [] as string[]);
        await Promise.all(names.map((name) => caches.delete(name))).catch(() => undefined);
    }
}

/** Show the browser's install dialog. */
export async function installApp(): Promise<void> {
    const prompt = installPrompt;
    if (!prompt) {
        return;
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
        installPrompt = null;
        setState({ canInstall: false });
    }
}

/** Current state of the installable app, for components. */
export function usePwaState(): PwaState {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state,
    );
}
