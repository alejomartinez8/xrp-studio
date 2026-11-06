import { projectNameProblem } from '@/utils/new-project';

/**
 * Example blocks projects offered on the welcome screen, so a child can start from a working
 * program instead of an empty workspace. Each one is a Blockly workspace (JSON serialization)
 * built only from blocks in the XRP toolbox; block texts follow the app language on their own.
 * Choosing an example creates a copy in the user's projects, so the example itself never changes.
 * Distances, angles, efforts and the line threshold still need checking with a real robot.
 */

/** A block as stored in the Blockly JSON serialization. */
type BlockJson = {
    type: string;
    fields?: Record<string, unknown>;
    extraState?: Record<string, unknown>;
    inputs?: Record<string, { block: BlockJson }>;
    next?: { block: BlockJson };
    x?: number;
    y?: number;
};

export type ExampleId = 'driveAndTurn' | 'square' | 'avoidObstacles' | 'followLine';

export type Example = {
    id: ExampleId;
    /** Blockly workspace in the JSON serialization format. */
    workspace: { blocks: { languageVersion: number; blocks: BlockJson[] } };
};

/** A number block. */
function num(value: number): BlockJson {
    return { type: 'math_number', fields: { NUM: value } };
}

/** Chain statement blocks so each one runs after the previous one. */
function sequence(blocks: BlockJson[]): BlockJson {
    const [first, ...rest] = blocks;
    return rest.length === 0 ? { ...first } : { ...first, next: { block: sequence(rest) } };
}

/** Drive straight `cm` centimetres. */
function straight(cm: number, effort = 0.5): BlockJson {
    return {
        type: 'xrp_straight_effort',
        inputs: { dist: { block: num(cm) }, effort: { block: num(effort) } },
    };
}

/** Turn in place `degrees` degrees. */
function turn(degrees: number, effort = 0.5): BlockJson {
    return {
        type: 'xrp_turn_effort',
        inputs: { degrees: { block: num(degrees) }, effort: { block: num(effort) } },
    };
}

/** Set the left and right wheel efforts. */
function setEffort(left: BlockJson, right: BlockJson): BlockJson {
    return { type: 'xrp_seteffort', inputs: { LEFT: { block: left }, RIGHT: { block: right } } };
}

/** Repeat the statements forever. */
function forever(body: BlockJson[]): BlockJson {
    return {
        type: 'controls_whileUntil',
        fields: { MODE: 'WHILE' },
        inputs: {
            BOOL: { block: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } },
            DO: { block: sequence(body) },
        },
    };
}

/** Wait for the robot's button, so the program does not start while the robot is in the hand. */
const waitForButton: BlockJson = { type: 'xrp_wait_for_button_press' };

/** Workspace with one program at the top left. */
function program(blocks: BlockJson[]): Example['workspace'] {
    return { blocks: { languageVersion: 0, blocks: [{ ...sequence(blocks), x: 40, y: 40 }] } };
}

/**
 * Line follower: when the left sensor sees more of the dark line than the right one, the line is to
 * the left, so the left wheel slows down; otherwise the right wheel does.
 */
function followLineProgram(): Example['workspace'] {
    const lineIsLeft: BlockJson = {
        type: 'logic_compare',
        fields: { OP: 'GT' },
        inputs: { A: { block: { type: 'xrp_l_refl' } }, B: { block: { type: 'xrp_r_refl' } } },
    };
    return program([
        waitForButton,
        forever([
            {
                type: 'controls_if',
                extraState: { hasElse: true },
                inputs: {
                    IF0: { block: lineIsLeft },
                    DO0: { block: setEffort(num(0.2), num(0.5)) },
                    ELSE: { block: setEffort(num(0.5), num(0.2)) },
                },
            },
        ]),
    ]);
}

/** Obstacle avoider: drive forward and turn when something is closer than 20 cm. */
function avoidObstaclesProgram(): Example['workspace'] {
    const isClose: BlockJson = {
        type: 'logic_compare',
        fields: { OP: 'LT' },
        inputs: { A: { block: { type: 'xrp_getsonardist' } }, B: { block: num(20) } },
    };
    return program([
        waitForButton,
        forever([
            {
                type: 'controls_if',
                extraState: { hasElse: true },
                inputs: {
                    IF0: { block: isClose },
                    DO0: { block: sequence([{ type: 'xrp_stop_motors' }, turn(90)]) },
                    ELSE: { block: setEffort(num(0.5), num(0.5)) },
                },
            },
        ]),
    ]);
}

/** The examples, in the order the welcome screen shows them. */
export const EXAMPLES: Example[] = [
    {
        id: 'driveAndTurn',
        workspace: program([
            waitForButton,
            straight(30),
            turn(180),
            straight(30),
            { type: 'xrp_led_on' },
        ]),
    },
    {
        id: 'square',
        workspace: program([
            waitForButton,
            {
                type: 'controls_repeat_ext',
                inputs: {
                    TIMES: { block: num(4) },
                    DO: { block: sequence([straight(20), turn(90)]) },
                },
            },
        ]),
    },
    { id: 'avoidObstacles', workspace: avoidObstaclesProgram() },
    { id: 'followLine', workspace: followLineProgram() },
];

/** Content of the new project created from an example. */
export function exampleContent(example: Example): string {
    return JSON.stringify(example.workspace);
}

/**
 * Name suggested for a copy of an example: its title, or the title with the first free number
 * (`Square 2`, `Square 3`…) when a project with that name already exists.
 */
export function suggestedExampleName(
    title: string,
    extension: string,
    existingNames: string[],
): string {
    if (projectNameProblem(title, extension, existingNames) !== 'exists') {
        return title;
    }
    let n = 2;
    while (projectNameProblem(`${title} ${n}`, extension, existingNames) === 'exists') {
        n++;
    }
    return `${title} ${n}`;
}
