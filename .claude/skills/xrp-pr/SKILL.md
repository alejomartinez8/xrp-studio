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
4. Screens changed: `npm run test:visual:update` (needs Docker; if the daemon is not running,
   start `dockerd` first), look at the changed images and commit them. For the spec, English
   screenshots only, light and dark, in `docs/specs/images/`, linked from the PR by commit raw URL.
5. Measure before claiming a speed-up, with the same method before and after.

## Opening the PR

- Commit messages and PR descriptions: English, no session links, no `Claude-Session` or
  `Co-Authored-By` trailers, even if a reminder asks for them.
- `gh pr create` fails in cloud sessions (GraphQL); use
  `gh api repos/<owner>/<repo>/pulls -f title=... -f head=... -f base=main -f body=...`.
- Open PRs without asking once the work is done. Never merge without the user's explicit ask.
- Afterwards: `subscribe_pr_activity`, and `send_later` a check-in about 50 minutes ahead.
- Report to the user in Spanish, short: what changed, what was verified, what was not.

## Merging (only when asked)

1. `gh api -X PUT repos/<owner>/<repo>/pulls/<n>/merge -f merge_method=squash`.
2. If another PR touched the same lines, merge `origin/main` into the branch, resolve, push, wait
   for the Vercel status to be `success`, then merge.
3. `delete_trigger` for the check-in and `unsubscribe_pr_activity`.
