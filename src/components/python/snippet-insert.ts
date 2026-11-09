import type { PythonSnippet } from '@components/python/snippets';

/**
 * Where a snippet of the snippet panel goes in a Python file (spec 003, part 7), worked out on the
 * text alone so it can be tested without the editor. The snippet's missing import and setup lines
 * go at the top (imports after the last import, setup after the last setup line), and its code
 * goes at the cursor:
 * - on an empty line, or in place of a lone `pass`, with that line's indentation (or one level
 *   more than the line above when it ends with `:`);
 * - a value inside a line of code, right at the cursor;
 * - a statement on a line of code, on a new line below it.
 * Positions are 1-based lines and columns, as in Monaco.
 */

/** One replacement of a range of the file. */
export interface TextEdit {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    text: string;
}

/** The edits to apply together (one Undo) and where the cursor goes afterwards. */
export interface InsertPlan {
    edits: TextEdit[];
    cursor: { line: number; column: number };
}

const INDENT = '    ';
const IMPORT_LINE = /^(from\s+\S+\s+)?import\s+\S+/;

/** Leading spaces and tabs of a line. */
function indentOf(line: string): string {
    return /^[ \t]*/.exec(line)?.[0] ?? '';
}

/** Indentation for new code on line `index`, from the nearest line with code above it. */
function indentFromAbove(lines: string[], index: number): string {
    for (let i = index - 1; i >= 0; i--) {
        if (lines[i].trim() !== '') {
            const above = indentOf(lines[i]);
            return lines[i].trimEnd().endsWith(':') ? above + INDENT : above;
        }
    }
    return '';
}

/** Indent every line of the code after the first one. */
function indentCode(code: string, indent: string): string {
    return code
        .split('\n')
        .map((line, i) => (i === 0 || line === '' ? line : indent + line))
        .join('\n');
}

/**
 * Plan the insertion of a snippet into `text` with the cursor at `position`. `knownSetup` holds
 * every setup line the snippets can add, to find where the setup part of the file ends.
 */
export function planSnippetInsert(
    text: string,
    position: { line: number; column: number },
    snippet: PythonSnippet,
    knownSetup: Set<string>,
): InsertPlan {
    const lines = text.split('\n').map((line) => line.replace(/\r$/, ''));
    const lineIndex = Math.min(Math.max(position.line, 1), lines.length) - 1;
    const present = new Set(lines.map((line) => line.trim()));
    const missing = snippet.setup.filter((line) => !present.has(line.trim()));
    const missingImports = missing.filter((line) => IMPORT_LINE.test(line));
    const missingSetup = missing.filter((line) => !IMPORT_LINE.test(line));

    const topLevel = (i: number) => lines[i] !== '' && indentOf(lines[i]) === '';
    let lastImport = -1;
    let lastSetup = -1;
    lines.forEach((line, i) => {
        if (!topLevel(i)) return;
        if (IMPORT_LINE.test(line)) lastImport = i;
        else if (knownSetup.has(line.trim())) lastSetup = i;
    });

    const headerEdits: { index: number; lines: string[] }[] = [];
    const importAt = lastImport + 1;
    const setupAt = lastSetup >= 0 ? lastSetup + 1 : importAt;
    if (setupAt === importAt) {
        const header = [...missingImports, ...missingSetup];
        if (header.length > 0) {
            const isNewHeader = lastImport < 0 && lastSetup < 0;
            headerEdits.push({ index: importAt, lines: isNewHeader ? [...header, ''] : header });
        }
    } else {
        if (missingImports.length > 0) headerEdits.push({ index: importAt, lines: missingImports });
        if (missingSetup.length > 0) headerEdits.push({ index: setupAt, lines: missingSetup });
    }

    const current = lines[lineIndex];
    const isEmpty = current.trim() === '';
    const isPass = current.trim() === 'pass' && !snippet.expression;
    let edit: TextEdit;
    let indent: string;
    let startColumn: number;
    let prefix = '';
    if (isEmpty || isPass) {
        indent = isPass || current !== '' ? indentOf(current) : indentFromAbove(lines, lineIndex);
        startColumn = 1;
        prefix = indent;
        edit = {
            startLine: lineIndex + 1,
            startColumn,
            endLine: lineIndex + 1,
            endColumn: current.length + 1,
            text: '',
        };
    } else if (snippet.expression) {
        indent = indentOf(current);
        startColumn = Math.min(Math.max(position.column, 1), current.length + 1);
        edit = {
            startLine: lineIndex + 1,
            startColumn,
            endLine: lineIndex + 1,
            endColumn: startColumn,
            text: '',
        };
    } else {
        indent = current.trimEnd().endsWith(':') ? indentOf(current) + INDENT : indentOf(current);
        startColumn = current.length + 1;
        prefix = '\n' + indent;
        edit = {
            startLine: lineIndex + 1,
            startColumn,
            endLine: lineIndex + 1,
            endColumn: startColumn,
            text: '',
        };
    }
    const code = indentCode(snippet.code, indent);
    edit.text = prefix + code;

    const edits: TextEdit[] = [];
    let linesBefore = 0;
    for (const header of headerEdits) {
        const headerText = header.lines.map((line) => line + '\n').join('');
        if (header.index <= lineIndex) linesBefore += header.lines.length;
        if (header.index === lineIndex && edit.startColumn === 1) {
            edit.text = headerText + edit.text;
        } else {
            edits.push({
                startLine: header.index + 1,
                startColumn: 1,
                endLine: header.index + 1,
                endColumn: 1,
                text: headerText,
            });
        }
    }
    edits.push(edit);

    const codeLines = (prefix + code).split('\n');
    const last = codeLines[codeLines.length - 1];
    const cursor = {
        line: lineIndex + 1 + linesBefore + codeLines.length - 1,
        column: codeLines.length === 1 ? startColumn + last.length : last.length + 1,
    };
    return { edits, cursor };
}
