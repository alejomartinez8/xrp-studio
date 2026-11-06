# 002 — Language and theme

Spanish first, and a friendly look in light and dark. Three parts: Spanish translation fixes, the friendly theme and block editor, and theme switch fixes.


## Part 1 — Spanish translation fixes

### Problem

- With the browser set to a regional Spanish locale (`es-ES`, `es-419`), the UI was in Spanish but
  all blocks were in English, even though `es/blockly.json` had the translations.
  `applyBlocklyLocale` received `i18n.language` (e.g. `es-ES`) and only accepted exactly `en` or
  `es`, so it fell back to English. The language picker in Settings showed no selection for the same
  reason.
- Several Spanish strings were wrong: the backup and restore descriptions described the opposite
  direction, "Processing" messages dropped the file name, and some strings had the wrong number or
  meaning or unbalanced `¡ !` punctuation. One key (`copyfiles.gdrive`) was misnamed.

### Solution

- i18next normalizes detected languages to their base code (`supportedLngs` +
  `convertDetectedLanguage`), and `applyBlocklyLocale` accepts regional codes.
- Spanish fixes: backup/restore direction, `{{ filename }}` placeholders, wording and number fixes,
  balanced punctuation, consistent "usted", "Girar Gr:" → "Girar grados:", "Gr:" → "Grados:".

### Files

`src/utils/i18n/index.ts`, `src/utils/blockly-locales.ts`,
`src/utils/i18n/locales/es/es.json`, `src/utils/i18n/locales/es/blockly.json`.

### How to test

1. Set the browser language to Spanish (Spain or Latin America) and open the app.
2. Settings shows Spanish selected; blocks read "Motor: Izquierdo Esfuerzo" instead of
   "Motor: Left Effort".

Automated: `src/utils/tests/i18n-locales.spec.ts` (English/Spanish key parity, regional locales,
fallback for unsupported languages).

### Upstream

Sent as [Open-STEM/XRPWeb#337](https://github.com/Open-STEM/XRPWeb/pull/337), closing
[Open-STEM/XRPWeb#335](https://github.com/Open-STEM/XRPWeb/issues/335). No changes to generated
Python.


## Part 2 — Friendly theme and block editor

### Problem

The block editor is hard to read for young students: small square blocks, muted colours that look
alike, a plain text toolbox with every category at the same level, and no way to search for a block.
The rest of the app looks like an IDE for adults.

### Solution

#### Block editor

- **Rounded blocks:** zelos renderer. Blocks are larger and easier to tap on tablets.
- **One colour per category:** each toolbox category gets a colour from a theme, and every block takes
  the colour of the category it lives in. Built-in Blockly styles (logic, loops, math, text, lists,
  variables, functions) use the same colours.
- **Toolbox:** an icon per category (react-icons, bundled, works offline), labels in the category
  colour (darker on the light theme, lighter on the dark theme), taller rows with separators.
- **Search:** a search field at the top of the toolbox (`@blockly/toolbox-search` 3.1.9, compatible
  with Blockly 12; replaced by an adapted copy in spec 004).
- **Advanced group:** Web Server, Dashboard, Gamepad, 3rd Party, Text, Lists and Functions move into a
  collapsed "Advanced" category. Grouping happens when the toolbox is built, so the plugin manager
  still finds Gamepad when it inserts the 3rd Party category.
- **Canvas:** theme background and a sparser cross grid.

#### App theme (GitHub colours by default)

- The app's components use named Tailwind palettes (`curious-blue`, `matisse`, `shark`, ...). The
  theme replaces their values with GitHub's Primer colours, so components restyle without edits:
  dark header, neutral grays, blue accents, green Run, red Stop, 6px corners.
- System font stack and layout tabs with an underline on the active tab.

#### Themes

A theme lives in `src/theme/<name>/`:

- `tailwind.ts` — app palette, applied with `withGitHubTheme()` in `tailwind.config.ts`.
- `app.css` — font and layout tabs.
- `blocks.ts` — one colour per toolbox category and the editor surfaces (light and dark), typed by
  `src/theme/types.ts`.

`src/theme/index.ts` selects the active theme (GitHub by default). A theme selector can be added
later; `src/components/blockly/block-theme.ts` applies any block theme to Blockly.

### Files

- New: `src/theme/` (types, index, `github/`), `src/components/blockly/block-theme.ts`,
  `src/components/blockly/toolbox-ui.ts` and `.css`.
- Hooks: `src/components/blockly.tsx` (renderer, theme options, toolbox builder, grid),
  `tailwind.config.ts`, `src/main.tsx` (theme CSS), `src/utils/i18n/locales/{en,es}/blockly.json`
  ("Search", "Advanced").
- Dependency: `@blockly/toolbox-search` 3.1.9.

### How to test

1. Open a blocks file: rounded blocks, each category in its own colour, icons in the toolbox.
2. Type "motor" in the search field: the motor blocks appear.
3. Expand "Advanced": Web Server, Dashboard, Gamepad, Text, Lists and Functions are inside.
4. Switch to the dark theme in Settings: labels and icons stay readable.
5. Save and reload a project created before the change: it opens unchanged, and the generated
   Python is the same.

Automated: `src/components/tests/block-theme.spec.ts` (category and subcategory colours, block
colouring, built-in styles) and `src/components/tests/toolbox-ui.spec.ts` (Advanced grouping,
search entry).

### Screenshots

**Before**

![Before](images/theme-before.png)

**After (light)**

![After, light](images/theme-after-light.png)

**After (dark)**

![After, dark](images/theme-after-dark.png)

| Advanced expanded | Search |
| --- | --- |
| ![Advanced](images/theme-advanced.png) | ![Search](images/theme-search.png) |

### Upstream

- **Block editor** (renderer, toolbox icons, search, Advanced group, block theme): could be proposed
  as an option in Settings rather than a forced change.
- **App theme:** fork-specific design choice.


## Part 3 — Theme switch fixes

### Problem

Two bugs when switching between light and dark:

1. **Glitch on every switch.** The layout (flexlayout) loads its theme as a stylesheet file. The
   old file was removed before the new one had downloaded, so the whole layout lost its styles for
   a moment (most visible in production, where the file comes over the network).
2. **Layout and shell stuck on the old theme after closing a tab.** Closing an editor tab called
   `eventOff(EVENT_THEME)`, which drops *every* theme listener, including the layout's and the
   shell's. After that, switching themes left the tab bars and the shell on the old theme.

### Solution

1. New `src/utils/swap-stylesheet.ts`: adds the new stylesheet next to the old one and removes the
   old one only after the new one has loaded (or failed). A swap still loading is cancelled when
   another one starts, so fast toggling ends on the last choice. `xrplayout.tsx` uses it in
   `changeTheme`.
2. `EditorMgr.RemoveEditor` no longer removes theme listeners. A closed editor's listener finds no
   session and does nothing.

### Files

- New: `src/utils/swap-stylesheet.ts`, `src/utils/tests/swap-stylesheet.spec.ts`.
- Hooks: `src/components/xrplayout.tsx` (`changeTheme`), `src/managers/editormgr.ts`
  (`RemoveEditor`).

### How to test

1. On a slow network (the layout stylesheets take almost a second to load): switching theme keeps
   the layout styled during the load (before: unstyled layout).
2. Open a `.blocks` file, close its tab, reopen it, switch to Dark: tab bars, shell and blocks turn
   dark (before: tab bars and shell stayed light). Switch back to Light: all light.

Captured during the switch, with the stylesheet download delayed:

| Light | Dark |
| --- | --- |
| ![Light](images/theme-switch-light.png) | ![Dark](images/theme-switch-dark.png) |

### Upstream

Both bugs are in XRPWeb's code. The two code commits are on the `theme-switch-flash` branch, based
on `upstream/main`, ready to propose.
