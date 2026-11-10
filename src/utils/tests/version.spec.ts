import { describe, expect, it } from 'vitest';
import { changelogUrl, formatVersion } from '../version';

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
