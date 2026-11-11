import * as Blockly from 'blockly/core';
import '@components/blockly/xrp_blocks';

/**
 * Sentence templates for XRP blocks. XRPWeb builds these blocks from separate labels in
 * a fixed order (label, number, label, number), so a language cannot say "Avanzar 20 cm". Here each
 * block can take a Blockly message template from the locale, such as `Avanzar %1 cm con fuerza %2`,
 * and each language places the inputs where its grammar needs them.
 *
 * The block's own `init` still runs first (colour, connections, tooltip); only its inputs are then
 * rebuilt from the template. Inputs and fields keep their names, so saved projects and the Python
 * generated from them do not change.
 */

/** One `%n` slot of a template: a value input or a dropdown already built by the block. */
type Slot = { input: string; check?: string | null } | { dropdown: string };

/** Template key in the locale (`blockly.msg`) and the slots its `%1`, `%2`… stand for, per block. */
export const BLOCK_MESSAGES: Record<string, { key: string; slots: Slot[] }> = {
    xrp_motor_effort: {
        key: 'XRP_MOTOR_EFFORT_MESSAGE',
        slots: [{ dropdown: 'MOTOR' }, { input: 'effort', check: 'Number' }],
    },
    xrp_motor_speed: {
        key: 'XRP_MOTOR_SPEED_MESSAGE',
        slots: [{ dropdown: 'MOTOR' }, { input: 'speed', check: 'Number' }],
    },
    xrp_motor_direction: {
        key: 'XRP_MOTOR_DIRECTION_MESSAGE',
        slots: [{ dropdown: 'MOTOR' }, { dropdown: 'DIRECTION' }],
    },
    xrp_motor_get_speed: { key: 'XRP_MOTOR_GET_SPEED_MESSAGE', slots: [{ dropdown: 'MOTOR' }] },
    xrp_motor_get_position: {
        key: 'XRP_MOTOR_GET_POSITION_MESSAGE',
        slots: [{ dropdown: 'MOTOR' }],
    },
    xrp_motor_get_count: { key: 'XRP_MOTOR_GET_COUNT_MESSAGE', slots: [{ dropdown: 'MOTOR' }] },
    xrp_motor_reset_position: {
        key: 'XRP_MOTOR_RESET_POSITION_MESSAGE',
        slots: [{ dropdown: 'MOTOR' }],
    },
    xrp_straight_effort: {
        key: 'XRP_STRAIGHT_MESSAGE',
        slots: [
            { input: 'dist', check: 'Number' },
            { input: 'effort', check: 'Number' },
        ],
    },
    xrp_turn_effort: {
        key: 'XRP_TURN_MESSAGE',
        slots: [
            { input: 'degrees', check: 'Number' },
            { input: 'effort', check: 'Number' },
        ],
    },
    xrp_seteffort: {
        key: 'XRP_SET_EFFORT_MESSAGE',
        slots: [
            { input: 'LEFT', check: 'Number' },
            { input: 'RIGHT', check: 'Number' },
        ],
    },
    xrp_speed: {
        key: 'XRP_SET_SPEED_MESSAGE',
        slots: [
            { input: 'LEFT', check: null },
            { input: 'RIGHT', check: null },
        ],
    },
    xrp_arcade: {
        key: 'XRP_ARCADE_MESSAGE',
        slots: [
            { input: 'STRAIGHT', check: 'Number' },
            { input: 'TURN', check: 'Number' },
        ],
    },
    xrp_servo_deg: {
        key: 'XRP_SERVO_DEG_MESSAGE',
        slots: [{ dropdown: 'SERVO' }, { input: 'degrees', check: 'Number' }],
    },
    xrp_sleep: { key: 'XRP_SLEEP_MESSAGE', slots: [{ input: 'TIME', check: 'Number' }] },
};

const wrapped = new Set<string>();

/** The Blockly JSON argument for a slot, reusing the options of a dropdown the block built. */
function slotArg(block: Blockly.Block, slot: Slot): object {
    if ('dropdown' in slot) {
        const field = block.getField(slot.dropdown) as Blockly.FieldDropdown;
        return { type: 'field_dropdown', name: slot.dropdown, options: field.getOptions(false) };
    }
    return { type: 'input_value', name: slot.input, check: slot.check ?? undefined };
}

/** Rebuild a block's inputs from its template, keeping input and field names and dropdown values. */
export function applyBlockMessage(block: Blockly.Block, template: string, slots: Slot[]): void {
    const args = slots.map((slot) => slotArg(block, slot));
    const values = slots.flatMap((slot) =>
        'dropdown' in slot ? [[slot.dropdown, block.getFieldValue(slot.dropdown)] as const] : [],
    );
    while (block.inputList.length > 0) {
        block.removeInput(block.inputList[0].name);
    }
    block.jsonInit({ message0: template, args0: args });
    for (const [name, value] of values) {
        block.setFieldValue(value, name);
    }
}

/**
 * Make the XRP blocks listed in {@link BLOCK_MESSAGES} build their text from the current locale's
 * template when it has one. Call once at startup; calling again does nothing.
 */
export function registerBlockMessages(): void {
    for (const [type, { key, slots }] of Object.entries(BLOCK_MESSAGES)) {
        const definition = Blockly.Blocks[type];
        if (!definition || wrapped.has(type)) {
            continue;
        }
        wrapped.add(type);
        const init = definition.init;
        definition.init = function (this: Blockly.Block) {
            init.call(this);
            const template = Blockly.Msg[key];
            if (template) {
                applyBlockMessage(this, template, slots);
            }
        };
    }
}
