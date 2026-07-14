// Engine-direct tests for /scripts/pid-engine.js (audit-2026-06 #42,
// pid half). Same vm pattern as psychro-engine.spec.js — the engine is
// pure (no DOM, no Units), so it loads straight into a vm context.
// Prior coverage was "readouts not '—'" through the page; the u/uEff
// dead-time queue the process-visual equipment scenes depend on was
// pinned nowhere.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'pid-engine.js'),
        'utf8',
    );
    // Classic script with top-level declarations — bundle the exports
    // as the script's completion value (psychro-engine.spec.js
    // pattern).
    return vm.runInNewContext(
        src + '\n; ({ PID_PROC, PID_DMAX, simulatePid, fmtDur })', {});
}

const { PID_PROC, PID_DMAX, simulatePid, fmtDur } = loadEngine();

test('P-only leaves the analytic steady-state offset (med, Kc=2)', () => {
    // Closed-form: pv_ss = (bias + 2·Kc·SP/ ... ) — for med (bias 55,
    // SP 70, range 50, kproc 0.24), Kc=2 ⇒ ssErr = 15/1.96 ≈ 7.6531.
    const r = simulatePid(PID_PROC.med, 2, 0, 0);
    expect(r.ssErr).toBeCloseTo(15 / 1.96, 2);
    expect(r.overshoot).toBe(0);
});

// Pins the pid-basics "P only" (Sim 1) caption to the engine (#154,
// content-audit #45). The Education mini-sim exposes only the fast / med
// / slow chips — all low dead-time (dead÷τ ≈ 0.13) — so pure P cannot
// ring on them at any reachable gain; the caption must promise a
// tightening offset, not overshoot. Ringing under P alone needs the
// dead-time-dominant loop (vhigh, dead÷τ = 0.5), which lives only on the
// full tuner. Same root cause as content-audit #34, one surface further.
test('pure P cannot ring on the Sim 1 loops but rings on the dead-time loop (#154)', () => {
    for (const key of ['fast', 'med', 'slow']) {
        for (const Kc of [10, 20]) {                 // 20 = Sim 1 slider max
            const r = simulatePid(PID_PROC[key], Kc, 0, 0);
            expect(r.overshoot, `${key} Kc=${Kc} must not overshoot under pure P`).toBe(0);
        }
    }
    // The dead-time-dominant loop the caption points at (the full tuner's)
    // does overshoot/ring once gain climbs — that's why it's the one to use.
    expect(simulatePid(PID_PROC.vhigh, 20, 0, 0).overshoot).toBeGreaterThan(5);
});

test('adding integral removes the offset (med, Kc=2, 1 repeat/min)', () => {
    const r = simulatePid(PID_PROC.med, 2, 1, 0);
    expect(Math.abs(r.ssErr)).toBeLessThan(0.1);
});

test('output clamp invariant: u and uEff stay in [0,100] under aggressive tuning', () => {
    for (const key of Object.keys(PID_PROC)) {
        const r = simulatePid(PID_PROC[key], 20, 6, PID_DMAX[key]);
        for (const arr of [r.u, r.uEff]) {
            for (const v of arr) {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(100);
            }
        }
    }
});

test('dead-time queue: uEff is u delayed by exactly deadSteps samples', () => {
    // The equipment scenes lean on this contract — the actuator moves
    // on u immediately while the plant sees uEff `dead` seconds later.
    const proc = PID_PROC.med;
    const r = simulatePid(proc, 2, 1, 0);
    const dt = proc.win / 600;
    const deadSteps = Math.round(proc.dead / dt);
    expect(deadSteps).toBe(8);
    // Before any command can propagate, the plant sees zeros.
    for (let k = 0; k < deadSteps; k++) expect(r.uEff[k]).toBe(0);
    // And from there on, uEff is u shifted by deadSteps, sample-exact.
    for (let k = 0; k + deadSteps < r.u.length; k++) {
        expect(r.uEff[k + deadSteps]).toBe(r.u[k]);
    }
});

test('ringing twin: same tuning is tame on med and rings unstable on vhigh', () => {
    // The dead-time-dominant preset exists so "too much P" is reachable
    // (ux-audit #6). Same aggressive tuning on both: med settles with
    // minor overshoot; vhigh overshoots hard, crosses setpoint over and
    // over, and never settles in the window. (Asserting crossings +
    // settled:null instead of a bare >20% overshoot bar — the audit
    // verifier flagged that margin as too thin at 21.3 vs 20.)
    const tame = simulatePid(PID_PROC.med, 20, 2, 0);
    const ringing = simulatePid(PID_PROC.vhigh, 20, 2, 0);

    expect(tame.overshoot).toBeLessThan(5);
    expect(tame.settled).not.toBeNull();

    expect(ringing.overshoot).toBeGreaterThan(15);
    expect(ringing.settled).toBeNull();
    let crossings = 0;
    for (let i = 1; i < ringing.pv.length; i++) {
        if ((ringing.pv[i] - ringing.sp) * (ringing.pv[i - 1] - ringing.sp) < 0) crossings++;
    }
    expect(crossings).toBeGreaterThanOrEqual(6);
});

test('fmtDur switches to min:sec past 100 s', () => {
    expect(fmtDur(45)).toBe('45 s');
    expect(fmtDur(263)).toBe('4:23 min');
    expect(fmtDur(240)).toBe('4 min');
});
