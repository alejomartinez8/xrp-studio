import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import {
    blockColourFor,
    blockThemeOptions,
    colourBlocksByCategory,
    shade,
    themeToolbox,
} from '@components/blockly/block-theme';
import type { BlockTheme } from '@/theme/types';

const surfaces = {
    workspace: '#ffffff',
    grid: '#eeeeee',
    toolbox: '#ffffff',
    toolboxText: '#000000',
    flyout: '#f0f0f0',
};
const theme: BlockTheme = {
    name: 'test',
    categories: { sensors: '#b88700', logic: '#006edb', variables: '#ce2c85' },
    surfaces: { light: surfaces, dark: surfaces },
};

const toolbox = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'CATEGORY',
            categoryId: 'sensors',
            colour: '#80a55b',
            contents: [
                {
                    kind: 'CATEGORY',
                    categoryId: 'distance',
                    contents: [{ kind: 'BLOCK', type: 'test_distance' }],
                },
            ],
        },
        {
            kind: 'CATEGORY',
            categoryId: 'logic',
            contents: [{ kind: 'BLOCK', type: 'test_logic' }],
        },
        { kind: 'CATEGORY', categoryId: 'unknown', colour: '#123456', contents: [] },
    ],
};

describe('block theme', () => {
    it('colours categories from the theme and subcategories from their parent', () => {
        type Themed = { contents: { colour?: string; contents: { colour?: string }[] }[] };
        const themed = themeToolbox(toolbox, theme) as unknown as Themed;
        expect(themed.contents[0].colour).toBe('#b88700');
        expect(themed.contents[0].contents[0].colour).toBe('#b88700');
        expect(themed.contents[1].colour).toBe('#006edb');
        expect(themed.contents[2].colour).toBe('#123456');
        expect(toolbox.contents[0].colour).toBe('#80a55b');
    });

    it('colours each block with its category colour when it is created', () => {
        Blockly.Blocks['test_logic'] = {
            init(this: Blockly.Block) {
                this.setColour(120);
            },
        };
        colourBlocksByCategory(themeToolbox(toolbox, theme));
        expect(blockColourFor('test_distance')).toBe('#b88700');

        const workspace = new Blockly.Workspace();
        const block = workspace.newBlock('test_logic');
        expect(block.getColour()).toBe('#006edb');
        workspace.dispose();
    });

    it('styles built-in blocks and editor surfaces', () => {
        const options = blockThemeOptions({ name: 'x' }, theme, 'light');
        expect(options.blockStyles?.logic_blocks?.colourPrimary).toBe('#006edb');
        expect(options.blockStyles?.variable_blocks?.colourPrimary).toBe('#ce2c85');
        expect(options.componentStyles?.workspaceBackgroundColour).toBe('#ffffff');
    });

    it('shades colours towards white and black', () => {
        expect(shade('#000000', 0.5)).toBe('#808080');
        expect(shade('#ffffff', -0.5)).toBe('#808080');
    });
});
