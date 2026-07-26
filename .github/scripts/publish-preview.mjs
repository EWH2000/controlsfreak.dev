// publish-preview.mjs — copy the built site to the home hub so it shows up
// behind the dashboard's "Controls Freak (site)" tile (Advanced tab) at
// https://cfdev.home.arpa/ — i.e. any device on the LAN can browse the current
// build with no dev server running and no laptop awake.
//
// WHAT THIS IS
//   A SNAPSHOT PUBLISHER, NOT A SERVER. It copies _site as it exists right now
//   into the hub's docroot. Nothing watches, nothing rebuilds. Every build you
//   want to see on cfdev.home.arpa needs another `npm run publish:preview`.
//   This is a home dev convenience — the real site is on Cloudflare.
//
// HOW IT WORKS
//   The hub (Caddy, ~/caddy) serves ~/caddy/dashboard/cfdev/ as a static site
//   at https://cfdev.home.arpa/. We rsync -a --delete _site/ into it, then drop
//   a _built.txt stamp at its root (readable at
//   https://cfdev.home.arpa/_built.txt) so you can tell at a glance which build
//   is live. The stamp carries the publish time AND git provenance — commit,
//   ref, whether the tree was dirty, and drift against origin/main:
//
//       built:   2026-07-26T02:52:39.152Z
//       commit:  3f330a4
//       ref:     (detached)
//       tree:    clean
//       origin:  even with origin/main
//       source:  rebuilt from this tree in this run (--build)
//
//   The timestamp alone can't distinguish "stale, republish it" from "built off
//   an unmerged branch, so it shows work that is nowhere else" — different
//   problems, different fixes. Nothing parses this file; it's for a human with
//   curl, so it stays keyed plain text rather than JSON.
//
//   SELINUX — WHY PLAIN `-a` AND NOTHING FANCIER. ~/caddy/dashboard is labeled
//   container_file_t, and files created underneath it inherit that label
//   automatically, so the rootless Caddy container reads them with no chcon and
//   no restart — BUT ONLY IF THE COPY CARRIES NO SECURITY XATTRS. rsync -a is
//   -rlptgoD: no xattrs, so it's safe. `cp -a`, `cp --preserve=context`,
//   `install -Z`, `tar --xattrs --selinux`, or any of those under sudo DO copy
//   the source label, and the container then answers a bare 403 on every file
//   — not the styled 404, because handle_errors is scoped to 404, which makes
//   it look like a Caddy config bug instead of a labeling one. Repair is
//   `systemctl --user restart caddy` (podman re-applies its :Z relabel
//   recursively on start). Note `rsync -aX` as a normal user silently skips
//   security.* xattrs, so -X is not actually the trigger here — `cp -a` is.
//   Still: don't reach for anything beyond plain -a.
//
//   THE DESTINATION GUARD IS THE POINT. `rsync -a --delete` aimed one path
//   component short — at ~/caddy/dashboard instead of ~/caddy/dashboard/cfdev —
//   would erase the hub's index.html, its self-hosted fonts, and the published
//   Android APK. ~/caddy IS NOT A GIT REPO. There is no undo. So the resolved
//   destination is asserted to end with /caddy/dashboard/cfdev before --delete
//   is allowed anywhere near it, the source tree is sanity-checked so a
//   half-deleted _site can't --delete the live preview into nothing, and a
//   non-empty destination without a _built.txt marker is refused as
//   "not ours".
//
// CONFIG
//   CF_PREVIEW_DIR  dir to publish into (default ../caddy/dashboard/cfdev)
//   --build         rm -rf _site and rebuild BEFORE publishing (opt-in)
//
//   --build IS OPT-IN ON PURPOSE. 11ty never cleans its output dir, so a page
//   deleted from html/ survives in _site and gets published — and `rsync
//   --delete` can't remove it, because the orphan IS present in the source.
//   Only a clean rebuild drops it. But `rm -rf _site` also yanks the tree out
//   from under anything else using it: a concurrent agent session, `npm test`'s
//   Playwright webServer block, or an ad-hoc `python3 -m http.server
//   --directory _site`. So it's asked for, never assumed.
//
// USAGE
//   npm run build && npm run publish:preview   # publish what's there
//   npm run publish:preview -- --build         # clean rebuild, then publish
//   CF_PREVIEW_DIR=/tmp/scratch npm run publish:preview

'use strict';

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, '_site');
const DEST = resolve(ROOT, process.env.CF_PREVIEW_DIR || '../caddy/dashboard/cfdev');

const DEST_SUFFIX = '/caddy/dashboard/cfdev';
const MARKER = '_built.txt';
const LIVE_URL = 'https://cfdev.home.arpa/';
const MIN_HTML = 100;
const REQUIRED = ['index.html', '404.html', 'styles.css'];

const build = process.argv.includes('--build');

function log(msg) {
    console.log(`[publish-preview] ${msg}`);
}

function die(...lines) {
    for (const line of lines) console.error(`[publish-preview] ${line}`);
    process.exit(1);
}

// --- git provenance for the stamp --------------------------------------------
// A timestamp alone answers "how old is this?" but not "is this what's on
// main?" — and those are different questions with different fixes. A stale
// preview needs a republish; a preview built off an unmerged branch or a dirty
// tree is showing work that exists nowhere else, and reading it as the site is
// how you end up reviewing a change that never shipped.
//
// BEST-EFFORT BY CONSTRUCTION. Every git call is wrapped: a publish must never
// fail because git is missing, the tree isn't a checkout, or origin/main isn't
// fetched. Unknowns are reported as unknown, never guessed.
//
// --no-optional-locks because other agent sessions share this repo — a plain
// `git status` takes the index lock to refresh it, and this is a read.
function git(...args) {
    const r = spawnSync('git', ['--no-optional-locks', ...args], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr || `git ${args[0]} exited ${r.status}`);
    return r.stdout.trim();
}

function gitProvenance() {
    let head;
    try {
        head = git('rev-parse', '--short', 'HEAD');
    } catch {
        return ['commit:  unknown — not a git checkout, or git unavailable'];
    }
    const lines = [`commit:  ${head}`];

    // --abbrev-ref prints the literal "HEAD" on a detached checkout, which is
    // the normal state for the throwaway worktrees these publishes run from.
    try {
        const ref = git('rev-parse', '--abbrev-ref', 'HEAD');
        lines.push(`ref:     ${ref === 'HEAD' ? '(detached)' : ref}`);
    } catch { /* leave it off rather than assert a branch */ }

    // Modified and untracked counted SEPARATELY, not summed. Untracked files
    // matter — an untracked page is in the build and in no commit — but a tree
    // that always says DIRTY because of routine scratch files teaches you to
    // ignore the line, and then it signals nothing.
    try {
        const st = git('status', '--porcelain').split('\n').filter(Boolean);
        const untracked = st.filter((l) => l.startsWith('??')).length;
        const modified = st.length - untracked;
        const parts = [modified && `${modified} modified`, untracked && `${untracked} untracked`].filter(Boolean);
        lines.push(`tree:    ${parts.length ? `DIRTY — ${parts.join(', ')}` : 'clean'}`);
    } catch { /* ditto */ }

    // `--left-right --count A...B` prints "<left> <right>": commits reachable
    // from A but not B, then B but not A. With origin/main on the left that is
    // behind-then-ahead, in that order.
    try {
        const [behind, ahead] = git('rev-list', '--left-right', '--count', 'origin/main...HEAD')
            .split(/\s+/).map(Number);
        const drift = [ahead && `ahead ${ahead}`, behind && `behind ${behind}`].filter(Boolean).join(', ');
        lines.push(`origin:  ${drift ? `${drift} of origin/main` : 'even with origin/main'}`);
    } catch {
        lines.push('origin:  unknown — no origin/main ref (fetch it to compare)');
    }
    return lines;
}

// Every file under dir, recursively. Used for the source sanity guard and the
// final count — small enough tree (a few hundred files) that this is cheap.
function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (entry.isFile()) out.push(full);
    }
    return out;
}

// --- destination guard: run FIRST, before anything can rm or --delete --------
// One path component short and --delete eats the whole hub. Non-negotiable,
// and it applies to CF_PREVIEW_DIR too — point a test run at a scratch tree
// ending in the same three components (e.g. /tmp/xyz/caddy/dashboard/cfdev).
if (!DEST.endsWith(DEST_SUFFIX)) {
    die(
        `refusing to publish: destination must end with ${DEST_SUFFIX}`,
        `resolved: ${DEST}`,
        'rsync --delete into the wrong dir would erase the hub page, its fonts',
        'and the published APK — and ~/caddy is not a git repo, so there is no undo',
    );
}
if (DEST !== resolve(ROOT, '../caddy/dashboard/cfdev')) log(`non-default destination: ${DEST}`);

// Captured BEFORE the build, so `commit:` names the tree eleventy is about to
// read. Without --build it can only describe the checkout as it stands now,
// which the `source:` line in the stamp says out loud.
const provenance = gitProvenance();

// --- optional clean rebuild --------------------------------------------------
if (build) {
    log('--build: removing _site for a clean rebuild');
    log('  (nothing else may be using this tree — no npm test, no http.server)');
    rmSync(SRC, { recursive: true, force: true });
    const built = spawnSync('npx', ['eleventy'], { cwd: ROOT, stdio: 'inherit' });
    if (built.status !== 0) die('eleventy build failed — nothing published');
}

// --- source sanity guard -----------------------------------------------------
if (!existsSync(SRC)) {
    die(`no build to publish: ${SRC} does not exist`, 'run `npm run build` first, or pass --build');
}
for (const name of REQUIRED) {
    const file = join(SRC, name);
    if (!existsSync(file) || statSync(file).size === 0) {
        die(
            `refusing to publish: _site/${name} is missing or empty`,
            'the build looks incomplete or half-deleted — publishing it would',
            `--delete the live preview at ${LIVE_URL} into the same state`,
            'run `npm run build` and try again',
        );
    }
}
const srcFiles = walk(SRC);
const srcHtml = srcFiles.filter((f) => f.endsWith('.html')).length;
if (srcHtml < MIN_HTML) {
    die(
        `refusing to publish: only ${srcHtml} .html files in _site (expected ≥ ${MIN_HTML})`,
        'a partial build would --delete most of the live preview',
        'run `npm run build` and try again',
    );
}

// --- ownership guard ---------------------------------------------------------
// Checking for index.html would NOT catch ~/caddy/dashboard — the hub page has
// one. _built.txt is written only by this script, so it's the real marker.
if (existsSync(DEST)) {
    if (!statSync(DEST).isDirectory()) die(`refusing to publish: ${DEST} is not a directory`);
    const existing = readdirSync(DEST);
    if (existing.length > 0 && !existing.includes(MARKER)) {
        die(
            `refusing to publish: ${DEST} is non-empty but has no ${MARKER}`,
            'this script only overwrites directories it published itself',
            `if that dir really is the preview docroot, seed it: touch ${join(DEST, MARKER)}`,
        );
    }
    if (existing.includes(MARKER)) {
        // First line only — the stamp is multi-line now (timestamp + git
        // provenance), and this is a one-line "what am I about to replace".
        // An empty marker is a reachable state, not a bug: the ownership
        // guard's own advice for adopting a docroot is `touch _built.txt`.
        const [was] = readFileSync(join(DEST, MARKER), 'utf8').trim().split('\n');
        log(`replacing build from ${was.replace(/^built:\s*/, '') || '(unstamped)'}`);
    }
} else {
    mkdirSync(DEST, { recursive: true });
}

// --- the copy ----------------------------------------------------------------
// Plain -a only (= -rlptgoD, no xattrs) — see the SELinux note in the header.
log(`rsync -a --delete ${SRC}/ -> ${DEST}/`);
const sync = spawnSync('rsync', ['-a', '--delete', `${SRC}/`, `${DEST}/`], { stdio: 'inherit' });
if (sync.error) die(`rsync failed to start: ${sync.error.message}`, 'is rsync installed?');
if (sync.status !== 0) die(`rsync exited ${sync.status} — the destination may be half-written`);

const stamp = new Date().toISOString();
const stampBody = [
    `built:   ${stamp}`,
    ...provenance,
    build
        ? 'source:  rebuilt from this tree in this run (--build)'
        : 'source:  existing _site, reused as found — `commit:` describes the checkout, not necessarily these bytes',
].join('\n') + '\n';
writeFileSync(join(DEST, MARKER), stampBody);

// --- post-check: SELinux label ----------------------------------------------
// Warn only. Match container_file_t generically — the MCS categories
// (:c409,c863 etc.) rotate on every container start, when podman relabels the
// whole tree to match. Hardcoding them would false-alarm after any restart.
const lsZ = spawnSync('ls', ['-dZ', DEST], { encoding: 'utf8' });
if (lsZ.status === 0) {
    const label = lsZ.stdout.trim();
    if (/container_file_t:s0(:c\d+(,c\d+)*)?/.test(label)) {
        log(`selinux ok: ${label.split(/\s+/)[0]}`);
    } else {
        log(`WARNING: destination is not container_file_t — Caddy will 403 every file`);
        log(`  ${label}`);
        log('  fix: systemctl --user restart caddy   (podman re-applies its :Z relabel)');
    }
}

// --- report ------------------------------------------------------------------
const published = walk(DEST);
const bytes = published.reduce((sum, f) => sum + statSync(f).size, 0);
log(`published ${published.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
for (const line of stampBody.trimEnd().split('\n')) log(`${MARKER}  ${line}`);
log(`live at ${LIVE_URL}  (also ${LIVE_URL}${MARKER})`);
log('SNAPSHOT, not a server — republish after every build you want to see.');
log('hub → Advanced tab → "Controls Freak (site)".');
