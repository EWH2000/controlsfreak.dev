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
- Considered-and-skipped entries get a *(deferred YYYY-MM-DD)* marker
  and live under the `### Deferred / Won't fix (with revisit trigger)`
  subsection at the end of `## Issues`. The body carries an explicit
  trigger condition that would change the call.
- New entries land here as code issues surface (same running-list
  spirit as `site-ideas-and-friction.md`, but scoped to code quality
  rather than features / content).

---

## Issues (status inline)

### 1. Perpetual `setInterval` timers in widgets that don't always need them *(addressed 2026-05-16)*

Three widgets fire `setInterval` callbacks forever once the page
loads:

- `html/simulators/vfd-mock.html:874` — 50 ms motor tick. Always calls
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

### 9. Stale comments — second sweep after Block C and the 11ty migration *(addressed 2026-05-17)*

The 2026-05-16 post-audit re-evaluation caught `ui.js` and balancing.html.
A deeper sweep on 2026-05-17 surfaced two more families of the same
pattern.

*"inline `on*` handlers" — described as the live convention after Block C
#3 removed every one site-wide:*

- `html/scripts/pid-engine.js:5`
- `html/scripts/thermistor-data.js:6`
- `html/simulators/pid-tuner.html:205`
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
  duplicated at `html/simulators/pid-tuner.html:226` and
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
  `tools/psychrometric-chart.html:294`, `simulators/pid-tuner.html:96`,
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

`html/simulators/pid-tuner.html:273` renders the steady-state error as a
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
calls it with `+sim.ssErr` (the engine's SP − PV convention — positive
= PV settled below SP — preserved; *corrected 2026-06-10: this line
originally said "PV-above-SP", the inversion audit-2026-06 traced
through three code comments*),
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

- **`html/simulators/vfd-mock.html:810-825` — `vfdm-try-default` and
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

### 30. Missing `:focus` styles on custom-styled interactive elements *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** added a consolidated
`/* ── FOCUS INDICATORS ── */` block to `styles.css` (right after the
range-slider thumb rules). One selector list — `.copy-btn`,
`.tab-btn`, `.units-btn`, `.cta-button`, `.back-link`, `.nav-card`,
each `:focus-visible` — gets `outline: 2px solid var(--accent);
outline-offset: 2px;`, matching the existing `.skip-link:focus`
treatment. The range-slider thumbs (`::-webkit-slider-thumb` /
`::-moz-range-thumb`), where `outline` can't cleanly target the
pseudo-element, instead extend their existing
`box-shadow: 0 0 0 1px var(--accent)` ring with an outer
`0 0 0 4px var(--accent-glow)` glow on `:focus-visible`.
`:focus-visible` (not `:focus`) keeps the indicator off the
mouse-click path. No HTML pages touched — every targeted class was
already in use. CLAUDE.md "Design system" gained a bullet recording
the convention and pointing future interactives at the consolidated
block.

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

### 36. `education/psychrometrics-basics.html` has only smoke-loop test coverage *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** added the `psychrometrics basics —
pool widget sweeps surface temp through dry / watch / condensing
states` test to `tests/smoke.spec.js`, appended after the
`balancing` test so it sits with the other education-page
behavioral tests. It asserts the on-load condensing state (defaults
DB 82 / RH 60 / surface 50 — dew point 66.8 °F, margin −16.8 °F),
then holds DB and RH fixed and sweeps only the coldest-surface
slider through three positions that land the margin in each band:
surface 80 °F → `ok` (margin 13.2), 70 °F → `watch` (3.2, inside
the 5 °F band), 65 °F → `bad` (−1.8). `data-state` is checked on
both `#pool-status` and `#pool-readouts`, plus the status label and
the exact `#pool-margin-val` readout. A final pair drives the
natatorium regime (DB ≥ 80, RH ≥ 65, surface ≤ 55, condensing) to
confirm the anecdote callout appears, then leaves the regime to
confirm it is *removed* — distinct from the `balancing` widget's
pinned-once-shown anecdote. Verified the test catches a real
regression by perturbing the watch threshold in the built page and
confirming the `ok`-state assertion fails. Test-only change — no
page edit, no version bump.

### 37. No `playwright.config.js` *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** added `playwright.config.js` at the
repo root — `defineConfig` with `use.baseURL`, a `webServer` block,
`reporter: 'list'`, and `testDir: './tests'`. The 37 hardcoded
`http://localhost:8000` strings (18 in `smoke.spec.js`'s `PAGES`
array, 18 standalone `page.goto()` calls, 1 `CONTACT_URL` constant
in `contact.spec.js`) are now leading-slash paths resolved against
`baseURL`. Two deliberate deviations from the sketch above:
`reuseExistingServer: !process.env.CI` rather than a flat `true`
(Playwright's recommended form — reuses a running `npm run dev`
locally, always starts clean in CI, which keeps #46 from inheriting
a stale server); and `reporter: 'list'` moved into the config so
`package.json`'s `test` script drops its `--reporter=list` flag.
The `webServer.command` runs `npm run build` then serves `_site/`,
so `npm test` is self-sufficient from a fresh checkout. The
PAGES↔sitemap sync test needed no change — its host-stripping
regex is a harmless no-op on the now-relative PAGES urls and still
load-bearing for the sitemap's absolute `<loc>` entries.
`tests/psychro-engine.spec.js` (pure-Node, no URLs) was untouched.
CLAUDE.md "Local preview & tests" updated to drop the manual
server-start instruction. No version bump — test-infrastructure
only. The CI workflow that consumes this config is #46.

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

### 40. `ui.js` helpers don't guard null DOM lookups *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** both helpers in `html/scripts/ui.js`
hardened. `switchTab` now resolves `btn.closest('.tool-card')` and
the `tab-<name>` pane *up front* — before any `.active` mutation —
and `console.warn`s + returns if either is null; resolving the pane
first means a bad `name` is a clean no-op instead of deactivating
every pane and then throwing. `copyReadouts` resolves each id to an
element before reading `.textContent`, `console.warn`s + yields
`null` for any missing id, and lets the existing
`.filter(v => v && v !== '—')` drop it. `console.warn` (not
`console.error`) is used in both so the #20 `watchErrors`
smoke-test assertion isn't tripped. The recommended-action text
named `console.warn` for `switchTab` only; it was applied to
`copyReadouts` too since a missing readout id is the same class of
dev-time wiring typo. No call site changed behavior — the existing
smoke specs (tab switching, copy buttons) pass unchanged. Patch
bump 1.9.1 → 1.9.2.

### 41. Worker email regex accepts edge cases *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** tightened, not accepted-as-gap.
`EMAIL_RE` in `src/worker.js` became
`/^[^\s@.](?:[^\s@]*[^\s@.])?@[^\s@.](?:[^\s@]*[^\s@.])?\.[^\s@.](?:[^\s@]*[^\s@.])?$/`
— the token `[^\s@.](?:[^\s@]*[^\s@.])?` reads "a non-dot char,
optionally followed by anything then another non-dot char", applied
to the local part and to each side of the domain dot. This rejects
`.user@x.com`, `user.@x.com`, `user@.x.com`, and `user@x.com.` (all
of which Resend would 502 on) while still accepting single-char
local parts, `+tag` addresses, and subdomains. Stayed deliberately
non-RFC-exact per the #13 "obvious risks handled well" framing;
internal and consecutive dots are still tolerated since only the
pathological-dot positions were in scope. The choice is documented
in a comment above the constant. Verified with a `node -e` case
table (9 reject / 6 accept, all pass). Patch bump 1.9.2 → 1.9.3.

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

### 45. Sitemap `<lastmod>` dates are stale and hand-maintained *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** both recommended pieces combined.
`html/sitemap.xml` was deleted; `html/sitemap.njk` now renders
`_site/sitemap.xml` from a `sitemapPages` collection (every
template with a `canonical` frontmatter — the 20 real pages —
sorted by canonical URL). Each `<loc>` is the page's `canonical`;
each `<lastmod>` comes from a new `gitLastmod` 11ty filter running
`git log -1 --format=%cd --date=short -- <inputPath>` via
`execFileSync` (no shell), falling back to the build date if git
has no record. The sitemap passthrough-copy is removed from
`.eleventy.js`. The #20 `PAGES` ↔ sitemap drift test now reads the
built `_site/sitemap.xml` instead of the (now-gone) source file.
CI's `actions/checkout` gains `fetch-depth: 0` so the dates
resolve in CI — the default depth-1 shallow clone would collapse
every `<lastmod>` to the build date. CLAUDE.md picked up a new
*Sitemap* subsection and the *Adding a new tool* / repo-structure
mentions were corrected (the sitemap is no longer hand-edited;
new pages only need a `PAGES` entry). **Open caveat:** the
Cloudflare Workers Build deploy clone depth is unverified — if it
shallow-clones, the deployed `<lastmod>`s all fall back to the
build date (functionally harmless, signal lost). Verify against
the live `/sitemap.xml` after first deploy. Patch bump to 1.9.3
(shares the version slot with the in-flight #41 PR — whichever
merges second rebases the `package.json` line to 1.9.4).

### 46. No CI workflow runs tests pre-deploy *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** added `.github/workflows/test.yml` —
a single `test` job on `pull_request` to `main`: checkout,
`setup-node` (`lts/*`, npm cache), `npm ci`, an `actions/cache`
step for `~/.cache/ms-playwright` keyed on `package-lock.json`,
`npx playwright install --with-deps chromium`, `npm test`. The
explicit `npm run build` from the sketch above was dropped — #37's
`playwright.config.js` `webServer` block already builds the site
and serves `_site/` for the run, so the workflow is just install +
`npm test`. `permissions: contents: read` for least privilege. A
`retries: process.env.CI ? 2 : 0` line was added to
`playwright.config.js` (CI-only, so a genuine flake gets two more
chances without masking a local failure). CLAUDE.md "Local preview
& tests" and the "Workflow" loop now record the CI gate. The
deploy pipeline is untouched — Cloudflare Workers Build still owns
the deploy; CI only gates the PR. Branch-protecting `main` to
require the `test` check is a GitHub-settings step left to the
repo owner (the check name only appears in that UI after the
workflow has run once).

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

### 48. Define-by widget duplication — `SECOND_PROP` / `buildSecondProp` / `secondToCanonical` / `refreshSecondLabel` across three pages *(addressed 2026-05-19)*

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

**Resolution (2026-05-19):** extracted `/scripts/psy-widget.js`, a
new shared classic-script exposing `PsyWidget.buildSecondProp()` (the
per-mode `{ label, step }` catalog carrying the active unit suffix)
and `PsyWidget.secondToCanonical(mode, value)` (display-units →
canonical IP). All three psych tools — `psychrometric-chart`,
`air-mixing`, `economizer-ratio` — now build their catalog and
convert through the shared helpers; their local `SECOND_PROP` +
`secondToCanonical` duplicates are gone. `psychrometric-chart` keeps
its chart-specific per-mode `def` (defaults) and `fmt` (state →
display formatter) enrichments by spreading them onto the shared
base. Per-page `refreshSecondLabel(prefix)` wiring stayed on each
page as the entry directed — it is id-prefix-aware and tied to
per-page DOM, so not candidate-extractable until a fourth consumer
arrives. The new file follows `pid-chart.js`'s header conventions
(dashed-border export block, classic-script note, no DOM access).
CLAUDE.md "Stack → Shared scripts" gained the `psy-widget.js` bullet.

### 49. `economizer-ratio.html` re-declares `P_AIR` shadowing the engine's `P_STD` *(addressed 2026-05-19)*

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

**Resolution (2026-05-19):** the `const P_AIR = 14.696` shadow
deleted from `economizer-ratio.html` and its two call sites
repointed to the engine's `P_STD` (`psychro-engine.js`). The
adjacent comment already named `P_STD` correctly, so no docs change
was needed. economizer-ratio now matches the other two psych
consumers — it sources sea-level standard pressure from the engine
rather than re-declaring it. Shipped as its own commit, not folded
into #48.

### 50. Inline-style proliferation, second wave — patterns #19 didn't catch *(addressed 2026-05-19)*

#19 promoted four inline-style patterns to design-system classes
(body-prose triplet, lead paragraph, accent anchor,
`.result-formula` modifiers). Site-wide count is now 222 inline
`style="..."` attributes; another set of repeated shapes has
accumulated since.

**Pattern 1 — Tool-card preamble paragraph.** Mono small-caps
caption under a tool-card-header. Same six-property shape across
3 sites:

- `html/simulators/pid-tuner.html:31`
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

**Resolution (2026-05-19):** patterns 1, 4, 5 shipped in one commit
and pattern 3 in a second; pattern 2 deliberately left inline per
the entry's own recommendation.

- **Pattern 1 → `p.tool-preamble`** — element-qualified typography-
  only class (padding/margin stays per-site, since it varies by
  whether the preamble sits inside or outside `.tool-body`). The
  audit's count of 3 undercounted: `vfd-mock.html` ×2 and
  `psychrometric-chart.html` were also carrying the shape, so 6
  sites were swept.
- **Pattern 3 → base `.btn-row`** — `margin-top: 1rem` baked into
  the base rule (the dominant calc/converter shape), with a narrow
  `.ps-row > .btn-row { margin-top: 0 }` exception keeping the two
  in-`.ps-row` toggle groups centered against their label sibling.
  10 inline `margin-top` drops plus 1 paired Turnstile
  `margin-bottom` drop on `contact.html` (now redundant).
- **Pattern 4 → `.ref-note.worked-intro` + `ol.ref-note.worked-list`**
  — modifier pair for the 4 worked-example blocks across
  `economizer-ratio` and `air-mixing`; 8 inline styles swept.
- **Pattern 5 → `.ref-note.compact`** — mini-sim caption modifier
  on `pid-basics.html`; 3 sites (audit's count of 2 missed Sim 3).
- **Pattern 2** (`<p style="margin-top:1.25rem;">` after diagrams,
  14+ sites) — left inline. The entry flagged it as a one-off
  candidate to skip, and that call was taken.

CLAUDE.md "Design system → Prose typography classes" picked up
bullets documenting the new classes.

### 51. Description-length drift — three more outliers, missed by #35 *(addressed 2026-05-20)*

Re-measurement on 2026-05-19 (after #35) finds three pages
outside the 140–160 char target that #35's table didn't list:

| Page | Chars | Off by |
|---|---:|---:|
| `html/simulators/pid-tuner.html` | **133** | 7 short |
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

### 52. Redundant inline `color:var(--accent)` on an anchor inside `.tool-body` *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** the inline `style="color:var(--accent);"`
removed from the `<a href="/contact.html">` on `index.html:58`. The
anchor sits inside the About card's `.tool-body`, so the
`.tool-body a { color: var(--accent); }` cascade rule (styles.css:306,
from #19) already renders it identically. `education/index.html:18`
left untouched as the entry directs — its anchor is a top-level
`<main>` paragraph, outside any `.tool-body`, so the cascade does
not reach it and the inline color there is not redundant.

### 53. Inline `style="display:none"` for JS-toggled visibility *(addressed 2026-05-20)*

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

**Resolution (2026-05-20):** `.hidden { display: none; }` added to
`styles.css`. Placed at the end of the component rules (just
before the closing `prefers-reduced-motion` media block) rather
than alongside `.tab-pane` as the entry sketched — `.hidden` and
`.result-panel` are both single-class selectors (equal
specificity), so `.hidden` has to come *later* in the file to win
the cascade tie and actually hide `#contact-result` (which carries
both classes). `signal-scaling.html`'s `#custom-row` swapped to
`class="hidden"` + `classList.toggle('hidden', !isCustom)`; the
old code set `display:'grid'` when shown, but `#custom-row` has no
grid template of its own (it just stacks three `.ps-row`s, each
its own grid), so the div's default `block` renders identically.
`contact.html`'s `#contact-result` swapped to
`class="result-panel hidden"` + `classList.remove('hidden')` on
submit (the old code set `style.display = ''`, reverting to
`.result-panel`'s `display:flex` — `.hidden`-removal does the
same). Scope held to the two pages the entry named; see #54 for
the same pattern on `psychrometric-chart.html`.

### 54. Inline `style="display:none"` on `psychrometric-chart.html` — same pattern as #53 *(addressed 2026-05-20)*

While addressing #53, a site-wide grep for inline `display:none`
turned up six more on `html/tools/psychrometric-chart.html`, all
the same JS-toggled-visibility pattern #53's `.hidden` utility now
serves — #53's scope deliberately covered only `signal-scaling`
and `contact`:

- `:377` `<div class="psy-process" id="psy-process-block">` —
  toggled `block.style.display = 'none' / ''` at `:801-802`.
- `:382` `#pd-shr-row` — toggled `'' / 'none'` at `:816, :819`.
- `:383-385` `#pd-qt-row` / `#pd-qs-row` / `#pd-ql-row` — toggled
  `haveQ ? '' : 'none'` at `:823-825`.
- `:360` `<th class="psy-q-col" …>` — one of several `.psy-q-col`
  cells toggled in bulk by `el.style.display = cfmOn ? '' : 'none'`
  at `:732`.

**Why it matters:** identical to #53 — small convention sprawl,
and now that `.hidden` exists the inline form is the off-pattern
one. Same drift class as #51 vs #35: an audit named a fixed page
list and a later grep finds the rest.

**Priority:** LOW (pure consistency; no live bug).

**Recommended action:** swap each inline `style="display:none"`
to `class="hidden"` (additive where the element already has a
class) and the imperative `.style.display = '' / 'none'` toggles
to `classList.toggle('hidden', …)` / `.remove('hidden')`. The
`.psy-q-col` bulk toggle becomes
`el.classList.toggle('hidden', !cfmOn)`. One caveat to check
before swapping: the `<th>`/`<td>` cells revert to `table-cell`
when `.hidden` is removed (correct), but confirm no `.psy-q-col`
rule sets a competing `display` — if one does, the
equal-specificity cascade order (#53's resolution) applies.

**Resolution (2026-05-20):** all six inline `style="display:none"`
swapped to additive `class="hidden"` (the `psy-q-col` `<th>`, the
`psy-process` block, the four `pd-*-row` divs), and the eight
imperative `.style.display` assignments in `renderStageTable` /
`renderProcessBlock` swapped to `classList.toggle('hidden', …)` /
`.add` / `.remove`. The caveat cleared cleanly during planning —
unlike #53's `.result-panel`, none of the three affected
selectors poses a cascade conflict: `.psy-q-col` has no CSS rule
at all (cells fall back to the UA-default `table-cell` when
`.hidden` is removed); `.ps-row` is `display:grid` at
`styles.css:963` but `.hidden` at `:1279` is later in the same
file and wins the equal-specificity tie; `.psy-process` (page
inline `<style>`) sets no `display`, so there is nothing to tie
with. No `styles.css` change needed — `.hidden` already exists
from #53. Verified in a browser that the process block reveals
on the `cc` stage and hides on the others, and that the CFM
column toggles with the CFM input, with no console errors. No
version bump — pure consistency, nothing renders differently.

### 55. `contact.spec.js` "empty submit" test flakes in CI on Turnstile *(addressed 2026-05-20)*

#46's CI workflow went green on its first run (PR #50) but reported
**1 flaky**: `contact.spec.js`'s "empty submit triggers built-in
validation and makes no network call" test failed its first attempt
with a 30 s timeout, then passed on retry #1.

Cause: the test does `page.click('#contact-form
button[type="submit"]')`. The contact form's Turnstile widget can't
reach `challenges.cloudflare.com` from a sandboxed / CI localhost,
so its `onTsError` callback fires and disables the submit button;
Playwright then waits out the click timeout. The test was written
assuming it would finish before `onTsError` surfaced (the CLAUDE.md
"Turnstile callbacks" gotcha), but that race is lost reliably here
and on the CI runner's first attempt.

**Why it matters:** CI stays green only because #46's
`retries: 2` lets the test through on a re-run — retry-roulette. An
occasional run burns all three attempts, turns the `test` check
red, and blocks a merge. The gate should not depend on luck. Caught
during #46's first CI run.

**Priority:** LOW (CI hygiene; the test logic itself is sound).

**Recommended action:** block the Turnstile script in the test
rather than `test.fixme` it — the test exercises browser-native
required-field validation, which needs no Worker and no Turnstile,
so it should keep running. Intercept `challenges.cloudflare.com`
before navigating so the widget never loads, the callbacks never
fire, and the submit button keeps its HTML-default enabled state.

**Resolution (2026-05-20):** added
`await page.route('https://challenges.cloudflare.com/**', route =>
route.abort())` as the first line of the "empty submit" test, before
`page.goto`. With Turnstile's `api.js` blocked, no widget renders,
`onTsOk/onTsExpired/onTsError` never fire, and the submit button
stays enabled — the click is deterministic. Nothing the test
asserts changed: empty required fields still block submission and
still produce no `/api/contact` fetch. Scope held to that one test
— `contact page loads` is not flaky and the honeypot test is
`test.fixme`. `test.fixme` was the alternative but was rejected: it
would discard a runnable, meaningful test (unlike the honeypot
test, which genuinely needs the Worker). CLAUDE.md's "Turnstile
callbacks" gotcha updated to record the route-block; the
`smoke.spec.js` race-tolerance note stays (that file is out of
scope). No version bump — test-only.

### 56. `coil-sizing.html` toggles row visibility with `el.style.display` instead of the `.hidden` class *(addressed 2026-05-21)*

Surfaced during the 2026-05-21 content-audit pass (delta sweep of the
post-2026-05-20 code).

`coil-sizing.html`'s `applyCoilType()` shows/hides the cooling-only and
heating-only rows by writing inline `display` from JS:

```js
document.querySelectorAll('.cs-cool-only').forEach(el => { el.style.display = cool ? '' : 'none'; });
document.querySelectorAll('.cs-heat-only').forEach(el => { el.style.display = cool ? 'none' : ''; });
```

Issues #53 and #54 established the `.hidden` utility class as the
site-wide idiom for JS-toggled visibility — `signal-scaling.html`'s
custom-row toggle uses `classList.toggle('hidden', !isCustom)`,
`psychrometric-chart.html` uses `.hidden` for its process block and CFM
column, `contact.html` uses it for the result panel. `coil-sizing.html`
is a newer page (shipped after #53/#54) and is the lone site-wide user
of JS `el.style.display` toggling — exactly the drift the CLAUDE.md
"new page → conventions" sweep is meant to catch.

**Why it matters:** small, but it's the convention drifting back the
day after it was established. A `el.style.display = 'none'` left on an
element also out-ranks a later class-based rule, so the next contributor
who tries to show one of these rows via `.hidden` finds it doesn't work.

**Priority:** LOW (no live bug — the page works; pure consistency).

**Recommended action:** swap both lines to
`el.classList.toggle('hidden', !cool)` / `('hidden', cool)`. `.hidden`
already exists in `styles.css` from #53; no CSS change needed. Confirm
the `.cs-cool-only` / `.cs-heat-only` selectors carry no `display` rule
of their own that would tie with `.hidden` on specificity.

**Resolution (2026-05-21):** `applyCoilType()` now uses
`el.classList.toggle('hidden', …)` for both row sets. Confirmed
`.cs-cool-only` / `.cs-heat-only` carry no CSS rule of their own (page
inline `<style>` or `styles.css`), so `.hidden` wins cleanly. No CSS
change — `.hidden` was already in `styles.css` from #53.

### 57. Education body-prose inline triplet on `<ul>` lists — missed by #19 / #50 *(addressed 2026-05-21)*

Surfaced during the 2026-05-21 content-audit pass.

Issue #19 promoted the education body-prose font triplet
(`font-size:0.95rem; line-height:1.85; color:var(--text)`) to a
`.tool-body p` rule and swept the inline copies off `<p>` elements.
The sweep was scoped to paragraphs; it did not cover `<ul>` lists
carrying the same inline triplet. Those survive on at least:

- `html/education/vfds.html` — the run-command/speed-reference list and
  the network-points list (2 `<ul>`).
- `html/education/pump-control.html` — the centrifugal-pump-facts list
  and the local-vs-remote-DP list (2 `<ul>`).

Each is `<ul style="font-size:0.95rem;line-height:1.85;color:var(--text);
margin:…">`.

**Why it matters:** same design-system-leakage argument as #19 — a
future retune of education body-prose line-height has these inline
copies to chase. Low-stakes (no live bug), but it's the same pattern
#19 set out to eliminate, just on a different element.

**Priority:** LOW.

**Recommended action:** decide whether `.tool-body ul` / `.tool-body li`
deserves a promoted rule alongside `.tool-body p` (the cleanest fix), or
whether the handful of inline list styles are tolerable. If promoted,
mind the same specificity gotcha #19 hit with `p.bit-hint` et al. —
check no list-scoped utility class is out-ranked.

**Resolution (2026-05-21):** promoted `.tool-body ul` in `styles.css`
next to `.tool-body p` — same font triplet (`font-size: 0.95rem;
line-height: 1.8; color: var(--text)`; normalized off the inline 1.85).
A `li` rule isn't needed — `<li>` children inherit font/colour from the
`<ul>`. The inline triplet was dropped from the 4 target `<ul>`s
(`vfds.html` ×2, `pump-control.html` ×2); each keeps its per-list
`margin` inline since that value varies. The three other education
`<ul>`s (`hydronic-loops.html`, `pump-control.html` — smaller 0.86rem
lists) keep their inline font styling, which out-ranks the new rule, so
they are unchanged. `modbus-register-viewer.html`'s `<ul class="ref-note">`
sits in a `.tool-body-row`, not a `.tool-body`, so the new descendant
selector doesn't reach it. No list-scoped utility class is out-ranked.

### 58. Numeric-input values not converted on initial paint for metric visitors *(addressed 2026-05-21)*

Surfaced while building `refrigerant-pt.html` (2026-05-21).

`units.js` runs `applyToDOM()` on load, which swaps every
`[data-us][data-metric]` element's text to the metric variant for a
returning metric visitor — including form-input *labels* like
`<label data-us="Dry-bulb (°F)" data-metric="Dry-bulb (°C)">`. But the
input *values* are authored as static US numbers (`value="80"`) and
nothing converts them until the visitor toggles the units control. So a
metric visitor's first paint shows a US number under a metric label —
e.g. `80` next to `Dry-bulb (°C)`.

`thermistor-calculator.html` handles this — its IIFE converts the temp
input in the initial-paint block when `Units.current()` is `'metric'`.
The other two-column calculator tools do not:

- `html/tools/coil-sizing.html` — entering/leaving dry-bulb, second-
  property, airflow, and load inputs.
- `html/tools/economizer-ratio.html` — the dry-bulb and full-state
  temperature inputs.
- `html/tools/air-mixing.html` — per-stream temperature / second-property
  inputs.

(`refrigerant-pt.html` itself ships with the fix — it converts its four
inputs up front, matching thermistor.)

**Why it matters:** wrong numbers on screen for a metric visitor until
they happen to toggle the control. Low-frequency (US is the default and
most of the audience), but it's a correctness bug, not just cosmetics.

**Priority:** LOW (US-default audience; self-corrects on first toggle).

**Recommended action:** in each tool's IIFE initial-paint block, when
`Units.current() === 'metric'`, run the existing `rewriteInput` /
unit-flip path once with `from='us', to='metric'` before the first
compute. The conversion helpers already exist on each page; this is a
3–5 line addition per tool, no new shared code.

**Resolution (2026-05-21):** each of the three tools' inline IIFE got
a `U.current() === 'metric'` guard in its initial-paint block that
calls the page's existing `rewriteInput` helper once per input with
`from='us', to='metric'` before the first compute. Each block reuses
the exact input-id lists and `quantityForMode` helper its `U.onChange`
handler already uses — temps as `temp`, define-by second values by
mode, airflow as `airflow`, loads as `heatCapacity`, `coil-sizing` /
`economizer-ratio` second values via `quantityForMode`, `air-mixing`
altitude as `altitude`. No new shared code, no CSS. Matches the
`thermistor-calculator.html` / `refrigerant-pt.html` pattern the entry
cites. No version bump — a metric visitor's first paint is now
correct, but nothing renders differently for the US-default majority.

### 59. `'use strict';` missing on `pump-control.html` Widget 2 IIFE *(addressed 2026-05-27)*

Caught while building `education/equipment-staging.html` (2026-05-21),
reading `pump-control.html` as the layout reference.

`html/education/pump-control.html`'s inline `<script>` has two page
IIFEs. Widget 1 (operating-point chart) opens with `'use strict';` as
its first statement; Widget 2 (DP setpoint reset, the IIFE at
`pump-control.html:791`) does not — it jumps straight to its `const`
declarations.

Per *JS patterns* in CLAUDE.md, `'use strict';` is the required first
statement inside every page-inline IIFE. Issue #18 was the site-wide
`'use strict'` adoption sweep (addressed 2026-05-17); pump-control
shipped 2026-05-15, so this IIFE should have been caught by that
sweep and wasn't — a one-line miss.

**Why it matters:** small, but it's a real convention gap — strict
mode catches undeclared-global assignment and a few other footguns,
and Widget 2 currently runs sloppy. Low-risk fix: add the directive
as the first line inside the `pump-control.html:791` IIFE. Not fixed
inline here to keep the equipment-staging PR scoped to its own work.

**Resolution (2026-05-27):** added `'use strict';` as the first
statement of the Widget 2 IIFE (line drifted to `pump-control.html:802`
between this entry being written and the fix landing). Matches
Widget 1's shape one screen up. No behavior change — Widget 2 wasn't
relying on sloppy-mode semantics.

### 69. `[data-sbg-stroke]` fixed-dasharray draws short paths early *(deferred 2026-05-24)*

Caught during the schematic-bg doc-audit (2026-05-23). The
schematic-bg gutter motifs use `stroke-dashoffset` for the
scroll-reveal draw-in. Commit `e700c2a` set
`stroke-dasharray: 600` site-wide on every `[data-sbg-stroke]`
element to dodge a Chromium quirk where dashoffset on Bezier
paths and circles refused to fully draw. Side effect: short
straight wires (compare-bo / and-bo signal wires ~76 user units,
supervisor fan-out traces, the pump-coil grid, the diverting-valve
triangles) finish drawing in roughly the first 10% of the 3000ms
transition while long pipe runs take the full duration.

**Why it matters:** the disparity reads as a stutter — short paths
"flash on" while long paths sweep. Not broken, but inconsistent
with the as-builts pedagogy ("the wire draws as you read past it").

**Attempted fix (2026-05-23, commit `b8dae2b`):** case-split into
two modes by SVG safety. `<line>` and L-only `<path>` elements
carried `pathLength="1"`, and a new CSS rule
`.sbg-motif [data-sbg-stroke][pathLength="1"]` used
`stroke-dasharray: 1; stroke-dashoffset: 1` to draw them end-to-end
across the full 3000ms. `<circle>`, `<rect>`, and Bezier `<path>`
fell through to the safe fixed-600 default.

**Reverted (2026-05-24, commit `98223a5`):** in-browser inspection
showed the case-split rendered broken on every pathLength element.
Chromium does NOT honor `pathLength="1"` for `stroke-dasharray`
computation — verified by `getComputedStyle(el).strokeDasharray`
returning `"1px"` against a line whose `getTotalLength()` returned
the geometric length (104). The CSS `stroke-dasharray: 1` was
treated as 1 actual pixel, rendering the path as ~50 tiny dashes
that read as a near-invisible speckle. The BI1/BO1 connector
disappeared entirely, the pump-coil crosshair lost its vertical
segment, and several other short elements rendered as broken or
empty. Spec-wise pathLength should apply to dasharray, but the
Chromium implementation only honors it for the JS API
(`getTotalLength` / `getPointAtLength`).

This is the *third* length-normalization approach to hit a
Chromium quirk: `getTotalLength`-derived `--sbg-len` (broken on
Beziers / circles), full `pathLength="1"` normalization (same
class of bug), and case-split `pathLength="1"` on safe straight
elements (this one — the dasharray side effect).

**Decision (2026-05-24):** defer / accept the stutter. The fixed-
600 dasharray is the only approach that renders reliably across
every motif element type. Short-path stutter is the trade-off.
**Trigger for revisit:** Chromium ships proper pathLength
support for `stroke-dasharray`, OR a non-pathLength approach is
found (e.g., per-element CSS variable populated by JS at init
time with the actual `getTotalLength()` value — viable but
trades CSS-only simplicity for a JS bootstrap pass; would need
its own trade-off analysis).

### 70. Schematic-bg motif library inlines ~360 SVGs into every page DOM *(deferred 2026-05-23)*

Caught during the schematic-bg doc-audit (2026-05-23). The
`_includes/schematic-bg.njk` partial emits 60 motifs per side
(2 sides × 60 = 120 SVG wrappers), each holding 4–8 child
elements (paths, rects, circles, lines, text labels). Net DOM
weight per page: roughly 360 stroked SVG elements plus 120 SVG
wrappers, layered behind every content surface via
`position: absolute; z-index: -1`.

The standard SVG-economy fix would be `<symbol>` + `<use>` shadow
trees — one definition, 60 cheap references per side. Tried
during the earlier development of this branch; abandoned because
`flow-engine.js` reads each path's geometry via `getTotalLength()`
and `getPointAtLength()`, and those calls don't pierce `<use>`
shadow trees reliably in Chromium (some paths return length 0,
others throw). Without engine-driven motion the gutter art
becomes static decoration — which kills half the value.

**Why it matters:** ~~for now, the IntersectionObserver-gated
per-frame work in `flow-engine.js` (only motifs in the viewport
churn pulses) keeps the CPU cost negligible~~ — *correction
(2026-06-10, audit-2026-06 #31): that gating applied to pulses
only. Flow-particle pools ticked every frame regardless of
visibility or the gutter's `display:none`, and the measured idle
cost was ~100 % of the main thread at desktop widths (552
particles on a chrome-only page) and 4.5 s of script per 10 s on a
phone moving circles that never painted. Fixed in the #31 PR: flow
pools are now matchMedia-gated (no pools built while the gutter is
hidden) and IntersectionObserver-gated (offscreen pools don't
tick).* The DOM weight itself gzips well since the repeated markup
compresses heavily.

**Measured baseline (2026-06-09 audit, first numbers for the
revisit trigger):** heaviest page 27.5 KB gzipped — nowhere near
the 100 KB line, so the deferral stands. 80.7 % of
signal-scaling's raw HTML is schematic-bg markup; stripping it
saved +268 ms FCP / +654 ms DCL at 4× CPU throttle. The real cost
of the motif library was #31's runtime animation (now gated), not
bytes.

**Decision (2026-05-23):** defer / accept. The standard fix is
blocked by a Chromium-specific limitation that's outside our
control. Inline duplication is the working alternative.
**Trigger for revisit:** any of
- Chromium ships `getTotalLength()` support through `<use>` shadow
  trees (changes the engineering math entirely; collapse to
  `<symbol>` + `<use>` immediately).
- A measurable LCP / TTI regression on long pages tied to the
  schematic-bg DOM weight (currently no signal — pages well under
  100KB gzipped).
- Flow-engine itself moves off `getTotalLength()` (e.g., to
  CSS Motion Path with `offset-path: path()`), at which point
  `<use>` becomes viable regardless.

### 71. `flow-engine.js` init() docstring described first-call semantics under site-wide loading *(addressed 2026-05-23)*

Caught during the schematic-bg doc-audit (2026-05-23). Since
commit `c8fb4aa` made the engine site-wide-loaded by
`schematic-bg.js`, `FlowEngine.init()` is called once on every
page automatically. The header docstring and the Public API
entry both still described init as a first-call operation: "scan
the document, build pools, start the frame loop. Idempotent for
already-built pools (a second call rebuilds them in place)" — true
but underspecified about *which* call is the page's first.

**Why it matters:** any new contributor reading the docstring
would assume a page-level `<script>FlowEngine.init();</script>`
in an education page is the bootstrap. It isn't (anymore) — it's
a refresh of paths the site-wide call already registered. The
`frameStarted` guard prevents a double rAF loop and `poolsByEl`
de-dupes per-element pools, so the page-level call is safe, just
nominally redundant.

**Resolution (2026-05-23):** tightened both the top-of-file block
and the Public API `init()` entry (commit `8e24313`) to describe:

- That the engine is loaded + initialized site-wide.
- That `frameStarted` and `poolsByEl` make re-calls safe by
  construction.
- When a page-level call is still useful (after the page mutates
  SVG geometry, e.g. swapping a path's `d` attribute).

Docs-only, no behavior change.

### 72. Landing-page lead paragraphs each carry their own inline-style copy of the same shape *(addressed 2026-05-24)*

Caught during the refinement-period content audit, Batch 1 — Landings
(2026-05-24). The three section-landing pages each open with a single
lead paragraph styled via inline `style="..."` attribute:

- `html/tools/index.html:18` —
  `font-weight:300;color:var(--text);max-width:560px;margin-bottom:2rem;line-height:1.8`
- `html/simulators/index.html:18` —
  `font-weight:300;color:var(--text);max-width:560px;margin-bottom:2rem;line-height:1.8`
- `html/education/index.html:18` —
  `font-weight:300;color:var(--text);max-width:700px;margin-bottom:2rem;line-height:1.8`

Identical declaration apart from the `max-width` (560 / 560 / 700).
This is the same pattern issue #19's pattern-1 promotion addressed for
education *content* pages by extracting `.page-intro` — but the
*landing* pages were not in that sweep's scope, so the inline shape
persists on three pages.

User-visible consequence is documented under
`content-audit.md` finding #18 (Batch 1 refinement-period audit):
the three landings render with inconsistent lead widths that read
as cadence drift between peer pages.

**Why it matters:** retunes to lead typography (line-height,
font-weight, color contrast) require touching three files and
keeping their inline rules in sync. The pattern also models "inline
is fine here" for any future landing page (the refrigerant Education
landing the friction file hints at would inherit the bad pattern).

**Recommended action:** promote one of:
- a new `.landing-intro` class in `styles.css` (separates landing
  intros from content-page intros, leaves `.page-intro` scoped to
  the content surface)
- a broader `.page-intro` reuse that covers both landing and content
  contexts (single class, one rule to retune)

Either way, the three inline `style=` attributes on
`/tools/`, `/simulators/`, `/education/` index pages get dropped to
`class="landing-intro"` (or `class="page-intro"`). Pick one
canonical `max-width` (660 px is the median used by `.page-intro`
today; 700 is the education value). One-PR sweep, two files
modified (`styles.css` + the three landings).

**Resolution (2026-05-24):** new `.landing-intro` class promoted to
`styles.css` (kept `.page-intro` scoped to its existing education-
content-page use; the two contexts have different visual shapes —
landings use `font-weight:300` and a `max-width:660px` cap, content
pages don't). The class carries `.landing-intro a { color:
var(--accent); }` so inline anchors in landing leads no longer need
per-link inline color overrides — three such overrides were dropped
in the same sweep (`tools/` lead's anchor on `Tools`, `education/`
lead's anchors on `Tools` and `reach out`). Inline `style=`
attributes dropped from all three landings.

`max-width:660` is the median between the prior 560 (tools / sims)
and 700 (education) values — picked per this entry's recommendation.
The visual change is small: tools / sims leads gain ~100 px of line
length at wide viewports; education's lead loses ~40 px. Subjectively
all three now read at the same cadence.

### 73. Page-local failure-pill DRY — four tools each define their own warn/error chrome *(addressed 2026-06-09)*

**Where.** `economizer-ratio.html` (`.er-feas`), `air-mixing.html`
(`.am-status`), `coil-sizing.html` (`.cs-status`),
`refrigerant-pt.html` (`.rf-status`). Each `{% block head %}` defines
a near-identical class block: warm-orange `var(--heat)` left border
on `.warn`, red `var(--red)` on `.error`, accent-green
`var(--accent-dim)` background on `.ok`. The comments in
`coil-sizing.html` and `refrigerant-pt.html` literally point at each
other ("same chrome as economizer-ratio's `.er-feas` and air-mixing's
`.am-status`") — the duplication is self-acknowledged.

**Why not addressed in PR #4 (audit-impl).** PR #4 added the shared
`.failure-callout` class (PR #1) to the three tools with no failure
chrome at all (signal-scaling, modbus, bacnet). It chose to leave
the four already-conforming tools alone because their existing pills
carry positive "ok" affirmation states (green background) that
`.failure-callout` doesn't have today — a naïve migration would
degrade UX.

**What it would take to fix.** Grow `.failure-callout` into a
multi-state pill with `.ok` / `.warn` / `.error` modifiers that
match the existing per-page chrome, then sweep the four tools to
remove their page-local definitions and rename the consumer markup
+ `setStatus()` calls. Estimate: ~30 LOC removed per page, ~25 LOC
added to `styles.css`. Net reduction modest; main payoff is one
source of truth for failure-state visuals across the site.

**Revisit trigger.** A fifth tool needs failure-state chrome, OR a
visual refresh of the warn/error palette ships and the duplication
becomes a real maintenance cost.

**Resolution (2026-06-09):** owner chose to DRY now. The four byte-identical
blocks were consolidated into one shared `.status-pill` class in
`styles.css` (base + `.ok` / `.warn` / `.error` modifiers), placed next to
`.failure-callout`. The four tools dropped their page-local definitions and
renamed both markup (`class="…"`) and the `setStatus` / `setFeas` className
literal to `status-pill` (economizer's whole `{% block head %}` went away —
it held nothing else). The shared rule squares its corners via
`border-radius: var(--rail)` rather than the pills' former hardcoded `4px`,
bringing them in line with the documented AX-sharp square-corner principle
(a small intentional visual change, verified via `npm run screenshots`).
CLAUDE.md gained a "Tool-output status chrome" bullet documenting the
`.failure-callout` (static) vs `.status-pill` (stateful) split. A fifth,
near-identical pill surfaced during the sweep — dew-point-calculator's
`.dew-verdict` — but it's a deliberate variant (wider pad, brighter `.ok`
text, an amber `.edge` state in place of `.error`), so it stays page-local;
its stale `.cs-status` comment references were repointed at `.status-pill`,
and the base-class overlap is tracked as #80 below.

### 74. No shared minimum touch-target floor — several interactive families render below 44px on mobile *(addressed 2026-05-29)*

Surfaced during the 2026-05-29 UX walkthrough (`ux-audit.md`, field-tech
persona, findings 3 / 8 / 9).

**Where.** Tap-target sizing is per-component, and several interactive
families independently land under the ~44px comfortable-thumb threshold
when measured at a 390px phone viewport:

- `.units-btn` (`styles.css`, `padding: 0.22rem 0.6rem`) — **34×21px
  (US) / 64×21px (Metric)**. This is the control the field-tech persona
  reaches for most on a US/metric mixed site; 21px tall is the worst
  offender.
- `.site-nav-links a` (`nav.njk` / `styles.css`) — text-only with no
  vertical padding, rendering **26–29px** tall ("Home" 42×29).
- `.tab-btn` (tabbed tools: bacnet, modbus, thermistor, coil-sizing,
  economizer, air-mixing, refrigerant) — **34–35px** tall. These switch
  the tool's whole mode, so a missed tap interrupts the workflow.
- `.quiz-settings-select` + the quiz reset button (all 10 practice
  pages) — **24px** tall.

**Why it matters.** Each new interactive element re-rolls the dice on
hit-area; the four families above are the same root cause surfacing in
four places. The site's *answer* controls are already good (quiz answer
buttons and tool Submit/Copy are full-width ~39px), so the gap is
specifically the chrome-level controls (nav, units, tabs, settings) —
which is where the field tech spends taps. This generalizes
`content-audit.md` #23 (Modbus bit-grid cells below the tap threshold),
which is one instance of the same missing floor.

**What it would take to fix.** Establish a documented minimum-tap-height
convention — e.g. a shared `min-height` / padding floor on the
interactive-element families, or a `@media (hover: none)` block that
pads them — and note it in CLAUDE.md's design-system section so new
controls inherit it. The nav already `flex-wrap`s on phone, so taller
rows cost little layout budget. Lowest-effort / highest-leverage single
change: lift `.units-btn` vertical padding first (the 21px worst case on
the most-tapped control).

**Open question for the owner.** Whether to chase a strict 44px (WCAG
2.5.5 AAA / Apple HIG) or a looser ~40px floor, and whether the nav-link
row should grow on touch only or everywhere. Decision needed before a
sweep.

**Resolution (2026-05-29).** Chose **strict 44px, touch-only**. A single
consolidated `TOUCH-TARGET FLOOR` block now lives in `styles.css` (right
after `FOCUS INDICATORS`), scoped to `@media (hover: none)` so pointer
users keep the compact desktop density. It pads the four chrome-level
families — `.site-nav-links a`, `.units-btn`, `.tab-btn`,
`.quiz-settings-select`, and `.quiz-reset-best` — to `min-height: 44px`
via `display: inline-flex` centering (nav links also get a small
`padding-inline`). Documented as a design-system convention in CLAUDE.md
so new chrome-level interactives inherit the floor rather than re-rolling
hit-area per component. Answer-level controls (`.quiz-choice`,
`.quiz-action`, `.ps-input`, copy/submit) already cleared 44px and are
deliberately not in the block. The related Modbus bit-grid tap target
(`content-audit.md` #23) is a separate page-local widget and stays
tracked there.

### 75. coil-sizing capacity formula is dimensionally incoherent in metric mode *(addressed 2026-06-09)*

Surfaced while implementing ux-audit #12 (printing the entering-air
specific volume in `#cs-cap-formula`), which drew attention to the rest
of the line.

**Where.** `html/tools/coil-sizing.html`, `calcCapacity()` — the worked
`ṁ` formula string (`ṁ = … ÷ v = … lb dry air/h · total = …`).

**What.** In US the line is correct: `ṁ = 2000 CFM × 60 ÷ v = 8665 lb dry
air/h` (CFM × 60 min/h ÷ ft³/lb → lb/h). In **metric** it renders
`ṁ = 3398.02 m³/h × 60 ÷ v = 8665 lb dry air/h`: the airflow is converted
to `m³/h` (already per-hour, so the `× 60` minutes-per-hour factor no
longer applies), the specific volume divisor is `m³/kg`, yet the mass
flow result stays hard-coded in `lb dry air/h` (canonical IP). So the
shown arithmetic doesn't reduce to the shown result, and the unit is
wrong. The downstream `total = ṁ × Δh` value is fine — only the
formula's *display* is incoherent in metric. (The ux #12 change added the
`v` basis but did not touch this; the `8665 lb dry air/h` term and the
`× 60` literal predate it.)

**What it would take to fix.** Either (a) display the mass flow in metric
(`kg dry air/h`) with the correct metric form (`m³/h ÷ (m³/kg)`), dropping
the `× 60`; or (b) keep the formula in canonical IP regardless of toggle
and label it as such. (a) is the consistent-with-the-rest-of-the-page
choice but needs an `airflow`-to-per-hour helper and a mass-flow display
unit that don't exist yet. Low severity — the headline capacity readouts
are all correct and unit-aware; this is the explanatory formula line only.

**Resolution (2026-06-09):** took option (a) — the proper metric form. A
minimal display-only `massFlow` family was added to `html/scripts/units.js`
(`suffix.massFlow` → `lb dry air/h` / `kg dry air/h`, `display.massFlow`
applying a `lb → kg` 0.45359237 factor; no `toCanonical`/`Q` entry since
mass flow is never a user input). `calcCapacity()` now branches the airflow
term on `U.current()`: US keeps `CFM × 60 ÷ v` (per-minute airflow), metric
renders `m³/h ÷ v` (already per-hour, no `× 60`), and the result reads in the
unit-aware `massFlow` suffix instead of a hard-coded `lb dry air/h`. The
canonical `mDot = cfm * 60 / v` (lb/h) is unchanged — only the display
string moved. The metric arithmetic now reduces correctly
(`m³/h ÷ m³/kg = kg/h`, since `1.699011 / 0.062428 = 27.2155 =
60 × 0.453592`). The existing `coil sizing` behavioral spec gained a
metric-toggle assertion (US shows `× 60` + `lb dry air/h`; metric shows
`kg dry air/h` and no `× 60`).

### 76. Privacy-policy storage section heading reads "no cookies" but the section now also covers localStorage *(addressed 2026-06-09)*

Surfaced while bringing the storage disclosure up to date (PR #174):
the body was corrected to enumerate all three functional `localStorage`
uses (units toggle, psych-chart range, per-quiz best score / attempts /
last-played), but the section heading was left untouched.

**Where.** `html/privacy.html`, the `<h2 class="subhead">` for the
storage section — currently `No analytics, no tracking, no cookies set
by me`.

**What.** The heading is accurate about cookies (the site sets none) but
now under-describes its own section: the bulk of the body is about
browser-side `localStorage`, which the title doesn't mention. A reader
skimming headings sees "no cookies" and may not realize the section also
explains the functional storage the site *does* use. Minor editorial /
findability nit, not a correctness or compliance problem — the body is
accurate and the storage is functional, device-only, non-tracking.

**What it would take to fix.** Reword the heading to name both ideas,
e.g. `No tracking; what the site stores on your device` or `No cookies
or tracking — just a few on-device settings`. Pure copy edit; check it
still reads cleanly against the sibling `.subhead` headings and doesn't
overflow on narrow viewports. Editorial call on exact wording.

**Resolution (2026-06-09):** reworded to `No tracking; what the site stores
on your device` (owner's pick of the entry's first suggestion). Names both
ideas — the no-tracking affirmation and the on-device storage the section
actually documents — and is shorter than the prior heading, so no
narrow-viewport overflow risk. Reads cleanly against the sibling
`.subhead`s.

### 79. GitHub Actions pinned to `actions/checkout@v4` / `setup-node@v4` run on deprecated Node 20 *(addressed 2026-06-09)*

*(Renumbered from #77 → #79: PR #199 logged this as #77, colliding with the
already-addressed dark-theme polish #77 and the #78 deferral that references
it. Highest number in use was #78, so this took the next free number.)*

Both workflows — `.github/workflows/test.yml` and the new
`.github/workflows/indexnow.yml` — pin `actions/checkout@v4` and
`actions/setup-node@v4`, whose JS-action runtime is Node 20. GitHub is
retiring Node 20 on the runners: it's **forced to Node 24 on
2026-06-16** and **removed entirely on 2026-09-16**. Every run already
emits an annotation warning to that effect (surfaced on the IndexNow
seed run). Nothing breaks today, but the forced switch could shift
behavior, and the removal is a hard cliff.

**What it would take to fix.** Bump both pins to the v5 majors
(`actions/checkout@v5`, `actions/setup-node@v5`), which ship Node 24
runtimes, in one small `ci:` PR touching the two workflow files. Low
risk — the inputs we use (`fetch-depth`, `node-version`) are unchanged
from v4. Verify CI stays green on the test workflow and that
`indexnow.yml` still resolves its diff range. The stopgap
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env var opts in without
bumping, but the pin bump is the durable fix.

**Resolution (2026-06-09):** bumped both pins to the v5 majors —
`actions/checkout@v4 → @v5` and `actions/setup-node@v4 → @v5` — in
`test.yml` (lines 34 / 48) and `indexnow.yml` (lines 35 / 41), which ship
the Node 24 runtime. The inputs in use (`fetch-depth: 0`, `node-version:
lts/*`, `cache: npm`) are unchanged across v4 → v5, so no other edits. The
fix PR's own `test` workflow run is the verification that checkout /
setup-node@v5 work; `indexnow.yml` only fires on push to `main`, so its YAML
was eyeballed (and can be `workflow_dispatch`-ed once post-merge to confirm
the diff range still resolves).

### 80. `dew-point-calculator`'s `.dew-verdict` overlaps the shared `.status-pill` base *(addressed 2026-06-10)*

Surfaced during the #73 status-pill consolidation (2026-06-09). With the
four-tool pill chrome now centralized as `.status-pill`,
`dew-point-calculator.html`'s page-local `.dew-verdict` pill shares the same
base (mono, `--surface-2` face, 1px `--border`, square corners) but diverges
in three deliberate ways: a slightly wider pad (`0.55rem 0.8rem` vs
`0.5rem 0.75rem`), a brighter `.ok` (adds `color: var(--text-bright)`), and
an amber `.edge` state in place of `.error`/red (the "you're near the dew
point" soft caution). It was out of #73's named four-tool scope, so it was
left page-local in that PR (its stale `.cs-status` comment references were
repointed at `.status-pill`).

**Why it matters.** ~80 % of `.dew-verdict` duplicates `.status-pill`'s base;
a future palette retune to the pill face would silently skip dew-point.

**Priority.** LOW (no live bug; small, deliberate variant).

**Recommended action.** If touched, refactor the markup to
`class="status-pill dew-verdict"` and reduce `.dew-verdict` to just the
deltas (pad override, `.ok` text-bright, the `.edge` state), so the base
stays single-sourced. Otherwise leave as a documented variant.

**Resolution (2026-06-10).** Refactored exactly per the recipe:
markup and the three JS className writes carry
`status-pill dew-verdict <state>`, and the page-local block is down to
three delta rules (pad, `.ok` text-bright, `.edge`); `.warn` now comes
from the base. The styles.css block comment and the CLAUDE.md
status-pill bullet name dew-point as the ride-the-base variant.

### 81. Light-theme accent tokens fail AA as foreground text across practice, chrome, and status pills

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #11 / #12 / #13 (2026-06-10), plus
the dark-theme `--text-dim` polish item from the same audit. Three
verified clusters, one root cause — the light accent tokens were tuned
as border/fill tints, not text inks:

- **#11 (high):** light `--amber` as foreground — quiz primary CTA
  2.42:1, practice-landing GO pills 2.06:1 (worst text contrast on the
  site), quiz "Restart now →" 2.25:1, pid-tuner SPOILER tag 2.42:1.
- **#12 (medium):** light `--accent`/`--teal`/`--blue` small chrome
  text at 3.3–3.9:1 site-wide (eyebrows, back-links, chips, pills,
  toggles, hero readouts); a couple of dark equivalents are themselves
  marginal (ok-pill 4.08, RUN 4.17).
- **#13 (medium):** `.status-pill.warn` light `--heat` 3.11:1 on the
  four status-pill tools — the diagnostic verdict text itself.
- **Polish:** dark `--text-dim` on raised cards sits at 3.97:1 (footer,
  `.ref-table-dense` TH cells, nav-card pills on `--surface-2`).

**Why it matters.** The quiz's primary CTA fails AA by nearly 2× for
any daylight user, and the failures span every accent family — this is
a token-set problem, not per-component slips.

**Priority.** HIGH (the #11 cluster), but held for an owner decision.

**Recommended action.** One coordinated token pass: darken light
`--amber`/`--accent`/`--teal`/`--heat` for foreground use (and/or a
dedicated `--on-amber` ink for filled CTAs), vs splitting text-grade
tokens (`--accent-text`) so the brighter hues stay for borders/fills;
one step brighter dark `--text-dim` (or `--text` for TH cells). Visual
identity is the owner's — awaiting his palette direction before any
sweep. Full measurements in `docs/audits/2026-06-extensive/findings.md` #11–#13.

**Resolution (2026-06-10):** owner picked the one-darker-token-set
direction. Light values: accent #43881c→#3a7a14 (+bright, dim/glow/
soft rgba retuned), blue #1577b8→#11679f (+bright, dim/glow), amber
#c9a14a→#83641f (dim/glow), heat #c8782a→#9c5a14, teal #4a8a8a→
#377070 (dim/glow); the @media print copy updated in lockstep per its
keep-in-sync rule. Dark `--text-dim` #828d9b→#919cab (4.81:1 on
surface-2). No `--on-amber`: white-on-the-darker-amber measures
5.5:1, so the CTA passes with its existing `color: var(--surface)` —
adding an unused token would have violated the no-consumer rule
(#78's lesson). Rendered-page verification of every audited combo:
quiz CTA 2.42→5.52, GO pill 2.06→4.85, eyebrow 3.86→4.64,
status-pill warn 3.11→4.95, active tab 4.40→5.28, dark TH
3.97→4.81.

### 82. Palette ranking: title-prefix bonus outranks section relevance ("superheat" puts the calculator third)

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #16 (2026-06-10). In `search.js`
`rank()`, `title.startsWith(query)` (+100) dominates and
`SECTION_ORDER` applies only as an exact-score tie-break, so lesson and
quiz both outscore the Superheat calculator (125 vs 85) for the query
"superheat".

**Why it matters.** search.js's own stated purpose is "one keystroke
from any page to any tool" — for tool-shaped queries the tool should
plausibly win. But whether tools *should* outrank lessons/quizzes for
tied terms is an editorial ranking decision.

**Priority.** MEDIUM, held for an owner decision.

**Recommended action.** If yes: fold `sectionRank` into the score
itself (e.g. a flat tools/simulators bonus) instead of tie-break-only.
The #17 word-boundary fix (shipped separately) is independent of this.

**Resolution (2026-06-10):** owner said yes — SECTION_BONUS
{tools: 35, simulators: 20} folds into the score (sized to one
title-token's worth so a strong lesson title match still beats a weak
tool keyword match). Verified across seven representative queries:
"superheat"/"psychrometric"/"modbus"/"staging" now lead with the
tool/simulator; "hydronic"/"balancing" (no tool) still lead with the
lesson. Pinned in nav-search.spec.js.

### 83. No tool state survives a reload — preset-class selects could persist under the existing `cf_` convention

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #18 (2026-06-10, verifier:
low-medium). refrigerant-pt forgets the selected refrigerant on every
visit while the psychrometric chart already persists its range preset
(`cf_psy_range`) — so *preset-class enums* (refrigerant, lookup-by
mode, thermistor type) have an established persistence precedent.
Distinct from the parked last-entered-*values* persistence decision
(friction file, controller-commissioner entry) and from URL-state
deep-linking (logged separately in the friction file).

**Why it matters.** A tech who uses refrigerant-pt for R-22 work
re-selects the refrigerant every single visit; the site already knows
how to remember this class of choice.

**Priority.** LOW-MEDIUM, held for an owner decision (Step-3 list).

**Recommended action.** Persist preset-class selects under `cf_*` keys
(`cf_rf_refrigerant`, …) mirroring the `cf_psy_range` pattern; any new
key also gets a privacy.html line (see the privacy sweep rule from
audit #52). Optionally honor a `?r=r22`-style query param — that half
is the friction-file question.

**Resolution (2026-06-10):** owner approved the persistence half;
URL deep-links stay parked in the friction file. `cf_rf_refrigerant`
(refrigerant-pt) and `cf_th_type` (thermistor — both the select and
identify-mode's pick-a-candidate path) ship with the cf_psy_range
strict-validate-on-read shape; garbage in storage falls back to the
markup default. privacy.html lists the new keys per the #52 rule.
Smoke test pins reload-persistence + the garbage fallback.

### 84. Static assets ship `max-age=0, must-revalidate` and nothing is version-busted

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #32 (2026-06-10). Production
serves `/styles.css`, all `/scripts/*`, and `/assets/*` with the
Workers Assets default `Cache-Control: max-age=0, must-revalidate` —
repeat visitors pay ~7–8 conditional revalidations per navigation
(~1 extra RTT on high-latency links, stacking with the documented
`.html`→clean 307 hop).

**Why it matters.** The site's own persona is a tech on flaky
mech-room LTE; revalidation chatter is exactly what hurts there.

**Priority.** MEDIUM, held for an owner decision — fully specified but
it changes production delivery behavior.

**Recommended action.** In `src/worker.js`, set
`max-age=31536000, immutable` on `/scripts/*`, `/styles.css`,
`/assets/*` after `env.ASSETS.fetch()`, busted with
`?v={{ site.version }}` in `head.njk`/`page.njk` (the version token
already exists in `html/_data/site.js`). HTML keeps the revalidate
default. ~15 lines.

**Resolution (2026-06-10):** shipped with one safety refinement over
the sketch: immutable applies only when the request actually carries
`?v=` (plus always for /assets/fonts/, which are immutable by name) —
an unversioned reference can never get stuck stale, it just keeps the
revalidate default. The version bump is now load-bearing for busting
(owner accepted, no CI guard; documented in CLAUDE.md). Worker tests
pin the three header shapes; live headers verified post-deploy.
*Deploy addendum:* the headers only took effect after TWO wrangler
follow-ups — assets are served before the Worker by default, so
`run_worker_first` was required; and the glob-list form of it silently
stopped non-matching paths (including `/api/contact` and the legacy
redirects) from reaching the Worker at all — caught live within
minutes and fixed with `run_worker_first: true`. If those globs ever
look tempting again: they change miss-path semantics, not just
ordering.

### 85. First paint is render-blocked by third-party Google Fonts CSS

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #33 (2026-06-10). The
render-blocking fonts.googleapis.com stylesheet delays FCP one-for-one
when slow (measured 624 ms → 3,352 ms with a 3 s delay), and the fonts
are the only non-essential third-party origin site-wide (visitor
IP+UA to Google on every page).

**Why it matters.** Performance *and* privacy posture in one change;
both families are OFL-licensed so self-hosting is clean.

**Priority.** MEDIUM, held for an owner decision.

**Recommended action.** Self-host the latin woff2 subset under
`/assets/fonts/` with `@font-face` + `font-display: swap`; Turnstile
on contact.html becomes the sole external origin. Decide whether to
drop the Overpass 300 weight — it's used by exactly two rules (home
hero + `.landing-intro`), both restyleable.

**Resolution (2026-06-10):** owner approved self-hosting with the 300
weight KEPT. Five latin woff2 files (~101 KB) under /assets/fonts/ —
Overpass ships as one variable file covering 300–700, IBM Plex Mono
as four static instances; Google's latin unicode-range kept so glyph
fallback (Δ/≈/→ were never in any served subset) is pixel-identical.
The Google links left head.njk; the privacy policy's Google Fonts
section is gone per the owner's instruction. LICENSE.txt accompanies
the files; they're immutable-by-name for the #84 caching rule.

### 86. `canonical`/`og:url` point through the `.html`→clean 307

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (redirected item, 2026-06-10).
The `.html`-extension convention *including* the Worker redirect is
documented and deliberate (CLAUDE.md); the new sliver is that
`canonical` and `og:url` carry the `.html` form, so consumers of those
URLs land on a 307 hop to the clean form.

**Why it matters.** Cheap SEO/share hygiene — but the `.html` canonical
form is itself a documented convention, so aligning canonicals with
the clean form (or accepting and documenting the hop) is a convention
decision, not a bug fix.

**Priority.** LOW, held for an owner decision.

**Recommended action.** Either switch `canonical` frontmatter +
`og:url` to the clean URL form site-wide (one sweep + sitemap/PAGES
fallout), or record in CLAUDE.md that the 307-through is accepted.

**Resolution (2026-06-10):** owner accepted the 307-through; recorded
in CLAUDE.md's `.html`-extension convention bullet with the revisit
trigger (a Search Console canonical-confusion signal).

### 87. smoke.spec.js serializes ~154 s of the suite's ~196 test-seconds into one worker

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (tests polish, 2026-06-10).
Playwright parallelizes across files by default; the monolithic
smoke spec caps suite wall time. The audit's empirical isolation probe
verified contexts are per-test, so `fullyParallel: true` (or splitting
the behavioral tests into their own spec) is safe and would roughly
halve CI wall time.

**Why it matters.** Every PR pays the serialized wall time; the
isolation worry that justified the shape is disproven.

**Priority.** LOW-MEDIUM, held for an owner decision — CLAUDE.md says
don't restructure test scaffolding without being asked, so this asks.

**Recommended action.** Owner picks: `fullyParallel: true` in
`playwright.config.js` (one line, no file moves) vs splitting
smoke.spec.js into per-area specs (better failure locality). Either
way update the CLAUDE.md test-list text.

**Resolution (2026-06-10):** owner picked `fullyParallel: true` —
suite wall time dropped 2.8m → 1.7m. Enabling it surfaced a real bug
behind one of the two known full-suite flakes: flow-engine's gutter
teardown only cleared `flow-active` from svgs it removed *flow pools*
from, so a gutter *pulse* firing during a wide-viewport moment left a
pulse-only motif flagged forever (ensureParticleLayer flags on pulse
too) — fixed in the same PR. The other intermittent (modbus quiz
reset-best under full-suite load, ~4 sightings pre-parallelism) has
not reproduced under the new scheduling across 2 full runs + 12
repeats; watch, and root-cause if it returns.

### 88. Tools nav dropdown sorts by slug while 13 of 14 labels read alphabetically

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (power-user polish, 2026-06-10).
The dropdown order comes from the deliberate-for-diff-stability
canonical-URL sort in `.eleventy.js` `navSection`; "Pump & Fan
Affinity Laws" (slug `affinity-laws`) sits first, training an
alphabetical scan that then fails at P. Sorting by `cleanTitle` would
be equally diff-stable.

**Why it matters.** Minor scan-friction in the highest-traffic menu;
zero-risk fix, but the current sort is documented deliberate, so the
swap is a decision, not drift.

**Priority.** LOW, held for an owner decision.

**Recommended action.** If approved: sort the three nav collections by
`cleanTitle` in `.eleventy.js` and note the convention change where
the slug-sort was recorded.

**Resolution (2026-06-10):** owner approved — `navSection` sorts by
`cleanTitle` (equally diff-stable), the comment records the why, and a
nav-menu.spec test pins the title order so it can't regress.

### 89. A fast 5/5 short quiz run silently overwrites a 10/10 full-run best

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (student polish, 2026-06-10).
`quiz-engine.js` `finish()` compares score ratio then elapsed time
with no regard for question-count, so a shorter run can replace a
longer run's best and celebrate "new best".

**Why it matters.** The best-score record is the engine's only
progress artifact; letting a 5-question run displace a 10-question
best makes it untrustworthy.

**Priority.** LOW, held for an owner decision (semantics choice).

**Recommended action.** Owner picks: track best per question-count
(`cf_quiz_<slug>_best_<n>`), or keep one key but never let a shorter
total replace a longer one (ties allowed). Coordinate with the
results-card/badge ideas in the friction file's practice-continuity
entry.

**Resolution (2026-06-10):** owner picked shorter-can't-replace-longer.
finish() now takes the record only from an equal-or-longer run with a
better ratio — or the same ratio at a longer total (10/10 upgrades
5/5), or same ratio + total but faster. A worse ratio never wins
regardless of length; the already-persisted best_total carries the
comparison. Pinned by a smoke test (perfect 5-run vs seeded 10/10).

### 90. Canvas resize handlers redraw synchronously per resize event *(addressed 2026-06-10)*

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (performance polish, 2026-06-10).
psychrometric-chart, staging-sequencer, and pid-basics (×3 canvases)
redraw full canvases synchronously in raw `resize` handlers; pid-tuner
has the rAF-coalesce pattern half-applied.

**Why it matters.** Continuous-resize jank on desktop and orientation
changes on mobile; the fix is a known ~4-line rAF coalescer per page,
and one page already models it.

**Priority.** LOW (no user report; measured cost is resize-time only).

**Recommended action.** Apply the rAF coalescer pattern to the five
handlers in a small `perf:` sweep; finish pid-tuner's half-applied
one. No design input needed — parked here only because the audit
sweep batches were already full.

**Resolution (2026-06-10).** The four resize listeners
(psychrometric-chart; pid-basics' one listener covering its three
mini-canvases; staging-sequencer; pid-tuner) now coalesce through a
page-local `resizeRaf` guard — at most one redraw per frame, the
trailing event always wins. pid-tuner's half-applied case finished:
the playhead already rode rAF; now the chart redraw + overlay resize
do too. themechange listeners left synchronous (a discrete click, not
an event storm).

### 91. PID tuner chart y-axis is unconverted and unlabeled in metric

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (metric polish, 2026-06-10;
downgraded from medium in audit verification). The LCD-stays-canonical
decision is documented deliberate, but the chart's y-axis was never
covered by it: in metric the same physical value renders as `0.78` on
the chart and `137 Pa` in the metrics row with nothing tying them
together.

**Why it matters.** A metric user cross-reading chart and metrics row
sees two unrelated-looking numbers for one value.

**Priority.** LOW-MEDIUM. Mechanically fixable via the existing
`Units.display` helpers, but coordinate with the broader
which-surfaces-convert decision (friction file, home-hero-units entry)
so the canonical-vs-converted line lands in one place.

**Recommended action.** Convert/label the y-axis via `Units.display`
once the owner settles the hero/canonical-surfaces question.

**Resolution (2026-06-10):** owner settled it maximally — the hero
converts everything (including its device LCDs), and the chart axis
follows: drawPidChart takes opts.procKey, converts tick labels via
Units.display (temp or staticPressure) and draws a unit tag inside
the plot's top-left (mirroring the SP tag); the tuner redraws on
unitschange. Verified by metric screenshots of both axis flavors.

### 92. Nav `category` lives in two unlinked sources *(open — 2026-06-14)*

The cascading nav dropdowns group pages by a `category` frontmatter key
(read by the `navGroups` filter into `NAV_CATEGORIES`). The section
landing pages independently tag the same pages via the `navCard()`
`category` argument (for the filter chips). The two are **separate
sources of truth** with no build-time tie: recategorizing a tool on the
landing without updating its frontmatter (or vice-versa) silently drifts
the chip and the nav into disagreement. The `navCategoryGuard` only
checks the frontmatter against `NAV_CATEGORIES`, not against the
landing. Unifying would mean data-driving the hand-written landing
`navCard()` calls (read `category` from the page collection instead of
hardcoding) — a bigger refactor than the cascading feature warranted,
so deferred. Cheapest interim guard if it bites: a build collection that
parses each landing's `navCard()` calls and asserts each `category`
equals the target page's frontmatter. Note: education is the one place
they legitimately differ — the landing uses granular keys (drives,
control, …) under the `fundamentals` chip, while the nav frontmatter
uses the chip-level `fundamentals`.

<!--
2026-06-15 backend/mechanical codebase audit — multi-agent fan-out across 13 code
surfaces (find → adversarial-verify each finding → synthesize), deduped against the
existing log. 38 confirmed findings (#93–#130) + 3 low-confidence watch items
(#131–#133). Severity: 0 high / 4 medium / 34 low. Report-only — triage before
acting; mark each *(addressed YYYY-MM-DD)* in place per "How this file is used".
The 4 mediums: #93 (educationSequence drift), #94 (worker security test gap),
#95 (wiring-engine no engine spec), #96 (flow-engine 1240px re-init).
-->

### 93. educationSequence.js drifted from the visible 18-card education grid — controller-wiring and bacnet-mstp omitted from the rel=prev/next chain *(addressed 2026-06-16)*

*Severity: medium · Category: cross-ref · Confidence: high* — `html/_data/educationSequence.js:17-34 (order array); consumed at html/_includes/head.njk:30-32`

The order array lists 16 lessons but the education/index.html card grid renders 18, in an order where controller-wiring is card #2 (between pid-basics and hydronic-loops) and bacnet-mstp is card #18/last (after bacnet-networking). Both omitted pages are real, full lessons with nav: education (controller-wiring 406 lines, bacnet-mstp 260 lines). head.njk is the sole consumer: educationSequence[page.url] is undefined for the two omitted pages, so they emit zero rel=prev/rel=next links; and the surviving chain skips them (pid-basics' rel=next points to hydronic-loops, bacnet-networking's rel=next is null as if it were the last lesson). The file's own header declares grid order == sequence order as a hard invariant that 'can't drift silently' — this is exactly that drift, and no build guard catches it (navCategoryGuard validates category frontmatter, not sequence membership). Verified against built _site/ output.

**Impact.** Two lessons ship with no rel=prev/next (degraded crawler series-understanding + assistive-tech link-relation nav, the feature's stated purpose), and the machine-readable lesson order a crawler follows diverges from the order a sighted user clicks through on the index grid.

**Suggested fix.** Insert '/education/controller-wiring.html' after pid-basics and '/education/bacnet-mstp.html' after bacnet-networking in the order array so it matches the 18-card landing exactly. If either omission is deliberate, document it in the header and reconcile the landing order. Longer term, derive the sequence from the navEducation collection or add a build-time guard (mirroring navCategoryGuard) that fails when any nav: education page is absent from the sequence, so it can't drift again.

*Merged from: data-modules + cross-page-sweep surfaces (same defect, identical root cause)*

**Resolution (2026-06-16):** inserted `/education/controller-wiring.html` (after pid-basics) and `/education/bacnet-mstp.html` (last) into the `order` array in `html/_data/educationSequence.js`, so all 18 lessons now carry rel=prev/next and the chain matches the grid click-through order (verified in built `_site/`: controller-wiring and bacnet-mstp both emit the links; pid-basics→controller-wiring and bacnet-networking→bacnet-mstp now chain through). Added an `educationSequenceGuard` collection to `.eleventy.js` (mirrors `navCategoryGuard`) that fails the build if any `nav: education` page is absent from `order` or `order` lists an unclaimed URL — negative-tested (dropping a lesson fails the build with the offending path). Membership only; lockstep grid ORDER stays a by-hand discipline.

### 94. Worker tests cover none of the security-critical contact paths (Turnstile fail-closed, hostname pin, validation, Resend) *(open — 2026-06-15)*

*Severity: medium · Category: test-gap · Confidence: high* — `tests/worker.spec.js (whole file); untested branches in src/worker.js handleContact (Turnstile verify ~176/186, hostname pin, fetchWithTimeout catch, EMAIL_RE/413, Resend 502)`

The spec exercises the redirect-drift guard, 301, 405+Allow, cross-origin 403, honeypot 200, absent-Content-Length 411, and the asset cache matrix — but every security-load-bearing branch of handleContact is untested: the Turnstile fail-closed logic (verify.success !== true for {}, {success:null}, {success:"true"}, non-2xx), the hostname pin verify.hostname !== "controlsfreak.dev" (audit-2026-06 #34, the anti-token-replay defense), the fetchWithTimeout timeout/catch paths, EMAIL_RE/length-cap 400s, the 413 oversize path, and the Resend non-ok/catch 502s. The honeypot test short-circuits before those upstreams precisely because the env stub never stubs Turnstile/Resend (reaching them would throw). worker.spec.js already imports the ES-module worker node-side, and the worker calls bare fetch() (=globalThis.fetch), so the upstreams are stubbable.

**Impact.** The Worker's anti-abuse and validation logic — its only real attack surface — has zero automated coverage. A fail-open regression (e.g. relaxing the Turnstile gate to !== false, the exact mistake the code comment warns against, or dropping the hostname pin) would ship green.

**Suggested fix.** Stub globalThis.fetch to return controlled siteverify/Resend responses: assert fail-closed for {}/{success:null}/{success:"true"}/non-2xx and for hostname:"localhost"; assert a valid {success:true,hostname:"controlsfreak.dev"} + ok Resend yields 200; assert Resend non-2xx and a thrown fetch each give 502; add a 400 for a bad EMAIL_RE input and a 413 for an oversized Content-Length.

### 95. wiring-engine.js has no engine-direct spec — most fault-classification branches are untested *(open — 2026-06-15)*

*Severity: medium · Category: test-gap · Confidence: high* — `tests/ (no wiring-engine.spec.js); html/scripts/wiring-engine.js:198 (Wiring.evaluate), :186 (makeUF), fault branches ~245-490`

wiring-engine.js is a 542-line pure module exposing Wiring.evaluate(panel, state) -> {power, points, faults, cues} with a union-find net solver and a large fault tree: dead short, transformer phase-fight, reversed polarity, open common, no-hot/no-power, VA-budget overload, thermistor short/open + wrong-mode, unpowered 0-10V transmitter, dead 4-20mA loop, BI open, unpowered/floating actuator, BO no-return/no-power. It has module.exports = Wiring and is the exact vm-loadable shape already covered engine-direct for fbe/pid/psychro/units engines — but has NO dedicated spec. Its only coverage is two UI preset paths in smoke.spec.js:188-203 (ahu clean, broken-fuse dead short). The reversed/open-common/overload branches and the union-find merge logic are reachable nowhere in the suite, and the engine fails soft (no console error), so a logic regression produces no signal.

**Impact.** The site's most complex untested engine. A controls-fault logic regression (wrong net merge, fault-class mislabel, fuse/overload threshold drift) would not be caught by CI — the engine fails soft and the only smoke checks (short + clean) stay green.

**Suggested fix.** Add tests/wiring-engine.spec.js mirroring fbe-engine.spec.js (vm.runInNewContext(src + '\n; Wiring', {})): build minimal panels and assert power flags + fault ids per class — clean landing, dead short, reversed 24V/COM, open common, VA-budget overload — plus a union-find case where two terminals must (or must not) share a net.

*Merged from: wiring-engine + tests surfaces (same missing spec; the per-fault-mode list and the union-find/engine-API framing combine into one entry)*

### 96. Crossing the 1240px gutter breakpoint re-inits the whole engine, rebuilding in-content flow pools and dropping setPathColor recolors *(open — 2026-06-15)*

*Severity: medium · Category: bug · Confidence: high* — `html/scripts/flow-engine.js:241-247 (onGutterChange → init) feeding 249-252 (rebuilds ALL [data-flow], not just gutter)`

The gutterMql change handler calls full init() when the viewport grows past 1240px. init() re-runs buildPoolForEl on EVERY [data-flow] element document-wide, not just gutter ones. For an already-pooled in-content diagram, buildPoolForEl tears down its circles and recreates them with the engine DEFAULT fill (SUPPLY_FILL/RETURN_FILL/CURRENT_FILL). Any setPathColor() a page applied is wiped on a resize across the breakpoint and never re-applied (the page recolor runs once on DOMContentLoaded — see education/refrigerant-cycle-basics.html, which recolors rc-discharge/rc-liquid to var(--heat)). The rebuild also reseeds all particle offsets to i*step, so every in-content animated diagram visibly jumps. The header/docs sell init() as an idempotent no-op refresh; here it's a destructive full rebuild triggered by a passive resize.

**Impact.** Visible regression on a resize crossing 1240px: recolored particle streams (refrigerant-cycle-basics, any future setPathColor user) revert to default colors and all in-content flow animations snap to their seed positions.

**Suggested fix.** Scope the gutter-grow rebuild to gutter elements only — have onGutterChange call a buildGutterPools() that runs buildPoolForEl/buildPulsePathFor only on .schematic-bg [data-flow]/[data-pulse] elements, mirroring teardownGutterPools' scoping, so in-content pools and their setPathColor state survive the breakpoint.

### 97. fbe-engine: Infinity produced by a block is coerced to 0 at the next block's input, flipping downstream comparator verdicts *(open — 2026-06-15)*

*Severity: low · Category: correctness · Confidence: high* — `html/scripts/fbe-engine.js:60 (asNum), :161 (mul), :169-172 (div guards only b===0), :448-449 (tick stores raw res.out); ref-note/fmt in html/simulators/function-block-editor.html:482-486 and :886`

asNum() rejects non-finite values and returns 0, but it is applied only to a block's inputs — evaluate() can still store a non-finite output. mul of two large constants (1e300*1e300), or div with a tiny non-zero divisor (the b===0 guard does not catch tiny-but-nonzero b), yields Infinity in b.out. Downstream that Infinity is read as the consumer's input and asNum silently turns it into 0. Verified: const(1e300)→mul(self)→gt vs const(5) gives gt=false (0>5), the mathematical opposite of true. This contradicts the DIVIDE comment and the page ref-note ('a downstream comparator stays sane instead of reading Infinity or NaN') — the guarantee holds only for an exact-zero divisor, not any overflow path. The source block's value strip shows '—' (fmt guards isFinite) while the comparator silently reads 0 — a display/logic split.

**Impact.** A graph that overflows to Infinity (reachable: the inspector accepts any finite number via parseFloat, so a user can set a constant to 1e300) makes a downstream comparator report the wrong boolean while the source shows '—'. Astronomically unlikely values, but a genuine logic inconsistency against a documented promise.

**Suggested fix.** Apply finite-coercion at the output boundary too: in tick() after `b.out = res.out || {}`, sanitize numeric outputs so a stored Infinity/NaN becomes 0, matching the asNum input contract and the ref-note's claim.

### 98. fbe-engine: PID derivative divides by dt with no guard — dt=0 yields NaN through the output *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/fbe-engine.js:316 (`const dPv = s.init ? (pv - s.prevPv) / dt : 0;`)`

The PID block computes the derivative as (pv - s.prevPv) / dt with no zero/finite guard on dt. A second tick with dt=0 produces OUT=NaN (NaN survives clamp(NaN,0,100)). The live page hard-codes DT=0.1 so this is dormant in the tool, but fbe-engine.js is documented as a reusable pure API (FBE.tick(graph, dt)) consumed like pid-engine/psychro-engine, and the project's own convention is to guard every numeric path with isFinite. A NaN OUT then propagates as 0 into any consuming block (via asNum) while the readout shows '—' — a silent inconsistency, and the div block already guards /0 with the same intent.

**Impact.** Any future caller (paused/single-frame integrator, unit test, Capacitor wrapper) that ticks with dt=0 gets NaN out of every PID block. Low because the only shipped caller hard-codes 0.1.

**Suggested fix.** Guard the divide: `const dPv = (s.init && dt > 0) ? (pv - s.prevPv) / dt : 0;` — matching the div block's own /0 defense.

### 99. wiring-engine: engine dereferences DEVICES[d.type].terminals with no guard — a malformed panel crashes the public Wiring.evaluate API *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/wiring-engine.js:316-317 (deviceOn)`

deviceOn() does `const def = DEVICES[d.type]; def.terminals.forEach(...)` with no check that def exists, and is called unconditionally from the BI/AO/BO passes in evaluate(). wiring-engine.js documents itself as a pure public solver exposed as window.Wiring.evaluate accepting an arbitrary {devices, wires} panel. A device whose type is not a DEVICES key throws TypeError: Cannot read properties of undefined (reading 'terminals'), aborting the whole evaluation (reproduced in Node). createDevice() correctly returns null for an unknown type, so the guard exists in one entry point and not the other.

**Impact.** Not reachable from controller-wiring.html today (the page only pushes createDevice() results and validated presets). But the engine is a documented standalone API; any future consumer or a corrupted persisted panel (were tool-state persistence added per #83) that passes an unknown device type gets a hard crash instead of a graceful skip.

**Suggested fix.** Filter devices to known types at the top of evaluate() (`const devices = (panel.devices||[]).filter(d => DEVICES[d.type])`) or guard each deref with `if (!def) return;` — cheap defense-in-depth consistent with createDevice()'s own null return.

### 100. wiring-engine: clampPct lets NaN through — typeof check passes for NaN where isFinite would not *(open — 2026-06-15)*

*Severity: low · Category: correctness · Confidence: medium* — `html/scripts/wiring-engine.js:522`

`const clampPct = (x) => Math.max(0, Math.min(100, Math.round(typeof x === 'number' ? x : 0)));` rejects non-numbers but not NaN: typeof NaN === 'number' is true, so clampPct(NaN) returns NaN, which an AO point renders as 'NaN%'. CLAUDE.md's JS-patterns section explicitly calls for !isFinite(x) over a type/NaN-prone check on numeric inputs. The page only feeds AO from +sld.value of a range input (always finite), so this is unreachable from the current UI, but evaluate() is a public API and the helper's intent is clearly to coerce bad input to 0.

**Impact.** No live failure from the page, but a malformed state.ao passed to public Wiring.evaluate would surface as a literal 'NaN%' readout instead of muting to 0%, against the site's validate-and-mute convention.

**Suggested fix.** Use isFinite: `const clampPct = (x) => { const n = Math.round(x); return isFinite(n) ? Math.max(0, Math.min(100, n)) : 0; };`.

### 101. pid-chart: formatPidDelta emits a misleading '-0.0' for small-negative deltas that round to zero *(open — 2026-06-15)*

*Severity: low · Category: bug · Confidence: high* — `html/scripts/pid-chart.js:217-223 (formatPidDelta, sign at line 221)`

formatPidDelta computes `const sign = display > 0 ? '+' : ''` then `${sign}${display.toFixed(dec)}`. When the canonical delta is a small negative that rounds to zero at the formatter's precision, display < 0 so no '+' is prepended but display.toFixed(1) still renders '-0.0'. Reproduced end-to-end: simulatePid(PID_PROC.med, 1, 2, 0) yields ssErr≈-0.0003, and an ordinary Kc/rep slider grid on the med loop lands ssErr in (-0.05, 0) in 35/96 cells, each printing '-0.0 °F'. pid-basics flips the sign (-sim.ssErr) and hits the same case from the other side. Both PID surfaces (simulators/pid-tuner.html and education/pid-basics.html) are affected; the metric path too, since the delta is a scalar conversion.

**Impact.** Both PID surfaces can display a negative-zero steady-state error ('-0.0 °F' / '-0.0 in. w.c.'), which reads as a real signed offset and is internally contradictory (a leading minus on a zero magnitude). Reachable with normal slider positions.

**Suggested fix.** Normalize negative zero before formatting: round to display precision first, then choose the sign treating a rounded 0 as unsigned — `const rounded = +display.toFixed(dec); const sign = rounded > 0 ? '+' : ''; return `${sign}${rounded.toFixed(dec)} ${pidUnit(procKey)}`;`.

### 102. pid-chart: drawPidChart dereferences getContext('2d') without a null guard while guarding everything else *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/pid-chart.js:59-60`

drawPidChart guards !canvas || !sim, zero-size canvas, and degenerate plot area, but line 59 does `const ctx = canvas.getContext('2d');` and line 60 immediately calls ctx.setTransform(...) with no null check. getContext('2d') returns null if a different context type was already acquired or under OOM/disabled-canvas conditions, which would throw mid-draw and abort the calling page IIFE. The same unguarded getContext('2d')+setTransform pattern exists in staging-sequencer.html and psychrometric-chart.html — it's effectively the site-wide convention for these canvases — so this is the one unguarded deref in an otherwise defensive routine, low impact in practice (2d-only freshly-created canvases).

**Impact.** Low — these canvases are 2d-only and fresh — but a throw here propagates out of runPidSim/runMini and breaks the page's slider wiring for the rest of the session.

**Suggested fix.** Add `if (!ctx) return;` immediately after `const ctx = canvas.getContext('2d');`, matching the file's existing early-return guard style.

### 103. psychro-engine: dewPointFromVapPress silently caps at 250 °F for vapor pressures above satPress(250) *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/psychro-engine.js:100-108`

dewPointFromVapPress bisects on the fixed bracket [-148, 250]. For any pw > satPress(250) ≈ 29.85 psia the loop never moves hi down and returns ~250 with no out-of-range signal (verified dewPointFromVapPress(40) === 250). The function guards the low end (pw<=0 → -Infinity) but not the saturated upper end. At/below standard sea-level pressure this is unreachable (pw can't exceed P_STD = 14.696, dewPoint(14.696) = 211.95 < 250) and pressFromAltitude only lowers P, so the psych tools are safe today. But the function is a flat top-level primitive the header advertises for direct reuse (coil sizing, economizer), which could pass a higher-pressure pw.

**Impact.** Defensive only for current consumers. The risk is a future high-pressure caller getting a silently-clamped 250 °F dew point that looks plausible rather than an out-of-range signal.

**Suggested fix.** Widen the upper bound to cover the documented pressure range, or detect the saturated bracket: after the loop, if satPress(hi) < pw return Infinity (mirroring the pw<=0 → -Infinity convention) so callers' existing isFinite guards catch it.

### 104. units.js: Units.convert / toCanonical silently no-op for massFlow (no Q entry, no toCanonical entry) *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/units.js:146-160 (Q table) and 174-188 (toCanonical) vs 100-104,123,141 (massFlow defined for suffix/display only)`

massFlow is intentionally display-only (suffix + display) per the inline comment — coil-sizing derives it as a readout — so there is no Q.massFlow and no toCanonical.massFlow. The trap is the failure mode: convert(value, from, to, 'massFlow') hits `if (!q) return value;` and returns the value unchanged with no warning, and toCanonical.massFlow is undefined (calling it would throw). A future page that wires a mass-flow field through convert() (the standard input-rewrite pattern) would silently leave the value unconverted on a units toggle — a wrong-number bug with no console signal. ui.js warns on missing targets elsewhere, so convert()'s silent no-op is inconsistent with the codebase idiom. Note: units-engine.spec.js asserts massFlow is the one display-only quantity, so a naive future addition would trip the test.

**Impact.** No current bug (massFlow is only used via suffix/display in coil-sizing). Latent silent-wrong-result risk if mass flow ever becomes a convertible input and the author follows the existing convert() rewrite pattern.

**Suggested fix.** Either add Q.massFlow + toCanonical.massFlow for symmetry, or make convert()'s unknown-quantity branch `console.warn('Units.convert: no conversion for "'+quantity+'"')` so a missing quantity surfaces instead of returning the raw value. The warn is the cheaper guard and matches ui.js's warn-on-missing patterns.

### 105. copyText double-click race can leave the copy button stuck on 'copied!' *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/ui.js:92-103`

The only re-entrancy guard is `if (!text || btn.classList.contains('copied')) return;` checked synchronously at entry, but the `copied` class addition and `orig = btn.textContent` capture happen inside the navigator.clipboard.writeText(...).then(...) callback (after a microtask boundary). A second click landing after click 1 but before its promise resolves passes the guard and queues a second writeText. When the two .then() callbacks run in order, the second captures orig='copied!' (set by the first); its ~1800ms timeout then reverts textContent to 'copied!', leaving the button permanently labeled 'copied!' until the next click. All copy buttons site-wide route through this single function.

**Impact.** On a fast double-click of any copy button (Copy IP, Copy readouts), the label can get stuck on 'copied!' and never revert. Cosmetic but sticky; recovery needs another successful copy after the class clears. Low — needs a rapid double-click.

**Suggested fix.** Add the `copied` class and capture `orig` synchronously right after the guard, restore only inside the timeout (so the entry guard sees `copied` immediately and the second click is a clean no-op), and revert the class in a .catch() so a clipboard rejection doesn't latch the button.

### 106. fullscreen-toggle: ESC-exit hardcodes '.tool-card.is-fullscreen' while the opt-in target selector is configurable *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/fullscreen-toggle.js:62-65 (exitActive) vs 36-39 (targetFor)`

targetFor() resolves the fullscreen target from the button's data-fullscreen-target selector (any selector) and setState toggles has-fullscreen-tool on <body> based on that arbitrary target, but exitActive() — the ESC exit path — queries the fixed selector .tool-card.is-fullscreen. If a future page opts in with a non-.tool-card target (which targetFor supports and the header frames as selector-driven), ESC finds nothing to exit: is-fullscreen stays on the element and has-fullscreen-tool stays on <body>, locking the page in fullscreen with no keyboard exit. Both current opt-ins (psychrometric-chart, function-block-editor) use .tool-card, so it is latent. Note the CSS also hard-codes .tool-card.is-fullscreen, so the JS targetFor() over-promises flexibility the CSS doesn't honor.

**Impact.** Latent. No live page affected. Becomes a real ESC-doesn't-work / stuck-fullscreen bug only if someone adds a non-tool-card fullscreen target.

**Suggested fix.** Make exitActive() exit whatever is actually fullscreen — `document.querySelectorAll('.is-fullscreen').forEach(t => setState(t, false));` — or track the active target in a module variable set by setState. Alternatively assert/document that data-fullscreen-target must be .tool-card.

### 107. controller-wiring: spark cue re-fires on every refresh() — no edge-detection, unlike the blown-fuse cue *(open — 2026-06-15)*

*Severity: low · Category: bug · Confidence: high* — `html/simulators/controller-wiring.html:905-908`

The comment reads 'cues — fire only on a fresh failure', but only the blown-fuse cue is edge-detected (if (blown && !lastBlown) fireBlownFuse). The spark cue fires on EVERY refresh() with no lastSpark analog. In the engine cues.spark is populated only in the reversed power branch (wiring-engine.js:280). refresh() runs on every control change AND on the 2.5s cosmetic-drift interval (when a therm10k drifts). So a panel left in a reversed-power state that also contains a thermistor re-sparks at the 24V~ terminal every 2.5s indefinitely — a flashing artifact on a static circuit. reduceMotion suppresses it.

**Impact.** A reversed-power panel that happens to include a thermistor produces an endless repeating spark animation with no user action — visually noisy and contradicts the stated 'fire only on a fresh failure' intent. Minor; needs the reversed state to persist with a thermistor present.

**Suggested fix.** Edge-detect the spark cue like the fuse: track the previous spark set (a serialized key of res.cues.spark) and only fireSpark for terminals newly in the set this evaluation, or only fire sparks on user-initiated refreshes, not the cosmetic tick.

### 108. controller-wiring: device drag y-clamp reserves a fixed 40px height for variable-height device cards *(open — 2026-06-15)*

*Severity: low · Category: bug · Confidence: medium* — `html/simulators/controller-wiring.html:719-720`

The drag move handler clamps with `d.y = clamp(oy + dy, 0, NUM.height - 40)` and `d.x = clamp(..., 0, NUM.width - 146)`. The 146 reasonably reserves the 144px card width, but the 40 is a fixed reservation that doesn't match real card heights — a card grows with its terminal count + caption (the 0-10V actuator has 4 terminal rows + caption, rendering ~136px). So a tall card can be dragged until only its top edge is at y=620, leaving most of it below the 660px canvas-inner. The x-axis is clamped to actual card width; the y-axis is not.

**Impact.** Cosmetic only — .cw-canvas has overflow:auto so an overhanging card is reachable by scrolling and the wire layer follows. But the clamp is asymmetric (width-aware, height-blind), so tall devices can be dragged largely out of the visible inner area in a way short ones cannot.

**Suggested fix.** Measure the card height once (el.offsetHeight) at drag start and clamp y to NUM.height - height, mirroring the width clamp; or reserve a realistic per-type height.

### 109. controller-wiring: cosmetic-drift setInterval not gated to desktop and never pauses on tab-hide (backgrounded-tab idle work) *(open — 2026-06-15)*

*Severity: low · Category: perf · Confidence: high* — `html/simulators/controller-wiring.html:1118-1127`

The cosmetic-drift window.setInterval(...,2500) is gated only by !reduceMotion, with no clearInterval, no visibilitychange pause, and no matchMedia('(min-width:1000px)') JS gate. Its function-block-editor sibling — gated by the same commit — does all three (desktopMQ gate, visibilitychange stop, MQ-change re-arm). The mobile case is a documented non-issue (the bench is hidden, panel.devices stays empty, so refresh() never runs — accepted in site-ideas-and-friction.md). The genuinely-unhandled, in-scope case is the BACKGROUNDED DESKTOP tab: with a therm10k placed (bench visible), backgrounding the tab keeps a full evaluate()+drawWires() pass running every 2.5s — the idle work the FBE avoids via its visibilitychange handler.

**Impact.** On a desktop tab with a thermistor present, backgrounding the tab keeps a full evaluate()/drawWires() pass running every 2.5s — wasted wakeups, worse on battery. Low absolute cost; an asymmetry the companion commit deliberately avoided on the FBE sibling.

**Suggested fix.** Pause the drift interval on document.visibilitychange when document.hidden (mirroring the FBE posture). Store the handle so it can be cleared and re-armed on un-hide. The mobile path is acceptable as-is per the documented rationale.

### 110. function-block-editor: sim loop runs in a backgrounded tab on initial load (visibilitychange only fires on change) *(open — 2026-06-15)*

*Severity: low · Category: bug · Confidence: high* — `html/simulators/function-block-editor.html:1131-1135 (startLoop), :1254-1257 (visibilitychange), :1269 loadExample → :1166 setRunning(true)`

startLoop() guards on tickHandle and desktopMQ.matches but never checks document.hidden. The documented 'pause in a backgrounded tab' posture is implemented only via the visibilitychange handler, which fires on a transition, not on initial load. When the page is opened directly into a background tab (Ctrl/middle-click), loadExample('econ') runs at IIFE end → setRunning(true) → startLoop(), starting a 10 Hz setInterval immediately in a hidden tab. It won't pause until the first visibility transition. The intent (zero idle work while hidden) is defeated for the entire pre-focus lifetime.

**Impact.** A page opened in a background tab spins FBE.tick + refreshValues at 10 Hz (DOM class churn over every block pin and wire) until first focus. Browsers throttle background timers so the practical cost is modest, but it contradicts the stated design.

**Suggested fix.** Bail when hidden: add `if (document.hidden) return;` at the top of startLoop (alongside the desktopMQ guard). The visibilitychange handler already restarts the loop on un-hide via `else if (running) startLoop()`, so this makes the hidden-tab case correct on both initial load and transitions.

### 111. function-block-editor: refreshValues reassigns class on every wire and pin every tick (10 Hz) even when unchanged *(open — 2026-06-15)*

*Severity: low · Category: perf · Confidence: medium* — `html/simulators/function-block-editor.html:840-883 (refreshValues), :881 setAttribute('class'), :853 classList.toggle`

refreshValues() runs on every tick (10 Hz). It walks every block's pins (classList.toggle) and rebuilds + reassigns the full class string on every wire's visible <path>, plus does a graph.blocks.find() per wire and a pinKind() lookup that does another graph.blocks.find() — so the per-tick cost is O(wires × blocks). For a number wire the class is invariant yet re-set 10×/s. Reassigning an identical class does not restart the CSS animation (which keys off .fbe-running on the canvas ancestor), so correctness is fine — this is purely avoidable work.

**Impact.** Negligible on the shipped graphs (≤9 blocks, ≤11 wires); the only per-tick O(n²) in the hot path. Would matter only on a large user-built sheet.

**Suggested fix.** Build a byId map once in refreshValues instead of graph.blocks.find() per wire/pinKind, and skip setAttribute when the computed class string equals the current one (cache the last class on the wire object).

### 112. flow-engine: in-flight pulses and pulsePaths registrations on gutter motifs survive teardownGutterPools *(open — 2026-06-15)*

*Severity: low · Category: bug · Confidence: medium* — `html/scripts/flow-engine.js:421-434 (teardownGutterPools handles flow pools only); pulse-path defs at html/_includes/schematic-bg.njk`

teardownGutterPools tears down flow POOLS for .schematic-bg elements but never touches pulse state. When the viewport shrinks below 1240px: (1) any activePulses whose el is inside .schematic-bg keep ticking in tickPulses (pulse.el.isConnected is still true under display:none), so getPointAtLength/setAttribute keep running on a hidden SVG until each pulse self-retires (~1-2s); (2) the pulsePaths Map entries and their pulseIO.observe registrations for gutter elements are never removed, persisting for the page lifetime. Auto-fire is correctly suppressed afterward (a display:none el isn't in visiblePulseEls), so this is churn-on-teardown + a bounded registration leak (buildPulsePathFor re-registers via Map.set on re-entry, so it doesn't grow per cycle) — an asymmetry with the carefully-scoped flow-pool teardown the same audit motivated. Contributing cause: buildPulsePathFor lacks the gutterHidden guard buildPoolForEl carries.

**Impact.** Brief wasted main-thread work (circle position writes on a display:none gutter) for ~1-2s after the viewport crosses below 1240px, plus stale pulseIO observations retained for the page lifetime. Minor; bounded.

**Suggested fix.** In teardownGutterPools, also retire in-flight gutter pulses (iterate activePulses backwards; if pulse.el.closest('.schematic-bg'), remove its circles and splice) and drop gutter pulsePaths entries with pulseIO.unobserve(el)+pulsePaths.delete(el). buildPulsePathFor re-registers them on the next gutter-grow init().

### 113. flow-engine: rAF loop runs forever and never self-suspends even with zero animatable work *(open — 2026-06-15)*

*Severity: low · Category: perf · Confidence: medium* — `html/scripts/flow-engine.js:259-297 (frame always re-schedules at line 295)`

Once frameStarted is set, frame() unconditionally calls requestAnimationFrame(frame) every frame for the page lifetime; frameStarted is never reset and cancelAnimationFrame is never used. When all pools have scrolled offscreen (visibleFlowEls empty), all pulse paths are offscreen, and activePulses is empty, the loop still wakes every frame to iterate pools checking isConnected/visibility and run tickPulses' pulsePaths.forEach. On a long page scrolled past all diagrams, or after teardownGutterPools leaves pools.length==0, the engine still costs one rAF callback per frame. The audit gating skips per-particle work but not the loop itself.

**Impact.** A small constant per-frame cost (Map/array iteration, visibility checks) that never drops to zero even when nothing can animate. Negligible per frame but continuous; rAF auto-pauses in backgrounded tabs, so the residual is bounded.

**Suggested fix.** Pause the loop when there's no work: if pools.length==0 && activePulses.length==0 && no visible pulsePaths after a tick, stop re-scheduling and reset a frameStarted-style flag so the next IO 'intersecting' callback or firePulse/init restarts it. Lower priority than the breakpoint-rebuild bug; document as a known hot-path note if not fixed.

### 114. quiz-engine: a first quiz run celebrates 'new best' and stores a record even at a score of 0 *(open — 2026-06-15)*

*Severity: low · Category: correctness · Confidence: high* — `html/scripts/quiz-engine.js:642-662`

On the very first finish there is no stored best, so prevBestTotal is NaN and prevBestRatio is set to -1. longEnough becomes true (!isFinite(prevBestTotal)) and curRatio (>= 0) is always > -1, so isNewBest is true for ANY first run — including 0/10. The engine writes best=0 / best_total=10 and renderResults() shows the '· new best' tag for a zero-correct run; paintBest renders 'Best: 0 / 10'. Subsequent runs correctly compare against that 0/N record (a later run with curRatio>0 supersedes it via the #89 ratio comparison), but the first-run experience celebrates a failing score as a 'new best'.

**Impact.** Minor UX/correctness oddity: the first attempt at any quiz, even all-wrong, is announced as a personal best and persisted. Not data-corrupting, but the celebration semantics are wrong for a 0-score baseline.

**Suggested fix.** Gate the new-best on a non-trivial score — only treat a first run as a best when score > 0 (or compare curRatio > prevBestRatio only when prevBestRatio >= 0, treating the no-prior case as 'store silently, don't celebrate'). Distinct from the closed #89 (short-vs-longer overwrite); #89's !isFinite short-circuit is in fact what makes the first run unconditionally longEnough.

### 115. quiz-engine: stored best can become permanently unbeatable if a bank shrinks below the recorded best_total *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/quiz-engine.js:652-657`

The #89 longer-run guard is `longEnough = !isFinite(prevBestTotal) || total >= prevBestTotal`. If a user records best 10/10 and the bank is later edited down to 8 questions, then 'All' runs cap at total=8 < prevBestTotal=10, so longEnough is always false and no run can ever beat or repair the record. The Best readout shows '10 / 10' indefinitely against a quiz that now maxes at 8; the only escape is Reset best (which storeDel's bestTotal and re-enables the !isFinite branch). This is the converse failure mode that the #89 fix newly introduces, mentioned nowhere in #89, the engine header, or the trackers.

**Impact.** Edge case tied to an editorial bank-shrink (rare), but it leaves a stale, unbeatable best that misrepresents the current quiz length until the user manually resets. Self-inflicted only by a bank size reduction.

**Suggested fix.** When the current run's total is below the stored best_total AND equals the full bank length (state.count === 'all' && total === questions.length), treat the stored best as stale — clamp/repair the record or allow the full-bank run to set a new best. At minimum document the bank-shrink hazard in the engine header next to the #89 note.

### 116. quiz-engine: numericInput inputmode attribute is never reset between questions *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/quiz-engine.js:252-258,391-393`

The shared numericInput is created once with inputmode='decimal' and reused across all questions/restarts. showQuestion() only sets inputmode when the current question declares one (`if (q.inputmode) numericInput.setAttribute('inputmode', q.inputmode)`) — it never clears it, and the per-question reset block undoes value/disabled/classes but not the attribute. So once a question with inputmode:'numeric' is shown, every subsequent numeric question that omits inputmode keeps the stale 'numeric'. The header schema documents 'default decimal', which the code breaks. No current bank sets inputmode, so it is latent — the same state-leak class as the audit-2026-06 #19 fix targeted for disabled/tint.

**Impact.** Latent: the moment a bank ships an inputmode:'numeric' question alongside a default-decimal one, mobile keyboards for later questions inherit the wrong mode. Not user-visible today.

**Suggested fix.** Always set the attribute deterministically in showQuestion()'s numeric branch: `numericInput.setAttribute('inputmode', q.inputmode || 'decimal');`.

### 117. quiz-engine: choice id uniqueness within a question is never validated; reveal() marks by data-choice-id *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/quiz-engine.js:106-117,540-541,562-563`

validateQuestion() checks choices.length >= 2 and exactly-one-correct but never that choice ids are unique within the question, nor that each choice has an id/text. submit() records given = sel.getAttribute('data-choice-id') and reveal()'s wrong-highlight matches by attribute equality, so two choices sharing an id would both highlight 'wrong' on a miss and make the miss ambiguous; a choice missing text renders the literal string 'undefined'. Selection itself is identity-based (b === btn) so it still works. All current banks use unique a/b/c/d ids with text (verified across 21 banks / 151 choices — zero violations), and quiz-banks.spec.js doesn't cover it either.

**Impact.** Latent content-defect class: a malformed choice (duplicate id, missing text/id) ships without a build or test failure and renders/scoring-highlights incorrectly. Affects only the reveal highlight and miss-list.

**Suggested fix.** Add per-choice id/text presence + within-question id-uniqueness checks to validateQuestion(), and mirror them into quiz-banks.spec.js so a bad bank fails the build/test rather than just at mount. Cheap: build a Set of choice ids and assert size === choices.length and every choice has truthy id and text.

### 118. quiz-engine: dead/unused mapped index in the results miss-list *(open — 2026-06-15)*

*Severity: low · Category: dead-code · Confidence: high* — `html/scripts/quiz-engine.js:695-697,711`

renderResults() builds the miss list with `.map(function (a, i) { return { a: a, i: i }; })` capturing the original index as pair.i, but the subsequent forEach only ever reads pair.a (and pair.a.qi) — pair.i appears nowhere else and is never used. The map wrapper is vestigial; the same result comes from `state.answers.filter(a => !a.correct)`. (Note pair.i is the position in possibly-shuffled state.answers, so it wouldn't cleanly map to a stable 'Question N' anyway.)

**Impact.** None functional — purely dead scaffolding. Minor maintenance noise.

**Suggested fix.** Drop the wrapper (`const misses = state.answers.filter(a => !a.correct);` and adjust the forEach to take the answer directly), or actually surface a numbered miss row. Pick one rather than carrying the unused field.

### 119. search.js: index-fetch failure is silent and never retried — palette permanently empty after one bad response *(open — 2026-06-15)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/search.js:66-74 (load) and 67 (the `if (entries) return` short-circuit)`

load() sets entries to [] on both failure modes (non-200 → r.ok false → []; network error → .catch → []). Because [] is truthy, the next open() hits `if (entries) return Promise.resolve(entries)` and never re-fetches — the failed fetch is cached for the page lifetime. rank() over [] returns nothing, so render() shows the generic 'No matches' with no error signal. A transient failure (CF cold-start, flaky mobile radio, a deploy mid-flight) silently disables search for the rest of the session until a full reload.

**Impact.** A single transient failure on first open silently disables search for the rest of the page session — the user gets 'No matches' for real queries with no signal that the index didn't load, which reads as the site simply having nothing.

**Suggested fix.** Distinguish 'loaded empty' from 'failed to load': on failure leave entries null (reset loading=null in .catch) so the next open() retries, and/or surface a one-line status ('Search index unavailable — retry') instead of the generic 'No matches'.

### 120. search.js: mousemove over results calls scrollIntoView on every hover, fighting the cursor *(open — 2026-06-15)*

*Severity: low · Category: perf · Confidence: high* — `html/scripts/search.js:280-283 (mousemove) → 146-153 (setActive)`

The list 'mousemove' listener calls setActive(index) on every mouse-move event over the results. setActive unconditionally runs opts[n].scrollIntoView({ block: 'nearest' }) for the newly-active row with no i===active early-return guard. On a result list tall enough to scroll (.palette-box max-height: 70vh, .palette-results overflow-y: auto), moving toward a partially-clipped edge row triggers a programmatic scroll that shifts that row under the cursor, which can fire another mousemove and another scroll. scrollIntoView is a layout-forcing call run per mousemove. MAX_RESULTS=8 makes overflow rare except on small/zoomed viewports.

**Impact.** Pointer users on long result lists (rare given the 8-result cap, possible on small/zoomed viewports) get janky hover where rows hop under the cursor. Repeated synchronous layout on a per-mousemove handler is needless hot-path cost.

**Suggested fix.** Have mousemove set the active index without scrolling — split setActive into a core that updates aria-selected/aria-activedescendant and an opt-in scroll, and call the no-scroll variant from mousemove (keyboard nav keeps scrollIntoView). Or guard the scroll behind a 'source' flag so only keyboard navigation scrolls.

### 121. search.js: palette dialog does not inert/hide background content while open (aria-modal asserted but no real containment) *(open — 2026-06-15)*

*Severity: low · Category: a11y-mechanical · Confidence: medium* — `html/scripts/search.js:223-234 (open); html/_includes/layouts/page.njk:22 (aria-modal="true")`

The dialog declares aria-modal="true" but the rest of the page is left fully interactive/perceivable: background is not set inert and not aria-hidden (body.palette-open only does overflow:hidden scroll-lock). Focus 'containment' is achieved only by preventDefault on Tab in the input keydown — which holds for sighted keyboard users (the palette has one focusable element; results are driven by aria-activedescendant), but a screen-reader user in browse/virtual mode can still arrow into the background document, contradicting the aria-modal contract. A mechanical mismatch between the asserted ARIA state and the DOM.

**Impact.** AT browse-mode users can navigate the obscured page while the modal claims to be modal — confusing reading order and defeating the 'modal' semantics the markup promises. Non-destructive search overlay, so impact is reading-order confusion, not broken function.

**Suggested fix.** On open(), add inert (or aria-hidden="true") to the page's main wrapper / nav / footer (everything except #palette) and remove it on close(). inert also removes those nodes from the tab order, so the Tab-preventDefault hack could then be dropped.

### 122. nav-menu: Escape on the section toggle collapses category and section in one press, contradicting the documented step-back *(addressed 2026-06-15)*

*Severity: low · Category: bug · Confidence: medium* — `html/scripts/nav-menu.js:132-136 (toggle keydown) vs 144-165 (menu keydown step-back)`

The module header and the menu-level keydown handler implement 'Escape collapses the open category first, then the section.' That stepping lives only on the m.menu keydown listener (fires when focus is inside the menu). But the .nav-menu-toggle has its own keydown handler whose Escape branch calls close(m) → closeGroups(m), tearing down the open category AND the section together. The scenario is reachable: the toggle and menu are siblings inside .nav-item, so Shift+Tab from a category toggle back up to the section toggle keeps focus in the item (the focusout handler doesn't close), with a category still expanded and focus on the toggle. So category-open + focus-on-toggle collapses both levels in one press while category-open + focus-in-menu collapses only the category. This is freshly-rewritten cascade code where the one-level-per-press invariant is explicitly claimed.

**Impact.** Inconsistent Escape behavior depending on whether focus is on the toggle vs in the menu — a keyboard user gets a single-step or double-step collapse with no visible reason. A state-machine inconsistency that violates a documented invariant.

**Suggested fix.** In the toggle's Escape branch, mirror the step-back: if any group in groupsOf(m) is open, closeGroups(m) only and keep the section open; else close(m). Or route the toggle's Escape through the same step-back helper the menu handler uses.

**Resolution (2026-06-15):** fixed on `feat/nav-cascading-categories` — the section toggle's Escape now mirrors the menu-level step-back (`if (groupsOf(m).some(isGroupOpen)) closeGroups(m); else close(m)`), so one press collapses the open category and a second closes the section. Regression test added in `tests/nav-menu.spec.js` (fails without the fix).

### 123. fbe-engine.spec.js: DIVIDE /0 guard, NaN/Infinity propagation, and most catalog blocks are untested *(open — 2026-06-15)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/fbe-engine.spec.js (whole file); load-bearing miss is the div-by-zero guard at html/scripts/fbe-engine.js:171`

The engine-direct spec covers add/ai/const/gt/not/pid/sr/tof/ton and feedback rings, but leaves real behavior unexercised: (1) the DIVIDE-by-zero guard (fbe-engine.js:171) — the single most-documented safety behavior, advertised as load-bearing in user-facing copy at function-block-editor.html:483-485 — has no test asserting div by 0 returns 0; (2) no test that a non-finite input is coerced to 0 by asNum, nor the Infinity-propagation inconsistency above; (3) the dt=0 derivative NaN above; (4) block types div, eq, ne, ge, le, lt, sub, mul, min, max, select, limit, xor, and, or, ao, bo, readout have no evaluation test. The documented div-guard is exactly the kind a refactor could silently break, so it's the highest-value missing assertion.

**Impact.** A regression to the div-guard or asNum coercion would ship green. The behaviors the page advertises in prose are not pinned by tests.

**Suggested fix.** Add a div-by-zero test (const A / const 0 → O===0), an asNum-coercion test, and a dt=0 derivative test; spot-check select/limit and at least one of each comparator family. A few lines each given the existing run() helper.

### 124. quiz-engine: no behavioral test coverage for the Skip action, random order, or gotcha snippet rendering *(open — 2026-06-15)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/smoke.spec.js:1473-1640 (engine surface); branches at html/scripts/quiz-engine.js:503-506,329,360-367,575,614`

The browser-driven quiz tests exercise mcq/tf correct+incorrect, numeric submit, restart, best persistence, and the #89 short-vs-full guard — but three branches have zero behavioral coverage: (1) the Skip button path submit(true) ('Skipped.' status + skip-disabled-on-reveal + a pushed correct:false answer landing in the miss-list); (2) the 'random' order mode / shuffleInPlace (only sequential is ever selected); (3) the gotcha snippet-slot render/hide path. quiz-banks.spec.js validates the data shape but never mounts the engine. A regression in skip scoring (a skipped question must score as incorrect) or in snippet visibility would ship green.

**Impact.** A future edit to the skip/random/gotcha branches can break without a failing test. Skip in particular toggles skipBtn.disabled and pushes a correct:false answer — a regression there silently mis-scores.

**Suggested fix.** Add a behavioral spot-check (modbus-decoding has a gotcha in the bank) that clicks Skip on one question and asserts the reveal shows 'Skipped.' + the question appears in the miss-list; one that selects Random order, restarts, and asserts the run completes to a results card with the right total; and a gotcha-snippet visibility assertion riding the existing sequential run.

### 125. psychro-engine.spec.js: computeProcess / invertProcess have no engine-direct test despite a documented round-trip contract *(open — 2026-06-15)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/psychro-engine.spec.js (only solveState/buildState tests); engine functions at html/scripts/psychro-engine.js:191-247`

psychro-engine.spec.js exercises only the ASHRAE reference points and the 5-mode solveState round-trip. Psychro.computeProcess (process deltas, mDot, qTotal/qSens/qLat, SHR) and Psychro.invertProcess (inverse q-formula solve for the leaving-air state + the saturated flag) — which power tools/coil-sizing.html — are pinned by no engine-direct test. The header promises a forward/inverse round-trip; verified holding today (recovers tdb/W to ~1e-6) so this is a missing regression guard on correct-but-untested math. The Wout<0 bone-dry and the qSens<0/qLat<0 rejection branches are likewise uncovered. Note: an active smoke.spec.js coil-sizing behavioral test does pin the headline numbers, so this is the narrower engine-direct + round-trip-invariant gap, not zero coverage.

**Impact.** The coil-sizing tool's heat-flow and inverse-load math can silently regress on the round-trip invariant (the strongest available) and the rejection branches with no engine-direct test catching it. The most-likely-to-break formula plumbing (cool/heat sign, cpIn weighting, qLat = qTotal − qSens) is unpinned engine-side.

**Suggested fix.** Add engine-direct tests to psychro-engine.spec.js (the vm pattern already loaded): a computeProcess↔invertProcess round-trip asserting recovered tdb/W to ~1e-6 across a cool and a heat stage; SHR sanity (0<shr<1, ≈1 for pure-sensible); the saturated flag firing when latent load drives the leaving point onto the curve; and the negative-load / negative-Wout branches returning ok:false.

### 126. staging-sequencer rotation / runtime-equalization logic has only one UI stage-up path tested *(open — 2026-06-15)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/smoke.spec.js:173-186 (only behavioral test); html/simulators/staging-sequencer.html (inline logic, lead-selection :530-571, options :257-259)`

The staging sequencer ships three lead-lag strategies — Fixed lead, Runtime-equalized, Scheduled rotation — and a per-unit runtime accumulator driving equalization. The only behavioral test runs the default Fixed strategy with Manual demand + zero delay and asserts only stage-up count and a 'Stage up' log line, neither sensitive to which unit is chosen. None of the rotation modes, the runtime-equalization convergence, or the lead-tag handoff is asserted. The logic is inline (no extractable shared engine), so it can only be pinned behaviorally. (The education equipment-staging widget has a separate, simpler inline implementation that shares no code and gives the simulator zero regression coverage.)

**Impact.** A regression in lead selection or runtime equalization (equalized mode picking the highest-hour idle unit instead of the lowest, or rotation never advancing) would pass CI — the stage-up count and log line under test are unaffected by which unit is chosen.

**Suggested fix.** Add a behavioral spec that selects each rotation mode, runs several evaluate cycles, and asserts the lead tag moves (scheduled) / the lowest-hour unit comes on next and the runtime spread shrinks (equalized) / unit 1 always leads and the spread grows (fixed). Pin via the per-unit runtime readouts in #stg-units and the lead tag.

### 127. nav-menu/nav-search: tests don't cover the capture-vs-bubble Escape coexistence between palette and nav menu *(open — 2026-06-15)*

*Severity: low · Category: test-gap · Confidence: medium* — `tests/nav-menu.spec.js + tests/nav-search.spec.js (the Escape-coexistence gap spans both); guarded code at html/scripts/nav-menu.js:40,179,220-225 and html/scripts/search.js:292-307`

search.js registers its Escape keydown in capture phase and stopPropagation()s when the palette is open; nav-menu.js has a bubble-phase document Escape backstop. No spec opens a nav section menu AND the palette together then presses Escape to assert the palette closes while the nav menu state is untouched — that load-bearing coexistence is asserted only in prose. Also the items-empty early return (nav-menu.js:40) and the setNavOpen null-guard (:179) are never exercised, though they're unreachable on the live site (chrome is templated into every page) so that sub-part is low-value.

**Impact.** The Escape-ordering contract between search.js (capture) and nav-menu.js (bubble) is the kind of thing a future refactor breaks silently; no test guards it. Low because the behavior is currently correct.

**Suggested fix.** Add a spec: open a nav section menu, open the palette (Ctrl+K), press Escape, assert the palette is hidden AND the nav menu is still in its prior state — proving capture-phase Escape stopped propagation before the nav backstop.

### 128. .wrangler/ is not in .gitignore *(addressed 2026-06-16)*

*Severity: low · Category: build-config · Confidence: high* — `/home/ehill/controlsfreak.dev/.gitignore:24-28 (wrangler secrets block; add a .wrangler/ line here)`

The .gitignore has no entry for the wrangler local-state directory — the only wrangler-related lines cover .env/.dev.vars secrets. `git check-ignore .wrangler/` returns NOT IGNORED, and /home/ehill/controlsfreak.dev/.wrangler/tmp already exists on disk from a prior wrangler invocation. Wrangler dev/deploy/tail write deploy state, caches, and tmp bundles here; none of it is ignored. git status is clean only because the dir is currently empty, masking the gap until the next wrangler run. No secret exposure (secrets already covered).

**Impact.** Any local wrangler dev/deploy/tail run drops untracked files under .wrangler/ that git surfaces and can be accidentally git add-ed (including local deploy bundles/state that shouldn't be in history). It also clutters git status for a contributor running the Worker locally.

**Suggested fix.** Add a one-line `.wrangler/` entry under a `# Wrangler` header near the .dev.vars block.

**Resolution (2026-06-16):** added a `# Wrangler local state` block with a `.wrangler/` entry to `.gitignore`, right after the `.dev.vars` secrets block. Verified: `git check-ignore .wrangler/` now matches, and a stray `.wrangler/tmp/*` file is invisible to `git status`.

### 129. package-lock.json root version stale (3.11.1) vs package.json (3.18.0) *(addressed 2026-06-16)*

*Severity: low · Category: build-config · Confidence: high* — `/home/ehill/controlsfreak.dev/package-lock.json:3,9 (vs package.json:3)`

package.json declares version 3.18.0 but package-lock.json records 3.11.1 in both the root and the packages[""] self-entry — seven minor versions behind. `npm ci` validates only the dependency tree, not the root project version, so the drift is invisible to CI and never self-heals (only a fresh `npm install` rewrites the lock root). Version bumps are load-bearing here (footer reads it via _data/site.js; the ?v= cache-bust keys off site.version per #84). Git history shows this is recurring — prior dedicated 'sync package-lock root version' commits, and the latest bump 3.17.0→3.18.0 again touched only package.json — confirming the version-bump step isn't running npm install.

**Impact.** The lockfile — the canonical machine-readable record of the project version — disagrees with package.json. No build break today, but it is a misleading source-of-truth and confirms the version-bump step (CLAUDE.md 'Adding a new tool' step 7) isn't keeping the lock in sync.

**Suggested fix.** Run `npm install` once to rewrite the lock root version to 3.18.0 and commit it; thereafter bump via `npm version <patch|minor>` (updates both files atomically) or run npm install after editing package.json's version.

**Resolution (2026-06-16):** ran `npm install` once — it rewrote both `package-lock.json` root version fields (root + `packages[""]`) from 3.11.1 to 3.18.1 (package.json had since moved to 3.18.1) and touched nothing else (the diff is exactly the two version lines — no dependency-tree churn). Going forward, shared-script PRs in this audit pass bump with `npm version patch --no-git-tag-version`, which keeps both files in sync atomically.

### 130. thermistor-data: 10k-5-tac curve generates two adjacent rows with identical resistance at the cold extreme *(open — 2026-06-15)*

*Severity: low · Category: correctness · Confidence: medium* — `html/scripts/thermistor-data.js:145-152 (generated table; rows at -40 °F and -35 °F); reverse lookup at html/tools/thermistor-calculator.html:442-455`

For the '10k-5-tac' type (ntc-shunt, 10K Type-3 with an 11 kΩ parallel shunt), buildTable()+roundR() produce two consecutive rows with the SAME rounded resistance ([-40,...,10600] and [-35,...,10600]) — the shunt flattens the parallel resistance near the cold asymptote and roundR's 100 Ω granularity collapses the two distinct element resistances onto 10600 Ω. No other type produces a duplicate-resistance row (verified across all 9). thLerpByRes checks Math.abs(r - a[2]) < 1e-6 and returns a[0] before computing f, so entering 10600 Ω returns -40 °F with no divide-by-zero — the page is safe. But (a) 10600 Ω silently resolves only to -40 °F, making the -35 °F row unreachable by reverse lookup, and (b) any future consumer doing naive segment interpolation over this table without the exact-match guard would divide by zero on that flat segment.

**Impact.** Cosmetic/edge-case today: at the -40…-35 °F cold extreme of one shunted curve (a region the header documents as 'nominal' with tolerated degradation), reverse-lookup resolution is slightly lossy. The latent risk: the table is documented as 'the source of truth' for interpolation yet contains a flat segment unsafe for a generic interpolator without an exact-match short-circuit.

**Suggested fix.** Acceptable to leave given the page guards it and the header tolerates extreme-range degradation — but add a one-line note in the type's inline source comment that the cold-end rows collapse to one resistance after rounding, so a future transcribed-table swap or alternate consumer doesn't trip over it. Alternatively, the data module could assert (in dev) that no two adjacent rows share a resistance.

### 131. Mobile sheet focusout closes its menu mid-tap when focus briefly lands on body *(addressed 2026-06-15)*

Mobile sheet focusout closes its menu mid-tap when focus briefly lands on body (nav-menu.js:168-170) — LOW CONFIDENCE. The missing relatedTarget null-guard is real (`if (!m.item.contains(e.relatedTarget)) close(m)` with no null check, so focusout with relatedTarget===null closes the section), and is the genuine in-scope kernel worth a one-line fix. But the headline 'menu collapses as I tap a category' reproduction is largely refuted by the DOM: the category toggle is a <button> inside m.item, so a tap that focuses it keeps focus in-item and does NOT close; triggering the bug needs focus already inside the item plus an engine-dependent blur-to-null, which the reporter flags as non-deterministic. Treat as a defensive null-guard (add it alongside the nav-menu Escape fix), not a confirmed flake.

**Resolution (2026-06-15):** fixed on `feat/nav-cascading-categories` alongside #122 — the focusout handler now guards relatedTarget (`if (e.relatedTarget && !m.item.contains(e.relatedTarget)) close(m)`), so a blur-to-null no longer tears the open section down; a genuine click outside still closes via the document click listener. Regression test added (fails without the fix).

### 132. Worker: immutable cache-control header dropped on 304 revalidation responses *(open — watch / low-confidence — 2026-06-15)*

Worker: immutable cache-control header dropped on 304 revalidation responses (src/worker.js:252-259) — MEDIUM CONFIDENCE / theoretical. The fallthrough re-wraps the long-lived cache-control only when assetRes.ok is true; a 304 from env.ASSETS.fetch (reachable under run_worker_first:true on conditional requests for fingerprinted assets) has .ok===false and is returned with the binding's default max-age=0,must-revalidate instead of immutable. Impact is genuinely bounded (a conforming client that already received immutable won't revalidate; only intermediary caches, immutable-ignoring clients, and pre-immutable holders re-revalidate) and the whole long-cache mechanism is the owner-accepted #84 with no CI guard. Worth a one-line gate change (`assetRes.ok || assetRes.status === 304`) but low blast radius and partly speculative about which clients are affected.

### 133. Worker: legacy redirect discards query string and fragment *(open — watch / low-confidence — 2026-06-15)*

Worker: legacy redirect discards query string and fragment (src/worker.js:238-241) — confirmed real but explicitly harmless today. Response.redirect(new URL(legacyTarget, url.origin), 301) drops any inbound ?query on the three moved simulator pages; fragments are moot (never sent to server). The three pages don't read query params (grep confirmed zero url.search/searchParams usage), the site has no analytics consumer (no tracking by policy), so the only real-today impact is third-party attribution loss on inbound legacy links; the deep-link-state risk is hypothetical. A one-line fix (`target.search = url.search`) is cheap, but this is a latent correctness gap, not a live bug — keep on the watch list until a moved page actually reads query state.


### Deferred / Won't fix (with revisit trigger)

Items considered during an audit and deliberately not pursued, each
with an explicit trigger that would change the call. The full entries
for #7 and #8 sit below; four more deferrals from the 2026-05-22
audit cycle (#62 / #64 / #65 / #67) stayed in their original
numerical position under `## Recently addressed` to keep the audit
batch intact — each carries the same `*(deferred 2026-05-22)*` marker
and an explicit **Decision** block. A pointer list to those four sits
at the bottom of this subsection. Two more deferrals from the
2026-05-23 schematic-bg doc-audit sit at their numerical positions
above: #69 (short-path dasharray stutter — case-split attempt
reverted 2026-05-24 after the Chromium pathLength/dasharray finding),
and #70 (~360 SVGs inlined per page).

### 7. Worker has no app-level rate limit on `/api/contact` *(deferred 2026-05-16)*

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

### 8. `flow-engine.js` doesn't react to live `prefers-reduced-motion` changes *(deferred 2026-05-16)*

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

**Also deferred from the 2026-05-22 audit cycle** — full entries
remain in `## Recently addressed` at their numerical position:

- **#62. Function-block editor palette uses per-button
  `addEventListener` inside a forEach.** Trigger: the codebase moves
  to a uniform `data-*` + delegated-handler pattern across all
  dynamically-built UI.
- **#64. `package.json` version bump skipped 1.14 on the
  function-block-editor ship.** Trigger: the version-bump cadence
  becomes a hard rule.
- **#65. `clamp()` is defined twice — once in `fbe-engine.js`, once
  in the editor page IIFE.** Trigger: a third caller appears,
  promoting `clamp` to `FBE.util.clamp(...)` or a shared
  `html/scripts/util.js`.
- **#67. Function-block editor — type-mismatch on wire creation
  doesn't cancel pending.** Behavior is intentional (saves the user
  re-clicking the source pin); recorded so a future "fix" PR doesn't
  add a `cancelWire()` here. Trigger: an explicit UX decision to
  change the cancel-on-mismatch behavior.

---

## Recently addressed

### 77. Phase 3 per-page dark-theme polish *(addressed 2026-06-06)*

(branch `issue-77/dark-theme-polish`). Phase 1b's dual-theme token
flip carried the whole site; this pass cleaned up the per-page
fit-and-finish:
  - **vfd-mock adopted the equipment register** — its left "Drive
    Front Panel" column is now a real device face (olive dot-matrix
    LCD, `.device` bezel, plastic keypad); the right monitoring
    column stays software register. The page now shows both registers
    side by side.
  - **Tokenized the off-palette washes** — `.psy-chip` /
    `.fbe-block` inline colours and the shared `.bas-breathe` ring
    (all hardcoded the LIGHT green); plus the styles.css tints
    (`.ref-table` hover → `--blue-dim`, quiz wrong-answer →
    new `--red-dim`, `.ref-table-dense` zebra → `--surface-2`).
  - **Canvases redraw on theme toggle** — `theme.js` already
    broadcast `themechange`, but nothing subscribed; the
    psychrometric, pid-tuner, and pid-basics canvases (which read
    tokens at draw time) now do. Verified: a runtime toggle repaints
    all three.
  - **Removed the legacy `.lcd-scanline`** (vfd-mock was its only
    consumer); kept `.lcd-flicker` (a live value-change refresh cue).
  - **Education diagrams re-screenshotted on dark** — clean; zero
    hardcoded hex / `var(--x,#hex)` fallbacks remain site-wide.
Two clusters were intentionally deferred (unused/no-consumer shared
rules) → logged as **#78**.

### 78. Unused / no-consumer shared rules *(deferred from Phase 3, 2026-06-06)*

Deferred from #77. A few shared rules render nowhere today, so the Phase 3
polish pass left them alone rather than polish blind. Clean up (or
tokenize) when a production page first needs each:
  - `.bas-breathe` (styles.css) is unused — its documented consumer,
    the psychrometric state-point chip, actually rolls a tighter
    page-local `psy-chip-breathe` variant. Consolidate to one when a
    second consumer appears. (Both were tokenized in #77, so neither
    is wrong on dark — this is just dedup.)
  - `.bas-led.fault` / `.bas-led.warn` (styles.css) are unused (only
    `.bas-led.active` has a consumer — vfd-mock) AND still hardcode
    the light-theme red/heat rgba for their border/glow (0.32 / 0.08
    alphas, no matching token). Tokenize via `color-mix` or new
    red/heat glow tokens when first used on a page.
  - `.tree` / `.trend` — **RESOLVED 2026-06-06**: the Phase 2 home
    "seam" hero is their first production consumer, so both were
    promoted to `styles.css` (SOFTWARE-REGISTER MOTIFS) and the
    styleguide now reads the shared rules. Only `.wiresheet` stays
    styleguide-local — its one candidate consumer
    (`function-block-editor`) already has a complete token-driven
    `.fbe-*` wiresheet, so promoting it is a refactor with no payoff;
    promote when a second page wants that grid.

  Trigger: a production page adopting any of the remaining motifs.

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

### 60. Smoke spec gaps on the function-block editor *(addressed 2026-05-22)*

Caught during the post-ship audit of `feat/function-block-editor`
(2026-05-22). The behavioral block added in
`tests/smoke.spec.js:457–492` covers the happy path — load-default +
inspector-edit + freeze-toggle + clear + add + wire — but the
following interaction paths are uncovered:

- Keyboard `Delete` / `Backspace` deletes the selection
  (`function-block-editor.html:1029–1038`).
- `Escape` cancels a pending wire.
- Type-mismatch wire reject (`out=bool` then `in=number`).
- Self-loop reject (output → input on the same block).
- Pause / Run / Step state machine.
- `visibilitychange` stops the tick loop in a backgrounded tab.
- Inspector edits for non-AI blocks (PID gain, timer preset).
- Mid-wire-then-block-delete — the regression-test gap for the
  BUG-2 fix shipped on `fix/fbe-mid-wire-and-prose`. Without
  coverage, the `cancelWire()` call in `deleteSelected` could
  regress silently.

**Why it matters:** each is a user interaction likely to happen.
The freshly-fixed mid-wire-delete path has no regression test, so
it's the most load-bearing miss.

**Priority:** LOW.

**Recommended action:** a `test.describe('function-block editor —
interactions', () => { ... })` block at the end of
`tests/smoke.spec.js`, one test per corner case. ~80 lines.

**Resolution (2026-05-22):** added a `test.describe('function-block
editor — interactions')` block at the end of `tests/smoke.spec.js`
with eight cases: Delete-key delete, Backspace delete, Escape cancels
a pending wire, type-mismatch rejection, self-loop rejection, the
pause / run / step state machine, a PID `kc` inspector edit flowing
to the READOUT, and the mid-wire-then-delete-source regression. The
last test goes through `page.keyboard.press('Delete')` — the same
keyboard path the BUG-2 fix lives on — and asserts no `.fbe-wire`
forms after a follow-on input-pin click. The `visibilitychange`-stops-
tick path is left uncovered: Playwright's `page.evaluate(() => { ...
document.dispatchEvent(...) })` can flip `document.hidden` but only
within a single frame, and there's no externally-observable signal
that the interval was cleared. Filed in the audit as a stretch goal
rather than load-bearing.

### 61. Function-block editor sim-bar buttons use per-button `addEventListener` *(addressed 2026-05-22)*

`html/tools/function-block-editor.html:1007–1013` binds handlers
individually for the four sim-bar buttons:

```js
runBtn.addEventListener('click', () => setRunning(!running));
document.getElementById('fbe-step').addEventListener('click', () => { ... });
document.getElementById('fbe-reset').addEventListener('click', resetSim);
document.getElementById('fbe-clear').addEventListener('click', clearCanvas);
```

The example chips at lines 1015–1017 already follow the CLAUDE.md
JS pattern (`querySelectorAll('[data-example]').forEach(...)`).

**Why it matters:** small consistency win. Each button's body is
slightly different (Run flips state, Step toggles off + steps,
Reset clears state, Clear wipes graph), so a `[data-action]` +
delegated handler would dispatch on `dataset.action` rather than
collapsing to one body.

**Priority:** LOW.

**Recommended action:** add `data-action="run|step|reset|clear"` to
the buttons; one `querySelectorAll('[data-action]').forEach` loop
with a switch on `dataset.action`.

**Resolution (2026-05-22):** added
`data-action="run|step|reset|clear"` to the four sim-bar buttons and
replaced the four individual `addEventListener` calls with a single
`document.querySelectorAll('.fbe-simbar [data-action]').forEach`
loop dispatching on `btn.dataset.action`. The buttons keep their
existing `id="fbe-..."` attributes so the smoke specs continue to
click them by id (and `runBtn` is still resolved by id for the
textContent flip in `setRunning`); only the binding shape changed.

### 62. Function-block editor palette uses per-button `addEventListener` inside a forEach *(deferred 2026-05-22)*

`html/tools/function-block-editor.html:530` inside `buildPalette()`
generates per-category buttons in a nested loop and binds each
individually with `btn.addEventListener('click', () =>
addBlock(type))`. The `addBlock(type)` closure is naturally tied to
the loop iteration. A `[data-block-type]` + delegated handler would
work but isn't obviously cleaner here.

**Why it matters:** consistency-only. The per-button binding
doesn't leak (the palette is built once at first paint and not
re-rendered); purely a "matches the chip pattern" cleanup with no
functional benefit.

**Priority:** LOW. Considered-and-skipped during the audit.

**Recommended action:** none unless the codebase decides to move to
the `data-*` pattern across all dynamically-built UI.

**Decision (2026-05-22):** leave as-is. The per-button binding in
`buildPalette()` doesn't leak (palette is rendered once at first
paint and never re-bound, so no listener accumulation) and the
`addBlock(type)` closure is naturally tied to the loop iteration. A
`[data-block-type]` rewrite would carry the same indirection cost
as a delegated handler with no functional benefit — the chip-row
`[data-example]` pattern is the right idiom when the handler body
collapses to one call, not when the loop variable is the payload.
Revisit only if the codebase moves to `data-*` across all
dynamically-built UI as a uniform convention.

### 63. Inline `style=` attributes on the function-block editor and education page *(addressed 2026-05-22)*

Two one-shot overrides slipped in on `feat/function-block-editor`:

- `html/tools/function-block-editor.html:293` —
  `<p class="tool-preamble" style="margin-bottom:0.85rem;">`
- `html/education/function-blocks.html:132` —
  `<div class="callout-grid" style="margin-top:1.25rem;">`

Same shape as the inline-style proliferation captured by #19 / #50
/ #57. The site-wide pattern is page-only CSS in `{% block head %}`.

**Why it matters:** drift from the page-head-CSS convention. Each
is one rule; cheap to sweep.

**Priority:** LOW.

**Recommended action:** add a `.tool-preamble.tight` modifier (or
adjust the spacing of `.tool-preamble` if globally appropriate) and
a `.callout-grid-loose` modifier; remove the inline styles. Bundle
with the next inline-style sweep.

**Resolution (2026-05-22):** lifted both inline styles into page-
local modifier classes defined in each page's `{% block head %}`
CSS — `p.tool-preamble.tight { margin-bottom: 0.85rem; }` on
`function-block-editor.html` and `.callout-grid.loose { margin-top:
1.25rem; }` on `function-blocks.html`. The HTML now reads
`class="tool-preamble tight"` / `class="callout-grid loose"`; no
`style=` attributes remain on either element. Page-local rather
than promoted to `styles.css` since each rule has exactly one
caller — fits the "page-only rules stay inline via `{% block head
%}`" convention.

### 64. `package.json` version bump skipped 1.14 on the function-block-editor ship *(deferred 2026-05-22)*

`package.json` went from `1.13.1` to `1.15.0` when the function-
block editor + paired Function-Block Basics education page shipped.
Per CLAUDE.md, "minor (1.X.0) for new tools / new pages / visible
features." A new tool plus paired education page is one feature, so
`1.14.0` would have been the natural bump.

**Why it matters:** trivially harmless — the footer just shows
whatever's in `package.json`. Filed because the cadence convention
is documented and the skip breaks the sequence.

**Priority:** LOW.

**Recommended action:** none unless the cadence becomes a hard rule.

**Decision (2026-05-22):** not actioning. The footer just reflects
whatever's in `package.json`; the missed `1.14.0` step is a one-time
inconsistency rather than a recurring pattern, and rewriting history
to backfill it would buy nothing. Filed because the audit caught it,
documented so a future "should the cadence become a hard rule?"
conversation has a referent.

### 65. `clamp()` is defined twice — once in `fbe-engine.js`, once in the editor page IIFE *(deferred 2026-05-22)*

`html/scripts/fbe-engine.js:54` defines a closure-scoped
`clamp(x, lo, hi)`; `html/tools/function-block-editor.html:897`
defines the same function inside the page's IIFE. The engine's
`clamp` is not on the `FBE` namespace.

**Why it matters:** three-line duplication; considered-and-accepted
during the audit. Exposing every internal engine helper would bloat
`FBE`'s surface area for a marginal saving.

**Priority:** LOW. Considered-and-skipped.

**Recommended action:** none unless `clamp` ends up needed in a
third caller, at which point it becomes a candidate for
`FBE.util.clamp(...)` or a tiny shared `html/scripts/util.js`.

**Decision (2026-05-22):** not pursuing until a third caller
appears. Exposing every internal engine helper would bloat the
`FBE` namespace's surface area for a marginal saving — three lines
of helper per caller is acceptable when both callers already exist
side-by-side and stay in step. Trigger for revisit: a third call
site, at which point promote to `FBE.util.clamp(...)` or a tiny
shared `html/scripts/util.js`.

### 66. Function-block editor drop-grid wraps after 20 blocks; comment overstates *(addressed 2026-05-22)*

`html/tools/function-block-editor.html:540–541` positions a newly-
added palette block via `x = 40 + (n % 5) * 150; y = 40 +
Math.floor((n % 20) / 5) * 120;` — a tidy 5×4 grid that wraps after
20 blocks. The 21st block lands on top of the first. The comment at
line 538 says "Drop new blocks into a tidy grid so they don't stack"
— true for the first 20 only.

**Why it matters:** edge of edge cases. A user with 20+ blocks on
the canvas is probably placing them deliberately, so overlap is a
minor surprise. The bigger issue is the comment overstating the
guarantee.

**Priority:** LOW.

**Recommended action:** either (a) tweak the comment to "tidy 5×4
grid; further blocks may overlap and need a drag" — one-line fix,
matches the existing low-stakes posture; or (b) extend the cycle
(shift y down on each wrap, or jitter the position).

**Resolution (2026-05-22):** took option (a). The comment now reads
"Drop new blocks into a tidy 5×4 grid; the cycle wraps after 20, so
further blocks may overlap and need a drag." Behavior is unchanged
— a user past 20 blocks on the canvas is placing them deliberately
anyway, and the cycle extension wasn't worth the added math.

### 67. Function-block editor — type-mismatch on wire creation doesn't cancel pending *(deferred 2026-05-22)*

`html/tools/function-block-editor.html:913–916` — when the user
starts a wire from an output pin and clicks an incompatible-type
input pin, the status text explains the mismatch but `pending`
stays active so the user can retarget. Defensible UX (saves them
re-clicking the source pin).

**Why it matters:** filed so a future "fix" PR doesn't add a
`cancelWire()` call here thinking it's a bug. The behavior is
intentional.

**Priority:** LOW. Considered-and-accepted.

**Recommended action:** none.

**Decision (2026-05-22):** accepted as designed. The status text
explains the mismatch and `pending` stays active so the user can
retarget at a compatible input pin — saves them re-clicking the
source pin, which is the more common ergonomic mistake. Recording
the intent so a future "fix" PR doesn't add a `cancelWire()` here
thinking it's a bug; the canvas-empty-area click and the Escape
keystroke are the explicit cancel paths.

### 68. Function-block editor — no visible hint that keyboard Delete / Escape are bound *(addressed 2026-05-22)*

`html/tools/function-block-editor.html:1029–1038` binds Delete /
Backspace to remove the selected block or wire, and Escape to
cancel a pending wire. The "How it works" prose (lines 345–360)
documents both, and the inspector exposes a "Delete block" /
"Delete wire" button. But the *empty-state* inspector text
(lines 781–786 — "Select a block to edit its parameters, or a wire
to remove it. Click a palette block to add one.") doesn't mention
any key affordance.

**Why it matters:** mild discoverability gap. A user who didn't
read the "How it works" prose will miss the keyboard shortcuts.

**Priority:** LOW.

**Recommended action:** append a subtitle to the empty-state
inspector text ("Press Delete to remove · Escape to cancel a wire"),
or attach a key hint to the active-state Delete button.

**Resolution (2026-05-22):** appended a second `<p
class="fbe-insp-keys">Press Delete to remove · Escape to cancel a
wire.</p>` paragraph to the empty-state inspector in
`renderInspector()`. Styled in the page's `{% block head %}` CSS as
mono small-caps text (font-size 0.62rem, `--text-dim` colour,
opacity 0.85) so it reads as a quiet keyboard-hint subtitle rather
than competing with the primary empty-state prose. Only the
empty-state branch was changed — the wire-selected and block-
selected branches already expose a "Delete block" / "Delete wire"
button that documents the affordance.

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
