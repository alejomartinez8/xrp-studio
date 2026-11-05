# 002 — Local projects in the browser

## Problem

Files can only be created, opened or saved when an XRP is connected or the user is signed in to
Google Drive. Without either, the File menu is disabled and the editor stays empty. This blocks:

- Students practicing at home without a robot.
- Schools that do not allow Google accounts for kids.
- Teachers preparing programs before class.

## Solution

Projects are kept in the browser (IndexedDB), with no account and no robot required.

- `LocalDriveService` implements the same interface as `GoogleDriveService` (create, read, update,
  rename, move, delete, list, folder tree) on top of IndexedDB.
- In offline builds, `AppMgr` uses `LocalDriveService`, and a `LocalSession` widget replaces the
  Google sign-in button: it signs in to the local drive automatically on startup.
- Because the local drive behaves like Google Drive, the existing code paths work unchanged: file
  tree, New / Open / Save, autosave, and Run (which copies the program to the XRP when connected).
- The root `XRPCode` folder is created once, even when React's StrictMode mounts twice.
- The tree header reads "My projects (this browser)".

## Files

- New: `src/services/local-drive.ts` (service, IndexedDB and in-memory stores),
  `src/widgets/local-session.tsx`.
- Hooks: `src/managers/appmgr.ts` (service selection), `src/widgets/login.tsx` (local session),
  `src/components/folder-tree.tsx` (skip the Google Drive first-login notice),
  `src/components/xrplayout.tsx` (no Google Drive icon on local tabs).

## How to test

1. `npm run dev:offline`, with no robot connected.
2. File → New File → Blockly, name it, Submit: the editor opens and the file appears in the tree.
3. Add a block, File → Save File, reload the page: the file and the block are still there.
4. Rename, move and delete files and folders from the tree.

Automated: `src/services/tests/local-drive.spec.ts` (create/read/update, folder tree, rename, move,
recursive delete, persistence, single root folder under concurrent calls).

## Known limitations

- Projects live in one browser profile. Export to PC is the backup path.
- With a robot connected, the tree shows local projects, not the XRP's internal files (the same
  behaviour as with Google Drive).

## Upstream

Proposed as a feature request: [Open-STEM/XRPWeb#336](https://github.com/Open-STEM/XRPWeb/issues/336).
The issue asks whether local projects should coexist with the XRP file tree or only be used when
neither an XRP nor Google is available. The service can be reused as is; the way it is activated
would follow the team's answer.
