/**
 * Version of XRP Studio (spec 006, part 6). The values are injected at build time from
 * package.json and the host; `formatVersion` builds the text shown in the status bar.
 */

/** Text such as `0.1.0 · a1b2c3d`, with `· preview` for non-production builds; the commit is optional. */
export function formatVersion(version: string, commit: string, preview: boolean): string {
    return [version, commit, preview ? 'preview' : ''].filter(Boolean).join(' · ');
}

/** Version text of the running app. */
export const APP_VERSION_TEXT = formatVersion(__APP_VERSION__, __APP_COMMIT__, __APP_PREVIEW__);

/** Version of XRPWeb this fork is based on (empty when unknown). */
export const APP_UPSTREAM_VERSION = __APP_UPSTREAM__;

/** Change Log file for a language: the fork's own file, English when the language has none. */
export function changelogUrl(language: string): string {
    return `changelog/${language.startsWith('es') ? 'es' : 'en'}.md`;
}
