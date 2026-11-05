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
            header: '#24292f',
            sidebar: '#eaeef2',
            toolbox: '#ffffff',
            canvas: '#f6f8fa',
            accent: '#1f883d',
            lines: '#d0d7de',
        },
    },
    {
        id: Themes.DARK,
        labelKey: 'theme.dark',
        preview: {
            header: '#010409',
            sidebar: '#161b22',
            toolbox: '#161b22',
            canvas: '#0d1117',
            accent: '#238636',
            lines: '#30363d',
        },
    },
];

/** The theme with this id, if offered. */
export function findAppTheme(id: string): AppTheme | undefined {
    return APP_THEMES.find((theme) => theme.id === id);
}
