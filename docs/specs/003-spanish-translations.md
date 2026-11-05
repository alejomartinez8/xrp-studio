# 003 — Spanish translation fixes

## Problem

- With the browser set to a regional Spanish locale (`es-ES`, `es-419`), the UI was in Spanish but
  all blocks were in English, even though `es/blockly.json` had the translations.
  `applyBlocklyLocale` received `i18n.language` (e.g. `es-ES`) and only accepted exactly `en` or
  `es`, so it fell back to English. The language picker in Settings showed no selection for the same
  reason.
- Several Spanish strings were wrong: the backup and restore descriptions described the opposite
  direction, "Processing" messages dropped the file name, and some strings had the wrong number or
  meaning or unbalanced `¡ !` punctuation. One key (`copyfiles.gdrive`) was misnamed.

## Solution

- i18next normalizes detected languages to their base code (`supportedLngs` +
  `convertDetectedLanguage`), and `applyBlocklyLocale` accepts regional codes.
- Spanish fixes: backup/restore direction, `{{ filename }}` placeholders, wording and number fixes,
  balanced punctuation, consistent "usted", "Girar Gr:" → "Girar grados:", "Gr:" → "Grados:".

## Files

`src/utils/i18n/index.ts`, `src/utils/blockly-locales.ts`,
`src/utils/i18n/locales/es/es.json`, `src/utils/i18n/locales/es/blockly.json`.

## How to test

1. Set the browser language to Spanish (Spain or Latin America) and open the app.
2. Settings shows Spanish selected; blocks read "Motor: Izquierdo Esfuerzo" instead of
   "Motor: Left Effort".

Automated: `src/utils/tests/i18n-locales.spec.ts` (English/Spanish key parity, regional locales,
fallback for unsupported languages).

## Upstream

Sent as [Open-STEM/XRPWeb#337](https://github.com/Open-STEM/XRPWeb/pull/337), closing
[Open-STEM/XRPWeb#335](https://github.com/Open-STEM/XRPWeb/issues/335). No changes to generated
Python.
