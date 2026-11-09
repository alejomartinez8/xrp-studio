import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Trash, { daysLeft } from '@/components/trash';
import AppMgr from '@/managers/appmgr';
import LocalDriveService, { MemoryDriveStore, TRASH_DAYS } from '@/services/local-drive';
import { Constants } from '@/utils/constants';
import i18n from '@/utils/i18n';

vi.mock('@/utils/google-utils', async (original) => ({
    ...(await original<typeof import('@/utils/google-utils')>()),
    fireGoogleUserTree: vi.fn(async () => undefined),
}));

describe('Trash', () => {
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

    it('counts the items in the trash, restores one and deletes another for good', async () => {
        const keep = await file('keep.py');
        const gone = await file('gone.py');
        await drive.trashFile(keep!.id);
        await drive.trashFile(gone!.id);

        render(<Trash />);
        expect(await screen.findByTestId('trash-count')).toHaveTextContent('2');

        fireEvent.click(screen.getByTestId('trash-open'));
        const panel = await screen.findByTestId('trash-panel');
        expect(within(panel).getAllByTestId('trash-item')).toHaveLength(2);
        expect(within(panel).getAllByText(`${TRASH_DAYS} days left`)).toHaveLength(2);

        const row = (name: string) =>
            within(panel)
                .getAllByTestId('trash-item')
                .find((item) => item.textContent?.includes(name))!;
        await act(async () => {
            fireEvent.click(within(row('keep.py')).getByText('Restore'));
        });
        await act(async () => {
            fireEvent.click(within(row('gone.py')).getByLabelText('Delete forever'));
        });

        expect((await drive.getFileListByFolderId(rootId)).map((f) => f.name)).toEqual(['keep.py']);
        expect(await drive.trashItems()).toHaveLength(0);
        expect(await drive.allRecords()).toHaveLength(2);
    });

    it('empties the whole trash after asking', async () => {
        await drive.trashFile((await file('a.py'))!.id);
        await drive.trashFile((await file('b.py'))!.id);
        render(<Trash />);
        fireEvent.click(await screen.findByTestId('trash-open'));
        await waitFor(() => expect(screen.getAllByTestId('trash-item')).toHaveLength(2));

        fireEvent.click(screen.getByText('Empty trash'));
        expect(screen.getByText('Delete 2 items for good? This cannot be undone.')).toBeVisible();
        await act(async () => {
            fireEvent.click(screen.getByTestId('trash-empty-confirm'));
        });
        expect(await drive.trashItems()).toHaveLength(0);
    });

    it('says how many days are left', () => {
        const now = Date.parse('2026-11-30T12:00:00Z');
        expect(daysLeft('2026-11-30T12:00:00Z', now)).toBe(TRASH_DAYS);
        expect(daysLeft('2026-11-01T00:00:00Z', now)).toBe(1);
    });
});
