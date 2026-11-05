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

## Feature backlog

| Feature | Notes |
| --- | --- |
| Sync My projects with Google Drive | When signed in with Google, back up browser projects to Drive (planned next, now that sign-in works; spec 008). |
| Projects home screen | Cards for New project and recent projects; folder tree stays. Guided examples afterwards. |
| Choose the editor | Blocks, Python, or blocks + Python side by side. |
| Two-way Drive sync | Pull changes made on another device; conflict handling. |
| Translate the block search placeholder | `@blockly/toolbox-search` hardcodes "Search". |
| Dracula theme | Second app theme; needs runtime CSS variables instead of build-time Tailwind colours. |
| Configurable Drive folder name | `Constants.XRPCODE` is fixed to `XRPCode`. With its own OAuth client the fork only sees the folders it created, so users of both apps get two `XRPCode` folders. A build setting (default `XRPCode`) would avoid renaming it for XRPWeb users; the hardcoded `'/XRPCode/'` paths in `folder-tree.tsx`, `newfiledlg.tsx` and `filesaveasdlg.tsx` would need to use the constant first (they map Drive paths to `/gusers/<user>/` on the robot, so test Run with a robot). |
| Battery level in the status pill | `batteryVoltage()` returns 0 while the REPL is busy; needs a robot to test safely. |

## Known issues

Bugs found while testing, not yet fixed. Each one should be its own change.

| Issue | Where | Notes |
| --- | --- | --- |
| Opening a file from the folder tree is slow | `src/components/folder-tree.tsx` (`EVENT_OPEN_FILE` on double click) | Production, a `.blocks` file from Google Drive: Interaction to Next Paint ~650 ms (selecting with a single click is ~40 ms). The tab, the Blockly workspace and the file load seem to run before the next paint. Measure with the Performance panel first; then show the tab and a loading state before building the workspace. Check whether XRPWeb has the same delay (this code is upstream). |
| Changing to the dark theme leaves the open editor light | `src/components/blockly.tsx` (`EVENT_THEME`), `src/components/xrpshell.tsx` | With a `.blocks` file open, switching to Dark keeps the block workspace, toolbox and shell light; loading the app already in Dark shows them dark. Suspects: the theme listener in `blockly.tsx` is only added when the editor session exists and has no subscription, and it applies XRPWeb's `blocklyDarkTheme` instead of the fork's block theme (`block-theme.ts`). Check XRPWeb as well. |
