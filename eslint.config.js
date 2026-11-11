import js from '@eslint/js'
import globals from 'globals'
import checkFile from 'eslint-plugin-check-file'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * ESLint 10 added `no-useless-assignment` and `preserve-caught-error` to the recommended rules and
 * the React hooks plugin 7 added React Compiler rules. They flag code inherited from XRPWeb, so
 * they stay off and the hooks plugin keeps its two classic rules.
 */
export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  /**
   * Files the fork owns use kebab-case names (`status-bar.tsx`, `use-python-view.tsx`,
   * `status-bar.spec.tsx`). The files in `ignores` come from XRPWeb and keep their names so that
   * merging upstream stays clean; `[token].ts` is named by the Vercel router.
   */
  {
    files: ['src/**/*.{ts,tsx,js}', 'e2e/**/*.ts', 'server/**/*.ts', 'api/**/*.ts', 'scripts/**/*.{mjs,js,ts}'],
    ignores: [
    'setupTests.ts',
    'src/App.tsx',
    'src/components/MonacoEditor.tsx',
    'src/components/blockly/xrp_blockly_configs.ts',
    'src/components/blockly/xrp_blocks.js',
    'src/components/blockly/xrp_blocks_python.js',
    'src/components/dashboard/AddWidget.tsx',
    'src/components/dashboard/hooks/useGridStackWidget.ts',
    'src/components/dashboard/hooks/useSensorData.ts',
    'src/components/dashboard/hooks/useSensorHistory.ts',
    'src/components/dashboard/sensors/CustomVariableWidget.tsx',
    'src/components/dashboard/sensors/CustomXPPSensor.tsx',
    'src/components/dashboard/sensors/SensorCard.tsx',
    'src/components/dashboard/sensors/SensorWidget.tsx',
    'src/components/dashboard/sensors/customRegistry.ts',
    'src/components/dashboard/sensors/parserRegistry.ts',
    'src/components/dashboard/utils/devSimulator.ts',
    'src/components/dashboard/utils/sensorParsers.ts',
    'src/components/dashboard/utils/xppUtils.ts',
    'src/utils/aiBuddyAccess.ts',
    'src/utils/editorUtils.ts',
    'src/utils/stringUtils.tsx',
      'api/google-auth/session/[[]token].ts',
    ],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx,js,mjs}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
    },
  },
)
