import { test, expect, type Locator } from '@playwright/test';
import { openApp, setUpGoogle } from './support/app';

/**
 * The top bar menus must be drawn above every editor surface (spec 003, part 7): on a phone the
 * open menu was covered by the Blockly toolbox category strip.
 */

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page, context }) => {
    await setUpGoogle(context);
    await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await openApp(page);
    await page.getByTestId('example-followLine').click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.blocklyWorkspace .blocklyDraggable').first()).toBeVisible();
});

/** Whether the topmost element at a point is the element matched by the locator or inside it. */
async function isTopmostAt(item: Locator, x: number, y: number): Promise<boolean> {
    return item.evaluate(
        (element, point) => {
            const top = document.elementFromPoint(point.x, point.y);
            return !!top && element.contains(top);
        },
        { x, y },
    );
}

test('the phone menu is above the Blockly toolbox at its left edge', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    const toolbox = (await page.locator('.blocklyToolbox').boundingBox())!;
    const item = page.getByRole('menuitem').first();
    await expect(item).toBeVisible();
    const box = (await item.boundingBox())!;
    const x = toolbox.x + toolbox.width / 2;
    expect(box.x).toBeLessThan(x);
    expect(await isTopmostAt(item, x, box.y + box.height / 2)).toBe(true);
});

test.describe('desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false });

    test('the settings menu is above the editor surfaces', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        const item = page.locator('#keepSignedInBtn');
        await expect(item).toBeVisible();
        const box = (await item.boundingBox())!;
        expect(await isTopmostAt(item, box.x + 4, box.y + box.height / 2)).toBe(true);
    });
});
