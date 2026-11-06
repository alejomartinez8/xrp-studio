# 016 — Open projects quickly and without errors

## Problem

Opening a `.blocks` file was slower than it needed to be, and some files showed errors:

- The block search (`@blockly/toolbox-search`) rebuilt its index every time a blocks editor was
  created: it created every toolbox block on a hidden workspace, even if nobody searched. All
  editors have the same toolbox, so the work was repeated for nothing.
- The search also registered its Ctrl+B shortcut once per editor. With two blocks tabs open, the
  console showed `Shortcut named "startSearch" already exists.`, and closing one tab removed the
  shortcut for the others.
- A blocks file that was created but never saved is empty. Opening it again threw
  "Unexpected end of JSON input".
- The search texts ("Search", "Type to search for blocks", "No matching blocks found") were fixed
  in English inside the plugin.

## Solution

### Part 1 — Block search indexed once, when first used

- `src/components/blockly/block-search.ts` (new): the trigram index, adapted from the plugin's
  `BlockSearcher` (Apache-2.0). `sharedSearchIndex` builds it the first time someone types in the
  search field and keeps one index per toolbox and language, shared by every editor.
- `src/components/blockly/toolbox-search-category.ts` (new): the search field for the toolbox kind
  `search`, adapted from the plugin's `ToolboxSearchCategory`. It uses the shared index, and its
  texts go through i18n (en and es).
- The plugin is no longer used, so the `@blockly/toolbox-search` dependency is removed (one less
  package to move for the Blockly 13 upgrade). The toolbox (`toolbox-ui.ts`) registers the new
  field instead of importing the plugin; the field keeps the same id, so the existing styles apply.

### Part 2 — One search shortcut for the whole app

`registerSearchShortcut` registers Ctrl+B once, at startup. It focuses the search field of the
current blocks editor (`Blockly.getMainWorkspace()`), so it works with any number of tabs and
after closing some of them.

### Part 3 — Empty blocks files open without errors

`src/components/blockly/blocks-content.ts` (new): `parseBlocksJson` returns "no blocks" for empty
or blank content instead of failing. `blockly.tsx` uses it in its two places that load blocks
(`loadBlocksIntoWorkspace` and the `EVENT_EDITOR_LOAD` handler). Broken JSON still reports an
error.

## Measurements

Dev build, 4× slower CPU (Chrome DevTools throttling), toolbox with 93 blocks:

| | Before | After |
| --- | --- | --- |
| Search indexing when a blocks editor opens | 40–135 ms, every editor | 0 ms |
| Search indexing when typing the first search | 0 ms (already done) | 35–135 ms, once per language |

## Files

- New: `src/components/blockly/block-search.ts`, `toolbox-search-category.ts`,
  `blocks-content.ts`, and tests in `src/components/blockly/tests/`.
- Changed: `src/components/blockly/toolbox-ui.ts` (registers the search field),
  `src/components/blockly.tsx` (two calls to `parseBlocksJson`),
  `src/utils/i18n/locales/{en,es}/blockly.json` (`searchHint`, `searchNone`),
  `package.json` and `package-lock.json` (plugin removed).

## How to test

1. `npx vitest run src/components/blockly` (7 tests).
2. Create a blocks project, close its tab without saving, and open it again from the folder tree:
   it opens empty and the console has no "Unexpected end of JSON input".
3. Open a second blocks file: the console has no `startSearch` warning.
4. Type "forward" in the search field: the matching blocks appear. Type "zzzz": "No matching
   blocks found". In Spanish the field says "Buscar" and the hints are in Spanish.
5. Click on the workspace and press Ctrl+B: the search field of that editor gets the focus. Close
   one of the two tabs and try again in the other.

## Upstream

XRPWeb does not use the block search (it was added by spec 004), so Parts 1 and 2 are fork-only.
Part 3 fixes an XRPWeb bug: the same `JSON.parse` of an empty file is in its `blockly.tsx`, and
`parseBlocksJson` could be proposed as a small fix.
