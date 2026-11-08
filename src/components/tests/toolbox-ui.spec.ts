import { describe, expect, it } from 'vitest';
import {
    ADVANCED_CATEGORY_IDS,
    addSearch,
    groupAdvancedCategories,
    groupMotorCategories,
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

    it('adds the search field first', () => {
        expect(addSearch(toolbox, 'Search').contents[0]).toEqual({
            kind: 'search',
            name: 'Search',
            contents: [],
        });
    });
});
