import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as En from 'blockly/msg/en';
import { pythonGenerator } from 'blockly/python';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@components/blockly/xrp_blocks';
import '@components/blockly/xrp_blocks_python';
import { extractBlocksJson, parseBlocksJson } from '@components/blockly/blocks-content';
import { usePythonCode } from '@components/blockly/python-code';
import { forgetEditorView, setEditorView } from '@/utils/editor-view';
import { EXAMPLES, exampleContent } from '@/utils/examples';

const TAB = 'tab-old-file';
const followLine = exampleContent(EXAMPLES.find((e) => e.id === 'followLine')!);

/** Load saved text into a workspace as the editor does: events off, no finished-loading signal. */
function loadSaved(ws: Blockly.Workspace, saved: string): void {
    Blockly.Events.disable();
    try {
        Blockly.serialization.workspaces.load(parseBlocksJson(extractBlocksJson(saved))!, ws);
    } finally {
        Blockly.Events.enable();
    }
}

/** The formats a blocks file has had: only the JSON, the marker alone, and the full file. */
const FORMATS: Record<string, (json: string) => string> = {
    'only the JSON': (json) => json,
    'marker without date': (json) => `##XRPBLOCKS ${json}`,
    'Python, date and marker': (json) =>
        `print("old")\n\n\n## 2026-01-01 10:00\n##XRPBLOCKS ${json}`,
};

describe('usePythonCode', () => {
    Blockly.setLocale(En as unknown as Record<string, string>);
    afterEach(() => forgetEditorView(TAB));

    it('is null while the blocks show', () => {
        const ws = new Blockly.Workspace();
        const { result } = renderHook(() => usePythonCode(TAB, ws));
        expect(result.current).toBeNull();
        ws.dispose();
    });

    for (const [format, toSaved] of Object.entries(FORMATS)) {
        it(`shows the Python of a file with ${format} that finishes loading after Python was chosen`, () => {
            const ws = new Blockly.Workspace();
            const expected = (() => {
                const reference = new Blockly.Workspace();
                loadSaved(reference, followLine);
                const code = pythonGenerator.workspaceToCode(reference);
                reference.dispose();
                return code;
            })();
            expect(expected).not.toBe('');

            setEditorView(TAB, 'python');
            const { result, rerender } = renderHook(
                ({ revision }) => usePythonCode(TAB, ws, revision),
                { initialProps: { revision: 0 } },
            );
            expect(result.current).toBe('');

            loadSaved(ws, toSaved(followLine));
            rerender({ revision: 1 });
            expect(result.current).toBe(expected);
            ws.dispose();
        });
    }

    it('generates the Python when Python is chosen after the blocks loaded', () => {
        const ws = new Blockly.Workspace();
        loadSaved(ws, followLine);
        const { result } = renderHook(() => usePythonCode(TAB, ws));
        expect(result.current).toBeNull();
        act(() => setEditorView(TAB, 'python'));
        expect(result.current).toBe(pythonGenerator.workspaceToCode(ws));
        expect(result.current).not.toBe('');
        ws.dispose();
    });

    it('keeps the choice when the editor is mounted again (hidden tab remounted)', () => {
        const ws = new Blockly.Workspace();
        loadSaved(ws, followLine);
        setEditorView(TAB, 'python');
        const first = renderHook(() => usePythonCode(TAB, ws));
        first.unmount();
        const second = renderHook(() => usePythonCode(TAB, ws));
        expect(second.result.current).toBe(pythonGenerator.workspaceToCode(ws));
        ws.dispose();
    });

    it('does not change the Python of a file just because it is old', () => {
        const python = (saved: string) => {
            const ws = new Blockly.Workspace();
            loadSaved(ws, saved);
            const code = pythonGenerator.workspaceToCode(ws);
            ws.dispose();
            return code;
        };
        const json = extractBlocksJson(followLine);
        const current = python(`${python(followLine)}\n\n\n## 2026-01-01 10:00\n##XRPBLOCKS ${json}`);
        for (const toSaved of Object.values(FORMATS)) {
            expect(python(toSaved(json))).toBe(current);
        }
    });
});
