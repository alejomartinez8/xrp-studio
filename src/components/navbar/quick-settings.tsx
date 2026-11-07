import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TbChevronRight, TbDownload, TbLanguage, TbPalette, TbUserCheck } from 'react-icons/tb';
import { findLanguage } from '@/utils/i18n/languages';
import { findAppTheme } from '@/theme/app-themes';
import { currentTheme } from '@/utils/theme';
import { installApp, usePwaState } from '@/utils/pwa';
import { isKeepSignedIn, setKeepSignedIn } from '@/utils/accounts';
import { isDriveSyncEnabled } from '@/utils/offline';

type QuickSettingsProps = {
    onChooseLanguage: () => void;
    onChooseTheme: () => void;
    idPrefix?: string;
};

/**
 * QuickSettings - language and theme rows at the top of the settings menu, each showing the
 * current choice and opening its picker, the "Keep me signed in" switch of this device when
 * accounts can sync (off by default: a shared device signs out and clears its projects, spec 005),
 * and Install app while the browser offers it (spec 001). The phone menu renders them a second
 * time, so it passes an `idPrefix` to keep the element ids unique.
 */
function QuickSettings({ onChooseLanguage, onChooseTheme, idPrefix = '' }: QuickSettingsProps) {
    const { t, i18n } = useTranslation();
    const { canInstall } = usePwaState();
    const [keepSignedIn, setKeep] = useState(isKeepSignedIn);

    return (
        <div className="text-neutral-200 flex flex-col gap-3 px-4 pb-3 pt-1">
            <button
                id={`${idPrefix}languageBtn`}
                type="button"
                onClick={onChooseLanguage}
                className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-matisse-400 dark:hover:bg-shark-500"
            >
                <span className="flex items-center gap-2">
                    <TbLanguage size={18} />
                    {t('language')}
                </span>
                <span className="flex items-center gap-1 opacity-80">
                    {findLanguage(i18n.language)?.nativeName}
                    <TbChevronRight size={16} />
                </span>
            </button>
            <button
                id={`${idPrefix}themeBtn`}
                type="button"
                onClick={onChooseTheme}
                className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-matisse-400 dark:hover:bg-shark-500"
            >
                <span className="flex items-center gap-2">
                    <TbPalette size={18} />
                    {t('theme.label')}
                </span>
                <span className="flex items-center gap-1 opacity-80">
                    {t(findAppTheme(currentTheme())?.labelKey ?? 'theme.light')}
                    <TbChevronRight size={16} />
                </span>
            </button>
            {isDriveSyncEnabled && (
                <button
                    id={`${idPrefix}keepSignedInBtn`}
                    type="button"
                    role="switch"
                    aria-checked={keepSignedIn}
                    title={t('account.keepSignedInHint')}
                    onClick={() => {
                        setKeepSignedIn(!keepSignedIn);
                        setKeep(!keepSignedIn);
                    }}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-matisse-400 dark:hover:bg-shark-500"
                >
                    <span className="flex items-center gap-2">
                        <TbUserCheck size={18} />
                        {t('account.keepSignedIn')}
                    </span>
                    <span
                        aria-hidden="true"
                        className={`relative h-5 w-9 rounded-full transition-colors ${keepSignedIn ? 'bg-curious-blue-400' : 'bg-shark-500'}`}
                    >
                        <span
                            className={`bg-white absolute top-0.5 h-4 w-4 rounded-full transition-all ${keepSignedIn ? 'left-[18px]' : 'left-0.5'}`}
                        />
                    </span>
                </button>
            )}
            {canInstall && (
                <button
                    id={`${idPrefix}installAppBtn`}
                    type="button"
                    onClick={() => installApp()}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-matisse-400 dark:hover:bg-shark-500"
                >
                    <TbDownload size={18} />
                    {t('pwa.install')}
                </button>
            )}
        </div>
    );
}

export default QuickSettings;
