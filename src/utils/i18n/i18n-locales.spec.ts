import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import enLang from '@/utils/i18n/locales/en/en.json';
import esLang from '@/utils/i18n/locales/es/es.json';
import enBlockly from '@/utils/i18n/locales/en/blockly.json';
import esBlockly from '@/utils/i18n/locales/es/blockly.json';
import { applyBlocklyLocale } from '@/utils/blockly-locales';

/** Flatten nested translation objects into dotted keys. */
function keysOf(obj: object, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([key, value]) =>
        value && typeof value === 'object'
            ? keysOf(value as object, `${prefix}${key}.`)
            : [`${prefix}${key}`],
    );
}

describe('translation files', () => {
    it('es.json has the same keys as en.json', () => {
        expect(keysOf(esLang).sort()).toEqual(keysOf(enLang).sort());
    });

    it('es blockly.json has the same keys as en blockly.json', () => {
        expect(keysOf(esBlockly).sort()).toEqual(keysOf(enBlockly).sort());
    });
});

describe('applyBlocklyLocale', () => {
    it.each(['es', 'es-ES', 'es-419'])('uses Spanish block text for %s', (language) => {
        applyBlocklyLocale(language);
        expect(Blockly.Msg['XRP_EFFORT']).toBe(esBlockly.msg.XRP_EFFORT);
    });

    it('falls back to English for unsupported languages', () => {
        applyBlocklyLocale('fr-FR');
        expect(Blockly.Msg['XRP_EFFORT']).toBe(enBlockly.msg.XRP_EFFORT);
    });
});
