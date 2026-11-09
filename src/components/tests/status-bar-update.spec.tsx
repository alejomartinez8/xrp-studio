import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import StatusBar from '@components/status-bar';

const state = vi.hoisted(() => ({ updateReady: true }));
const applyUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/utils/pwa', () => ({
    usePwaState: () => ({ canInstall: false, updateReady: state.updateReady }),
    applyUpdate,
}));

describe('StatusBar update button', () => {
    it('offers the update only when a new version is stored, and applies it on click', () => {
        const { unmount } = render(<StatusBar />);
        fireEvent.click(screen.getByTestId('update-app'));
        expect(applyUpdate).toHaveBeenCalledTimes(1);
        unmount();

        state.updateReady = false;
        render(<StatusBar />);
        expect(screen.queryByTestId('update-app')).toBeNull();
    });
});
