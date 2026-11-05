import { useTranslation } from 'react-i18next';
import { IoClose } from 'react-icons/io5';
import { SUPPORTED_LANGUAGES, findLanguage } from '@/utils/i18n/languages';

type LanguageDialogProps = {
    toggleDialog: () => void;
};

/**
 * LanguageDialog - grid of language cards (native name and English name). Choosing one switches
 * the app language right away and closes the dialog. Scales to many languages.
 */
function LanguageDialog({ toggleDialog }: LanguageDialogProps) {
    const { t, i18n } = useTranslation();
    const current = findLanguage(i18n.language)?.code;

    const choose = (code: string) => {
        i18n.changeLanguage(code);
        toggleDialog();
    };

    return (
        <div className="flex max-h-[80vh] w-[min(90vw,48rem)] flex-col gap-4 rounded-md border border-mountain-mist-700 p-6 shadow-md dark:border-shark-500 dark:bg-shark-950">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold text-mountain-mist-700 dark:text-mountain-mist-300">
                    {t('languageSelection')}
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
                {SUPPORTED_LANGUAGES.map((language) => {
                    const isCurrent = language.code === current;
                    return (
                        <li key={language.code}>
                            <button
                                id={`language-${language.code}`}
                                type="button"
                                lang={language.code}
                                aria-pressed={isCurrent}
                                onClick={() => choose(language.code)}
                                className={`flex w-full flex-col items-start gap-1 rounded-md border px-4 py-3 text-left transition-colors ${isCurrent ? 'border-curious-blue-600 bg-curious-blue-100 dark:bg-shark-800' : 'border-mountain-mist-300 hover:border-curious-blue-500 dark:border-shark-600'}`}
                            >
                                <span className="text-lg font-semibold text-curious-blue-600 dark:text-curious-blue-400">
                                    {language.nativeName}
                                </span>
                                <span className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                                    {language.englishName}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default LanguageDialog;
