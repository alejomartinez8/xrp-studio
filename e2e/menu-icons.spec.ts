import { test, expect, type Page } from '@playwright/test';
import { setUpGoogle } from './support/app';

/**
 * In the light theme the menu icons must be drawn dark on the light menus, in every language: the
 * icons used to be found by their translated alt text, so the Spanish UI left them almost invisible.
 */

test.use({ viewport: { width: 1280, height: 800 } });

const LANGUAGES = ['en', 'es'];
const THEMES = ['light', 'dark'];

async function open(page: Page, language: string, theme: string) {
    await page.context().addInitScript(
        ([lang, value]) => {
            localStorage.setItem('i18nextLng', lang);
            localStorage.setItem('Theme', JSON.stringify(value));
        },
        [language, theme],
    );
    await page.goto('/');
    await expect(page.locator('#helpBtn')).toBeVisible();
}

for (const language of LANGUAGES) {
    for (const theme of THEMES) {
        test(`Help menu icons in ${theme} (${language})`, async ({ page, context }) => {
            await setUpGoogle(context);
            await open(page, language, theme);
            await page.locator('#helpBtn').click();
            const icons = page.getByRole('menu').locator('img.menu-icon');
            await expect(icons.first()).toBeVisible();
            const filters = await icons.evaluateAll((all) =>
                all.map((img) => getComputedStyle(img).filter),
            );
            expect(filters.length).toBeGreaterThan(0);
            for (const filter of filters) {
                if (theme === 'light') {
                    expect(filter).toContain('brightness(0)');
                } else {
                    expect(filter).toBe('none');
                }
            }
        });
    }
}
