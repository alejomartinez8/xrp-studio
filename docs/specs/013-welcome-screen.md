# 013 — Welcome screen

What the editor area shows when no tab is open, in four parts: start a new project, continue a
recent one, start from an example, and hide the shell until a project is open.

## Part 1 — New project

### Problem

With no tab open, the editor area was an empty space: nothing invited a child to start. MakeCode,
which children often use alongside other platforms, always offers something to create.

### Solution

- `src/components/welcome/welcome-screen.tsx` (new): shown in the editor area whenever it has no
  tab (flexlayout `onTabSetPlaceHolder` in `xrplayout.tsx`). Two big buttons: **New blocks
  project** and **New Python project**, plus a hint to open a project from the Folders panel.
- Like MakeCode, the child then names the project. No name is suggested, so the child thinks of
  one that is easy to find later; **Create** (or Enter) is enabled once a valid name is typed. Names that already exist or are not valid file names are explained and cannot be
  created; accents are dropped while typing (`línea` becomes `linea`), since robot file names
  allow only plain letters, numbers, spaces, `.`, `-` and `_`. The project is saved right away in
  the top folder of the user's projects (My projects or Google Drive) and opened. No New File
  dialog.
- `src/utils/new-project.ts` (new): accent cleanup, name checks and file data. The folder and the names
  already in it come from the projects service, so it works even while the folder tree shows the
  robot's memory.
- `navbar.tsx`: the New File dialog's create step is shared as `createNewFile`, and the new
  `EVENT_NEW_PROJECT` event (`appmgr.ts`) runs it without the dialog.
- Signed out of Google (no place to save projects), the buttons ask to sign in first.

### Files

- New: `src/components/welcome/welcome-screen.tsx`, `src/utils/new-project.ts`, tests in
  `src/components/welcome/tests/` and `src/utils/tests/new-project.spec.ts`.
- Hooks: `src/components/xrplayout.tsx` (`onTabSetPlaceHolder`), `src/components/navbar.tsx`
  (`createNewFile`, `EVENT_NEW_PROJECT`), `src/managers/appmgr.ts` (`EVENT_NEW_PROJECT`,
  `getFolderData`), `src/utils/i18n/locales/{en,es}/{en,es}.json` (`welcome.*`).

### How to test

1. My projects, no tab open: the welcome screen shows. New blocks project asks for a name (empty,
   Create disabled); type `line follower` and press Enter: `line follower.blocks` opens and
   is in the folder tree. Close it: the welcome screen comes back.
2. Typing the name of an existing project disables Create and says so; Back returns to the two
   buttons.
3. Spanish UI: "¿Qué quieres crear hoy?" and "Ponle nombre a tu proyecto"; typing
   `Seguidor de línea` creates `Seguidor de linea.blocks`.
4. Tablet and phone emulation: the buttons work with a tap and the screen scrolls when it does not
   fit.

| | Light | Dark |
| --- | --- | --- |
| Welcome | ![Light](images/welcome-light.png) | ![Dark](images/welcome-dark.png) |
| Name the project | ![Light](images/welcome-name-light.png) | ![Dark](images/welcome-name-dark.png) |

## Part 2 — Recent projects

### Problem

The welcome screen (Part 1) only offered new projects. To continue yesterday's project, a child
had to find it in the Folders panel, among many files and folders.

### Solution

- Below New blocks / New Python, **Your recent projects** shows up to six cards with the newest
  projects (`.blocks` and `.py`, subfolders included, trash left out): the blocks or Python icon,
  the name without its extension and how long ago it was changed ("5 minutes ago", "yesterday",
  "hace 2 días", "Just now"). One tap opens it, like the folder tree (`EVENT_OPEN_FILE`).
- `src/utils/recent-projects.ts` (new): picks the projects from the projects tree
  (`driveService.buildTree`, the same data as the folder tree, for My projects and Google Drive)
  and formats the time with `Intl.RelativeTimeFormat` in the app's language.
- The list loads when the welcome screen shows and again when the user signs in or out. Signed
  out, there is no list. With recent projects, the hint below says that all projects are in the
  Folders panel.
- `src/managers/appmgr.ts`: `removeHandler(event, handler)` removes one handler, so the welcome
  screen unsubscribes when it unmounts without removing other components' handlers (`eventOff`
  removes them all).

### Files

- New: `src/utils/recent-projects.ts`, `src/utils/tests/recent-projects.spec.ts`.
- Changed: `src/components/welcome/welcome-screen.tsx` and its tests, `src/managers/appmgr.ts`
  (`removeHandler`), `src/utils/i18n/locales/{en,es}/{en,es}.json` (`welcome.recentTitle`,
  `welcome.justNow`, `welcome.moreHint`).

### How to test

1. My projects: create `square` (blocks), `zigzag` (Python) and `line follower` (blocks) from the
   welcome screen, closing each tab. The welcome screen lists them newest first, "Just now".
2. Tap `zigzag`: `zigzag.py` opens. Close it: the list is back.
3. Spanish UI: "Tus proyectos recientes", "Recién".
4. Phone emulation: the cards stack and open with a tap.

| Light | Dark |
| --- | --- |
| ![Light](images/recent-projects-light.png) | ![Dark](images/recent-projects-dark.png) |

## Part 3 — Examples

### Problem

A child who has never programmed the robot starts from an empty workspace and does not know which
blocks make it move. Working programs to start from and change are the quickest way in.

### Solution

- Below the recent projects, **Start from an example** shows four cards, each with an icon and one
  sentence: **Drive and turn**, **Square**, **Avoid obstacles** and **Follow a line**.
- `src/utils/examples.ts` (new): the four blocks programs as Blockly JSON, built only from blocks
  in the XRP toolbox (block texts follow the app language on their own). Each one starts with
  "Wait for button press", so the robot does not drive off in the child's hand:
  - Drive and turn: straight 30 cm, turn 180°, straight 30 cm, LED on.
  - Square: repeat 4 times: straight 20 cm, turn 90°.
  - Avoid obstacles: forever: if the distance sensor reads less than 20 cm, stop and turn 90°;
    otherwise drive at effort 0.5.
  - Follow a line: forever: if the left reflectance is higher than the right one, slow the left
    wheel (0.2, 0.5); otherwise slow the right wheel (0.5, 0.2).
- Tapping a card goes through the same naming step as a new project, with the example's title
  already typed (accents dropped, so "Seguir la línea" becomes `Seguir la linea`). If that name is
  taken, the first free number is suggested (`Square 2`). The copy is saved in the user's projects
  and opened; the example itself never changes.
- `navbar.tsx` (`createNewFile`): the new file is created with `NewFileData.content` when it has
  one (empty otherwise, as before), and the editor tab loads that content when it mounts.

### Files

- New: `src/utils/examples.ts`, `src/utils/tests/examples.spec.ts`.
- Changed: `src/components/welcome/welcome-screen.tsx` and its tests, `src/components/navbar.tsx`
  (`createNewFile` uses `data.content`), `src/utils/i18n/locales/{en,es}/{en,es}.json`
  (`welcome.examplesTitle`, `welcome.examples.*`).

### How to test

1. My projects, no tab open: tap **Square**. The name step shows `Square`; press Enter:
   `Square.blocks` opens with its blocks. Reload: the blocks are still there.
2. Close the tab and tap **Square** again: `Square 2` is suggested.
3. Spanish UI: "Empieza con un ejemplo"; **Evitar obstáculos** suggests `Evitar obstaculos` and the
   blocks show in Spanish.
4. With a robot (not tested yet): run each example and adjust distances, angles, efforts and the
   line comparison if needed.

| | Light | Dark |
| --- | --- | --- |
| Examples | ![Light](images/013-examples-light.png) | ![Dark](images/013-examples-dark.png) |
| Example opened | ![Light](images/013-example-open-light.png) | ![Dark](images/013-example-open-dark.png) |

## Part 4 — Shell only with a project open

### Problem

The shell takes a third of the screen under the welcome screen, where nothing can run yet. For a
child it is an empty black box with no purpose.

### Solution

- `src/utils/shell-visibility.ts` (new): `syncShellVisibility(model)` maximizes the editor tabset
  while it has no tabs, which hides the shell tabset with flexlayout's own maximize (the terminal
  stays mounted, so its state and robot output are kept). The first open tab restores the layout,
  and closing the last tab hides the shell again.
- It only acts when the editor tabset changes between empty and not empty, so a maximize or restore
  the user chooses with projects open is kept.
- `xrplayout.tsx`: runs it once when the model is created and on every model change
  (`onModelChange`).
- Connecting the robot from the welcome screen shows no shell output; it appears as soon as a
  project is opened, which running a program needs anyway.

### Files

- New: `src/utils/shell-visibility.ts`, `src/utils/tests/shell-visibility.spec.ts`.
- Changed: `src/components/xrplayout.tsx` (3 lines).

### How to test

1. No tab open: the welcome screen fills the editor area and there is no shell.
2. Open or create a project: the shell shows below the editor. Reload: still there.
3. Close the last tab: the shell hides and the welcome screen fills the area again.

The **Examples** screenshots above show the welcome screen without the shell, and **Example
opened** shows it back with a project open.

## Upstream

Fork-specific (kids UI). `createNewFile` / `EVENT_NEW_PROJECT` and `AppMgr.removeHandler` could
serve XRPWeb too. Hiding the shell with no tabs open is a small, separate change XRPWeb could take
on its own. Creating a new file with content (`NewFileData.content`) is a small change XRPWeb
could use for its own examples.
