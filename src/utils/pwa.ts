import { useSyncExternalStore } from 'react';

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

/** Registers the service worker; returns the function that activates a waiting version. */
type Register = (options: {
    onNeedRefresh: () => void;
    onRegisteredSW: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
}) => (reloadPage?: boolean) => Promise<void>;

/** How often an open app checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

let state: PwaState = { needRefresh: false, canInstall: false };
const listeners = new Set<() => void>();
let installPrompt: InstallPromptEvent | null = null;
let updateWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

/** Replace part of the state and tell the subscribed components. */
function setState(change: Partial<PwaState>): void {
    state = { ...state, ...change };
    listeners.forEach((listener) => listener());
}

/** Default registration through vite-plugin-pwa, loaded only when it is needed. */
const registerWithPlugin: Register = (options) => {
    let update: ((reloadPage?: boolean) => Promise<void>) | null = null;
    const ready = import('virtual:pwa-register').then(({ registerSW }) => {
        update = registerSW({ ...options, immediate: true });
    });
    return async (reloadPage) => {
        await ready;
        await update?.(reloadPage);
    };
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
    updateWorker = register({
        onNeedRefresh: () => setState({ needRefresh: true }),
        onRegisteredSW: (_url, registration) => {
            if (registration) {
                setInterval(() => registration.update(), UPDATE_CHECK_MS);
            }
        },
    });
}

/** Activate the waiting version and reload the page. */
export async function applyUpdate(): Promise<void> {
    await updateWorker?.(true);
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
