// IndexNow submitter for controlsfreak.dev.
//
// Notifies the IndexNow consortium (Bing, Yandex, Seznam, Naver, Yep —
// NOT Google, which doesn't participate) that pages changed, so they
// recrawl sooner than a scheduled crawl would. Additive to the sitemap;
// never a replacement.
//
// Run modes:
//   node .github/scripts/indexnow.mjs            changed pages since last commit
//   node .github/scripts/indexnow.mjs --all      every indexable page (full submit)
//   node .github/scripts/indexnow.mjs --dry-run  compute + print URLs, don't POST
//   (--all and --dry-run combine)
//
// In CI (.github/workflows/indexnow.yml) GITHUB_EVENT_BEFORE / GITHUB_SHA
// scope "changed" to exactly the push's diff. Outside CI those are unset,
// so it falls back to HEAD~1..HEAD.
//
// The set of submittable URLs is derived the same way the sitemap is: a
// page is indexable iff it carries a `canonical:` frontmatter line. That
// auto-excludes the noindex pages (styleguide.html, 404.html) without a
// separate check, and keeps this in lockstep with sitemap.njk.

'use strict';

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Public ownership token — NOT a secret. Must match the filename of the
// key file served at the site root: html/<KEY>.txt (passthrough-copied
// in .eleventy.js). Rotating the key means changing both in one commit.
const HOST = 'controlsfreak.dev';
const KEY = '5ceefff6b33f4eb68bbcad4e54ce30b1';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML_DIR = path.join(ROOT, 'html');
const ZERO_SHA = /^0+$/;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let submitAll = args.includes('--all');

// Every .html file under html/, recursively (skips _includes partials by
// extension — they're .njk).
function allHtmlFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...allHtmlFiles(full));
        } else if (entry.name.endsWith('.html')) {
            out.push(full);
        }
    }
    return out;
}

// Files changed between two refs, scoped to html/. Throws on a bad ref.
// --no-renames decomposes a rename into delete+add: rename detection
// (on by default) reports only the NEW path, and the old URL — the one
// engines must recrawl-and-drop — would never surface (audit-2026-06
// #37; verified against the real /tools→/simulators move, which git
// otherwise collapses to three renames).
function changedHtmlFiles(before, after) {
    const out = execFileSync(
        'git',
        ['diff', '--name-only', '--no-renames', before, after, '--', 'html'],
        { cwd: ROOT, encoding: 'utf8' }
    ).trim();
    if (!out) return [];
    return out.split('\n')
        .filter((p) => p.endsWith('.html'))
        .map((p) => path.join(ROOT, p));
}

// The page's canonical URL, or null if it has none (noindex / non-page).
// A file deleted (or renamed away — git reports a rename as delete+add)
// no longer exists on disk, but IndexNow explicitly supports submitting
// removed URLs so engines recrawl-and-drop them — read the old
// frontmatter from the diff base instead of silently skipping it
// (audit-2026-06 #37; this repo demonstrably renames pages — see
// LEGACY_TOOL_REDIRECTS).
function canonicalOf(file, beforeRef) {
    let src;
    if (existsSync(file)) {
        src = readFileSync(file, 'utf8');
    } else if (beforeRef) {
        try {
            src = execFileSync(
                'git', ['show', `${beforeRef}:${path.relative(ROOT, file)}`],
                { cwd: ROOT, encoding: 'utf8' }
            );
        } catch {
            return null;   // not in the diff base either — nothing to tell engines
        }
    } else {
        return null;
    }
    const m = src.match(/^canonical:\s*(\S+)/m);
    // Strip the trailing .html to match sitemap.njk's <loc> and head.njk's
    // rendered canonical, both of which run the value through the
    // `cleanCanonical` filter (.eleventy.js). Frontmatter keeps .html as the
    // single source of truth, but the crawl-facing URL is the clean 200 form.
    // Submitting the .html form told Bing/Yandex to crawl a URL that 30x's to
    // clean, so they indexed BOTH as identical pages (Bing Webmaster
    // "identical titles", 2026-07). Keep this regex in lockstep with
    // cleanCanonical.
    return m ? m[1].replace(/\.html$/, "") : null;
}

// Resolve the file set for changed-mode, falling back to a full submit
// when there's no usable diff base (first push, force-push, shallow
// clone, or running outside a git range).
let diffBase = null;   // set in changed-mode; canonicalOf reads deleted files from it
function resolveChangedFiles() {
    const before = process.env.GITHUB_EVENT_BEFORE || 'HEAD~1';
    const after = process.env.GITHUB_SHA || 'HEAD';
    if (ZERO_SHA.test(before)) {
        console.log('No diff base (zero SHA) — falling back to a full submit.');
        submitAll = true;
        return null;
    }
    try {
        const changed = changedHtmlFiles(before, after);
        diffBase = before;
        return changed;
    } catch {
        console.log(`Could not diff ${before}..${after} — falling back to a full submit.`);
        submitAll = true;
        return null;
    }
}

let files;
if (!submitAll) {
    files = resolveChangedFiles();
}
if (submitAll || files === null) {
    files = allHtmlFiles(HTML_DIR);
}

const urlList = [...new Set(files.map((f) => canonicalOf(f, diffBase)).filter(Boolean))].sort();

console.log(`Mode: ${submitAll ? 'all' : 'changed'}${dryRun ? ' (dry-run)' : ''}`);
console.log(`${urlList.length} indexable URL(s):`);
for (const u of urlList) console.log(`  ${u}`);

if (urlList.length === 0) {
    console.log('Nothing to submit — no indexable page changed. Done.');
    process.exit(0);
}

const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };

if (dryRun) {
    console.log('\n--dry-run: would POST the following body, skipping the request:');
    console.log(JSON.stringify(body, null, 2));
    process.exit(0);
}

const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
});

const text = await res.text().catch(() => '');
// IndexNow: 200 OK / 202 Accepted both mean the submission was taken.
if (res.status === 200 || res.status === 202) {
    console.log(`IndexNow accepted ${urlList.length} URL(s) — HTTP ${res.status}.`);
    process.exit(0);
}
console.error(`IndexNow rejected the submission — HTTP ${res.status}. ${text}`);
process.exit(1);
