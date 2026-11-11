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

    const flyout = page.getByTestId('snippet-flyout');
    await page.getByRole('button', { name: 'DriveTrain' }).click();
    await expect(flyout).toBeVisible();
    await flyout.getByTestId('snippet-xrp_straight_effort').click();
    await flyout.getByTestId('snippet-add-xrp_straight_effort').click();
    await flyout.getByTestId('snippet-xrp_turn_effort').click();
    await flyout.getByTestId('snippet-add-xrp_turn_effort').click();

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

    await page.getByRole('button', { name: 'Loops' }).click();
    await flyout.getByTestId('snippet-whileTrue').click();
    await flyout.getByTestId('snippet-add-whileTrue').click();
    await expect
        .poll(() => editorLines(page))
        .toEqual([
            'from XRPLib.differential_drive import DifferentialDrive',
            'differentialDrive = DifferentialDrive.get_default_differential_drive()',
            '',
            'differentialDrive.straight(20, 0.5)',
            '',
            'while True:',
            '    pass',
        ]);

    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('searchbox').fill('light');
    await expect(flyout.getByTestId('snippet-xrp_led_on')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(flyout).toBeHidden();
});

test('drags a snippet into the code with the pointer', async ({ page, context }) => {
    await setUpGoogle(context);
    await openApp(page);
    await page.getByRole('button', { name: /New Python project/ }).click();
    await page.locator('#welcome-project-name').fill('drag');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.monaco-editor .view-lines')).toBeVisible();
    await page.locator('.monaco-editor .view-lines').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('print("hi")\n\nprint("bye")');

    await page.getByRole('button', { name: 'Control Board' }).click();
    const chip = page.getByTestId('snippet-xrp_led_on');
    const from = (await chip.boundingBox())!;
    const lines = page.locator('.monaco-editor .view-line');
    const target = (await lines.last().boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + 300, target.y + target.height / 2, { steps: 12 });
    await expect(page.getByTestId('snippet-ghost')).toBeVisible();
    await page.mouse.up();

    await expect
        .poll(() => editorLines(page))
        .toEqual([
            'from XRPLib.board import Board',
            'board = Board.get_default_board()',
            '',
            'print("hi")',
            '',
            'print("bye")',
            'board.led_on()',
        ]);
});
