// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details
import Button from '@/widgets/button';
import { useTranslation } from 'react-i18next';
import { useDialogClose } from '@/components/dialogs/dialog-close';
import { IoWarning } from 'react-icons/io5';

type FirmwareBackupPromptDlgProps = {
    onBackupNow: () => void;
    onContinue: () => void;
    onCancel: () => void;
};

/**
 * FirmwareBackupPromptDlg
 *
 * Warning shown before the Firmware Loader opens. Reminds the user that
 * updating firmware or switching projects on the XRP can erase user files,
 * and offers them a chance to back up first.
 */
function FirmwareBackupPromptDlg({
    onBackupNow,
    onContinue,
    onCancel,
}: FirmwareBackupPromptDlgProps) {
    const { t } = useTranslation();
    useDialogClose(onCancel);

    return (
        <div className="flex h-auto w-136 max-w-[95vw] flex-col gap-3 rounded-md border border-mountain-mist-700 p-8 shadow-md transition-all dark:border-shark-500 dark:bg-shark-950">
            <div className="flex flex-row items-center gap-2">
                <IoWarning className="text-amber-500" size={28} />
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('firmwareBackupPromptTitle')}
                </h1>
            </div>
            <hr className="w-full border-mountain-mist-600 dark:border-matisse-200" />
            <p className="text-md text-mountain-mist-900 dark:text-mountain-mist-300">
                {t('firmwareBackupPromptBody1')}
            </p>
            <p className="text-md text-mountain-mist-900 dark:text-mountain-mist-300">
                {t('firmwareBackupPromptBody2')}
            </p>
            <hr className="w-full border-mountain-mist-600 dark:border-matisse-200" />
            <div className="flex w-full flex-row flex-wrap items-center justify-end gap-2">
                <Button onClicked={onCancel}>
                    <span className="whitespace-nowrap">{t('cancelButton')}</span>
                </Button>
                <Button onClicked={onContinue}>
                    <span className="whitespace-nowrap">
                        {t('firmwareBackupPromptContinue')}
                    </span>
                </Button>
                <Button onClicked={onBackupNow}>
                    <span className="whitespace-nowrap">
                        {t('firmwareBackupPromptBackupNow')}
                    </span>
                </Button>
            </div>
        </div>
    );
}

export default FirmwareBackupPromptDlg;
