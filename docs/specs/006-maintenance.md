# 006 — Maintenance

Dependency, lockfile and build upkeep. Pending upgrades and the backlog are in [pending-upgrades.md](pending-upgrades.md). Two parts: lockfile and minor updates, and faster builds.

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
in place of Rollup and esbuild), through a package alias in `package.json` (`vite` in the dev
dependencies and in `overrides`, so the plugins and the test runner use it too). The build takes
about 18 to 20 seconds, a bit under half, and the app is unchanged: same chunks (plus small
helper ones), same size, same behaviour. Moving to Vite 8, which includes Rolldown itself, stays
in the backlog.

- Needs Node 20.19 or newer (22.12 or newer on 22).
- Known warnings, harmless: the dev server reports an unused `jsx` option from the React plugin,
  and the build reports that a `default` import of Monaco is undefined (the code already falls
  back to the namespace).

### Files

- `package.json`, `package-lock.json`.

### How to test

1. Build the app and compare the time with the previous version.
2. Open a Python project: the editor opens, a typing mistake such as `x: int = "text"` shows a
   red underline from Pyright, and the text is still there after reloading.
3. With the app opened once and its offline copy ready, go offline and reload: the app opens.
4. Open an example in the block editor: blocks and toolbox work.

### Upstream

Possible: a build-only change, independent of the fork's UI.
