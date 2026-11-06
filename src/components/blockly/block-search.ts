import * as Blockly from 'blockly/core';

/**
 * Block search index for the toolbox search field.
 *
 * Adapted from `BlockSearcher` in `@blockly/toolbox-search` 3.1.9 (Copyright 2023 Google LLC,
 * Apache-2.0). Changes: the index is built lazily, the first time someone searches, and one index
 * is shared by every editor that has the same blocks and language, so opening a file no longer
 * creates every block of the toolbox again.
 */

type BlockInfo = Blockly.utils.toolbox.BlockInfo;
type ToolboxItemInfo = Blockly.utils.toolbox.ToolboxItemInfo;

/** Lowercase trigrams of a text; texts of three characters or fewer are one "trigram". */
export function trigrams(input: string): string[] {
    const text = input.toLowerCase();
    if (!text) {
        return [];
    }
    if (text.length <= 3) {
        return [text];
    }
    const result: string[] = [];
    for (let start = 0; start <= text.length - 3; start++) {
        result.push(text.substring(start, start + 3));
    }
    return result;
}

/** Trigram index of block texts: the block type, field texts and dropdown options. */
export class BlockSearchIndex {
    private readonly trigramsToBlocks = new Map<string, Set<BlockInfo>>();

    /** Create each block on a headless workspace and index its texts. */
    indexBlocks(blockInfos: BlockInfo[]): void {
        const workspace = new Blockly.Workspace();
        try {
            for (const blockInfo of blockInfos) {
                const type = blockInfo.type;
                if (!type) continue;
                const block = workspace.newBlock(type);
                this.indexText(type.split('_').join(' '), blockInfo);
                for (const input of block.inputList) {
                    for (const field of input.fieldRow) {
                        this.indexDropdown(field, blockInfo);
                        this.indexText(field.getText(), blockInfo);
                    }
                }
            }
        } finally {
            workspace.dispose();
        }
    }

    /** Blocks whose indexed texts contain every trigram of the query. */
    blockTypesMatching(query: string): BlockInfo[] {
        const sets = trigrams(query).map(
            (t) => this.trigramsToBlocks.get(t) ?? new Set<BlockInfo>(),
        );
        if (sets.length === 0) {
            return [];
        }
        return [...sets.reduce((a, b) => new Set([...a].filter((block) => b.has(block))))];
    }

    /** Index the text of each option of a dropdown field. */
    private indexDropdown(field: Blockly.Field, blockInfo: BlockInfo): void {
        if (!(field instanceof Blockly.FieldDropdown)) return;
        for (const option of field.getOptions(true)) {
            const label = option[0];
            if (typeof label === 'string') {
                this.indexText(label, blockInfo);
            } else if (label && typeof label === 'object' && 'alt' in label) {
                this.indexText(label.alt, blockInfo);
            }
        }
    }

    /** Add a text's trigrams to the index for a block. */
    private indexText(text: string, blockInfo: BlockInfo): void {
        for (const trigram of trigrams(text)) {
            const blocks = this.trigramsToBlocks.get(trigram) ?? new Set<BlockInfo>();
            blocks.add(blockInfo);
            this.trigramsToBlocks.set(trigram, blocks);
        }
    }
}

/** Every block (with a type) in a toolbox definition, in toolbox order and without repeats. */
export function collectBlocks(items: ToolboxItemInfo[] | undefined): BlockInfo[] {
    const blocks = new Map<string, BlockInfo>();
    const visit = (item: ToolboxItemInfo) => {
        if ('contents' in item && Array.isArray(item.contents)) {
            item.contents.forEach(visit);
        } else if (item.kind.toLowerCase() === 'block' && 'type' in item && item.type) {
            if (!blocks.has(item.type)) blocks.set(item.type, item);
        }
    };
    items?.forEach(visit);
    return [...blocks.values()];
}

const sharedIndexes = new Map<string, BlockSearchIndex>();

/**
 * The search index for these blocks and language, built on first use and shared by every editor
 * with the same toolbox.
 */
export function sharedSearchIndex(blocks: BlockInfo[], language: string): BlockSearchIndex {
    const key = language + '|' + blocks.map((b) => b.type).join(',');
    let index = sharedIndexes.get(key);
    if (!index) {
        index = new BlockSearchIndex();
        index.indexBlocks(blocks);
        sharedIndexes.set(key, index);
    }
    return index;
}

/** Forget the shared indexes (for tests). */
export function clearSharedSearchIndexes(): void {
    sharedIndexes.clear();
}
