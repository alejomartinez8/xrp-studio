import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import StatusBar from '@components/status-bar/status-bar';
import type DriveApi from '@/services/drive-api';
import { startSync, stopSync, syncNow } from '@/services/drive-sync';
import LocalDriveService, { MemoryDriveStore } from '@/services/local-drive';

describe('StatusBar', () => {
    afterEach(() => act(() => stopSync()));

    it('shows the device when no account is signed in and a check once synced', async () => {
        render(<StatusBar />);
        expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'off');
        expect(screen.getByTestId('sync-status')).toHaveAttribute(
            'title',
            expect.stringContaining('this device only'),
        );

        const api = {
            ensureRoot: async () => ({ id: 'r', name: 'XRPCode', mimeType: '', modifiedTime: 't' }),
            listFolder: async () => [],
        } as unknown as DriveApi;
        act(() =>
            startSync(new LocalDriveService(new MemoryDriveStore()), api, {
                onRemoteChange: () => {},
            }),
        );
        expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'syncing');
        expect(screen.getByTestId('sync-status').querySelector('svg')).toHaveClass('animate-spin');

        await act(() => syncNow({ pull: true }));
        expect(screen.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced');
        expect(screen.getByTestId('sync-status')).toHaveAttribute('title', 'Saved in your account');
    });
});
