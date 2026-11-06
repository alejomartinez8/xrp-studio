import * as Blockly from 'blockly/core';
import i18n from '@/utils/i18n';
import { collectBlocks, sharedSearchIndex } from '@components/blockly/block-search';

/**
 * Toolbox search field (toolbox kind `search`) that shows the matching blocks in its flyout.
 *
 * Adapted from `ToolboxSearchCategory` in `@blockly/toolbox-search` 3.1.9 (Copyright 2023 Google
 * LLC, Apache-2.0). Changes: the block index is shared and built on first search
 * (`sharedSearchIndex`), the Ctrl+B shortcut is registered once for the whole app
 * (`registerSearchShortcut`) instead of once per editor, and the texts go through i18n.
 */
export class XrpToolboxSearchCategory extends Blockly.ToolboxCategory {
    static readonly KIND = 'search';
    static readonly INPUT_ID = 'toolbox-search-input';
    private searchField?: HTMLInputElement;

    /** Build the row with the search input in place of the label. */
    protected override createDom_(): HTMLDivElement {
        const dom = super.createDom_();
        const field = document.createElement('input');
        field.id = XrpToolboxSearchCategory.INPUT_ID;
        field.type = 'search';
        field.placeholder = i18n.t('blockly.toolbox.search');
        field.setAttribute('aria-label', i18n.t('blockly.toolbox.search'));
        if (this.workspace_.RTL) {
            field.style.marginRight = '8px';
        } else {
            field.style.marginLeft = '8px';
        }
        field.addEventListener('keyup', (event) => {
            if (event.key === 'Escape') {
                this.parentToolbox_.clearSelection();
                return;
            }
            this.matchBlocks();
        });
        this.searchField = field;
        this.rowContents_?.replaceChildren(field);
        return dom;
    }

    /** The id of the toolbox item must match the id of the focusable node. */
    override getId(): string {
        return XrpToolboxSearchCategory.INPUT_ID;
    }

    /** See IFocusableNode.getFocusableElement. */
    override getFocusableElement(): HTMLElement | SVGElement {
        if (!this.searchField) {
            throw Error('This field currently has no representative DOM element.');
        }
        return this.searchField;
    }

    /** See IFocusableNode.onNodeFocus. */
    override onNodeFocus(): void {
        this.matchBlocks();
    }

    /** See IFocusableNode.onNodeBlur. */
    override onNodeBlur(): void {
        if (this.searchField) this.searchField.value = '';
    }

    /** Show the blocks that match the query, or a hint when there are none. */
    private matchBlocks(): void {
        const query = this.searchField?.value ?? '';
        const items: Blockly.utils.toolbox.FlyoutItemInfoArray = query
            ? sharedSearchIndex(
                  collectBlocks(this.workspace_.options.languageTree?.contents),
                  i18n.language,
              ).blockTypesMatching(query)
            : [];
        if (items.length === 0) {
            items.push({
                kind: 'label',
                text: i18n.t(
                    query.length < 3 ? 'blockly.toolbox.searchHint' : 'blockly.toolbox.searchNone',
                ),
            });
        }
        this.flyoutItems_ = items;
        this.parentToolbox_.refreshSelection();
    }
}

const START_SEARCH_SHORTCUT = 'startSearch';

/** The search field of the toolbox of the main workspace, if it has one. */
function currentSearchCategory(): XrpToolboxSearchCategory | undefined {
    const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg | undefined;
    const toolbox = workspace?.getToolbox?.() as Blockly.Toolbox | null | undefined;
    return toolbox
        ?.getToolboxItems()
        .find((item): item is XrpToolboxSearchCategory => item instanceof XrpToolboxSearchCategory);
}

/** Register Ctrl+B (focus the block search of the current editor) once for the whole app. */
export function registerSearchShortcut(): void {
    const registry = Blockly.ShortcutRegistry.registry;
    if (registry.getRegistry()[START_SEARCH_SHORTCUT]) {
        return;
    }
    registry.register({
        name: START_SEARCH_SHORTCUT,
        callback: () => {
            const category = currentSearchCategory();
            if (!category) return false;
            Blockly.getFocusManager().focusNode(category);
            return true;
        },
        keyCodes: [
            registry.createSerializedKey(Blockly.utils.KeyCodes.B, [Blockly.utils.KeyCodes.CTRL]),
        ],
    });
}

/** Register the search field for the toolbox kind `search` and its shortcut. */
export function registerToolboxSearch(): void {
    Blockly.registry.register(
        Blockly.registry.Type.TOOLBOX_ITEM,
        XrpToolboxSearchCategory.KIND,
        XrpToolboxSearchCategory,
        true,
    );
    registerSearchShortcut();
}
