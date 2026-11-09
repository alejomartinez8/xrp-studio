# 006 — Maintenance

Dependency, lockfile and build upkeep. Pending upgrades and the backlog are in [pending-upgrades.md](pending-upgrades.md). Three parts: lockfile and minor updates, faster builds, and the build and test tools.

## Part 1 — Lockfile, Tailwind config and minor updates

### Problem

- `npm ci` failed: `package-lock.json` was out of sync with `package.json` (missing `@emnapi/*`
  packages).
- `tailwind.config.js` mixed CommonJS `require()` with `export default` and was not type-checked.
- Many dependencies were behind on minor and patch releases.

### Solution

1. **Lockfile** regenerated with `npm install`; `npm ci` works again.
2. **Tailwind config in TypeScript:** `tailwind.config.ts` with ES imports, type-checked through
   `tsconfig.node.json`, plus a small type declaration for `tailwindcss-debug-screens`
   (`tailwind-plugins.d.ts`). The generated CSS is byte-for-byte identical.
3. **Minor/patch updates** with `npm update`, within the existing semver ranges. Pinned to their
   current versions because newer releases break the build or the editor:
   - `flexlayout-react` 0.8.4 (0.8.19 makes the `Model` constructor protected).
   - `react-xtermjs` 1.0.9 (newer versions use React 19 ref types; moved to 1.0.12 in part 4).
   - `monaco-languageclient` 9.4.1 and `vscode-ws-jsonrpc` 3.4.0 (9.11 pulls
     `@codingame/monaco-vscode-api` 20 while the editor packages are on 11, installing a second,
     incompatible copy).

### Files

`package.json`, `package-lock.json`, `tailwind.config.ts` (renamed from `.js`),
`tailwind-plugins.d.ts`, `tsconfig.node.json`.

### How to test

1. `npm ci` completes.
2. `npx tsc -b`, `npx vitest run` and `npm run build` pass.
3. Open a blocks file and a Python file: same behaviour as before the update.

### Upstream

All three changes are generic and could be proposed together or separately.

## Part 2 — Faster builds with Rolldown

### Problem

The production build took about 48 seconds on a 4-core machine. Minifying was not the cost (turning
it off saved 2 seconds); the time went into transforming the roughly 4,900 modules of the app,
mostly the Python editor (Monaco), with Rollup.

### Solution

Vite is replaced by `rolldown-vite` 7.3.1 (the same Vite with Rolldown, a bundler written in Rust,
in place of Rollup and esbuild), through a package alias in `package.json`. Part 3 later moved to
Vite 8, which includes Rolldown, and removed the alias. The build takes
about 18 to 20 seconds, a bit under half, and the app is unchanged: same chunks (plus small
helper ones), same size, same behaviour. Moving to Vite 8, which includes Rolldown itself, stays
in the backlog.

- Needs Node 20.19 or newer (22.12 or newer on 22).
- Known warnings, harmless: the dev server reports an unused `jsx` option from the React plugin,
  and the build reports that a `default` import of Monaco is undefined (the code already falls
  back to the namespace).

### Files

- `package.json`, `package-lock.json`, `scripts/build.mjs` (new), `vercel.json`.

### How to test

1. Build the app and compare the time with the previous version.
2. Open a Python project: the editor opens, a typing mistake such as `x: int = "text"` shows a
   red underline from Pyright, and the text is still there after reloading.
3. With the app opened once and its offline copy ready, go offline and reload: the app opens.
4. Open an example in the block editor: blocks and toolbox work.
5. Introduce a type error in any source file and build: the build fails and shows the error.

#### Faster install and build

The hosted build (2 cores) took 1 min 42 s, of which `npm ci` was 66 s, the type check 11 s and the
bundle 12 s. Two small changes:

- The type check and the bundle run **at the same time** (`scripts/build.mjs`) instead of one after
  the other, so the build lasts as long as the slower one. A type error still fails the build.
  Locally the whole build went from about 18 s to about 13 s.
- The hosted install uses `npm ci --prefer-offline --no-audit --no-fund` (`vercel.json`): it prefers
  the downloads already stored and skips the vulnerability and funding requests.

Try next, as its own change: a faster package manager (Bun or pnpm) for the install, which is most
of the time left.

### Upstream

Possible: a build-only change, independent of the fork's UI.

## Part 3 — Build and test tools: Vite 8, Vitest 5, ESLint 10

### Problem

`npm audit` reported 20 vulnerabilities, 2 of them critical: Vitest 3 and its `tinypool` (the
test runner could be made to run code from a crafted request to its server). None of them ships
in the app, but the tools were also behind (Vite 6, Vitest 3, ESLint 9, which npm calls no longer
supported).

### Solution

- **Vite 8** (it includes Rolldown itself, so the `rolldown-vite` alias of part 2 is gone),
  `@vitejs/plugin-react` 6, `vite-plugin-static-copy` 4.
- **Vitest 5** and `@testing-library/jest-dom` 7 (its matchers are now loaded from
  `@testing-library/jest-dom/vitest`; `src/jest-dom.d.ts` gives the tests their types).
- **ESLint 10**, `typescript-eslint`, the React hooks plugin 7 and the React Refresh plugin.
  The rules that ESLint 10 and the hooks plugin added (unused assignments, error causes, React
  Compiler checks) flag code inherited from XRPWeb, so they are off and the lint result is the
  same as before.
- Three changes the new versions needed: the static copy plugin keeps the folder structure now, so
  the destinations in `vite.config.ts` are `./` (the layout styles, Blockly media and Gridstack
  styles are still served from `node_modules/...`); a test mocked `ResizeObserver` with an arrow
  function, which is not a constructor; and the Google sign-in functions of the host (`api/`,
  `server/`) lost their Node types, because the root `tsconfig.json` limits the types to
  `vitest/globals` and Vitest 3 used to bring the Node ones in: `node` is now listed there too.
- Result: no critical vulnerability is left. `npm audit` still lists 20 (2 high, 15 moderate, 3
  low): the 2 high ones are `flowbite-react` through `deepmerge-ts`, which needs an upstream
  update and needs attacker-controlled objects to matter, and the rest are in build and lint
  tools (`minimatch` through ESLint and Workbox, `postcss-selector-parser` through the Tailwind
  typography plugin). The build takes about 10 seconds locally.

Known warnings, harmless: Vite reports that the config uses `__dirname` and imports without file
extensions (not supported by a loader that will be the default in a later major version), that
the `esbuild` options are ignored now that Oxc is used, and the same Monaco `default` import as in
part 2.

### Files

- `package.json`, `package-lock.json` (regenerated with a plain `npm install` so `npm ci` works),
  `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `setupTests.ts`, `src/jest-dom.d.ts` (new),
  `src/components/tests/folder-tree.spec.tsx`.

### How to test

1. Build the app: it works and the layout looks as before (the styles of the tab layout load).
2. Open a Python project: Pyright underlines `x: int = "text"`; reload keeps the text; with the
   app opened once, go offline and reload: it opens.
3. Open an example in the block editor: blocks, toolbox and block list work.
4. Run the unit tests and the linter: same results as before (the linter keeps its one known
   error).

### Upstream

Possible: dependency upgrades, independent of the fork's UI.

## Part 4 — React 19

### Problem

The app ran on React 18. Several libraries (`react-xtermjs` after 1.0.9, `react-i18next` 17,
`react-hotkeys-hook` 5) already expect React 19, so they were held back, and React 18 only gets
security fixes.

### Solution

- **React 19** and `react-dom` 19, with their types (`@types/react`, `@types/react-dom` 19).
- `react-i18next` 17, which needs `i18next` 26; `react-hotkeys-hook` 5 (the block editor's
  Ctrl/Cmd+S shortcut keeps the same key list); `react-xtermjs` 1.0.12 (the terminal).
- The other React libraries already accept React 19: `flowbite-react`, `flexlayout-react`,
  `react-arborist` (Explorer), `recharts` (dashboard), `usehooks-ts`, `use-file-picker`,
  `react-customizable-progressbar`, `react-icons`, `@react-oauth/google` and Testing Library.
- Two libraries have not declared React 19 support yet, and both only use hooks that React 19
  keeps, so `package.json` `overrides` lets them use the app's React:
  - `react-blockly` 9 (the block editor). Its `propTypes` are ignored by React 19, nothing else
    changes.
  - `use-resize-observer` 9 (Explorer and the busy dialog). Version 10 accepts React 19 but
    changes its API, so the fork stays on 9.
- Type changes React 19 needs: `useRef` takes an initial value (`useRef<AppMgr>(undefined)`),
  and a ref that starts empty is typed `RefObject<Layout | null>` (the tab layout ref passed to
  the editor tabs).

### Files

- `package.json`, `package-lock.json`.
- `src/App.tsx`, `src/components/folder-tree.tsx`, `src/components/xrplayout.tsx`,
  `src/components/editor-chooser.tsx`, `src/utils/editorUtils.ts` (ref types).

### How to test

1. Open the app: the welcome screen shows; switch the language to Spanish and back.
2. Start a project from an example: the block editor, its toolbox and the Python view work;
   Ctrl+S (Cmd+S) saves.
3. Create a Python project and type in it.
4. Open and close the Explorer, create, rename and delete a file, open the Trash.
5. Open the terminal, the dashboard (Settings → Dashboard) and a dialog (Backup/Restore).
6. Sign in with Google and sign out.

### Upstream

Possible: dependency upgrades, independent of the fork's UI. The ref type fixes are in upstream
files and are needed by any React 19 upgrade.

## Part 5 — Dashboard charts: recharts 3

### Problem

The dashboard's sensor graphs use recharts 2, which is no longer maintained.

### Solution

- **recharts 3.10**. The sensor widget (`SensorWidget.tsx`) uses only `LineChart`, `Line`,
  `XAxis`, `YAxis`, `Tooltip` and `ResponsiveContainer`, whose props did not change, so the
  component works as it is: same colours, one line per channel, the last 50 readings, the time in
  the tooltip, and live updates as readings arrive.
- recharts 3 keeps its chart state in Redux Toolkit, which it brings as its own dependencies, and
  asks the app to install `react-is` matching its React version: `react-is` 19 is now a direct
  dependency (before, recharts used an older copy brought in by the test tools).
- A unit test feeds the accelerometer widget fake robot readings through the same event the robot
  connection uses, so the charts are checked without a robot: the data view shows the values,
  the graph draws one line per channel and redraws with every new reading, and the settings menu
  switches from data to graph.

### Files

- `package.json`, `package-lock.json`.
- Unit tests: `src/components/tests/sensor-widget-chart.spec.tsx` (new).

### How to test

1. Connect a robot and open the dashboard. Add the accelerometer and the gyroscope widgets.
2. In each widget, open the settings menu and choose Graph: one coloured line per axis, moving as
   the robot moves; the count of readings stored grows. Hover the graph: the tooltip shows the
   time and the values with two decimals.
3. Choose Data: the numbers update live. Resize and move the widgets: the graph fills the widget.
4. Check in light and dark themes.

### Upstream

Possible: dependency upgrade, independent of the fork's UI.
