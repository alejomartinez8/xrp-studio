import * as Blockly from 'blockly/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BLOCK_MESSAGES, registerBlockMessages } from '@components/blockly/block-messages';

/** Text of a block as it reads: labels and current dropdown texts, in order. */
function blockText(block: Blockly.Block): string {
    return block.inputList
        .flatMap((input) => [
            ...input.fieldRow.map((field) => field.getText()),
            ...(input.type === Blockly.inputs.inputTypes.VALUE ? ['_'] : []),
        ])
        .filter((text) => text !== '')
        .join(' ');
}

/** Tests for the per-language block sentences. */
describe('Block messages', () => {
    const templates = Object.values(BLOCK_MESSAGES).map(({ key }) => key);
    let workspace: Blockly.Workspace;

    beforeAll(() => {
        registerBlockMessages();
        registerBlockMessages();
    });

    afterEach(() => {
        workspace?.dispose();
        for (const key of templates) {
            delete Blockly.Msg[key];
        }
    });

    it('places the inputs where the template says, keeping their names', () => {
        Blockly.Msg.XRP_STRAIGHT_MESSAGE = 'Avanzar %1 cm con fuerza %2';
        workspace = new Blockly.Workspace();
        const block = workspace.newBlock('xrp_straight_effort');
        expect(blockText(block)).toBe('Avanzar _ cm con fuerza _');
        expect(block.getInput('dist')).toBeTruthy();
        expect(block.getInput('effort')).toBeTruthy();
        expect(block.previousConnection).toBeTruthy();
    });

    it('keeps dropdowns, their values and the saved state', () => {
        workspace = new Blockly.Workspace();
        const before = workspace.newBlock('xrp_motor_effort');
        before.setFieldValue('2', 'MOTOR');
        const saved = Blockly.serialization.blocks.save(before, { addCoordinates: false })!;
        delete saved.id;

        Blockly.Msg.XRP_MOTOR_EFFORT_MESSAGE = 'Mover motor %1 con fuerza %2';
        const after = Blockly.serialization.blocks.append(saved, workspace);
        expect(after.getFieldValue('MOTOR')).toBe('2');
        expect(blockText(after)).toMatch(/^Mover motor \S+ con fuerza _$/);
        expect(Blockly.serialization.blocks.save(after)).toMatchObject(saved);
    });

    it('keeps the original layout when the language has no template', () => {
        workspace = new Blockly.Workspace();
        const block = workspace.newBlock('xrp_sleep');
        expect(block.getInput('TIME')).toBeTruthy();
        expect(block.inputList).toHaveLength(2);
    });
});
