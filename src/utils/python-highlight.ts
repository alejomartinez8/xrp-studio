/**
 * A tiny Python highlighter for the read-only Python view of a blocks file (spec 003, part 6).
 * The full Python editor (Monaco) is about 13 MB and edits files; showing generated code only
 * needs colours for keywords, strings, numbers and comments, so the view stays light and opens at
 * once, also offline.
 */
export type PythonTokenType = 'keyword' | 'string' | 'number' | 'comment' | 'text';

export type PythonToken = { type: PythonTokenType; text: string };

/** Tailwind classes for each kind of token, in the light and dark themes. */
export const PYTHON_TOKEN_CLASS: Record<PythonTokenType, string> = {
    keyword: 'font-semibold text-curious-blue-800 dark:text-curious-blue-300',
    string: 'text-chateau-green-800 dark:text-chateau-green-400',
    number: 'text-ecstasy-700 dark:text-ecstasy-400',
    comment: 'italic text-mountain-mist-500 dark:text-mountain-mist-400',
    text: '',
};

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
