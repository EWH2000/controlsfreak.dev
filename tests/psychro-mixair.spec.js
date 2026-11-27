// Engine-direct tests for Psychro.mixAir and Psychro.mixFraction — the
// page-facing mixing combinators over the mixStreams kernel
// (codebase-issues #228 step 0; contract: docs/engine-standardization.md
// §3). Lives under tests/*.spec.js so the same `npm test` (Playwright)
// runner picks it up; Playwright workers are Node processes, the `page`
// fixture is just unused here.
//
// LOADER: the psychro-mixstreams.spec.js shape — one BARE vm context,
// the engine run into it, the symbols read back out of that context's
// global lexical scope. The bare `{}` IS the purity assertion: the
// engine promises to touch neither `document` nor `window` (nor
// `window.Units`), and a violation throws ReferenceError right here.
//
// WHAT IS PINNED, AND HOW HARD:
//   • The contract shape — mass-basis `exact` IS mixStreams on the same
//     weights; `linear` IS Σ share·x; a volume basis converts through
//     specificVolume; shares normalise; every ok:false guard fires IN
//     ORDER with its message; no caveat string rides on a result (the
//     owner's Q2 default, rulings §18.5).
//   • The private cp(W) fold is a ZERO numeric change — asserted with
//     toBe against the literal 0.240 + 0.444·W expression it replaced.
//   • THE §1 TABLE. docs/engine-standardization.md §1 publishes seven
//     mixing cases under every form the site ships; the last describe
//     block recomputes them from the engine and checks each figure
//     twice — against literals in this file, and against the doc's own
//     table cells — so the design note's numbers have a guard. If a
//     figure moves, this goes red and the doc gets re-derived, not the
//     literal nudged.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

const ROOT    = path.join(__dirname, '..');
const ENGINE  = path.join(ROOT, 'html', 'scripts', 'psychro-engine.js');
const DESIGN  = path.join(ROOT, 'docs', 'engine-standardization.md');

function loadEngine() {
    const ctx = vm.createContext({});
    vm.runInContext(fs.readFileSync(ENGINE, 'utf8'), ctx, { filename: 'psychro-engine.js' });
    return vm.runInContext(
        '({ Psychro, P_STD, enthalpy, specificVolume, satHumRatio, pressFromAltitude });', ctx);
}

// Every numeric field a mixStreams / buildState result carries.
const FIELDS = ['tdb', 'W', 'P', 'pw', 'rh', 'twb', 'tdp', 'h', 'v', 'condensate'];

function expectSameState(a, b, tol = 1e-9) {
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.fogging).toBe(b.fogging);
    for (const k of FIELDS) {
        if (b[k] === undefined) continue;
        if (!isFinite(b[k])) { expect(a[k]).toBe(b[k]); continue; }
        expect(Math.abs(a[k] - b[k]), k).toBeLessThanOrEqual(tol);
    }
}

// A spread of stream pairs: winter, design-day, summer, hot-dry, and the
// fog corner (the case the #236 re-solve exists for).
function pairs(E) {
    const S = (m, t, x) => E.Psychro.solveState(m, t, x, E.P_STD);
    return [
        { oa: S('rh', 35, 80),  ra: S('rh', 75, 50), f: 0.5  },
        { oa: S('rh', 0, 40),   ra: S('rh', 75, 50), f: 0.2  },
        { oa: S('wb', 95, 75),  ra: S('rh', 75, 50), f: 0.25 },
        { oa: S('rh', 105, 10), ra: S('rh', 75, 50), f: 0.3  },
        { oa: S('rh', -20, 40), ra: S('rh', 80, 50), f: 0.7  },
    ];
}

test.describe('Psychro.mixAir — contract', () => {

    test('both combinators load headless and sit on the Psychro namespace', () => {
        const E = loadEngine();
        expect(typeof E.Psychro.mixAir).toBe('function');
        expect(typeof E.Psychro.mixFraction).toBe('function');
        // The kernel stays (owner default Q1) — added, not renamed.
        expect(typeof E.Psychro.mixStreams).toBe('function');
    });

    test('pure: runs in a bare context, and no caveat string rides on a result', () => {
        const E = loadEngine();
        const [p] = pairs(E);
        const m = E.Psychro.mixAir({
            streams: [{ state: p.oa, share: p.f }, { state: p.ra, share: 1 - p.f }],
            basis: 'volume', P: E.P_STD,
        });
        expect(Object.keys(m).sort()).toEqual(['P', 'basis', 'exact', 'linear', 'ok', 'shares']);
        expect(Object.keys(m.linear).sort()).toEqual(['W', 'state', 'tdb']);
        expect(Object.keys(m.shares).sort()).toEqual(['mass', 'volume']);
        const f = E.Psychro.mixFraction({ oa: p.oa, ra: p.ra, targetTdb: 55, basis: 'volume', recovery: 'exact', P: E.P_STD });
        expect(Object.keys(f).sort()).toEqual(['fraction', 'ok', 'within']);
        // Owner Q2 default: the engine returns numbers, never page prose.
        // Code only — the header legitimately NAMES window.Units as the
        // thing the engine does not touch.
        const src = fs.readFileSync(ENGINE, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');
        expect(src).not.toMatch(/\bnote\s*:/);
        expect(src).not.toMatch(/\bdocument\./);
        expect(src).not.toMatch(/\bwindow\./);
    });

    test("mass basis: `exact` IS mixStreams on the same weights, every field", () => {
        const E = loadEngine();
        for (const p of pairs(E)) {
            for (const w of [[p.f, 1 - p.f], [3, 7], ['2', '5']]) {
                const m = E.Psychro.mixAir({
                    streams: [{ state: p.oa, share: w[0] }, { state: p.ra, share: w[1] }],
                    basis: 'mass', P: E.P_STD,
                });
                const k = E.Psychro.mixStreams(
                    [{ state: p.oa, flow: w[0] }, { state: p.ra, flow: w[1] }], E.P_STD);
                expect(m.ok).toBe(true);
                expectSameState(m.exact, k);
            }
        }
        // Three streams, unnormalised — the kernel's associativity carries over.
        const S = (t, r) => E.Psychro.solveState('rh', t, r, E.P_STD);
        const st = [S(10, 60), S(72, 45), S(55, 90)];
        const sh = [1.5, 6, 2.5];
        const m = E.Psychro.mixAir({ streams: st.map((s, i) => ({ state: s, share: sh[i] })), basis: 'mass', P: E.P_STD });
        const k = E.Psychro.mixStreams(st.map((s, i) => ({ state: s, flow: sh[i] })), E.P_STD);
        expectSameState(m.exact, k);
    });

    test('`linear` IS Σ share·x on the shares as given, and its state is buildState of that pair', () => {
        const E = loadEngine();
        for (const p of pairs(E)) {
            for (const basis of ['mass', 'volume']) {
                const m = E.Psychro.mixAir({
                    streams: [{ state: p.oa, share: p.f }, { state: p.ra, share: 1 - p.f }],
                    basis, P: E.P_STD,
                });
                const tdb = p.f * p.oa.tdb + (1 - p.f) * p.ra.tdb;
                const W   = p.f * p.oa.W   + (1 - p.f) * p.ra.W;
                expect(Math.abs(m.linear.tdb - tdb)).toBeLessThan(1e-12);
                expect(Math.abs(m.linear.W - W)).toBeLessThan(1e-15);
                expectSameState(m.linear.state, E.Psychro.buildState(m.linear.tdb, m.linear.W, E.P_STD), 0);
                // Basis-free by definition: the hand arithmetic does not
                // care what the shares measure, only that they are given.
            }
        }
    });

    test('volume basis: mass weight = share ÷ specificVolume, and `exact` is the kernel on it', () => {
        const E = loadEngine();
        for (const p of pairs(E)) {
            const cfm = [p.f * 10000, (1 - p.f) * 10000];
            const m = E.Psychro.mixAir({
                streams: [{ state: p.oa, share: cfm[0] }, { state: p.ra, share: cfm[1] }],
                basis: 'volume', P: E.P_STD,
            });
            const v = [p.oa, p.ra].map(s => E.specificVolume(s.tdb, s.W, E.P_STD));
            expect(Math.abs(v[0] - p.oa.v)).toBeLessThan(1e-12);
            const mw = cfm.map((q, i) => q / v[i]);
            const M = mw[0] + mw[1];
            expect(Math.abs(m.shares.mass[0] - mw[0] / M)).toBeLessThan(1e-12);
            expect(Math.abs(m.shares.mass[1] - mw[1] / M)).toBeLessThan(1e-12);
            expect(Math.abs(m.shares.volume[0] - p.f)).toBeLessThan(1e-12);
            expectSameState(m.exact, E.Psychro.mixStreams(
                [{ state: p.oa, flow: mw[0] }, { state: p.ra, flow: mw[1] }], E.P_STD));
            // Same mix, named by its MASS shares, lands on the same air.
            const back = E.Psychro.mixAir({
                streams: [{ state: p.oa, share: m.shares.mass[0] }, { state: p.ra, share: m.shares.mass[1] }],
                basis: 'mass', P: E.P_STD,
            });
            expectSameState(back.exact, m.exact);
            expect(Math.abs(back.shares.volume[0] - p.f)).toBeLessThan(1e-12);
        }
    });

    test('shares normalise — [2, 2] is [0.5, 0.5], and numeric strings coerce once', () => {
        const E = loadEngine();
        for (const p of pairs(E)) {
            for (const basis of ['mass', 'volume']) {
                const run = sh => E.Psychro.mixAir({
                    streams: [{ state: p.oa, share: sh[0] }, { state: p.ra, share: sh[1] }],
                    basis, P: E.P_STD,
                });
                const a = run([2, 2]), b = run([0.5, 0.5]), c = run(['200', '200']);
                for (const r of [a, c]) {
                    expectSameState(r.exact, b.exact, 1e-12);
                    expect(Math.abs(r.linear.tdb - b.linear.tdb)).toBeLessThan(1e-12);
                    expect(r.shares.mass[0]).toBeCloseTo(b.shares.mass[0], 12);
                    expect(r.shares.volume[0]).toBeCloseTo(b.shares.volume[0], 12);
                }
                expect(a.shares[basis]).toEqual([0.5, 0.5]);
                expect(a.shares.mass[0] + a.shares.mass[1]).toBeCloseTo(1, 12);
                expect(a.shares.volume[0] + a.shares.volume[1]).toBeCloseTo(1, 12);
            }
        }
    });

    test('P defaults to the first stream’s solve pressure, not to sea level', () => {
        const E = loadEngine();
        const P = E.pressFromAltitude(5280);
        const oa = E.Psychro.solveState('rh', 20, 60, P);
        const ra = E.Psychro.solveState('rh', 72, 40, P);
        const streams = [{ state: oa, share: 0.3 }, { state: ra, share: 0.7 }];
        const dflt = E.Psychro.mixAir({ streams, basis: 'mass' });
        const expl = E.Psychro.mixAir({ streams, basis: 'mass', P });
        expect(dflt.P).toBe(P);
        expectSameState(dflt.exact, expl.exact, 0);
        const fr = E.Psychro.mixFraction({ oa, ra, targetTdb: 55, basis: 'mass', recovery: 'exact' });
        const fe = E.Psychro.mixFraction({ oa, ra, targetTdb: 55, basis: 'mass', recovery: 'exact', P });
        expect(fr.fraction).toBe(fe.fraction);
    });

    test('every ok:false guard fires, in contract order, with its message', () => {
        const E = loadEngine();
        const good = E.Psychro.solveState('rh', 70, 50, E.P_STD);
        const bad  = E.Psychro.solveState('rh', 70, 150, E.P_STD);
        expect(bad.ok).toBe(false);
        const noV  = Object.assign({}, good, { v: 0 });
        const mix = (streams, basis = 'mass') => E.Psychro.mixAir({ streams, basis, P: E.P_STD });
        const cases = [
            // 1. no streams
            [E.Psychro.mixAir({ streams: [], basis: 'mass', P: E.P_STD }), 'Mix at least one air stream.'],
            [E.Psychro.mixAir(undefined), 'Mix at least one air stream.'],
            // 2. an invalid state — beats a bad share and a bad basis on another stream
            [mix([{ state: good, share: -1 }, { state: bad, share: 1 }], 'nope'),
                'One of the mixed streams has an invalid air state.'],
            [mix([{ share: 1 }]), 'One of the mixed streams has an invalid air state.'],
            // 3. a share non-finite or negative after one Number() coercion
            [mix([{ state: good, share: 'abc' }], 'nope'), 'Enter a numeric share for every stream.'],
            [mix([{ state: good, share: Infinity }]), 'Enter a numeric share for every stream.'],
            [mix([{ state: good, share: -0.1 }, { state: good, share: 'x' }]), 'Stream share can’t be negative.'],
            // 4. zero total — beats a bad basis
            [mix([{ state: good, share: 0 }, { state: good, share: '0' }], 'nope'), 'Enter a positive total share.'],
            // 5. basis outside the enum — beats a zero specific volume
            [mix([{ state: noV, share: 1 }], 'cfm'), 'Name the mixing basis — mass or volume.'],
            [E.Psychro.mixAir({ streams: [{ state: good, share: 1 }], P: E.P_STD }), 'Name the mixing basis — mass or volume.'],
            // 6. under 'volume', a state with no positive specific volume
            [mix([{ state: good, share: 1 }, { state: noV, share: 1 }], 'volume'),
                'One of the mixed streams has no positive specific volume.'],
        ];
        for (const [r, msg] of cases) {
            expect(r).toEqual({ ok: false, error: msg });
        }
        // The v guard is volume-only: a mass basis never divides by v.
        expect(mix([{ state: noV, share: 1 }], 'mass').ok).toBe(true);
    });

    test('the cp(W) fold is a zero numeric change', () => {
        const E = loadEngine();
        const cpLit = W => 0.240 + 0.444 * W;
        const inlet = E.Psychro.solveState('rh', 80, 50, E.P_STD);
        const outlet = E.Psychro.solveState('rh', 55, 90, E.P_STD);
        const pr = E.Psychro.computeProcess({ inlet, outlet, type: 'cool' }, 400);
        const mDot = 400 * 60 / inlet.v;
        expect(pr.qSens).toBe(mDot * cpLit(inlet.W) * (outlet.tdb - inlet.tdb));
        expect(pr.shr).toBe(cpLit(inlet.W) * (outlet.tdb - inlet.tdb) / (outlet.h - inlet.h));
        const inv = E.Psychro.invertProcess(inlet, { type: 'heat', cfm: 400, qSens: 5000 });
        expect(inv.tdb).toBe(inlet.tdb + 5000 / (mDot * cpLit(inlet.W)));
        for (const p of pairs(E).slice(0, 4)) {
            const W = 0.3 * p.oa.W + 0.7 * p.ra.W;
            const h = 0.3 * p.oa.h + 0.7 * p.ra.h;
            const k = E.Psychro.mixStreams([{ state: p.oa, flow: 0.3 }, { state: p.ra, flow: 0.7 }], E.P_STD);
            expect(k.fogging).toBe(false);
            expect(k.tdb).toBe((h - 1061 * W) / cpLit(W));
        }
    });

});

test.describe('Psychro.mixFraction — contract', () => {

    test("'linear' is economizer-ratio's (MA − RA) ÷ (OA − RA), and closes on mixAir's linear blend", () => {
        const E = loadEngine();
        for (const p of pairs(E)) {
            for (const target of [p.ra.tdb, p.oa.tdb, 0.6 * p.oa.tdb + 0.4 * p.ra.tdb, 55]) {
                const r = E.Psychro.mixFraction({ oa: p.oa, ra: p.ra, targetTdb: target, basis: 'volume', recovery: 'linear', P: E.P_STD });
                expect(r.ok).toBe(true);
                // economizer-ratio.html's form, transcribed: (ma − ra) / (oa − ra).
                expect(r.fraction).toBe((target - p.ra.tdb) / (p.oa.tdb - p.ra.tdb));
                const m = E.Psychro.mixAir({
                    streams: [{ state: p.oa, share: r.fraction }, { state: p.ra, share: 1 - r.fraction }],
                    basis: 'volume', P: E.P_STD,
                });
                if (r.within) expect(Math.abs(m.linear.tdb - target)).toBeLessThan(1e-9);
            }
        }
    });

    test("'within' flags the bracket; 'linear' still returns the arithmetic fraction outside it", () => {
        const E = loadEngine();
        const S = (t, r) => E.Psychro.solveState('rh', t, r, E.P_STD);
        const oa = S(35, 80), ra = S(75, 50);
        const lin = t => E.Psychro.mixFraction({ oa, ra, targetTdb: t, basis: 'volume', recovery: 'linear', P: E.P_STD });
        expect(lin(55)).toEqual({ ok: true, fraction: 0.5, within: true });
        // (75 − 75) ÷ −40 is −0, so compare by value, not by Object.is.
        expect(lin(75).within).toBe(true);
        expect(lin(75).fraction === 0).toBe(true);
        expect(lin(35)).toEqual({ ok: true, fraction: 1, within: true });
        const above = lin(85), below = lin(25);
        expect(above.ok).toBe(true);
        expect(above.within).toBe(false);
        expect(above.fraction).toBeCloseTo(-0.25, 12);
        expect(below.within).toBe(false);
        expect(below.fraction).toBeCloseTo(1.25, 12);
        // 'exact' has no bracket outside the two dry-bulbs.
        const ex = t => E.Psychro.mixFraction({ oa, ra, targetTdb: t, basis: 'volume', recovery: 'exact', P: E.P_STD });
        expect(ex(85)).toEqual({ ok: false, error: 'The target is outside the two air streams — no mix reaches it.' });
        expect(ex(25).ok).toBe(false);
        expect(ex(55).within).toBe(true);
    });

    test("'exact' closes: mixAir(…).exact.tdb lands on the target on both bases, fog included", () => {
        const E = loadEngine();
        for (const p of pairs(E)) {
            const lo = Math.min(p.oa.tdb, p.ra.tdb), hi = Math.max(p.oa.tdb, p.ra.tdb);
            for (const target of [lo + 0.1 * (hi - lo), (lo + hi) / 2, hi - 0.1 * (hi - lo), lo, hi]) {
                for (const basis of ['mass', 'volume']) {
                    // Both orientations: OA colder than RA and warmer than RA.
                    for (const [oa, ra] of [[p.oa, p.ra], [p.ra, p.oa]]) {
                        const r = E.Psychro.mixFraction({ oa, ra, targetTdb: target, basis, recovery: 'exact', P: E.P_STD });
                        expect(r.ok).toBe(true);
                        expect(r.within).toBe(true);
                        expect(r.fraction).toBeGreaterThanOrEqual(0);
                        expect(r.fraction).toBeLessThanOrEqual(1);
                        const m = E.Psychro.mixAir({
                            streams: [{ state: oa, share: r.fraction }, { state: ra, share: 1 - r.fraction }],
                            basis, P: E.P_STD,
                        });
                        expect(Math.abs(m.exact.tdb - target)).toBeLessThan(1e-6);
                    }
                }
            }
        }
    });

    test('the exact fraction differs from the linear one by the basis and cp effects, in the documented direction', () => {
        // The §1 friction ruling: 0 °F / 40 % OA against 75 °F / 50 % RA.
        // 20 % OA BY VOLUME mixes to 58.13 °F (the table's F column).
        // Read that 58.13 back: the exact volume recovery returns the 20 %,
        // the exact MASS recovery returns the 22.8 % mass share the table
        // prints, and the linear form lands between them (~22.5 %) — it
        // reads the shares as volume but ignores the density gap.
        const E = loadEngine();
        const oa = E.Psychro.solveState('rh', 0, 40, E.P_STD);
        const ra = E.Psychro.solveState('rh', 75, 50, E.P_STD);
        const atVol20 = E.Psychro.mixAir({ streams: [{ state: oa, share: 0.2 }, { state: ra, share: 0.8 }], basis: 'volume', P: E.P_STD });
        const t = atVol20.exact.tdb;
        const vol = E.Psychro.mixFraction({ oa, ra, targetTdb: t, basis: 'volume', recovery: 'exact', P: E.P_STD });
        const mass = E.Psychro.mixFraction({ oa, ra, targetTdb: t, basis: 'mass', recovery: 'exact', P: E.P_STD });
        expect(Math.abs(vol.fraction - 0.2)).toBeLessThan(1e-9);
        expect(Math.abs(mass.fraction - atVol20.shares.mass[0])).toBeLessThan(1e-9);
        expect(mass.fraction).toBeGreaterThan(vol.fraction);
        const lin = E.Psychro.mixFraction({ oa, ra, targetTdb: t, basis: 'volume', recovery: 'linear', P: E.P_STD });
        expect(lin.fraction).toBeGreaterThan(vol.fraction);
        expect(lin.fraction).toBeLessThan(mass.fraction);
        expect(lin.fraction).toBeCloseTo((t - 75) / (0 - 75), 12);
    });

    test('every ok:false guard fires, in contract order, with its message', () => {
        const E = loadEngine();
        const oa = E.Psychro.solveState('rh', 35, 80, E.P_STD);
        const ra = E.Psychro.solveState('rh', 75, 50, E.P_STD);
        const bad = { ok: false, error: 'x' };
        const same = E.Psychro.solveState('rh', 35, 20, E.P_STD);
        const fr = o => E.Psychro.mixFraction(Object.assign(
            { oa, ra, targetTdb: 55, basis: 'mass', recovery: 'exact', P: E.P_STD }, o));
        const cases = [
            [fr({ oa: bad, targetTdb: NaN, basis: 'x' }), 'Outdoor or return air has an invalid air state.'],
            [fr({ ra: undefined }), 'Outdoor or return air has an invalid air state.'],
            [E.Psychro.mixFraction(), 'Outdoor or return air has an invalid air state.'],
            [fr({ targetTdb: 'abc', basis: 'x' }), 'Enter a numeric mixed-air target.'],
            [fr({ targetTdb: Infinity }), 'Enter a numeric mixed-air target.'],
            [fr({ basis: 'cfm', recovery: 'x' }), 'Name the mixing basis — mass or volume.'],
            [fr({ recovery: 'quadratic', ra: same }), 'Name the recovery — linear or exact.'],
            [fr({ ra: same, recovery: 'linear' }), 'Outdoor and return air share a dry-bulb — no unique fraction.'],
            [fr({ ra: same }), 'Outdoor and return air share a dry-bulb — no unique fraction.'],
            [fr({ targetTdb: 90 }), 'The target is outside the two air streams — no mix reaches it.'],
        ];
        for (const [r, msg] of cases) {
            expect(r).toEqual({ ok: false, error: msg });
        }
        // A numeric-string target coerces once, like a share.
        expect(fr({ targetTdb: '55' }).fraction).toBe(fr({ targetTdb: 55 }).fraction);
    });

});

// ── docs/engine-standardization.md §1, regenerated from the engine ────────
//
// Columns, as the doc names them:
//   A  exact, fraction as mass weight — the INLINE page form today
//      (air-mixing frac tab :546-551, psychrometric-chart :672-676):
//      weight W and h, recover tdb from the PRE-clamp W, buildState clamps.
//      Transcribed below; it is the only column NOT computed by the
//      engine's mixers, because it is the pre-#236 arithmetic the
//      migration replaces. Clear of the curve it equals E; in fog it
//      runs cold (the bold 10.42).
//   E  mixStreams on the fraction as weights (workbench)
//      ≡ mixAir({ basis: 'mass' }).exact on the same fractions.
//   B  linear T + W (economizer-ratio) ≡ mixAir(…).linear.tdb.
//   C  linear T in tenths (coil-freeze-risk) — the integer operands make
//      it B to one decimal.
//   D  linear T (air-handlers) — B to two decimals.
//   F  mass basis from CFM (air-mixing flow tab)
//      ≡ mixAir({ basis: 'volume' }).exact on CFM shares.
//   mass %  ≡ that call's shares.mass[0].     fog ≡ its exact.fogging.
const TABLE = [
    { label: '#228 bench',             oa: ['rh', 35, 80],  ra: ['rh', 75, 50], f: 0.50,
      A: '55.11', E: '55.11', B: '55.00', F: '54.24', mass: '52.2', fog: false },
    { label: '#228 design-day',        oa: ['rh', 0, 60],   ra: ['rh', 70, 30], f: 0.30,
      A: '49.11', E: '49.11', B: '49.00', F: '46.87', mass: '33.2', fog: false },
    { label: 'friction ruling',        oa: ['rh', 0, 40],   ra: ['rh', 75, 50], f: 0.20,
      A: '60.20', E: '60.20', B: '60.00', F: '58.13', mass: '22.8', fog: false },
    { label: 'air-handlers example',   oa: ['rh', 35, 80],  ra: ['rh', 75, 50], f: 0.20,
      A: '67.07', E: '67.07', B: '67.00', F: '66.50', mass: '21.4', fog: false },
    { label: 'summer',                 oa: ['wb', 95, 75],  ra: ['rh', 75, 50], f: 0.25,
      A: '80.03', E: '80.03', B: '80.00', F: '79.87', mass: '24.2', fog: false },
    { label: 'hot-dry',                oa: ['rh', 105, 10], ra: ['rh', 75, 50], f: 0.30,
      A: '83.95', E: '83.95', B: '84.00', F: '83.65', mass: '29.0', fog: false },
    { label: 'fog corner',             oa: ['rh', -20, 40], ra: ['rh', 80, 50], f: 0.70,
      A: '10.42', E: '17.67', B: '10.00', F: '12.81', mass: '74.4', fog: true },
];

// The inline A form, transcribed from the pages (see the column note).
function inlineExact(E, streams, weights) {
    const M = weights.reduce((a, b) => a + b, 0);
    let W = 0, h = 0;
    streams.forEach((s, i) => { W += weights[i] * s.W / M; h += weights[i] * s.h / M; });
    return E.Psychro.buildState((h - 1061 * W) / (0.240 + 0.444 * W), W, E.P_STD);
}

function regenerate(E, row) {
    const oa = E.Psychro.solveState(row.oa[0], row.oa[1], row.oa[2], E.P_STD);
    const ra = E.Psychro.solveState(row.ra[0], row.ra[1], row.ra[2], E.P_STD);
    const frac = [row.f, 1 - row.f];
    const byFrac = E.Psychro.mixAir({
        streams: [{ state: oa, share: frac[0] }, { state: ra, share: frac[1] }],
        basis: 'mass', P: E.P_STD,
    });
    const cfm = frac.map(x => x * 10000);
    const byCfm = E.Psychro.mixAir({
        streams: [{ state: oa, share: cfm[0] }, { state: ra, share: cfm[1] }],
        basis: 'volume', P: E.P_STD,
    });
    const kernel = E.Psychro.mixStreams([{ state: oa, flow: frac[0] }, { state: ra, flow: frac[1] }], E.P_STD);
    return {
        oa, ra, byFrac, byCfm, kernel,
        A: inlineExact(E, [oa, ra], frac).tdb.toFixed(2),
        E: byFrac.exact.tdb.toFixed(2),
        Ek: kernel.tdb.toFixed(2),
        B: byFrac.linear.tdb.toFixed(2),
        F: byCfm.exact.tdb.toFixed(2),
        Finline: inlineExact(E, [oa, ra], [cfm[0] / oa.v, cfm[1] / ra.v]).tdb.toFixed(2),
        mass: (byCfm.shares.mass[0] * 100).toFixed(1),
        fog: byCfm.exact.fogging,
    };
}

// The doc's §1 table rows, keyed by label prefix; cells with markdown
// emphasis stripped.
function docRows() {
    const md = fs.readFileSync(DESIGN, 'utf8');
    const sec = md.slice(md.indexOf('## 1.'), md.indexOf('## 2.'));
    return sec.split('\n')
        .filter(l => l.startsWith('| ') && !l.startsWith('| case') && !l.startsWith('|---'))
        .map(l => l.split('|').slice(1, -1).map(c => c.trim().replace(/\*\*/g, '')));
}

test.describe('engine-standardization §1 table — regenerated from the engine', () => {

    test('every row reproduces the literal figures under forms A / E / B / F', () => {
        const E = loadEngine();
        for (const row of TABLE) {
            const g = regenerate(E, row);
            expect(g.oa.ok && g.ra.ok, row.label).toBe(true);
            expect(g.A, row.label + ' A').toBe(row.A);
            expect(g.E, row.label + ' E').toBe(row.E);
            expect(g.Ek, row.label + ' E (kernel)').toBe(row.E);
            expect(g.B, row.label + ' B').toBe(row.B);
            expect(g.F, row.label + ' F').toBe(row.F);
            expect(g.mass, row.label + ' mass %').toBe(row.mass);
            expect(g.fog, row.label + ' fog').toBe(row.fog);
            expect(g.byFrac.exact.fogging, row.label + ' fog (mass)').toBe(row.fog);
            // Clear of the curve the inline A form IS the engine's E.
            if (!row.fog) expect(g.A).toBe(g.E);
        }
    });

    test("the fog corner's inline flow-tab figure is the doc's 5.93", () => {
        const E = loadEngine();
        const g = regenerate(E, TABLE[TABLE.length - 1]);
        expect(g.Finline).toBe('5.93');
        expect(g.F).toBe('12.81');
    });

    test("the design note's table carries exactly these figures", () => {
        const rows = docRows();
        expect(rows.length).toBe(TABLE.length);
        for (const row of TABLE) {
            const cells = rows.find(c => c[0].startsWith(row.label));
            expect(cells, row.label).toBeTruthy();
            const [, A, Ecol, B, C, D, F, mass, fog] = cells;
            expect(A, row.label + ' A').toBe(row.A);
            expect(Ecol, row.label + ' E').toBe(row.E);
            expect(B, row.label + ' B').toBe(row.B);
            expect(C, row.label + ' C').toBe(Number(row.B).toFixed(1));
            expect(D, row.label + ' D').toBe(row.B);
            expect(F.split(' ')[0], row.label + ' F').toBe(row.F);
            expect(mass, row.label + ' mass %').toBe(row.mass + ' %');
            expect(fog, row.label + ' fog').toBe(row.fog ? 'yes' : 'no');
        }
    });

});
