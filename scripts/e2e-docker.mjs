/**
 * Runs the end-to-end tests inside the official Playwright Docker image (spec 007), so screenshots
 * are taken with the same browser, fonts and rendering on every machine and in CI. The image
 * version follows the installed `@playwright/test`. Extra arguments go to `playwright test`, for
 * example `--project visual --update-snapshots` to approve new screenshots.
 *
 * Needs Docker and `npm ci` (the container uses this checkout and its `node_modules`).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
    readFileSync(new URL('../node_modules/@playwright/test/package.json', import.meta.url), 'utf8'),
);
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const user = process.getuid ? ['--user', `${process.getuid()}:${process.getgid()}`] : [];
const env = ['E2E_DOCKER=1', 'HOME=/tmp', ...(process.env.CI ? ['CI=1'] : [])];

const args = [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    ...user,
    ...env.flatMap((value) => ['-e', value]),
    '-v',
    `${process.cwd()}:/work`,
    '-w',
    '/work',
    image,
    'npx',
    'playwright',
    'test',
    ...process.argv.slice(2),
];

const result = spawnSync('docker', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
