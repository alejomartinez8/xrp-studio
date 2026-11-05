import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@/utils/i18n';
import AppMgr, { EventType } from '@/managers/appmgr';
import WelcomeScreen from '@components/welcome/welcome-screen';

describe('WelcomeScreen', () => {
    let emit: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        emit = vi.spyOn(AppMgr.getInstance(), 'emit').mockImplementation(() => undefined);
    });

    afterEach(() => {
        emit.mockRestore();
        vi.restoreAllMocks();
        AppMgr.getInstance().authService.isLogin = false;
    });

    it('creates a numbered blocks project in the user projects folder', async () => {
        const appMgr = AppMgr.getInstance();
        appMgr.authService.isLogin = true;
        appMgr.authService.userProfile = {
            id: 'local',
            email: 'local@xrp-studio',
            name: '',
            picture: '',
        };
        vi.spyOn(appMgr.driveService, 'findFolderByName').mockResolvedValue({
            id: 'xrpcode',
            name: 'XRPCode',
            mimeType: 'application/vnd.google-apps.folder',
            kind: 'drive#file',
        });
        vi.spyOn(appMgr.driveService, 'getFileListByFolderId').mockResolvedValue([
            {
                id: 'a',
                name: 'my-project-1.blocks',
                mimeType: 'application/json',
                kind: 'drive#file',
            },
        ]);

        render(<WelcomeScreen />);
        fireEvent.click(screen.getByText('New blocks project'));

        await waitFor(() => expect(emit).toHaveBeenCalled());
        const [event, json] = emit.mock.calls[0] as [EventType, string];
        expect(event).toBe(EventType.EVENT_NEW_PROJECT);
        expect(JSON.parse(json)).toMatchObject({
            name: 'my-project-2.blocks',
            path: '/gusers/local/my-project-2.blocks',
            parentId: 'xrpcode',
        });
    });

    it('asks to sign in when there is nowhere to save projects', () => {
        AppMgr.getInstance().authService.isLogin = false;
        render(<WelcomeScreen />);
        fireEvent.click(screen.getByText('New Python project'));

        expect(screen.getByRole('status').textContent).toContain('Sign in with Google');
        expect(emit).not.toHaveBeenCalled();
    });
});
