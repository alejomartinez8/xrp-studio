import { describe, expect, it } from 'vitest';
import { parseBlocksJson } from '@components/blockly/blocks-content';

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
