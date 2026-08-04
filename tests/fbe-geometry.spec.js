// Wiresheet PLACEMENT invariants over both FBE consumer pages —
// /simulators/function-block-editor.html (public) and
// /simulators/ddc-workbench-fcu.html — #205 / #206 / #208.
//
// ⚠ STATUS (measured 2026-07-26, STUB = 10): this spec is the
// placement harness for the wiresheet-relayout lane and joins CI only
// with the relayout merge.
//   - WORKBENCH: GREEN since the candidate-A relayout (#205) — 8
//     topological columns at a 175 px pitch on a 1401×480 canvas
//     (margin = pitch − 135.6 = 39.4 px at a 16 px root font), rows
//     hand-placed so every mid-gap vertical and horizontal lane
//     clears the intermediate blocks. Before that relayout the
//     shipped 145–150 px pitch left adjacent-column wires only
//     9.4–14.4 px of margin (< 2·STUB): 5-segment fallbacks that
//     buried, plus the space-temp fan-out and sr1↔sr2 cross-wires
//     burying through intermediate blocks even when routed forward.
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
//              3-segment forward elbow, except exemptions listed in
//              FALLBACK_BY_DESIGN: '*' exempts a whole sheet, an
//              ARRAY names the exact wires and every other wire on
//              that sheet keeps the forward + margin checks. The
//              allowlist is SELF-VERIFYING either way: a '*' sheet
//              must still HAVE ≥1 fallback wire, and a named wire
//              must both EXIST and actually ride the fallback — so a
//              relayout that routes an exempted surface forward
//              forces the entry's deletion instead of decaying into
//              a silent permanent pass;
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

// The three consumer surfaces. Canvas bounds: the public editor mounts
// at the 900×480 default; each workbench passes its own canvasSize and
// these bounds must match that call.
//
// `url` is what makes layer B generic over this table. It was inline in
// each describe until the AHU landed — and the AHU shipped 23 burials
// through a green suite precisely because adding a row here was not
// enough to cover a page whose URL nothing named (#250).
const SURFACES = {
    'function-block-editor': {
        file: 'html/simulators/function-block-editor.html',
        url: '/simulators/function-block-editor.html',
        literal: 'EXAMPLES',
        canvas: { w: 900, h: 480 },
    },
    'ddc-workbench-fcu': {
        file: 'html/simulators/ddc-workbench-fcu.html',
        url: '/simulators/ddc-workbench-fcu.html',
        literal: 'FCU_PROGRAMS',
        // h grew 480 → 540 with the fan-proof interlock: column 720 on
        // cool-2stage-safeties had no free slot for the new AND, and the
        // router's margin rule pins that AND to that column. The page's
        // canvasSize call carries the reasoning.
        canvas: { w: 1401, h: 540 },
    },
    'ddc-workbench': {
        file: 'html/simulators/ddc-workbench.html',
        url: '/simulators/ddc-workbench.html',
        literal: 'AHU_PROGRAMS',
        // 11 columns at the 175px pitch since the low-limits sheet's
        // damper tail (MIN + trip select) grew the width 1576 → 1926;
        // the starter uses 9 of them. h shrank 1210 → 980 with the
        // no-burial relayout — the sheet got shorter, not taller, once
        // the sources moved next to their consumers — and the
        // low-limits sheet fits inside that same height.
        canvas: { w: 1926, h: 980 },
    },
};
const REGISTRIES = {};
for (const [key, s] of Object.entries(SURFACES)) {
    REGISTRIES[key] = loadLiteral(s.file, s.literal);
}

// Sheets whose 5-segment fallback routing is DELIBERATE. Two forms:
// '*' exempts the WHOLE sheet from the forward + margin checks — the
// public 'proof' example alternates its chain between the top and
// bottom rows at tight x-pitch so every link draws a long visible
// vertical run (see the layout comment at
// function-block-editor.html:287-292); an ARRAY names the exact
// wires (the "out.PIN → in.PIN" labels the assertions print) allowed
// on the fallback, and every OTHER wire on that sheet keeps the full
// forward + margin discipline. Never "fix" an exempted surface to
// route forward; if the relayout lane ever re-lays one anyway, the
// self-verification assertions below force the entry's deletion.
const FALLBACK_BY_DESIGN = {
    'function-block-editor': { proof: '*' },
    // cool-2stage-safeties: the minimum-off-time subsystem is a TRUE
    // CYCLE (y1gate → notrun → tonoff → offok → permit → y1gate — the
    // ruled "TON timing the off state, fed back into the stage permit"
    // shape), and a cycle cannot be drawn all-forward on a left-to-right
    // sheet: at least one wire's target sits left of its source, which
    // IS the 5-segment fallback. Exactly these three return wires ride
    // it by construction; naming them (rather than '*') holds every
    // other wire — including the cycle's forward tap y1gate.Q→notrun.IN
    // — to the 3-segment elbow and the 2·STUB+4 margin, so a relayout
    // cannot silently grow a fourth fallback or a sub-threshold margin.
    // The no-burial invariant applies to every wire regardless.
    'ddc-workbench-fcu': {
        'cool-2stage-safeties': [
            'notrun.Q → tonoff.IN',
            'tonoff.Q → offok.A',
            'y1gate.Q → offok.B',
        ],
    },
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
// allowFallback: '*' (whole sheet may ride the fallback), a Set of
// wire labels (only those may — non-members keep every check), or
// falsy (no exemption).
function sheetViolations(meas, allowFallback) {
    const v = {
        burials: [], nonForward: [], margins: [], fallbackCount: 0,
        // Set form only: allowlisted labels seen on the sheet, and
        // allowlisted wires that measured as the 3-segment forward
        // elbow (assertSheet requires the latter to stay empty).
        allowedSeen: new Set(), allowedForward: [],
    };
    meas.wires.forEach((w) => {
        const label = w.from.join('.') + ' → ' + w.to.join('.');
        const segs = parseSegments(w.d);
        if (segs.length > 3) v.fallbackCount++;
        const allowed = allowFallback === '*'
            || (allowFallback instanceof Set && allowFallback.has(label));
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
        if (allowed) {
            if (allowFallback instanceof Set) {
                v.allowedSeen.add(label);
                if (segs.length === 3) v.allowedForward.push(label);
            }
        } else {
            // (ii) forward-branch on every non-exempt wire.
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
    // Every block's RENDERED bottom fits the declared canvas. Layer A
    // checks the authored y against the editor's drag clamp (h − 40),
    // which is not the same claim: a block is 73–90 px tall, so an
    // authored y well inside the clamp can still bottom out past the
    // canvas. Nothing clips when it does (.fbe-canvas scrolls), so the
    // only symptom is a canvasSize comment that has quietly stopped
    // being true — which is exactly how `fan-status` shipped at y 470
    // and bottomed at 543 against h 540. TOLERANCE: 1 px, because the
    // heights are rem-derived and land fractional (sr1 measures 89.72).
    const canvasH = SURFACES[pageKey].canvas.h;
    const overflows = Object.entries(meas.blocks)
        .filter(([, r]) => r.bottom > canvasH + 1)
        .map(([id, r]) => id + ' bottoms at ' + r.bottom.toFixed(1)
            + ' past canvas h ' + canvasH);
    expect(overflows, sheetName + ': blocks bottoming past the canvas').toEqual([]);
    const allow = (FALLBACK_BY_DESIGN[pageKey] || {})[sheetName];
    const allowSet = Array.isArray(allow) ? new Set(allow) : null;
    const v = sheetViolations(meas, allowSet || allow);
    expect(v.burials, sheetName + ': buried wire segments').toEqual([]);
    if (allow === '*') {
        // Self-verification: a whole-sheet exemption must still
        // exercise the fallback router. If this fires, the sheet was
        // re-laid to route fully forward — DELETE its
        // FALLBACK_BY_DESIGN entry.
        expect(v.fallbackCount,
            sheetName + ': allowlisted as fallback-by-design but has no '
            + 'fallback wires — delete its FALLBACK_BY_DESIGN entry').toBeGreaterThan(0);
        return;
    }
    if (allowSet) {
        // Per-wire self-verification. Every named label must match a
        // wire on the sheet (a renamed block or pin can't hand its
        // pass to nothing)…
        const missing = [...allowSet].filter((l) => !v.allowedSeen.has(l));
        expect(missing, sheetName
            + ': FALLBACK_BY_DESIGN entries matching no wire').toEqual([]);
        // …and each named wire must actually ride the fallback — a
        // re-laid wire that routes forward forces its entry's
        // deletion, same discipline as the '*' form.
        expect(v.allowedForward, sheetName
            + ': allowlisted wires routing forward — delete their '
            + 'FALLBACK_BY_DESIGN entries').toEqual([]);
    }
    expect(v.nonForward, sheetName + ': wires on the 5-segment fallback').toEqual([]);
    expect(v.margins, sheetName + ': forward margin below 2·STUB + 4').toEqual([]);
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

// Both workbench pages mount the same shell, so one loop covers them —
// keyed off SURFACES[key].url rather than a hard-coded page, which is
// what stops a new workbench from being registered in SURFACES and
// still going unmeasured (#250).
for (const pageKey of ['ddc-workbench-fcu', 'ddc-workbench']) {
    test.describe('fbe-geometry: layer B — ' + pageKey, () => {

        for (const key of Object.keys(REGISTRIES[pageKey])) {
            test('program "' + key + '": no burial, forward routing, margins', async ({ page }) => {
                const def = REGISTRIES[pageKey][key];
                await page.goto(SURFACES[pageKey].url);
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
                assertSheet(pageKey, key, meas);
            });
        }
    });
}

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

// ── Layer C: the review rig captures the WHOLE sheet (#223) ─────────
//
// tests/screenshot-wiresheets.mjs screenshots .fbe-canvas — a SCROLL
// container — so an unprepared element shot captures only the band that
// is scrolled into view and drops the rest of the sheet without saying
// so. The rig's unclipForShot() is the fix, and this is where its
// invariant is asserted, because the rig's own header defers here ("a
// screenshot can't assert, and the geometry invariants already live in
// fbe-geometry.spec.js").
//
// The helper is EXTRACTED FROM THE RIG SOURCE and evaluated in the page,
// never re-derived — same posture, and same reason, as extractWirePath()
// above: a spec that reimplements the thing it checks checks nothing.
// Extraction also sidesteps the rig being an ESM entry point that
// launches a browser at import time.
//
// SCOPE, stated so nobody reads more into a green run than is there:
// what is pinned is the HELPER. The rig's SEQUENCING around it — the
// two-rAF settle, the shotBoxDefects guard, the caption plumbing — is
// re-implemented below rather than extracted, so deleting the rig's own
// frame wait leaves this layer green. The three probes are chosen so
// that deleting any of the helper's THREE steps goes red: the size
// write (assertion 1), the ancestor un-clip (assertion 2 — and only
// that one, because a getBoundingClientRect probe is blind to paint
// clipping), and the chrome hide (assertion 4).

const RIG_SRC = fs.readFileSync(
    path.join(__dirname, 'screenshot-wiresheets.mjs'), 'utf8');

// unclipForShot sits at top level in the rig, so the first `\n}` at
// column 0 closes it. null (not a throw) so a missing helper fails only
// layer C, with a message that names the defect.
const UNCLIP_SRC = (() => {
    const m = RIG_SRC.match(/^function unclipForShot\(sel\) \{[\s\S]*?\n\}/m);
    return m ? m[0] : null;
})();

// Apply the extracted helper, then wait the two frames the rig waits.
// Load-bearing: reducedMotion (forced below, because the rig forces it)
// turns on styles.css's kill switch, which sets
// `transition-duration: 0.01ms !important` on `*`; with the initial
// `transition-property: all` every inline style write becomes a real
// transition, and the canvas reports its OLD size until a frame ticks.
async function applyUnclip(page, canvasSel) {
    if (!UNCLIP_SRC) {
        throw new Error('unclipForShot() not found in '
            + 'tests/screenshot-wiresheets.mjs — the wiresheet review rig is '
            + 'shooting .fbe-canvas unprepared, so every matrix shot is '
            + 'cropped at the scroll fold (#223)');
    }
    const res = await page.evaluate('(() => { ' + UNCLIP_SRC
        + '\n return unclipForShot(' + JSON.stringify(canvasSel) + '); })()');
    await page.evaluate(() => new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))));
    return res;
}

// What must be inside the shot (blocks + the SVG wire layer, which is
// sized to the whole canvas coordinate space); which ancestors would
// still PAINT-clip it (rects cannot see that, so it has to be read off
// computed style); what would paint OVER it; and how much the container
// is currently scrolled away from showing.
function inspectShotBox(page, canvasSel, innerSel) {
    return page.evaluate(({ canvasSel, innerSel }) => {
        const el = document.querySelector(canvasSel);
        const inner = document.querySelector(innerSel);
        const box = el.getBoundingClientRect();
        const name = (n) => n.tagName.toLowerCase()
            + '.' + (String(n.className || '').split(' ')[0] || '');
        const nodes = Array.from(inner.querySelectorAll('.fbe-block'));
        const svg = inner.querySelector('svg');
        if (svg) nodes.push(svg);
        const outside = [];
        nodes.forEach((n) => {
            const r = n.getBoundingClientRect();
            if (r.left < box.left - 0.5 || r.top < box.top - 0.5
                || r.right > box.right + 0.5 || r.bottom > box.bottom + 0.5) {
                outside.push((n.dataset && n.dataset.id) || n.tagName.toLowerCase());
            }
        });
        // Paint clipping is invisible to every rect above. An ancestor
        // whose computed overflow is not `visible` cuts the PNG at its
        // own edge while every block still reports an in-box rect.
        const clippingAncestors = [];
        for (let p = el.parentElement; p; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
                clippingAncestors.push(name(p));
            }
        }
        const covering = [];
        let hiddenChrome = 0;
        document.querySelectorAll('body *').forEach((n) => {
            if (n === el || n.contains(el) || el.contains(n)) return;
            const cs = getComputedStyle(n);
            if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
            if (cs.display === 'none') return;
            if (cs.visibility === 'hidden') { hiddenChrome += 1; return; }
            const r = n.getBoundingClientRect();
            if (!r.width || !r.height) return;
            if (r.right > box.left && r.left < box.right
                && r.bottom > box.top && r.top < box.bottom) {
                covering.push(name(n));
            }
        });
        return {
            outside,
            covering,
            clippingAncestors,
            hiddenChrome,
            box: { w: Math.round(box.width), h: Math.round(box.height) },
            clipped: {
                x: Math.max(0, el.scrollWidth - el.clientWidth),
                y: Math.max(0, el.scrollHeight - el.clientHeight),
            },
        };
    }, { canvasSel, innerSel });
}

// Block rects in canvas-inner coordinates — the un-clip must not RE-LAY
// the layout it is photographing.
function blockLayout(page, innerSel) {
    return page.evaluate((sel) => {
        const inner = document.querySelector(sel);
        const base = inner.getBoundingClientRect();
        return Array.from(inner.querySelectorAll('.fbe-block')).map((b) => {
            const r = b.getBoundingClientRect();
            return [b.dataset.id, Math.round(r.left - base.left),
                Math.round(r.top - base.top), Math.round(r.width), Math.round(r.height)];
        });
    }, innerSel);
}

test.describe('fbe-geometry: layer C — the review rig captures the whole sheet (#223)', () => {

    // The rig forces reduced motion; forcing it here too is what makes
    // this spec exercise the transition trap the frame wait exists for.
    test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });

    // Both consumer surfaces, and both directions of the clip: the
    // workbench's 1401 px canvas overflows HORIZONTALLY in the in-flow
    // card (563 px at F=16), and a full-height sheet overflows
    // VERTICALLY in fullscreen, where the canvas is only 392 px tall at
    // 1280×800 (88 px lost, on BOTH pages).
    const CASES = [
        { key: 'ddc-workbench-fcu', sheet: 'cool-2stage-safeties', fullscreen: false },
        { key: 'ddc-workbench-fcu', sheet: 'cool-2stage-safeties', fullscreen: true },
        { key: 'function-block-editor', sheet: 'proof', fullscreen: true },
    ];

    const SEL = {
        'function-block-editor': { canvas: '#fbe-canvas', inner: '#fbe-inner' },
        'ddc-workbench-fcu': { canvas: '#ddcw-fbe-canvas', inner: '#ddcw-fbe-inner' },
    };

    // Same load sequence the rig uses (screenshot-wiresheets.mjs).
    async function openSheet(page, key, sheet) {
        if (key === 'function-block-editor') {
            await page.goto('/simulators/function-block-editor.html');
            await page.click('[data-example="' + sheet + '"]');
        } else {
            await page.goto('/simulators/ddc-workbench-fcu.html');
            await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
            await expect(page.locator('#ddcw-fbe-inner .fbe-block').first()).toBeVisible();
            await page.evaluate((k) => {
                const sel = document.getElementById('ddcw-program');
                sel.value = k;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }, sheet);
        }
        const def = REGISTRIES[key][sheet];
        await expect(page.locator(SEL[key].inner + ' path.fbe-wire'))
            .toHaveCount(def.wires.length);
    }

    for (const c of CASES) {
        const label = c.key + ' "' + c.sheet + '"'
            + (c.fullscreen ? ' (fullscreen)' : ' (in-flow card)')
            + ': the un-clipped shot box holds the whole sheet';

        test(label, async ({ page }) => {
            const { canvas, inner } = SEL[c.key];
            await openSheet(page, c.key, c.sheet);
            if (c.fullscreen) {
                await page.click('.tool-card-fullscreen-btn');
                await expect(page.locator('.tool-card.is-fullscreen')).toBeVisible();
                await page.evaluate(() => new Promise((r) =>
                    requestAnimationFrame(() => requestAnimationFrame(r))));
            }

            // ANTI-VACUITY. This case only proves something if the shot
            // target is genuinely clipped to start with — in BOTH senses:
            // scrolled-away content (the rects), and an ancestor that
            // would paint-cut the PNG even once the box is grown. A
            // relayout that removes either must delete or re-pick this
            // case, not inherit a silent pass.
            const pre = await inspectShotBox(page, canvas, inner);
            expect(pre.clipped.x + pre.clipped.y,
                'sheet no longer overflows .fbe-canvas — this case can no longer '
                + 'demonstrate the #223 crop; re-pick it').toBeGreaterThan(0);
            expect(pre.outside.length,
                'no node falls outside the UN-prepared shot box — this case can no '
                + 'longer demonstrate the #223 crop; re-pick it').toBeGreaterThan(0);
            expect(pre.clippingAncestors.length,
                'no ancestor paint-clips the canvas — the un-clip walk would be '
                + 'a no-op and this case could not detect its removal').toBeGreaterThan(0);

            const before = await blockLayout(page, inner);
            const res = await applyUnclip(page, canvas);
            // Playwright scrolls the target into view before shooting, so
            // the chrome question has to be asked from the same scroll
            // position the shot is taken from.
            await page.locator(canvas).scrollIntoViewIfNeeded();
            const post = await inspectShotBox(page, canvas, inner);

            // 1. The box Playwright is about to photograph is the size
            //    the helper reported (this is the assertion the missing
            //    frame wait breaks — it reads the pre-transition size).
            expect(post.box).toEqual({ w: res.shot.w, h: res.shot.h });
            // 2. No ancestor still paint-clips it. This is the assertion
            //    that covers the un-clip WALK: rects are blind to it, so
            //    without this line the walk could be deleted outright and
            //    every other assertion here would still pass while the
            //    PNG came out cut at the .tool-card edge.
            expect(post.clippingAncestors,
                'an ancestor still clips the shot box').toEqual([]);
            // 3. It contains every block AND the whole wire layer.
            expect(post.outside,
                'still outside the shot box after un-clipping').toEqual([]);
            // 4. Nothing sticky/fixed paints over it, AND the chrome-hide
            //    step actually ran. <main> is a z-index:1 stacking context
            //    and .site-nav is sticky at z-index 100, so no z-index on
            //    the canvas can win — measured: the nav covered the top
            //    76 px, one whole row. `covering` alone is not enough
            //    coverage: at some viewport/scroll combinations the nav
            //    does not geometrically intersect, and the assertion would
            //    pass with the whole loop deleted. hiddenChrome is what
            //    pins that the loop ran.
            expect(post.covering,
                'page chrome painting over the shot').toEqual([]);
            expect(post.hiddenChrome,
                'the chrome-hide step did nothing — sticky/fixed page chrome '
                + 'is still visible and can paint over the grown canvas')
                .toBeGreaterThan(0);
            // 5. The un-clip did not RE-LAY the sheet. A picture of a
            //    layout no visitor ever sees is worse than a cropped one.
            expect(await blockLayout(page, inner)).toEqual(before);
            // 6. The crop the contact-sheet caption reports is the crop
            //    that actually existed.
            expect(res.clipped).toEqual(pre.clipped);
        });
    }
});
