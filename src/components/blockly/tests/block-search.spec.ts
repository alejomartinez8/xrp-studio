import * as Blockly from 'blockly/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
    BlockSearchIndex,
    clearSharedSearchIndexes,
    collectBlocks,
    sharedSearchIndex,
    trigrams,
} from '@components/blockly/block-search';

/** Tests for the shared, lazily built block search index. */
describe('block search', () => {
    beforeAll(() => {
        Blockly.common.defineBlocksWithJsonArray([
            {
                type: 'drive_forward',
                message0: 'drive forward %1 cm',
                args0: [{ type: 'field_number', name: 'D', value: 10 }],
            },
            {
                type: 'led_set',
                message0: 'turn led %1',
                args0: [
                    {
                        type: 'field_dropdown',
                        name: 'S',
                        options: [
                            ['on', 'ON'],
                            ['off', 'OFF'],
                        ],
                    },
                ],
            },
        ]);
    });

    afterEach(() => {
        clearSharedSearchIndexes();
        vi.restoreAllMocks();
    });

    const blocks = [
        { kind: 'block', type: 'drive_forward' },
        { kind: 'block', type: 'led_set' },
    ];

    it('splits texts into lowercase trigrams', () => {
        expect(trigrams('Drive')).toEqual(['dri', 'riv', 'ive']);
        expect(trigrams('On')).toEqual(['on']);
        expect(trigrams('')).toEqual([]);
    });

    it('finds blocks by field text and dropdown options', () => {
        const index = new BlockSearchIndex();
        index.indexBlocks(blocks);
        expect(index.blockTypesMatching('forward').map((b) => b.type)).toEqual(['drive_forward']);
        expect(index.blockTypesMatching('off').map((b) => b.type)).toEqual(['led_set']);
        expect(index.blockTypesMatching('zzz')).toEqual([]);
        expect(index.blockTypesMatching('')).toEqual([]);
    });

    it('collects each block of nested categories once', () => {
        const toolbox = [
            { kind: 'category', name: 'A', contents: [blocks[0]!, { kind: 'sep' }] },
            {
                kind: 'category',
                name: 'B',
                contents: [blocks[1]!, { kind: 'block', type: 'drive_forward' }],
            },
        ];
        expect(
            collectBlocks(toolbox as Blockly.utils.toolbox.ToolboxItemInfo[]).map((b) => b.type),
        ).toEqual(['drive_forward', 'led_set']);
        expect(collectBlocks(undefined)).toEqual([]);
    });

    it('builds the index once per toolbox and language', () => {
        const spy = vi.spyOn(BlockSearchIndex.prototype, 'indexBlocks');
        const first = sharedSearchIndex(blocks, 'en');
        expect(sharedSearchIndex([...blocks], 'en')).toBe(first);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(sharedSearchIndex(blocks, 'es')).not.toBe(first);
        expect(spy).toHaveBeenCalledTimes(2);
    });
});
