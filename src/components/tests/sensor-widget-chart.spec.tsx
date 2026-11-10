import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AppMgr, { EventType } from '@/managers/appmgr';
import i18n from '@/utils/i18n';
import { Accelerometer } from '@/components/dashboard/sensors';

vi.mock('@/components/dashboard/hooks/useGridStackWidget', () => ({
    useGridStackWidget: () => ({ widgetId: 'w1', handleDelete: vi.fn() }),
}));

/**
 * ResizeObserver stub that reports a fixed 400x200 box, so recharts'
 * ResponsiveContainer has a size in jsdom (which has no layout).
 */
class FixedResizeObserver {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }

    /** Reports the fixed size for the observed element right away. */
    observe(target: Element) {
        this.callback(
            [{ target, contentRect: { width: 400, height: 200 } } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
        );
    }

    unobserve() {}

    disconnect() {}
}

/** Sends one fake accelerometer reading through the dashboard data event. */
function sendReading(accX: number, accY: number, accZ: number) {
    act(() => {
        AppMgr.getInstance().emit(
            EventType.EVENT_DASHBOARD_DATA,
            JSON.stringify({ accelerometer: { accX, accY, accZ } }),
        );
    });
}

/**
 * Drives the accelerometer widget with fake robot data (no robot needed) and checks that the
 * recharts line chart renders one line per channel and redraws as new readings arrive.
 */
describe('Sensor widget chart', () => {
    beforeAll(() => {
        vi.stubGlobal('ResizeObserver', FixedResizeObserver);
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            width: 400,
            height: 200,
            top: 0,
            left: 0,
            right: 400,
            bottom: 200,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect);
    });

    beforeEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('shows the latest values in data view', async () => {
        render(<Accelerometer viewMode="data" />);
        sendReading(0.5, -1.25, 9.81);
        expect(await screen.findByText('9.81')).toBeInTheDocument();
        expect(screen.getByText('-1.25')).toBeInTheDocument();
    });

    it('draws a line per channel and updates it live', async () => {
        const { container } = render(<Accelerometer viewMode="graph" />);
        sendReading(0, 0, 9.8);
        await new Promise((resolve) => setTimeout(resolve, 5));
        sendReading(1, -1, 9.7);

        await waitFor(() => {
            expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3);
        });
        expect(screen.getByText(/2 readings stored/)).toBeInTheDocument();
        const curve = () =>
            container.querySelector('.recharts-line-curve[stroke="#3b82f6"]')?.getAttribute('d');
        const before = curve();
        expect(before).toBeTruthy();

        await new Promise((resolve) => setTimeout(resolve, 5));
        sendReading(3, 2, 9.6);
        await waitFor(() => {
            expect(screen.getByText(/3 readings stored/)).toBeInTheDocument();
            expect(curve()).not.toBe(before);
        });
    });

    it('switches from data to graph from the settings menu', async () => {
        const { container } = render(<Accelerometer viewMode="data" />);
        sendReading(0, 0, 9.8);
        await screen.findByText('9.80');
        await new Promise((resolve) => setTimeout(resolve, 5));
        sendReading(1, 1, 9.7);
        fireEvent.click(screen.getByRole('button', { name: '' }));
        fireEvent.click(await screen.findByText('Graph'));
        await waitFor(() => {
            expect(container.querySelector('.recharts-line-curve')).toBeTruthy();
        });
    });
});
