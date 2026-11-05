/** Type declaration for the Tailwind plugin that ships without types. */
declare module 'tailwindcss-debug-screens' {
    import type { PluginCreator } from 'tailwindcss/types/config';
    const plugin: { handler: PluginCreator };
    export default plugin;
}
