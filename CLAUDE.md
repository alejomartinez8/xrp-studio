# XRP Studio

Fork de [Open-STEM/XRPWeb](https://github.com/Open-STEM/XRPWeb): IDE web para el robot XRP
(bloques Blockly + Python/MicroPython). Objetivos del fork: funcionar sin internet, bloques
estilo MakeCode, UI simple para niños, en español; desktop y tablet Android.

## Comandos

- `npm install` (no `npm ci`: el `package-lock.json` de upstream está desincronizado; no
  commitear cambios al lockfile salvo que se agreguen dependencias)
- `npm run dev` / `npm run dev:offline` → http://localhost:3000 (Chrome o Edge; Web Serial no
  existe en Firefox/Safari)
- `npm run build` / `npm run build:offline` → `dist/`
- `npx vitest run` (pruebas una vez; `npm test` queda en modo watch)
- `npm run lint`

## Arquitectura

- Entrada: `src/main.tsx` (providers, i18n) → `src/App.tsx` → `src/components/xrplayout.tsx`
  (layout de pestañas con flexlayout-react) y `navbar.tsx` (menús y botón Run).
- Managers singleton en `src/managers/` comunicados por eventos (`AppMgr.emit/on`, mitt):
  `connectionmgr` (USB/Bluetooth), `commandstoxrpmgr` (REPL del XRP), `editormgr` (sesiones de
  editor), `pluginmgr`.
- Conexión: `src/connections/` (Web Serial y Web Bluetooth).
- Bloques: `src/components/blockly.tsx` (workspace, tema, toolbox) y `src/components/blockly/`
  (definición de bloques XRP y generador de Python).
- Editor Python: `MonacoEditor.tsx` + `lsp-client.ts` (Pyright en web worker, offline).
- i18n: `src/utils/i18n/locales/{en,es}/` (i18next) y `src/utils/blockly-locales.ts`.
- Firmware y librerías: `public/` (manifiestos generados por `scripts/gen-firmware-manifests.mjs`).
- Servicios de red: Google login/Drive (`src/services/google-*.ts`, `src/widgets/login.tsx`),
  chat IA (`src/components/chat/`, oculto por defecto: `?aibuddy=1`), telemetría en
  `connectionmgr.ts` (`IDSet`).

## Modo offline

`VITE_OFFLINE=true` (o `--mode offline`, que carga `.env.offline`). Flag en
`src/utils/offline.ts` (`isOfflineBuild`). Con el flag: no se carga el script de Google
Identity ni se pide el client ID, el chat IA no aparece y no se envía la telemetría.

Proyectos locales (estilo MakeCode, sin login): `src/services/local-drive.ts` implementa la
misma interfaz que `GoogleDriveService` sobre IndexedDB, y `src/widgets/local-session.tsx`
"inicia sesión" sola al abrir. Así todo el código existente de Drive (árbol, abrir, guardar,
autoguardado, Run) usa el navegador sin cambios. `AppMgr` elige el servicio según el flag.

Pendiente en offline: los textos de algunos diálogos aún dicen "Google Drive"; la instalación
de drivers se bloquea con sesión iniciada (`navbar.tsx`, `onDriverClicked`); con el robot
conectado el árbol muestra los proyectos locales, no los archivos internos del XRP.

## Convenciones

- Cambios mínimos sobre archivos de upstream: preferir archivos nuevos, flags y ganchos de pocas
  líneas antes que reescribir. No borrar código de upstream; desactivarlo detrás de un flag.
- Traer cambios de upstream: `git fetch upstream && git merge upstream/main` en `main`.
- Una rama por fase/tarea (`fase-N-...`).
- Prettier: 4 espacios, comillas simples, 100 columnas. Alias de imports: `@/`, `@components/`,
  `@utils/`, `@connections/`, `@assets/`.
- Textos de UI siempre vía i18n (en y es).
- Licencia GPL: el fork se mantiene GPL.
