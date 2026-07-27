// Dev tool — the wiresheet layout review matrix (#205). Screenshots the
// .fbe-canvas of every shipped sheet on BOTH FBE consumer pages across
// theme × root-font × display-mode, and writes a contact-sheet
// index.html, so the owner can eyeball layout candidates in one pass
// instead of hand-driving two pages through twelve states per sheet.
//
// NOT a CI spec — same status as screenshot-diagrams.mjs / perf-profile.mjs
// (report-only tooling; a screenshot can't assert, and the geometry
// invariants already live in fbe-geometry.spec.js).
//
// Usage (needs a server on the BUILT site; never assumes :8000):
//
//   npm run build && python3 -m http.server 9452 --directory _site &
//   CF_BASE_URL=http://127.0.0.1:9452 node tests/screenshot-wiresheets.mjs [flags]
//
// Output: PNGs + index.html in a dated dir under CF_MATRIX_DIR (or /tmp):
//   <CF_MATRIX_DIR>/wiresheet-matrix-<YYYYMMDD-HHMM>/
// The contact sheet lists what THIS run produced — a trimmed run writes
// a trimmed sheet, it never merges into an earlier run's dir.
//
// The matrix (full run = 7+3 sheets × 2 themes × 2 fonts × 3 modes):
//   page/sheet   public function-block-editor × its 7 EXAMPLES;
//                ddc-workbench-fcu × each FCU_PROGRAMS key. Keys are pinned
//                here (not extracted) — a renamed example makes the run
//                fail loudly on the chip/option lookup, which is fine
//                for a review rig.
//   theme        light AND dark, both FORCED (context colorScheme +
//                cf_theme localStorage + a data-theme stamp before
//                paint) — never inherited from the headless default.
//   root font    16 and 20 px via addInitScript, in force before the
//                page's inline script runs — renderAll() measures
//                blockW from the first rendered block (#208), so a
//                late font flip would shoot a half-migrated layout.
//   mode         normal    — in-flow card at 1280×800;
//                fs        — fullscreen via a REAL click on the
//                            .tool-card-fullscreen-btn, 1280×800;
//                fs-wide   — same, 1456×900. Two fullscreen widths
//                            because the wide-canvas "fits fullscreen"
//                            claim only holds above ~1238px viewport —
//                            1280 is just over the line, 1456 is
//                            comfortably in.
//   reducedMotion 'reduce' on every context, so the marching-dash wire
//                animation can't smear a frame.
//
// Flags (all optional, combinable):
//   --page=public|workbench   one consumer page only (aliases accepted:
//                             function-block-editor / fbe, ddc-workbench-fcu / ddcw)
//   --sheet=a,b,c             only these sheet keys (matched on either page)
//   --only-defective          the five formerly-defective public sheets
//                             (freeze / econ / tstat-cool / tstat-heat /
//                             reset — the STUB=10 retune's fix set plus
//                             freeze's shipped no-burial defect) + proof.
//                             Proof rides along because its 5-segment
//                             fallback is DELIBERATE (see the layout
//                             comment in function-block-editor.html) —
//                             it is in the matrix so a relayout can be
//                             checked for NOT "fixing" it. Workbench
//                             sheets are excluded; combine with
//                             --page=workbench if you want those alone.
//   --theme=dark              trim the theme axis (comma-separable)
//   --font=16                 trim the root-font axis
//   --mode=normal,fs          trim the mode axis
//
// Headless traps honored here: colorScheme forced per context (headless
// Chromium defaults to light), --font-render-hinting=slight at launch
// (glyph-advance quantization otherwise diverges from what the owner
// sees headed).

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.CF_BASE_URL || 'http://localhost:8000';
const OUT_ROOT = process.env.CF_MATRIX_DIR || '/tmp';

// ── the matrix ───────────────────────────────────────────────────────

const PAGES = {
    'public': {
        path: '/simulators/function-block-editor.html',
        canvas: '#fbe-canvas',
        inner: '#fbe-inner',
        aliases: ['public', 'function-block-editor', 'fbe'],
        // EXAMPLES keys, in on-page chip order (function-block-editor.html).
        sheets: ['freeze', 'econ', 'tstat-cool', 'tstat-heat', 'pid', 'proof', 'reset'],
        async loadSheet(page, key) {
            await page.click('[data-example="' + key + '"]');
        },
    },
    'workbench': {
        path: '/simulators/ddc-workbench-fcu.html',
        canvas: '#ddcw-fbe-canvas',
        inner: '#ddcw-fbe-inner',
        aliases: ['workbench', 'ddc-workbench-fcu', 'ddcw'],
        // FCU_PROGRAMS keys (ddc-workbench-fcu.html).
        sheets: ['cool-2stage', 'cool-1stage', 'cool-2stage-fanon'],
        async loadSheet(page, key) {
            // The editor lazy-mounts on first Wiresheet open …
            await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
            await page.waitForSelector('#ddcw-fbe-inner .fbe-block', { state: 'visible' });
            // … then the program picker listens for change ('custom' is
            // refused; sample keys load synchronously).
            await page.evaluate((k) => {
                const sel = document.getElementById('ddcw-program');
                sel.value = k;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }, key);
        },
    },
};

const ONLY_DEFECTIVE = ['freeze', 'econ', 'tstat-cool', 'tstat-heat', 'reset', 'proof'];

const MODES = {
    'normal':  { viewport: { width: 1280, height: 800 }, fullscreen: false },
    'fs':      { viewport: { width: 1280, height: 800 }, fullscreen: true },
    'fs-wide': { viewport: { width: 1456, height: 900 }, fullscreen: true },
};

const ALL_THEMES = ['light', 'dark'];
const ALL_FONTS = [16, 20];

// ── flags ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flagVal(name) {
    const p = '--' + name + '=';
    const hit = args.find((a) => a.startsWith(p));
    return hit ? hit.slice(p.length) : null;
}
function listFlag(name, all, parse) {
    const raw = flagVal(name);
    if (!raw) return all;
    const want = raw.split(',').map((s) => (parse ? parse(s.trim()) : s.trim()));
    for (const w of want) {
        if (!all.includes(w)) {
            throw new Error('--' + name + '=' + raw + ': "' + w + '" is not one of ' + all.join(', '));
        }
    }
    return want;
}

function resolvePages() {
    const raw = flagVal('page');
    if (!raw) return Object.keys(PAGES);
    const key = Object.keys(PAGES).find((k) => PAGES[k].aliases.includes(raw));
    if (!key) throw new Error('--page=' + raw + ': expected one of public / workbench (or an alias)');
    return [key];
}

function resolveSheets(pageKey) {
    let sheets = PAGES[pageKey].sheets;
    if (args.includes('--only-defective')) {
        sheets = sheets.filter((s) => ONLY_DEFECTIVE.includes(s));
    }
    const raw = flagVal('sheet');
    if (raw) {
        const want = raw.split(',').map((s) => s.trim());
        sheets = sheets.filter((s) => want.includes(s));
    }
    return sheets;
}

// ── capture ──────────────────────────────────────────────────────────

async function shoot(browser, outDir, pageKey, sheet, theme, font, modeKey) {
    const surface = PAGES[pageKey];
    const mode = MODES[modeKey];
    const ctx = await browser.newContext({
        viewport: mode.viewport,
        colorScheme: theme,               // forced — headless defaults to light
        reducedMotion: 'reduce',          // stable wire frames
    });
    // Theme + root font must both be in force BEFORE the page's inline
    // script runs: the head bootstrap stamps data-theme pre-paint from
    // cf_theme, and renderAll() measures blockW off the first rendered
    // block (#208), so a post-load font flip would shoot stale geometry.
    await ctx.addInitScript(({ th, f }) => {
        try { localStorage.setItem('cf_theme', th); } catch (e) { /* opaque origin */ }
        const apply = () => {
            if (!document.documentElement) return false;
            document.documentElement.setAttribute('data-theme', th);
            document.documentElement.style.fontSize = f + 'px';
            return true;
        };
        if (!apply()) {
            new MutationObserver((muts, obs) => {
                if (apply()) obs.disconnect();
            }).observe(document, { childList: true });
        }
    }, { th: theme, f: font });

    const page = await ctx.newPage();
    try {
        await page.goto(BASE + surface.path, { waitUntil: 'domcontentloaded' });
        await surface.loadSheet(page, sheet);
        // Loud failure over a plausible-looking empty canvas: a renamed
        // key or a refused program select would otherwise shoot blank.
        await page.waitForSelector(surface.inner + ' .fbe-block', { state: 'visible' });
        await page.waitForSelector(surface.inner + ' path.fbe-wire', { state: 'attached' });

        if (mode.fullscreen) {
            // A REAL click on the card's fullscreen button — the toggle
            // dispatches the 'fullscreenchange' the pages relayout on.
            await page.click('.tool-card-fullscreen-btn');
            await page.waitForSelector('.tool-card.is-fullscreen');
            // Two rAFs: let the fullscreenchange handler regrow
            // INNER_W/H and re-render before the shot.
            await page.evaluate(() => new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r))));
        }

        const name = [pageKey, sheet, theme, 'f' + font, modeKey].join('--') + '.png';
        const out = join(outDir, name);
        await page.locator(surface.canvas).screenshot({ path: out, animations: 'disabled' });
        console.log(out);
        return name;
    } finally {
        await ctx.close();
    }
}

// ── contact sheet ────────────────────────────────────────────────────

function contactSheet(shots, meta) {
    const groups = new Map();   // "page / sheet" → [shot]
    for (const s of shots) {
        const g = s.pageKey + ' / ' + s.sheet;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(s);
    }
    let body = '';
    for (const [g, list] of groups) {
        body += '    <h2>' + g + '</h2>\n    <div class="row">\n';
        for (const s of list) {
            const cap = s.theme + ' · F=' + s.font + ' · ' + s.modeKey;
            body += '        <figure><a href="' + s.file + '"><img src="' + s.file
                + '" loading="lazy" alt="' + g + ' — ' + cap + '"></a>'
                + '<figcaption>' + cap + '</figcaption></figure>\n';
        }
        body += '    </div>\n';
    }
    return '<!doctype html>\n<meta charset="utf-8">\n'
        + '<title>Wiresheet layout matrix — ' + meta.stamp + '</title>\n'
        + '<style>\n'
        + '    body { background: #14181d; color: #cfd8e3; font: 14px/1.45 system-ui, sans-serif; margin: 1.5rem; }\n'
        + '    h1 { font-size: 1.15rem; } h2 { font-size: 0.95rem; margin: 1.6rem 0 0.4rem; color: #8fb8a0; }\n'
        + '    p.meta { color: #7d8894; }\n'
        + '    .row { display: flex; flex-wrap: wrap; gap: 0.75rem; }\n'
        + '    figure { margin: 0; }\n'
        + '    figure img { max-width: 320px; display: block; border: 1px solid #333c46; }\n'
        + '    figcaption { color: #7d8894; font-size: 12px; padding-top: 2px; }\n'
        + '</style>\n'
        + '<h1>Wiresheet layout matrix (#205)</h1>\n'
        + '<p class="meta">' + meta.stamp + ' · base ' + meta.base + ' · ' + shots.length
        + ' shots · click any image for full size. proof’s 5-segment fallback is deliberate — do not flag it.</p>\n'
        + body;
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
    // Fail fast with a useful message, same as screenshot-diagrams.mjs.
    const probe = await fetch(BASE + '/simulators/function-block-editor.html')
        .catch(() => null);
    if (!probe || !probe.ok) {
        throw new Error('cannot reach ' + BASE + ' — is a server running on the built site?');
    }

    const themes = listFlag('theme', ALL_THEMES);
    const fonts = listFlag('font', ALL_FONTS, (s) => parseInt(s, 10));
    const modes = listFlag('mode', Object.keys(MODES));
    let pageKeys = resolvePages();
    if (args.includes('--only-defective') && !flagVal('page')) {
        pageKeys = pageKeys.filter((k) => k !== 'workbench');
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate())
        + '-' + pad(now.getHours()) + pad(now.getMinutes());
    const outDir = join(OUT_ROOT, 'wiresheet-matrix-' + stamp);
    await mkdir(outDir, { recursive: true });

    const browser = await chromium.launch({ args: ['--font-render-hinting=slight'] });
    const shots = [];
    try {
        for (const pageKey of pageKeys) {
            for (const sheet of resolveSheets(pageKey)) {
                for (const theme of themes) {
                    for (const font of fonts) {
                        for (const modeKey of modes) {
                            const file = await shoot(browser, outDir, pageKey, sheet, theme, font, modeKey);
                            shots.push({ pageKey, sheet, theme, font, modeKey, file });
                        }
                    }
                }
            }
        }
    } finally {
        await browser.close();
    }

    if (shots.length === 0) {
        throw new Error('flag combination selected zero shots — nothing captured');
    }
    const index = join(outDir, 'index.html');
    await writeFile(index, contactSheet(shots, { stamp, base: BASE }));
    console.log(index);
    console.log('\nsaved ' + shots.length + ' shot' + (shots.length === 1 ? '' : 's')
        + ' → ' + outDir);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
