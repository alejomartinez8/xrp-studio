import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TbArchive, TbArchiveOff } from 'react-icons/tb';
import AppMgr, { EventType } from '@/managers/appmgr';
import { ArchivedItem } from '@/services/local-drive';
import Dialog from '@/components/dialogs/dialog';
import { useDialogClose } from '@/components/dialogs/dialog-close';
import ItemIcon from '@/components/item-icon';
import { localDrive, refreshTree } from '@/utils/hidden-items';
import { Constants } from '@/utils/constants';

/** The archived projects dialog: see them and bring them back to the Explorer. */
function ArchivedPanel({
    items,
    onClose,
    onChanged,
}: {
    items: ArchivedItem[];
    onClose: () => void;
    onChanged: () => Promise<void>;
}) {
    const { t } = useTranslation();
    useDialogClose(onClose);

    const unarchive = async (item: ArchivedItem) => {
        const drive = localDrive();
        if (drive) {
            const root = await drive.ensureRootFolder(Constants.XRPCODE);
            await drive.unarchiveFile(item.id, root.id);
            await onChanged();
            refreshTree();
        }
    };

    return (
        <div
            data-testid="archived-panel"
            className="flex w-md max-w-full flex-col gap-3 p-6 text-mountain-mist-900 dark:text-mountain-mist-200"
        >
            <div className="flex flex-col gap-1 pr-10">
                <h1 className="flex items-center gap-2 text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    <TbArchive size={22} />
                    {t('archived.title')}
                </h1>
                <span className="text-sm text-mountain-mist-600 dark:text-mountain-mist-400">
                    {t('archived.hint')}
                </span>
            </div>
            {items.length === 0 ? (
                <p className="py-6 text-center text-mountain-mist-600 dark:text-mountain-mist-400">
                    {t('archived.empty')}
                </p>
            ) : (
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            data-testid="archived-item"
                            className="flex items-center gap-2 rounded-md bg-mountain-mist-100 py-1 pl-3 pr-1 dark:bg-shark-900"
                        >
                            <span className="text-mountain-mist-600 dark:text-mountain-mist-400">
                                <ItemIcon item={item} />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                            <button
                                type="button"
                                className="flex h-10 items-center justify-center gap-1 rounded-full px-3 text-sm text-mountain-mist-800 hover:bg-mountain-mist-200 dark:text-mountain-mist-200 dark:hover:bg-shark-800"
                                onClick={() => void unarchive(item)}
                            >
                                <TbArchiveOff size={18} />
                                {t('archived.unarchive')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Archived - the Archived row at the bottom of the Explorer for My projects (spec 004, part 6),
 * shown while there are archived projects, with how many. It opens the archived projects dialog.
 * Archived projects are hidden from the tree without being deleted.
 */
function Archived() {
    const { t } = useTranslation();
    const [items, setItems] = useState<ArchivedItem[]>([]);
    const [isOpen, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const reload = useCallback(async () => {
        setItems((await localDrive()?.archivedItems()) ?? []);
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
            {(items.length > 0 || isOpen) && (
                <button
                    type="button"
                    data-testid="archived-open"
                    onClick={open}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-mountain-mist-800 hover:bg-mountain-mist-200 dark:text-mountain-mist-200 dark:hover:bg-shark-800"
                >
                    <TbArchive size={18} />
                    <span className="flex-1 text-left">{t('archived.row')}</span>
                    <span
                        data-testid="archived-count"
                        className="min-w-6 rounded-full bg-mountain-mist-200 px-2 text-center text-xs leading-5 dark:bg-shark-700"
                    >
                        {items.length}
                    </span>
                </button>
            )}
            <Dialog isOpen={false} toggleDialog={() => setOpen(false)} ref={dialogRef}>
                {isOpen && (
                    <ArchivedPanel
                        items={items}
                        onClose={() => setOpen(false)}
                        onChanged={reload}
                    />
                )}
            </Dialog>
        </>
    );
}

export default Archived;
