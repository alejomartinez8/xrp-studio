/**
 * Production build: runs the type check (`tsc -b`, which emits nothing) and the bundle
 * (`vite build`) at the same time, so the build lasts as long as the slower of the two instead of
 * their sum. A type error still fails the build: the exit code is non-zero if either one fails.
 * Extra arguments go to `vite build` (for example `--mode offline`).
 */
import { spawn } from 'node:child_process';

/** Runs a command with the output shown, and resolves with its exit code. */
function run(args) {
    return new Promise((resolve) => {
        const child = spawn('npx', ['--no-install', ...args], {
            stdio: 'inherit',
            shell: process.platform === 'win32',
        });
        child.on('error', () => resolve(1));
        child.on('close', (code) => resolve(code ?? 1));
    });
}

const [types, bundle] = await Promise.all([
    run(['tsc', '-b']),
    run(['vite', 'build', ...process.argv.slice(2)]),
]);
process.exit(types || bundle);
