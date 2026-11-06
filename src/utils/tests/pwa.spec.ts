import { afterEach, describe, expect, it, vi } from 'vitest';

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

describe('pwa', () => {
    afterEach(() => {
        Reflect.deleteProperty(navigator, 'serviceWorker');
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

    it('reports a new version and reloads only when asked', async () => {
        Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
        const pwa = await loadPwa();
        const update = vi.fn(() => Promise.resolve());
        let onNeedRefresh = () => {};
        pwa.startPwa((options) => {
            onNeedRefresh = options.onNeedRefresh;
            return update;
        });
        expect((await snapshot(pwa)).needRefresh).toBe(false);

        onNeedRefresh();
        expect((await snapshot(pwa)).needRefresh).toBe(true);
        expect(update).not.toHaveBeenCalled();

        await pwa.applyUpdate();
        expect(update).toHaveBeenCalledWith(true);

        pwa.dismissUpdate();
        expect((await snapshot(pwa)).needRefresh).toBe(false);
    });

    it('does not register a worker where service workers are not available', async () => {
        const pwa = await loadPwa();
        const register = vi.fn();
        pwa.startPwa(register);
        expect(register).not.toHaveBeenCalled();
    });
});
