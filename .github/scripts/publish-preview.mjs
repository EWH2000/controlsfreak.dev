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
//   a _built.txt timestamp at its root (readable at
//   https://cfdev.home.arpa/_built.txt) so you can tell at a glance which build
//   is live.
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
        log(`replacing build from ${readFileSync(join(DEST, MARKER), 'utf8').trim()}`);
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
writeFileSync(join(DEST, MARKER), `${stamp}\n`);

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
log(`${MARKER}: ${stamp}`);
log(`live at ${LIVE_URL}  (also ${LIVE_URL}${MARKER})`);
log('SNAPSHOT, not a server — republish after every build you want to see.');
log('hub → Advanced tab → "Controls Freak (site)".');
