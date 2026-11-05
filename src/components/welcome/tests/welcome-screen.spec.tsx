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

    it('suggests a numbered name, checks it and creates the project', async () => {
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

        const input = (await screen.findByLabelText('Name your project')) as HTMLInputElement;
        expect(input.value).toBe('my-project-2');

        fireEvent.change(input, { target: { value: 'my-project-1' } });
        expect(screen.getByRole('status').textContent).toContain('already have a project');
        expect((screen.getByText('Create') as HTMLButtonElement).disabled).toBe(true);

        fireEvent.change(input, { target: { value: 'Línea rápida' } });
        fireEvent.click(screen.getByText('Create'));

        await waitFor(() => expect(emit).toHaveBeenCalled());
        const [event, json] = emit.mock.calls[0] as [EventType, string];
        expect(event).toBe(EventType.EVENT_NEW_PROJECT);
        expect(JSON.parse(json)).toMatchObject({
            name: 'Linea rapida.blocks',
            path: '/gusers/local/Linea rapida.blocks',
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
