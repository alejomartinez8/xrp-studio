/**
 * Blockly Locale Setup
 *
 * Standard Blockly blocks use `blockly/msg/{lang}`.
 * Custom XRP blocks use strings from i18n (`blockly.msg`) merged into Blockly.Msg.
 */

import * as Blockly from 'blockly/core';
import type { Workspace } from 'blockly/core';
import * as EnMsg from 'blockly/msg/en';
import * as EsMsg from 'blockly/msg/es';
import i18n from '@/utils/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localeMessages: Record<string, any> = {
    en: EnMsg,
    es: EsMsg,
};

export function getSupportedLanguages(): string[] {
    return Object.keys(localeMessages);
}

export function isLanguageSupported(language: string): boolean {
    return language in localeMessages;
}

function getCustomBlocklyMessages(language: string): Record<string, string> {
    const t = i18n.getFixedT(language);
    const msgs = t('blockly.msg', { returnObjects: true });
    if (msgs && typeof msgs === 'object' && !Array.isArray(msgs)) {
        return msgs as Record<string, string>;
    }
    return {};
}

/**
 * Apply Blockly core locale plus custom XRP block messages from i18n.
 * Accepts regional codes such as es-ES or es-419 by using their base language.
 */
export function applyBlocklyLocale(language: string): void {
    const defaultLanguage = 'en';
    const baseLanguage = language.split('-')[0];
    const targetLanguage = isLanguageSupported(baseLanguage) ? baseLanguage : defaultLanguage;
    const coreMessages = localeMessages[targetLanguage];
    const customMessages = getCustomBlocklyMessages(targetLanguage);

    try {
        Blockly.setLocale({ ...coreMessages, ...customMessages });
    } catch (error) {
        console.warn(
            `Failed to set Blockly locale to ${targetLanguage}, defaulting to ${defaultLanguage}:`,
            error,
        );
        Blockly.setLocale({
            ...localeMessages[defaultLanguage],
            ...getCustomBlocklyMessages(defaultLanguage),
        });
    }
}

/** @deprecated Use applyBlocklyLocale instead */
export function setBlocklyLocale(language: string): void {
    applyBlocklyLocale(language);
}

/**
 * Reload workspace blocks so labels pick up the current Blockly.Msg values.
 */
export function refreshBlocklyWorkspace(workspace: Workspace): void {
    if (workspace.getAllBlocks(false).length === 0) {
        return;
    }
    try {
        Blockly.Events.disable();
        const state = Blockly.serialization.workspaces.save(workspace);
        workspace.clear();
        Blockly.serialization.workspaces.load(state, workspace);
    } catch (error) {
        console.warn('Failed to refresh Blockly workspace after locale change:', error);
    } finally {
        Blockly.Events.enable();
    }
}
