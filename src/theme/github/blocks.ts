import type { BlockTheme } from '@/theme/types';

/**
 * GitHub block theme: one vivid colour per category, taken from GitHub's Primer data visualization
 * palette, with GitHub's canvas, border and text colours for the editor surfaces.
 */
export const githubBlockTheme: BlockTheme = {
    name: 'github',
    categories: {
        individualMotors: '#df0c24',
        driveTrain: '#d43511',
        servos: '#527a29',
        sensors: '#b88700',
        controlBoard: '#179b9b',
        webServer: '#167e53',
        dashboard: '#9d615c',
        gamepad: '#eb670f',
        thirdParty: '#808fa3',
        logic: '#006edb',
        loops: '#30a147',
        math: '#894ceb',
        text: '#856d4c',
        lists: '#64762d',
        variables: '#ce2c85',
        functions: '#a830e8',
        advanced: '#57606a',
    },
    surfaces: {
        light: {
            workspace: '#f6f8fa',
            grid: '#d0d7de',
            toolbox: '#ffffff',
            toolboxText: '#1f2328',
            flyout: '#eaeef2',
        },
        dark: {
            workspace: '#0d1117',
            grid: '#30363d',
            toolbox: '#161b22',
            toolboxText: '#e6edf3',
            flyout: '#21262d',
        },
    },
};
