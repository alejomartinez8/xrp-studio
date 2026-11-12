/**
 * Version of XRP Studio. The values are injected at build time from
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

/** Version number of a Change Log section heading (`## Version 0.3.0` or `## Versión 0.3.0`). */
function sectionVersion(section: string): number[] | null {
    const m = /^## (?:Version|Versión) (\d+)\.(\d+)\.(\d+)/.exec(section);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * Change Log in a language that may lack some versions: the sections the fallback (English) has
 * and the primary file does not are added in version order, so a new release shows up in every
 * language before its translation is written. The primary text is kept untouched.
 */
export function mergeChangelog(primary: string, fallback: string): string {
    const split = (text: string) => {
        const parts = text.split(/^(?=## )/m);
        const head = parts[0].startsWith('## ') ? '' : (parts.shift() ?? '');
        return { head, sections: parts };
    };
    const main = split(primary);
    const extra = split(fallback);
    const has = new Set(main.sections.map((s) => sectionVersion(s)?.join('.')));
    const missing = extra.sections.filter((s) => {
        const v = sectionVersion(s);
        return v && !has.has(v.join('.'));
    });
    if (!missing.length) return primary;
    const all = [...main.sections, ...missing].map((s) =>
        s.endsWith('\n\n') ? s : `${s.trimEnd()}\n\n`,
    );
    const key = (s: string) => sectionVersion(s) ?? [0, 0, 0];
    all.sort((a, b) => {
        const [x, y] = [key(a), key(b)];
        return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
    return `${main.head}${all.join('').trimEnd()}\n`;
}
