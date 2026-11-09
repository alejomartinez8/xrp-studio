import { VitePWA } from 'vite-plugin-pwa';
import type { PluginOption } from 'vite';

/** Header colour of the GitHub theme, used for the title bar and the splash screen. */
const HEADER_COLOR = '#24292f';

/** Largest file the service worker stores: the Python editor chunk is about 13 MB. */
const MAX_CACHED_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Installable app that works offline (spec 018). The service worker stores every file of the
 * build in the background after the first visit (blocks, Python editor, firmware, drivers), so
 * the app opens without internet and can be installed on tablets and computers. Source maps and
 * SCSS sources are left out. A new version waits until the user chooses Reload
 * (`registerType: 'prompt'`); the page registers the worker itself (`src/utils/pwa.ts`).
 * `/api` (Google sign-in) always goes to the network.
 */
export function pwaPlugin(): PluginOption {
    return VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: [],
        manifest: {
            name: 'XRP Studio',
            short_name: 'XRP Studio',
            description: 'Program the XRP robot with blocks or Python, online or offline.',
            start_url: './',
            scope: './',
            display: 'fullscreen',
            background_color: HEADER_COLOR,
            theme_color: HEADER_COLOR,
            icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                {
                    src: 'icons/maskable-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                },
            ],
        },
        workbox: {
            globPatterns: ['**/*'],
            globIgnores: ['**/*.map', '**/*.scss', 'sw.js', 'workbox-*.js'],
            maximumFileSizeToCacheInBytes: MAX_CACHED_FILE_BYTES,
            navigateFallback: 'index.html',
            navigateFallbackDenylist: [/^\/api\//],
            cleanupOutdatedCaches: true,
        },
    });
}
