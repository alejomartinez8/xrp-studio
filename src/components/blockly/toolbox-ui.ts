import * as Blockly from 'blockly/core';
import '@blockly/toolbox-search';
import { createElement } from 'react';
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
import { vividToolbox } from '@components/blockly/vivid-colours';
import '@components/blockly/toolbox-ui.css';

/**
 * Kid-friendly toolbox: an icon per category, labels in the category colour, taller rows,
 * a search field at the top and an "Advanced" group that is collapsed by default.
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
const ADVANCED_COLOUR = '#5c6670';
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
 * Colour a category's label and icon with a shade of the category colour, or white while selected
 * (the row background then takes the category colour).
 */
function paintCategory(category: Blockly.ToolboxCategory, colour: string, isSelected: boolean) {
    const tint = isSelected ? '#fff' : textShade(colour);
    const label = category.getDiv()?.querySelector<HTMLElement>('.blocklyToolboxCategoryLabel');
    const icon = category.getDiv()?.querySelector<HTMLElement>('.xrpToolboxIcon');
    if (label) label.style.color = tint;
    if (icon) icon.style.color = tint;
}

/** Toolbox category with an icon and coloured label. */
class XrpToolboxCategory extends Blockly.ToolboxCategory {
    protected override createIconDom_(): Element {
        const Icon = CATEGORY_ICONS[categoryIdOf(this) ?? ''];
        if (!Icon) {
            return super.createIconDom_();
        }
        const span = document.createElement('span');
        span.className = 'xrpToolboxIcon';
        createRoot(span).render(createElement(Icon, { size: 20 }));
        return span;
    }

    override init(): void {
        super.init();
        paintCategory(this, this.colour_, false);
    }

    override setSelected(isSelected: boolean): void {
        super.setSelected(isSelected);
        paintCategory(this, this.colour_, isSelected);
    }
}

/** Collapsible category (e.g. Sensors, Advanced) with a coloured label. */
class XrpCollapsibleToolboxCategory extends Blockly.CollapsibleToolboxCategory {
    override init(): void {
        super.init();
        paintCategory(this, this.colour_, false);
    }

    override setSelected(isSelected: boolean): void {
        super.setSelected(isSelected);
        paintCategory(this, this.colour_, isSelected);
    }
}

/** Register the kid-friendly categories in place of Blockly's defaults. Call once at startup. */
export function registerToolboxUi(): void {
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
                colour: ADVANCED_COLOUR,
                expanded: 'false',
                contents: advanced,
            },
        ],
    };
}

/** Add the search field as the first toolbox entry. */
export function addSearch<T extends Toolbox>(toolbox: T, name: string): T {
    return { ...toolbox, contents: [{ kind: 'search', name, contents: [] }, ...toolbox.contents] };
}

/** Build the kid-friendly toolbox (search, advanced group, vivid colours) from the XRP one. */
export function kidFriendlyToolbox<T>(toolbox: T): T {
    const base = toolbox as unknown as Toolbox;
    const grouped = groupAdvancedCategories(base, i18n.t('blockly.toolbox.advanced'));
    return vividToolbox(addSearch(grouped, i18n.t('blockly.toolbox.search'))) as unknown as T;
}
