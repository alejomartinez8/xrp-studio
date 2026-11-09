# Pending upgrades

Major upgrades left out of the maintenance change. Each one can break the build or the app, so each
should be its own change, tested in the app.

| Package | Current | Target | Notes |
| --- | --- | --- | --- |
| Python editor (`@codingame/monaco-vscode-*`, `monaco-languageclient`, `vscode-ws-jsonrpc`) | 11 / 14, 9.4.1, 3.4.0 | 2x, 10+, 4 | npm reports the 14.x `*-common` packages as no longer supported. The whole editor stack must move together; updating one piece installs a second, incompatible copy. |
| `react-blockly`, `use-resize-observer` | 9, 9 | — | Run on React 19 through `overrides` in `package.json` (spec 006, part 4). Remove the override when `react-blockly` declares React 19; `use-resize-observer` 10 accepts React 19 but changes its API. |
| Tailwind CSS | 3.4 | 4 | New config format; the theme palette approach needs a review. |
| Blockly | 12.3 | 13 | Also `@blockly/field-colour` 13.x. Check the block search field (spec 004), adapted from `@blockly/toolbox-search`. |
| recharts | 2 | 3 | 2.x is no longer maintained; used by the dashboard. |
| `npm audit` leftovers | — | — | 20 reports, none critical (spec 006, part 3): 2 high in `flowbite-react` through `deepmerge-ts` and moderate ones in build and lint tools. They go away as those packages release fixes; check with `npm audit` after each update. |

## Feature backlog

| Feature | Notes |
| --- | --- |
| Test My projects with a robot | Run from My projects, Robot memory switch, disconnect. See spec 004. |
| Hybrid Python editor | The Blocks \| Python selector is done (spec 003, part 6) with read-only Python. Next, as in MakeCode: an editable Python mirror of the blocks and a toolbox of code snippets with explanations. |
| Dracula theme | Second app theme; needs runtime CSS variables instead of build-time Tailwind colours. |
| Configurable Drive folder name | `Constants.XRPCODE` is fixed to `XRPCode`. With its own OAuth client the fork only sees the folders it created, so users of both apps get two `XRPCode` folders. A build setting (default `XRPCode`) would avoid renaming it for XRPWeb users; the hardcoded `'/XRPCode/'` paths in `folder-tree.tsx`, `newfiledlg.tsx` and `filesaveasdlg.tsx` would need to use the constant first (they map Drive paths to `/gusers/<user>/` on the robot, so test Run with a robot). |
| Battery level in the status pill | `batteryVoltage()` returns 0 while the REPL is busy; needs a robot to test safely. |

## Known issues

None right now. Bugs found while testing go here until they are fixed, each one as its own change.
