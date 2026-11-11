import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as En from 'blockly/msg/en';
import { pythonGenerator } from 'blockly/python';
import { describe, expect, it } from 'vitest';
import BlocklyConfigs from '@components/blockly/xrp_blockly_configs';
import { EXAMPLES, exampleContent } from '@/utils/examples';

/** A toolbox entry as written in `xrp_blockly_configs.ts`. */
type ToolboxItem = {
    kind: string;
    type?: string;
    contents?: ToolboxItem[];
    [key: string]: unknown;
};

/** Every block of the toolbox, in toolbox order, with its default inputs and fields. */
function toolboxBlocks(items: ToolboxItem[]): ToolboxItem[] {
    return items.flatMap((item) => {
        if (item.kind.toUpperCase() === 'BLOCK') return [item];
        return item.contents ? toolboxBlocks(item.contents) : [];
    });
}

/** Python generated from a workspace in the JSON serialization, loaded headless as the editor does. */
function pythonForWorkspace(state: object): string {
    const ws = new Blockly.Workspace();
    try {
        Blockly.serialization.workspaces.load(state, ws);
        return pythonGenerator.workspaceToCode(ws);
    } finally {
        ws.dispose();
    }
}

/**
 * Python generated from one toolbox block dropped alone on an empty workspace. A generator error
 * is kept as its message, so a block that already fails keeps failing the same way.
 */
function pythonForToolboxBlock(item: ToolboxItem): string {
    const block: Partial<ToolboxItem> = { ...item };
    delete block.kind;
    const ws = new Blockly.Workspace();
    try {
        Blockly.serialization.blocks.append(block as Blockly.serialization.blocks.State, ws);
        return pythonGenerator.workspaceToCode(ws);
    } catch (error) {
        return `Error: ${(error as Error).message}`;
    } finally {
        ws.dispose();
    }
}

/** A program with a variable and a function, the parts of the toolbox that are built at runtime. */
const VARIABLES_AND_FUNCTIONS = {
    blocks: {
        languageVersion: 0,
        blocks: [
            {
                type: 'procedures_defnoreturn',
                fields: { NAME: 'drive_square' },
                inputs: {
                    STACK: {
                        block: {
                            type: 'controls_repeat_ext',
                            inputs: {
                                TIMES: { block: { type: 'math_number', fields: { NUM: 4 } } },
                                DO: {
                                    block: {
                                        type: 'variables_set',
                                        fields: { VAR: { id: 'side' } },
                                        inputs: {
                                            VALUE: {
                                                block: {
                                                    type: 'math_number',
                                                    fields: { NUM: 20 },
                                                },
                                            },
                                        },
                                        next: {
                                            block: {
                                                type: 'xrp_straight_effort',
                                                inputs: {
                                                    dist: {
                                                        block: {
                                                            type: 'variables_get',
                                                            fields: { VAR: { id: 'side' } },
                                                        },
                                                    },
                                                    effort: {
                                                        block: {
                                                            type: 'math_number',
                                                            fields: { NUM: 0.5 },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            {
                type: 'procedures_callnoreturn',
                extraState: { name: 'drive_square' },
                y: 300,
            },
        ],
    },
    variables: [{ name: 'side', id: 'side' }],
};

/**
 * Golden tests for the Python generator: the code generated for every welcome example, every
 * toolbox block and a program with variables and functions is kept in a snapshot, so a Blockly
 * upgrade that changes the Python a child's program sends to the robot fails here.
 */
describe('Python generator', () => {
    Blockly.setLocale(En as unknown as Record<string, string>);

    it('generates the same Python for every example', () => {
        for (const example of EXAMPLES) {
            expect(pythonForWorkspace(JSON.parse(exampleContent(example)))).toMatchSnapshot(
                example.id,
            );
        }
    });

    it('generates the same Python for every toolbox block', () => {
        const blocks = toolboxBlocks(BlocklyConfigs.ToolboxJson.contents as ToolboxItem[]);
        expect(blocks.length).toBeGreaterThan(50);
        const code = Object.fromEntries(
            blocks.map((item, index) => [`${index} ${item.type}`, pythonForToolboxBlock(item)]),
        );
        expect(code).toMatchSnapshot();
    });

    it('generates the same Python for variables and functions', () => {
        expect(pythonForWorkspace(VARIABLES_AND_FUNCTIONS)).toMatchSnapshot();
    });
});
