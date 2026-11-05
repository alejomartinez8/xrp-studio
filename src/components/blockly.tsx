import { pythonGenerator } from 'blockly/python';
import { registerFieldColour } from '@blockly/field-colour';
import { BlocklyWorkspace, Workspace } from 'react-blockly';
import BlocklyConfigs from '@components/blockly/xrp_blockly_configs';
import * as Blockly from 'blockly/core';
import { applyBlocklyLocale, refreshBlocklyWorkspace } from '@/utils/blockly-locales';
import AppMgr, { EventType, LoginStatus, Themes } from '@/managers/appmgr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { StorageKeys } from '@/utils/localstorage';
import EditorMgr, { EditorSession } from '@/managers/editormgr';
import i18n from '@/utils/i18n';
import moment from 'moment';
import { blockThemeOptions } from '@components/blockly/block-theme';
import { activeBlockTheme } from '@/theme';
import { kidFriendlyToolbox, registerToolboxUi } from '@components/blockly/toolbox-ui';

registerFieldColour(); //Plugin needs to be registered. Used for the Color LED on the non beta board. 
registerToolboxUi();

const blocklyDarkTheme = Blockly.Theme.defineTheme('dark', blockThemeOptions({
    base: Blockly.Themes.Classic,
    componentStyles: {
        workspaceBackgroundColour: '#1e1e1e',
        toolboxBackgroundColour: '#444',
        toolboxForegroundColour: '#ddd',
        flyoutBackgroundColour: '#444',
        flyoutForegroundColour: '#ddd',
        flyoutOpacity: 1,
        scrollbarColour: '#797979',
        insertionMarkerColour: '#fff',
        insertionMarkerOpacity: 0.3,
        scrollbarOpacity: 0.4,
        cursorColour: '#d0d0d0',
    },
    name: 'dark',
}, activeBlockTheme, 'dark'));

const blocklyMpdernTheme = Blockly.Theme.defineTheme('modern', blockThemeOptions({
    base: Blockly.Themes.Classic,
    blockStyles: {
        colour_blocks: {
            colourPrimary: '#a5745b',
            colourSecondary: '#dbc7bd',
            colourTertiary: '#845d49',
        },
        list_blocks: {
            colourPrimary: '#745ba5',
            colourSecondary: '#c7bddb',
            colourTertiary: '#5d4984',
        },
        logic_blocks: {
            colourPrimary: '#5b80a5',
            colourSecondary: '#bdccdb',
            colourTertiary: '#496684',
        },
        loop_blocks: {
            colourPrimary: '#5ba55b',
            colourSecondary: '#bddbbd',
            colourTertiary: '#498449',
        },
        math_blocks: {
            colourPrimary: '#5b67a5',
            colourSecondary: '#bdc2db',
            colourTertiary: '#495284',
        },
        procedure_blocks: {
            colourPrimary: '#995ba5',
            colourSecondary: '#d6bddb',
            colourTertiary: '#7a4984',
        },
        text_blocks: {
            colourPrimary: '#5ba58c',
            colourSecondary: '#bddbd1',
            colourTertiary: '#498470',
        },
        variable_blocks: {
            colourPrimary: '#a55b99',
            colourSecondary: '#dbbdd6',
            colourTertiary: '#84497a',
        },
        variable_dynamic_blocks: {
            colourPrimary: '#a55b99',
            colourSecondary: '#dbbdd6',
            colourTertiary: '#84497a',
        },
        hat_blocks: {
            colourPrimary: '#a55b99',
            colourSecondary: '#dbbdd6',
            colourTertiary: '#84497a',
            hat: 'cap',
        },
    },
    categoryStyles: {
        colour_category: {
            colour: '#a5745b',
        },
        list_category: {
            colour: '#745ba5',
        },
        logic_category: {
            colour: '#5b80a5',
        },
        loop_category: {
            colour: '#5ba55b',
        },
        math_category: {
            colour: '#5b67a5',
        },
        procedure_category: {
            colour: '#995ba5',
        },
        text_category: {
            colour: '#5ba58c',
        },
        variable_category: {
            colour: '#a55b99',
        },
        variable_dynamic_category: {
            colour: '#a55b99',
        },
    },
    componentStyles: {},
    fontStyle: {},
    name: 'modern',
}, activeBlockTheme, 'light'));

interface BlocklyEditorProps {
    tabId: string;
    tabName: string;
}

type BlocklyViewport = { scrollX: number; scrollY: number; scale: number };

type BlocklyWorkspaceSvg = Workspace & {
    scrollX: number;
    scrollY: number;
    scale: number;
    resize: () => void;
    setScale: (scale: number) => void;
    scroll: (x: number, y: number) => void;
    scrollCenter: () => void;
    zoomToFit: () => void;
};

function asSvgWorkspace(ws: Workspace): BlocklyWorkspaceSvg | null {
    if (
        'scrollX' in ws &&
        'scrollY' in ws &&
        'scale' in ws &&
        typeof (ws as BlocklyWorkspaceSvg).scroll === 'function'
    ) {
        return ws as BlocklyWorkspaceSvg;
    }
    return null;
}

function captureViewport(ws: Workspace): BlocklyViewport | undefined {
    const svgWs = asSvgWorkspace(ws);
    if (!svgWs) {
        return undefined;
    }
    return { scrollX: svgWs.scrollX, scrollY: svgWs.scrollY, scale: svgWs.scale };
}

function restoreViewport(ws: Workspace, viewport: BlocklyViewport) {
    const svgWs = asSvgWorkspace(ws);
    if (!svgWs) {
        return;
    }
    // Recompute the SVG size for the now-visible container before scrolling,
    // otherwise Blockly clamps scroll against stale (0x0) metrics.
    Blockly.svgResize(svgWs as unknown as Blockly.WorkspaceSvg);
    svgWs.setScale(viewport.scale);
    // scroll() takes an absolute target position (not a delta).
    svgWs.scroll(viewport.scrollX, viewport.scrollY);
}

/** Zoom to fit and center all blocks — used only when a file is first opened. */
function centerAndFit(ws: Workspace) {
    const svgWs = asSvgWorkspace(ws);
    if (!svgWs) {
        return;
    }
    Blockly.svgResize(svgWs as unknown as Blockly.WorkspaceSvg);
    svgWs.zoomToFit();
    svgWs.scrollCenter();
}

function loadBlocksIntoWorkspace(ws: Workspace, session: EditorSession) {
    if (!session.content) {
        return;
    }
    const lines = session.content.split('##XRPBLOCKS ');
    const blockContent = lines.length > 1 ? lines[1]! : lines[0]!;
    Blockly.serialization.workspaces.load(JSON.parse(blockContent), ws);
}

/**
 * blocklyToPython
 * @param ws
 * @returns
 */
function blocklyToPython(ws: Workspace) {
    const pythonCode = pythonGenerator
        .workspaceToCode(ws)
        .replace('from numbers import Number\n', 'Number = int\n');
    const blocklyCode = JSON.stringify(Blockly.serialization.workspaces.save(ws));
    const date = moment();
    const formatedDate = date.format('YYYY-MM-DD HH:MM:SS');
    const code = pythonCode + '\n\n\n## ' + formatedDate + '\n##XRPBLOCKS ' + blocklyCode;
    return code;
}


/**
 * BlocklyEditor component
 * @returns
 */
function BlocklyEditor({ tabId, tabName }: BlocklyEditorProps) {
    /** Bumped when the shared toolbox JSON is updated (e.g. after XRP connect or language change). */
    const [toolboxRevision, setToolboxRevision] = useState(0);
    const [language, setLanguage] = useState(i18n.language);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [name, setName] = useState<string>(tabName);
    const nameRef = useRef(name);
    const isLoadingRef = useRef(isLoading);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    // True when this is a Google Drive file (session.gpath) but the user is
    // signed out of Google Drive. The file cannot be saved, so editing is
    // blocked until they sign back in.
    const [editBlocked, setEditBlocked] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const evaluateEditBlocked = useCallback(() => {
        const session = EditorMgr.getInstance().getEditorSession(tabId);
        setEditBlocked(!!session?.gpath && !AppMgr.getInstance().authService.isLogin);
    }, [tabId]);

    const persistViewport = useCallback((ws: Workspace) => {
        // When FlexLayout hides this tab (display:none) the container is 0x0 and
        // Blockly fires a VIEWPORT_CHANGE with a reset scroll. Ignore it so we
        // never overwrite the good saved viewport with the hidden-state values.
        const el = containerRef.current;
        if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
            return;
        }
        const session = EditorMgr.getInstance().getEditorSession(tabId);
        const viewport = captureViewport(ws);
        if (session && viewport) {
            session.viewport = viewport;
        }
    }, [tabId]);

    const restoreViewportForTab = useCallback(
        (ws: Workspace) => {
            const session = EditorMgr.getInstance().getEditorSession(tabId);
            if (session?.viewport) {
                restoreViewport(ws, session.viewport);
            }
        },
        [tabId],
    );

    // Shallow copy gives react-blockly a new reference so its updateToolbox effect runs.
    const toolboxConfiguration = useMemo(
        () => kidFriendlyToolbox({ ...BlocklyConfigs.getLocalizedToolboxJson() }) as typeof BlocklyConfigs.ToolboxJson,
        [toolboxRevision, language],
    );

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    /**
     * useEffect - setup a reference to the editor name
     */
    useEffect(() => {
        nameRef.current = name;
    }, [name]);    

    /**
     * handleOnInject
     */
    function handleOnInject(ws: Workspace) {
        const editorSession = EditorMgr.getInstance().getEditorSession(tabId);
        if (editorSession) {
            editorSession.workspace = ws;
            // FlexLayout can remount a hidden tab with an empty workspace while the
            // session still has saved block data — reload without resetting hasBeenLoaded.
            if (
                editorSession.hasBeenLoaded &&
                editorSession.content &&
                ws.getAllBlocks(false).length === 0
            ) {
                try {
                    isLoadingRef.current = true;
                    Blockly.Events.disable();
                    loadBlocksIntoWorkspace(ws, editorSession);
                } finally {
                    Blockly.Events.enable();
                    isLoadingRef.current = false;
                }
            }
        }
        setWorkspace(ws);
        if (editorSession?.viewport) {
            requestAnimationFrame(() => restoreViewportForTab(ws));
        }
    }
    
    /**
     * saveEditor
     */
    const saveEditor = useCallback(async () =>{
        const ws = EditorMgr.getInstance().getEditorSession(tabId)?.workspace;
        if (ws) {
            const activeTab = localStorage.getItem(StorageKeys.ACTIVETAB)?.replace(/^"|"$/g, '');
            if (activeTab === tabId) {
                const code = blocklyToPython(ws);
                console.log('Saving blockly', activeTab, code);
                await EditorMgr.getInstance().saveEditor(tabId, code);
                EditorMgr.getInstance().SaveToLocalStorage(
                    EditorMgr.getInstance().getEditorSession(tabId) as EditorSession,
                    code
                );
            }
        }
    }, []);

    useHotkeys('ctrl+s, meta+s', (event) => {
        event.preventDefault();
        saveEditor();
    });

    useEffect(() => {
        if (
            EditorMgr.getInstance().hasEditorSession(tabId) &&
            !EditorMgr.getInstance().hasSubscription(tabId)
        ) {
            AppMgr.getInstance().on(EventType.EVENT_THEME, (theme) => {
                const ws = EditorMgr.getInstance().getEditorSession(tabId)?.workspace;

                if (ws) {
                    // Not sure why the compiler complain but it works at runtime
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    ws.setTheme(theme === Themes.DARK ? blocklyDarkTheme : blocklyMpdernTheme);
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_EDITOR_LOAD, (content) => {
                const loadContent = JSON.parse(content);
                const session: EditorSession | undefined =
                    EditorMgr.getInstance().getEditorSession(tabId);
                if (loadContent.name !== nameRef.current || loadContent.path !== session?.path) return;
                const ws = session?.workspace;
                if (ws && session && session.hasBeenLoaded !== true) {
                    try {
                        Blockly.Events.disable();
                        Blockly.serialization.workspaces.load(JSON.parse(loadContent.content), ws);
                        session.hasBeenLoaded = true;
                    } finally {
                        Blockly.Events.enable();
                    }
                    // First open of this file (no existing tab): fit + center the
                    // blocks, then save that as the tab's viewport. Deferred so the
                    // container has its real size before fitting.
                    requestAnimationFrame(() => {
                        centerAndFit(ws);
                        session.viewport = captureViewport(ws);
                    });
                }
                if (session) {
                    EditorMgr.getInstance().SaveToLocalStorage(session, loadContent.content);
                }
                setIsLoading(false);
                isLoadingRef.current = false;
            });

            AppMgr.getInstance().on(EventType.EVENT_BLOCKLY_TOOLBOX_UPDATED, () => {
                // react-blockly calls workspace.updateToolbox when toolboxConfiguration changes.
                // Do not remount — remounting resets scroll/zoom and moves blocks on screen.
                setToolboxRevision((prev) => prev + 1);
            });

            AppMgr.getInstance().on(EventType.EVENT_EDITOR_TAB_SELECTED, (selectedTabId) => {
                const ws = EditorMgr.getInstance().getEditorSession(tabId)?.workspace;
                if (!ws) {
                    return;
                }
                if (selectedTabId !== tabId) {
                    persistViewport(ws);
                    return;
                }
                requestAnimationFrame(() => restoreViewportForTab(ws));
            });

            AppMgr.getInstance().on(EventType.EVENT_GENPYTHON, (activeTab) => {
                if (tabId === activeTab) {
                    const session: EditorSession | undefined =
                    EditorMgr.getInstance().getEditorSession(activeTab);
                    if (session) {
                        const ws = session?.workspace;
                        const code = pythonGenerator.workspaceToCode(ws);
                        if (ws && code) {
                            AppMgr.getInstance().emit(EventType.EVENT_GENPYTHON_DONE, code);
                        }
                    }
                }
            });

            AppMgr.getInstance().on(EventType.EVENT_SAVE_EDITOR, () => {
                saveEditor();
            });

            AppMgr.getInstance().on(EventType.EVENT_EDITOR_NAME_CHANGED, (names) => {
                const newNames = JSON.parse(names);
                if (newNames.oldId !== nameRef.current) return;
                setName(newNames.newId);
            });            

            AppMgr.getInstance().on(EventType.EVENT_LOGIN_STATUS, (status) => {
                if (status === LoginStatus.LOGGED_IN || status === LoginStatus.LOGGED_OUT) {
                    evaluateEditBlocked();
                }
            });

            EditorMgr.getInstance().setSubscription(tabId);
        }

        // Kick off the initial block load for this tab. This must run on the
        // first mount (not only on a second, already-subscribed mount) so it
        // works in production too — previously it only fired via React
        // StrictMode's double effect invocation in dev, leaving the canvas
        // blank in preview/production. The 100ms delay is important: it lets
        // react-blockly finish importing its (empty) initialJson first —
        // otherwise that import would clear the blocks we load here.
        let loadTimer: ReturnType<typeof setTimeout> | undefined;
        const editorSession = EditorMgr.getInstance().getEditorSession(tabId);
        if (editorSession && editorSession.content && !editorSession.hasBeenLoaded) {
            const loadEditor = (name: string, content: string) => {
                const lines: string[] | undefined = content.split('##XRPBLOCKS ');
                const blockContent = lines.length > 1 ? lines[1] : lines[0];
                const loadContent = { name: name, path: editorSession.path, content: blockContent };
                AppMgr.getInstance().emit(EventType.EVENT_EDITOR_LOAD, JSON.stringify(loadContent));
            };
            loadTimer = setTimeout(loadEditor, 100, nameRef.current, editorSession.content);
        }

        applyBlocklyLocale(i18n.language);

        return () => {
            if (loadTimer) {
                clearTimeout(loadTimer);
            }
        };
    }, [saveEditor, tabId, restoreViewportForTab, persistViewport, evaluateEditBlocked]);

    useEffect(() => {
        const handleLanguageChanged = (lang: string) => {
            applyBlocklyLocale(lang);
            setLanguage(lang);
            setToolboxRevision((prev) => prev + 1);
            const ws = EditorMgr.getInstance().getEditorSession(tabId)?.workspace;
            if (ws) {
                refreshBlocklyWorkspace(ws);
            }
        };

        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [tabId]);

    useEffect(() => {
        evaluateEditBlocked();
    }, [evaluateEditBlocked]);

    useEffect(() => {
        if (!workspace) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const changeListener = (event: any) => {
            if (event.type === Blockly.Events.FINISHED_LOADING) {
                setIsLoading(false);
                isLoadingRef.current = false;
                persistViewport(workspace);
                return;
            }
            if (event.type === Blockly.Events.VIEWPORT_CHANGE) {
                persistViewport(workspace);
                return;
            }
            if (isLoadingRef.current) {
                return;
            }
            if (event.isUiEvent) {
                return;
            }
            try {
                console.log('Workspace changed, saving session:', nameRef.current);
                EditorMgr.getInstance().updateEditorSessionChange(tabId, true);
                const code = blocklyToPython(workspace);
                EditorMgr.getInstance().SaveToLocalStorage(EditorMgr.getInstance().getEditorSession(tabId) as EditorSession, code);
            } catch (e) {
                console.warn('Failed to serialize Blockly workspace:', e);
            }
        };
        
        workspace.addChangeListener(changeListener);

        return () => {
            // Cleanup listener on unmount
            console.log('Removing workspace change listener for tab:', tabId);
            workspace.removeChangeListener(changeListener);
        };
    }, [workspace, tabId, persistViewport]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !workspace) {
            return;
        }

        // Restore the saved pan/zoom whenever this tab transitions from hidden
        // (0x0, display:none) back to visible — the moment Blockly would
        // otherwise render the blocks at the top-left origin.
        let wasVisible = el.clientWidth > 0 && el.clientHeight > 0;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 };
            const visible = width > 0 && height > 0;
            if (visible && !wasVisible) {
                requestAnimationFrame(() => restoreViewportForTab(workspace));
            }
            wasVisible = visible;
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, [workspace, restoreViewportForTab]);

    return (
        <div ref={containerRef} className="relative h-full">
        {editBlocked && (
            <div
                className="absolute inset-0 z-10 cursor-not-allowed"
                onPointerDownCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    AppMgr.getInstance().emit(
                        EventType.EVENT_ALERT,
                        i18n.t('editGoogleLoginRequired'),
                    );
                }}
            />
        )}
        <BlocklyWorkspace
            className="h-full"
            toolboxConfiguration={toolboxConfiguration}
            workspaceConfiguration={{
                move:{
                    scrollbars: {horizontal: true, vertical: true},
                    drag: true,
                    wheel: true},
                zoom:{controls: true, wheel: false,
                    startScale: 1, maxScale: 1, minScale: 0.1, scaleSpeed: 1.2,
                pinch: false},

                trashcan: true,
                grid: {
                    spacing: 40,
                    length: 7,
                    colour: activeBlockTheme.surfaces[
                        AppMgr.getInstance().getTheme() === Themes.DARK ? 'dark' : 'light'
                    ].grid,
                    snap: true,
                },
                theme:
                    AppMgr.getInstance().getTheme() === Themes.DARK
                        ? blocklyDarkTheme
                        : blocklyMpdernTheme,
                renderer: 'zelos',
            }}
            initialJson={BlocklyConfigs.InitialJson}
            onInject={handleOnInject}
        />
        </div>
    );
}

export default BlocklyEditor;
