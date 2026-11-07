import { expect, type BrowserContext, type Page } from '@playwright/test';
import { MockGoogle } from './google-mock';

/** App version stored by the app once the change log was shown (`Constants.APP_VERSION`). */
const SEEN_VERSION = '2.1.0';

/** What a test gets: a context with the fake Google installed. */
export type Setup = { mock: MockGoogle; context: BrowserContext };

/** Install the fake Google on a context and skip the first-visit change log. */
export async function setUpGoogle(context: BrowserContext, mock = new MockGoogle()) {
    await mock.install(context);
    await context.addInitScript((version) => {
        if (localStorage.getItem('Version') === null) {
            localStorage.setItem('Version', version);
        }
    }, SEEN_VERSION);
    return mock;
}

/** Open the app and wait until My projects is ready. */
export async function openApp(page: Page): Promise<void> {
    await page.goto('/');
    await expect(
        page.getByRole('heading', { name: 'What do you want to make today?' }),
    ).toBeVisible();
}

/**
 * Sign in with the fake account and wait until the account menu shows and the first sync is done
 * (the account's space is only ready then; a project made earlier would land in the guest space). When the device has
 * guest projects, `guest` answers the question about moving them into the account.
 */
export async function signIn(page: Page, guest?: 'move' | 'keep'): Promise<void> {
    await page.locator('#signInBtn').click();
    if (guest) {
        const question = page.getByTestId('ask-dialog');
        await expect(question).toContainText('Projects on this device');
        await question
            .getByRole('button', {
                name: guest === 'move' ? 'Move to my account' : 'Leave them here',
            })
            .click();
    }
    await expect(page.locator('#accountBtn')).toBeVisible();
    await expect(syncStatus(page)).toHaveAttribute('data-status', 'synced');
}

/** Sign out from the account menu. */
export async function openSignOut(page: Page): Promise<void> {
    await page.locator('#accountBtn').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
}

/**
 * Make the idle sign-out of a shared device (30 minutes, `IDLE_SIGN_OUT_MS`) last two seconds, so
 * a test does not have to wait. Only that one timer is shortened; the page's clock is untouched.
 */
export async function shortenIdleSignOut(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
        const original = window.setTimeout.bind(window);
        window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
            original(
                handler,
                delay === 30 * 60 * 1000 ? 2000 : delay,
                ...args,
            )) as typeof setTimeout;
    });
}

/** Open the Explorer panel when it is closed, and return the folder tree. */
export async function showTree(page: Page) {
    const tree = page.getByRole('tree');
    if (!(await tree.isVisible())) {
        await page.getByTitle('Explorer').first().click();
    }
    await expect(tree).toBeVisible();
    const folder = tree.getByRole('treeitem').first();
    if ((await folder.getAttribute('aria-expanded')) === 'false') {
        await folder.click();
    }
    return tree;
}

/**
 * Wait until a project file is in the folder tree (or, with `present` false, is not). The tree is
 * opened and its folder expanded again on every try, because syncing can rebuild it.
 */
export async function expectInTree(page: Page, name: string, present = true): Promise<void> {
    await expect(async () => {
        const tree = await showTree(page);
        const item = tree.getByRole('treeitem').filter({ hasText: name });
        if (present) {
            await expect(item).toBeVisible({ timeout: 1000 });
        } else {
            await expect(item).toHaveCount(0, { timeout: 1000 });
        }
    }).toPass({ timeout: 15_000 });
}

/** Create a Python project from the welcome screen. */
export async function createPythonProject(page: Page, name: string): Promise<void> {
    await page.getByRole('button', { name: /New Python project/ }).click();
    await page.locator('#welcome-project-name').fill(name);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('#welcome-project-name')).toBeHidden();
}

/** Turn "Keep me signed in" on or off in the settings menu. */
export async function setKeepSignedIn(page: Page, on: boolean): Promise<void> {
    await page.getByRole('button', { name: 'Settings' }).click();
    const toggle = page.locator('#keepSignedInBtn');
    if ((await toggle.getAttribute('aria-checked')) !== String(on)) {
        await toggle.click();
    }
    await expect(toggle).toHaveAttribute('aria-checked', String(on));
    await page.keyboard.press('Escape');
}

/** The cloud in the status bar. */
export function syncStatus(page: Page) {
    return page.getByTestId('sync-status');
}
