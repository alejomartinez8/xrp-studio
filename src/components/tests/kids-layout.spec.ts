import { describe, expect, it } from 'vitest';
import type { IJsonModel } from 'flexlayout-react';
import { Model, BorderNode } from 'flexlayout-react';
import { hideFolderTree, kidsLayout } from '@components/kids/kids-layout';
import { Constants } from '@/utils/constants';

const layout: IJsonModel = {
    global: {},
    borders: [
        {
            type: 'border',
            location: 'left',
            selected: 0,
            children: [{ type: 'tab', id: Constants.FOLDER_TAB_ID, component: 'folders' }],
        },
    ],
    layout: {
        type: 'row',
        children: [
            {
                type: 'row',
                children: [
                    { type: 'tabset', id: Constants.EDITOR_TABSET_ID, children: [] },
                    {
                        type: 'tabset',
                        id: Constants.SHELL_TABSET_ID,
                        children: [{ type: 'tab', id: Constants.SHELL_TAB_ID, component: 'xterm' }],
                    },
                ],
            },
        ],
    },
};

describe('kids layout', () => {
    const kids = kidsLayout(layout);

    it('starts with the folder tree open so it mounts and never unmounts', () => {
        const border = kids.borders![0];
        expect(border.selected).toBe(0);
        expect(border.children[0].enableRenderOnDemand).toBe(false);
    });

    it('maximizes the editor and keeps the terminal in the layout', () => {
        const row = kids.layout.children[0] as { children: { id: string; maximized?: boolean }[] };
        expect(row.children[0]).toMatchObject({ id: Constants.EDITOR_TABSET_ID, maximized: true });
        expect(row.children[1].id).toBe(Constants.SHELL_TABSET_ID);
    });

    it('collapses and hides the folder tree after the first render', () => {
        const model = Model.fromJson(kids);
        hideFolderTree(model);
        const border = model.getNodeById(Constants.FOLDER_TAB_ID)?.getParent() as BorderNode;
        expect(border.getSelected()).toBe(-1);
        expect(border.isShowing()).toBe(false);
    });

    it('does not change the original layout', () => {
        expect(layout.borders![0].children[0].enableRenderOnDemand).toBeUndefined();
    });
});
