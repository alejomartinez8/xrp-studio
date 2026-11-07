import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { openApp, setUpGoogle } from '../support/app';

/**
 * Visual regression (spec 007, part 1): key screens compared with the approved screenshots in
 * `__screenshots__`, in light and dark, at desktop, tablet and phone sizes. A difference fails the
 * test and the report shows the expected image, the new one and the difference. Run inside the
 * Playwright Docker image only (see `playwright.config.ts`).
 */

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

const SIZES = {
    desktop: { viewport: { width: 1280, height: 800 }, hasTouch: false },
    tablet: { viewport: { width: 800, height: 1280 }, hasTouch: true },
    phone: { viewport: { width: 390, height: 844 }, hasTouch: true },
} as const;

/** Toolbox categories with blocks, top level and inside the Sensors and Advanced groups. */
const CATEGORIES = [
    'Individual Motors',
    'DriveTrain',
    'Servos',
    'Distance',
    'Reflectance',
    'Gyro',
    'Accelerometer',
    'Control Board',
    'Logic',
    'Loops',
    'Math',
    'Variables',
    'Web Server',
    'Dashboard',
    'Gamepad',
    'Text',
    'Lists',
    'Functions',
];

const PYTHON_PROGRAM = 'from XRPLib.defaults import *\n\ndrivetrain.straight(20)\n';

/** How long the page must stay unchanged before it counts as settled. */
const QUIET_MS = 500;

/**
 * Open the app with the fake Google, in English and the given theme, on the welcome screen. It also
 * records the time of the last change to the page, for {@link settle}.
 */
async function openWelcome(page: Page, context: BrowserContext, theme: Theme): Promise<void> {
    await setUpGoogle(context);
    await context.addInitScript((value) => {
        localStorage.setItem('Theme', JSON.stringify(value));
        localStorage.setItem('i18nextLng', 'en');
        const record = () => {
            (window as unknown as { lastChange: number }).lastChange = performance.now();
        };
        record();
        new MutationObserver(record).observe(document, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
        });
    }, theme);
    await openApp(page);
    await settle(page);
}

/**
 * Wait until fonts and images are loaded and the page has not changed for a moment. Blockly
 * rebuilds the toolbox a few times while a project opens, and images load late on slow machines;
 * a screenshot or a click before that would vary from run to run.
 */
async function settle(page: Page): Promise<void> {
    await page.evaluate(() => document.fonts.ready);
    await expect
        .poll(() =>
            page.evaluate(() => Array.from(document.images).every((image) => image.complete)),
        )
        .toBe(true);
    await expect
        .poll(() =>
            page.evaluate(
                () => performance.now() - (window as unknown as { lastChange: number }).lastChange,
            ),
        )
        .toBeGreaterThan(QUIET_MS);
}

/** Start a blocks project from the "Follow a line" example and wait for the workspace. */
async function openBlocksExample(page: Page): Promise<void> {
    await page.getByTestId('example-followLine').click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.blocklyMainBackground')).toBeVisible();
    await expect(page.locator('.blocklyWorkspace .blocklyDraggable').first()).toBeVisible();
    await settle(page);
}

/** A toolbox category row by its label. */
function category(page: Page, name: string) {
    return page.locator('.blocklyToolboxCategory').filter({
        has: page.locator('.blocklyToolboxCategoryLabel', { hasText: new RegExp(`^${name}$`) }),
    });
}

/** The open toolbox flyout with the blocks of the selected category or search. */
function flyout(page: Page) {
    return page.locator('.blocklyFlyout').filter({ visible: true }).first();
}

for (const theme of THEMES) {
    for (const [size, options] of Object.entries(SIZES)) {
        test.describe(`${size}, ${theme}`, () => {
            test.use(options);

            test('welcome screen', async ({ page, context }) => {
                await openWelcome(page, context, theme);
                await expect(page).toHaveScreenshot(`welcome-${size}-${theme}.png`);
            });

            test('block editor with an example', async ({ page, context }) => {
                await openWelcome(page, context, theme);
                await openBlocksExample(page);
                await expect(page).toHaveScreenshot(`blocks-${size}-${theme}.png`);
            });
        });
    }

    test.describe(`desktop, ${theme}`, () => {
        test.use(SIZES.desktop);

        test('toolbox with each group open', async ({ page, context }) => {
            await openWelcome(page, context, theme);
            await openBlocksExample(page);
            const toolbox = page.locator('.blocklyToolbox');
            await category(page, 'Sensors').click();
            await expect(category(page, 'Accelerometer')).toBeVisible();
            await settle(page);
            await expect(toolbox).toHaveScreenshot(`toolbox-sensors-${theme}.png`);
            await category(page, 'Sensors').click();
            await category(page, 'Advanced').click();
            await category(page, 'Functions').scrollIntoViewIfNeeded();
            await expect(category(page, 'Functions')).toBeVisible();
            await settle(page);
            await expect(toolbox).toHaveScreenshot(`toolbox-advanced-${theme}.png`);
        });

        test('blocks of every toolbox category', async ({ page, context }) => {
            await openWelcome(page, context, theme);
            await openBlocksExample(page);
            await category(page, 'Sensors').click();
            await category(page, 'Advanced').click();
            for (const name of CATEGORIES) {
                await category(page, name).click();
                const slug = name.toLowerCase().replace(/ /g, '-');
                await settle(page);
                await expect.soft(flyout(page)).toHaveScreenshot(`category-${slug}-${theme}.png`);
            }
        });

        test('toolbox search', async ({ page, context }) => {
            await openWelcome(page, context, theme);
            await openBlocksExample(page);
            await page.locator('.blocklyToolbox input').fill('drive');
            await settle(page);
            await expect(flyout(page)).toHaveScreenshot(`toolbox-search-${theme}.png`);
        });

        test('Python editor', async ({ page, context }) => {
            await openWelcome(page, context, theme);
            await page.getByRole('button', { name: /New Python project/ }).click();
            await page.locator('#welcome-project-name').fill('robot');
            await page.getByRole('button', { name: 'Create', exact: true }).click();
            await page.locator('.monaco-editor .view-lines').click();
            await page.keyboard.type(PYTHON_PROGRAM);
            await page.keyboard.press('Escape');
            await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            await expect(page.getByTestId('save-status')).toHaveText('Saved');
            await settle(page);
            await expect(page).toHaveScreenshot(`python-${theme}.png`);
        });

        test('settings menu', async ({ page, context }) => {
            await openWelcome(page, context, theme);
            await page.getByRole('button', { name: 'Settings' }).click();
            await expect(page.locator('#keepSignedInBtn')).toBeVisible();
            await settle(page);
            await expect(page).toHaveScreenshot(`settings-menu-${theme}.png`);
        });
    });

    test.describe(`phone, ${theme}`, () => {
        test.use(SIZES.phone);

        test('phone menu', async ({ page, context }) => {
            await openWelcome(page, context, theme);
            await page.getByRole('button', { name: 'Menu' }).click();
            const keepSignedIn = page.locator('#mobile-keepSignedInBtn');
            await expect(keepSignedIn).toBeAttached();
            await settle(page);
            await expect(page).toHaveScreenshot(`phone-menu-${theme}.png`);
            await keepSignedIn.scrollIntoViewIfNeeded();
            await settle(page);
            await expect(page).toHaveScreenshot(`phone-menu-settings-${theme}.png`);
        });
    });
}
