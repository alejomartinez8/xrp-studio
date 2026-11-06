import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const flushAutosave = vi.fn(() => Promise.resolve());

vi.mock('@/utils/autosave', () => ({ flushAutosave }));

/** A fresh copy of the module, so each test starts from the initial state. */
async function loadPwa() {
    vi.resetModules();
    return import('@/utils/pwa');
}

/** A `beforeinstallprompt` event whose dialog answers `outcome`. */
function installEvent(outcome: 'accepted' | 'dismissed') {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    return Object.assign(event, {
        prompt: vi.fn(() => Promise.resolve()),
        userChoice: Promise.resolve({ outcome }),
    });
}

/** Read the current state through a short-lived subscriber-free snapshot. */
async function snapshot(pwa: typeof import('@/utils/pwa')) {
    const { renderHook } = await import('@testing-library/react');
    return renderHook(() => pwa.usePwaState()).result.current;
}

/** A waiting worker that records its messages and can move to another state. */
function waitingWorker() {
    const worker = Object.assign(new EventTarget(), {
        state: 'installed' as ServiceWorkerState,
        postMessage: vi.fn(),
        moveTo(state: ServiceWorkerState) {
            worker.state = state;
            worker.dispatchEvent(new Event('statechange'));
        },
    });
    return worker;
}

/** A `navigator.serviceWorker` whose registration has `waiting` as its waiting worker. */
function fakeServiceWorker(waiting: ReturnType<typeof waitingWorker> | null) {
    const container = Object.assign(new EventTarget(), {
        getRegistration: vi.fn(() => Promise.resolve({ waiting })),
    });
    Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
    return container;
}

describe('pwa', () => {
    const reload = vi.fn();

    beforeEach(() => {
        reload.mockReset();
        flushAutosave.mockClear();
        vi.stubGlobal('location', { ...window.location, reload });
    });

    afterEach(() => {
        Reflect.deleteProperty(navigator, 'serviceWorker');
        vi.unstubAllGlobals();
    });

    it('offers Install app after the browser allows it and hides it once installed', async () => {
        const pwa = await loadPwa();
        pwa.startPwa(vi.fn());
        expect((await snapshot(pwa)).canInstall).toBe(false);

        const event = installEvent('accepted');
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect((await snapshot(pwa)).canInstall).toBe(true);

        await pwa.installApp();
        expect(event.prompt).toHaveBeenCalled();
        expect((await snapshot(pwa)).canInstall).toBe(false);
    });

    it('keeps Install app when the user dismisses the dialog', async () => {
        const pwa = await loadPwa();
        pwa.startPwa(vi.fn());
        window.dispatchEvent(installEvent('dismissed'));
        await pwa.installApp();
        expect((await snapshot(pwa)).canInstall).toBe(true);
    });

    it('reports a new version and hides it on Later', async () => {
        fakeServiceWorker(null);
        const pwa = await loadPwa();
        let onNeedRefresh = () => {};
        pwa.startPwa((options) => {
            onNeedRefresh = options.onNeedRefresh;
        });
        expect((await snapshot(pwa)).needRefresh).toBe(false);

        onNeedRefresh();
        expect((await snapshot(pwa)).needRefresh).toBe(true);
        expect(reload).not.toHaveBeenCalled();

        pwa.dismissUpdate();
        expect((await snapshot(pwa)).needRefresh).toBe(false);
    });

    it('saves, activates the waiting version and reloads when it takes control', async () => {
        const waiting = waitingWorker();
        const container = fakeServiceWorker(waiting);
        const pwa = await loadPwa();
        await pwa.applyUpdate();

        expect(flushAutosave).toHaveBeenCalled();
        expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
        expect(reload).not.toHaveBeenCalled();

        container.dispatchEvent(new Event('controllerchange'));
        waiting.moveTo('activated');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('reloads once the new version is active on a page opened without a worker', async () => {
        const waiting = waitingWorker();
        fakeServiceWorker(waiting);
        const pwa = await loadPwa();
        await pwa.applyUpdate();

        waiting.moveTo('activating');
        expect(reload).not.toHaveBeenCalled();
        waiting.moveTo('activated');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('reloads right away when no version is waiting', async () => {
        fakeServiceWorker(null);
        const pwa = await loadPwa();
        await pwa.applyUpdate();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('reloads even when saving fails', async () => {
        fakeServiceWorker(null);
        flushAutosave.mockRejectedValueOnce(new Error('offline'));
        const pwa = await loadPwa();
        await pwa.applyUpdate();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not register a worker where service workers are not available', async () => {
        const pwa = await loadPwa();
        const register = vi.fn();
        pwa.startPwa(register);
        expect(register).not.toHaveBeenCalled();
    });
});
