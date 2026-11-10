/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
    readonly VITE_OFFLINE?: string;
}

declare const __APP_VERSION__: string;
declare const __APP_UPSTREAM__: string;
declare const __APP_COMMIT__: string;
declare const __APP_PREVIEW__: boolean;
