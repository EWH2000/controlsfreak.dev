# codebase-issues.md

Running log of code-quality issues that need a design decision or
discussion before they can be acted on. Surfaced during the
2026-05-16 code audit. Items mechanical enough to fix without input
were addressed at the time (see *Recently addressed* below); the
rest live here until someone decides what to do about them.

## How this file is used

- Each open entry: a clear problem statement, what's at stake, what
  trade-offs the decision involves, and what action would follow.
- Resolved entries get a *(addressed YYYY-MM-DD)* marker — or get
  deleted if the resolution turned out to be "not worth doing."
- New entries land here as code issues surface (same running-list
  spirit as `site-ideas-and-friction.md`, but scoped to code quality
  rather than features / content).

---

## Open

### 1. Perpetual `setInterval` timers in widgets that don't always need them

Three widgets fire `setInterval` callbacks forever once the page
loads:

- `html/tools/vfd-mock.html:874` — 50 ms motor tick. Always calls
  `tickMotor()` + `render()` whether or not anything's changed. Real
  per-tick work, the worst of the three.
- `html/education/vfds.html:965` — 40 ms fan-rotation tick. The
  callback guards the actual work behind `isRunning() &&
  state.speedHz > 0`, but the timer still fires 25×/sec.
- `html/education/pump-control.html:872` — same fan pattern as
  vfds, same guard.

The fan-tick handle is never captured, so it can't be cleared. The
motor-tick handle isn't captured either.

**Why it matters:** modest CPU drain in idle and backgrounded tabs.
Browsers throttle background timers, so it's not catastrophic — but
it's wasted work, and the fix is small.

**Decisions blocking action:**

1. *Stay with `setInterval` and add lazy start/stop.* Capture the
   handle, `clearInterval` when state requires no further work,
   restart on demand. Smallest change; preserves the explicit-tick
   model that all three widgets use.
2. *Switch to `requestAnimationFrame`.* Browsers pause rAF in
   backgrounded tabs automatically — no need to manage start/stop.
   The friction file's vfds entry rejected CSS animations because
   changing `animation-duration` mid-animation makes the angle jump,
   but rAF doesn't have that issue since you still write the rotate
   transform per-frame. Different animation cadence (variable
   framerate vs. fixed 40 ms) may subtly affect the feel.

A small experiment on the vfds fan would settle the question.

### 2. `isFinite` vs `isNaN` convention drift

Pages use both, inconsistently:

- `isFinite` — `html/tools/psychrometric-chart.html` (16 sites),
  `html/tools/thermistor-calculator.html`,
  `html/education/balancing.html`.
- `isNaN` — `html/tools/signal-scaling.html` (8 sites),
  `html/tools/modbus-register-viewer.html`.

They behave differently on `Infinity` — `isFinite` rejects it,
`isNaN` accepts it. Unlikely to matter in practice (most inputs are
from `parseFloat` of `<input>` values, which can't produce Infinity)
but a reader scanning the code has to think about which is in use
here, and the distinction does matter for division-by-zero results.

**Decisions blocking action:**

- Pick one as the canonical convention. `isFinite` is the safer
  default (it also rejects `NaN`, `+Infinity`, `-Infinity`) and is
  what the newer pages already use.
- Update CLAUDE.md's "JS patterns" section to record the choice.
- Retrofitting the older pages is a follow-on (per page, ideally
  done when touching the page for another reason).

### 3. Inline `on*` handlers vs `addEventListener` — convention drift

Older pages wire events via inline HTML attributes (`onclick="..."`);
newer pages wire them via `addEventListener` inside an IIFE-wrapped
inline script.

| Page | Inline `on*` count |
|---|---|
| `psychrometric-chart.html` | 25 |
| `signal-scaling.html` | 23 |
| `pid-basics.html` | 12 |
| `pid-tuner.html` | 9 |
| `bacnet-ip-converter.html` | 8 |
| `thermistor-calculator.html` | 6 |
| `modbus-register-viewer.html` | 2 |
| `contact.html` | 1 |
| `vfd-mock`, `pump-control`, `vfds`, `load-piping`, `balancing` | **0** |

CLAUDE.md (line 277) still recommends inline handlers as the JS
pattern — that documentation is now stale relative to the
newer-page reality. Inline handlers couple JS-function names to
HTML; rename a function and the page silently breaks. The IIFE +
`addEventListener` pattern that newer pages use is more robust and
clearly scales.

**Decisions blocking action:**

- Which convention should new pages use? (Recommendation:
  `addEventListener`, matching the newer pages.)
- Update CLAUDE.md to reflect the chosen convention.
- Is it worth retrofitting older pages? (Probably not in one pass —
  too much surface area for the actual risk. Do it opportunistically
  when touching the page for something else.)

### 4. Per-page `<head>` boilerplate duplication

All 17 pages have near-identical `<head>` sections: 3 favicon links,
Google Fonts preconnect + load, the units-bootstrap inline script,
the `styles.css` link, plus 6 Open Graph tags that vary only in
title / description / canonical URL. Roughly 25–30 lines per page
that's mostly invariant.

CLAUDE.md flags this as the next forcing function for a generator
"when the page count reaches ~15–20." We're at 17. Each new page is
another 25-line copy that has to stay in sync with the others.

**Decisions blocking action:**

- *Stay with copy-paste*, accept the per-page cost going forward,
  re-evaluate at ~25 pages.
- *Extract a small `<script>`-injected partial loader* (writes the
  fonts + favicon links from JS at first paint). Breaks the
  "view-source shows the real code" property and adds a FOUC risk
  if the script hiccups.
- *Adopt a static site generator (Hugo or 11ty per CLAUDE.md's
  longer-term note).* Biggest change, but the cleanest fix —
  templates absorb the duplication permanently.

Worth a focused discussion before action.

### 5. Widget chrome CSS consolidation

Five widgets — `pc-w-*` (pump-control, two widgets), `bal-w-*`
(balancing), `vfd-w-*` (vfds), `vfdm-*` (vfd-mock), `d3-w-*`
(hydronic-loops d3) — share the same visual vocabulary: recessed
`--surface-3` panel, mono section labels, `--blue` readouts,
anecdote callout with `min-height` reservation. Roughly 80 lines of
CSS duplication across the five pages.

The balancing friction-file entry already calls this out:
*"promoting to a shared `.edu-w-*` rule set in `styles.css` is
starting to look like a next-restructure-pass candidate."*

**Decisions blocking action:**

- *Class-prefix naming.* `.edu-w-*` is awkward because `vfd-mock` is
  a Tools page, not Education. Alternatives: `.widget-*` (clear,
  slightly long), `.w-*` (terse but anonymous), `.fw-*` ("framework
  widget" — meaningful but obscure).
- *Scope of the retrofit.* All five pages in one pass (high churn,
  one big diff) vs. one page at a time as each gets touched for an
  unrelated reason (low risk but slow).
- *Timing.* Wait until the next widget addition — the friction file
  predicts a sixth widget is the trigger to take this seriously.

### 6. `psychrometric-chart.html` is monolithic

1356 lines of inline JS + 1319 lines of inline CSS + 46
`getElementById` calls — by far the biggest single page. It's one
focused tool, so monolithic is defensible, but it sits at the edge.

The deferred phase-3 (floating state-point chip) would push it
further. The math layer (`satPress`, `humRatioFromWetBulb`,
`solveState`, `solveChain`) is a clean extraction candidate as
`html/scripts/psychro-engine.js`.

**Decision blocking action:** the friction file already records
*"extract to `html/scripts/` only if a second tool needs them."* No
second tool yet — wait for the next caller, or for the page to grow
past a self-imposed budget. Flag if phase-3 ships and the file
crosses (say) 3500 lines total.

### 7. Worker has no app-level rate limit on `/api/contact`

Cloudflare's edge DDoS protection covers gross abuse, but a public
contact form is a classic abuse target — a determined attacker can
hammer a single endpoint with thousands of submissions within the
edge's normal-request envelope. For per-IP throttling on the worker
itself you'd need a Durable Object (counter per IP, expiring TTL),
Workers KV (cheaper but eventually-consistent), or Cloudflare's
paid Rate Limiting product.

**Decisions blocking action:**

- Implementation cost (Durable Object is a real architectural
  addition; KV is cheap but the consistency model leaks abuse
  through) vs. actual observed risk.
- For a small personal site with Cloudflare's existing protection,
  probably fine to defer. Flag for revisit if abuse actually
  appears (Resend's dashboard would show it as send-volume spikes).

### 8. `flow-engine.js` doesn't react to live `prefers-reduced-motion` changes

`html/scripts/flow-engine.js:110` — the reduced-motion check
happens once at `init()`. If the user toggles their OS preference
mid-session (rare — usually a one-time setup), the engine keeps
animating.

**Decision blocking action:** worth a
`matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', ...)`
listener that tears down all pools when the user flips on
reduced-motion? Adds ~10 lines for a rare edge case. Probably skip
— recording so it's not re-discovered as a "missing" feature later.

---

## Recently addressed

The 2026-05-16 audit also caught these, which were fixed in the
same session this file was created:

- **`switchTab` and `copyReadouts` duplicated across pages**
  (`bacnet-ip-converter.html`, `signal-scaling.html`) — extracted to
  a new `html/scripts/ui.js`, alongside a `copyText(btn, text)`
  primitive that both helpers (and `thermistor-calculator.html`'s
  `thCopy`) now share. The single `copyText` also handles
  clipboard-rejection with `.catch()` — the previous two copies of
  `copyReadouts` didn't, which would surface as console-error
  failures in the smoke tests on insecure-context / no-user-activation
  paths.
- **`flow-engine.js` had no cleanup for detached pools** — if a
  page removed an annotated SVG element after `init()`, the engine
  would keep calling `getPointAtLength` on the disconnected node
  forever and the pool would hold the reference. No current page
  hits this, but the frame loop now checks `pool.el.isConnected`
  and splices + removes circles for any stale pool. Two-line guard
  with backwards-iteration for safe splice.
- **`units.js` used `var` throughout** while every other script
  (`pid-engine.js`, `flow-engine.js`, `thermistor-data.js`,
  `ui.js`) uses `const`/`let`. Normalized to `const` (with `let`
  preserved for the four mutable bindings: the `units` variable
  and three for-loop counters).
- **`src/worker.js` input validation gaps** — the `field()` helper
  returned `.toString()` on `formData.get()`, which would silently
  surface a File upload as `"[object File]"`; tightened with a
  `typeof === 'string'` guard. The email check was regex-only with
  no length cap; added `email.length > 200` next to the existing
  length validators.
- **Smoke-test coverage gap on the balancing widget** — added
  boundary assertions at Δp = 3 ft and Δp = 50 ft (the ABV
  compensation-band edges) so a future change to the cartridge
  range can't accidentally break the orifice-vs-compensation
  transition without the test catching it.
