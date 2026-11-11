import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { pythonGenerator } from 'blockly/python';
import { getLocalizedToolboxJson } from '@components/blockly/xrp_blockly_configs';

/**
 * Code snippets for the Python editor's toolbox. The robot snippets are
 * made from the blocks of the toolbox, with their default values, by the Python generator of the
 * blocks, so each one is exactly what the matching block writes, imports and setup included. The
 * plain Python ones (if, loops, print, variables, functions) are written here.
 */

/** One snippet: the code to insert and the lines it needs at the top of the file. */
export interface PythonSnippet {
    /** Id of the explanation text (`pythonSnippets.items.<id>`); the block type when generated. */
    id: string;
    /** Python to insert; lines after the first are indented relative to the first. */
    code: string;
    /** True for a value (such as `rangefinder.distance()`), inserted inside a line of code. */
    expression: boolean;
    /** Import and setup lines the code needs, imports first. */
    setup: string[];
}

/** A group of snippets, keyed by the toolbox `categoryId` for its name, colour and icon. */
export interface SnippetCategory {
    id: string;
    snippets: PythonSnippet[];
}

/** Robot block types per category, in toolbox order. */
const BLOCK_SNIPPETS: Record<string, string[]> = {
    driveTrain: [
        'xrp_straight_effort',
        'xrp_turn_effort',
        'xrp_seteffort',
        'xrp_arcade',
        'xrp_stop_motors',
        'xrp_getleftencoder',
        'xrp_getrightencoder',
    ],
    individualMotors: [
        'xrp_motor_effort',
        'xrp_motor_speed',
        'xrp_motor_get_position',
        'xrp_motor_reset_position',
    ],
    servos: ['xrp_servo_deg'],
    sensors: ['xrp_getsonardist', 'xrp_l_refl', 'xrp_r_refl', 'xrp_yaw'],
    controlBoard: ['xrp_led_on', 'xrp_led_off', 'xrp_button_pressed', 'xrp_wait_for_button_press'],
};

/** Plain Python snippets, and block snippets (`block`) placed among them. */
const PYTHON_SNIPPETS: Record<string, (Omit<PythonSnippet, 'setup'> | { block: string })[]> = {
    logic: [
        { id: 'if', code: 'if True:\n    pass', expression: false },
        { id: 'ifElse', code: 'if True:\n    pass\nelse:\n    pass', expression: false },
        { id: 'compare', code: '1 < 2', expression: true },
    ],
    loops: [
        { id: 'whileTrue', code: 'while True:\n    pass', expression: false },
        { id: 'forRange', code: 'for i in range(4):\n    pass', expression: false },
        { block: 'xrp_sleep' },
    ],
    math: [{ id: 'randomInt', code: 'random.randint(1, 10)', expression: true }],
    text: [
        { id: 'print', code: 'print("Hello!")', expression: false },
        { id: 'comment', code: '# A note for people', expression: false },
    ],
    variables: [{ id: 'variable', code: 'speed = 0.5', expression: false }],
    functions: [{ id: 'function', code: 'def my_function():\n    pass', expression: false }],
};

/** Setup lines of the plain Python snippets that need one. */
const PYTHON_SETUP: Record<string, string[]> = {
    randomInt: ['import random'],
};

const IMPORT_LINE = /^(from\s+\S+\s+)?import\s+\S+/;

type ToolboxNode = {
    kind?: string;
    type?: string;
    inputs?: Blockly.serialization.blocks.State['inputs'];
    fields?: Blockly.serialization.blocks.State['fields'];
    contents?: ToolboxNode[];
};

/** The toolbox definition (type and default inputs) of a block type. */
function findToolboxBlock(nodes: ToolboxNode[], type: string): ToolboxNode | undefined {
    for (const node of nodes) {
        if (node.kind === 'BLOCK' && node.type === type) return node;
        const found = node.contents && findToolboxBlock(node.contents, type);
        if (found) return found;
    }
    return undefined;
}

/**
 * Generate a snippet from a toolbox block: the block is built in a hidden workspace with the
 * toolbox's default inputs, then turned into Python. Its code is the block's own line and its
 * setup the imports and object lines the generator adds for it.
 */
export function snippetFromBlock(type: string): PythonSnippet {
    const toolbox = getLocalizedToolboxJson() as { contents: ToolboxNode[] };
    const def = findToolboxBlock(toolbox.contents, type) ?? { type };
    const state = { type, inputs: def.inputs, fields: def.fields };
    const workspace = new Blockly.Workspace();
    try {
        const block = Blockly.serialization.blocks.append(state, workspace);
        pythonGenerator.init(workspace);
        const result = pythonGenerator.blockToCode(block, true);
        const definitions = Object.values(
            (pythonGenerator as unknown as { definitions_: Record<string, string> }).definitions_,
        )
            .flatMap((text) => text.split('\n'))
            .filter((line) => line.trim() !== '');
        pythonGenerator.finish('');
        const expression = Array.isArray(result);
        const code = (expression ? result[0] : result).replace(/\n+$/, '');
        return {
            id: type,
            code,
            expression,
            setup: [
                ...definitions.filter((line) => IMPORT_LINE.test(line)),
                ...definitions.filter((line) => !IMPORT_LINE.test(line)),
            ],
        };
    } finally {
        workspace.dispose();
    }
}

/**
 * The snippet of a block, or none when its generator fails (a block changed upstream), so one
 * broken block never empties the whole panel.
 */
function generatedSnippet(type: string): PythonSnippet[] {
    try {
        return [snippetFromBlock(type)];
    } catch (err) {
        console.warn(`[snippets] cannot generate ${type}`, err);
        return [];
    }
}

let cache: SnippetCategory[] | null = null;

/** All snippet categories, in the order of the block toolbox. Built once, then reused. */
export function getSnippetCategories(): SnippetCategory[] {
    if (cache) return cache;
    const blockCategories = Object.entries(BLOCK_SNIPPETS).map(([id, types]) => ({
        id,
        snippets: types.flatMap(generatedSnippet),
    }));
    const pythonCategories = Object.entries(PYTHON_SNIPPETS).map(([id, items]) => ({
        id,
        snippets: items.flatMap((item) =>
            'block' in item
                ? generatedSnippet(item.block)
                : [{ ...item, setup: PYTHON_SETUP[item.id] ?? [] }],
        ),
    }));
    cache = [...blockCategories, ...pythonCategories];
    return cache;
}

/** Every setup line any snippet adds, to find where the setup part of a file ends. */
export function knownSetupLines(): Set<string> {
    return new Set(
        getSnippetCategories().flatMap((category) =>
            category.snippets.flatMap((snippet) => snippet.setup),
        ),
    );
}

/** A search hit: the snippet and the category it lives in. */
export interface SnippetHit {
    category: string;
    snippet: PythonSnippet;
}

/**
 * Find the snippets whose title, explanation or code contain every word of the query, ignoring
 * case. `textOf` gives the title and explanation in the current language.
 */
export function searchSnippets(
    query: string,
    textOf: (snippet: PythonSnippet) => string,
): SnippetHit[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return getSnippetCategories().flatMap((category) =>
        category.snippets
            .filter((snippet) => {
                const haystack = `${textOf(snippet)} ${snippet.code}`.toLowerCase();
                return words.every((word) => haystack.includes(word));
            })
            .map((snippet) => ({ category: category.id, snippet })),
    );
}
