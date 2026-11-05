import { describe, expect, it } from 'vitest';
import enLang from '@/utils/i18n/locales/en/en.json';
import enOffline from '@/utils/i18n/locales/en/offline.json';
import esOffline from '@/utils/i18n/locales/es/offline.json';
import enLocalProjects from '@/utils/i18n/locales/en/local-projects.json';
import esLocalProjects from '@/utils/i18n/locales/es/local-projects.json';

/** Flatten nested translation objects into dotted keys. */
function keys(obj: object, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([key, value]) =>
        typeof value === 'object' && value !== null
            ? keys(value, `${prefix}${key}.`)
            : [`${prefix}${key}`],
    );
}

const overrides = [
    { name: 'offline', en: enOffline, es: esOffline },
    { name: 'local projects', en: enLocalProjects, es: esLocalProjects },
];

describe.each(overrides)('$name locale overrides', ({ en, es }) => {
    it('only override keys that exist in the base translations', () => {
        const base = new Set(keys(enLang));
        expect(keys(en).filter((key) => !base.has(key))).toEqual([]);
    });

    it('have the same keys in en and es', () => {
        expect(keys(es).sort()).toEqual(keys(en).sort());
    });
});
