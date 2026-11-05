import * as Blockly from 'blockly/core';

/**
 * Vivid, MakeCode-style block colours.
 *
 * Blockly turns hue-only colours (e.g. `setColour(352)`) into RGB with a default saturation of
 * 0.45 and value of 0.65, which gives the muted look. The XRP toolbox and the light theme also use
 * hex colours picked with those same defaults. Raising both in one place keeps every category's
 * hue, so blocks still match their toolbox stripe, but makes the palette brighter.
 */
export const VIVID_SATURATION = 0.75;
export const VIVID_VALUE = 0.85;

const DEFAULT_SATURATION = 0.45;
const DEFAULT_VALUE = 0.65;

/** Apply the vivid saturation/value to every hue-based block colour. Call once at startup. */
export function applyVividHsv(): void {
    Blockly.utils.colour.setHsvSaturation(VIVID_SATURATION);
    Blockly.utils.colour.setHsvValue(VIVID_VALUE);
}

/** Convert a #rrggbb colour to HSV with h in [0, 360) and s, v in [0, 1]. */
function hexToHsv(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    let h = 0;
    if (delta !== 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
    }
    return [(h * 60 + 360) % 360, max === 0 ? 0 : delta / max, max];
}

/** Convert HSV (h in degrees, s and v in [0, 1]) to #rrggbb. */
function hsvToHex(h: number, s: number, v: number): string {
    const f = (k: number) => {
        const x = (k + h / 60) % 6;
        return v - v * s * Math.max(0, Math.min(x, 4 - x, 1));
    };
    return (
        '#' +
        [f(5), f(3), f(1)]
            .map((c) =>
                Math.round(c * 255)
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('')
    );
}

/**
 * Make a hex colour vivid by scaling its saturation and value the same way the hue-based
 * colours are raised. Colours that are already saturated (e.g. #0080ff) stay as they are.
 * Anything that is not a #rrggbb string is returned unchanged.
 */
export function vividColour(colour: string): string {
    if (!/^#[0-9a-f]{6}$/i.test(colour)) {
        return colour;
    }
    const [h, s, v] = hexToHsv(colour);
    return hsvToHex(
        h,
        Math.min(1, (s * VIVID_SATURATION) / DEFAULT_SATURATION),
        Math.min(1, (v * VIVID_VALUE) / DEFAULT_VALUE),
    );
}

/** Return a copy of a toolbox definition with every category `colour` made vivid. */
export function vividToolbox<T>(toolbox: T): T {
    const walk = (node: unknown): unknown => {
        if (Array.isArray(node)) {
            return node.map(walk);
        }
        if (node && typeof node === 'object') {
            return Object.fromEntries(
                Object.entries(node).map(([key, value]) => [
                    key,
                    key === 'colour' && typeof value === 'string'
                        ? vividColour(value)
                        : walk(value),
                ]),
            );
        }
        return node;
    };
    return walk(toolbox) as T;
}

type ThemeOptions = Parameters<typeof Blockly.Theme.defineTheme>[1];

/** Make an optional colour vivid, keeping undefined as is. */
const vividOptional = (colour?: string) => (colour === undefined ? colour : vividColour(colour));

/** Return a copy of theme options with every block and category colour made vivid. */
export function vividThemeOptions(options: ThemeOptions): ThemeOptions {
    const blockStyles = Object.fromEntries(
        Object.entries(options.blockStyles ?? {}).map(([name, style]) => [
            name,
            {
                ...style,
                colourPrimary: vividOptional(style.colourPrimary),
                colourSecondary: vividOptional(style.colourSecondary),
                colourTertiary: vividOptional(style.colourTertiary),
            },
        ]),
    );
    const categoryStyles = Object.fromEntries(
        Object.entries(options.categoryStyles ?? {}).map(([name, style]) => [
            name,
            { ...style, colour: vividColour(style.colour) },
        ]),
    );
    return { ...options, blockStyles, categoryStyles };
}
