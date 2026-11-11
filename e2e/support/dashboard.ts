import { expect, type Page } from '@playwright/test';

/** One fake robot reading for the built-in dashboard sensors. */
export type FakeReading = {
    accelerometer?: { accX: number; accY: number; accZ: number };
    gyro?: { pitch: number; roll: number; yaw: number };
};

/**
 * A fixed series of accelerometer and gyroscope readings: smooth waves, the same on every run, so
 * dashboard screenshots can be compared.
 */
export function fakeReadings(count = 40): FakeReading[] {
    return Array.from({ length: count }, (_, i) => ({
        accelerometer: {
            accX: Math.round(Math.sin(i / 4) * 300) / 100,
            accY: Math.round(Math.cos(i / 6) * 200) / 100,
            accZ: Math.round((9.8 + Math.sin(i / 3) * 0.5) * 100) / 100,
        },
        gyro: {
            pitch: Math.round(Math.sin(i / 5) * 4500) / 100,
            roll: Math.round(Math.cos(i / 4) * 3000) / 100,
            yaw: Math.round((i * 4.5 - 90) * 100) / 100,
        },
    }));
}

/** Open the dashboard tab from the Settings menu. */
export async function openDashboard(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page
        .locator('li')
        .filter({ visible: true, hasText: /^Dashboard$/ })
        .click();
    await expect(page.getByRole('heading', { name: 'Sensors' })).toBeVisible();
}

/** Add a built-in sensor widget (by its menu label) from the dashboard's add menu. */
export async function addSensorWidget(page: Page, label: string): Promise<void> {
    await page
        .locator('h1', { hasText: 'Sensors' })
        .locator('..')
        .getByRole('button')
        .last()
        .click();
    await page.getByRole('menuitem', { name: label, exact: true }).click();
}

/** Switch the first sensor widget with this title to the graph view from its settings menu. */
export async function showGraph(page: Page, title: string): Promise<void> {
    const card = page
        .locator('.sensor-card')
        .filter({ has: page.getByRole('heading', { name: title }) })
        .first();
    await card.getByRole('button').first().click();
    await page.getByRole('menuitem', { name: 'Graph' }).filter({ visible: true }).click();
}

/**
 * Make the first sensor widget with this title bigger by dragging its bottom-right corner, as a
 * user would, by the given number of pixels.
 */
export async function resizeWidget(page: Page, title: string, dx: number, dy: number) {
    const item = page
        .locator('.grid-stack-item')
        .filter({ has: page.getByRole('heading', { name: title }) })
        .first();
    await item.hover();
    const box = await item.locator('.ui-resizable-se').boundingBox();
    if (!box) throw new Error(`No resize handle on ${title}`);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
    await page.mouse.move(x + dx, y + dy, { steps: 5 });
    await page.mouse.up();
}

/**
 * Send fake readings to the dashboard without a robot, through the same event the robot
 * connection emits (`EVENT_DASHBOARD_DATA`). The development server serves the app's modules, so
 * importing the app manager here gives the page's own instance. Readings are spaced out so each
 * one is rendered and kept in the widgets' history.
 */
export async function feedDashboard(page: Page, readings: FakeReading[], gapMs = 30) {
    await page.evaluate(
        async ({ readings, gapMs }) => {
            const path = '/src/managers/appmgr.ts';
            const { default: AppMgr, EventType } = await import(/* @vite-ignore */ path);
            for (const reading of readings) {
                AppMgr.getInstance().emit(EventType.EVENT_DASHBOARD_DATA, JSON.stringify(reading));
                await new Promise((resolve) => setTimeout(resolve, gapMs));
            }
        },
        { readings, gapMs },
    );
}
