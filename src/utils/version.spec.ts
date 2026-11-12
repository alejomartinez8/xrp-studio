import { describe, expect, it } from 'vitest';
import { changelogUrl, formatVersion, mergeChangelog } from './version';

describe('formatVersion', () => {
    it('joins version and commit', () => {
        expect(formatVersion('0.1.0', 'a1b2c3d', false)).toBe('0.1.0 · a1b2c3d');
    });
    it('shows the version alone when there is no commit', () => {
        expect(formatVersion('0.1.0', '', false)).toBe('0.1.0');
    });
    it('marks preview builds', () => {
        expect(formatVersion('0.1.0', 'a1b2c3d', true)).toBe('0.1.0 · a1b2c3d · preview');
    });
});

describe('changelogUrl', () => {
    it('picks Spanish for es variants and English otherwise', () => {
        expect(changelogUrl('es')).toBe('changelog/es.md');
        expect(changelogUrl('es-CO')).toBe('changelog/es.md');
        expect(changelogUrl('en-US')).toBe('changelog/en.md');
        expect(changelogUrl('fr')).toBe('changelog/en.md');
    });
});

describe('mergeChangelog', () => {
    const es = '# Novedades\n\n## Versión 0.2.0\n\nViejo.\n\n## Versión 0.1.0\n\nPrimero.\n';
    const en =
        "# What's new\n\n## Version 0.3.0\n\n* New.\n\n## Version 0.2.0\n\nOld.\n\n## Version 0.1.0\n\nFirst.\n";
    it('adds the versions the primary file lacks, newest first, and keeps its own text', () => {
        const out = mergeChangelog(es, en);
        expect(out.startsWith('# Novedades')).toBe(true);
        expect(out.indexOf('Version 0.3.0')).toBeLessThan(out.indexOf('Versión 0.2.0'));
        expect(out).toContain('Viejo.');
        expect(out).not.toContain('Old.');
        expect(out.match(/0\.2\.0/g)).toHaveLength(1);
    });
    it('returns the primary text when nothing is missing or the fallback is empty', () => {
        expect(mergeChangelog(es, es)).toBe(es);
        expect(mergeChangelog(es, '')).toBe(es);
    });
});
