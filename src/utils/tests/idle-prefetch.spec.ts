import { describe, expect, it, vi } from 'vitest';
import { prefetchWhenIdle, PrefetchWindow, shouldSkipPrefetch } from '@/utils/idle-prefetch';

/** A fake window whose load event and idle callback the test fires by hand. */
function fakeWindow(options: {
    readyState: DocumentReadyState;
    connection?: { saveData?: boolean; effectiveType?: string };
    withIdle?: boolean;
}) {
    const listeners: Array<() => void> = [];
    const idle: Array<() => void> = [];
    const timers: Array<() => void> = [];
    const win = {
        document: { readyState: options.readyState },
        navigator: { connection: options.connection },
        addEventListener: (_: string, fn: () => void) => listeners.push(fn),
        removeEventListener: (_: string, fn: () => void) => {
            const index = listeners.indexOf(fn);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        },
        setTimeout: (fn: () => void) => timers.push(fn),
        clearTimeout: () => timers.splice(0),
        requestIdleCallback:
            options.withIdle === false ? undefined : (fn: () => void) => idle.push(fn),
        cancelIdleCallback: () => idle.splice(0),
    } as unknown as PrefetchWindow;
    return { win, listeners, idle, timers };
}

describe('prefetchWhenIdle', () => {
    it('waits for the page to load and an idle moment', () => {
        const load = vi.fn().mockResolvedValue(undefined);
        const { win, listeners, idle } = fakeWindow({ readyState: 'loading' });

        prefetchWhenIdle(load, win);
        expect(idle).toHaveLength(0);

        listeners[0]();
        expect(load).not.toHaveBeenCalled();
        idle[0]();
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('uses a timer where requestIdleCallback does not exist', () => {
        const load = vi.fn().mockResolvedValue(undefined);
        const { win, timers } = fakeWindow({ readyState: 'complete', withIdle: false });

        prefetchWhenIdle(load, win);
        timers[0]();
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('does nothing once cancelled', () => {
        const load = vi.fn().mockResolvedValue(undefined);
        const { win, listeners } = fakeWindow({ readyState: 'loading' });

        prefetchWhenIdle(load, win)();
        expect(listeners).toHaveLength(0);
        expect(load).not.toHaveBeenCalled();
    });

    it('skips slow or metered connections', () => {
        expect(shouldSkipPrefetch({ saveData: true })).toBe(true);
        expect(shouldSkipPrefetch({ effectiveType: 'slow-2g' })).toBe(true);
        expect(shouldSkipPrefetch({ effectiveType: '4g' })).toBe(false);
        expect(shouldSkipPrefetch(undefined)).toBe(false);

        const load = vi.fn().mockResolvedValue(undefined);
        const { win, idle } = fakeWindow({
            readyState: 'complete',
            connection: { saveData: true },
        });
        prefetchWhenIdle(load, win);
        expect(idle).toHaveLength(0);
    });
});
