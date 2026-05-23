// ──────────────────────────────────────────────────────────────────────
// pid-chart.js — shared PV-vs-setpoint canvas chart + unit-aware readout helpers
//
// Two PID surfaces draw the same step-response chart (PV trace + setpoint
// line + soft fill) and would otherwise carry near-duplicate drawing code:
// the full tuner (simulators/pid-tuner.html) and the three Education mini-sims
// (education/pid-basics.html). This file is the consolidation.
//
// API (classic-script globals, same pattern as /scripts/pid-engine.js):
//
//   drawPidChart(canvas, sim, opts)
//       Draw `sim` (the result of simulatePid) into `canvas`.
//       opts.variant:     'full' (default) | 'mini'
//                         'full' = labeled axes, gridlines, no border;
//                         'mini' = uniform padding, border rect, smaller
//                         font, "SP" tag on the setpoint line.
//       opts.shadeOffset: boolean (mini Sim 1 only) — faint red band
//                         between final PV and SP, illustrating the
//                         steady-state offset P alone leaves behind.
//
//   formatPidDelta(canonicalValue, sim, procKey)
//       Format a delta in canonical units (°F for med/slow, in. w.c. for
//       fast) as a display-ready string with unit, respecting the global
//       US/metric toggle. Sign is preserved — pages that show
//       "PV above SP" pass +sim.ssErr; pages that show "offset below SP"
//       pass -sim.ssErr.
//
// Loaded as a *classic* script (no type="module") for the same reason as
// pid-engine.js: each page's logic lives in an IIFE-wrapped inline script,
// and an IIFE can't see ES-module exports without a bundler. The 11ty
// build templates the HTML chrome and copies this file through unchanged.
// ──────────────────────────────────────────────────────────────────────

'use strict';

// Tiny hex → rgba helper for the afterglow trace gradient below. Assumes
// the input is a 6-digit hex string returned by getComputedStyle on a
// :root CSS custom property (the one and only call site today).
function hexToRgba(hex, a) {
    const v = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
}

function drawPidChart(canvas, sim, opts) {
    opts = opts || {};
    const variant = opts.variant || 'full';
    const shadeOffset = !!opts.shadeOffset;

    if (!canvas || !sim) return;
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const css = getComputedStyle(document.documentElement);
    const cv = (name) => css.getPropertyValue(name).trim();
    const cSurface = cv('--surface');
    const cBorder  = cv('--border');
    const cDim     = cv('--text-dim');
    const cAccent  = cv('--accent');
    const cFill    = cv('--accent-dim');
    ctx.fillStyle = cSurface;
    ctx.fillRect(0, 0, cssW, cssH);

    const { t, pv, sp, bias, win, dec } = sim;

    const isFull = variant === 'full';
    const padL = isFull ? 46 : 8;
    const padR = isFull ? 12 : 8;
    const padT = isFull ? 12 : 8;
    const padB = isFull ? 22 : 8;
    const w = cssW - padL - padR, h = cssH - padT - padB;
    if (w <= 0 || h <= 0) return;

    // y-range: full plot has more headroom for axis labels; mini is tighter
    // so overshoot / offset read clearly in the smaller box.
    const topMul = isFull ? 0.6  : 0.4;
    const botMul = isFull ? 0.15 : 0.12;
    const padMul = isFull ? 0.05 : 0.06;
    let yMax = sp + (sp - bias) * topMul;
    let yMin = bias - (sp - bias) * botMul;
    for (const v of pv) { if (v > yMax) yMax = v; if (v < yMin) yMin = v; }
    const yp = (yMax - yMin) * padMul || 1;
    yMax += yp; yMin -= yp;
    if (yMax === yMin) yMax = yMin + 1;

    const X = tt => padL + (tt / win) * w;
    const Y = vv => padT + h - ((vv - yMin) / (yMax - yMin)) * h;

    ctx.lineWidth = 1;

    if (isFull) {
        // gridlines + axis labels
        ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.strokeStyle = cBorder;
        ctx.fillStyle = cDim;
        for (let i = 0; i <= 4; i++) {
            const v = yMin + (i / 4) * (yMax - yMin);
            const yy = Y(v);
            ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(padL + w, yy); ctx.stroke();
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(v.toFixed(dec), padL - 6, yy);
        }
        for (let i = 0; i <= 4; i++) {
            const tt = (i / 4) * win;
            const xx = X(tt);
            ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, padT + h); ctx.stroke();
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(win <= 120 ? Math.round(tt) + 's' : Math.round(tt / 60) + 'm', xx, padT + h + 5);
        }
    } else {
        // border rect demarcates the chart area in absence of gridlines
        ctx.strokeStyle = cBorder;
        ctx.strokeRect(padL, padT, w, h);

        if (shadeOffset) {                                  // Sim 1: faint band = the gap P can't close
            const yPv = Y(pv[pv.length - 1]), ySp = Y(sp);
            ctx.fillStyle = 'rgba(196,56,47,0.10)';
            ctx.fillRect(padL, Math.min(yPv, ySp), w, Math.max(1, Math.abs(yPv - ySp)));
        }
    }

    // setpoint (dashed)
    ctx.strokeStyle = cDim;
    ctx.setLineDash(isFull ? [5, 4] : [5, 3]);
    ctx.beginPath(); ctx.moveTo(padL, Y(sp)); ctx.lineTo(padL + w, Y(sp)); ctx.stroke();
    ctx.setLineDash([]);

    // PV trace + soft fill below — BAS-flare afterglow: the trace fades
    // from low alpha at t=0 to full intensity at the most recent sample,
    // so the eye is pulled to the right edge ("what just happened?") the
    // way it would on a live ticker. Static chart, but the gradient lends
    // the same alive feeling.
    ctx.beginPath();
    for (let i = 0; i < t.length; i++) {
        const xx = X(t[i]), yy = Y(pv[i]);
        i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
    }
    const traceGrad = ctx.createLinearGradient(padL, 0, padL + w, 0);
    traceGrad.addColorStop(0,    hexToRgba(cAccent, 0.42));
    traceGrad.addColorStop(0.75, hexToRgba(cAccent, 0.92));
    traceGrad.addColorStop(1,    cAccent);
    ctx.strokeStyle = traceGrad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(X(t[t.length - 1]), padT + h);
    ctx.lineTo(X(0), padT + h);
    ctx.closePath();
    ctx.fillStyle = cFill;
    ctx.fill();

    if (!isFull) {                                          // mini: "SP" tag on the setpoint line
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.fillStyle = cDim;
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('SP', padL + w - 3, Y(sp) - 2);
    }
}

// Unit-aware formatting for the steady-state error / offset readouts.
//
// The sim runs in canonical units — fast loop in in. w.c., med/slow in °F.
// Convert at the display boundary when the global toggle is metric. Offsets
// are deltas, so use deltaTemp / staticPressure (both linear today, but the
// right primitives keep the call sites correct for any future ones that
// aren't).
function pidUnit(procKey) {
    const u = window.Units && window.Units.current ? window.Units.current() : 'us';
    if (procKey === 'fast') return u === 'us' ? 'in. w.c.' : 'Pa';
    return u === 'us' ? '°F' : '°C';
}

function pidConvertDelta(value, procKey) {
    if (!window.Units || window.Units.current() === 'us') return value;
    return procKey === 'fast'
        ? window.Units.display.staticPressure(value)
        : window.Units.display.deltaTemp(value);
}

// Round at the same precision the canonical value used, with one fewer
// decimal in metric for the fast loop (Pa values are larger).
function formatPidDelta(canonicalValue, sim, procKey) {
    const display = pidConvertDelta(canonicalValue, procKey);
    const isMetric = !!(window.Units && window.Units.current() === 'metric');
    const dec = (procKey === 'fast' && isMetric) ? 0 : sim.dec;
    const sign = display > 0 ? '+' : '';
    return `${sign}${display.toFixed(dec)} ${pidUnit(procKey)}`;
}
