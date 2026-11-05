import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import {
    VIVID_SATURATION,
    VIVID_VALUE,
    vividColour,
    vividToolbox,
} from '@components/blockly/vivid-colours';

/** Distance between two #rrggbb colours, as the largest per-channel difference. */
function channelDiff(a: string, b: string): number {
    const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const [ca, cb] = [parse(a), parse(b)];
    return Math.max(...ca.map((c, i) => Math.abs(c - cb[i])));
}

describe('vivid colours', () => {
    it('keeps a toolbox stripe matching its hue-based blocks', () => {
        const motorsStripe = '#a55b65';
        const motorsBlock = Blockly.utils.colour.hsvToHex(352, VIVID_SATURATION, VIVID_VALUE * 255);
        expect(channelDiff(vividColour(motorsStripe), motorsBlock)).toBeLessThanOrEqual(2);
    });

    it('leaves already saturated colours and non-hex values alone', () => {
        expect(vividColour('#0080ff')).toBe('#0080ff');
        expect(vividColour('352')).toBe('352');
    });

    it('updates nested toolbox category colours without mutating the input', () => {
        const toolbox = { contents: [{ colour: '#5b80a5', contents: [{ colour: '#5ba55b' }] }] };
        const vivid = vividToolbox(toolbox);
        expect(vivid.contents[0].colour).not.toBe('#5b80a5');
        expect(vivid.contents[0].contents[0].colour).not.toBe('#5ba55b');
        expect(toolbox.contents[0].colour).toBe('#5b80a5');
    });
});
