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

**Decision (2026-05-16):** split by widget type.

- *Fan widgets (`vfds.html`, `pump-control.html`)* → switch to
  `requestAnimationFrame`. Both already write a transform per frame
  and the work is purely visual; rAF gives free background-tab
  pausing and removes the need for a start/stop state machine.
- *Motor tick (`vfd-mock.html`)* → keep `setInterval` with lazy
  start/stop. Capture the handle; `clearInterval` when motor is at
  rest AND no flash-message pending; restart on the next user
  input. Preserves the fixed 50 ms dt the motor integrator depends
  on; avoids gauge bouncing at high-refresh display rates.
- *Scope:* all three in one pass (Block A — pre-migration).

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
The signal-scaling tool's `1 / (maxEU - minEU)` is a live example:
identical bounds produce `Infinity`, which the current `isNaN`-only
check would not catch.

**Decision (2026-05-16):** `isFinite` is canonical. Retrofit
`signal-scaling.html` (8 sites) and `modbus-register-viewer.html` in
one pass; update CLAUDE.md's JS-patterns section to record the
choice. Lands as part of Block C (post-migration cleanup) so we
don't touch the same files twice.

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

CLAUDE.md's "JS patterns" section still recommends inline handlers
— that documentation is now stale relative to the newer-page
reality. Inline handlers couple JS-function names to HTML; rename a
function and the page silently breaks. They also can't coexist with
an IIFE-wrapped script (handler can't see IIFE-private functions),
and they require `unsafe-inline` script-src if CSP ever tightens.

**Decision (2026-05-16):** `addEventListener` + IIFE is the
convention for new pages and for the retrofit. Retrofit all 8
older pages in one pass (~84 handler conversions); update CLAUDE.md
JS-patterns section. Lands as part of Block C (post-migration
cleanup) so handlers are wired against the templated source, not
the soon-to-be-replaced HTML.

### 4. Per-page `<head>` boilerplate duplication

All 17 pages have near-identical `<head>` sections: 3 favicon links,
Google Fonts preconnect + load, the units-bootstrap inline script,
the `styles.css` link, plus 6 Open Graph tags that vary only in
title / description / canonical URL. Roughly 25–30 lines per page
that's mostly invariant.

CLAUDE.md flags this as the next forcing function for a generator
"when the page count reaches ~15–20." We're at 17. Each new page is
another 25-line copy that has to stay in sync with the others.

**Decision (2026-05-16):** adopt 11ty (Eleventy) as a static site
generator. This is a project-philosophy shift — the "no build step"
note in CLAUDE.md gets revised. Reasons: active growth trajectory
(5+ new pages planned), and the outcome (no duplication, clean
static-HTML output) outweighs the source-purity loss. 11ty
specifically because the source files stay mostly readable as HTML
(`.html` source with `{% include %}` and frontmatter), the build is
a single `npx eleventy`, and Cloudflare has native build-command
support so the existing GitHub auto-deploy keeps working.

Scope of the migration (Block B):

- New top-level `_includes/` with `head.njk`, `nav.njk`,
  `footer.njk`, and a `layouts/page.njk` layout.
- Each existing page gains YAML frontmatter (`title`,
  `description`, `canonical`, `nav`, optional `extraHead`) and its
  `<head>` + `.site-nav` + `<footer>` collapse into includes.
- Per-page inline `<style>` / `<script>` blocks survive verbatim
  via a `{% block extra %}` slot in the layout.
- Output directory `_site/` (gitignored); `wrangler.jsonc`'s
  `assets.directory` updates to point at it.
- `html/scripts/`, `html/styles.css`, `html/assets/`,
  `html/robots.txt`, `html/sitemap.xml` pass through unchanged.
- Anchor `.html` extensions preserved by keeping source files as
  `.html` (with `htmlTemplateEngine: "njk"` so templating still
  runs).
- Local dev shifts from `python3 -m http.server` to
  `npx @11ty/eleventy --serve`.
- Playwright smoke tests stay valid (output HTML matches today's
  structure); they just run against the new dev server port.

Detail planning lives outside this file — see the migration plan
when it lands.

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

Two distinct flavors of duplication hide here: the *widget shell*
(recessed `--surface-3` panel, mono section labels, blue readouts,
anecdote callout) is the ~80-line consolidation candidate; the
*widget internals* (`.vfdm-key`, `.vfdm-lcd`, `.d3-w-temp-swatch`,
etc.) are page-unique and stay where they are.

**Decision (2026-05-16):** consolidate the widget shell rules under
the `.widget-*` prefix in `styles.css`. Other prefix candidates
(`.edu-w-*` page-locked, `.sim-*` semantics-locked, `.w-*` too
anonymous, `.fw-*` obscure) rejected. Lands as part of Block C
(post-migration cleanup) — extracting CSS before the 11ty migration
would force two passes over the same five pages.

### 6. `psychrometric-chart.html` is monolithic

1356 lines of inline JS + 1319 lines of inline CSS + 46
`getElementById` calls — by far the biggest single page. It's one
focused tool, so monolithic is defensible, but it sits at the edge.

The deferred phase-3 (floating state-point chip) would push it
further. The math layer (`satPress`, `humRatioFromWetBulb`,
`solveState`, `solveChain`) is a clean extraction candidate as
`html/scripts/psychro-engine.js`.

**Decision (2026-05-16):** hold. No second caller for the math
today, and the 1387-line page is monolithic-but-coherent. **But**:
the deferred phase-3 (floating state-point chip) is near-term, and
adding 300+ lines of UI state on top of an already-large file is
the wrong order to work in. When phase-3 begins, *first step* is
extracting the math layer to `html/scripts/psychro-engine.js`
(`satPress`, `humRatioFromWetBulb`, `solveState`, `solveChain`) so
the chip lands against a smaller surface. Trigger: phase-3 work
starting, OR a second tool needing psychrometric math (air-mixing,
coil sizing, economizer-ratio would qualify).

### 7. Worker has no app-level rate limit on `/api/contact`

Cloudflare's edge DDoS protection covers gross abuse, but a public
contact form is a classic abuse target — a determined attacker can
hammer a single endpoint with thousands of submissions within the
edge's normal-request envelope. For per-IP throttling on the worker
itself you'd need a Durable Object (counter per IP, expiring TTL),
Workers KV (cheaper but eventually-consistent), or Cloudflare's
paid Rate Limiting product.

**Decision (2026-05-16):** defer. Cloudflare edge protection +
Turnstile + the silent honeypot already cover the realistic threat,
and Resend's own send-volume limits cap the worst case. Trigger for
revisit: Resend dashboard shows a send-volume spike. At that point
the cheapest fix is a Workers KV-based per-IP throttle (~30 lines
in `worker.js`, 60s TTL, eventually-consistent but plenty against
the realistic attack); Cloudflare's paid Rate Limiting product
($5/mo) is the no-code fallback.

### 8. `flow-engine.js` doesn't react to live `prefers-reduced-motion` changes

`html/scripts/flow-engine.js:110` — the reduced-motion check
happens once at `init()`. If the user toggles their OS preference
mid-session (rare — usually a one-time setup), the engine keeps
animating.

**Decision (2026-05-16):** not pursuing. OS-level reduced-motion
toggling mid-session is vanishingly rare; the user almost always
sets it at accessibility-setup time and leaves it. Cost (~15 lines,
a `matchMedia` listener plus per-pool teardown logic, plus state to
make it survive page navigation) outweighs the benefit. Recorded
here so this isn't re-discovered as a "missing accessibility
feature" — it's a *considered-and-skipped* feature. Trigger that
would change the call: an accessibility audit that specifically
flags it, or evidence of users actually toggling mid-session.

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
