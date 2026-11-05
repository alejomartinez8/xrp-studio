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
| Drive backup for My projects | Signing in with Google (now working, spec 008) could back up My projects to Drive. Asked in Open-STEM/XRPWeb#336. |
| Test My projects with a robot | Run from My projects, Robot memory switch, disconnect. See spec 007. |
| Guided examples on the welcome screen | After the recent projects (spec 015): example projects to start from (drive and turn, square, avoid obstacles, follow a line). Folder tree stays. |
| Choose the editor | Blocks, Python, or blocks + Python side by side. |
| Two-way Drive sync | Pull changes made on another device; conflict handling. |
| Translate the block search placeholder | `@blockly/toolbox-search` hardcodes "Search". |
| Dracula theme | Second app theme; needs runtime CSS variables instead of build-time Tailwind colours. |
| Configurable Drive folder name | `Constants.XRPCODE` is fixed to `XRPCode`. With its own OAuth client the fork only sees the folders it created, so users of both apps get two `XRPCode` folders. A build setting (default `XRPCode`) would avoid renaming it for XRPWeb users; the hardcoded `'/XRPCode/'` paths in `folder-tree.tsx`, `newfiledlg.tsx` and `filesaveasdlg.tsx` would need to use the constant first (they map Drive paths to `/gusers/<user>/` on the robot, so test Run with a robot). |
| Battery level in the status pill | `batteryVoltage()` returns 0 while the REPL is busy; needs a robot to test safely. |
| Installable app that works offline (PWA) | A service worker caches the app on the first visit, so https://xrp-studio.vercel.app opens without internet, stays HTTPS (Web Serial and Web Bluetooth need a secure context, which a LAN `http://` server is not) and can be installed on tablets and computers. Updates when online. Most schools would use this instead of the offline build, which stays for no-network or strict-privacy setups. |
| Prefetch the Python editor | Since spec 014 the Python editor downloads the first time a `.py` opens, which takes a few seconds. Once the app has loaded and is idle (`requestIdleCallback`), start downloading it in the background so it is usually ready when a child opens Python, without making the first load heavier. Skip on slow or metered connections (`navigator.connection.saveData`). |
| Faster builds with Rolldown | The production build takes about a minute, mostly bundling and minifying Monaco. Vite's Rust bundler (Rolldown, which replaces Rollup in newer Vite) should cut this a lot. SWC would not help: without Babel plugins, `@vitejs/plugin-react` already uses esbuild. Dependency upgrade, separate PR; check `manualChunks` and the Monaco workers still work. |

## Known issues

Bugs found while testing, not yet fixed. Each one should be its own change.

| Issue | Where | Notes |
| --- | --- | --- |
| Opening a file from the folder tree is slow | `src/components/folder-tree.tsx` (`EVENT_OPEN_FILE`), `src/components/blockly.tsx` | Measured on a production build with a 4× slower CPU: the click blocks the page ~290 ms before the tab shows. About 130 ms is Blockly creating the workspace and toolbox, ~110 ms the block search indexing every block (fork code, same index for every file), ~50 ms the new tab. Plan: index the search once and lazily; later, show the tab with a loading state before building the workspace. |
| Opening a `.blocks` file that was never saved throws "Unexpected end of JSON input" | `src/components/blockly.tsx` (`EVENT_EDITOR_LOAD`) | Create a Blockly file, close its tab without saving, open it again from the folder tree: the page logs the error (the file is empty). Found while testing spec 010. |
| The block search registers its shortcut once per editor | `@blockly/toolbox-search` (`ToolboxSearchCategory.registerShortcut`) | With two `.blocks` tabs open, the console shows `Shortcut named "startSearch" already exists.` No visible effect. Fix together with indexing the search only once (it also rebuilds its index for every file opened, ~110 ms with a 4× slower CPU). |
