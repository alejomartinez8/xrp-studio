# 013 — Welcome screen

## Problem

With no tab open, the editor area was an empty space: nothing invited a child to start. MakeCode,
which children often use alongside other platforms, always offers something to create.

## Solution

- `src/components/welcome/welcome-screen.tsx` (new): shown in the editor area whenever it has no
  tab (flexlayout `onTabSetPlaceHolder` in `xrplayout.tsx`). Two big buttons: **New blocks
  project** and **New Python project**, plus a hint to open a project from the Folders panel.
- Like MakeCode, the child then names the project. A numbered name is suggested and selected
  (`my-project-1`, `mi-proyecto-1` in Spanish), so typing replaces it and **Create** (or Enter)
  accepts it. Names that already exist or are not valid file names are explained and cannot be
  created; accents are dropped while typing (`línea` becomes `linea`), since robot file names
  allow only plain letters, numbers, spaces, `.`, `-` and `_`. The project is saved right away in
  the top folder of the user's projects (My projects or Google Drive) and opened. No New File
  dialog.
- `src/utils/new-project.ts` (new): suggested name, accent cleanup, name checks and file data. The folder and the names
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

1. `npx vitest run src/components/welcome src/utils/tests/new-project.spec.ts`: 6 tests.
2. My projects, no tab open: the welcome screen shows. New blocks project asks for a name with
   `my-project-1` selected; type `line follower` and press Enter: `line follower.blocks` opens and
   is in the folder tree. Close it: the welcome screen comes back.
3. Typing the name of an existing project disables Create and says so; Back returns to the two
   buttons.
4. Spanish UI: "¿Qué quieres crear hoy?", the suggestion is `mi-proyecto-N`, and typing
   `Seguidor de línea` creates `Seguidor de linea.blocks`.
5. Tablet and phone emulation: the buttons work with a tap and the screen scrolls when it does not
   fit.

| | Light | Dark |
| --- | --- | --- |
| Welcome | ![Light](images/welcome-light.png) | ![Dark](images/welcome-dark.png) |
| Name the project | ![Light](images/welcome-name-light.png) | ![Dark](images/welcome-name-dark.png) |

## Upstream

Fork-specific (kids UI). `createNewFile` / `EVENT_NEW_PROJECT` could serve XRPWeb too.
