import { describe, expect, it } from 'vitest';
import {
    bumpManifests,
    bumpFor,
    checkPr,
    collectEntries,
    insertSection,
    nextRelease,
    parseChangeLogLines,
    parseTitle,
    prNumberOf,
    renderSection,
} from './release-lib.mjs';

const body = `Text\n\nChange Log (en): Blocks are bigger.\nChange Log (es): Los bloques son más grandes.\nChange Log (theme): Editor\n`;

describe('parseTitle', () => {
    it('reads type, scope and breaking mark', () => {
        expect(parseTitle('feat(ui)!: New thing')).toEqual({
            type: 'feat',
            scope: 'ui',
            breaking: true,
            text: 'New thing',
        });
        expect(parseTitle('Add a thing')).toBeNull();
    });
});

describe('parseChangeLogLines', () => {
    it('reads both languages and the theme, tolerating bullets and bold', () => {
        expect(
            parseChangeLogLines(
                `- **Change Log (en):** One.\n* Change Log (es): Uno.\nChange Log (theme): Look`,
            ),
        ).toEqual({
            en: ['One.'],
            es: ['Uno.'],
            theme: 'Look',
        });
    });
    it('ignores empty lines and placeholders in comments', () => {
        expect(parseChangeLogLines('Change Log (en): <!-- text -->').en).toEqual([]);
    });
});

describe('checkPr', () => {
    it('rejects titles without a type', () => {
        expect(checkPr('Add a thing', '')).toHaveLength(1);
    });
    it('requires lines for feat and fix, not for docs or chore', () => {
        expect(checkPr('fix: a', '')).toHaveLength(1);
        expect(checkPr('feat: a', body)).toEqual([]);
        expect(checkPr('docs: a', '')).toEqual([]);
        expect(checkPr('chore(deps): a', '')).toEqual([]);
    });
    it('requires lines for a breaking change and matching counts', () => {
        expect(checkPr('refactor!: a', '')).toHaveLength(1);
        expect(
            checkPr('fix: a', 'Change Log (en): a\nChange Log (en): b\nChange Log (es): a'),
        ).toHaveLength(1);
    });
});

describe('bumps', () => {
    it('maps types to bumps', () => {
        expect(bumpFor({ title: 'fix: a' }, 0)).toBe('patch');
        expect(bumpFor({ title: 'style: a' }, 0)).toBe('patch');
        expect(bumpFor({ title: 'perf: a' }, 0)).toBe('patch');
        expect(bumpFor({ title: 'feat: a' }, 0)).toBe('minor');
        expect(bumpFor({ title: 'docs: a' }, 0)).toBeNull();
        expect(bumpFor({ title: 'chore: a' }, 0)).toBeNull();
        expect(bumpFor({ title: 'Free text' }, 0)).toBeNull();
    });
    it('breaking is minor while 0.x and major from 1.0.0', () => {
        expect(bumpFor({ title: 'feat!: a' }, 0)).toBe('minor');
        expect(bumpFor({ title: 'fix: a', body: 'BREAKING CHANGE: x' }, 0)).toBe('minor');
        expect(bumpFor({ title: 'fix!: a' }, 1)).toBe('major');
    });
    it('takes the highest bump of several PRs', () => {
        const r = nextRelease('0.2.0', [
            { title: 'fix: a' },
            { title: 'feat: b' },
            { title: 'docs: c' },
        ]);
        expect(r?.version).toBe('0.3.0');
        expect(r?.releasing).toHaveLength(2);
        expect(nextRelease('0.2.0', [{ title: 'fix: a' }])?.version).toBe('0.2.1');
        expect(nextRelease('1.4.2', [{ title: 'feat!: a' }])?.version).toBe('2.0.0');
        expect(nextRelease('0.2.0', [{ title: 'docs: a' }, { title: 'test: b' }])).toBeNull();
    });
});

describe('Change Log', () => {
    const prs = [
        { number: 1, title: 'feat: A', body },
        { number: 2, title: 'fix: Dark mode', body: '' },
    ];
    it('falls back to the title and marks it', () => {
        const entries = collectEntries(prs);
        expect(entries[1].en).toBe('Dark mode (PR #2 has no Change Log line)');
    });
    it('groups a minor by theme and writes Spanish headings', () => {
        const entries = collectEntries([prs[0]]);
        expect(renderSection('0.3.0', 'en', entries, 'minor')).toBe(
            '## Version 0.3.0\n\n### Editor\n* Blocks are bigger.\n',
        );
        expect(renderSection('0.3.0', 'es', entries, 'minor')).toBe(
            '## Versión 0.3.0\n\n### Editor\n* Los bloques son más grandes.\n',
        );
    });
    it('writes a patch as short lines without headings', () => {
        const entries = collectEntries([prs[0]]);
        expect(renderSection('0.2.1', 'en', entries, 'patch')).toBe(
            '## Version 0.2.1\n\n* Blocks are bigger.\n',
        );
    });
    it('inserts after the title and keeps older entries', () => {
        const md = "# What's new\n\n## Version 0.2.0\n\nOld.\n";
        const out = insertSection(md, '## Version 0.3.0\n\n* New.\n', '0.3.0');
        expect(out).toBe(
            "# What's new\n\n## Version 0.3.0\n\n* New.\n\n## Version 0.2.0\n\nOld.\n",
        );
        expect(() => insertSection(out, 'x', '0.3.0')).toThrow();
    });
    it('inserts into the real files and keeps the format the app reads', async () => {
        const { readFileSync } = await import('node:fs');
        for (const [lang, title] of [
            ['en', '# What'],
            ['es', '# Novedades'],
        ]) {
            const md = readFileSync(`public/changelog/${lang}.md`, 'utf8');
            expect(md.startsWith(title)).toBe(true);
            const out = insertSection(
                md,
                renderSection('9.9.9', lang, [{ theme: '', en: 'a', es: 'b' }], 'patch'),
                '9.9.9',
            );
            expect(out.indexOf('9.9.9')).toBeLessThan(out.indexOf('0.2.0'));
            expect(
                out.endsWith(md.slice(md.indexOf('## '))) ||
                    out.includes(md.slice(md.indexOf('## '))),
            ).toBe(true);
        }
    });
});

describe('bumpManifests', () => {
    it('changes only the project version in package.json and the lock', () => {
        const pkg =
            '{\n  "name": "x",\n  "version": "0.2.0",\n  "dependencies": {"a": {"version": "1.0.0"}}\n}\n';
        const lock =
            '{\n  "name": "x",\n  "version": "0.2.0",\n  "packages": {\n    "": {\n      "name": "x",\n      "version": "0.2.0",\n      "license": "GPL"\n    },\n    "node_modules/a": {\n      "version": "1.0.0"\n    }\n  }\n}\n';
        const out = bumpManifests(pkg, lock, '0.3.0');
        expect(out.packageJson).toContain('"version": "0.3.0"');
        expect(out.packageJson).toContain('"version": "1.0.0"');
        expect(out.lock.match(/0\.3\.0/g)).toHaveLength(2);
        expect(out.lock).toContain('"version": "1.0.0"');
    });
});

describe('prNumberOf', () => {
    it('reads squash and merge commit subjects', () => {
        expect(prNumberOf('feat: a (#12)')).toBe(12);
        expect(prNumberOf('Merge pull request #7 from a/b')).toBe(7);
        expect(prNumberOf('plain')).toBeNull();
    });
});
