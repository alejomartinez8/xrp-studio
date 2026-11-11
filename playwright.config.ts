import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests. The app runs as a development server with `GOOGLE_AUTH_URL=/api`,
 * so the account features are on; the tests answer every Google request themselves (see
 * `e2e/support/google-mock.ts`), so no credentials or internet are needed.
 *
 * Two projects:
 * - `accounts`: accounts and sync; runs in any Chromium.
 * - `visual`: screenshots compared with the approved ones in `e2e/visual/__screenshots__`.
 *   Fonts and rendering differ between machines, so it only runs inside the
 *   official Playwright Docker image (`scripts/e2e-docker.mjs`, which sets `E2E_DOCKER`), the same
 *   one CI uses, and is left out of plain local runs.
 */
const PORT = 3100;
const inDocker = Boolean(process.env.E2E_DOCKER);

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: {
        timeout: 15_000,
        toHaveScreenshot: {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.001,
            stylePath: './e2e/visual/screenshot.css',
        },
    },
    snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
    fullyParallel: true,
    workers: process.env.CI ? 2 : undefined,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        serviceWorkers: 'block',
        trace: 'off',
        ...devices['Desktop Chrome'],
        locale: 'en-US',
    },
    projects: [
        { name: 'accounts', testIgnore: 'visual/**' },
        ...(inDocker ? [{ name: 'visual', testDir: './e2e/visual' }] : []),
    ],
    webServer: {
        command: `node scripts/gen-firmware-manifests.mjs && npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { GOOGLE_AUTH_URL: '/api' },
    },
});
