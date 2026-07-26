// Wiresheet PLACEMENT invariants over both FBE consumer pages —
// /simulators/function-block-editor.html (public) and
// /simulators/ddc-workbench.html (hidden) — #205 / #206 / #208.
//
// ⚠ STATUS (measured 2026-07-26, STUB = 10): this spec is the
// placement harness for the wiresheet-relayout lane and joins CI only
// with the relayout merge.
//   - WORKBENCH: EXPECTED RED at today's FCU_PROGRAMS coordinates.
//     The 145–150 px column pitch leaves adjacent-column wires only
//     9.4–14.4 px of pin-to-pin margin (< 2·STUB), so they route the
//     5-segment fallback and bury; the space-temp fan-out and the
//     sr1↔sr2 cross-wires bury through intermediate blocks even when
//     routed forward. Margin ≥ 24 px needs column pitch ≥ 160 px at a
//     16 px root font (margin = pitch − 135.6).
//   - PUBLIC: fully GREEN on all seven sheets — forward-routing +
//     margin are the #205 routing verification at STUB = 10 (proof
//     stays on the fallback by design, self-verified below), and the
//     three shipped authored-coordinate burials — freeze
//     (latch.Q→alarm.IN behind INV), tstat-cool and tstat-heat
//     (temp.O→under.A behind HI, clipping LO) — were cleared by
//     coordinate nudges in this lane (inv → the fz/fan top row; temp →
//     atop the hi/lo column with hi dropped to y 120).
//
// Two layers:
//
//   A. Pure Node — regex-extract the shipped literals (EXAMPLES,
//      FCU_PROGRAMS), the REAL wirePath() routing function and the
//      STUB const from source and evaluate them in a vm (loader
//      precedent: fbe-engine.spec.js loadLiteral; the literals close
//      at 8-space depth). Asserts the authored coordinates fit the
//      canvas, and pins that the extracted router still switches at
//      the 2·STUB threshold (so layer B's expectations can't drift
//      from the code they mirror).
//
//   B. Browser-measured — the AUTHORITATIVE layer. Block height and
//      pin-dot positions are rem-derived, so only a rendered page
//      knows the real geometry. Drives both pages (public: click each
//      [data-example] chip; workbench: open the Wiresheet tab to
//      lazy-mount the editor, then select each program and dispatch
//      change), collects block rects + rendered wire `d` attributes +
//      pin-dot centers, and asserts per sheet:
//        (i)   NO-BURIAL — no H/V wire segment crosses a NON-ENDPOINT
//              block's interior (rects shrunk 0.5 px to forgive
//              subpixel touching);
//        (ii)  FORWARD-BRANCH — every wire routes as the clean
//              3-segment forward elbow, except sheets listed in
//              FALLBACK_BY_DESIGN. The allowlist is SELF-VERIFYING:
//              an allowlisted sheet must still HAVE ≥1 fallback wire,
//              so re-laying it to route fully forward forces the
//              exemption's deletion instead of decaying into a silent
//              permanent pass;
//        (iii) RELATIONSHIP MARGIN — every forward-expected wire's
//              in-pin center sits ≥ 2·STUB + 4 px right of its
//              out-pin center (STUB read from fbe-editor.js source,
//              never hard-coded — a threshold retune re-scopes the
//              assertion automatically);
//        (iv)  F=20 px root-font drag clamp — a block dragged hard
//              right stays inside the canvas, pinning the
//              measured-blockW fix (#208; the old BLOCK_W=136 const
//              let a 170 px block overhang the right edge by 34 px).
//
// Headless traps: colorScheme is forced (headless Chromium defaults
// to light). No text measurement here — all assertions compare
// same-render CSS-box geometry — so the font-hinting flag isn't
// needed.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

test.use({ colorScheme: 'dark' });

// ── source extraction (shared by both layers) ───────────────────────

const EDITOR_SRC = fs.readFileSync(
    path.join(__dirname, '..', 'html', 'scripts', 'fbe-editor.js'), 'utf8');

// The forward-route threshold stub, read from the shipped source so a
// retune re-scopes every geometry assertion in this file.
function extractStub() {
    const m = EDITOR_SRC.match(/const STUB = (\d+(?:\.\d+)?);/);
    if (!m) throw new Error('STUB const not found in fbe-editor.js');
    return Number(m[1]);
}
const STUB = extractStub();

// The REAL router, not a re-derivation: wirePath() sits at 8-space
// depth inside createEditor; evaluate it with the extracted STUB.
function extractWirePath() {
    const m = EDITOR_SRC.match(/function wirePath\(a, b\) \{[\s\S]*?\n {8}\}/);
    if (!m) throw new Error('wirePath function not found in fbe-editor.js');
    return vm.runInNewContext(
        'const STUB = ' + STUB + ';\n' + m[0] + '\n; wirePath;', {});
}

// Literal loader — same shape as fbe-engine.spec.js loadLiteral: both
// registries sit at 8-space depth and the first `};` back at that
// depth closes them.
function loadLiteral(fileRelPath, literalName) {
    const src = fs.readFileSync(path.join(__dirname, '..', fileRelPath), 'utf8');
    const m = src.match(
        new RegExp('const ' + literalName + ' = \\{[\\s\\S]*?\\n {8}\\};'));
    if (!m) {
        throw new Error(literalName + ' literal not found in ' + fileRelPath);
    }
    return vm.runInNewContext(m[0] + '\n' + literalName + ';', {});
}

// The two consumer surfaces. Canvas bounds: both editors mount at the
// 900×480 default today (neither page passes canvasSize); the
// relayout lane updates the workbench entry when its canvas grows.
const SURFACES = {
    'function-block-editor': {
        file: 'html/simulators/function-block-editor.html',
        literal: 'EXAMPLES',
        canvas: { w: 900, h: 480 },
    },
    'ddc-workbench': {
        file: 'html/simulators/ddc-workbench.html',
        literal: 'FCU_PROGRAMS',
        canvas: { w: 900, h: 480 },
    },
};
const REGISTRIES = {};
for (const [key, s] of Object.entries(SURFACES)) {
    REGISTRIES[key] = loadLiteral(s.file, s.literal);
}

// Sheets whose 5-segment fallback routing is DELIBERATE. The public
// 'proof' example alternates its chain between the top and bottom
// rows at tight x-pitch so every link draws a long visible vertical
// run — see the layout comment at function-block-editor.html:287-292.
// Never "fix" that sheet to route forward; if the relayout lane ever
// re-lays it anyway, the self-verification assertion below forces
// this entry's deletion.
const FALLBACK_BY_DESIGN = {
    'function-block-editor': { proof: '*' },
};

// ── path parsing + collision math (pure functions) ──────────────────

// wirePath emits only 'M x y' followed by alternating 'H x' / 'V y'.
// Returns [{ dir:'h', y, x1, x2 } | { dir:'v', x, y1, y2 }].
function parseSegments(d) {
    const tok = d.trim().split(/\s+/);
    if (tok[0] !== 'M') throw new Error('unexpected wire path: ' + d);
    let x = parseFloat(tok[1]);
    let y = parseFloat(tok[2]);
    const segs = [];
    for (let i = 3; i < tok.length; i += 2) {
        const v = parseFloat(tok[i + 1]);
        if (tok[i] === 'H')      { segs.push({ dir: 'h', y, x1: x, x2: v }); x = v; }
        else if (tok[i] === 'V') { segs.push({ dir: 'v', x, y1: y, y2: v }); y = v; }
        else throw new Error("unexpected command '" + tok[i] + "' in: " + d);
    }
    return segs;
}

// Does an axis-aligned segment cross a block's interior? Rects are
// shrunk 0.5 px per side so a wire that merely grazes an edge (the
// pin-dot centers sit a fraction of a px inside the block edge at a
// 16 px root font) doesn't count as burial.
function segmentEntersRect(seg, rect) {
    const l = rect.left + 0.5, r = rect.right - 0.5;
    const t = rect.top + 0.5, b = rect.bottom - 0.5;
    if (seg.dir === 'h') {
        if (seg.y <= t || seg.y >= b) return false;
        const lo = Math.min(seg.x1, seg.x2), hi = Math.max(seg.x1, seg.x2);
        return Math.max(lo, l) < Math.min(hi, r);
    }
    if (seg.x <= l || seg.x >= r) return false;
    const lo = Math.min(seg.y1, seg.y2), hi = Math.max(seg.y1, seg.y2);
    return Math.max(lo, t) < Math.min(hi, b);
}

function fmtSeg(seg) {
    return seg.dir === 'h'
        ? 'H y=' + seg.y.toFixed(1) + ' x ' + seg.x1.toFixed(1) + '→' + seg.x2.toFixed(1)
        : 'V x=' + seg.x.toFixed(1) + ' y ' + seg.y1.toFixed(1) + '→' + seg.y2.toFixed(1);
}

function fmtRect(r) {
    return r.left.toFixed(0) + ',' + r.top.toFixed(0) + '…'
        + r.right.toFixed(0) + ',' + r.bottom.toFixed(0);
}

// Violation census for one measured sheet. Kept a pure function of
// the measurement so a red run prints the exact wire/block pairs.
function sheetViolations(meas, allowFallback) {
    const v = { burials: [], nonForward: [], margins: [], fallbackCount: 0 };
    meas.wires.forEach((w) => {
        const label = w.from.join('.') + ' → ' + w.to.join('.');
        const segs = parseSegments(w.d);
        if (segs.length > 3) v.fallbackCount++;
        // (i) no-burial — applies to every sheet, allowlisted or not.
        segs.forEach((seg) => {
            for (const [id, rect] of Object.entries(meas.blocks)) {
                if (id === w.from[0] || id === w.to[0]) continue;
                if (segmentEntersRect(seg, rect)) {
                    v.burials.push(label + ': ' + fmtSeg(seg)
                        + ' buried in block "' + id + '" [' + fmtRect(rect) + ']');
                }
            }
        });
        if (!allowFallback) {
            // (ii) forward-branch everywhere.
            if (segs.length !== 3) {
                v.nonForward.push(label + ': ' + segs.length
                    + '-segment fallback (in-pin only '
                    + (w.in.x - w.out.x).toFixed(1) + ' px right of out-pin; '
                    + 'forward needs ≥ ' + (2 * STUB) + ')');
            }
            // (iii) relationship margin, 4 px past the router threshold.
            const margin = w.in.x - w.out.x;
            if (margin < 2 * STUB + 4) {
                v.margins.push(label + ': margin ' + margin.toFixed(1)
                    + ' px < ' + (2 * STUB + 4) + ' (2·STUB + 4)');
            }
        }
    });
    return v;
}

// ── browser measurement ─────────────────────────────────────────────

// Collect block rects, pin-dot centers and rendered wire `d`s for the
// CURRENT sheet, all in canvas-inner coordinates. Wires are passed in
// from the extracted literal: renderAll() appends one path pair per
// graph.wires entry in order and makeGraph preserves wire order, so
// the Nth path.fbe-wire is the literal's Nth wire.
function measureSheet(page, innerSel, wires) {
    return page.evaluate(({ innerSel, wires }) => {
        const inner = document.querySelector(innerSel);
        const base = inner.getBoundingClientRect();
        const blocks = {};
        inner.querySelectorAll('.fbe-block').forEach((el) => {
            const r = el.getBoundingClientRect();
            blocks[el.dataset.id] = {
                left: r.left - base.left,
                top: r.top - base.top,
                right: r.right - base.left,
                bottom: r.bottom - base.top,
            };
        });
        const pinCenter = (blockId, pin, dir) => {
            const blk = inner.querySelector('.fbe-block[data-id="' + blockId + '"]');
            const dot = blk && blk.querySelector(
                '.fbe-pin-' + dir + '[data-pin="' + pin + '"] .fbe-pin-dot');
            if (!dot) return null;
            const r = dot.getBoundingClientRect();
            return {
                x: r.left + r.width / 2 - base.left,
                y: r.top + r.height / 2 - base.top,
            };
        };
        const ds = Array.from(inner.querySelectorAll('path.fbe-wire'))
            .map((p) => p.getAttribute('d'));
        return {
            blocks,
            wires: wires.map((w, i) => ({
                from: w.from,
                to: w.to,
                out: pinCenter(w.from[0], w.from[1], 'out'),
                in: pinCenter(w.to[0], w.to[1], 'in'),
                d: ds[i],
            })),
        };
    }, { innerSel, wires });
}

function assertSheet(pageKey, sheetName, meas) {
    // Measurement sanity before geometry claims: every wire resolved
    // its pins and a rendered path.
    meas.wires.forEach((w) => {
        const label = sheetName + ': ' + w.from.join('.') + ' → ' + w.to.join('.');
        expect(w.out, label + ' (out pin not found)').toBeTruthy();
        expect(w.in, label + ' (in pin not found)').toBeTruthy();
        expect(w.d, label + ' (no rendered path)').toBeTruthy();
    });
    const allow = (FALLBACK_BY_DESIGN[pageKey] || {})[sheetName] === '*';
    const v = sheetViolations(meas, allow);
    expect(v.burials, sheetName + ': buried wire segments').toEqual([]);
    if (allow) {
        // Self-verification: an allowlisted sheet must still exercise
        // the fallback router. If this fires, the sheet was re-laid to
        // route fully forward — DELETE its FALLBACK_BY_DESIGN entry.
        expect(v.fallbackCount,
            sheetName + ': allowlisted as fallback-by-design but has no '
            + 'fallback wires — delete its FALLBACK_BY_DESIGN entry').toBeGreaterThan(0);
    } else {
        expect(v.nonForward, sheetName + ': wires on the 5-segment fallback').toEqual([]);
        expect(v.margins, sheetName + ': forward margin below 2·STUB + 4').toEqual([]);
    }
}

// ── Layer A: pure-Node source checks ────────────────────────────────

test.describe('fbe-geometry: layer A — source extraction (pure Node)', () => {

    test('extracted wirePath switches routes exactly at the 2·STUB threshold', () => {
        const wirePath = extractWirePath();
        const fwd = parseSegments(wirePath({ x: 0, y: 0 }, { x: 2 * STUB, y: 50 }));
        const back = parseSegments(wirePath({ x: 0, y: 0 }, { x: 2 * STUB - 1, y: 50 }));
        expect(fwd.length, 'at threshold: 3-segment forward elbow').toBe(3);
        expect(back.length, 'below threshold: 5-segment fallback').toBe(5);
    });

    for (const [pageKey, surface] of Object.entries(SURFACES)) {
        test(pageKey + ': every authored block coordinate fits the canvas', () => {
            const { w, h } = surface.canvas;
            for (const [name, def] of Object.entries(REGISTRIES[pageKey])) {
                def.blocks.forEach((b) => {
                    // Same clamp the editor drags against: w − 136 (the
                    // 8.5rem block width at a 16 px root font) by h − 40.
                    expect(b.x, name + ': ' + b.id + ' x').toBeGreaterThanOrEqual(0);
                    expect(b.x, name + ': ' + b.id + ' x').toBeLessThanOrEqual(w - 136);
                    expect(b.y, name + ': ' + b.id + ' y').toBeGreaterThanOrEqual(0);
                    expect(b.y, name + ': ' + b.id + ' y').toBeLessThanOrEqual(h - 40);
                });
            }
        });
    }
});

// ── Layer B: browser-measured placement invariants ──────────────────

test.describe('fbe-geometry: layer B — public sim page (GREEN = #205 verified)', () => {

    for (const key of Object.keys(REGISTRIES['function-block-editor'])) {
        test('sheet "' + key + '": no burial, forward routing, margins', async ({ page }) => {
            const def = REGISTRIES['function-block-editor'][key];
            await page.goto('/simulators/function-block-editor.html');
            await page.click('[data-example="' + key + '"]');
            await expect(page.locator('path.fbe-wire')).toHaveCount(def.wires.length);
            const meas = await measureSheet(page, '#fbe-inner', def.wires);
            assertSheet('function-block-editor', key, meas);
        });
    }
});

test.describe('fbe-geometry: layer B — ddc-workbench (EXPECTED RED until relayout)', () => {

    for (const key of Object.keys(REGISTRIES['ddc-workbench'])) {
        test('program "' + key + '": no burial, forward routing, margins', async ({ page }) => {
            const def = REGISTRIES['ddc-workbench'][key];
            await page.goto('/simulators/ddc-workbench.html');
            // The editor lazy-mounts on first Wiresheet open …
            await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
            await expect(page.locator('#ddcw-fbe-inner .fbe-block').first()).toBeVisible();
            // … then select the program under test (the page listens for
            // change on the picker; 'custom' is refused, sample keys load).
            await page.evaluate((k) => {
                const sel = document.getElementById('ddcw-program');
                sel.value = k;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }, key);
            await expect(page.locator('#ddcw-fbe-inner path.fbe-wire'))
                .toHaveCount(def.wires.length);
            const meas = await measureSheet(page, '#ddcw-fbe-inner', def.wires);
            assertSheet('ddc-workbench', key, meas);
        });
    }
});

test.describe('fbe-geometry: layer B — drag clamp at a 20 px root font (#208)', () => {

    test('a block dragged hard right stays inside the canvas', async ({ page }) => {
        // Wide viewport = enough runway for a single 2000+ px drag.
        await page.setViewportSize({ width: 2400, height: 900 });
        // Set the root font BEFORE the page's inline script runs —
        // renderAll() measures blockW from the first rendered block, so
        // the 20 px font must be in force by then. documentElement
        // exists as soon as parsing starts; the observer covers the
        // (never-seen) case where the init script beats it.
        await page.addInitScript(() => {
            const apply = () => {
                if (!document.documentElement) return false;
                document.documentElement.style.fontSize = '20px';
                return true;
            };
            if (!apply()) {
                new MutationObserver((muts, obs) => {
                    if (apply()) obs.disconnect();
                }).observe(document, { childList: true });
            }
        });
        await page.goto('/simulators/function-block-editor.html');

        // The econ example loads on construction; at F=20 the 8.5rem
        // block renders 170 px wide — confirm the font override landed
        // (and with it, that blockW ≠ the 136 authored fallback).
        const bw = await page.evaluate(
            () => document.querySelector('.fbe-block').getBoundingClientRect().width);
        expect(bw).toBeCloseTo(170, 0);

        // Drag the 'oat' block (authored at x=20) far past the right
        // edge; the clamp must stop it at INNER_W − measured blockW.
        const head = page.locator('.fbe-block[data-id="oat"] .fbe-block-head');
        const hb = await head.boundingBox();
        await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
        await page.mouse.down();
        await page.mouse.move(2380, hb.y + hb.height / 2, { steps: 12 });
        await page.mouse.up();

        const res = await page.evaluate(() => {
            const inner = document.getElementById('fbe-inner');
            const blk = document.querySelector('.fbe-block[data-id="oat"]');
            const bi = inner.getBoundingClientRect();
            const bb = blk.getBoundingClientRect();
            return { right: bb.right - bi.left, innerW: inner.clientWidth };
        });
        // Anti-vacuity: the drag must actually have reached the clamp —
        // a drag that never engaged would pass the ≤ check at x=20.
        expect(res.right, 'drag never reached the right edge — did pointer '
            + 'capture break?').toBeGreaterThan(res.innerW - 5);
        // The #208 regression: with the old BLOCK_W=136 const the clamp
        // allowed x=764 and a 170 px block overhung to 934 > 900.
        expect(res.right).toBeLessThanOrEqual(res.innerW + 0.5);
    });
});
