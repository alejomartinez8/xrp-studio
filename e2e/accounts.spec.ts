import { test, expect } from '@playwright/test';
import {
    createPythonProject,
    openApp,
    openSignOut,
    setKeepSignedIn,
    setUpGoogle,
    shortenIdleSignOut,
    signIn,
    syncStatus,
    expectInTree,
    keepSignedInSwitch,
} from './support/app';

const SYNCED = /Saved in your account/;
const SYNCING = /Saving to your account/;
const OFFLINE = /No connection/;

test.describe('signing in', () => {
    test('opens My projects first and signs in with the fake account', async ({
        page,
        context,
    }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await expect(page.locator('#signInBtn')).toBeVisible();
        await expect(syncStatus(page)).toHaveAttribute('title', /Saved on this device only/);

        await signIn(page);

        await expect(page.locator('#accountBtn')).toHaveAttribute('aria-label', mock.account.email);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        expect(mock.signIns).toBe(1);
        expect(mock.find('XRPCode')?.parents).toEqual(['root']);
    });

    test('uploads a new project to the account', async ({ page, context }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await createPythonProject(page, 'robot');

        await expect.poll(() => mock.find('robot.py')?.parents).toEqual([mock.find('XRPCode')?.id]);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        await expectInTree(page, 'robot.py');
    });

    test('brings in the projects the account already has', async ({ page, context }) => {
        const mock = await setUpGoogle(context);
        mock.addRemoteFile('from_other_device.py', 'print("hi")\n');
        await openApp(page);
        await signIn(page);

        await expectInTree(page, 'from_other_device.py');
    });
});

test.describe('guest projects', () => {
    test('moves them into the account when asked', async ({ page, context }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await createPythonProject(page, 'guest');
        await signIn(page, 'move');

        await expect.poll(() => mock.find('guest.py')?.parents).toEqual([mock.find('XRPCode')?.id]);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
    });

    test('leaves them on the device when asked', async ({ page, context }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await createPythonProject(page, 'guest');
        await signIn(page, 'keep');

        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        expect(mock.find('guest.py')).toBeUndefined();
        await openSignOut(page);
        await expect(page.locator('#signInBtn')).toBeVisible();
        await expectInTree(page, 'guest.py');
    });
});

test.describe('Keep me signed in', () => {
    test('is off by default', async ({ page, context }) => {
        await setUpGoogle(context);
        await openApp(page);
        await page.getByRole('button', { name: 'Settings' }).click();
        await expect(keepSignedInSwitch(page)).toHaveAttribute('aria-checked', 'false');
    });

    test('off: a reload forgets the session and removes the projects from the device', async ({
        page,
        context,
    }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await createPythonProject(page, 'shared');
        await expect.poll(() => mock.find('shared.py')).toBeTruthy();
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);

        await page.reload();

        await expect(page.locator('#signInBtn')).toBeVisible();
        await expect(page.locator('#accountBtn')).toHaveCount(0);
        await expectInTree(page, 'shared.py', false);
        expect(mock.find('shared.py')).toBeTruthy();

        await signIn(page);
        await expectInTree(page, 'shared.py');
    });

    test('off: signs out after 30 minutes without use', async ({ page, context }) => {
        const mock = await setUpGoogle(context);
        await shortenIdleSignOut(context);
        await openApp(page);
        await signIn(page);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);

        await expect(page.locator('#signInBtn')).toBeVisible({ timeout: 8000 });
        expect(mock.sessionActive).toBe(false);
    });

    test('on: the session and the projects stay after a reload', async ({ page, context }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await setKeepSignedIn(page, true);
        await signIn(page);
        await createPythonProject(page, 'mine');
        await expect.poll(() => mock.find('mine.py')).toBeTruthy();
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);

        await page.reload();

        await expect(page.locator('#accountBtn')).toHaveAttribute('aria-label', mock.account.email);
        await expectInTree(page, 'mine.py');
        expect(mock.signIns).toBe(1);
    });

    test('on: does not sign out when the device is idle', async ({ page, context }) => {
        await setUpGoogle(context);
        await shortenIdleSignOut(context);
        await openApp(page);
        await setKeepSignedIn(page, true);
        await signIn(page);

        await page.waitForTimeout(4000);

        await expect(page.locator('#accountBtn')).toBeVisible();
    });

    test('turning it on while signed in keeps the session after a reload', async ({
        page,
        context,
    }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await setKeepSignedIn(page, true);

        await page.reload();

        await expect(page.locator('#accountBtn')).toHaveAttribute('aria-label', mock.account.email);
    });
});

test.describe('sync status', () => {
    test('shows the cloud while saving and when saved', async ({ page, context }) => {
        await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);

        await createPythonProject(page, 'status');

        await expect(syncStatus(page)).toHaveAttribute('title', SYNCING);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
    });

    test('shows no connection, then saves everything when back online', async ({
        page,
        context,
    }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);

        mock.setReachable(false);
        await context.setOffline(true);
        await createPythonProject(page, 'while_offline');
        await expect(syncStatus(page)).toHaveAttribute('title', OFFLINE);
        expect(mock.find('while_offline.py')).toBeUndefined();

        mock.addRemoteFile('from_other_device.py', 'print(1)\n');
        mock.setReachable(true);
        await context.setOffline(false);

        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        expect(mock.find('while_offline.py')).toBeTruthy();
        await expectInTree(page, 'from_other_device.py');
    });
});

test.describe('signing out', () => {
    test('with everything saved, signs out at once and removes the projects from the device', async ({
        page,
        context,
    }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await createPythonProject(page, 'saved');
        await expect.poll(() => mock.find('saved.py')).toBeTruthy();
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);

        await openSignOut(page);

        await expect(page.locator('#signInBtn')).toBeVisible();
        await expect(page.getByTestId('ask-dialog')).toHaveCount(0);
        await expectInTree(page, 'saved.py', false);
        expect(mock.sessionActive).toBe(false);
        expect(mock.find('saved.py')).toBeTruthy();

        await signIn(page);
        await expectInTree(page, 'saved.py');
    });

    test('with unsynced changes, warns and lets the user stay signed in', async ({
        page,
        context,
    }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        mock.setReachable(false);
        await createPythonProject(page, 'unsynced');
        await expect(syncStatus(page)).toHaveAttribute('title', OFFLINE);

        await openSignOut(page);
        const question = page.getByTestId('ask-dialog');
        await expect(question).toContainText('Changes not saved to your account');
        await question.getByRole('button', { name: 'Stay signed in' }).click();

        await expect(page.locator('#accountBtn')).toBeVisible();

        mock.setReachable(true);
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        expect(mock.find('unsynced.py')).toBeTruthy();
    });

    test('with unsynced changes, signing out anyway loses them', async ({ page, context }) => {
        const mock = await setUpGoogle(context);
        await openApp(page);
        await signIn(page);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        mock.setReachable(false);
        await createPythonProject(page, 'lost');
        await expect(syncStatus(page)).toHaveAttribute('title', OFFLINE);

        await openSignOut(page);
        await page
            .getByTestId('ask-dialog')
            .getByRole('button', { name: 'Sign out anyway' })
            .click();

        await expect(page.locator('#signInBtn')).toBeVisible();
        mock.setReachable(true);
        await signIn(page);
        await expect(syncStatus(page)).toHaveAttribute('title', SYNCED);
        await expectInTree(page, 'lost.py', false);
        expect(mock.find('lost.py')).toBeUndefined();
    });
});
