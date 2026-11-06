import { useSyncExternalStore } from 'react';
import { flushAutosave } from '@/utils/autosave';

/** What the installable app can offer the user right now. */
export type PwaState = {
    /** A new version is stored and waits for Reload. */
    needRefresh: boolean;
    /** The browser lets the app be installed (Chrome and Edge). */
    canInstall: boolean;
};

/** The `beforeinstallprompt` event, not in the DOM types yet. */
type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Registers the service worker and reports new versions. */
type Register = (options: {
    onNeedRefresh: () => void;
    onRegisteredSW: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
}) => void;

/** How often an open app checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

let state: PwaState = { needRefresh: false, canInstall: false };
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

/**
 * Starts the installable app (spec 018): registers the service worker, which stores the app for
 * offline use and reports a new version (`needRefresh`), checks for updates every hour while the
 * app is open, and keeps the browser's install prompt for the Install app button (`canInstall`).
 * Does nothing where service workers are not available (an `http://` address on the network).
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
        onNeedRefresh: () => setState({ needRefresh: true }),
        onRegisteredSW: (_url, registration) => {
            if (registration) {
                setInterval(() => registration.update(), UPDATE_CHECK_MS);
            }
        },
    });
}

/**
 * Save the open files, activate the waiting version and reload the page once.
 *
 * vite-plugin-pwa's update function only asks the waiting worker to take over and reloads on a
 * workbox `controlling` event that is not sent when the page was opened without a worker (first
 * visit) or when the update was found by the hourly check, so Reload did nothing. Here the page
 * reloads when the new worker takes control (`controllerchange`) or reaches `activated` (pages
 * without a worker get no `controllerchange`), and right away when no worker is waiting, because
 * the active worker then already serves the new version.
 */
export async function applyUpdate(): Promise<void> {
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
}

/** Hide the new version notice; the new version is used the next time the app opens. */
export function dismissUpdate(): void {
    setState({ needRefresh: false });
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
