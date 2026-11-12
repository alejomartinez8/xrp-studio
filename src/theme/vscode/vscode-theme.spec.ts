import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_THEMES } from '@/theme/app-themes';
import { activeBlockTheme } from '@/theme';

const HEX = /^#[0-9a-f]{6}$/i;
const appCss = readFileSync('src/theme/vscode/app.css', 'utf8');

/** Relative luminance of a #rrggbb colour (WCAG 2). */
function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** Value of a CSS variable declared in the first `selector { ... }` block of app.css. */
function cssVar(selector: string, name: string): string {
    const block = appCss.slice(appCss.indexOf(`${selector} {`));
    const match = new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(block);
    if (!match) throw new Error(`${name} not found in ${selector}`);
    return match[1];
}

describe('VS Code theme', () => {
    it('gives every block category and editor surface a colour', () => {
        expect(activeBlockTheme.name).toBe('vscode');
        Object.values(activeBlockTheme.categories).forEach((c) => expect(c).toMatch(HEX));
        for (const mode of ['light', 'dark'] as const) {
            const surfaces = activeBlockTheme.surfaces[mode];
            expect(Object.keys(surfaces).sort()).toEqual(
                ['flyout', 'grid', 'toolbox', 'toolboxText', 'workspace'].sort(),
            );
            Object.values(surfaces).forEach((c) => expect(c).toMatch(HEX));
        }
    });

    it('keeps block text readable on the toolbox of each variant', () => {
        expect(contrast('#333333', activeBlockTheme.surfaces.light.toolbox)).toBeGreaterThan(4.5);
        expect(contrast('#cccccc', activeBlockTheme.surfaces.dark.toolbox)).toBeGreaterThan(4.5);
    });

    it('offers a preview with every colour for each theme', () => {
        for (const theme of APP_THEMES) {
            Object.values(theme.preview).forEach((c) => expect(c).toMatch(HEX));
        }
    });

    it('has AA contrast for the status bar text in both variants', () => {
        for (const selector of [':root', 'html.dark']) {
            expect(
                contrast(
                    cssVar(selector, '--app-status-bar-text'),
                    cssVar(selector, '--app-status-bar'),
                ),
            ).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('has AA contrast for tab text on the tab bar in both variants', () => {
        expect(
            contrast('#616161', cssVar('html .flexlayout__layout', '--flexlayout-color-1')),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
            contrast(
                cssVar('html.dark .flexlayout__layout', '--flexlayout-color-tab-unselected'),
                cssVar('html.dark .flexlayout__layout', '--flexlayout-color-1'),
            ),
        ).toBeGreaterThanOrEqual(4.5);
    });
});
