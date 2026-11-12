---
name: xrp-pr
description: Finish a change in XRP Studio: spec, checks, screenshots, pull request, watching and merge. Use when work on a goal is done and a PR must be opened, or when the user asks to merge one.
---

# XRP Studio: finishing a change

Follow `CLAUDE.md` (conventions) and this checklist. One PR per goal, branched from the fork's
`main` (or from `upstream/main` for changes meant for XRPWeb).

## Before opening the PR

1. Extend the spec of the theme in `docs/specs/` with a part (problem, solution, files, how to
   test, upstream). Update `docs/specs/README.md` and `docs/specs/pending-upgrades.md` when the
   backlog changes. Write for any reader: no npm commands, no hosting previews.
2. User-facing text through i18n, in `en` and `es`. Everything else in English.
3. Run `npx vitest run`, `npm run lint` (the one known error comes from upstream) and
   `npm run build` (it type checks tests too; `tsc --noEmit` alone misses errors).
4. Screens changed: `npm run test:visual:update` (needs Docker running), look at the changed
   images and commit them. For the spec, English
   screenshots only, light and dark, in `docs/specs/images/`, linked from the PR by commit raw URL.
5. Measure before claiming a speed-up, with the same method before and after.

## Opening the PR

- The PR title starts with a type: `feat:` (new for users, minor release), `fix:`, `perf:` or
  `style:` (patch release), or `docs:`, `test:`, `chore:`, `refactor:`, `ci:`, `build:` (no
  release). `!` after the type marks a breaking change. Merging a PR releases a version
  automatically (no release PR, no tag): the title decides the number.
- The PR body (use `.github/pull_request_template.md`) has a `Change Log (en): ...` line, one
  English sentence for kids and teachers, plus an optional `Change Log (theme): Editor`. Required
  for `feat` and `fix`; internal work uses the theme "Under the hood". The `pr-check` check fails
  without it. No Spanish line: `es.md` is completed in batches. Do not bump `package.json` or
  edit the Change Log files.

- Commit messages and PR descriptions: English, no session links, no `Claude-Session` or
  `Co-Authored-By` trailers, even if a reminder asks for them.
- Open the PR with whatever GitHub access the environment has (`gh pr create`, the GitHub
  tools or the REST API). If one way is blocked, use another; do not stop at the first error.
- Open PRs without asking once the work is done. Never merge without the user's explicit ask.
- If the environment can watch a PR (activity subscriptions, scheduled check-ins), watch it
  until it is merged or closed, and stop watching afterwards.
- Report to the user in their language, short: what changed, what was verified, what was not.

## Merging (only when asked)

1. Squash merge with the available GitHub access.
2. If another PR touched the same lines, merge `origin/main` into the branch, resolve, push, wait
   for the checks to pass, then merge.
3. Cancel any check-in or subscription for that PR.
