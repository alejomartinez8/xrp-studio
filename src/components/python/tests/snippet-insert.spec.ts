import { describe, expect, it } from 'vitest';
import { InsertPlan, planSnippetInsert } from '@components/python/snippet-insert';
import type { PythonSnippet } from '@components/python/snippets';

/** Tests for where a snippet and its missing import and setup lines go in a Python file. */

const IMPORT = 'from XRPLib.differential_drive import DifferentialDrive';
const SETUP = 'differentialDrive = DifferentialDrive.get_default_differential_drive()';
const RANGE_IMPORT = 'from XRPLib.rangefinder import Rangefinder';
const RANGE_SETUP = 'rangefinder = Rangefinder.get_default_rangefinder()';
const KNOWN = new Set([IMPORT, SETUP, RANGE_IMPORT, RANGE_SETUP]);

const straight: PythonSnippet = {
    id: 'xrp_straight_effort',
    code: 'differentialDrive.straight(20, 0.5)',
    expression: false,
    setup: [IMPORT, SETUP],
};
const distance: PythonSnippet = {
    id: 'xrp_getsonardist',
    code: 'rangefinder.distance()',
    expression: true,
    setup: [RANGE_IMPORT, RANGE_SETUP],
};
const whileTrue: PythonSnippet = {
    id: 'whileTrue',
    code: 'while True:\n    pass',
    expression: false,
    setup: [],
};
const wait: PythonSnippet = {
    id: 'xrp_sleep',
    code: 'time.sleep(0.5)',
    expression: false,
    setup: ['import time'],
};

/** Apply the edits to the text, from the last one to the first, as the editor does. */
function apply(text: string, plan: InsertPlan): string {
    const lines = text.split('\n');
    const offset = (line: number, column: number) =>
        lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0) + column - 1;
    return [...plan.edits]
        .sort((a, b) => offset(b.startLine, b.startColumn) - offset(a.startLine, a.startColumn))
        .reduce(
            (result, edit) =>
                result.slice(0, offset(edit.startLine, edit.startColumn)) +
                edit.text +
                result.slice(offset(edit.endLine, edit.endColumn)),
            text,
        );
}

/** Insert a snippet and return the new text and cursor. */
function insert(text: string, line: number, column: number, snippet: PythonSnippet) {
    const plan = planSnippetInsert(text, { line, column }, snippet, KNOWN);
    return { text: apply(text, plan), cursor: plan.cursor, edits: plan.edits.length };
}

describe('planSnippetInsert', () => {
    it('adds the import, the setup and an empty line to an empty file', () => {
        const result = insert('', 1, 1, straight);
        expect(result.text).toBe(`${IMPORT}\n${SETUP}\n\ndifferentialDrive.straight(20, 0.5)`);
        expect(result.cursor).toEqual({ line: 4, column: 36 });
    });

    it('does not repeat setup lines already in the file', () => {
        const text = `${IMPORT}\n${SETUP}\n\ndifferentialDrive.straight(20, 0.5)`;
        const turn = { ...straight, code: 'differentialDrive.turn(90, 0.5)' };
        expect(insert(text, 4, 36, turn).text).toBe(`${text}\ndifferentialDrive.turn(90, 0.5)`);
    });

    it('puts new imports after the imports and new setup after the setup', () => {
        const text = `${IMPORT}\n${SETUP}\n\nprint()`;
        const result = insert(text, 4, 7, distance);
        expect(result.text).toBe(
            `${IMPORT}\n${RANGE_IMPORT}\n${SETUP}\n${RANGE_SETUP}\n\nprint(rangefinder.distance())`,
        );
        expect(result.cursor).toEqual({ line: 6, column: 29 });
    });

    it('indents code under a line that ends with a colon', () => {
        const text = 'import time\n\nwhile True:\n';
        expect(insert(text, 4, 1, wait).text).toBe(
            'import time\n\nwhile True:\n    time.sleep(0.5)',
        );
    });

    it('puts a statement on a new line below a line with code', () => {
        const text = 'import time\n\nwhile True:';
        expect(insert(text, 3, 5, wait).text).toBe(
            'import time\n\nwhile True:\n    time.sleep(0.5)',
        );
    });

    it('replaces a lone pass and keeps its indentation', () => {
        const text = 'import time\n\nwhile True:\n    pass';
        const result = insert(text, 4, 9, wait);
        expect(result.text).toBe('import time\n\nwhile True:\n    time.sleep(0.5)');
        expect(result.cursor).toEqual({ line: 4, column: 20 });
    });

    it('indents every line of a longer snippet', () => {
        const text = 'def go():\n    ';
        expect(insert(text, 2, 5, whileTrue).text).toBe('def go():\n    while True:\n        pass');
    });

    it('adds the header above code that has none', () => {
        const result = insert('print("hi")', 1, 12, wait);
        expect(result.text).toBe('import time\n\nprint("hi")\ntime.sleep(0.5)');
        expect(result.edits).toBe(2);
        expect(result.cursor).toEqual({ line: 4, column: 16 });
    });
});
