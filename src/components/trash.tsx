import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TbRestore, TbTrash, TbTrashX } from 'react-icons/tb';
import AppMgr, { EventType } from '@/managers/appmgr';
import LocalDriveService, { TRASH_DAYS, TrashItem } from '@/services/local-drive';
import ItemIcon from '@/components/item-icon';
import Dialog from '@/components/dialogs/dialog';
import { useDialogClose } from '@/components/dialogs/dialog-close';
import { localDrive, refreshTree } from '@/utils/hidden-items';
import { Constants } from '@/utils/constants';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days before an item trashed at `trashedTime` is deleted for good (at least 1). */
export function daysLeft(trashedTime: string | undefined, now: number = Date.now()): number {
    const end = Date.parse(trashedTime ?? '') + TRASH_DAYS * DAY_MS;
    return Number.isNaN(end) ? TRASH_DAYS : Math.max(1, Math.ceil((end - now) / DAY_MS));
}

/** The trash dialog: restore items, delete them for good, or empty the whole trash. */
function TrashPanel({
    items,
    onClose,
    onChanged,
}: {
    items: TrashItem[];
    onClose: () => void;
    onChanged: () => Promise<void>;
}) {
    const { t } = useTranslation();
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    useDialogClose(onClose);

    const run = async (action: (drive: LocalDriveService) => Promise<void>) => {
        const drive = localDrive();
        if (drive) {
            await action(drive);
            await onChanged();
            refreshTree();
        }
    };
    const restore = (item: TrashItem) =>
        run(async (drive) => {
            const root = await drive.ensureRootFolder(Constants.XRPCODE);
            await drive.restoreFile(item.id, root.id);
        });
    const remove = (item: TrashItem) => run((drive) => drive.DeleteFile(item.id));
    const empty = () =>
        run(async (drive) => {
            for (const item of items) {
                await drive.DeleteFile(item.id);
            }
            setConfirmEmpty(false);
        });

    const iconButton =
        'flex h-10 items-center justify-center gap-1 rounded-full px-3 text-sm text-mountain-mist-800 hover:bg-mountain-mist-200 dark:text-mountain-mist-200 dark:hover:bg-shark-800';

    return (
        <div
            data-testid="trash-panel"
            className="flex w-[28rem] max-w-full flex-col gap-3 p-6 text-mountain-mist-900 dark:text-mountain-mist-200"
        >
            <div className="flex flex-col gap-1 pr-10">
                <h1 className="flex items-center gap-2 text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    <TbTrash size={22} />
                    {t('trash.title')}
                </h1>
                <span className="text-sm text-mountain-mist-600 dark:text-mountain-mist-400">
                    {t('trash.hint', { days: TRASH_DAYS })}
                </span>
            </div>
            {items.length === 0 ? (
                <p className="py-6 text-center text-mountain-mist-600 dark:text-mountain-mist-400">
                    {t('trash.empty')}
                </p>
            ) : (
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            data-testid="trash-item"
                            className="flex items-center gap-2 rounded-md bg-mountain-mist-100 py-1 pl-3 pr-1 dark:bg-shark-900"
                        >
                            <span className="text-mountain-mist-600 dark:text-mountain-mist-400">
                                <ItemIcon item={item} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate">{item.name}</span>
                                <span className="text-xs text-mountain-mist-600 dark:text-mountain-mist-400">
                                    {t('trash.daysLeft', { count: daysLeft(item.trashedTime) })}
                                </span>
                            </span>
                            <button
                                type="button"
                                className={iconButton}
                                onClick={() => void restore(item)}
                            >
                                <TbRestore size={18} />
                                {t('trash.restore')}
                            </button>
                            <button
                                type="button"
                                title={t('trash.deleteForever')}
                                aria-label={t('trash.deleteForever')}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-mountain-mist-600 hover:bg-red-500/15 hover:text-red-600 dark:text-mountain-mist-400 dark:hover:text-red-400"
                                onClick={() => void remove(item)}
                            >
                                <TbTrashX size={18} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {confirmEmpty ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="mr-auto text-sm">
                        {t('trash.confirmEmpty', { count: items.length })}
                    </span>
                    <button
                        type="button"
                        className={iconButton}
                        onClick={() => setConfirmEmpty(false)}
                    >
                        {t('cancelButton')}
                    </button>
                    <button
                        type="button"
                        data-testid="trash-empty-confirm"
                        className="text-white h-10 rounded-full bg-red-600 px-4 text-sm hover:bg-red-500"
                        onClick={() => void empty()}
                    >
                        {t('trash.emptyNow')}
                    </button>
                </div>
            ) : (
                <div className="flex justify-end">
                    <button
                        type="button"
                        disabled={items.length === 0}
                        className={`${iconButton} text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400`}
                        onClick={() => setConfirmEmpty(true)}
                    >
                        <TbTrashX size={18} />
                        {t('trash.emptyTrash')}
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Trash - the Trash row at the bottom of the Explorer for My projects (spec 004, part 5), with the
 * number of items in it. It opens the trash dialog. Items deleted from the tree go there and can
 * be restored for {@link TRASH_DAYS} days.
 */
function Trash() {
    const { t } = useTranslation();
    const [items, setItems] = useState<TrashItem[]>([]);
    const [isOpen, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const reload = useCallback(async () => {
        setItems((await localDrive()?.trashItems()) ?? []);
    }, []);

    useEffect(() => {
        const appMgr = AppMgr.getInstance();
        const onTree = () => void reload();
        appMgr.on(EventType.EVENT_FILESYS, onTree);
        void reload();
        return () => appMgr.removeHandler(EventType.EVENT_FILESYS, onTree);
    }, [reload]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen && dialog && !dialog.open) dialog.showModal();
        if (!isOpen && dialog?.open) dialog.close();
    }, [isOpen]);

    const open = () => {
        void reload();
        setOpen(true);
    };

    return (
        <>
            <button
                type="button"
                data-testid="trash-open"
                onClick={open}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-mountain-mist-800 hover:bg-mountain-mist-200 dark:text-mountain-mist-200 dark:hover:bg-shark-800"
            >
                <TbTrash size={18} />
                <span className="flex-1 text-left">{t('trash.title')}</span>
                {items.length > 0 && (
                    <span
                        data-testid="trash-count"
                        className="min-w-6 rounded-full bg-mountain-mist-200 px-2 text-center text-xs leading-5 dark:bg-shark-700"
                    >
                        {items.length}
                    </span>
                )}
            </button>
            <Dialog isOpen={false} toggleDialog={() => setOpen(false)} ref={dialogRef}>
                {isOpen && (
                    <TrashPanel items={items} onClose={() => setOpen(false)} onChanged={reload} />
                )}
            </Dialog>
        </>
    );
}

export default Trash;
