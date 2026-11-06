# XRP Studio change specs

XRP Studio is a fork of [Open-STEM/XRPWeb](https://github.com/Open-STEM/XRPWeb) focused on
classrooms and kids: it works without internet, keeps projects in the browser, and has a friendlier
block editor. This folder documents each change so it can be reviewed, reused or proposed upstream.

Each spec covers the problem, the solution, the files involved, how to test it and whether it could
be proposed to XRPWeb.

| # | Spec | Status | Upstream |
| --- | --- | --- | --- |
| 001 | [Offline build](001-offline-build.md) | Done | Possible, behind a build flag |
| 003 | [Spanish translation fixes](003-spanish-translations.md) | Done | Sent ([Open-STEM/XRPWeb#337](https://github.com/Open-STEM/XRPWeb/pull/337)) |
| 004 | [Friendly theme and block editor](004-friendly-theme.md) | Done | Block editor parts possible; app theme is fork-specific |
| 005 | [Maintenance: lockfile, Tailwind config, minor updates](005-maintenance.md) | Done | Possible |
| 006 | [Top bar](006-navbar.md) | Done | Fork-specific layout |
| 007 | [My projects: projects in the browser, robot memory](007-my-projects.md) | Done; robot behaviour to be tested | Answers [Open-STEM/XRPWeb#336](https://github.com/Open-STEM/XRPWeb/issues/336) |
| 008 | [Google sign-in: server, keep the session after a reload](008-google-auth-server.md) | Done | Server as a reference; session restore possible |
| 010 | [Theme switch fixes](010-theme-switch.md) | Done | Possible (XRPWeb bugs) |
| 011 | [Files from My projects open with their blocks](011-open-file-blocks.md) | Done | Possible (XRPWeb race) |
| 012 | [Opening projects: single tap, reopen the last project, faster opening](012-opening-projects.md) | Done | Single tap possible behind a flag; empty-file fix possible; reopen and search are fork-only |
| 013 | [Welcome screen: new project, recent projects, examples](013-welcome-screen.md) | Done | Fork-specific (kids UI) |
| 014 | [Lighter first load](014-lighter-first-load.md) | Done | Possible |
| 017 | [Close button on modals](017-modal-close-button.md) | Done | Possible |
| — | [Pending upgrades and backlog](pending-upgrades.md) | Backlog | Each one as its own change |

Numbers 002, 009 and 015 were merged into 007, 008 and 013, so each goal has one spec.

## Principles

- **Minimal changes to upstream files.** New behaviour lives in new files; upstream files only get
  small hooks, so the fork can keep pulling XRPWeb changes.
- **Flags instead of deletions.** Online features are switched off by a build flag, not removed.
- **Generated Python is never changed.** Visual and storage changes do not touch block definitions
  or the code sent to the robot.
- **Small, single-topic changes**, each tested in the app (light and dark theme, English and
  Spanish).
