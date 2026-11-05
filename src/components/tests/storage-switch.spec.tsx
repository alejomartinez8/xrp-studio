import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import AppMgr, { EventType, LoginStatus } from '@/managers/appmgr';
import { ConnectionState } from '@/connections/connection';

const { startMyProjects } = vi.hoisted(() => ({
    startMyProjects: vi.fn(async () => {
        const { default: AppMgr } = await import('@/managers/appmgr');
        AppMgr.getInstance().authService.isLogin = true;
        return { id: 'local', email: 'local@xrp-studio', name: 'XRP Studio', picture: '' };
    }),
}));

vi.mock('@/utils/local-projects', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/utils/local-projects')>()),
    startMyProjects,
}));
vi.mock('@/utils/session', () => ({
    handleSignedIn: vi.fn(async () => {
        const { default: AppMgr, EventType, LoginStatus } = await import('@/managers/appmgr');
        AppMgr.getInstance().emit(EventType.EVENT_LOGIN_STATUS, LoginStatus.LOGGED_IN);
        return false;
    }),
}));

import StorageSwitch from '@components/storage-switch';

const emit = (event: EventType, value: string) =>
    act(() => {
        AppMgr.getInstance().emit(event, value);
    });

describe('StorageSwitch', () => {
    beforeEach(() => {
        AppMgr.getInstance().authService.isLogin = true;
    });

    it('starts on My projects with Robot memory disabled until a robot connects', () => {
        render(<StorageSwitch />);
        expect(screen.getByRole('button', { name: /My projects/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: /Robot memory/ })).toBeDisabled();
        emit(EventType.EVENT_CONNECTION_STATUS, ConnectionState.Connected.toString());
        expect(screen.getByRole('button', { name: /Robot memory/ })).toBeEnabled();
    });

    it('shows the robot memory and returns to My projects when the robot disconnects', async () => {
        render(<StorageSwitch />);
        emit(EventType.EVENT_CONNECTION_STATUS, ConnectionState.Connected.toString());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Robot memory/ }));
        });
        expect(AppMgr.getInstance().authService.isLogin).toBe(false);
        expect(screen.getByRole('button', { name: /Robot memory/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );

        await act(async () => {
            AppMgr.getInstance().emit(
                EventType.EVENT_CONNECTION_STATUS,
                ConnectionState.Disconnected.toString(),
            );
        });
        expect(startMyProjects).toHaveBeenCalled();
        expect(AppMgr.getInstance().authService.isLogin).toBe(true);
        expect(screen.getByRole('button', { name: /My projects/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('follows sign-in events', () => {
        render(<StorageSwitch />);
        emit(EventType.EVENT_LOGIN_STATUS, LoginStatus.LOGGED_OUT);
        expect(screen.getByRole('button', { name: /My projects/ })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });
});
