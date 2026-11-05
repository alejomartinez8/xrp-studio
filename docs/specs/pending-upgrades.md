# Pending upgrades

Major upgrades left out of the maintenance change. Each one can break the build or the app, so each
should be its own change, tested in the app.

| Package | Current | Target | Notes |
| --- | --- | --- | --- |
| Python editor (`@codingame/monaco-vscode-*`, `monaco-languageclient`, `vscode-ws-jsonrpc`) | 11 / 14, 9.4.1, 3.4.0 | 2x, 10+, 4 | npm reports the 14.x `*-common` packages as no longer supported. The whole editor stack must move together; updating one piece installs a second, incompatible copy. |
| `flexlayout-react` | 0.8.4 | 0.11 | 0.8.19 already makes the `Model` constructor protected (affects `editormgr` tests). |
| `react-xtermjs` | 1.0.9 | 1.0.12 | Newer versions use React 19 ref types; fits with the React 19 upgrade. |
| React | 18 | 19 | Also `@types/react`, `react-i18next` 17, `react-hotkeys-hook` 5. |
| Tailwind CSS | 3.4 | 4 | New config format; the theme palette approach needs a review. |
| Blockly | 12.3 | 13 | Also `@blockly/field-colour` and `@blockly/toolbox-search` 13.x. |
| Vite / Vitest | 6 / 3 | 8 / 5 | Also `@vitejs/plugin-react` 6. |
| ESLint | 9 | 10 | npm reports ESLint 9 as no longer supported. |
| recharts | 2 | 3 | 2.x is no longer maintained; used by the dashboard. |
