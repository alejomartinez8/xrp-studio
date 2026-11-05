import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoClose } from 'react-icons/io5';
import { APP_THEMES, ThemePreview } from '@/theme/app-themes';
import { applyTheme, currentTheme } from '@/utils/theme';

type ThemeDialogProps = {
    toggleDialog: () => void;
};

/** Miniature of the app (top bar, folders, toolbox, canvas, Run button) in a theme's colours. */
function Preview({ colors }: { colors: ThemePreview }) {
    return (
        <div
            aria-hidden="true"
            className="flex h-28 w-full flex-col overflow-hidden rounded border"
            style={{ borderColor: colors.lines, background: colors.canvas }}
        >
            <div
                className="flex h-5 items-center justify-end gap-1 px-2"
                style={{ background: colors.header }}
            >
                <span className="h-2.5 w-6 rounded-full" style={{ background: colors.accent }} />
                <span className="bg-white/70 h-2.5 w-2.5 rounded-full" />
            </div>
            <div className="flex flex-1">
                <div
                    className="w-1/5 border-r"
                    style={{ background: colors.sidebar, borderColor: colors.lines }}
                />
                <div
                    className="flex w-1/4 flex-col gap-1.5 border-r p-1.5"
                    style={{ background: colors.toolbox, borderColor: colors.lines }}
                >
                    {['#df0c24', '#b88700', '#006edb', '#30a147'].map((color) => (
                        <span
                            key={color}
                            className="h-1.5 w-full rounded-sm"
                            style={{ background: color }}
                        />
                    ))}
                </div>
                <div className="flex-1 p-2">
                    <span
                        className="block h-3 w-3/5 rounded-sm"
                        style={{ background: '#006edb' }}
                    />
                    <span
                        className="mt-1 block h-3 w-2/5 rounded-sm"
                        style={{ background: '#30a147' }}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * ThemeDialog - one card per app theme with a preview. Choosing one applies it right away and
 * closes the dialog.
 */
function ThemeDialog({ toggleDialog }: ThemeDialogProps) {
    const { t } = useTranslation();
    const [current] = useState(currentTheme());

    const choose = (theme: (typeof APP_THEMES)[number]['id']) => {
        applyTheme(theme);
        toggleDialog();
    };

    return (
        <div className="flex max-h-[80vh] w-[min(90vw,48rem)] flex-col gap-4 rounded-md border border-mountain-mist-700 p-6 shadow-md dark:border-shark-500 dark:bg-shark-950">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('theme.choose')}
                </h1>
                <button
                    type="button"
                    onClick={toggleDialog}
                    aria-label={t('closeButton')}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-mountain-mist-700 hover:bg-mountain-mist-100 dark:text-mountain-mist-300 dark:hover:bg-shark-800"
                >
                    <IoClose size={22} />
                </button>
            </div>
            <hr className="w-full border-mountain-mist-600" />
            <ul className="grid grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">
                {APP_THEMES.map((theme) => {
                    const isCurrent = theme.id === current;
                    return (
                        <li key={theme.id}>
                            <button
                                id={`theme-${theme.id}`}
                                type="button"
                                aria-pressed={isCurrent}
                                onClick={() => choose(theme.id)}
                                className={`flex w-full flex-col items-center gap-2 rounded-md border p-3 transition-colors ${isCurrent ? 'border-curious-blue-600 bg-curious-blue-100 dark:bg-shark-800' : 'border-mountain-mist-300 hover:border-curious-blue-500 dark:border-shark-600'}`}
                            >
                                <Preview colors={theme.preview} />
                                <span className="font-semibold text-mountain-mist-900 dark:text-mountain-mist-200">
                                    {t(theme.labelKey)}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default ThemeDialog;
