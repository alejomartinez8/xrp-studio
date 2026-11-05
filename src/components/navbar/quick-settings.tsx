import { useTranslation } from 'react-i18next';
import { TbChevronRight, TbLanguage, TbPalette } from 'react-icons/tb';
import { findLanguage } from '@/utils/i18n/languages';
import { findAppTheme } from '@/theme/app-themes';
import { currentTheme } from '@/utils/theme';

type QuickSettingsProps = {
    onChooseLanguage: () => void;
    onChooseTheme: () => void;
};

/**
 * QuickSettings - language and theme rows at the top of the settings menu, each showing the
 * current choice and opening its picker.
 */
function QuickSettings({ onChooseLanguage, onChooseTheme }: QuickSettingsProps) {
    const { t, i18n } = useTranslation();

    return (
        <div className="text-neutral-200 flex flex-col gap-3 px-4 pb-3 pt-1">
            <button
                id="languageBtn"
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
                id="themeBtn"
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
        </div>
    );
}

export default QuickSettings;
