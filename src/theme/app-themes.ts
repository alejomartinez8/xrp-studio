import { Themes } from '@/managers/appmgr';

/** Colours used to draw a theme's preview card in the theme picker. */
export interface ThemePreview {
    header: string;
    sidebar: string;
    toolbox: string;
    canvas: string;
    accent: string;
    lines: string;
}

/** An app theme offered in the theme picker. */
export interface AppTheme {
    id: Themes;
    /** i18n key of the theme name. */
    labelKey: string;
    preview: ThemePreview;
}

/**
 * Themes offered by the theme picker. Add an entry here to offer a new theme.
 */
export const APP_THEMES: AppTheme[] = [
    {
        id: Themes.LIGHT,
        labelKey: 'theme.light',
        preview: {
            header: '#dddddd',
            sidebar: '#f3f3f3',
            toolbox: '#f3f3f3',
            canvas: '#ffffff',
            accent: '#007acc',
            lines: '#dcdcdc',
        },
    },
    {
        id: Themes.DARK,
        labelKey: 'theme.dark',
        preview: {
            header: '#3d3d3d',
            sidebar: '#252526',
            toolbox: '#252526',
            canvas: '#1e1e1e',
            accent: '#007acc',
            lines: '#3d3d3d',
        },
    },
];

/** The theme with this id, if offered. */
export function findAppTheme(id: string): AppTheme | undefined {
    return APP_THEMES.find((theme) => theme.id === id);
}
