import { describe, expect, it } from 'vitest';
import {
    ADVANCED_CATEGORY_IDS,
    addSearch,
    groupAdvancedCategories,
    groupMotorCategories,
    phoneToolbox,
} from '@components/blockly/toolbox-ui';

const category = (categoryId: string) => ({ kind: 'CATEGORY', categoryId, contents: [] });

describe('Kid-friendly toolbox', () => {
    const toolbox = {
        kind: 'categoryToolbox',
        contents: ['individualMotors', 'gamepad', 'logic', 'text', 'thirdParty', 'math'].map(
            category,
        ),
    };

    it('moves advanced categories into a collapsed group at the end', () => {
        const grouped = groupAdvancedCategories(toolbox, 'Advanced');
        const ids = grouped.contents.map((item) => item.categoryId ?? item.kind);
        expect(ids).toEqual(['individualMotors', 'logic', 'math', 'SEP', 'advanced']);

        const advanced = grouped.contents.at(-1) as { contents: { categoryId: string }[] };
        expect(advanced.contents.map((item) => item.categoryId)).toEqual(
            ADVANCED_CATEGORY_IDS.filter((id) => ['gamepad', 'thirdParty', 'text'].includes(id)),
        );
    });

    it('leaves the toolbox alone when there are no advanced categories', () => {
        const basic = { contents: [category('logic')] };
        expect(groupAdvancedCategories(basic, 'Advanced')).toBe(basic);
    });

    it('gathers the motor categories into an open group where the first one was', () => {
        const xrp = {
            contents: ['individualMotors', 'driveTrain', 'servos', 'sensors', 'logic'].map(
                category,
            ),
        };
        const grouped = groupMotorCategories(xrp, 'Motors');
        expect(grouped.contents.map((item) => item.categoryId)).toEqual([
            'motors',
            'sensors',
            'logic',
        ]);
        expect(grouped.contents[0]).toMatchObject({ name: 'Motors', expanded: 'true' });
        const motors = grouped.contents[0] as { contents: { categoryId: string }[] };
        expect(motors.contents.map((item) => item.categoryId)).toEqual([
            'driveTrain',
            'individualMotors',
            'servos',
        ]);
    });

    it('leaves the toolbox alone when there are no motor categories', () => {
        const basic = { contents: [category('logic')] };
        expect(groupMotorCategories(basic, 'Motors')).toBe(basic);
    });

    it('turns the toolbox into a column of icons on phones', () => {
        const block = { kind: 'BLOCK', type: 'xrp_seteffort' };
        const leaf = (categoryId: string, name: string) => ({
            kind: 'CATEGORY',
            categoryId,
            name,
            contents: [block],
        });
        const themed = {
            contents: [
                { kind: 'search', name: 'Search', contents: [] },
                {
                    kind: 'CATEGORY',
                    categoryId: 'motors',
                    name: 'Motors',
                    contents: [leaf('driveTrain', 'DriveTrain'), leaf('servos', 'Servos')],
                },
                {
                    kind: 'CATEGORY',
                    categoryId: 'sensors',
                    name: 'Sensors',
                    contents: [leaf('gyro', 'Gyro')],
                },
                leaf('logic', 'Logic'),
                { kind: 'SEP' },
                {
                    kind: 'CATEGORY',
                    categoryId: 'advanced',
                    name: 'Advanced',
                    contents: [leaf('text', 'Text')],
                },
            ],
        };
        const phone = phoneToolbox(themed);
        expect(phone.contents.map((item) => item.categoryId ?? item.kind)).toEqual([
            'driveTrain',
            'servos',
            'gyro',
            'logic',
            'SEP',
            'advanced',
        ]);
        expect(phone.contents[0]).toMatchObject({
            contents: [{ kind: 'label', text: 'DriveTrain' }, block],
        });
        expect(phone.contents[5]).toMatchObject({
            iconOnly: 'true',
            contents: [{ categoryId: 'text', contents: [{ kind: 'label', text: 'Text' }, block] }],
        });
    });

    it('adds the search field first', () => {
        expect(addSearch(toolbox, 'Search').contents[0]).toEqual({
            kind: 'search',
            name: 'Search',
            contents: [],
        });
    });
});
