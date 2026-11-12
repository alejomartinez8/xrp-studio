import { ExtensionHostKind, registerExtension } from '@codingame/monaco-vscode-api/extensions';

/**
 * Extra colours for the Python editor. The VS Code themes colour Python with the
 * TextMate grammar plus Pylance's semantic highlighting; Pyright, which this editor uses, has no
 * semantic highlighting, so calls, attributes, constants and object names stayed plain text. The
 * colours below come from the scopes the Python grammar (MagicPython) really emits, checked with
 * its tokenizer, and use each theme's own palette:
 *
 * - `meta.function-call.generic.python`: function and method calls (`drivetrain.straight(...)`),
 *   function colour.
 * - `meta.attribute.python`: attributes after a dot (`self.speed`, `math.pi`), variable colour,
 *   as VS Code shows properties.
 * - `constant.other.caps.python`: UPPER_CASE names (`MAX_SPEED`), constant colour.
 * - `variable.other.object.python`: the name before a dot (`board.`, `differentialDrive.`,
 *   `math.`), type and namespace colour. The grammar leaves these names unmarked, so a small
 *   injection grammar ({@link objectNamesGrammar}) adds the scope.
 *
 * Function parameters already have the variable colour in `def` lines; the grammar does not mark
 * them where they are used, so their uses stay plain.
 */
export const pythonTokenColours = {
    '[Light+]': {
        textMateRules: [
            { scope: 'meta.function-call.generic.python', settings: { foreground: '#795E26' } },
            { scope: 'meta.attribute.python', settings: { foreground: '#001080' } },
            { scope: 'constant.other.caps.python', settings: { foreground: '#0070C1' } },
            { scope: 'variable.other.object.python', settings: { foreground: '#267F99' } },
        ],
    },
    '[Dark+]': {
        textMateRules: [
            { scope: 'meta.function-call.generic.python', settings: { foreground: '#DCDCAA' } },
            { scope: 'meta.attribute.python', settings: { foreground: '#9CDCFE' } },
            { scope: 'constant.other.caps.python', settings: { foreground: '#4FC1FF' } },
            { scope: 'variable.other.object.python', settings: { foreground: '#4EC9B0' } },
        ],
    },
};

/**
 * Injection grammar that marks a name followed by a dot (`board.led_on()`) as
 * `variable.other.object.python`, except `self` and `cls`, which the Python grammar already
 * colours. It is not applied inside comments and strings.
 */
const objectNamesGrammar = {
    scopeName: 'source.python.object-names',
    injectionSelector: 'L:source.python -comment -string',
    patterns: [
        {
            match: '\\b(?!(?:self|cls)\\b)[A-Za-z_][A-Za-z0-9_]*(?=\\s*\\.\\s*[A-Za-z_])',
            name: 'variable.other.object.python',
        },
    ],
};

/**
 * Registers {@link objectNamesGrammar} as a small built-in extension that injects into the Python
 * grammar. The grammar file is served from a data URL, so it also works offline.
 */
export function registerPythonObjectNames(): void {
    const path = './object-names.tmLanguage.json';
    const { registerFileUrl } = registerExtension(
        {
            name: 'python-object-names',
            publisher: 'xrp-studio',
            version: '1.0.0',
            engines: { vscode: '*' },
            contributes: {
                grammars: [
                    {
                        scopeName: objectNamesGrammar.scopeName,
                        path,
                        injectTo: ['source.python'],
                    },
                ],
            },
        },
        ExtensionHostKind.LocalProcess,
    );
    registerFileUrl(
        path,
        `data:application/json;base64,${btoa(JSON.stringify(objectNamesGrammar))}`,
    );
}
