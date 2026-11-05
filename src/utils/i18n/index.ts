import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enLang from '@/utils/i18n/locales/en/en.json';
import esLang from '@/utils/i18n/locales/es/es.json';
import enBlockly from '@/utils/i18n/locales/en/blockly.json';
import esBlockly from '@/utils/i18n/locales/es/blockly.json';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
    en: {
        translation: { ...enLang, blockly: enBlockly },
    },
    es: {
        translation: { ...esLang, blockly: esBlockly },
    },
};

i18n
    .use(LanguageDetector) // detect user language
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: ['en', 'es'],
        detection: {
            convertDetectedLanguage: (lng: string) => lng.split('-')[0],
        },
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;
