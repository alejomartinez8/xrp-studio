/**
 * Automatic releases. Commands:
 *
 *   node scripts/release.mjs check          checks PR_TITLE and PR_BODY (pull request check)
 *   node scripts/release.mjs plan           prints the next version and the Change Log entries
 *                                           for the commits since the last tag (dry run)
 *   node scripts/release.mjs apply          same, and writes package.json, package-lock.json,
 *                                           the English Change Log and release-notes.md
 *
 * `plan` and `apply` read the merged PRs with `gh api` (GH_TOKEN, GITHUB_REPOSITORY); with
 * `--offline` they use the commit subjects only. The decisions live in `release-lib.mjs`.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import {
    bumpManifests,
    checkPr,
    collectEntries,
    insertSection,
    nextRelease,
    prNumberOf,
    renderSection,
} from './release-lib.mjs';

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

/** Last release tag reachable from HEAD, or empty when there is none. */
function lastTag() {
    try {
        return run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*']);
    } catch {
        return '';
    }
}

/** Merged PRs (title and body) since the tag, oldest first. */
function mergedPrs(tag, offline) {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const log = run('git', ['log', range, '--first-parent', '--reverse', '--format=%s']);
    const repo = process.env.GITHUB_REPOSITORY;
    const prs = [];
    for (const subject of log.split('\n').filter(Boolean)) {
        if (subject.startsWith('chore(release):')) continue;
        const number = prNumberOf(subject);
        if (number && !offline && repo) {
            const pr = JSON.parse(run('gh', ['api', `repos/${repo}/pulls/${number}`]));
            prs.push({ number, title: pr.title, body: pr.body ?? '' });
        } else {
            prs.push({ number: number ?? undefined, title: subject, body: '' });
        }
    }
    return prs;
}

/** Writes outputs for the workflow when running in GitHub Actions. */
function setOutput(name, value) {
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

const [command, ...flags] = process.argv.slice(2);

if (command === 'check') {
    const problems = checkPr(process.env.PR_TITLE ?? '', process.env.PR_BODY ?? '');
    if (problems.length) {
        console.error(problems.join('\n\n'));
        process.exit(1);
    }
    console.log('The PR title and Change Log lines are fine.');
} else if (command === 'plan' || command === 'apply') {
    const tag = lastTag();
    const pkg = readFileSync('package.json', 'utf8');
    const current = JSON.parse(pkg).version;
    if (tag && tag !== `v${current}`) {
        console.error(`Last tag ${tag} does not match package.json ${current}; fix it by hand.`);
        process.exit(1);
    }
    const prs = mergedPrs(tag, flags.includes('--offline'));
    const release = nextRelease(current, prs);
    if (!release) {
        console.log(`No release: ${prs.length} change(s) since ${tag || 'the start'} need none.`);
        setOutput('released', 'false');
    } else {
        const entries = collectEntries(release.releasing);
        const en = renderSection(release.version, entries, release.bump);
        console.log(
            `Release ${release.version} (${release.bump}) from ${release.releasing.length} PR(s):\n`,
        );
        console.log(en);
        setOutput('released', 'true');
        setOutput('version', release.version);
        if (command === 'apply') {
            const lock = readFileSync('package-lock.json', 'utf8');
            const bumped = bumpManifests(pkg, lock, release.version);
            writeFileSync('package.json', bumped.packageJson);
            writeFileSync('package-lock.json', bumped.lock);
            const file = 'public/changelog/en.md';
            writeFileSync(file, insertSection(readFileSync(file, 'utf8'), en, release.version));
            writeFileSync('release-notes.md', en.replace(/^## .*\n+/, ''));
        }
    }
} else {
    console.error('Usage: release.mjs check | plan [--offline] | apply');
    process.exit(2);
}
