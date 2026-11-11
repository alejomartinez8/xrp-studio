/**
 * A tiny Python highlighter for the read-only Python view of a blocks file.
 * The full Python editor (Monaco) is about 13 MB and edits files; showing generated code only
 * needs colours for keywords, strings, numbers and comments, so the view stays light and opens at
 * once, also offline.
 */
export type PythonTokenType = 'keyword' | 'string' | 'number' | 'comment' | 'text';

export type PythonToken = { type: PythonTokenType; text: string };

const KEYWORDS = new Set([
    'False',
    'None',
    'True',
    'and',
    'as',
    'assert',
    'async',
    'await',
    'break',
    'class',
    'continue',
    'def',
    'del',
    'elif',
    'else',
    'except',
    'finally',
    'for',
    'from',
    'global',
    'if',
    'import',
    'in',
    'is',
    'lambda',
    'nonlocal',
    'not',
    'or',
    'pass',
    'raise',
    'return',
    'try',
    'while',
    'with',
    'yield',
]);

const TOKEN =
    /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/g;

/** Split Python source into coloured tokens; joining their texts gives the source back. */
export function highlightPython(source: string): PythonToken[] {
    const tokens: PythonToken[] = [];
    const push = (type: PythonTokenType, text: string) => {
        const last = tokens[tokens.length - 1];
        if (last && last.type === type && type === 'text') {
            last.text += text;
        } else if (text) {
            tokens.push({ type, text });
        }
    };
    let index = 0;
    for (const match of source.matchAll(TOKEN)) {
        push('text', source.slice(index, match.index));
        const [text, comment, string, number, word] = match;
        if (comment) {
            push('comment', text);
        } else if (string) {
            push('string', text);
        } else if (number) {
            push('number', text);
        } else if (word && KEYWORDS.has(word)) {
            push('keyword', text);
        } else {
            push('text', text);
        }
        index = match.index + text.length;
    }
    push('text', source.slice(index));
    return tokens;
}
