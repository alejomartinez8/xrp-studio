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
        sessionStorage.clear();
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
    it('applies a stored version when the app opens', async () => {
        const waiting = waitingWorker();
        const container = fakeServiceWorker(waiting);
        const registration = { waiting, update: vi.fn() };
        const pwa = await loadPwa();
        pwa.startPwa((options) => options.onRegisteredSW('/sw.js', registration as never));
        await vi.waitFor(() =>
            expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' }),
        );

        container.dispatchEvent(new Event('controllerchange'));
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('leaves the page alone when no stored version is waiting', async () => {
        fakeServiceWorker(null);
        const registration = { waiting: null, update: vi.fn() };
        const pwa = await loadPwa();
        pwa.startPwa((options) => options.onRegisteredSW('/sw.js', registration as never));
        await Promise.resolve();
        expect(reload).not.toHaveBeenCalled();
    });

    it('does not apply a version twice in a row, so the page cannot reload in a loop', async () => {
        const waiting = waitingWorker();
        fakeServiceWorker(waiting);
        sessionStorage.setItem('PwaApplied', String(Date.now()));
        const registration = { waiting, update: vi.fn() };
        const pwa = await loadPwa();
        pwa.startPwa((options) => options.onRegisteredSW('/sw.js', registration as never));
        await Promise.resolve();
        expect(waiting.postMessage).not.toHaveBeenCalled();
        sessionStorage.removeItem('PwaApplied');
    });

    it('removes the worker and its stored copy when the new version does not take over', async () => {
        vi.useFakeTimers();
        const waiting = waitingWorker();
        const unregister = vi.fn(() => Promise.resolve(true));
        const container = Object.assign(new EventTarget(), {
            getRegistration: vi.fn(() => Promise.resolve({ waiting, unregister })),
        });
        Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
        const deleteCache = vi.fn(() => Promise.resolve(true));
        vi.stubGlobal('caches', { keys: () => Promise.resolve(['a', 'b']), delete: deleteCache });
        const pwa = await loadPwa();
        await pwa.applyUpdate();
        expect(reload).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(4000);
        expect(unregister).toHaveBeenCalled();
        expect(deleteCache).toHaveBeenCalledTimes(2);
        expect(reload).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
