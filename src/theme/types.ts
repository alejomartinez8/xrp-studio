/**
 * Shape of a block editor theme. A theme picks one colour per toolbox category (blocks take the
 * colour of the category they live in) and the colours of the editor surfaces.
 */
export interface BlockTheme {
    /** Theme id, also used as the Blockly theme name prefix. */
    name: string;
    /** #rrggbb colour per toolbox `categoryId`. Subcategories fall back to their parent's colour. */
    categories: Record<string, string>;
    /** Editor surfaces for the light and dark app themes. */
    surfaces: Record<'light' | 'dark', BlockThemeSurfaces>;
}

/** Colours of the block editor surfaces. */
export interface BlockThemeSurfaces {
    workspace: string;
    grid: string;
    toolbox: string;
    toolboxText: string;
    flyout: string;
}
