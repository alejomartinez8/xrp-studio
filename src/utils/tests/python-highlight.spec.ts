import { describe, expect, it } from 'vitest';
import { highlightPython } from '@/utils/python-highlight';

describe('highlightPython', () => {
    it('gives the source back when the tokens are joined', () => {
        const source = "from XRPLib.board import Board\n# wait\nif x1 > 0.5:\n    print('hi')\n";
        expect(
            highlightPython(source)
                .map((token) => token.text)
                .join(''),
        ).toBe(source);
    });

    it('colours keywords, strings, numbers and comments', () => {
        const tokens = highlightPython("while True: # go\n    x = 'a' + 20\n");
        const of = (type: string) =>
            tokens.filter((token) => token.type === type).map((token) => token.text);
        expect(of('keyword')).toEqual(['while', 'True']);
        expect(of('comment')).toEqual(['# go']);
        expect(of('string')).toEqual(["'a'"]);
        expect(of('number')).toEqual(['20']);
    });

    it('keeps numbers inside names as plain text', () => {
        expect(highlightPython('motor2 = 1').filter((t) => t.type === 'number')).toEqual([
            { type: 'number', text: '1' },
        ]);
    });
});
