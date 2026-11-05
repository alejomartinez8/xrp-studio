# XRP Studio change specs

XRP Studio is a fork of [Open-STEM/XRPWeb](https://github.com/Open-STEM/XRPWeb) focused on
classrooms and kids: it works without internet, keeps projects in the browser, and has a friendlier
block editor. This folder documents each change so it can be reviewed, reused or proposed upstream.

Each spec covers the problem, the solution, the files involved, how to test it and whether it could
be proposed to XRPWeb.

| # | Spec | Status | Upstream |
| --- | --- | --- | --- |
| 001 | [Offline build](001-offline-build.md) | Done | Possible, behind a build flag |
| 002 | [Local projects in the browser](002-local-projects.md) | Done | Proposed as an issue ([Open-STEM/XRPWeb#336](https://github.com/Open-STEM/XRPWeb/issues/336)) |
| 003 | [Spanish translation fixes](003-spanish-translations.md) | Done | Sent ([Open-STEM/XRPWeb#337](https://github.com/Open-STEM/XRPWeb/pull/337)) |
| 004 | [Friendly theme and block editor](004-friendly-theme.md) | Done | Block editor parts possible; app theme is fork-specific |
| 005 | [Maintenance: lockfile, Tailwind config, minor updates](005-maintenance.md) | Done | Possible |
| — | [Pending upgrades](pending-upgrades.md) | Backlog | Each one as its own change |

## Principles

- **Minimal changes to upstream files.** New behaviour lives in new files; upstream files only get
  small hooks, so the fork can keep pulling XRPWeb changes.
- **Flags instead of deletions.** Online features are switched off by a build flag, not removed.
- **Generated Python is never changed.** Visual and storage changes do not touch block definitions
  or the code sent to the robot.
- **Small, single-topic changes**, each tested in the app (light and dark theme, English and
  Spanish).
