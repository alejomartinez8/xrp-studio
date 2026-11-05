# 013 — Welcome screen

## Problem

With no tab open, the editor area was an empty space: nothing invited a child to start. MakeCode,
which children often use alongside other platforms, always offers something to create.

## Solution

- `src/components/welcome/welcome-screen.tsx` (new): shown in the editor area whenever it has no
  tab (flexlayout `onTabSetPlaceHolder` in `xrplayout.tsx`). Two big buttons: **New blocks
  project** and **New Python project**, plus a hint to open a project from the Folders panel.
- Like MakeCode, one tap creates the project with a numbered name (`my-project-1.blocks`,
  `mi-proyecto-1.blocks` in Spanish) in the top folder of the user's projects, saves it right away
  (My projects or Google Drive) and opens it. No New File dialog.
- `src/utils/new-project.ts` (new): the numbered name and the file data. The folder and the names
  already in it come from the projects service, so it works even while the folder tree shows the
  robot's memory.
- `navbar.tsx`: the New File dialog's create step is shared as `createNewFile`, and the new
  `EVENT_NEW_PROJECT` event (`appmgr.ts`) runs it without the dialog.
- Signed out of Google (no place to save projects), the buttons ask to sign in first.

## Files

- New: `src/components/welcome/welcome-screen.tsx`, `src/utils/new-project.ts`, tests in
  `src/components/welcome/tests/` and `src/utils/tests/new-project.spec.ts`.
- Hooks: `src/components/xrplayout.tsx` (`onTabSetPlaceHolder`), `src/components/navbar.tsx`
  (`createNewFile`, `EVENT_NEW_PROJECT`), `src/managers/appmgr.ts` (`EVENT_NEW_PROJECT`,
  `getFolderData`), `src/utils/i18n/locales/{en,es}/{en,es}.json` (`welcome.*`).

## How to test

1. `npx vitest run src/components/welcome src/utils/tests/new-project.spec.ts`: 4 tests.
2. My projects, no tab open: the welcome screen shows. New blocks project opens
   `my-project-1.blocks` (saved, in the folder tree); close it, the welcome screen comes back; New
   blocks project again opens `my-project-2.blocks`; New Python project opens `my-project-1.py`.
3. Spanish UI: the title is "¿Qué quieres crear hoy?" and projects are `mi-proyecto-N`.
4. Tablet and phone emulation: the buttons work with a tap and the screen scrolls when it does not
   fit.

| Light | Dark |
| --- | --- |
| ![Light](images/welcome-light.png) | ![Dark](images/welcome-dark.png) |

## Upstream

Fork-specific (kids UI). `createNewFile` / `EVENT_NEW_PROJECT` could serve XRPWeb too.
