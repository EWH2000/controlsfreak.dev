// Project-status readout — one place to read the state of controlsfreak.dev.
//
// REPORT-ONLY. Always exits 0. Deliberately NOT wired into
// .github/workflows/test.yml, for the same reason `prose-lint` and
// `metric-lint` are not: every section below is a heuristic over prose and
// repo shape, and a gate built on heuristics cries wolf and gets muted. This
// script answers "where does the project stand?" — it never answers "may this
// merge?".
//
// WHY IT EXISTS. The project's status lives INLINE across ~25k lines of
// tracking markdown (docs/codebase-issues.md alone is ~15k): an entry's state
// is a parenthetical in its heading, a friction-file marker's state is a
// `*(shipped …)*` note somewhere near it, and the page/sequence/manifest
// invariants are scattered across three guards. After a two-month gap the
// owner could not read the project's state from any one place. This is that
// place — derived LIVE from the repo every run. There is no hard-coded count
// anywhere in this file; every number it prints was counted just now.
//
// Run modes:
//   node .github/scripts/project-status.mjs          grouped human report
//   node .github/scripts/project-status.mjs --json   one JSON document
//   node .github/scripts/project-status.mjs --deps   ALSO run `npm outdated`
//                                                    (network — opt-in only)
//   node .github/scripts/project-status.mjs --no-gh  skip every GitHub call
// Flags combine. Node built-ins only — no dependency, so a fresh worktree
// without node_modules can run it.
//
// ── Sections, and every heuristic in them ────────────────────────────────
//
// 1. GIT / GITHUB.
//    * Ahead/behind is `git rev-list --left-right --count main...origin/main`
//      against the LOCAL origin/main ref. It never fetches: a status readout
//      that mutates refs (or needs the network) is the wrong tool, and a stale
//      origin/main is itself worth seeing. The report says so.
//    * "Merged branches" = `git branch --merged origin/main`, minus main.
//      Worktree-checked-out branches carry a `+` marker in that output and the
//      current one a `*`; both are stripped, so a lane's branch that has
//      merged shows up here too (that is the point — it is cleanable).
//    * GitHub calls go through `gh` and are skipped wholesale — with
//      "gh unavailable" — if `gh` is missing, unauthenticated, or `--no-gh`
//      is passed. A failed call never aborts the report.
//    * CI = the `test.yml` workflow: the latest run on `main` AND the latest
//      run overall. Two numbers because they answer different questions
//      ("is main green?" vs "what did CI last see?"). When test.yml has no
//      `push:` trigger the "on main" answer is structurally empty, and the
//      report says that rather than printing a bare "no runs".
//
// 2. PAGES.
//    * A PAGE is an `.html` file under html/ outside `_includes/`. It is
//      CANONICAL if its YAML frontmatter (the block between the first two
//      `---` lines) carries a `canonical:` line. Reading only the frontmatter
//      keeps a `canonical:` inside page prose or a script from counting.
//    * Grouped by first path segment; files directly under html/ are `root`.
//    * The canonical-less set is the HIDDEN set CLAUDE.md tells you to
//      derive, never cite — so it is derived here. (html/404.html lands in it
//      and is NOT hidden: it is served for every unmatched URL. The report
//      flags it rather than special-casing it out of the list.)
//    * tests/pages.js sync: each PAGES url maps to a file — a trailing `/`
//      means `index.html`, anything else is the path itself — and each
//      canonical maps the same way after stripping the origin. Reported both
//      directions.
//    * educationSequence sync: the module EXPORTS a derived lookup, not its
//      `order` array, so `order` is parsed from SOURCE TEXT — the
//      `const order = [ … ];` block, `//` comments stripped, every string
//      literal taken. Compared against html/education/*.html whose
//      frontmatter says `nav: education` (index.html excluded — the landing
//      is not in the sequence).
//
// 3. LEDGERS (docs/codebase-issues.md, docs/content-audit.md).
//    * One entry per `^### <N>.` heading. Status is read from the HEADING
//      LINE ONLY — the ledgers' convention is that an entry's state lives in
//      its heading parenthetical, and reading the body would let a sentence
//      like "this was never resolved" flip a classification.
//    * Order of tests, and why it is this order:
//        1. `partially` anywhere → PARTIAL. Tested FIRST because a partial
//           entry's heading naturally says "PARTIALLY RESOLVED" / "partially
//           addressed", and the resolved test below would otherwise swallow it.
//        2. RESOLVED if `*(addressed|resolved|closed|fixed|shipped` (the
//           parenthetical OPENS with a closing verb) or an upper-case
//           RESOLVED / CLOSED / FIXED / BLESSED / STANDING ANSWER anywhere.
//           Case-sensitive on purpose: the ledgers shout their verdicts, and
//           a lower-case "closed" in a title ("a closed <details>") is prose.
//        3. RULED if `*(ruled` (case-insensitive). RULED is a sub-state of
//           OPEN, not a fifth bucket: it counts in tally.open, adds to
//           tally.openRuled, and sets `ruled: true` on the entry. A ruled
//           entry is NEVER decision-class, even when its heading still says
//           DECISION-CLASS / owner — the decision has been taken; the entry
//           is waiting on work, not on a person. Tested AFTER resolved and
//           BEFORE deferred, and both neighbours are load-bearing: a ruling
//           RE-OPENS a deferred entry for work (#273 carries a 2026-08-04
//           `*(deferred` marker followed by a 2026-10-05 `*(ruled` one, and
//           must read open), while the `*(addressed …)*` marker appended
//           after the ruling when the fix merges CLOSES it (resolved wins).
//           Grammar added 2026-10-05 with the decision sitting's rulings.
//        4. DEFERRED if `*(deferred|declined|accepted` or GRANDFATHER /
//           log-don't-fix / no action / RECORDED AS BASELINE / written
//           exemption (case-insensitive — these are phrases, not verdicts).
//        5. else OPEN; an OPEN heading matching DECISION-CLASS / DESIGN CALL /
//           owner is counted as DECISION-CLASS (a sub-count of OPEN — it is
//           waiting on a person, not on work).
//    * ANTI-VACUITY. A grammar over prose has blind spots, and a blind spot
//      silently counted as OPEN looks exactly like real open work. So every
//      heading whose first `*(` parenthetical opens with a word OUTSIDE the
//      known marker vocabulary (MARKER_WORDS below) is printed under
//      "unclassified heading shapes", whatever bucket it fell into. Headings
//      with no status parenthetical at all are counted separately — on a
//      ledger whose convention keeps status in the body (content-audit's
//      early entries) every one of them reads OPEN, and the reader must be
//      able to see that this is a shape problem, not 60 open findings.
//
// 4. FRICTION (docs/site-ideas-and-friction.md).
//    * Every `[future: …]` marker, matched ACROSS line breaks (markdown
//      reflow splits markers — `[future:\neducation/x.html]` is common) and
//      whitespace-normalised. Its line is the line of the `[`.
//    * ANNOTATED if `shipped` appears from the marker's line through the two
//      lines after its closing `]`. Only `shipped` counts, per CLAUDE.md's
//      step-5 wording; a "retired" or "paid" note is NOT treated as an
//      annotation, so such a marker stays visible here — that is the cheaper
//      error (a false "unannotated" costs one read; a false "annotated" hides
//      a decayed marker).
//    * A target is a PAGE only if the marker text is a bare path: `x.html`,
//      `dir/x.html`, `/dir/` (a hub), or a bare hyphenated slug. Anything
//      else ("bus simulator", "section in education/vav-systems.html",
//      "glycol correction row in waterside-load.html") is NOT A PAGE — a
//      section or feature inside a page is not a page that can ship. A
//      section/dir path resolves exactly; a bare basename searches all of
//      html/** (markers predate section moves, so `vfds.html` must find
//      education/vfds.html).
//    * STALE = an unannotated marker whose page now EXISTS. STALE and
//      "unannotated, page not built" are different findings and are NEVER
//      summed: the first is doc decay to fix, the second is the roadmap.
//
// 5. CONTENT.
//    * Quiz banks: html/_data/quizzes/*.js `.length`, via createRequire. The
//      ruled bank target is 15; anything under is listed. modbus-decoding is
//      FROZEN — its smoke walk is deterministic and must not grow — so it is
//      flagged rather than listed as "under target".
//    * Glossary: entries = Object.keys(html/_data/glossary.js) (a keyed object
//      — its header documents the shape). Marks = literal `data-gloss="…"`
//      across html/**/*.html and *.njk, counted twice: RAW, and with HTML
//      comments blanked the way the `gloss` transform in .eleventy.js does
//      (`<!--[\s\S]*?-->`). The transform runs on RENDERED output; this scans
//      SOURCE, so the masked figure approximates what the build sees (a mark
//      in a Nunjucks `{# #}` comment or an unused partial would still count).
//      .eleventy.js is NOT imported — it is build config with side effects.
//      The two counts differ from a plain `grep -r 'data-gloss="' html` by
//      the documentation mentions in .js / .css comments (glossary.js,
//      gloss.js, styles.css), which are not page markup and are out of scope.
//    * Coming-soon scan: CLAUDE.md's no-coming-soon rule, as a regex over
//      html/**/*.html with HTML comments masked, `_includes` excluded. Hits
//      are candidates — read the sentence. The regex keeps only the BANNED
//      page-promise shapes (gets its own lesson/page, coming soon/later, a
//      future/later page). `tracked follow-up` / `planned follow-up` were
//      dropped 2026-10-05 by owner ruling: a low-key follow-up clause at the
//      tail of a scope `.ref-note` is accepted copy (CLAUDE.md's amended
//      no-coming-soon bullet), so reporting those forever would be noise.
//
// 6. DEPS (only with --deps). `npm outdated --json` exits 1 when anything is
//    outdated, so its stdout is parsed regardless of status.
//
// --json emits `{ generatedAt, git, pages, ledgers, friction, content, deps? }`.
// `generatedAt` is the ONLY timestamp in the output.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const HTML = path.join(ROOT, 'html');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const withDeps = args.includes('--deps');
const noGh = args.includes('--no-gh');

const QUIZ_TARGET = 15;
const FROZEN_BANKS = new Set(['modbus-decoding']);
const DAY_MS = 86400000;

// ── helpers ──────────────────────────────────────────────────────────────

function run(cmd, cmdArgs, opts = {}) {
    const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', timeout: 60000, ...opts });
    return { ok: r.status === 0 && !r.error, status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}

const git = (...a) => run('git', a);
const rel = (f) => path.relative(ROOT, f);
const read = (f) => fs.readFileSync(f, 'utf8');
const lineOf = (src, index) => src.slice(0, index).split('\n').length;
const blank = (m) => m.replace(/[^\n]/g, ' ');
const maskHtmlComments = (src) => src.replace(/<!--[\s\S]*?-->/g, blank);
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function walk(dir, pred, out = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p, pred, out);
        else if (pred(p)) out.push(p);
    }
    return out;
}

function frontmatter(src) {
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return m ? m[1] : '';
}

// ── 1. git / github ──────────────────────────────────────────────────────

function gitSection() {
    const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
    let lock = null;
    try { lock = JSON.parse(read(path.join(ROOT, 'package-lock.json'))); } catch { /* absent */ }
    const lockTop = lock ? lock.version : null;
    const lockRoot = lock && lock.packages && lock.packages[''] ? lock.packages[''].version : null;

    const branch = git('branch', '--show-current').stdout || '(detached)';
    const ab = git('rev-list', '--left-right', '--count', 'main...origin/main');
    let ahead = null;
    let behind = null;
    if (ab.ok) [ahead, behind] = ab.stdout.split(/\s+/).map(Number);

    const merged = git('branch', '--merged', 'origin/main');
    const mergedBranches = merged.ok
        ? merged.stdout.split('\n').map((l) => l.replace(/^[*+]?\s+/, '').trim())
            .filter((b) => b && b !== 'main' && !b.startsWith('('))
        : [];

    const wt = git('worktree', 'list');
    const stash = git('stash', 'list');
    const last = git('log', '-1', '--format=%cI %h %s');

    const out = {
        version: pkg.version,
        lockVersions: { top: lockTop, root: lockRoot, match: lockTop === pkg.version && lockRoot === pkg.version },
        branch,
        mainVsOrigin: ab.ok ? { ahead, behind, note: 'local origin/main ref — not fetched' } : { error: ab.stderr },
        mergedBranches,
        worktrees: wt.ok ? wt.stdout.split('\n').filter(Boolean).length : null,
        stashes: stash.ok ? stash.stdout.split('\n').filter(Boolean).length : null,
        headCommit: last.ok ? { date: last.stdout.slice(0, 25), summary: last.stdout.slice(26) } : null,
        github: null,
    };
    out.github = githubSection();
    return out;
}

function githubSection() {
    if (noGh) return { available: false, reason: '--no-gh' };
    const auth = run('gh', ['auth', 'status']);
    if (!auth.ok) return { available: false, reason: 'gh unavailable' };
    const now = Date.now();
    const gh = {};
    const prs = run('gh', ['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,author,createdAt']);
    gh.openPrs = prs.ok
        ? JSON.parse(prs.stdout || '[]').map((p) => ({
            number: p.number,
            title: p.title,
            author: p.author ? p.author.login : null,
            ageDays: Math.floor((now - Date.parse(p.createdAt)) / DAY_MS),
        }))
        : { error: prs.stderr || 'gh pr list failed' };
    const fields = 'conclusion,status,createdAt,headBranch,headSha,displayTitle,url';
    const runOf = (extra) => {
        const r = run('gh', ['run', 'list', '--workflow', 'test.yml', '--limit', '1', '--json', fields, ...extra]);
        if (!r.ok) return { error: r.stderr || 'gh run list failed' };
        const x = JSON.parse(r.stdout || '[]')[0];
        return x ? { ...x, headSha: x.headSha.slice(0, 7), ageDays: Math.floor((now - Date.parse(x.createdAt)) / DAY_MS) } : null;
    };
    gh.ciMain = runOf(['--branch', 'main']);
    // test.yml may trigger on pull_request only, in which case no run is ever
    // recorded against `main` itself — say so instead of a bare "no runs".
    let wf = '';
    try { wf = read(path.join(ROOT, '.github/workflows/test.yml')); } catch { /* absent */ }
    gh.ciRunsOnPushToMain = /^\s*push\s*:/m.test(wf);
    gh.ciLatest = runOf([]);
    return { available: true, ...gh };
}

// ── 2. pages ─────────────────────────────────────────────────────────────

const ORIGIN = 'https://controlsfreak.dev/';
const urlToFile = (u) => {
    const p = u.replace(ORIGIN, '/').replace(/^\//, '');
    return p === '' || p.endsWith('/') ? `${p}index.html` : p;
};

function pagesSection() {
    const files = walk(HTML, (p) => p.endsWith('.html') && !p.includes(`${path.sep}_includes${path.sep}`));
    const canonical = new Set();
    const hidden = [];
    const bySection = {};
    const eduNav = [];
    for (const f of files) {
        const r = path.relative(HTML, f).split(path.sep).join('/');
        const fm = frontmatter(read(f));
        if (/^canonical:/m.test(fm)) {
            canonical.add(r);
            const seg = r.includes('/') ? r.split('/')[0] : 'root';
            bySection[seg] = (bySection[seg] || 0) + 1;
        } else {
            hidden.push(r);
        }
        if (r.startsWith('education/') && r !== 'education/index.html' && /^nav:\s*education\s*$/m.test(fm)) {
            eduNav.push(`/${r}`);
        }
    }

    const PAGES = require(path.join(ROOT, 'tests/pages.js'));
    const manifest = new Set(PAGES.map((p) => urlToFile(p.url)));
    const pagesJs = {
        manifest: manifest.size,
        canonical: canonical.size,
        inManifestNotCanonical: [...manifest].filter((f) => !canonical.has(f)).sort(),
        canonicalNotInManifest: [...canonical].filter((f) => !manifest.has(f)).sort(),
    };

    const seqSrc = read(path.join(HTML, '_data/educationSequence.js'));
    const block = seqSrc.match(/const order = \[([\s\S]*?)\];/);
    const order = block
        ? [...block[1].replace(/\/\/.*$/gm, '').matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
        : [];
    const orderSet = new Set(order);
    const eduSet = new Set(eduNav);
    const sequence = {
        parsed: !!block,
        order: order.length,
        duplicates: order.filter((u, i) => order.indexOf(u) !== i),
        educationPages: eduSet.size,
        inOrderNoPage: order.filter((u) => !eduSet.has(u)),
        pageNotInOrder: [...eduSet].filter((u) => !orderSet.has(u)).sort(),
    };

    return {
        totalHtml: files.length,
        canonical: canonical.size,
        bySection: Object.fromEntries(Object.entries(bySection).sort((a, b) => b[1] - a[1])),
        hidden: hidden.sort(),
        pagesJs,
        educationSequence: sequence,
    };
}

// ── 3. ledgers ───────────────────────────────────────────────────────────

const MARKER_WORDS = new Set([
    'addressed', 'deferred', 'noticed', 'reported', 'logged', 'recorded',
    'resolved', 'closed', 'open', 'measured', 'flagged', 'instrumented',
    'declined', 'accepted', 'shipped', 'fixed', 'ruled', 'partially',
]);

function classifyHeading(h) {
    if (/partially/i.test(h)) return 'partial';
    if (/\*\((addressed|resolved|closed|fixed|shipped)/i.test(h)
        || /\b(RESOLVED|CLOSED|FIXED|BLESSED|STANDING ANSWER)\b/.test(h)) return 'resolved';
    if (/\*\(ruled/i.test(h)) return 'ruled';
    if (/\*\((deferred|declined|accepted)/i.test(h)
        || /\b(GRANDFATHER|log-don't-fix|no action|RECORDED AS BASELINE|written exemption)\b/i.test(h)) return 'deferred';
    return 'open';
}

function ledgerSection(file) {
    const src = read(path.join(ROOT, file));
    const entries = [];
    const re = /^### (\d+)\.\s*(.*)$/gm;
    let m;
    while ((m = re.exec(src))) {
        const heading = m[2];
        const cls = classifyHeading(heading);
        // 'ruled' is a sub-state of OPEN (see the header): fold it back into
        // open and carry it as a flag. A ruled entry is never decision-class.
        const ruled = cls === 'ruled';
        const status = ruled ? 'open' : cls;
        const decision = status === 'open' && !ruled && /DECISION-CLASS|DESIGN CALL|owner/i.test(heading);
        const paren = heading.match(/\*\(\**\s*([^\s)]*)/);
        const firstWord = paren ? (paren[1].match(/^[A-Za-z'-]+/) || [''])[0].toLowerCase() : null;
        const title = heading.split(/\s\*\(/)[0];
        entries.push({ n: Number(m[1]), line: lineOf(src, m.index), status, ruled, decision, firstWord, title, heading });
    }
    const tally = { resolved: 0, deferred: 0, partial: 0, open: 0, openRuled: 0, openDecision: 0 };
    for (const e of entries) {
        tally[e.status] += 1;
        if (e.ruled) tally.openRuled += 1;
        if (e.decision) tally.openDecision += 1;
    }
    const nums = entries.map((e) => e.n);
    return {
        file,
        total: entries.length,
        maxNumber: nums.length ? Math.max(...nums) : null,
        tally,
        open: entries.filter((e) => e.status === 'open' || e.status === 'partial')
            .map((e) => ({ n: e.n, status: e.status, ruled: e.ruled, decision: e.decision, title: trunc(e.title, 90) })),
        noStatusParenthetical: entries.filter((e) => e.firstWord === null).map((e) => e.n),
        unclassifiedShapes: entries
            .filter((e) => e.firstWord !== null && !MARKER_WORDS.has(e.firstWord))
            .map((e) => ({ n: e.n, line: e.line, firstWord: e.firstWord || '(non-word)', bucket: e.status, heading: trunc(e.heading, 140) })),
    };
}

// ── 4. friction ──────────────────────────────────────────────────────────

function frictionSection() {
    const file = 'docs/site-ideas-and-friction.md';
    const src = read(path.join(ROOT, file));
    const lines = src.split('\n');
    const allHtml = walk(HTML, (p) => p.endsWith('.html')).map((p) => path.relative(HTML, p).split(path.sep).join('/'));

    const resolveTarget = (t) => {
        if (/^\/?[a-z0-9-]+\/$/.test(t)) {
            const p = `${t.replace(/^\//, '')}index.html`;
            return { page: true, exists: allHtml.includes(p), resolved: allHtml.includes(p) ? p : null };
        }
        if (/^\/?[a-z0-9-]+\/[a-z0-9-]+\.html$/.test(t)) {
            const p = t.replace(/^\//, '');
            return { page: true, exists: allHtml.includes(p), resolved: allHtml.includes(p) ? p : null };
        }
        const base = /^[a-z0-9-]+\.html$/.test(t) ? t : (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(t) ? `${t}.html` : null);
        if (!base) return { page: false };
        const hit = allHtml.find((p) => p === base || p.endsWith(`/${base}`));
        return { page: true, exists: !!hit, resolved: hit || null };
    };

    const markers = [];
    const re = /\[future:([^\]]*)\]/g;
    let m;
    while ((m = re.exec(src))) {
        const target = m[1].replace(/\s+/g, ' ').trim();
        const line = lineOf(src, m.index);
        const endLine = lineOf(src, m.index + m[0].length);
        const windowText = lines.slice(line - 1, endLine + 2).join('\n');
        markers.push({ line, target, annotated: /shipped/i.test(windowText), ...resolveTarget(target) });
    }

    const unannotated = markers.filter((x) => !x.annotated);
    const groups = new Map();
    for (const x of unannotated) {
        if (!groups.has(x.target)) groups.set(x.target, { target: x.target, lines: [], page: x.page, exists: !!x.exists, resolved: x.resolved || null });
        groups.get(x.target).lines.push(x.line);
    }
    const g = [...groups.values()];
    return {
        file,
        markers: markers.length,
        annotated: markers.length - unannotated.length,
        unannotatedMarkers: unannotated.length,
        unannotatedTargets: g.length,
        stale: g.filter((x) => x.page && x.exists),
        unbuilt: g.filter((x) => x.page && !x.exists),
        notAPage: g.filter((x) => !x.page),
    };
}

// ── 5. content ───────────────────────────────────────────────────────────

function contentSection() {
    const qdir = path.join(HTML, '_data/quizzes');
    const banks = fs.readdirSync(qdir).filter((f) => f.endsWith('.js')).sort().map((f) => {
        const slug = f.replace(/\.js$/, '');
        let count = null;
        try { count = require(path.join(qdir, f)).length; } catch { /* reported as null */ }
        return { slug, count, frozen: FROZEN_BANKS.has(slug) };
    });
    const under = banks.filter((b) => !b.frozen && b.count !== null && b.count < QUIZ_TARGET);
    const histogram = {};
    for (const b of under) histogram[b.count] = (histogram[b.count] || 0) + 1;

    const glossary = require(path.join(HTML, '_data/glossary.js'));
    const markFiles = walk(HTML, (p) => p.endsWith('.html') || p.endsWith('.njk'));
    const MARK = /data-gloss="([^"]*)"/g;
    let raw = 0;
    let masked = 0;
    const maskedAway = [];
    const unknownIds = new Set();
    for (const f of markFiles) {
        const src = read(f);
        const r = (src.match(MARK) || []).length;
        const scannable = maskHtmlComments(src);
        const live = [...scannable.matchAll(MARK)];
        raw += r;
        masked += live.length;
        if (r !== live.length) maskedAway.push({ file: rel(f), inComments: r - live.length });
        for (const x of live) if (!(x[1] in glossary)) unknownIds.add(x[1]);
    }

    const COMING = /gets its own (lesson|page)|coming (soon|later)|a (future|later) page/i;
    const comingSoon = [];
    for (const f of walk(HTML, (p) => p.endsWith('.html') && !p.includes(`${path.sep}_includes${path.sep}`))) {
        maskHtmlComments(read(f)).split('\n').forEach((l, i) => {
            if (COMING.test(l)) comingSoon.push({ file: rel(f), line: i + 1, text: trunc(l.trim(), 120) });
        });
    }

    return {
        quizBanks: {
            banks: banks.length,
            target: QUIZ_TARGET,
            underTarget: under.map((b) => ({ slug: b.slug, count: b.count })),
            underHistogram: histogram,
            frozen: banks.filter((b) => b.frozen),
            totalQuestions: banks.reduce((s, b) => s + (b.count || 0), 0),
        },
        glossary: {
            entries: Object.keys(glossary).length,
            marksRaw: raw,
            marksCommentMasked: masked,
            maskedAway,
            unknownIdsInSource: [...unknownIds],
        },
        comingSoon,
    };
}

// ── 6. deps ──────────────────────────────────────────────────────────────

function depsSection() {
    const r = run('npm', ['outdated', '--json'], { timeout: 120000 });
    try {
        const data = JSON.parse(r.stdout || '{}');
        return Object.entries(data).map(([name, d]) => ({
            name, current: d.current, wanted: d.wanted, latest: d.latest,
            major: d.current && d.latest ? d.current.split('.')[0] !== d.latest.split('.')[0] : null,
        }));
    } catch {
        return { error: r.stderr || 'npm outdated produced no JSON' };
    }
}

// ── output ───────────────────────────────────────────────────────────────
// NOTE: no process.exit() below, deliberately — same trap prose-lint.mjs
// records. `console.log` to a PIPE is asynchronous; process.exit() discards
// whatever has not drained, which truncated that script's --json document at
// the 8 KB pipe buffer. Falling off the end lets the event loop flush. The
// exit code is 0 regardless: nothing here ever sets a failing one.

const report = {
    generatedAt: new Date().toISOString(),
    git: gitSection(),
    pages: pagesSection(),
    ledgers: ['docs/codebase-issues.md', 'docs/content-audit.md'].map(ledgerSection),
    friction: frictionSection(),
    content: contentSection(),
};
if (withDeps) report.deps = depsSection();

if (asJson) {
    console.log(JSON.stringify(report, null, 2));
} else {
    const out = [];
    const p = (s = '') => out.push(s);
    const list = (xs, fmt = (x) => x) => (xs.length ? xs.forEach((x) => p(`    ${fmt(x)}`)) : p('    (none)'));
    const { git: g, pages: pg, friction: fr, content: ct } = report;

    p('══ controlsfreak.dev — project status ══');
    p(`generated ${report.generatedAt} · report-only, derived live from the repo\n`);

    p('══ 1. git / github ══');
    p(`  version ${g.version} · package-lock ${g.lockVersions.match ? 'in sync' : `MISMATCH (top ${g.lockVersions.top}, packages[""] ${g.lockVersions.root})`}`);
    p(`  branch ${g.branch}`);
    p(g.mainVsOrigin.error
        ? `  main vs origin/main: ${g.mainVsOrigin.error}`
        : `  main vs origin/main: ${g.mainVsOrigin.ahead} ahead, ${g.mainVsOrigin.behind} behind (local ref, not fetched)`);
    p(`  worktrees ${g.worktrees} · stashes ${g.stashes}`);
    if (g.headCommit) p(`  HEAD ${g.headCommit.date}  ${trunc(g.headCommit.summary, 80)}`);
    p(`  local branches fully merged into origin/main (cleanable): ${g.mergedBranches.length}`);
    list(g.mergedBranches);
    if (!g.github.available) {
        p(`  github: ${g.github.reason}`);
    } else {
        const prs = g.github.openPrs;
        if (Array.isArray(prs)) {
            p(`  open PRs: ${prs.length}`);
            list(prs, (x) => `#${x.number}  ${x.ageDays}d  @${x.author}  ${trunc(x.title, 80)}`);
        } else p(`  open PRs: ${prs.error}`);
        const ci = (x) => (!x ? 'no runs' : x.error ? x.error
            : `${x.conclusion || x.status} · ${x.headBranch}@${x.headSha} · ${x.ageDays}d ago · ${trunc(x.displayTitle, 60)}`);
        p(`  CI (test.yml) latest on main: ${!g.github.ciMain && !g.github.ciRunsOnPushToMain
            ? 'none — test.yml triggers on pull_request only, so main is never run directly; the PR run is the gate'
            : ci(g.github.ciMain)}`);
        p(`  CI (test.yml) latest overall: ${ci(g.github.ciLatest)}`);
    }
    p();

    p('══ 2. pages ══');
    p(`  ${pg.canonical} canonical pages of ${pg.totalHtml} .html files (outside _includes)`);
    p(`    ${Object.entries(pg.bySection).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
    p(`  canonical-less (hidden set + the 404 handler, which is LIVE): ${pg.hidden.length}`);
    list(pg.hidden, (x) => (x === '404.html' ? `${x}   ← served for every unmatched URL; not hidden` : x));
    const pj = pg.pagesJs;
    p(`  tests/pages.js: ${pj.manifest} entries vs ${pj.canonical} canonical — ${!pj.inManifestNotCanonical.length && !pj.canonicalNotInManifest.length ? 'in sync' : 'DRIFT'}`);
    if (pj.inManifestNotCanonical.length) { p('    in pages.js, no canonical page:'); list(pj.inManifestNotCanonical); }
    if (pj.canonicalNotInManifest.length) { p('    canonical page missing from pages.js:'); list(pj.canonicalNotInManifest); }
    const sq = pg.educationSequence;
    if (!sq.parsed) p('  educationSequence: could not find `const order = [ … ];` in source — parse failed');
    else {
        const ok = !sq.inOrderNoPage.length && !sq.pageNotInOrder.length && !sq.duplicates.length;
        p(`  educationSequence: ${sq.order} in order vs ${sq.educationPages} nav:education lessons — ${ok ? 'in sync' : 'DRIFT'}`);
        if (sq.inOrderNoPage.length) { p('    in order, no such lesson:'); list(sq.inOrderNoPage); }
        if (sq.pageNotInOrder.length) { p('    lesson missing from order:'); list(sq.pageNotInOrder); }
        if (sq.duplicates.length) { p('    duplicated in order:'); list(sq.duplicates); }
    }
    p();

    p('══ 3. ledgers ══');
    for (const l of report.ledgers) {
        const t = l.tally;
        p(`── ${l.file} — ${l.total} entries, max #${l.maxNumber} ──`);
        p(`  resolved ${t.resolved} · deferred ${t.deferred} · partial ${t.partial} · OPEN ${t.open} (of which ruled, fix pending ${t.openRuled}; decision-class ${t.openDecision})`);
        if (l.noStatusParenthetical.length) {
            p(`  ${l.noStatusParenthetical.length} heading(s) carry NO status parenthetical — they read OPEN by default (a shape gap, not necessarily open work):`);
            p(`    #${l.noStatusParenthetical.join(', #')}`);
        }
        p(`  open + partial (${l.open.length}):`);
        list(l.open, (x) => `#${x.n}${x.status === 'partial' ? ' [partial]' : x.ruled ? ' [ruled, fix pending]' : x.decision ? ' [decision]' : ''}  ${x.title}`);
        p(`  unclassified heading shapes (${l.unclassifiedShapes.length}) — first word outside the marker vocabulary:`);
        list(l.unclassifiedShapes, (x) => `#${x.n} (L${x.line}) "${x.firstWord}" → counted ${x.bucket}`);
        p();
    }

    p('══ 4. friction ══');
    p(`  ${fr.file}: ${fr.markers} [future:] markers · ${fr.annotated} annotated shipped · ${fr.unannotatedMarkers} unannotated across ${fr.unannotatedTargets} target(s)`);
    p(`  STALE — unannotated, but the page now exists (${fr.stale.length}):`);
    list(fr.stale, (x) => `${x.target}  → html/${x.resolved}  (L${x.lines.join(', L')})`);
    p(`  unbuilt page targets (${fr.unbuilt.length}) — the roadmap, not decay:`);
    list(fr.unbuilt, (x) => `${x.target}  (L${x.lines.join(', L')})`);
    p(`  not a page (${fr.notAPage.length}) — features, sections, placeholders:`);
    list(fr.notAPage, (x) => `${x.target || '(empty)'}  (L${x.lines.join(', L')})`);
    p('  (stale and unbuilt are different findings and are never summed)');
    p();

    p('══ 5. content ══');
    const qb = ct.quizBanks;
    p(`  quiz banks: ${qb.banks} · ${qb.totalQuestions} questions · ${qb.underTarget.length} under the ${qb.target}-question target`);
    for (const f of qb.frozen) if (f.count < qb.target) p(`    (+ ${f.slug} at ${f.count}, FROZEN — excluded from the under-target list)`);
    p(`    under-target histogram: ${Object.entries(qb.underHistogram).map(([k, v]) => `${v} at ${k}`).join(' · ') || '(none)'}`);
    list(qb.underTarget, (x) => `${x.slug} ${x.count}`);
    for (const f of qb.frozen) p(`    FROZEN: ${f.slug} (${f.count}) — must not grow; deterministic smoke walk`);
    const gl = ct.glossary;
    p(`  glossary: ${gl.entries} entries · ${gl.marksRaw} raw data-gloss marks · ${gl.marksCommentMasked} after HTML-comment masking (${gl.marksRaw - gl.marksCommentMasked} inside comments)`);
    list(gl.maskedAway, (x) => `${x.file}: ${x.inComments} in comments`);
    if (gl.unknownIdsInSource.length) p(`    ids with no glossary entry: ${gl.unknownIdsInSource.join(', ')}`);
    p(`  coming-soon candidates (${ct.comingSoon.length}) — report-only; read the sentence:`);
    list(ct.comingSoon, (x) => `${x.file}:${x.line}  ${x.text}`);
    p();

    if (report.deps) {
        p('══ 6. deps (npm outdated) ══');
        if (!Array.isArray(report.deps)) p(`  ${report.deps.error}`);
        else list(report.deps, (x) => `${x.name} ${x.current} → wanted ${x.wanted} · latest ${x.latest}${x.major ? '  [MAJOR]' : ''}`);
        p();
    }
    p('Report-only by design — exiting 0.');
    console.log(out.join('\n'));
}
