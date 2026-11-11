import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Archived from '@/components/archived';
import AppMgr, { EventType } from '@/managers/appmgr';
import LocalDriveService, { MemoryDriveStore } from '@/services/local-drive';
import { Constants } from '@/utils/constants';
import i18n from '@/utils/i18n';

vi.mock('@/utils/google-utils', async (original) => ({
    ...(await original<typeof import('@/utils/google-utils')>()),
    fireGoogleUserTree: vi.fn(async () => undefined),
}));

describe('Archived', () => {
    let drive: LocalDriveService;
    let rootId: string;

    beforeEach(async () => {
        HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });
        HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
            this.removeAttribute('open');
        });
        await i18n.changeLanguage('en');
        drive = AppMgr.getInstance().driveService as LocalDriveService;
        drive.useStore(new MemoryDriveStore());
        rootId = (await drive.ensureRootFolder(Constants.XRPCODE)).id;
    });

    const file = (name: string) => drive.uploadFile(new Blob(['x']), name, 'text/x-python', rootId);

    it('shows the row only while there are archived projects', async () => {
        const project = await file('robot.py');
        render(<Archived />);
        await act(async () => {});
        expect(screen.queryByTestId('archived-open')).toBeNull();

        await drive.archiveFile(project!.id);
        await act(async () => {
            AppMgr.getInstance().emit(EventType.EVENT_FILESYS, '');
        });
        expect(await screen.findByTestId('archived-count')).toHaveTextContent('1');
    });

    it('lists archived projects and brings one back', async () => {
        const keep = await file('keep.py');
        const back = await file('back.py');
        await drive.archiveFile(keep!.id);
        await drive.archiveFile(back!.id);

        render(<Archived />);
        fireEvent.click(await screen.findByTestId('archived-open'));
        const panel = await screen.findByTestId('archived-panel');
        expect(screen.getByText('Archived projects')).toBeVisible();
        const rows = await screen.findAllByTestId('archived-item');
        expect(rows).toHaveLength(2);

        const row = rows.find((item) => item.textContent?.includes('back.py'))!;
        await act(async () => {
            fireEvent.click(row.querySelector('button')!);
        });

        expect((await drive.getFileListByFolderId(rootId)).map((f) => f.name)).toEqual(['back.py']);
        expect(panel.querySelectorAll('[data-testid="archived-item"]')).toHaveLength(1);
    });
});
