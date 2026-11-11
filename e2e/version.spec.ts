import { test, expect } from '@playwright/test';
import { openApp, setUpGoogle } from './support/app';

/** App version: shown in the status bar and the Change Log opens on a new version. */

test('the status bar shows the version and the XRPWeb base', async ({ page, context }) => {
    await setUpGoogle(context);
    await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await openApp(page);
    const version = page.getByTestId('app-version');
    await expect(version).toHaveText(/^\d+\.\d+\.\d+/);
    await expect(version).toHaveAttribute('title', /^Based on XRPWeb \d+\.\d+\.\d+$/);
});

test('the fork Change Log opens the first time and again when the version changes', async ({
    page,
    context,
}) => {
    await context.addInitScript(() => {
        if (localStorage.getItem('i18nextLng') === null) {
            localStorage.setItem('i18nextLng', 'en');
        }
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Change Log' })).toBeVisible();
    await expect(page.getByTestId('about-version')).toContainText('Based on XRPWeb');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Change Log' })).toHaveCount(0);
    await page.evaluate(() => localStorage.setItem('Version', '0.0.1'));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Change Log' })).toBeVisible();
});
