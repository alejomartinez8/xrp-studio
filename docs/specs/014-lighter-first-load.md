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
- **Python editor downloaded in the background.** Loading it on demand made the first Python
  file wait a few seconds. `src/utils/idle-prefetch.ts` (new) runs a download once the page has
  loaded and the browser is idle (`requestIdleCallback`, or a short timer in Safari), and skips
  it on slow or metered connections (`navigator.connection.saveData` or 2G).
  `src/components/python/prefetch-python-editor.ts` (new) uses it for the Python editor's chunk,
  and `App.tsx` starts it on mount. The first load stays as light, and the editor is usually ready
  by the time a child opens Python.
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
| Monaco | Always | In the background after the page loads (not with Data Saver) |

## Files

- New: `src/components/python/lazy-monaco-editor.tsx`,
  `src/components/python/prefetch-python-editor.ts`, `src/utils/idle-prefetch.ts`,
  `src/utils/loaded-content.ts`, tests in `src/utils/tests/{loaded-content,idle-prefetch}.spec.ts`.
- Changed: `src/App.tsx` (starts the background download), `src/components/xrplayout.tsx` and `src/components/dialogs/view-pythondlg.tsx`
  (import), `src/components/navbar.tsx` (`storeLoadedContent` in `loadGoogleEditor` and
  `loadXRPEditor`), `vite.config.ts`, `src/utils/i18n/locales/{en,es}/{en,es}.json`
  (`pythonEditorLoading`).

## How to test

1. `npx vitest run src/utils/tests/loaded-content.spec.ts src/utils/tests/idle-prefetch.spec.ts`:
   6 tests.
2. Open the app with DevTools > Network (JS) on a new visit: `@monaco-*.js` is not part of the
   first load; it starts downloading only after the page has loaded (the load event).
3. With Data Saver on (Chrome on Android), or `Object.defineProperty(navigator, 'connection',
   { value: { saveData: true } })` before load, `@monaco-*.js` is not downloaded until a Python
   file opens.
4. Create a Python project from the welcome screen: the editor opens right away (or after a short
   "Opening the Python editor…" on a slow network), typing works. Reload: the file reopens with
   its content.
5. Blocks project > View Python: the code shows in the dialog.
6. `ANALYZE=true npm run build` writes `stats.html`; a normal build does not.

## Upstream

Possible: the lazy import, the content fix and the build fixes apply to XRPWeb unchanged.
