import { test, expect, type Page } from '@playwright/test';
import { expectInTree, openApp, setUpGoogle } from './support/app';

/**
 * Blocks files saved before the "Blocks | Python" selector hold only the blocks
 * JSON, with or without the `##XRPBLOCKS` marker and the date line. The Python view must show the
 * Python of their blocks all the same.
 */

type OldFormat = 'json-only' | 'marker-no-date' | 'python-and-marker';

/** Rewrite the stored content of the only blocks file to the given older format. */
async function rewriteSavedFile(page: Page, format: OldFormat): Promise<string> {
    return page.evaluate(async (fmt) => {
        const db: IDBDatabase = await new Promise((resolve, reject) => {
            const req = indexedDB.open('xrp-studio');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        const store = () => db.transaction('drive', 'readwrite').objectStore('drive');
        const all: { id: string; name: string; content?: string }[] = await new Promise((res) => {
            const req = store().getAll();
            req.onsuccess = () => res(req.result);
        });
        const record = all.find((r) => r.name.endsWith('.blocks'));
        if (!record || !record.content) {
            throw new Error('no blocks file');
        }
        const json = record.content.split('##XRPBLOCKS ').pop() as string;
        if (fmt === 'json-only') {
            record.content = json;
        } else if (fmt === 'marker-no-date') {
            record.content = '##XRPBLOCKS ' + json;
        } else {
            record.content = 'print("old")\n\n\n##XRPBLOCKS ' + json;
        }
        await new Promise((res) => {
            const req = store().put(record);
            req.onsuccess = () => res(null);
        });
        db.close();
        return record.name;
    }, format);
}

async function openTreeItem(page: Page, name: string): Promise<void> {
    await expectInTree(page, name);
    const tree = page.getByRole('tabpanel', { name: 'folders' }).getByRole('tree');
    await tree.getByRole('treeitem').filter({ hasText: name }).first().dblclick();
}

async function openFromTree(page: Page, name: string): Promise<void> {
    await openTreeItem(page, name);
    await expect(page.locator('.blocklyWorkspace .blocklyDraggable').first()).toBeVisible();
}

for (const format of ['json-only', 'marker-no-date', 'python-and-marker'] as const) {
    test.describe(`old blocks file (${format})`, () => {
        test.beforeEach(async ({ page, context }) => {
            await setUpGoogle(context);
            await openApp(page);
            await page.getByTestId('example-followLine').click();
            await page.getByRole('button', { name: 'Create', exact: true }).click();
            await expect(page.locator('.blocklyWorkspace .blocklyDraggable').first()).toBeVisible();
            await page.waitForTimeout(1500);
        });

        test('Python chosen after the file is open', async ({ page }) => {
            await rewriteSavedFile(page, format);
            await page.evaluate(() => localStorage.clear());
            await page.reload();
            const name = 'Follow a line.blocks';
            await openFromTree(page, name);
            await page.getByRole('radio', { name: 'Python' }).click();
            await expect(page.getByTestId('python-view')).toBeVisible();
            await expect(page.getByTestId('python-view')).toContainText('import');
        });

        test('Python chosen before the file finishes loading', async ({ page }) => {
            await rewriteSavedFile(page, format);
            await page.evaluate(() => localStorage.clear());
            await page.reload();
            await openTreeItem(page, 'Follow a line.blocks');
            await page.getByRole('radio', { name: 'Python' }).click();
            await expect(page.getByTestId('python-view')).toContainText('import');
        });
    });
}
