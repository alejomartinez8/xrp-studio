/**
 * Version and Change Log logic of the automatic releases. Pure functions only (no git, no
 * network), so they are unit tested; `release.mjs` feeds them with the real history.
 */

/** Types that make a release, with the bump each one asks for. */
export const RELEASE_BUMPS = { feat: 'minor', fix: 'patch', perf: 'patch', style: 'patch' };

/** Types that never make a release on their own. */
export const SILENT_TYPES = ['docs', 'test', 'chore', 'refactor', 'ci', 'build', 'revert'];

/** Types whose PR must carry Change Log lines. */
export const LINES_REQUIRED_TYPES = ['feat', 'fix'];

/** Spanish headings for the themes used in the Change Log. */
export const THEME_ES = {
    Look: 'Aspecto',
    Editor: 'Editor',
    Projects: 'Proyectos',
    Panels: 'Paneles',
    Accounts: 'Cuentas',
    Robot: 'Robot',
    Languages: 'Idiomas',
    'Phones and tablets': 'Teléfonos y tablets',
    'Under the hood': 'Por dentro',
};

const TITLE_RE = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;

/**
 * Parses a Conventional Commits style title.
 * @param {string} title
 * @returns {{type: string, scope: string, breaking: boolean, text: string} | null}
 */
export function parseTitle(title) {
    const m = TITLE_RE.exec(title.trim());
    if (!m) return null;
    return {
        type: m[1].toLowerCase(),
        scope: m[2] ?? '',
        breaking: m[3] === '!',
        text: m[4].trim(),
    };
}

/**
 * Reads the Change Log lines of a PR body: `Change Log (en): ...`, `Change Log (es): ...` and
 * the optional `Change Log (theme): ...` (English theme name). Bullets and bold marks around the
 * label are tolerated.
 * @param {string} body
 * @returns {{en: string[], es: string[], theme: string}}
 */
export function parseChangeLogLines(body) {
    const out = { en: [], es: [], theme: '' };
    const re = /^[\s>*_-]*Change Log\s*\((en|es|theme)\)\s*:[*_\s]*(.+?)\s*$/i;
    for (const line of (body ?? '').split(/\r?\n/)) {
        const m = re.exec(line);
        if (!m) continue;
        const key = m[1].toLowerCase();
        const value = m[2].replace(/<!--.*?-->/g, '').trim();
        if (!value) continue;
        if (key === 'theme') out.theme = value;
        else out[key].push(value);
    }
    return out;
}

/**
 * Checks a PR title and body. Returns the problems as messages (empty when fine).
 * @param {string} title
 * @param {string} body
 * @returns {string[]}
 */
export function checkPr(title, body) {
    const parsed = parseTitle(title);
    const known = [...Object.keys(RELEASE_BUMPS), ...SILENT_TYPES];
    if (!parsed || !known.includes(parsed.type)) {
        return [
            `The PR title must start with a type: ${known.join(', ')} (for example "fix: Blocks show the right colour"). Add "!" after the type for a breaking change.`,
        ];
    }
    const problems = [];
    const breaking = parsed.breaking || /^BREAKING[ -]CHANGE/m.test(body ?? '');
    if (LINES_REQUIRED_TYPES.includes(parsed.type) || breaking) {
        const lines = parseChangeLogLines(body);
        if (!lines.en.length || !lines.es.length) {
            problems.push(
                'A feat/fix PR needs one line for kids and teachers in both languages in the description:\n  Change Log (en): ...\n  Change Log (es): ...\n  Change Log (theme): Editor   (optional, a heading such as Look, Editor, Projects)',
            );
        } else if (lines.en.length !== lines.es.length) {
            problems.push(
                'Use the same number of "Change Log (en)" and "Change Log (es)" lines, in the same order.',
            );
        }
    }
    return problems;
}

/**
 * Splits a version string.
 * @param {string} v
 * @returns {[number, number, number]}
 */
export function parseVersion(v) {
    const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
    if (!m) throw new Error(`Not a version: ${v}`);
    return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Bump asked by one PR, or null when it makes no release. While the major version is 0 a
 * breaking change asks for a minor bump: the move to 1.0.0 is decided by hand.
 * @param {{title: string, body?: string}} pr
 * @param {number} major current major version
 * @returns {'major' | 'minor' | 'patch' | null}
 */
export function bumpFor(pr, major) {
    const parsed = parseTitle(pr.title);
    if (!parsed) return null;
    const breaking = parsed.breaking || /^BREAKING[ -]CHANGE/m.test(pr.body ?? '');
    if (breaking && !SILENT_TYPES.includes(parsed.type)) return major === 0 ? 'minor' : 'major';
    return RELEASE_BUMPS[parsed.type] ?? null;
}

const ORDER = { patch: 1, minor: 2, major: 3 };

/**
 * Next version from the current one and the merged PRs, or null when nothing releases.
 * @param {string} current
 * @param {{title: string, body?: string}[]} prs
 * @returns {{version: string, bump: 'major' | 'minor' | 'patch', releasing: {title: string, body?: string}[]} | null}
 */
export function nextRelease(current, prs) {
    const [major, minor, patch] = parseVersion(current);
    let bump = null;
    const releasing = [];
    for (const pr of prs) {
        const b = bumpFor(pr, major);
        if (!b) continue;
        releasing.push(pr);
        if (!bump || ORDER[b] > ORDER[bump]) bump = b;
    }
    if (!bump) return null;
    const version =
        bump === 'major'
            ? `${major + 1}.0.0`
            : bump === 'minor'
              ? `${major}.${minor + 1}.0`
              : `${major}.${minor}.${patch + 1}`;
    return { version, bump, releasing };
}

/**
 * Entries of a release: the Change Log lines of each PR, or its title when it has none (marked).
 * @param {{number?: number, title: string, body?: string}[]} prs
 * @returns {{theme: string, en: string, es: string}[]}
 */
export function collectEntries(prs) {
    const entries = [];
    for (const pr of prs) {
        const lines = parseChangeLogLines(pr.body);
        if (lines.en.length) {
            lines.en.forEach((en, i) =>
                entries.push({ theme: lines.theme, en, es: lines.es[i] ?? en }),
            );
            continue;
        }
        const text = parseTitle(pr.title)?.text ?? pr.title;
        const label = `${text[0].toUpperCase()}${text.slice(1)}`;
        const mark = pr.number ? `PR #${pr.number} has no Change Log line` : 'No Change Log line';
        entries.push({ theme: '', en: `${label} (${mark})`, es: `${label} (${mark})` });
    }
    return entries;
}

/**
 * Markdown section of one version for one language. Patches are short bullet lists; larger
 * releases group the bullets under their theme headings, as the existing entries do.
 * @param {string} version
 * @param {'en' | 'es'} lang
 * @param {{theme: string, en: string, es: string}[]} entries
 * @param {'major' | 'minor' | 'patch'} bump
 * @returns {string}
 */
export function renderSection(version, lang, entries, bump) {
    const lines = [`## ${lang === 'es' ? 'Versión' : 'Version'} ${version}`, ''];
    const loose = entries.filter((e) => bump === 'patch' || !e.theme);
    const themed = bump === 'patch' ? [] : entries.filter((e) => e.theme);
    for (const e of loose) lines.push(`* ${e[lang]}`);
    const themes = [...new Set(themed.map((e) => e.theme))];
    if (loose.length && themes.length) lines.push('');
    for (const theme of themes) {
        const heading = lang === 'es' ? (THEME_ES[theme] ?? theme) : theme;
        lines.push(`### ${heading}`);
        for (const e of themed.filter((x) => x.theme === theme)) lines.push(`* ${e[lang]}`);
    }
    return `${lines.join('\n')}\n`;
}

/**
 * Inserts a version section right after the title of a Change Log file, keeping the older
 * entries untouched. Refuses to add a version that is already there.
 * @param {string} markdown
 * @param {string} section
 * @param {string} version
 * @returns {string}
 */
export function insertSection(markdown, section, version) {
    if (
        new RegExp(`^## (Version|Versión) ${version.replace(/\./g, '\\.')}\\s*$`, 'm').test(
            markdown,
        )
    ) {
        throw new Error(`The Change Log already has version ${version}`);
    }
    const m = /^# .*\n+/.exec(markdown);
    const head = m ? m[0] : '';
    return `${head}${section}\n${markdown.slice(head.length)}`;
}

/**
 * Replaces the version in package.json and package-lock.json text without reformatting them.
 * @param {string} packageJson
 * @param {string} lock
 * @param {string} version
 * @returns {{packageJson: string, lock: string}}
 */
export function bumpManifests(packageJson, lock, version) {
    const replaceFirst = (text, re) => {
        if (!re.test(text)) throw new Error('Version field not found');
        return text.replace(re, `$1${version}"`);
    };
    return {
        packageJson: replaceFirst(packageJson, /("version":\s*")[^"]*"/),
        lock: replaceFirst(
            replaceFirst(lock, /("version":\s*")[^"]*"/),
            /("packages":\s*\{\s*"":\s*\{[^}]*?"version":\s*")[^"]*"/,
        ),
    };
}

/**
 * Pull request number in a commit subject: "Title (#12)" or "Merge pull request #12 from ...".
 * @param {string} subject
 * @returns {number | null}
 */
export function prNumberOf(subject) {
    const m = /\(#(\d+)\)\s*$/.exec(subject) ?? /^Merge pull request #(\d+)/.exec(subject);
    return m ? Number(m[1]) : null;
}
