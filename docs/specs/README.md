# XRP Studio change specs

XRP Studio is a fork of [Open-STEM/XRPWeb](https://github.com/Open-STEM/XRPWeb) focused on
classrooms and kids: it works without internet, keeps projects in the browser, and has a friendlier
block editor. This folder documents each change so it can be reviewed, reused or proposed upstream.

Specs are grouped by theme. Each one has a part per change, and each part covers the problem, the
solution, the files involved, how to test it and whether it could be proposed to XRPWeb. A change
extends the spec of its theme with a new part; a new spec is only for a really new theme.

| # | Spec | Parts | Upstream |
| --- | --- | --- | --- |
| 001 | [Offline and installable app](001-offline-and-install.md) | Offline build; lighter first load; installable app that works offline | Possible, behind a build flag |
| 002 | [Language and theme](002-language-and-theme.md) | Spanish translation fixes (sent, [Open-STEM/XRPWeb#337](https://github.com/Open-STEM/XRPWeb/pull/337)); friendly theme and block editor; theme switch fixes; plain Spanish for the blocks; toolbox on tablets and phones (Motors group, phone icon column, full screen app) | Block editor parts and bug fixes possible; app theme is fork-specific |
| 003 | [Layout and screens](003-layout-and-screens.md) | Top bar; welcome screen; close button on modals; layout (side bar, Terminal toggle, rounded panels, Explorer tree); bottom of the app on phones; choosing the editor (Blocks \| Python selector); menus above the editor | Fork-specific (kids UI); modal close button possible |
| 004 | [File management](004-file-management.md) | My projects and robot memory (answers [Open-STEM/XRPWeb#336](https://github.com/Open-STEM/XRPWeb/issues/336)); files open with their blocks; opening projects; automatic save | Single tap, empty-file fix and autosave possible behind a flag; robot behaviour to be tested |
| 005 | [Accounts and sync](005-accounts-and-sync.md) | Google sign-in server and session; accounts on a device, "Keep me signed in" and Drive sync; testing them with a fake Google | Server as a reference; sync is fork-only for now |
| 006 | [Maintenance](006-maintenance.md) | Lockfile, Tailwind config, minor updates, build tools, React 19, unused dependencies, tab layout (flexlayout-react 0.11), Blockly 13, recharts 3, Tailwind CSS 4, Python editor stack, app version and releases, file structure | Possible |
| 007 | [Automated testing](007-automated-testing.md) | Visual regression; planned: blocks to Python; fake robot; accessibility; languages and screen sizes | Most parts possible |
| — | [Pending upgrades and backlog](pending-upgrades.md) | Backlog | Each one as its own change |

The earlier numbers 001 to 021 were merged into the first six, so each theme has one spec.

## Principles

- **Minimal changes to upstream files.** New behaviour lives in new files; upstream files only get
  small hooks, so the fork can keep pulling XRPWeb changes.
- **Flags instead of deletions.** Online features are switched off by a build flag, not removed.
- **Generated Python is never changed.** Visual and storage changes do not touch block definitions
  or the code sent to the robot.
- **Small, single-topic changes**, each tested in the app (light and dark theme, English and
  Spanish).
