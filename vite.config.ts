import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { defineConfig, type PluginOption, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from "rollup-plugin-visualizer";
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath, URL } from 'url';
import { extname, join, normalize, resolve } from 'path';
import { googleAuthDevPlugin } from './server/google-auth/vite-plugin';
import { pwaPlugin } from './pwa-plugin';

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

/**
 * Splits vendor code into chunks by exact package name under node_modules, so that
 * unrelated packages whose path merely contains "react" or "vscode" do not create circular chunks.
 * Vite's dynamic-import helper gets its own chunk: left alone, Rollup puts it in the Monaco chunk,
 * and the app entry then downloads all of Monaco just to use it.
 */
function manualChunks(id: string): string | undefined {
    if (id.includes('vite/preload-helper')) {
        return 'preload-helper';
    }
    if (id.includes('/node_modules/react-blockly/')) {
        return '@react-blockly';
    }
    if (
        /\/node_modules\/(@codingame\/|monaco-languageclient\/|@typefox\/pyright-browser\/|monaco-editor\/|vscode)/.test(
            id,
        )
    ) {
        return '@monaco';
    }
    if (
        /\/node_modules\/(react|react-dom|flexlayout-react|react-arborist|react-hotkeys-hook|react-i18next|react-icons|react-xtermjs)\//.test(
            id,
        )
    ) {
        return '@react';
    }
    return undefined;
}

/**
 * Version facts injected into the app: the version and the upstream base come
 * from package.json, the commit from the host (Vercel or GitHub Actions) or from git, and the
 * preview flag is true on Vercel builds that are not production. Without git or host variables
 * the commit is empty and the app shows the version alone.
 */
function versionDefines(env: Record<string, string>) {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
    let commit = env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA || '';
    if (!commit) {
        try {
            commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
                .toString()
                .trim();
        } catch {
            commit = '';
        }
    }
    const vercelEnv = env.VERCEL_ENV || process.env.VERCEL_ENV || '';
    return {
        __APP_VERSION__: JSON.stringify(pkg.version),
        __APP_UPSTREAM__: JSON.stringify(pkg.xrpwebBase ?? ''),
        __APP_COMMIT__: JSON.stringify(commit.slice(0, 7)),
        __APP_PREVIEW__: JSON.stringify(vercelEnv !== '' && vercelEnv !== 'production'),
    };
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const isDev = mode === 'development' || command === 'serve';
    return {
        base: './',
        define: {
            rootDirectory: JSON.stringify(__dirname),
            global: 'globalThis',
            ...versionDefines(env),
        },
        plugins: [
            react(),
            tailwindcss(),
            googleAuthDevPlugin(env),
            pwaPlugin(),
            ...(isDev ? [devPublicPrefixPlugin()] : []),
            ...(env.ANALYZE === 'true' ? [visualizer() as PluginOption] : []),
            viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/flexlayout-react/style',
                    dest: './'
                },
                {
                    src: 'node_modules/blockly/media',
                    dest: './'
                },
                {
                    src: 'node_modules/gridstack/dist/gridstack.css',
                    dest: './'
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
        },
        server: {
            port: 3000,
            proxy: {
                '/api': env.GOOGLE_CHATAPI_PROXY_TARGET
            }
        },
        build: {
            minify: 'oxc',
            reportCompressedSize: false,
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                },
                output: {
                    manualChunks: manualChunks,
                }
            }
        },
        envPrefix: ['VITE_', 'GOOGLE_'],
    }
});