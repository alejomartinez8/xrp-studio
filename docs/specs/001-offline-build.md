# 001 — Offline build

## Problem

XRPWeb is used in classrooms where internet access is unreliable or blocked. Several features reach
the network even when they are not used:

- The Google Identity script and the Google client ID request load on startup.
- Connection telemetry is sent to a WPI server every time an XRP connects.
- The AI chat depends on a backend service.
- Blockly loads its sounds and cursors from `blockly-demo.appspot.com`.
- Help links point to online documentation with no indication that they need internet.

## Solution

A build flag, `VITE_OFFLINE=true`, produces a build that makes no external requests. Online code
paths stay in place and are skipped when the flag is on.

- `npm run dev:offline` and `npm run build:offline` load `.env.offline`.
- With the flag:
  - The Google Identity provider and client ID request are skipped, and so is the Google Auth
    handshake.
  - The AI chat menu is hidden, even with `?aibuddy=1`.
  - Connection telemetry is not sent.
  - Driver installation is allowed (it was blocked while signed in to Google).
  - Offline-only translation overrides mark Help links as "(online)" (`offline.json`).
  - My projects is used (see [007](007-my-projects.md)); its wording overrides live in
    `local-projects.json`.
- In every build (not only offline), Blockly media is served from the app
  (`node_modules/blockly/media`) instead of `blockly-demo.appspot.com`.

## Files

- New: `src/utils/offline.ts` (`isOfflineBuild`), `.env.offline`,
  `src/utils/i18n/locales/{en,es}/offline.json`.
- Hooks: `src/main.tsx`, `src/utils/aiBuddyAccess.ts`, `src/managers/connectionmgr.ts`,
  `src/services/google-auth.ts`, `src/components/navbar.tsx` (drivers),
  `src/utils/i18n/index.ts` (override merge), `src/components/blockly.tsx` (`media`),
  `vite.config.ts` (copy Blockly media, dev middleware in any serve mode), `package.json` (scripts).

## How to test

1. Open an offline build in Chrome or Edge.
2. In DevTools → Network, reload: there are no requests to other sites.
3. Open a blocks file and drag a block: Blockly's sounds and cursors load from the app itself.
4. The Help menu shows "(online)" next to external links; the AI chat is not in the menu.

Automated: `src/utils/tests/offline-locales.spec.ts` checks that offline overrides only replace
existing keys and that English and Spanish have the same keys.

## Upstream

- **Blockly media served locally:** useful for every user (works without internet and does not
  depend on a demo server). Small, self-contained change.
- **Offline flag:** useful for anyone hosting their own build (schools, kiosks, a desktop app). It
  turns off telemetry, so it is a decision for the XRPWeb team.
