import { readFile } from 'fs/promises';
import { defineConfig, type PluginOption, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin';
import { visualizer } from "rollup-plugin-visualizer";
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath, URL } from 'url';
import { extname, join, normalize, resolve } from 'path';
import { googleAuthDevPlugin } from './server/google-auth/vite-plugin';

const MIME_BY_EXT: Record<string, string> = {
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.uf2': 'application/octet-stream',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
};

/** In dev, firmware-loader fetches use /public/... — mirror the public folder there. */
function devPublicPrefixPlugin(): PluginOption {
    return {
        name: 'dev-public-prefix',
        apply: 'serve',
        configureServer(server) {
            const publicRoot = resolve(__dirname, 'public');
            server.middlewares.use(async (req, res, next) => {
                const url = req.url ?? '';
                if (!url.startsWith('/public/')) {
                    return next();
                }
                const rel = decodeURIComponent(url.slice('/public/'.length).split('?')[0] ?? '');
                const file = normalize(join(publicRoot, rel));
                if (!file.startsWith(publicRoot)) {
                    return next();
                }
                try {
                    const data = await readFile(file);
                    const ext = extname(file).toLowerCase();
                    res.setHeader('Content-Type', MIME_BY_EXT[ext] ?? 'application/octet-stream');
                    res.end(data);
                } catch {
                    next();
                }
            });
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const isDev = mode === 'development' || command === 'serve';
    return {
        base: './',
        esbuild: {
            sourcemap: true,
            supported: {
                'top-level-await': true,
            },
        },
        define: {
            rootDirectory: JSON.stringify(__dirname),
            global: 'globalThis',
        },
        plugins: [
            react(),
            googleAuthDevPlugin(env),
            ...(isDev ? [devPublicPrefixPlugin()] : []),
            visualizer() as PluginOption, viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/flexlayout-react/style',
                    dest: './node_modules/flexlayout-react/'
                },
                {
                    src: 'node_modules/blockly/media',
                    dest: './node_modules/blockly/'
                },
                {
                    src: 'node_modules/gridstack/dist/gridstack.css',
                    dest: './node_modules/gridstack/dist/'
                }        ]
        })],
        resolve: {
            alias: [
                { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
                {
                    find: '@components',
                    replacement: fileURLToPath(new URL('./src/components', import.meta.url)),
                },
                {
                    find: '@connections',
                    replacement: fileURLToPath(new URL('./src/connections', import.meta.url)),
                },
                {
                    find: '@utils',
                    replacement: fileURLToPath(new URL('./src/utils', import.meta.url)),
                },
                {
                    find: '@assets',
                    replacement: fileURLToPath(new URL('./src/assets', import.meta.url)),
                },
            ],
        },
        worker: {
            format: 'es',
        },
        optimizeDeps: {
            include: ['vscode-textmate', 'vscode-oniguruma'],
            esbuildOptions: {
                tsconfig: './tsconfig.json',
                plugins: [
                    importMetaUrlPlugin
                ],
            },
        },
        server: {
            port: 3000,
            proxy: {
                '/api': env.GOOGLE_CHATAPI_PROXY_TARGET
            }
        },
        build: {
            minify: 'esbuild',
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                },
                output: {
                    manualChunks(id: string) {
                        if (id.includes('react-blockly')) {
                            return '@react-blockly'
                        }
                        if (
                            id.includes('@codingame') ||
                            id.includes('monaco-languageclient') ||
                            id.includes('@typefox/pyright-browser') ||
                            id.includes('monaco-editor') ||
                            id.includes('vscode')
                        ) {
                            return '@monaco'
                        }
                        if (
                            id.includes('react') ||
                            id.includes('flexlayout-react') ||
                            id.includes('react-arborist') ||
                            id.includes('react-dom') ||
                            id.includes('react-hotkeys-hook') ||
                            id.includes('react-i18next') ||
                            id.includes('react-icons') ||
                            id.includes('react-xtermjs')
                        ) {
                            return '@react'
                        }
                    }
                }
            }
        },
        envPrefix: ['VITE_', 'GOOGLE_'],
    }
});