# 007 — Build time: chunking and build-only extras

## Problem

`vite build` takes about 77 s locally (4 cores, 15 GB) and needs
`NODE_OPTIONS=--max-old-space-size=8192`. Most of the cost is the Monaco/VS Code stack (a 13 MB
`@monaco` chunk). Smaller costs:

- `manualChunks` matched `id.includes('react')` and `id.includes('vscode')`, which also caught
  unrelated paths and produced `Circular chunk: @react-blockly -> @react -> @react-blockly`.
- `rollup-plugin-visualizer` walked the module graph and wrote a 3.4 MB `stats.html` on every build.
- Vite computed the gzip size of every chunk only to print it.

## Solution

1. `manualChunks` is now a named function that matches exact package names under `node_modules/`.
   The chunk groups are the same (`@react-blockly`, `@monaco`, `@react`).
2. The visualizer runs only with `ANALYZE=true`.
3. `build.reportCompressedSize: false`.

`esbuild.sourcemap` was checked and left alone: the production build emits no `.map` files.

## Result

| | Before | After |
|---|---|---|
| `vite build` | 77 s | 71 s |
| Circular chunk warning | yes | no |
| `stats.html` | written | only with `ANALYZE=true` |
| `dist/` size | 34 MB | 34 MB |

The remaining time is Monaco. Loading it with dynamic `import()` would help the initial page load
but touches upstream code, so it is left as a possible follow-up.

## Files

`vite.config.ts`.

## How to test

1. `NODE_OPTIONS=--max-old-space-size=8192 npm run build` shows no circular-chunk warning.
2. `ANALYZE=true npm run build` writes `stats.html`.
3. `npm run preview`: blocks and Python editors load, Pyright works.

## Upstream

Generic; can be sent to Open-STEM/XRPWeb unchanged.
