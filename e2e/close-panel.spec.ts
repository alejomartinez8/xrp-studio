import { test, expect } from '@playwright/test';
import { openApp, setUpGoogle } from './support/app';

/**
 * The close button of the Terminal panel hides it like the Terminal icon does, and the icon
 * brings it back.
 */

test('the X in the Terminal header hides the panel and the Terminal icon reopens it', async ({
    page,
    context,
}) => {
    await setUpGoogle(context);
    await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await openApp(page);

    const toggle = page.getByTestId('terminal-toggle');
    const close = page.getByRole('button', { name: 'Close panel' });
    await expect(close).toHaveCount(0);

    await toggle.click();
    await expect(close).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await close.focus();
    await page.keyboard.press('Enter');
    await expect(close).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(close).toBeVisible();
});
