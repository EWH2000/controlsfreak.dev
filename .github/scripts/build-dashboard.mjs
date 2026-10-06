// build-dashboard.mjs — render the project-status dashboard as one static
// HTML page (no runtime JS: the page is complete at rest).
//
//   npm run dashboard                 # refresh inputs, render _dashboard/dashboard.html
//   npm run dashboard -- --no-refresh # re-render from the inputs already in _dashboard/
//   node .github/scripts/build-dashboard.mjs --data <dir> --out <dir>
//
// INPUTS
//   <out>/status.json  — `node .github/scripts/project-status.mjs --json`,
//                        regenerated on every run unless --no-refresh.
//   <out>/prs.json     — `gh pr list --state open … --json …`, regenerated
//                        the same way. If `gh` is unavailable the file is
//                        removed and the page says no PR snapshot was taken
//                        (an empty list means "zero open PRs", a missing
//                        file means "unknown" — keep the two apart).
//   <data>/dashboard-extra.json — the hand-authored narrative: rulings,
//                        the day log, the decision agenda, the arcs, the
//                        deps note and the suite baseline. Edit it by hand;
//                        it is the only input a human writes.
// Defaults: --data docs/audits/2026-10-reentry/dashboard, --out _dashboard
// (gitignored). The generated page is published as a claude.ai Artifact;
// the standing URL is recorded in docs/next-session-handoff.md
// — from a new conversation the Artifact tool must `read` that URL once
// before it can publish to it.
//
// Report-only tooling, same standing as project-status.mjs: deliberately
// not in test.yml. It began life in a session scratchpad (2026-10-05) and
// moved here on 2026-10-06 so a fresh session can rebuild the page.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; };
const DATA = path.resolve(ROOT, flag('--data', 'docs/audits/2026-10-reentry/dashboard'));
const OUT = path.resolve(ROOT, flag('--out', '_dashboard'));
const REFRESH = !argv.includes('--no-refresh');
fs.mkdirSync(OUT, { recursive: true });

if (REFRESH) {
    const st = spawnSync(process.execPath, [path.join(ROOT, '.github/scripts/project-status.mjs'), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (st.status !== 0 || !st.stdout.trim()) { console.error('[dashboard] project-status.mjs --json failed:', (st.stderr || '').trim().slice(0, 400)); process.exitCode = 0; }
    else fs.writeFileSync(path.join(OUT, 'status.json'), st.stdout);
    const gh = spawnSync('gh', ['pr', 'list', '--state', 'open', '--limit', '60', '--json', 'number,title,headRefName,baseRefName,body,statusCheckRollup,createdAt'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (gh.status === 0 && gh.stdout.trim()) fs.writeFileSync(path.join(OUT, 'prs.json'), gh.stdout);
    else { console.error('[dashboard] gh pr list unavailable — no PR snapshot (' + ((gh.stderr || gh.error?.message || '').trim().slice(0, 200) || 'gh missing') + ')'); try { fs.unlinkSync(path.join(OUT, 'prs.json')); } catch { /* none to remove */ } }
}

const status = JSON.parse(fs.readFileSync(path.join(OUT, 'status.json'), 'utf8'));
const extra = JSON.parse(fs.readFileSync(path.join(DATA, 'dashboard-extra.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const code = (s) => `<code>${esc(s)}</code>`;
// Minimal inline markdown: `code` and **bold** only.
const md = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

const g = status.git, p = status.pages, f = status.friction, c = status.content;
const ci = status.ledgers.find((l) => l.file.includes('codebase-issues'));
const ca = status.ledgers.find((l) => l.file.includes('content-audit'));
const snapshot = status.generatedAt.slice(0, 10);

// ── derived figures ───────────────────────────────────────────────────────
const ciOpenClass = ci.tally.open + ci.tally.partial;
const caOpen = ca.open.filter((e) => !ca.noStatusParenthetical?.includes?.(e.n));
const decisions = extra.agenda.filter((a) => !a.done).length;
const decided = extra.agenda.filter((a) => a.done).length;
const under = c.quizBanks.underTarget;
const hist = {};
for (const b of under) hist[b.count] = (hist[b.count] || 0) + 1;
for (const b of (c.quizBanks.atOrAbove || extra.banksAtOrAbove || [])) hist[b.count] = (hist[b.count] || 0) + 1;
const frozen = Array.isArray(c.quizBanks.frozen) ? c.quizBanks.frozen[0] : c.quizBanks.frozen;
if (frozen) hist[frozen.count] = (hist[frozen.count] || 0) + 1;
const histKeys = Object.keys(hist).map(Number).sort((a, b) => a - b);

// ── charts (SVG, one scale, one hue) ──────────────────────────────────────
function histogram() {
    const W = 520, H = 220, padL = 36, padR = 16, padT = 18, padB = 34;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const xs = [];
    for (let k = 10; k <= 20; k++) xs.push(k);
    const maxY = Math.max(...Object.values(hist));
    const yMax = Math.ceil(maxY / 10) * 10 || 10;
    const slot = plotW / xs.length;
    const barW = Math.min(28, slot * 0.6);
    const y = (v) => padT + plotH - (v / yMax) * plotH;
    const x = (k) => padL + (xs.indexOf(k) + 0.5) * slot;
    const ticks = [0, yMax / 2, yMax];
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="hist-t hist-d"><title id="hist-t">Quiz banks by question count</title><desc id="hist-d">${esc(histDesc())}</desc>`;
    for (const t of ticks) s += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${padL - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`;
    // target line at 15 → between bars 14 and 15 (the bar at 15 is ON target)
    const tx = padL + (xs.indexOf(15)) * slot;
    s += `<line class="target" x1="${tx}" x2="${tx}" y1="${padT - 6}" y2="${padT + plotH}"/><text class="target-label" x="${tx + 6}" y="${padT + 4}">target 15</text>`;
    for (const k of xs) {
        const v = hist[k] || 0;
        if (!v) continue;
        const bx = x(k) - barW / 2, by = y(v), bh = padT + plotH - by;
        const isFrozen = frozen && k === frozen.count;
        s += `<rect class="bar${k >= 15 ? ' on-target' : ''}" x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="0"/>`;
        s += `<text class="val" x="${x(k)}" y="${by - 6}" text-anchor="middle">${v}${isFrozen ? '*' : ''}</text>`;
    }
    for (const k of xs) s += `<text class="tick" x="${x(k)}" y="${H - 12}" text-anchor="middle">${k}</text>`;
    s += `<text class="axis" x="${padL + plotW / 2}" y="${H - 1}" text-anchor="middle">questions in bank</text>`;
    s += '</svg>';
    return s;
}
function histDesc() {
    const parts = histKeys.map((k) => `${hist[k]} bank${hist[k] === 1 ? '' : 's'} at ${k}`);
    return `Column chart of ${c.quizBanks.banks} quiz banks by question count: ${parts.join(', ')}. The ruled target is 15 questions per bank.`;
}
function pagesBars() {
    const rows = Object.entries(p.bySection).sort((a, b) => b[1] - a[1]);
    const max = rows[0][1];
    return `<div class="bars" role="img" aria-label="${esc(rows.map(([k, v]) => `${k} ${v}`).join(', '))}">` + rows.map(([k, v]) =>
        `<div class="bar-row"><span class="bar-key">${esc(k)}</span><span class="bar-track"><span class="bar-fill" style="width:${(v / max * 100).toFixed(1)}%"></span></span><span class="bar-val">${v}</span></div>`).join('') + '</div>';
}

// ── sections ──────────────────────────────────────────────────────────────
const tiles = [
    { label: 'Ledger items open or partial', value: ciOpenClass, note: `${ci.tally.openDecision} carry an owner decision · ${ci.tally.resolved} resolved · ${ci.tally.deferred} deferred` },
    { label: 'Decisions waiting on the owner', value: decisions, note: `${decided} ruled today · tiered agenda below` },
    { label: 'Canonical pages', value: p.canonical, note: `${Object.keys(p.bySection).length} sections · ${p.hidden.length} served without a canonical` },
    { label: 'Quiz banks under the 15 target', value: `${under.length}<span class="of">/${c.quizBanks.banks}</span>`, note: frozen ? `+ ${frozen.slug} frozen at ${frozen.count} by design` : '' , raw: true },
    { label: 'Gloss marks in page markup', value: c.glossary.marksCommentMasked, note: `${c.glossary.entries} glossary entries` },
    { label: 'Open pull requests', value: g.github.available ? g.github.openPrs.length : '—', note: g.github.available ? g.github.openPrs.map((x) => `#${x.number}`).join(' · ') : 'gh unavailable at build' },
];

const tierNames = { 1: 'Act today', 2: 'Structured data', 3: 'Accessibility and workbench', 4: 'Content calls', 5: 'The arc question' };
const agendaHtml = Object.entries(tierNames).map(([t, name]) => {
    const items = extra.agenda.filter((a) => a.tier === Number(t));
    if (!items.length) return '';
    return `<div class="tier"><h3 class="tier-h"><span class="tier-n">Tier ${t}</span>${esc(name)}</h3><ol class="agenda" start="${items[0].id}">` + items.map((a) =>
        `<li id="d${a.id}"${a.done ? ' class="done"' : ''}><div class="ag-head"><span class="ag-title">${md(a.title)}</span><span class="ag-src">${md(a.source)}</span>${a.done ? '<span class="pill done">done</span>' : ''}</div>${a.done ? `<div class="ag-rec"><span class="ag-rec-k done">Ruled</span>${md(a.done)}</div>` : `<div class="ag-rec"><span class="ag-rec-k">${a.rec.startsWith('Owner') ? 'Needs' : 'Rec'}</span>${md(a.rec)}</div>`}</li>`).join('') + '</ol></div>';
}).join('');

const pill = (e) => e.status === 'partial' ? '<span class="pill partial">partial</span>' : e.ruled ? '<span class="pill ruled">ruled · fix pending</span>' : e.decision ? '<span class="pill decision">decision</span>' : '<span class="pill open">open</span>';
const prsFile = path.join(OUT, 'prs.json');
const prList = fs.existsSync(prsFile) ? JSON.parse(fs.readFileSync(prsFile, 'utf8')) : [];
const prSnapshotTaken = fs.existsSync(prsFile);
const prAuth = (b) => { const m = (b || '').match(/## Merge authority\s*\n+([^\n]+)/); return m ? m[1].replace(/^[-*]\s*/, '').trim() : ''; };
const prStack = (b) => { const m = (b || '').match(/## Stacked on\s*\n+([^\n]+)/); return m ? m[1].trim() : ''; };
const prCi = (pr) => { const r = pr.statusCheckRollup || []; const t = r.find((c) => (c.name || c.context || '') === 'test'); if (!t) return 'ci pending'; const c = (t.conclusion || t.state || '').toLowerCase(); return c.includes('success') ? 'ci green' : c ? 'ci ' + c : 'ci pending'; };
const ownerPrs = prList.filter((pr) => /owner/i.test(prAuth(pr.body)) || !/merge on green/i.test(prAuth(pr.body)));
const greenPrs = prList.filter((pr) => /merge on green/i.test(prAuth(pr.body)) && !/owner/i.test(prAuth(pr.body)));
const prRow = (pr) => `<li><span class="num">#${pr.number}</span> ${esc(pr.title)} <span class="fine">${esc(prCi(pr))}${prStack(pr.body) ? ' · stacked: ' + esc(prStack(pr.body)) : ''}</span>${prAuth(pr.body) ? `<div class="fine">${esc(prAuth(pr.body))}</div>` : ''}</li>`;
const pickupHtml = prList.length ? `<p class="fine" style="margin-top:0">${ownerPrs.length} PRs wait for you (sizes in the titles; stacked ones merge parent first). ${greenPrs.length} test/docs PRs merge on green without you.</p><h3 style="font-size:0.9rem">You merge</h3><ul class="plain">${ownerPrs.map(prRow).join('')}</ul>${greenPrs.length ? `<h3 style="font-size:0.9rem;margin-top:12px">Merges on green</h3><ul class="plain">${greenPrs.map(prRow).join('')}</ul>` : ''}${extra.mergedTonight?.length ? `<h3 style="font-size:0.9rem;margin-top:12px">Merged overnight</h3><ul class="plain">${extra.mergedTonight.map((m) => `<li>${md(m)}</li>`).join('')}</ul>` : ''}` : (prSnapshotTaken ? `<p class="fine" style="margin-top:0">The queue is clear: <strong>zero open PRs</strong> at snapshot time. Everything from night 1 merged on 2026-10-06, PR by PR, with the owner (see <em>Rulings</em> and <em>Today</em>).</p>${extra.mergedTonight?.length ? `<h3 style="font-size:0.9rem;margin-top:12px">Merged</h3><ul class="plain">${extra.mergedTonight.map((m) => `<li>${md(m)}</li>`).join('')}</ul>` : ''}` : '<p class="fine">No PR snapshot was captured when this page was built.</p>');
const openRows = ci.open.map((e) => `)<tr><td class="num">#${e.n}</td><td>${md(e.title)}</td><td>${pill(e)}</td></tr>`).join('');
const caRows = caOpen.map((e) => `<tr><td class="num">#${e.n}</td><td>${md(e.title)}</td><td>${pill(e)}</td></tr>`).join('');
const unclassified = ci.unclassifiedShapes?.length ? `<p class="fine">Heading shapes the status grammar could not classify and counted by default (${ci.unclassifiedShapes.length}): ${ci.unclassifiedShapes.map((u) => `#${u.n} <q>${esc(u.firstWord)}</q> → ${esc(u.bucket || '')}`).join(' · ')}.</p>` : '';

const unbuilt = f.unbuilt.map((u) => `<li>${code(u.target)} <span class="fine">L${u.lines.join(', L')}</span></li>`).join('');
const stale = f.stale.map((u) => `<li>${code(u.target)} <span class="fine">L${u.lines.join(', L')} — page exists, marker never annotated</span></li>`).join('');

const arcsHtml = extra.arcs.map((a) => `<div class="arc"><div class="arc-head"><span class="arc-name">${esc(a.name)}</span><span class="arc-state ${a.stateClass}">${esc(a.state)}</span></div><p>${md(a.text)}</p></div>`).join('');

const prs = g.github.available ? g.github.openPrs.map((x) => `<li><span class="num">#${x.number}</span> ${esc(x.title)} <span class="fine">${esc(x.author)} · ${x.ageDays}d</span></li>`).join('') : '<li class="fine">gh unavailable when this page was built</li>';
const ciL = g.github.available && g.github.ciLatest ? g.github.ciLatest : null;
const ciLine = ciL ? `${esc(ciL.status)}${ciL.conclusion ? ' / ' + esc(ciL.conclusion) : ''} · ${esc(ciL.headBranch)} @ ${esc(ciL.headSha)}` : 'gh unavailable';

const todayHtml = extra.today.map((t) => `<li>${md(t)}</li>`).join('');
const rulingsHtml = extra.rulings.map((r) => `<li>${md(r)}</li>`).join('');

const html = `<title>Controls Freak Status</title>
<meta name="description" content="Where controlsfreak.dev stands on ${snapshot}: open ledger items, decisions waiting on the owner, quiz-bank growth, pages, roadmap markers and repo hygiene, derived by npm run status.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Overpass:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: a BAS-workstation status page — flat panels on a cool slate floor,
   hard 1px seams, square corners, data in mono. Dark-first, like the site. */
:root {
    color-scheme: dark;
    --bg: #13161b; --surface: #1e232b; --surface-2: #283038; --well: #11141a;
    --border: #3c4757; --border-faint: #2b333d;
    --text: #c5cdd8; --text-bright: #eef2f8; --text-dim: #919cab;
    --accent: #6cb23a; --accent-ink: #86cf4d; --accent-dim: rgba(108,178,58,0.14);
    --blue: #4aa3dd; --blue-ink: #4aa3dd; --blue-dim: rgba(74,163,221,0.16);
    --amber: #e0a94a; --amber-ink: #e0a94a; --amber-dim: rgba(224,169,74,0.14);
    --red-text: #f07a6d; --teal: #46b3ac;
    --font-body: 'Overpass', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --font-mono: 'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) {
        color-scheme: light;
        --bg: #eef1ec; --surface: #ffffff; --surface-2: #f2f6f1; --well: #e8ece4;
        --border: #ccd7c8; --border-faint: #e3e8df;
        --text: #38423a; --text-bright: #1d251f; --text-dim: #636b63;
        --accent: #3a7a14; --accent-ink: #356e12; --accent-dim: rgba(58,122,20,0.10);
        --blue: #11679f; --blue-ink: #0f5c8f; --blue-dim: rgba(17,103,159,0.10);
        --amber: #83641f; --amber-ink: #83641f; --amber-dim: rgba(131,100,31,0.10);
        --red-text: #bb352c; --teal: #377070;
    }
}
:root[data-theme="light"] {
    color-scheme: light;
    --bg: #eef1ec; --surface: #ffffff; --surface-2: #f2f6f1; --well: #e8ece4;
    --border: #ccd7c8; --border-faint: #e3e8df;
    --text: #38423a; --text-bright: #1d251f; --text-dim: #636b63;
    --accent: #3a7a14; --accent-ink: #356e12; --accent-dim: rgba(58,122,20,0.10);
    --blue: #11679f; --blue-ink: #0f5c8f; --blue-dim: rgba(17,103,159,0.10);
    --amber: #83641f; --amber-ink: #83641f; --amber-dim: rgba(131,100,31,0.10);
    --red-text: #bb352c; --teal: #377070;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 15px; line-height: 1.5; padding-block: 0 48px; padding-inline: 16px; }
.wrap { max-width: 1100px; margin: 0 auto; display: grid; gap: 20px; }
h1, h2, h3 { color: var(--text-bright); margin: 0; text-wrap: balance; }
h2 { font-size: 1.05rem; font-weight: 600; }
code, .mono, .num, .tick, .val, .axis, .target-label { font-family: var(--font-mono); }
code { font-size: 0.85em; color: var(--blue-ink); background: var(--well); padding: 0 0.3em; }
a { color: var(--blue-ink); }
.fine { color: var(--text-dim); font-size: 0.82rem; }
q { quotes: '“' '”'; }

/* masthead */
.mast { padding-block: 28px 8px; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: 1fr auto; gap: 16px 32px; align-items: end; }
.eyebrow { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-ink); }
.mast h1 { font-size: 1.7rem; font-weight: 700; letter-spacing: -0.01em; }
.mast .sub { color: var(--text-dim); margin: 6px 0 0; font-size: 0.9rem; }
.hero { text-align: right; }
.hero .hero-n { font-size: 56px; line-height: 1; font-weight: 600; color: var(--text-bright); }
.hero .hero-l { color: var(--text-dim); font-size: 0.85rem; margin-top: 4px; }
@media (max-width: 640px) { .mast { grid-template-columns: 1fr; } .hero { text-align: left; } }

/* panels */
.panel { background: var(--surface); border: 1px solid var(--border); }
.panel-h { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 10px 16px; background: var(--surface-2); border-bottom: 1px solid var(--border); }
.panel-h .label { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); }
.panel-b { padding: 16px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 860px) { .two { grid-template-columns: 1fr; } }

/* kpi tiles */
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); }
.tile { background: var(--surface); padding: 14px 16px; min-width: 0; }
.tile .t-l { color: var(--text-dim); font-size: 0.8rem; }
.tile .t-v { font-size: 1.9rem; font-weight: 600; color: var(--text-bright); line-height: 1.15; margin-top: 2px; }
.tile .t-v .of { color: var(--text-dim); font-size: 1rem; font-weight: 400; }
.tile .t-n { color: var(--text-dim); font-size: 0.78rem; margin-top: 4px; overflow-wrap: anywhere; }

/* strips */
.strip ul { margin: 0; padding-left: 1.1em; }
.strip li + li { margin-top: 4px; }

/* agenda */
.tier + .tier { margin-top: 18px; }
.tier-h { font-size: 0.95rem; font-weight: 600; display: flex; gap: 10px; align-items: baseline; padding-bottom: 6px; border-bottom: 1px solid var(--border-faint); }
.tier-n { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber-ink); }
.agenda { margin: 0; padding-left: 1.6em; }
.agenda li { padding: 8px 0; border-bottom: 1px solid var(--border-faint); }
.agenda li:last-child { border-bottom: 0; }
.agenda li::marker { font-family: var(--font-mono); color: var(--text-dim); font-size: 0.85rem; }
.ag-head { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; }
.ag-title { color: var(--text-bright); font-weight: 600; }
.ag-src { color: var(--text-dim); font-size: 0.8rem; font-family: var(--font-mono); }
.ag-rec { margin-top: 3px; font-size: 0.9rem; }
.ag-rec-k { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-ink); margin-right: 8px; }

/* tables */
table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
td { padding: 6px 8px; border-bottom: 1px solid var(--border-faint); vertical-align: top; }
td.num { white-space: nowrap; color: var(--text-dim); width: 4.5em; font-variant-numeric: tabular-nums; }
td:last-child { white-space: nowrap; width: 1%; }
.scroll { overflow-x: auto; }
.pill { display: inline-block; font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; padding: 1px 7px; border: 1px solid; }
.pill.open { color: var(--blue-ink); border-color: var(--blue); background: var(--blue-dim); }
.pill.decision { color: var(--amber-ink); border-color: var(--amber); background: var(--amber-dim); }
.pill.partial { color: var(--text-dim); border-color: var(--border); background: var(--well); }
.pill.done { color: var(--accent-ink); border-color: var(--accent); background: var(--accent-dim); }
.pill.ruled { color: var(--accent-ink); border-color: var(--accent); background: var(--accent-dim); }
.agenda li.done .ag-title { color: var(--text-dim); font-weight: 400; }
.ag-rec-k.done { color: var(--accent-ink); }

/* charts */
.chart { width: 100%; height: auto; display: block; }
.chart .grid { stroke: var(--border-faint); stroke-width: 1; }
.chart .bar { fill: var(--blue); }
.chart .bar.on-target { fill: var(--accent); }
.chart .tick, .chart .axis { fill: var(--text-dim); font-size: 11px; }
.chart .val { fill: var(--text); font-size: 12px; }
.chart .target { stroke: var(--amber); stroke-width: 1.5; }
.chart .target-label { fill: var(--amber-ink); font-size: 11px; }
.bars { display: grid; gap: 6px; }
.bar-row { display: grid; grid-template-columns: 7.5em 1fr 3em; gap: 10px; align-items: center; font-size: 0.85rem; }
.bar-key { color: var(--text-dim); font-family: var(--font-mono); font-size: 0.78rem; }
.bar-track { height: 10px; background: var(--well); position: relative; }
.bar-fill { position: absolute; inset: 0 auto 0 0; background: var(--blue); }
.bar-val { font-family: var(--font-mono); font-size: 0.8rem; text-align: right; font-variant-numeric: tabular-nums; }

/* arcs */
.arcs { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1px; background: var(--border); }
.arc { background: var(--surface); padding: 12px 14px; }
.arc-head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; margin-bottom: 4px; }
.arc-name { font-weight: 600; color: var(--text-bright); }
.arc-state { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; }
.arc-state.live { color: var(--accent-ink); } .arc-state.paused { color: var(--amber-ink); } .arc-state.waiting { color: var(--text-dim); }
.arc p { margin: 0; font-size: 0.88rem; }

ul.plain { margin: 0; padding-left: 1.1em; }
ul.plain li + li { margin-top: 3px; }
.footer { color: var(--text-dim); font-size: 0.82rem; border-top: 1px solid var(--border); padding-top: 12px; }
@media (prefers-reduced-motion: no-preference) { .bar-fill { transition: width 0.4s ease-out; } }
</style>

<div class="wrap">
<header class="mast">
    <div>
        <div class="eyebrow">controlsfreak.dev · project status</div>
        <h1>Controls Freak Status</h1>
        <p class="sub">Snapshot ${snapshot} · derived by <code>npm run status</code> · v${esc(g.version)} · <code>main</code> ${esc(extra.mainSha)} · last merge ${esc(extra.lastMergeDate)}</p>
    </div>
    <div class="hero"><div class="hero-n">${ciOpenClass}</div><div class="hero-l">ledger items open, partial or waiting on a decision</div></div>
</header>

<section class="tiles" aria-label="Headline figures">
${tiles.map((t) => `    <div class="tile"><div class="t-l">${esc(t.label)}</div><div class="t-v">${t.raw ? t.value : esc(t.value)}</div><div class="t-n">${esc(t.note)}</div></div>`).join('\n')}
</section>

<section class="panel"><div class="panel-h"><h2>Pick up here</h2><span class="label">the morning after · PR queue</span></div><div class="panel-b">${pickupHtml}</div></section>

<div class="two">
<section class="panel strip"><div class="panel-h"><h2>Rulings taken on return</h2><span class="label">${snapshot}</span></div><div class="panel-b"><ul>${rulingsHtml}</ul></div></section>
<section class="panel strip"><div class="panel-h"><h2>Done the same day</h2><span class="label">hygiene</span></div><div class="panel-b"><ul>${todayHtml}</ul></div></section>
</div>

<section class="panel"><div class="panel-h"><h2>${decisions ? 'Waiting on the owner' : 'Decision agenda — all ruled'}</h2><span class="label">${decisions} open · ${decided} ruled · recommendation first</span></div><div class="panel-b">${agendaHtml}</div></section>

<div class="two">
<section class="panel"><div class="panel-h"><h2>Quiz banks against the 15-question target</h2><span class="label">${c.quizBanks.banks} banks</span></div><div class="panel-b">
${histogram()}
<p class="fine">${esc(under.length)} banks sit under the ruled 15; ${esc(String(hist[15] || 0))} at 15 and ${esc(String((histKeys.filter((k) => k > 15)).reduce((n, k) => n + hist[k], 0)))} above. The 11s are ${esc(under.filter((b) => b.count === 11).map((b) => b.slug).join(', '))}; the 13 is ${esc(under.filter((b) => b.count === 13).map((b) => b.slug).join(', '))}. ${frozen ? `* ${esc(frozen.slug)} is frozen at ${frozen.count} by design (deterministic smoke walk) and excluded from the under-target count.` : ''}</p>
</div></section>
<section class="panel"><div class="panel-h"><h2>Pages by section</h2><span class="label">${p.canonical} canonical</span></div><div class="panel-b">
${pagesBars()}
<p class="fine">Served without a canonical (${p.hidden.length}): ${p.hidden.map((h) => code(h)).join(', ')} — the 404 page is live, the other two are hidden. <code>tests/pages.js</code> ${p.pagesJs.manifest}/${p.pagesJs.canonical} and <code>educationSequence.js</code> ${p.educationSequence.order}/${p.educationSequence.educationPages} in sync.</p>
</div></section>
</div>

<section class="panel"><div class="panel-h"><h2>Ledger — open, partial and decision-class entries</h2><span class="label">codebase-issues ${ci.total} entries · content-audit ${ca.total}</span></div><div class="panel-b">
<div class="scroll"><table><tbody>${openRows}</tbody></table></div>
<h3 style="margin-top:16px;font-size:0.9rem">content-audit</h3>
<div class="scroll"><table><tbody>${caRows}</tbody></table></div>
${unclassified}
</div></section>

<div class="two">
<section class="panel"><div class="panel-h"><h2>Roadmap markers</h2><span class="label">${f.markers} [future:] · ${f.unannotatedMarkers} unannotated</span></div><div class="panel-b">
<p class="fine" style="margin-top:0">Unbuilt page targets (${f.unbuilt.length}) — the roadmap, not decay:</p>
<ul class="plain">${unbuilt}</ul>
${f.stale.length ? `<p class="fine">Stale (${f.stale.length}) — the page exists but the marker was never annotated:</p><ul class="plain">${stale}</ul>` : ''}
<p class="fine">${f.notAPage.length} further markers name features or sections rather than pages. Stale and unbuilt are different findings and are never summed.</p>
</div></section>
<section class="panel"><div class="panel-h"><h2>Repo and toolchain</h2><span class="label">git · gh · npm</span></div><div class="panel-b">
<ul class="plain">
<li><code>main</code> vs <code>origin/main</code>: ${g.mainVsOrigin.ahead} ahead, ${g.mainVsOrigin.behind} behind</li>
<li>Open PRs:<ul class="plain">${prs}</ul></li>
<li>Local branches merged into origin/main: ${g.mergedBranches.length ? g.mergedBranches.map((b) => code(b)).join(', ') : 'none'}</li>
<li>Worktrees ${g.worktrees} · stashes ${g.stashes}</li>
<li>Latest CI run (test.yml): ${ciLine}${g.github.ciRunsOnPushToMain === false ? ' <span class="fine">— runs on pull requests only, so main itself is never run directly</span>' : ''}</li>
<li>${extra.depsPr ? `Dependency bump PR #${extra.depsPr.number}: ${md(extra.depsPr.note)}` : 'Dependencies behind: ' + extra.deps.map((d) => `${code(d.name)} ${esc(d.from)} → ${esc(d.to)}`).join(' · ')}</li>
<li>Suite baseline: ${md(extra.suiteBaseline)}</li>
</ul>
</div></section>
</div>

<section class="panel"><div class="panel-h"><h2>Arcs</h2><span class="label">where each line of work stopped</span></div><div class="arcs">${arcsHtml}</div></section>

<p class="footer">Report-only: nothing on this page gates a merge. Regenerate with <code>npm run status --json</code>; the durable record is <code>docs/audits/2026-10-reentry/</code> (state map, appendix, PR #602 assessment, rulings).${c.comingSoon.length ? ` Coming-soon candidates the narrowed scan still reports: ${c.comingSoon.map((x) => code(x.file.replace('html/', '') + ':' + x.line)).join(', ')}.` : ' The coming-soon scan reports nothing.'}</p>
</div>
`;

fs.writeFileSync(path.join(OUT, 'dashboard.html'), html);
console.log(`[dashboard] wrote ${path.relative(ROOT, path.join(OUT, 'dashboard.html'))} (${html.length} bytes) from ${path.relative(ROOT, DATA)}/dashboard-extra.json`);
