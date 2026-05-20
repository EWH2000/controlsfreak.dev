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

### 1. Perpetual `setInterval` timers in widgets that don't always need them *(addressed 2026-05-16)*

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

### 2. `isFinite` vs `isNaN` convention drift *(addressed 2026-05-16)*

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

### 3. Inline `on*` handlers vs `addEventListener` — convention drift *(addressed 2026-05-16)*

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

### 4. Per-page `<head>` boilerplate duplication *(addressed 2026-05-16)*

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

- `html/_includes/` holds `head.njk`, `nav.njk`, `footer.njk`, and a
  `layouts/page.njk` layout.
- Each page gains YAML frontmatter (`title`, `description`,
  `canonical`, `nav`) and uses Nunjucks `{% extends
  "layouts/page.njk" %}` rather than 11ty's `layout:` convenience —
  needed so pages can fill multiple named slots in the layout.
- The layout exposes three named blocks: `{% block head %}` for
  `<head>` additions (page-specific inline `<style>`, third-party
  loader scripts), `{% block content %}` for the page body
  (everything between nav and footer), `{% block scripts %}` for
  end-of-body scripts.
- Output directory `_site/` (gitignored); `wrangler.jsonc`'s
  `assets.directory` flips from `./html` to `./_site` in Step 5.
- `html/scripts/`, `html/styles.css`, `html/assets/`,
  `html/robots.txt`, `html/sitemap.xml` pass through unchanged via
  `addPassthroughCopy()` in `.eleventy.js`.
- Anchor `.html` extensions preserved by keeping source files as
  `.html` (with `htmlTemplateEngine: "njk"` so templating still
  runs) and a directory data file (`html/html.11tydata.js`) that
  overrides 11ty's default pretty-URL permalink.
- `setNunjucksEnvironmentOptions({ trimBlocks: true,
  lstripBlocks: true })` keeps empty `{% block %}{% endblock %}`
  pairs from leaving stray whitespace in rendered HTML.
- Dev command: `npm run dev` (= `eleventy --serve --port=8000`).
  Test command: serve `_site/` with `python3 -m http.server 8000
  --directory _site` and run Playwright as before.

**Progress:**

- 2026-05-16 — Step 1 (f4031f8): 11ty pipeline standing up.
  `.eleventy.js`, `package.json` scripts (build/dev/test), the
  `html.11tydata.js` permalink override, `_site/` gitignored,
  `@11ty/eleventy ^3.0.0` installed.
- 2026-05-16 — Step 2 (6f1c708) and Step 4 Batch 1 (e6d5835):
  layout + partials written; `index.html`, `contact.html`,
  `tools/index.html`, `education/index.html` converted to template
  form. Multi-slot mechanism (`{% block head %}` /
  `{% block content %}` / `{% block scripts %}`) exercised by
  contact.html.
- 2026-05-16 — **Emergency revert (4ea594d)**: the four templated
  pages restored to pre-conversion HTML. Production was serving
  the raw template source because the Cloudflare Workers Build
  dashboard was never configured to run the build step in CI —
  `wrangler.jsonc` still pointed at `./html`. **Planning lesson:
  the deploy-pipeline configuration must be a hard prerequisite
  before any page conversion, not a Step-5 cleanup.**
- 2026-05-16 — Recovery: Cloudflare Workers Build dashboard
  configured with `npm install && npm run build`;
  `wrangler.jsonc` flipped from `./html` to `./_site` (b1cc8b7);
  build pipeline verified end-to-end in production (the leaked
  `/_includes/*` URLs now 404 instead of 200, site renders
  unchanged); Step 2 + Batch 1 conversions re-applied (c66e6a1).
  **4 of 17 pages templated** and confirmed live.
- 2026-05-16 — Step 4 Batch 2 (7a63bec): 6 education content pages
  converted (`pid-basics`, `hydronic-loops`, `load-piping`, `vfds`,
  `pump-control`, `balancing`). **10 of 17.**
- 2026-05-16 — Step 4 Batch 3 (1209e1e): 6 simpler tools converted
  (`signal-scaling`, `bacnet-ip-converter`, `modbus-register-viewer`,
  `thermistor-calculator`, `pid-tuner`, `vfd-mock`). Caught one
  silent NBSP normalization on `signal-scaling.html` (4 NBSPs in the
  inline script collapsed to ASCII space during Read→Write); patched
  via `sed -i` with literal `\xc2\xa0`. Audited the other 15 pages —
  no NBSP drift elsewhere. **16 of 17.**
- 2026-05-16 — Step 4 Batch 4 (bda6c8b): `psychrometric-chart`
  converted — the last and largest single-page conversion (~1387
  lines, ~50KB inline JS untouched per #6). **17 of 17 templated
  and live.**
- 2026-05-16 — Step 6 (959750a): `CLAUDE.md` and `README.md`
  rewritten for the templated layout. Migration banner dropped,
  "no build step" framing replaced with "minimal 11ty build
  templates the chrome only", new sections cover the partials,
  layout blocks, frontmatter fields, and the gotchas that surfaced
  during migration (HTML autoescape on `{{ description }}`,
  column-4 indent for block head, NBSP-on-Read→Write drift). The
  "Adding a new tool" walkthrough now starts from frontmatter.

Migration complete. Block C (codebase-issues #2, #3, #5) is the
next forcing function and was deliberately deferred to land
against the templated source.

### 5. Widget chrome CSS consolidation *(addressed 2026-05-16)*

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

### 6. `psychrometric-chart.html` is monolithic *(addressed 2026-05-17)*

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

**Resolution (2026-05-17, PR 1 of phase 3):** math layer extracted to
`html/scripts/psychro-engine.js` with a two-tier API — ASHRAE primitives
(satPress, humRatioFromVapPress, vapPressFromHumRatio, satHumRatio,
humRatioFromRH, rhFromHumRatio, enthalpy, specificVolume, pressFromAltitude,
humRatioFromWetBulb, wetBulbFromHumRatio, dewPointFromVapPress) at the top
level as script-scoped globals, and the higher-level solver (solveState,
buildState, computeProcess) namespaced under `window.Psychro` so a future
second consumer can grow its own solver methods without bare-name
collisions. The chain solver (`solveChain`) stays on the page — it reads
DOM and converts through `window.Units`, so it's the DOM↔engine bridge
not a pure math function. Page drops from 1384 → 1262 lines. The
candidate second-consumer hedges (air-mixing, coil-sizing, economizer-
ratio) are promoted to first-class roadmap entries in
`site-ideas-and-friction.md` so the engine's API shape is reviewed against
real second-tool needs when one of them lands. Phase-3 chip work follows
in PR 2 on the smaller page.

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

### 9. Stale comments — second sweep after Block C and the 11ty migration *(addressed 2026-05-17)*

The 2026-05-16 post-audit re-evaluation caught `ui.js` and balancing.html.
A deeper sweep on 2026-05-17 surfaced two more families of the same
pattern.

*"inline `on*` handlers" — described as the live convention after Block C
#3 removed every one site-wide:*

- `html/scripts/pid-engine.js:5`
- `html/scripts/thermistor-data.js:6`
- `html/tools/pid-tuner.html:205`
- `html/tools/thermistor-calculator.html:184`
- `html/education/pid-basics.html:225`

*"no build step" — described as the live convention after Block B Step 6
retired the framing in CLAUDE.md / README.md:*

- `html/scripts/pid-engine.js:11`
- `html/scripts/thermistor-data.js:10`
- `html/styles.css:12`

*Step-1-of-migration framing on a finished migration:*

- `.eleventy.js:1-7` — header still describes "Step 1 stands the build
  up without touching any pages" as starting state.

**Why it matters:** future readers (and future Claude sessions) take
the comments at face value. A contributor reading "wires its UI with
inline `on*` handlers, which can only see globals" naturally writes a
new page in that style and silently drifts the Block C convention back.

**Decision (2026-05-17):** mechanical sweep. Surrounding rationale kept
where still valid — classic-script-not-module is still the right call
on the shared engines; the *reason* (the IIFE-private scope of the page
inline script, not on* handlers) is what changes.

### 10. Dead "Coming Soon" CSS surface *(addressed 2026-05-17)*

`html/styles.css` carried ~40 lines of unreferenced rules from the
earlier roadmap-grid surface:

- `.tool-grid` (lines 485-489)
- `.tool-preview` + `::after` "COMING SOON" pseudo-element (490-508)
- `.tool-preview-icon`, `.tool-preview-name`, `.tool-preview-desc`
  (509-521)
- `.tool-tag.pending` (817-823)

`tools/index.html` no longer uses any of these — the roadmap moved to
`site-ideas-and-friction.md`. `.form-row.three` (line 308) was a
three-column variant of `.form-row` with zero use.

CLAUDE.md's "Tools landing shows live tools as a `.nav-card` grid above
a 'Coming Soon' `.tool-grid` of dimmed `.tool-preview` cards (the
roadmap surface)" is itself stale relative to `tools/index.html`.

**Decision (2026-05-17):** removed both rule blocks. CLAUDE.md "Design
landmarks" prose still describes the roadmap surface — separate refresh
when CLAUDE.md is next touched.

### 11. No `<h1>` and broken heading hierarchy on inner pages *(addressed 2026-05-17)*

`html/index.html` has a proper `<h1>` in its hero. Every other page on
the site has zero, one, or wrong-level heading elements:

- All 8 `html/tools/*.html` files — **zero** `<h1>/<h2>/<h3>/<h4>`. The
  visible page title is a `<div class="tool-card-title">`.
- `html/education/{vfds, pid-basics, pump-control, hydronic-loops}.html`
  — start at `<h4>`, skipping h1/h2/h3 entirely.
- `html/education/{balancing, load-piping, index}.html`,
  `html/contact.html`, `html/tools/index.html` — zero heading elements
  at all.

**Why it matters:** screen-reader users navigate by heading; a page
with no headings or a broken hierarchy can't be skimmed. Search engines
use h1 to anchor the page topic. This is the largest single
accessibility gap on the site.

**Priority:** HIGH.

**Recommended action:** decide the canonical archetype:

- *Tools* — `<h1>` for the tool name (today: `.tool-card-title`),
  `<h2>` for tab labels / section subheads (today: `.section-label`).
- *Education* — `<h1>` for the page topic (today: `.section-label`),
  `<h2>` for major sections (today: page-local h4s where any exist
  at all), `<h3>` for sub-callouts.
- Adopt as a `.section-header` / `.tool-card-title` template change —
  the existing class slot becomes the h1/h2 host visually, while
  staying one shared style. Then sweep the 17 pages. Lands cleanly
  against the templated layout; batch like Block B did.

**Resolution (2026-05-17):** the element-agnostic sweep landed across
all 17 pages. `.tool-card-title` is the `<h1>` host on every content
page; landing pages (`/tools/`, `/education/`, plus `pid-basics.html`
as a one-off — no top-level tool-card-title) promote the eyebrow
`.section-label` to `<h1>` instead. In-page section dividers
(second/third `.section-header > .section-label`) become `<h2>`, as
do `.ps-section-label` (Input/Output/Reference) and `.subhead`
(within-`.tool-body` thematic dividers). Existing `.callout h4`
cards demote to `<h3>` (also: the rule itself moved from
`.callout h4` to `.callout h3` in `styles.css`). Secondary
`.tool-card-title`s nested under an `<h2>` step to `<h3>` (the three
mini-sims on `pid-basics.html` under "See Each Term in Action"; the
"About these tables" card on `thermistor-calculator.html` stays
`<h2>` since no `<h2>` divides it from the page topic). The class
rules pick up `margin: 0` so heading default margins don't disturb
the layout. The new convention is recorded under CLAUDE.md
"Conventions → Heading hierarchy."

### 12. Form-input labels not programmatically associated *(addressed 2026-05-17)*

Across 8 tool pages, **39 inputs** use the property-sheet pattern
`<span class="ps-label">…</span><input class="ps-input">`: visually a
label, semantically not. Zero `<label for=…>` associations on tool
pages. (`pid-tuner.html` and `pid-basics.html` mini-sims also use bare
`<label>` elements without `for=`.)

**Why it matters:** screen readers don't associate the label text with
the input. Same severity as #11, same affected user.

**Priority:** HIGH.

**Recommended action:** two options:

- *Refactor the convention:* `<span class="ps-label">` → `<label
  class="ps-label" for="…">`. The CSS rule `.ps-label` already
  matches both element types after a default reset; one sweep across
  the 8 pages, plus a `<label class="ps-label">` example in CLAUDE.md
  "Adding a new tool."
- *Add `aria-labelledby`:* keep the `<span>`, give each one an `id`,
  point the input's `aria-labelledby` at it.

Refactor-to-label is the simpler call and matches form conventions
everywhere else; bare `<label>` cases on pid-tuner / pid-basics get
the `for=` added in the same pass.

**Resolution (2026-05-17):** refactor-to-label across the 5 tool
pages with property-sheet inputs (bacnet, signal-scaling, thermistor,
psychrometric, modbus). 39 `<span class="ps-label">` paired with a
ps-input got promoted to `<label class="ps-label" for="…">`; the 9
bare `<label>` cases on `pid-tuner.html` (3 selects + 3 range
sliders, plus the "Try a Tuning" button-group caption) and 3 on
`pid-basics.html` (the mini-sim range sliders) gained `for=`
associations against the matching control. The "Try a Tuning"
button-group label became `<span class="field-label">` inside a
`role="group" aria-labelledby="…"` wrapper since a `<label>` for
multiple controls isn't legal HTML. The `.ps-label` CSS rule
gained `text-transform: none; letter-spacing: normal;` resets so
that promoting `<span>` to `<label>` (which carries the
all-caps `label`-element styling) leaves the visual unchanged. The
new `.field-label` class shares the `label`-element rule. The
convention is recorded under CLAUDE.md "Conventions → Form-input
labels."

### 13. Worker defense-in-depth bundle *(addressed 2026-05-17)*

`src/worker.js` handles the obvious risks well (Turnstile, honeypot,
input length, File-vs-string coerce). Several cheap defense-in-depth
adds are missing:

- **No `Content-Length` pre-check.** `request.formData()` buffers the
  whole body (CF caps at 100MB) before the message-length validator
  at line 55. Reject `> ~20KB` with 413 before parse.
- **No `Origin` header check.** Cross-origin POSTs are mitigated by
  Turnstile failing, but `Origin !== 'https://controlsfreak.dev'` →
  reject early short-circuits the cost.
- **No method check on `/api/contact`.** `GET /api/contact` falls
  through to `env.ASSETS.fetch` and returns the site's 404 instead
  of `405 Allow: POST`.
- **`json()` response missing `X-Content-Type-Options: nosniff` and
  `Cache-Control: no-store`.** A contact-form response should never
  be cached; nosniff is free.
- **No fetch timeout** on the Turnstile (line 65) or Resend (line 93)
  calls. A hung upstream blocks the user's spinner until CF kills
  the request. Add `AbortController` + 5-10 s timeout for both.
- **`name` not scrubbed for CR/LF** before going into the email body
  (line 86-89). Today these are body text, not headers, so injection
  isn't reachable — but `name.replace(/[\r\n]+/g, ' ')` future-proofs
  against a refactor that ever templates these into headers.
- **Empty Turnstile token not pre-validated.**
  `field("cf-turnstile-response")` with no widget present sends an
  empty string to Cloudflare for a full round-trip that returns
  `success: false`. Early-reject with 400.
- **Honeypot returns 200 *before* size validation** (line 42-44),
  so the unbounded-body case lands even via bot traffic. Move size
  check above honeypot.

**Why it matters:** each item is small alone; together they close the
contact-form's blast radius for the realistic attacks (unbounded body,
cross-origin drive-by, slow upstream stall, future header-injection
regression).

**Priority:** HIGH (security defense-in-depth on the only mutating
endpoint).

**Recommended action:** land as one focused commit — all eight are
< 60 lines total.

**Resolution (2026-05-17):** all eight landed in one pass.
`src/worker.js` now exports module-level constants for the limits
(`MAX_BODY = 20 KB`, `FETCH_TIMEOUT_MS = 8000`, `ORIGIN_ALLOWED`).
Order of operations in `handleContact`: Origin check → Content-Length
pre-check (413) → formData parse → honeypot → field validation →
empty-token short-circuit → Turnstile → Resend. The `json()` helper
always emits `X-Content-Type-Options: nosniff` + `Cache-Control:
no-store` and accepts an `extraHeaders` parameter (used to set
`Allow: POST` on the 405 response). A `fetchWithTimeout()` wrapper
applies `AbortController` to both Turnstile and Resend so a hung
upstream returns 502 instead of stalling the user's spinner.
`name` gains a `.replace(/[\r\n]+/g, " ")` scrub. The main
`fetch()` handler now branches on the `/api/contact` path *first*
so non-POST requests to that path return 405 with `Allow: POST`
rather than falling through to `env.ASSETS.fetch` (which would
serve the site's 404).

### 14. BACnet/IP port reference — TODO markers in production + duplicated table *(addressed 2026-05-17)*

`html/tools/bacnet-ip-converter.html` carries four copies of the same
HTML-comment marker:

```html
<!-- // user to verify BACnet port reference content — placeholder
     data, refine after review -->
```

…at lines 72, 85, 136, 149. The 2026-05-16 audit's TODO/FIXME grep
missed these because they use a `//` slash convention rather than
TODO/FIXME/XXX. Same convention should land in CLAUDE.md so future
sweeps catch it.

The marker count is four because **the BACnet/IP Port Reference table
is copy-pasted across the Hex→IP and IP→Hex tabs** (lines 73-88 and
137-152). Two copies of identical data.

**Why it matters:** unreviewed placeholder data is shipping to
production — the page presents the table as authoritative reference.
The duplication is a drift trap (correcting one copy and forgetting the
other is the exact bug class the no-duplication rule is meant to
prevent).

**Priority:** HIGH for the verification (placeholder data is wrong by
default), MEDIUM for the dedupe.

**Recommended action:** two-step:

1. Verify the port table data against canonical references (BACnet
   standard / ASHRAE 135 / Wikipedia "BACnet/IP" port table). Delete
   the four `// user to verify` markers.
2. Dedupe — the table is the same regardless of conversion direction.
   Render once outside the tabs (simplest), or move to a Nunjucks
   `{% include %}` fragment under `_includes/`, or factor to a
   `<template>` cloned at runtime. Rendering once outside the tabs
   is the smallest change.

**Resolution (2026-05-17):** the user could only field-verify
47808 / BAC0 (the IANA-registered port); the BAC1-BAC4 rows with
"Network #2-5" labels were field-folklore the user couldn't
authoritatively confirm, so the table was trimmed to a single row
("47808 / BAC0 / Default BACnet/IP") with a ref-note that mentions
ASHRAE 135 Annex J's multi-network convention without asserting the
specific labels. For the dedupe, the standalone reference moved out
of the tab panes into a sibling `.tool-card` below the converter
(matching `thermistor-calculator.html`'s "About these tables"
secondary-card pattern, `<h2 class="tool-card-title">`). The two
tab panes shifted from `.tool-body-3col` to a new `.tool-body-2col`
(four lines of CSS in `styles.css`, plus matching responsive
override at the 900 px breakpoint). The four `// user to verify`
markers are gone. The marker convention itself (`<!-- // user to
verify … --!>`) now lives under CLAUDE.md "Conventions →
Placeholder-content markers" so future audits look for both `//`
and the canonical TODO/FIXME/XXX in the same sweep.

### 15. PID engine extraction owed by Block C #5 precedent *(addressed 2026-05-17)*

Block C #5 set the precedent: when two pages share the same surface,
consolidate. Two PID surfaces still share substantial code:

- **`PID_DMAX` table** — `{ fast: 0.15, med: 0.5, slow: 2.0 }` —
  duplicated at `html/tools/pid-tuner.html:226` and
  `html/education/pid-basics.html:268`, with near-identical comments.
- **PID-chart drawing** — `drawPidChart` in `pid-tuner.html:325-402`
  and `drawMiniChart` in `pid-basics.html:345-399` share canvas
  setup, CSS-color reads (each with their own hex fallbacks — see
  the related drift in #19 below), the setpoint/PV trace logic, and
  the `fmtDur` helper (lines 277 / 314). `pid-basics.html:341`
  itself comments "a stripped-down cousin of the tuner's chart."

**Why it matters:** same shape as Block C #5, same "two uses is the
trigger" criterion. A future third PID surface (the Education roadmap
calls for adjacent topics) would mean three copies.

**Priority:** MEDIUM.

**Recommended action:**

- Move `PID_DMAX` into `html/scripts/pid-engine.js` next to
  `PID_PROC`.
- Extract `drawPidChart(canvas, sim, opts)` to a new
  `html/scripts/pid-chart.js`; options control the mini-sim
  variant (smaller grid, no legend, no settling marker). Both pages
  call the same function with different `opts`.

**Resolution (2026-05-17):** all three pieces landed.
`html/scripts/pid-engine.js` gained `PID_DMAX` (next to `PID_PROC`)
and `fmtDur(sec)` — both pages now read from these instead of
carrying their own copies (`MINI3_DMAX` and the two `fmtDur` clones
are gone). A new `html/scripts/pid-chart.js` exports
`drawPidChart(canvas, sim, opts)` with `opts.variant` in
`{'full','mini'}` and `opts.shadeOffset` for Sim 1's offset band;
the tuner calls it with `{variant:'full'}` and the three Education
mini-sims call it with `{variant:'mini', shadeOffset: n===1}`. The
hex fallbacks on the CSS-var reads were intentionally preserved —
that's #19's scope, not this PR's. Net diff: −209/+69 across the
two pages, +29 lines in pid-engine.js, +new pid-chart.js.
Codebase-issues #22 (PID tuner SSE unit) folded in (see below).

### 16. ID naming convention chaos across pages *(addressed 2026-05-17)*

The site uses three id conventions concurrently with no rule:

- *camelCase* — `modbus-register-viewer.html` (`bitGrid`, `modDec`),
  `pid-tuner.html` (`pidKc`), `thermistor-calculator.html`
  (`thByTemp`), `vfd-mock.html` (`vfdmActHz`).
- *snake_case with prefix* — `bacnet-ip-converter.html`
  (`b2i_copyIp`), `signal-scaling.html` (`so_x1`).
- *kebab-case* — `psychrometric-chart.html` (`cc-mode`, `oa-tdb`),
  education pages (`bal-cbv-fig-desc`, `d1-boiler`).
- *Mixed within one file* — `psychrometric-chart.html` has
  `cc-secondLbl` (kebab+camel) alongside pure-camel `psyAlt`.

**Why it matters:** future contributors see no rule to follow, the
style-using-id selectors land in different shapes, and the
psychrometric mixing inside one file shows the rot already started.

**Priority:** MEDIUM (high friction; no live bug).

**Recommended action:** pick one and document under CLAUDE.md "JS
patterns" or "Adding a new tool." kebab-case matches the HTML/CSS /
SVG-id patterns already in education and is the lowest-cost sweep.
Decide whether to retrofit existing pages (≈ 12 pages touched) or
freeze the rule for new pages only.

**Resolution (2026-05-17):** kebab-case canonized site-wide; full
retrofit landed in one PR across eight commits (one per page or
tight tools↔education pair) plus a docs commit. Roughly 250 ids
renamed across 12 pages plus the four already-kebab pages that
carried capital-A/B/C diagram-position suffixes (`pc-dp-A-coil`,
`d3-load-A`, `d3-loadA-supply`, `lp-tt-loadA-callout`) lowercased
in the same sweep. Reference sites moved in lockstep — all
`<label for=…>` (~50), Playwright test locators (58 unique),
aria-labelledby / aria-describedby (~18), inline-`<style>` CSS
selectors (`#vfdmTry`, `#vfdWidget`, `#pcW1`, `#pcW2`,
`#balWidget`, `#d3Widget`, `#d3-load-A`, `#d3-loadA-*`,
`#thRtScroll`, `#psyStageTable`), and two dynamic-id template
literals in `pid-basics.html` (`` `m${n}-slider` ``,
`` `m${n}-canvas` ``). The convention is recorded under CLAUDE.md
"Conventions → ID naming" with the per-page prefix table and
under "Adding a new tool" as a reminder. Substitution method
worth flagging for future renames: quote-aware (`'X'`, `"X"`,
`#X` patterns) only — never bare-token, because page-inline
scripts frequently reuse the id name as a JS local variable
(`euMin`, `diClosed`) and a bare substitution corrupts JS that
otherwise has no relation to the rename.

### 17. Tab wiring pattern drift *(addressed 2026-05-17)*

Two patterns coexist after the Block C #3 sweep:

- *Modern:* `signal-scaling.html:26-28, 404-406` —
  `<button data-tab="…">` plus a single
  `querySelectorAll('[data-tab]').forEach(...)` loop in the IIFE.
- *Older:* `bacnet-ip-converter.html:26-27, 278-279` — each tab
  button wired by id (`id="bacnetTab_hex2ip"`), handler-string
  hardcoded.

Same feature, two implementations. Block C #3 didn't try to consolidate
these — the conversion was strictly inline-handler → addEventListener
— but the older pattern doesn't compose with `data-tab` helpers and
forces per-button bindings.

**Priority:** MEDIUM.

**Recommended action:** retrofit `bacnet-ip-converter.html` to the
`data-tab` + loop pattern; document the canonical pattern under
CLAUDE.md "JS patterns" while you're there.

**Resolution (2026-05-17):** retrofit landed in one commit;
`bacnet-ip-converter.html:26-27` swapped per-id buttons for
`data-tab="hex2ip"` / `data-tab="ip2hex"`, and `:255-256` collapsed
the two `document.getElementById(...).addEventListener(...)` calls
into one `document.querySelectorAll('[data-tab]').forEach(btn =>
btn.addEventListener('click', e => switchTab(e.currentTarget
.dataset.tab, e.currentTarget)))` loop — verbatim shape of
`signal-scaling.html:404-406`. The two now-removed button ids
(`bacnet-tab-hex2ip`, `bacnet-tab-ip2hex`) had no tests, no CSS,
and no aria targets referencing them, so the removal was a clean
delete. The pane container ids on the `.tab-pane` divs
(`tab-hex2ip`, `tab-ip2hex`) stay — those are what `switchTab`
locates via `'tab-' + name`. The CLAUDE.md "JS patterns → Tabs"
bullet now documents the canonical wiring shape (data-tab attr
+ querySelectorAll loop), not just the `switchTab` helper — that
was the documentation gap that let the older per-id pattern keep
looking acceptable.

### 18. `'use strict'` adoption drift *(addressed 2026-05-17)*

Present in: `html/scripts/flow-engine.js`, `html/scripts/units.js`,
`html/scripts/ui.js`, `html/education/balancing.html` page IIFE.

Missing from: `html/scripts/pid-engine.js`,
`html/scripts/thermistor-data.js`, the 8 other page IIFEs.

**Why it matters:** the semantic difference is small (catches a small
class of errors — assigning to undeclared vars, deleting
non-configurables, octal literals) but the inconsistency reads as
"this script knows something the others don't" without explanation.

**Priority:** LOW.

**Recommended action:** either adopt site-wide (a one-line addition
× ~10 sites) or drop entirely. Adoption is cheaper to defend.

**Resolution (2026-05-17):** adopted site-wide. The actual site count
turned out to be 15 (not ~10): 3 shared scripts (`pid-engine.js`,
`pid-chart.js`, `thermistor-data.js`) + 12 page IIFEs (every page-
inline `<script>` other than balancing.html, which already had it).
`src/worker.js` is ES-module and implicit-strict, no directive
needed; `education/load-piping.html` has no inline IIFE (just a
top-level `FlowEngine.init()` call), so it stays out of the rule.
Audit found zero existing strict-mode violations across the missing
files — retrofit was purely additive (one directive per scope, no
refactor). Placement matches existing conventions: top-of-file
after the header-comment block for the three top-level classic
shared scripts (pid-engine/pid-chart/thermistor-data) and first
statement inside the IIFE for the 12 page-inline scripts (matching
balancing.html). CLAUDE.md "JS patterns" now carries an explicit
`'use strict';` bullet recording the rule.

### 19. Inline style proliferation — design-system items waiting to be born *(patterns 1-4 addressed 2026-05-17; pattern 5 → #23)*

Five patterns are inline-styled enough times that they're effectively
design-system classes that haven't been named:

- *Lead paragraph* — `style="font-size:1.0-1.02rem;line-height:1.85;color:var(--text);max-width:640-700px;margin-bottom:1.75rem"`
  on the opening prose paragraph of education pages — 8 occurrences
  (`education/vfds.html:206`, `pid-basics.html:17, 59`,
  `pump-control.html:177`, `load-piping.html:23`, `balancing.html:216`,
  `hydronic-loops.html:186`).
- *Education body prose* —
  `style="font-size:0.95rem;line-height:1.8;color:var(--text);"` (with
  optional `margin-top:1.1rem`/`1.25rem`) — 83+ occurrences across the
  education pages.
- *Inline accent anchors* — `style="color:var(--accent);"` on `<a>` —
  34 occurrences.
- *`.result-formula` modifiers* —
  `style="margin:0;padding:0.7rem 1.25rem;"` (bacnet, signal-scaling,
  thermistor-calculator) and
  `style="word-break:normal;overflow-wrap:break-word;"`
  (signal-scaling). Look like missing `.result-formula.flush` and
  `.result-formula.wrap` modifier classes.
- *Local CSS-var hex fallbacks for canvas drawing* —
  `pid-tuner.html:338-342`, `psychrometric-chart.html:950-956`,
  `pid-basics.html:357-360` each redeclare `'#ffffff'`, `'#ccd7c8'`,
  `'#43881c'`, `'#1577b8'` as fallbacks for the CSS custom-property
  reads. Same hex strings also appear ~225 times as
  `var(--blue, #1577b8)` / `var(--blue-cool, #5e8aa0)` in the
  education SVGs. CSS custom properties have had universal support
  for years; the fallbacks are belt-and-braces that now serve mainly
  as a drift surface vs. the source-of-truth in `styles.css:18-31`.

**Why it matters:** each occurrence is harmless; collectively this is a
design-system leakage. A user wanting to retune body-prose line-height
has 83 inline overrides to find. CSS-var fallback drift is silent (no
visual change until `--surface` is retuned, at which point three
inline copies disagree with the source-of-truth).

**Priority:** MEDIUM (no live bug; high cost to future restyling).

**Recommended action:** promote in `styles.css`:

- `.page-intro` — lead-paragraph rule.
- `.tool-body p`, `.tool-body p + p` — education body prose with
  natural sibling spacing.
- `.tool-body a` — accent color on links scoped to body copy.
- `.result-formula.flush`, `.result-formula.wrap` — modifier
  classes.

Drop the canvas-side hex fallbacks (use `getPropertyValue('--blue')`
without a literal default; assume CSS-var support). Drop the SVG-side
`var(--x, #hex)` fallbacks the same way.

**Resolution — patterns 1-4 (2026-05-17):** the four class
promotions landed.

- `.page-intro` (1 rule) on the lead-paragraph of all six
  education pages — 6 sites swept. Normalized variance:
  max-width 640/660/680 → 660, font-size 1.0/1.02 → 1.0,
  margin-bottom 1.75/2.25 → 1.75 (pid-basics outlier shifted).
  Counts came in at 6 not the original entry's 8 estimate.
- `.tool-body p` (font triplet) + `.tool-body a` (accent
  colour). 88 paragraph triplet drops across the six education
  pages; 32 of 34 accent-anchor inline styles dropped (the 2
  remaining are in `.hero` blocks on `html/index.html` and
  `html/education/index.html`, where `.tool-body a` doesn't
  reach — kept inline). The sibling-spacing rule
  (`.tool-body p + p`) recommended in the entry above is NOT
  shipped; it would force a ~10px regression on callout-internal
  paragraphs (existing `<p style="margin-top:0.6rem;">` cases)
  because `.tool-body p + p` (specificity 0,0,1,1) is later in
  the cascade than `.callout` doesn't carry a paragraph-spacing
  rule. Leaving margin-top variants inline pending a spacing-
  consolidation follow-up that audits per-context spacing
  intent.
- Specificity gotcha worth recording: `.tool-body p` is
  (0,0,1,1) and would have overridden the existing `.bit-hint` /
  `.pid-note` / `.ref-note` rules (all 0,0,1,0) on small
  utility paragraphs inside `.tool-body`. Fix: those three
  rules bumped to `p.bit-hint` / `p.pid-note` / `p.ref-note` —
  same specificity as `.tool-body p`, cascade order picks the
  later-in-file rule, small-text shapes preserved.
- `.result-formula.flush` (4 sites: bacnet ×2, signal-scaling
  slope/offset, thermistor) and `.result-formula.wrap` (2
  sites: signal-scaling Forward/Reverse panes) landed cleanly.
- CLAUDE.md "Design system" picked up a new bullet documenting
  the prose-typography classes.

Pattern 5 (canvas-side hex fallbacks and SVG `var(--x, #hex)`
fallbacks) is deferred — different concern ("drop belt-and-
braces fallbacks") with its own subtlety (canvas
`getPropertyValue` defaults). Opened as #23.

### 20. Tests — weak assertions, brittle waits, dead `test.skip` *(addressed 2026-05-17)*

Several specs pass states that don't verify what the test name
implies, plus a few flake-prone patterns:

- `tests/smoke.spec.js:206-247` (pump-control widget) — asserts
  `flowAt30 < 60`; a broken sim returning `0` would also pass. No
  lower bound. CLAUDE.md notes the expected value is ≈ half of 100 GPM
  → add `expect(flowAt30).toBeGreaterThan(30)`.
- `tests/smoke.spec.js:187-204` (vfd mock) — asserts `actHz > 0` after
  a 300ms wait; any glitch passes. Should assert
  `actHz >= 1 && actHz <= setHz`.
- `tests/smoke.spec.js:78-106` (thermistor) — mutates `localStorage`
  and manually restores units state at the end. If any earlier
  assertion throws, cleanup skipped, subsequent tests inherit metric
  state. Wrap in `test.afterEach` or
  `test.use({ storageState: { origins: [] } })`.
- Several behavioral specs (bacnet, psychrometric, thermistor) don't
  attach `pageerror`/`console.error` listeners the way the per-page
  smoke loop does. A TypeError in the assertion path is silently
  swallowed.
- `tests/contact.spec.js:32-50` — `test.skip` that will never run in
  CI (no wrangler-dev fixture wired). Convert to `test.fixme()` with
  a TODO, stand up a fixture, or delete.
- `waitForTimeout(300)` at `tests/contact.spec.js:22` and
  `tests/smoke.spec.js:200` — classic flake pattern. Replace with
  `expect.poll(...)` or `waitForFunction(...)`.
- `PAGES` array (`tests/smoke.spec.js:8-26`) duplicates
  `html/sitemap.xml`. Add a sanity assertion that the two stay in
  sync, or render PAGES from the sitemap.

**Priority:** MEDIUM (tests that pass without verifying are the worst
class of test debt).

**Recommended action:** address as a small Block — single commit, no
behavioral change to the site.

**Resolution (2026-05-17):** landed as five per-bullet commits on
one branch.

- Bullet 1 (pump-control flow): added `expect(flowAt30).toBeGreaterThan(30)`
  alongside the existing `< 60`. Design is 100 GPM @ 60 Hz, so the
  envelope `30 < flow < 60` is wide enough to absorb model tuning but
  catches a stall.
- Bullet 2 (vfd-mock actHz): replaced the bare `> 0` with
  `>= 1` and `<= setHz` (`setHz = 30`, the keypad default I01).
- Bullet 3 (thermistor cleanup): wrapped the behavioral test in a
  `test.describe('thermistor behavioral', …)` block with a scoped
  `test.afterEach` that clears `cf_units` from localStorage directly.
  Removes the manual restore click that the test body used to do
  at the end.
- Bullet 4 (listener attach): added a `watchErrors(page)` helper at
  the top of `smoke.spec.js`; refactored the smoke loop to use it;
  applied it to 11 behavioral tests. `contact.spec.js` deliberately
  excluded — Cloudflare Turnstile produces unfilterable pageerror
  noise on `contact.html` in the local-test environment, so an
  errors-array assertion there would consistently fail without
  signaling a real regression.
- Bullet 5 (`test.skip` → `test.fixme`): renamed; updated the
  comment header to TODO-style with the wrangler-dev prerequisite
  spelled out.
- Bullet 6 (`waitForTimeout` flake): replaced both 300 ms sleeps —
  `contact.spec.js:22` dropped entirely (the subsequent
  `toBeHidden()` auto-retry covers the settle); `smoke.spec.js:200`
  swapped for `expect.poll(...).toBeGreaterThanOrEqual(1)` on the
  actHz readout (timeout 1.5 s).
- Bullet 7 (PAGES ↔ sitemap drift): new test reads
  `html/sitemap.xml` at runtime, normalizes both lists to
  path-only, and asserts equality. Catches drift in either
  direction.

**Caught in passing:** the bullet-4 listener attach surfaced a
real bug on the psychrometric chart — `${prefix}-secondLbl`
template-literal id construction (lines 752 and 1309) was missed
by the #16 quote-aware kebab-case substitution and tried to look
up `oa-secondLbl` / `cc-secondLbl` / `ra-secondLbl` (camelCase,
doesn't exist post-#16). Fixed in the same PR as a small
standalone commit. The broader concern (template literals are a
substitution-method blind spot that may have left other camelCase
id constructions undiscovered) is recorded as a one-line note
under `## What to avoid` in CLAUDE.md should be considered for a
future mass-rename — but a targeted grep for `\`\${[^}]+\}[^\`]*[A-Z]`
across `html/**/*.html` and `html/scripts/*.js` returned zero
other real hits today (the apparent matches are all variable
interpolations in display text, not id constructions).

### 21. Site-wide accessibility bundle — small individual items *(addressed 2026-05-17)*

Several small a11y findings, each ≲ 10 lines individually:

- **Skip-to-main link** missing from `_includes/layouts/page.njk`.
  Keyboard users tab through the whole nav on every page. Add
  `<a href="#main" class="skip-link">Skip to content</a>` as the
  first body child plus a `:focus-visible` style. Each page's `<main>`
  needs `id="main"`.
- **`aria-pressed` flicker on units toggle** —
  `_includes/nav.njk:11-12` hardcodes US=`true`, Metric=`false`. The
  inline `<head>` bootstrap sets `[data-units]` on the root *before*
  paint (so the visual state is correct for a returning metric user),
  but cannot touch the buttons (not parsed yet). `units.js` re-syncs
  `aria-pressed` at end-of-body. For ~tens of ms a screen reader on a
  metric-preferring device hears "US toggled on" while the page
  displays metric values. Fix shape is unclear (head bootstrap can't
  reach the buttons; deferring units.js to head doesn't work either)
  — likely "accept the mismatch and document it" rather than chase a
  small SR-only flicker.
- **Canvas elements lack `aria-label` / fallback text** —
  `tools/psychrometric-chart.html:294`, `tools/pid-tuner.html:96`,
  `education/pid-basics.html:94, 140, 191`. SVG diagrams across the
  site carry `role="img" aria-labelledby="…title …desc"`; the canvas
  charts don't get the same treatment. A static `aria-label`
  describing what the chart shows is the smallest reasonable fix.
- **Number inputs missing physical `min`/`max`** —
  `tools/thermistor-calculator.html:107` (resistance can't be
  negative), `tools/psychrometric-chart.html:147, 151, 168, 182, 191,
  205, 230, 244, 264`. Validate-and-mute already catches bad values;
  native bounds prevent the spinner from going negative and let
  mobile keyboards constrain.
- **Section element drift** — `contact.html:30-33` uses
  `<section class="section-header">` while every other page uses
  `<div class="section-header">` (19 occurrences). CLAUDE.md's
  template skeleton uses the `<div>` form. Normalize.
- **Dead `id="sim1"`/`"sim2"`/`"sim3"`** on
  `education/pid-basics.html:64, 110, 160`. Nothing references them
  (no CSS, no JS, no anchor). Either wire deep-links and add to
  page nav, or drop.

**Priority:** MEDIUM (sums to a real a11y posture; each item alone is
small).

**Recommended action:** address alongside #11 / #12 in one focused
a11y commit.

**Resolution (2026-05-17):** four bullets fixed, one deferred-by-
design, one re-audited as not-actually-dead. Landed as four
per-item commits plus a docs commit.

- **Skip-to-main link** — `<a href="#main" class="skip-link">`
  added as the first body child in `_includes/layouts/page.njk`;
  every `<main>` site-wide (17 pages) gained `id="main"`.
  `.skip-link` + `.skip-link:focus` rules added to
  `styles.css` (WebAIM off-screen-until-focused pattern).
  CLAUDE.md "Conventions" picked up a new bullet documenting
  the rule so future pages can't drop the `id="main"` without
  silently breaking the link.
- **`aria-pressed` flicker on units toggle** — deferred per the
  original entry's own recommendation. The flicker has no clean
  fix (head bootstrap can't reach the buttons; `units.js`
  re-syncing at end-of-body is the existing posture). Added a
  CLAUDE.md "Gotchas" entry documenting the limitation so it's
  not re-discovered as a finding.
- **Canvas elements lack aria-label** — 5 canvases on
  pid-basics (×3 mini-sims), pid-tuner, and psychrometric-chart
  now carry `role="img" aria-label="…"` with labels that
  describe each chart's pedagogical focus (P-only offset, P+I
  overshoot, P+I+D damping, PV-vs-SP trace, OA→SA state path).
- **Number inputs missing physical min/max** — 11 inputs gained
  `min`/`max`. thermistor: `th-temp` (-50..200), `th-res`
  (0..). psychrometric: `psy-alt` (0..15000), `psy-cfm` (0..),
  7 temperature inputs (-50..200). The pre-existing `ma-pct`
  and `hum-rh` bounds (0..100) were left as-is. signal-scaling's
  12 number inputs were judged out of scope (custom signal-
  calibration ranges that should stay open-ended).
- **`<section class="section-header">` drift** — contact.html
  was the lone outlier site-wide; normalized to
  `<div class="section-header">` + `<div class="section-line">`
  matching the other 20 instances. CLAUDE.md's new skip-link
  bullet also folds in the section-header rule.
- **Dead `id="sim1/2/3"` on pid-basics** — re-audit refuted the
  issue's "Nothing references them" premise: `smoke.spec.js:173`
  uses `#sim2 .btn-row .copy-btn` as a test-fixture selector
  for the "Slow" chip inside Sim 2. Left in place; no deep-link
  navigation introduced (the simulators read top-to-bottom and
  don't need a jump nav).

### 22. PID tuner Steady-State Error readout is unit-less and metric-unaware *(addressed 2026-05-17)*

`html/tools/pid-tuner.html:273` renders the steady-state error as a
bare number (`(sim.ssErr > 0 ? '+' : '') + sim.ssErr.toFixed(sim.dec)`)
with no unit. The three `PID_PROC` entries the tuner runs against carry
different canonical units — fast = in. w.c. (range 5), med / slow = °F
— so the number's meaning shifts with the Process Type selector, and a
metric-mode visitor sees the °F- or in.-w.c.-domain error labeled with
nothing.

The Education mini-sims (`html/education/pid-basics.html:253-263,
320-339`) already solved this: `miniUnit(procKey)` returns the right
unit string for the current units mode, `miniConvertDelta(value,
procKey)` converts via `Units.display.deltaTemp` /
`Units.display.staticPressure`, and a `unitschange` listener
(`pid-basics.html:423-425`) refreshes the readouts without re-running
the sim. Same shape would drop straight into the tuner — wire the
listener inside the existing IIFE, refresh the metric on unitschange
without re-running `runPidSim`.

**Why it matters:** an unlabeled number is read as "whatever the
visible PV units are." Today the chart axes are also unit-less so the
friction is masked, but once *any* unit-aware element lands on the
tuner the unit-less error becomes actively misleading for metric users.
The same shape already works on `pid-basics.html`, so the inconsistency
across the two PID surfaces is the immediate cost.

**Priority:** LOW (no live bug today; mid-friction when the tuner gains
any unit-aware element, and a parity gap with `pid-basics.html`).

**Recommended action:** lift `miniUnit` / `miniConvertDelta` and the
`unitschange` wiring from `pid-basics.html`. The mini-sims compute
offset as `-sim.ssErr`; the tuner's existing convention is `+sim.ssErr`
(positive = PV above SP), so keep the sign and convert only magnitude.
Small standalone chunk — or fold into the broader #15 PID-engine
extraction if that lands first (a shared `formatPidReadout(sim,
procKey)` helper would naturally cover both surfaces).

**Resolution (2026-05-17):** folded into #15. The shared helper
landed as `formatPidDelta(canonicalValue, sim, procKey)` in
`html/scripts/pid-chart.js`, alongside `pidUnit(procKey)` and
`pidConvertDelta(value, procKey)`. The tuner's `runPidSim` now
calls it with `+sim.ssErr` (PV-above-SP sign convention preserved),
plus an `unitschange` listener that refreshes the readout without
re-running the simulation (engine is canonical, so a units flip is
display-only). `pid-basics.html` migrated to the same helper called
with `-sim.ssErr` (its offset-below-SP convention), so the two
PID surfaces share one formatter. Verified: tuner SSE reads
"+0.8 °F" in US mode and "+0.5 °C" in metric.

### 23. CSS custom-property hex fallbacks — drop the belt-and-braces *(addressed 2026-05-17)*

Split out from #19 pattern 5 once the four class-promotion
patterns landed. Two surfaces:

- **HTML / SVG-attribute fallbacks** — `var(--blue, #1577b8)` /
  `var(--blue-cool, #5e8aa0)` / `var(--text-dim, #666e66)` /
  `var(--surface, #ffffff)` / `var(--text-bright, #1d251f)` /
  `var(--text, #38423a)` / etc. appear ~392 times across the
  HTML pages (counts: 167 text-dim, 133 blue, 92 blue-cool, 83
  surface, 44 text-bright, 37 text). Highest density on the
  education-page SVG schematics where every stroke / fill
  declaration carries the same fallback hex. CSS custom
  properties have had universal browser support for years; the
  fallbacks are belt-and-braces that now serve mainly as a
  drift surface vs. the source-of-truth in `styles.css:18-37`.
- **Canvas-drawing JS fallbacks** — two spots redeclare the
  same hex strings as defaults on `getPropertyValue` reads:
  - `html/scripts/pid-chart.js:52-58` — 5 reads: `--surface`
    (#ffffff), `--border` (#ccd7c8), `--text-dim` (#666e66),
    `--accent` (#43881c), `--accent-dim` (rgba…).
  - `html/tools/psychrometric-chart.html:950-958` — 7 reads:
    same 4 above plus `--border-faint` (#e3e8df), `--blue`
    (#1577b8), `--heat` (#c8782a).

**Why it matters:** each fallback is harmless alone; the drift
surface is what costs — if `--surface` is ever retuned in
`styles.css`, three+ inline hex copies (HTML SVGs + the two
canvas-JS spots) silently disagree with the source-of-truth.

**Priority:** LOW (no live bug; small risk; mechanical sweep).

**Recommended action:** delete the `, #hex` fallback portion
from every `var(--x, #hex)` site in HTML/SVG attributes — leave
just `var(--x)`. In the canvas-JS spots, drop the second
argument to the `cv()` helper (i.e., trust
`getPropertyValue('--x')` to return a non-empty string at
runtime, since `:root` defines all the vars unconditionally).
Could ship as one mechanical commit per surface (one for HTML
SVGs, one for canvas-JS) plus a docs note retiring the fallback
convention.

**Resolution (2026-05-17):** landed as the planned two-commit
sweep plus the docs close. Actual count was 572 HTML/SVG
fallback drops (higher than the original ~392 estimate; the
earlier audit undercounted `--mono`, `--accent`, `--heat`
sites) plus 12 canvas-JS call-site drops across the two
`cv(name, fallback)` helpers. Audit confirmed every fallback's
hex matched its canonical `:root` value — except a small drift
on `--border-faint` (two inline styles fell back to
`rgba(0,0,0,0.07)` while `:root` defines `#e3e8df`; theoretical
drift only — `:root` always defined the var so the rgba never
rendered). The sweep closed both shapes equally.

Sweep mechanism: Python helper with balanced-paren matching so
both simple `#hex` and nested-paren `rgba()` fallbacks parsed
correctly. Triggered only on `var(--…` prefixes, leaving
unrelated commas inside CSS values untouched. Visual smoke
(load-piping, hydronic-loops, psychrometric-chart canvas)
confirmed zero rendered change — every fallback was matching
its canonical value anyway. Drift-prevention going forward:
CLAUDE.md "Design system" picks up a one-line note that every
custom property used in HTML attributes or canvas-JS must be
defined in `:root` first.

Distribution of HTML/SVG drops, by file:
- load-piping.html — 175 drops (the three-way mixing, three-way
  diverting, two-way, and twin-T schematic SVGs).
- hydronic-loops.html — 144 drops (d1/d2/d3 diagram inlines).
- balancing.html — 123 drops (CBV/ABV/PICV branches + riser).
- pump-control.html — 68 drops.
- vfds.html — 61 drops.
- vfd-mock.html — 1 drop (the lone `--border-faint` drift).

Tool pages other than vfd-mock and psychrometric-chart had no
HTML/SVG fallbacks; they compose entirely via class rules in
styles.css and never inline `var(--x, #hex)` patterns.

### 24. Hex fallbacks survived in `flow-engine.js` — #23 missed the third surface *(addressed 2026-05-17)*

Follow-up to #23. The 2026-05-17 sweep closed two surfaces — HTML/SVG
attribute fallbacks (572 drops) and the canvas-JS `cv()` helpers (12
drops) — but missed a third: two JS string constants in
`html/scripts/flow-engine.js:106-107`:

```js
const SUPPLY_FILL = 'var(--blue, #1577b8)';
const RETURN_FILL = 'var(--blue-cool, #5e8aa0)';
```

These get written verbatim to `<circle fill="…">` on every flow
particle. Same drift surface as the rest of #23: if `--blue` is ever
retuned in `:root`, the inline hex disagrees with the source-of-truth
until someone re-greps for `var(--`.

The miss was a search-pattern blind spot. #23's Python helper grepped
inside CSS/HTML files for `var(--…` patterns; it didn't run against
`.js` files, and `flow-engine.js`'s string-constants live outside the
two `cv(name, fallback)` helper shapes that the canvas-JS pass
already caught.

Same family as #9: the comment block above the constants
(`flow-engine.js:103-105`) actively justified the now-banned pattern
("CSS var with a literal-hex fallback baked in, so a failed
stylesheet still leaves the diagram legible"). Future readers
following this comment would re-introduce the fallback on a new
constant.

**Why it matters:** drift risk (same as the rest of #23) plus the
stale-comment foothold for re-introduction. CSS custom properties
have universal browser support; `var(--blue)` in an SVG presentation
attribute resolves to the `:root` value, no fallback needed.

**Priority:** LOW (mechanical follow-up to #23, no live bug).

**Recommended action:** drop the `, #hex` portion from both string
constants and rewrite the surrounding comment to match the new
convention. One commit, two-line code change plus comment trim.

**Resolution (2026-05-17):** lines 106-107 trimmed to bare
`var(--blue)` / `var(--blue-cool)`. The header comment at 103-105
rewritten — replaces the "literal-hex fallback baked in" framing with
a pointer to the CLAUDE.md "Design system" rule ("every var used
here must be defined in styles.css :root"). No CLAUDE.md change
needed; the rule was already canonized as part of #23's docs
commit. Going forward: future canvas-JS surfaces that read CSS
custom properties should grep against `.js` files too, not just
`.css` / `.html`.
### 25. Orphaned `<span class="ps-label">` captions on `psychrometric-chart.html` checkbox toggles *(addressed 2026-05-17)*

Same shape as #12 caught and swept — different sites. Three rows on
the psychrometric chart use `<span class="ps-label">` as a caption
above a checkbox without programmatically associating the two:

- `html/tools/psychrometric-chart.html:225` — CC toggle:
  ```html
  <div class="ps-row">
      <span class="ps-label">Cooling coil</span>
      <label class="psy-toggle"><input type="checkbox" id="cc-on" checked> On</label>
  </div>
  ```
- `html/tools/psychrometric-chart.html:252` — HC toggle (same shape).
- `html/tools/psychrometric-chart.html:272` — HUM toggle (same shape).

The `<span>` has no `for=`, no `id`, no `aria-labelledby` link to the
checkbox. The inline `<label>` wrap supplies a programmatic label of
just "On", so a screen reader reads "Cooling coil" (orphan text) →
"On checkbox" — the visible caption never associates with the
control.

**Why it matters:** same a11y gap that #12 swept across the rest of
the site. #12's resolution noted "refactor-to-label across the 5
tool pages with property-sheet inputs (bacnet, signal-scaling,
thermistor, psychrometric, modbus)" — psychrometric was in scope but
the checkbox-toggle pattern wasn't part of the standard ps-input
shape the sweep recognized.

**Priority:** MEDIUM (real a11y gap; same severity as the rest of
#12).

**Recommended action:** two viable fixes —

- *Group + aria-labelledby* (matches the `field-label` pattern #12
  introduced for the pid-tuner button group):
  ```html
  <div class="ps-row" role="group" aria-labelledby="cc-toggle-label">
      <span class="field-label" id="cc-toggle-label">Cooling coil</span>
      <label class="psy-toggle"><input type="checkbox" id="cc-on" checked> On</label>
  </div>
  ```
- *aria-label on the checkbox* (simpler):
  ```html
  <span class="ps-label">Cooling coil</span>
  <label class="psy-toggle"><input type="checkbox" id="cc-on" aria-label="Cooling coil on" checked> On</label>
  ```

The first is more semantically rich and matches the existing
field-label idiom; the second is one-line per site. Either way, the
visual stays identical.

**Resolution (2026-05-17):** landed as a hybrid of the two
recommended actions. The audit entry's option A would have
class-swapped `ps-label` → `field-label`, but `.field-label`
(grouped with the bare `label` selector) renders mono / 0.66rem /
uppercase / 0.1em letter-spacing while `.ps-label` renders sans /
0.82rem / normal-case / normal letter-spacing — inside a `.ps-row`
context the swap would have visually orphaned the toggle caption
from its adjacent `.ps-label` siblings in the same `.psy-editor`.
Picked up the *semantic* improvement of option A (`role="group"` +
`aria-labelledby` on the row, `id=` on the caption) but kept the
`.ps-label` class so the visual is unchanged. Three sites updated
(`cc-toggle-label` / `hc-toggle-label` / `hum-toggle-label`).
Screen reader now announces "Cooling coil, group" → "On, checkbox"
instead of orphan text + "On checkbox". The same logic informs the
#26 resolution.

### 26. Thermistor "Look up by" caption uses `ps-label` where CLAUDE.md says `field-label` *(addressed 2026-05-17)*

`html/tools/thermistor-calculator.html:92-98` — the row that
captions the Temperature / Resistance lookup-mode buttons:

```html
<div class="ps-row" role="group" aria-labelledby="th-by-label">
    <span class="ps-label" id="th-by-label">Look up by</span>
    <div class="btn-row">
        <button class="copy-btn active" id="th-by-temp">Temperature</button>
        <button class="copy-btn" id="th-by-res">Resistance</button>
    </div>
</div>
```

Functionally correct — `role="group"` + `aria-labelledby` is wired —
but per CLAUDE.md "Conventions → Form-input labels":

> For a button group, use `<div role="group" aria-labelledby="…">`
> with a `<span class="field-label" id="…">` caption.

`pid-tuner.html:59`'s "Try a Tuning" caption migrated to
`field-label` in the #12 resolution; thermistor's equivalent shape
didn't get the same treatment.

**Why it matters:** convention drift that fights the documented rule.
A future contributor adding a third button-group caption would see
two patterns and not know which is canonical.

**Priority:** LOW (no a11y bug — the aria wiring works; pure
convention drift).

**Recommended action:** swap `ps-label` for `field-label` on line 93;
verify the styling stays unchanged (the `.field-label` rule in
styles.css already mirrors the `ps-label` shape).

**Resolution (2026-05-17):** rejected the audit entry's "swap the
class" path. The hedge — "`.field-label` already mirrors the
`.ps-label` shape" — was a misread of `styles.css`: `.field-label`
is grouped with the bare `label` selector at sans→mono / 0.66rem
/ uppercase / 0.1em letter-spacing, while `.ps-label` carries
explicit `text-transform: none; letter-spacing: normal` resets at
sans / 0.82rem (the resets were added in #12's resolution
specifically to keep `<label>`-element styling from leaking into
ps-rows). Swapping the class on line 93 would render "Look up by"
in mono uppercase smaller than its `Sensor type` / `Temperature
(°F)` / `Resistance (Ω)` siblings in the same ps-row stack — a
visual regression with no semantic payoff, since the
`role="group"` + `aria-labelledby` wiring on lines 92-93 was
already correct. Fixed the rule instead of the code: amended
CLAUDE.md "Conventions → Form-input labels" to split the
button-group caption rule by container — `field-label` inside a
stacked `.field` (pid-tuner's preset row), `ps-label` inside a
`.ps-row` left column (thermistor's lookup-by row). The
thermistor HTML stays as-is; it was always the right shape, the
rule just hadn't anticipated the second container. Mirrors the
#25 resolution's reasoning.

### 27. Final-audit small leftovers — test convention drift, vfd-mock copy-paste twins, package.json defaults, stale wrangler compat date *(addressed 2026-05-17)*

Bundle of small findings caught during the 2026-05-17 final audit
pass. Each is a one-or-two-line touch:

- **`tests/smoke.spec.js:148-151` inlines listener wiring** instead
  of calling `watchErrors(page)`:
  ```js
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  ```
  The `watchErrors` helper was added in #20's resolution for exactly
  this purpose and is used by every other behavioral test in the
  file. This one site didn't migrate. One-line swap.

- **`html/tools/vfd-mock.html:810-825` — `vfdm-try-default` and
  `vfdm-try-classic` apply byte-identical preset values**
  `{ runSrc: 1, spdSrc: 2, local: false, diClosed: false }`.
  Pedagogically intentional (the page's pitch is "factory defaults
  are the classic mistake"), but reads as a copy-paste bug. Either
  share a constant or add a 1-line comment on each making the
  identity explicit.

- **`wrangler.jsonc:6` `compatibility_date: "2025-05-10"` is ~a year
  stale.** Cloudflare Workers stays on the pinned runtime semantics
  by default — newer runtime behaviors gated behind the date
  activate only on bump. Not a bug; a conscious-choice item. The
  site is small enough that a bump should be safe; verify against
  the Cloudflare compatibility-flags changelog before flipping.

- **`package.json` still carries `"keywords": []` and
  `"author": ""`** from `npm init -y` defaults. Harmless with
  `"private": true` (which the earlier sweep added), but reads as
  unfinished. Fill or remove.

**Why it matters:** none are bugs; collectively this is the kind of
drift that erodes the otherwise tight conventions if left
accumulating. Easier to clean as one bundle than to chase
individually.

**Priority:** LOW.

**Recommended action:** one mechanical commit, four files touched.
Could land in the same branch as #25 or #26 if any of those land
soon.

**Resolution (2026-05-17):** all four landed as one commit on its
own branch (#25 and #26 had already shipped separately, so the
"could land in the same branch" hedge wasn't needed). Per-bullet
notes: `tests/smoke.spec.js:148-151` swapped to `watchErrors(page)`
— the helper at lines 8-13 was already in use by all 13 other test
bodies; `vfd-mock.html`'s `vfdm-try-classic` got a one-line comment
explaining the intentional byte-identity with `vfdm-try-default`,
but `vfdm-try-default` itself stayed un-annotated (the audit
entry's "1-line comment on each" framing was relaxed — "default =
factory values" is self-explanatory and a redundant comment would
read as cargo-culting); `wrangler.jsonc` `compatibility_date`
bumped to `"2026-05-17"` without a Cloudflare compatibility-flags
changelog audit (the site's Worker surface is tiny — one
`/api/contact` POST, `fetch` against Resend/Turnstile, and
`env.ASSETS.fetch` fall-through — so the realistic blast radius of
a year of pinned-date drift is near-zero; rollback is one line);
`package.json` `keywords` filled with seven site-relevant tags
(`bacnet`, `modbus`, `hvac`, `building-automation`, `controls`,
`psychrometrics`, `pid`) and `author` set to `"Controls Freak"`
matching the git committer name. `license: "ISC"` (also an
`npm init -y` default) wasn't in the audit entry's scope and was
left in place.

### 28. Psychrometric math test coverage — engine-direct + economizer-ratio behavioral gaps *(addressed 2026-05-18)*

Surfaced during PR #29 (economizer-ratio helper) review. Two related
gaps in the math-test posture for `html/scripts/psychro-engine.js`
and its consumers.

**Engine-direct tests are absent.** The engine is exercised only
indirectly — once through `tools/psychrometric-chart.html`'s
behavioral test (`smoke.spec.js:84`) and once through
`tools/economizer-ratio.html`'s (`smoke.spec.js:107`). Both rely on
visible DOM readouts, so the assertions are "matches text X" or "is
not '—'", not "matches a known reference value." A regression that
silently scaled (say) `enthalpy()`'s latent term by 2× could produce
on-screen numbers that *look plausible* without failing the suite.
The engine extraction (issue #6) intentionally deferred direct tests
until the API shape had settled against a second consumer; the
economizer tool was that consumer (engine-API audit at
`site-ideas-and-friction.md` lines 914–936), so the deferral can
end.

**`tests/smoke.spec.js:107` behavioral coverage is thin.**
Specifically:

- Only the **WB** Define-by mode is exercised on the enthalpy tab.
  The `rh` / `dp` / `w` / `h` branches in `Psychro.solveState` never
  run from this test's perspective; a silent break in the
  mode-dispatch wouldn't fail.
- `er-h-ma-h` / `er-h-oa-h` / `er-h-ra-h` are asserted to be `not
  '—'` (i.e. populated) but their **numeric values** aren't checked.
  The inline comment at lines 128–129 documents expected values
  (`h_OA ≈ 32.4`, `h_RA ≈ 28.6`) — those should become assertions
  rather than comments. (And update the numbers — current engine
  output is 32.27 / 28.43 at the defaults.)
- The `oa.tdb === ra.tdb` warn-pill branches in `calcDryBulb` (line
  327) and `calcEnthalpy` (line 458) are never exercised.

**Why it matters:** the engine is load-bearing math for one shipped
tool and at least two candidate tools (air-mixing, coil-sizing —
both tracked in `site-ideas-and-friction.md`). Future second-
consumers will inherit whatever coverage is in place; the longer
this stays untested, the bigger the surprise when the first silent
drift lands.

**Priority:** MEDIUM. No active bug — the math was verified manually
during PR #29 review against published ASHRAE points (see PR #29
review transcript: 80 °F / 60 %RH → W=92.1 gr/lb / h=33.6 Btu/lb;
95 °F / 75 °F WB → W=98.5 gr/lb / h=38.3 Btu/lb; both match
published values to 1 sig fig in the fraction). This entry tracks
the gap between *math-is-right-today* and *math-will-stay-right-
on-its-own.*

**Recommended action:** one branch, two commits.

- *Commit 1 — engine-direct spec.* New `tests/psychro-engine.spec.js`
  that loads `html/scripts/psychro-engine.js` via `vm.runInContext`
  and asserts known ASHRAE reference values + 5-mode round-trip
  identity (define the same point via `wb`, `dp`, `w`, `h`, and
  `rh` → all return matching state to N decimals). No browser
  needed; runs as a plain Node test under the existing Playwright
  runner. ~50–80 lines.
- *Commit 2 — economizer-ratio behavioral.* Extend the existing
  test at `smoke.spec.js:107` with: (a) numeric assertions on
  `er-h-oa-h` / `er-h-ra-h` against current engine output
  (`toContainText('32.')` / `toContainText('28.')` is loose enough
  to survive cosmetic rounding); (b) one non-WB-mode case (RH or
  DP) to exercise the mode dispatch; (c) one OA==RA edge case
  hitting the warn-pill branch. ~25 lines.

Could share a branch with #25 or #26 (both still open and small).

**Resolution (2026-05-18):** both commits landed. A new
`tests/psychro-engine.spec.js` runs under the existing Playwright
runner (no second test framework) — it loads `psychro-engine.js` via
`vm.runInNewContext` (trailing-expression trick so the IIFE-bound
`Psychro` is reachable) and asserts two ASHRAE reference points
(80 °F / 60 %RH; 95 °F / 75 °F WB) plus a 5-mode round-trip identity
proving the wb / rh / dp / w / h dispatch in `Psychro.solveState`
all converge on the same state. The existing economizer-ratio
behavioral test in `tests/smoke.spec.js` gained substring assertions
on `#er-h-oa-h` / `#er-h-ra-h` against current engine output, a
non-WB Define-by case (`rh` mode at 78 °F / 50 %RH → ~29.9), and an
OA==RA dry-bulb edge case hitting the no-unique-%OA warn-pill at
`economizer-ratio.html:467`. While in the file, air-mixing's
behavioral test (PR #30) also gained numeric substring matches on
its mixed-state readouts on both tabs.

### 29. `.tool-body-3col` produces uneven column lengths on tools whose Output is sparse and whose Reference column is dense *(addressed 2026-05-18)*

Caught during PR #29 review on the live preview link. The Input /
Output / Reference grid only reads visually balanced when all three
columns have comparable vertical density. Several tools have a
sparse Output column (3-4 readouts and a Copy button), a medium-
density Input column (3-6 form rows), and a Reference column that's
a table or a worked-example with prose + ordered list. The columns
end at different y-coordinates and the recessed `--surface-3` panel
on the Reference column reads as an arbitrarily tall slab next to
two shorter ones — the user called it "sloppy" and they're right.

**Where it currently hurts.**

- `html/tools/signal-scaling.html` — clearest example. Output is a
  4-row readout block ending well above the Input column (5 form
  rows) and well above the Reference column (6-row signal-types
  table + live-zero note). Empty space below Output is the eyesore.
  All three of the page's tabs share this shape.
- `html/tools/economizer-ratio.html` — *was* on 3-col before this PR
  fixed it. Worked-example column was vertical prose + ordered list
  + closing paragraph, ran taller than Input and Output on both
  tabs.

**Where it doesn't hurt (and why — useful prior art).**

- `html/tools/bacnet-ip-converter.html` — already on `.tool-body-
  2col`. Reference content lives in a sibling `.tool-card` below
  rather than as a third column.
- `html/tools/psychrometric-chart.html` — custom column widths
  (`grid-template-columns: minmax(220px, 26%) 1fr minmax(220px,
  26%)`) plus the middle column being a chart canvas that dominates
  the visual frame. The three columns end close enough.
- `html/tools/modbus-register-viewer.html` — bit-grid in the middle
  column anchors the visual height; Reference (Function Codes
  table) and Input/Output land close to it. Not pretty but not
  obviously off.
- `html/tools/thermistor-calculator.html` — Reference is the full
  R/T table and is intentionally tall (it's the page's anchor — the
  user *wants* to scan it). Input column is short by design,
  Reference is the deliverable.

**Pattern shipped in PR #29.** "2-col + example below" — Input /
Output stay in a `.tool-body-2col` grid; reference / worked-example
content moves to a full-width row beneath the grid, preserving the
recessed `--surface-3` cue via a page-local section class. Landed
on `economizer-ratio.html` as `.er-example` inside the page's
`{% block head %}`. Vertical prose + ordered list reads more
comfortably as a wide row anyway — wrapped lines stay short relative
to the row's width, the ordered list breathes.

**Why it matters.** Visual polish across the tools landing. Each
tool independently looks fine; back-to-back they betray the uneven-
column drift, and the live tools-landing card grid is the first
thing a visitor sees.

**Priority:** LOW. Cosmetic; no broken interaction. Cluster fix
candidate.

**Recommended action — two-step.**

- *Step 1 (when a second consumer wants it):* promote the page-local
  `.er-example` class to a shared utility in `styles.css` — name TBD
  (`.tool-body-row`, `.tool-body-reference-row`, or similar). Keeps
  the recessed `--surface-3` background, the top border, the
  `1.25rem 1.25rem 1.5rem` padding. Until a second consumer exists,
  the page-local class is the right scope; promoting prematurely
  bakes in the wrong vocabulary.
- *Step 2 (cosmetic-sweep branch):* retrofit `signal-scaling.html` —
  switch each of its three tabs from `.tool-body-3col` to
  `.tool-body-2col`, move the Common Signal Types table to a sibling
  row below the grid. The signal-types table is the same content on
  all three tabs (it doesn't change between Signal→EU, EU→Signal,
  and 2-point modes), so moving it out of the tab structure entirely
  — one shared reference row below all three tabs — is also worth
  considering. That second move is its own design decision.

No retrofit needed on `psychrometric-chart.html`, `modbus-register-
viewer.html`, or `thermistor-calculator.html`; their column-density
balance is acceptable as-is.

**Resolution (2026-05-18):** both steps landed in one PR. Step 1: the
byte-identical `.er-example` (economizer-ratio) and `.am-example`
(air-mixing) rules promote to a single `.tool-body-row` utility in
`html/styles.css`, alongside `.tool-body-2col` / `.tool-body-3col`.
Name picked from the three candidates — `.tool-body-row` reads as the
cross-axis sibling of the column-family classes, and is layout-shape
rather than content-semantic (so a future "related tools" or "footer
note" row can reuse it without naming awkwardness). Step 2: all three
`signal-scaling.html` tabs switch from `.tool-body-3col` to
`.tool-body-2col` (Input / Output), and the Common Signal Types table
hoists out of tabs 1 & 2 into one shared `<section class="tool-body-
row">` sitting inside `.tool-card` after the last `.tab-pane`. The
2-Point tab's `style="grid-column:span 2;background:none;"` workaround
on its Output section is now redundant and removed. `switchTab`
(`html/scripts/ui.js:28–34`) only toggles `.tab-pane` descendants, so
the shared row stays visible across all tab switches.

### 30. Missing `:focus` styles on custom-styled interactive elements

`html/styles.css` carries three `:focus` rules: `.skip-link:focus`
(line 76), `input/textarea/select:focus` (line 375), and
`input.ps-input:focus` (line 971). The custom-styled interactive
elements have none:

- `.copy-btn` (line 578) — every Copy / "Try a Tuning" preset / the
  contact form's Send button (34+ instances site-wide).
- `.tab-btn` — every tabbed tool's tab switcher.
- `.units-btn` — the US / Metric toggle in the shared nav.
- `.cta-button` — the hero CTA on `html/index.html`.
- `.back-link` — the "← All tools" / "← All lessons" anchors at
  the bottom of every tool and education page.
- `.nav-card` — the tools-landing and education-landing card grids
  (entire surface is clickable but has no focus cue).
- `input[type="range"]` thumbs (`::-webkit-slider-thumb`,
  `::-moz-range-thumb`) — PID tuner sliders, education-page
  widget sliders.

`outline: none` is set on `.skip-link`, on `input/textarea/select`
(line 376), and on the range track (lines 633/647), so the
browser default is suppressed without anything replacing it on the
buttons / links / nav-cards that inherit no default outline once
they're styled.

**Why it matters:** WCAG 2.4.7 (Focus Visible) — once a sighted-
keyboard user gets past the site-wide skip-link (shipped in #21)
they're flying blind across Copy buttons, tab switchers, the units
toggle, the hero CTA, the back-link, and the entire landing
grids. Largest current a11y gap, same severity class as #11 / #12.

**Priority:** HIGH.

**Recommended action:** add a shared focus rule next to each
`:hover` block. `:focus-visible` is the precise tool — browser
heuristics keep the indicator off the mouse path. Suggested shape:

```css
.copy-btn:focus-visible,
.tab-btn:focus-visible,
.units-btn:focus-visible,
.cta-button:focus-visible,
.back-link:focus-visible,
.nav-card:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}
input[type="range"]:focus-visible::-webkit-slider-thumb { … }
input[type="range"]:focus-visible::-moz-range-thumb { … }
```

CLAUDE.md "Design system" should pick up a bullet recording the
`:focus-visible` rule (every interactive element with a custom
`:hover` needs a paired `:focus-visible`).

### 31. Version drift between `footer.njk` and `package.json` *(addressed 2026-05-19)*

`html/_includes/footer.njk:3` reads `v1.9 · 2026`; `package.json:3`
declares `1.3.0`. Issue #27's resolution deliberately synced these
at v1.3 ("`version` to 1.3.0 (sync from footer's v1.3)"). The
footer has since bumped six minor versions (per CLAUDE.md "Bump
the version here when shipping something notable") and
`package.json` hasn't followed.

**Why it matters:** the #27 entry made `package.json.version` the
machine-readable mirror of the footer's human-facing version.
Drift means a future contributor (or automated tool) can no longer
trust one as the canonical source. Same drift class as #9 (stale
comments after migration), #16 (id-naming chaos), #17 (tab wiring)
— convention exists on paper, breaks in practice.

**Priority:** HIGH (not for a live bug; for the convention's
trustworthiness).

**Recommended action:** two viable shapes —

- *Single source of truth in `package.json`*: expose the version
  to Nunjucks via a 11ty data file (`_data/site.js` returning
  `{ version: require('../package.json').version }`); footer.njk
  reads `{{ site.version }}`. Footer bumps become a `package.json`
  edit, build templates it everywhere.
- *Co-update at commit time*: keep both, document under CLAUDE.md
  git conventions and "Adding a new tool" that a footer bump
  ships in the same commit as the matching `package.json` bump.

The data-file path is the smaller drift surface long-term; the
co-update path is the smaller diff today.

**Resolution (2026-05-19):** data-file path. New
`html/_data/site.js` re-exports `package.json.version`;
`footer.njk` now reads `v{{ site.version }} · 2026`. Caught-up
bump of `package.json` from `1.3.0` to `1.9.0` so the rendered
footer matches the state it had been showing for six bumps.
Footer now displays the full semver verbatim (`v1.9.0` not
`v1.9`) — a deliberate format change paired with a new
convention: minor bumps (`1.X.0`) for features / new pages /
new tools, patch bumps (`1.X.Y`) for bug fixes and small
polish. CLAUDE.md "Stack" (footer.njk bullet) and "Adding a
new tool" (step 5) updated to reflect both the new source of
truth and the bump cadence.

### 32. Worker Turnstile success-check accepts malformed responses *(addressed 2026-05-19)*

`src/worker.js:123` — `if (!verify || verify.success === false)`.
The gate only rejects when `success` is explicitly `false`.
Responses of `{success: undefined}`, `{}`, `{success: null}`,
`{success: 0}`, `{success: "true"}` (string) all pass through and
the email gets sent unverified.

**Why it matters:** companion gap to the #13 defense-in-depth
bundle. Cloudflare's siteverify API is stable so realistic
exposure is low — but the same "tighten the gate by one character"
shape is exactly what #13 did across eight other sites; this one
didn't get caught because the explicit-`false` form looked
symmetric with the explicit-`true` truthiness check elsewhere in
the file.

**Priority:** HIGH (defense-in-depth on the only mutating
endpoint, same severity class as #13).

**Recommended action:** swap `=== false` for `!== true`. One-
character change, no test impact (the test surface for
`/api/contact` is `test.fixme()` per #20's carve-out and #7's
deferred posture).

**Resolution (2026-05-19):** `src/worker.js:123` swapped to
`verify.success !== true`, landed in the same one-touch pass as
#33's `res.ok` guard. A short header comment in the Turnstile
block notes the explicit `success === true` posture so a future
refactor doesn't relax it back to a not-falsy check.

### 33. Worker doesn't check `res.ok` on Turnstile `siteverify` *(addressed 2026-05-19)*

`src/worker.js:107–119` calls `await res.json()` on the siteverify
response without first checking `res.ok` or `res.status`. If
Cloudflare's API ever returns a 5xx with a body that happens to
lack a `success` field (or has `{success: true}` in a degraded
path), the worker trusts it — same downstream effect as #32.

**Why it matters:** same as #32. The two together close the
"Cloudflare API behaves anomalously" failure mode in the same
way `fetchWithTimeout()` (#13) closed the "Cloudflare API hangs"
failure mode.

**Priority:** HIGH.

**Recommended action:** guard the JSON parse:

```js
const res = await fetchWithTimeout(...);
verify = res.ok ? await res.json() : { success: false };
```

Lands in the same one-commit defense-in-depth touch as #32.

**Resolution (2026-05-19):** the siteverify response now goes through
`verify = res.ok ? await res.json() : { success: false }`, so a 5xx
or other non-2xx siteverify result fails closed instead of trusting
whatever the body happens to parse to. Paired with #32 in one commit.

### 34. Turnstile widget on contact form has no error / expired callbacks *(addressed 2026-05-19)*

`html/contact.html:73` — the `cf-turnstile` div declares
`data-sitekey` and `data-theme` only. No `data-error-callback`,
`data-expired-callback`, or `data-callback`.

Failure modes the missing callbacks leave silent:

- Turnstile JS fails to load (CDN blip, ad-blocker, network
  partition) → widget never appears → user submits → server
  rejects with "Verification failed." → user has no path to
  diagnose.
- Token expires after Turnstile's default lifetime (~5 min) →
  same opaque "Verification failed" on submit → re-fill required.
- Network error during challenge resolution → no surfaced
  indicator → user assumes the form is broken.

**Why it matters:** the contact form is the only mutating surface
on the site, and a UX gap that converts a transient infrastructure
hiccup into "the form just doesn't work" wastes the bug-report
path the form exists to support. The Resend / Worker side already
returns user-readable error text; the gap is entirely client-side
around Turnstile.

**Priority:** MEDIUM (UX, not security).

**Recommended action:** ~10 lines of frontend —

```html
<div class="cf-turnstile"
     data-sitekey="…"
     data-theme="light"
     data-callback="onTsOk"
     data-expired-callback="onTsExpired"
     data-error-callback="onTsError">
</div>
```

…paired with three small handlers that flip the submit button's
disabled state and write a short status into the existing
`#contact-result-value` panel. Document the callback contract
under CLAUDE.md "Gotchas" alongside the existing Turnstile notes
(Playwright wait-until pattern, pageerror noise).

**Resolution (2026-05-19):** *silent* variant — the three
callbacks (`onTsOk` / `onTsExpired` / `onTsError`) live on
`window` inside `contact.html`'s page IIFE and flip the submit
button's `disabled` state only. No writes to
`#contact-result-value`; Cloudflare's widget renders its own
error chrome, and the disabled button is the second cue. Submit
starts enabled in HTML so `contact.spec.js` test 2 (empty-submit
validation, which clicks the button on localhost) doesn't race
against an `onTsError` fire — same race-tolerance the existing
"contact loads cleanly" smoke assertion relies on. CLAUDE.md
"Gotchas" picked up a new bullet documenting the callback
contract next to the existing Turnstile notes. The *loud* variant
(panel status writes + start-disabled) was the alternative; it
needed parallel `contact.spec.js` edits to avoid the
toBeHidden-races-Turnstile failure, which #36's behavioral test
expansion would land alongside.

### 35. Frontmatter description-length drift — eight pages outside the 140–160 char target *(addressed 2026-05-20)*

CLAUDE.md "Templating" specifies "140–160 chars" for the
`description` frontmatter field. Counts measured from source:

| Page | Chars |
|---|---:|
| `html/contact.html` | **76** (too short) |
| `html/index.html` | **103** (too short) |
| `html/education/index.html` | **138** (1 short) |
| `html/education/pump-control.html` | **164** (1 over) |
| `html/education/balancing.html` | **179** (truncates) |
| `html/tools/economizer-ratio.html` | **176** (truncates) |
| `html/tools/index.html` | **178** (truncates) |
| `html/tools/modbus-register-viewer.html` | **195** (truncates hard) |

Other 12 pages are in range.

**Why it matters:** SERP snippets truncate at ~160 chars; short
descriptions waste the snippet. The two landing pages (root and
tools-index) and the contact page are the highest-traffic
surfaces and the most-off. The convention exists in CLAUDE.md but
isn't measurable from a per-page change, so each new page is
written against the writer's intuition instead of a check.

**Priority:** MEDIUM.

**Recommended action:** rewrite the eight outliers in one pass.
Optional: a tiny build-time guard — a `description.length` check
in `.eleventy.js` (transform) that warns when a page renders with
description outside 140–160. Fails the build = too sharp; logs a
one-liner = right size. Same "convention with a check" shape as
the PAGES ↔ sitemap drift test added in #20's bullet 7.

**Resolution (2026-05-20):** addressed together with #51 — see the
combined resolution under #51. All 11 outliers (the 8 here + the 3
in #51) rewritten in one pass, and the build-time guard landed.
The guard's gate is *fail the build* rather than the warn-only
option this entry leaned toward — chosen on review as the harder
gate, since a warn line is easy to scroll past in a 20-page build.

### 36. `education/psychrometrics-basics.html` has only smoke-loop test coverage

`tests/smoke.spec.js` `PAGES` includes psychrometrics-basics, so
the page gets the standard 200 + title + nav + no-console-errors
loop. But no behavioral test exercises its widget — the
natatorium-pool state machine, condensation margin readout, the
sliders that drive it. Every other widget-bearing education page
has behavioral assertions (`vfds`, `pump-control`, `balancing`,
`hydronic-loops`, `load-piping`).

**Why it matters:** the page shipped (2026-05-18) after the #20
test-gap sweep closed, so it inherited the smoke-loop default
without anyone adding the behavioral coverage that the
established convention requires for a widget page. Drift class:
"convention from a closed audit doesn't auto-apply to pages added
after the audit."

**Priority:** MEDIUM.

**Recommended action:** add a behavioral block to
`tests/smoke.spec.js` that drives the condensation slider through
its range and asserts state transitions / margin readout updates.
Match the shape of the `psychrometric-chart` test
(`tests/smoke.spec.js:122–143`) — same domain. ~30 lines.

### 37. No `playwright.config.js`

The test suite has no Playwright config file. `tests/smoke.spec.js`
hardcodes `http://localhost:8000` in every `.goto()` (18+ sites),
and the manual workflow per CLAUDE.md (lines 638–641) requires
the developer to build, then start `python3 -m http.server
--directory _site 8000` in a second terminal, then run
`npm test`. No `webServer` block means `npm test` from a fresh
checkout silently fails to find a server.

**Why it matters:** the per-call URL hardcoding is the same drift
class the PAGES-array sync test caught in #20 — a value that's
the same site-wide but lives in many places. A standard
`playwright.config.js` with `use.baseURL` reduces that to one
declaration, and a `webServer` block makes `npm test` self-
sufficient from a fresh checkout.

**Priority:** MEDIUM.

**Recommended action:** add `playwright.config.js`:

```js
module.exports = {
    use: { baseURL: 'http://localhost:8000' },
    webServer: {
        command: 'npm run build && python3 -m http.server -d _site 8000',
        url: 'http://localhost:8000',
        reuseExistingServer: true,
    },
    reporter: 'list',
};
```

Then strip the `http://localhost:8000` prefix from each
`page.goto()` call. CLAUDE.md's "Local preview & tests" section
gets updated to drop the manual server-start step (the
`reuseExistingServer: true` flag preserves the `npm run dev`
workflow for iterating on a single page).

### 38. `.tool-card:nth-child(1/2)` fade-in animation is a near-no-op on most pages *(addressed 2026-05-19)*

`html/styles.css:266–267`:

```css
.tool-card:nth-child(1) { animation: fadeUp 0.5s 0.08s ease both; }
.tool-card:nth-child(2) { animation: fadeUp 0.5s 0.16s ease both; }
```

`nth-child(N)` counts position among all siblings of the parent,
not among `.tool-card`-class siblings. On every content page the
first child of `<main>` is `<div class="section-header">`, so:

- `.tool-card:nth-child(1)` matches nothing (the 1st child is the
  section-header div, not a `.tool-card`).
- `.tool-card:nth-child(2)` matches the *first* tool-card.
- Tool-cards in positions 3+ match nothing — they snap in while
  the first one fades.

Pages with multiple tool-cards lose the staggered effect: the
first fades, the rest pop. `education/pid-basics.html` has 4
tool-cards (3 mini-sim cards plus the page-topic card);
`tools/psychrometric-chart.html` has 2.

**Why it matters:** the staggered fade was clearly intended; the
rule is matching by accident on the pages that have at most one
tool-card. Visual inconsistency that gets worse as pages gain
tool-cards. Same drift class as #36 — convention written before
the structural assumption it depends on changed.

**Priority:** MEDIUM.

**Recommended action:** switch to `:nth-of-type(N)` so the rule
counts `.tool-card` siblings independently, then extend to as
many indices as the longest tool-card stack uses (today: 4 on
pid-basics):

```css
.tool-card:nth-of-type(1) { animation: fadeUp 0.5s 0.08s ease both; }
.tool-card:nth-of-type(2) { animation: fadeUp 0.5s 0.16s ease both; }
.tool-card:nth-of-type(3) { animation: fadeUp 0.5s 0.24s ease both; }
.tool-card:nth-of-type(4) { animation: fadeUp 0.5s 0.32s ease both; }
```

Pairs with #42 (reduced-motion) so the animation suppresses
cleanly on that preference.

**Resolution (2026-05-19):** switched to `:nth-of-type` and extended
to four indices (the longest tool-card stack on `pid-basics.html`).
A short comment in `styles.css` records why `nth-of-type` is correct
here — counting `.tool-card` siblings independently of the leading
`.section-header` div that every content page now opens with. Landed
in the same commit as #42's universal-selector reduced-motion rule.

### 39. `pid-engine.js` overshoot calc has an undefended divide *(addressed 2026-05-19)*

`html/scripts/pid-engine.js:99, 102`:

```js
const step = SP - proc.bias;
…
const overshoot = Math.max(0, (maxPv - SP) / step * 100);
```

All three current `PID_PROC` entries have `sp !== bias` (fast:
1.5/0, med: 70/55, slow: 72/65), so `step !== 0` today. If a
future fourth process preset ever ships with `sp === bias`, the
divide produces `Infinity` (or `NaN` if `maxPv === SP`) and
`Math.max(0, NaN)` → `NaN`, which the UI then `toFixed`s to the
string `"NaN"`.

**Why it matters:** small footgun on a shared engine that's been
extracted specifically to grow new callers (#15 set the
precedent). Same shape as the `signal-scaling.html` `1 / (max -
min)` Infinity case that motivated the `isFinite`-over-`isNaN`
sweep in #2 — guard the divide, don't rely on the caller's data.

**Priority:** MEDIUM.

**Recommended action:** one-line guard:

```js
const overshoot = step === 0 ? 0 : Math.max(0, (maxPv - SP) / step * 100);
```

The same touch could audit `ssErr` / `bandTol` for parallel
guards (today both are safe with `step !== 0` but the same
future-preset case would hit them).

**Resolution (2026-05-19):** one-line ternary guard on the
overshoot line — `step === 0 ? 0 : Math.max(0, (maxPv - SP) /
step * 100)`. The `ssErr` and `bandTol` lines stay as-is; they're
safe under the `step === 0` case too (`SP - last_pv` and
`0.02 * |step|` both produce finite results when step is zero),
so the audit-the-neighbors expansion was not needed.

### 40. `ui.js` helpers don't guard null DOM lookups

`html/scripts/ui.js`:

- `switchTab(name, btn)` at line 28: `btn.closest('.tool-card')`
  → `card.querySelectorAll(...)` (line 30) crashes if the button
  isn't inside a `.tool-card`; `document.getElementById('tab-' +
  name)` (line 32) crashes if the constructed id doesn't exist.
- `copyReadouts(btn, sep, ...ids)` at line 60: `ids.map(id =>
  document.getElementById(id).textContent)` (line 62) throws a
  TypeError on the first missing id (the `.filter(v => v && v
  !== '—')` chain runs *after* the `.textContent` access).

No current call site hits the bug — every page wires the helpers
against valid structure. But the helpers are shared and a typo on
a future page (`data-tab="copy"` paired with a pane id of
`tab-cpy`) silently breaks the IIFE with no console pointer to
the wiring error.

**Why it matters:** low-impact today; defensive-quality only. The
#20 `watchErrors` helper would catch the `pageerror` during a
smoke run, but only if a smoke test happens to click the broken
button. Contrast with `copyText`'s silent-on-clipboard-rejection
(line 53) — that's correct *user-facing* behavior; a typo-induced
null-deref is a *dev-time* bug and should be loud.

**Priority:** LOW.

**Recommended action:** filter nulls before `.textContent`, and
defensive-return in `switchTab` if `card` or the target pane is
null. A `console.warn` on null pane id would surface wiring typos
during dev without changing user behavior.

### 41. Worker email regex accepts edge cases

`src/worker.js:12` — `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` accepts
addresses like `user@.example.com`, `.user@example.com`, and
`user.@example.com` (dots in pathological positions per RFC
5321). Resend rejects these and the user sees a generic
"Could not send message right now." 502 instead of "Please enter
a valid email address." 400.

**Why it matters:** cosmetic UX — the user can't distinguish a
parse error (their input is malformed) from a server error (retry
later). The regex is intentionally simple (#13 audit called email
validation "obvious risks handled well") so any tightening should
stay simple too.

**Priority:** LOW.

**Recommended action:** a slightly stricter regex that bans
leading/trailing dots in the local part, or accept the cosmetic
gap and let Resend surface the 502. Either way, document the
choice in the worker header comment.

### 42. `prefers-reduced-motion` only honored for `.widget-fan-blades` *(addressed 2026-05-19)*

`html/styles.css:1215` —

```css
@media (prefers-reduced-motion: reduce) {
    .widget-fan-blades { animation: none; }
}
```

The other site-wide animations don't honor the preference:

- `.tool-card:nth-child(...)` fadeUp (lines 266–267) — the (mostly
  broken, see #38) staggered page-load animation.
- Hero-block animations (if any) and the various CSS transitions
  throughout (`transition:` on `.copy-btn`, `.tab-btn`, sliders,
  hover states).

Issue #8 deferred the JS-side reduced-motion *liveness* in
`flow-engine.js` (the engine reads the preference once at
`init()` and doesn't react to mid-session toggles); CSS-side
support is a different concern and is roughly one rule:

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

**Why it matters:** the reduced-motion preference is a low-cost
accessibility win and the project already covers the loudest
animation. Closing the rest matches the posture #21 set for
skip-link / canvas aria / number-input bounds — small a11y items,
addressed as a bundle.

**Priority:** LOW.

**Recommended action:** the universal-selector rule above is the
WebAIM-recommended pattern. Lands in one commit with the #38
animation fix so the two animation-rule changes land together.

**Resolution (2026-05-19):** universal-selector rule landed inside
the existing `@media (prefers-reduced-motion: reduce)` block in
`html/styles.css` alongside the `.widget-fan-blades` rule that
was already there, so a single media-query block carries both
the existing widget-fan exception and the new site-wide
animation / transition suppression. The JS-side liveness
deferred under #8 stays deferred.

### 43. Contact form required fields have no visual "required" marker *(addressed 2026-05-19)*

`html/contact.html:55–56, 62` — Email and Message inputs carry
the HTML `required` attribute, but the labels render as plain
"Email" / "Message" with no asterisk, "(required)" suffix, or
CSS-injected marker. By contrast, the Name field (line 51) has
an explicit "(optional)" label — so the page does distinguish
optionality, just only at the optional end.

**Why it matters:** sighted users scanning the form get no
indication of which fields are mandatory until Submit fires the
browser's native validation tooltip. Asymmetric: explicit
"(optional)" on Name implies the others are required by
inference. Screen-reader users get `<input required>` announced
as "required" anyway, so the gap is specifically sighted-user.

**Priority:** LOW.

**Recommended action:** add a marker — match the "(optional)"
idiom with a "(required)" suffix on lines 55 and 61, or a CSS-
injected asterisk via `label[for="contact-email"]::after` /
`label[for="contact-message"]::after` with `content: " *"`. Text
suffix matches the existing pattern.

**Resolution (2026-05-19):** text-suffix path picked to match the
existing "(optional)" idiom on the Name field. Both Email and
Message labels in `html/contact.html` now read "Email (required)"
and "Message (required)".

### 44. `head.njk` lacks `theme-color` meta *(addressed 2026-05-19)*

`html/_includes/head.njk` has no `<meta name="theme-color" …>`.
Mobile browsers (Safari, Chrome on Android, Samsung Internet)
read this to colorize the browser chrome to match the site
surface. Default behavior: each browser picks a white-ish
approximation based on the page background — small cue, but the
mismatch is visible on iOS Safari especially.

**Why it matters:** small polish item; one line in `head.njk`.
Matches the "minimal but considered" posture of the existing
favicons / OG tags / units-bootstrap.

**Priority:** LOW.

**Recommended action:** add

```html
<meta name="theme-color" content="#ffffff">
```

…or pull the color from a `:root` token via a build-time
substitution if you want it to track `--surface`. Static literal
is simpler.

**Resolution (2026-05-19):** static literal `#ffffff` (matches
`--surface`) added to `html/_includes/head.njk` between the
description and OG-title metas, so every page picks it up. Build-
time substitution against `:root` was the alternative but adds a
data-file hop for a one-token mirror; if `--surface` ever moves
off white, this is a one-line follow-up in `head.njk`.

### 45. Sitemap `<lastmod>` dates are stale and hand-maintained

`html/sitemap.xml` carries `<lastmod>` dates per entry, all hand-
typed. Most are stuck at `2026-05-13` or `2026-05-15` despite
later changes (e.g. `signal-scaling` was restructured in #29 on
2026-05-18, `psychrometric-chart` got the `${prefix}-secondLbl`
fix in #20's resolution on 2026-05-17, `thermistor-calculator`
got #12's label refactor on 2026-05-17). Only `economizer-ratio`,
`air-mixing`, and `psychrometrics-basics` (the three pages added
2026-05-18) have current dates.

**Why it matters:** search engines weigh `<lastmod>` for recrawl
scheduling. Stale dates de-prioritize re-indexing of pages that
have actually changed. The PAGES ↔ sitemap drift test added in
#20's bullet 7 catches URL-set drift but not date drift.

**Priority:** LOW.

**Recommended action:** generate `<lastmod>` at build time from
git's last-touch date for each file. Either a small `.eleventy.js`
filter (synchronous `git log -1 --format=%cd --date=short
-- html/<path>` per page), or render the sitemap from a Nunjucks
template that walks the collections API. The 11ty data file
`page.date` defaults to file mtime in `_site/`, which 11ty
rewrites on build, so the more robust source is git itself.

### 46. No CI workflow runs tests pre-deploy

The repo has no `.github/workflows/` directory. Cloudflare Workers
Build runs `npm install && npm run build` on push to `main` and
serves `_site/` (~60s deploy), but doesn't run `npm test`. Broken
tests don't block deploy; a regression that slips past local-test
execution lands in production unchallenged.

**Why it matters:** the test suite is good (#20 sweep, #28 engine-
direct tests) but only as good as the discipline that runs it.
A CI gate makes the test pass a structural property of merge
eligibility rather than a habit. The deploy path itself is already
CI-on-merge — adding a test step in front matches the same shape.

**Priority:** LOW (the manual workflow has held for 10 days across
3 audit cycles; no live regression reached production).

**Recommended action:** minimal `.github/workflows/test.yml`
running `npm ci && npm run build && npx playwright install
chromium && npm test` on PR. Cache `~/.cache/ms-playwright` for
speed. Branch-protect `main` to require the check. No deploy-
pipeline change — Cloudflare Workers Build keeps owning the
deploy.

### 47. "17 pages" wording is stale across CLAUDE.md and codebase-issues.md *(addressed 2026-05-19)*

CLAUDE.md describes the site as "17 pages" in multiple places
(Stack section: "Build is fast (~0.2s for 17 pages)"); and
`codebase-issues.md` carries the same figure in entries #4 ("each
new page is another 25-line copy"), #11 ("the element-agnostic
sweep landed across all 17 pages"), and #16 ("250 ids renamed
across 12 pages plus the four already-kebab pages"). Actual count
on disk: **20** — three pages added since the #4 migration
(`air-mixing`, `economizer-ratio`, `psychrometrics-basics`).

**Why it matters:** documentation-drift class. The page count
isn't load-bearing in any rule, but it's the running tally a new
contributor (or future Claude session) uses to gauge the site's
size, and the stale figure rots the precision of sentences that
hang off it ("all 17 pages" reads as exhaustive when it isn't).
Same drift class as the stale-comments sweeps in #9.

**Priority:** LOW.

**Recommended action:** one mechanical pass over CLAUDE.md and
`codebase-issues.md` — replace "17 pages" with "20 pages" where
the count is descriptive, and consider rephrasing to a page-
count-agnostic form ("every page", "across the site") where the
count was incidental. The build-time count is `ls html/*.html
html/tools/*.html html/education/*.html | wc -l`.

**Resolution (2026-05-19):** the two descriptive-of-current-state
references updated (`CLAUDE.md:28` and `README.md:130` —
both the "Build is fast (~0.2s for 17 pages)" line). Historical
references inside this file's already-addressed entries (#4 / #11
/ #21 resolutions describing what shipped at the time) and the
quoted drift-history bullet in `CLAUDE.md` "Workflow → drift
audit cycles" stay as-is — they're a record of the state at
write-time, not a present-tense count. Page-count-agnostic
rephrasing was the alternative; sticking with the literal count
matches the existing prose voice and re-anchors the figure for
the next reader.

### 48. Define-by widget duplication — `SECOND_PROP` / `buildSecondProp` / `secondToCanonical` / `refreshSecondLabel` across three pages

Three psych tools each carry their own copy of the Define-by
widget's DOM-side helpers:

- `html/tools/psychrometric-chart.html:453–465, 550, 702, 1220, 1399, 1427, 1438`
- `html/tools/air-mixing.html:389–400, 402–412, 424–428, 607`
- `html/tools/economizer-ratio.html:274–285, 290–300, 370–376, 564`

Each defines the same four things:

- `SECOND_PROP` — five-mode catalog (`rh`, `wb`, `dp`, `w`, `h`) with
  per-mode label + input step. Step values are byte-identical across
  the three (`0.5 / 0.25` for temps US/metric, `1 / 0.1` for humidity
  ratio, `0.5` for enthalpy, `1` for RH).
- `buildSecondProp()` — rebuilds the catalog on every `unitschange`
  so labels and steps track the active unit system.
- `secondToCanonical(mode, value)` — five-case switch converting
  the Define-by input from display units to canonical IP before
  handing it to `Psychro.solveState`. Byte-identical across the
  three.
- `refreshSecondLabel(prefix)` — reads mode, writes the matching
  label and step onto the row's `<label>` + `<input>` elements.

**Why it matters:** same drift class as #15 (PID engine extraction
triggered at the second consumer). We now have three consumers
and the candidate fourth (coil-sizing) is already named in
`psychro-engine.js`'s header comment as a future Psychro.*
consumer. The label / step constants in particular are the same
data five places (each tool also writes initial labels into HTML
for the first paint), so adding a sixth mode in the future would
need a six-site sync to ship cleanly.

The engine itself can't host this: `psychro-engine.js`
deliberately doesn't touch the DOM or `window.Units` (its file
header is explicit about that — "anything pure" / "nothing that
touches the DOM, window.Units, or any specific page's HTML
structure"). The extraction target is a new sibling classic-
script — `/scripts/psy-widget.js` or `/scripts/psy-define-by.js`
— that owns the catalog + the canonical-conversion helper.
Per-page wiring stays on the page (each page's ids carry their
own prefix scheme).

**Priority:** HIGH (size of the duplication; second-consumer
threshold passed twice over).

**Recommended action:** extract two helpers to a new shared
script. Sketch:

```js
// /scripts/psy-widget.js — Define-by widget helpers.
(function () {
    'use strict';
    function buildSecondProp(U) {
        const u = U.current();
        return {
            rh: { label: 'Relative humidity (%)',                            step: 1 },
            wb: { label: `Wet-bulb (${U.suffix.temp()})`,                    step: u === 'us' ? 0.5 : 0.25 },
            dp: { label: `Dew point (${U.suffix.temp()})`,                   step: u === 'us' ? 0.5 : 0.25 },
            w:  { label: `Humidity ratio (${U.suffix.humidityRatio()})`,     step: u === 'us' ? 1   : 0.1  },
            h:  { label: `Enthalpy (${U.suffix.enthalpy()} dry air)`,        step: 0.5 },
        };
    }
    function secondToCanonical(U, mode, value) {
        if (!isFinite(value)) return value;
        switch (mode) {
            case 'rh': return value;
            case 'wb':
            case 'dp': return U.toCanonical.temp(value);
            case 'w':  return U.toCanonical.humidityRatio(value) / 7000;
            case 'h':  return U.toCanonical.enthalpy(value);
            default:   return value;
        }
    }
    window.PsyWidget = { buildSecondProp, secondToCanonical };
})();
```

Pages keep their own `refreshSecondLabel(prefix)` helpers — those
are id-prefix-aware and tied to per-page DOM, so they're not
candidate-extractable yet. Promote *just* the catalog + the
canonical-conversion switch first; revisit `refreshSecondLabel`
extraction if a fourth consumer arrives.

CLAUDE.md "Stack → Shared scripts" picks up a bullet for the new
file alongside the existing `pid-engine.js`, `flow-engine.js`,
`psychro-engine.js`, `units.js`, `ui.js` entries.

### 49. `economizer-ratio.html` re-declares `P_AIR` shadowing the engine's `P_STD`

`html/tools/economizer-ratio.html:260`:

```js
const P_AIR = 14.696;  // psia, sea-level standard pressure
```

`psychro-engine.js:65` already exposes `P_STD = 14.696` as a
top-level global, and the engine's header comment (lines 19–28)
documents it as part of the public API. The other two psych-tool
consumers do this right: `psychrometrics-basics.html:383–384`
references `P_STD` directly; `air-mixing.html` calls
`pressFromAltitude(altF)` from the engine (which uses `P_STD`
internally at sea level). The economizer page is the only
shadow.

**Why it matters:** the engine's whole point is to be the source
of truth for the moist-air math, including its constants. A
local shadow of `P_STD` is a quiet drift: same value, two names,
future contributors copy-paste whichever they happen to see
first. Same drift class as the `isFinite`-over-`isNaN` (#2) and
var-elimination (post-audit sweep) cleanups — convention exists
on paper, breaks at one site.

**Priority:** MEDIUM.

**Recommended action:** delete the `const P_AIR = 14.696` line;
find/replace `P_AIR` → `P_STD` in the file's two call sites
(`html/tools/economizer-ratio.html:384, 498`). Lands cleanly as
part of the same touch as #48 or stands alone.

### 50. Inline-style proliferation, second wave — patterns #19 didn't catch

#19 promoted four inline-style patterns to design-system classes
(body-prose triplet, lead paragraph, accent anchor,
`.result-formula` modifiers). Site-wide count is now 222 inline
`style="..."` attributes; another set of repeated shapes has
accumulated since.

**Pattern 1 — Tool-card preamble paragraph.** Mono small-caps
caption under a tool-card-header. Same six-property shape across
3 sites:

- `html/tools/pid-tuner.html:31`
- `html/tools/economizer-ratio.html:49`
- `html/tools/air-mixing.html:69`

Shape: `font-family:var(--mono);font-size:0.7rem;color:var(--text-dim);padding/margin;line-height:1.7;`.
Candidate class: `p.tool-preamble` (element-qualified to outrank
`.tool-body p`'s sans triplet on specificity).

**Pattern 2 — `<p style="margin-top:1.25rem;">` after a diagram
or callout block** on education pages. 14+ instances:

- `html/education/load-piping.html` × 7
- `html/education/pump-control.html` × 7
- `html/education/hydronic-loops.html` × 3
- `html/education/psychrometrics-basics.html` × 1

Borderline — `margin-top:1.25rem` is a one-off adjustment to the
standard prose, used wherever a paragraph follows an SVG /
diagram. Candidate utility: `.after-diagram` or
`.tool-body p.after-diagram`; alternatively keep inline if the
"first paragraph after a diagram" pattern is genuinely the only
consumer.

**Pattern 3 — `<div class="btn-row" style="margin-top:1rem;">`** —
preset-row spacing after a section heading. 8+ instances across
`bacnet-ip-converter.html`, `economizer-ratio.html`,
`air-mixing.html`, `signal-scaling.html`. Two viable shapes:

- Bake `margin-top: 1rem` into the base `.btn-row` rule (most
  uses want it). Audit the existing call sites first — a couple
  of in-line copy-button uses on `vfd-mock.html` may want zero
  spacing.
- Or add a `.btn-row.spaced` modifier and opt-in per site.

**Pattern 4 — Worked-example pair** — `<p class="ref-note" style="margin-top:0;">`
followed by `<ol class="ref-note" style="padding-left:1.2em;">`. 4
sites across `economizer-ratio.html` and `air-mixing.html`.
Promote to `.ref-note.worked-intro` + `ol.ref-note.worked-list`
(or to a single `.worked-example` container class wrapping both).

**Pattern 5 — `<p class="ref-note" style="margin-top:0.5rem;padding-top:0;border-top:none;">`** —
compact caption under a mini-sim canvas on `pid-basics.html`. 2
sites. A `.ref-note.compact` modifier covers it.

**Why it matters:** same as #19 — drift accumulates between
sweeps because writing inline is the path of least resistance.
The hit-rate now (3+ consumers on patterns 1 / 3; 14+ on pattern
2; 4 on pattern 4; 2 on pattern 5) is firmly past the
"second/third consumer = extract" threshold from #19's own rule
of thumb.

**Priority:** MEDIUM. Patterns 1, 4, 5 are mechanical and
lowest-risk; pattern 3 is mechanical but has a small base-vs-
modifier design call to make; pattern 2 is one-off enough that
it might rightly stay inline.

**Recommended action:** promote patterns 1, 4, 5 in one commit;
take pattern 3 as a second commit (base-or-modifier decision
explicit); defer pattern 2 unless the 14+-site footprint feels
worth chasing. Each promoted pattern also gets a swept
replacement of its inline-style consumers — same shape as #19's
per-pattern commits.

### 51. Description-length drift — three more outliers, missed by #35 *(addressed 2026-05-20)*

Re-measurement on 2026-05-19 (after #35) finds three pages
outside the 140–160 char target that #35's table didn't list:

| Page | Chars | Off by |
|---|---:|---:|
| `html/tools/pid-tuner.html` | **133** | 7 short |
| `html/tools/bacnet-ip-converter.html` | **137** | 3 short |
| `html/education/hydronic-loops.html` | **168** | 8 over |

#35's eight outliers all still hold (within ±2 chars of that
entry's table). The new three were apparently not flagged in
#35's original measurement; whichever audit pass generated the
table missed them. Total off-range count is now 11 of 20 pages.

**Why it matters:** #35's whole framing is that the 140–160 char
target is a convention without a measurable check — each new
page or edit lands without verification. This addendum confirms
that the convention degrades incrementally between sweeps. The
build-time guard #35 suggested (a `description.length` check in
`.eleventy.js` that warns when a page renders outside 140–160)
would have caught all three of these on the commit that
introduced them.

**Priority:** MEDIUM. Same severity as #35.

**Recommended action:** fold into #35's scope. One pass rewrites
all 11 outliers (8 from #35 + 3 here) and lands the optional
build-time guard in the same commit. Naming this as a separate
entry only because #35 was already shipped through plan-mode
review before the re-measurement.

**Resolution (2026-05-20):** all 11 outliers (8 from #35 + the 3
here) rewritten in one pass into the 140–160 char band — verified
against `String.length`, the same measure CLAUDE.md "Templating"
documents and the guard below uses. The build-time guard landed in
`.eleventy.js` as a named collection (`descriptionLengthGuard`):
it walks `collectionApi.getAll()`, reads each page's resolved
`data.description`, and throws — failing the build — if any falls
outside 140–160, listing every offender with its char count. A
named collection rather than a transform because the collection
callback gets the resolved data cascade directly (`item.data
.description`), so the check measures the source frontmatter, not
the HTML-autoescaped rendered string. CLAUDE.md "Templating" now
records that the `description` length is build-enforced. Guard
verified both directions: passes with all 20 pages in range, fails
with a clear message when a description is forced out of range.
The hard-gate vs. warn-only choice went to *fail the build*.

### 52. Redundant inline `color:var(--accent)` on an anchor inside `.tool-body`

`html/index.html:58`:

```html
<p style="font-family:var(--mono);font-size:0.72rem;color:var(--text-dim);margin-top:1.25rem;">
    Bug reports, tool requests, or feedback — <a href="/contact.html" style="color:var(--accent);">get in touch</a>.
</p>
```

The `<a>` is inside `<div class="tool-body" ...>` (the About
card, line 50). #19's resolution added
`.tool-body a { color: var(--accent); }` to `styles.css` exactly
to make accent-anchor styling site-wide without per-page inline.
The `style="color:var(--accent);"` here is redundant with that
cascade — would render identically without it.

`html/education/index.html:18` carries the same inline-color
anchor but is NOT inside a `.tool-body` (it's a top-level
paragraph in `<main>`), so the cascade doesn't reach it — that
one's *not* redundant; leave it.

**Why it matters:** small drift, but #19's resolution wrote down
"accent anchor in `.tool-body`" as the canonical form. A future
reader who copies the inline pattern from `index.html`
re-introduces the kind of duplication #19 was scoped to
eliminate.

**Priority:** LOW.

**Recommended action:** strip the `style="color:var(--accent);"`
from `index.html:58`. One-line touch.

### 53. Inline `style="display:none"` for JS-toggled visibility

Two pages mark a section as initially hidden via inline
`style="display:none"`, then toggle visibility from JS:

- `html/tools/signal-scaling.html:53` —
  `<div id="custom-row" style="display:none">`, shown when the
  user picks "Custom" from the signal-type dropdown.
- `html/contact.html:90` —
  `<div id="contact-result" class="result-panel" style="display:none">`,
  shown after submit with `result.style.display = 'block'`.

The site has no `.hidden` utility class today; pages do the
toggling imperatively (e.g. `el.style.display = 'block'` /
`el.style.display = 'none'`).

**Why it matters:** the inline-style pattern + per-page
imperative toggle is mechanically fine, but it's the kind of
small convention sprawl that the design-system promotions (#19,
this audit's #50) keep cleaning up. A shared
`.hidden { display: none; }` utility lets both call sites use
`classList.toggle('hidden', cond)` and reads more cleanly.
Lowest-impact item in this audit batch — pure consistency.

**Priority:** LOW.

**Recommended action:** add `.hidden { display: none; }` to
`styles.css` (one line, alongside `.tab-pane`'s display-toggle
idiom). Strip the inline `style="display:none"` from both
sites; swap the imperative JS to
`classList.toggle('hidden', ...)`. ~6 lines touched total.

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

### Post-audit re-evaluation sweep (2026-05-16)

A second pass over the codebase after Block C closed caught two
items the original audit missed:

- **`html/education/balancing.html` still used `var` throughout its
  inline IIFE** (20 sites) while the `units.js` bullet above
  normalized the same drift in the shared scripts. Same convention
  applied here: `const` for the 17 single-assignment bindings, `let`
  for `anecdoteShown` (reassigned) and the `i` loop counter. The
  `var`-normalization rule effectively now covers both shared
  scripts *and* page-inline scripts; if a future page is ever a
  conscious exception, record the reason here.
- **`html/scripts/ui.js` carried stale comments** referencing the
  inline `on*` handler call pattern that Block C #3 removed
  site-wide. Both the file header and the `switchTab` doc-comment
  now describe the `addEventListener` call site that pages actually
  use. Slipped past the Block C closeout commit's "sweep stale
  references" pass.
- **Fan-icon visuals duplicated** between `pump-control.html`
  (`.pc-w-fan*`) and `vfds.html` (`.vfd-w-fan*`) — same 5-blade SVG,
  same `--blue-cool`/`--blue` palette swap, same reduced-motion
  override. Block C #5's "widget chrome only, internals stay
  page-local" rule treated the fan as an internal, but the second
  use already exists today (the precedent #5 itself set was "two
  uses is the trigger"). Took the CSS-only consolidation path:
  three rules moved to `styles.css` under `.widget-fan` /
  `.widget-fan-blades`; SVG markup and the per-page rAF animation
  loop stay page-local (each page reads Hz from its own state
  shape). Pages keep page-local positioning by scoping through the
  parent (`.vfd-w-status-row .widget-fan`,
  `.pc-w-fan-wrap .widget-fan`). Full engine extraction
  (`fan-icon.js` mirroring `flow-engine.js`) deferred until a
  third use lands and the API shape clarifies.

### Deeper-sweep (2026-05-17)

A third audit pass triggered by an `analyze-vibe-code-issues` task ran
two parallel sub-agents against the HTML, partials, scripts, tests,
worker, and config. The substantive findings became numbered open
entries #11–#21 above. The mechanical / trivial fixes landed in this
same session:

- **`html/scripts/units.js:188-196` — leftover IIFE wrapper inside a
  `let` for-loop.** Same shape as the balancing.html drift in the 5-16
  post-audit sweep: the IIFE was needed for the old `var` to capture
  per-iteration; with `let` the loop already creates a fresh `btn` per
  iteration. Collapsed to
  `for (const btn of btns) { btn.addEventListener('click', () => …); }`.
- **`html/_includes/head.njk` — Google Fonts preconnect missed the
  `fonts.gstatic.com` host.** The CSS host (`fonts.googleapis.com`)
  was preconnected; the actual woff2 binary host (`fonts.gstatic.com`)
  was not, so the preconnect benefit was reduced. Added
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
  per the canonical Google-recommended pattern.
- **`html/education/vfds.html:407-408` fan SVG had `aria-hidden="true"`
  AND `role="img"` plus inner `<title>Motor fan</title>`.**
  `aria-hidden` wins and removes the element from the AT tree, so the
  `role` and `<title>` were dead. Matched the clean
  `pump-control.html:312` pattern — kept `aria-hidden`, dropped
  `role`/`<title>`.
- **`html/contact.html:52, 56` — name and email inputs missing
  `autocomplete`.** Added `autocomplete="name"` and
  `autocomplete="email"` so browser autofill works for legitimate
  users. (The honeypot at line 69 already had `autocomplete="off"`.)
- **`html/robots.txt` had a redundant `Allow: /` directive.** Default
  behavior with no `Disallow:` is allow-all; `Allow:` with no
  preceding `Disallow:` is a no-op (and not in the original
  robots.txt RFC, though widely supported). Dropped.
- **`html/scripts/thermistor-data.js` `resAt` switch had no `default`
  branch.** A future curve `kind` would silently return `undefined`
  and produce `NaN` cells in the table. Added
  `default: throw new Error('unknown curve kind: ' + curve.kind);`.
- **`.gitignore` missing wrangler-local-dev conventions.** No `.env`
  exists today, but a contributor running `wrangler dev --local` would
  create one and it'd commit. Added `.env`, `.env.*`, `.dev.vars`.
- **`package.json` carried `npm init -y` defaults.** `"main": "index.js"`
  pointed at a non-existent file; `"private": true` was missing,
  leaving the package nominally publishable (with `"main"`,
  `"repository"`, `"bugs"`, `"homepage"` all set, a stray `npm publish`
  would have pushed a tarball). `"version": "1.0.0"` drifted from the
  footer's `v1.3`. Dropped `"main"`, added `"private": true`, synced
  `"version"` to `"1.3.0"`.
- **`html/index.html:52` — typo in the About copy** ("if anything in
  incorrect" → "if anything is incorrect").
- **`html/education/hydronic-loops.html` frontmatter description** had
  `'twin-T'` single-quotes, which render as `&#39;twin-T&#39;` in
  view-source per the CLAUDE.md autoescape gotcha. Dropped the
  quotes; meaning unchanged.
