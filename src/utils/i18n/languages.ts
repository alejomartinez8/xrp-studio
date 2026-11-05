/** A language the app is translated to. */
export interface SupportedLanguage {
    /** i18next language code. */
    code: string;
    /** Name in the language itself, shown first. */
    nativeName: string;
    /** Name in English, shown below. */
    englishName: string;
}

/**
 * Languages offered by the language picker and Settings. Add an entry here (and its translation
 * files in `src/utils/i18n/locales/`) to offer a new language.
 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    { code: 'en', nativeName: 'English', englishName: 'English' },
    { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
];

/** The supported language for a code such as `es` or `es-ES`, if any. */
export function findLanguage(code: string): SupportedLanguage | undefined {
    const base = code.split('-')[0];
    return SUPPORTED_LANGUAGES.find((language) => language.code === base);
}
