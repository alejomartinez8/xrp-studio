import { test, expect, type Page } from '@playwright/test';
import { openApp, setUpGoogle } from './support/app';

/**
 * Code snippets in the Python editor (spec 003, part 7): clicking a snippet inserts its code at
 * the cursor with the import and setup lines it needs, without repeating them.
 */

/** The text of the Python editor, line by line, as the editor shows it. */
async function editorLines(page: Page): Promise<string[]> {
    const lines = page.locator('.monaco-editor .view-line');
    const items = await lines.evaluateAll((nodes) =>
        nodes
            .map((node) => ({
                top: parseFloat((node as HTMLElement).style.top),
                text: (node.textContent ?? '').replace(/\u00a0/g, ' '),
            }))
            .sort((a, b) => a.top - b.top)
            .map((line) => line.text),
    );
    return items;
}

test('inserts snippets with their imports and setup', async ({ page, context }) => {
    await setUpGoogle(context);
    await openApp(page);
    await page.getByRole('button', { name: /New Python project/ }).click();
    await page.locator('#welcome-project-name').fill('snippets');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.monaco-editor .view-lines')).toBeVisible();
    await page.locator('.monaco-editor .view-lines').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');

    const panel = page.getByTestId('snippet-panel');
    await expect(panel).toBeVisible();
    await panel.getByTestId('snippet-xrp_straight_effort').click();
    await panel.getByTestId('snippet-xrp_turn_effort').click();

    await expect
        .poll(() => editorLines(page))
        .toEqual([
            'from XRPLib.differential_drive import DifferentialDrive',
            'differentialDrive = DifferentialDrive.get_default_differential_drive()',
            '',
            'differentialDrive.straight(20, 0.5)',
            'differentialDrive.turn(90, 0.5)',
        ]);

    await page.keyboard.press('ControlOrMeta+Z');
    await expect.poll(async () => (await editorLines(page)).length).toBe(4);

    await panel.getByRole('button', { name: 'Hide code snippets' }).click();
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: 'Show code snippets' }).click();
    await expect(page.getByTestId('snippet-panel')).toBeVisible();
});
