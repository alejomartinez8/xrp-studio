# 014 — Lighter first load

## Problem

The Python editor (Monaco, Pyright and the VS Code services) was imported by `xrplayout.tsx`, so
every first visit downloaded about 13 MB of JavaScript for it, even for children who only use
blocks. On tablets and school networks that is most of the wait before the app can be used.

## Solution

- **Python editor on demand.** `src/components/python/lazy-monaco-editor.tsx` (new) loads
  `MonacoEditor` with `React.lazy` the first time a Python tab or the "View Python" dialog opens,
  and shows "Opening the Python editor…" meanwhile. `xrplayout.tsx` and `view-pythondlg.tsx` only
  change their import.
- **Content reaches an editor that mounts late.** While its code downloads, the Python editor is
  not listening for the file's load event. `src/utils/loaded-content.ts` (new) keeps the loaded
  content in the editor session (Drive or My projects, and now also the robot), and the editor
  reads it when it mounts. This replaces the inline code added to `loadGoogleEditor` by spec 012.
- **Build fixes** (from the closed alejomartinez8/xrp-studio#12), in `vite.config.ts`:
  - `manualChunks` matches exact package names under `node_modules`, which removes the circular
    chunk warnings (`vscode` and `react` used to match unrelated paths).
  - Vite's dynamic-import helper gets its own small chunk. Otherwise Rollup puts it in the Monaco
    chunk, and the app entry downloads all of Monaco just to use it.
  - The bundle visualizer runs only with `ANALYZE=true`, and compressed sizes are not reported, so
    builds are quicker.

## Measurements

Production offline build served locally, first visit, JavaScript downloaded (Playwright):

| | Before | After |
| --- | --- | --- |
| JavaScript on first load | 16.5 MB (Monaco 13.3 MB) | 3.1 MB |
| Monaco | Always | Only when a Python file opens |

## Files

- New: `src/components/python/lazy-monaco-editor.tsx`, `src/utils/loaded-content.ts`,
  `src/utils/tests/loaded-content.spec.ts`.
- Changed: `src/components/xrplayout.tsx` and `src/components/dialogs/view-pythondlg.tsx`
  (import), `src/components/navbar.tsx` (`storeLoadedContent` in `loadGoogleEditor` and
  `loadXRPEditor`), `vite.config.ts`, `src/utils/i18n/locales/{en,es}/{en,es}.json`
  (`pythonEditorLoading`).

## How to test

1. `npx vitest run src/utils/tests/loaded-content.spec.ts`: 2 tests.
2. Open the app with DevTools > Network (JS) on a new visit: no `@monaco-*.js` file is downloaded.
3. Create a Python project from the welcome screen: `@monaco-*.js` downloads, the editor opens,
   typing works. Reload: the file reopens with its content.
4. Blocks project > View Python: the code shows in the dialog.
5. `ANALYZE=true npm run build` writes `stats.html`; a normal build does not.

## Upstream

Possible: the lazy import, the content fix and the build fixes apply to XRPWeb unchanged.
