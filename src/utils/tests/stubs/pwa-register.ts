/**
 * Test stand-in for vite-plugin-pwa's `virtual:pwa-register`, which only exists when the plugin
 * runs (builds and the dev server). Tests pass their own register function to `startPwa`.
 */
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
    return () => Promise.resolve();
}
