import { describe, expect, it } from 'vitest';
import { extractBlocksJson, parseBlocksJson } from '@components/blockly/blocks-content';

/** Tests for reading the blocks JSON of a `.blocks` file. */
describe('parseBlocksJson', () => {
    it('treats an empty or blank file as no blocks', () => {
        expect(parseBlocksJson('')).toBeUndefined();
        expect(parseBlocksJson('   \n')).toBeUndefined();
        expect(parseBlocksJson(undefined)).toBeUndefined();
        expect(parseBlocksJson(null)).toBeUndefined();
    });

    it('parses saved blocks', () => {
        expect(parseBlocksJson('{"blocks":{"blocks":[]}}')).toEqual({ blocks: { blocks: [] } });
    });

    it('still reports broken JSON', () => {
        expect(() => parseBlocksJson('{oops')).toThrow();
    });
});

describe('extractBlocksJson', () => {
    const json = '{"blocks":{"languageVersion":0,"blocks":[]}}';

    it('reads a file saved by the editor: Python, date and marker', () => {
        const saved = `print("hi")\n\n\n## 2026-01-01 10:00\n##XRPBLOCKS ${json}`;
        expect(extractBlocksJson(saved)).toBe(json);
    });

    it('reads a file without the date line', () => {
        expect(extractBlocksJson(`print("hi")\n\n\n##XRPBLOCKS ${json}`)).toBe(json);
        expect(extractBlocksJson(`##XRPBLOCKS ${json}`)).toBe(json);
    });

    it('reads a file that holds only the JSON (created, never edited)', () => {
        expect(extractBlocksJson(json)).toBe(json);
        expect(parseBlocksJson(extractBlocksJson(json))).toEqual(JSON.parse(json));
    });
});
