/**
 * @vitest-environment node
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Vercel runs `api/` as native ES modules (`"type": "module"` in package.json), where relative
 * imports need a file extension. Vite and Vitest resolve them without one, so a missing extension
 * only fails once deployed.
 */
const ROOT = resolve(__dirname, '../../..');

/** TypeScript files under a folder, without tests. */
function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            return name === 'tests' ? [] : sources(path);
        }
        return path.endsWith('.ts') ? [path] : [];
    });
}

describe('server function imports', () => {
    it('use explicit .js extensions for relative imports', () => {
        const missing = [...sources(join(ROOT, 'api')), ...sources(join(ROOT, 'server'))].flatMap(
            (file) =>
                [...readFileSync(file, 'utf8').matchAll(/from '(\.{1,2}\/[^']+)'/g)]
                    .map((match) => match[1])
                    .filter((spec) => !spec.endsWith('.js'))
                    .map((spec) => `${file.slice(ROOT.length + 1)}: ${spec}`),
        );
        expect(missing).toEqual([]);
    });
});
