import type { BlockTheme } from '@/theme/types';

/**
 * Block theme of the VS Code default themes: one vivid colour per category, kept cheerful on
 * purpose, with the neutral greys of Default Light+ and Default Dark+ for the editor surfaces.
 */
export const vscodeBlockTheme: BlockTheme = {
    name: 'vscode',
    categories: {
        motors: '#d43511',
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
        advanced: '#616161',
    },
    surfaces: {
        light: {
            workspace: '#ffffff',
            grid: '#dcdcdc',
            toolbox: '#f3f3f3',
            toolboxText: '#333333',
            flyout: '#e8e8e8',
        },
        dark: {
            workspace: '#1e1e1e',
            grid: '#3d3d3d',
            toolbox: '#252526',
            toolboxText: '#cccccc',
            flyout: '#2c2c2d',
        },
    },
};
