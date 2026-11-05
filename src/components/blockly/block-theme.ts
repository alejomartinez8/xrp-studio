import * as Blockly from 'blockly/core';
import type { BlockTheme, BlockThemeSurfaces } from '@/theme/types';

/**
 * Applies a `BlockTheme` to Blockly: toolbox category colours, the colour of every block in a
 * category, the built-in block styles (logic, loops, variables, functions...) and the editor
 * surfaces. Blocks take the colour of the toolbox category they appear in, so a theme only has to
 * pick one colour per category.
 */

type ThemeOptions = Parameters<typeof Blockly.Theme.defineTheme>[1];
type ToolboxNode = { kind?: string; categoryId?: string; type?: string; [key: string]: unknown };

/** Built-in Blockly block styles and the toolbox category whose colour they take. */
const CORE_STYLE_CATEGORIES: Record<string, string> = {
    logic: 'logic',
    loop: 'loops',
    math: 'math',
    text: 'text',
    list: 'lists',
    variable: 'variables',
    variable_dynamic: 'variables',
    procedure: 'functions',
};

const blockColours = new Map<string, string>();
const themedBlockTypes = new Set<string>();

/** Mix a #rrggbb colour towards white (amount > 0) or black (amount < 0). */
export function shade(colour: string, amount: number): string {
    const n = parseInt(colour.slice(1), 16);
    const target = amount > 0 ? 255 : 0;
    return (
        '#' +
        [16, 8, 0]
            .map((shift) => (n >> shift) & 255)
            .map((c) => Math.round(c + (target - c) * Math.abs(amount)))
            .map((c) => c.toString(16).padStart(2, '0'))
            .join('')
    );
}

/** Block style for a primary colour, with Blockly's lighter secondary and darker tertiary. */
function blockStyle(colour: string) {
    return {
        colourPrimary: colour,
        colourSecondary: shade(colour, 0.6),
        colourTertiary: shade(colour, -0.2),
    };
}

/** Return a copy of a toolbox with every category coloured by the theme. */
export function themeToolbox<T>(toolbox: T, theme: BlockTheme): T {
    const walk = (node: unknown, parentColour?: string): unknown => {
        if (Array.isArray(node)) {
            return node.map((child) => walk(child, parentColour));
        }
        if (!node || typeof node !== 'object') {
            return node;
        }
        const item = node as ToolboxNode;
        if (item.kind?.toUpperCase() !== 'CATEGORY') {
            return Object.fromEntries(
                Object.entries(item).map(([key, value]) => [key, walk(value, parentColour)]),
            );
        }
        const colour = theme.categories[item.categoryId ?? ''] ?? parentColour ?? item.colour;
        const themed: ToolboxNode = { ...item, colour };
        if (item.contents !== undefined) {
            themed.contents = walk(item.contents, colour as string | undefined);
        }
        return themed;
    };
    return walk(toolbox) as T;
}

/**
 * Colour every block type listed in a themed toolbox with its category colour. Each block type's
 * `init` is wrapped once; the colour is looked up when a block is created, so calling this again
 * with another toolbox or theme updates new blocks.
 */
export function colourBlocksByCategory(themedToolbox: unknown): void {
    blockColours.clear();
    const walk = (node: unknown, colour?: string) => {
        if (Array.isArray(node)) {
            node.forEach((child) => walk(child, colour));
            return;
        }
        if (!node || typeof node !== 'object') {
            return;
        }
        const item = node as ToolboxNode;
        const kind = item.kind?.toUpperCase();
        if (kind === 'CATEGORY') {
            walk(item.contents, (item.colour as string | undefined) ?? colour);
        } else if (kind === 'BLOCK' && item.type && colour && !blockColours.has(item.type)) {
            blockColours.set(item.type, colour);
        } else {
            walk(item.contents, colour);
        }
    };
    walk(themedToolbox);

    for (const type of blockColours.keys()) {
        const definition = Blockly.Blocks[type];
        if (!definition?.init || themedBlockTypes.has(type)) {
            continue;
        }
        const init = definition.init;
        definition.init = function (this: Blockly.Block) {
            init.call(this);
            const colour = blockColours.get(type);
            if (colour) {
                this.setColour(colour);
            }
        };
        themedBlockTypes.add(type);
    }
}

/** Colour a block type would get from the current themed toolbox, if any. */
export function blockColourFor(type: string): string | undefined {
    return blockColours.get(type);
}

/**
 * Return Blockly theme options with the theme's built-in block styles, category styles and editor
 * surfaces for the given app mode merged over `options`.
 */
export function blockThemeOptions(
    options: ThemeOptions,
    theme: BlockTheme,
    mode: keyof BlockTheme['surfaces'],
): ThemeOptions {
    const surfaces: BlockThemeSurfaces = theme.surfaces[mode];
    const blockStyles = { ...options.blockStyles };
    const categoryStyles = { ...options.categoryStyles };
    for (const [style, category] of Object.entries(CORE_STYLE_CATEGORIES)) {
        const colour = theme.categories[category];
        if (colour) {
            blockStyles[`${style}_blocks`] = {
                ...blockStyles[`${style}_blocks`],
                ...blockStyle(colour),
            };
            categoryStyles[`${style}_category`] = { colour };
        }
    }
    return {
        ...options,
        blockStyles,
        categoryStyles,
        componentStyles: {
            ...options.componentStyles,
            workspaceBackgroundColour: surfaces.workspace,
            toolboxBackgroundColour: surfaces.toolbox,
            toolboxForegroundColour: surfaces.toolboxText,
            flyoutBackgroundColour: surfaces.flyout,
            flyoutForegroundColour: surfaces.toolboxText,
            flyoutOpacity: 1,
        },
    };
}
