import { test, expect, type Page } from '@playwright/test';
import { openApp, setUpGoogle } from './support/app';

/**
 * The block search field of the toolbox with real typing (spec 006, part 7). Blockly 13 moves the
 * focus with its own keyboard navigation, so the field must keep every letter, also after a second
 * tap, and Escape must clear it.
 */

/** Start a blocks project from the "Follow a line" example and wait for the workspace. */
async function openBlocksExample(page: Page): Promise<void> {
    await page.getByTestId('example-followLine').click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.blocklyWorkspace .blocklyDraggable').first()).toBeVisible();
}

/** The flyout that shows the blocks of the toolbox. */
function flyout(page: Page) {
    return page.locator('.blocklyToolboxFlyout');
}

test.beforeEach(async ({ page, context }) => {
    await setUpGoogle(context);
    await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await openApp(page);
    await openBlocksExample(page);
});

test('typing in the search shows the matching blocks', async ({ page }) => {
    const search = page.locator('.blocklyToolbox input');
    await search.click();
    await expect(flyout(page)).toContainText('Type to search for blocks');
    await page.keyboard.type('effort');
    await expect(search).toHaveValue('effort');
    await expect(flyout(page)).toContainText('Set effort Left:');
});

test('a second tap in the search keeps the text and the typing', async ({ page }) => {
    const search = page.locator('.blocklyToolbox input');
    await search.click();
    await page.keyboard.type('set');
    await search.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' effort');
    await expect(search).toHaveValue('set effort');
    await expect(flyout(page)).toContainText('Set effort Left:');
});

test('Escape clears the search', async ({ page }) => {
    const search = page.locator('.blocklyToolbox input');
    await search.click();
    await page.keyboard.type('led');
    await expect(flyout(page)).toContainText('LED');
    await page.keyboard.press('Escape');
    await expect(search).toHaveValue('');
    await expect(flyout(page)).toContainText('Type to search for blocks');
});
