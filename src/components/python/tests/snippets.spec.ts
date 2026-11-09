import { describe, expect, it } from 'vitest';
import en from '@/utils/i18n/locales/en/en.json';
import es from '@/utils/i18n/locales/es/es.json';
import { getSnippetCategories, snippetFromBlock } from '@components/python/snippets';
import { activeBlockTheme } from '@/theme';

/** Tests for the snippets made from the toolbox blocks with the Python generator. */
describe('snippets', () => {
    it('makes a robot snippet from its block, with its import and setup', () => {
        expect(snippetFromBlock('xrp_straight_effort')).toEqual({
            id: 'xrp_straight_effort',
            code: 'differentialDrive.straight(20, 0.5)',
            expression: false,
            setup: [
                'from XRPLib.differential_drive import DifferentialDrive',
                'differentialDrive = DifferentialDrive.get_default_differential_drive()',
            ],
        });
    });

    it('marks sensor readings as values', () => {
        expect(snippetFromBlock('xrp_getsonardist')).toMatchObject({
            code: 'rangefinder.distance()',
            expression: true,
        });
        expect(snippetFromBlock('xrp_yaw').setup).toEqual([
            'from XRPLib.imu import IMU',
            'imu = IMU.get_default_imu()',
            'imu.calibrate(1)',
        ]);
    });

    it('uses the block categories, each with a colour, and explains every snippet', () => {
        const categories = getSnippetCategories();
        expect(categories.map((c) => c.id)).toEqual([
            'driveTrain',
            'individualMotors',
            'servos',
            'sensors',
            'controlBoard',
            'logic',
            'loops',
            'math',
            'text',
            'variables',
            'functions',
        ]);
        const items = [en, es].map(
            (lang) =>
                (lang as { pythonSnippets: { items: Record<string, string> } }).pythonSnippets
                    .items,
        );
        for (const category of categories) {
            expect(activeBlockTheme.categories[category.id]).toMatch(/^#/);
            expect(category.snippets.length).toBeGreaterThan(0);
            for (const snippet of category.snippets) {
                expect(snippet.code).not.toBe('');
                for (const texts of items) expect(texts[snippet.id]).toBeTruthy();
            }
        }
    });
});
