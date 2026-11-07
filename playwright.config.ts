import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a fake Google (see `e2e/support/google-mock.ts`). The app runs as a
 * development server with `GOOGLE_AUTH_URL=/api`, so the account features are on; the tests answer
 * every Google request themselves, so no credentials or internet are needed.
 */
const PORT = 3100;

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: { timeout: 15_000 },
    fullyParallel: true,
    workers: process.env.CI ? 2 : undefined,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        serviceWorkers: 'block',
        trace: 'off',
        ...devices['Desktop Chrome'],
    },
    webServer: {
        command: `node scripts/gen-firmware-manifests.mjs && npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { GOOGLE_AUTH_URL: '/api' },
    },
});
