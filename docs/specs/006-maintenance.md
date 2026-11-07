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
   - `react-xtermjs` 1.0.9 (newer versions use React 19 ref types).
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
