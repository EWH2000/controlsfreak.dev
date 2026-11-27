// build-board.mjs — render docs/board.md as one static page on the home hub,
// at https://command.home.arpa/cfboard/ (hub tile "Controls Freak (board)",
// Advanced tab). The board is the owner's one-screen answer to "where are we":
// the five items for the week, what is waiting on him, what shipped.
//
//   npm run board                 # render and publish to the hub
//   npm run board -- --dry-run    # run every guard, write nothing
//   npm run board -- --stdout     # print the HTML, write nothing
//
// WHAT THIS IS
//   A SNAPSHOT, like publish-preview.mjs: nothing watches docs/board.md. Run
//   it again after every edit — an unattended run rebuilds it at each phase
//   boundary, which is what makes the page tick while nobody is at the desk.
//   Owner's box only; a dev convenience, never part of the deploy path.
//
// THE SOURCE FORMAT (docs/board.md) — a small, fixed subset of Markdown:
//   # Title                      the week's name
//   **Week:** Nov 27 – Dec 3     header facts, before the first section
//   **Run:** running — text      state is running | idle | done | stopped
//   ## Section                   always visible
//   ### Section                  collapsed behind a disclosure
//   - [x] item / - [ ] item      a checklist ("The five" is drawn from these)
//   - item                       a plain list item; indent to continue a line
//   Inline: **bold**, *em*, `code`, [text](https://… or /path).
//   "Shipped" shows its first five items and folds the rest under "Earlier",
//   so new lines go at the TOP of that list. HTML comments are dropped.
//
// WHAT THE SCRIPT ADDS ITSELF (never typed into board.md, so never stale):
//   the build time, main's commit + version, and the result of the newest
//   `test` run on main. Each is best-effort: no network, no gh, no origin/main
//   → the page says "unknown" rather than failing or guessing.
//
// THE DESTINATION GUARD — same three checks as publish-preview.mjs, for the
//   same reason (~/caddy is not a git repo; there is no undo): the resolved
//   destination must end with /caddy/dashboard/cfboard, sit under the home
//   directory, and its caddy/dashboard parent must already exist. A non-empty
//   destination without this script's stamp.json is refused as "not ours".
//   CF_BOARD_DIR overrides the default and is held to the same checks.
//
// SELINUX — files are written to a temp name INSIDE the destination and
//   renamed into place, so they inherit the directory's container_file_t
//   label and the rootless Caddy can read them with no chcon and no restart.
//   Never cp -a or mv a file in from elsewhere: it carries its old label and
//   Caddy answers a bare 403. (Full story: publish-preview.mjs header.)
//
// CACHING — the hub sends no Cache-Control, so a phone can sit on an old
//   copy. The page embeds its build stamp and polls stamp.json (no-store);
//   when they differ it reloads itself under a fresh query string.

'use strict';

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = join(ROOT, 'docs', 'board.md');
const HOME = resolve(homedir());
const DEFAULT_DEST = join(HOME, 'caddy', 'dashboard', 'cfboard');
const DEST = process.env.CF_BOARD_DIR ? resolve(ROOT, process.env.CF_BOARD_DIR) : DEFAULT_DEST;
const DEST_SUFFIX = '/caddy/dashboard/cfboard';
const MARKER = 'stamp.json';
const LIVE_URL = 'https://command.home.arpa/cfboard/';
const REPO_URL = 'https://github.com/EWH2000/controlsfreak.dev';
const SHIPPED_VISIBLE = 5;

const dryRun = process.argv.includes('--dry-run');
const toStdout = process.argv.includes('--stdout');

function log(msg) {
    console.error(`[board] ${msg}`);
}

function die(...lines) {
    for (const line of lines) console.error(`[board] ${line}`);
    process.exit(1);
}

// --- destination guard: before anything is written ---------------------------
if (!toStdout) {
    if (!DEST.endsWith(DEST_SUFFIX)) {
        die(`refusing to publish: destination must end with ${DEST_SUFFIX}`, `resolved: ${DEST}`);
    }
    const fromHome = relative(HOME, DEST);
    if (!fromHome || fromHome === '..' || fromHome.startsWith(`..${sep}`) || isAbsolute(fromHome)) {
        die(`refusing to publish: destination must be under the home directory (${HOME})`, `resolved: ${DEST}`);
    }
    if (!existsSync(dirname(DEST)) || !statSync(dirname(DEST)).isDirectory()) {
        die(`refusing to publish: ${dirname(DEST)} does not exist`, 'the board lives inside the hub\'s existing dashboard dir');
    }
    if (existsSync(DEST)) {
        if (!statSync(DEST).isDirectory()) die(`refusing to publish: ${DEST} is not a directory`);
        const existing = readdirSync(DEST);
        if (existing.length > 0 && !existing.includes(MARKER)) {
            die(`refusing to publish: ${DEST} is non-empty but has no ${MARKER}`, 'this script only overwrites a directory it published itself');
        }
    }
}

// --- the source ---------------------------------------------------------------
if (!existsSync(SOURCE)) die(`no board to render: ${SOURCE} does not exist`);

function parse(md) {
    const board = { title: 'The board', meta: {}, sections: [] };
    let cur = null;
    for (const raw of md.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
        const line = raw.trimEnd();
        let m;
        if ((m = /^# (.+)$/.exec(line))) {
            board.title = m[1];
        } else if ((m = /^(##|###) (.+)$/.exec(line))) {
            cur = { title: m[2], folded: m[1] === '###', items: [], paras: [] };
            board.sections.push(cur);
        } else if (!cur && (m = /^\*\*([A-Za-z ]+):\*\*\s*(.+)$/.exec(line))) {
            board.meta[m[1].toLowerCase()] = m[2];
        } else if (cur && (m = /^- \[([ xX])\] (.+)$/.exec(line))) {
            cur.items.push({ text: m[2], check: true, done: m[1] !== ' ' });
        } else if (cur && (m = /^- (.+)$/.exec(line))) {
            cur.items.push({ text: m[1] });
        } else if (cur && cur.items.length && /^\s{2,}\S/.test(raw)) {
            cur.items[cur.items.length - 1].text += ` ${line.trim()}`;
        } else if (cur && line.trim()) {
            cur.paras.push(line.trim());
        }
    }
    return board;
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Escape first, then re-admit the four inline forms. Links are limited to
// http(s) and root-relative targets, so board.md cannot emit a javascript: URL.
function inline(s) {
    return esc(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

const board = parse(readFileSync(SOURCE, 'utf8'));

// --- facts the script adds itself (all best-effort) --------------------------
function run(cmd, args) {
    const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
    return r.status === 0 ? r.stdout.trim() : null;
}

const mainSha = run('git', ['--no-optional-locks', 'rev-parse', '--short', 'origin/main']);
let version = null;
try {
    version = JSON.parse(run('git', ['--no-optional-locks', 'show', 'origin/main:package.json'])).version;
} catch { /* unknown stays unknown */ }

// The newest `test` run on main: a push run exists for every merge since
// 2026-10-06 (codebase-issues #331).
let mainTest = { state: 'unknown', label: 'main: test result unknown' };
try {
    const [r] = JSON.parse(run('gh', ['run', 'list', '--workflow', 'test.yml', '--branch', 'main', '--event', 'push',
        '--limit', '1', '--json', 'status,conclusion,headSha']));
    if (r && r.status !== 'completed') mainTest = { state: 'pending', label: 'main: tests running' };
    else if (r && r.conclusion === 'success') mainTest = { state: 'ok', label: 'main: tests green' };
    else if (r) mainTest = { state: 'bad', label: `main: tests ${r.conclusion}` };
} catch { /* unknown stays unknown */ }

const built = new Date();
const builtIso = built.toISOString();
const builtText = built.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// --- rendering ------------------------------------------------------------------
const runMatch = /^(running|idle|done|stopped)\s*[—–-]\s*(.+)$/i.exec(board.meta.run || '');
const runState = runMatch ? runMatch[1].toLowerCase() : 'idle';
const runText = runMatch ? runMatch[2] : (board.meta.run || 'No run in progress.');
const RUN_LABEL = { running: 'Running now', idle: 'No run in progress', done: 'Last run finished', stopped: 'Run stopped' };

function list(items, cls = '') {
    return `<ul class="${cls}">${items.map((it) => {
        if (!it.check) return `<li>${inline(it.text)}</li>`;
        return `<li class="${it.done ? 'done' : 'todo'}"><span class="box" aria-hidden="true">${it.done ? '✓' : ''}</span>`
            + `<span><span class="sr">${it.done ? 'Done: ' : 'To do: '}</span>${inline(it.text)}</span></li>`;
    }).join('')}</ul>`;
}

function section(s) {
    const key = s.title.toLowerCase();
    const paras = s.paras.map((p) => `<p>${inline(p)}</p>`).join('');
    let body;
    let aside = '';
    if (key === 'the five') {
        const done = s.items.filter((it) => it.done).length;
        aside = `<span class="count">${done} of ${s.items.length}</span>`;
        const bar = `<div class="bar" aria-hidden="true">${s.items.map((it) => `<i class="${it.done ? 'on' : ''}"></i>`).join('')}</div>`;
        body = bar + list(s.items, 'checks') + paras;
    } else if (key === 'shipped') {
        const head = s.items.slice(0, SHIPPED_VISIBLE);
        const rest = s.items.slice(SHIPPED_VISIBLE);
        body = (head.length ? list(head, 'plain') : '') + paras
            + (rest.length ? `<details><summary>Earlier (${rest.length})</summary>${list(rest, 'plain')}</details>` : '');
    } else {
        body = (s.items.length ? list(s.items, s.items.some((it) => it.check) ? 'checks' : 'plain') : '') + paras;
    }
    if (!s.items.length && !s.paras.length) body = '<p class="empty">Nothing here right now.</p>';
    if (s.folded) return `<details class="card fold"><summary>${esc(s.title)}</summary>${body}</details>`;
    return `<section class="card ${key.replace(/[^a-z]+/g, '-')}"><h2>${esc(s.title)}${aside}</h2>${body}</section>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(board.title)} — Controls Freak board</title>
<style>
    @font-face { font-family: "Bricolage Grotesque"; font-weight: 400 800; font-display: swap; src: url("../fonts/bricolage-grotesque.woff2") format("woff2"); }
    @font-face { font-family: "Hanken Grotesk"; font-weight: 400 700; font-display: swap; src: url("../fonts/hanken-grotesk.woff2") format("woff2"); }
    :root { --bg: #f6f5f2; --surface: #ffffff; --ink: #1b1d21; --muted: #6b7079; --accent: #e0653a; --border: #e7e4dd; --radius: 16px; --ok: #23875a; --bad: #c93b3b; --wait: #b07a12; }
    @media (prefers-color-scheme: dark) {
        :root { --bg: #16181c; --surface: #1f2228; --ink: #ececec; --muted: #9aa0a8; --accent: #ff7a4d; --border: #2b2f36; --ok: #4cc38a; --bad: #ff6b6b; --wait: #e0b04a; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 400 1.02rem/1.5 "Hanken Grotesk", system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
    main { max-width: 41rem; margin: 0 auto; padding: 1.1rem 1.1rem 3rem; }
    a { color: var(--accent); text-underline-offset: 0.15em; }
    a:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
    code { font-size: 0.9em; background: color-mix(in srgb, var(--ink) 8%, transparent); padding: 0.05em 0.3em; border-radius: 5px; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .top { display: flex; justify-content: space-between; align-items: center; font-size: 0.86rem; color: var(--muted); }
    .top a { text-decoration: none; font-weight: 600; padding: 0.5rem 0; }
    .eyebrow { letter-spacing: 0.09em; text-transform: uppercase; font-weight: 600; }
    h1 { font: 700 clamp(1.9rem, 7vw, 2.5rem)/1.1 "Bricolage Grotesque", system-ui, sans-serif; margin: 0.7rem 0 0.15rem; letter-spacing: -0.01em; }
    .week { color: var(--muted); margin: 0 0 0.9rem; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0 0 1rem; padding: 0; list-style: none; font-size: 0.86rem; }
    .chips li { border: 1px solid var(--border); background: var(--surface); border-radius: 999px; padding: 0.22rem 0.7rem; color: var(--muted); }
    .chips .ok { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 45%, var(--border)); font-weight: 600; }
    .chips .bad { color: var(--bad); border-color: var(--bad); font-weight: 700; }
    .chips .pending { color: var(--wait); font-weight: 600; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.1rem; margin: 0 0 0.85rem; }
    .card h2, .fold summary { font: 700 1.12rem/1.2 "Bricolage Grotesque", system-ui, sans-serif; margin: 0 0 0.6rem; display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
    .count { font: 600 0.9rem "Hanken Grotesk", system-ui, sans-serif; color: var(--muted); }
    .run { display: flex; gap: 0.75rem; align-items: flex-start; }
    .run .dot { flex: none; width: 0.7rem; height: 0.7rem; margin-top: 0.42rem; border-radius: 50%; background: var(--muted); }
    .run.running .dot { background: var(--ok); animation: pulse 1.8s ease-in-out infinite; }
    .run.stopped .dot { background: var(--bad); }
    .run strong { display: block; font-size: 0.86rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
    .run .late { color: var(--bad); font-weight: 600; margin: 0.3rem 0 0; }
    @keyframes pulse { 50% { opacity: 0.3; } }
    @media (prefers-reduced-motion: reduce) { .run.running .dot { animation: none; } }
    ul { margin: 0; padding: 0; list-style: none; }
    ul.plain li { padding: 0.5rem 0; border-top: 1px solid var(--border); }
    ul.plain li:first-child { border-top: 0; padding-top: 0; }
    ul.plain li:last-child { padding-bottom: 0; }
    .bar { display: flex; gap: 0.3rem; margin: 0 0 0.8rem; }
    .bar i { flex: 1; height: 0.4rem; border-radius: 999px; background: var(--border); }
    .bar i.on { background: var(--ok); }
    ul.checks li { display: flex; gap: 0.7rem; align-items: flex-start; padding: 0.42rem 0; font-size: 1.08rem; }
    .box { flex: none; width: 1.45rem; height: 1.45rem; margin-top: 0.08rem; border: 2px solid var(--border); border-radius: 7px; display: grid; place-items: center; font-size: 0.95rem; font-weight: 700; color: var(--surface); }
    li.done .box { background: var(--ok); border-color: var(--ok); }
    li.done > span:last-child { color: var(--muted); text-decoration: line-through; text-decoration-thickness: 1.5px; }
    .your-turn { border-left: 5px solid var(--accent); }
    .empty, .card p { color: var(--muted); margin: 0.5rem 0 0; }
    details > summary { cursor: pointer; }
    .fold summary { margin: 0; list-style: none; }
    .fold summary::-webkit-details-marker { display: none; }
    .fold summary::after { content: "+"; color: var(--muted); font-weight: 400; }
    .fold[open] summary::after { content: "–"; }
    .fold[open] summary { margin-bottom: 0.6rem; }
    .card details { margin-top: 0.7rem; }
    .card details summary { color: var(--muted); font-weight: 600; margin-bottom: 0.5rem; }
    footer { color: var(--muted); font-size: 0.82rem; margin-top: 1.4rem; }
</style>
</head>
<body>
<main>
    <div class="top"><a href="/">← Hub</a><span class="eyebrow">Controls Freak</span></div>
    <h1>${esc(board.title)}</h1>
    <p class="week">${inline(board.meta.week || '')}</p>
    <ul class="chips">
        <li class="${mainTest.state}">${esc(mainTest.label)}</li>
        ${version ? `<li>v${esc(version)}</li>` : ''}
        <li>Updated <time id="built" datetime="${builtIso}">${esc(builtText)}</time></li>
    </ul>
    <div class="card run ${runState}" data-state="${runState}">
        <span class="dot" aria-hidden="true"></span>
        <div><strong>${RUN_LABEL[runState]}</strong>${inline(runText)}<p class="late" id="late" hidden></p></div>
    </div>
    ${board.sections.map(section).join('\n    ')}
    <footer>Built ${esc(builtText)}${mainSha ? ` · main at <a href="${REPO_URL}/commit/${esc(mainSha)}">${esc(mainSha)}</a>` : ''} · source <code>docs/board.md</code></footer>
</main>
<script>
(function () {
    'use strict';
    var BUILT = ${JSON.stringify(builtIso)};
    var el = document.getElementById('built');
    var late = document.getElementById('late');
    var running = document.querySelector('.run').dataset.state === 'running';
    function ago() {
        var min = Math.max(0, Math.round((Date.now() - Date.parse(BUILT)) / 60000));
        el.textContent = min < 1 ? 'just now' : min < 60 ? min + ' min ago' : min < 1440 ? Math.round(min / 60) + ' h ago' : Math.round(min / 1440) + ' d ago';
        if (running && min >= 60) {
            late.hidden = false;
            late.textContent = 'No update for ' + (min < 120 ? min + ' min' : Math.round(min / 60) + ' h') + ' — the run may have stopped.';
        }
    }
    function check() {
        fetch('stamp.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
            if (j.built && j.built !== BUILT && new URLSearchParams(location.search).get('b') !== j.built) {
                location.replace(location.pathname + '?b=' + encodeURIComponent(j.built));
            }
        }).catch(function () {});
    }
    ago(); check();
    setInterval(function () { ago(); if (!document.hidden) check(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { ago(); check(); } });
})();
</script>
</body>
</html>
`;

if (toStdout) {
    process.stdout.write(html);
    process.exit(0);
}
if (dryRun) {
    log(`--dry-run: guards passed; would write ${join(DEST, 'index.html')} (${html.length} bytes) and ${MARKER}`);
    process.exit(0);
}

// --- publish: temp file inside DEST, then rename (see the SELinux note) -------
if (!existsSync(DEST)) mkdirSync(DEST);
function put(name, body) {
    const tmp = join(DEST, `.${name}.tmp`);
    writeFileSync(tmp, body);
    renameSync(tmp, join(DEST, name));
}
put('index.html', html);
put(MARKER, `${JSON.stringify({ built: builtIso, main: mainSha, version, run: runState })}\n`);

const lsZ = spawnSync('ls', ['-dZ', join(DEST, 'index.html')], { encoding: 'utf8' });
if (lsZ.status === 0 && !/container_file_t/.test(lsZ.stdout)) {
    log('WARNING: index.html is not labeled container_file_t — Caddy will answer 403');
    log(`  ${lsZ.stdout.trim()}`);
    log('  fix: systemctl --user restart caddy   (podman re-applies its :Z relabel)');
}
log(`published ${LIVE_URL}  (${mainTest.label}; run ${runState}; built ${builtText})`);
