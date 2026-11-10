# Pending upgrades

Major upgrades left out of the maintenance change. Each one can break the build or the app, so each
should be its own change, tested in the app.

| Package | Current | Target | Notes |
| --- | --- | --- | --- |
| `react-blockly` | 9 | — | Runs on React 19 through `overrides` in `package.json` (spec 006, part 4). Remove the override when `react-blockly` declares React 19. |
| `npm audit` leftovers | — | — | 20 reports, none critical (spec 006, part 3): 2 high in `flowbite-react` through `deepmerge-ts` and moderate ones in build and lint tools. They go away as those packages release fixes; check with `npm audit` after each update. |

## Feature backlog

| Feature | Notes |
| --- | --- |
| Test My projects with a robot | Run from My projects, Robot memory switch, disconnect. See spec 004. |
| Hybrid Python editor | The Blocks \| Python selector is done (spec 003, part 6) with read-only Python. Next, as in MakeCode: an editable Python mirror of the blocks and a toolbox of code snippets with explanations. |
| Dracula theme | Second app theme. Since Tailwind 4 (spec 006, part 9) the app palette is CSS variables (`--color-shark-50`, ...): a theme can set them under a selector at run time. |
| Configurable Drive folder name | `Constants.XRPCODE` is fixed to `XRPCode`. With its own OAuth client the fork only sees the folders it created, so users of both apps get two `XRPCode` folders. A build setting (default `XRPCode`) would avoid renaming it for XRPWeb users; the hardcoded `'/XRPCode/'` paths in `folder-tree.tsx`, `newfiledlg.tsx` and `filesaveasdlg.tsx` would need to use the constant first (they map Drive paths to `/gusers/<user>/` on the robot, so test Run with a robot). |
| Add the most common languages (not started, no robot needed) | First batch: Portuguese, French, German, Simplified Chinese, Hindi, Arabic and Japanese. Per language: new `src/utils/i18n/locales/<lang>/` files (including `blockly.json` and the `local-projects` and `offline` overrides), the Blockly locale in `src/utils/blockly-locales.ts`, an entry in `src/utils/i18n/languages.ts` and `supportedLngs`, font coverage for the script, and a human review of the translations for kids. Arabic also needs a right-to-left layout check (flexlayout tabs, toolbox, Blockly workspace). |
| Battery level in the status pill | `batteryVoltage()` returns 0 while the REPL is busy; needs a robot to test safely. |

## Known issues

Bugs found while testing go here until they are fixed, each one as its own change.

| Issue | Notes |
| --- | --- |
| "Reset encoders" block fails to generate Python | Its generator (`xrp_blocks_python.js`, inherited from XRPWeb) reads a `degrees` input the block does not have, so Blockly stops with an error and a program with that block gets no Python. Found by the generator test of spec 006, part 7; same with Blockly 12 and 13. |
