// Dev tool — the wiresheet layout review matrix (#205). Screenshots the
// WHOLE .fbe-canvas of every shipped sheet on BOTH FBE consumer pages
// across theme × root-font × display-mode, and writes a contact-sheet
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
//   full sheet   every shot is the WHOLE sheet, not the on-screen crop.
//                .fbe-canvas is a scroll container, so an unprepared
//                element screenshot silently drops everything past the
//                scroll fold (#223) — measured on the workbench's
//                cool-2stage-safeties at 1280×800 / F=16 / normal, that
//                was 563 px of a 1401 px sheet and 16 whole blocks.
//                unclipForShot() below grows the shot target to the
//                content bounds first, and the contact-sheet caption
//                carries the crop that WOULD have applied — so the
//                fs / fs-wide "does the wide canvas fit?" question is
//                answered by a number instead of by whether the picture
//                happens to look cut off. Of the 66 combinations
//                measured while writing this, all but one lost
//                something (workbench / cool-1stage · dark · F=20 ·
//                fs-wide is the one that fits).
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
        sheets: ['cool-2stage', 'cool-1stage', 'cool-2stage-fanon', 'cool-2stage-safeties'],
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

// Grow the shot target to the whole sheet. Runs IN THE PAGE
// (page.evaluate), so it must stay self-contained — no closures.
//
// .fbe-canvas is a SCROLL container (overflow:auto on a fixed height),
// so a plain element screenshot of it captures the client box and
// silently drops whatever is scrolled out of view (#223). Three things
// have to give way, in this order — each was measured, and each has a
// failure mode that looks like a page bug rather than a rig bug:
//
//   1. MEASURE FIRST, while the container is still clipped.
//      scrollWidth / scrollHeight are the honest content extent: they
//      include absolutely-positioned blocks that stick out past
//      .fbe-canvas-inner. That matters in fullscreen, where the inner
//      is height:100% of the canvas and the bottom row of a tall sheet
//      lives OUTSIDE it — so the inner's own box is not the sheet.
//   2. UN-CLIP THE CONTAINER AND EVERY ANCESTOR. .tool-card is
//      overflow:hidden AND carries the finished fadeUp transform, which
//      makes it a containing block that clips even a position:fixed
//      descendant; body picks up overflow:hidden while a card is
//      fullscreen. Walking to <html> covers all of it in one rule.
//      This step is INVISIBLE to a getBoundingClientRect probe — layout
//      boxes do not know they are being paint-clipped — which is why
//      shotBoxDefects() below re-reads the ancestors' computed overflow
//      rather than trusting node rects alone.
//   3. HIDE THE STICKY / FIXED PAGE CHROME. .site-nav is sticky at
//      z-index 100 and <main> is a z-index:1 stacking context, so once
//      Playwright scrolls the grown canvas into view the nav paints
//      over its top band (measured: 76 px at a 20 px root font, in
//      `normal` mode — a whole row of blocks). No z-index on the canvas
//      can beat that from inside main, so hide the chrome instead.
//      visibility:hidden, not display:none: it must not reflow the
//      layout being photographed. Ancestors and descendants of the
//      canvas are skipped — in fullscreen .tool-card.is-fullscreen is
//      itself fixed, and visibility inherits.
//
// Nothing is restored; the context is thrown away after the shot.
//
// Returns { shot, clipped } — the CSS box the PNG will be cut from, and
// how much of it was off-screen before. (The PNG can come out 1 px
// larger on a fractional box: Playwright rounds out to the enclosing
// integer rect.) The contact sheet prints `clipped`, which is what
// keeps the fs / fs-wide fit question answerable now that every shot
// shows the whole sheet.
function unclipForShot(sel) {
    const el = document.querySelector(sel);
    const cs = getComputedStyle(el);
    const borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const clipped = {
        x: Math.max(0, el.scrollWidth - el.clientWidth),
        y: Math.max(0, el.scrollHeight - el.clientHeight),
    };
    const shot = { w: el.scrollWidth + borderX, h: el.scrollHeight + borderY };

    for (let p = el.parentElement; p; p = p.parentElement) {
        p.style.overflow = 'visible';
    }
    for (const n of document.querySelectorAll('body *')) {
        if (n === el || n.contains(el) || el.contains(n)) continue;
        const pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'sticky') n.style.visibility = 'hidden';
    }
    el.scrollLeft = 0;
    el.scrollTop = 0;
    el.style.overflow = 'visible';
    el.style.width = shot.w + 'px';
    el.style.height = shot.h + 'px';
    return { shot, clipped };
}

// What unclipForShot() has to have achieved, checked two independent
// ways because neither one alone can see the whole defect:
//
//   outside  — nodes whose LAYOUT BOX falls outside the shot box: every
//              .fbe-block plus the SVG wire layer, which is sized to the
//              full canvas coordinate space and is therefore the
//              strictest single node. Catches a size write that did not
//              land (the frame-wait race).
//   clipping — ancestors still computing a non-visible overflow. This is
//              the one that matters: rects are blind to paint clipping,
//              so deleting the ancestor walk above leaves `outside` at 0
//              while the PNG is visibly cut at the .tool-card edge.
//
// Also runs IN THE PAGE, so it takes ONE packed argument (page.evaluate
// passes a single serializable value) and closes over nothing.
function shotBoxDefects(sels) {
    const el = document.querySelector(sels[0]);
    const box = el.getBoundingClientRect();
    const inner = document.querySelector(sels[1]);
    const nodes = Array.from(inner.querySelectorAll('.fbe-block'));
    const svg = inner.querySelector('svg');
    if (svg) nodes.push(svg);
    const outside = nodes.filter((n) => {
        const r = n.getBoundingClientRect();
        return r.left < box.left - 0.5 || r.top < box.top - 0.5
            || r.right > box.right + 0.5 || r.bottom > box.bottom + 0.5;
    }).length;
    let clipping = 0;
    for (let p = el.parentElement; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') clipping += 1;
    }
    return { outside: outside, clipping: clipping };
}

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

        // Grow the scroll container to the whole sheet before the shot.
        const { shot, clipped } = await page.evaluate(unclipForShot, surface.canvas);
        // Two rAFs, same as the fullscreen transition above — and for a
        // sharper reason. reducedMotion 'reduce' turns on the styles.css
        // kill switch, which sets `transition-duration: 0.01ms !important`
        // on `*`; with the initial `transition-property: all` that makes
        // EVERY inline style write a real transition, so the new size is
        // not readable (and the box not repainted) until a frame ticks.
        // Measured: without this wait the canvas reports its OLD height
        // straight after the write, and the guard below fires spuriously.
        const settle = () => page.evaluate(() => new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r))));
        await settle();
        // Loud failure over a plausible-looking crop — the same posture as
        // the empty-canvas guard above. #223 was invisible precisely
        // because a cropped sheet still looks like a sheet. `clipping`
        // is the half that can actually see a crop; `outside` catches a
        // size write that never landed. That one is a TIMING race, so
        // give it a second frame before throwing away a ten-minute run.
        let defects = await page.evaluate(shotBoxDefects, [surface.canvas, surface.inner]);
        if (defects.outside > 0 || defects.clipping > 0) {
            await settle();
            defects = await page.evaluate(shotBoxDefects, [surface.canvas, surface.inner]);
        }
        if (defects.outside > 0 || defects.clipping > 0) {
            throw new Error([pageKey, sheet, theme, 'f' + font, modeKey].join('/')
                + ': after un-clipping, ' + defects.outside + ' node(s) still outside '
                + 'the shot box and ' + defects.clipping + ' ancestor(s) still clipping '
                + '— the matrix would be cropped (#223)');
        }

        const name = [pageKey, sheet, theme, 'f' + font, modeKey].join('--') + '.png';
        const out = join(outDir, name);
        await page.locator(surface.canvas).screenshot({ path: out, animations: 'disabled' });
        console.log(out);
        return { name, shot, clipped };
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
            // Every shot is the whole sheet now, so "does the wide canvas
            // fit at this width?" can no longer be read off the picture —
            // the caption answers it instead, and answers it in pixels.
            // The size is the CSS box; the PNG may be a pixel larger where
            // that box is fractional.
            const fit = s.clipped.x || s.clipped.y
                ? 'off-screen ' + s.clipped.x + '×' + s.clipped.y
                : 'fits';
            const cap = s.theme + ' · F=' + s.font + ' · ' + s.modeKey
                + ' · ' + s.shot.w + '×' + s.shot.h + ' · ' + fit;
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
        + '    figure img { max-width: 460px; display: block; border: 1px solid #333c46; }\n'
        + '    figcaption { color: #7d8894; font-size: 12px; padding-top: 2px; }\n'
        + '</style>\n'
        + '<h1>Wiresheet layout matrix (#205)</h1>\n'
        + '<p class="meta">' + meta.stamp + ' · base ' + meta.base + ' · ' + shots.length
        + ' shots · click any image for full size. Each shot is the WHOLE sheet, not the'
        + ' on-screen crop (#223) — the caption’s “off-screen” figure is how much of it a'
        + ' visitor would have had to scroll for. proof’s 5-segment fallback is deliberate'
        + ' — do not flag it.</p>\n'
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
                            const cap = await shoot(browser, outDir, pageKey, sheet, theme, font, modeKey);
                            shots.push({ pageKey, sheet, theme, font, modeKey,
                                file: cap.name, shot: cap.shot, clipped: cap.clipped });
                        }
                    }
                }
            }
        }
    } finally {
        await browser.close();
        // Write the sheet even on a mid-run throw. A full run is ~10
        // minutes and the #223 guard can abort it; orphaning every PNG
        // captured up to that point with no index to read them by would
        // make the loud failure cost more than the bug it catches.
        if (shots.length > 0) {
            const index = join(outDir, 'index.html');
            await writeFile(index, contactSheet(shots, { stamp, base: BASE }));
            console.log(index);
            console.log('\nsaved ' + shots.length + ' shot' + (shots.length === 1 ? '' : 's')
                + ' → ' + outDir);
        }
    }

    if (shots.length === 0) {
        throw new Error('flag combination selected zero shots — nothing captured');
    }
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
