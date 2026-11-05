import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TbChevronRight, TbLanguage, TbMoon, TbSun } from 'react-icons/tb';
import { findLanguage } from '@/utils/i18n/languages';
import { Themes } from '@/managers/appmgr';
import { applyTheme, currentTheme } from '@/utils/theme';

/**
 * QuickSettings - language and theme at the top of the settings menu. The language row opens the
 * language picker; the theme applies immediately.
 */
function QuickSettings({ onChooseLanguage }: { onChooseLanguage: () => void }) {
    const { t, i18n } = useTranslation();
    const [theme, setThemeState] = useState(currentTheme());

    const chooseTheme = (next: Themes) => {
        applyTheme(next);
        setThemeState(next);
    };

    const option = (isActive: boolean) =>
        `flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-curious-blue-600 text-white' : 'text-neutral-200 hover:bg-matisse-400 dark:hover:bg-shark-500'}`;

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
            <div className="flex flex-col gap-1">
                <span className="text-xs uppercase opacity-80">{t('theme.label')}</span>
                <div className="flex gap-1" role="group" aria-label={t('theme.label')}>
                    <button
                        type="button"
                        aria-pressed={theme === Themes.LIGHT}
                        className={option(theme === Themes.LIGHT)}
                        onClick={() => chooseTheme(Themes.LIGHT)}
                    >
                        <TbSun size={16} />
                        {t('theme.light')}
                    </button>
                    <button
                        type="button"
                        aria-pressed={theme === Themes.DARK}
                        className={option(theme === Themes.DARK)}
                        onClick={() => chooseTheme(Themes.DARK)}
                    >
                        <TbMoon size={16} />
                        {t('theme.dark')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default QuickSettings;
