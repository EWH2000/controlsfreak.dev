// ──────────────────────────────────────────────────────────────────────
// pid-engine.js — shared PID step-response simulation core
//
// Loaded as a *classic* script (no type="module") on purpose: each page's
// logic lives in an IIFE-wrapped inline <script>, and an IIFE's bindings
// can't be reached from outside it — so the engine exposes its API as plain
// globals (PID_PROC and simulatePid), not as ES-module exports. Any page
// that wants the simulator just adds
//
//     <script src="/scripts/pid-engine.js"></script>
//
// before its own inline <script>. The 11ty build templates the HTML chrome
// and copies this file through unchanged; the browser loads it directly,
// nothing transpiles or bundles.
//
// What lives here: the toy process model + the discrete-time stepping + the
// canonical-parameter interface (gain, repeats/min, minutes), plus two pure
// helpers (PID_DMAX, fmtDur) that both PID surfaces need but that don't
// belong on a single page. What does NOT live here: anything that touches
// the DOM or the units toggle — slider wiring, the canvas drawing, the
// unit-aware readout formatting. Canvas drawing lives in /scripts/pid-chart.js;
// per-page slider/preset glue stays on the page that hosts the sim
// (today: tools/pid-tuner.html and education/pid-basics.html).
//
// The model is a first-order lag plus dead time driven by a PID controller
// working on error as a % of the loop's nominal span — so the gain means the
// same thing across every process preset. It exists for intuition, not for
// tuning a real loop.
// ──────────────────────────────────────────────────────────────────────

'use strict';

// Process-model presets — the "plant", independent of any controller tuning.
//         lag(s)  dead(s)  window(s)   SP    rest  span   process gain (Δunits per %out)   decimals
const PID_PROC = {
    fast: { tau: 8,   dead: 1,  win: 80,   sp: 1.5, bias: 0,  range: 5,  kproc: 1.6 * 1.5 / 100, dec: 2 },
    med:  { tau: 45,  dead: 6,  win: 480,  sp: 70,  bias: 55, range: 50, kproc: 1.6 * 15  / 100, dec: 1 },
    slow: { tau: 240, dead: 30, win: 2400, sp: 72,  bias: 65, range: 20, kproc: 1.6 * 7   / 100, dec: 1 },
};

// Rate-slider max (minutes) per process speed: useful derivative time scales
// with the loop's time constant, so a static range can't serve fast and slow
// loops both — a 30 s rate is plenty on a 45 s loop and a rounding error on
// a 4 min one. (Gain and reset need no such re-ranging; their useful ranges
// hold across process speeds.) Both the full tuner and the Education mini-sims
// read from this table.
const PID_DMAX = { fast: 0.15, med: 0.5, slow: 2.0 };

// Run one step-response simulation.
//   proc — an entry from PID_PROC (or anything with the same shape)
//   Kc   — controller gain
//   rep  — integral action, repeats per minute (0 = integral off)
//   rate — derivative time, minutes (0 = derivative off)
// Returns the time/PV traces plus the derived metrics the UI shows:
//   { t, pv, sp, bias, win, dec, step, overshoot, ssErr, settled }
// where `settled` is the ±2 % settling time in seconds, or null if it never
// settles within the window, and `step` is the setpoint − resting-PV change.
function simulatePid(proc, Kc, rep, rate) {
    const N    = 600;
    const dt   = proc.win / N;
    const Td   = rate * 60;                                  // derivative time, seconds
    const deadSteps = Math.max(0, Math.round(proc.dead / dt));
    const SP   = proc.sp;

    let pv = proc.bias, pvPrev = proc.bias, iAcc = 0;
    const deadQ = new Array(deadSteps).fill(0);
    const T = [], PV = [];

    for (let k = 0; k <= N; k++) {
        T.push(k * dt);
        PV.push(pv);

        const e     = (SP - pv) / proc.range * 100;          // error, % of span
        const pTerm = Kc * e;
        const dTerm = -Kc * Td * ((pv - pvPrev) / dt) / proc.range * 100;   // derivative on measurement
        const iTerm = Kc * (rep / 60) * iAcc;
        const uRaw  = pTerm + iTerm + dTerm;
        const u     = Math.max(0, Math.min(100, uRaw));

        // Conditional integration (anti-windup): pause the integrator (a) at a
        // rail it's only pushing further into, and (b) while derivative action
        // is braking hard toward setpoint — otherwise the slower approach would
        // just wind the integral up to "cover" the brake, and adding D would
        // *add* overshoot once it releases instead of damping it. With Td = 0
        // (the default), dTerm is 0, so (b) never fires and this is the plain
        // rail-only anti-windup.
        const intoRail = (u >= 100 && e > 0) || (u <= 0 && e < 0);
        const braking  = dTerm * e < 0 && Math.abs(dTerm) > 2;
        if (!intoRail && !braking) iAcc += e * dt;

        deadQ.push(u);
        const uEff = deadQ.shift();

        pvPrev = pv;
        pv = pv + dt * (-(pv - proc.bias) + proc.kproc * uEff) / proc.tau;
    }

    // ── derived metrics ──
    const step = SP - proc.bias;
    let maxPv = -Infinity;
    for (const v of PV) if (v > maxPv) maxPv = v;
    const overshoot = step === 0 ? 0 : Math.max(0, (maxPv - SP) / step * 100);
    const ssErr = SP - PV[PV.length - 1];
    const bandTol = 0.02 * Math.abs(step);
    let lastOut = 0;
    for (let i = 0; i < PV.length; i++) if (Math.abs(PV[i] - SP) > bandTol) lastOut = i;
    const settled = lastOut >= PV.length - 1 ? null : T[lastOut + 1];

    return {
        t: T, pv: PV, sp: SP, bias: proc.bias, win: proc.win, dec: proc.dec,
        step, overshoot, ssErr, settled,
    };
}

// Format a duration in seconds for one of the PID readouts. Switches to
// minutes-and-seconds past 100 s so a 4-minute settling time reads as
// "4:23 min" rather than "263 s". Pure helper, no DOM / no Units.
function fmtDur(sec) {
    if (sec < 100) return Math.round(sec) + ' s';
    const m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
    return s ? `${m}:${String(s).padStart(2, '0')} min` : `${m} min`;
}
