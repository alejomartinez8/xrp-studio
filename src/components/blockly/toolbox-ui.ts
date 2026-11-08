import * as Blockly from 'blockly/core';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { IconType } from 'react-icons';
import {
    TbArrowsShuffle,
    TbCalculator,
    TbChartLine,
    TbCompass,
    TbCpu,
    TbDeviceGamepad2,
    TbGauge,
    TbLetterCase,
    TbList,
    TbMathFunction,
    TbPuzzle,
    TbRadar,
    TbRepeat,
    TbRotateClockwise,
    TbRuler2,
    TbSettings,
    TbSteeringWheel,
    TbSunHigh,
    TbVariable,
    TbWorld,
} from 'react-icons/tb';
import i18n from '@/utils/i18n';
import { colourBlocksByCategory, themeToolbox } from '@components/blockly/block-theme';
import { activeBlockTheme } from '@/theme';
import { registerToolboxSearch } from '@components/blockly/toolbox-search-category';
import { registerBlockMessages } from '@components/blockly/block-messages';
import '@components/blockly/toolbox-ui.css';

/**
 * Kid-friendly toolbox: an icon per category, labels in the category colour, taller rows,
 * a search field at the top, a "Motors" group (like Sensors) and an "Advanced" group that is
 * collapsed by default.
 */

/** Icon shown next to each category, keyed by the toolbox `categoryId`. */
const CATEGORY_ICONS: Record<string, IconType> = {
    individualMotors: TbSettings,
    driveTrain: TbSteeringWheel,
    servos: TbRotateClockwise,
    sensors: TbRadar,
    distance: TbRuler2,
    reflectance: TbSunHigh,
    gyro: TbCompass,
    accelerometer: TbGauge,
    controlBoard: TbCpu,
    webServer: TbWorld,
    dashboard: TbChartLine,
    gamepad: TbDeviceGamepad2,
    thirdParty: TbPuzzle,
    logic: TbArrowsShuffle,
    loops: TbRepeat,
    math: TbCalculator,
    text: TbLetterCase,
    lists: TbList,
    variables: TbVariable,
    functions: TbMathFunction,
};

/** Categories moved into the collapsed "Advanced" group, in this order. */
export const ADVANCED_CATEGORY_IDS = [
    'webServer',
    'dashboard',
    'gamepad',
    'thirdParty',
    'text',
    'lists',
    'functions',
];

const ADVANCED_CATEGORY_ID = 'advanced';

/** Categories gathered into the "Motors" group, in this order (spec 002). */
export const MOTOR_CATEGORY_IDS = ['driveTrain', 'individualMotors', 'servos'];

const MOTORS_CATEGORY_ID = 'motors';
const TEXT_SHADE = 0.8;
const DARK_THEME_LIGHTEN = 0.45;

type ToolboxItem = { kind: string; categoryId?: string; [key: string]: unknown };
type Toolbox = { contents: ToolboxItem[]; [key: string]: unknown };

/** Category id stored in the toolbox definition of a category, if any. */
function categoryIdOf(category: Blockly.ToolboxCategory): string | undefined {
    return (category.toolboxItemDef_ as { categoryId?: string }).categoryId;
}

/**
 * Shade a #rrggbb colour so it stays readable as text on the toolbox: darker on the light theme
 * (for lime, aqua) and mixed with white on the dark theme (for blue, purple).
 */
function textShade(colour: string): string {
    if (!/^#[0-9a-f]{6}$/i.test(colour)) {
        return colour;
    }
    const isDark = document.documentElement.classList.contains('dark');
    const n = parseInt(colour.slice(1), 16);
    return (
        '#' +
        [16, 8, 0]
            .map((shift) => (n >> shift) & 255)
            .map((c) => (isDark ? c + (255 - c) * DARK_THEME_LIGHTEN : c * TEXT_SHADE))
            .map((c) => Math.round(c).toString(16).padStart(2, '0'))
            .join('')
    );
}

/**
 * Colour a category's own label and icon with a shade of the category colour, or white while
 * selected (the row background then takes the category colour). Only the category's own elements
 * are painted, never those of nested categories.
 */
function paintCategory(
    label: Element | null,
    icon: Element | null,
    colour: string,
    isSelected: boolean,
) {
    const tint = isSelected ? '#fff' : textShade(colour);
    if (label instanceof HTMLElement) label.style.color = tint;
    if (icon instanceof HTMLElement && icon.classList.contains('xrpToolboxIcon')) {
        icon.style.color = tint;
    }
}

/**
 * Toolbox category with an icon and coloured label. The icon is rendered synchronously so it is
 * already in place when Blockly measures the toolbox width; rendered later, it widened the toolbox
 * after the workspace was laid out, and on phones the program could start under the toolbox.
 */
class XrpToolboxCategory extends Blockly.ToolboxCategory {
    protected override createIconDom_(): Element {
        const Icon = CATEGORY_ICONS[categoryIdOf(this) ?? ''];
        if (!Icon) {
            return super.createIconDom_();
        }
        const span = document.createElement('span');
        span.className = 'xrpToolboxIcon';
        const root = createRoot(span);
        flushSync(() => root.render(createElement(Icon, { size: 20 })));
        return span;
    }

    override init(): void {
        super.init();
        paintCategory(this.labelDom_, this.iconDom_, this.colour_, false);
    }

    override setSelected(isSelected: boolean): void {
        super.setSelected(isSelected);
        paintCategory(this.labelDom_, this.iconDom_, this.colour_, isSelected);
    }
}

/** Collapsible category (e.g. Sensors, Advanced) with a coloured label. */
class XrpCollapsibleToolboxCategory extends Blockly.CollapsibleToolboxCategory {
    override init(): void {
        super.init();
        paintCategory(this.labelDom_, this.iconDom_, this.colour_, false);
    }

    override setSelected(isSelected: boolean): void {
        super.setSelected(isSelected);
        paintCategory(this.labelDom_, this.iconDom_, this.colour_, isSelected);
    }
}

/**
 * Register the kid-friendly categories in place of Blockly's defaults, the block search field and
 * the per-language block sentences ({@link registerBlockMessages}). Call once at startup.
 */
export function registerToolboxUi(): void {
    registerToolboxSearch();
    registerBlockMessages();
    Blockly.registry.register(
        Blockly.registry.Type.TOOLBOX_ITEM,
        Blockly.ToolboxCategory.registrationName,
        XrpToolboxCategory,
        true,
    );
    Blockly.registry.register(
        Blockly.registry.Type.TOOLBOX_ITEM,
        Blockly.CollapsibleToolboxCategory.registrationName,
        XrpCollapsibleToolboxCategory,
        true,
    );
}

/** Move the advanced categories into a collapsed "Advanced" category at the end. */
export function groupAdvancedCategories<T extends Toolbox>(toolbox: T, name: string): T {
    const isAdvanced = (item: ToolboxItem) =>
        item.kind.toUpperCase() === 'CATEGORY' &&
        ADVANCED_CATEGORY_IDS.includes(item.categoryId ?? '');
    const advanced = ADVANCED_CATEGORY_IDS.flatMap((id) =>
        toolbox.contents.filter((item) => isAdvanced(item) && item.categoryId === id),
    );
    if (advanced.length === 0) {
        return toolbox;
    }
    return {
        ...toolbox,
        contents: [
            ...toolbox.contents.filter((item) => !isAdvanced(item)),
            { kind: 'SEP' },
            {
                kind: 'CATEGORY',
                categoryId: ADVANCED_CATEGORY_ID,
                name,
                expanded: 'false',
                contents: advanced,
            },
        ],
    };
}

/**
 * Gather the motor categories into an open "Motors" group, placed where the first of them was,
 * like the Sensors group. Blocks and their code are unchanged; only the toolbox layout moves.
 */
export function groupMotorCategories<T extends Toolbox>(toolbox: T, name: string): T {
    const isMotor = (item: ToolboxItem) =>
        item.kind.toUpperCase() === 'CATEGORY' &&
        MOTOR_CATEGORY_IDS.includes(item.categoryId ?? '');
    const motors = MOTOR_CATEGORY_IDS.flatMap((id) =>
        toolbox.contents.filter((item) => isMotor(item) && item.categoryId === id),
    );
    const first = toolbox.contents.findIndex(isMotor);
    if (first === -1) {
        return toolbox;
    }
    const group = {
        kind: 'CATEGORY',
        categoryId: MOTORS_CATEGORY_ID,
        name,
        expanded: 'true',
        contents: motors,
    };
    return {
        ...toolbox,
        contents: toolbox.contents.flatMap((item, index) =>
            index === first ? [group] : isMotor(item) ? [] : [item],
        ),
    };
}

/** Add the search field as the first toolbox entry. */
export function addSearch<T extends Toolbox>(toolbox: T, name: string): T {
    return { ...toolbox, contents: [{ kind: 'search', name, contents: [] }, ...toolbox.contents] };
}

/**
 * Build the kid-friendly toolbox (search, advanced group, theme colours) from the XRP one, and
 * colour each block type with the colour of its category.
 */
export function kidFriendlyToolbox<T>(toolbox: T): T {
    const base = toolbox as unknown as Toolbox;
    const grouped = groupAdvancedCategories(
        groupMotorCategories(base, i18n.t('blockly.toolbox.motors')),
        i18n.t('blockly.toolbox.advanced'),
    );
    const themed = themeToolbox(
        addSearch(grouped, i18n.t('blockly.toolbox.search')),
        activeBlockTheme,
    );
    colourBlocksByCategory(themed);
    return themed as unknown as T;
}
