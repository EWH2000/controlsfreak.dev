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
- **Entries append at the tail of the file in number order regardless
  of status — the inline marker is the only authority.** The `## `
  headers further down are historical; open and resolved entries mix
  freely below them (see the continuation header before #185). Never
  classify an entry by the section it happens to sit under.

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

### 81. Light-theme accent tokens fail AA as foreground text across practice, chrome, and status pills *(addressed 2026-06-10)*

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

### 82. Palette ranking: title-prefix bonus outranks section relevance ("superheat" puts the calculator third) *(addressed 2026-06-10)*

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

### 83. No tool state survives a reload — preset-class selects could persist under the existing `cf_` convention *(addressed 2026-06-10)*

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

### 84. Static assets ship `max-age=0, must-revalidate` and nothing is version-busted *(addressed 2026-06-10)*

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

### 85. First paint is render-blocked by third-party Google Fonts CSS *(addressed 2026-06-10)*

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

### 86. `canonical`/`og:url` point through the `.html`→clean 307 *(addressed 2026-06-10)*

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

**Reopened + fixed (2026-07-07):** the revisit trigger fired. The
2026-07-06/07 Google Search Console export showed Google indexing *both*
the `.html` and the clean URL of the same page as separate results —
often ranking the clean (200) form better than the `.html` canonical
(e.g. `/tools/thermistor-calculator` pos 16.8 vs the `.html` pos 55.7;
`/tools/coil-sizing` pos 21 vs 64). Mechanism: canonical/`og:url`/sitemap
`<loc>` all carried the `.html` form, which Cloudflare Assets
`html_handling` 307-redirects to clean — so the declared canonical points
at a *redirecting* URL while the clean 200 URL disclaims itself, a
contradictory loop Google resolves by indexing both. Fix (Option A from
the recommended action): a `cleanCanonical` filter (`.eleventy.js`) strips
the trailing `.html`; `head.njk` applies it to canonical, `og:url`, and
every JSON-LD `url`/`@id` (paired `hasPart`/`isPartOf` ids included, so the
graph stays byte-consistent), and `sitemap.njk`'s `<loc>` renders clean.
Frontmatter `canonical` stays `.html` (single source of truth); internal
anchors + the client-side search index keep `.html`. The `PAGES` drift
test in `tests/smoke.spec.js` and `tests/screenshot-diagrams.mjs` were
updated to reconcile the clean sitemap against the local `.html` file
server. CLAUDE.md's convention bullet rewritten to match.

**Bing follow-on + fixed (2026-07-15):** the 2026-07-07 fix cleaned the
*rendered* signals (canonical/`og:url`/sitemap `<loc>`) but left two things
untouched: (1) the `.html` → clean redirect was still a **307** (temporary),
and (2) `.github/scripts/indexnow.mjs` still read the raw `canonical:`
frontmatter (`.html`) and submitted *that* to the IndexNow consortium. Bing
Webmaster then flagged "too many pages with identical titles / meta
descriptions" — the `.html` and clean form of each page — while Google stayed
quiet. Why the split: a 307 tells engines to *keep* the source URL, and Google
consolidated anyway via the now-clean canonical, but Bing is stricter **and**
IndexNow (Bing/Yandex/Seznam/Naver/Yep — not Google) was actively pinging Bing
to crawl the `.html` form, so Bing indexed both. Failing-URL list was pairs
(`/tools/thermistor-calculator.html` + `/tools/thermistor-calculator`, etc.).
Fix: `src/worker.js` intercepts the `html_handling` 307 and returns a **301**
(forwarding the binding's relative `Location` verbatim via a plain `Response` —
`Response.redirect()` throws on a relative URL), so engines consolidate on the
clean 200 URL and drop the `.html`; `indexnow.mjs` now strips `.html` to match
`cleanCanonical`/the sitemap. `tests/worker.spec.js` gains a 307→301 case.
Post-deploy: a one-off IndexNow submission of every page's `.html` form (bypassing
the now-clean script) to make Bing recrawl-and-consolidate the whole site rather
than wait for a scheduled crawl. The load-bearing half is the 301 — Part 2 alone
wouldn't fix it, since Bing keeps discovering `.html` via the site's own internal
anchors (kept `.html` by convention). CLAUDE.md's convention bullet + IndexNow
bullet updated to match.

### 87. smoke.spec.js serializes ~154 s of the suite's ~196 test-seconds into one worker *(addressed 2026-06-10)*

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

### 88. Tools nav dropdown sorts by slug while 13 of 14 labels read alphabetically *(addressed 2026-06-10)*

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

### 89. A fast 5/5 short quiz run silently overwrites a 10/10 full-run best *(addressed 2026-06-10)*

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

### 91. PID tuner chart y-axis is unconverted and unlabeled in metric *(addressed 2026-06-10)*

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

### 92. Nav `category` lives in two unlinked sources *(deferred 2026-06-14)*

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

### 94. Worker tests cover none of the security-critical contact paths (Turnstile fail-closed, hostname pin, validation, Resend) *(addressed 2026-06-16)*

*Severity: medium · Category: test-gap · Confidence: high* — `tests/worker.spec.js (whole file); untested branches in src/worker.js handleContact (Turnstile verify ~176/186, hostname pin, fetchWithTimeout catch, EMAIL_RE/413, Resend 502)`

The spec exercises the redirect-drift guard, 301, 405+Allow, cross-origin 403, honeypot 200, absent-Content-Length 411, and the asset cache matrix — but every security-load-bearing branch of handleContact is untested: the Turnstile fail-closed logic (verify.success !== true for {}, {success:null}, {success:"true"}, non-2xx), the hostname pin verify.hostname !== "controlsfreak.dev" (audit-2026-06 #34, the anti-token-replay defense), the fetchWithTimeout timeout/catch paths, EMAIL_RE/length-cap 400s, the 413 oversize path, and the Resend non-ok/catch 502s. The honeypot test short-circuits before those upstreams precisely because the env stub never stubs Turnstile/Resend (reaching them would throw). worker.spec.js already imports the ES-module worker node-side, and the worker calls bare fetch() (=globalThis.fetch), so the upstreams are stubbable.

**Impact.** The Worker's anti-abuse and validation logic — its only real attack surface — has zero automated coverage. A fail-open regression (e.g. relaxing the Turnstile gate to !== false, the exact mistake the code comment warns against, or dropping the hostname pin) would ship green.

**Suggested fix.** Stub globalThis.fetch to return controlled siteverify/Resend responses: assert fail-closed for {}/{success:null}/{success:"true"}/non-2xx and for hostname:"localhost"; assert a valid {success:true,hostname:"controlsfreak.dev"} + ok Resend yields 200; assert Resend non-2xx and a thrown fetch each give 502; add a 400 for a bad EMAIL_RE input and a 413 for an oversized Content-Length.

**Resolution (2026-06-16):** added 13 tests to `tests/worker.spec.js` covering every previously-untested branch. A `fetchStub({verify,verifyStatus,verifyThrows,resendStatus,resendThrows})` helper routes by upstream URL; `postContact()` swaps `globalThis.fetch` for the duration of one request and restores it in `finally`. Cases: happy path (valid verify + Resend ok → 200); Turnstile fails closed on `{}`/`{success:null}`/`{success:"true"}`/`{success:false}`/non-2xx/network-failure → 400; hostname pin rejects `hostname:"localhost"` → 400 (#34); Resend non-2xx and network-failure → 502; malformed email → 400 and oversize body → 413, each with a spy proving no upstream was contacted. All 19 worker tests pass locally (the worker's own `console.error` on its 502 paths is expected logging, not a failure).

### 95. wiring-engine.js has no engine-direct spec — most fault-classification branches are untested *(addressed 2026-06-16)*

*Severity: medium · Category: test-gap · Confidence: high* — `tests/ (no wiring-engine.spec.js); html/scripts/wiring-engine.js:198 (Wiring.evaluate), :186 (makeUF), fault branches ~245-490`

wiring-engine.js is a 542-line pure module exposing Wiring.evaluate(panel, state) -> {power, points, faults, cues} with a union-find net solver and a large fault tree: dead short, transformer phase-fight, reversed polarity, open common, no-hot/no-power, VA-budget overload, thermistor short/open + wrong-mode, unpowered 0-10V transmitter, dead 4-20mA loop, BI open, unpowered/floating actuator, BO no-return/no-power. It has module.exports = Wiring and is the exact vm-loadable shape already covered engine-direct for fbe/pid/psychro/units engines — but has NO dedicated spec. Its only coverage is two UI preset paths in smoke.spec.js:188-203 (ahu clean, broken-fuse dead short). The reversed/open-common/overload branches and the union-find merge logic are reachable nowhere in the suite, and the engine fails soft (no console error), so a logic regression produces no signal.

**Impact.** The site's most complex untested engine. A controls-fault logic regression (wrong net merge, fault-class mislabel, fuse/overload threshold drift) would not be caught by CI — the engine fails soft and the only smoke checks (short + clean) stay green.

**Suggested fix.** Add tests/wiring-engine.spec.js mirroring fbe-engine.spec.js (vm.runInNewContext(src + '\n; Wiring', {})): build minimal panels and assert power flags + fault ids per class — clean landing, dead short, reversed 24V/COM, open common, VA-budget overload — plus a union-find case where two terminals must (or must not) share a net.

*Merged from: wiring-engine + tests surfaces (same missing spec; the per-fault-mode list and the union-find/engine-API framing combine into one entry)*

**Resolution (2026-06-16):** added `tests/wiring-engine.spec.js` (13 tests, vm-direct, mirrors `fbe-engine.spec.js`). Covers: createDevice deep-copy + unknown-type null; catalog/controller shape; clean landing (powered, sensor ok, zero faults); dead short; reversed polarity (spark cue); open common; no-transformer warning; **union-find** transitivity (a thermistor return reaching COM only through a multi-hop wire chain reads `ok`, and removing the last hop flips it to `open` — proving the merge and its absence); thermistor wrong-mode and both-leads-short faults; and a **VA-budget threshold pair** (a fully-loaded panel at 32 VA runs clean, the same panel at 42 VA on a 40 VA transformer trips `overload` + blows the fuse). All 13 pass. New test file only — no `html/scripts/*` change, no version bump.

### 96. Crossing the 1240px gutter breakpoint re-inits the whole engine, rebuilding in-content flow pools and dropping setPathColor recolors *(addressed 2026-06-16)*

*Severity: medium · Category: bug · Confidence: high* — `html/scripts/flow-engine.js:241-247 (onGutterChange → init) feeding 249-252 (rebuilds ALL [data-flow], not just gutter)`

The gutterMql change handler calls full init() when the viewport grows past 1240px. init() re-runs buildPoolForEl on EVERY [data-flow] element document-wide, not just gutter ones. For an already-pooled in-content diagram, buildPoolForEl tears down its circles and recreates them with the engine DEFAULT fill (SUPPLY_FILL/RETURN_FILL/CURRENT_FILL). Any setPathColor() a page applied is wiped on a resize across the breakpoint and never re-applied (the page recolor runs once on DOMContentLoaded — see education/refrigerant-cycle-basics.html, which recolors rc-discharge/rc-liquid to var(--heat)). The rebuild also reseeds all particle offsets to i*step, so every in-content animated diagram visibly jumps. The header/docs sell init() as an idempotent no-op refresh; here it's a destructive full rebuild triggered by a passive resize.

**Impact.** Visible regression on a resize crossing 1240px: recolored particle streams (refrigerant-cycle-basics, any future setPathColor user) revert to default colors and all in-content flow animations snap to their seed positions.

**Suggested fix.** Scope the gutter-grow rebuild to gutter elements only — have onGutterChange call a buildGutterPools() that runs buildPoolForEl/buildPulsePathFor only on .schematic-bg [data-flow]/[data-pulse] elements, mirroring teardownGutterPools' scoping, so in-content pools and their setPathColor state survive the breakpoint.

**Resolution (2026-06-16):** added `buildGutterPools()` to `flow-engine.js` (the scoped mirror of `teardownGutterPools` — it calls `buildPoolForEl`/`buildPulsePathFor` only on `.schematic-bg [data-flow]`/`[data-pulse]`), and pointed `onGutterChange`'s grow path at it instead of full `init()`. In-content pools and their `setPathColor()` recolors + particle offsets now survive a resize across 1240px. Added a browser-driven regression test to `tests/flow-engine.spec.js` (refrigerant-cycle-basics' `var(--heat)` recolor must survive a 1000→1400px crossing) — **negative-tested**: it fails (received 0) against the old `init()` path and passes against the fix. Shared-script change → `package.json` patch-bumped 3.18.1 → 3.18.2 (and the lock with it via `npm version`).

### 97. fbe-engine: Infinity produced by a block is coerced to 0 at the next block's input, flipping downstream comparator verdicts *(addressed 2026-06-16)*

*Severity: low · Category: correctness · Confidence: high* — `html/scripts/fbe-engine.js:60 (asNum), :161 (mul), :169-172 (div guards only b===0), :448-449 (tick stores raw res.out); ref-note/fmt in html/simulators/function-block-editor.html:482-486 and :886`

asNum() rejects non-finite values and returns 0, but it is applied only to a block's inputs — evaluate() can still store a non-finite output. mul of two large constants (1e300*1e300), or div with a tiny non-zero divisor (the b===0 guard does not catch tiny-but-nonzero b), yields Infinity in b.out. Downstream that Infinity is read as the consumer's input and asNum silently turns it into 0. Verified: const(1e300)→mul(self)→gt vs const(5) gives gt=false (0>5), the mathematical opposite of true. This contradicts the DIVIDE comment and the page ref-note ('a downstream comparator stays sane instead of reading Infinity or NaN') — the guarantee holds only for an exact-zero divisor, not any overflow path. The source block's value strip shows '—' (fmt guards isFinite) while the comparator silently reads 0 — a display/logic split.

**Impact.** A graph that overflows to Infinity (reachable: the inspector accepts any finite number via parseFloat, so a user can set a constant to 1e300) makes a downstream comparator report the wrong boolean while the source shows '—'. Astronomically unlikely values, but a genuine logic inconsistency against a documented promise.

**Suggested fix.** Apply finite-coercion at the output boundary too: in tick() after `b.out = res.out || {}`, sanitize numeric outputs so a stored Infinity/NaN becomes 0, matching the asNum input contract and the ref-note's claim.

**Resolution (2026-06-16):** added a `sanitizeOut(out)` helper (mirrors `asNum`) and applied it at the tick output boundary — `b.out = sanitizeOut(res.out || {})` — so a stored Infinity/NaN becomes a finite 0. The source block's display and a downstream comparator now agree (both read 0) instead of the '—' / silent-0 split. Regression test in `tests/fbe-engine.spec.js`: const(1e300)→mul(self) stores `O === 0`, not a raw non-finite. Shipped with #98–#104 on `fix/engine-finite-guards` (one version bump, 3.18.2 → 3.18.3).

### 98. fbe-engine: PID derivative divides by dt with no guard — dt=0 yields NaN through the output *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/fbe-engine.js:316 (`const dPv = s.init ? (pv - s.prevPv) / dt : 0;`)`

The PID block computes the derivative as (pv - s.prevPv) / dt with no zero/finite guard on dt. A second tick with dt=0 produces OUT=NaN (NaN survives clamp(NaN,0,100)). The live page hard-codes DT=0.1 so this is dormant in the tool, but fbe-engine.js is documented as a reusable pure API (FBE.tick(graph, dt)) consumed like pid-engine/psychro-engine, and the project's own convention is to guard every numeric path with isFinite. A NaN OUT then propagates as 0 into any consuming block (via asNum) while the readout shows '—' — a silent inconsistency, and the div block already guards /0 with the same intent.

**Impact.** Any future caller (paused/single-frame integrator, unit test, Capacitor wrapper) that ticks with dt=0 gets NaN out of every PID block. Low because the only shipped caller hard-codes 0.1.

**Suggested fix.** Guard the divide: `const dPv = (s.init && dt > 0) ? (pv - s.prevPv) / dt : 0;` — matching the div block's own /0 defense.

**Resolution (2026-06-16):** applied exactly that guard (`s.init && dt > 0`). Regression test in `tests/fbe-engine.spec.js`: a PID ticked with dt=0 after establishing state keeps a finite, positive (reverse-acting) OUT rather than a NaN that #97's sanitizer would flatten to 0. Part of the `fix/engine-finite-guards` cluster.

### 99. wiring-engine: engine dereferences DEVICES[d.type].terminals with no guard — a malformed panel crashes the public Wiring.evaluate API *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/wiring-engine.js:316-317 (deviceOn)`

deviceOn() does `const def = DEVICES[d.type]; def.terminals.forEach(...)` with no check that def exists, and is called unconditionally from the BI/AO/BO passes in evaluate(). wiring-engine.js documents itself as a pure public solver exposed as window.Wiring.evaluate accepting an arbitrary {devices, wires} panel. A device whose type is not a DEVICES key throws TypeError: Cannot read properties of undefined (reading 'terminals'), aborting the whole evaluation (reproduced in Node). createDevice() correctly returns null for an unknown type, so the guard exists in one entry point and not the other.

**Impact.** Not reachable from controller-wiring.html today (the page only pushes createDevice() results and validated presets). But the engine is a documented standalone API; any future consumer or a corrupted persisted panel (were tool-state persistence added per #83) that passes an unknown device type gets a hard crash instead of a graceful skip.

**Suggested fix.** Filter devices to known types at the top of evaluate() (`const devices = (panel.devices||[]).filter(d => DEVICES[d.type])`) or guard each deref with `if (!def) return;` — cheap defense-in-depth consistent with createDevice()'s own null return.

**Resolution (2026-06-16):** filtered at the top of evaluate() — `const devices = (panel.devices || []).filter((d) => DEVICES[d.type])` — so an unknown-type device is dropped before any deref, matching createDevice()'s null contract. Regression test in `tests/wiring-engine.spec.js`: a panel with a `gremlin` device + a valid transformer no longer throws and still powers the controller. Part of the `fix/engine-finite-guards` cluster.

### 100. wiring-engine: clampPct lets NaN through — typeof check passes for NaN where isFinite would not *(addressed 2026-06-16)*

*Severity: low · Category: correctness · Confidence: medium* — `html/scripts/wiring-engine.js:522`

`const clampPct = (x) => Math.max(0, Math.min(100, Math.round(typeof x === 'number' ? x : 0)));` rejects non-numbers but not NaN: typeof NaN === 'number' is true, so clampPct(NaN) returns NaN, which an AO point renders as 'NaN%'. CLAUDE.md's JS-patterns section explicitly calls for !isFinite(x) over a type/NaN-prone check on numeric inputs. The page only feeds AO from +sld.value of a range input (always finite), so this is unreachable from the current UI, but evaluate() is a public API and the helper's intent is clearly to coerce bad input to 0.

**Impact.** No live failure from the page, but a malformed state.ao passed to public Wiring.evaluate would surface as a literal 'NaN%' readout instead of muting to 0%, against the site's validate-and-mute convention.

**Suggested fix.** Use isFinite: `const clampPct = (x) => { const n = Math.round(x); return isFinite(n) ? Math.max(0, Math.min(100, n)) : 0; };`.

**Resolution (2026-06-16):** replaced the typeof check with the isFinite form above. Regression test in `tests/wiring-engine.spec.js`: a powered actuator panel evaluated with `state.ao.ao1 = NaN` now reports the AO point as `'0%'`, not `'NaN%'`. Part of the `fix/engine-finite-guards` cluster.

### 101. pid-chart: formatPidDelta emits a misleading '-0.0' for small-negative deltas that round to zero *(addressed 2026-06-16)*

*Severity: low · Category: bug · Confidence: high* — `html/scripts/pid-chart.js:217-223 (formatPidDelta, sign at line 221)`

formatPidDelta computes `const sign = display > 0 ? '+' : ''` then `${sign}${display.toFixed(dec)}`. When the canonical delta is a small negative that rounds to zero at the formatter's precision, display < 0 so no '+' is prepended but display.toFixed(1) still renders '-0.0'. Reproduced end-to-end: simulatePid(PID_PROC.med, 1, 2, 0) yields ssErr≈-0.0003, and an ordinary Kc/rep slider grid on the med loop lands ssErr in (-0.05, 0) in 35/96 cells, each printing '-0.0 °F'. pid-basics flips the sign (-sim.ssErr) and hits the same case from the other side. Both PID surfaces (simulators/pid-tuner.html and education/pid-basics.html) are affected; the metric path too, since the delta is a scalar conversion.

**Impact.** Both PID surfaces can display a negative-zero steady-state error ('-0.0 °F' / '-0.0 in. w.c.'), which reads as a real signed offset and is internally contradictory (a leading minus on a zero magnitude). Reachable with normal slider positions.

**Suggested fix.** Normalize negative zero before formatting: round to display precision first, then choose the sign treating a rounded 0 as unsigned — `const rounded = +display.toFixed(dec); const sign = rounded > 0 ? '+' : ''; return `${sign}${rounded.toFixed(dec)} ${pidUnit(procKey)}`;`.

**Resolution (2026-06-16):** applied the round-then-sign fix (`+display.toFixed(dec)` collapses a small-negative to -0, which `Number.toFixed` renders unsigned as '0.0'). New `tests/pid-chart.spec.js` (vm-direct, `window`-stub for the US display path): `formatPidDelta(-0.0003, {dec:1}, 'med') === '0.0 °F'`, and genuine signed deltas keep their sign. Part of the `fix/engine-finite-guards` cluster.

### 102. pid-chart: drawPidChart dereferences getContext('2d') without a null guard while guarding everything else *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/pid-chart.js:59-60`

drawPidChart guards !canvas || !sim, zero-size canvas, and degenerate plot area, but line 59 does `const ctx = canvas.getContext('2d');` and line 60 immediately calls ctx.setTransform(...) with no null check. getContext('2d') returns null if a different context type was already acquired or under OOM/disabled-canvas conditions, which would throw mid-draw and abort the calling page IIFE. The same unguarded getContext('2d')+setTransform pattern exists in staging-sequencer.html and psychrometric-chart.html — it's effectively the site-wide convention for these canvases — so this is the one unguarded deref in an otherwise defensive routine, low impact in practice (2d-only freshly-created canvases).

**Impact.** Low — these canvases are 2d-only and fresh — but a throw here propagates out of runPidSim/runMini and breaks the page's slider wiring for the rest of the session.

**Suggested fix.** Add `if (!ctx) return;` immediately after `const ctx = canvas.getContext('2d');`, matching the file's existing early-return guard style.

**Resolution (2026-06-16):** added `if (!ctx) return;` right after the `getContext('2d')` call, matching the routine's other early-return guards. No automated test (a null 2D context isn't reproducible in the node/vm harness) — verified by inspection; it's a one-line defensive early return. Part of the `fix/engine-finite-guards` cluster.

### 103. psychro-engine: dewPointFromVapPress silently caps at 250 °F for vapor pressures above satPress(250) *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/psychro-engine.js:100-108`

dewPointFromVapPress bisects on the fixed bracket [-148, 250]. For any pw > satPress(250) ≈ 29.85 psia the loop never moves hi down and returns ~250 with no out-of-range signal (verified dewPointFromVapPress(40) === 250). The function guards the low end (pw<=0 → -Infinity) but not the saturated upper end. At/below standard sea-level pressure this is unreachable (pw can't exceed P_STD = 14.696, dewPoint(14.696) = 211.95 < 250) and pressFromAltitude only lowers P, so the psych tools are safe today. But the function is a flat top-level primitive the header advertises for direct reuse (coil sizing, economizer), which could pass a higher-pressure pw.

**Impact.** Defensive only for current consumers. The risk is a future high-pressure caller getting a silently-clamped 250 °F dew point that looks plausible rather than an out-of-range signal.

**Suggested fix.** Widen the upper bound to cover the documented pressure range, or detect the saturated bracket: after the loop, if satPress(hi) < pw return Infinity (mirroring the pw<=0 → -Infinity convention) so callers' existing isFinite guards catch it.

**Resolution (2026-06-16):** added an explicit upper-ceiling guard *before* the bisection — `if (pw > satPress(250)) return Infinity;` — rather than a post-loop `satPress(hi) < pw` check, which a converged bracket could trip by a float epsilon on a valid pw. Mirrors the pw<=0 → -Infinity low end. Regression test in `tests/psychro-engine.spec.js`: a pw above `satPress(250)` returns Infinity, a normal pw stays finite, pw<=0 still returns -Infinity. Part of the `fix/engine-finite-guards` cluster.

### 104. units.js: Units.convert / toCanonical silently no-op for massFlow (no Q entry, no toCanonical entry) *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/units.js:146-160 (Q table) and 174-188 (toCanonical) vs 100-104,123,141 (massFlow defined for suffix/display only)`

massFlow is intentionally display-only (suffix + display) per the inline comment — coil-sizing derives it as a readout — so there is no Q.massFlow and no toCanonical.massFlow. The trap is the failure mode: convert(value, from, to, 'massFlow') hits `if (!q) return value;` and returns the value unchanged with no warning, and toCanonical.massFlow is undefined (calling it would throw). A future page that wires a mass-flow field through convert() (the standard input-rewrite pattern) would silently leave the value unconverted on a units toggle — a wrong-number bug with no console signal. ui.js warns on missing targets elsewhere, so convert()'s silent no-op is inconsistent with the codebase idiom. Note: units-engine.spec.js asserts massFlow is the one display-only quantity, so a naive future addition would trip the test.

**Impact.** No current bug (massFlow is only used via suffix/display in coil-sizing). Latent silent-wrong-result risk if mass flow ever becomes a convertible input and the author follows the existing convert() rewrite pattern.

**Suggested fix.** Either add Q.massFlow + toCanonical.massFlow for symmetry, or make convert()'s unknown-quantity branch `console.warn('Units.convert: no conversion for "'+quantity+'"')` so a missing quantity surfaces instead of returning the raw value. The warn is the cheaper guard and matches ui.js's warn-on-missing patterns.

**Resolution (2026-06-16):** took the console.warn path (the cheaper option that doesn't trip `units-engine.spec.js`'s "massFlow is the one display-only quantity" assertion the way adding a Q entry would). `convert()`'s unknown-quantity branch now warns before returning the value unconverted. Regression test in `tests/units-engine.spec.js` (loadUnits extended to inject a `console` spy): converting a `massFlow` value returns it unchanged AND emits a warning naming the quantity. The warn never fires today — massFlow is suffix/display-only. Part of the `fix/engine-finite-guards` cluster.

### 105. copyText double-click race can leave the copy button stuck on 'copied!' *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/ui.js:92-103`

The only re-entrancy guard is `if (!text || btn.classList.contains('copied')) return;` checked synchronously at entry, but the `copied` class addition and `orig = btn.textContent` capture happen inside the navigator.clipboard.writeText(...).then(...) callback (after a microtask boundary). A second click landing after click 1 but before its promise resolves passes the guard and queues a second writeText. When the two .then() callbacks run in order, the second captures orig='copied!' (set by the first); its ~1800ms timeout then reverts textContent to 'copied!', leaving the button permanently labeled 'copied!' until the next click. All copy buttons site-wide route through this single function.

**Impact.** On a fast double-click of any copy button (Copy IP, Copy readouts), the label can get stuck on 'copied!' and never revert. Cosmetic but sticky; recovery needs another successful copy after the class clears. Low — needs a rapid double-click.

**Suggested fix.** Add the `copied` class and capture `orig` synchronously right after the guard, restore only inside the timeout (so the entry guard sees `copied` immediately and the second click is a clean no-op), and revert the class in a .catch() so a clipboard rejection doesn't latch the button.

**Resolution (2026-06-16):** capture `orig` and add the `copied` class SYNCHRONOUSLY (before the async writeText), so a fast second click sees `copied` at the entry guard and no-ops — no second writeText, no callback capturing orig='copied!'. The `.catch()` removes the class (unlatch on a blocked clipboard). Refined slightly from the literal suggestion: the 'copied!' TEXT flips on success only, so a blocked clipboard doesn't show a false 'copied!' flash. Deterministic regression test in `tests/copy-button.spec.js` (drives `window.copyText` with a stubbed pending writeText, double-clicks → exactly one write fires, button reverts) — negative-tested: the old code fires two writes and sticks. Shipped on `fix/copy-button-race` (version bump 3.18.6 → 3.18.7).

### 106. fullscreen-toggle: ESC-exit hardcodes '.tool-card.is-fullscreen' while the opt-in target selector is configurable *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/fullscreen-toggle.js:62-65 (exitActive) vs 36-39 (targetFor)`

targetFor() resolves the fullscreen target from the button's data-fullscreen-target selector (any selector) and setState toggles has-fullscreen-tool on <body> based on that arbitrary target, but exitActive() — the ESC exit path — queries the fixed selector .tool-card.is-fullscreen. If a future page opts in with a non-.tool-card target (which targetFor supports and the header frames as selector-driven), ESC finds nothing to exit: is-fullscreen stays on the element and has-fullscreen-tool stays on <body>, locking the page in fullscreen with no keyboard exit. Both current opt-ins (psychrometric-chart, function-block-editor) use .tool-card, so it is latent. Note the CSS also hard-codes .tool-card.is-fullscreen, so the JS targetFor() over-promises flexibility the CSS doesn't honor.

**Impact.** Latent. No live page affected. Becomes a real ESC-doesn't-work / stuck-fullscreen bug only if someone adds a non-tool-card fullscreen target.

**Suggested fix.** Make exitActive() exit whatever is actually fullscreen — `document.querySelectorAll('.is-fullscreen').forEach(t => setState(t, false));` — or track the active target in a module variable set by setState. Alternatively assert/document that data-fullscreen-target must be .tool-card.

**Resolution (2026-06-16):** exitActive() now does `document.querySelectorAll('.is-fullscreen').forEach((t) => setState(t, false))` — it exits whatever is actually fullscreen regardless of tag/class, so a future non-.tool-card target stays reachable by ESC. Identical to the old behavior for current .tool-card opt-ins. Regression test in `tests/fullscreen-toggle.spec.js`: enter fullscreen on a synthetic `<section>` via `window.Fullscreen.toggle`, press Escape → it exits and `body.has-fullscreen-tool` clears (the old fixed selector left it stuck). Shipped on `fix/fullscreen-esc-exit` (version bump 3.18.7 → 3.18.8). NOTE the CSS still styles `.tool-card.is-fullscreen` only, so a non-.tool-card opt-in would need its own fullscreen CSS — but ESC exit is no longer broken.

### 107. controller-wiring: spark cue re-fires on every refresh() — no edge-detection, unlike the blown-fuse cue *(addressed 2026-06-16)*

*Severity: low · Category: bug · Confidence: high* — `html/simulators/controller-wiring.html:905-908`

The comment reads 'cues — fire only on a fresh failure', but only the blown-fuse cue is edge-detected (if (blown && !lastBlown) fireBlownFuse). The spark cue fires on EVERY refresh() with no lastSpark analog. In the engine cues.spark is populated only in the reversed power branch (wiring-engine.js:280). refresh() runs on every control change AND on the 2.5s cosmetic-drift interval (when a therm10k drifts). So a panel left in a reversed-power state that also contains a thermistor re-sparks at the 24V~ terminal every 2.5s indefinitely — a flashing artifact on a static circuit. reduceMotion suppresses it.

**Impact.** A reversed-power panel that happens to include a thermistor produces an endless repeating spark animation with no user action — visually noisy and contradicts the stated 'fire only on a fresh failure' intent. Minor; needs the reversed state to persist with a thermistor present.

**Suggested fix.** Edge-detect the spark cue like the fuse: track the previous spark set (a serialized key of res.cues.spark) and only fireSpark for terminals newly in the set this evaluation, or only fire sparks on user-initiated refreshes, not the cosmetic tick.

**Resolution (2026-06-16):** added a `lastSpark` array (reset in resetState alongside `lastBlown`) and fire only for terminals NEWLY in `res.cues.spark` — `sparkNow.forEach(t => { if (lastSpark.indexOf(t) === -1) fireSpark('ctlr', t); })` — so a persistently reversed-power panel no longer re-sparks on every refresh()/2.5s drift tick. Page-level inline script (no version bump). Behavioral animation-firing isn't covered by a dedicated test (the smoke test confirms the page + engine presets still load clean); verified by inspection. Shipped on `fix/controller-wiring-defects` with #108/#109.

### 108. controller-wiring: device drag y-clamp reserves a fixed 40px height for variable-height device cards *(addressed 2026-06-16)*

*Severity: low · Category: bug · Confidence: medium* — `html/simulators/controller-wiring.html:719-720`

The drag move handler clamps with `d.y = clamp(oy + dy, 0, NUM.height - 40)` and `d.x = clamp(..., 0, NUM.width - 146)`. The 146 reasonably reserves the 144px card width, but the 40 is a fixed reservation that doesn't match real card heights — a card grows with its terminal count + caption (the 0-10V actuator has 4 terminal rows + caption, rendering ~136px). So a tall card can be dragged until only its top edge is at y=620, leaving most of it below the 660px canvas-inner. The x-axis is clamped to actual card width; the y-axis is not.

**Impact.** Cosmetic only — .cw-canvas has overflow:auto so an overhanging card is reachable by scrolling and the wire layer follows. But the clamp is asymmetric (width-aware, height-blind), so tall devices can be dragged largely out of the visible inner area in a way short ones cannot.

**Suggested fix.** Measure the card height once (el.offsetHeight) at drag start and clamp y to NUM.height - height, mirroring the width clamp; or reserve a realistic per-type height.

**Resolution (2026-06-16):** measure `el.offsetHeight` once at drag start and clamp `d.y` to `NUM.height - ch`, so a tall card (e.g. the 0-10V actuator, ~136px) can no longer be dragged most of the way off the canvas. The x-clamp's existing `NUM.width - 146` already reserved the real width. Part of `fix/controller-wiring-defects`.

### 109. controller-wiring: cosmetic-drift setInterval not gated to desktop and never pauses on tab-hide (backgrounded-tab idle work) *(addressed 2026-06-16)*

*Severity: low · Category: perf · Confidence: high* — `html/simulators/controller-wiring.html:1118-1127`

The cosmetic-drift window.setInterval(...,2500) is gated only by !reduceMotion, with no clearInterval, no visibilitychange pause, and no matchMedia('(min-width:1000px)') JS gate. Its function-block-editor sibling — gated by the same commit — does all three (desktopMQ gate, visibilitychange stop, MQ-change re-arm). The mobile case is a documented non-issue (the bench is hidden, panel.devices stays empty, so refresh() never runs — accepted in site-ideas-and-friction.md). The genuinely-unhandled, in-scope case is the BACKGROUNDED DESKTOP tab: with a therm10k placed (bench visible), backgrounding the tab keeps a full evaluate()+drawWires() pass running every 2.5s — the idle work the FBE avoids via its visibilitychange handler.

**Impact.** On a desktop tab with a thermistor present, backgrounding the tab keeps a full evaluate()/drawWires() pass running every 2.5s — wasted wakeups, worse on battery. Low absolute cost; an asymmetry the companion commit deliberately avoided on the FBE sibling.

**Suggested fix.** Pause the drift interval on document.visibilitychange when document.hidden (mirroring the FBE posture). Store the handle so it can be cleared and re-armed on un-hide. The mobile path is acceptable as-is per the documented rationale.

**Resolution (2026-06-16):** stored the interval handle and added a `visibilitychange` listener — `document.hidden` clears it, visible re-arms it; it also doesn't start while initially hidden (a background-tab open), matching the FBE sibling's posture. A backgrounded desktop tab with a thermistor placed no longer runs a full evaluate()+drawWires() every 2.5s. Mobile path unchanged (documented non-issue). Part of `fix/controller-wiring-defects`.

### 110. function-block-editor: sim loop runs in a backgrounded tab on initial load (visibilitychange only fires on change) *(addressed 2026-06-16)*

*Severity: low · Category: bug · Confidence: high* — `html/simulators/function-block-editor.html:1131-1135 (startLoop), :1254-1257 (visibilitychange), :1269 loadExample → :1166 setRunning(true)`

startLoop() guards on tickHandle and desktopMQ.matches but never checks document.hidden. The documented 'pause in a backgrounded tab' posture is implemented only via the visibilitychange handler, which fires on a transition, not on initial load. When the page is opened directly into a background tab (Ctrl/middle-click), loadExample('econ') runs at IIFE end → setRunning(true) → startLoop(), starting a 10 Hz setInterval immediately in a hidden tab. It won't pause until the first visibility transition. The intent (zero idle work while hidden) is defeated for the entire pre-focus lifetime.

**Impact.** A page opened in a background tab spins FBE.tick + refreshValues at 10 Hz (DOM class churn over every block pin and wire) until first focus. Browsers throttle background timers so the practical cost is modest, but it contradicts the stated design.

**Suggested fix.** Bail when hidden: add `if (document.hidden) return;` at the top of startLoop (alongside the desktopMQ guard). The visibilitychange handler already restarts the loop on un-hide via `else if (running) startLoop()`, so this makes the hidden-tab case correct on both initial load and transitions.

**Resolution (2026-06-16):** added `if (document.hidden) return;` to startLoop (after the desktopMQ guard). A page opened directly into a background tab no longer spins the 10 Hz loop from loadExample() until first focus; the visibilitychange handler's `else if (running) startLoop()` arms it on un-hide. Page-level inline script (no version bump). Shipped on `fix/fbe-page-lifecycle` with #111.

### 111. function-block-editor: refreshValues reassigns class on every wire and pin every tick (10 Hz) even when unchanged *(addressed 2026-06-16)*

*Severity: low · Category: perf · Confidence: medium* — `html/simulators/function-block-editor.html:840-883 (refreshValues), :881 setAttribute('class'), :853 classList.toggle`

refreshValues() runs on every tick (10 Hz). It walks every block's pins (classList.toggle) and rebuilds + reassigns the full class string on every wire's visible <path>, plus does a graph.blocks.find() per wire and a pinKind() lookup that does another graph.blocks.find() — so the per-tick cost is O(wires × blocks). For a number wire the class is invariant yet re-set 10×/s. Reassigning an identical class does not restart the CSS animation (which keys off .fbe-running on the canvas ancestor), so correctness is fine — this is purely avoidable work.

**Impact.** Negligible on the shipped graphs (≤9 blocks, ≤11 wires); the only per-tick O(n²) in the hot path. Would matter only on a large user-built sheet.

**Suggested fix.** Build a byId map once in refreshValues instead of graph.blocks.find() per wire/pinKind, and skip setAttribute when the computed class string equals the current one (cache the last class on the wire object).

**Resolution (2026-06-16):** refreshValues now builds a `byId` lookup once per tick (used for the wire's source block), folds the kind lookup inline off `byId` (the old `pinKind()` did its own `graph.blocks.find` — removed, it had no other caller), and writes a wire's class only when it changed (`w._lastCls` cache) — so a steady graph stops re-setting an identical class string on every wire at 10 Hz. Verified by the fbe behavioral smoke test (value strips + wire colors still update). Part of `fix/fbe-page-lifecycle`.

### 112. flow-engine: in-flight pulses and pulsePaths registrations on gutter motifs survive teardownGutterPools *(addressed 2026-06-16)*

*Severity: low · Category: bug · Confidence: medium* — `html/scripts/flow-engine.js:421-434 (teardownGutterPools handles flow pools only); pulse-path defs at html/_includes/schematic-bg.njk`

teardownGutterPools tears down flow POOLS for .schematic-bg elements but never touches pulse state. When the viewport shrinks below 1240px: (1) any activePulses whose el is inside .schematic-bg keep ticking in tickPulses (pulse.el.isConnected is still true under display:none), so getPointAtLength/setAttribute keep running on a hidden SVG until each pulse self-retires (~1-2s); (2) the pulsePaths Map entries and their pulseIO.observe registrations for gutter elements are never removed, persisting for the page lifetime. Auto-fire is correctly suppressed afterward (a display:none el isn't in visiblePulseEls), so this is churn-on-teardown + a bounded registration leak (buildPulsePathFor re-registers via Map.set on re-entry, so it doesn't grow per cycle) — an asymmetry with the carefully-scoped flow-pool teardown the same audit motivated. Contributing cause: buildPulsePathFor lacks the gutterHidden guard buildPoolForEl carries.

**Impact.** Brief wasted main-thread work (circle position writes on a display:none gutter) for ~1-2s after the viewport crosses below 1240px, plus stale pulseIO observations retained for the page lifetime. Minor; bounded.

**Suggested fix.** In teardownGutterPools, also retire in-flight gutter pulses (iterate activePulses backwards; if pulse.el.closest('.schematic-bg'), remove its circles and splice) and drop gutter pulsePaths entries with pulseIO.unobserve(el)+pulsePaths.delete(el). buildPulsePathFor re-registers them on the next gutter-grow init().

**Resolution (2026-06-16):** teardownGutterPools now also retires in-flight pulses on `.schematic-bg` motifs (remove circles + splice from activePulses) and drops their pulsePaths entries (`pulseIO.unobserve` + `visiblePulseEls.delete` + `pulsePaths.delete`). Added the missing `gutterHidden(el)` guard to buildPulsePathFor (the contributing cause), mirroring buildPoolForEl; buildGutterPools re-registers gutter pulses on the next grow. Shipped on `fix/flow-engine-lifecycle` with #113 (one version bump, 3.18.5 → 3.18.6).

### 113. flow-engine: rAF loop runs forever and never self-suspends even with zero animatable work *(addressed 2026-06-16)*

*Severity: low · Category: perf · Confidence: medium* — `html/scripts/flow-engine.js:259-297 (frame always re-schedules at line 295)`

Once frameStarted is set, frame() unconditionally calls requestAnimationFrame(frame) every frame for the page lifetime; frameStarted is never reset and cancelAnimationFrame is never used. When all pools have scrolled offscreen (visibleFlowEls empty), all pulse paths are offscreen, and activePulses is empty, the loop still wakes every frame to iterate pools checking isConnected/visibility and run tickPulses' pulsePaths.forEach. On a long page scrolled past all diagrams, or after teardownGutterPools leaves pools.length==0, the engine still costs one rAF callback per frame. The audit gating skips per-particle work but not the loop itself.

**Impact.** A small constant per-frame cost (Map/array iteration, visibility checks) that never drops to zero even when nothing can animate. Negligible per frame but continuous; rAF auto-pauses in backgrounded tabs, so the residual is bounded.

**Suggested fix.** Pause the loop when there's no work: if pools.length==0 && activePulses.length==0 && no visible pulsePaths after a tick, stop re-scheduling and reset a frameStarted-style flag so the next IO 'intersecting' callback or firePulse/init restarts it. Lower priority than the breakpoint-rebuild bug; document as a known hot-path note if not fixed.

**Resolution (2026-06-16):** implemented the suspend rather than just documenting it. Split the dual-use `frameStarted` into `frameStarted` (the init-once / reduced-motion gate firePulse et al. check — unchanged) and a new `looping` flag. A `hasWork()` predicate (any in-flight pulse, any visible flow pool with particles, or any visible auto-firing pulse path) gates the loop: `frame()` stops re-scheduling when `!hasWork()`, and `startLoop()` restarts it from every resume path — the flow/pulse IO 'intersecting' callbacks, `firePulse()`, `init()`, and `buildGutterPools()`. Regression test in `tests/flow-engine.spec.js` pins the load-bearing risk (the IO-gated startLoop never firing): a visible diagram's particle measurably moves over 350 ms. Part of `fix/flow-engine-lifecycle`.

### 114. quiz-engine: a first quiz run celebrates 'new best' and stores a record even at a score of 0 *(addressed 2026-06-16)*

*Severity: low · Category: correctness · Confidence: high* — `html/scripts/quiz-engine.js:642-662`

On the very first finish there is no stored best, so prevBestTotal is NaN and prevBestRatio is set to -1. longEnough becomes true (!isFinite(prevBestTotal)) and curRatio (>= 0) is always > -1, so isNewBest is true for ANY first run — including 0/10. The engine writes best=0 / best_total=10 and renderResults() shows the '· new best' tag for a zero-correct run; paintBest renders 'Best: 0 / 10'. Subsequent runs correctly compare against that 0/N record (a later run with curRatio>0 supersedes it via the #89 ratio comparison), but the first-run experience celebrates a failing score as a 'new best'.

**Impact.** Minor UX/correctness oddity: the first attempt at any quiz, even all-wrong, is announced as a personal best and persisted. Not data-corrupting, but the celebration semantics are wrong for a 0-score baseline.

**Suggested fix.** Gate the new-best on a non-trivial score — only treat a first run as a best when score > 0 (or compare curRatio > prevBestRatio only when prevBestRatio >= 0, treating the no-prior case as 'store silently, don't celebrate'). Distinct from the closed #89 (short-vs-longer overwrite); #89's !isFinite short-circuit is in fact what makes the first run unconditionally longEnough.

**Resolution (2026-06-16):** restructured the best-record check around `hasPrior = prevBestRatio >= 0`. With no prior record the run is a "best" only when `score > 0` — a 0/N baseline is no longer celebrated or persisted. The #89 longer-run/ratio comparison (`longEnough && beatsRecord`) is unchanged for the has-prior path. Shipped on `fix/quiz-engine-guards` with #115–#118 (one version bump, 3.18.3 → 3.18.4). Behavioral regression test (first all-wrong run → no `· new best`, no stored record) lands with the quiz test-gap pass (#124).

### 115. quiz-engine: stored best can become permanently unbeatable if a bank shrinks below the recorded best_total *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/quiz-engine.js:652-657`

The #89 longer-run guard is `longEnough = !isFinite(prevBestTotal) || total >= prevBestTotal`. If a user records best 10/10 and the bank is later edited down to 8 questions, then 'All' runs cap at total=8 < prevBestTotal=10, so longEnough is always false and no run can ever beat or repair the record. The Best readout shows '10 / 10' indefinitely against a quiz that now maxes at 8; the only escape is Reset best (which storeDel's bestTotal and re-enables the !isFinite branch). This is the converse failure mode that the #89 fix newly introduces, mentioned nowhere in #89, the engine header, or the trackers.

**Impact.** Edge case tied to an editorial bank-shrink (rare), but it leaves a stale, unbeatable best that misrepresents the current quiz length until the user manually resets. Self-inflicted only by a bank size reduction.

**Suggested fix.** When the current run's total is below the stored best_total AND equals the full bank length (state.count === 'all' && total === questions.length), treat the stored best as stale — clamp/repair the record or allow the full-bank run to set a new best. At minimum document the bank-shrink hazard in the engine header next to the #89 note.

**Resolution (2026-06-16):** added `staleRecord = hasPrior && total === questions.length && prevBestTotal > questions.length` — a stored best_total larger than the whole current bank can never be matched again, so a full-bank run with a non-zero score repairs it (escapes the #89 longer-run lock) instead of leaving the record permanently unbeatable. Part of `fix/quiz-engine-guards`.

### 116. quiz-engine: numericInput inputmode attribute is never reset between questions *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/quiz-engine.js:252-258,391-393`

The shared numericInput is created once with inputmode='decimal' and reused across all questions/restarts. showQuestion() only sets inputmode when the current question declares one (`if (q.inputmode) numericInput.setAttribute('inputmode', q.inputmode)`) — it never clears it, and the per-question reset block undoes value/disabled/classes but not the attribute. So once a question with inputmode:'numeric' is shown, every subsequent numeric question that omits inputmode keeps the stale 'numeric'. The header schema documents 'default decimal', which the code breaks. No current bank sets inputmode, so it is latent — the same state-leak class as the audit-2026-06 #19 fix targeted for disabled/tint.

**Impact.** Latent: the moment a bank ships an inputmode:'numeric' question alongside a default-decimal one, mobile keyboards for later questions inherit the wrong mode. Not user-visible today.

**Suggested fix.** Always set the attribute deterministically in showQuestion()'s numeric branch: `numericInput.setAttribute('inputmode', q.inputmode || 'decimal');`.

**Resolution (2026-06-16):** applied exactly that — `numericInput.setAttribute('inputmode', q.inputmode || 'decimal')` runs every numeric question, so a stale `'numeric'` from an earlier question can't stick on a later default-decimal one. Latent today (no bank sets inputmode). Part of `fix/quiz-engine-guards`.

### 117. quiz-engine: choice id uniqueness within a question is never validated; reveal() marks by data-choice-id *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: medium* — `html/scripts/quiz-engine.js:106-117,540-541,562-563`

validateQuestion() checks choices.length >= 2 and exactly-one-correct but never that choice ids are unique within the question, nor that each choice has an id/text. submit() records given = sel.getAttribute('data-choice-id') and reveal()'s wrong-highlight matches by attribute equality, so two choices sharing an id would both highlight 'wrong' on a miss and make the miss ambiguous; a choice missing text renders the literal string 'undefined'. Selection itself is identity-based (b === btn) so it still works. All current banks use unique a/b/c/d ids with text (verified across 21 banks / 151 choices — zero violations), and quiz-banks.spec.js doesn't cover it either.

**Impact.** Latent content-defect class: a malformed choice (duplicate id, missing text/id) ships without a build or test failure and renders/scoring-highlights incorrectly. Affects only the reveal highlight and miss-list.

**Suggested fix.** Add per-choice id/text presence + within-question id-uniqueness checks to validateQuestion(), and mirror them into quiz-banks.spec.js so a bad bank fails the build/test rather than just at mount. Cheap: build a Set of choice ids and assert size === choices.length and every choice has truthy id and text.

**Resolution (2026-06-16):** added the per-choice id/text presence + within-question id-uniqueness checks to `validateQuestion()` (mcq/gotcha case) AND mirrored them into `tests/quiz-banks.spec.js`, so a malformed choice now fails node-side across every bank rather than only at mount on the questions a run happens to draw. All current banks pass. Part of `fix/quiz-engine-guards`.

### 118. quiz-engine: dead/unused mapped index in the results miss-list *(addressed 2026-06-16)*

*Severity: low · Category: dead-code · Confidence: high* — `html/scripts/quiz-engine.js:695-697,711`

renderResults() builds the miss list with `.map(function (a, i) { return { a: a, i: i }; })` capturing the original index as pair.i, but the subsequent forEach only ever reads pair.a (and pair.a.qi) — pair.i appears nowhere else and is never used. The map wrapper is vestigial; the same result comes from `state.answers.filter(a => !a.correct)`. (Note pair.i is the position in possibly-shuffled state.answers, so it wouldn't cleanly map to a stable 'Question N' anyway.)

**Impact.** None functional — purely dead scaffolding. Minor maintenance noise.

**Suggested fix.** Drop the wrapper (`const misses = state.answers.filter(a => !a.correct);` and adjust the forEach to take the answer directly), or actually surface a numbered miss row. Pick one rather than carrying the unused field.

**Resolution (2026-06-16):** dropped the wrapper — `const misses = state.answers.filter(a => !a.correct)` and the forEach now takes the answer directly. Pure cleanup, no behavior change. Part of `fix/quiz-engine-guards`.

### 119. search.js: index-fetch failure is silent and never retried — palette permanently empty after one bad response *(addressed 2026-06-16)*

*Severity: low · Category: robustness · Confidence: high* — `html/scripts/search.js:66-74 (load) and 67 (the `if (entries) return` short-circuit)`

load() sets entries to [] on both failure modes (non-200 → r.ok false → []; network error → .catch → []). Because [] is truthy, the next open() hits `if (entries) return Promise.resolve(entries)` and never re-fetches — the failed fetch is cached for the page lifetime. rank() over [] returns nothing, so render() shows the generic 'No matches' with no error signal. A transient failure (CF cold-start, flaky mobile radio, a deploy mid-flight) silently disables search for the rest of the session until a full reload.

**Impact.** A single transient failure on first open silently disables search for the rest of the page session — the user gets 'No matches' for real queries with no signal that the index didn't load, which reads as the site simply having nothing.

**Suggested fix.** Distinguish 'loaded empty' from 'failed to load': on failure leave entries null (reset loading=null in .catch) so the next open() retries, and/or surface a one-line status ('Search index unavailable — retry') instead of the generic 'No matches'.

**Resolution (2026-06-16):** load()'s catch now leaves `entries = null` and clears `loading = null` so the next open() re-fetches, and sets a `loadFailed` flag so render() shows 'Search index unavailable — reopen to retry' instead of the misleading 'No matches'. A successful load clears the flag. Regression test in `tests/nav-search.spec.js` (route-abort the first index fetch → 'unavailable' status; reopen → results load). Shipped on `fix/search-palette-guards` with #120/#121 (one version bump, 3.18.4 → 3.18.5).

### 120. search.js: mousemove over results calls scrollIntoView on every hover, fighting the cursor *(addressed 2026-06-16)*

*Severity: low · Category: perf · Confidence: high* — `html/scripts/search.js:280-283 (mousemove) → 146-153 (setActive)`

The list 'mousemove' listener calls setActive(index) on every mouse-move event over the results. setActive unconditionally runs opts[n].scrollIntoView({ block: 'nearest' }) for the newly-active row with no i===active early-return guard. On a result list tall enough to scroll (.palette-box max-height: 70vh, .palette-results overflow-y: auto), moving toward a partially-clipped edge row triggers a programmatic scroll that shifts that row under the cursor, which can fire another mousemove and another scroll. scrollIntoView is a layout-forcing call run per mousemove. MAX_RESULTS=8 makes overflow rare except on small/zoomed viewports.

**Impact.** Pointer users on long result lists (rare given the 8-result cap, possible on small/zoomed viewports) get janky hover where rows hop under the cursor. Repeated synchronous layout on a per-mousemove handler is needless hot-path cost.

**Suggested fix.** Have mousemove set the active index without scrolling — split setActive into a core that updates aria-selected/aria-activedescendant and an opt-in scroll, and call the no-scroll variant from mousemove (keyboard nav keeps scrollIntoView). Or guard the scroll behind a 'source' flag so only keyboard navigation scrolls.

**Resolution (2026-06-16):** `setActive(i, scroll)` gained an opt-in `scroll` arg — keyboard nav (move/Home/End) passes `true`; the mousemove handler and the initial render call it without scrolling, so hover no longer fires a layout-forcing scrollIntoView per mouse-move. Verified by inspection (the cursor-fighting only manifests on an overflowing, zoomed viewport). Part of `fix/search-palette-guards`.

### 121. search.js: palette dialog does not inert/hide background content while open (aria-modal asserted but no real containment) *(addressed 2026-06-16)*

*Severity: low · Category: a11y-mechanical · Confidence: medium* — `html/scripts/search.js:223-234 (open); html/_includes/layouts/page.njk:22 (aria-modal="true")`

The dialog declares aria-modal="true" but the rest of the page is left fully interactive/perceivable: background is not set inert and not aria-hidden (body.palette-open only does overflow:hidden scroll-lock). Focus 'containment' is achieved only by preventDefault on Tab in the input keydown — which holds for sighted keyboard users (the palette has one focusable element; results are driven by aria-activedescendant), but a screen-reader user in browse/virtual mode can still arrow into the background document, contradicting the aria-modal contract. A mechanical mismatch between the asserted ARIA state and the DOM.

**Impact.** AT browse-mode users can navigate the obscured page while the modal claims to be modal — confusing reading order and defeating the 'modal' semantics the markup promises. Non-destructive search overlay, so impact is reading-order confusion, not broken function.

**Suggested fix.** On open(), add inert (or aria-hidden="true") to the page's main wrapper / nav / footer (everything except #palette) and remove it on close(). inert also removes those nodes from the tab order, so the Tab-preventDefault hack could then be dropped.

**Resolution (2026-06-16):** open()/close() now call `setBackgroundInert(on)`, which sets/removes the `inert` attribute on every direct `<body>` child except the palette (and script tags) — so the obscured nav/main/footer drop out of the AT browse-mode reading order and the tab order, honoring the asserted `aria-modal`. Kept the Tab-preventDefault as defensive belt-and-suspenders. Regression test in `tests/nav-search.spec.js`: `main` gains `inert` on open and loses it on close, while `#palette` never does. Part of `fix/search-palette-guards`.

### 122. nav-menu: Escape on the section toggle collapses category and section in one press, contradicting the documented step-back *(addressed 2026-06-15)*

*Severity: low · Category: bug · Confidence: medium* — `html/scripts/nav-menu.js:132-136 (toggle keydown) vs 144-165 (menu keydown step-back)`

The module header and the menu-level keydown handler implement 'Escape collapses the open category first, then the section.' That stepping lives only on the m.menu keydown listener (fires when focus is inside the menu). But the .nav-menu-toggle has its own keydown handler whose Escape branch calls close(m) → closeGroups(m), tearing down the open category AND the section together. The scenario is reachable: the toggle and menu are siblings inside .nav-item, so Shift+Tab from a category toggle back up to the section toggle keeps focus in the item (the focusout handler doesn't close), with a category still expanded and focus on the toggle. So category-open + focus-on-toggle collapses both levels in one press while category-open + focus-in-menu collapses only the category. This is freshly-rewritten cascade code where the one-level-per-press invariant is explicitly claimed.

**Impact.** Inconsistent Escape behavior depending on whether focus is on the toggle vs in the menu — a keyboard user gets a single-step or double-step collapse with no visible reason. A state-machine inconsistency that violates a documented invariant.

**Suggested fix.** In the toggle's Escape branch, mirror the step-back: if any group in groupsOf(m) is open, closeGroups(m) only and keep the section open; else close(m). Or route the toggle's Escape through the same step-back helper the menu handler uses.

**Resolution (2026-06-15):** fixed on `feat/nav-cascading-categories` — the section toggle's Escape now mirrors the menu-level step-back (`if (groupsOf(m).some(isGroupOpen)) closeGroups(m); else close(m)`), so one press collapses the open category and a second closes the section. Regression test added in `tests/nav-menu.spec.js` (fails without the fix).

### 123. fbe-engine.spec.js: DIVIDE /0 guard, NaN/Infinity propagation, and most catalog blocks are untested *(addressed 2026-06-16)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/fbe-engine.spec.js (whole file); load-bearing miss is the div-by-zero guard at html/scripts/fbe-engine.js:171`

The engine-direct spec covers add/ai/const/gt/not/pid/sr/tof/ton and feedback rings, but leaves real behavior unexercised: (1) the DIVIDE-by-zero guard (fbe-engine.js:171) — the single most-documented safety behavior, advertised as load-bearing in user-facing copy at function-block-editor.html:483-485 — has no test asserting div by 0 returns 0; (2) no test that a non-finite input is coerced to 0 by asNum, nor the Infinity-propagation inconsistency above; (3) the dt=0 derivative NaN above; (4) block types div, eq, ne, ge, le, lt, sub, mul, min, max, select, limit, xor, and, or, ao, bo, readout have no evaluation test. The documented div-guard is exactly the kind a refactor could silently break, so it's the highest-value missing assertion.

**Impact.** A regression to the div-guard or asNum coercion would ship green. The behaviors the page advertises in prose are not pinned by tests.

**Suggested fix.** Add a div-by-zero test (const A / const 0 → O===0), an asNum-coercion test, and a dt=0 derivative test; spot-check select/limit and at least one of each comparator family. A few lines each given the existing run() helper.

**Resolution (2026-06-16):** the div-by-zero guard, asNum coercion, and dt=0 derivative are covered by the `#97`/`#98` finite-output guard tests added earlier (`fbe-engine: finite-output guards`). This pass adds a `fbe-engine: catalog coverage (#123)` describe block: DIVIDE /0 → 0 (explicit), sub/mul/min/max, every comparator family (gt/lt/ge/le/eq/ne), and/or/xor, SELECT routing by SEL, LIMIT clamping, and an asNum-coercion test (an unwired number input defaults to 0, not NaN). Shipped on `test/engine-test-gaps` with #125. Test-only — no version bump.

### 124. quiz-engine: no behavioral test coverage for the Skip action, random order, or gotcha snippet rendering *(addressed 2026-06-16)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/smoke.spec.js:1473-1640 (engine surface); branches at html/scripts/quiz-engine.js:503-506,329,360-367,575,614`

The browser-driven quiz tests exercise mcq/tf correct+incorrect, numeric submit, restart, best persistence, and the #89 short-vs-full guard — but three branches have zero behavioral coverage: (1) the Skip button path submit(true) ('Skipped.' status + skip-disabled-on-reveal + a pushed correct:false answer landing in the miss-list); (2) the 'random' order mode / shuffleInPlace (only sequential is ever selected); (3) the gotcha snippet-slot render/hide path. quiz-banks.spec.js validates the data shape but never mounts the engine. A regression in skip scoring (a skipped question must score as incorrect) or in snippet visibility would ship green.

**Impact.** A future edit to the skip/random/gotcha branches can break without a failing test. Skip in particular toggles skipBtn.disabled and pushes a correct:false answer — a regression there silently mis-scores.

**Suggested fix.** Add a behavioral spot-check (modbus-decoding has a gotcha in the bank) that clicks Skip on one question and asserts the reveal shows 'Skipped.' + the question appears in the miss-list; one that selects Random order, restarts, and asserts the run completes to a results card with the right total; and a gotcha-snippet visibility assertion riding the existing sequential run.

**Resolution (2026-06-16):** added five browser tests to the `practice — modbus decoding quiz` describe in `tests/smoke.spec.js`: Skip → 'Skipped.' reveal + the question in the Review/miss-list; Random order completes to a results card; a gotcha (sequential Q5) shows its snippet while non-gotcha questions don't; **plus the deferred quiz-code tests** — a first all-skipped run is not celebrated or stored as a best (#114), and a full-bank run repairs a stale best whose total exceeds the bank (#115, via a seeded 99/999 record). All pass. (#116 — inputmode reset — stays inspection-only: no shipped bank sets `inputmode`, so there's no reachable behavioral path.) Shipped on `test/browser-test-gaps`.

### 125. psychro-engine.spec.js: computeProcess / invertProcess have no engine-direct test despite a documented round-trip contract *(addressed 2026-06-16)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/psychro-engine.spec.js (only solveState/buildState tests); engine functions at html/scripts/psychro-engine.js:191-247`

psychro-engine.spec.js exercises only the ASHRAE reference points and the 5-mode solveState round-trip. Psychro.computeProcess (process deltas, mDot, qTotal/qSens/qLat, SHR) and Psychro.invertProcess (inverse q-formula solve for the leaving-air state + the saturated flag) — which power tools/coil-sizing.html — are pinned by no engine-direct test. The header promises a forward/inverse round-trip; verified holding today (recovers tdb/W to ~1e-6) so this is a missing regression guard on correct-but-untested math. The Wout<0 bone-dry and the qSens<0/qLat<0 rejection branches are likewise uncovered. Note: an active smoke.spec.js coil-sizing behavioral test does pin the headline numbers, so this is the narrower engine-direct + round-trip-invariant gap, not zero coverage.

**Impact.** The coil-sizing tool's heat-flow and inverse-load math can silently regress on the round-trip invariant (the strongest available) and the rejection branches with no engine-direct test catching it. The most-likely-to-break formula plumbing (cool/heat sign, cpIn weighting, qLat = qTotal − qSens) is unpinned engine-side.

**Suggested fix.** Add engine-direct tests to psychro-engine.spec.js (the vm pattern already loaded): a computeProcess↔invertProcess round-trip asserting recovered tdb/W to ~1e-6 across a cool and a heat stage; SHR sanity (0<shr<1, ≈1 for pure-sensible); the saturated flag firing when latent load drives the leaving point onto the curve; and the negative-load / negative-Wout branches returning ok:false.

**Resolution (2026-06-16):** added a `psychro-engine: computeProcess / invertProcess (#125)` describe block: compute→invert recovers the leaving tdb/W to 6–8 decimals for a cooling stage and a sensible-heating stage (feeding back `|qSens|`/`|qLat|` since computeProcess returns signed loads and invertProcess takes magnitudes); SHR between 0 and 1 for a mixed cool and ≈1 for a pure-sensible cool; invertProcess rejects cfm≤0, negative qSens, negative qLat, and a bone-dry (Wout<0) latent overload; and the `saturated` flag fires when cooling hard with no dehumidification drops the leaving point onto the curve. Part of `test/engine-test-gaps`.

### 126. staging-sequencer rotation / runtime-equalization logic has only one UI stage-up path tested *(addressed 2026-06-16)*

*Severity: low · Category: test-gap · Confidence: high* — `tests/smoke.spec.js:173-186 (only behavioral test); html/simulators/staging-sequencer.html (inline logic, lead-selection :530-571, options :257-259)`

The staging sequencer ships three lead-lag strategies — Fixed lead, Runtime-equalized, Scheduled rotation — and a per-unit runtime accumulator driving equalization. The only behavioral test runs the default Fixed strategy with Manual demand + zero delay and asserts only stage-up count and a 'Stage up' log line, neither sensitive to which unit is chosen. None of the rotation modes, the runtime-equalization convergence, or the lead-tag handoff is asserted. The logic is inline (no extractable shared engine), so it can only be pinned behaviorally. (The education equipment-staging widget has a separate, simpler inline implementation that shares no code and gives the simulator zero regression coverage.)

**Impact.** A regression in lead selection or runtime equalization (equalized mode picking the highest-hour idle unit instead of the lowest, or rotation never advancing) would pass CI — the stage-up count and log line under test are unaffected by which unit is chosen.

**Suggested fix.** Add a behavioral spec that selects each rotation mode, runs several evaluate cycles, and asserts the lead tag moves (scheduled) / the lowest-hour unit comes on next and the runtime spread shrinks (equalized) / unit 1 always leads and the spread grows (fixed). Pin via the per-unit runtime readouts in #stg-units and the lead tag.

**Resolution (2026-06-16):** added a behavioral test in `tests/smoke.spec.js` pinning the lead-selection + handoff (the part the prior stage-up-count test was blind to): under Fixed strategy the first `#stg-units .stg-unit` carries `data-lead="true"`, and tripping the lead faults unit 1 and moves the lead role off it (`data-state="fault"`, `data-lead="false"`, a FAULT log line). The runtime-equalized convergence and scheduled-interval rotation are driven by sim-time accumulation on the Play loop — not deterministically reproducible in this harness without a time hook — so they're left to manual/inspection; the lead identity + handoff are the deterministic core. Shipped on `test/browser-test-gaps`.

### 127. nav-menu/nav-search: tests don't cover the capture-vs-bubble Escape coexistence between palette and nav menu *(addressed 2026-06-16)*

*Severity: low · Category: test-gap · Confidence: medium* — `tests/nav-menu.spec.js + tests/nav-search.spec.js (the Escape-coexistence gap spans both); guarded code at html/scripts/nav-menu.js:40,179,220-225 and html/scripts/search.js:292-307`

search.js registers its Escape keydown in capture phase and stopPropagation()s when the palette is open; nav-menu.js has a bubble-phase document Escape backstop. No spec opens a nav section menu AND the palette together then presses Escape to assert the palette closes while the nav menu state is untouched — that load-bearing coexistence is asserted only in prose. Also the items-empty early return (nav-menu.js:40) and the setNavOpen null-guard (:179) are never exercised, though they're unreachable on the live site (chrome is templated into every page) so that sub-part is low-value.

**Impact.** The Escape-ordering contract between search.js (capture) and nav-menu.js (bubble) is the kind of thing a future refactor breaks silently; no test guards it. Low because the behavior is currently correct.

**Suggested fix.** Add a spec: open a nav section menu, open the palette (Ctrl+K), press Escape, assert the palette is hidden AND the nav menu is still in its prior state — proving capture-phase Escape stopped propagation before the nav backstop.

**Resolution (2026-06-16):** added a test to `tests/nav-search.spec.js`. Empirically, the two CAN'T be simultaneously open — opening the palette moves focus to its input (closing the dropdown via nav-menu's focusout handler) and inerts the background (#121). So the capture-vs-bubble Escape conflict is structurally prevented, not merely "currently correct." The test pins that invariant: open the Tools dropdown, Ctrl+K (dropdown closes), Escape → the palette closes (capture-phase, stopPropagation) and nothing reopens. A regression that broke either the focus-grab/inert or the capture-Escape ordering would surface here. (The nav-menu.js items-empty / setNavOpen null-guards the finding also names are unreachable on the templated live site — left uncovered.)

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

### 130. thermistor-data: 10k-5-tac curve generates two adjacent rows with identical resistance at the cold extreme *(addressed 2026-06-16)*

*Severity: low · Category: correctness · Confidence: medium* — `html/scripts/thermistor-data.js:145-152 (generated table; rows at -40 °F and -35 °F); reverse lookup at html/tools/thermistor-calculator.html:442-455`

For the '10k-5-tac' type (ntc-shunt, 10K Type-3 with an 11 kΩ parallel shunt), buildTable()+roundR() produce two consecutive rows with the SAME rounded resistance ([-40,...,10600] and [-35,...,10600]) — the shunt flattens the parallel resistance near the cold asymptote and roundR's 100 Ω granularity collapses the two distinct element resistances onto 10600 Ω. No other type produces a duplicate-resistance row (verified across all 9). thLerpByRes checks Math.abs(r - a[2]) < 1e-6 and returns a[0] before computing f, so entering 10600 Ω returns -40 °F with no divide-by-zero — the page is safe. But (a) 10600 Ω silently resolves only to -40 °F, making the -35 °F row unreachable by reverse lookup, and (b) any future consumer doing naive segment interpolation over this table without the exact-match guard would divide by zero on that flat segment.

**Impact.** Cosmetic/edge-case today: at the -40…-35 °F cold extreme of one shunted curve (a region the header documents as 'nominal' with tolerated degradation), reverse-lookup resolution is slightly lossy. The latent risk: the table is documented as 'the source of truth' for interpolation yet contains a flat segment unsafe for a generic interpolator without an exact-match short-circuit.

**Suggested fix.** Acceptable to leave given the page guards it and the header tolerates extreme-range degradation — but add a one-line note in the type's inline source comment that the cold-end rows collapse to one resistance after rounding, so a future transcribed-table swap or alternate consumer doesn't trip over it. Alternatively, the data module could assert (in dev) that no two adjacent rows share a resistance.

**Resolution (2026-06-16):** added the source comment on the `10k-5-tac` entry in `thermistor-data.js` — documents that the 11 kΩ shunt + roundR()'s 100 Ω granularity collapse the -40/-35 °F rows onto 10,600 Ω (the only adjacent dup), that thLerpByRes's exact-match guard keeps the page safe (returns -40 °F, no /0), and that a future table-swap or naive interpolator must tolerate the flat segment. Chose the comment over the dev-assert option — a "no adjacent duplicate resistance" assert would fire on this very (correct, accepted) curve. **No version bump:** comment-only, zero behavior/output change, so the `?v=` cache-bust's purpose doesn't apply (busting site-wide for an invisible comment would be disproportionate). Shipped on `docs/thermistor-dup-row-note`.

### 131. Mobile sheet focusout closes its menu mid-tap when focus briefly lands on body *(addressed 2026-06-15)*

Mobile sheet focusout closes its menu mid-tap when focus briefly lands on body (nav-menu.js:168-170) — LOW CONFIDENCE. The missing relatedTarget null-guard is real (`if (!m.item.contains(e.relatedTarget)) close(m)` with no null check, so focusout with relatedTarget===null closes the section), and is the genuine in-scope kernel worth a one-line fix. But the headline 'menu collapses as I tap a category' reproduction is largely refuted by the DOM: the category toggle is a <button> inside m.item, so a tap that focuses it keeps focus in-item and does NOT close; triggering the bug needs focus already inside the item plus an engine-dependent blur-to-null, which the reporter flags as non-deterministic. Treat as a defensive null-guard (add it alongside the nav-menu Escape fix), not a confirmed flake.

**Resolution (2026-06-15):** fixed on `feat/nav-cascading-categories` alongside #122 — the focusout handler now guards relatedTarget (`if (e.relatedTarget && !m.item.contains(e.relatedTarget)) close(m)`), so a blur-to-null no longer tears the open section down; a genuine click outside still closes via the document click listener. Regression test added (fails without the fix).

### 132. Worker: immutable cache-control header dropped on 304 revalidation responses *(addressed 2026-06-16)*

Worker: immutable cache-control header dropped on 304 revalidation responses (src/worker.js:252-259) — MEDIUM CONFIDENCE / theoretical. The fallthrough re-wraps the long-lived cache-control only when assetRes.ok is true; a 304 from env.ASSETS.fetch (reachable under run_worker_first:true on conditional requests for fingerprinted assets) has .ok===false and is returned with the binding's default max-age=0,must-revalidate instead of immutable. Impact is genuinely bounded (a conforming client that already received immutable won't revalidate; only intermediary caches, immutable-ignoring clients, and pre-immutable holders re-revalidate) and the whole long-cache mechanism is the owner-accepted #84 with no CI guard. Worth a one-line gate change (`assetRes.ok || assetRes.status === 304`) but low blast radius and partly speculative about which clients are affected.

**Resolution (2026-06-16):** verified reachable — `wrangler.jsonc` sets `run_worker_first: true`, so `env.ASSETS.fetch` runs on every request and can answer a conditional request for a fingerprinted asset with a 304. Applied the one-line gate (`assetRes.ok || assetRes.status === 304`); a 304 is a null-body status, so re-wrapping its (null) body to set the header is valid. Regression test in `tests/worker.spec.js` (a stubbed 304 from ASSETS on a `?v=` path keeps `immutable`; an unversioned 304 stays on the revalidate default). Blast radius stays bounded as the audit noted; the fix is cheap and correct. No version bump (src/worker.js, not html/scripts/).

### 133. Worker: legacy redirect discards query string and fragment *(addressed 2026-06-16)*

Worker: legacy redirect discards query string and fragment (src/worker.js:238-241) — confirmed real but explicitly harmless today. Response.redirect(new URL(legacyTarget, url.origin), 301) drops any inbound ?query on the three moved simulator pages; fragments are moot (never sent to server). The three pages don't read query params (grep confirmed zero url.search/searchParams usage), the site has no analytics consumer (no tracking by policy), so the only real-today impact is third-party attribution loss on inbound legacy links; the deep-link-state risk is hypothetical. A one-line fix (`target.search = url.search`) is cheap, but this is a latent correctness gap, not a live bug — keep on the watch list until a moved page actually reads query state.

**Resolution (2026-06-16):** applied the one-liner — `const target = new URL(legacyTarget, url.origin); target.search = url.search;` — so an inbound `?utm_*`/query on a moved simulator URL now rides through the 301 (fragments are never sent to the server, so there's nothing to carry there). Regression test in `tests/worker.spec.js` (`/tools/pid-tuner.html?utm_source=nl&x=1` → `/simulators/pid-tuner.html?utm_source=nl&x=1`). Harmless-today gap closed pre-emptively (the cost is one line + a test, and it's strictly more correct). No version bump.


### 134. Hydronic engine: steep pump curves / series pumps need a true Newton step *(addressed 2026-07-14)*

From the Hydronic Loop Builder review (PR #277 follow-up). `solveHydraulics`
linearizes only the friction term into the secant conductance `g = 1/(k|Q|)`
and treats pump head `hsrc = (h0−a·Q²)·spd²` as a constant current injection;
the curve slope `dHsrc/dQ = −2a·Q·spd²` is never fed back, so a steep curve
overshoots. The obvious "fold the slope into `g`" patch is **wrong** here and
was proven so during review: `g` is simultaneously the linearization AND the
literal `Q = g·residual` flow map (step 5), so changing the denominator moves
the fixed point — the patch converged the default loop to 26.3 GPM instead of
the closed-form 34.3 and violated the branch law by 16–79 ft of head.
**Largely mitigated** in the follow-up: lowering the relaxation floor to 0.005
(#3) made most reachable cases converge to the closed form (e.g. h0=120/a=0.1
→ 34.13 GPM exact), the inspector now bounds `Curve a` ≤ 0.2 (#14), and the
page surfaces a "solver didn't settle" warning (#7/#11) so a non-converged
flow is never shown as trusted. **Remaining gap:** extreme typed curves (a=0.5)
still report `converged:false` with a wrong flow. The proper fix is a real
Newton step on the full residual `r(Q) = k·Q·|Q| − hsrc(Q) − ΔP` with Jacobian
`dr/dQ = 2k|Q| + 2a·Q·spd²`, restructured so the flow-from-pressure map is
consistent with the linearization (not bolted onto `g`), validated against the
closed form for every steep case. Revisit trigger: a user report of unstable
numbers on a realistic loop, or before any pipe-sizing phase-2 work that makes
`k_pipe` length-dependent (which raises stiffness).

**Phase-2 update (2026-06-20):** developed-length pipe friction shipped, but
*deliberately bounded to stay out of this stiff regime*. `k_pipe` is now
`max(K_PIPE, K_PER_FT·L)` — it never drops **below** the old flat `K_PIPE`
floor, and a longer run only **grows** `k`, which *improves* conditioning (the
stiff case is small-`k`, near-frictionless circuits). So the length-dependence
did not trip this gate. The full revisit trigger still stands for the *next*
step — a user-selectable pipe **diameter** (a large bore drives `k` small) plus
the pipe-sizing lesson — which is the part that would actually raise stiffness
and wants the Newton step first.

**Addressed (2026-07-14, PR #341).** Shipped the true Newton step — tangent
conductance `g = 1/f'(Q)` (`f'(Q) = 2k|Q| − hsrc'(Q)`, new `branchHsrcSlope`
helper) with a Norton injection that keeps the flow-from-pressure map
consistent, sidestepping the fold-into-`g` fixed-point trap proven wrong above.
Steep typed curves that reported `converged:false` now converge to the closed
form (a=1.0 → 6.256, a=2.0 → 4.448, residual ~1e-4); `hydronic-engine.spec.js`
44/44.

### 135. Hydronic engine: valve2 `out.authority` is dead + mislabeled *(addressed 2026-07-14)*

`writeback`'s valve2 case computes `out.authority = vHead / pumpHead` and
`out.dP`, and balanceValve computes `out.dP` — none are rendered on the page
or asserted in any test (dead code). Worse, "authority" collides with the
valve-cv tool's reserved meaning: valve authority β is the wide-open valve drop
over the total branch drop, evaluated at full stroke; this quantity uses the
*current-position* valve drop over *full pump head*, so it climbs toward 1 as
the valve shuts and understates the share on a multi-branch loop. Fix: either
delete the three dead `out` fields, or — if a teaching readout is wanted later
— rename (e.g. `out.headShare`), fix the denominator to the valve's own
controlled-branch node-to-node drop, and compute the wide-open β once so it
matches valve-cv. Not urgent: it cannot mis-display anything today.

**Addressed (2026-07-14, PR #341).** Deleted the dead `out.authority`/`out.dP`
from `writeback`'s valve2 case and `out.dP` from balanceValve (grep confirmed no
consumer) — removed rather than renamed, since the quantity has no readout and
"authority" collides with valve-cv's reserved meaning.

### 136. Hydronic page: component drag wipes the particle layer every pointermove *(RESOLVED 2026-06-20 — phase 2)*

During a component drag, `drawPipes()` did `svg.innerHTML = ''` and recreated
every pipe `<path>` each `pointermove`, so FlowEngine's pools (keyed by the old
path elements) were orphaned and particles flicker/vanished for the duration of
the drag, returning on `pointerup` (which calls `refreshFlowGeometry`). Benign
(cosmetic, drag-only) but the principled fix is to update each path's `d`
attribute in place when the pipe set is unchanged (the common drag case), so
pool `el` references stay valid.

**Resolved** in the phase-2 dual-view rewrite: a drag's `move()` now calls
`updatePipesInPlace(view, comp)` — it sets the `d` attribute on the *existing*
hit/visible `<path>` elements (looked up from each view's `pipeEls` map) for the
pipes touching the dragged component, with no `svg.innerHTML` teardown, so the
FlowEngine pools survive the whole drag. `pointerup` then calls
`FlowEngine.refreshPath()` on just those pipes' elements to re-read the final
geometry. (`renderAll()` still does a full rebuild on add/delete/example/select
— but that's not the per-pointermove path, so no churn there.)

### 137. Hydronic engine: `makeSystem` dedupes pipe ids but not component ids *(addressed 2026-07-14)*

`makeSystem` rewrites null/duplicate **pipe** ids to fresh unique ones (so the
warm-start `_warm` / writeback caches can't alias), and the test suite enshrines
that contract — but there is no component-id analogue. Two components sharing an
id (or a null id) would alias their branch keys (`<id>#<bi>`) in the same caches
and mirror one component's flow onto another. Not reachable through the shipped
UI (`addComponent` uses a monotonic `h`+seq id), so not urgent; matters once a
persistence/import path or the Android wrapper feeds external JSON. Fix: mirror
the pipe-id pass (a `seenCompIds` Set rewriting collisions), rebuild the `ids`
set before the pipe filter, and add a spec case.

**Addressed (2026-07-14, PR #341).** Added the `seenCompIds` dedup pass to
`makeSystem` mirroring the pipe-id pass (rewrites null/duplicate component ids
before the `ids` set + pipe filter), with regression cases — imported JSON can
no longer alias component branch keys.

### 138. Number-input idiom: function-block-editor could take the same min/max/step *(guard addressed 2026-07-12; catalog parity deferred)*

The Hydronic Loop Builder inspector now applies catalog `min/max/step` to its
number inputs and skips zeroing the model on a momentarily-empty box (#14).
`function-block-editor.html` shares the identical number-input builder idiom
and could get the same treatment in a future sweep for consistency. Low
priority; cosmetic/UX parity only.

**Addressed in part 2026-07-12** (PR E): shipped the **correctness**
half — the empty-box guard (`if (field.value === '') return;`) in
function-block-editor's number-input listener, so an input cleared
mid-edit no longer zeroes the model to 0 (it repaints on the next real
value, matching HLB). The **catalog `min/max/step` parity** half stays
deferred (pure UX polish, and fbe's `fbe-engine.js` param defs carry no
`min/max/step` today — a two-file change). Revisit trigger: a general
min/max/step sweep, or adding validation-worthy ranges to fbe blocks.

### 139. Engine-missing degradation is non-uniform across tool pages *(addressed 2026-07-14)*

Tools load their shared engine via a plain `<script src>` (dew-point →
psychro-engine.js, voltage-drop → thermistor-data.js, etc.). If that request
hangs or fails on a flaky connection, the inline IIFE references an undefined
global and can throw or silently no-op on first input rather than showing a
clear message. `voltage-drop.html` is the model — its `slopeAt` guards
`typeof THERMISTOR_TYPES` and falls back to "Sensor curve data unavailable —
resistance result above still stands." A spot-check (2026-06-27) found that
guard pattern on voltage-drop only; dew-point, coil-sizing, refrigerant-pt,
thermistor, air-mixing, psychrometric-chart, and economizer-ratio reference an
engine global with no `typeof` guard.

From the **G-013** UX-audit finding (pressured-edge-case persona, one bar of
signal). The site is static and light so this is mostly theoretical; the
finding itself recommends "a tracked note rather than a blocking fix," so it is
logged here rather than swept inline — propagate voltage-drop's `typeof` guard
to the engine-dependent pages in a future defensive-degradation sweep. The
palette half of the same finding (search-index fetch failure) is already
handled (#119). Low priority.

**Addressed (2026-07-14, PR #340).** Propagated the `typeof <global>` guard to
all seven engine-dependent tools (dew-point, coil-sizing, refrigerant-pt,
thermistor, air-mixing, psychrometric-chart, economizer-ratio) — each degrades
to its validate-and-mute state plus an "engine unavailable" line instead of
throwing; economizer-ratio degrades only its enthalpy tab (the dry-bulb math
keeps working).

### 140. `.nav-menu-blurb` bottom rule is narrower than an expanded dropdown panel *(addressed 2026-07-14)*

The section-dropdown blurbs (G-011, PR #290) cap at `max-width: 240px`,
and the `border-bottom` that separates the blurb from the category rows
spans only those 240px. When a level-2 category expands and widens the
panel past ~300px, the rule can read as a "short rule" against the wider
rows below. In practice the adjacent category row's top edge masks it —
the post-merge spot-check (2026-07-01) had to zoom 2× to see it — so
this is cosmetic only. Fix shape: move the border to a full-width
wrapper (or the menu's `::before`) and keep the `max-width` on an inner
text span. Log-don't-sweep; pick up if anyone notices it in the field.

**Addressed (2026-07-14, PR #343).** Dropped `border-bottom` from
`.nav-menu-blurb` and moved the separating rule to `.nav-menu-blurb + *` (the
first category group/link), which spans the full expanded-panel width — the
~108px short-rule gap closes to ~0 (verified live in a headless browser).

### 141. Education SVG captions are inline-styled — `.edu-caption` promotion candidate *(addressed 2026-07-14)*

From the 2026-05 content-audit refinement pass ("Code items split to
codebase-issues.md," batch 4 — flagged "worth an entry once the
editorial direction is picked," then never logged; this entry pays that
debt). The in-SVG `<text>` labels on the education flow diagrams
("supply main →", "← return main") are styled via per-element
presentation attributes with similar-but-not-identical shapes across
hydronic-loops, load-piping, and pump-control. If the label pattern is
canonized, promote a shared `.edu-caption` class to `styles.css` and
sweep the three pages. (The sibling candidate from the batch-2 sweep,
`.narrow-width-note`, was since promoted — `styles.css` ~line 2022,
four consumer pages — so this is the remaining education half.)

**Addressed (2026-07-14, PR #343).** Promoted `.edu-caption` to `styles.css` and
swept the 11 directional flow captions across hydronic-loops, load-piping, and
pump-control to use it; a before/after pixel-diff of every education diagram
shows zero differing pixels.

### 142. Preset/example chip rows: two per-page stragglers off the shared `.widget-try` *(declined 2026-07-12 — miscategorization)*

The other never-logged candidate, from the content-audit Batch 3
(Simulators) "Code items split" section. Since it was flagged, most of
the consolidation actually happened: five of the six simulators carry
an examples/preset chip row, and three of those (vfd-mock `#vfdm-try`,
function-block-editor `#fbe-examples`, hydronic-loop-builder
`#hlb-examples`) already share the `.widget-try` class in `styles.css`
(WIDGET CHROME, ~line 3229). The stragglers are pid-tuner's preset row
(`.copy-btn` chips in a `.btn-row`) and controller-wiring's
`.cw-preset`; tool-side mode-toggle chip rows (e.g. refrigerant-pt's
Pressure/Temperature and Suction/Liquid toggles, also
`.copy-btn`-in-`.btn-row`) are a related but semantically different
shape — toggles, not presets. Candidate action: migrate the two preset
stragglers onto `.widget-try`, and decide whether toggle rows deserve
their own shared class. Pairs naturally with #143 — an a11y sweep of
the same rows would ride the same PR.

**Declined 2026-07-12** (PR E; owner-confirmed). The premise doesn't
hold on a close read: `.widget-try` is a *momentary inline-dashed-link*
style with no persistent-selected state, and neither "straggler" is a
"Try: a · b · c" example row. pid-tuner's presets carry a load-bearing
*persistent selection* (which chip shows the active tuning) — moving
them to `.widget-try` would destroy that affordance, the opposite of
what #143 wanted. controller-wiring's `.cw-preset` is a deliberate
"Load a panel:" *action bar* with its own `.cw-bar button` chrome, not
an example row. So both are legitimately distinct control types, not
`.widget-try` candidates. The a11y that actually mattered here shipped
under #143 (pid-tuner presets got `aria-pressed`); the toggle-row
"deserve their own shared class" question is deferred — no new class is
warranted until a third genuine consumer appears. Revisit trigger: a
new persistent-selection chip row that would share such a class.

### 143. Chip-row toggles convey selection visually only — no `aria-pressed` *(addressed 2026-07-12)*

PR #291 (S-001) shipped the PID tuner's new Seconds/Minutes unit
toggle with `aria-pressed`, but the sibling preset chips on the same
page (Sluggish / Decent PI / Aggressive / Too Hot) — and chip-row
selections elsewhere — still flip only the `.active` class, so the
current selection is invisible to assistive tech while the visual state
is load-bearing. Decide the pattern (per-chip `aria-pressed` like the
nav units/theme pills, vs `role="radiogroup"` semantics for
mutually-exclusive rows) and sweep chip rows site-wide. Rides naturally
with #142's consolidation.

**Addressed 2026-07-12** (PR E). Chose **per-chip `aria-pressed`** (the
site's established toggle idiom via the units/theme pills + dew-point's
mode toggle) over `role="radiogroup"` — every one of these rows already
sits in a `role="group"` with an `aria-labelledby` caption, so the
group semantics were already present and only the pressed state was
missing. Swept all six mutually-exclusive rows: pid-tuner presets,
refrigerant-pt lookup-by + suction/liquid, thermistor-calculator
by-temp/res, staging-sequencer unit-count, and psychrometric-chart
chart-range. Additive — kept each row's `.active` visual and synced
`aria-pressed` in the same toggle line, so no CSS or visual change.
controller-wiring's `.cw-preset` deliberately did **not** gain
`aria-pressed`: those are momentary "load a panel" actions with no
persistent selection (see #142).

### 144. controller-wiring ↔ bacnet-mstp related-links edge is one-way *(addressed 2026-07-08)*

The BACnet MS/TP lesson's relatedLinks lists Controller Wiring (the
two-wires layer is shared ground), but controller-wiring's own
relatedLinks lists only BACnet Networking — the reciprocal BACnet
MS/TP entry is missing, so the link equity flows one direction.
Caught during the BACnet buildout PR 2 cluster-wiring sweep; fixing
it there was outside the BACnet-cluster scope, so it logs here. One-
line fix in html/education/controller-wiring.html's relatedLinks
lessons group.

**Addressed 2026-07-08** on the vendor-ID branch (buildout PR 3 —
cluster wiring was already that PR's topic): BACnet MS/TP added to
controller-wiring's relatedLinks lessons group, closing the loop.

### 145. Stale "awaiting triage" header on the closed ux-personas findings doc *(addressed 2026-07-12)*

`docs/audits/2026-06-ux-personas/findings.md` still opens with
"Master findings document — awaiting triage" and a pending-looking
tally block, but the campaign closed 2026-07-01 — the sibling
`FIX-PROGRESS.md` DISPOSITION block is the durable record (86/86
dispositioned, PRs #281–#291). Anyone opening the findings doc first
reads live work where there is none. One-line fix: swap the header
for an "Archived — superseded by FIX-PROGRESS.md's DISPOSITION block"
banner like the other archived cycles carry. Caught during the
2026-07-08 open-items sweep; off-topic for the vendor-ID branch, so
it logs here.

**Addressed 2026-07-12** (PR A of the backlog burn-down): the header
blockquote now reads "Archived 2026-07-12 … the sibling
`FIX-PROGRESS.md` DISPOSITION block is the durable record (86/86
dispositioned, campaign closed 2026-07-01, `main` at v3.23.0)",
mirroring the `docs/audits/2026-05-ux/findings.md` archived banner. The
Method / Personas context is kept as the durable record; only the
triage-queue framing was swapped.

### 146. contact.html Turnstile clips ~14px at 320-class viewports *(accepted 2026-07-09)*

The Cloudflare Turnstile widget renders a fixed ~300px-wide iframe;
at a 320px viewport the tool-card interior is ~286px, so the widget's
right edge — Cloudflare branding and the Privacy/Help links — clips
inside the `overflow: hidden` card. The checkbox stays reachable and
the form stays solvable; 375px is clean. Found by the 2026-07
phone-overflow sweep (its 320px regression list in
`tests/responsive.spec.js` deliberately excludes contact).

**Decision (2026-07-09):** accept. The alternative,
`data-size="compact"`, shrinks the widget to 150×140 at *every* width
to fix cosmetic clipping that only exists on 320-class devices.
Revisit trigger: Turnstile ships a flexible-width mode, or the form
gains any other reason for a phone-specific variant.

### 148. Home Browse-card pill counts are a fourth hand-maintained count surface with no guard *(addressed 2026-07-12)*

The home page's Browse nav-cards carry hardcoded totals in their
pills (`html/index.html` ~lines 528/544/552: `'N Tools'`,
`'N Lessons'`, `'N Total'` for practice). Nothing in the
adding-a-tool/quiz checklists mentions them and no test asserts
them, so they drift: found 4-off (18 vs 22 lessons), 5-off (21 vs 26
practice), and 2-off (20 vs 22 tools) during the unit-identification
PR, which trued them up in passing. That makes four hand-maintained
count surfaces (tools-landing chips, practice-landing chips, README
count sentences, home pills). Options: add the home pills to the
CLAUDE.md checklists, or extend the existing card-count test cluster
(smoke + home-hero duplicate assertions) with a home-pill assertion
derived from the landing card counts so drift fails CI.

**Addressed 2026-07-12** (PR B, with #150): did **both** options. The
`home count pills stay in sync with the landings (drift guard)` test in
`home-hero.spec.js` derives the authoritative counts at runtime — the
`/tools/` filter chips (each cross-checked against the cards it filters
to) for per-category totals and each landing's `.nav-card` count for the
Browse totals — and asserts every home pill matches, so drift now fails
CI. CLAUDE.md "Adding a new tool" gained step 3b pointing at the home
count surfaces + this guard. The Browse pills were already accurate; the
guard locks them.

### 149. CLAUDE.md still points the PAGES manifest at tests/smoke.spec.js *(addressed 2026-07-12)*

CLAUDE.md's *Sitemap* section and both "Adding a new tool / quiz"
checklists say to add new pages to "the `PAGES` array in
`tests/smoke.spec.js`". The manifest actually lives in
`tests/pages.js`, shared by `smoke.spec.js` and `responsive.spec.js`
(`smoke.spec.js:24` requires it). Anyone following the doc greps the
wrong file first — caught during the airside-load ship, which added
its entry to `tests/pages.js` per the code, not the doc. Same-family
drift caught in the same review: "Adding a new tool" step 6 points
the Latest badge at `.hero-badges`, a class that no longer exists —
the badge lives in the `.hero-latest` paragraph (`html/index.html`
~L382). One-line doc fix at each mention; bundle into the next
CLAUDE.md-touching PR.

**Addressed 2026-07-12** (PR A): the three PAGES pointers (CLAUDE.md
*Sitemap* + both checklists) now say `tests/pages.js` and note it is
shared by `smoke.spec.js` + `responsive.spec.js`. The step-6 hero
pointer now reads "the `<p class="hero-latest">` paragraph (~L382)".
Closes the badge half of this entry jointly with #153 (the standalone
`.hero-badges` version). (The other `PAGES` mention — the search-index
section — names no file, so it needed no change.)

### 150. Home "Tools by Category" per-category pills are a fifth unguarded count surface — two already stale *(addressed 2026-07-12)*

The home page's Tools-by-Category grid (`html/index.html` ~L481–514)
carries per-category tool counts in its pills: Protocols says
"4 tools" (really 5 since the vendor-ID tool), Hydronics "2 tools"
(really 4 since waterside-load and valve-authority); HVAC "7 tools"
and Signals "2 tools" are currently correct. Issue #148 enumerates
four hand-maintained count surfaces and misses this one. The card
descs also enumerate tools by name (same drift risk, prose form),
and the grid shows only four of the six categories (no Airflow or
Electrical card) — possibly a deliberate curation, possibly more
drift; decide which when truing it up. Caught (pre-existing, not
introduced) during the airside-load ship's count-surface sweep.

**Addressed 2026-07-12** (PR B, with #148). Owner decision: **show all
six categories**. Trued up the three stale pills (HVAC 7→8 — the "7
correct" claim above had itself gone stale once coil-freeze-risk
shipped; Protocols 4→5; Hydronics 2→4) and their name-listing `desc`s
(added coil freeze risk / BACnet vendor ID / valve authority + waterside
load), then added **Airflow (6)** and **Electrical (3)** category cards
so the home grid mirrors the `/tools/` chip order (HVAC · Protocols ·
Signals · Airflow · Electrical · Hydronics). The drift guard added for
#148 covers these per-category pills too — it asserts each home category
pill equals its `/tools/` chip count and that every `/tools/` category
has a home card.

### 151. worker.spec.js's `loadWorker()` races itself across parallel Playwright workers *(addressed 2026-07-12)*

`loadWorker()` (tests/worker.spec.js ~L29) copies `src/worker.js` to
a **fixed** temp path — `path.join(os.tmpdir(), 'cf-worker-under-test.mjs')`
— then dynamic-imports it. Every parallel Playwright worker process
runs the same copy-then-import against the same file, and
`fs.writeFileSync` isn't atomic: one process can `import()` while
another is mid-write, yielding a half-parsed module whose `.default`
is `undefined`. Observed live during the duct-traverse ship
(2026-07-11): full-suite run failed exactly one test with
`TypeError: Cannot read properties of undefined (reading 'fetch')`
at `worker.fetch(...)`; the spec passed 21/21 in isolation. This is
(at least one concrete mechanism behind) the known
"one random full-suite failure per run" local flake — it can hit CI
too, not just a loaded host. Fix is one line: make the temp name
per-process (`cf-worker-under-test-${process.pid}.mjs`); the
dynamic-import cache still de-dupes within each process, so repeat
`loadWorker()` calls stay cheap. Caught in passing (pre-existing,
not introduced) while triaging the duct-traverse suite run.

**Addressed 2026-07-12** (PR C): the temp filename is now
`` `cf-worker-under-test-${process.pid}.mjs` `` so each parallel worker
process writes and imports its own copy; the in-process dynamic-import
cache still de-dupes repeat calls. A comment on the `tmp` line records
why the per-process name is load-bearing.

### 152. `rewriteInput` + `REWRITE_DEC` is duplicated inline across eight tool pages *(addressed 2026-07-12)*

The unit-flip input-resync helper (`rewriteInput()` + its
`REWRITE_DEC` decimals map — the audit-2026-06 #60a/#60b mechanism:
retained canonical value in `dataset`, verbatim typed-text restore,
per-quantity rewrite decimals) is now pasted inline in **eight**
pages: refrigerant-pt, dew-point-calculator, coil-sizing, air-mixing,
economizer-ratio, waterside-load, airside-load, and (new with tool #4
of the airflow buildout) coil-freeze-risk. The bodies are
byte-identical apart from the leading comment and each page's
`REWRITE_DEC` contents; each page also repeats the same
`U.onChange(...)` + initial-metric-paint wiring shape around it.
Extraction candidate: a shared helper in `/scripts/ui.js` (or a
`units.js` method — it already owns the canonical-conversion API the
helper leans on) taking `(id, quantity)` pairs plus a decimals map,
with each page keeping only its list. Not done inline during the
coil-freeze ship (scope rule); the copy count is now high enough that
the next units-toggle tool should trigger the extraction rather than
land copy #9. Caught while building coil-freeze-risk from the
waterside-load template.

**Addressed 2026-07-12** (PR D): extracted to `window.rewriteInput` in
`/scripts/ui.js` — a parameterized helper taking `(target, quantity,
fromU, toU, decMap, fallback)`. `target` is an id *or* an element (so
airside-load's element-based call sites work unchanged), and the
decimals map + fallback are parameters (refrigerant-pt keeps its
fallback `1`; everyone else defaults to `2`). Each page now keeps only
its `REWRITE_DEC` map plus a two-line hoisted wrapper that binds it, so
all call sites are untouched. **The extraction turned up a *ninth*
copy the `rewriteInput` grep had missed**: `psychrometric-chart.html`'s
`convertInputsBetween` inlined the identical canonical-retain logic in a
loop (no named function), with an inline `if/else` digits chain that
maps cleanly to `{altitude:0, airflow:0, humidityRatio:1, enthalpy:1}` +
fallback 1 — migrated too. Verified behavior-preserving with a
unit-flip round-trip spec across id-based / element-based / fallback-1 /
migrated-loop surfaces (exact typed-text restore + rounded metric).
Version bumped for the `ui.js` cache-bust (load-bearing: old `ui.js` +
new page HTML would break the toggle).

### 153. CLAUDE.md's `Latest:` badge pointer says `.hero-badges`; the badge lives in `p.hero-latest` *(addressed 2026-07-12)*

*Adding a new tool* step 6 says the hero's `Latest: <name>` badge is
"the last entry in `.hero-badges`" — but `html/index.html` renders it
as a standalone `<p class="hero-latest">` (line ~382). Harmless until
someone greps `.hero-badges` to find the badge and edits the wrong
element. One-line CLAUDE.md fix; batch with the next docs sweep.
Caught by the disclaimer-sweep recon while mapping home-page count
surfaces.

**Addressed 2026-07-12** (PR A): fixed jointly with #149 — CLAUDE.md
step 6 now points at the `<p class="hero-latest">` paragraph (~L382)
instead of `.hero-badges`.

### 154. Audit: diff every simulator/explainer against the tool that computes the same physics *(addressed 2026-07-14)*

The 2026-07 accuracy-audit workflow found that the site's *static*
reference data (enum tables, conversion constants, lookup tables) is
solid, but the two real defects it surfaced both lived in **interactive
models that restate physics a dedicated tool also computes** — and had
drifted from it: the hydronic loop builder's pump curve violated the
affinity laws that `affinity-laws.html` teaches (fixed, content-audit
#44), and the controller-wiring lesson/sim taught 4-20 mA loop power off
the AC hot leg (fixed, content-audit #38). Hand-derived interactive math
that *should* mirror a companion calculator is the live accuracy
surface; the tables are not.

**Action:** a focused pass that, for each simulator/explainer, diffs its
embedded physics against the tool of record and pins them together at a
couple of operating points. Candidate pairs the coverage critic flagged:
vfd-mock ↔ affinity-laws, staging-sequencer ↔ equipment-staging,
pid-tuner ↔ pid-basics, hydronic-loop-builder ↔ valve-cv /
waterside-load, controller-wiring ↔ signal-scaling. Where an engine is
the source of truth, prefer an engine-direct spec assertion (as added
for the affinity fix) over a screenshot. Log any drift found as its own
content-audit entry.

**Audit complete (2026-07-14).** Ran the pass as eight parallel
physics-cluster diffs (affinity/VFD, hydronic valve/load, PID,
signal/wiring, staging, psychrometrics, refrigerant P-T,
duct/airflow/economizer), each re-deriving the shared relation and running
the engine in node at real operating points. Static reference held up
everywhere; the drift again lived in interactive math and prose. Four
content-accuracy fixes shipped (content-audit #45-#48): the pid-basics "P
only" caption (promised ringing three low-dead-time loops can't produce),
the superheat-subcooling "reads the same 10 °F back" claim (the tool
interpolates to 10.2 / 9.6), the R-454B "negligible glide" pill
(contradicted the glide-blend lesson), and the VAV coil CFM/ton verdict
bands (disagreed with the equipment-airflow tool). Each is pinned by an
engine-direct, data-direct, or behavioral spec. Two cross-widget cosmetics
were logged separately (#155). Node-verified consistent, no change:
affinity exponents across vfd-mock / vfds / pump-control / hydronic; valve
`Q = Cv·√ΔP` and `500·gpm·ΔT` in the hydronic engine; every mA↔EU /
live-zero map vs signal-scaling; the 1.08 / 0.68 / 4.5 psychro constants
and flow-weighted mixing; superheat/subcooling sign + reference and the P-T
table values; `CFM = V×A`, the 4005 velocity-pressure constant, the
Huebscher equivalent-diameter, and the economizer %OA formula. The staging
*logic* (deadband, stage delay, anti-short-cycle lock, all three lead/lag
rotation modes, fault promotion) verified faithful between sim and lesson.
PR: issue-154/sim-tool-physics-audit.

### 155. staging-sequencer ↔ equipment-staging: two cross-widget cosmetic mismatches *(addressed 2026-07-14)*

Surfaced by the #154 sim/tool physics diff. Both are cosmetic, neither a
physics or logic error — logged rather than fixed inline to keep the #154
PR scoped to accuracy:

- **"held" status color differs.** `education/equipment-staging.html`
  (`.es-w1-status[data-kind="held"]`) borders the held state `var(--red)`;
  `simulators/staging-sequencer.html` (`.stg-status[data-kind="held"]`)
  borders it `var(--amber)`. Same benign state — a stage change blocked by
  the minimum stage-time lock — with two accents. The sim's amber is the
  better choice (it reserves red for fault/shortfall), so aligning the
  lesson to amber is the likely fix. One-line CSS.
- **Stage-up default differs (not user-facing).** The lesson widget's own
  code comment says pumps are added near 90 % per-unit load; the sim's
  default `up` is 85 %. The two widgets display thresholds in different
  units (lesson = % of full-plant demand; sim = % per-unit load), so no
  reader sees "90" and "85" side by side — the 90 lives only in a lesson
  code comment. Align only if the two teaching models should quote the same
  number.

**Addressed (2026-07-14, PR #339).** Aligned the lesson's held-status border to
`var(--amber)` (matching the sim, which reserves red for fault/shortfall). For
the stage-up default: the two widgets model the same per-unit-load quantity, and
the sim's generalized `d > U·k/N` with the lesson's N=3 regenerates the lesson's
hard-coded 30/60 thresholds only at U=90 — so the sim's `85` was the drift.
Nudged the sim default to `90` (input `value` + `cfg.up`) rather than break the
lesson's own math.

### 156. `package-lock.json` `version` field is stale (drifted from `package.json`) *(addressed 2026-07-18)*

Surfaced during the 2026-07-14 parallel backlog sweep: `npm install` in a fresh
worktree re-syncs `package-lock.json`'s top-level `"version"`, which had drifted
to `3.39.4` while `package.json` was `3.50.1` (now `3.50.3`). The version-bump
flow updates `package.json` (the footer / cache-bust source) but not the
lockfile field, and nothing user-facing reads it — which is why it drifted
unnoticed. Harmless to installs and the build; a hygiene/consistency gap only.
Each fix agent that hit it reverted the incidental churn to keep its PR scoped,
so it was never committed. Fix: use `npm version` for bumps (updates both), or a
one-time resync commit; optionally note in CLAUDE.md that the lockfile `version`
isn't load-bearing. Low priority.

**Addressed (2026-07-18).** One-time resync: hand-edited both lockfile `version`
fields (root + `packages[""]`) to `3.56.0`, matching `package.json` — nothing
else in the lockfile touched. Also added the going-forward note to CLAUDE.md's
version-bump step (*Adding a new tool*, step 7): bump with
`npm version <minor|patch> --no-git-tag-version`, which rewrites both files
atomically so the drift can't recur.

### 157. CLAUDE.md page-creation checklist omits `html/_data/educationSequence.js` *(addressed 2026-07-14)*

Surfaced while shipping the Track-A education round (controls-commissioning /
air-balancing / coil-selection) alongside the hydronics hub. Every
`nav: education` page must be listed in the `order` array of
`html/_data/educationSequence.js`, and `educationSequenceGuard` in
`.eleventy.js` **fails the build** if one isn't (or if `order` lists a URL no
education page claims — see #93, the drift this guard was added to catch). The
CLAUDE.md *Adding a new tool → Adding a new simulator / quiz* checklist walks
the tools/quiz path in detail but has **no education-specific step list**, so
`educationSequence.js` is nowhere in the documented flow — a new-lesson author
learns about it only by hitting the build failure. Loud, not silent (unlike the
original #93 drift), but still a checklist gap.

**Addressed (2026-07-14).** Added a one-line note to CLAUDE.md's page-creation
steps pointing at `educationSequence.js` (and its `index.html` grid-order
twin) for `nav: education` pages. A fuller "Adding a new education lesson"
checklist, mirroring the tools/quiz ones, is the larger follow-up if the
education path keeps growing.

### 158. `air-handlers.html` still uses the older diagonal fin-line coil motif *(addressed 2026-07-18)*

Surfaced while shipping the refrigerant-loop sim (the refrigeration cluster's
first interactive). The DOAS lesson's D3 diagram (PR #352) settled on a
**serpentine** coil motif, and the newer air-side diagrams have followed it, but
`html/education/air-handlers.html` still draws its coils with the older
**diagonal fin-line** treatment. Purely cosmetic — no data or label is wrong —
but the two coil idioms now sit one click apart in the same air-side cluster and
read as inconsistent. Fix: redraw the air-handlers coil(s) to the serpentine
motif in a future diagram-harmonization pass (grep the other education diagrams
for the shared shape first so the whole cluster lands on one coil vocabulary).
Low priority; no functional impact.

*(2026-07-17)* The refrigerant-loop simulator now draws both its coil bars with
the serpentine motif — live `data-flow` circuits joined to the pipe joints,
painted by the state gradients — so the refrigeration cluster's flagship
interactive sits on the settled coil vocabulary too. `air-handlers.html`
remains the holdout for the harmonization pass.

**Addressed (2026-07-18, PR #363).** Redrew all four air-handlers coil glyphs
(D1 `ah-d1-htg`/`ah-d1-clg`, D3 `ah-d3-htg`/`ah-d3-clg`) as square-wave H/V
serpentines on the DOAS reference geometry — D1's 40×70 coils take it verbatim
(5 passes, 13-unit spacing), D3's 44×140 zoomed-slice coils keep the rhythm
scaled (10 passes, 14-unit spacing); stroke-width 1.5, accent tokens and ids
unchanged. The grep-the-cluster check confirmed DOAS was the only other
education page drawing the motif and the filter glyphs' diagonals are filter
media, not coil fins — left as-is. Verified against rendered screenshots at
desktop/phone in both themes plus the `npm run screenshots` audit pass; suite
green (635 passed).

### 159. `refrigerant-pt.html` could consume `RefrigLoop.satTempAtP` / `pressAtSatTemp` *(addressed 2026-07-18)*

The refrigerant-loop engine (`html/scripts/refrigerant-loop-engine.js`) ported
`refrigerant-pt.html`'s inline `lerp` plus the `satTempAtP` / `pressAtSatTemp`
saturation lookups verbatim, so the exact same interpolation now lives in two
places: the tool's page-inline IIFE and the shared engine. Both read the same
`REFRIGERANT_TYPES` tables and agree by construction today, but a future table
or interpolation change has to be made twice. Fix: have `refrigerant-pt.html`
load `refrigerant-loop-engine.js` (or a smaller extracted lookup module) and
call `RefrigLoop.satTempAtP` / `pressAtSatTemp` instead of its own copy,
collapsing the two to one source. Deferred out of the sim's PR to keep it scoped
(the sim only *added* code; touching the shipped tool is a separate, testable
change). Flagged in the engine header as a tracked follow-up.

**Addressed (2026-07-18).** `refrigerant-pt.html` now loads
`refrigerant-loop-engine.js` (after `refrigerant-data.js`, per the engine
header's load order) and calls `RefrigLoop.satTempAtP` / `pressAtSatTemp`;
the page's inline `lerp` / `tempAtP` / `pAtTemp` copies are deleted, so the
interpolation lives in one source. The page gained the #139-pattern
`typeof RefrigLoop` guard (mirrors coil-sizing's `typeof Psychro`), degrading
to the muted state with an "engine unavailable" line if the script fails to
load. Numeric equivalence proven before shipping: a throwaway vm sweep
(old inline helpers extracted from git HEAD vs the engine lookups) across
all 6 refrigerants × both curves × both directions at 0.05 steps over the
full table ranges plus ±10 out-of-range margins and every breakpoint's
±1e-6/±1e-7 tolerance edges — 172,562 comparisons, 0 mismatches
(`Object.is`-strict, so bit-identical). The engine's dedup follow-up note
now records the collapse; no version bump (page-inline + unversioned
per-page script refs only).

### 160. Home Browse-card Simulators `desc` names five of seven sims *(addressed 2026-07-18)*

`html/index.html`'s Browse-card Simulators description still enumerates
five simulators ("a PID step-response loop, a mock drive keypad, a
function-block wiresheet, an equipment-staging plant, and a
controller-wiring rig") while the pill correctly says `7 Simulators` —
`hydronic-loop-builder` was already missing on main and
`refrigerant-loop` extends the drift. Only the pill is guarded by
`home-hero.spec.js`. Fix: add the two names or de-enumerate the desc.

**Addressed (2026-07-18).** Took the de-enumerate option (owner's
preference — it ends this drift class permanently rather than patching
it). The desc keeps its opening anchor and closing sentence but the
middle now characterizes the collection ("bump the setpoints, force
the faults, and watch loops, logic, and equipment respond live")
instead of naming pages, so adding a simulator only touches the
pill — which stays the sole count surface and stays guarded by
`home-hero.spec.js`.

### 161. `--blue-cool` small-text light-theme contrast is 3.74:1 *(addressed 2026-07-18)*

Light theme's `--blue-cool` (#5e8aa0) computes 3.74:1 on the white
surface — an AA fail wherever it colors small data text (the
refrigerant-loop P-T plot's SC gap label, the loop SVG's "cold
mix"/"cool vapor" labels, and the same return-side label color across
the older cycle/hydronics diagrams). A site-token decision, not a
page bug: retuning light `--blue-cool` moves every return-side
diagram at once. Mitigation today: the failing values are duplicated
at high contrast in adjacent LCD/legend text.

*2026-07-17 (refrigerant-loop legibility audit):* two more sightings —
the sim loop-SVG's "cold mix" / "cool vapor" annotations and the sim
P-T plot's canvas SC gap tag (drawn in `--blue-cool` at 10px via
`drawPlot`). If the token retune stalls, `drawPlot` could pin a darker
light-mode blue at draw time the way the gauge dials pinned
theme-constant ink — a page-local mitigation, not the token fix.

**Addressed 2026-07-18** (owner pick from the design-calls visual
brief): the **site-token retune**, not the page-local `drawPlot` pin —
light `--blue-cool` goes `#5e8aa0` → `#4d7286` in both synced
locations in `html/styles.css` (the `[data-theme="light"]` block and
its `@media print` duplicate). New ratios: 5.16:1 on `--surface`
(white, the failing sighting's backdrop), 4.73:1 on `--surface-2`,
4.53:1 on `--bg`, 4.32:1 on `--well` (the one sub-4.5 light backdrop;
no small `--blue-cool` text sits on a well today). Dark `#6f97aa`
untouched (5.02:1). The retune moves every return-side diagram at
once, keeping `--blue-cool` visibly the muted companion to `--blue`
(#11679f, 6.06:1).

### 162. `.copy-btn`'s `transition: all` animates the focus outline *(addressed 2026-07-18)*

`transition: all 0.15s` on `.copy-btn` makes the `:focus-visible`
outline fade/shift in rather than appear instantly on keyboard focus
(measured mid-transition during the sim's a11y verification).
Enumerating the intended properties (border-color, color, background)
fixes it site-wide; sweep other `transition: all` interactives while
in there.

**Addressed 2026-07-18:** the sweep found exactly three
`transition: all` rules in `html/styles.css` — and none in page-level
`{% block head %}` styles or shared scripts. Each now enumerates the
properties its states actually animate, durations unchanged:
`.copy-btn` → `color, border-color, background` (background included
because refrigerant-pt stacks `background: var(--accent-dim)` on its
`.copy-btn.active` mode toggles); `.tab-btn` (0.18s) → `color,
border-color` (covers `.active`'s `border-bottom-color`); `.bit`
(0.12s) → `background, border-color`. The `:focus-visible` outline now
snaps on instantly on all three. Matches the enumerated-transition
shape the rest of `styles.css` already uses (e.g.
`.tool-card-fullscreen-btn`).

### 163. CSS fullscreen leaves the background page keyboard-focusable *(addressed 2026-07-18)*

`fullscreen-toggle.js` pins the tool-card at z-index 300 but nav /
footer / back-link behind the overlay stay tabbable — Shift+Tab from
the fullscreen button lands focus on links that are visually covered,
so the focus indicator disappears. Fix in the shared mechanism:
`inert` on the siblings (or aria-hidden + tabindex management) while
`body.has-fullscreen-tool` is set. Affects every fullscreen-capable
tool, not just the refrigerant-loop sim.

**Resolution (2026-07-18):** `setState()` now applies background
containment on enter and clears it on every exit path (button, ESC,
`Fullscreen.exit`): `applyInert()` walks from the fullscreen target up
to `<body>`, setting the `inert` attribute on each level's siblings —
the same mechanism search.js uses for the palette (#121); on browsers
without inert support the attribute is a harmless no-op and behavior
degrades to the old tab order. Everything it sets is tagged
`data-fs-inert` so `clearInert()` removes exactly what enter added
(idempotent across repeated cycles). Three exclusions: `<script>`
elements, anything already inert (a page's own containment isn't ours
to undo), and `#palette` — the command palette layers ABOVE fullscreen
(z-index 1000 vs 300) and stays usable via Ctrl/⌘-K, which surfaced a
real interaction: search.js's `setBackgroundInert(false)` stripped
`inert` from every body child on palette close, un-inerting the
fullscreen background. Its off-path now skips `data-fs-inert` carriers.
Regression tests in `tests/fullscreen-toggle.spec.js`: chrome inert +
a 25-step Shift+Tab walk that never escapes the card + exact restore
(psychrometric-chart), two enter/exit cycles with a pre-existing inert
surviving (refrigerant-loop), and palette open/close over fullscreen
keeping the containment. Shipped on `issue-163/fullscreen-inert`
(version bump 3.56.0 → 3.56.1 — both scripts are `?v=`-cached).

### 164. Touch-target floor block doesn't cover `<select>`s *(addressed 2026-07-18)*

The `TOUCH-TARGET FLOOR` block pads chrome-level buttons to ≥44px on
touch devices, but selects were never in it — the refrigerant-loop
sim's refrigerant `<select>` measures 39px on touch (better than the
shipped 29px `.ps-input` baseline on refrigerant-pt, still under the
floor). Site-wide conversation: adding `.field select` (or `.ps-input`
generally) to the block changes density on every tool page.

**Addressed 2026-07-18** (owner pick from the visual brief's candidates:
floor the **whole form-control family**, not just selects — flooring
only selects would leave 44px selects towering over 29px inputs in the
same property sheet). Added `.field select`, `input.ps-input`, and
`select.ps-input` to the TOUCH-TARGET FLOOR block (min-height ONLY —
replaced elements, the group's inline-flex would fight native
rendering); `textarea.ps-input` stays out (the one instance is
multi-row and clears natively). Also fixed the block's header comment,
whose ".ps-input fields … clear 44px natively" claim the 2026-07-18
measurements disproved (29px). Desktop density untouched — everything
sits inside the existing `(hover: none)` gate; `touch-floor.spec.js`
now pins both halves (≥44px on touch, compact on desktop pointer).

### 165. `refrigerant-data.js` coarse low-pressure rows at the table bottoms *(open — 2026-07-16; glide-band wording addressed 2026-07-18)*

Two content-accuracy nits from the 2026-07-16 source-PDF re-verification
(all ~340 table rows matched their cited sources exactly): (a) the
header and the r407c note said the glide is "~8–13 °F", but the
transcribed table correctly narrows to ~6.5 °F at its top rows; (b) the
R-454B and R-407C sources jump 0→20→40 and 0→10→20 psig at the bottom,
so the linear chord can read ~2–4 °F low around e.g. 10 psig R-454B —
faithful to the charts and irrelevant at A/C pressures, but worth
densifying from Genetron Properties data if low-temp refrigeration
lookups ever matter.

**(a) addressed (2026-07-18).** Trued both prose sites (the header's
r407c source line and the R-407C `note`) to what the transcribed table
supports: the dew−bubble spread is ~12.6 °F at 0 psig, narrowing
monotonically to ~6.5 °F at 425 psig — now stated as "roughly 6–13 °F,
narrowing at high pressure." Comment/prose only; no data rows or code
touched.

**(b) remains open**, same trigger: densify the coarse low-pressure
rows from Genetron Properties data only if low-temp refrigeration
lookups start mattering. The refrigerant-loop sim's heat-pump mode will
exercise these rows at low ambient, which slightly strengthens the
future case, but the call stands.

### 166. `.tool-tag` / `.ok-pill` accent-on-accent-dim text fails AA in both themes *(addressed 2026-07-18)*

Both classes set `color: var(--accent)` on the `--accent-dim` wash at
0.62rem (9.92px); the refrigerant-loop legibility audit measured
4.08:1 dark / 4.25:1 light — an AA small-text fail in both themes.
The fix is asymmetric, which is why it needs a token-level design
decision rather than a drive-by swap: moving the text to
`--accent-bright` fixes dark (5.60:1) but *worsens* light to 3.48:1 —
so it likely wants a light-theme-specific green (or a size bump past
the large-text threshold). Blast radius: `.tool-tag` sits in the
header of ~100 pages (every tool / simulator / education / practice
page), and `.ok-pill` renders on every page via
`_includes/footer.njk`, plus the `_includes/nav-card.njk` statuslines
and `index.html`.

**Resolution (2026-07-18):** owner picked the purpose-token option
(over a global `--accent` retune or a size bump past the large-text
threshold) from the design-calls brief: new `--accent-ink` token —
"accent-colored text that must read at small sizes on the
`--accent-dim` wash" — dark `#86cf4d` (rides `--accent-bright`'s
value), light `#356e12` (deeper than `--accent`; brighter *worsens*
light). Computed on the real composited washes: 5.60:1 dark /
5.00:1 light, vs the failing 4.09/4.27. Only the two class rules'
`color:` switched (`.tool-tag`, `.ok-pill`); pill dots, borders, and
every other accent consumer stay `--accent` (≥3:1 UI floor passes).
Token added to all three synced blocks (`:root`, light, `@media
print`). The per-theme asymmetry now lives in one token instead of a
brand-green retune. Known gap, deliberately out of scope: the
`.nav-card-titlebar .ok-pill` variant recolors via `--section-accent`
(plum/teal/amber) and isn't covered — tracked as its own issue.

### 167. Fixed-px canvas type on canvases that grow — psychrometric-chart has the sim's latent bug *(addressed 2026-07-18)*

The refrigerant-loop P-T plot drew all canvas text at fixed 9–10px
while fullscreen grew the canvas 988×260 → 1218×645 — fixed in this
PR by deriving a clamped type scale from the canvas CSS box (the
`fScale` clamp in `drawPlot`; use it as the template).
`tools/psychrometric-chart.html` has the same *latent* bug today:
10/11px canvas fonts plus a fullscreen mode that enlarges the canvas.
`scripts/pid-chart.js` (pid-tuner, pid-basics) and the
staging-sequencer canvas share the 9–10px fixed-type pattern but have
no fullscreen mode yet — they only inherit the bug if one lands.

**Fixed (2026-07-18)** for the one page where the bug was live:
`drawPsychChart` now derives the sim's clamped type scale from the
canvas CSS box — `fScale = clamp(cssW / 52, 10, 16)` (width alone
sets it; the canvas aspect is fixed 8/5 in CSS, so the template's
height term would be dead code) — and both `ctx.font` sites ride it
(`fBase` for ticks / curve labels / axis captions, `fNode =
fScale × 1.1` for state-point labels). The `padR` / `padB` label
gutters scale in step so bigger type keeps its row. The /52 divisor
keeps the normal 524px-wide box at today's exact 10/11px
(before/after pixel-identical); fullscreen reaches 12px at 1400×900
and the 16px cap from ~1920×1080 up. The pid-chart.js and
staging-sequencer halves stay **latent-only** — still fixed-px, still
no fullscreen mode, so no live bug; apply the same pattern if either
ever gains one. PR: issue-167/psychro-canvas-type.

### 168. Form-label scan hierarchy: shared `label, .field-label` rule dims the scan targets *(open — 2026-07-17, low priority)*

The shared rule in `styles.css` sets every form label to 0.7rem
`--text-dim`, so on control-dense pages the captions you scan FOR are
the dimmest ink in the block while the values render accent/bright —
hierarchy inverted for scanning. Not a WCAG fail (5.67:1 dark /
5.27:1 light as filed; the light figure is 5.51:1 since the 2026-07-20
`--text-dim` retune), purely a hierarchy question. The refrigerant-loop sim
now overrides page-locally (this PR: controls / presets / fullscreen
view-toggle captions lifted to `--text`) — precedent to reach for if
the same read recurs elsewhere before any site-wide retune. Affects
every `<label>`-bearing page (~46).

### 169. Refrigerant-loop frozen state: suction frost wash kisses the COMPRESSOR label *(addressed 2026-07-18)*

Pre-existing on main (verified there — not introduced by the
serpentine/crossflow branch), cosmetic: in the frozen state the
suction-leg frost wash rect (x=116, 8 wide) and the suction particles
riding that leg kiss the right edge of the COMPRESSOR label (text
right edge ≈ x=118). A ~4px left nudge of the wash column (or the
label) would clear it. Noticed during the PR #355 review follow-ups;
out of that PR's scope.

**Fix (2026-07-18, heat-pump-mode PR):** the LABEL moved, not the
wash — the wash must stay centered on its pipe (x=120), so the
COMPRESSOR label's anchor nudged x=80 → 74. Measured with the site
fonts (verification round: a 76 first cut left only ~0.6px to the
wash), the right edge lands ≈113.4 — ~2.6px clear of the x=116 wash
and ~4.6px clear of the x≈118 particle edge, both themes. Outside
the four frost-overlay placement constraints (those bound the marks).
Rode along because that PR rebuilt the frost machinery (second kit on
the top bar for heating frost).

### 170. Home Browse-card desc enumeration drift, round two — Education arc + Tools examples *(addressed 2026-07-18)*

Same hand-kept drift class as #160 (just closed by de-enumerating the
Simulators desc), noticed during the 2026-07-18 wave. `html/index.html`'s
Education Browse-card desc still enumerates a five-lesson "current arc"
(PID control → hydronic loops → load piping → VFDs → pump control) out
of the 30 lessons its own pill counts — a framing that predates the
air-side and BACnet buildouts — and the Tools card names four example
topics (psychrometric staging, signal scaling, register/address
conversions, thermistor curves) out of 31 tools. The pills are guarded
by `home-hero.spec.js`; the descs are NOT test-guarded. Candidate fix:
de-enumerate both the way #160's fix did the Simulators card, or
refresh the enumerations deliberately as an editorial pick.

**Resolution (2026-07-18):** owner picked de-enumeration (over
refreshing the enumerations as a recurring editorial chore, which
would have kept the drift class alive). Two desc strings in
`html/index.html`'s Browse `navCard()` calls changed, nothing else —
each keeps its opening anchor and closing beat and swaps the page
list for a kind-level characterization that stays true as pages
land. Tools: the four-topic list (psychrometric staging, signal
scaling, register/address conversions, thermistor curves) becomes
"conversions, sizing checks, protocol decoding, and the reference
tables that are never around when you need them," with "Open one,
get an answer, get back to work." kept. Education: the five-lesson
"current arc" chain becomes "lessons on the loops, systems, and
protocols behind the day-to-day work," keeping the "not a glossary"
anchor and the "each asking one question…" characterization. Count
pills, hero, `Latest:` badge, and the *Tools by Category* cards were
left untouched — other in-flight lanes owned those surfaces. With
both descs now count-free and page-free, the fact that descs aren't
test-guarded (unlike the pills, which `home-hero.spec.js` guards)
stops mattering on these two cards; the class is closed the same way
#160 closed it for Simulators.

### 171. `.nav-card-titlebar .ok-pill` section-accent tints sit outside the #166 fix *(addressed 2026-07-18)*

The #166 `--accent-ink` fix covers the default accent-on-accent-dim
pills, but `.nav-card-titlebar .ok-pill` (`html/styles.css`, nav-card
block) recolors via the `--section-accent` cascade — plum (education),
teal (simulators), amber (practice) — text on the matching
`--section-accent-dim` wash. Those section-tinted pills' small-text
contrast on the titlebar wash was never measured in either theme and
the accent-ink twin doesn't reach them. Needs a measurement pass
(four accents × two themes) and possibly per-section ink twins if any
fail. Noticed during the 2026-07-18 wave; see #166.

**Resolution (2026-07-18):** owner picked option A1 — mirror #166's
purpose-token mechanism per section (over retuning the raw
`--teal` / `--amber` / `--plum` hues, which would have moved the
gutter-motif palette too, and over bumping the 0.62rem pill past the
large-text threshold). New `--teal-ink` / `--amber-ink` /
`--plum-ink` land in all three synced token blocks (`:root` dark,
`:root[data-theme="light"]`, the `@media print` light twin) — the
same placement pattern `--accent-ink` shipped with. `.nav-card`
gains `--section-accent-ink: var(--accent-ink)` as the cascade
default and the education / simulators / practice modifiers override
it; only the `color:` on `.nav-card-titlebar .ok-pill` switched, so
the dot (`::before`) and `border-color` stay on the raw section hue
(the 3:1 non-text floor passes everywhere). Dark amber's ink is
`--amber`'s own value — dark amber already cleared AA.

Two corrections to the framing above. First, the failure count: the
options brief's prose said 5 of 8 accent × theme combos failed, but
its own enumerated ratios listed six, and independent
re-measurement confirmed **6 of 8** — only teal-light (4.54) and
amber-dark (4.86) passed. Second, and more important, this entry
assumed #166's `--accent-ink` still reached the *default* green
pills. It did not: `color: var(--section-accent)` on the titlebar
rule also overrode the base `.ok-pill`'s `var(--accent-ink)`, so the
green sections (tools / home / reference) were regressed by this
same rule — green dark 4.08, green light 4.25, both failing. The
`--section-accent-ink: var(--accent-ink)` default alone repairs
that, with no per-section override needed for green.

Measured on the composited backdrop (`-dim` wash over
`--surface-2`), by token math and by 3× pixel sampling of the
rendered pills, the two agreeing within ±0.03 — before → after:
green dark 4.08 → 5.59; green light 4.25 → 4.99; plum dark 3.63 →
4.86; plum light 4.26 → 4.82; teal dark 4.17 → 4.82; teal light
4.54 → 4.88; amber dark 4.86 → 4.86; amber light 4.44 → 4.88.
Every combo now clears 4.5:1 with headroom (≥4.82). Also measured
during the arc's verification round and passing as-is, so no
follow-up: the `.nav-card-pill--desktop` amber statusline text at
6.33 dark / 5.05 light.

Known gap, deliberately out of scope: nothing pins these ratios in
CI. No contrast harness exists to extend (`a11y-bundle.spec.js` is
keyboard/ARIA behavioral only) and #166 shipped without a spec pin
either — inventing one was judged a separate piece of work rather
than a rider on this fix.

### 172. Touch-target parity tail: vfds source selects + contact text inputs under 44px *(addressed 2026-07-18)*

The parity tail left after #164's select coverage, noticed during the
2026-07-18 wave: `html/education/vfds.html` has two `<select>`s inside
`.vfd-w-sources` (`#vfd-run-src`, `#vfd-spd-src`) that are neither
`.field select` nor `.ps-input`, measuring ~38.6px on touch, and
`html/contact.html`'s `.field` text/email inputs also sit ~38.6px. No
within-page mismatch on contact (its controls match each other), but
these are the remaining under-44 form controls if full touch-target
parity is wanted. See #164.

**Resolution (2026-07-18):** owner took full parity, and the fix
shipped as a shared-class family extension rather than the two
page-local patches this entry implied — because the measurement
pass contradicted the problem statement twice. The vfds source
selects measured **31.8px**, not the ~38.6px recorded above; and the
under-floor set was not "vfds + contact" but **9 controls on 4
pages** (touch emulation, isMobile + hasTouch, 390×844):
`#vfd-run-src` / `#vfd-spd-src` (education/vfds) at 31.8px, and at
38.6px `#contact-name` / `#contact-email` (contact), `#pid-sg-dco` /
`#pid-sg-dead` (pid-tuner), `#stg-up` / `#stg-delay` / `#stg-min`
(staging-sequencer). The real root cause was broader than the
entry: #164 floored `.field select` and the `.ps-input` family but
never `.field input` at all.

So `.field input` joins the #164 form-control family in the
consolidated `TOUCH-TARGET FLOOR` block (`min-height` only,
`(hover: none)`-scoped), and the two vfds selects — widget internals
with no shared class — get a page-local `@media (hover: none)` floor
in the page's own `{% block head %}`. That split is now written down
as a rule in the block's comments and in CLAUDE.md: the shared block
holds shared-class selectors only. All nine measure 44.0px on touch;
a desktop pointer context keeps the compact 31.8 / 38.6px
workstation density. Verified unmatched by the new selector: the
contact honeypot (`.hp-field`, not `.field`) and the message
textarea (which clears the floor natively at ~204px).
`tests/touch-floor.spec.js` pins both directions — ≥44px on touch,
<44px on desktop.

Coverage note from the arc's verification round: the nine figure was
the *visible-at-load* subset. Four more `.field` number inputs
hidden at load — `#stg-sched-days`, `#stg-down`, `#pid-sg-dpv`,
`#pid-sg-tau` — were equally under-floor, and the shipped
`.field input` selector covers them too. Read the disposition as
**9 measured at load, 13 total in the family**; no follow-up fix is
needed. The same PR also trued up CLAUDE.md's stale claim that the
answer-level controls "already clear 44px and aren't in the block,"
which had been wrong since #24 / #164.

### 173. `tests/worker.spec.js` prints a loud stack trace from a passing expected-error test *(addressed 2026-07-18)*

The Resend 502 paths ("Resend non-2xx → 502" / "Resend network failure
→ 502") exercise `src/worker.js`'s `console.error("Resend request
failed", err)` / `("Resend returned non-2xx", …)` handlers, so a fully
PASSING run prints a stack trace and error lines into the reporter
output — clean runs look dirty, and a real failure is harder to spot
in the noise. Wrap or silence the expected error output around those
assertions (stub `console.error`, or assert on it), leaving the
worker's production logging intact. Noticed during the 2026-07-18
wave.

**Resolution (2026-07-18):** shipped as stub-**and**-assert — both
halves of the candidate rather than a pick between them, since
silencing alone would have thrown away a free assertion. A new
`captureConsoleError(fn)` helper in `tests/worker.spec.js` stubs
`console.error` for the duration of `fn`, records the calls, and
restores in a `finally` so the stub can't leak past an assertion
failure (Playwright runs tests sequentially within a worker process,
so no other test's output gets swallowed). The two Resend 502 tests
wrap their `postContact` call in it and then assert the worker
logged what it should — `'Resend returned non-2xx'` with status
`500`, and `'Resend request failed'` with an `Error` instance — so
the tests got stronger, not just quieter. Noise removed from a
passing run, measured: one error line plus a 14-line stack trace.
`src/worker.js`'s production logging is untouched; test-only change,
no version bump.

### 174. Refrigerant-loop: `rl-air-*-heads` arrowhead groups share the air-lane id prefix *(deferred 2026-07-18)*

The `rl-air-*-heads` arrowhead groups match the `[id^="rl-air-e-"]` /
`[id^="rl-air-c-"]` selectors the `AIR_E` / `AIR_C` NodeList loops
build from (`html/simulators/refrigerant-loop.html`). The loops no-op
over the groups harmlessly — documented in the page — but the
coupling is implicit: a future loop that styles everything it matches
would repaint the arrowheads too. A stricter selector family (e.g. a
`data-` attribute marking the lane paths, in the spirit of the
attribute-only SVG-selector convention) would be cleaner. Low.

**Decision (2026-07-18):** deferred. The coupling is inert today —
the `AIR_E` / `AIR_C` loops no-op over the arrowhead groups — and
it's already documented in-page, so fixing it standalone is churn:
a selector-family refactor with no user-visible change and a
non-zero chance of disturbing a lane that currently animates
correctly. It should be tightened by whoever is next in that code,
not by a PR that exists only to tighten it. Trigger for revisit: the
next time the refrigerant-loop simulator's SVG lane structure gets
substantive work — tighten the selector family then (e.g. a `data-`
attribute marking the lane paths, per the attribute-only
SVG-selector convention) while already in there.

### 175. Refrigerant-loop: fixed low-side gauge range parks the needle in deep low-ambient heating *(deferred 2026-07-18)*

The low-side gauge's dial range is anchored by a fixed `refTemp: 60`
(`html/simulators/refrigerant-loop.html`, gauge config — a 200 psig
dial sized for cooling-mode suction). In deep low-ambient heating the
suction pressure drops to ~45 psig on that 200 psig dial, leaving the
needle very low with most of the dial dead — readable, but a per-mode
gauge range (heating anchoring on a lower refTemp) would serve heating
better. Low / design idea, noticed during the 2026-07-18 wave.

**Decision (2026-07-18):** deferred. The needle stays legible at the
bottom of the dial, so what's wrong here is a dead dial region —
cosmetic, not a misread. Per-mode ranging is also the kind of change
that belongs bundled with heating work rather than shipped alone: on
its own it's a one-sim tweak to a gauge config, and it invites a
second pass the moment anything else about heating-mode presentation
moves. Trigger for revisit: either the air-side simulator adopting
the same gauge component — at which point per-mode ranging becomes
shared infrastructure rather than a one-sim tweak — or the next arc
that resumes work on heat-pump / heating-mode behavior.

### 176. Refrigerant-loop engine: ambient droop masks the blocked-filter high-head warn in deep cold *(addressed 2026-07-18)*

Verification-round finding on PR #368: with the ambient droop live, a
blocked indoor filter in DEEP cold (below ~17 °F ambient) no longer
crosses the absolute `HIGH_HEAD_SPLIT_HEAT` threshold
(`html/scripts/refrigerant-loop-engine.js`) — the drooped baseline
sits far enough below the onset that the filter's head rise never
reaches it, so the frost warn owns that regime. The blocked filter
still flags normally at 40–65 °F ambient. Re-tuning the threshold
relative-to-droop (split against the drooped baseline rather than an
absolute onset) changes when the warn fires across the whole heating
envelope — a design call. Decision-needed.

**Resolution (2026-07-18):** owner picked candidate (b) — measure
the split *relative* to the drooped design baseline — over nudging
the absolute onset down (which only moves where the blind spot
starts) and over leaving the frost verdict to own deep cold (which
loses a real, separately-diagnosable fault). `HIGH_HEAD_SPLIT_HEAT:
38` becomes `HIGH_HEAD_EXCESS_HEAT: 3` — the same +3 margin cooling
already uses at 18-over-15. The heating block hoists the droop term
and exposes `droopedDesignSplit = SPLIT_BASE_HEAT + ambDroop`
(design split = 35 + 0.5·min(0, ambient − 47)), and `highHead`'s
heating rung compares `split − droopedDesignSplit` against it. The
absolute `tCond > 120 °F` rung and the cooling rung are untouched,
and verdict priority is unchanged — below 40 °F the frost verdict
still owns the pill, so this moves the HEAD LED and the
screen-reader alarm list only.

Correction to the problem statement above: "the blocked filter still
flags normally at 40–65 °F ambient" was only half right. The
absolute onset also **desensitized the whole 18–47 °F band** — onset
airflow ~0.62 at 30 °F against 0.85–0.90 on a mild day — so the
40–47 °F corner was already degraded, not normal. The fix therefore
makes that band warn slightly earlier (onset airflow 0.90 vs the old
0.78–0.90); that is the desensitization being removed, not a
regression.

Measured, each pinned as an assertion in
`tests/refrigerant-loop-engine.spec.js`: deep cold restored — a
fully blocked indoor filter at 10 °F ambient had run head 261 → 340
psig with no tell, and onset airflow is now uniform at 0.90 clear /
0.85 fires across −5…65 °F; bit-identical at 47–65 °F ambient, where
the droop is zero, so excess ≡ split − 35 and the old `split > 38`
boundary holds exactly (the split sum keeps its addition order via
the hoisted `ambDroop`, so every solved number is bit-identical at
every ambient); zero frost-alone false positives — condenser-air
starvation, condAir 0.40–1.20 across ambient −5…45 °F, with a clean
indoor filter never fires highHead; heating presets (frosted-coil,
defrost, low-ambient) unchanged. One further intended behavior
change: overcharge (charge 1.20) now flags at every ambient — honest,
and the pill is unchanged because floodback outranks it.

### 177. Home Practice Browse-card desc names a specific drill *(open — 2026-07-18, low; may be intentional; **RESOLVED 2026-08-12** — owner ruled KEEP, call-site comment added)*

`html/index.html` — the Practice Browse-card `desc` ends "New to the
field? Surviving Your First Months is the gentlest place to start."
Structurally that's the same surface #160 and #170 were fixed on: a
page name living in a hand-kept desc string with no test guard, so it
goes stale silently if the drill is renamed, retired, or displaced as
the natural entry point (the pills are guarded by
`home-hero.spec.js`; the descs are not).

Unlike #160 / #170, though, this one reads as a **deliberate
editorial entry-point** rather than an incidental enumeration —
naming one starting place for a newcomer does work that a kind-level
characterization can't. So the de-enumeration reflex is likely wrong
here and this wants an owner call, not an automatic sweep: either
keep the name and accept it as a surface someone must remember to
true up (worth a comment at the call site saying so), or drop to a
generic "start with the field drills" phrasing and lose the
hand-hold. Low. Logged-only from the 2026-07-18 arc.

**RESOLVED 2026-08-12 (owner ruling, the clear-the-decks decision
batch): KEEP the name.** The entry's own read was right — it is a
deliberate editorial entry-point, and the hand-hold does work a
kind-level phrase can't. A Nunjucks comment now sits at the call
site (`html/index.html`, the Practice `navCard`) naming the ruling
and the true-up obligation, which was the accepted cost.

### 178. `pid-basics.html` eyebrow carries the `<h1>` — sole outlier among the lessons *(open — 2026-07-18, low; document-outline, not cosmetic)*

`html/education/pid-basics.html:17` uses
`<h1 class="section-label">Education · PID Basics</h1>` for its
eyebrow, and has no `<h1 class="tool-card-title">` anywhere. All 38
other lesson pages use the span-eyebrow +
`<h1 class="tool-card-title">` shape; the only other page with the
`<h1 class="section-label">` form is `education/index.html`, which is
legitimate — CLAUDE.md's heading rule explicitly lets the eyebrow
carry the `<h1>` "on landings without a tool-card." pid-basics is not
a landing and does have tool-cards, so it sits outside that carve-out.

Worth being precise about the severity, because it's easy to over- or
under-call. It is **not** a duplicate-`<h1>` violation — the page has
exactly one, so the "exactly one `<h1>` per page" rule is satisfied
and no validator flags it. What is actually wrong is the *content* of
that `<h1>`: it's the breadcrumb string "Education · PID Basics"
rather than the page's topic. A screen-reader user navigating by
heading, and any consumer reading the document outline, gets
navigation chrome where every sibling lesson gives a descriptive
title. The page's real section headings then sit at `<h2>` under an
`<h1>` of the same `.section-label` class, so the chrome element
outranks the content headings. That makes it a document-outline
defect rather than a cosmetic one — low priority, but it should be
fixed as a semantics change, not filed as styling. Logged-only from
the 2026-07-18 arc.

### 179. `function-blocks.html` (and `setpoint-math-reset.html`) lack the follow-on-paragraph margin rhythm *(open — 2026-07-18, low / cosmetic; **RESOLVED — superseded by the LESSON PROSE RHYTHM rule; measured closed 2026-08-12**)*

`html/education/function-blocks.html` has five follow-on paragraph
pairs (a `<p>` immediately after another `<p>`) and zero
`style="margin-top:…"` treatments, so its prose renders tighter than
the Programming-chapter lessons that do carry the rhythm —
`boolean-logic-latches` (10 treated), `timers-and-delays` (13),
`comparators-and-deadband` (12). Purely visual; no semantic or
behavioral effect.

One correction to the shape this was first noticed in: function-blocks
is **not** a lone outlier. `setpoint-math-reset.html` — the newest
page in the chapter — has six follow-on pairs and zero treatments too,
so it shipped the same way. Anyone picking this up should fix both, or
the "bring the odd page up to the chapter rhythm" framing will true up
function-blocks and leave the most recently shipped page still out.
That two-page split also raises the prior question: an inline
`style="margin-top:1.25rem;"` repeated a dozen times per page is the
thing actually causing the drift, and a shared `p + p` rule (or a
`p.follow-on` utility, per the element-qualified prose-utility
convention) would end the class rather than re-fix it page by page.
Logged-only from the 2026-07-18 arc.

**RESOLVED — this entry's own last paragraph shipped as the fix, and
nobody came back to mark it.** The shared LESSON PROSE RHYTHM rule
(`body.education-page .tool-body p + p:not([class])`, the #179→#190
arc recorded in CLAUDE.md) is exactly the "shared `p + p` rule" the
paragraph above proposed, and it reaches both pages with no inline
treatment needed. Measured on the built site 2026-08-12
(clear-the-decks queue, verify-before-fix): every unclassed follow-on
pair on BOTH pages computes `margin-top: 20px` (= the house 1.25rem)
— function-blocks 5 pairs, setpoint-math-reset 5 pairs (the entry
counted six; one pair has since gained a class or moved, the
remainder are all treated). Nothing left to fix; closed by
measurement rather than by a diff.

### 180. Forced-air chapter: stale terminal-position claims + a hand-kept page count *(addressed 2026-07-19)*

`air-balancing` and `dedicated-outdoor-air` joined the `forced-air`
chapter after `duct-static-control`, and prose written when
duct-static was the closer never got trued up. The chapter now holds
**eight** pages (`category: forced-air`), and `educationSequence.js`
puts duct-static at position 6 of 8 — third-from-last, not last.
Three sites, one root cause:

- `html/education/vav-systems.html:181` — "the answering half of the
  mirror is [the last page of this chapter]", anchored at
  duct-static-control.
- `html/education/vav-systems.html:248` — "How the fan *knows* how
  much to slow down is the [chapter's last page]", same anchor.
- `html/education/duct-static-control.html:616–617` — a two-for-one:
  "here's the field move this chapter has been building toward"
  (a terminal-position claim from a page that is now third-from-last)
  **and** "read it the way these six pages did" (a hand-kept count,
  stale by two).

The first two are the stale-terminal-position class; the count in the
third is the same enumeration-drift class as #160 / #170, and the
de-enumeration fix shape applies directly to it — "read it the way
this chapter did" carries the same instruction and can't go stale.
The terminal-position claims need a rewrite rather than a
de-enumeration, since the sentences do real work pointing forward and
would need re-aiming at whatever the chapter's actual closer is (or
rephrasing to name duct-static by role instead of by position).
Logged-only from the 2026-07-18 arc; see #182.3, which proposes a
guard for exactly this prose class.

**Resolution (2026-07-19):** fixed by PR #395
(`fix/forced-air-chapter-position-claims`). The entry named three
sites carrying four claims; the sweep that answered it retired
**twelve claims across eight files**, because the root cause was
never per-sentence. The chapter grew 6 → 8 by append
(`air-balancing` 2026-07-14, `dedicated-outdoor-air` 2026-07-15) and
every claim naming `duct-static-control` as the closer went stale in
the same instant — including several the entry hadn't found
(`duct-static-control.html:597` "That closes the six-page chapter",
`air-handlers.html:441` "it closes this chapter as its own page",
`building-pressure.html:507` "why that loop closes this chapter",
`air-balancing.html:27` "The rest of this chapter walked", plus the
`practice/duct-static-control.html` intro and the practice landing's
matching card `desc`, both of which said "close the chapter from
memory").

Two fix shapes, applied per claim class rather than uniformly:

- **Terminal-position claims were re-aimed to name the page by role,
  not position.** `vav-systems.html:181` and `:248` both dropped the
  anchor text "the last page of this chapter" / "chapter's last page"
  for plain "duct static control"; `air-handlers.html:441` became "it
  has its own page in this chapter". The deliberate choice was
  drift-proofing over merely-correct wording — `vav-systems:248` could
  have read "the chapter's *next* page" (true today, 5 → 6) and was
  de-ordinalized instead, since inserting any page between the two
  would falsify it again. `vav-systems.html:626` was left alone: its
  relational "the next page of this chapter" was already correct
  (vav-systems is 5, duct-static-control is 6), leaving the page one
  chapter-qualified relational pointer instead of three.
- **Counts were de-enumerated**, the #160 / #170 fix shape: "read it
  the way these six pages did" → "these pages did"; "With the chapter
  in hand" → "With that arc in hand". `duct-static-control`'s closer
  was **re-scoped rather than renumbered** — "That closes the
  six-page chapter" → "That closes the arc from the unit to the
  loop", so its five-beat recap now recaps the arc it actually walks
  and a ninth page cannot break it.

The sweep also added the forward handoff the append had left missing:
a new paragraph on `duct-static-control` pointing at **air balancing**
and **dedicated outdoor air**, framed on the gap between a system that
*should* work and one that *does* — balancing catches the starved wing
the static loop structurally cannot see, and DOAS changes what these
coils are asked to do. `air-unit-identification.html:223`'s "its own
future topic" became a live link now that the page exists, with
`dedicated-outdoor-air` added to that page's `relatedLinks`.

Note on scope: PR #396 (`fix/stale-claims-site-sweep`) merged the same
day and is the **same defect class at different instances** — fourteen
unrelated stale claims elsewhere on the site — but it touched none of
this entry's sites. #395 closes this entry alone.

One instance of the class survives both PRs and is recorded under
#182's 2026-07-19 update: `metering-devices-txv-eev.html:303` says
"the three-page chapter", true today and stale the moment the
refrigerant chapter grows. As of this writing it is the only surviving
`N-page` claim in `html/`.

### 181. Process: reverse cross-links are unowned when lanes ship in parallel *(addressed 2026-07-19)*

Not a code defect — a defect in how parallel lanes are specified,
recorded here because it produced a real, shipped content gap.

The 2026-07-18 arc shipped two chapters under identical conventions
with opposite outcomes. The Signals chapter's `relatedLinks()`
reciprocity was fully paid; the Programming chapter's was **entirely
unpaid** — four lessons that name each other in prose shipped with
zero sibling links between them. The difference was structural, not
carelessness: Signals happened to have a lane that merged second and
retro-paid the anchors, and Programming had no such lane. The
two-phase lane pattern has no step that assigns ownership of a reverse
link, so when the target page is still unmerged at draft time the debt
gets recorded in a PR body and then evaporates the moment that PR
merges — nothing carries it forward.

Concrete fix for next time: the lane spec should name **which lane
pays each reverse link**, decided before the second lane opens, so the
obligation lives in the spec rather than in a PR body.

Also worth knowing before anyone treats PR bodies as a ledger: roughly
a third of the debt itemized in those bodies turned out to be
*phantom* — already paid during conflict resolution, with the bodies
never amended. So PR bodies proved unreliable in both directions,
under-recording paid work and over-recording outstanding work. Any
future reconciliation should verify against the built site, not
against the prose in a merged PR. Logged-only from the 2026-07-18 arc.

**Resolution (2026-07-19):** promoted to `CLAUDE.md`'s `## Workflow`
section as two bullets — lane-spec reverse-link ownership, and the
"PR bodies are not a reliable debt ledger" warning — and closed here.

Closed by relocation, not by fixing anything in the tree. This is a
**process** defect, and `codebase-issues.md` is the wrong home for it:
entries in this file are read during audits, which is strictly too
late for a rule whose whole job is to fire *when a lane spec is
written*. A convention that must be consulted before work starts
belongs where conventions live. Nothing about the finding changed —
only where it can be found in time to matter.

### 182. Three defect classes this arc that a green build cannot see *(open — 2026-07-18, guard proposals; sub-items 1, 2 + the fourth proposal shipped as PR #398 2026-07-19; stays open for the prose lint — see both Updates)*

Three classes surfaced during the 2026-07-18 arc that build clean,
pass the full suite, and ship broken anyway. Logged together because
converting a recurring class into a spec guard is this arc's
established habit and it has already caught real regressions
(`educationSequenceGuard`, `navCategoryGuard`, the home count-pill
drift guard). Each is a guard proposal, not a fix:

1. **Missing `quizOrder.js` entry.** A quiz page whose slug is absent
   from the order array builds green, passes every test, and silently
   ships no "Next quiz →" link — while its predecessor points straight
   past it. Caught by hand on `reading-a-wiresheet`. Guardable the
   same way `educationSequenceGuard` works: assert every
   `nav: practice` **content-quiz** page's slug appears in
   `quizOrder.js`. Field drills are legitimately excluded, so the
   guard keys off the content-quiz/drill distinction rather than
   `nav:` alone.
2. **Dead anchor fragments.** Nothing resolves `href="/…#fragment"`
   against the target page's ids. PR #393 verified 19 fragments with
   an ad-hoc script; once that script is gone, nothing keeps them
   honest, and a renamed `id` breaks an inbound deep link silently.
   Guardable by walking the built `_site` HTML and asserting every
   internal fragment href has a matching `id` on the target page —
   a whole-site check that needs no per-page maintenance.
3. **Cross-chapter mis-attribution.** "This chapter's X" prose where
   X belongs to a different chapter. Found live in `timers-and-delays`
   (fixed in PR #393); #180 above is the same shape within one
   chapter. Genuinely harder to guard, since it's prose and the
   failure is semantic — but a grep-based lint over the
   chapter-claiming constructions ("this chapter", "the last page of
   this chapter", "these N pages"), cross-checked against the page's
   `category` frontmatter and the chapter's actual membership, is
   feasible and would have caught all four known instances. Worth
   scoping as a lint that reports candidates for human review rather
   than a hard build failure, given the false-positive risk.

Logged-only from the 2026-07-18 arc.

**Update (2026-07-19):** stays **open** — this is live work, not a
closure. A prototyping pass ran all three proposals against the real
tree before anyone built them. One is disproven as specified, one was
scoped too narrowly and is the highest-value of the set, one is
confirmed sound, and a fourth proposal is added below. Recorded here
so the dead end is not rediscovered.

**Guard 3's proposed shape catches zero and must be rewritten.** The
proposal above is to cross-check chapter-claiming prose against the
target page's `category` frontmatter, and estimates it "would have
caught all four known instances." It would have caught none of them,
for two independent reasons.

*First, the intra-chapter instances are invisible to it.* Prototyped
over `html/education/*.html` + `html/practice/*.html`: **29
chapter-claiming anchors exist site-wide, 27 intra-category and 2
cross-category — and both cross-category hits are false positives.**
Both are the same shape: an incidental `/education/vfds.html` link
sharing a line with a "this chapter" claim that attaches to a
different target (`air-handlers.html:441`,
`air-unit-identification.html:327`). So the check finds zero real
violations *and* generates noise. That is structural, not a tuning
problem — the real defect class is **terminal and ordinal claims going
stale on append**, a claim about a page's *position* within its
chapter, and category equality cannot see position at all. All of
#180's instances were intra-chapter, so category equality was always
going to read them as clean.

*Second, it would have missed the one genuine cross-chapter case too.*
`timers-and-delays` (`category: programming`) really did claim
`status-and-proof` (`category: signals`) as "this chapter's
status-and-proof lesson" before PR #393 fixed it — a true category
violation. But that claim carried **no anchor**: it named the page in
bare prose. A category cross-check has to resolve the claim to a
target page to compare frontmatter, and with no href there is nothing
to resolve. The single instance the guard was designed for is the
single instance its mechanism cannot reach. Do not rebuild this.

The productive form is a **ban-list regex** over the same two globs,
matching last / first / final / opener / closes / ends **plus an
explicit chapter qualifier** ("of this chapter" / "this chapter" /
"chapter's"), joined with the `N-page` and "these N pages" count
constructions that #160 / #170 / #180 all turned out to be. The
critical tuning result, measured at the pre-fix HEAD (`8ea5254`, the
merge of PR #394):

- **The chapter qualifier is load-bearing.** A bare
  `the (last|first) page` pattern returns 7 hits there, of which
  **6 mean the *previous* lesson** — a true, correct, house-style
  backward reference — and only one is the defect. On this site "the
  last page" almost always means "the page before this one", so a
  qualifier-free ban list is mostly false positives and would be
  switched off within a week.
- **With the qualifier**, the same corpus returns 5 hits, 4 of them
  genuine (`vav-systems:181`, `vav-systems:248`,
  `air-handlers:441`, `building-pressure:507`) against one false
  positive (`vav-systems:446`, "the first reason is the one this
  chapter keeps returning to" — an ordinal that isn't positional).
  Adding the count constructions raises recall to the rest of #180's
  cluster (`duct-static-control:597` and `:617`,
  `practice/index.html:332`) at the cost of more noise, since
  backward-looking counts like "The last three pages taught…" and
  "Three pages, one picture" are legitimate.

Net: a candidates-for-review lint, as the original proposal already
concluded, and **not** a build failure. An earlier framing of this
pass claimed a clean 7/7-true-positive formulation with the qualifier;
that does not reproduce — the measured qualifier-only result is 4 true
/ 1 false, and reaching the full cluster costs precision. Recall and
precision trade against each other here and no formulation tested was
free of both errors.

**One instance survives the merged fixes.** After PRs #395 and #396,
`html/education/metering-devices-txv-eev.html:303` still reads "That
closes the three-page chapter" — verified present on `main` at
`2ddd7d0`, and the only surviving `N-page` claim anywhere in `html/`.
It is true today and goes stale the moment the refrigerant chapter
grows, which is exactly how the forced-air cluster failed. Whoever
builds this lint **must fix that line in the same PR**, or the lint
fails `main` on arrival.

**Guard 1 was scoped too narrowly and is the highest-value item of the
set.** The proposal frames dead-anchor checking as a walk over built
`_site` HTML. That walk sees roughly a third of the surface.
Prototyped counts on the current build: **589 fragment links total** —
231 in rendered HTML (149 same-page `href="#…"`, 82 cross-page), and
**358 `learnMore` hrefs inside `html/_data/quizzes/*.js`**. The quiz
banks are injected as JSON and rendered client-side by the engine,
which makes every one of those 358 **structurally invisible to any
scan of built HTML**. `duct-static-control.js` alone points at 6
distinct ids from ~20 questions; `modbus-decoding.js`, `pump-control.js`
and `vav-systems.js` each do the same. Blast radius: renaming one
`<h2 id>` silently breaks dozens of quiz deep links while every page
still renders and every test still passes. All 589 resolve today —
this is a guard against a regression that has not happened yet, on a
surface where nothing would announce it.

One allowlist is required. Six hrefs look like misses and are not:
`/tools/#hvac`, `#protocols`, `#signals`, `#airflow`, `#electrical`,
`#hydronics` are **deliberate JS-consumed hash routes** — the tools
landing reads `location.hash` at `html/tools/index.html:357` and
listens for `hashchange` at `:369` to drive its filter chips. No `id`
exists or should. That allowlist requirement is also the argument for
putting this in `tests/` rather than in `.eleventy.js`: a
false positive in a build guard blocks a deploy, and this guard has a
standing category of legitimate non-resolving fragments.

**Guard 2 is confirmed sound and should ship as a build guard.**
~25 lines, a near-verbatim copy of `educationSequenceGuard`
(`.eleventy.js:134–163`). `category: 'field'` is the correct
discriminator, and the numbers are exact: **34 entries in
`quizOrder.js`, 39 banks in `html/_data/quizzes/`, and the 5 absent
from the order array are precisely the 5 `category: field` drills**
(`controller-swap`, `field-wiring-sensors`, `sequencing-scenarios`,
`surviving-first-months`, `troubleshooting`). Zero false positives
today. This one belongs in `.eleventy.js` so it fails the build —
unlike guard 1, it has no legitimate-exception category.

Worth recording why it beats the check that already exists:
`tests/smoke.spec.js:2097` asserts the practice landing's Content
Quizzes grid matches `quizOrder.js`. That compares **two
hand-maintained lists** against each other, so a quiz missing from
*both* stays green — which is exactly how `reading-a-wiresheet` got
caught by hand instead of by CI. Guard 2 compares the order array
against the **pages that actually exist**, which is the invariant that
matters.

**Fourth proposal: section-landing card completeness.** Every non-index
page under `html/<section>/` should be linked from a `.nav-card` on
that section's landing. A page that ships without its card is
reachable only from the nav dropdown and the palette; the landing is
the section's front door and the shape is easy to skip, especially in
a parallel lane. Currently clean — **31/31 tools, 40/40 education,
7/7 simulators, 39/39 practice**.

The trap that makes this worth writing down: **scope the selector to
the landing's card grid.** The built landing contains every section
page *twice over* — once in its `.nav-card` and once in the nav
dropdown that `nav.njk` renders into the same document (measured: 62
`/tools/` hrefs on the built tools landing for 31 pages, 80 for 40 on
education, 14 for 7 on simulators). A naive "is this page linked from
its landing?" check therefore passes for every page whether or not the
card exists, and passes silently — it would have shipped green and
guarded nothing.

**Update (2026-07-19, second pass — sub-items 1, 2 and the fourth
proposal SHIPPED as PR #398.** Stays open for sub-item 3, the prose
lint.) Three corrections to what is written above, all measured against
`30bec2c` and all of a kind: **the guard shapes recorded here were
sound in intent and wrong in mechanism.** Recorded so the dead ends are
not rediscovered a third time.

*The hash-route allowlist is three landings, not one.* This entry names
`html/tools/index.html` and six values. `html/education/index.html`
(`:434-435`, `:460-463`) and `html/practice/index.html` (`:514-515`,
`:535-538`) run the identical `location.hash` router — **25 chip values
across three pages**. A six-string allowlist would have reported ~19
false positives on first run. PR #398 derives the allowlist by scraping
each page's own `.filter-chip` `data-category` values, the same way the
page JS builds `validSlugs` — a hardcoded list would itself have been
the hand-maintained-list failure mode this whole issue exists to kill.
Note education's *card* categories (`control`, `drives`, `hvac`,
`sequencing`, `commissioning`) are **not** chip values and
`slugFromHash` rejects them; deriving from card `data-category` would
silently widen the allowlist.

*"Scope the selector to the landing's card grid" does not work.* The
trap named above is real — 62 `/tools/` hrefs for 31 pages — but the
prescribed fix fails: only practice's grid is followed by `</section>`,
so a `.card-grid` block-slice matches 1 of 4 landings and returns empty
on the other three. That is the same silent-green failure the trap
warns about, one layer down. The working form is the card **anchor** —
`/<a class="nav-card nav-card--[a-z-]+"[^>]*?href="([^"]+)"/g` — which
returns 31/40/39/7 exactly, and excludes the nav-dropdown duplicates for
free because they carry no `nav-card` class. It is also grid-agnostic,
which matters: practice has **two** `.card-grid` blocks (content and
field).

*The prose lint's qualified regex is disproven too, and the counts here
are wrong.* This entry records "4 true / 1 false" for the
qualifier-bearing form at `8ea5254`. Re-measured at `30bec2c`: **6 true
/ 9+ false.** Worse, the qualified form **misses its own flagship
instance** — `metering-devices-txv-eev.html:303` reads "That closes the
three-page chapter", which contains none of "of this chapter" /
"chapter's" / "this chapter". And it cannot see **9 unqualified "the
last page" hits** across `duct-static-control.html` and
`vav-systems.html` that are equally stale-prone. This is the *second*
formulation proposed for this lint and the second to fail on
measurement; treat a third confidently-stated precision figure with
matching suspicion. Direction that survived: drop the qualifier
requirement, match terminal/ordinal claims near "chapter" *or* "page",
then subtract the two provably-safe classes — **opener** claims (stable
when a chapter grows at the end) and **existence** claims ("has its own
page in this chapter", which never go stale). Owner decision
2026-07-19: **redesign and ship report-only**, so the noise floor is
visible before anything can block `main`. The 6 true positives at
`30bec2c`: `metering-devices-txv-eev.html:303`,
`reading-a-wiresheet.html:54`, `duct-static-control.html:184`,
`economizers.html:397` and `:115`, `air-unit-identification.html:494`.

One surface this entry did not anticipate, folded into PR #398: **5 raw
`href="…"` anchors are embedded in `explain` strings** across
`bacnet-basics`, `bacnet-networking`, `boolean-logic-latches`,
`modbus-basics` and `modbus-decoding`, one of them a fragment deep link
(`boolean-logic-latches/bll-xor-disagreement` →
`/education/timers-and-delays.html#proof`). `learnMore` is the
sanctioned deep-link mechanism, but prose anchors exist and were
invisible for exactly the same reason `learnMore` was. The shipped guard
walks **every string value** on every question rather than a maintained
field list, and names the field trail in the failure message.

### 183. Forced-air chapter: `air-handlers` never picked up the two appended lessons *(addressed 2026-08-08 · PR #481)*

`html/education/air-handlers.html`'s `relatedLinks()` lessons group
omits both `air-balancing.html` and `dedicated-outdoor-air.html` —
the two pages appended to the forced-air chapter on 2026-07-14 / 15.
Verified against `main` at `2ddd7d0`: the group carries nine entries
and neither appears.

This is the same reverse-cross-link debt PR #393 paid for the
Programming chapter, and the forced-air pass looks genuinely still
owed. `air-handlers` is the chapter's map page — it opens by calling
itself one — so it is the single worst place in the chapter for a
missing sibling link: a reader who starts at the map and works down
the Related column never learns those two pages exist. PR #395
retired the chapter's stale *positional* claims and added the forward
handoff on `duct-static-control`, but `relatedLinks` blocks were
outside that lane's scope; its own PR body flags this as left for
others. `air-unit-identification` picked up `dedicated-outdoor-air`
in that PR because its prose now links there, so the chapter is
partially paid, which makes the gap easy to miss.

**Column-cap note, since it will come up:** there is no cap. An
informal "the lessons column maxes at five" claim circulated in two
recent PR bodies (#393, #396) and is not true — `related-links.njk`
imposes no limit, and `air-handlers` already renders nine,
`air-unit-identification` eight, `vav-systems` seven. Both additions
fit; the open question is editorial (does a nine-entry column want
pruning while it's being touched?), not structural.

**Addressed 2026-08-08 (PR #481, `19b8192`) — and the lane paid BOTH
directions.** This entry names only `air-handlers` →
(`air-balancing`, `dedicated-outdoor-air`), but the gap was two-way:
`air-balancing`'s own `relatedLinks()` lessons group likewise omitted
`air-handlers`, and `air-balancing` carried just two editorial inbound
references site-wide, which made it the genuinely under-linked half.
Paying only the direction named here would have left the chapter's map
page reachable *from* `air-balancing`'s neighbours but not from
`air-balancing` itself. Per CLAUDE.md's *name the payer for every
reverse cross-link*, the lane paid the reverse in the same commit
rather than recording it in a PR body that evaporates on merge.
`dedicated-outdoor-air` already linked `air-handlers`, so that
direction needed nothing. The column-cap note above held in practice —
the nine-entry column went to eleven and was deliberately not pruned,
since pruning a discoverability column is the opposite of what the
lane was for.

### 184. Forward-link convention violated on `commanding-actuators` — both targets already existed *(addressed 2026-08-08 · PR #481)*

`html/education/commanding-actuators.html:356` closes its out-of-scope
paragraph with "that's valve sizing and authority, its own topic" —
plain prose, no anchor — while both targets have been live for weeks.
Verified on `main` at `2ddd7d0`:

- `html/tools/valve-cv.html` shipped **2026-06-06** (`897cce3`).
- `html/tools/valve-authority.html` shipped **2026-07-07**
  (`d0f722f`, "rescue the site's #1 search query").
- `html/education/commanding-actuators.html` shipped **2026-07-18**
  (`8d2113a`) — eleven days after valve-authority.

CLAUDE.md's forward-link convention is "anchor only if the target page
exists today; if it's still a future page, write the topic as plain
prose." The prose form is correct *for a future page*; neither of
these was future. `valve-authority` is also absent from the page's
`relatedLinks` tools group, which lists only `signal-scaling`.

Root cause is upstream of the page: the lane spec in
`docs/site-ideas-and-friction.md:213` declared "valve sizing and
authority stay plain prose `[future: valve-authority]`" and the page
shipped that instruction faithfully. The marker was already wrong when
it was written. Worth noting for #181's sake — this is a lane spec
carrying a stale fact into shipped copy, which no page-level review
catches, since the page is internally consistent with its own brief.

**Ambiguity to resolve before fixing:** the `[future: valve-authority]`
marker may have meant a *lesson* on valve authority rather than the
tool that now bears the name. If so the fix is a **rewording** — the
sentence should hand off to the two tools while keeping whatever
lesson-shaped gap the marker was reserving — and the friction-file
marker needs renaming so it stops colliding with a shipped page.
If it always meant the tool, the fix is two anchors and retiring the
marker per the *Adding a new tool* step-5 rule. Owner's call; logged
rather than fixed for that reason.

**Addressed 2026-08-08 (PR #481, `73aa1ba`).** The owner resolved the
ambiguity above on 2026-08-07: the `[future: valve-authority]` marker
meant the **tool**, so the fix was the two anchors, not a rewording.
`html/education/commanding-actuators.html`'s closing out-of-scope
sentence now anchors both `tools/valve-cv.html` and
`tools/valve-authority.html` and says what each answers, and both
joined its `relatedLinks()` tools group, which had listed only
`signal-scaling`. The stale marker went with it in the same commit:
`docs/site-ideas-and-friction.md`'s `[future: valve-authority]` line
and the "Incurs the valve-authority marker above" debt line are both
annotated retired/paid rather than deleted, in that file's house
style — the *Adding a new tool* step-5 rule applied after the fact.

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
and #70 (~360 SVGs inlined per page). Two from the 2026-07-18 wave
do the same — #174 (`rl-air-*-heads` share the air-lane id prefix)
and #175 (fixed low-side gauge range in deep low-ambient heating) —
each carrying a `*(deferred 2026-07-18)*` marker and a **Decision**
block at its numerical position; pointers at the bottom of this
subsection.

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
  `html/scripts/util.js`. **Trigger fired — folded into #228
  (2026-07-27):** the 2026-07-27 duplication sweep counted seven
  definitions, six byte-identical. #65's own cited path is also stale
  (the editor page moved to `html/simulators/` and its IIFE was
  extracted to `html/scripts/fbe-editor.js`). Schedule it with #228's
  utility layer rather than on its own.
- **#67. Function-block editor — type-mismatch on wire creation
  doesn't cancel pending.** Behavior is intentional (saves the user
  re-clicking the source pin); recorded so a future "fix" PR doesn't
  add a `cancelWire()` here. Trigger: an explicit UX decision to
  change the cancel-on-mismatch behavior.

**Also deferred from the 2026-07-18 wave** — full entries remain at
their numerical position above in `## Issues (status inline)`:

- **#174. Refrigerant-loop: `rl-air-*-heads` arrowhead groups share
  the air-lane id prefix.** Inert today and documented in-page, so
  a standalone selector refactor is churn. Trigger: the next
  substantive work on the refrigerant-loop simulator's SVG lane
  structure — tighten the selector family while in there.
- **#175. Refrigerant-loop: fixed low-side gauge range parks the
  needle in deep low-ambient heating.** The needle stays legible;
  the dead dial region is cosmetic. Trigger: the air-side simulator
  adopting the same gauge component (making per-mode ranging shared
  infrastructure), or the next arc resuming heat-pump / heating-mode
  work.

---

## Recently addressed

### 147. Fixed-geometry SVG label collisions in three education diagrams *(addressed 2026-07-11)*

(branch `fix/diagram-label-collisions`). The three flagged collisions
(bacnet-basics priority-array "lowest non-null wins", bacnet-basics
Who-Is "(one each)" strike-through, balancing PICV "balancing
cartridge" pipe strike) were batched into a site-wide label-collision
audit rather than fixed alone. The audit rendered all 71 diagram SVGs
(including the screenshot script's blind spots) and ran two
independent detection passes — a per-image vision sweep and a
browser-side geometry detector (rendered text bboxes vs sampled
stroke points) — then eyeballed every candidate. Result: **26 fixes
across 13 files** — 19 line/border strikes and 7 border kisses, all
resolved by coordinate nudges / two-line stacks / re-anchors per the
established precedent (no halo/paint-order pattern introduced). Two
line-through cases were fixed by gapping the *line* around the text
row instead (economizers staging tick, TXV push-rod) — a new but
minimal variant of the same idea. `tests/screenshot-diagrams.mjs`
gained the four missing selector entries (`bal-fig` — a new class on
balancing's three valve figures — plus `pc-w1-chart`, `bp-w-gauge`,
`va-chart`), closing the capture blind spots that hid two of the
findings. Verified: post-fix geometry pass shows zero glyph-level
collisions site-wide; remaining detector hits are documented
false-positive classes (intentional two-line stacks, table-row
internals). In passing, unchanged from the original entry:
`styleguide.html`'s `.gauge-label` ~8px overflow at 375 stays
accepted (cosmetic, dev-only page).

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

---

## The running log, continued (status inline — entries append below)

Everything from here to the end of the file is the same chronological
running log as `## Issues (status inline)` above: new entries append
at the tail in number order, open and resolved mixed, and each entry's
**inline marker is the only authority on its status**. The
`## Recently addressed` section above ends here and scopes nothing
below this line. (Recorded 2026-08-09 after a handoff-verification
round found open entries — #262, #266, #274, #275 — being classified
as addressed by readers reasoning from the section header.)

### 185. Quiz `snippet` path: one-way invariant publishes content the page never renders *(open — 2026-07-19)*

Found by the Lane C review during PR #404 (`figure` field), deliberately
left unfixed there to keep that PR's scope on the new field.

`html/scripts/quiz-engine.js:127-128` enforces the `gotcha` → `snippet`
invariant in **one direction only**: a `gotcha` with no `snippet` fails
the mount loudly. Nothing stops the reverse — a **non-`gotcha` question
carrying a `snippet`**. When one does:

- the render guard at `quiz-engine.js:376`
  (`q.type === 'gotcha' && q.snippet`) **silently drops it from the
  page**, and
- `buildQuestionName` (`.eleventy.js:476-477`) still concatenates it
  into the FAQPage JSON-LD `Question.name`.

Net effect: **content that never appears on the page is published as
structured data**, with no warning at build time or mount time. That is
the same defect family as #182's "a green build cannot see it" — the
page looks right, the suite passes, and the wrong thing ships to search
engines.

No shipped bank currently trips it (verified across all 40 banks), so
this is latent, not live. Two candidate fixes: make the validation
symmetric (reject a `snippet` on a non-`gotcha`), or make the render
guard type-agnostic (`if (q.snippet)`) so a stray snippet renders
instead of vanishing. **The symmetric-validation option is the one
consistent with how PR #404 handled `figure`** — that lane chose a
*resolution* check over a required-field check precisely so a declared
figure can never silently no-op.

Note the `figure` field shipped in #404 deliberately does **not**
reproduce this asymmetry.

---

### 186. Hard-coded page ordinals inside lesson prose — the append-fragile class the new lint surfaced *(largely addressed — 2026-07-20 #408 / 2026-07-21 #419; named instances fixed, remaining HIGH flags are lint over-flag)*

Surfaced by `npm run prose-lint` (shipped report-only in PR #405). These
are the instances the lint flags HIGH that were **left unfixed** because
the rewrite is editorial, not mechanical — the lane fixed only
`metering-devices-txv-eev.html:303`, where meaning and voice survived a
direct substitution.

**Highest value — `html/education/duct-static-control.html:598-604`.** A
chapter recap that walks *"Page one built the path… Page two gave the
mixing box… Page three followed the air… Page four taught you to name
the box… Page five went to the far end."* **An insertion anywhere in the
forced-air chapter falsifies up to five sentences at once** — the same
propagation shape as the six-file claim CLAUDE.md cites as the
motivating incident for the convention. The mechanical fix (name the
lessons by title) is known, but the paragraph's rhythm is built around
the ordinals, so it needs editorial re-voicing rather than substitution.

**Same file, same defect —
`html/education/metering-devices-txv-eev.html:46`.** The intro paragraph
still carries `Page 1` / `Page 2` sibling labels. PR #405 fixed `:303`
in this file and deliberately left `:46`; flagged here so that reads as
a decision rather than an oversight. The intro is one long sentence
whose rewrite is editorial.

The `ordinal-label` rule that finds these (noun-then-number, e.g.
`Page 3 of this chapter`) **was not in either prior lint formulation**
and is not in the brief that scoped PR #405 — the lane added it after
hand-grepping for shapes its own pattern could not see. It is the
mirror image of the counted-set rule and therefore invisible to any
pattern written number-first. **13 instances, zero false positives in
the class.**

**Update 2026-07-21 (verified at `a74f27d`).** The two instances named
above are **fixed** — a grep finds neither the `duct-static-control` "Page
one… Page five" recap nor the `metering-devices-txv-eev.html:46` "Page 1 /
Page 2" labels (the lint's own header notes the ordinal-label residue is
GONE). The *current* lint HIGH list was triaged this session: of five
close-read append-fragile candidates, **one was genuine** —
`building-pressure.html:157` ("Two pages… have now made the same promise",
an unnamed growing-set count), reworded in **PR #419**. The other four
pass the falsifiability rule — named pairs/triples
(`pump-control.html:625` "three pages" all linked; `duct-static-control.html:183`
named pair; `modbus-decoding.html:413`) and "last page" *backward-reference*
homographs (`duct-static-control.html:184`, `air-unit-identification.html:146`)
the lint can't disambiguate; owner re-checked them on the live site. ~8
more HIGH flags are un-close-read but read like the same over-flag. **Net:
the append-fragile *prose* is essentially clean; what remains is the lint
reporting homographs it can't tell from terminal claims — a
report-reading task, not a rewrite backlog.** Keep this entry open only as
the pointer to that reading task.

---

### 187. Hub landing pages hard-code their chapter's lesson count *(addressed 2026-07-20 · PR #408)*

`html/bacnet/index.html:25`, `html/forced-air/index.html:25`,
`html/hydronics/index.html:25` and `html/refrigeration/index.html:25`
each open their `.landing-intro` with *"Work the {five, eight, five,
three} lessons in order"*, above a hand-written hub-path block whose
step numbers are equally hard-coded. `/refrigeration/`'s *"the three
lessons"* is the direct twin of the `metering-devices-txv-eev.html:303`
claim fixed in PR #405.

**This one is genuinely ambiguous and should not be fixed until the
owner rules**, because CLAUDE.md pulls both ways:

- *"Write claims that can't go stale… don't count pages, lessons, or
  files in prose when naming the set does the same work"* — these are
  violations.
- *"Section landings and hub pages are the **one place** ordinals
  belong, since they enumerate the sequence anyway"* — these are
  explicitly exempt.

A hub page's intro sentence is arguably neither: it is prose *above* an
enumeration, not the enumeration itself. The lint currently reports them
(the `**/index.html` exclusion was narrowed in PR #405 so landing
*grids* stay exempt while intro prose is visible). **If the owner reads
the exemption as covering the whole page, the exclusion should widen
back and these four stop being findings.** If he reads it as covering
only the enumerated list, four one-line rewrites close it.

Related: the same ruling decides whether counting **two specifically
named** pages (`comparators-and-deadband.html:66`,
`modbus-decoding.html:413`, `duct-static-control.html:183`) is a
violation. Appending to a chapter cannot falsify those, so PR #405
treats them as the lint's false-positive class — but that rests on
reading the convention as "don't state counts that can drift" rather
than "don't state counts."

**Update — owner ruling 2026-07-20.** The narrow reading wins:

> **A count is a violation only if appending can falsify it.**

So the ambiguity resolves in both directions at once:

- **The four hub intros ARE violations** and get rewritten. Chapters
  grow, so "Work the five lessons in order" goes stale on append. The
  carve-out ("section landings and hub pages are the one place ordinals
  belong") is narrowed to **the enumerated list itself**, not the prose
  above it — the list is exempt because it *is* the enumeration; an
  intro sentence merely counts it.
- **Counting two specifically named pages is fine** and stays.
  `comparators-and-deadband.html:66`, `modbus-decoding.html:413` and
  `duct-static-control.html:183` each name and link both pages, so no
  append can falsify them. The lint **keeps** its subtraction rule.
- The lint's shipped behavior is therefore already correct under this
  ruling — PR #405 narrowed the `**/index.html` exclusion so landing
  grids stay exempt while intro prose is visible, which is exactly what
  the ruling asks for. **No lint change needed.**

**Shipped as PR #408** (2026-07-20), which closed this and #186's two
named instances together (one topic, one owner ruling) and recorded the
count-rule narrowing in `CLAUDE.md`.

---

### 188. Light-theme `--text-dim` fails AA on the recessed panel *(addressed 2026-07-20 · PR #412)*

Found while recomputing #168's contrast ratios — genuinely separate from
#168, which is a *hierarchy preference* that is explicitly not a WCAG
failure. This one **is** a failure.

**Light theme only:** `--text-dim` on `--surface-3` measures **4.40:1**
(`#666e66` on `#e8ece4`), under the **4.5:1** AA floor for small text.
The dark theme passes the same pairing at 6.15:1.

`--surface-3` is the recessed panel — `.widget` shells
(`styles.css:3509`) and `.tool-body-3col > section:last-child` reference
columns, both of which carry small dim text by design.

**Owner decision (2026-07-20): fix it as its own lane**, not folded into
#168's PR — that PR is deliberately zero-pixel, and its whole point is
recording that the dimming is *intentional*. Mixing a token change into
it would muddy both records.

Constraint carried into the fix: the nudge must be **the minimum that
clears AA on every surface `--text-dim` lands on**, not a general
brightening. Overshooting flattens the quiet-label / loud-value scan
hierarchy that #168 exists to protect.

**Shipped as PR #412** (2026-07-20): light `--text-dim` → `#636b63`,
clearing 4.60:1 on the recessed `#e8ece4` surfaces, dark untouched.

---

### 189. `defaultCount: 10` silently truncated any bank that grew past 10 *(addressed 2026-07-20 · PR #411)*

Surfaced by the first bank ever to exceed 10 questions (the Controls
Commissioning drill, PR #403).

All 37 existing banks hold **exactly 10** questions, and every practice
page mounts with `defaultCount: 10` + `defaultOrder: 'sequential'`. That
composition has never truncated anything **because** the two numbers
always matched. At 11, `buildQueue()`'s `indices.slice(0, 10)` drops the
last question from every default run — **no build guard, no test, no
visible symptom.** The quiz works; one question simply never appears
unless a visitor changes the settings select.

This is the #182 defect family in its purest form: a green build cannot
see it, and it only becomes reachable the moment someone does the
obvious good thing (write an 11th question).

**Owner decision (2026-07-20) — solved by design, not by guard:**

> *"When we have more than 10 questions, we should add a random element
> to which ones are presented. That way we can grow question banks
> without issue. Plus that increases replayability of the quizzes. Still
> add guards as needed with that. All quizzes of that type should still
> remain 10 questions, just a matter of what questions are shown."*

Presented length stays 10; **which** 10 becomes a random sample. Bank
growth turns from a hazard into a feature — a 15-question bank makes
every run different. A guard still lands alongside it, designed to have
failed on the pre-fix code.

**Shipped as PR #411** (2026-07-20): `buildQueue()` samples an
oversized bank instead of slicing its head, so growth past the presented
count is safe by design. #403 and #416 both merged after it, as required.

---

### 190. Two competing follow-on-paragraph rhythms, plus ~205 redundant inline margins *(addressed 2026-07-20 · PR #415)*

Surfaced by the #179 lane. Two facts in #179 were understated and are
corrected here:

- **13 of the 40 education lessons** lack follow-on paragraph rhythm,
  not the two named in #179 (`function-blocks`, `setpoint-math-reset`).
- The defect is not "tighter spacing." Untreated follow-on paragraphs
  compute **`margin-top: 0px`** — the global `* { margin: 0 }` reset at
  `styles.css:283` zeroes it and nothing restores it — so stacked
  paragraphs render **flush**, with only line-height between them.

The open item is what #179's fix does *not* resolve: **two rhythms are
in use.** 148 follow-on paragraphs sit at `1.25rem` and 51 at `1.1rem`
(concentrated in the hydronics chapter), plus one-offs at 0.6rem (×3),
0.9rem, 1rem and 1.4rem. All are inline `style="margin-top:…"`.

**Owner decision (2026-07-20): standardize on `1.25rem`** (the majority
value), shipped as the shared scoped rule in #179. The hydronics pages
keep `1.1rem` via inline styles, which now makes them the deviation.

Remaining work, deliberately not bundled into #179: **removing the ~205
now-redundant inline margins.** That is a large mechanical sweep whose
only risk is the 1.1rem pages — removing their inline styles silently
re-rhythms the hydronics chapter to 1.25rem. Decide whether hydronics
converges or keeps a documented per-chapter value **before** the sweep,
or it will look like an accident.

**Shipped as PR #415** (2026-07-20): 201 redundant inline `margin-top`
declarations removed (browser-truth per occurrence, not regex), the
1.1rem hydronics set converged to the single 1.25rem house rhythm, and
the two lone one-offs flattened per the owner call. Removals were
verified per-occurrence so classed prose (`p.ref-note`) and
out-of-selector paragraphs kept their load-bearing inline margins.

---

### 191. Link text that names a page is unguarded, even where the href is *(open — 2026-07-20, low priority)*

Noticed by the #177 lane while building the home-desc drift guard.

`html/practice/index.html:72` carries
`<a href="/practice/surviving-first-months.html">Surviving Your First
Months</a>`. The **href** is guarded — `link-integrity.spec.js` catches
it if the page is retired. The **link text** is not: rename the page's
title and the anchor keeps the old label indefinitely, with a green
build and a working link.

Same family as #177 (a page name embedded in prose with nothing keeping
it honest), but a distinct mechanism: #177's surface had no guard at
all, whereas this one has a guard that verifies the wrong half.

Low priority — a stale link label is a cosmetic mismatch, not a broken
path. Worth doing only if the #177 guard generalizes cheaply; that guard
already extracts Title-Case runs from the built home page, so pointing
the same detector at anchor text across landings may be a small delta.

---

### 192. `.bit-idx` composites to 1.83:1 — far below any floor *(addressed 2026-07-20 · PR #413)*

Found by the #188 lane's DOM sweep, which measured *composited* colour
rather than declared colour. Distinct from #188 and much worse.

`html/tools/modbus-register-viewer.html`'s `.bit-idx` renders
`--text-dim` at **`opacity: 0.45`**. The declared pairing reads a
healthy **4.83:1**, but the composited result is
**`#afb5ae` on `#eef1ec` = 1.83:1** — under half the 4.5:1 AA floor, and
below even the 3:1 large-text floor.

**#188 moved it from 1.81 to 1.83** — an improvement, but nowhere near a
fix, and the #188 lane deliberately did not chase it (its brief was the
token, and changing `.bit-idx` is a consumer change).

The general lesson is the important part: **a contrast audit that reads
declared token values cannot see an opacity multiplier.** Every ratio
recorded in this repo — #81, #166, #171, #168, #188 — was computed from
declared colours. Any consumer applying `opacity` to dim text is
invisible to all of them. Sweeping for `opacity` on text-bearing
selectors would say how many more there are; only `.bit-idx` is
confirmed so far.

Fix is a consumer change, not a token change: raise the opacity, drop it
in favour of a dimmer token at full opacity, or accept it as decorative
if the bit index is genuinely redundant with an adjacent labelled
control (it may be — worth checking before treating it as text).

**Shipped as PR #413** (2026-07-20): the check found `.bit-idx` is
informational (its bit number is painted nowhere else for a sighted
reader), so it was fixed, not exempted — `color: var(--text)` at full
opacity, clearing 4.5:1 in all four theme/state combinations, hierarchy
now carried by size and weight rather than colour. Its 1.83:1 value
survives as a frozen math-calibration fixture in
`tests/contrast-sweep.spec.js` (the `i192` self-test).

---

### 193. Nothing guards token contrast — four fixes, all found by hand *(addressed 2026-07-20 · PR #414)*

`#81`, `#166`, `#171` and now `#188` were each found by a person or an
agent recomputing WCAG ratios by hand, and each shipped a fix with
**nothing preventing the next regression**. #188 in particular sat live
because the ratios recorded in #168 were measured on `--surface`
(`#ffffff`) — the *best-case* background — so the conclusion "not a WCAG
fail" was true for the surface measured and false for the recessed one.

That is the recurring shape: not a wrong computation, but a **correct
computation against an unstated background**.

The #188 lane's DOM-sweep technique is cheap and mechanical, and it
found the real scope (600 failing elements across 47 selector shapes,
versus the two selectors the issue named): walk the built pages, read
each element's computed `color`, resolve its *effective* background by
walking ancestors, and assert the ratio clears the floor for its
computed font size. It runs against `_site/` like the existing
integrity specs.

Two design notes if this gets built:

- **It must composite `opacity`** (see #192), or it reproduces the exact
  blind spot that hid `.bit-idx` at 1.83:1.
- **It needs an allowlist with reasons**, not a threshold fudge —
  genuinely decorative text should be named and justified, so the next
  reader can tell "deliberate" from "not yet fixed." #168 is the model:
  a recorded standing answer beats a silent exemption.

Worth weighing against the site's no-CI-guard precedents (#84's version
bump is knowingly unguarded). The argument for guarding this one is that
contrast regressions are invisible in review — nobody eyeballs a diff
and sees 4.40:1.

**Shipped as PR #414** (2026-07-20): `tests/contrast-sweep.spec.js` — a
**blocking** WCAG-AA sweep over every manifest page in both themes,
compositing `opacity` and resolving effective backgrounds by ancestor
walk. It found 114 failures (a second, independent cluster beyond #188's
`--text-dim` — light `--accent` as small text); 71 were fixed via the
`-ink` token family, the rest allowlisted with measured ratios. The
walker's own math is pinned against five known-answer fixtures after it
nearly shipped scoring white-on-black at 5:1. What it still cannot see is
tracked as **#194** — do not read this as complete coverage.

---

### 194. What the contrast guard cannot see — three boundaries, one of them unbounded *(resolved — 2026-07-20)*

Found by an air-side-sim scoping session auditing PR #414's
`tests/contrast-sweep.spec.js` rather than trusting its summary. None of
these is a defect in the guard; they are the shape of its coverage, and
two of the three are documented in its own header. The third is not, and
is the one that matters.

**1. SVG text — excluded, documented.** `if (el.closest('svg')) continue;`
(`:262`). Diagram labels sit over drawn geometry, not CSS backgrounds, so
an ancestor walk cannot resolve their background. Measuring them needs
pixel sampling — a different instrument. Bounded and honest.

**2. The equipment register — excluded by name, sanity-checked but not
measured.** `.device, .lcd, .keypad, .gauge.eq, .cw-term` are skipped.
There *is* a dedicated test (`:572`) asserting the selector still matches
≥20 text nodes, so the exclusion cannot silently stop matching — but it
proves the text was *found and skipped*, never that its contrast passes.
The reassuring 7.59:1 / 6.16:1 figures at `:79-80` are a **hand
measurement in a comment**, not an assertion.

⚠️ **Consequence for any new page:** styling text onto
`.device` / `.lcd` buys **exemption, not verification.** A future
simulator that adopts equipment-register chrome inherits an unmeasured
surface. (Note the widely-repeated claim that a *new* gradient face would
be caught by the `unresolved` bucket is **false** — `unresolved` is only
populated from rows that already failed the ratio (`:375` `continue`s on
a pass, `:391` routes), so a gradient face is flagged only if its text
also fails against the flattened backdrop.)

**3. State-dependent classes — unbounded, undocumented.** The sweep walks
*static built pages*. Any class reachable only through JS state change is
never measured.

The confirmed instance: **`.status-pill.warn` and `.status-pill.error`
have never been contrast-measured.** `.status-pill` is shared tool-output
chrome across ~8 tools (economizers, air-mixing, coil-sizing,
refrigerant-pt, the bacnet tools, refrigerant-loop), and its `.warn` /
`.error` variants are applied at runtime. The single static instance in
markup — `html/simulators/hydronic-loop-builder.html:353` — carries
`hidden`, so the walker skips it.

This is the same defect family as #192 (`opacity` invisible to a
declared-colour audit): the guard measures a real property correctly, and
a whole population never enters the sample. **Verdict colours are exactly
where contrast matters most** — a warn pill nobody can read is worse than
a dim label.

**4. And the guard never sweeps `/styleguide.html` at all.** Found while
checking the proposed fix below. `contrast-sweep.spec.js:123` does
`require('./pages')` and shards `PAGES` directly; `styleguide.html` is
`noindex`, so it carries no canonical, so it is absent from the sitemap
and therefore absent from `tests/pages.js`. `responsive.spec.js:18` has
to graft it on explicitly — `const SWEEP_PAGES = [...PAGES, { name:
'styleguide', url: '/styleguide.html' }]` — with a comment saying exactly
why. The contrast sweep has no such graft.

So **the one page whose entire purpose is exercising both registers in
both themes is the one page the guard never looks at.** That is worth
fixing on its own merits, independent of the status-pill states.

#### The fix — corrected 2026-07-20 (the first proposal did not work)

⚠️ **The original proposal here was "render a *hidden* static specimen of
every state variant on `/styleguide.html` and let the existing sweep
reach it." That fails twice over and would have produced a green test
measuring nothing** — the no-op-guard shape this spec's own header argues
against at length, and the same shape as `codebase-issues` #182.

- **The sweep never reaches styleguide** (boundary 4 above).
- **`hidden` specimens are skipped three separate ways**:
  `el.closest('[hidden]')` (`:263`), `visibility === 'hidden' || display
  === 'none'` (`:272`), and a hidden-ancestor walk (`:317-326`). That is
  the *exact* mechanism that hid `.status-pill.warn` in the first place.
  The spec header records 21,242 text elements skipped as hidden — more
  than it measured.

**What actually works, both parts required:**

1. **Specimens must be VISIBLE on the page**, not `hidden`. Styleguide is
   still the right home — CLAUDE.md calls it the living reference that
   exercises both registers in both themes, so visible state specimens
   belong there rather than reading as noise.
2. **`contrast-sweep.spec.js` must graft styleguide onto its page list**
   the way `responsive.spec.js:18` already does.

There is a ready precedent for the alternative shape, if visible
specimens are unwanted: `settle()` (`:405-417`) already strips the
`hidden` attribute from a named `COLLAPSED_CHROME` selector list, with
the comment *"every other `[hidden]` subtree on the site is genuinely
state-dependent and stays skipped."* Adding specimen containers to that
list is the sanctioned way to force-reveal, and it keeps the reveal
explicit and auditable rather than blanket.

Remaining alternatives if the styleguide route is rejected: drive the
state changes in the spec, or measure the token pairs directly without a
DOM.

#### Resolved 2026-07-20 — styleguide graft + visible verdict specimens

The corrected fix shipped, both parts:

- **Graft.** `tests/contrast-sweep.spec.js` now defines
  `SWEEP_PAGES = [...PAGES, { name: 'styleguide', url: '/styleguide.html' }]`
  and shards *that* — the same shape `responsive.spec.js:18` uses, with a
  comment pointing back here. The sweep now covers `/styleguide.html` in
  both themes (the last shard grew 11 → 12 pages; the page contributes 277
  measured ink sources, well over the per-page sanity floor). **Boundary 4
  closed.**
- **Visible specimens.** `html/styleguide.html` renders the three
  `.status-pill` states (`ok` / `warn` / `error`) as **visible** rows in
  the "Callouts, verdicts & tables" card — not the `hidden`-specimen first
  proposal, which would have been skipped three ways. Measured, both clear
  the 4.5:1 small-text floor: **warn 5.13 dark / 4.95 light, error 4.91 /
  5.26, ok 6.63 / 8.42.** So the verdict inks were fine all along — the
  defect was that nobody was *measuring* them. **The confirmed instance of
  boundary 3 closed.**
- **Falsifiability confirmed end-to-end**, per this file's own "no green
  no-op guard" rule: mutating `.status-pill.warn` to a low-contrast colour
  (`#8f9aa0`) and rebuilding turns the light styleguide shard **red** at
  2.63:1, naming the exact pill. Reverted. The guard bites; it is not
  measuring nothing.

**What remains — by design, not open work:**

- Boundaries 1 (SVG text) and 2 (equipment register) stay permanent,
  documented, bounded exclusions. Not defects.
- Boundary 3 in its *general* form — any text reachable only through a JS
  state change the sweep cannot trigger (a quiz's dirty-state notice, the
  psychrometric editor, conditional table rows) — stays a known
  limitation. But the **sanctioned pattern for closing any future
  confirmed instance is now set**: render a visible specimen on the
  styleguide (the living register reference), or add its container to
  `settle()`'s `COLLAPSED_CHROME` force-reveal list. Reach for it the next
  time a specific runtime-only state is found under-contrast.

---

### 195. Standing answer: opacity-dimmed "off but operable" states stay per-widget *(closed by decision — 2026-07-20)*

Three widgets use `opacity` to say *this control is off but still
clickable*, all landing well under AA: `.bit-idx` (#192),
`.psy-pill.off` (1.91:1 light / 2.24:1 dark) and
`.vfdm-ext-row.inactive` (1.63–2.43:1). The fix shape is identical each
time — drop the opacity, dim the colour to compensate — so it was raised
as a candidate for one house rule, likely a `--text-off` token at a
measured floor.

**Owner decision (2026-07-20): keep it per-widget. Do not introduce a
house token for this.**

The reasoning is worth recording, because "three identical fixes should
share a rule" is a strong-sounding argument and someone will make it
again:

> *Different widgets on this site can have different personality and
> that's okay. A secondary goal of this site is to train the brains of
> new techs to visually process the software they'll see in the field. I
> think some elegant variance is beneficial to that.*

Field BAS software is not visually uniform, and a tech who has only ever
read one house style is less prepared for the workstation in front of
them. So variance across widget faces is a **feature with a pedagogical
job**, not drift to be normalized away.

⚠️ **Two boundaries on this, both explicit:**

- **This is not licence to add variance for its own sake.** The owner:
  *"Don't go out and change things just for that secondary goal though.
  I think me being at the helm does enough for that."* Variance arrives
  through his editorial judgment, not through a lane deciding a widget
  should look different.
- **It is not licence to ignore contrast.** Each of the three is
  allowlisted in `tests/contrast-sweep.spec.js` with a *measured ratio*,
  not a threshold fudge. Per-widget means each gets its own considered
  answer — not that the question stops being asked. `.bit-idx` was in
  fact fixed (#192, PR #413) because it is the only thing painting the
  bit number for a sighted user.

Related: #192 (the instance that started it), #194 (what the guard
cannot see), #168 (the same shape one level up — dim labels are a
deliberate hierarchy, recorded rather than "fixed").

### 196. FBE editor render/cache state lives on the wire *data* objects *(addressed 2026-07-22)*

The Function-Block Editor (`html/simulators/function-block-editor.html`)
attaches transient render + cache fields directly to the wire **data**
objects in `graph.wires`: `_vis` (the visible `<path>`), `_hit` (the
hit-area `<path>`), and `_lastCls` (the render cache — the last CSS class
`refreshValues()` wrote, so it can skip a redundant `setAttribute`, the
10 Hz micro-optimization from #111).

Because those persist on the data object across `renderAll()` — which
rebuilds the `<path>` elements via `createWireEls()` — the cache can
**desync from the freshly-built element**. That desync WAS the
wire-invisibility bug (deleting one wire blanked all the others; a new
wire blanked the previous one): `createWireEls` rebuilt each `<path>` at
the bare, colourless `.fbe-wire` class while `_lastCls` still claimed the
coloured class, so `refreshValues` skipped the colour write and the wire
rendered with no stroke. Fixed narrowly in **PR #421 (2026-07-22)** by
resetting `w._lastCls = 'fbe-wire'` in `createWireEls` to keep the cache
invariant honest, and guarded by `tests/fbe-wires.spec.js` (asserts the
*visible-stroke* count, verified to fail without the fix).

The narrow fix is correct, but the underlying fragility remains: coupling
render/cache state to the data model is a standing footgun — any future
change to the wire render lifecycle risks re-desyncing the cache. A
cleaner design keeps the render cache in a side map keyed by wire id (or on
the element itself), decoupled from `graph.wires`. Larger refactor than the
bug fix; logged for a decision, not urgent.

**Good moment to act:** the FCU "DDC Workbench" session plans to embed/extract
this editor into a shared module — if the editor code is being extracted anyway,
that's the natural point to decouple the cache.

> *Historical, and it played out exactly this way* — the ride-along happened in
> PR #422 and the Resolution below records it. The original text cited the
> rolling session-handoff doc for the extraction plan; that edition is archived
> under `docs/audits/`, so the citation is dropped rather than repointed (the
> plan it described is finished).

Related: #111 (the `refreshValues` micro-optimization this cache serves),
PR #421 (the narrow fix + regression guard).

**Resolved (2026-07-22, `refactor/fbe-editor-module`).** The editor was
extracted from the page's inline IIFE into a shared classic-script module
`html/scripts/fbe-editor.js` (`window.FBEEditor.createEditor`), the natural
moment flagged above (the "DDC Workbench" arc, PR-1). The extraction
decouples the render/cache state from the data model exactly as proposed:
`_vis` / `_hit` / `_lastCls` no longer live on the `graph.wires` objects.
A module-scoped side map `const wireEls = {}` keyed by `w.id` holds
`{ hit, vis, lastCls }` (mirroring the block-side `els` map), and
`renderAll()` clears it in lockstep with `els` — so a rebuilt `<path>`
cannot inherit a stale cache by construction, not by a compensating reset.
`createWireEls` writes the entry; `drawWires` / `refreshValues` read it.
The engine (`fbe-engine.js`) is unchanged. `tests/fbe-wires.spec.js` still
guards it (visible-stroke count). The `wireEls` clear in `renderAll` is
memory hygiene, not the sole correctness guarantor: `createWireEls` writes a
fresh `{ lastCls: 'fbe-wire' }` entry for every wire on every render, so
removing the clear alone does **not** fail the spec (it only orphans map
entries for deleted wire ids). The guard was verified to bite by injecting the
actual failure mechanism — seeding a stale *coloured* `lastCls` at create time
so `refreshValues` skips the colour write — which fails `fbe-wires` as
expected.

### 197. `.fbe-palette-btn:focus-visible` sits outside the consolidated FOCUS INDICATORS block *(open — 2026-07-22 — **RESOLVED 2026-08-12 · PR #554**, as a move and NOT as a merge)*

When the function-block editor's `.fbe-*` CSS moved into `styles.css` (PR-1 of
the DDC Workbench arc, `refactor/fbe-editor-module`), the
`.fbe-palette-btn:focus-visible` rule travelled verbatim and now sits as its
own rule inside the FBE section, rather than folded into the consolidated
`FOCUS INDICATORS` block where its sibling `#fbe-canvas:focus-visible` already
lives (per the CLAUDE.md focus-indicator convention — "add its selector to
that block; don't scatter a one-off rule"). Behaviour is correct; this is a
placement/consolidation cleanup, not a bug. Deferred out of PR-1 to keep that
behaviour-preserving refactor tight. Fold the rule into the `FOCUS INDICATORS`
block in a later `styles.css` pass.

**RESOLVED 2026-08-12 · PR #554 — moved into the block, but deliberately NOT
folded into the shared selector list, because "fold the rule in" above would
have been a visual change.** The two are not declaration-identical: the shared
declaration is `outline-offset: 3px`, the palette button's is **1px**. Adding
the selector to the list would therefore have moved the rendered ring — and
this entry's own premise is that behaviour is correct and only placement is
wrong. So the rule was moved verbatim into the `FOCUS INDICATORS` block as its
own rule (precedent: the two `input[type="range"]` thumb rules already sit in
that block without sharing its declaration), immediately after the shared rule
and ahead of them.

**The 1px is load-bearing, not an oversight.** A 3px offset on a 2px ring
extends 5px past the border box, and the palette packs tighter than that in
*both* its layouts: the default rail is an `overflow-y: auto` scroll box
stacking buttons `margin-bottom: 0.25rem` (4px) apart, and the fullscreen rail
is a wrapped flex row at `gap: 0.35rem 0.4rem` (5.6 / 6.4px) with the button
margin zeroed. The shared ring would be clipped by the rail and would overlap
its neighbours. `git log -S` puts the 1px on this control since the page was
authored (2026-05-22, `59b2a24`), unchanged through `b08201d` — i.e. the
"travelled verbatim" this entry describes was carrying a deliberate value. The
moved rule now carries a comment saying all of this, so a later consolidation
pass cannot tidy it into the list and silently change the ring.

**Cascade preservation was verified, not argued.** Moving a rule ~2200 lines
earlier is only safe if nothing competes, and nothing does. None of the
stylesheet's other `outline` / `outline-offset` declarations match a palette
button (the five `outline: none` rules belong to `.palette-input`, the
`input`/`textarea`/`select` focus rule, `input[type="range"]`,
`.quiz-numeric-input` and `.ps-input`). The one ancestor-dependent arm in the
shared list that could ever reach one — `.widget-try button:focus-visible`,
which at (0,2,1) would have out-specified the (0,2,0) component rule
regardless of source order — does not match: the palette rail is a standalone
`.fbe-palette` div on all three host pages (`function-block-editor`,
`ddc-workbench`, `ddc-workbench-fcu`), ancestry
`.fbe-palette → .fbe-workspace → .fbe-live → (.tool-body | #tab-wiresheet) →
.tool-card → main#main`, with no `.widget-try` anywhere in it. Confirmed
empirically by focusing a real palette button and dumping both the computed
ring and the full set of `:focus-visible` rules matching the element, in source
order, before and after the move: identical — matched set is exactly
`[.fbe-palette-btn:focus-visible → 2px solid var(--accent), 1px]`, computed
`2px solid rgb(108, 178, 58)` at offset `1px`.

**Follow-on for the owner, not fixed here.** Two `:focus-visible` rules remain
outside the block, and both carry written reasons, so no *undocumented* stray
is left. But `a.ddcw-unit-link:focus-visible`'s comment states the **opposite
idiom** to this entry's: *":focus-visible kept beside the component rather than
in the consolidated FOCUS INDICATORS block, because the ring deviates."* Its
ring deviates (inset `-2px`); the palette button's deviates too and was moved
*in*. Both cannot be the convention. Either `a.ddcw-unit-link` also moves in
with its declaration preserved (as here), or the CLAUDE.md convention gains an
explicit "a deviating ring stays beside its component" carve-out. Left alone to
keep this branch to one issue.

Per the orchestrator, not appended to `docs/codebase-issues.md` here — several PRs appending at that file's tail would conflict. Text for the single batched commit:

```markdown
### 198. Gutter collage costs ~44% of a CPU core at idle on every page

**Status:** fixed (PR #427).

`schematic-bg.njk` renders 120 motif SVGs into the gutters of all 135
pages: ~360 `[data-flow]` paths, 144 `[data-pulse]` paths, 552 particle
circles. `flow-engine.js` ticked every visible pool every frame, so a
page with no animation of its own still paid for the chrome.

Measured (headless Chromium, 1920x1080, 6s window after a 3s settle,
median of 3, precondition + liveness asserted): `tools/signal-scaling`
idled at **44% of a core at 1x CPU and 97% at 4x**, doing **46 layout
passes per rendered frame** — ~5% and 0 layouts/frame with the gutter
`display:none`. After the fix: **34% / 73%**, and **3 layouts per
frame**. On `simulators/refrigerant-loop.html` the page is main-thread-
bound so CPU% is pinned near 98% either way; frame rate goes **20.9 ->
24.1 at 4x** and layouts/frame **125.5 -> 81.2**.

Three mechanisms shipped, measured individually rather than assumed: a
point table replacing per-frame `getPointAtLength()` (gutter, plus an
opt-in `data-flow-static`), `cx.baseVal.value` writes with 0.1-unit
rounding and unchanged-axis skipping (4.1x cheaper than `setAttribute`
with a raw float), and a `visiblePools` array replacing the
~360-pool-per-frame visibility scan.

Three findings worth keeping:

- **A cheaper write is not a free write.** Each one still dirties style
  and layout for its subtree, so the per-frame floor is set by how many
  particles move, not by how cheaply each move is issued. Engine-side
  levers that keep the gutter animating plateau around 20-24% of a
  core; only stopping it outright reaches ~0%, because the rAF loop
  then suspends and no per-frame style/layout pass happens at all.
  Stopping it was rejected on UX grounds -- a background that suddenly
  goes still reads as broken.
- **On a saturated page, CPU% inverts the sign of a result.** Removing
  work can raise measured CPU while frame rate climbs, because the page
  had been dropping frames. Prefer **layouts per rendered frame**: under
  host contention fps swung 31.5 -> 58.7 while layouts/frame held to
  within 1.4%. Contention costs frames, not work-per-frame.
- **Any perf measurement must assert its own precondition.** A disabled
  animation reads exactly like a brilliant optimization, and a `<style>`
  injected via `addInitScript` is discarded when the real document
  parses -- so the "gutter off" arm silently measured a live gutter
  until the computed `display` was asserted in-page. Likewise, compare
  particle positions by ELEMENT IDENTITY and filter to the flow radius:
  pulse circles churn in the same layer, and an index-based comparison
  reported a nearly-still gutter as 552/562 moved when the truth was
  44/552.

**Open follow-up:** `data-flow-static="true"` is implemented but set on
no page. `simulators/refrigerant-loop.html` satisfies its contract
(every `d` mutation is followed by `refreshPath`) and measures 24.5 ->
37.9 fps at 4x CPU with it on, layouts/frame 81.5 -> 3.8.
`simulators/hydronic-loop-builder.html` must NOT get it -- it rewrites
`d` on every `pointermove` and refreshes only on pointer-up, so its
particles track the dragged pipe because the read is live.

**Context for whoever reads this next:** the gutter's `[data-flow]`
paths are expected to be retired by a future static-"print" background,
at which point the gutter stops being an engine consumer at all. The
durable value of this work is the CONTENT diagrams -- the education
lessons and the simulators -- not the collage that motivated it.
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LmBziFvEW678CX6zCaCQxx

### 199. DDC Workbench: page-local rAF loops ran forever; three idle-gate deferrals *(addressed 2026-07-24)*

*Severity: low · Category: perf · Confidence: high* — `html/simulators/ddc-workbench.html:1538-1707 (merged loop), :1325 (animSync hook); house idiom at html/scripts/flow-engine.js:285-303`

The workbench's fan-blade and air-chevron animations each ran their own `requestAnimationFrame` loop that checked `prefers-reduced-motion` once before starting and then re-scheduled unconditionally. Both kept writing every frame when `plant.anim.fanFrac === 0` (fan off — visually static) and when the Wiresheet tab put `#tab-unit` under `display: none` (`styles.css:1339-1340`), i.e. 60 fps of transform writes into an invisible subtree.

**Resolution (2026-07-24):** merged into one self-suspending loop on the `flow-engine.js:285-303` idiom — one `hasWork()` / `looping` / `startLoop()`, one `dt` per frame, with the fan and chevron logic kept separate as `step(dt)` closures. Gate: `!reduce` ∧ `fanFrac > 0` ∧ `#tab-unit.active` ∧ `!document.hidden`, pulling the pane state from the DOM rather than mirroring a flag out of `showTab` (`switchTab` in `ui.js` is the real owner of `.active`). Resume rides the existing render path — `fcuRenderUnit` → `fcuAnimSync()` — so no new listeners, which also makes the #110 background-tab trap structurally unreachable. Measured (% of one core, 6 s window, median of 3, gutter hidden): HAND fan-off 15.6% → 7.5%, Wiresheet 13.3% → 7.2%, reduced motion 8.9% → 6.7%; arrival unchanged at ~25% because that is genuine visible motion. Covered by the new `tests/ddc-workbench.spec.js`.

Three things were deliberately **not** done, each with a revisit trigger:

**(a) `simulators/refrigerant-loop.html` left alone.** Its page-local rAF re-schedules unconditionally at `:2593`, gated only by `reduceMotion` at `:2825` — cosmetically the same shape as this fix, but measured as negligible: that loop writes only three attributes per frame (two gauge needles and one orbit transform). Its real idle cost is flow-engine on its content pools (suppressing flow-particle writes moved it 51.8% → 32.3%, style 638 ms → 89 ms, layout 568 ms → 24 ms), which is a different lane's territory. It is a **public** page, unlike this one. *Revisit trigger:* the flow-engine content-pool work lands and the page still profiles hot, or its rAF grows past cosmetic writes.

**(b) No viewport gate on `.fcu-graphic`.** The loop suspends on the tab and the fan but keeps running while the graphic is scrolled off screen. `flow-engine.js` has the prior art (IntersectionObserver → `visibleFlowEls` → `hasWork()`). Not added here because the graphic is the top of a tall page and the measured win did not justify a third gating axis. *Revisit trigger:* the profiler shows meaningful scroll-away cost.

**(c) No shared idle-gate helper.** Four hand-rolled gates now exist, with four genuinely different predicates: `flow-engine.js:285-303` (rAF, IO-visibility + pending pulses), `fbe-editor.js:613-772` (setInterval, `document.hidden` + a desktop media query + `visibilitychange`), `simulators/controller-wiring.html:1146-1169` (setInterval drift, `reduceMotion` + `visibilitychange`), and now this one (rAF, reduced-motion + fan state + tab pane + `document.hidden`). The house rule is extract on the second *identical* instance; these are not identical, and a new file under `html/scripts/` would be a shared script — making the version bump cache-bust-load-bearing and obliging a site-wide sweep, disproportionate for one hidden page. A `// house idiom: flow-engine.js:285-303 (#113)` pointer is in the code instead. *Revisit trigger:* a fifth consumer, or any of the four drifting from its documented predicate.

### 200. Idle animation cost regresses silently — nothing measured it until now *(instrumented 2026-07-24)*

*Severity: medium · Category: perf · Confidence: high* — `tests/perf-profile.mjs`

**Defect class.** A page's *idle* cost — what it burns while the user does nothing — is invisible to every check this repo runs. `npm test` asserts behaviour, contrast, and page structure; nothing has ever measured an animation loop's steady-state cost. So a loop can start doing more work per frame, stop suspending when it should, or run in a backgrounded tab, and the suite stays green.

**The instances.** Four, all of this shape:

- **#70** — `schematic-bg` inlines ~360 stroked SVG elements plus 120 wrappers into *every* page DOM. Caught by a doc audit, *deferred* 2026-05-23 — still shipped, and still the dominant idle cost on the site: the control page `tools/signal-scaling.html` (no rAF, no `setInterval`, no `setTimeout` of its own) idles at **43.6% of a core** at 1920×1080, and at **0.13%** at 1100×900 where `.schematic-bg` is `display: none`.
- **#109** — `controller-wiring`'s cosmetic-drift `setInterval` never paused on tab-hide (fixed 2026-06-16).
- **#110** — `function-block-editor`'s sim loop spun in a backgrounded tab on initial load, because `visibilitychange` only fires on a transition (fixed 2026-06-16).
- **#113** — `flow-engine`'s rAF loop re-scheduled forever even with zero animatable work (fixed 2026-06-16).

**Why it kept happening.** Every one was found by *hand* — a doc audit, a code read, somebody noticing a warm laptop. Every fix landed and **left no instrument behind**, so the next regression started from zero. The three 2026-06-16 fixes were found in one sitting and none of them produced a way to notice the fourth.

**Resolution (2026-07-24): instrumented, not gated.** `npm run perf-profile` (`tests/perf-profile.mjs`) measures fps, CPU relative to a no-animation control page, layout/style work per rendered frame, and a population liveness count, over a hand-picked manifest (**not** the sitemap — `ddc-workbench` is absent from `sitemap.xml`, so a sitemap walker would omit the page this exists for). Baseline, tolerances, and every caveat are pinned in the script header.

**Owner ruling, 2026-07-24 — report-only, NOT a CI gate.** CPU numbers are machine-dependent, and a threshold over a machine-dependent number flakes. A flaky gate gets muted, and a muted gate is worse than no gate because it launders the regression it was installed to catch. Recorded here so the next reader finds the decision rather than relitigating it.

**Trigger for running it.** Before merging any PR that touches an animation loop, a rAF/`setInterval` gate, `schematic-bg`, or an animation rule in `styles.css`.

**Pinned in the script header, because each cost real measurement time:**

- **CPU% inverts on a saturated page.** On `refrigerant-loop`, hiding the gutter took CPU **55.5% → 65.0%** while fps went **26 → 57** — removing work raised CPU because the freed thread rendered the frames it had been dropping. Rank by fps, never by CPU alone.
- **A disabled animation reads exactly like a brilliant optimisation.** `contain: strict` on the gutter motifs "improved" the control from ~420 to ~3 ms/s purely by collapsing the elements so IntersectionObserver suspended the loop. Hence the mandatory liveness probe — population-level, because sampling one particle produced a false `frozen` on `refrigerant-loop`.
- **Time is noisy on this host; work counts are not.** `TaskDuration/s` spreads 16–40% run to run while layouts *per frame* hold to 1.4%.
- **DOM-diff liveness has a floor.** An animation whose output has *converged* writes identical DOM forever and is indistinguishable from a stopped one — `function-block-editor`'s canned econ sheet is exactly that (16 elements, one distinct DOM state across 10 s). Its manifest entry declares no `motionSel` and says why.

**Follow-on.** #70 stays open on its own terms — this entry does not close it. What changed is that its cost is now a number anyone can reproduce in one command rather than an assertion inside a deferred issue.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LmBziFvEW678CX6zCaCQxx

Not written to `docs/codebase-issues.md` per the lane brief — reproduced here for the
owner to file.

### 201. PR #427's engine surface landed undocumented in the two records that claim to be exhaustive *(addressed 2026-07-24 · `6c02ce1`)*

Both findings are pre-existing on `main`, unrelated to this PR's diff, and were hit
while working from those records.

**(a) `data-flow-static` is absent from the friction file's engine-attribute list.**
`docs/site-ideas-and-friction.md` opens that section with *"**Three opt-in
attributes** on annotated paths. New surface bubbles up to this list first so the
engine's API doesn't grow ad-hoc — `flow-engine.js` is a small file and the cost of an
unrecorded attribute is that the next page invents its own variant."* There are now
four (`data-flow`, `data-flow-reverse`, `data-flow-density`, `data-flow-static`), and
`grep -c data-flow-static docs/site-ideas-and-friction.md` returns **0**. The
paragraph below it has the same problem: *"**Two methods** on `window.FlowEngine`"*
lists `init` and `refreshPath`, while the engine exports four — `setPathColor` and
`pulse` are also missing. Note both counts are stale in the falsifiable-by-append way
CLAUDE.md's *write claims that can't go stale* rule is about; naming the set instead
of counting it would have survived.

**(b) `tests/perf-profile.mjs`'s BASELINE block predates the optimisation it now
measures.** It records capture at commit `12b5df3` on `feat/perf-profile-script`,
parent `a62db0a` — i.e. before `fix/gutter-idle-cpu` merged, since #427 (`a6d81e2`)
landed *after* #428 (`9e31090`). The gutter point table then cut layouts/frame
site-wide, so on pristine `main` the script reports **every** row over tolerance,
including its own control:

```
signal-scaling   [CTRL]  baseline  46.88 lay/frame  →  measured  3.77  (drift -91.96%, over ±8%)
refrigerant-loop         baseline 127.08 lay/frame  →  measured 81.02  (drift -36.24%, over ±8%)
```

A report that is red by default on unmodified `main` decays exactly the way the
script's own header warns about. It needs a re-baseline against current `main`, not a
tolerance change — the header already says which, and says to record the date,
commit, and machine.

**Resolution (2026-07-24, commit `6c02ce1`).** Both closed, but the heading never
picked up a disposition marker, so a later lane read the item as still open and
recorded the friction-file gap as unpaid debt. (a) `data-flow-static` was added to
the friction file's attribute list, `setPathColor` / `pulse` to the method list, and
both intros were de-enumerated — "**Three opt-in attributes**" → "The opt-in
attributes", "**Two methods**" → "The methods" — so neither count can go stale by
append again. (b) `tests/perf-profile.mjs` was re-baselined at commit `5b9c457`
with the date, commit and machine recorded in its BASELINE block.

Note the entry (a) restored still described `data-flow-static` as *"optional, default
false"* and knew nothing about the build guard that later made it mandatory on
education pages; that is a **separate, newer** gap, paid in PR #430 rather than
re-opening this item.

### 202. Education lesson diagrams never opted into the point table — the lesson archetype still runs ~50 layouts/frame *(addressed 2026-07-25)*

The 2026-07-24 perf arc gave `flow-engine.js` a cached point table and
opted in the gutter (unconditionally, #198) and
`simulators/refrigerant-loop.html` (via `data-flow-static`, #201). Nothing
opted in the **education lessons**, which are the widest consumer of
in-content particle flow — roughly forty pages drive `[data-flow]`
diagrams.

The cost shows up plainly in `npm run perf-profile`. Post-arc, every row
sits between 2 and 5 layouts per rendered frame except one:

    education/hydronic-loops.html    ~51 layouts/frame
    everything else                  2 - 5 layouts/frame

That row went 97.5 → ~51 from the arc's other work, a ~48% improvement,
while pages whose paths are tabled went ~46 → ~3, a ~93% improvement. The
gap is the un-tabled content pools calling `getPointAtLength()` per
particle per frame — the exact cost #198 removed everywhere else.

**Why it wasn't done in the arc:** `data-flow-static` is an assertion that
*every* mutation of a path's `d` is followed by `FlowEngine.refreshPath()`.
Verifying that for one page (refrigerant-loop) took a full audit plus a
negative control. Doing it for forty lessons is its own piece of work and
was deliberately not folded into a perf arc already spanning four PRs.

**What it needs.** Most lesson diagrams are almost certainly static — a
lesson SVG is drawn once and never re-pathed — which would make this a
near-mechanical sweep with a large payoff. But that must be *verified per
page*, not assumed: the failure mode is silent and visual (particles
stranded on pre-mutation geometry), and it is exactly why the attribute is
opt-in rather than default. `simulators/hydronic-loop-builder.html` is the
standing counter-example of a page that must never set it.

Suggested approach: grep every `nav: education` page for `d` mutations on
`[data-flow]` elements; the pages with none are safe and can be swept in
one PR. Verify with the same technique used for #201 — sample particle
positions against live path geometry after every state change, and include
a negative control (stub `refreshPath` to a no-op and confirm the check
goes red) so the verification is known to be able to fail.

**Resolution (2026-07-25).** Swept, and the assertion is now pinned at
build time rather than by memory.

**Population.** Not "roughly forty pages" — only **15** of the 41
education lessons carry a `data-flow` element at all, and they carry
**197** between them (load-piping 50, hydronic-loops 26, air-handlers and
air-unit-identification 17 each, balancing 16, vav-systems and
pump-control 11 each, equipment-staging 10, building-pressure 9,
dedicated-outdoor-air 8, duct-static-control 6, air-balancing 5,
economizers / refrigerant-cycle-basics / controller-wiring 4/4/3). All
197 now carry `data-flow-static="true"`. A naive `grep -c data-flow=`
over-counts on 12 of the 15 — HTML comments above the diagrams, one CSS
block comment, JS `//` prose — and two lessons with no flow paths mention
the attribute only to say so, so every count here is from the live DOM or
a comment-masked scan.

> **Amendment (2026-07-25).** The `=` above was added: the figure **12 of 15**
> is reproducible only for `data-flow=` *with* the equals sign (`balancing`,
> `equipment-staging` and `pump-control` are the three where every
> `data-flow=` hit is real markup). For the command as originally pasted —
> `grep -c data-flow`, no `=` — it is **15 of 15**, since every flow-bearing
> lesson has at least one `data-flow` mention inside a comment. Number right,
> pasted command looser than the number: the same defect shape #204 flags for
> the guard header's own pasted grep.

**Per-page verification, then a guard.** Each page was audited for any
write to a flow path's geometry before a single attribute was added; none
exists — no `setAttribute('d')` anywhere under `html/education/`. The
near-misses were resolved individually rather than waved past: the fan and
damper blades on hydronic-loops / air-handlers spin via a **CSS
transform** on `<rect>` elements, which cannot invalidate a table because
`getPointAtLength()` returns path-LOCAL user space — exactly the space
`buildTable` samples; pump-control's `setAttribute('points')` / `cx` / `cy`
writes and building-pressure's needle `transform` target **different SVGs
that hold no `data-flow` element**; load-piping and refrigerant-cycle-basics
hide and recolour branches through `FlowEngine.setPathColor`, which
repaints existing particles and never rebuilds a pool; and hydronic-loops'
`data-flow-density` writes already call `refreshPath`, which re-runs
`buildPoolForEl` and therefore rebuilds `pool.table` from current geometry
— so that path stays correct *with* the flag and gets cheaper (the table
cache hits on the unchanged geometry key).

**`flowStaticGuard` in `.eleventy.js`** now fails the build when a
`nav: education` page has a `data-flow` element without
`data-flow-static="true"`, with `flowGeometryLive: true` frontmatter as
the documented opt-out (no lesson needs it today). It reads
`item.rawInput` — a collection callback cannot see rendered output, since
`item.templateContent` / `item.content` throw *"Tried to use
templateContent too early"* at that point in the build — and masks HTML /
CSS / JS / Nunjucks comments first. Every education `data-flow` attribute
is literal in the page file, so pre-render source reaches all of them.

**Two holes in the first cut, both found in review and both proved by
construction before being closed.** (1) `rawInput` is the page's OWN
source and stops at an `{% include %}` tag, so a partial carrying a flow
path was never checked: an `_includes` file holding
`<path data-flow="supply" d="…"/>` plus a `nav: education` page whose
entire body was `{% include %}` of it built clean at 137 files, exit 0,
and shipped the unflagged path. The guard now also walks templates on
disk and holds every partial to the same rule regardless of which page
includes it, with `html/_includes/schematic-bg.njk` the sole
`EXEMPT_TEMPLATES` entry —
the gutter is tabled unconditionally via `pool.gutter`, so an opt-in there
would misstate why it is cached — and each exempt path must resolve to a
real scanned file, so a stale exemption fails rather than passing
silently. A fail-closed *declare your includes* rule was the obvious
alternative and does not work: all 15 flow-bearing lessons already
`{% from "related-links.njk" import relatedLinks %}`, so a rule firing on
any macro call fires on every page it protects. (2) The element test
required `data-flow` to carry an `=`, while `flow-engine.js` selects on
`[data-flow]` — so a valueless `<path data-flow d="…"/>` built clean and
animated (`getAttribute` returns `""`, which falls through to
`SUPPLY_FILL`). The substring probe is now a real attribute parse, which
also drops a latent false positive on a `data-flow=` sitting inside
another attribute's quoted value.

**The guard deliberately does not reach simulators, and that is a
finding, not an omission.** A markup scan is structurally blind to
`simulators/hydronic-loop-builder.html` — it creates its flow paths from
JS and rewrites `d` on every `pointermove`, refreshing only on
pointer-up — so its source contains zero `data-flow=` attributes and a
rule of this shape would pass it **vacuously**. Silent false assurance
about the one page that must never carry the flag is worse than no rule,
so on simulators the call stays a per-page judgement.

**Measured (this machine, 1920×1080, reps=3, BEFORE and AFTER back to
back in one session):**

    education/hydronic-loops.html   layouts/frame  49.87 → 4.69
                                    Δ control      +147.6 → +97.4 ms/s
                                    fps              59.9 → 60.1
                                    liveness      main 46/160 · gutter 47/552 (unchanged)

Liveness being byte-identical is what rules out the caveat-3 artefact the
profiler warns about: the same population is still animating, it just no
longer re-reads geometry it already knows. `tests/perf-profile.mjs`'s
BASELINE was re-based for that row only (three-run mean 4.02
layouts/frame), with the three samples and the reason recorded in its
header; no tolerance was widened.

**Controls, both run.** The guard is not vacuous: removing the attribute
from one element of `controller-wiring.html` fails the build with
`1 of 3 data-flow elements lack data-flow-static="true"`. And #429's
control mechanism was reproduced as far as it transfers — **it does not
transfer literally**, because no education page writes `d`, so there is no
page-driven geometry change to stub the refresh out of. The harness
supplied one instead: with `FlowEngine.refreshPath` stubbed to a no-op and
`d1-supply-main`'s `d` shifted 220 units, the 32 particles on that path
stranded **220 u from the live route and 0.2 u from the stale one** — the
same inversion #429 measured, which proves the table really is frozen and
that the measurement can see the failure it is looking for. Un-stubbing
and calling `refreshPath` put every particle back within 0.2 u.
`tests/flow-engine.spec.js` gained a committed twin of the positive half
(`education flow particles sit ON their tabled path`), so unlike #429 this
one leaves an instrument behind — the gap #200 is about.

Each of the two review holes above got the same treatment before it was
called closed — build the scaffolding, confirm the check goes **red** and
names the offender, then confirm it goes green when the flag is added:
an unflagged `data-flow` in an include (red, names the partial) → flagged
(green, 137 files); a valueless `data-flow` on a lesson (red, names the
page) → real tree (green, 136 files). The exemption's own anti-vacuity
was proved the same way: an unexempted copy of `schematic-bg.njk` reports
15 unflagged elements, and renaming the exempt file reports
`exempt include "schematic-bg.njk" no longer exists` alongside the 15.
Three shapes were checked against the new attribute parse for
over-reach — `data-flow-static='true'` (single-quoted) passes,
`aria-label="write data-flow=supply on the pipe"` is correctly ignored,
`data-flow-static="TRUE"` fails with the exact-value message.

**A third adversarial round (2026-07-25) found three more, all proved by
construction and all closed on this PR.** The pattern in all three: the
previous round's remedy was *narrower than the mechanism it was fixing*.

1. **The includes walk was narrowed, not closed.** Nunjucks resolves an
   include name against the **working directory** as well as the includes
   dir — `Engines/Nunjucks.js#getFileSystemDirs()` returns
   `[includesDir, TemplatePath.getWorkingDir()]` — so `partials/zz-root.njk`
   at the repo root reached a `nav: education` page completely unscanned:
   exit 0, 137 files, unflagged path shipped. Fixed by rooting the walk at
   `process.cwd()` (the same call the loader makes). **Restricting it to
   `.njk` would have repeated the same mistake**: `partials/zz-root.html`
   reproduced the hole one extension away, because the loader does not care
   about the extension. So the rule is *every `.njk`, plus every `.html`
   that is not an 11ty page* — `.html` under `html/` outside `_includes`
   stays with the `nav: education` arm, which is what keeps the widened
   scan from silently extending page scope to simulators.
2. **The exemption was keyed on basename**, so
   `html/_includes/zzsub/schematic-bg.njk` inherited the gutter's pass and
   shipped an unflagged path at exit 0 — and neither anti-vacuity arm
   fired, since either file satisfied both. Now keyed on the path relative
   to the scan root. Proved both ways: the shadowing copy is reported, and
   *moving* the real `schematic-bg.njk` reports its 15 unflagged gutter
   elements **and** `exempt template no longer exists at that path` in the
   same run.
3. **The comment mask ran `/* … */` before blanking `//` lines**, so a
   stray `/*` in one `//` comment paired with a `*/` in a later one and
   blanked everything between — including a diagram. Proved on a lesson:
   `// ratio is length /* width` … unflagged `data-flow` path …
   `// divide by 2 */ done` → exit 0, 137 files, path shipped. Blanking
   `//` lines first removes both strays before anything can pair them, and
   closes the identical shape for `-->` and `#}`.

Each was proved **red before green** against the same construction, and
the reorder was shown neutral on the real tree two ways: a positive search
(`grep -rnE '^[[:space:]]*//.*(-->|#\}|\*/|/\*)'` over `html/` — no hits)
and a differential scan of all 145 `.njk` / `.html` files comparing
old-order vs new-order verdicts (zero differences). Full suite green
(783 passed, 1 skipped); real tree builds clean at 136 files.

**Declared stop.** Two rounds had already proved the guard's core job
works — a brand-new `nav: education` page with an unflagged `data-flow`
path fails the build — and what remained were edge cases each requiring
someone to deliberately do something nobody does today. The structural
floor below is not a fourth round; it is the guard's permanent shape.

---

### 203. `flowStaticGuard`'s comment mask is inert on the current tree, and two records credit it anyway *(open — 2026-07-25; **RESOLVED 2026-08-12** — owner took option (a): mask kept, header rewritten honest)*

Found while verifying the #202 mask reorder (round 3); **logged, not
fixed**, because #202 was a declared stop and this is a documentation-
accuracy call the owner should make rather than a defect in shipped
behaviour.

`flowStaticGuard` masks HTML / Nunjucks / CSS-block / JS-line comments
before scanning, and its header justifies that at length:

> COMMENTS ARE MASKED FIRST. Most of these pages mention `data-flow=` in
> prose … An unmasked scan counts all of those and reports offenders that
> do not exist.

**Measured: masking changes the guard's verdict on zero of 145 scanned
`.njk` / `.html` files.** Replacing `maskComments` with the identity
function still builds clean at 136 files. A differential scan
(`scan(raw)` vs `scan(masked)` per file) reports no file where the flow /
flagged counts differ, and 4 files that mention `data-flow` but yield zero
elements either way.

> **Amendment (2026-07-25, adversarial verification of #430).** The
> conclusion is unaffected — the verdict changes on zero files under either
> population — but **"145 scanned files" overstates what the guard looks at by
> ~2.8×.** The guard scans **52** files: the `nav: education` pages plus the
> `.njk` templates reachable from the scan root (one of them exempt), measured
> by instrumenting the config (`templatesScanned = 11`, all `.njk`). 145 is the
> full `.html` + `.njk` population under `html/` — the scope of the *hand-run
> differential*, not of the guard. Worth correcting precisely here, because
> this entry's whole point is that a claim about the guard must not outrun the
> guard, and the sentence reproduced the defect it documents. See also #207,
> which found the walk skips symlinked templates entirely.

The reason is that the justification is **stale, not wrong-in-principle**:
it was true of the guard's *first* cut, which substring-probed for
`/\sdata-flow\s*=/`. The later "ATTRIBUTES ARE PARSED, NOT
SUBSTRING-PROBED" upgrade — a separate fix, in the same PR — made prose
mentions harmless, because `scan()` only counts things that parse as an
element start tag and a sentence about `data-flow=` has no `<`. Nobody
re-checked whether that upgrade obsoleted the masking paragraph's
reasoning. Classic: two correct fixes, one stale explanation between them.

The mask is not *useless* — it is live insurance against a comment that
contains a full example start tag (`<!-- <path data-flow="supply"
d="…"/> -->`), which would otherwise be counted as a real element. None
exists today. So the code is defensible and the comment overstates it.

**Options.** (a) Keep the mask, rewrite the header to say what it actually
defends — a commented-out markup example, not prose — and note the
attribute parse is what neutralized the prose case. Cheap, honest, no
behaviour change; recommended. (b) Drop the mask entirely as dead weight
and let a future commented example fail loudly. Rejected on the face of
it: a phantom offender on a comment is a confusing build break, and the
`//`-line pass is what the round-3 ordering fix hardened. (c) Leave it —
costs nothing today, but leaves a measured-false claim in the one file
future readers will trust about this guard's reasoning.

**At stake:** nothing operational. It matters because this header is the
designated explanation for a guard that has now needed three adversarial
rounds, and a reader who trusts the masking paragraph will mis-model what
the scan can and cannot see.

**Widened 2026-07-25 — a second instance, same family.** Found by a
verification pass over PR #430's own body, which credited the mask for a
number the mask has no hand in. Its round-3 test plan explained the gutter
exemption's offender count this way:

> reports **15 of 15** unflagged elements — 15, not the 17 a naive grep
> counts, because two of the hits are inside `{# … #}` blocks, **which is
> the comment mask working**.

**Measured directly on `html/_includes/schematic-bg.njk`: the element count
is 15 with masking and 15 without.** The two extra grep hits (lines 18 and
147) are prose inside `{# … #}` blocks, and `scan()` drops them for exactly
the reason the paragraph above already establishes — neither parses as an
element start tag. It is the start-tag parse that yields 15, not the mask.
The PR-body sentence was corrected in the same pass that logged this.

Both instances are the same defect: **a claim about the mask that outruns
what the mask does.** That is why this entry widened rather than spawning a
sibling — the header's reasoning had already been copied into a second
record before anyone measured it, so whichever option above is taken, the
remedy has to reach the header *and* leave the header hard to re-copy
wrongly. See **#204** for the separate finding about what the `//` pass
does and does not blank; that one is a live coverage gap rather than a
stale justification, which is why it is filed on its own.

**RESOLVED 2026-08-12 (owner ruling, the clear-the-decks decision
batch): option (a).** The mask stays; the COMMENTS ARE MASKED FIRST
paragraph in `.eleventy.js` now says what the mask actually defends —
a commented-out markup example that would otherwise parse as a
phantom offender — states outright that prose mentions are
neutralized by the attribute parse, not the mask, cites this entry's
zero-of-scanned-files measurement, and names its own history (the
substring-probing first cut is when the old claim was true). The
"hard to re-copy wrongly" remedy is that the paragraph now leads with
the insurance framing, so there is no sentence crediting the mask
with the prose case left to quote. No behaviour change; the guard's
code is untouched.

### 204. `flowStaticGuard`'s `//` mask is line-anchored — round 3 closed one shape of the comment-pairing hole and opened another *(option (b) shipped 2026-07-26 — both directions documented; (a) still uncorrected by choice)*

Found by a verification pass over PR #430's body, after #202's stop was
declared. Both directions below are **measured on head `4905b78`**, and
**neither is fixed** — this is the record, not a fourth round. Filed apart
from #203 because that one is a stale explanation with nothing operational
behind it, while (a) here is a live coverage gap in a build guard.

`maskComments` blanks JS line comments with a **line-anchored** test
(`.eleventy.js:338`):

```js
.map((line) => (line.trimStart().startsWith("//") ? blank(line) : line))
```

Round 3 moved that pass to run **first**, ahead of the `<!-- -->` / `{# #}`
/ `/* */` passes, so a stray `/*` in one `//` comment could no longer pair
with a `*/` in a later one. That was a real fix. It is also exactly as wide
as the test above, which is narrower than the mechanism it was fixing — the
same shape round 3 itself named as the reason there *was* a round 3.

**(a) Over-masking — the silent direction, still open.** The round-3
construction still reproduces when the two strays sit in comments that
**trail** other markup instead of starting their lines:

```html
<script>// ratio is length /* width</script>
<svg><path id="zz-h" data-flow="supply" d="M0 0 H50"/></svg>
<script>// divide by 2 */ done</script>
```

On a `nav: education` page that builds **exit 0, 137 files**, and
`grep -o '<path id="zz-h"[^>]*>' _site/education/zz-h3b.html` returns the
unflagged path. The line pass never fires — the line starts with `<script>`,
not `//` — so the `/* … */` pass pairs the strays and blanks the diagram out
of the scan. The **line-start** twin of the same construction does go RED as
PR #430 claims: exit **1**, `1 of 1 data-flow elements lack
data-flow-static="true"`. So what round 3 closed is one shape of the hole,
not the hole.

This is the **over**-blanking direction, which is the dangerous one: the
guard hides a real offender rather than inventing a phantom one, so it fails
by shipping. It is correspondingly hard to reach by accident — it needs an
unbalanced `/*` inside one trailing `//` comment, a matching `*/` inside a
later trailing `//` comment, and an unflagged `data-flow` path between them.
Nothing on the tree is anywhere near it: the differential scan reports
**zero of 145** scanned files where masking changes the verdict at all.

**(b) Under-masking — the loud direction, opened by the reorder, never
probed.** `/* css */ // js` on **one line** now behaves differently than it
did before round 3. Old order: the `/* */` pass blanked the block first,
leaving a line that *then* started with `//`, so the trailing comment was
masked too. New order: the line pass runs first, sees a line starting with
`/*`, and leaves the trailing `// …` **unmasked**. Measured both ways on a
constructed line — old order blanks it, new order does not.

Affected files today: **zero**. `grep -rlE '\*/[[:space:]]*//' html/`
returns nothing. And the failure mode is the safe one — an unmasked comment
yields a *phantom* offender and a loud build break, never a shipped path.

The point is not the risk, which is currently nil. It is that the guard
header justifies the reorder as *"Safe on this tree by positive search"*,
and that search covers **one direction only**: it looks for `//` lines
carrying delimiters, never for delimited comments carrying `//`. A
one-directional probe offered as the safety argument for a two-directional
change is the same defect shape as #203 — a claim outrunning what was
measured.

(A smaller note on that same header sentence: the search it cites is written
as running over `html/`, where it returns **4** hits — all in `styles.css`,
`quiz-engine.js` and `refrigerant-loop-engine.js`. The header's *prose*
scopes the claim to `.njk` / `.html`, and restricted that way it is correct
at **0** hits, so the claim holds and only the pasted command is looser than
the sentence around it.)

**Options.** (a) Mask `//` from its first occurrence to end-of-line instead
of whole-line-if-it-starts-with, which closes (a) and — provided the
delimited passes still run afterwards — (b) as well. This needs real care
rather than a one-line edit: `//` appears inside every `https://` URL on the
page, so a naive first-occurrence rule would blank the remainder of any line
carrying a link and trade a narrow over-masking hole for a wide one. It is a
change to a guard that has already needed three adversarial rounds, so it
wants its own PR and its own reproduction pass. (b) Accept both directions
and amend the header to say the `//` pass is line-anchored and the positive
search is one-directional. Cheap, honest, no behaviour change;
**recommended**, and it pairs naturally with #203's option (a) — both are
accuracy fixes to the same paragraph and should ship together. (c) Replace
the four-pass mask with a single tokenizing pass that tracks comment state.
Most correct, most blast radius, and hard to justify for a mask whose
measured effect on the real tree is zero.

**At stake:** nothing today, in either direction, and that is the honest
framing rather than a hedge. (a) is the one worth weighing, because it fails
silently — but reaching it takes a construction no page has ever had. What
is actually at stake is what was at stake in #203: this header is the
designated explanation for the guard, and a reader who trusts it will
believe the comment-pairing hole is closed when it is closed for one shape.

**Option (b) shipped 2026-07-26 — header amended, no behaviour change.** The
mask's comment in `.eleventy.js` now says the `//` pass is line-anchored and
therefore defends line-start `//` comments only; names the trailing-comment
construction as the over-masking direction that fails silently; names the
`/* css */ // js` reorder consequence as the under-masking direction that
fails loudly; and states the positive search as the two-directional search it
now is, so the claim stops at *the reorder cannot change masking on any file
that exists*.

Re-measured on this branch against the mask itself (a 20-line replica of
`maskComments`, so no page scaffolding was needed): the **line-start**
construction leaves the `data-flow` path visible to `scan()`, the **trailing**
twin blanks it away, and `/* css */ //` leaves the trailing comment unmasked.
All three match what this entry recorded on `4905b78`.

The smaller note above is also settled: the header's pasted `grep` now carries
`--include='*.njk' --include='*.html'`, so the command and the sentence around
it have the same scope (0 hits, where the unrestricted form read `.css` /
`.js` and returned 4).

**Two things this did NOT do, recorded so the next reader is not misled.**
(1) **The pending ride-along call resolved as ALONE.** This entry recommended
shipping (b) together with #203's option (a); it shipped without it. #203 is
untouched and stays open. (2) Relatedly, this entry's *"both are accuracy
fixes to the same paragraph"* is **loose** — they are two different comment
blocks in `.eleventy.js`: #203's target is the `COMMENTS ARE MASKED FIRST`
rationale in the guard's header prose, while (b)'s target is the
`LINE COMMENTS ARE BLANKED FIRST` ordering note inside the collection body.
Adjacent in subject, not the same text, which is why one could ship without
the other.

**What remains open** is (a) itself — the line-anchored mask is unchanged, so
the silent over-masking construction still reproduces. It is now *declared*
rather than *hidden*, which was the whole of option (b). Option (a) — masking
`//` from first occurrence to end of line, with the `https://` trap handled —
stays available and still wants its own PR and its own reproduction pass.

### 205. Function-block editor's wire router buries wires on the PUBLIC page too *(resolved 2026-07-26)*

Held until #430 merged (it edits this file). Found while diagnosing the DDC
Workbench layout complaint; the same router defect is live on
`html/simulators/function-block-editor.html`, which IS in the sitemap and IS
linked.

`wirePath` (`html/scripts/fbe-editor.js`) takes its clean single-elbow forward
route only when `b.x >= a.x + 2 * stub` (`stub = 18`, so a 36px test). Below
that it falls back to a route whose vertical legs sit at `a.x + stub` and
`b.x - stub` — inside the blocks when the pitch is tight. Five of the seven
public sheets have sub-threshold hops: `econ`, `tstat-cool`, `tstat-heat`,
`reset`, `proof`. `freeze` and `pid` are clean.

**Measured, and this corrects the first pass at it.** Lowering the threshold
36 → 20px fixes **four** of the five: `tstat-cool` / `tstat-heat` go 3/11 →
11/11 forward, `econ` 4/5 → 5/5, `reset` 4/6 → 6/6, and it *removes* 8
crossings rather than merely adding none (tstat-cool and tstat-heat each 4 → 0,
because their crossings were artefacts of the fallback route's shared
mid-height horizontal).

- **`proof` is almost certainly not a defect and should not be "fixed".** Its
  hops are 145 / 142 / 142 / 149 / 140px, so it stays 2/7 forward at 20px, at
  16px and at 14px — the threshold would have to fall to **≤4.4px**. And
  `function-block-editor.html:287-290` documents its layout as deliberate: the
  chain alternates top and bottom rows so "every link gets a long visible
  vertical run instead of a near-zero horizontal stub." It measures **0px
  hidden behind non-endpoint blocks, 1 crossing** — the one sheet already laid
  out around the fallback route.
- **A threshold change is NOT workbench-neutral.** Shrinking `stub` moves the
  fallback legs, so even where the branch split does not change the occlusion
  does: at 20px the workbench's split stays 6/24 but `cool-2stage` occlusion
  drops 2204.5 → 1481px (33 → 16 buried pairs) while crossings rise 8 → 18.
  **Any PR touching `stub` must be eyeballed on `ddc-workbench` as well.**
- **Record the crossing convention next to any crossing number.** The figures
  above are *intersection points*, not wire pairs. The two conventions coincide
  at 36px and 14px and diverge at 20px, which is exactly how a correct figure
  comes to look wrong.

**At stake:** a public, linked simulator draws wires behind blocks on most of
its examples. **Action:** fold the threshold decision into the DDC Workbench
re-layout work rather than shipping it standalone, since the two share the
router and a standalone change would need the workbench re-verified twice.

**Resolution (2026-07-26 — the PR-4 relayout: `101b311` / `535c178` /
`ffc8d55`).** Exactly the folded shape this entry asked for, in three
measured steps:

- **STUB 36 → 20px** (`101b311` — stub 18 → 10, now a named `STUB` const).
  Measured on the built page, new routing vs the old stub over the same pin
  centres: `econ` 4/5 → **5/5** forward, `tstat-cool` / `tstat-heat`
  3/11 → **11/11** each with crossings **4 → 0** each, `reset` 4/6 → **6/6**;
  `freeze` / `pid` unchanged (already clean). `proof` untouched by design —
  routing identical old vs new, keeping its 5 deliberate fallback runs and
  single crossing, exactly as this entry predicted. Per this entry's own
  convention note: every crossing figure here counts **intersection points,
  not wire pairs**.
- **The three authored burials nudged clear** (`535c178`) — the pre-existing
  coordinate defects the retune could not reach (verified identical
  before/after the threshold change): `freeze`'s inv to (420,40); both tstat
  sheets' temp to (190,20) + hi to (190,120), landing the temp → under drop
  on the clear seam between the hi/lo and over/under columns. All seven
  public sheets now green on every `fbe-geometry.spec.js` assertion.
- **The workbench re-laid to candidate A** (`ffc8d55` — owner-picked
  2026-07-26 after a side-by-side against candidate B): canvas **1401×480**,
  one topological column per link of the longest dependency chain (R=8 on
  the 2-stage sheets) at a uniform 175px pitch — **zero burials, all-forward
  routing (27/27), min margin 39.4px** across all three FCU sheets at the
  16px root font. **Candidate B's honest numbers** (branch `candidate-b`,
  preserved for the record ⟨2026-08-10: the branch is retired — owner
  decision; its commit `0548d66` stays reachable as the annotated tag
  `archive/candidate-b`, so these numbers remain checkable without
  leaving a branch point a lane could pick up by accident⟩): the same
  zero burials at F=16 inside the
  default 900×480, but **26 of 27 wires route backwards** (min margin
  **−135.6px**, two wires wrapping a full block-width the wrong way), and at
  a 20px root font it degrades ~9× worse than A (71 burials / 1320px buried
  on `cool-2stage` vs A's 39 / 142px — the px-literal residual now tracked
  in #208). A's one cost: 563px of in-flow horizontal scroll (fullscreen at
  1456×900 clears it to 0; B's in-flow scroll was 62px, not zero).

**Deferred, with its follow-up named:** C8 — blocks still paint over wires,
and selecting a wire only recolours it. If hand-built-sheet feedback ever
asks for wire tracing, the fix is raising `.fbe-wire-layer`'s z-index on
wire select, as its own tiny PR.

### 206. FBE palette drop grid seeds the buried-wire shape by default *(resolved 2026-07-26)*

Held until #430 merged. `fbe-editor.js` places dropped blocks on a grid with a
**150px x-pitch** — below the 171.6px a clean forward elbow needs at a 16px
root font (see #208 for why that number is not a constant). So a visitor who
builds a sheet by hand from the palette gets wires routed behind blocks
immediately, with no way to know the spacing is the cause.

**At stake:** the failure looks like the tool being broken rather than the
spacing being tight, on the one path where the user authored the layout
themselves. **Options.** (a) Raise the drop pitch above the threshold —
smallest change, but it widens hand-built sheets. (b) Derive the drop pitch
from the same expression the router uses, so the two cannot drift. (c) Leave
it and fix the router instead (see #205). (b) is the one that stops this
recurring.

**Resolution (2026-07-26 — option (b), `9064da2`).** The drop pitch is now
derived from the router's own forward condition instead of the magic 150:
`pitchX = Math.ceil(blockW + 2 * STUB + 2)`, with `blockW` re-measured from
a rendered block (the #208 clamp fix), so a `STUB` retune moves the drop
grid with it and the two cannot drift. Pin-dot centres sit 0.05rem − 1px
outside each block edge, so a block's in-pin → out-pin span is
`blockW + 0.1F − 2` — bounded by `blockW + 2` for any root font under 40px,
which is what the `+ 2` clears. Measured pitch: 158px at a 16px root
(drops at x = 40, 198, 356), 192px at 20px — both sides of the threshold
with margin. Columns fill the actual canvas width
(`cols = floor((INNER_W − 80) / pitchX)`), and `clearCanvas()` resets
`dropSeq` so a cleared sheet drops from the top-left again.

### 207. `flowStaticGuard`'s template walk has two scope holes — one silent, one loud *(2026-07-26 — (b) fixed, (a) documented and accepted)*

Found by adversarial verification of PR #430, after the guard had already
survived three hardening rounds. Same family as #203 / #204.

**(a) Blind to symlinks — SILENT direction, the dangerous one.**
`walkTemplates` (`.eleventy.js`) tests `entry.isDirectory()` / `entry.isFile()`,
neither of which follows a symlink, so **a symlinked template file and a
symlinked directory are both skipped entirely.** Proved by construction: a
root-level `zzlinkfile.njk` symlinked to a file outside the tree holding one
unflagged `data-flow` path, included by a `nav: education` page → **build exit
0, no offender reported, unflagged path shipped to `_site`.** This is precisely
the hole the guard's own header calls out as the reason the scan root is
`process.cwd()` ("a partial parked anywhere else reaches an education page
completely unscanned") — defeated by a symlink instead of by a directory or an
extension. The comment beside the symlink skip frames it purely as a benefit
("no cycles, and no crash on the node_modules symlink an agent worktree uses")
and never as a coverage gap.

**(b) Scans all of `cwd`, skipping only four literal directory names — LOUD.**
`SKIP_DIRS` is `{node_modules, _site, .git, .claude}`, so any in-tree build
output or tree copy not named exactly `_site` is scanned as source.
`npx @11ty/eleventy --output=_site_probe` makes the guard fail with ~130
phantom offenders of the form "`_site_probe/404.html` — 360 of 360 data-flow
elements lack `data-flow-static="true"`" (360 = the gutter count the exempt
partial injects into every built page). It fails loudly so nothing ships, but
it makes `--output` overrides and side-by-side build comparisons unusable, and
the offender wall buries any real line.

**At stake:** (a) is a guard that can pass a genuine offender; (b) is a
diagnostic workflow the guard blocks. **Options.** For (a): follow symlinks
with a `fs.stat` (accepting cycle risk), or resolve and cycle-guard, or accept
and say so in the header — but the header currently implies coverage it does
not have, so *some* change is owed. For (b): test a `_site*` prefix, or scan
`INPUT_DIR` instead of `cwd` — though note the header argues `cwd` is
deliberate, so this is a scope decision, not a bug fix. Pairs naturally with
#203's and #204's header-accuracy fixes; all four are the same paragraph.

**Disposition 2026-07-26 — (b) fixed, (a) documented.**

**(b) FIXED — the skip tests a `_site` PREFIX on directories.** The three
other names stay exact, and the prefix is deliberately restricted to
directories: a *file* named `_site…` (a `_sitemap.njk` partial, say) is real
source and must stay in scope. Verified in both directions on this branch:

- **before** — `npx @11ty/eleventy --output=_site_probe` run twice (the first
  run passes, since the output dir does not exist yet when the collection is
  computed): exit **1**, **134** unique phantom offenders, each `360 of 360`.
  That confirms this entry's "~130" from the other side of the fix.
- **after** — same command against the same on-disk `_site_probe`: exit **0**,
  zero offender lines. `npm run build` exit 0, 136 files.
- **anti-vacuity** — a root-level `partials/zz-probe.njk` carrying one
  unflagged `data-flow` path is still reported under the override (exit 1), so
  the walk was narrowed to build output and not to nothing. The exempt-path arm
  passing is the standing second probe: it can only pass if the walk reached
  `html/_includes/`.

The header's WHICH FILES paragraph now documents the prefix and why it is a
prefix. Note this took option one of the two offered — `cwd` is still the scan
root, so the entry's point that scanning `INPUT_DIR` would be a *scope
decision* is untouched and unmade.

**(a) DOCUMENTED, NOT FIXED — and that is the choice, not an oversight.** The
walk still tests `entry.isDirectory()` / `entry.isFile()`, so a symlinked
template file and a symlinked template directory are both skipped in silence.
What changed is that the guard no longer implies coverage it does not have:
a `DOCUMENTED LIMITATION` note in the header carries the `zzlinkfile.njk`
reproduction and says the paragraphs above describe coverage of *what
`readdirSync` reports as a real file or a real directory*, not of the working
directory; and the comment beside the symlink skip now frames it as a benefit
**and** a coverage gap in both entry kinds, instead of purely as a benefit.

The reason for accepting: following symlinks means resolving and cycle-guarding
a guard that has already needed three adversarial rounds, to close a route
nothing on this tree uses. This entry's own framing — "the header currently
implies coverage it does not have, so *some* change is owed" — is what was
paid. **The hole itself stays open** and an owner who wants it closed should
read this as option three of the three offered, taken knowingly.

### 208. FBE block geometry is rem-sized while every coordinate is a px literal *(open — 2026-07-25 · clamp + relationship-spec halves shipped 2026-07-26)*

The 171.6px column pitch a clean forward elbow needs **is not a constant.**
`.fbe-block` is `8.5rem`, the pin dot `0.62rem`, its margins `0.36rem` — all
scale with the root font — while every block coordinate in `FCU_PROGRAMS` and
`EXAMPLES` is a px literal. Generalised: pin-centre separation is `8.6·F − 2`,
so the forward threshold is **`8.6·F + 34`** (171.6 only at F = 16).

**Consequence, measured rather than derived:** `cool-1stage`'s 175px pitch —
the one sheet with clean routing — **fails as soon as F ≥ 16.40px.** Forcing
the root font, it goes from **0/11 fallback-route wires at 16px to 7/11 at
20px** (and 7/11 at 24px). **Chrome's built-in "Large" text setting is 20px**,
and the site sets no `html` font-size, so a visitor with enlarged text sees the
buried-wire shape on the sheet that is otherwise fine.

The same coupling bites `fbe-editor.js`'s `const BLOCK_W = 136; // matches
.fbe-block width`, which feeds the drag clamp `clamp(origX + dx, 0, INNER_W -
BLOCK_W)` — under-restricting by `(8.5·F − 136)px` at any non-16px root.

**At stake:** an accessibility-adjacent rendering failure that no test can see,
plus a hard-coded width that silently disagrees with its own CSS. **Action:**
whatever geometry spec comes out of the workbench re-layout should assert the
**relationship** (`pitch ≥ blockWidth + threshold − pinInset`) rather than
hard-coding 171.6, and `BLOCK_W` should come from a measured rect.

**Update (2026-07-26 — two of the asks shipped; the entry stays OPEN for
the residual.)** `9064da2`: `BLOCK_W = 136` is gone — `blockW` is
re-measured in `renderAll()` from a rendered block (measured 136.0 at a
16px root, 170.0 at 20px; 136 survives only as the fallback when a block
measures 0 wide in a hidden pane), and the drag clamp uses the measured
width. `b6f64f0`: `fbe-geometry.spec.js` asserts the **relationship** over
measured pin centres — forward margin ≥ `2·STUB + 4` per wire, never a
hard-coded 171.6 — and an F=20 root-font drag test pins the clamp fix (a
170px block may no longer overhang the canvas the way the old const
allowed).

**The honest residual, and why this stays open:** the px-literal
*coordinates* still degrade at a 20px root font. Measured on the shipped
candidate-A workbench layout: `cool-2stage` goes from 0 burials at F=16 to
**39 burials / 142px buried at F=20** (sub-5px grazes, but real — and
candidate B would have been 1320px), `cool-1stage` 13 / 55px. The eventual
fix is **rem-proportional coordinates** — block x/y scaling with the root
font the way the blocks themselves already do; nothing short of that closes
the F ≥ 16.4 class of failure this entry measured.

### 209. Actuator points have no relinquish path — implement 3-slot priority arbitration *(addressed 2026-07-26; the deferred cross-links paid 2026-08-08 · PR #481)*

**Originally filed as "deleting an actuator IO block strands its plant
actuator." That is one symptom of three; the owner reframed it, correctly, as
the EBO/BACnet failure it actually is** — a level stops writing, its value
persists because nothing relinquishes it, and downstream logic keeps consuming
a command nobody is issuing.

Pointed out in the same breath, and it settles the design: `bacnet-basics.html`
already teaches this exact failure — *"Forgetting to release an override is the
most common way priority-array logic goes wrong in the field."* **The site
teaches the defect its own simulator implements.**

**Mechanism.** `plant.actuators` is the single source of truth for the physics,
the unit graphic and the point row. The binding tick populates it AUTO-only:

```js
blk = byId[p.id];
if (!blk) continue;                 // ← no else: the key keeps its last value
v = blk.in ? blk.in.IN : undefined;
if (v === undefined) continue;
plant.actuators[p.plantKey] = (p.kind === 'bo') ? (v === true) : v;
```

`fbe-engine.js` already fills an undriven input (`v = pin.kind === 'bool' ?
false : 0`) before this runs, so **deleting a wire is safe** — the block is
still present and commands off. **Only deleting the block freezes.**

**Three instances of the one defect.** The first was the filed one; the other
two were found while designing the fix, and neither would have been closed by
the one-line `else` branch originally proposed:

1. **Block deleted** (inspector's "Delete block", two clicks from a loaded
   program) → the point holds its last command forever.
2. **HAND does not take the point, it inherits it.** Entering HAND leaves
   `plant.actuators` holding whatever AUTO last wrote until a control is moved.
3. **Leaving HAND does not release HAND.** `setMode` only flips button classes
   and `aria-pressed`; it relinquishes nothing. If the program has no block for
   that point, the HAND value persists into AUTO.

This is also the general form of the mechanism `cool-1stage`'s orphan `y2`
block relies on: that unwired block is load-bearing — the engine fills its `IN`
with `false`, which is the only thing forcing stage 2 off after a switch down
from `cool-2stage` — and nothing defends it.

## The decided design

**Three real BACnet slots, not a bespoke tier scheme.** The vocabulary already
exists on this site in two places — the `#priority-array` section of
`education/bacnet-basics.html` and the `tools/bacnet-priority.html` resolver —
so the simulator uses three of the real sixteen rather than inventing its own:

| Tier | Slot |
|---|---|
| Override | **8 — Manual Operator** |
| Program | **16** — "the slot the BMS's normal sequence writes from" |
| Fallback | **`Relinquish_Default`** |

The lesson's own summary — *"slot 8 beats slot 16, and a null at slot 8 lets
slot 16 take over"* — becomes literally what the simulator does. **Copy
constraint:** the sim must say it *uses* three of the sixteen slots, never that
there are three.

**Owner verdicts, 2026-07-25 — these four are CLOSED.**

- **(a) What relinquishes slot 16?** *"If the block is there, even not
  connected, it sends out as off. If there's no block associated with it, then
  it goes to default."* Block present ⇒ slot 16 is writing (off, via the
  engine's existing fill). Block absent ⇒ slot 16 is null ⇒ `Relinquish_Default`.
  No engine change needed. **And it is to be surfaced as a teaching
  opportunity, not merely fixed.**
- **(b) How does the user release slot 8?** *"A null checkbox next to the
  override"* — faithful to how real systems present it, and it makes the
  lesson's key point (*"writing null releases; it doesn't overwrite"*) a
  physical control rather than prose.
- **(c) The sensor override stays separate and basic.** It forces the value the
  *program reads* — an input override, not a command priority. It resembles
  slot 8 and is a different mechanism; conflating them would teach something
  false. Little to no rework.
- **(d) Visibility.** A **"points not following program:"** window rather than
  per-point chrome on every row. The owner notes this may change once he can
  look at it built — treat the window as the starting shape, not the final one.

## Consequences of (a) and (b) that still need a call

- **(d) is load-bearing for (a), not cosmetic.** "Commanded off at slot 16" and
  "relinquished to `Relinquish_Default`" will often resolve to the *same
  displayed number* (both `false`, or both `0` for the fan AO). Without the
  window, the distinction (a) exists to teach is invisible. The window should
  therefore name *which* reason a point is off-program — override active vs
  slot 16 null — not merely list the point.
- **Each point needs a `Relinquish_Default` value.** `FCU_POINTS` has no such
  field today. `y1` / `y2` / `fan-enable` → `false`; `fan-speed` → needs a
  decision (0, or a minimum). It is a real BACnet property, so the field name
  should say so.
- **(b) may make the AUTO / HAND toggle redundant.** In BACnet terms there is
  no "HAND mode" — there is only whether slot 8 is null. Today `mode` gates
  three things: the program write, the enable state of the HAND controls, and
  the slider mirroring. Under arbitration, the program always writes slot 16
  and the override is simply present or null, so the mode buttons collapse into
  the checkbox. That is more faithful and less chrome, **but it removes
  existing UI and should be signed off explicitly rather than assumed.**
- **Small interaction detail for the checkbox:** when null is checked, does the
  slider/toggle grey out, or show the resolved value? And does unchecking
  immediately write the control's current position to slot 8, or arm it?

**Scope.** No longer a bug fix — it touches the binding tick, `setMode`, the
HAND handlers, `FCU_POINTS`, and adds a UI surface. **Sequenced after #211 /
#212**, which are contained. Do **not** ship the one-line `else` as a stopgap;
it would be ripped out. **One trigger overrides that:** if the workbench goes
public before this lands, put the one-liner in first — a graphic showing a
compressor nobody commanded is not something to publish.

**Cross-links owed when it ships:** `education/bacnet-basics.html`
(`#priority-array`) and `tools/bacnet-priority.html`. The window is effectively
a three-slot instance of that resolver, so the two should present consistently.

## Resolution (2026-07-26 — `1f09ed7` / `f116901` / `44bef34`, plus `c4bce7f` a11y and `e1574a6` comment purge)

Shipped as designed, with every open call above decided by the owner on
2026-07-26.

- **`html/scripts/point-arbitration.js`** — `PriorityArray`, a real sparse
  16-slot arbitration core (create / set / release / resolve), a shared classic
  script with no DOM and no unit knowledge, so it runs Node-direct in
  `tests/point-arbitration.spec.js` and the browser page reaches it by name.
- **Unconditional slot-16 binding.** The binding tick writes slot 16 every tick
  a block exists for the point (a present-but-unwired block still evaluates —
  the engine fills undriven inputs `false`/`0` — so the sequence commands off,
  exactly verdict (a)), and writes slot 16 **NULL** when the block is absent →
  the point falls to `Relinquish_Default`. That closes instance 1; instances 2
  and 3 died with the mode itself (below).
- **AUTO / HAND collapsed** (the consequence flagged above, signed off
  explicitly): the mode buttons and `mode` state are deleted outright; each
  hand control carries a **NULL checkbox** (checked = slot 8 released = the
  default state). **Bumpless:** while checked the control is disabled and
  tracks the resolved value; unchecking writes the control's current (resolved)
  position to slot 8, and subsequent moves keep writing slot 8.
- **`relinquishDefault` is a required field on every actuator point config**
  (named for the real BACnet property): `fan-speed` → **0** (owner call),
  `y1` / `y2` / `fan-enable` → `false`. It comes only from `unit.points` — no
  fallback table, no per-id branch in shell code — per the AHU-ready unit
  contract.
- **The (d) window shipped** as the starting shape: an aria-live
  "points not following program" box that names *which* reason each point is
  off-program — commanded by slot 8 (Manual Operator) vs slot 16 NULL →
  holding `Relinquish_Default` — rendering from `unit.points` through
  `formatPointValue`, vocabulary matched to `tools/bacnet-priority.html`
  (never "slot 17" — the residual copy question on the *preamble* is #217).
- **Slot state deliberately survives program switch / editor Reset / Clear** —
  a priority array lives on the point, not in the program, and the months-old
  stale override IS the lesson. The code comments say so in both places so
  nobody "fixes" it.
- **The sensor override is untouched** (verdict (c)) — it stays a unit-local
  input-override mechanism, not a command priority.
- Behaviors pinned in `tests/ddc-workbench-priority.spec.js` (browser) and
  `tests/point-arbitration.spec.js` (Node-direct); the existing
  `tests/ddc-workbench.spec.js` set updated where the mode collapse moved its
  fixtures.

The cross-links owed to `education/bacnet-basics.html` and
`tools/bacnet-priority.html` are **deferred to the go-public pass** — the
workbench is still live-but-hidden, and inbound links from two indexed pages
would advertise it early. That debt now rides the graduation checklist, not
this entry.

**Both cross-links paid 2026-08-08 (PR #481, `1c68b1e`); the two sentences
above are now historical.** The deferral's reason expired at Phase 8
graduation (`012567e`, 2026-08-04) — both workbench unit pages carry
canonicals and sit in the sitemap, so an inbound link no longer advertises a
hidden page early, and the workbench is no longer "live-but-hidden."
`education/bacnet-basics.html` gained a paragraph in its `#priority-array`
section plus a `simulators` group in `relatedLinks()`;
`tools/bacnet-priority.html` gained a closing `p.ref-note` in its "Writing
NULL releases" section plus the same group. Before that commit
`grep -c ddc-workbench` returned 0 on both files.

**⚠️ Read the copy constraint in *The decided design* above with #217
beside it — this entry's constraint text is what misled the lane.** That
block still reads *"the sim must say it **uses** three of the sixteen slots,
never that there are three"*, and both new passages honoured it literally:
they said the workbench "uses three of the sixteen slots", with
`Relinquish_Default` as the third. That is precisely the wording **#217
superseded on 2026-07-26** — `Relinquish_Default` is a separate writable
property, not a slot — and on `tools/bacnet-priority.html` the regression
landed thirteen lines below that page's own teaching that it is not
"slot 17", so two paragraphs disagreed on one screen. Caught in pre-merge
review and corrected in `80d4b0d` to #217's ruled shape ("commands it on
three levels" / "It commands each point on three levels"), which
`simulators/ddc-workbench.html`'s preamble and the `point-arbitration.js`
header had already been carrying since #217 resolved. **Treat #217's
resolution as superseding the constraint above**: the mandated three-part
shape survives, the word *slots* for the third item does not.

### 210. Stale comment in `ddc-workbench.html` claims the fan-off fault needs a HAND override *(addressed 2026-07-26)*

The comment above the unit-graphic alarm reads: "Fan-off splits two ways: with
a stage energized it's a genuine no-airflow fault (**only reachable by a HAND
override** — in AUTO the auto-fan runs the fan for any cooling call)."

**Measured false.** Loading `cool-2stage-fanon` and toggling its `fanon` block
to false drives `fan-enable` false with Y1/Y2 still commanded, **in AUTO**,
firing the alarm with no override involved. The same state is reachable on
either two-stage sheet by deleting the `or1 → fan-enable` wire in the
inspector. The comment appears to predate the `fanon` program.

**At stake:** small but exactly the defect family #201 / #203 are about — an
in-repo record that a reader will trust about what an alarm means. **Action:**
fix in the same pass as anything else in this file.

**Resolution (2026-07-26 — `f116901`, sweep in `e1574a6`).** Rewritten in the
#209 pass. The comment now enumerates the routes actually measured — the
`fanon` source toggled false in `cool-2stage-fanon`, a deleted
`or1 → fan-enable` wire (an unwired input evaluates false, so the *sequence*
commands the fan off), or a slot-8 fan-enable override held OFF under an
active cooling call — with no "only reachable by a HAND override" claim, which
became doubly false once #209 deleted HAND as a mode. `e1574a6` then purged
the stale AUTO/HAND vocabulary from the three other comments that still
asserted the mode exists; grep for AUTO/HAND/setMode now returns only the
priority spec header's deliberate mentions, which document the deletion.

### 211. FCU unit-graphic badge captions overflow their frames *(addressed 2026-07-26)*

**This is the originally reported bug**, now confirmed by capture rather than
arithmetic. `DAT · DISCHARGE` needs ~102 user units of advance in a 90-unit
box (~6 units past *each* edge, ~13% over); `EAT · ENTERING` ~95.2 in 86;
`ΔT ACROSS COIL` ~95.2 in 96, fitting by only ~0.4 per side. SVG `<text>` does
not wrap, and there is no `clip-path`, `textLength` or `lengthAdjust` anywhere
in the file, so the overflow always paints outside the frame.

Screenshots at `deviceScaleFactor 3`: at a 1600px viewport all three captions'
first and last glyphs sit **on** the frame stroke; at 700px all three plainly
**break** their frames.

**Two measurement traps to carry, or the next person will "correct" this
wrongly.** (1) **Headless Chromium quantizes glyph advances to integer CSS
pixels** (behaves as `--font-render-hinting=full`), while this box's fontconfig
selects `hintslight` — which is what a *headed* browser uses. A headless
measurement reports ~93.8 units where the geometry is 102, and ~113.9 at a
narrower scale. Measure under `--font-render-hinting=slight` or at integer SVG
scale, and treat **~102 as a floor**. (2) `Δ` (U+0394) is outside the
`unicode-range` on every IBM Plex Mono `@font-face` rule, so it renders from
the platform's generic monospace and is the widest glyph in its caption.

**Also in this file, same fix pass:** `.fcu-pt-val { font-size: 14px }` beats a
presentation attribute in the cascade, so the authored `font-size="13"` on the
EAT / ΔT / DAT readouts and `"12"` on the zone setpoint are **dead**.

⚠️ **CORRECTION (2026-07-26).** This entry originally added "its `fill`
attribute still works, so only the size half of the treatment was lost." That
is wrong, and wrong in the direction that mattered: `.fcu-pt-val` sets
`fill: var(--text-bright)` as well as `font-size`, so the setpoint's
`fill="var(--text-dim)"` was **equally dead** and *both* halves of the
treatment were lost. Same mechanism as the size half — one rule, two
declarations, both beating their attribute twins. The lesson is narrower than
"CSS beats attributes": having established that for one property, the entry
still asserted the sibling property survived, without re-reading the rule it
had just cited. **Check the whole rule body, not the one declaration you came
for.**

**Options.** (a) Shorten the captions. (b) Widen the rects — note each frame's
`stroke-width: 1` straddles its nominal edge by 0.5 units, so sizing purely
from `getComputedTextLength()` vs the rect `width` is off by ~1 unit total.
(c) Reduce the caption font-size. (d) Add U+0394 to the mono subset — but that
is a **cross-page** decision, since the same glyph appears in this page's HTML
mirror readout and in prose elsewhere.

**Resolution — (c), plus the dead attributes removed** (PRs #432 / #433, and
the zone setpoint in this pass).

- **Captions: 10px → 8px at weight 600.** Owner call: shrink the type rather
  than shorten the captions or widen the badges, because it keeps the
  abbreviation-plus-gloss shape that teaches what EAT/DAT mean, leaves the
  composition untouched, and buys ~3 characters of headroom per badge for more
  complex unit types. At 8px the three captions measure 76.2 / 76.2 / 81.6
  against boxes of 86 / 96 / 90. Weight 600 is load-bearing, not decorative —
  at 8px on a device face the captions need it, and it is how the owner draws
  these boxes in the field. 600 rather than 700 because **no 700 mono face
  ships** (see #216); naming 600 says what renders instead of leaning on
  weight-matching. *(Overtaken 2026-07-26 by #216's resolution: the owner
  ruled the nine 700s were intent and the real face now ships, so
  `.fcu-pt-cap` asks for 700 and gets it — see #216.)* Monospace is
  fixed-advance across weights, so the advances above are unchanged by it
  (measured, re-confirmed with the 700 face loaded).
- **The six dead `font-size` attributes on the EAT / ΔT / DAT readouts are
  gone**, rather than promoted to real rules — they were requesting 13px where
  the class gives 14px, a step nobody asked for.
- **The zone setpoint's hierarchy is restored as SIZE ONLY**, via a real class
  `.fcu-sp-val { font-size: 12px }` ordered after `.fcu-pt-val` (single-class
  specificity, so source order is what makes it land — the same route
  `.fcu-dt-val` already takes). The dim `fill` half is **deliberately not
  restored**: `var(--text-dim)` would paint an active setpoint at the same ink
  as its own caption, inverting the value-loud / caption-quiet hierarchy that
  block is built on, and on a device face a greyed point reads as
  *out of service* rather than as *secondary*. Verified rendered: zone temp
  14px, setpoint 12px, both `--text-bright`; the 12px string measures 53.5
  units centred in a 150-unit frame.

Option (d) is untaken and remains a live cross-page question — `Δ` still
renders from the platform monospace.

### 212. `updateChips` ignores the unit system — metric shows Fahrenheit numbers labelled °F *(addressed 2026-07-26)*

`FCU_POINTS` hard-codes `unit: '°F'` and `updateChips` reads the raw canonical
Fahrenheit value with no `Units` call, so **with the site in metric the IO chip
strip shows Fahrenheit numbers under a °F label.**

Worth stating precisely, because the framing matters: **the page converts
correctly nearly everywhere else** — the SVG readouts, the HTML mirror
readouts, the OA readout and the sensor-override box (which even carries a
`unitschange` listener) all handle it. `updateChips` is the **single** missed
path. The visible consequence is two HTML surfaces on the same page
disagreeing: the mirror reads **24.4 °C** while the chip strip directly below
reads **75.9 °F**.

**At stake:** a correctness bug on a hidden page, so nothing user-facing yet —
but it must be closed before the workbench is published. **Action:** a narrow
fix on that one path, not a retrofit.

**Resolution (PR #432).** The narrow fix, as scoped. `FCU_POINTS` entries gained
a `conv` field naming the conversion each point needs (`temp` for absolute
temperatures, `deltaTemp` for the deadband, absent for the unitless `%` points),
and `updateChips`'s numeric branch dispatches on it — `dispTempNum` + `tSuffix`
for `temp`, `Units.display.deltaTemp` + `dSuffix` for `deltaTemp`, plain
rounding otherwise. Both surfaces now read 24.4 °C together. Four points carry
`conv`. The whole page is one IIFE, so the chip painter reaches the existing
converters by name with nothing hoisted or re-exported.

### 213. `simulators/pid-tuner.html` still pays live path reads on static geometry *(addressed 2026-07-26)*

Surfaced while verifying #202's sweep. `pid-tuner.html` carries four
`[data-flow]` paths, all `class="pid-eq-flow"` with hard-coded literal `d`
values, and a positive search for geometry writes
(`setAttribute('d'|'points'|'x1'…)`, `.style.transform`) returns **nothing** on
those elements. It already does the right thing around its engine attributes:
it writes `data-flow-density` and calls
`scene.querySelectorAll('[data-flow]').forEach(p => FlowEngine.refreshPath(p))`.

So it is a **safe, unclaimed candidate for `data-flow-static="true"`** — the
one remaining page paying `getPointAtLength()` per particle per frame on
geometry that never moves. #202's "the non-education pages needed no change" is
true for *correctness* and understates this as a perf residual.

Note `flowStaticGuard` deliberately excludes simulators (a markup rule would
pass `hydronic-loop-builder.html` vacuously), so this is a scope decision
rather than an oversight — but it belongs recorded as a residual, not as "no
change needed."

**Resolution (PR #436).** The four `.pid-eq-flow` paths took
`data-flow-static="true"`, and the `.pid-eq-scene-host` carries the assertion
comment that makes the claim auditable rather than implicit — the same shape
`refrigerant-loop.html` uses. The assertion holds on two counts: the four `d`
attributes are literal and nothing writes them (`updateScene` moves the
actuator fill's `y`/`height` and the fan's `transform`, never the flow track,
and a positive search for `setAttribute('d'|'points')` / `.style.transform`
returns nothing on the page), and the one engine attribute that *does* change —
`data-flow-density`, the coarse three-band output→flow cue — is refreshed in the
same breath by both of its writers, the preset change and the band change.
Measured in a headless dark-theme run against the built site: with the flag,
**zero** `getPointAtLength()` calls on those paths over a 2 s idle window;
with it removed at runtime on the same page and the pool refreshed, **630** in
the same window (one visible path, 5 particles, 60 fps). Liveness held
throughout — particles traced 28.3–29.6 user units/s across four scenarios
(baseline, after the page's own density band change, after an Equipment preset
switch, and after that scene's band change), console clean. The page-level
`FlowEngine.init()` idempotence and the hidden-scene pools are untouched; this
is an attribute-only change.

### 214. `ddc-workbench-fcu-unit`'s profiler baseline is known-untrustworthy and carries no note *(annotated 2026-07-26 — the precondition question stayed open; **RESOLVED 2026-08-12 · PR #537** — answered: sampling noise, not page state; row re-pinned)*

`tests/perf-profile.mjs`'s baseline for that row records 2.23 layouts/frame
(capture samples 2.20 / 2.44 / 1.87), and it has since flagged over-tolerance
on both subsequent runs (4.34 and 4.67). Noise explains the magnitude but not
the inverted ordering against the control, and the baseline was captured at the
idle-gate merge, so a missing gate is not the explanation. Most likely a
page-state precondition difference. **Unresolved.**

The upkeep problem is the point: the script's own protocol says "if a fourth
run flags a row that nothing else explains, widen the floor and add the
observation here." That protocol **was** followed for the `hydronic-loops` row
re-based in #430 (three samples, full provenance note) and **was not** followed
for this one — and the two flagging observations live only in a session handoff,
not in the script. So the next reader of that file finds an untrustworthy
baseline with nothing attached telling them so.

**At stake:** a DRIFT reading on that row means nothing today and no one can
tell. **Action:** either annotate the row with the two observations and the
open question, or resolve the precondition difference. The annotation is cheap
and stops the record from decaying further.

**Annotated 2026-07-26 — the first action, not the second.** The two
observations and the open question now sit in `tests/perf-profile.mjs` beside
the `ddc-workbench-fcu-unit` BASELINE row: the capture samples and the two
flagging runs (4.34, 4.67); that noise at this magnitude explains the size of
the gap but not its ordering, since the recorded 2.23 sits *below* the
control's 2.87 while both later runs sit above it; that a missing idle gate is
ruled out by the capture being taken at the #426 merge; and that a page-state
precondition difference is the remaining candidate, unresolved. A pointer
paragraph in the header's BASELINE section sends a reader from the protocol
sentence to the row.

**No tolerance was widened, deliberately.** The protocol's other half — widen
the floor — needs three fresh runs on a characterised machine, which this pass
did not do; widening around a baseline nobody trusts would hide the question
instead of answering it. **This entry therefore stays OPEN**, and what remains
open is exactly the precondition question: what differed between the capture
state of `/simulators/ddc-workbench-fcu.html` (Unit) and the two later runs.
Answer that and the row can be re-baselined properly; until then a red number
there is uninterpretable and now says so in the file.

**RESOLVED 2026-08-12 · PR #537 — the precondition question is ANSWERED,
and the answer is "there never was one."** The clear-the-decks re-baseline
session ran three full 6-rep runs on a genuinely idle box (load ~0.8, no
agent lanes, static server on :9401): the FCU Unit row read
2.19 / 5.09 / 3.56 layouts/frame while the CONTROL read 4.87 / 1.98 / 3.45
— two statistically indistinguishable distributions (means 3.61 / 3.43,
both swinging ±1.5). At 2–5 l/f the reported value is one rep's 2 s
window, so a single gutter burst moves it ±1.5: the pinned 2.23 was a
low-edge sample, the flagging 4.34 / 4.67 were high-edge samples under
load, and the "inverted ordering vs the control" was two draws from
overlapping distributions. No page-state difference exists to find. The
row is re-pinned (l/f 3.61, fps 59.8, Δtask 120.6), the
KNOWN-UNTRUSTWORTHY marker is retired, and the script's FOUR ROWS
RE-BASELINED 2026-08-12 header block carries the full numbers as the
protocol's worked example. No tolerance widened — against the fresh means
every measured row sits inside the existing ±2.0 floor.

### 215. FBE inspector accepts unbounded const values straight into the plant *(open — 2026-07-25; **RESOLVED 2026-08-12** — measured in-browser: no wedge, the plant's own floor absorbs it; no clamp, by design)*

Split out of #209 on 2026-07-25 — same file, unrelated mechanism, and #209
became a design arc while this stayed a small robustness question.

`fbe-editor.js`'s inspector builds a bare `<input type="number">` for every
const param with **no `min` / `max` / `step`**, storing
`b.params[p.name] = isFinite(n) ? n : 0`. `isFinite` already rejects `NaN` and
`Infinity`, so the exposure is *finite but absurd* values. `cooling-setpoint`,
`deadband`, `sep` and `hundred` all accept negatives and arbitrary magnitudes,
and `hundred` feeds the fan-speed AO with no clamp anywhere downstream —
`plant.actuators['fan-speed']` is consumed directly by the physics.

**The question that decides this has not been measured:** can an absurd value
drive the forward-Euler integrator into a state it cannot recover from without
a page reload? There is a `dt` clamp on the host tick; there is no *value*
clamp. That is the difference between:

- *silly input, silly output* — harmless, arguably instructive, leave it; and
- *the sim is dead until reload* — a real bug that a visitor would read as the
  page being broken.

**Measure before choosing.** It needs a browser (the physics lives in the page,
not in a separately-loadable engine), so it is a few minutes rather than a
guess. Do not clamp on suspicion — an unnecessary clamp removes exploration
from a teaching tool, and letting a student type a wrong number and watch the
consequence is part of the point.

**Related:** `deadband` is the same input path that produces #202-era D6
behaviour (a negative deadband erases hysteresis into a bare comparator, which
is a *better* teaching hook than the failure originally claimed for it, and an
argument for leaving that particular const unclamped).

**Negative-`sep` measurement (2026-07-26)** — discharging the caveat on
rulings 2+8's "scope any guarding to `deadband` + fan-speed": swept the real
engine + the shipped `cool-2stage` literal (vm pattern) with `sep = −4`, so
y2on (71 °F) sits below y1on (75 °F), space temp 60 → 85 → 60 °F at 0.25°
steps. **No wedge.** No non-finite output anywhere, and the behaviour is
legible: the sr2 latch simply trips first (Y1 + fan come on at 71.25 °F via
`or1`), stage 2 still waits for the sr1 latch at 75.25 °F via `and1` — the
or1/and1 pair D2 called redundant at `sep ≥ 0` is exactly what keeps the
staging ordered here — and the down-sweep stages off in reverse, everything
off at 71 °F. Restoring `sep = +2` at 60 °F recovers nominal thresholds
(75.25 / 77.25 °F) with no latch state surviving. Legible exploration like
the rest of the const family; no clamp warranted for `sep`.

**RESOLVED 2026-08-12 — the measurement this entry demanded ran, and the
answer is NO WEDGE: leave it unclamped.** In a real browser against the
built FCU page, through the inspector's own `#fbe-p-value` input path
(Playwright). Method note the next measurer needs: a first probe that
just set `hundred` = ±1e300 measured **nothing** — with stage 2 off, the
SEL block never selects IN1, so the absurd value sat parked behind an
unselected input and the plant never saw it. The real run first dropped
`cooling-setpoint` to 60 °F so stage 2 engaged THROUGH the program and
the SEL output actually fed the fan-speed AO. Then, consumed by the
physics, `1e300` produced: ONE tick to the plant's own floor —
`ddcw-fcu-unit.js:548`, `if (plant.zoneT < 40) plant.zoneT = 40;` — the
latches drop out (zone below every threshold), the fan goes idle, and
the zone re-warms at its natural rate. No NaN, no Infinity, no
saturation anywhere in the block values or the mirror. `-1e300` is
quieter still: `fanCmd` requires `fanPct > 0`, so a negative speed reads
as fan-off. Restoring `hundred` = 100 / SP = 72 recovered the nominal
program in seconds — thresholds 75.25 / 77.25 back, the unit legibly
idle until the zone re-crosses — **without reload**. The deciding
question lands on the first branch: *silly input, silly output —
harmless, arguably instructive.* The single stateful physics variable is
already hard-floored by the plant; every other absurd-const path flows
through stateless comparators or boolean latches. Same disposition as
the negative-`sep` measurement above: legible exploration, no clamp
warranted, entry CLOSED.

### 216. Nine rules request a mono weight the site does not ship *(addressed 2026-07-26)*

Surfaced while writing the weight comment for #211. `styles.css` loads IBM Plex
Mono as four static instances — **400 / 400-italic / 500 / 600, and nothing
heavier** (the sans is variable and covers 300–700; the mono is not). Nine rules
ask for `font-weight: 700` on a `var(--mono)` element:

    html/styles.css:3154            .quiz-results-headline
    html/styles.css:4041            .lcd .v
    html/education/coil-selection.html:80          .csel-lever-flow
    html/education/psychrometrics-basics.html:48   .pool-w-status .lbl
    html/simulators/controller-wiring.html:133     .cw-readout
    html/simulators/ddc-workbench.html:59          .fcu-pt-val
    html/simulators/ddc-workbench.html:171         .fcu-point-val
    html/simulators/refrigerant-loop.html:163      .rl-gauge-val
    html/tools/bacnet-priority.html:130            .bpri-pv

**Measured, not assumed** — this is the part worth carrying, because the two
plausible outcomes have opposite consequences. Rendering the same string to a
canvas at each weight and diffing pixels: **700 vs 600 = 0 differing pixels**,
while the control **500 vs 600 = 595 differing pixels**. So the UA resolves the
request down to the 600 file and does **not** synthesize bold, and the control
proves the diff can see a real weight difference (a bare "0 pixels differ" with
no control would equally well mean the measurement was broken).

**So nothing renders wrong today.** This is a truth-in-code item, not a bug: the
CSS names a weight that cannot happen, and the next person to touch one of those
rules will reason from 700. It also means **mono captions and mono values now
render at the same weight** wherever a 600 caption sits under a "700" value — on
the FCU badges the caption/value distinction rests entirely on size (8 vs 14)
and fill, which is still a strong separation, but it is not the separation the
stylesheet claims.

**Options.** (a) Rewrite the nine to `600`, matching what #211 already did for
`.fcu-pt-cap` — honest, zero visual change, nine files touched. (b) Subset and
ship a mono 700 face — a real visual change on nine surfaces plus another font
file, and the reason the mono was pinned to four instances was weight. (c) Leave
it and rely on the resolution behaviour. **(a) is the obvious call** unless the
owner actually wants heavier mono values somewhere, which is what (b) is really
asking. Not fixed inline because it spans six files outside the #211 pass.

**Resolution — (b), owner ruling 2026-07-26: the nine 700s were intent.** He
wants genuinely bold small sensor labels, so the fix was not to rewrite the
rules down to what shipped but to ship the face the rules already ask for.
`html/assets/fonts/ibm-plex-mono-latin-700.woff2` — same gstatic producer run
as the four shipped instances, latin subset, a true Bold (usWeightClass 700),
coverage delta vs the 600 face empty — plus a fifth `@font-face` block in
`styles.css` mirroring the 600 block verbatim; new filename per the
immutable-by-name rule, `?v=` cache bust covered by the version bump.
Re-measured on the built site: 700 vs 600 now diffs (1363 px at 24px, 348 at
8px, against a live 500-vs-600 control) where it measured 0 above, and
advances are byte-identical across 400/500/600/700, so no box geometry moved.
`.fcu-pt-cap` follows to 700 in the same PR — its 600 existed only because no
700 shipped (#211), and that argument inverted the moment the face landed;
its rationale comment and measured numbers are updated (76.13 / 76.13 / 81.56
user units at both weights, boxes 86 / 96 / 90). The #211(d) Δ rider (U+0394
into the mono subset) was **offered, not taken**: adding Δ only at 700 would
render it inconsistently across weights, so it stays a live cross-page
decision.

### 217. Preamble counts Relinquish_Default as one of "three of the sixteen slots" — the sibling tool teaches "not slot 17" *(resolved — 2026-07-26)*

`html/simulators/ddc-workbench.html` (preamble) and the
`html/scripts/point-arbitration.js` header both say the workbench commands
each output "using three of the sixteen slots: 8 (Manual Operator) …, 16 …,
and Relinquish_Default when both are NULL." Only two of the sixteen slots are
ever written; Relinquish_Default is a separate writable property — and the
companion page this one links to, `html/tools/bacnet-priority.html`, teaches
exactly that distinction twice ("it is not \"slot 17\"", in the resolution
prose and in the FAQ). So the two surfaces currently disagree about whether
Relinquish_Default is a slot.

Not fixed on the PR because the phrasing is inside the decided design's copy
constraint (owner, 2026-07-26): *the sim USES three of the sixteen slots —
never say there are only three*, with Relinquish_Default listed as the third.
A minimal repair that keeps the mandated three-part shape but stops calling
Relinquish_Default a slot: enumerate **commands**, not slots — e.g. "through a
real BACnet priority array, on three levels: slot 8 (Manual Operator) for
your hand, slot 16 for the sequence, and the Relinquish_Default fallback when
both are NULL." Same three items, no "slot 17" implication. Needs the owner
to pick: keep the locked wording as-is, or take the repair (three files:
page preamble, `point-arbitration.js` header, and the "three-slot" shorthand
in `tests/ddc-workbench-priority.spec.js`'s header).

**Resolution (2026-07-26 — owner took the repair, program-rewrite lane).**
The "on three levels" wording landed verbatim in all three files: the page
preamble now reads "on three levels: slot 8 (Manual Operator) for your hand,
slot 16 for the sequence, and the Relinquish_Default fallback when both are
NULL"; the `point-arbitration.js` header enumerates the same three levels and
says outright that only the two slots are ever written and Relinquish_Default
is a property, not a "slot 17" (naming the `tools/bacnet-priority` lesson it
now agrees with); the spec header's shorthand became "three-level". The
mandated three-part shape survives — three items, none of them a
seventeenth slot.

### 218. Shell `formatPointValue` closes over helpers defined inside the UNIT: FCU banner *(closed 2026-07-26 — shell-extraction PR)*

`formatPointValue` (shell statusbar section of
`html/simulators/ddc-workbench.html`) calls `dispTempNum` / `tSuffix` /
`dSuffix`, which are defined inside the UNIT: FCU banner further down the
IIFE. Pre-existing (`updateChips` on main already did it) and not a
genericity defect — the helpers are generic `window.Units` wrappers with no
FCU knowledge — but the off-program window added a second shell consumer, so
the coupling deepened. When the shell is extracted to its own script
(phases 5-8 lane), the three helpers must move to the shell section (or fold
into `formatPointValue`) or the extraction breaks on an invisible closure
edge. No change warranted before then.

*Disposition (2026-07-26):* the `refactor/ddcw-shell-extraction` branch did
exactly this — `dispTempNum` / `tSuffix` / `dSuffix` now live in
`html/scripts/ddcw-shell.js` as `DDCWShell` statics (the shell header cites
this entry) and the unit delegates through them. No commit carries a
`(#218)` suffix (the extraction commits predate the disposition), so this
note is the ledger link. Closed on the extraction PR itself — this doc
edit rides the same merge, so the status is true the moment it lands.

### 219. Workbench static placeholders describe a state the staged programs never resolve to *(open — 2026-07-26 · cosmetic — **RESOLVED 2026-08-12 · PR #553**, and one surface was never cosmetic)*

The FCU graphic's authored SVG text and its mobile mirror ship with
`100% · ON` / `STG 2 · ON` / `Stage 2 · ON` / DAT `56.6 °F` / ΔT `20.4 °F`,
the fan slider ships `value="100"`, and the plant seed sets
`'fan-speed': 100` — all describing a full-speed stage-2 snapshot. Since the
#205 rewrite staged the fan reference (arrival resolves stage 1 at 60 %),
none of those placeholders match any state the shipped programs produce; the
`Stage 2` text never matched the zone-76 arrival (stage 1) even before the
rewrite. Invisible in practice: the init script calls `hostTick()`
synchronously at end-of-body, so the placeholders are repainted before the
first frame, and the seed actuator value is overwritten by `bindingTick`
before `unit.update` ever reads it. Worth truing up to the arrival state
(60 % · ON, Stage 1) whenever the statics are next touched — a no-JS render
is the only surface that can ever show them, and the sim is JS-only anyway.
Found by the #205 adversarial verify; deliberately not fixed on that branch
to keep the candidate diff reviewable.

**RESOLVED 2026-08-12 · PR #553 — trued to the arrival state, and the
"invisible in practice" framing above was HALF WRONG by the time it was
acted on.** Every authored value now equals the frame the shell's boot
`hostTick()` paints: fan **60 % · ON**, **stage 1**, DAT **58.4 °F**, ΔT
**-17.6 °F**, against the unchanged RAT / zone **76.0** — so the ΔT badge
still reconciles from its own displayed operands (58.4 − 76.0 = -17.6).
The fan slider's `value` went 100 → 60 and the plant seed's `'fan-speed'`
with it; that seed's comment claims it matches what cool-2stage commands
on arrival, which is a live invariant rather than a description, and it is
the half that drifted.

**The correction to this entry: the #298 register key is NOT invisible.**
It landed after this entry was written, and its three sample wells carry
no `id`, so `renderUnit` never repaints them. They sat permanently on
screen printing `100%` and `-19.4 °F` immediately beside a live mirror
reading `60% · ON` and `-17.5 °F` — the legend-drifting-from-the-instrument
failure that row's own spec comment warns about. So the entry's disposition
("cosmetic … a no-JS render is the only surface that can ever show them")
was true when filed and stopped being true when a later PR added a static
surface nothing repaints. **Generalise it: "the boot tick repaints it"
holds only for nodes `renderUnit` actually writes** — a new static value on
this page is live-visible unless it is wired to an `out.*` target, and the
next reader should re-check that before trusting an invisibility claim.
`tests/ddc-workbench-fcu.spec.js` now pins the key row to the arrival frame
with the derivation recorded, which is the standing guard for the visible
half.

Derivation, since the DAT was not guessable from the entry: the boot
`hostTick()` is a direct call and the 10 Hz repaint is a separate
`setInterval`, so stubbing `window.setInterval` before boot leaves that one
tick as the only one that runs and the DOM holds exactly the frame these
placeholders are replaced by. Frame 1 beats a settled reading here — zone
is exactly the 76.0 seed, so RAT and zone stay on their correct values,
where a settled snapshot (≈ 58.1 / 75.6 at 6 s) is an arbitrary point on a
continuous drift and would have dragged them off. Suite green at 1204
passed / 1 skipped; the seed change moved a dozen engine-direct rows from
100 % to 60 % airflow and reddened none, which is that file's
directions-not-values policy doing its job.

### 220. Shell-extraction residue the AHU page must inherit consciously *(open — 2026-07-26 · carry into the AHU brief — **RESOLVED 2026-07-30**, AHU page lane)*

**Disposition — option (a), as this entry anticipated.** The AHU page
(`html/simulators/ddc-workbench.html`) carries its own copy of both rules in its
`{% block head %}`: `label.ddcw-null` declared AFTER the page's `.ahu-fanen
label` rule so it wins the (0,1,1) tie, and the `.ddcw-tracked[disabled]`
dimming scoped under `.ahu-controls`. The `@media (hover: none)` floor came with
it — the AHU has three NULL boxes in `.slider-field`, which no shared selector
reaches. Zero risk to the live FCU page, no `styles.css` selector change, no
re-verification of the FCU's fan-enable row. Option (b) (widening the shared
selector) stays defensible and stays a separate PR. The `styles.css` section
header now says BOTH pages carry the duplicate, so the next reader does not
assume it is FCU-only.

The entry's third item — the `SPEED_MIN` / `SPEED_MAX` mirror — is settled by
omission on this unit, per #234: `ddcw-ahu-unit.js` declares `SPEED_DEF` and
`MAX_DT_SIM` (both READ by the shell, so both live) and declares no unread
bounds constants. The slider's `min` / `max` live in the markup alone, which is
the only place anything reads them.


Two deliberate leftovers from the `refactor/ddcw-shell-extraction` branch,
verified sound there but invisible to the next lane unless recorded here (a
PR body is not a durable debt ledger):

- **Two `ddcw-*` control-pattern rules stay page-inline** in
  `html/simulators/ddc-workbench-fcu.html`'s head block — `label.ddcw-null` and
  the `.fcu-controls .ddcw-tracked` disabled dimming (the block's comment
  explains the split). The justification is real: `.fcu-fanen label` and
  `label.ddcw-null` are both specificity (0,1,1), so graduating the latter
  to `styles.css` (earlier in the cascade) would flip the fan-enable NULL
  box from its own line back to inline-flex. Consequence: the AHU page must
  duplicate these two rules (or rename/re-specify them for its own control
  markup) — its brief should say which.
- **The sim-clock bounds mirror is now cross-file:** `SPEED_MIN` /
  `SPEED_MAX` in `html/scripts/ddcw-fcu-unit.js` are referenced by no code
  and mirror the speed-slider markup bounds `min="1" max="60"` in the page.
  Pre-existing duplication on main (both halves then lived in one file);
  the extraction split them across files, weakening the mirror. When the
  AHU page copies the slider pattern, either wire the bounds from the
  constants or carry the mirror knowingly.

### 221. Workbench program `<select>` ships empty; options build at boot *(recorded 2026-07-26 — by design, no action)*

The one behavioral delta the shell-extraction verification found, recorded
so a future audit doesn't flag it as a regression. Base shipped the four
`<option>`s as static markup; the branch ships an empty
`<select id="ddcw-program">` and `DDCWShell.buildProgramPicker()` builds
identical options (values, labels, order, disabled `Custom (edited)` last)
from the unit contract at boot. Deliberate: the picker is now derived from
`unit.programs` / `unit.programLabels`, so a second unit page cannot drift
from its own program set. The only reachable difference is a no-JS render
(empty select vs a list that controls nothing) and a pre-tick paint during
incremental render — the same accepted class as #219's static placeholders,
on a page that is wholly JS-driven, noindex, and excluded from collections.

### 222. perf-profile: the workbench Unit row's layoutsPerFrame tolerance fires on a clean main build *(noticed 2026-07-27, PR #443 gates — **RESOLVED 2026-08-12 · PR #537**, the re-baseline pass ran: re-pin, not widen)*

While recording the report-only before/after for the safeties-program PR,
the `ddc-workbench-fcu-unit` row read `layoutsPerFrame` 3.73 on a clean
**origin/main** build and 5.63 on the branch build — both flagged against
the pinned 2.23 baseline, and the two readings bounced that far apart on an
identical Unit tab (the branch's new sheet only mounts when selected, and
fps held 59.8 in both runs). Either the pinned baseline has drifted since
it was measured or the metric is loads-dependent enough that its ±2.0
absolute tolerance under-absorbs this box under background load. Worth a
re-baseline pass (idle box, several reps) before anyone reads that flag as
a real regression; the profiler's own header already names fps as the
ranking signal.

**Follow-on (2026-07-27, sensors PR #444 — recorded so the numbers are
not re-litigated):** the same box pushed two more report-only excursions
on the visible-sensors branch, both host-load noise, neither a
regression. The Unit-tab `dCTRL` read +105.0 ms/s in the lane run
(inside the ±110 tolerance) and +111.8 ms/s (468.2 vs control 356.4) on
a single-rep adversarial re-run under load — nominally past tolerance,
with rep spread measured at 17+ ms/s on this box. The wiresheet row's
apparent fps drop (59.4 → 51.8, then 52.8) recovered to 58.4 on an
isolated re-run. Mechanism check closes it: the branch diff adds no
persistent animation — the chip-highlight hook's sole timer is a
self-clearing one-shot `setTimeout`, the glyph/chip effects are
event-driven CSS transitions, no rAF or interval — and liveness held
26/26. Same disposition as the entry above: fps is the ranking signal,
tolerances under-absorb this box under load, and the re-baseline pass
is where these numbers get settled.

**RESOLVED 2026-08-12 · PR #537 — the re-baseline pass this entry asked
for ran (three idle 6-rep runs), and it said RE-PIN, NOT WIDEN.** The
pinned baselines, not the tolerance, were the problem: one 3-rep
session's medians sitting at the edges of their distributions. Against
the fresh three-run means, every measured row's worst deviation sits
inside the existing ±2.0 floor. Re-pinned: control l/f 2.87 → 3.43 (fps
60.1), FCU Unit 2.23 → 3.61 (Δtask 89.4 → 120.6, fps 59.8), FCU
Wiresheet 3.43 → 4.91 (Δtask 18.8 → 43.9, fps pin 53.1 → 46.0 — its
three runs sat tight in the top of its documented 2.09–5.23 unstable
range, own 4.0 floor unchanged), and the AHU Unit row got its first pin
(l/f 3.08, fps 59.9, Δtask 167.5). The Δtask growth on the FCU rows is
the pages growing (session persistence, the COV work and the sheet-note
folds all landed since 07-24), inside ±110 throughout. The 3.73 / 5.63
readings this entry recorded were ordinary draws from the
now-characterised distribution. Full numbers: the script's FOUR ROWS
RE-BASELINED 2026-08-12 header block; the mechanism story is #214's
resolution.

### 223. screenshot-wiresheets: canvas-element shots clip a scrolling sheet *(resolved 2026-07-27)*

The matrix rig screenshots `surface.canvas` (`.fbe-canvas`), which is a
scroll container — in `normal` mode (and even `fs-wide` for the 480-tall
workbench canvas) the shot captures only the scrolled-into-view region, so
the bottom band of a full-height sheet never appears on the contact sheet.
A review pass that trusts the matrix alone can miss a defect below the
fold. Fix candidates: shoot the `.fbe-canvas-inner` node with the canvas
temporarily un-clipped, or scale the shot to the inner's full bounds.

**Resolved (2026-07-27, `fix/ddcw-pre-ahu-hygiene`).** Two corrections to
the framing above, both measured before the fix:

- **The vertical loss is the small one.** In `normal` mode the vertical
  clip is 2 px at a 16 px root font and 0 px at 20 px (`30rem` = 600 px
  there). The HORIZONTAL clip is 563–653 px — about 40 % of the 1401 px
  workbench sheet, four whole columns. On `cool-2stage-safeties`, 16 of
  32 blocks sat outside the `normal` shot and 12 of 32 outside `fs`.
- **`fs` clips too, and worse than `fs-wide`**, and the public page is
  affected as well (`proof` / `fs` loses an 88 px band including a
  block). Of the 66 combinations measured, all but one lost something
  (`workbench / cool-1stage · dark · F=20 · fs-wide` is the one that
  fits) — so "every combination" would have been an overstatement, but
  only just.

Candidate (a) as written here — shoot the inner **with the canvas
temporarily un-clipped** — was close: the un-clip is the load-bearing
half and is exactly what shipped. What did not survive is shooting the
*inner*. In fullscreen the inner is `width/height: 100%` of the canvas,
so before the canvas grows it is smaller than the sheet; only
`canvas.scrollWidth/scrollHeight` is the sheet. Once the canvas IS
grown the inner re-resolves to match (measured 1238×392 → 1401×480), so
either node would then work — the canvas is chosen because it carries
the border and is one node instead of two. Candidate (b) alone is
wrong: content an ancestor clips is never painted, so no clip rectangle
or scale can recover it.

The fix is `unclipForShot()` in `tests/screenshot-wiresheets.mjs`, run
in the page before each shot: measure `scrollWidth/Height` while still
clipped, walk every ancestor to `overflow: visible`, hide sticky/fixed
page chrome with `visibility: hidden` (the sticky nav otherwise paints
over the top band — `main` is a `z-index: 1` stacking context, so no
z-index on the canvas can beat it), then grow the canvas to the content
bounds. Two rAFs after: `reducedMotion: 'reduce'` turns on the
`transition-duration: 0.01ms !important` kill switch, and with the
initial `transition-property: all` every inline style write becomes a
real transition, so the new size is not readable until a frame ticks.
A `shotBoxDefects()` guard then throws rather than write a
plausible-looking crop, retrying one frame first so a timing race
cannot discard a ten-minute run, and the contact sheet writes in a
`finally` so a partial run still yields a readable index. The caption
now carries the shot size and the crop that WOULD have applied, which
is how the fs / fs-wide "does the wide canvas fit?" question stays
answerable.

Pinned by `tests/fbe-geometry.spec.js` layer C (3 tests, in CI), which
extracts the helper from the rig source rather than re-deriving it. Its
three probes are picked so that deleting any of the helper's three
steps goes red — in particular the ancestor un-clip, which a
`getBoundingClientRect` probe is blind to (layout boxes do not know
they are being paint-clipped), so it is asserted by re-reading each
ancestor's computed `overflow`. Verified by mutation: deleting the
ancestor walk, deleting the chrome-hide loop, and reverting the helper
entirely each fail all three tests with a message that names the
defect.

### 224. Workbench verdict/chevron ΔT thresholds compare DISPLAY-unit values against a fixed 3 *(resolved 2026-07-27)*

`fcuRenderUnit` computes `dtN` from the DISPLAYED operands (correct — the
metric worked-example rounding policy) and then compares it against the
literal 3 for both the chevron recolor gate and the "No ΔT across coil —
compressor not cooling" verdict branch (now `dtN <= -3` / `dtN > -3`
under the signed convention; same shape before the sign flip). In US
units that line is 3 °F; in metric the SAME literal reads as 3 °C ≈
5.4 °F — so a metric viewer sees the no-ΔT verdict (and un-tinted
downstream air) for real deltas between 3 °F and 5.4 °F that a US viewer
sees as healthy cooling. Pre-existing (the unsigned code had the same
unit-dependence); noticed while flipping the sign, deliberately not fixed
in that lane (scope). Fix candidate: derive the verdict from the CANONICAL
delta (`d.datT - d.eatT`) against an IP constant, keeping `dtN` for paint
only — one line each in the gate and the ladder.

**Resolved (2026-07-27, `fix/ddcw-pre-ahu-hygiene`) exactly as the fix
candidate says.** `COOLING_DT_TRIP = -3` (°F, signed) and
`datDeltaT(d)` join the canonical-threshold shelf in
`ddcw-fcu-unit.js`'s physics half next to `COIL_FLOOR` / `DAT_LOW_*`,
and both comparisons keep their original `<=` / `>` shape on the
canonical operand. The `>` form is deliberate over `!(… <= …)`: a
non-finite delta must keep falling THROUGH that branch, and the negated
form would catch it instead.

One under-statement in the entry: `:489` gates two paints, not just the
chevron stream — `downstreamColor` AND `#fcu-dat`'s `fill`. That is
what gives the proof a cheap synchronous observable.

Two behaviour deltas, both accepted. In US the trip point moves by at
most 0.1 °F (`dtN` was the difference of two 0.1-rounded operands; the
canonical delta is unrounded) — decide on the truth, paint the rounded
number. In metric a reader now sees "Cooling — clear ΔT" beside a
−2.0 °C badge, because −3 °F ≡ −1.7 °C. That reads odd and is correct:
it is the house policy's own shape (engine computes in IP, converts at
the display boundary), and the constant's comment says so, so nobody
"fixes" it back.

The freeze-watch branch's `d.coilLeaveT <= 42` was checked and is NOT
the same bug — `coilLeaveT` is canonical °F off `derived`, never
through `dispTempNum`. Same for `datT < DAT_LOW_TRIP` / `> DAT_LOW_CLEAR`.
Do not touch either. `eatN` / `datN` / `spN` / `sensedN` were enumerated
and are all write-only, so there is no third site.

Two proofs. A Playwright test in `tests/ddc-workbench-fcu.spec.js` parks
the coil inside the divergent band (−3.6 to −5.0 °F, reachable only on
the ramp) and flips the units toggle: the number changes, the verdict,
pill class and DAT fill do not. Pre-patch it fails with
`Expected "Cooling — clear ΔT across the coil" / Received "No ΔT across
coil — compressor not cooling"`. Plus a source-scan guard in
`tests/ddcw-fcu-unit.spec.js` — the mechanical rule the AHU module
copies. That guard's comparison operand is deliberately unconstrained:
an earlier draft anchored it to a numeric literal, which would have
passed the likeliest relapse, `dtN <= COOLING_DT_TRIP` (right constant,
wrong operand).

### 225. The "2-stage + safeties" sheet has no airflow proof, so its DAT low-limit goes blind with the fan off *(noticed 2026-07-27, prose audit — **RESOLVED 2026-07-30**, FCU proof sweep: rewired, not reworded)*

The sheet is presented as the protected sequence, but its only external
inputs are `space-temp` and `dat` (`fan-enable` / `fan-speed` are outputs).
Nothing reads fan status, current, or DP. Combined with
`ddcw-fcu-unit.js:242` — `const datT = fanOn ? coilLeaveT + FAN_HEAT : zoneT;`
— a fan commanded off makes the discharge probe report room temperature, so
the low limit does not merely fail to trip: it goes blind and self-clears.
Simulated with `dat` held at 76, the sheet commands
`{y1:true, y2:true, okrun:true, permit:true}`, driving both compressors into
dead air — the condition the page's own top verdict line paints red.

On real gear the fan-proof interlock is first in a DX sequence and the low
limit sits behind it; a reader who learns the ladder in the other order will
trust a discharge limit to protect a coil it cannot see. Field nuance for
whoever writes the fix: a real probe would sit cold and drift up rather than
jump to room temp, so reality goes blind slowly — but it still goes blind.

**Owner decision 2026-07-27: defer.** Not a merge blocker for #443. The AHU
programs land next and carry more of this class, so both get swept together
before the page goes public. Fix is expected to be prose (name the missing
interlock as a deliberate scope boundary), not a rewire — but the sweep may
conclude otherwise once the AHU sequences exist. Full writeup:
`docs/audits/2026-07-ddcw-prose/findings.md` §1.

**Owner ruling 2026-07-29 supersedes that expectation.** Offered three ways
out, he chose *add a `fan-status` BI to the FCU* over reframing the flawed
sheet as a deliberate trap — *"fan status is very universal, getting it on a
simple model will be good for newcomers"* — plus "some sort of mention of its
importance." So the sweep concluded the other way: a REWIRE, and the sheet is
now correct.

**RESOLVED 2026-07-30.** What shipped:

- A `fan-status` BI point (`kind:'bi'`, `dir:'sensor'`) on the FCU roster,
  fed by a real proof model — `plant.proof` accumulates seconds of
  *continuous* airflow and makes after `PROOF_MAKE_DELAY`, but drops on the
  first tick without. Make-slow / break-fast, which is the asymmetry a
  sequence has to be written around.
- The plant now names three airflow facts apart: `fanCmd` (what the sequence
  asked for), `airflowOn` (whether air moves), `fan-status` (what the switch
  reports). Every line of physics gates on `airflowOn`. `d.fanOn` is gone —
  one key could not answer two questions once they diverge.
- A `fan-belt` fault holds the command and stops the air, which is what makes
  the blind limit demonstrable rather than hypothetical.
- The sheet gained `coilok = AND(okrun, fan-status)` feeding `permit.A`, so
  the proof interlock sits AHEAD of the low limit — the field ordering this
  issue asked for.

**The rewire does NOT stop the latch clearing blindly, and that is
deliberate.** `okrun` still SETs on a blind 76 °F reading; a latch cannot
know its probe is lying. What changed is that the stale clear now commands
nothing. Re-measured on the shipped sheet, same probe as above (fan off,
`dat` held at room temperature, power-up min-off burned):

| | before | after |
|---|---|---|
| `okrun` | true | true |
| `permit` | true | **false** |
| `y1` / `y2` | **true / true** | **false / false** |

Gating the SET side as well was considered and does not fit: the router's
2·STUB+4 margin pins any inserted block to one x-window, and `datok → datarm
→ okrun → permit → y1gate` needs two blocks in a span that holds one
(derived in the PR body). The permit gate is also the one that matters —
gating only the SET would leave a *running* stage untouched when the belt
goes, which is the headline failure this issue names.

`tests/ddcw-fcu-unit.spec.js` pins both halves in one row, so a future change
cannot "fix" the latch, break the interlock and still pass.

### 226. The safeties lockout is two protections stacked, and the sheet note describes only one *(noticed 2026-07-27, prose audit — **RESOLVED 2026-07-30**, FCU proof sweep)*

A DAT low-limit trip is itself a full stop of `y1gate`, so it arms the
min-off TON at the same instant it cuts the stages. Measured closed-loop
against the real unit module (fan forced to 25% at slot 8, otherwise
defaults): `okrun` returns true 10.5 sim-seconds after the trip, but the
stages do not restart for 120.0 sim-seconds. Of the lockout a reader
watches, roughly 11 s is the low limit and roughly 110 s is the off-timer.

The reader-facing note says the limit "holds them off until it recovers past
the clear constant," which predicts the stages return at the clear point.
The page separately instructs the reader to force the fan slow and watch the
safety act — so anyone who follows that instruction and times the recovery
concludes the clear constant is wrong.

Related and unmentioned in the same note: on program load the TON starts at
`et=0`, so selecting this sample holds the stages off for a full 120 sim-s
while the verdict paints amber "Compressor off — fan only." The default
sample arrives running, so picking safeties *stops a running unit and keeps
it stopped* — six real seconds at the default 20x clock, two real minutes at
1x. Defensible (a real board serves a min-off on power-up too) but currently
unexplained.

**Owner decision 2026-07-27: defer** to the same pre-live sweep as #225.
Writeup: `docs/audits/2026-07-ddcw-prose/findings.md` §2 and §5.

**RESOLVED 2026-07-30.** The reader-facing note now carries both protections
and the power-up case, in its own paragraph:

> Watch the recovery order, because two protections are stacked and they
> clear in series. A low-limit trip is itself a full stop of the stage
> command, so it arms the minimum off-timer at the same instant it cuts the
> stages. The discharge has to climb past the clear constant *and* the
> off-timer has to expire before anything restages — so the stages return
> well after the clear point, not at it. That timer also starts from zero on
> a program download, which is why selecting this sample stops a running unit
> and holds it stopped for a spell: a real board serves a minimum off on
> power-up too.

The offending clause — "holds them off until it recovers past the clear
constant" — is gone. Note what the replacement does NOT do: it states the
ORDERING and never the seconds. The measured 10.5 s / 120.0 s split recorded
above is a feel constant twice over (both `pt` and the coil lag are tunable),
so it belongs in this file and in a commit body, not in prose a retune would
silently falsify — the *write claims that can't go stale* convention.

### 227. FCU graphic a11y: a live region inside a hidden pane, and `role="img"` over five focusable descendants *(noticed 2026-07-27, prose audit — (a) resolved 2026-07-27, (b) **RULED 2026-07-28** and **RESOLVED 2026-07-30 on BOTH pages** — the AHU page lane; the FCU half nearly shipped a lane late, see #251)*

**(b) implemented on the AHU page, per the 2026-07-28 ruling.** `role="img"`
STAYS on `#ahu-graphic` — dropping it to `role="group"` would un-hide roughly
nineteen duplicated `<text>` nodes to a screen reader, which is worse than the
defect it fixes. So nothing inside the drawing is focusable: the five sensor
glyphs carry no `tabindex` and no `role="button"`, and their pure-CSS `:has()`
link to the annotation they feed is hover-only.

The ACTIVATION affordance moved OUT of the SVG to real HTML buttons — the five
point-mirror cells for `oat` / `rat` / `mat` / `dat` / `space-temp`. Pressing one
pulses that point's statusbar chip through the shell's own `highlightChip` hook
(the FCU's glyph behaviour, unchanged) and LATCHES `.is-hilite` on the annotation
group, which is what a hover cannot do for a keyboard or touch reader.
`tests/ddc-workbench-ahu-page.spec.js` pins all three halves: the buttons exist
and name real roster points, nothing inside the graphic is focusable, and the
latch follows the press including the zone-box case.

The FCU page is unchanged and keeps its focusable glyphs — the two pages differ
because their graphics differ, and the graduated `.ddcw-sensor` block in
`styles.css` serves either. Its `:focus-visible` arms are now documented as
serving a focusable glyph where a page chooses one.


Two findings from the same audit, both on the FCU workbench graphic, neither
a program issue and so outside #225/#226's deferral.

(a) **The safety annunciation is silent on the Wiresheet tab.**
`#fcu-verdict` carries `aria-live="polite"` but sits inside
`<div id="tab-unit" class="tab-pane">`, and `styles.css:1349` is
`.tab-pane { display: none; }` — a live region in a `display:none` subtree
is not in the accessibility tree. The new "DAT low-limit annunciator latched"
branch therefore announces nothing while the Wiresheet is up, which is
exactly where a reader sits studying the program it belongs to. Nothing else
carries it: `renderOffProgram` early-returns on slot 16 and `updateChips`
writes plain spans. ⚠️ Do NOT fix by moving the pill —
`.tool-card.is-fullscreen #tab-unit.active` declares a `grid-template-areas`
with a `verdict` row and `.fcu-verdict { grid-area: verdict; }` only resolves
while the pill is a grid child of that pane. Strip `aria-live` from the pill
and add a persistent `sr-only` mirror outside both panes; the house shape
already exists at `pid-tuner.html:339` (`#pid-sr-status`).

**(a) resolved 2026-07-27 (`fix/ddcw-pre-ahu-hygiene`), exactly as
prescribed** — and it had to carry prose-audit **item 18** with it, which
is why that item is no longer listed below. The pill's `aria-live` is
gone (and no `role="status"` took its place — that would reintroduce the
same bug), `#fcu-verdict-sr` is an `.sr-only` live region parked beside
`#ddcw-offprog` outside both panes, and one new writer `setVerdict()` in
`ddcw-fcu-unit.js` owns both nodes. `html/styles.css` is untouched:
`.sr-only` already ships at `:1916`, so no cache-bust obligation.

Item 18 is not optional riding cargo here. The verdict was rewritten
unguarded on every 10 Hz host tick — measured ~40 mutation records on
`#fcu-verdict` in a 2 s STEADY window (text identical before and after).
Harmless while the pill was the only writer; a screen reader talking over
itself ten times a second the moment a live region carries that text. So
`setVerdict` is signature-guarded on the shell's `offprogSig` idiom, with
the class riding IN the signature so a class-only change can never be
skipped. Deliberately not debounced the way pid-tuner's `announceMetrics`
is — that page throttles a genuinely-changing metric; this one de-dups
identical writes, and an annunciation must not be delayed. Residual,
accepted: a plant hovering exactly on a verdict threshold can legitimately
flip at up to 10 Hz.

Two notes for whoever reads the code:

- The mirror ships empty in MARKUP only. The shell's boot paint
  (`hostTick`, `ddcw-shell.js:657`, called once before the 10 Hz interval
  starts) fills it, so a reader landing on the page hears the current
  verdict once — intended, and NOT the off-program window's
  empty-and-in-tree contract.
- The text-only signature is safe only because no verdict string carries
  a number or a unit, so nothing has to re-render on `unitschange`
  (contrast `offprogSig`, whose signature deliberately moves with the
  toggle). Every branch was read to confirm it. A verdict line that ever
  interpolates a temperature must fold the unit suffix into the
  signature.

Pinned by two tests in `tests/ddc-workbench-fcu.spec.js`. Pre-patch the
first fails on `expect(aria-live).toBeNull() / Received "polite"`; the
second on `pill repaints only on a verdict change / Expected <= 0 /
Received 40`.

**(b) was left open here** — owner decision, untouched by (a), including the
stale in-file comment it names, so (b) could be dispositioned as one unit.
**It now has that decision; see the ruling below the finding.**

(b) **`role="img"` now wraps five focusable elements** — two `.fcu-link`
drill-downs and three `role="button"` sensor groups. `img` is a
presentational-children role. The in-file comment still calls this "the
education idiom," which is a static-diagram idiom:
`grep -c tabindex html/education/*.html` returns zero across every lesson.
⚠️ The naive `role="group"` swap is worse than the problem — `img` is what
currently prunes the subtree, so swapping un-hides all 19 `<text>` nodes,
every one already duplicated in the `.fcu-points` mirror that exists
*because* the graphic is an image. Two honest paths: pair the swap with
`aria-hidden` on the mirrored content, or keep `role="img"` and move the
activation affordance to real HTML buttons outside the SVG. Owner decision
either way; the stale comment needs correcting regardless.

> **RULING ON (b) (2026-07-28) — the second path. `role="img"` STAYS, and
> the activation affordance moves out of the SVG onto real HTML buttons.**
>
> The pruned subtree is the property worth keeping: the graphic is an image
> with a `<desc>`, and the point mirror beside it already carries every value
> the drawing paints. The mirror is also what makes this cheap — the chips
> mirror the graphic one-for-one, so they become the activators and the
> focusable elements simply come out of the pruned subtree. No `aria-hidden`
> bookkeeping over 19 duplicated `<text>` nodes, and no window where a swap
> has landed but the hiding has not.
>
> It also settles a second finding from the same audit for free — the one
> filed in `docs/audits/2026-07-ddcw-prose/findings.md` as *glyph names
> announce as objects, not actions*. A sensor group carrying `role="button"`
> inside a presentational-children role announces as the thing it draws
> rather than the thing it does; a real `<button>` outside the SVG announces
> as an action because it is one.
>
> **NOT IMPLEMENTED IN THE AHU depiction lane, and deliberately so.** The
> change touches the shipped FCU page and the AHU page that comes after it,
> and the activators have to be wired to whatever the graphic's click model
> ends up being — so it rides with **the graphic-and-animation work of the
> Phase-7 AHU round**: the lane that wires the AHU's sensor glyphs and readouts
> once the unit plug-in exists. Not the depiction mockup, which is a drawing
> with no click model to wire against. One change across both pages, rather
> than two divergent ones.
> **Scheduled, not done.** The stale in-file comment on the FCU page ("the
> education idiom") is corrected there, in that lane, with the rest of it.
>
> Recorded here so it is not re-litigated: the `role="group"` + `aria-hidden`
> path is closed.

Smaller a11y items from the same audit (glyph names announce as objects not
actions — **settled by the ruling above**, and scheduled with it; "far wall"
has no referent; `aria-label` on two bare `<div>`s where naming is
prohibited) are itemised in
`docs/audits/2026-07-ddcw-prose/findings.md`. The fourth — the verdict
`textContent` rewritten unguarded at 10 Hz (item 18) — shipped with (a)
above; see there for why it could not wait.

### 228. Engineering math is re-implemented per page — air mixing carries three disagreeing forms and no shared helper exists *(noticed 2026-07-27, owner direction — scheduled separately, not this arc)*

Owner direction, 2026-07-27: *"The air mixing disagreeing seems like an
issue I'd like to fix, with all these things using it, it may be good to
standardise some engines. Not part of this arc, but should be
documented."* This entry is that record — a duplication sweep over
`html/tools/`, `html/education/`, `html/simulators/` and `html/scripts/`
with **no code changed**, so the work can be scheduled on its own.

The sweep turned up three different things that look alike in a grep, and
most of the value here is in keeping them apart:

- **(a) Duplicated implementations that can silently diverge** — the real
  defect class, and the only one worth a shared helper.
- **(b) Deliberate pedagogical restatement** — a lesson or a methodology
  note printing the formula it is teaching. Showing the arithmetic *is*
  the page. Not a defect; a future sweep must not "fix" these.
- **(c) Deliberately different arithmetic for a page-specific reason** —
  a tool whose displayed math has to close on its own *displayed*
  operands, or whose inverse solve constrains the form it can use. These
  want a shared helper **family**, not a naive collapse onto one
  function.

#### The part that actually produces different numbers: air mixing

Four call sites, three forms, and no helper anywhere:

- **Mass-weight `W` and `h`, then recover dry-bulb by inverting
  `h = (0.240 + 0.444·W)·T + 1061·W`** — the exact form.
  `html/tools/air-mixing.html:546-549` and
  `html/tools/psychrometric-chart.html:672-675` (the comment above each
  spells the inversion out, near-identically).
- **Linear blend on `T` and `W`** — `html/tools/economizer-ratio.html:535-537`.
- **Linear blend on `T` only** — `html/tools/coil-freeze-risk.html:451-458`
  (in integer tenths, see (c) below), and the same
  `frac·OA + (1 − frac)·RA` inside the air-handlers lesson widget at
  `html/education/air-handlers.html:718-720`.

`html/scripts/psychro-engine.js` has **no mixing helper at all** —
`grep -n 'mix' html/scripts/psychro-engine.js` returns exactly one hit
and it is a comment. That comment (`:44-45`) already names air-mixing,
coil-sizing and economizer-ratio as the engine's "candidate second
consumers", so the gap is documented and simply never closed.

Measured against the engine loaded in a `vm` (the
`tests/psychro-engine.spec.js` pattern) — OA 35 °F / 80 % RH, RA
75 °F / 50 % RH, 50 % OA, sea level:

| form | DB | WB | RH | h |
|---|---|---|---|---|
| exact — air-mixing, psych chart | 55.1 °F | 49.7 °F | 68.8 % | 20.09 |
| linear-T — economizer-ratio, coil-freeze-risk | 55.0 °F | 49.7 °F | 69.0 % | 20.06 |

The gap is **0.06–0.13 °F of dry-bulb** across the realistic OA/RA band
(largest on warm humid mixes, and it changes sign on hot dry ones) and
about 0.2 points of RH — small, but visible at the one-decimal precision
the tools print. The exact form is the right one: `h` and `W` mix
linearly with mass, `T` does not, because `cp` carries `W`.

**A bigger divergence sits underneath the formula, and it is about the
input.** The same "% OA" figure is a **mass** fraction on three surfaces
and a **volumetric** one on air-mixing's flow tab, which converts
`CFM ÷ v` per stream at `html/tools/air-mixing.html:527`. air-mixing is
the page that gets this right and says so — its inputs are labelled
"Mass fraction (%)" (`:236`, `:261`, `:286`), the tab note at `:310-312`
sends CFM readings to the other tab, and its FAQ frontmatter (`:13-14`)
states the rule outright. The other three surfaces say only "% OA" /
"Outdoor air (%)". Same field numbers on a design-day cold morning
(OA 0 °F / 60 %, RA 70 °F / 30 %, 30 % OA): **49.1 °F** on a mass basis
versus **46.9 °F** on a volumetric one — a **2.2 °F** spread, an order of
magnitude past the formula disagreement, and invisible to a reader who
assumes "% OA" means one thing site-wide.

#### What is deliberate and must survive any fix

The `cp = 0.240 + 0.444·W` line reads like a five-way duplication in a
grep. It is not. Outside the engine there are exactly **two executable
copies** — `air-mixing.html:549` and `psychrometric-chart.html:675`, both
the inverted mixing form above. The rest are **prose**: `<code>` blocks in
`coil-sizing.html:189` and `:308`, `air-mixing.html:213-214`, and the
methodology note at `psychrometric-chart.html:476` / `:480`. Those pages
teach the formula and then call the shared engine; the restatement is the
content. Leave them.

Same call on the affinity-law cube: `affinity-laws.html:296-298`
computes `r`, `r²` and `r³` inline, and the pump-control widget
recomputes the **cube alone** twice — `(r * r * r * 100).toFixed(0)` at
`education/pump-control.html:784` and `Math.round(r * r * r * 100)` at
`:915`. `education/vfds.html:308-313` is a **static markup table** of the
same numbers — teaching, not a third implementation.

#### Category (c): forms that differ on purpose

Two of the mixing sites cannot simply adopt the exact form:

- `economizer-ratio.html:493` **solves** `% OA` from the linear dry-bulb
  relation `(MA − RA) ÷ (OA − RA)`, then rebuilds the mixed state at
  `:535-537` with the matching linear blend so the reported MA dry-bulb
  equals the setpoint the user asked for. Swap in the enthalpy inversion
  and the tool's own headline stops closing on its own answer. A shared
  helper has to offer the inverse, not just the forward direction.
- `coil-freeze-risk.html:451-458` blends in integer tenths and rounds once
  with ties away from zero, under a comment saying so — the metric
  worked-example rounding policy (the displayed result must be the
  arithmetic of the *displayed* operands). That constraint is real and
  belongs in the helper's contract, not in a per-page reimplementation.

#### Constants of the same class that disagree

- **Fan heat.** `html/scripts/ddcw-fcu-unit.js:95` uses `FAN_HEAT = 0.6`
  °F; the air-handlers lesson widget uses `FAN_HEAT = 1` at
  `html/education/air-handlers.html:664` (with the lesson prose and
  `simulators/ddc-workbench-fcu.html:940` both teaching the concept). Two
  surfaces modelling the same draw-through pickup, 40 % apart. Neither is
  wrong in isolation; nothing ties them.
  **Sub-call RULED 2026-08-12 (owner, the clear-the-decks decision
  batch): keep both values, cross-comment them — and the field reason
  is his:** not only are the fans different (low-static in-space FCU vs
  an AHU working real duct static), the AHU is more likely to sit in a
  hot mechanical room, or worse, on a roof, so its air picks up more
  than the fan's own heat. Both declaration sites now carry the
  cross-reference and the do-not-standardise instruction; this
  sub-call is CLOSED while the entry's engine-standardisation body
  stays open and scheduled separately.
- **Freeze thresholds** are close but independent: `FREEZE_AT = 38`
  (`air-handlers.html:665`), the freezestat default `value="38"`
  (`coil-freeze-risk.html:119`, with `sp = us ? 38 : 3.3` at `:478`), and
  the workbench's `COIL_FLOOR = 34` / `DAT_LOW_TRIP = 42`
  (`ddcw-fcu-unit.js:96`, `:112-113`). Different jobs, so not a defect —
  recorded so the next reader does not re-derive that.

#### The rest of the sweep

- **Round-duct area.** `ductArea(diaIn)` already exists at
  `html/scripts/duct-engine.js:83` and is advertised in the engine header
  (`:23`) — and `html/tools/airflow.html:323` and
  `html/tools/duct-traverse.html:345` each reimplement it inline, with a
  **byte-identical trailing comment** (`// (dia/12)/2 squared × π, in ft²`),
  the clearest copy-paste in the sweep. The rectangular twin
  `(w / 12) * (h / 12)` is duplicated the same way (`airflow.html:330`,
  `duct-traverse.html:352`) — but note the asymmetry: `duct-engine.js`
  has **no** rectangular-area function, and its header API list
  (`:17-31`) confirms it. Adopting the round one is a `<script src>`;
  the rect one needs a new export plus a header update. Neither tool
  loads `duct-engine.js` today; `duct-sizer.html` is its only consumer.
  Both pages are IIFE-wrapped, so the engine's top-level `DUCT_*` consts
  will not collide — the cost is +6.4 KB on two pages.
- **The mixing INVERSE is already copy-pasted inside one file.**
  `(MA − RA) ÷ (OA − RA)` is written twice in `economizer-ratio.html` —
  `:328` (dry-bulb tab) and `:493` (enthalpy tab) — with the displayed
  formula string duplicated at `:365` / `:512` and near-identical
  three-branch feasibility blocks at `:372-377` / `:519-527`. This is
  the cheapest evidence for the claim in category (c) below that the
  helper family has to offer the inverse: the inverse is already a
  maintenance burden, and it has not even left the file yet.
- **Mass flow from airflow.** `mDot = cfm * 60 / v` appears at
  `psychro-engine.js:206` and `:244`, and again inline at
  `html/tools/coil-sizing.html:501` — on a page that already loads the
  engine.
- **`cp` inside the engine itself.** `0.240 + 0.444 * inlet.W` is written
  three times in `psychro-engine.js` (`:208`, `:215`, `:245`), and the
  enthalpy relation once forward (`:87`) and twice inverted (`:156`,
  `:249`). Contained, but it is the same defect one level down.
- **`clamp(x, lo, hi)`** — **#65's revisit trigger has fired, three
  callers over.** That entry deferred the fix in 2026-05-22 explicitly
  "until a third caller appears". `grep -rnE '(const|let|function)\s+clamp\b' html/`
  now returns **seven** definitions — six byte-identical, plus a seventh
  that differs only in parameter names:

  | site | form |
  |---|---|
  | `html/scripts/fbe-engine.js:54` | `const clamp = (x, lo, hi) => …` |
  | `html/scripts/fbe-editor.js:602` | `function clamp(x, lo, hi) { … }` |
  | `html/scripts/hydronic-engine.js:81` | `const clamp = (x, lo, hi) => …` |
  | `html/scripts/refrigerant-loop-engine.js:125` | `const clamp = (x, lo, hi) => …` |
  | `html/simulators/hydronic-loop-builder.html:507` | `const clamp = (x, lo, hi) => …` |
  | `html/simulators/controller-wiring.html:1117` | `function clamp(x, lo, hi) { … }` |
  | `html/index.html:693` | `const clamp = (x, a, b) => …` (params renamed) |

  The count matters twice: it is the evidence that #65's trigger fired,
  and an extraction scoped to the four sites an earlier pass listed
  would leave three behind. **#65's own text has drifted** too — it
  cites `html/tools/function-block-editor.html:897`, but the page moved
  to `html/simulators/` and its IIFE was extracted to
  `html/scripts/fbe-editor.js`. Fold #65 into this entry rather than
  fixing it separately.
- **`F2C` / `C2F`** — `units.js:47-48` (closure-private),
  `thermistor-data.js:72`, `thermistor-calculator.html:373-374`, and a
  snapped variant using `/ 1.8` instead of `* 5 / 9` at
  `coil-freeze-risk.html:377`. The duplication has a cause worth naming:
  `window.Units` deliberately exposes only *display-boundary* converters
  (`Units.toCanonical.temp` is `isUS() ? x : C2F(x)` — state-dependent),
  so a page needing an unconditional F→C has nothing to call.
- **`q = 500 · GPM · ΔT`** — `hydronic-engine.js:89` (`K_BTU = 500`, its
  comment already pointing at waterside-load) and
  `waterside-load.html:184` (`const K = us ? 500 : 4.187`). Two
  implementations of one constant, no shared consumer.
- **`q = 1.08 · CFM · ΔT`** — `airside-load.html:310` holds it in a
  `{ us, metric }` table; `equipment-airflow.html:501-502`, `:510`, `:531`
  inline the literal.
- **`V = 4005 · √VP`** — `airflow.html:334` and `duct-traverse.html:364` /
  `:392`, each with its own copy of the constant.
- **`tidy` / `snap`.** `const tidy = (n, dp) => parseFloat(n.toFixed(dp)).toString();`
  is **byte-identical in 14 tool pages** (affinity-laws, airflow,
  airside-load, coil-freeze-risk, duct-sizer, duct-traverse,
  electrical-quick-calc, equipment-airflow, minimum-outdoor-air,
  transformer-sizing, valve-authority, valve-cv, voltage-drop,
  waterside-load), and `const snap = (n, dp) => parseFloat(tidy(n, dp));`
  byte-identical in three of them (coil-freeze-risk, duct-sizer,
  minimum-outdoor-air). Formatting, not physics — but it is the same
  shape as #152's `rewriteInput`, which reached eight copies before
  extraction.

#### What is already right — the models the fix should copy

- **Refrigerant P-T.** `tools/refrigerant-pt.html:319-326` loads
  `refrigerant-data.js` + `refrigerant-loop-engine.js` and calls
  `RefrigLoop.satTempAtP` / `pressAtSatTemp`, with a comment stating
  "one interpolation source shared". The simulator uses the same engine.
  This is the target shape.
- **ASHRAE 62.1 ventilation.** One implementation in
  `tools/minimum-outdoor-air.html`; `education/air-balancing.html:158`,
  `:372` and `education/dedicated-outdoor-air.html:162` link to it
  instead of restating the math.
- **The economizers lesson** computes enthalpy from the shared
  primitives (`education/economizers.html:447`, `:470-481`) rather than
  inlining them — proof the engine reaches education pages fine.
- **`thermistor-calculator.html:379`** carries an explicit "kept in step
  with thermistor-data.js's `roundR`" comment. A hand-maintained mirror
  is worse than a call, but a *labelled* mirror is far better than a
  silent one, and the label is what makes it findable.

#### Why this is not a one-afternoon extraction

1. `ui.js`'s header says outright that "anything that does real
   computation" does not live there, and `psychro-engine.js`'s header
   splits flat ASHRAE primitives from the namespaced `Psychro.*`
   combinators on a stated rationale. A mixing helper, a `ductArea`
   re-use and a `clamp`/`tidy` utility land in three different homes; one
   of them (a `html/scripts/util.js`) does not exist yet and #65 already
   named it as a candidate.
2. The forward form alone does not serve economizer-ratio (it needs the
   inverse) or coil-freeze-risk (it needs displayed-operand arithmetic).
3. Any page adopting an engine gains a `<script src>` and the engine
   gains consumers — so the change is a `package.json.version` bump for
   cache-busting, and a broad one.
4. Several pages carry a `typeof` engine-load guard already
   (codebase-issues #139 idiom — `if (typeof Psychro === 'undefined')` at
   `coil-sizing.html:442`); new consumers need the same.

#### Recommended action (for the lane that picks this up)

Sequence by blast radius, smallest first. This is one entry covering
four independently-shippable workstreams, so it is a checklist rather
than a paragraph — the free wins can land and be marked without falsely
closing the mixing hold:

- [ ] **Free wins, no numbers move:** `ductArea` in airflow +
  duct-traverse (load `duct-engine.js`), `mDot` in coil-sizing, the
  three internal `cp` repeats in `psychro-engine.js`. The rect-area twin
  rides along but is NOT free — `duct-engine.js` has no rectangular
  function yet.
- [ ] **Then the utility layer:** `clamp` (all seven sites) + `tidy` +
  `snap` + an unconditional `F2C`/`C2F` into a new
  `html/scripts/util.js` (or onto `Units` for the temperature pair),
  **closing #65**.
- [ ] **Then the real one:** a `Psychro.mixStreams(states, weights, opts)`
  helper — exact form, explicit `basis: 'mass' | 'volumetric'` (define
  what volumetric MEANS before pinning any number against it), plus the
  inverse economizer-ratio needs — with the four call sites migrated and
  a vm spec in `tests/psychro-engine.spec.js` pinning that all four agree
  to the displayed precision.
- [ ] **Decide the "% OA" basis question.** A copy fix on three pages
  regardless of whether the helper lands, and the larger of the two
  divergences.
- [ ] **Owner call, separately:** whether `FAN_HEAT` should agree across
  the FCU unit module and the air-handlers lesson widget, or whether the
  lesson's round `1 °F` is a teaching choice worth keeping.

A cross-page agreement spec is the natural gate for the mixing work, but
write it in the direction the tools actually run: `economizer-ratio.html`
has **no `% OA` input** on either tab — both take a mixed-air *setpoint*
(`er-db-ma`, `er-h-ma`) and *output* the percentage, and when the mix is
in range `ratio = pct/100` exactly, so its MA dry-bulb readout is the
user's own setpoint echoed back. Type OA/RA + an MA setpoint into
economizer-ratio, read `#er-h-pct`, then type the same OA/RA + that
percentage into air-mixing's fraction tab and assert air-mixing's MA
dry-bulb equals the setpoint. That fails today by 0.1 °F, for the right
reason.

**Priority:** MEDIUM. Nothing here is user-visibly wrong today — the two
mixing forms differ by about a tenth of a degree, and the "% OA" basis
gap is a documentation defect before it is a math one. It rises the
moment the AHU workbench round lands, because an AHU has a mixing box:
that page will need mixing math, and it should call a helper rather than
become the fifth implementation.

**Not this arc** (owner, 2026-07-27). Recorded here so the AHU brief can
cite it.


### 229. `#fcu-ovr-state` is a live region rewritten on every 10 Hz host tick *(noticed 2026-07-27; the AHU's twin shipped guarded 2026-07-30 — **RESOLVED 2026-08-09 · PR #493**, COV announcer per the owner-decision note; closing record at the end)*

Same defect as prose-audit item 18, on a different element, found while
fixing #227(a) and deliberately not bundled into it — a distinct element
with a distinct trigger.

`html/simulators/ddc-workbench-fcu.html:880` carries `role="status"
aria-live="polite"`, and `fcuRenderUnit` rewrites its `textContent` every
tick. Measured with a `MutationObserver` over 2 s windows:

```
override OFF (arrival):  {"n":0}
override ON:             {"n":20}
```

The zero is not a reprieve. With the override off the write is `''` onto
an already-empty node, which produces no mutation records; with it ON the
line interpolates the live, drifting zone temperature — *"Program reads
75.7 °F — zone is actually 75.5 °F."* — so it genuinely announces ten
times a second, on a string that changes almost every time. The
`setVerdict` signature-guard idiom from #227(a) fixes it in about three
lines, but note the signature here MUST include the unit suffix (unlike
the verdict's, whose strings carry no numbers), or a metric toggle would
leave a stale °F line on screen.

It sits inside `#tab-unit` as well, so it has #227(a)'s hidden-pane
problem too — benignly, since the only control that changes it is in the
same pane, which is why the mirror is not obviously warranted here.

Logging it matters more after #227(a) than before: the page now carries
one signature-guarded live region and its unguarded twin sixty lines
away, which invites a reader to copy the idiom without the measurement.

Checked and fine: `#ddcw-fbe-status` (`:1027`) is inside `#tab-wiresheet`
and written only on run / pause / reset — no spam, and its pane is up
whenever it can change.

> **AHU half, 2026-07-30 (AHU page lane).** `#ahu-ovr-state` shipped with the
> identical defect and was caught in review before the page merged: measured 30
> identical rewrites over 3 s with an override held, 0 with none. It now carries
> the same signature guard `setVerdict` uses. Note the warning above about the
> unit suffix is satisfied there **by construction rather than by care** — the
> string interpolates `dispTempNum(...)` + `tSuffix()`, so guarding on the whole
> composed string means a units toggle changes the signature and repaints.
> `tests/ddc-workbench-ahu-page.spec.js` pins zero rewrites while held.
> **The FCU element is still unguarded**; the fix there is the same three lines.

> **RE-MEASURED 2026-08-03 (the pre-Phase-8 lanes), and "the same three
> lines" is NOT ENOUGH on the FCU.** The FCU element still takes an
> unconditional `textContent` write every tick
> (`html/scripts/ddcw-fcu-unit.js:948-956`) — measured on both `main`
> and the lane branch at **50 mutations per 5 s** while forcing, i.e.
> unchanged and confirmed pre-existing. Reproduced independently for this
> entry at `main` @ `6fe27ec` (`MutationObserver`, override held, 5 s
> window): **50 mutations carrying 4 DISTINCT strings** — the two halves
> of the defect in one number, ten writes a second of which roughly one a
> second is a genuinely new sentence. What the re-measurement adds is
> the reason a plain change-guard leaves work to do here and did not on
> the AHU:
>
> - **The AHU's guarded string is effectively static while an override
>   is held.** `setOvrState` (`ddcw-ahu-unit.js:1218-1222`) is fed a line
>   built from `plant.override[id].value` (`:1590`) — the number the
>   operator TYPED. It does not move, so the signature holds and the
>   region genuinely goes quiet.
> - **The FCU's string interpolates MOVING truth.** Its line reads
>   *"Program reads &lt;sensed&gt; … zone is actually &lt;zoneN&gt;"*, and
>   `zoneN` is the live integrated zone temperature, so the rendered
>   string changes roughly **once a second** at one decimal. A change
>   guard therefore cuts 10 Hz to ~1 Hz — better, but a screen reader
>   re-announcing a whole sentence every second while the reader is
>   trying to study the drift is still the defect.
>
> **~~Fix shape, updated: change-guard PLUS a settle debounce~~ —
> SUPERSEDED 2026-08-08, owner decision in the note below.** The
> diagnosis in this note stands; only the mechanism it prescribes was
> overturned. The superseded prescription, kept for the record: hold the
> announcement until the value has been stable for a beat (the rail's
> `railHint` already owns a timer idiom worth copying,
> `ddcw-ahu-unit.js:1954-1970`), so the region announces the *situation*
> rather than narrating the interpolation. Note the AHU is not exempt
> from the debounce question in principle — it is exempt in practice
> only because its operand is static, which is a property of the CURRENT
> string and not a guarantee. A future AHU line that interpolates truth
> needs the same treatment, and the unit-suffix caveat above still
> applies to both.

> **OWNER DECISION 2026-08-08, reconfirmed 2026-08-09 — COV-style
> reporting with an increment, NOT the guard-plus-settle debounce the
> note above prescribes.** Announce when the drift has moved more than
> an increment **since the last announcement** — BACnet's own
> `COV_Increment` rule, applied to the page whose subject it is
> (`education/bacnet-basics.html:180` renders a `COV_Increment` of 0.5
> on an AI; `education/bacnet-vs-modbus.html:127` calls the effect
> "quiet-until-something-happens"). Three reasons the debounce lost:
>
> - **No silence risk.** A settle debounce waits for the operand to
>   stop moving. This operand never stops while a force is held, so a
>   settle window can expire forever and announce nothing. The note
>   above says as much about the AHU's exemption — *"a property of the
>   CURRENT string and not a guarantee"* — and the same doubt applies
>   to any wall-clock window.
> - **Speed-invariance, stated precisely: announcements per EXCURSION
>   is the invariant, not announcements per second.** The sim clock
>   runs 1–60× and defaults to 20× (`ddcw-fcu-unit.js:166`; note
>   `MAX_DT_SIM` at `:169` clamps the slider's 60× to ~50× effective).
>   A wall-clock window announces a different *fraction* of a drift
>   excursion at each speed; COV announces once per increment of real
>   movement at every speed. Corollary: the increment must be sized to
>   the measured worst-case drift RATE, or fast drives storm — size it
>   from measurement, not from the taught 0.5.
> - **It removes a CI flake source.** A debounce can only be pinned by
>   a wall-clock mutation count, which depends on machine speed, on
>   `simSpeed`, and on where in the excursion the window falls. COV is
>   pinned by a property of the *values*: consecutive announcements
>   differ by at least the increment. No clock in the assertion.
>
> **Prerequisite, also decided: split the node first.** `#fcu-ovr-state`
> is one element doing two jobs — the visible amber drift line and the
> live region. The visible `<p>` keeps repainting every tick and loses
> **both** `aria-live` *and* `role="status"` (the role implies the
> former); a new `.sr-only` `#fcu-ovr-state-sr` carries the
> announcements, placed **outside both tab panes** beside
> `#fcu-verdict-sr`. Pacing the shared node would freeze the visible
> drift readout, which is the hazard the line exists to surface. The
> outside-the-panes placement retires this entry's own "the mirror is
> not obviously warranted here": that held while only same-pane
> controls moved the string, and COV makes the drift half
> non-operator-driven — inside `#tab-unit` the region would re-enter
> the accessibility tree already populated on a tab return and announce
> nothing (the `.ddcw-offprog` empty-collapse contract,
> `html/styles.css:4814-4831`, and #227a).
>
> **Comparison is on the canonical °F value, pre-display-rounding**,
> never on the rendered string — that is what makes the region immune
> to rounding chatter at a display boundary (a swing smaller than the
> increment cannot clear the hysteresis band), and it is what
> `tests/ddcw-display-units.spec.js` requires anyway (a drift built
> from display locals would join that guard's fixpoint). The unit
> suffix still rides in the *event* signature so a metric toggle
> re-announces rather than leaving a stale-°F sentence in the tree.
>
> Line refs in this entry predate Phase 8: the element now sits at
> `ddc-workbench-fcu.html:1292`, not `:880`.
>
> Prior art, unpushed and **not to be deleted until the COV work
> lands**: local branch `issue-229/fcu-override-live-region`
> (`a13be01`) carries a spec written ahead of its fix, and `stash@{0}`
> rides it with the guard-plus-settle implementation. The EVENT/DRIFT
> split in the stash survives into the COV design; its `OVR_SETTLE_MS`
> machinery does not. (The commit also carries a throwaway
> `playwright.lane3.config.js` whose own header says "Not committed" —
> it must not ride forward.)

> **CLOSED 2026-08-09 — PR #493 merged (v3.81.1), and the measurement
> answered this entry's open question.** Engine-direct, five arms ×
> three speeds, 60 s windows: the rendered sequence is **monotone in
> all fifteen runs, chatter amplitude 0.00 °F** — the ~4 distinct
> strings per 5 s were pure drift, so the COV increment does rate work
> only. `OVR_COV_INCREMENT = 2` (owner instinct, confirmed against the
> measured rates; minimum announcement gap 9.1 s at 20×, 3.8 s at 60×
> on shipped knobs; one disclosed corner — both knobs at extremes at
> 60× — gaps to 1.6 s for ~20 s, accepted by the owner as a bounded
> storm in a deliberately runaway state, against ~600 announcements
> pre-fix). The split shipped as prescribed; the spec was verified to
> discriminate (three rows red against a de-dup-only announcer), and
> the one row that survives a zeroed increment is deliberately the one
> that does not read the constant. **The stranded prior art is
> retired**: branch `issue-229/fcu-override-live-region` (`a13be01`)
> deleted and `stash@{0}` dropped in one deliberate step after the
> merge, per the triage in the note above (the EVENT/DRIFT split
> survived into the shipped design; the settle machinery did not).

### 230. Light theme darkens `--amber` and `--heat` out of the register component identity depends on *(noticed 2026-07-28, AHU round-2 depiction review — **RESOLVED 2026-07-28**, owner ruled for separate fill tokens)*

> **RESOLUTION (2026-07-28).** Owner ruled for the candidate fix below:
> **separate fill tokens**, on the reasoning that *a damper blade is not
> text* — WCAG **1.4.11** asks 3:1 for non-text contrast, not the 4.5:1
> small-text floor the `-ink` family is tuned to, so a component-identity
> FILL may run brighter in light theme than the text token, provided it is
> never used for type. Shipped as `--amber-fill` / `--heat-fill` in all
> three token blocks of `html/styles.css` (`:root`, the light block, **and
> `@media print`**), with the seven consumers in
> `html/simulators/ddc-workbench-ahu-mockup.html` migrated. Scope is **two
> tokens, not four**: yellow and orange are the only hues whose common name
> is lightness/chroma-bound (dark yellow is olive, dark desaturated orange
> is brown), while `--accent` (−20.5 L\*) and `--blue` (−22.4 L\*) are
> darkened just as hard in light and stay themselves. No symmetry tokens —
> the `-ink` family is already asymmetric and an alias token is a drift
> generator.
>
> | token | dark | light | light contrast: `--surface` / `--bg` / `#e8ece4` |
> |---|---|---|---|
> | `--amber-fill` | `#e0a94a` (= `--amber`, rides) | `#af7b00` | 3.71 / 3.26 / **3.10** |
> | `--heat-fill` | `#e8884a` (= `--heat`, rides) | `#b85400` | 4.88 / 4.28 / **4.08** |
>
> Dark rides its base deliberately (8.58:1 / 6.95:1 on `--bg`, 2–2.9× the
> non-text floor) — the same one-theme-moves shape `--amber-ink` and
> `--blue-ink` already have. Light lifts amber's **lightness** (olive→yellow,
> L\* 44.3 → 55.4) and heat's **chroma** (brown→orange, C\* 52.7 → 68.0);
> opposite corrections, which is why the lightness gap opens for free. Both
> fills hold their **dark-theme hue angle** (79° / 57°) where the base tokens
> drift to 83° / 65°. Tuned against `#e8ece4` (`--bg-2`/`--surface-3`/`--well`
> — the strictest light surface) and not merely against the white the graphic
> mostly sits on, so neither token ships an "only safe on white" caveat. That
> tuning target is load-bearing rather than conservative: the relief damper
> sits bodily inside a duct riser painted `--well`, and measured on the
> rendered graphic ~90 % of the amber pixels land on white but ~8 % land on
> `#e8ece4`, so `--amber-fill`'s 3.10:1 is a ratio the drawing actually uses.
>
> **Measured before → after (light pair):**
>
> | metric | before | after | dark, for scale |
> |---|---|---|---|
> | ΔE76 amber↔heat | 18.0 | **26.6** | 23.1 |
> | ΔL\* amber↔heat | **0.6** | **7.7** | 6.8 |
> | ΔL\* damper↔fixed louver (`--text-dim`) | **0.0** | **11.0** | 8.8 |
>
> ΔE now exceeds dark theme's own 23.1, and **the lightness gap was opened** —
> which is the one part of this entry's original claim that survived scrutiny.
> It fixes greyscale and print outright, and **protanopia**; it does *not* fix
> red-green deficiency in general (see the CVD paragraph below — deuteranopia
> is a wash). It also fixes the drawing's weakest shape distinction: a grey
> fixed louver beside a modulating damper was ΔL\* **0.0** against
> `--text-dim` in light and is now 11.0.
>
> ⚠️ Do **not** read ΔL\* of the source colours as "the CVD budget" — an
> earlier draft of this entry did, on the reasoning that a dichromat has only
> the lightness channel left. That is wrong as stated: every published
> dichromat transform *rebuilds* the R and G channels, and green alone carries
> ~71.5 % of luminance, so simulated lightness does not track the source
> ΔL\*. Measured here, the source pair goes ΔL\* 0.6 → 7.7 while the same pair
> simulated as deuteranopic goes 2.2 → 5.4 (Viénot-Brettel-Mollon) or
> 1.6 → 6.2 (Machado). Simulate, then measure; do not extrapolate.
>
> **The untested CVD question above is now settled — and the retracted claim
> turns out to be true for protanopes, and only for them.** Simulating the
> dichromat transform on the light pair puts protan ΔE at roughly **3–4**,
> i.e. genuinely one colour for a protanope, in light theme only. The fill
> tokens take it back to dark theme's own protan level (mid-teens).
>
> **Deuteranopia is a wash, and deuteranopia is the more common deficiency.**
> Every model run puts the deutan pair near **ΔE 7 both before and after**
> the change — Viénot-Brettel-Mollon 6.8 → 7.1, Machado 2009 (severity 1.0)
> 7.1 → 7.1 — against a dark-theme deutan figure of ~7.6. So deutan
> separation was never carried by this colour pair *in any theme*; it is
> carried by shape and adjacency (a serpentine tube versus a framed damper
> with blades), which the drawing does provide. This change neither helps nor
> harms it. Claiming the split "fixes red-green deficiency" overstates it —
> say *protanopia*.
>
> ⚠️ **Do not quote CVD figures to two significant digits.** Three
> independent implementations of the *same* published VBM matrices produced
> three different "after" values for the protan pair — 12.2, 22.2 and 16.2 —
> and the gamma convention (sRGB piecewise vs pure 2.2) accounts for less
> than 1 ΔE of that spread, so the divergence is in the pipelines, not in the
> colour science. What reproduces across all of them is the *direction* and
> the *band*: protan before ≈ 3–4, protan after ≈ dark's own level, deutan
> ≈ 7 throughout. Quote the band, never a digit pair.
>
> **Tritan numbers from the daltonize matrix are unusable** — its tritan
> branch renders blue *unchanged* and red as *yellow*, which is the protan
> failure mode, not tritanopia (VBM 1999 defines no tritan transform; that
> branch is a later bolt-on). Tritanopia is ~1 in 10,000 and the pair is
> lightness-separated either way, so nothing here turns on it.
>
> **Guarded by `tests/fill-token-misuse.spec.js`** (new): a source scan that
> fails on any `-fill` token reaching a non-paint property, a census asserting
> every `var(--…-fill)` reference lands in a classified sink (so a fifth sink
> idiom fails rather than passes), a rendered arm for `fill:` on SVG `<text>`,
> and a third test pinning the `@media print` duplicate against the light
> block — a `-fill` token missing from print resolves to the **dark** value on
> paper (`#e0a94a` on white is **2.11:1**, under the non-text floor). The
> rendered arm exists because contrast-sweep provably cannot cover this: the
> consumer page has no `canonical`, so it is absent from `tests/pages.js`, and
> SVG text is out of that walker's scope. Also new:
> `tests/ddc-workbench-ahu-mockup.spec.js`, since no spec rendered that page
> at all.
>
> **Not migrated, deliberately:** the round-1 variants (`.ahu-coil-hw`) keep
> the base tokens — they are the before-half of the comparison the page
> exists to show. `--heat`'s other consumers (the psychrometric chart's
> heating process line, `education/psychrometrics-basics.html`) are
> *process/state* semantics rather than component identity, and one is a
> `color:` declaration; migrating the chart is a plausible follow-on needing
> its own backdrop measurement. **Blast radius on existing pages: zero** —
> every other page renders byte-identically.
>
> Version bumped `3.74.6` → `3.75.0`: the `?v=` cache-bust is load-bearing
> here, because without it a returning visitor resolves `var(--amber-fill)`
> against the old stylesheet, gets nothing (house no-fallback rule), and sees
> **unpainted damper strokes**.
>
> One finding from the depiction review is spun out rather than fixed here —
> see **#231** (the two coil serpentines are separated by hue alone).

**This entry supersedes its own first draft, and the correction is the
useful half.** That draft was titled "`--amber` and `--heat` are one colour
in light theme" and it was measurably wrong. It reasoned from the WCAG
**contrast ratio** between the two tokens — 1.02:1 light, 1.23:1 dark — but
contrast ratio is a ratio of *relative luminance* and nothing else. Two
colours of equal luminance and different hue return 1.0:1 and are still
plainly different colours; the metric answers "can I read text of one on the
other," which is not the question a colour-coded damper asks. The question
needs a perceptual distance. Measured in CIE Lab (sRGB, D65) straight from
the two `:root` blocks in `styles.css`:

| theme | `--amber` | `--heat` | ΔE76 | ΔL\* | hue angle | vs `--accent` |
|---|---|---|---|---|---|---|
| dark  | `#e0a94a` | `#e8884a` | 23.1 | 6.8 | 79° vs 57° | ΔE 53.7 |
| light | `#83641f` | `#9c5a14` | **18.0** | **0.6** | 83° vs 65° | ΔE 43.8 |

ΔE76 in the teens is comfortably inside "clearly different colours" (the
rule of thumb is ~2 at a glance, ~10 unmistakable), and the `--accent`
column is there for scale — the amber/heat gap is roughly 40 % of the gap to
the green nobody would call ambiguous. **Both tokens stay distinguishable in
both themes. Nothing here is a WCAG failure and no anchor is broken.**

**The real finding is weaker and still worth a ruling: light theme moves
both tokens out of the register the identity convention is written in.**
The cause is that `--amber` and `--heat` are also **text** colours:
`color: var(--amber)` at `styles.css:2186`, `:2554`, `:2869`, `:3179` and in
`simulators/vfd-mock.html:146`; `color: var(--heat)` in
`education/psychrometrics-basics.html:56` and
`tools/psychrometric-chart.html:422` — so on a white surface they have to
clear the 4.5:1 small-text floor, and they only just do:

| theme | `--amber` on `--bg` | `--heat` on `--bg` |
|---|---|---|
| dark  | 8.58:1 | 6.95:1 |
| light | **4.84:1** | **4.74:1** |

Dark carries 1.5–1.9× of headroom over the floor and can afford to be
bright. Light has about a third of a point and cannot, so `--amber` lands at
a dark olive and `--heat` at a dark orange-brown. Neither reads as the
bright yellow / orange the component-identity convention leans on, and their
separation drops from ΔE 23.1 to 18.0 at the same time. The property the
AHU round-2 graphic (`html/simulators/ddc-workbench-ahu-mockup.html`) is
built on — find every damper in about a second, before reading a word — is
**degraded in light theme, not destroyed**: three amber dampers, a `--heat`
serpentine and a `--heat` valve read as one warm family at a glance and want
a beat longer to separate. Shape and the colour key's swatch order (blue
parked between the two) both still work.

One narrower piece of the original claim does survive, scoped honestly: at
ΔL\* 0.6 the light pair really is near-identical in **lightness**, so a
greyscale print or a luminance-only rendering loses the cue and leaves hue
carrying it alone. Whether that also collapses for a red-green-deficient
reader is *plausible but untested here* — 18° of hue separation in the
yellow-orange band is where deuteranopia is weakest — and it should be
simulated rather than asserted before anyone spends a token on it.

**Candidate fix, not implemented — it needs the ruling.** The 4.5:1 floor is
what forced the darkening, and it applies to **text**. A damper body or a
coil serpentine is a **graphic object**: WCAG 1.4.11 non-text contrast asks
3:1 against adjacent colours, not 4.5:1. So a light-theme component *fill*
could legitimately run brighter than the text token does, restoring the
yellow-for-damper reading without violating anything — **provided it is
never used for text.** That is the whole risk in the idea, and it is the
same trap the `-ink` family exists to keep straight. Per the standing rule
(*name the ink token, don't fudge the colour*) this wants a real token —
`--amber-fill` / `--heat-fill`, defined in both `:root` blocks with a
comment pinning the never-for-text constraint — and not a page-local hex in
the AHU graphic. Retuning `--heat` itself is the alternative and has a
genuinely wide blast radius: it also carries the psychrometric chart's
heating process lines and the education air diagrams. `--red` is not the
escape hatch; it means alarm site-wide.

### 231. The AHU heating and cooling serpentines are the same drawing, separated by hue alone *(noticed 2026-07-28, spun out of #230's "colour is never the only channel" check — **RESOLVED 2026-07-28**, owner ruled for the real hardware difference)*

> **RESOLUTION (2026-07-28).** Owner's ruling, verbatim: *"draw real hardware
> difference, but keep it simple, no need for complexity, especially with
> color being different."* So none of the three options listed below shipped
> as written — the ruling rejects the whole class they belong to. A different
> pass count (option 1) or hatched bends (option 3) are **decorations chosen
> to be different**; a caption (option 2) is a text channel bolted onto a
> glyph that should say what it is by being drawn as what it is. What shipped
> is the thing the machine actually has and the hydronic coil actually does
> not: a **refrigerant distributor** on the DX coil.
>
> A DX evaporator is fed through a distributor — a small solid body, narrow
> at the liquid connection and widening to an outlet face, with fine
> equal-length feeder tubes fanning out to the coil's circuits — and leaves
> through a suction connection. Nothing else on an air handler looks like it,
> and no hydronic coil has one, so the cue is a *fact about the equipment*
> rather than a mark applied to tell two pictures apart. It is also the
> **minimum**: colour still carries most of the load, per the ruling, and the
> shape is the supplement that survives when colour does not.
>
> **What shipped** (`html/simulators/ddc-workbench-ahu-mockup.html`, round-2
> graphic only — the round-1 reference drawings are untouched, as always):
> a wedge distributor body, three feeder tubes landing on the serpentine's
> nodes one coil pitch apart, and a short suction stub with a header bar off
> the serpentine's top end. Fed low, suction high — the arrangement that
> returns oil, and the one the serpentine's two free ends already implied.
> Two page-local classes, `.ahu-dist-body` (`fill: var(--surface)` with a
> `var(--blue)` outline, the same form as `.ahu-valve-body`) and
> `.ahu-dist-feeder` (`var(--blue)` at stroke-width 1, one step under the
> serpentine's 1.5, which is the drawn difference between a capillary and a
> coil tube). **No `html/styles.css` change was needed**, so #230's
> `3.74.6` → `3.75.0` bump still covers the arc — no second bump owed.
>
> ⚠ **The body was drawn SOLID first and that was wrong — caught by looking
> at the render, not the markup.** On this drawing a solid fill with
> `stroke: none` is the ARROW idiom (`.ahu-arrow`), and the SVG header rule
> is explicit: *arrowheads mean airflow and nothing else*. A filled wedge at
> this size reads as a small block arrow, and it points **upstream**, which
> is the one thing it must not say. Every component *body* on the drawing is
> surface-filled and outlined — damper frames, louver frame, valve body,
> sensor bodies — so the outline is what puts the distributor in the
> component family instead of the airflow family. The greyscale cue is
> carried by the **silhouette**, which was never the fill's job; the
> capture confirms the outlined form separates the coils with hue removed.
>
> **Geometry, derived rather than eyeballed.** The station's clear corridor
> is x486 (the section divider) to x506 (the serpentine's left face) — 20
> units, spent as 6 clear / 7 cone / 7 feeder run. Measured envelope on the
> rendered page: **x492–506, y265–322**. Clearances: DX leader at x526 and
> its anchor at (526,344); HW valve return stub at x466; DX callout frame
> corner (470,398), 76 below the assembly's lowest ink. A bbox sweep of every
> drawn element in the round-2 SVG against that envelope returns four hits,
> all of them explained: the casing and divider **paths** are multi-segment
> and their bounding boxes over-report (their actual segments are at y250 /
> y355 and x486); the cooling serpentine touches the envelope's right edge at
> x506, which is where the feeders and the suction stub are *supposed* to
> land; and the **invisible mixed-air centerline** ends at (500,302), the
> cone's outlet-face top vertex. That rail is never painted (`stroke-width:
> 0`) and already runs straight through the filter and the heating coil, so
> it is not a new overlap — but the note is in the page, because the reserved
> chevron layer would sample it.
>
> **Guarded** by a new relational assertion in
> `tests/ddc-workbench-ahu-mockup.spec.js`: the DX link group carries
> distributor geometry, the heating coil carries none, both coils stand the
> same height, and the DX group's rendered bbox is **more than 4 units wider**
> than the heating coil's. That last one is the load-bearing arm — it reads
> geometry rather than class names, so deleting the distributor and leaving an
> empty `<g>` behind still fails. The spec's scope note now records why one
> depiction fact is pinned in a file that deliberately pins none: this is a
> WCAG 1.4.1 property, not a drawing preference, and it is asserted
> relationally so a future redraw is free to carry the cue differently.
>
> **Prose trued up in the same diff**, because three places explained the
> colour-coding rule without the qualifier: the SVG header comment (a new
> COLOUR IS A SUPPLEMENT, NEVER THE ONLY CHANNEL block, listing the shape
> signature every other glyph already had), the round-2 thesis paragraph, and
> the reader-facing *Reading this screen* block. The `<desc>` describes the
> new geometry in the drawing's own neutral register.
>
> **Not done, deliberately:** the heating coil is unchanged. Its stubs, ticks
> and vertical bowtie already read, and the brief's own test — add the minimum
> that separates them at a glance, then stop — is satisfied by one coil
> gaining the part it really has.
>
> **FEEDER REFINEMENT (2026-07-28, same PR).** Owner's depiction review of the
> shipped glyph: *"The DX coil distributor looks somewhat janky, I think
> adding a 4th line for vertical symmetry and maybe changing the straight
> lines to curves would do wonders."* So the numbers above describe the first
> cut, not the drawing — **three feeders became four, and the rays became
> curves.** Four is the symmetric count *and* the truthful one: three forces a
> tube on the cone's axis, while four puts two above and two below with
> nothing on it, and real distributors are built in even circuit counts.
> The landings stay serpentine nodes one coil pitch apart — now
> **y296 / 309 / 322 / 335**, so the cone's axis moves to **y315.5** and the
> lowest feeder lands on the serpentine's lower free end, which also stops
> that end dangling. Each feeder is a quadratic whose control point shares its
> landing y, so it leaves the cone on the splay and **arrives horizontal**,
> parallel to the pass it brazes into.
>
> **The corridor budget was rebalanced 6 / 7 / 7 → 4 / 5 / 11**, because 7
> units is 6.5 CSS px at 0.9286 px/unit and no curve reads across it. That is
> measured, not asserted: a quadratic's bow off its own chord is half its
> control point's perpendicular distance from that chord, so on the old 7-unit
> run the outer feeder bows **1.43 units (1.33 px) against a 1-unit stroke** —
> one stroke width, a fattened line rather than a curve. At 11 it bows **2.22
> units (2.06 px)**, better than two stroke widths, and the sweep reads; the
> inner pair sit at 1.14 (1.06 px). That threshold is the reusable finding
> here — on this drawing a curve needs roughly two stroke widths of bow before
> it stops reading as a thick straight line, and the run length is what buys
> it. The cone paid 2 units of length and the clear gap paid 2; the
> cone's face and tip heights are untouched, so only its taper changed. New
> **measured envelope: x490–506, y265–335**, and the bbox sweep returns five
> hits, all explained — the casing and divider paths over-report (real
> segments at y250 / y355 and x486, so the true clearances are 15.1 / 20 / 4);
> the invisible `stroke-width: 0` mixed-air rail, which now crosses the top
> feeder at ~(499,302) instead of ending on the old cone vertex; the DX link
> box, which the feeders cross at x500 by design; and the serpentine itself at
> x506, which is where feeders are supposed to land. The relational guard got
> *stronger* rather than needing an edit — the DX group is now 10 units wider
> than the heating coil's, against the spec's `> 4`.

Found while verifying that the AHU round-2 graphic
(`html/simulators/ddc-workbench-ahu-mockup.html`) does not rely on colour as
its only channel. Every other component glyph clears: the three dampers
differ in frame aspect and blade orientation, the filter has a different
media slope and half the stroke weight, the fan and the valve are unique
shapes, and the relief stream carries a dashed stem so "leaving the
building" reads without colour. **One pair does not.**

`.ahu-tube.is-heat` and `.ahu-tube.is-cool` are byte-identical serpentines
differing only by an x-offset — `M430 270 H470 V283 H430 …` versus
`M506 270 H546 V283 H506 …`. Same 6 passes, same 40-unit width, same 13-unit
pitch, same 1.5 stroke, same 52×82 link-box. **Nothing but `--heat` versus
`--blue` distinguishes a heating coil from a cooling coil.** This is
theme-independent and it is a genuine WCAG 1.4.1 (Use of Colour) concern.

The two mitigations that exist are **station-level, not glyph-level**, and
the difference matters:

- The **HW valve and its pipe stubs** hang below the heating coil. That is
  adjacency — it identifies the *station*, not the coil, and it only works
  for a reader who knows a two-way valve implies hydronic heating.
- The **callout titles** `HEATING COIL` / `COOLING COIL` are reached by
  leader lines from elsewhere on the drawing: a text channel at a distance,
  not on the object. The round-1 variants are actually better here — they
  carry `HW COIL` / `DX COIL` captions *on* the coils, which round 2 dropped
  when the callout titles took over the naming job.

Colour-vision-wise the pair is safe (warm versus blue is a large distance
under every dichromat transform). **The exposure is greyscale and print**,
where lightness is all that survives: ΔL\* is 5.9 in light after #230's
`--heat-fill` landed (up from 3.1), but only **1.9 in dark** — dark is the
worst of the three, though dark never prints, since `@media print` forces
the light token set.

**Not fixed in #230's PR, deliberately** — that was a colour-token change,
and every fix here is a depiction decision that belongs with the owner's
equipment-graphics eye. Cheapest honest options, in order of preference:

1. Give the DX serpentine a different **pass count or pitch**. This is a
   real distinction rather than a decoration — a 4-row and a 6-row coil
   genuinely differ that way, so the drawing would be telling the truth.
2. Restore a short station caption on each coil box (round 1's answer).
3. Hatch one serpentine's return bends.

### 232. `comparators-and-deadband.html` states a metric band delta the displayed operands do not produce *(noticed 2026-07-28, differential-nod review round — addressed 2026-08-08 · PR #482)*

`html/education/comparators-and-deadband.html:419` renders the total band as
`<span data-us="2 °F" data-metric="1.1 °C">`. The metric worked-example
rounding policy (audit-2026-06 #53, CLAUDE.md §*Conventions*) says a stated
delta must be **the arithmetic of the displayed operands**, not of the
unrounded canonical value. Both displayed derivations give **1.2**:

- the two edges the same paragraph run paints — `75 °F → 23.9 °C` (L404) and
  `73 °F → 22.7 °C` (L407) — differ by **1.2**;
- the half-band the preceding sentence paints — `1 °F → 0.6 °C` (L412) —
  doubles to **1.2**.

`1.1` is the round of the canonical 1.111, which is exactly the form the
policy exists to prevent: a metric reader who checks the sheet's own numbers
finds the arithmetic does not close, on the one paragraph whose entire point
is that the constant is *half* the band.

Fix is `data-metric="1.2 °C"`. **Deliberately not taken in the nod PR** — it
sits in the untouched half-band paragraph, a different point from that PR's
diff, and an unexplained `1.1 → 1.2` inside a terminology PR is noise at
review time. Worth a sweep rather than a one-liner: this is the same defect
shape wherever a `data-metric` delta was converted from the IP delta instead
of subtracted from the displayed metric operands, and nothing guards it.

**Addressed 2026-08-08 (PR #482, `e2f0919`), as content-audit #57 — and the
correct resolution is THREE sites across TWO files, not the single span this
entry names.** Taking only the one-liner above would have left the page
self-contradictory, so read this entry as one third of its own fix:

- `html/education/comparators-and-deadband.html:419` — the deadband swing,
  `1.1 °C` → `1.2 °C`. The span this entry names (content-audit #57).
- `html/education/comparators-and-deadband.html:443` — the typical-band
  range, `0.6–1.1 °C` → `0.6–1.2 °C` (content-audit #58). In isolation
  `0.6–1.1` was a defensible canonical conversion — that sentence paints no
  operands — but with the first span fixed the page would have carried two
  different metric values for the same 2 °F quantity, and its own worked
  example would have fallen outside the typical range it recommends.
- `html/_data/quizzes/comparators-and-deadband.js` — the same defect in two
  questions (content-audit #59): `cdb-band-edge-set-point`'s prompt and
  explain (`2 °F (1.1 °C)` → `1.2 °C`), and `cdb-band-too-wide`'s prompt
  (`6 °F (3.3 °C)` → `3.4 °C`, since its explain paints 23.9 and 20.5) and
  its explain's `1–2 °F (0.6–1.1 °C)` → `0.6–1.2 °C`. The `too-wide` one is
  the sharper case: it invokes the displayed-operand rule *by name* and then
  stated a total the rule contradicts.

The alternative repair is refuted in content-audit #57: repainting the
`73 °F` edge as the canonical `22.8 °C` would also close the swing at 1.1,
but the passage builds that edge with an explicit `SUBTRACT` block
(SP − DB, 23.3 − 0.6 = 22.7), so the edge is right and the *swing* is what
had to move.

The sweep this entry asked for shipped on the same PR as two arms:
`tests/metric-spans.spec.js` (blocking, in `npm test`) and
`npm run metric-lint` (report-only). Note the blocking arm **would not have
caught this defect** — `1.1 °C` is a valid delta conversion of `2 °F`, wrong
only against the operands painted two sentences away; that question is the
report-only arm's, and it is advisory. See CLAUDE.md §*Local preview &
tests* for the split.

### 233. AHU plant: MAT and the RAT probe are sampled one Euler step apart *(noticed 2026-07-28, shipped knowingly with the AHU physics half — for the graphic lane — RE-DISPOSITIONED 2026-07-30 — deferred again, with the reason written down)*

**Deferred again at the graphic lane, and this is the argument rather than a
shrug.** The AHU page made the split VISIBLE for the first time: the point mirror
paints MAT and RAT as adjacent cells, so at the shut position a reader really can
see `MAT 77.5` beside `RAT 77.6` and read it as a broken sensor.

Both candidate fixes MOVE the defect rather than removing it. (b) re-solving the
mix post-integration for display makes MAT/RAT agree and stops `DAT − MAT`
closing; (c) publishing the whole air path from the tick-start sample makes both
of those close and splits `d.eatT` from the RAT chip instead — which is the exact
defect the FCU's one-sample rule exists to prevent, and which this file's own
spec row pins. There is no arrangement that makes all three pairs agree with a
one-step integrator.

`DAT − MAT` is the headline of the drawing and the number the page teaches people
to read, so it is the pair that must close. The MAT/RAT split is one displayed
digit, only at the shut position, and only while the zone is moving. A real fix
is a smaller `dtSim` or a second-order integrator; neither was this lane's call.
The comment in `ddcw-ahu-unit.js` now carries this reasoning at the point of
publication.


`html/scripts/ddcw-ahu-unit.js` computes the mixed-air state from the
**tick-START** `plant.zoneT` — that is the Euler evaluation point, and the
mixed air is a physics input the coil solution depends on — while
`plant.sensors['rat']` and `derived.eatT` are both published from the
**tick-END** `plant.zoneT`, per the FCU's one-sample rule
(`ddcw-fcu-unit.js:330-339`, the 2026-07-27 review catch).

With the dampers shut, MAT and RAT are the *same air*. Sampled a step apart
they can differ by the amount the zone moved inside that step — measured on
this plant at the default tuning, **~0.02 °F per 5-sim-s step**, and larger
at a bigger `dtSim` or a harder load. At the one-decimal precision every chip
on the site paints, that is enough to split the last digit at a rounding
boundary: the graphic can show `MAT 77.5` beside `RAT 77.6` with the dampers
closed, which reads as a broken sensor.

**What is NOT wrong here.** The FCU's rule is about two surfaces on ONE
measurement (the EAT badge and the RAT chip), which must never disagree. MAT
and RAT are two *different* sensors in two different places, so a sub-tenth
disagreement is not a contradiction — it is the sampling instant. And of the
two candidate MAT values, the tick-start one is the one worth being right:
it is the air the coil actually saw, so it is the number `DAT − MAT`
reconciles against.

**The decision the graphic lane owes**, before it paints both chips:

- (a) **Leave it and say nothing** — the split only appears with the dampers
  fully shut, and minimum outdoor air keeps them off that stop in normal
  operation. Cheapest, and it stays a latent surprise.
- (b) **Re-solve the mix post-integration for DISPLAY only** — one extra
  `solveState` + `mixStreams` per 10 Hz tick, negligible cost. MAT and RAT
  then agree exactly at the shut position, but the painted MAT is no longer
  the value the coil was handed, so `DAT − MAT` stops closing by the same
  ~0.02 °F. Trades a visible split for an invisible one.
- (c) **Publish the whole air path from the tick-start sample**, `eatT`
  included, and drop the one-sample rule on this unit — MAT/RAT agree and
  `DAT − MAT` closes, but then `eatT` and the RAT chip split instead, which
  is exactly the defect the FCU rule exists to prevent.

There is no option that makes all three pairs agree with a one-step
integrator; the call is which pair a reader is most likely to check.
Recommendation is (a) plus a comment, which is what shipped — the residual is
documented at the `d.eatT` assignment.

### 234. `SPEED_MIN` / `SPEED_MAX` are declared in the FCU unit and read nowhere *(noticed 2026-07-28, reading the FCU as the AHU's reference — **RESOLVED 2026-08-12 · PR #550**, by DELETION rather than the entry's recommended middle option; the reasoning against wiring them up is below, and the residual two-source it exposed — sheet vs sheet — is what got the guard)*

`html/scripts/ddcw-fcu-unit.js:163-164` declares

```js
const SPEED_MIN   = 1;    // × — slowest (watch a 5 s ON-delay in real seconds)
const SPEED_MAX   = 60;   // × — fastest (fast-forward a slow recovery)
```

inside the `TUNE BY FEEL` block. Neither is referenced anywhere in the file
or anywhere else in the repo — the live bounds are hard-coded in the page
markup, `html/simulators/ddc-workbench-fcu.html:867`
(`min="1" max="60"`). They agree today by coincidence, not by construction.

At stake: the block's whole premise is that the owner retunes these live and
the change takes effect. Editing `SPEED_MAX` to 120 changes nothing and gives
no sign that it changed nothing, which is the worst failure mode a
"trivially findable and changed" block can have. Its neighbours
(`SPEED_DEF`, `MAX_DT_SIM`) *are* read, via `create()` → the shell's
`speedDefault` / `maxDtSim`, so the block reads as uniformly live.

Three ways out, in ascending cost: **delete both** and let the markup own the
bounds (they are affordances, not model constants); **keep them and have
`fcuWireControls` write `slider.min` / `slider.max` from them** at bind time,
which makes the block's premise true; or **keep them and add a spec row** that
reads the markup attributes and asserts they match. The middle one is the
only one that makes the constants do work.

The AHU physics half deliberately declares neither — an unread constant is
exactly the trap this entry describes, and the AHU's sim-clock prefs land
with its shell-contract half instead.

**RESOLVED 2026-08-12 · PR #550 — deletion, not the middle option.** The
entry called the middle way out ("have `fcuWireControls` write `slider.min` /
`slider.max` from them") *"the only one that makes the constants do work,"*
and that is true as far as it goes. It was not taken, for four reasons that
outrank it:

* **The sibling module had already ruled the other way, in writing.**
  `ddcw-ahu-unit.js` states it at its own sim-clock prefs — *"SPEED_MIN /
  SPEED_MAX are NOT declared … a second copy here would be exactly that
  trap"* — and #220's resolution records the same settlement ("settled by
  omission on this unit, per #234"). #220 had explicitly left this half open:
  *"either wire the bounds from the constants or carry the mirror
  knowingly."* Wiring the FCU up would have left two sibling unit modules in
  **opposite postures on one question**, which is a worse drift generator
  than one dead const.
* **There is no no-JS fallback for the markup to be.** The workbench is
  wholly JS-driven; with scripting off the sim-clock slider does nothing at
  all. Under the middle option the markup numbers become **decoys** —
  greppable, authoritative-looking, silently overwritten at bind time. That
  is this entry's own complaint (edit a number, watch nothing happen, get no
  sign) reproduced on the other side of the seam. Note it also removes no
  copy; it only flips which copy is dead.
* **`host.setSpeed()` clamps nothing** (`ddcw-shell.js` — `if (isFinite(v))
  simSpeed = v`), so the model has no notion of a valid speed and there is no
  model-side truth for a constant to *be*. The range is purely how far a knob
  travels, which is the entry's own "affordances, not model constants."
* **It would single out one of the page's four sliders.** Fan, sim-speed,
  outdoor-air and load all declare bounds the same way and none of the other
  three has a JS mirror.

The entry's third option (a spec asserting markup == const) is barred by the
spec that would host it: `ddcw-fcu-unit.spec.js`'s header promises *"INVARIANTS,
NOT FEEL CONSTANTS … Nothing below pins any of their values."* And the
genuinely one-source version — `speedMin` / `speedMax` in the `create()`
contract with the shell writing both sliders — is ruled out by the standing
note beside `OA_RAMP_RATE`: extraction into the unit-agnostic shell **waits for
a third unit**.

**What the deletion exposed, and what now guards it.** Removing the dead copy
leaves the two-source that actually matters, and it is not script-vs-markup —
it is **sheet vs sheet**. Both workbench pages ship a sim clock and agreed at
1…60 *by coincidence*; a reader crossing the unit selector mid-thought must
not find the clock re-scaled under them, which is the same drift the
`OA_RAMP_RATE` comment refuses for the weather model. Two rows in
`tests/ddc-workbench-fcu.spec.js` now hold it:

* *every workbench sheet offers the same sim-clock range* — walks
  `html/simulators/` and compares the bounds of every page that ships a sim
  clock (the mockup has none and drops out on its own).
* *no unit module carries a sim-clock bounds mirror* — walks every
  `ddcw-*-unit.js`, so a **third** unit re-declaring the pair fails on the day
  its file lands rather than the day someone remembers this entry.

Both walk their directory rather than naming files (the #235 lesson) and both
carry anti-vacuity probes; each was falsified once before shipping. Neither
pins 1 or 60 — those stay TUNE BY FEEL and retune together. Both sheets and
both unit modules gained a comment naming the slider as the range's owner.

**Two cites in this entry had drifted** by the time it was worked: the consts
were at `ddcw-fcu-unit.js:167-168`, not `:163-164`, and the markup slider at
`ddc-workbench-fcu.html:1478`, not `:867`. The substantive claim held exactly —
a repo-wide grep found `SPEED_MIN` / `SPEED_MAX` only in their own
declarations, this ledger, and the AHU comment declining to declare them.

### 235. The #224 display-unit guard is bound by path and by local name to the FCU, so a second unit module ships that rule unguarded *(noticed 2026-07-28, AHU physics lane — **RESOLVED 2026-07-30**, AHU page lane — generalised, not duplicated)*

**Generalised, and it MOVED.** The guard now lives in
`tests/ddcw-display-units.spec.js` and both bindings are gone:

* **Path → walk.** It enumerates every `ddcw-*-unit.js` under `html/scripts`
  from the directory rather than naming one, so a third unit is covered the day
  its file lands.
* **Name alternation → derived FIXPOINT.** Each file's display-local set is
  derived FROM THAT FILE: seed from `const X = dispTempNum(…)`, then repeatedly
  add any `const X = …` whose initializer mentions a name already in the set,
  until it stops growing. One pass is not enough — `dtN`, the local the original
  #224 bug used, has no `dispTempNum` call of its own on either unit. A dedicated
  row pins that second-order reach against a synthetic fixture.
* **Anti-vacuity moved with it**, as this entry required. The four probe lines
  became a row that drives the matcher FACTORY against a synthetic name set, so
  they test the pattern rather than one file's names; the "the locals are still
  there" probe became a per-file "this file calls `dispTempNum` but no display
  local was derived" assertion; and a file with no display boundary is SKIPPED
  with the skip list asserted empty, so a module cannot silently drop out of
  scope.

**Proved by mutation**, per the lane brief: introducing
`const probeRelapse = d.capActive && dtN <= COOL_DT_TRIP;` into
`ddcw-ahu-unit.js` turned the row red and named `ddcw-ahu-unit.js` in the
failure; reverting it turned it green again. Note the probe used a SECOND-ORDER
local, so that run also exercised the fixpoint.

Floor unchanged and re-stated in the new header: a source scan of non-comment
lines, so a trailing `// dtN > -3` on a code line trips it and a comparison built
by string concatenation does not.


`tests/ddcw-fcu-unit.spec.js:838-885` is the source scan that enforces
codebase-issues #224 — *a display-unit local exists to be PAINTED; thresholds
compare a value off `derived` against an IP constant*. It is a good test, with
anti-vacuity probes in both directions. It is also **doubly hard-wired to one
file**:

- it reads a literal path — `fs.readFileSync(path.join(SCRIPTS,
  'ddcw-fcu-unit.js'))` (`:861`);
- and its `DISP` group is a hard-coded alternation of the FCU's own local
  names — `(dtN|eatN|datN|spN|sensedN)` (`:869`).

`ddcw-fcu-unit.js`'s header says the rule is inherited: *"A second unit module
inherits this rule."* Nothing enforces that inheritance. The AHU's graphic
half will paint a MAT badge, a ΔT badge and a discharge readout through
`DDCWShell.dispTempNum`, and every one of those locals is invisible to this
scan — so the exact regression #224 documents (a healthy 4 °F coil painting
"no ΔT" for a metric reader) can land again on the new unit with a green
suite.

Note the second binding is the sharper one: even copying the test file and
changing the path would leave the AHU's own local names uncovered unless the
alternation is edited too, and a name the alternation misses fails **silently**
— the anti-vacuity probe only checks that `const dtN =` still exists in the
*scanned* file.

Action, when the AHU graphic lands: generalise the scan to walk a LIST of unit
files with a per-file `DISP` set, or — better — replace the name alternation
with a shape rule the scan can derive (e.g. every local assigned from a
`dispTempNum(...)` call in the scanned file), so a new display local is
covered the moment it is written rather than the moment someone remembers to
add it. The anti-vacuity probes must move with it.

### 236. `Psychro.mixStreams` conserves neither enthalpy nor humidity ratio in the FOGGING branch *(noticed 2026-07-28, AHU physics review round — **RESOLVED 2026-07-29**, owner ruled for the re-solve, ice-aware)*

`html/scripts/psychro-engine.js` recovers the mixed dry-bulb from the
**pre-clamp** humidity ratio —

```js
const tdb = (h - 1061 * W) / (0.240 + 0.444 * W);
return buildState(tdb, W, P);
```

— and `buildState` then drops `W` onto the saturation curve **without
re-solving the temperature**. Because ∂t/∂W < 0 in that recovery, the returned
dry-bulb runs **cold**, and the returned state's `h` is rebuilt from the
clamped pair, so neither conserved quantity comes back flow-weighted.

MEASURED against a proper fog solve (`h_mix = h_sat(T) + (W_mix − W_sat(T)) ·
(T − 32)`, the standard liquid-water convention):

| case | returned | true | error |
|---|---|---|---|
| fog onset (any pair) | — | — | < 0.2 °F |
| AHU-reachable corner (zone 80 °F, damper 70 %, OAT −20 °F) | 10.42 °F | 17.10 °F | **−6.68 °F** |
| full sweep worst (OAT −20, zone 90, damper 70 %) | 13.64 °F | 23.13 °F | −9.49 °F |
| 90 °F/95 % mixed 50/50 into 20 °F/60 % | h 23.73 | h 30.09 | — |

Outside the fog branch the function is exact — the enthalpy inversion
round-trips to 2.8e-14 °F and the flow-weighted `h` / `W` return to 3.6e-15 / 0.

**Reachable from the AHU mixing box** at its shipped RH assumptions (OA 40 %,
RA 50 %): with the zone at 72 °F, fog begins at OAT −2 °F with the damper at
50 % and at +5 °F with it at 70 % — mid-position on a cold day, mixing warm
moist return air into cold dry outdoor air, which genuinely fogs. Nothing on
the site prints a fogging MAT today, and the **error direction is cold, hence
conservative for a freeze question**, which is why this shipped as documented
rather than re-solved.

Done in the AHU physics review PR: the header's "returns a valid fogging state
rather than an impossible one" now says *valid means ON the curve, not
conserving*, and quotes the measured bound.

**RESOLVED 2026-07-29 — owner ruled for the re-solve, and ruled that the
condensate convention must switch at the ice point.** `mixStreams` now
bisects for the temperature satisfying

```
h_mix = h_sat(T) + (W_mix − W_sat(T)) · h_condensate(T)
```

and every result — fogging or not — carries two new fields, in the shape
`invertProcess` already uses for its own `saturated` flag: `fogging`
(boolean) and `condensate` (lb_water / lb_dry-air held in suspension).

Three things about the resolution are worth having written down:

1. **The ice convention is not optional, because every AHU-reachable fog case
   lands below freezing.** Above 32 °F the entrained water is liquid
   (`h_w = t − 32`); below it, ice. MEASURED at the reachable corner above:
   the liquid-only form solves to **17.10 °F**, the ice form to
   **17.67 °F** — 0.57 °F apart, small only because the condensate is
   ~10 grains, since the per-pound gap is 136 Btu/lb_water.
   The constants used are **not** quoted from a table: they are the ones
   ASHRAE's IP wet-bulb relations imply, and those relations are already in
   this file. `humRatioFromWetBulb`'s two branches solve the same
   adiabatic-saturation balance, and rearranging their coefficients gives
   `h_w = t − 32` (from 1093 / 0.556) and `h_ice = 0.48·t − 159` (from
   1220 / 0.48), i.e. −143.64 Btu/lb of fusion at 32 °F and a 0.48
   Btu/(lb·°F) ice specific heat. Rounded table values (143.34 and 0.487)
   move the solved corner by 8e-4 °F. Deriving them this way makes a fog
   solve and a below-freezing wet-bulb agree by construction, and it means a
   future retune of one has to argue with the other.
2. **`h` on a fogging result is the AIR'S, not the mixture's, and that is now
   stated rather than implied.** A `buildState` result structurally cannot
   represent suspended water; `tdb` and `W` are the mixture's, `h` is the
   saturated-air enthalpy at that `tdb`, and the mixture total is
   `h + condensate · h_condensate(tdb)`. Returning `condensate` is what lets
   a caller close its own enthalpy balance instead of silently losing the
   water.
3. **One documented hole, and it announces itself.** The residual the solve
   inverts JUMPS at 32 °F by the heat of fusion, so when its root falls inside
   that jump the bisection lands on 32 °F exactly — physically right (the
   mixture sits at the ice point with part of its condensate frozen) and not
   fully describable by two fields, because they do not carry the frozen
   fraction. Reconstruction there is off by at most `condensate` × 143.64
   Btu/lb, and **the bound is the thing to read, not a measured worst** —
   the plateau's condensate scales with how far past the curve the streams
   sit, so a single number is a number for one pair of them. Measured, with
   the scope named: **0.29 Btu/lb_da** across the AHU's own band (50 %-RH
   return anywhere in 60…90 °F against 40 %-RH outdoor air at −30 °F and up,
   any damper — worst at zone 88.5 / −24 °F / 60 %, where the bound is
   0.33), **0.67** once the two RHs are free as well (zone 90 / 90 % against
   −28 °F / 90 % at 70 %), against ~6e-13 everywhere else in the fog branch.
   An earlier draft of both this entry and the engine comment published
   **0.172** as a sweep worst; that figure is correct only for the 80 °F /
   55 % pair the plateau span below is measured at, which is 1.7× low inside
   the AHU band and ~4× low off it (corrected 2026-07-29).
   `tdb === 32 && condensate > 0` is the signature.
   The plateau is narrow but real: ~1.3 °F of outdoor air (−19.16 to
   −17.88 °F against an 80 °F zone at a 55 % damper).

Note the table above was measured against the LIQUID form, so the "true"
column understates the correction now shipped. Under the ice convention the
same two cases solve to 17.67 °F (a 7.25 °F correction) and 23.89 °F (10.25 °F).
The worst pair inside the AHU's own band is neither of those: zone 90 °F at a
65 % damper against −30 °F outdoor air corrects **12.80 °F** (12.75 → 25.56).
Off room air and weather the correction has no interesting ceiling — a coarse
sweep of near-saturated pairs from −40 to 120 °F reaches **50.1 °F** (−40 °F /
99 % at 70 % into 120 °F / 99 %) — which is why the engine comment now states
the mechanism rather than a magnitude for a future caller: the correction is as
large as the latent heat the condensing water releases, and only the moisture
the streams brought caps that.

Also measured: the clear-of-the-curve path did **not** move — over a
131,881-point sweep of stream pairs the recovered dry-bulb matches a hand
computation exactly, the flow-weighted `h` to 1.4e-14 and `W` exactly.

`tests/psychro-mixstreams.spec.js` grew six rows: the contract shape, the
conservation check against an independently written reference balance, the
saturation-curve landing, the re-solve's direction (warmer than the
uncorrected recovery — a regression makes that difference exactly zero),
continuity across the 32 °F switch with anti-vacuity probes on both sides,
and the plateau bound. Reverting the re-solve fails three of them; reverting
only the ice half of the convention fails two.

Reachable-state consequence, for the record: the AHU's `matT` (and with it
`datT`, `qCool` and the zone trajectory) warms in the cold-and-open corner —
up to **8.1 °F** at OAT −30 °F with the damper at 60 %, 6.2 °F at the −20 °F
/ 70 % corner. 54 of a 96-cell probe grid moved. **Nothing on the default day
moves at all** (no fog there). The AHU does not carry the condensate forward —
see #239.

The four inline public consumers of the mixing math (#228) are unaffected
because they do not call this helper yet; when they do, they inherit the fix.

### 237. `ddcw-fcu-unit.js` carries the same starved-coil fallback the AHU just fixed, and it is LIVE *(noticed 2026-07-28, AHU physics review round — **RESOLVED 2026-07-30**, FCU proof sweep)*

`html/scripts/ddcw-fcu-unit.js:248`:

```js
if (leaving.ok) { coilLeaveTarget = leaving.tdb; leavingW = leaving.W; }
else coilLeaveTarget = zoneT;
```

When the requested load per CFM drives `Psychro.invertProcess` past bone-dry it
returns `ok:false`, and the FCU falls back to the **entering air** — a running
compressor with a zero coil ΔT, which is this model's own signature for a
FAULTED machine. The AHU shipped the identical shape and it made the coil ΔT
non-monotone in airflow; the AHU fix pins the starved coil at `COIL_FLOOR`
instead (bounded by the entering air), which restores monotonicity.

MEASURED on the shipped FCU, quasi-static probe, stage 2:

| fan | coilLeaveT | qCool |
|---|---|---|
| 20 % | 34.00 °F | 5,310 Btu/h |
| 15 % | 34.00 °F | 3,982 |
| 12 % | 34.00 °F | 3,186 |
| **10 %** | **76.00 °F** | **−38.5** |
| 8 % | 76.00 °F | −32.1 |

One step of a step-5 fan slider takes the discharge from 34.6 °F to 76.6 °F and
turns a running DX coil into a heater. `ddc-workbench-fcu.html` is a shipped
page, so unlike the AHU this is reachable by a reader today.

Not fixed inline: the AHU branch is the physics half of a different unit, and
touching the live FCU model wants its own PR (and its own look at the workbench
graphic, which paints that ΔT). The fix is the AHU's, one line —
`else coilLeaveTarget = COIL_FLOOR;` — plus the entering-air ceiling that makes
the floor safe on cold inlet air. Note the FCU's coil inlet is the zone, clamped
to [40, 120], so the *other* half of the AHU defect (a freeze floor firing on a
de-energized coil) is unreachable there; only this half carries over.

**RESOLVED 2026-07-30.** The AHU's fix was ported rather than re-derived: the
failed inversion now falls back to `COIL_FLOOR`, and the entering-air CEILING
(`inlet.tdb` here, not the AHU's `afterHeat.tdb`) plus the `satHumRatio` clamp
on `leavingW` came with it. The clamp block also moved inside `if (capActive)`,
matching the AHU's shape.

Re-measured, same quasi-static probe, stage 2:

| fan | before | after |
|---|---|---|
| 20 % | 34.60 °F | 34.60 °F |
| 15 % | 34.60 | 34.60 |
| 12 % | 34.60 | 34.60 |
| **10 %** | **76.60** | **34.60** |
| 8 % | 76.60 | 34.60 |
| 5 % | 76.60 | 34.60 |

The discharge is monotone in airflow across the whole slider now — it pins at
the floor while starved and rises with air, and never inverts.

Two corrections to this issue's own text, both found by measuring rather than
reading:

1. **The cited line had drifted.** `ddcw-fcu-unit.js:248` in the writeup is
   the floor clamp; the defective fallback was `:247`, and the `datT` line the
   #225 entry cites as `:242` had moved to `:270`. Line citations in this file
   decay — quote the code, as the block above does.
2. **"Only this half carries over" is right about reachability and wrong about
   what to port.** The de-energized half IS unreachable from the UI (the zone
   balance clamps `zoneT` ≥ 40 °F), but it is reachable from a spec, and more
   to the point the *ceiling* is what makes the floor harmless — not the
   `capActive` nesting. Measured by mutation: the spec row covering this only
   reddens when the nesting AND the ceiling both go, because either one alone
   neutralises the other. Both shipped; the reasoning is in the source comment
   so nobody deletes one believing the other is redundant.

`leavingW` is NOT display-only on the FCU (unlike the AHU, where the comment
says nothing prints it): it feeds `Psychro.buildState(datT, leavingW, P)`,
which the zone balance measures `qCool` from. The saturation clamp therefore
changes real numbers here, not just a hypothetical readout.

Guarded by a new row that sweeps fan 5→100 at 1 % steps and asserts the coil
ΔT never inverts — non-strict, because the floor's shelf is genuinely flat and
strictness is the wrong tool there. That shape is why the pre-existing monotone
row (which sweeps 40/70/100, deliberately clear of the clamp) never saw this.

### 238. `Psychro.buildState` silently returns `W = 0` when the saturation humidity ratio degenerates *(noticed 2026-07-28, AHU physics review round)*

`buildState` opens with

```js
W = Math.max(0, Math.min(W, satHumRatio(tdb, P)));
```

Above the boiling point for the given pressure — 212 °F at sea level, lower at
altitude — `satPress(tdb)` exceeds `P`, so `humRatioFromVapPress = 0.621945 ·
pw / (P − pw)` goes **negative** and the `Math.min` hands the `Math.max` a
negative ceiling. The state comes back `ok: true` with `W = 0`, `rh = 0` and
`tdp = -Infinity`, whatever moisture the caller passed in.

MEASURED: `satHumRatio(211.9, P_STD) = +584.96`, `satHumRatio(212, P_STD) =
−676.00`, `satHumRatio(500, P_STD) = −0.636`. `buildState(200, 0.006, P_STD)`
returns W 0.006 / rh 1.22 %; `buildState(250, 0.006, P_STD)` returns W 0 /
rh 0 / tdp −Infinity.

The negative return is the **formula degenerating, not a bug in the constant** —
above boiling there is no saturation humidity ratio to return — so the fix is
not to widen `satHumRatio`. The defect is that a state outside the math's
validity envelope comes back looking like a perfectly ordinary bone-dry one.
`dewPointFromVapPress` already handles its own out-of-range end this way
(#103: return `Infinity` so a caller's `isFinite` guard catches it), and this is
the same shape of problem with the opposite answer.

Suggested: have `buildState` return `{ ok: false, error: … }` when
`satHumRatio(tdb, P) < 0`, i.e. when the requested dry-bulb is at or above the
saturation temperature for the pressure. Every current caller already checks
`.ok`. Surfaced by the AHU heating coil, which could drive its leaving air past
1100 °F before this round added `HW_LEAVE_MAX`; the AHU no longer reaches it,
but the engine is shared and the next caller might.

### 239. The AHU mixing box drops `mixStreams`' fog condensate, so its moisture bookkeeping loses water in the cold-and-open corner *(noticed 2026-07-29, the #236 fix round)*

With #236 resolved, `Psychro.mixStreams` now returns a `condensate` term
alongside a saturated fogging state. `html/scripts/ddcw-ahu-unit.js` reads
`mixState.tdb` and `mixState.W` and **ignores `condensate`** — so in the fog
corner the suspended water simply leaves the model. Concretely:

- `d.matW` is the ON-CURVE humidity ratio, not the flow-weighted mixture's, so
  the mixing box is not moisture-conserving there;
- the coil section downstream is handed saturated air and no liquid load, so
  the DX coil's latent term and the heating coil's "W rides through unchanged"
  invariant both operate on a mixture that already lost some of its water;
- the amount is small in absolute terms — ~10 grains / lb_da at the extreme
  corner (zone 80 °F, 70 % outdoor air, −20 °F outdoor) — but it is a
  one-directional loss, and it is exactly the regime a freeze question lives
  in.

**Not a defect in the temperature story, which is what the machine teaches.**
The AHU is dry-bulb throughout (dry-bulb economizer, dry-bulb staging, dry-bulb
badges), no point on the roster reports moisture, and the plant has no latent
zone state yet (`plant.zoneW` is a documented future seam, not a field). So
nothing published today is wrong because of this — `matW` / `afterHeatW` are
marked "observability only, no consumer" in the file. The entry exists because
the moment a consumer appears the loss becomes visible, and because the fix has
a natural home:

Action, when the latent seam lands (a `zoneW` state, a supply-RH or SHR
readout, or a coil-condensate readout): decide whether the mixing box carries
the condensate as a liquid stream into the coil section or declares it drained
at the mixing box, and say which in the section-3 comment. Today that comment
says the water is dropped and why; it does not claim the model conserves it.
Cheapest honest interim if a moisture readout ships first: publish
`d.matCondensate` beside `d.matW` so a chip can annotate a fogging mixed-air
state rather than silently under-report it.

### 240. A fogging MAT no longer reconciles with the reader's own %OA arithmetic, and the graphic says nothing about it *(noticed 2026-07-29, the #236 fix round's review — a LANE 7.4 graphic question, not a physics one — **ONE CANDIDATE BUILT 2026-07-30 — RESOLVED 2026-08-02: reproduced with the corrected recipe, owner ruled KEEP AS-IS** — manual-only reachability mirrors the field)*

**Built as one candidate, deliberately cheap and reversible.** The owner asked
to SEE this rather than answer it in the abstract, and the one option ruled out
was a silent bare number — which looks like the site's own %OA arithmetic and is
not it.

What shipped: a marker beside the MAT readout that appears only in the fog
branch. Two parts, because the two audiences need different things.
* On the drawing, `#ahu-fog-mark` — three small wave strokes in the calculated
  blue, sitting in the 14-unit corridor between the `MAT` row label and its well.
  GEOMETRY rather than a glyph on purpose: no font-subset risk (Δ already costs
  this drawing a measurement) and no string width to re-measure.
* In the point mirror, `#ahu-mat-fog-note` — a real sentence with room to be one,
  revealed by the same flag: *"Saturated — the mixture is fogging, so this is
  warmer than the plain outdoor-air blend."* That is the accessible half, since
  `role="img"` hides everything inside the drawing.

The flag is DERIVED IN THE DOM HALF, not published by the physics: `matW` at or
above saturation for `matT` is the tell, because `Psychro.mixStreams` re-solves
the mixed dry-bulb ON the curve in that branch. The physics deliberately drops
the condensate (#239) and has no consumer for a flag, so the derivation lives
with the paint.

Reversing it is deleting one CSS block, one `<g>`, one `<span>` and three lines
of `ahuRenderUnit`. `tests/ddc-workbench-ahu-page.spec.js` asserts absent on an
ordinary day and present at the cold-and-open corner the shipped
outdoor-air slider reaches.


`#236`'s fog re-solve moved the AHU's published `d.matT` off the
`%OA·OAT + %RA·RAT` blend that `air-handlers.html`, `economizer-ratio.html` and
`coil-freeze-risk.html` all teach — because the condensing water releases its
latent heat into the air, so a fogging mixture genuinely lands warmer than the
straight blend. Measured against `ddcw-ahu-unit.js` as shipped (return 50 % RH,
outdoor 40 % RH):

| case | plain %OA sum | published `matT` |
|---|---|---|
| just past the crossing (zone 76, 60 % damper, 5 °F) | 33.40 °F | 33.75 °F |
| 0 °F outdoor, 60 % damper, zone 76 | 30.40 °F | 31.94 °F |
| −20 °F outdoor, 70 % damper, zone 76 | 8.80 °F | 15.36 °F |
| −30 °F outdoor, 65 % damper, zone 90 | 12.00 °F | 25.56 °F |

Clear of the curve the two still agree to **0.61 °F** anywhere in the
space-temp point's 60…90 °F band — that residual is the honest cp-weighting the
engine's own header describes, and it is what the section-3 WEIGHT BASIS
comment's "a reader who does the sum gets the graphic's own answer" was written
about. The comment is now scoped to the clear branch and the fog paragraph
states the divergence with its size, so **nothing in the code is wrong**. The
open item is what the GRAPHIC does:

The MAT chip lane 7.4 will label off that comment will print a number a
reader's own arithmetic cannot reproduce, in exactly the freeze corner the
machine exists to teach — and the same reader can walk to
`coil-freeze-risk.html` and get the other answer, because the four inline
consumers of the mixing math have not adopted `Psychro.mixStreams` yet (#228).

Action for the DOM half: decide whether the mixed-air readout carries a fogging
marker — a saturated/fog pill beside the chip, a note in the drill-in, or the
condensate value #239 suggests publishing — rather than a bare temperature. A
silent number is the one option that teaches the wrong thing twice: it looks
like the site's arithmetic and isn't, and it gives no hook for the (correct,
teachable) reason why. Cross-check with #228 when the consumer pages adopt the
helper, since that closes the cross-page disagreement but not the
reader-arithmetic one.

**Update 2026-08-02 — the owner's first look could NOT reproduce the
marker.** On the LAN preview, neither the suggested recipe (outdoor-air
slider to ~0 °F with the damper open 60 %+) nor free exploration showed
it; his own hypothesis was the zone state ("unless I'm not letting the
zone get hot enough"). Plausible mechanism, unconfirmed: the #240 table's
measured fog cases all used zone 76 / damper 60–70 %, but the running
sequence holds the zone at the heating setpoint (68 — drier return air)
and holds the damper at `min-oa-pos` (20 %) in cold weather, since the
economizer call requires a latched cooling stage — so the natural winter
state may sit outside the fog region the spec forces. Under
investigation: whether the preview's served bytes carry the marker at
all, what state the spec actually forces and whether the UI can reach
it, and where the onset boundary sits with the zone winter-held.

**Findings, same day — measured on the built page, driving the UI
only.** The preview served the marker (bytes verified on the preview
and a fresh local build) — not the explanation. The recipe had been
quoted from the wrong ZONE state: the page spec forces OAT −10 / manual
damper 60 from page-load defaults, where zone truth is **76 °F** — the
spec never touches the zone — while a settled winter machine rides the
heating sawtooth at ~65.7–67.2 °F, and the fog boundary at OAT 0 /
damper 60 sits at zone ≥ **67.0** — astride the sawtooth. Worse, the
attempt fights itself: opening the damper saturates the HW coil and
drags zone truth down (measured 65.7 → 58.7 °F in ~7 sim-min), away
from the boundary. The operative variable is OAT, not zone warmth —
the minimum fogging zone collapses with cold (OAT −5 / damper 60 →
58.0 °F; −10 / 60 → 49.5; −15 / 60 → 41.0; −20 → at the plant's own
zone floor), so below about −10…−15 °F fog is unconditional and
permanent. **Fog is unreachable in AUTO:** the economizer call
requires a latched cooling stage, so winter pins the damper at the
20 % minimum, and at 20 % no OAT in the slider's −20…110 range fogs at
any zone 66–80. The only UI path is the slot-8 Manual Operator command
on the OA damper (its slider is disabled until the NULL box is
unchecked); scenario presets seize slot-8 manual on every point and
hold the damper at their own value, so entering through one pins fog
unreachable until released. **Verified recipe** (end-to-end through
the UI; persists indefinitely): outdoor air **−15 °F** → uncheck the
OA-damper NULL box → damper slider **60 %** — the marker appears
within ~2 s. Two accuracy notes on this entry: the flag is not
"derived in the DOM half" by a saturation comparison — the shipped
code forwards `mixStreams`' own `.fogging` boolean (`d.matFogging`;
the render only gates display on the MAT point not being forced) — and
the reachability finding sharpens the marker's question rather than
settling it: the state it flags is precisely an operator forcing the
damper open in cold weather, so appearing only under a manual command
is arguably the marker doing its job. The owner's call, with a working
recipe now in hand.

**Resolution, 2026-08-02 — the owner reproduced the marker with the
corrected recipe and ruled KEEP AS-IS.** His rationale endorses the
reachability finding as depiction-correct rather than tolerating it:
fogging the mixing box is *"not the kind of thing that happens unless
an extreme fringe case on a well programmed system"* — so a marker
that appears only when an operator forces the damper open in cold
weather is the marker matching reality. The AUTO-unreachability is a
property of a correct sequence, not a defect of the marker.

### 241. The site defines "deadband" two ways for beginners, and neither surface acknowledges the other *(noticed 2026-07-29, deadband/setpoint-gap terminology sweep — **RESOLVED 2026-07-30**, owner ruled for a third option: teach the habit, not the definition — then ruled again to keep both questions and let the bank overflow)*

Two shipped, reader-facing, `canonical`-bearing surfaces use the word for
different quantities:

- `html/_data/quizzes/surviving-first-months.js:124` (feeds
  `html/practice/surviving-first-months.html`) — *"Real sequences add a deadband
  (say `70-74°F`) so heating and cooling don't fight each other"* — names the
  **separation between the heating and cooling setpoints** a deadband.
- `html/_data/quizzes/comparators-and-deadband.js:88` (feeds
  `html/practice/comparators-and-deadband.html`) — teaches the deadband as the
  band **half each side of one setpoint**: "set at 72 + 1 = 73 °F, reset at
  72 − 1 = 71 °F … The 2 °F between the two lines is the deadband."

⚠️ **The first quiz is not WRONG.** By VAV convention the region between the
cooling and heating mode ranges genuinely is called the deadband (the same sense
`html/education/vav-systems.html:696` uses), and ASHRAE 90.1 reportedly calls
the heating/cooling gap a "dead band" — *reportedly*: the site cites no 90.1 and
this entry does not either. The defect is narrower and real: the sentence is
**undisambiguated** while a sibling surface defines the same word the other way,
and the undisambiguated one is aimed at readers in their first months on the job
— the audience least able to notice that two senses are in play.

Note the site already owns the disambiguation.
`html/education/comparators-and-deadband.html:465-482` sets the senses side by
side, including "a zone's is the separation held between the heating and cooling
setpoints," and
`html/simulators/ddc-workbench-ahu-mockup.html`'s setpoints paragraph is the
reference implementation of telling the two apart on one screen. Neither of the
two quiz banks links or nods to it.

**NOT for an agent to fix.** Both quizzes feed pages carrying a `canonical`, so
this sits in the approval class; and the choice is editorial, not mechanical.
Two candidate fixes:

1. **A half-clause acknowledging both senses** in the
   `surviving-first-months.js` explain — the owner's standing "disclose the
   variation rather than harmonise it" preference, and cheap: the explain
   already has room, and `comparators-and-deadband.html#deadband` is the natural
   `learnMore` neighbour.
2. **Leave it.** The quiz's point is *setpoint ≠ actual*, not terminology, and a
   terminology aside costs attention on a question that is not about it.

What is **not** a candidate: redefining the word in `surviving-first-months.js`
to match the comparators lesson. That would put the site at odds with the VAV
usage it teaches elsewhere, i.e. trade one internal contradiction for a worse
one.

**RESOLVED 2026-07-30 — owner took neither candidate.** His ruling: *"that
question should be changed on the quiz, instead we should have a question with
the answer being 'check the context of the situation' … understanding the
context around the question is important not just with deadbands."* He
explicitly declined a definitional "what is a deadband" question as too on the
nose.

So the conflating sentence did not get a disambiguating half-clause; a new
question was written to carry the habit instead.

**Second owner ruling, same day — KEEP BOTH.** The first cut of this fix
replaced `setpoint-vs-actual` with the new question. The owner reversed that:
*"we decided to gradually grow question banks and make which 10 you get RNG.
The idea was to do that to quizzes slowly over time rather than in a big batch,
so this is a good candidate."* The bank going to eleven and tripping the
engine's sampler is therefore the **intended outcome**, not a cost — see the
direction entry in `site-ideas-and-friction.md` under *Quiz banks grow past
their presented count, one bank at a time*.

What shipped:

- `setpoint-vs-actual` stays, at its original position, with its `id`, `type`,
  `prompt`, `answer`, `learnMore` and `tags` untouched. Its `explain` loses
  exactly one parenthetical — *"Real sequences add a deadband (say `70-74°F`)
  so heating and cooling don't fight each other"* becomes *"Real sequences add
  a deadband so heating and cooling don't fight each other"*. That clause was
  the whole defect: `70-74°F` is a heating/cooling **setpoint pair**, and
  naming it *a deadband* is the conflation this issue is about. The remaining
  sentence uses the zone sense of the word without asserting a number for it,
  which is legitimate and matches what `education/vav-systems.html` teaches.
- `read-the-term-in-context` (a `gotcha`) is added directly after it. It shows
  one zone described by three documents — a spec calling for a 4 °F deadband, a
  point list with 70/74 °F setpoints, and a controller carrying a 2 °F DEADBAND
  on the stage-1 call. Three distractors are each a confident single definition
  (take the spec's, take the controller's, call it a typo and escalate); the
  correct answer is that both senses are in service and the reader has to find
  out which one this system means. `explain` names both senses, and `learnMore`
  points at `education/comparators-and-deadband.html#which-sense` — the
  paragraph holding the site's canonical disambiguation, which no quiz bank
  previously linked, and which this PR gave that `id` so it could be linked.
- The bank is therefore **eleven** questions against `defaultCount: 10`, the
  first shipped bank to overflow its presented count. `buildQueue()` in
  `quiz-engine.js` samples it: each run draws ten of the eleven with an
  unseeded Fisher-Yates, then restores bank order within the drawn subset under
  the default `sequential`. Driven on the built page, eight fresh loads
  produced seven distinct subsets, every run exactly ten, and all eleven
  questions reachable across the eight. Nothing about that path is new —
  `tests/quiz-selection.spec.js` has guarded it since the sampler landed; this
  is the first real bank to exercise it.

Deadband is only the worked example; the transferable move (a term on someone
else's prints is a label, the meaning lives in the numbers underneath it) is the
payload. `comparators-and-deadband.js` and its lesson were not touched — they
are correct.

**Reader-facing copy: the format pill WAS updated in the same change.** Adding a
`gotcha` to the bank falsified the drill's format pill on
`practice/index.html`, which read `'MCQ · TF · Numeric'`. It was rewritten to
`'MCQ · TF · Gotcha · Numeric'` — the site's own convention elsewhere — in
`71c4862`, on the same branch, before PR #456 merged. The card now reads
`['10 Questions', 'MCQ · TF · Gotcha · Numeric', 'Field Sampler', '~ 5 min']`,
and no `'MCQ · TF · Numeric'` pill survives anywhere on the landing. The
*10-question drill* description and the `'10 Questions'` pill were always still
true — sampling presents ten of the eleven.

*(This paragraph originally read "left alone, flagged for the owner", describing
the pill as outstanding. It was written before `71c4862` landed on the same
branch and was never trued up, so it merged stale — corrected 2026-07-31 from
the FBE block-name lane. No spec guards a format pill, which is why the drift
was silent on both sides: the copy went stale against the bank, then the note
went stale against the copy.)*
### 242. The AHU mockup's setpoint prose disagrees with the physics module's shipped defaults *(noticed 2026-07-29, deadband/setpoint-gap terminology sweep — for LANE 7.4 — **RESOLVED 2026-07-30** — the module won, and the prose was re-derived, not copied)*

**The physics module wins (owner decision, 2026-07-30).** The AHU ships cooling
72 / heating 68 / deadband 2, so cooling makes at 74 and breaks at 72 and the
setpoint separation is 4 °F. `ddcw-ahu-unit.js`'s seeds, its `4 °F clear of
cooling` comment and its measured cycling-arrival figures are all correct and
were not touched.

`html/simulators/ddc-workbench-ahu-mockup.html` is UNCHANGED and stays the
archival depiction record — including its 73/68 prose, which is now historical
rather than wrong-in-place.

The live page (`html/simulators/ddc-workbench.html`) re-derives rather than
copies. The collapse this entry predicted is real and was handled: at 72 + 2 the
make point IS 74, so the mockup's *"a space of 74.0 °F can sit under a lit
stage"* illustration has no gap left to illustrate. The between-the-edges example
is **73.0 °F** on the live page. Its rail reads SP DIFF 4.0 and its economizer
lockout reads 62.0 (the module's seed) rather than the mockup's 65.0.

Two structural changes went with it, because the page is LIVE where the mockup
was static: the teaching prose states no live value at all, and the only numbers
in it are named as SHIPPED PROGRAM CONSTANTS — a reader can edit any of them on
the wiresheet, and the rail beside the drawing is what stays honest.


`html/simulators/ddc-workbench-ahu-mockup.html` and
`html/scripts/ddcw-ahu-unit.js` ship different setpoints:

| | mockup | `ddcw-ahu-unit.js` |
|---|---|---|
| cooling setpoint | 73.0 °F | 72 (`AHU_POINTS` seed, `'cooling-setpoint': 72`) |
| heating setpoint | 68.0 °F | 68 |
| setpoint gap | **5.0 °F** (`#ahu-p-sp-diff`) | **4 °F** |
| deadband | 2.0 °F | 2 |
| stage-1 make / break | 75.0 / 73.0 °F | 74 / 72 |

**Harmless today** — the mockup is a static depiction review and the module
drives nothing on it. It stops being harmless at **lane 7.4**, which wires the
graphic to the plant: at that point the paragraph describes numbers other than
the ones on its own screen.

Every figure in the *"Setpoints and the deadband"* paragraph
(`ddc-workbench-ahu-mockup.html:2268`) is derived from the pair and moves with
it: the `5.0 °F apart` claim, the `73.0 °F and 68.0 °F` restatement, the
`73.0 minus 68.0` arithmetic for the SP DIFF well, and the
`73.0 plus 2.0, or 75.0 °F` make / `73.0 °F` break pair. **One figure does more
than move — it collapses.** The paragraph's closer, *"a space of 74.0 °F can sit
under a lit stage,"* only teaches its point while 74.0 sits strictly between the
edges; against the module's 72/2 it *is* the make point, so the "between the two
edges the call is held by a latch" illustration loses its example. The same
74.0-under-a-lit-stage argument is load-bearing in the *"What the sequence is
doing"* paragraph (`:2170`) and in the reference table (`:2591`).

Surfaces keyed to the cooling setpoint, all of which move together: the round-2
zone well `#ahu-v-cool-sp` (`:1414`), the rail param well `#ahu-p-cool-sp`
(`:2363`), the calculated `#ahu-p-sp-diff` (`:2392`), the point-table row
`#ahu-r-cool-sp` (`:2501`), the reference-table cell (`:2590`), the three
round-one compositions' zone wells (`#ahu-a-zone-sp` / `#ahu-b-zone-sp` /
`#ahu-c-zone-sp`) and their `.ahu-point-val` twins, and **four SVG `<desc>`
nodes** that spell the value out in prose (`ahu-desc` `:1286`, `ahu-a-desc`
`:2624`, `ahu-b-desc` `:3035`, `ahu-c-desc` `:3452` — three in numerals, one of
them in words: `ahu-b-desc`, "seventy-three point zero"). The mockup's own
comment at `:2422` already pins the cooling setpoint as "the ONE permitted
duplication on this **component**" and lists three of these ids as must-agree.
Read that scope literally: it covers the round-2 component only, so the three
round-one compositions and their `<desc>` nodes (everything below `:2606`) sit
outside it by design. Its real gap is `ahu-desc` — its OWN component's `<desc>`,
which carries the value and is not on the must-agree list.

Action for lane 7.4: pick one pair and true up whichever side loses. Note the
gap is not free either way — `ddcw-ahu-unit.js:250` documents 68 as "4 °F clear
of cooling," and the module's measured cycling arrival (`:153-170`) is stated
against the 72 cut-out, so moving the module means re-measuring that claim,
while moving the mockup means touching every surface above.

### 243. `oat` declares no range, but comments in the same file state figures at temperatures no declared range reaches *(noticed 2026-07-29, deadband/setpoint-gap terminology sweep — for LANE 7.4 — **RESOLVED 2026-07-30**, AHU page lane)*

**The range is the PAGE's, and it is −20…110 °F, step 1, default 80** (owner
decision 2026-07-30). It lives on `#ahu-oa-slider` in
`html/simulators/ddc-workbench.html`, not in the roster: an air handler's
outdoor-air knob is a commissioning control on the page, the way the FCU's is,
and the roster stays a BACnet point list. The FCU's own 55…110 stays — that unit
has no economizer and no heating coil, so it needs none of what the cold end
buys.

Why the cold end: below freezing is where the minimum-outdoor-air position starts
to matter, where the mixing box can fog, and where a wide-open damper over a
still coil is a freeze scenario rather than a diagram.

The OAT-indexed figures in `ddcw-ahu-unit.js` (`:383-408`) were re-scoped to it,
following the model `:376-381` already sets:
* the fogging onset (~−2 °F at a 50 % damper) and the plain 0 °F case now say
  they are ordinary drags of one control rather than corners of a sweep grid;
* the −20 °F / 70 % figure is named as the coldest the shipped slider reaches;
* the −30 °F / 65 % / zone-90 corner is OUT of range and now says so — kept as an
  illustration of where the divergence goes, explicitly not a state the machine
  can be put in.
The page's slider comment carries the reciprocal note: this control owns the "how
cold can it get" claim, and the physics file points here.


`html/scripts/ddcw-ahu-unit.js`'s `AHU_POINTS` roster gives `space-temp`
`min: 60, max: 90, step: 1` and gives **`oat` no `min` / `max` / `step` at
all** — the outdoor-air knob's range is the DOM half's, not this file's. The
file knows this: the WEIGHT BASIS comment (`:376-381`) deliberately withdrew an
earlier "the coldest day the sliders reach (0 °F)" claim and says why.

The withdrawal did not reach the paragraphs below it, which still quote
OAT-indexed figures as if a range existed: fogging lands "well inside the knob
ranges … from about −2 °F outdoor," "a plain 0 °F once the damper is at 50 %,"
"6.6 °F at the −20 °F / 70 % corner," and "13.6 °F at the coldest-and-most-open
pair the space-temp band reaches (zone 90 °F, 65 % damper, −30 °F)" (`:383-408`;
the same figures appear in #240's table). The `space-temp` half of that last
pair is anchored — 90 °F is the declared max — and the OAT half is not.

So the numbers are real (measured against the engine) but the **reachability
claim around them is not yet ownable by this file**: nothing here says −30 °F is
a state a reader can drive to. For scale, the shipped sibling knob is nowhere
near it — `ddc-workbench-fcu.html:875` runs its outdoor-air slider **55…110 °F**
— and the AHU has no page, so today the answer is "no range at all."

Action for the DOM half in lane 7.4: declare the AHU's outdoor-air range (in the
roster if it belongs to the unit, in the slider if it belongs to the page), then
either re-scope these figures to it or re-word them the way `:376-381` already
models — state the measured divergence and let whatever sets the range own the
"how cold can it get" claim. If the range lands short of −30 °F, the extreme
corner figures become illustrative-only and should say so.

### 244. The wiresheet's cost scales with the CANVAS, not just its contents *(noticed 2026-07-30, FCU proof sweep — measured, accepted, unfixed)*

Adding the fan-proof interlock to `cool-2stage-safeties` cost frames on the
Wiresheet tab, and the split is not where you would guess. Same-machine A/B
via `npm run perf-profile --only=ddc-workbench-fcu-wiresheet --reps=5`,
control (`signal-scaling`) steady at 59.6–60.2 fps throughout:

| variant | blocks | canvas h | fps |
|---|---|---|---|
| `origin/main` | 32 | 480 | **53.3** |
| branch blocks, canvas unchanged | 34 | 480 | 48.8 |
| branch, canvas as shipped | 34 | 540 | **46.3** |
| branch, first draft | 34 | 560 | 42.7 |

So ~4.5 fps is the two extra blocks and three extra wires — unavoidable, the
interlock *is* those blocks — and the rest is **canvas height alone, with the
sheet's contents byte-identical**. That second term is the surprise: the pane
only shows ~838×478, so the grown region is entirely off-screen, yet it still
costs. The likely mechanism is `.fbe-wire-layer`, which `fbe-editor.js`
inline-sizes to the full canvas bounds — a bigger SVG rasters bigger even
where nothing is drawn — but that was not isolated further.

Shipped at 540 rather than the 560 the first draft used: 540 is the minimum
that clears the geometry invariants (set by `sr1` at y 450 + 89.7), and the
20 px bought ~3.6 fps. The page is hidden and noindex and the Wiresheet row
was already saturated at 53 fps, so the residual ~7 fps was accepted rather
than chased into a five-block repack of column 720 at ~6 px gaps.

Worth knowing before the next sheet lands: **canvas height is not free
margin.** If a later sheet needs room, either measure the fps cost the same
way or find the space inside the existing bounds. And if someone wants the
underlying fix, sizing the wire layer to the drawn extent (or to the visible
viewport) rather than to the declared canvas is the thing to look at — it
would pay back on every sheet, not just this one.

*Correction (2026-07-30, review round):* "540 … set by `sr1` at y 450 + 89.7"
was true of the safeties sheet and false of the registry. `fan-status` seeded
at y 470 on the three unprotected sheets, and a `bi` block renders 73 px tall,
so it bottomed at **543** — three past the canvas it was declared to fit.
Nothing clipped (`.fbe-canvas` scrolls, and its `scrollHeight` measured 543),
so the only casualty was the invariant. Fixed by moving those three seeds to
y 467; `fbe-geometry.spec.js`'s layer-B `assertSheet` now measures every
block's **rendered bottom** against the declared canvas h, which is a
different claim from layer A's authored-`y` drag clamp (`h − 40`) and is the
one that catches this. Both surfaces measure clean at 540 now.

### 245. FCU scenario buttons carry `aria-pressed` but are one-shot actions, and nothing ever updates it *(noticed 2026-07-30, FCU proof sweep — in passing, not fixed; **RESOLVED 2026-08-12 · PR #538** — owner ruled for dropping the attribute; the entry was one dead selector short and its line numbers had drifted, see the resolution block)*
**Inherited by the AHU page 2026-07-30.** `html/simulators/ddc-workbench.html`'s
scenario row copies the same shape — six one-shot buttons carrying
`aria-pressed="false"` that nothing updates. Copied knowingly rather than fixed,
so the two pages stay one pattern and one fix reaches both; a lane that resolves
this should sweep both files together. The AHU's STAGE buttons are the
counter-example on the same page: they are a genuine state group and their
`aria-pressed` IS maintained by `ahuSyncControls`.


`html/simulators/ddc-workbench-fcu.html` renders each scenario button as
`<button type="button" class="copy-btn" data-preset="…" aria-pressed="false">`,
and `presetBtns` is read only to bind a click handler — no code path ever
writes `aria-pressed` on them. Two things are wrong at once:

- **It never changes.** A screen-reader user hears "not pressed" on every
  scenario button forever, including the one whose state the unit is
  currently in.
- **It should not be there at all.** `aria-pressed` marks a *toggle*. These
  are one-shot commands: clicking "Blocked condenser" writes slot 8 and sets a
  fault, it does not enter a mode the button holds. The stage buttons in the
  same panel are the genuine toggle case and they DO maintain
  `aria-pressed` + `.active` in `fcuSyncControls`, which makes the
  inconsistency visible in one screenful.

Almost certainly the right fix is to **drop the attribute** from the four
(now five) scenario buttons rather than to start maintaining it — a scenario
is not a mode, and the closest thing to "current scenario" is a derived
state no single button owns. Left alone here deliberately: this lane's five
items are physics and sequence, the buttons are pre-existing, and an a11y
semantics change on a shared `.copy-btn` idiom wants its own look at whether
other pages copied the pattern (grep `data-preset` — `refrigerant-loop.html`
uses `.rl-presets`, worth checking in the same pass).

> **Two more observations on the AHU half (2026-08-03, the pre-Phase-8
> lanes — still not fixed).** Both sharpen the entry rather than
> changing its disposition.
>
> - **The attribute is never set true, and the code path is easy to
>   confirm.** All six AHU scenario buttons render `aria-pressed="false"`
>   (`html/simulators/ddc-workbench.html:2526-2531`), and the click
>   handler that `presetBtns` is bound to
>   (`html/scripts/ddcw-ahu-unit.js:1755-1783`) seeds the plant, releases
>   the overrides, writes slot 8 and requests a render — it never touches
>   `aria-pressed`. The only `classList.toggle('active', …)` calls in
>   that file are the STAGE buttons (`:1663`) and the override toggle
>   (`:1676`), i.e. the two genuine state controls.
> - **There is a DEAD selector waiting on the state nobody maintains.**
>   `.ahu-presets .copy-btn.ahu-preset-fault.active { border-color:
>   var(--red); color: var(--red-text); }`
>   (`html/simulators/ddc-workbench.html:945`) styles a red border for an
>   "active fault preset" — and since nothing ever adds `.active` to a
>   preset button, that rule **can never paint**. It is evidence the
>   original intent WAS a held state (which would have made
>   `aria-pressed` right), abandoned halfway. So the fix has a third
>   option beside "drop the attribute" and "start maintaining it":
>   decide whether a fault preset is meant to latch visibly, and then
>   either build that state on both pages or delete the selector with
>   the attribute.

**RESOLVED 2026-08-12 · PR #538.** Owner ruling: **drop the attribute and
delete the dead selector.** A scenario is a one-shot command, not a mode —
so the third option the 2026-08-03 block opened (build the latch on both
pages) was declined, and the abandoned-halfway state went out with the
attribute that presumed it. Same call as the controller-wiring presets
(#142), whose `a11y-bundle.spec.js` test this one now sits beside.

What shipped, per page:

- **`html/simulators/ddc-workbench.html`** — `aria-pressed` off all six AHU
  scenario buttons; the `.ahu-presets .copy-btn.ahu-preset-fault.active`
  rule deleted; the `ahu-preset-fault` class dropped from the three fault
  buttons, since deleting the rule left it with no reference anywhere in the
  repo. A comment at the row pins the reasoning and names the STAGE group as
  the counter-example, so the attribute is not re-added by symmetry.
- **`html/simulators/ddc-workbench-fcu.html`** — the same on the five FCU
  scenario buttons, the `.fcu-preset-fault.active` rule and the
  `fcu-preset-fault` class.
- **`tests/a11y-bundle.spec.js`** — a guard beside the #142 one. It asserts
  the absence in both directions (no `aria-pressed` before **or** after a
  click), asserts the scenario row is non-empty so the count-zero check can
  never pass vacuously, and asserts the stage group on the same panel still
  reports `aria-pressed="true"` — the half an over-broad sweep would break.

**Untouched, deliberately:** the STAGE buttons and the override toggle on
both pages. Their `aria-pressed` *is* maintained (`ahuSyncControls` /
`fcuSyncControls`) and they are the genuine toggle case this entry always
named as the contrast.

**The sibling sweep this entry asked for.** Every `data-preset` consumer was
checked for the copied shape, and the answer is that the defect was confined
to the two workbench pages:

- **`simulators/refrigerant-loop.html` (`.rl-presets`) — NOT the same
  defect; left alone.** Its presets are a genuine latch, maintained in both
  directions: `applyPreset()` calls `clearActivePreset()` (every button to
  `false`) and then sets the clicked one `true`, and every hand move on a
  knob, stage or refrigerant calls `clearActivePreset()` again — so a
  pressed button always means "this scenario is currently loaded," which is
  exactly the held state `aria-pressed` is for. The identical `.rl-preset-*`
  `.active` selectors there are live, not dead.
- **`simulators/pid-tuner.html`** — the same maintained-latch shape, already
  pinned by the #143 test. Left alone.
- **`simulators/controller-wiring.html`** — already carries no
  `aria-pressed`; this is the #142 precedent.
- **`tools/bacnet-priority.html`** — carries no `aria-pressed`.

**Entry-vs-reality discrepancies, recorded rather than silently fixed.**
The 2026-08-03 observations block was right about the mechanism and wrong
about where to look, and it was one finding short:

- The AHU scenario buttons are at `ddc-workbench.html:2931-2936`, not
  `:2526-2531`.
- The dead selector is at `ddc-workbench.html:1035`, not `:945`.
- **The FCU carried the identical dead selector** at
  `ddc-workbench-fcu.html:553` (`.fcu-presets .copy-btn
  .fcu-preset-fault.active`) and the block names only the AHU one — even
  though the entry's own opening paragraph says a lane resolving this should
  sweep both files together. Fixed in the same pass.
- The preset click handler is at `ddcw-ahu-unit.js:~2269-2300`, not
  `:1755-1783`. The claim it was cited for holds: neither unit script ever
  writes `aria-pressed` on a preset, and the only
  `classList.toggle('active', …)` calls in either file are the stage buttons
  and the override toggle — re-verified by grep before editing, which is
  what licensed deleting the rules rather than wiring them up.

### 246. The FCU's `blocked-coil` fault names an air-side failure but the model gives it full airflow *(noticed 2026-07-30, FCU proof-sweep review — **RESOLVED 2026-07-30**, owner ruled for disposition 1)*

The FCU proof sweep renamed the second capacity fault from `airflow` to
`blocked-coil` (button "Airflow fault" → "Blocked coil"), because the belt
fault took over the name "airflow". The new name is more honest than the old
one and still not right.

**What the model does.** `airflowOn = fanCmd && fault !== 'fan-belt'`, so
under `blocked-coil` the fan runs at the commanded cfm, the proof switch
stays made, and only `capActive` goes false. The reader sees Fan 100 % · ON,
Fan Sts ON, the chevron stream running, ΔT 0.0 °F, and the verdict "No ΔT
across coil — coil blocked, not cooling".

**Why that reads wrong.** Unqualified, "blocked coil" on a fan-coil unit
reads air-side — a fouled or iced evaporator — and that failure's defining
symptom is *restricted airflow*: cfm falls, proof can drop, and the ΔT
across the air that does pass usually goes UP, not to zero. So the page
teaches the diagnostic backwards for the fault a reader will picture.

**The name that fits the physics as written** is a *condenser*-side
blockage: a blocked or fouled condenser coil drives head pressure up and
capacity to nothing while indoor airflow is untouched — exactly the model's
behaviour. A failed compressor or a metering-device fault fits the same
shape, but overlaps `low-charge`, which already occupies "energized and not
cooling".

**Three coherent dispositions, owner's call:**

1. *Qualify the name* — `blocked-condenser`, button "Blocked condenser",
   verdict naming the condenser. Smallest change, and it makes the model
   and the label agree without touching physics.
2. *Rename to the compressor-side failure* — `failed-compressor`, button
   "Compressor failed". Honest about what the model computes; the
   distinction from `low-charge` becomes a diagnostic story rather than a
   physical one.
3. *Keep the name and make the model honest* — cut cfm under
   `blocked-coil`, which reverses the ΔT direction and can drop proof. The
   biggest change, and it hands the page a second airflow fault that
   competes with the belt for the lesson the belt was added to teach.

Left unchanged in the sweep: it is a reader-facing content decision on a
page whose naming the owner rules on, and the reviewers who raised it did
not converge. The source comment in `ddcw-fcu-unit.js` no longer asserts
the field claim as fact and points here; whichever way this goes, the
verdict string, the button label, the comment, and the
`tests/ddcw-fcu-unit.spec.js` row titled "a capacity fault is NOT an
airflow fault" all move together.

**RESOLVED 2026-07-30 — owner ruled for disposition 1, and ruled the
physics untouched.** The model already computed a condenser-side failure
(heat rejection gone, indoor airflow untouched); only the label was
wrong, so nothing in `fcuUpdate` moved. What shipped:

- `html/scripts/ddcw-fcu-unit.js` — the fault key is `blocked-condenser`
  in the plant enum, the airflow-gating comment, the verdict branch and
  the `SCENARIOS` map. The `data-preset` key went `blocked` →
  `condenser`, which names the failed part the way `belt` already did.
- `html/simulators/ddc-workbench-fcu.html` — button label "Blocked coil"
  → "Blocked condenser", plus a `.ref-note` under the graphic that says
  out loud what the scenario teaches and points at the coil glyph's
  existing drill-down to `simulators/refrigerant-loop.html`.
- `tests/ddcw-fcu-unit.spec.js` — both rows that sweep the capacity
  faults, and the "a capacity fault is NOT an airflow fault" comment,
  which now records WHY the condenser is the right name: a blocked
  evaporator would restrict the air, which is exactly what that row
  proves does not happen.

**On the verdict wording.** It reads *"No ΔT across coil — air moving;
look condenser-side, off this graphic"*, deliberately naming the SIDE
rather than the part. A blocked condenser is one cause of
energized-and-not-cooling and the readings on this screen cannot separate
it from a dead compressor or a plugged metering device — `low-charge`
already sits in that same space with its own verdict. The scenario button
tells the reader what was set; the verdict tells them what the screen can
actually support, which is a direction to walk in. That is also the
lesson: the AIR side reads perfect — fan commanded, proof made, chevrons
running — and the coil is still doing nothing, so the failure is
somewhere this graphic does not draw. **The FCU graphic depicts no
condenser** (return duct, cabinet, DX coil with its compressor status
point, supply fan, supply duct, zone), which is why the verdict has to
say "off this graphic" rather than leave the reader hunting the drawing
for a part that is not on it. Note what the enumeration deliberately
includes: the compressor IS annunciated on the drawing, heat rejection is
not — so the verdict still has to point off-graphic, and the reader who
goes looking for the refrigeration circuit finds the compressor LED as
the nearest thing to it.

**Review follow-on, same day.** A verification pass measured the built
page under the preset and corrected three things the first cut got wrong:

- The `.ref-note` claimed "every reading on this screen stays good" and
  "nothing on the drawing is wrong". Measurably false — `capActive` is
  cleared with stage 2 called and the fan commanded, so `#fcu-comp-dot`
  paints `var(--red)` (its own comment calls that arm "the fault tell"),
  and the post-coil chevrons drop to `var(--text-dim)`. Both are ON the
  drawing. The note now names the real, stronger tell: the whole AIR side
  reads right while the compressor annunciator goes red — energized and
  producing nothing — and nothing else on the drawing narrows it further
  because heat rejection is not drawn. It also now names the low-charge
  scenario alongside the dead compressor, since the screen cannot
  separate any of them.
- `tests/ddc-workbench-fcu.spec.js` asserted `chevrons > 4` under the
  label "air is still drawn moving". The chevron COUNT is fixed at init
  (26 either way, measured under both `condenser` and `belt`); motion
  lives in the per-frame `transform`. The row now samples the leading
  chevron's transform twice, the idiom the idle-gate rows in the same
  file already use, and additionally pins the red compressor LED by its
  `var(--red)` token so the page's prose claim has a test behind it.
- The fault-vocabulary comment said a blocked evaporator "DRIVES ΔT UP",
  which reads backwards inside a module whose ΔT is signed negative for
  cooling — the same direction the fault it contrasts against goes. It
  now says "further negative", with the sign convention stated inline.

### 247. The FCU's `low-charge` verdict names a cause the screen cannot support, one button away from a verdict that deliberately refuses to *(noticed 2026-07-30, #246 review — pre-existing; **RESOLVED 2026-08-01**, owner ruled disposition 3)*

Measured on the built page: under `low-charge` and under
`blocked-condenser` the FCU's entire displayed state is identical. Same
chip strip (Fan Sts ON, Fan 100 %, Fan En ON, Y1 ON, Y2 ON, Cool SP
72.0 °F, Deadband 3.0 °F), same ΔT badge settling on the fan-heat offset,
same red `#fcu-comp-dot`, same greyed downstream chevrons, same chevron
motion. **The only differing surface in a full DOM sweep was the verdict
string** (and its screen-reader mirror).

Both verdicts branch on `d.fault` (`ddcw-fcu-unit.js`), which is injected
ground truth the graphic never renders — the model knows which fault was
set, the screen does not. The new `blocked-condenser` verdict is written
to respect that: it names the SIDE ("look condenser-side, off this
graphic") rather than the part, precisely because these readings cannot
narrow further. The pre-existing `low-charge` verdict beside it does the
opposite: *"No ΔT across coil — low charge, not cooling"* states a
diagnosis from readings that cannot distinguish low charge from a plugged
condenser, a dead compressor or a plugged metering device.

The asymmetry teaches, by omission, that a front-end could annunciate low
charge from these points. It is **pre-existing, not a regression from
#246** — but the #246 wording is what makes it visible, and the page's new
`.ref-note` now names the limit out loud (it says these readings cannot
separate a plugged condenser from a dead compressor *or from the
low-charge fault this panel also carries*), which is the cheap honest
patch. The verdict string itself was left alone: retuning it is a
reader-facing content decision on a page whose naming the owner rules on,
and it was outside #246's scope.

Dispositions, if the owner wants one:

1. **Leave it.** The scenario button already told the reader what was
   set, so the verdict is arguably narrating the scenario rather than
   diagnosing from the screen — and the `.ref-note` now discloses the
   limit for both.
2. **Rewrite `low-charge` to name what the screen supports**, matching
   the condenser verdict's discipline — something that reports a coil
   doing no work under a call and sends the reader to the refrigeration
   circuit. Costs the low-charge scenario its distinct verdict string,
   which is what the DOM row in `tests/ddc-workbench-fcu.spec.js` keys
   the *condenser* scenario on, so the two would need distinguishing some
   other way (the button label already differs).
3. **Split the difference** — keep a distinct string but soften the
   claim, e.g. state the symptom and offer low charge as one candidate
   rather than the finding.

Whichever way it goes, the `low-charge` verdict string and the
`.ref-note` sentence naming it move together. No spec asserts the
low-charge string today — only the condenser one is pinned — so a rewrite
would want its own DOM row rather than inheriting coverage.

**Resolved 2026-08-01 — owner ruled disposition 3.** The verdict now reads
*"No ΔT across coil — air moving; low charge is one candidate, gauges
settle it"*: the symptom is what the screen supports, charge is offered as
a candidate, and the instrument that would actually settle it is named
instead of a conclusion. It stays plainly distinct from the condenser
verdict, so the low-charge scenario keeps its one differing surface. The
page's blocked-condenser `.ref-note` moved with it — it now says why the
low-charge verdict hedges (the scenario button knows which fault was set,
the graphic does not). `tests/ddc-workbench-fcu.spec.js` gained a DOM row
that pins the new string, asserts the hedge reaches the `.sr-only` mirror
too, and compares against the condenser verdict **read live** rather than
a second copy of that literal.

One thing this did NOT reach, deliberately: the AHU carries the same
claim, at `html/scripts/ddcw-ahu-unit.js` (*"No ΔT across the machine —
low charge, not cooling"*), and it was out of this lane's scope. It is not
the identical defect — the AHU's ladder is longer and its `low-charge`
branch is not one button from a verdict that refuses to name a part — but
it is the same over-claim from the same injected `d.fault`, and the same
disposition-3 wording would fit. Worth an owner call the next time someone
is in that ladder.

### 248. The AHU mockup still carries an inline copy of the sensor-glyph CSS that graduated to `styles.css` *(noticed 2026-07-30, AHU page lane — deliberately not fixed)*

The `.ddcw-sensor*` glyph vocabulary and the `.ddcw-chip-hilite` pulse graduated
into the `DDC WORKBENCH SHELL` section of `html/styles.css` when the AHU page
landed — the trigger the block's own comment named. The copy in
`html/simulators/ddc-workbench-fcu.html` came out in the same change, so the FCU
page now reads the shared rules.

`html/simulators/ddc-workbench-ahu-mockup.html` still carries its own copy
(`:1039-1115`), which is now a **duplicate of a shared block rather than the
source of one**. It is inert — identical declarations, later in the cascade, same
result — but it is exactly the shape that drifts: a retune to the shared block
will not reach the mockup, and the next reader of the mockup will not know which
copy is authoritative.

**Not fixed on purpose.** The lane brief scoped the mockup as an archival
depiction record and said not to edit it. The removal is a two-minute change
whenever someone is in that file for another reason; note that its copy is a
SUPERSET of the FCU's old one (it added `-solid` and `-cap`), and that superset
is what graduated, so deleting the inline block loses nothing.

### 249. `fill-token-misuse`'s rendered arm attributes a colour it cannot always attribute *(noticed 2026-07-30, AHU page lane — **FIXED in the same change**, recorded for the coverage it narrows)*

The rendered arm of `tests/fill-token-misuse.spec.js` resolves every `-fill`
token to an rgb value and flags any text-bearing element whose computed `color`
(or, on SVG text, `fill`) matches one. The inference is *"this colour equals a
`-fill` token's value, therefore a `-fill` token painted it"* — and that is only
sound while the value is UNIQUE to the `-fill` family.

It is not, in dark theme. The family exists because the LIGHT small-text floor
drags `--amber` and `--heat` out of their own register (#230); in DARK both twins
ride their base and resolve identically. A legitimate `color: var(--heat)` on a
text node is then indistinguishable from the misuse — and `.status-pill.warn` is
exactly that, in shared `styles.css` chrome.

**Surfaced by the AHU page**, whose verdict pill lands in its `warn` state during
the walk. The page was reported as an offender on colour equality alone; nothing
on it reaches a `-fill` token from `color:`, and the SOURCE scan — which reads
declarations rather than resolved values, and is the authority — said so.

**Fix:** the arm now subtracts every colour a NON-`-fill` custom property also
resolves to, and scans only what is left. A light-theme floor asserts that
**every** `-fill` colour stays attributable — not merely one, which would let
per-token attribution erode silently as tokens are added or retuned; measured on
both walked consumers, survivors === tokenCount === 2. Dark may legitimately go
fully ambiguous, which is asserted as a shape rather than left to be discovered.
A separate unsubtracted set keeps the "these tokens do paint geometry here"
floor honest.

**What that narrows, honestly:** dark-theme coverage of this arm. It is not a
hole — where the twins are the same colour, using the wrong one is not an AA
regression relative to using the right one, which is the entire premise of the
split. If the tokens are ever given distinct DARK values, this filter stops
firing there on its own and coverage returns without an edit.

### 250. Neither wiresheet guard walked the AHU page, so its starter program shipped 23 buried wires through a green suite *(noticed 2026-07-30, AHU page review — **RESOLVED 2026-07-30**, same change)*

`tests/fbe-geometry.spec.js` blocks CI on a **no-burial** invariant — no wire
segment may cross a third block's interior — and enforces it for
`function-block-editor.html` and `ddc-workbench-fcu.html`. `tests/fbe-engine.spec.js`
sweeps `FCU_PROGRAMS` for graph validity. Neither named
`html/simulators/ddc-workbench.html`, so `AHU_PROGRAMS` shipped with **zero**
automated coverage.

Measured in the rendered editor, replicating the spec's own `parseSegments` /
`segmentEntersRect`: **23 segment hits over 13 wires**, against a tolerance of
zero on both existing surfaces. The sheet's own layout comment asserted the
opposite — *"Rows are hand-placed so multi-column wires clear the blocks between
their endpoints."*

**Two things were wrong, and the second is the durable one.**

1. *The layout.* Relaid out and re-measured: **0 burials, 0 non-forward, 0
   margin violations**, and the canvas shrank 1210 → 980 (the profiler's
   Wiresheet row measures height directly). Two rules from `fbe-editor.js`'s
   `wirePath` made it hand-solvable rather than guesswork, and both are now
   written into the sheet's comment: an **adjacent-column** wire is always
   clean, because the router's midpoint and both horizontal legs fall inside
   the 39px gutter; and over a longer haul the vertical run lands in a gutter
   iff the two column indices **sum to odd**. So the fix is mostly to SHORTEN
   hauls — `sep`, `zero`, `hundred`, `min-oa-pos` and the `fan-status` proof
   moved out of column 0 to sit beside the blocks that read them, which is the
   FCU's own habit (`hundred` and `low` at x 895, `fanon` at x 720), not a new
   idea.
2. *The guard's reach.* `SURFACES` gained a `url` field and layer B now loops
   over the workbench pages off that table instead of hard-coding one page —
   the specific reason a `SURFACES` row alone was not enough, and the shape
   that stops the next workbench from being registered and still unmeasured.
   `fbe-engine.spec.js` gained a matching `AHU_PROGRAMS` arm.

The engine sweep goes green on registration and catches nothing today (43
blocks, all types registered; 51 wires, no dangling endpoint, no pin-kind
mismatch, no input driven twice). It is worth having anyway — it is the arm
that would catch a hand-edit to the literal.

### 251. `#227(b)`'s FCU half landed a lane late, and the ruling's "one change across both pages" nearly became two divergent ones *(noticed 2026-07-30, AHU page review — **RESOLVED 2026-07-30**, same change)*

The 2026-07-28 ruling on #227(b) is explicit: `role="img"` stays, the activation
affordance moves to real HTML buttons outside the SVG, **"one change across both
pages, rather than two divergent ones,"** and *"the stale in-file comment on the
FCU page ('the education idiom') is corrected there, in that lane, with the rest
of it."*

The AHU page shipped its half; the FCU page did not. It kept three
`tabindex="0" role="button"` sensor groups inside a `role="img"` SVG and the
stale comment, while its build report recorded the item as implemented. Two
pages under one ruling, in opposite shapes, is exactly what the ruling was
worded to prevent.

**Fixed in the same change**, and deliberately as the same edit rather than a
follow-up: the FCU's three glyphs dropped `tabindex` / `role`, its EAT / DAT /
Zone mirror cells became `.fcu-point-btn` buttons carrying `data-point` +
`aria-pressed`, and `ddcw-fcu-unit.js` wires them to the same
`host.highlightChip` hook the glyph click uses. The two keyboard specs moved
with the affordance — one now pins that nothing inside the graphic is focusable
(the assertion that HOLDS the ruling's mechanism), the other drives Enter and
Space from the mirror button.

`ddcw-shell.js`'s markup contract was the third stale surface: it prescribed
`tabindex="0" role="button"` on `.ddcw-sensor` groups. It now says focusability
is a **per-page decision** and explains why both current pages said no. The
keydown binding stays — it is inert on a node that never takes focus, and it is
what a future graphic that drops `role="img"` would use.

### 252. Chromium does not prune a `role="img"` subtree, so #227(b)'s stated mechanism does not hold in the engine the site is tested in *(noticed 2026-07-30, AHU page review — measurement only, no action taken)*

`#227(b)`'s ruling rests on a mechanism claim: *"`img` is what currently prunes
the subtree, so swapping un-hides all 19 `<text>` nodes."* Measured on the live
AHU page with CDP `Accessibility.getFullAXTree`: under the image node there are
**157 descendant AX nodes, of which only 4 are ignored — 153 are exposed**,
including `StaticText` for "SPACE TEMP", "76.1 °F", "COOLING SP", "AHU-1",
"MIXING BOX" and "FILTER". Playwright's `ariaSnapshot` agrees.

So in Chromium the drawing's text is *already* exposed on top of the long
`<desc>` and the full point mirror. The premise is falsifiable and false here.

**The DECISION is untouched and is not re-opened by this.** It is the owner's,
it is recorded as settled, and the two halves it actually delivers — a real
`<button>` announcing as an action, and no focusable node inside a
presentational-children role — stand on their own regardless of pruning. This
entry exists so the *argument* is not repeated as fact.

If the verbosity is ever worth acting on, the shape is `aria-hidden="true"` on
the drawing's text-bearing callout / well `<g>` groups (every value in them is
already in the mirror) and **never** on the `<a>` subtrees. On the AHU that is
safe as drawn — its three links carry no descendant `<text>`, only an
`aria-label` — but the FCU's links wrap "DX COIL" / "SUPPLY FAN" text and would
need excluding explicitly, or they become nameless tab stops.

### 253. Damper blades are drawn on an ellipse, so two of the three showed a position that was not the commanded one *(noticed 2026-07-31, AHU depiction review — **RESOLVED 2026-07-31**, same change)*

`setBlades()` in `html/scripts/ddcw-ahu-unit.js` draws each blade as a line
through its centre, scaling the half-extents by the open angle:

    const dx = set.openIs === 'h' ? set.hx * Math.sin(a) : set.hx * Math.cos(a);
    const dy = set.openIs === 'h' ? set.hy * Math.cos(a) : set.hy * Math.sin(a);

Scaling x and y by **different** half-extents walks an ellipse, not a circle, so
the rendered angle is `atan(tan θ · hy/hx)` and not θ. The drawing is the only
place a damper position is shown, so a depiction that cannot show it is worth
nothing — and on two of the three dampers it could not.

**Measured on the shipped build** — middle blade, angle from horizontal, at each
damper's OWN commanded position (the return rides `1 − oaFrac`, so its column
headings are not the slider's):

| damper | half-extents | 20 % open | 50 % open | 80 % open | should draw |
|---|---|---|---|---|---|
| return | 21 × 3.5 | 3.1° | **9.4°** | 27.2° | 18° / 45° / 72° |
| relief | 4.5 × 12 | 40.9° | **69.5°** | 83.1° | 18° / 45° / 72° |
| outside air | 9 × 11.5 | 75.7° | 52.0° | 22.5° | 72° / 45° / 18° |

The two vertical-flow dampers are open when their blades stand VERTICAL, so the
angle from horizontal rises with the command; the intake damper is open when its
blades lie horizontal, so its column falls. All three read 0° / 90° exactly at
the ends.

A commanded half-open return damper rendered at 9.4° is **visually
indistinguishable from shut**, and only read as more-open-than-shut past 89 %
travel. Relief skews the other way and reads wide from the first nudge. Both
ends were always exact, which is why the defect survived review: the extremes
are right and only the travel between them lies.

**The root cause on the return damper was the blade ARRANGEMENT, not the
constants.** Its three blades were stacked vertically (`cx` all 200) — the
layout for a damper in *horizontal* flow — while its flow is downward. Every
blade therefore had to span the full 42-wide opening to seal, which is what
forced `hx: 21` against `hy: 3.5` and with it a 6:1 skew. Fixing the numbers
alone would have unsealed the opening; fixing the arrangement made the honest
numbers available.

**Fix.** Both vertical-flow sets now sit **side by side across** their opening,
each chord covering its own share of the width, with **`hx === hy`** so the
drawn angle is the commanded angle by construction:

* return — `cx [186, 200, 214]`, `cy 223`, `7 × 7`: three chords of 14 tile the
  42-wide opening (179–221) edge to edge when shut, and stand 14 tall inside the
  26-tall frame when open.
* relief — `cx [298, 310, 322]`, `cy 77`, `6 × 6`: three chords of 12 tile the
  36-wide opening (292–328). Equalising at the old 9-unit spacing would have
  left 4.5 units of gap at each edge when shut — "air bypasses the damper", the
  one thing the intake damper's own comment warns against.

Re-measured after: **45.00°** at a commanded 50 % on both, linear at every step,
with residuals under 0.05° from `toFixed(2)` on the written coordinates.

**The outside-air damper was left as drawn, by owner decision.** Its `hy` is
half the blade *pitch*, which is what makes a shut stack seal the full-height
intake opening; the 7° it costs at mid-travel is a lean, not a wrong reading,
and it reads correct at every position. `tests/ddc-workbench-ahu-page.spec.js`
now **pins that deviation** rather than leaving it as an absence, so the
exemption cannot decay in either direction.

**Two things shipped alongside, both found by eye and neither about angles.**

1. *The return damper was in the wrong place.* Its frame sat at y256–282 —
   **below** the casing roof at y250, i.e. inside the unit — while the drop's
   throat runs y141 to that roof. It moved to y210–236, inside the drop. The
   `rc` chevron rail (x200, y118 → 250) now passes through the frame, so the
   recirculated air visibly goes *through* the damper instead of past where it
   was drawn. The SVG `<desc>` already claimed it "sits in the throat of that
   drop" — that sentence became true rather than needing an edit.
2. *A leader and its anchor dot are separate elements.* Moving the damper moved
   the `path.ahu-leader`, and left the `circle.ahu-anchor` stranded on the
   casing roof — silent, drawing-only, and invisible to every existing
   assertion. A new row walks **all nine** callouts and compares
   `getPointAtLength(getTotalLength())` against the dot's centre. Both new
   guards were checked against the pre-fix markup and fail on it.

### 254. `buildAnswerText` joins the correct choice to `explain` with an unconditional `". "`, so most published FAQPage answers carry a double period *(noticed 2026-07-30, the #241 review round — pre-existing and site-wide, not fixed there; **RESOLVED 2026-08-12 · PR #528** — separator made conditional, 295 of 416 → 0, resolution block at the end)*

`.eleventy.js`'s `buildAnswerText` — the helper behind the `faqPageJsonLd`
filter that `head.njk` emits on every `nav: practice` page — closes with:

    return answer + (answer && explanation ? ". " : "") + explanation;

The guard covers the *empty* case only, never the case where `answer`
already ends in terminal punctuation. Every multiple-choice question whose
correct choice is written as a full sentence therefore publishes
`…before you touch a setpoint.. Both numbers are correct…` in its
`acceptedAnswer.text`. Measured 2026-07-30 on the built site: 7 of the 11 entries on
`practice/surviving-first-months.html` and 9 of 10 on
`practice/boolean-logic-latches.html`.

Cosmetic, and only crawlers read it — but it is *published* structured
data, and the fix is one line: strip a trailing `.`/`!`/`?` from `answer`
before appending the separator, or make the separator conditional on the
last character. Left alone in the #241 PR because that PR touches one quiz
bank and this reaches every practice page's JSON-LD; it wants its own
branch and its own before/after over the built site.

*(Filed as #247 on `fix/issue-241-context-question` before PR #455 merged
its own #247 — renumbered to 248 when main was merged in, 2026-07-30, then
to 254 when PR #457 landed its own 248-253, 2026-07-31. The number is the
only thing that moved; the finding is unchanged and still unfixed.)*

**RESOLVED 2026-08-12 · PR #528.** The second option was taken — the
separator is now conditional on the answer's last character, and no answer
text is stripped or rewritten. The stripping option was the worse of the
two: it *edits published content* to work around a join, so an answer
deliberately ending in a question mark would lose it.

Re-derived over the built site rather than trusted from the 2026-07-30
numbers, and anchored at the join — recompute each `answer` from
`html/_data/quizzes/*.js`, find it in the built `acceptedAnswer.text`, and
classify what follows it:

| | before | after |
|---|---|---|
| entries with an answer + an explanation | 416 | 416 |
| **doubled terminal punctuation at the join** | **295** | **0** |
| joined `". "` (answer brought no terminal mark) | 121 | 121 |
| joined `" "` (answer already terminal) | 0 | 295 |

The 2026-07-30 spot figures above reproduce exactly on the before build (7
of 11, 9 of 10), so the entry was measuring the same thing.

Two notes for anyone re-measuring. A **naive `..` grep overcounts by one**:
`practice/modbus-decoding.html` carries `change the point map to
30001..30010` inside an explanation, a legitimate address range and not a
join artifact — which is why the instrument anchors at the join instead of
scanning the string. And **no shipped answer ends in `!` or `?`** (0 of
416), so those two arms of the fix are unexercised by current content;
they are covered anyway, and the guard below is what will keep the first
one honest.

`tests/smoke.spec.js` gained the regression guard, beside the existing
FAQPage JSON-LD test and Node-side like the sitemap-drift test at the top
of that file — nothing else could see this defect, since the banks are
source-side and the browser never renders the join. It asserts the whole
contract (a bare space after a terminal answer, `". "` after one without)
and closes with an anti-vacuity check that shipped content actually
reaches the new branch. Verified red against the old separator before
being kept.

### 255. `≥`, `≤` and `≠` are not in the bundled mono font, and the block-tag work makes them reachable *(noticed 2026-07-31, FBE block-name lane — RULED 2026-08-01: option 2 taken in the same lane; option 3 stays open as the typography lane)*

The comparator block types `ge` / `le` / `ne` label themselves `A ≥ B`, `A ≤ B`
and `A ≠ B`, and the `tag` added in this change first carried the same glyphs
into the block head as `A≥B` / `A≤B` / `A≠B` (the state this was filed on — see
the ruling below for where the tags landed). **None of those three characters
exists in the self-hosted mono face.** Verified two independent ways:

- **The cmap.** `html/assets/fonts/ibm-plex-mono-latin-600.woff2` carries **229
  codepoints, none above U+2215**. U+2265 (`≥`), U+2264 (`≤`) and U+2260 (`≠`)
  are all ABSENT — as are `Δ` (U+0394), `≈` (U+2248) and `→` (U+2192), which
  `styles.css`'s own `@font-face` comment already says come from system
  fallbacks.
- **The `unicode-range`.** Every `@font-face` in `styles.css` declares Google's
  latin subset range, whose highest math-adjacent entries are U+2000-206F,
  U+2122, U+2191, U+2193, U+2212 and U+2215. 2260 / 2264 / 2265 fall outside
  it, so the browser would not source them from that face even if the file did
  contain them. This half is the stronger fact: it holds independently of what
  is in the woff2.

They therefore render from the system monospace — a different typeface, sitting
directly beside Plex glyphs in the same three-character tag, with a different
advance (the earlier inventory measured 6.341px against Plex's 6.397px at the
head's size).

**Pre-existing, and still latent.** The current `label`s already do this, and
`ge` / `le` / `ne` are used by **zero** blocks across all 188 on the three
consumer pages — the glyphs only reach a screen when a user drags one of those
three out of the palette. Nothing regressed here; what changed is that the tag
work put the same glyphs on a second surface, so the next time someone authors a
`ge` onto a sheet it lands in two places instead of one.

Options:

1. **Leave it.** The elegant form, correct in every reader's own font stack,
   and rare enough that nobody has reported it in the editor's lifetime.
2. **ASCII the tags only** — `A>=B` / `A<=B` / `A!=B` (4 chars, one over the
   3-char comparator norm, still inside the 18-char head budget). Keeps the
   `label`s pretty, makes the *head* deterministic. Note `smoke.spec.js` and
   `fbe-wires.spec.js` match palette buttons by `label`, not `tag`, so this
   option touches no spec.
3. **Extend the subset.** Re-generate **six** woff2 files — the five Plex Mono
   weights plus `overpass-latin-var.woff2` — naming the three comparator
   codepoints (U+2265, U+2264, U+2260) explicitly in the subset, and widen the
   matching `unicode-range`s. It can pick up `Δ` (U+0394), `≈` (U+2248) and
   `→` (U+2192) in the same pass, but only if those three are named too: they
   are separate codepoints, not fallout of the comparator ones. Overpass is in
   scope because prose `Δ` renders in the body face, not the mono. The fonts
   are immutable BY NAME, so this is a rename plus a cache-bust on a file every
   page loads.

**Owner ruling, 2026-08-01: option 2**, taken in this lane — `ge` / `le` / `ne`
now tag `A>=B` / `A<=B` / `A!=B` while their `label`s keep the real glyphs. The
reasoning is scoped to the surface: the head is the one place a fallback face
lands inside a fixed pixel budget, so it gets the deterministic form; the label
sits in running palette text where a fallback costs nothing and the typographer's
glyph is the better read. `fbe-engine.js`'s comparator comment carries the
constraint, and `fbe-block-names.spec.js` pins every tag to printable ASCII, so
the next tag author cannot reintroduce the case by hand. (The option text above
predates that pin — taking option 2 turned out to be worth one spec line, not
zero.)

**Option 3 stays open** as the site-wide typography lane, unchanged by the
ruling — `Δ` / `≈` / `→` still come from system fallbacks everywhere they
appear in prose, and the comparator `label`s still do in the palette. Cosmetic
in every location.

### 256. The wiresheet inspector's form controls sit outside the TOUCH-TARGET FLOOR block *(noticed 2026-07-31, FBE block-name lane — RULED 2026-08-01: written exemption, no code change; this entry is the record)*

`styles.css`'s consolidated `TOUCH-TARGET FLOOR` block floors the form-control
family at 44px under `@media (hover: none)`: `.field input`, `.field select`,
`input.ps-input`, `select.ps-input`. The Function-Block Editor's inspector uses
none of those classes — its controls are `.fbe-insp-row input[type="number"]`,
`.fbe-insp-row select` and, as of this change, `.fbe-insp-row input[type="text"]`
(the Name field). They compute to roughly 27px tall, well under the WCAG 2.5.5
floor, on a touch device.

**Why it has never surfaced — and the gate is stronger than it first reads.**
The gate is `@media (max-width: 999px), (hover: none) and (pointer: coarse)`
(`styles.css`, the `.fbe-live { display: none }` rule near the end of the FBE
section), and that comma is an **OR**. So a touch-primary device is hidden out
of the wiresheet at ANY width, not just under 1000px — the "touch tablet in
landscape at ≥1000px gets the inspector" scenario this entry was first filed on
**cannot occur**, and `sim-desktop-only.spec.js` pins exactly that case at
1280×800. `touch-floor.spec.js`'s `hover: none` contexts (412×883, 768×1024) sit
below the width arm as well, so the inspector is `display: none` in every touch
context the suite has, twice over.

**The residual exposure is the hover-capable touch screen** — a laptop or 2-in-1
that reports `hover: hover` / `pointer: fine` from its trackpad while the user
reaches up and taps the glass. Those devices clear the gate and get 27px
controls. That is not a `.fbe-insp-*` defect: the site-wide TOUCH-TARGET FLOOR
is itself scoped `@media (hover: none)`, so **no** control anywhere on the site
is floored for that device class. Fixing it here would floor one inspector on
one hidden-ish surface while every nav link, tab and form field on every page
stayed 27–36px.

**Owner ruling, 2026-08-01: written exemption, no `styles.css` change.** This
entry IS the record — the "an exemption must be written down" posture the
contrast sweep's ALLOWLIST takes, kept in the tracker rather than duplicated as
a comment in the TOUCH-TARGET FLOOR block, since the exempting fact lives in the
`.fbe-live` gate and not in the floor rule. Revisit **only if that media query
changes**: drop the `(hover: none) and (pointer: coarse)` arm, or relax the
width arm, and the inspector becomes reachable on a touch-primary device, at
which point the one-line addition to the form-control family is the fix.

### 257. The AHU's chevron painter picks its ink in JS, and one of the five is a `-fill` token *(noticed 2026-07-31, PR #457's depiction review — raised as its fourth depiction guess and never logged at the time — **BLESSED 2026-08-01**, owner ruling: mechanism and depiction both correct, the mapping flagged for a future pass)*

`html/scripts/ddcw-ahu-unit.js:1887` — `strokeChevron(el, band)` maps the band a
chevron run is carrying to an ink by writing the token straight onto the
element:

```js
if (band === 'oa') el.style.stroke = 'var(--teal)';
else if (band === 'mixed') el.style.stroke = 'var(--blue-cool)';
else if (band === 'heat') el.style.stroke = 'var(--heat-fill)';
else if (band === 'cool') el.style.stroke = 'var(--blue)';
else el.style.stroke = 'var(--text-dim)';
```

**Five bands, five tokens** — outdoor, mixed-but-unconditioned, heated, cooled,
and the `off` grey that IS the "no ΔT" tell. `--heat-fill` (`:1890`) is the
**first and only `-fill` token written from JS anywhere in the repo**: a grep
for the `.style.<prop> = 'var(--…-fill…)'` form across `html/` and `src/`
returns exactly that one hit.

**Owner ruling, 2026-08-01: the mechanism is blessed.** JS may SELECT which
token an element gets. What it must never do is write a **resolved** colour: the
value written has to stay a `var(--x)` **reference**, because a reference is
resolved at paint and so re-resolves for free when the theme flips, while a
resolved `rgb(…)` freezes one theme's colour into an inline style that
out-specifies every stylesheet and no theme change can reach. That constraint is
what makes the pattern safe, it is invisible at the call site, and this entry is
where it is written down. **The depiction is ruled correct as well** —
`--heat-fill` is the right identity for air the heating coil has just put heat
into, and it is object paint on a stroked chevron, which is the sink the
`-fill` family exists for.

**What the guard does here — verified against the spec, not inferred.**
`tests/fill-token-misuse.spec.js` genuinely covers this reference. Three checks:

- Its `SCAN_EXT` is `new Set(['.css', '.html', '.njk', '.js'])` (`:80`), so the
  source scan **does** walk `.js` files. The file is in the walk.
- Its **third sink classifier** is exactly this idiom —
  `/\.style\.([-a-zA-Z][-a-zA-Z0-9]*)\s*=\s*(['"][^'"]*var\(\s*--[a-z0-9-]*-fill\b[^'"]*['"])/g`.
  Run over the stripped source it returns one match, `prop=stroke`, at line
  1890. `stroke` is on the object-paint list, so the reference is **classified
  and legal**, not merely unnoticed.
- The census's anti-vacuity assertion is `uses.length === references` — every
  `var(--…-fill)` reference in the tree must land in *some* classified sink or
  the test fails. This file carries exactly 1 reference and it classifies, so it
  passes on the strong arm rather than by being invisible to the scan. (For
  scale: the two AHU HTML surfaces carry 7 references each.)

The author already knew this: the comments at `:909` and `:1870` state that the
literals live inside the assignment *precisely* so that a bare `const` holding
one is never an unclassifiable reference — and the `:909` comment is
deliberately written without the token syntax it describes, so the scan cannot
read the note itself as a reference.

**Flagged, not actioned.** Candidate for a future bigger animation / refactor
pass: move the band→ink mapping out of JS into CSS classes (a `data-band`
attribute plus five rules), leaving the JS to set the band and the stylesheet to
own the colour (owner: *"may be easier to refactor during a bigger pass"*). If
that happens, **all five inks move together** — classing the `-fill` one and
leaving the other four as inline writes would split one mapping across two
mechanisms for no benefit. Nothing is wrong today; this is a shape note against
the day the animation is opened up anyway.

### 258. The FCU and AHU rosters name the same point two different ways, and the flag to log it was never logged *(noticed 2026-07-31, FBE block-name lane §7.6 — **logged retroactively 2026-08-01**, and **RESOLVED** the same day: the FCU renames)*

`html/scripts/ddcw-fcu-unit.js:526` names the fan-speed AO **`Fan`**; the AHU's
equivalent (`html/scripts/ddcw-ahu-unit.js:833`) names it **`Fan Spd`**. With
per-instance block heads shipped (PR #458), that divergence surfaces on the
wiresheet as `AO · Fan` sitting directly beside `BO · Fan En` — the AO reads as
though it lost a word. It is the odd one out among its own siblings, too: the
FCU roster runs `Fan Sts` (`:525`) / `Fan` / `Fan En` (`:527`), so the two
binaries are qualified and the analog is not.

**Owner ruling, 2026-08-01: rename the FCU roster to `Fan Spd`,** matching the
AHU. A **separate FCU lane** implements it — this is not the one-word edit it
looks like, which is why the inventory declined to do it inline: the roster
`name` also drives the chip strip and the off-program window, so the rename has
a wider blast radius than the wiresheet head and may take a spec update with it.

**Shipped 2026-08-01.** `:526` now reads `name: 'Fan Spd'`, byte-identical to
the AHU's. The blast radius was exactly as predicted and no wider: the chip
strip, the off-program window and the wiresheet block head all derive the name
from the roster, so no page or script carried a second copy to update — a grep
for a bare `Fan` literal on the FCU surface comes back empty. It did take specs
with it, eight assertions across two files that pinned the literal: the chip
key in `ddc-workbench-fcu-safeties.spec.js` and `ddc-workbench-fcu-priority.spec.js`
(exact-match keying, so `Fan Spd` stays unambiguous beside `Fan Sts`), and the
off-program entry text in both. `fbe-block-names.spec.js` needed nothing — its
anti-drift arm re-reads the roster and compares, which is the whole point of it.

**This entry is also the record that the flag existed.** The naming inventory's
§7.6 (now `docs/name-inventory.md`, committed 2026-08-01) ended *"Do not fix
this inside the naming feature… Log it; let the owner decide"* — and it was
never logged, because the inventory itself never reached git and went to a
session scratchpad instead. Both halves are closed here: the inventory is
committed, and its header carries this ruling as standing correction 2. One
citation drifted in the meantime — §7.6 cites the FCU name at `:527`, which is
now `fan-enable`; the `fan-speed` row is `:526`.

### 259. The head-ink contrast arm sampled paint that the page had not finished painting, and fast hardware is what loses *(noticed 2026-08-01, CI triage — **FIXED in the same change**, recorded for the class of trap it is)*

`tests/fbe-block-names.spec.js`'s AA arm navigates the FCU workbench, clicks the
Wiresheet tab, waits for `.fbe-block-tag` to be **visible**, and then measures
composited contrast. Playwright's visibility is a non-empty box plus
`visibility` / `display`; it says nothing about `opacity`. The measurement is a
paint measurement, so the gate and the quantity were never the same thing.

Paint is not settled there. `.tool-card` carries
`animation: fadeUp 0.5s <delay> ease both` (`html/styles.css:1188-1191`), whose
first keyframe is `opacity: 0` (`:1719`); the FCU card resolves to the `0.16s`
step, a 0.66s window from first render. Sampled inside it, the checker
composites the ink down onto its own backdrop and the ratio collapses toward
1.0 — the CI failures read `1.01 / 1.09 / 1.16 / 1.55` against a 4.5 floor, and
`1.00` exactly is the `opacity: 0` limit, where the composite returns the
background identically.

**The intuition to discard is that this is slow CI hardware.** It is the
opposite. The arm reaches the sample at ~1.7-1.9s locally — *past* the window,
green — and at ~430-930ms on a runner, *inside* it. Slower is safer; a fast
machine is what loses. Anyone who reads the ratios as a rendering-speed problem
goes looking in the wrong half of the stack, which is why this entry exists at
all rather than being a one-line commit note.

**Why the race is narrow rather than constant**, and this part was measured:
`page.click()`'s actionability check waits for bounding-box stability, and
`fadeUp` animates `translateY` alongside the opacity — so the click *already*
absorbs the fade wherever the animation is running (widened to 4s, `click()`
took 6369ms and returned 209ms after the fade ended). The only way through is
the **delay** phase, where the card sits stationary at `opacity: 0` and reads as
stable. That is a 0.16s aperture, which is exactly why it is intermittent, and
why widening the *duration* alone does not reproduce it — you have to widen the
**delay**.

**Fix:** a `HEAD_SETTLED` predicate waits for the quantity the checker actually
composites — cumulative `opacity === 1` up the sample's ancestor chain, plus no
running animation whose keyframes touch `opacity` / `color` / `backgroundColor`.
Narrowed to those three properties on purpose: the page runs an infinite
`fbe-signal-flow` wire animation, and a blanket "no running animations" wait
would hang on it. The same guard is applied to the selected-state sample. The
wait is bounded and **falls through to the measurement on timeout** rather than
throwing — a guard that aborted would be a skip wearing a failure's clothes —
and `MEASURE_HEAD` now reports the `opacity` it composited, which the arm pins
at 1, so an un-settled sample names itself instead of arriving disguised as a
contrast defect.

**Scope, measured rather than assumed:** no other arm in the file needed the
guard. The rest read `clientHeight`, `scrollWidth - clientWidth` and
`getBoundingClientRect().height`; `fadeUp` animates only `opacity` and a
`translateY`, and neither touches a layout metric or the *height* of a rect.
Sampled at effective opacity 0.030 and again at 1.0, every one of those numbers
is identical (23 / 0 / 72.97).

**The site-wide sweep already knew this, and that is the real finding.**
`contrast-sweep.spec.js` is not incidentally safe — it is deliberately safe. Its
header records the identical discovery in almost these words (*"the first run of
this walker reported ~20,000 'failures' that were nav dropdowns and reveal
animations caught in flight"*), and its `settle()` zeroes transitions and walks
`document.getAnimations()` finishing or cancelling every one before it measures.
This arm was written as that sweep's stand-in for a page the sweep cannot reach
(the workbench is hidden, so it is absent from `tests/pages.js`) and inherited
the measurement but **not the settle**. The lesson was already paid for once;
what failed was that it lived in another file's header.

**Why this arm waits instead of copying `settle()`:** force-finishing is the
right move for a one-shot page walk and the wrong one here. `a.finish()` throws
on an infinite animation, so the sweep falls back to `a.cancel()` — and this
page runs an infinite `fbe-signal-flow` wire animation while the sim is live.
The arm does not stop at one sample: it goes on to click a block and measure the
selected state, so cancelling the page's running animations mid-test changes the
thing under measurement. A sweep that is finished with the page can afford that;
an interactive arm cannot.

**The generalisation:** `toBeVisible()` is not a paint gate. Any spec measuring
a *composited* quantity — colour, contrast, effective opacity — right after a
reveal has this hole, and the reveal need not be on the element itself; here it
was six ancestors up, on shared `.tool-card` chrome that every page carries. A
new spec that measures ink immediately after a tab click, an accordion open or a
lazily-mounted widget must wait on the composited quantity, not on visibility.

### 260. The workbench shell's first editor mount resets every block's state — latches release, integrals clear *(noticed 2026-08-02, PR #468's adversarial verify — the sheet note it falsified was fixed in the same PR; the mechanism stands, on both pages)*

`ddcw-shell.js`'s lazy editor mount (the Wiresheet tab's first open) swaps
the driving graph for a fresh clone, so every stateful block re-initializes:
SR latches release, PID integrals and timer accumulators clear. Measured on
the winter-protections sheet: a machine sitting in a latched LLS trip
restarted the moment the Wiresheet tab was first opened — before any click.
Lane C's sheet note originally claimed the tripped machine "stays down
waiting for the button," which is false on exactly the first-time reader
path; the shipped note now routes the reader through opening the wiresheet
first and teaches the mechanism as the field truth it mirrors — a download
hands a software latch back cleared (the war-story-#3 family). The FCU's
*2-stage + safeties* latched low-limit carries the same trap for any future
prose that narrates a trip surviving into a first Wiresheet open.

Options if this ever wants fixing rather than routing around: preserve
per-block state across the mount clone, or pre-mount the editor at boot
(which spends the lazy mount's first-paint savings). Shared-shell change
either way — its own PR, both pages at once. Until then the working rule:
teaching prose must not depend on stateful blocks surviving the first
Wiresheet open; write the demo to enter the wiresheet first.

> **2026-08-09 — now pinned from both sides.** #275's session
> persistence (PR #496) deliberately restores block runtime state into
> the shell's graph and lets this entry's mount reset clear it; the
> round-trip row in `tests/ddc-workbench-session.spec.js` asserts BOTH
> halves (a software latch still set on the Unit tab after a return;
> released after the first Wiresheet open) with a comment citing this
> entry. A future fix here must change that row on purpose — which is
> the point.

### 261. The site nav landmark is unnamed — and the workbench pages now carry one named nav beside one bare one *(addressed 2026-08-08 · PR #485)*

`_includes/nav.njk`'s `<nav>` carries no `aria-label`. PR #470 added
`<nav aria-label="Unit">` to both workbench statusbars, so a screen
reader's landmark list on those pages now reads one named nav and one
bare "navigation" — the unnamed one being the site-wide chrome every
page shares. The fix is one attribute (`aria-label="Site"` or similar)
in `_includes/nav.njk`, but that template renders into **every page on
the site**, which makes it a live-surface, approval-gated change — not
something a hidden-page lane ships in passing. Bundle it with the next
a11y or nav pass.

**Addressed 2026-08-08 (PR #485, `11dc011`).** `_includes/nav.njk`'s
`<nav>` now carries `aria-label="Site"`, and `tests/machine-sweep.spec.js`
pins it beside the #55 nav-chrome test as the other `nav.njk`
markup-conformance check. The pin asserts the **computed accessible
name**, not the attribute — what a landmark list actually announces —
plus two invariants written to survive a rename: the name stays
non-empty, and it never matches `/navigation/i`. Measured before the fix,
the computed name was the empty string on every page.

**The two wording constraints are the reusable part, and neither is
visible in the one-attribute diff.** First, the label deliberately omits
the role word: the `nav` role already announces "navigation", so
`aria-label="Site navigation"` would be announced as *"Site navigation
navigation"* — which is why the pin forbids `/navigation/i` rather than
merely requiring a non-empty string. Second, it is **not "Main"**, the
more conventional choice, because every page also renders a `<main>`
landmark — "Main navigation" would sit beside a bare "main" in the same
landmark list, which is the exact confusion the label exists to remove.
"Site" also matches the `.site-nav` class the markup already uses. Both
constraints are pinned in a Nunjucks comment above the tag (template-only;
it does not reach output).

As of this resolution the repo has four `<nav>` landmarks and **all four
carry distinct accessible names**: "Site" (`_includes/nav.njk`, every
page), "Lesson sequence" (`layouts/page.njk`'s lesson pager), and "Unit"
on each of the two workbench statusbars
(`simulators/ddc-workbench.html` / `ddc-workbench-fcu.html`, via
`aria-labelledby` rather than `aria-label`). The durable rule is the
family shape, not the count: **every `<nav>` names what it navigates
over**, and a fifth landmark inherits that rule rather than falsifying
this paragraph.

### 262. The touch-target floor is height-only; strict WCAG 2.5.5 wants 44×44 *(noticed 2026-08-02, PR #470's adversarial verify — site-wide observation, low priority)*

The shared `TOUCH-TARGET FLOOR` block in `styles.css` and the
page-local floors modelled on it set `min-height` only. Measured on the
workbench unit-selector links under `(hover: none)`: 44px tall,
~41–42px wide. For those two links a page-local `min-width: 44px` in
the same rule closes the gap at zero live cost (hidden pages). For the
site-wide block, don't add `min-width` blindly — several of its
controls are full-width or width-constrained by layout; audit widths
per selector before extending the convention. AAA-adjacent nicety, not
an AA failure: 2.5.5 is Level AAA, and the site's stated floor
(44px + Apple HIG) has always been height-based.

> **PARTIALLY CLOSED PAGE-LOCALLY 2026-08-03 (PR #476).** The two
> workbench pages now floor both dimensions on the controls this entry
> measured: `a.ddcw-unit-link` takes `min-height: 44px; min-width: 44px`
> inside its `@media (hover: none)` block on both pages
> (`html/simulators/ddc-workbench.html:1132`,
> `html/simulators/ddc-workbench-fcu.html:628`), and the stage group's
> 43px-wide "Off" button gained a page-local width floor in the same pass
> (`.ahu-controls .copy-btn` / `.fcu-controls .copy-btn`,
> `ddc-workbench.html:971`, `ddc-workbench-fcu.html:462`). Both rules
> carry a comment naming this entry, which is what keeps them from
> reading as arbitrary. **The site-wide half is untouched and the
> per-selector width audit this entry asks for has NOT been done** — the
> `TOUCH-TARGET FLOOR` block in `styles.css` is still height-only, so
> the entry stays open for the site chrome. Note the new page-local
> rules are also the pattern to copy at graduation rather than the
> licence to extend the shared block blindly.

### 263. The ~120-line param-rail wiring block is duplicated between the two unit scripts *(noticed 2026-08-03, PR #472's lane report — duplicated BY MANDATE, logged for the graduation trigger)*

`html/scripts/ddcw-ahu-unit.js:1915-2044` and
`html/scripts/ddcw-fcu-unit.js:1243-1372` carry the same rail
wiring block — `paramToDisplay` / `paramToCanonical` / `paramSuffix` /
`railRangeAttrs` / `railHint` / `railRangeText` and the per-param
`commit` / `revert` closures with their Enter / change / Escape
bindings — differing only in how many params they walk (four on the
AHU, two on the FCU) and in the `out.*` keys they reach through. 130
lines each by line count.

**This was the deliberate choice, not an accident**, and the FCU copy
says so at `ddcw-fcu-unit.js:1239-1242`: *"Same block as the AHU page's
rail, sized to this unit's two params — duplicated per the
unit-selector precedent rather than grown into the unit-agnostic
shell."* The precedent is real — `ddcw-shell.js` is the
**unit-agnostic** layer, and a rail helper that knows about display
conversions and roster ranges is unit-shaped work that would have to be
parameterised into the shell to live there.

**What makes it a ledger item rather than a closed decision: a THIRD
unit is the graduation trigger.** Two copies can be kept in step by a
person who remembers both exist; three cannot, and every fix to this
block so far has had to land twice (the metric-clamp erosion no-op and
the Escape-while-dirty claim both did). The shape of the extraction, if
it happens: the display/canonical/suffix trio and `railHint` are
genuinely unit-independent and could move to `ddcw-shell.js` as a
`DDCWShell.createParamRail(host, roster, fields)` factory, with the
per-page `out.*` map staying in the unit. Do not do it for two.

### 264. `pointLabel(id)` and `rosterPoint(id)` are the same linear scan of `AHU_POINTS` *(noticed 2026-08-03, PR #472's lane report — collapse candidate; **RESOLVED 2026-08-11 · PR #525** — `rosterPoint` survives, `pointLabel` inlined at its one caller; the equivalence this entry states turned out NOT to be exact, and the resolution block says why)*

`html/scripts/ddcw-ahu-unit.js` declares two roster lookups that walk
the same array with the same loop:

- `rosterPoint(id)` at **`:1162`** returns the whole point object.
- `pointLabel(id)` at **`:1613`** returns `AHU_POINTS[i].name`, falling
  back to the raw `id`.

`pointLabel` is exactly `(rosterPoint(id) || {}).name || id`. Both
comments are good — each explains why it reads out of the roster rather
than hard-coding a string — which is part of the problem: two
well-documented helpers 450 lines apart look like two different jobs.

Low stakes and no bug: the arrays are 17 entries and neither runs in a
hot path (`pointLabel` is called from the override-state builder,
`rosterPoint` at wire-up and on unit toggles). The reason to collapse
them is that a **third** roster reader is the likely next step and it
will be written next to whichever one the author happens to find first.
The FCU script has `rosterPoint` (`ddcw-fcu-unit.js:708`) and no
`pointLabel`, so the collapse is AHU-local and does not cross the
duplication in #263.

**RESOLVED 2026-08-11 · PR #525.** `rosterPoint` survives as the single
roster primitive; `pointLabel` is gone. It had exactly one caller — the
override-state builder — so it was inlined there as
`const pt = rosterPoint(id)` + `pt ? pt.name : id`, matching the
`const pt = rosterPoint(pp.id)` idiom the rail wiring already used. One
`AHU_POINTS` scan now remains in the file, which is the outcome this
entry actually wanted: the next roster reader has one obvious place to
land.

**Both comments' rationale was folded into the survivor, not dropped.**
That was this entry's own complaint — two *good* comments are what made
the pair read as two jobs — so `rosterPoint`'s comment now states both
halves: the params' min/max/step and conv live on `AHU_POINTS`, the
single source the chips already read, and so does the display `name`,
which the override-state line captions itself from so a renamed point
cannot leave a stale label. The raw-id fallback keeps its own one-line
reason at the call site.

**The equivalence stated above is a paraphrase, not an identity — do not
copy it.** `pointLabel` is written above as
`(rosterPoint(id) || {}).name || id`, but that `|| id` also fires on a
roster entry whose `name` is empty, where the original returned the
empty name. Unobservable today — all 17 entries carry a truthy `name` —
and cosmetic if it ever fired, but the fix took `pt ? pt.name : id`, the
original's exact semantics, rather than shipping the paraphrase. Worth
recording because the paraphrase is the form a future reader would lift.

**The FCU twin, verified rather than assumed.** As predicted above,
`ddcw-fcu-unit.js` has `rosterPoint` and no `pointLabel`, so the
collapse stayed AHU-local and never crossed #263. The reason is
structural, not incidental: the FCU's override-state builder describes a
single zone sensor in prose, so it has no list of points to caption.

**The line numbers above are as-noticed and had drifted by fix time** —
`rosterPoint` sat at `:1533` and `pointLabel` at `:2059`, 526 lines
apart rather than the 450 recorded. The file grew between 2026-08-03 and
the fix; identification by NAME is what survived, which is the general
lesson for line-number citations in this ledger.

### 265. The rail's unit-suffix spans repaint an identical string at 10 Hz *(noticed 2026-08-03, PR #472's lane report — perf candidate, not a correctness bug)*

Every host tick, `renderUnit` unconditionally rewrites the
`aria-hidden` `u*` suffix spans beside the rail's number inputs:

- `html/scripts/ddcw-ahu-unit.js:1390-1393` — `out.uCoolSp`,
  `out.uHeatSp`, `out.uEconLock` take `tSuffix()`; `out.uDeadband`
  takes `dSuffix()`. Ids `ahu-p-cool-sp-u` / `ahu-p-heat-sp-u` /
  `ahu-p-deadband-u` / `ahu-p-econ-lockout-u` (`:992-995`).
- `html/scripts/ddcw-fcu-unit.js:818-819` — the same pattern on
  `fcu-p-cool-sp-u` / `fcu-p-deadband-u` (`:671-672`).
- `ddcw-ahu-unit.js:1576` and `ddcw-fcu-unit.js:947` write the override
  box's own unit span the same way.

The string only ever changes when the visitor toggles units, so this is
**ten writes a second of a value that changes once a session** — six
suffix sites plus two override sites. It is not the #229 family: these
nodes are `aria-hidden`, so nothing is announced, and a `textContent`
write of an identical string produces no mutation record for a
`MutationObserver` — the cost is the property write and whatever style
work Chromium does around it, not a repaint the profiler would
necessarily see.

**Why log it rather than fix it:** the correct fix is the same
signature-guard idiom `setVerdict` and `setOvrState` already use, and
this page family now has three variants of that idiom written out
longhand. The right move is one sweep that either guards these sites or
lifts a tiny `setText(el, s)` helper into `ddcw-shell.js` — worth doing
**if `npm run perf-profile` flags these pages**, and not worth a lane
of its own before then. Measure first: the gutter animation costs ~40 %
of a core on every page (the site-wide finding), so a suffix write is
unlikely to be the signal.

### 266. The mirror's button hit-area bleed overhangs its grid, and in the fullscreen cockpit that is a 5px horizontal scrollbar *(noticed 2026-08-03, PRs #473/#476 lane reports — pre-existing on the AHU, measured here, DESIGN CALL; owner decided 2026-08-10, **RESOLVED 2026-08-11 · PR #518** — it ships unscoped rather than per width regime, and the resolution block says why)*

`.ahu-point-btn` / `.fcu-point-btn` widen their hit area with
`padding: 0.15rem 0.3rem; margin: -0.15rem -0.3rem`
(`html/simulators/ddc-workbench.html:859`,
`html/simulators/ddc-workbench-fcu.html:247`). The negative margin is
what keeps the enlarged target from moving the text, and it works —
but when a **button** holds the last track of the `auto-fit` mirror
grid, its `-0.3rem` right bleed pokes past the grid's content box.
`.ahu-points` / `.fcu-points` then report `scrollWidth` 5px over
`clientWidth` (0.3rem = 4.8px, integer-rounded), and so does the
enclosing `#tab-unit`.

**In normal flow that overflow is invisible** — the pane is not a
scroller and the document does not widen. **In the fullscreen cockpit
it is a real horizontal scrollbar**, because `.tab-pane.active` becomes
`overflow: auto` there.

Measured on the built site at `main` @ `6fe27ec`, headless Chromium,
1px viewport steps (`documentElement` never widens in any case):

| page | fullscreen? | widths where the pane overflows 5px |
|---|---|---|
| AHU | normal | 360–681, **828 and up** (checked to 1500) |
| AHU | fullscreen | 360–607, **754 and up** (checked to 1500) |
| FCU | normal | 360–473, 610–620, 642–777 |
| FCU | fullscreen | 360–431, 568–703 |

So the **AHU cockpit shows the scrollbar at every desktop width**,
which is the pre-existing case, and the **FCU is clean above its diet
cutoff** — that half was *introduced* by the mirror diet (which made
every desktop cell a button, so a button always held the last track)
and **fixed in the same PR (#473)** by `.fcu-points { padding-right:
0.3rem; }` inside the `@media (min-width: 900px)` diet block
(`ddc-workbench-fcu.html:319`); the comment above it states the
mechanism and explicitly leaves this entry to be logged. The FCU's
remaining bands are all **below** the diet cutoff, where the mix of
plain and button cells is exactly `main`'s and a button lands in the
last track at some widths. ⚠️ Note the lane characterised those as
"odd-width cases"; the sweep above shows them as contiguous width
**bands**, not a parity effect — cite the bands.

**The decision is which fix, and it is not obvious.** `padding-right`
on the grid absorbs the bleed but shrinks every track by ~1.6px and has
to be scoped by regime (the FCU fix is scoped to its diet block for
exactly that reason). `overflow-x: clip` on the pane would hide the
bleed zone, which is invisible until hover or focus paints it — but
clipping a focus ring is its own problem. Dropping the negative margin
loses the enlarged touch target the `(hover: none)` floor depends on.
Do it once, on both pages, with the AHU as the reference (the standing
tiebreak).

**Owner decision 2026-08-10: grid `padding-right`** — absorb the bleed
inside the grid, scoped per width regime, both pages, AHU as the
reference (the FCU's above-cutoff half already ships exactly this
shape and stays). The ~1.6px-per-track cost was named and accepted;
`overflow-x: clip` was rejected for clipping focus rings, dropping the
negative margin for shrinking the touch target. Fix lane can open.

**RESOLVED 2026-08-11 · PR #518.** `padding-right: 0.3rem` on
`.ahu-points` and on `.fcu-points`, each on the grid's own base rule.
Re-measured first: the table above reproduces **exactly** at `main` @
`96fdec0`, all four rows, 1px steps 360–1500. After the fix every band
is empty in all four rows — no width in that range leaves either grid
or `#tab-unit` with a single pixel of horizontal overflow.

**It ships unscoped, and the measurement is why.** The decision said
"scoped per width regime", which the FCU's shipped half read as a rule
inside its `@media (min-width: 900px)` diet block. That scoping only
survives contact with the code above the cutoff, where the diet makes
every cell a button and the bleed is *constant*. Below it the bleed is
in the wide contiguous bands this entry already measured — 360–681 and
828 up on the AHU in flow, 360–607 and 754 up in fullscreen — and those
bands **differ between normal flow and the fullscreen cockpit**, which
is a class, not a width. No media query names them, and only a narrow
strip is ever clean, so a second query would buy back ~1.6px per track
across a sliver while doubling the places the value lives. The FCU's
diet-block declaration therefore **moved up** to `.fcu-points` rather
than being duplicated: one declaration covering both regimes cannot
drift from itself, and the diet block keeps a comment saying so. The
fix the owner chose is unchanged — this is where it sits, not what it
is.

**The accepted cost, measured rather than asserted.** The grid's
content box loses 4.8px, so each `auto-fit` column-count threshold
moves up by about that much: within a ~5px band at each threshold the
mirror wraps one column earlier than it did (12px in viewport terms in
the fullscreen cockpit, where the grid sits in a fractional column).
Nothing else moves. Above the cutoff the computed track list loses one
*collapsed* `0px` track and is otherwise identical — five sized tracks,
one row, same cell positions.

Guarded on both pages, since the pre-fix state was invisible in normal
flow and this is exactly the class of defect that ships twice: the FCU
row that used to assert the diet regime only now walks desktop and
phone width in both states, and the AHU gained its twin rows. Both pin
the EQUALITY the fix rests on — grid `padding-right` equals the
button's negative right margin — so a retune of the hit area that
leaves the grid alone reddens instead of quietly re-opening the
scrollbar at some widths and not others.

### 267. The AHU page's RENDER SCALE comment states a width the graphic never renders at, and reads its own breakpoint backwards *(noticed 2026-08-03, PR #473's lane report — pre-existing, measured, comment-only defect; **RESOLVED 2026-08-12** — comment rewritten from a re-verified measurement)*

`html/simulators/ddc-workbench.html:83-96` carries a ⚠ block that is
the page's authority on how big the drawing renders and therefore on
whether its type is legible. Two of its claims are wrong, and it is
labelled `MEASURED ON THE BUILT MOCKUP, NOT DERIVED` — so it is exactly
the kind of comment a later author trusts instead of re-measuring.

Measured on the built page at `main` @ `6fe27ec` (headless Chromium,
`.ahu-graphic` bounding box):

| viewport | layout | graphic width |
|---|---|---|
| 1180 and up | two-column | **748px** at every width checked to 1920 |
| 900–1179 | stacked | 780px (the max-width binds) |
| 800 | stacked | 684px |
| 375 | stacked | 291px |

1. **"the 840-unit viewBox renders at its 780px max-width, so 0.9286
   CSS px per unit."** Not in the two-column state, which is the
   desktop state: 748/840 = **0.8905**, so the 8px row label lands at
   **7.12** (not 7.43), the 9px callout title at **8.01** (not 8.36),
   the 11px well value at **9.80** (not 10.21). The governor there is
   not the 780px max-width at all — it is the grid column, which the
   card's own content box caps near 750px once the 240px rail and the
   1rem gap come off.
   ⚠️ **The original measurement was not wrong; the TRANSFER was.** The
   mockup page really does render 780 at every width — measured
   `.ahu-graphic` on all four of its drawings at 900 through 1920, all
   780 — because there the graphic does sit straight inside a
   `.tool-body`. The false clause is *"and this page reproduces the same
   chain"*: on the live page the graphic sits inside `.ahu-screen`,
   inside the `minmax(0, 1fr)` column of `.ahu-console` (`:104-113`),
   which is a different chain with a rail in it. This is the general
   trap worth naming — a measurement carried from the mockup has to be
   re-taken on the page that inherited it, exactly as the #242 setpoint
   ruling already found for prose.
2. **"THE BREAKPOINT IS 1179px, AND NOTE WHICH SIDE IT PROTECTS … It
   is NOT protecting the stacked state — below it the drawing is the
   same 780 wide … It protects the TWO-COLUMN state."** Backwards. The
   drawing reaches 780 **only** below the breakpoint, in the stacked
   state; the two-column state is the squeezed one, at every width.
   What the breakpoint actually does is *abandon* two-column before the
   squeeze gets worse.

**RESOLVED 2026-08-12 (the clear-the-decks queue).** The measurement
was re-taken on the day's build before rewriting — 748 at 1180/1400/
1920 (two-column), 780 at 1000, 684 at 800, 291 at 375 — identical to
this entry's 2026-08-03 table, so the rewrite states both dates. The
⚠ block now: names the mockup-vs-page chain difference outright (with
the re-measure-on-the-page-that-inherits lesson and a pointer here),
gives the two-column state its real numbers (748 → 0.8905 px/unit →
7.12 / 8.01 / 9.80) with the grid column named as the governor, keeps
the max-width's true jurisdiction (stacked only), and reads the
breakpoint the right way around — the 780 lives BELOW it. The
do-not-widen instructions survive with corrected reasoning; the
.ahu-screen padding paragraph was never in dispute and is untouched.

**Nothing renders differently because of this** — the layout is as
designed and the owner has approved it on the preview. The damage is
that the numbers a future legibility argument would be built on are
wrong in the optimistic direction, and the comment forbids the two
changes ("do not widen the rail", "do not lower this breakpoint") on a
rationale that does not hold. Fix is a re-measured comment; the
per-unit scale should be stated **per layout state**, and the phone
figure is worth adding while there (291/840 = 0.346, so an 8px label is
~2.8px — the legibility question the owner has open at the final
review). Because this is `html/simulators/ddc-workbench.html`, a
comment-only change here is merge-freely today and stops being so at
graduation.

### 268. `#ahu-desc` is 5,609 characters in a single text node *(noticed 2026-08-03, PR #473's lane report — structure candidate; the CONTENT is owner-ruled and stays)*

`html/simulators/ddc-workbench.html:1464` holds the AHU drawing's
`<desc>`: **5,609 characters / 986 words**, one text node, no internal
structure. The FCU's equivalent (`ddc-workbench-fcu.html:936`) is
**1,729 characters** — a 3.2× ratio for a machine with roughly twice
the stations.

**The length is a RULING, not a defect.** The owner settled the
describe-the-topology-fully question on trade grounds — *someone
visually impaired who is function-block programming is best served by
hearing the longer description and mapping it out in their head* — and
this drawing genuinely has nine callouts, three dampers, two coils, a
distributor, an averaging element and three probes to name. Do not
shorten it to hit a number.

**What is worth deciding is the SHAPE.** A single unbroken node gives a
screen-reader user no way to skim, re-enter, or skip a section: it is
read as one utterance, and the only navigation is start over. Options,
none free: split the drawing into nested `<g role="img">` groups each
with its own short `<desc>` (real structure, but multiplies the
accessible-name surface and interacts with the `role="img"` pruning
argument in #227b/#252); or move the long description into reflowing
HTML below the graphic and point at it, which is the direction the
point mirror already went for values. ⚠️ Two counts here have been
wrong in briefs — one said ~4,600 — so **re-derive from the built page**
(`grep`-count the `<desc>` in `_site/`) rather than citing this figure
after any edit.

### 269. The FCU point mirror carries none of the AHU's screen-reader provenance glosses *(noticed 2026-08-03, PR #474's lane report — harmonization candidate; **RESOLVED 2026-08-11 · PR #523** — the entry UNDERSTATED it, see the resolution block: the FCU has no commanded register at all, so colour was never the channel here, and one cell needed two glosses)*

The AHU mirror tags every caption with the point's KIND in an `sr-only`
span — `(measured)`, `(commanded)`, `(calculated)` — 17 of them at
`html/simulators/ddc-workbench.html:2440-2503`. That is the accessible
half of the register-colour convention: a sighted reader gets green for
commanded, blue for calculated and default ink for measured, and the
glosses are how a screen-reader user gets the same distinction, which
the depiction ruling made the general rule for this page family
(*"provenance is about what KIND of point it is"*).

`html/simulators/ddc-workbench-fcu.html`'s mirror has **zero** of them
(`grep sr-only` returns the diet comment and the verdict mirror only).
So on the FCU the colour is the only channel carrying provenance — the
exact single-channel dependency #230/#231 were about, one register down.

Straightforward under the standing "base everything off the AHU"
tiebreak, and it is small: the FCU mirror is a short list and each cell
needs one span. Left for a lane rather than done inline because #474
was already re-drawing that page and the review round is the wrong
place to grow scope. Worth pairing with #268's decision if that one
touches the accessible naming surface.

**RESOLVED 2026-08-11 · PR #523.** Every caption in
`html/simulators/ddc-workbench-fcu.html`'s mirror now carries the
AHU's `<span class="sr-only"> (kind)</span>`, same wording, same
placement — inside the caption span, after the words, ahead of the
live value so a button's accessible name stays stable across repaints.
Six cells, **seven** glosses:

| mirror cell | announced caption | kind derived from |
|---|---|---|
| `fcu-rat-r` | RAT · return (measured) | `rat`, `ai` / `sensor` |
| `fcu-dat-r` | DAT · discharge (measured) | `dat`, `ai` / `sensor` |
| `fcu-dt-r` | ΔT across coil (calculated) | arithmetic; no roster row |
| `fcu-zone-r` | Zone (measured) / setpoint (commanded) | `space-temp` `sensor` + `cooling-setpoint` `param` |
| `fcu-fan-r` | Supply fan (commanded) | `fan-enable` + `fan-speed`, actuators |
| `fcu-comp-r` | Compressor (commanded) | `y1` + `y2`, actuators |

**The entry understated the defect, and the correction matters.** It
read the FCU as having colour as its *only* provenance channel, one
register down from #230/#231. It is a step further than that: this page
has **no commanded register at all**. Its only colour is `--blue` on ΔT
(`.accent` in the mirror, `.fcu-dt-val` on the drawing) — there is no
`.is-cmd`, no green, and no colour key. `Supply fan` and `Compressor`
render in exactly the ink `RAT · return` does. So colour separates
*calculated* from everything else and stops, and a **sighted** reader
could not tell a command from a measurement here either. The gloss is
not the accessible half of an existing visual convention on this page;
it is the first channel of any kind. That also means the AHU's spec
shape does not port: its row derives the expected word from the value's
colour class, which here would pass vacuously against a class that does
not exist.

**One cell carries two glosses, because it carries two points.**
`Zone / setpoint` prints a sensed zone temperature beside the setpoint
it answers to — `sensors['space-temp']` and `params['cooling-setpoint']`
— which are different kinds. The AHU splits that pair into two rows
(`Zone temp` / `Cooling SP`) and so never had to answer the question.
One word would have been false about half the cell, so each operand
takes its own: *Zone (measured) / setpoint (commanded)*. Note the
precedent for the second word is the AHU's own — it glosses its
`Cooling SP` row, a `param`, as commanded.

**Guarded, and derived rather than restated.** A new
`tests/ddc-workbench-fcu.spec.js` describe reads the LIVE roster
(`window.DDCWFcuUnit.POINTS`, `dir`) and maps `sensor` → measured,
`actuator` / `param` → commanded; only the wiring of which roster rows
feed which mirror cell is hand-written, so a `dir` retune reddens it
with no edit to the spec and a source naming no live point fails
instead of passing. It also pins the one colour correspondence this
page does carry, both ways — `.accent` is `fcu-dt-r` and nothing else,
`(calculated)` is `fcu-dt-r` and nothing else — plus a row asserting
the glosses take no layout space, which is what would catch a caption
that lost the `.sr-only` class.

**Two cites in this entry went stale before it was worked.** The AHU's
glosses are **16**, not 17, and after the fold-widening restructure
(PR #520) they sit at `html/simulators/ddc-workbench.html:2720-2783`,
not `:2440-2503`. Counted and located at fix time.

### 270. FCU collision-detector baseline: three em-box grazes against the cabinet outline are visually clean *(noticed 2026-08-03, PR #474's lane report — RECORDED AS BASELINE, no action)*

The browser-side text-bbox-versus-stroke detector reports three
overlaps on the FCU graphic that are **false positives**, and they are
recorded here so a future sweep reads them as the baseline instead of
as a regression it introduced.

All three are the same mechanism: the detector measures an **em box**,
which is taller than the ink, against a 2px-wide stroke.

- `DX COIL` (`html/simulators/ddc-workbench-fcu.html:1032`, baseline
  y=356, 11px) and `SUPPLY FAN` (`:1049`, baseline y=356, 11px) versus
  the cabinet FLOOR at y=345 — the outline is one path
  (`:1019`, `stroke-width="2"`, so the stroke occupies 344–346). Both
  captions sit below the floor by design; their em-box tops land ~1–2
  units clear of the stroke, inside the detector's tolerance.
- `#fcu-fan-v` (`:1050`, baseline y=248, `.fcu-pt-cap` at 8px) versus
  the cabinet TOP WALL at y=250 (stroke 249–251) — the caption's
  descender REGION reaches the stroke; no descending glyph in the
  rendered string does.

**Do not "fix" these by moving the labels** — the positions are the
approved depiction, and the memory note on this technique already says
the detector and a vision review each catch what the other misses.
What to do instead when a sweep reports them: confirm the count is
still three and the elements are still these, and move on. A **fourth**
graze, or one of these growing past the stroke, is the signal.

### 271. The illustrative block-head examples in shared code and the README name heads no sheet renders any more *(noticed 2026-08-03, PR #475's rename lane — cosmetic, and it must ride a version bump; **RESOLVED 2026-08-04** — all five sites renamed to heads real sheets render, riding the Phase 8 graduation PR's 3.80.0 bump exactly as prescribed)*

The name pass replaced the `Y1 …` derived-stage family with `Stg 1 …` /
`Stg 2 …` across the sheets that carry it. Five comments and one README
sentence still teach the `TAG · Name` idiom using the retired names:

- `html/styles.css:4368` — *"`TAG · Name` ("SR · Y1 Latch")"*
- `html/scripts/fbe-engine.js:37` — *"('Y1 Latch', 'Cool SP', 'OAT')"*
- `html/scripts/fbe-engine.js:127` — *"('Y1 Latch', 'Trip Latch')"*
- `html/scripts/fbe-editor.js:232` — *"('AI · OAT', 'SR · Y1 Latch')"*
- `README.md:378` — *"its head reads `TAG · Name` — `A>B · Y1 Set`"*

Verified against the tree: `Y1 Latch` and `Y1 Set` now appear nowhere
except these five sites and `docs/name-inventory.md`, which is the
naming RECORD and correctly keeps the historical rows.

**Why it is not already fixed.** Three of those five files —
`styles.css`, `fbe-engine.js`, `fbe-editor.js` — are live-page surfaces
and cache-busted by the `?v=` query the templates append, so touching
them is a *needs-approval* change whose bytes only reach returning
visitors after a `package.json` version bump. The rename PR carried no
bump (every page it changed is hidden), so a comment-only edit there
would have shipped a stale-cache asset for no reader benefit.
**Fold these into the next PR that bumps the version for its own
reasons** — Phase 8's graduation bump is the obvious candidate. The
README line is merge-freely and could go earlier, but shipping one of
six is how a sweep gets forgotten.

### 272. The shared fullscreen button is absolutely positioned over the card title, and the responsive sweep is structurally blind to it *(noticed 2026-08-03, PR #476's mobile lane — the two workbench pages each fixed it PAGE-LOCALLY; owner ruled 2026-08-12, **RESOLVED 2026-08-12 · PR #549** — shared `:has()`-scoped rule in `styles.css`, both page-local copies gone, plus the overlap spec; and the entry's two measurements had gone stale, see the resolution block)*

`.tool-card-fullscreen-btn` is `position: absolute; top: 0.55rem;
right: 0.55rem; z-index: 2` in `html/styles.css:1869-1889`, anchored on
the `.tool-card` (`:1177`). Nothing in the shared stylesheet reserves
its footprint, so where the card's title row is long enough to reach
the corner the button **paints over the title text**. Measured on the
AHU workbench before the fix: **18px of the AIR HANDLER tag covered at
a 375px viewport**, gone by ≈400px.

**Why no live page shows it today, and why that is luck rather than
design.** All four live consumers wear the `.fs-desktop-only` modifier,
which hides the button below 1000px (`styles.css:1898-1900`):
`html/tools/psychrometric-chart.html:196`,
`html/simulators/refrigerant-loop.html:457`,
`html/simulators/hydronic-loop-builder.html:279`,
`html/simulators/function-block-editor.html:20`. The two workbench
pages are the first to keep the button at phone widths — deliberately,
since the Unit tab is now the mobile surface — and each carries its own
copy of the clearance rule
(`@media (max-width: 480px) { .tool-card-header { padding-right:
8.5rem; } .tool-card-title { flex-wrap: wrap; } }` at
`ddc-workbench.html:72` and `ddc-workbench-fcu.html:38`), with a
comment noting the duplication and naming the unit-selector block's
graduation trigger as its own.

⚠️ **`responsive.spec.js` cannot catch this, in principle.** Its 375px
arm asserts that nothing scrolls or clips sideways
(`tests/responsive.spec.js:57-68`); an absolutely positioned element
painting over text produces **no overflow at all**, so the check is not
weak here, it is measuring a different property. A page that keeps the
fullscreen button at phone width and grows its title by one word
regresses silently, on any page in the manifest.

**The decision:** whether the clearance belongs in `styles.css` beside
the button — where it would be one rule for every future consumer, at
the cost of reserving 8.5rem of header on cards whose titles are short
— or stays page-local per consumer. The workbench pages' graduation is
the natural trigger to settle it, since that is when the duplicated
rule stops being invisible to the live site. Either way it is worth a
spec that measures **overlap** rather than overflow for the
title-versus-button pair.

**RESOLVED 2026-08-12 · PR #549.** The owner took the `styles.css`
branch of the design call. The clearance is one rule beside the button
block, and the scope is the whole point:

```css
@media (max-width: 480px) {
    .tool-card:has(.tool-card-fullscreen-btn:not(.fs-desktop-only)) .tool-card-header {
        padding-right: 8.5rem;
    }
    .tool-card:has(.tool-card-fullscreen-btn:not(.fs-desktop-only)) .tool-card-title {
        flex-wrap: wrap;
    }
}
```

The entry framed the cost as "reserving 8.5rem of header on cards whose
titles are short." `:not(.fs-desktop-only)` is what retires that cost
rather than accepting it: the four `.fs-desktop-only` consumers hide the
button at every width ≤999px, so they must not pay, and the `:not()` is
coupled to the hide rule directly above it in the file. Only a button
that SURVIVES to phone width buys a reservation — which today is the two
workbench pages and, automatically, any future page that keeps one. Both
halves move together, since the title is a nowrap flex row and the
padding alone would only slide the tag beneath the button.

**The entry's measurements had gone stale, and the discrepancy is worth
recording.** Re-measured at 375 with the rule disabled: the AHU's
`Air handler` tag runs **8.7px** under the button (entry: 18px) and the
FCU's `Air-side` clears by **11.4px** (entry: 2px). Both strings were
reworded after 2026-08-03. The *shape* of the finding survived intact —
the AHU collides, the FCU clears narrowly — so both pages still pay;
11.4px is one root-font bump from a collision. Identical under touch
emulation, where the TOUCH-TARGET FLOOR grows the button 31.2 → 44px: it
grows DOWNWARD, so the horizontal story is unchanged.

**Two overlap specs already existed, and the entry did not know it.**
Its closing sentence reads as though nothing measured overlap, but
`ddc-workbench-ahu-page.spec.js` and `ddc-workbench-fcu.spec.js` each
carried a `the fullscreen button does not paint over the title tag` row.
Both had the same hole: they measured only `.tool-tag`, and **a
`display: none` button has a zero rect, which intersects nothing** — so
either would have passed vacuously the moment the button was hidden,
which is precisely what `.fs-desktop-only` does. Both are removed as
superseded by `tests/fullscreen-btn-overlap.spec.js`, which leads with
anti-vacuity rows (button not `display:none`, real width and height,
title text actually painted, and the button still spanning the header
band), measures `Range`s over **text nodes** rather than the title's
element box (the reserved padding shrinks that box, so it can clear the
button while a wrapped glyph still sits under it), and adds the arm
neither page-local spec could have: a `.fs-desktop-only` card hides its
button and reserves nothing. The overlap assertion fires BEFORE the
padding assertion on purpose — a source-level proxy firing first masks
the reader-facing symptom.

**Falsified once.** With the shared rule neutered in-tree, the AHU row
went red on the overlap assertion itself, naming the colliding rect; the
FCU row went red on the mechanism assertion, since its tag clears the
button unaided. The `.fs-desktop-only` arm stayed green throughout,
which is what proves it measures the other branch.

`responsive.spec.js` is untouched — the entry's ⚠ is right that it
cannot be made to catch this, since it measures overflow and there is
none.

### 273. The forced-sensor marker CSS is duplicated per page under page-prefixed classes *(noticed 2026-08-04, the Phase 8 graduation lane — deferred at graduation, wants a `.ddcw-forced-mark` rename)*

The dashed accent ring that marks a forced sensor glyph is one drawn
idea with two page-local copies: `.ahu-forced-mark`
(`html/simulators/ddc-workbench.html`, the rects in the AHU SVG) and
`.fcu-forced-mark` (`html/simulators/ddc-workbench-fcu.html`), each
with its own head CSS. The graduation pass (Phase 8, 2026-08-04)
promoted the two verbatim-duplicated head blocks (the unit selector
and `p.ddcw-sheet-mobile-note`) into `styles.css`'s DDC WORKBENCH
SHELL section, but deliberately left this pair: the class names are
page-prefixed, so the shared-sheet form is not a move but a RENAME —
`.ddcw-forced-mark` across both SVGs' rects, both head blocks, and
`tests/ddc-workbench-fcu-sensors.spec.js:248/:257`, which pins the
FCU's class by name. Mechanical, small, and behaviour-preserving, but
a rename across two SVGs and a spec did not belong in the go-live
diff. The header-clearance pair the graduation also left in place is
NOT this item — its selectors are site-wide (`.tool-card-header` /
`.tool-card-title`), so its dedup is #272's open design call.

### 274. The simulators landing crossed its own chips threshold at nine cards *(noticed 2026-08-04, the Phase 8 graduation lane — DESIGN CALL, deliberately not decided at go-live; owner decided the taxonomy 2026-08-10, **RESOLVED 2026-08-11 · PR #519** — resolution block at the end, chip LABELS signed off by the owner 2026-08-12)*

CLAUDE.md's Design landmarks row says the Simulators landing is "the
same grid minus chips — add chips back if it grows past ~6 entries."
The workbench graduation took the grid from seven cards to nine
without adding chips, and the skip was deliberate: unlike Tools /
Education / Practice, the simulators have no category taxonomy to
chip by — inventing one (air-side / hydronic / electrical? by
equipment? by teaching chapter?) is a naming-and-grouping design
call, not a mechanical step, and did not belong in the go-live diff.
Decide the taxonomy (or raise the documented threshold) and the chips
are the same pattern the other landings already use.

**Owner decision 2026-08-10: activity-based taxonomy** — bucket by
what the tech is doing, along the lines of *Panel & Wiring*
(Controller Wiring, Mock VFD) · *Programming & Logic* (Function-Block
Editor, PID Tuner, Staging Sequencer) · *Equipment & Systems* (both
Workbenches, Hydronic Loop, Refrigerant Loop). Final chip labels are
proposed in the fix PR for his review; CLAUDE.md's "grid minus chips"
Design-landmarks row updates in the same PR. Fix lane can open.

**Resolution (PR #519).** The decided taxonomy, shipped as the chip row
the other three landings already run — no new pattern, no new CSS.
`html/simulators/index.html` grew a `p.chip-row-preamble` ("Filter by
activity:"), a four-button `.filter-chips` row, a `category` on each of
the nine `navCard()` calls, and the same hash-routing IIFE
tools/education/practice carry verbatim. Labels as shipped — signed
off by the owner 2026-08-12, reviewed with the PR #519 approval:
**Panel & Wiring** (2 — Mock VFD, Controller Wiring) · **Programming &
Logic** (3 — PID Tuner, Function-Block Editor, Staging Sequencer) ·
**Equipment & Systems** (4 — both Workbenches, Hydronic Loop Builder,
Refrigerant Loop). Slugs are the kebab-case labels, so the routes are
`/simulators/#panel-wiring` and friends.

**Chips are page-local, and that was a decision, not an omission.** The
entry is silent on the nav dropdown, so the categories live only in the
landing's `navCard()` calls: simulators still have no `NAV_CATEGORIES`
entry, the dropdown still renders flat, and no page gained a `category`
frontmatter. Consequence worth knowing — `navCategoryGuard` never
reaches this section, so **the build cannot catch a tenth simulator
added with no category**. The guard that does is
`landing-chip-counts.spec.js`, which this PR extended with a simulators
arm; unlike practice there is no chip-less bucket here, so it demands
the chips partition the grid exactly and a categoryless card fails it.

**One consumer was coupled; two more were checked and needed nothing.**
`link-integrity.spec.js`'s chip-landing floor is an EXACT `toBe(3)` —
deliberately exact, per its own header, so a `.filter-chip` rename
can't hollow the hash-route allowlist — and a fourth chip landing
fails it. Now `toBe(4)`, header updated with it.
`home-hero.spec.js` needed **no** change: it reads `/simulators/` for
the Browse pill's `.nav-card` count only and never touches its chips,
and `.count()` matches hidden cards, so a hash-filtered arrival cannot
skew it. `README.md` needed none either — its Simulators tour lists the
sims but never describes the landing's shape.

### 275. The DDC Workbench holds its whole simulation in memory, and its own flagship navigation model navigates away from it *(noticed 2026-08-08 — **RESOLVED 2026-08-09 · PR #496 (v3.83.0)**, owner-designed and shipped the same day; resolution block at the end; the sheet-note linking pass is unblocked — 2026-08-10: that pass now runs as the collapse half of the glossary arc's pilot under `docs/glossary-arc.md`'s constraints, not standalone)*

**The defect.** Both workbench pages discard every bit of simulation
state on any navigation away, and the arc's chosen way to move around
the sim *is* a navigation. A reader who spends ten minutes building a
situation — forcing a sensor, taking a point off program, loading the
low-limits sheet, dragging the weather and load knobs, waiting for the
zone to integrate somewhere interesting — and then clicks the DX coil
to see the refrigerant loop behind it comes back to a pristine unit.
Nothing warns them on the way out and nothing tells them on the way
back that it happened: a grep of both pages for reader-facing copy
about reloading, resetting or returning finds none.

**Mechanism — there is no persistence layer to have a bug in.** Every
script either page loads (`ddcw-shell.js`, `ddcw-ahu-unit.js`,
`ddcw-fcu-unit.js`, plus the shared `fbe-engine.js` / `fbe-editor.js` /
`point-arbitration.js` / `psychro-engine.js` / `ui.js`) and both pages'
own inline assembly IIFEs contain **zero** references to
`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`,
`history.pushState` / `replaceState`, `location.hash` or
`URLSearchParams`. The state lives in the `createWorkbench` closure
(`ddcw-shell.js:266-286`) and in the `plant` object the unit's
`createPlant()` returns; the init sequence at `ddcw-shell.js:624-641`
constructs both fresh on every load, and nothing serialises either.

**What resets to arrival — shell state:**

- **The priority arrays.** One `PriorityArray` per actuator point,
  rebuilt at `ddcw-shell.js:629-631`, taking every slot-8 (Manual
  Operator) hand command with them, along with the off-program window
  that lists them.
- **The running program.** `programKey = unit.defaultProgram`
  (`:635`) then `graph = FBE.makeGraph(programs[programKey])` (`:640`)
  — the AHU's `econ-2stage` and the FCU's `cool-2stage`. A reader who
  switched to the low-limits sheet, or edited one into `custom`, gets
  the starter back; blocks dropped, wires drawn, inspector edits and
  block names existed only in that graph object.
- **The parameter rail.** `host.writeParam` (`:680-687`) writes
  `blk.params.value` on the running graph's const block and
  `plant.params` is a per-tick mirror of it, so the rail's setpoints,
  deadband, minimum OA position and economizer lockout are graph
  state and go back to the authored literals with it.
- **The sim clock.** `simSpeed` back to `unit.speedDefault` — 20× on
  both units (`ddcw-ahu-unit.js:898`, `ddcw-fcu-unit.js:166`).
- **The editor mount and the tab.** `editorBuilt` is false again, so a
  return lands on the Unit tab with the wiresheet unmounted; the first
  re-open then also re-runs #260's block-state reset (latches release,
  integrals clear).

**…and plant state** (`ddcw-ahu-unit.js:210-303`, FCU `:187-266`):

- **The integrated zone temperature** `zoneT` and everything downstream
  of it — `coilLeaveT`'s lag, `proof.made` / `proof.elapsed` (so the
  airflow-proof make delay at `ddcw-ahu-unit.js:206` runs again from
  zero), the FCU's latched DAT low-limit annunciator
  (`ddcw-fcu-unit.js:263`), and `simSec`, the accumulated sim-second
  counter.
- **The staged scenario.** `conditions.fault` back to `'none'`, so a
  staged low charge, broken belt or blocked condenser clears.
- **Every forced sensor.** All `active` flags in the `override` map
  false again — the AHU's entries for `space-temp` / `rat` / `oat` /
  `mat` / `dat` and the FCU's for `space-temp` / `rat` / `dat`. Lying
  to the sequence through a sensor is a headline teaching affordance
  on both pages.
- **The commissioning knobs** — outdoor-air temperature and internal
  gain, back to each unit's `T_OA_DEF` / `Q_INT_DEF` (80 °F on both;
  8000 Btu/h on the AHU, 3000 on the FCU). On the AHU they are plant
  fields (`oaT` / `qInternal`, `:258-259`); on the FCU they are
  module-level `let`s (`ddcw-fcu-unit.js:183-184`), which is the same
  loss by another route, since a fresh document re-evaluates the
  module.

**What survives:** the two site-wide chrome preferences that own their
own localStorage keys — `cf_theme` (`theme.js`) and the units choice
(`units.js`). A returning reader keeps their theme and their °C. That
is the whole list; nothing about the simulation is in it.

**Measured 2026-08-08**, Playwright against the built site. On arrival
the off-program window is empty, the verdict reads *"Mechanical cooling
— clear ΔT across the machine"* and the chips read RAT 76.0 / OAT 80.0
/ Zone 76.0 °F. After clicking the **Broken belt** preset, the window
lists the AHU's actuator points each commanded by slot 8, the verdict
reads *"Fan commanded on but no air moving — a coil is loaded on dead
air"* and OAT has moved to 85.0 with the zone drifting to 78.2. After
clicking the in-graphic VFD link and pressing Back: empty window,
arrival verdict, arrival chips — indistinguishable from a cold load in
the same run.

**One caveat on that Back, and it is a real one.** The browser's
back/forward cache would restore the whole JS heap on a history
navigation, and this harness cannot see it either way: Playwright
launches Chromium with `--disable-back-forward-cache`
(`node_modules/playwright-core/lib/server/chromium/chromiumSwitches.js:59`),
and with the flag removed a trivial two-page control in the same
harness still reported `pageshow.persisted === false`. So read the
measurement as *every fresh load reboots* — proven, and that covers the
site nav, the command palette, the `← All simulators` back-link, the
AHU↔FCU unit selector, a typed URL and a shared link — with the Back
path unmeasured. Even a bfcache hit would not settle this: it is a
browser heuristic subject to eviction and memory pressure, it varies
across engines, and it covers exactly one of the return paths.

**Why this is architecture and not a papercut.** The navigation model
that destroys the state is the one the arc deliberately chose.
`docs/air-side-sim.md:21-24` puts it in the north star: *"**Hub of sims
('walk up to the unit')** — components on the graphic drill into
device-level sims (fan → VFD sim, DX coil → heat-pump sim), which
unifies the existing sims and gives future ones a front door."* The
2026-07-21 live-look ruling then removed the competing UI in its
favour (`:755-760`): *"**Remove the drill-down tiles below the
graphic** … **Keep the in-graphic component-click** 'walk up to the
unit' (owner, 2026-07-21): the sub-sims live IN THE UNIT,
**keyboard-reachable**, a small delight to discover when inspecting a
component."* (the source italicises *in the unit*; flattened here so
the outer quote's emphasis does not close early.) Those clicks are
live today and pinned as a feature:
`tests/ddc-workbench-ahu-page.spec.js:1787-1807` walks `.ahu-svg
a[href]` and asserts the drawing "still carries its three drill-downs"
(hydronic-loop-builder, refrigerant-loop, vfd-mock), and
`tests/ddc-workbench-fcu.spec.js:916-936` asserts the FCU's two
(refrigerant-loop, vfd-mock). Both specs additionally require an HTML
**twin** outside the drawing for each one — a WCAG 2.5.5/2.5.8
equivalent-control pass — so every drill-down is reachable two ways,
and both ways detonate the same state.

The shell says out loud what is being thrown away. `ddcw-shell.js:280-285`,
on the priority arrays: *"Deliberately NEVER reset on program switch,
editor Reset, or Clear: a priority array lives on the POINT, not in the
program, so a slot-8 hand value survives a program download exactly as
it does in the field. That persistence IS the lesson this page teaches
(the months-old stale override)."* The arrays survive every in-page
event the shell knows about, and then a click on the fan glyph — the
affordance the page advertises — discards them.

**A second surface makes it worse, and is currently blocked by this.**
The wiresheet sheet notes are long and nearly unlinked. Measured
2026-08-08 against the built `_site` (words and `<a href=` counted
inside `<p>` elements): the AHU's `p.ddcw-sheet-note` paragraphs run
**1,253 words carrying one inline link**; the FCU's run **638 words,
also one link**; taken as whole panes, `#tab-wiresheet` is 1,332 words
/ 1 link on the AHU and 717 / 1 on the FCU. For scale, the paragraphs
inside `<main>` on `education/status-and-proof.html` — a lesson of
comparable length — run 1,745 words carrying **eight** inline links,
about one per 218 words, and the AHU's own Unit-tab prose sits at one
per 222. The obvious remedy for over-long sheet notes is a linking
pass that hands the background off to the lessons that already cover
it. Every link that pass adds is another way to leave mid-experiment,
so the two problems are coupled: **fixing the prose length makes the
state loss worse until the state loss is answered.**

**Unresolved — this needs a design decision, and none of the following
is a recommendation.** The axes, laid out so the call can be made
rather than drifted into:

1. **What is worth persisting at all.** "All of it" is not obviously
   right. The priority arrays, the loaded/edited sheet and the forced
   sensors are the reader's *work*; the integrated zone temperature,
   the proof timer and the sim-second counter are a *running physical
   state* that is arguably stale the moment attention leaves. A
   restored plant resumed from a five-minute-old integration is its own
   kind of lie, and the sim's whole claim is that it does not lie.
2. **Where it would live.** `sessionStorage` (per-tab, dies with the
   tab, needs a serialisation format for the FBE graph and the plant);
   URL state (shareable and deep-linkable, but a graph plus a plant is
   far past what belongs in a query string); or no storage at all
   because the drill-down stops navigating — an overlay or dialog that
   mounts the sub-sim beside a still-running workbench, in which case
   nothing needs persisting and the problem dissolves. Note the storage
   options drag in the privacy-policy convention: `privacy.html`'s
   on-device-storage paragraph reads as exhaustive, and a workbench key
   would have to land in the same PR.
3. **What a returning reader should see.** Land back in their
   configuration silently; land back in it with a restored-state
   annunciation; or reset with an explicit notice that it reset (today
   it is that last one, minus the notice). This one has teeth beyond
   UX politeness: the page exists partly to teach *state you did not
   put there* — the months-old stale override — so silently restoring a
   forced sensor could teach that lesson by accident, to a reader who
   has not been told a lesson is running.
4. **Whether the drill-downs should be navigations at all.** Answering
   this one can moot 1 and 2, and it is the largest change: both the
   in-SVG anchors and their spec-mandated HTML twins would move, and
   `tests/ddc-workbench-ahu-page.spec.js:1787` /
   `tests/ddc-workbench-fcu.spec.js:916` encode the current shape.
   The AHU↔FCU unit selector is the same question wearing different
   clothes — it is a plain anchor between two workbench pages
   (`ddc-workbench.html:1254-1255`,
   `ddc-workbench-fcu.html:751-752`) and loses everything too.

Related: **#260** is the in-page cousin — the first Wiresheet open
resets every stateful block — and any persistence work has to decide
whether a restored session re-enters through that same mount. Both
pages and all their scripts are LIVE since Phase 8, so anything here
needs owner approval to merge and a version bump for cache-busting.

> **RESOLVED 2026-08-09 — PR #496 (v3.83.0).** The four axes were ruled
> in one sitting (2026-08-09): full snapshot — the reader's work AND the
> running plant; **sessionStorage**, per unit, per tab
> (`cf_ddcw_ahu` / `cf_ddcw_fcu`); restore with a **quiet one-shot
> notice** carrying a Start-fresh action; navigations stay (the
> 2026-07-21 in-graphic ruling stands). Shipped the same day.
>
> The shape: `html/scripts/ddcw-session.js` snapshots on
> pagehide/visibility-hidden (zero idle cost — perf-profiled flat on
> all four workbench rows) and the init sequence hydrates a **fresh
> construction, never a partial restore**: a shape fingerprint computed
> live at both save and restore (plant keys, roster ids, program keys)
> makes any model change self-invalidating — proven in flight when PR
> #488 added `plant.lls` and `plant.oaTarget` between this design and
> its build, covered with zero edits. The sim clock freezes while away;
> a mid-ramp snapshot resumes its walk (the reader's command stands).
> Every failure path (corrupt, cross-version, storage disabled) boots
> pristine with zero console output, spec-pinned. `privacy.html`
> gained the keys in the same PR and CLAUDE.md's `cf_*` rule broadened
> to sessionStorage.
>
> **What deliberately does NOT survive:** block runtime state through
> the first Wiresheet mount — #260's mechanism, left for #260's own
> fix and now pinned from both sides by
> `tests/ddc-workbench-session.spec.js` (see the note there).
>
> **Correction to this entry's enumeration as of the fix:** the FCU
> commissioning knobs are no longer module-level `let`s at
> `ddcw-fcu-unit.js:183-184` — PR #496's first commit moved them onto
> the plant (`plant.oaT` / `plant.qInternal`), which is also where
> #278's ramp-parity work wants to build. The FCU deliberately did
> NOT gain `oaTarget` (parity without the ramp would be a second
> weather model, not symmetry — #278 owns that).

### 276. `railHint` can leave a stale-unit hint on a units flip, on both pages *(noticed 2026-08-09, the #229 planning round — LOW, event-driven cousin of the unit-suffix family; **RESOLVED 2026-08-12 · PR #541** — CLEARED, not re-rendered, and the resolution block says why the entry's parenthetical alternative is the wrong one)*

`railHint` (`html/scripts/ddcw-ahu-unit.js:1955-1970`, with the FCU's
twin per the #263 duplication mandate) writes range text carrying
numbers **and a unit suffix** into `#ahu-params-hint` /
`#fcu-params-hint` (`role="status" aria-live="polite"`,
`ddc-workbench.html:2283` / `ddc-workbench-fcu.html:1178`), then
auto-clears on a timer. A °F/°C toggle while a hint is up leaves a
stale-unit sentence on screen (and in the accessibility tree) until
the timer fires. Not the #229 family — this region is event-driven,
not 10 Hz — but it is the same suffix trap `setVerdict`'s header
warns about. Fix shape, when someone is in the file anyway: clear (or
re-render) pending hints on the shell's `unitschange` event. LOW —
worst case is one wrong-unit sentence for a few seconds after an
uncommon action.

**RESOLVED 2026-08-12 · PR #541.** Both unit scripts call
`railHint('')` from the `unitschange` listener they already had. The
call went into that existing listener rather than a second one: it
already forward-calls `railRangeAttrs`, a function declaration below it
in the same `wireControls` scope, so a forward call to `railHint` is
the file's own idiom and the rail's whole units-flip response stays in
one place.

**The fix shape above offers "clear (or re-render)" — they are not
interchangeable, and re-rendering is the wrong one.** Only the hint's
RANGE CLAUSE is regenerable from current state. The verb is not: both
messages are past-tense reports of an edit that just happened
(*"reverted to the live value"*, *"held at the limit"*), not readouts
of anything the page currently holds. Repainting such a sentence into a
`role="status"` region on a units flip would announce a clamp nobody
performed — a phantom announcement in place of a stale one, which is
the worse of the two defects because it is not merely out of date, it
is false. Clearing also adds no state: no remembered point, no
remembered message kind, no preserved timer remainder. It brings
forward an auto-clear the code already owns.

**The line cite in the entry body had drifted** — `railHint` was at
`ddcw-ahu-unit.js:2554-2570` at fix time, not `:1955-1970`. Every other
claim held exactly, including both `role="status"` markup cites and the
FCU twin.

**Pinned in both page specs**, as *"a units flip clears the rail hint,
suffix and all (#276)"* — a twin row per the #263 duplication mandate,
since the rail logic is duplicated. Each clamps the cooling setpoint,
asserts the hint is UP in °F (the anti-vacuity half — a page that never
announced anything cannot pass), flips to metric, then reads the region
ONCE. The one-shot read is deliberate: the clear is synchronous inside
the handler, so a retrying assertion would only mask a late write, and
given enough retry budget it would race the 6 s auto-clear into a false
pass. Both rows were falsified before being trusted — with the call
stubbed out each fails on the literal defect string,
`Received: "Cool SP accepts 65.0–85.0 °F — held at the limit."`

### 277. The display-units guard cannot see a display local hidden inside a call argument *(noticed 2026-08-09, the #229 planning round — guard-coverage note, no shipped defect)*

`tests/ddcw-display-units.spec.js`'s fixpoint derivation marks every
name that carries a display value and fails any comparison with one
adjacent to the operator. A form like `Math.abs(zoneN - base) < INC`
hides the display local inside a call argument, so it slips the
matcher. No shipped code does this today, and the #229 COV work
complies by construction (it compares canonical °F from the plant,
never display locals) — logged so any future widening of the guard
starts from its measured floor rather than re-deriving it, and so a
reviewer knows a green run does not rule this shape out. Do not widen
casually: the matcher's adjacency requirement is part of what keeps
its false-positive rate at zero (see its own arrow-function
counter-case pinned at `:141`).

### 278. The FCU's weather knob still teleports — the sustained-cold ramp shipped AHU-only *(noticed 2026-08-09, the ramp ruling's scope cut — **RESOLVED 2026-08-10 · PR #506 (v3.83.2)**; the entry's trip premise was DISPROVED at fix time — correction block at the end)*

PR #488's sustained-cold ramp (the OA slider writes a target;
`plant.oaT` walks toward it at 0.5 °F/sim-s; presets snap) shipped on
the AHU only — the ruling's deliberate scope cut, not an oversight. The
FCU's OAT slider still writes instantly, and the FCU carries its own
latched DAT low-limit annunciator (`ddcw-fcu-unit.js`, the
`lowLimit.latched` field), so the same accidental-trip class exists
there with a weaker consequence — an annunciation latch, not a dead
machine. Fix shape: the same target-chase, best built AFTER
issue-275's knob-to-plant move lands (that lane moves the FCU's
module-level `tOa` / `qInternal` onto the plant, which is where the
target field wants to live). The rate constant should be shared or
identically derived — a weather model that diverges between the two
workbench pages is a #263-family drift risk.

**Premise correction, recorded at resolution (2026-08-10).** This
entry asserted the FCU carried "the same accidental-trip class with a
weaker consequence." Measured engine-direct at fix time: the OA knob
ALONE cannot latch the FCU's low limit at any slider position — at
the knob's 55 °F floor with stage 2 held on, DAT settles at 44.7 °F
against a 42 °F trip; only OA-min + zero load + a held stage reaches
the latch, ~634 sim-s in. Outdoor air reaches this machine only
through the envelope term, and the knob bottoms at 55 °F, not the
AHU's −20. So the ramp shipped for the entry's OTHER stated reason —
weather-model consistency, the #263-family drift risk — not trip
protection; the constant's comment in `ddcw-fcu-unit.js` warns
against repeating the AHU's trip story on this unit.

### 279. Every 44px touch-floor assertion has ZERO tolerance, and the box lands on the boundary — not a flake, a boundary *(noticed 2026-08-09 as an `#fcu-stage-2` flake; **re-diagnosed and RESOLVED 2026-08-10 · PR #503** when it reddened CI on a docs-only diff)*

**As first written (2026-08-09), this entry said:**
`tests/ddc-workbench-fcu.spec.js` › *"the stage buttons clear the floor
in both dimensions"* intermittently reads `#fcu-stage-2`'s height as
`43.999755859375 ≥ 44` and fails — isolated at 3 failures in 8 serial
runs of that row alone, on a tree whose only FCU-page delta was the
version string in a `?v=`-free reference (same byte length either way).
Sub-pixel line-height rounding, host-load dependent; **CI on the same
tree passed, which is the flake signature.**

**That diagnosis was wrong, and the counter-example arrived a day
later.** On 2026-08-10 a **docs-only** PR (#502, the handoff
verification) went red on
`tests/ddc-workbench-ahu-page.spec.js` › *"the unit-selector links and
the stage buttons clear the floor in both dimensions"*:
`a.ddcw-unit-link` height **43.99993896484375**, **3 of 3 attempts**
(initial plus both retries) — while the same element measured **exactly
44.0** locally on the same tree. That is the **mirror image** of the
original observation: CI red / local green, where #279 had local red /
CI green. Two elements, two pages, opposite polarity. **Host load
cannot produce that; a boundary can.**

**The mechanism.** None of these controls reaches 44px naturally — each
is pinned there by a `min-height: 44px` / `min-width: 44px` declaration
in the `TOUCH-TARGET FLOOR` block (18 such declarations). So the
measured box sits **exactly on** the number a bare
`toBeGreaterThanOrEqual(44)` demands, and the comparison carries **no
margin at all**. These specs run in `isMobile: true` contexts — that is
the point, it is what makes `(hover: none)` match — so a device-scale
factor is in play and `boundingBox()` returns through a float path that
does not always land on 44.0. The shortfall is 6×10⁻⁵ px. **Exposure
was 23 assertions across three specs**, every one of them zero-margin
by construction; the two that have bitten so far are the two that
happened to get measured on the wrong side.

**RESOLVED 2026-08-10 · PR #503.** New shared module `tests/touch-floor.js`
(`expectTouchFloor` / `expectTouchFloorHeight`) rounds the measurement to
2 dp before comparing, and all 23 assertions now call it — 18 call sites
across `touch-floor.spec.js`, `ddc-workbench-ahu-page.spec.js` and
`ddc-workbench-fcu.spec.js`. The tolerance forgives a shortfall up to
0.005px (20× the largest ever observed, 2.4×10⁻⁴) and nothing more:
43.994, 43.99, 43.5 and the 41px native unit-link all still fail, pinned
by a unit check at fix time. The twelve unlabelled assertions in
`touch-floor.spec.js` gained labels in the same pass, so a red there now
names the control.

**The two fix shapes this entry originally proposed were both wrong,
and the reasoning is worth keeping.** `≥ 43.5` gives away half a pixel
of a real accessibility floor to solve a 6×10⁻⁵ problem, and would
silently pass a control that genuinely missed. Padding the CSS floor to
45px changes real layout on ~18 control families to satisfy a
measurement artifact, reaches every live page, and 45 is not what WCAG
2.5.5 asks for. The success criterion states its floor in **CSS
pixels** — these controls *are* 44 CSS px; the sub-pixel shortfall is
an artifact of measuring through a device-pixel scale. The assertion
now encodes that, and before this it did not.

**Standing note for the next red on a touch row:** it is no longer
"this flake first." The artifact is handled, so a failure here means
the control genuinely missed the floor — read the number.

### 280. The device face is theme-constant, but its LEDs ride theme tokens *(noticed 2026-08-09, the defeat lane's contrast measurement — **RESOLVED 2026-08-10 · PR #505 (v3.83.1)**, scope grown at fix time to the FULL register: warn/alarm as recorded here, plus run/comm and the base `.led` default, all frozen at the dark values; every lit state now renders byte-identical in both themes)*

`.led--warn` / `.led--alarm` take their colour from `--amber` /
`--red`, which the light theme retunes — so the one surface ruled
constant across themes (the equipment register) shows different LED
inks per theme: warn measures 8.71:1 dark / 3.34:1 light against
`--dev-face`, alarm 5.35:1 / 3.47:1. Everything clears the 1.4.11
3:1 non-text floor, so this is a wrinkle, not a defect — but the
register's whole argument is "a device is a device," and its LEDs
currently disagree. Fix shape: `--led-warn` / `--led-alarm`
constants beside the `--dev-*` family (defined once, no theme
override) and pointing `.led--*` at them — a shared `styles.css`
change. PR #495 documented the measured pairs in the device-face CSS
header rather than reaching outside its scope.

### 281. `loadExample` races the end-of-body IIFE on the function-block editor *(noticed 2026-08-09, the #275 lane's full-suite triage — pre-existing flake with a diagnosed mechanism; **owner ruled PAGE-SIDE 2026-08-11 and RESOLVED the same day**, scope grown at fix time to a second defect with the same root — resolution block at the end)*

`tests/fbe-geometry.spec.js` › the fullscreen "proof" row intermittently
sees **5 wires where the proof example has 7** — and 5 is exactly the
BOOT sheet's wire count, so the `[data-example="proof"]` click landed
before the page's end-of-body IIFE bound the handler: the click did
nothing and the boot sheet got measured. Green in isolation (21/21,
and at `--repeat-each=3` on the exact row); it needs a loaded host to
lose the race. Fix shape: the spec waits on a bound signal (or on the
example's wire count) before clicking, or the page binds the example
buttons earlier. Until one ships, a red on that row under load is this
race FIRST — but isolate before waving off, per the standing
one-flake rule.

**Resolution (owner ruling 2026-08-11 — page-side; PR #522).** The
spec-side option was **rejected**: waiting on a bound signal papers over
a hole a visitor falls into, and the entry's own framing ("the click did
nothing") is the tell — that sentence describes a user-facing defect,
not a test-harness one. What the spec would have gained is a longer
wait; what a visitor on a slow connection would have kept is a row of
chips that look like controls and aren't.

**Two defects, one root, and the second is the worse of the pair.** The
seven chips were bare `<a data-example="…">` with **no `href` and no
`tabindex`** (`html/simulators/function-block-editor.html:70-80` as
written), handlers attached in the end-of-body IIFE:

1. *The race this entry describes.* The IIFE runs after ten
   `<script src>` fetches — eight site-wide from `layouts/page.njk`,
   then `fbe-engine.js` and `fbe-editor.js`. Until the last of them
   lands, every chip is painted, hit-testable and inert. On a loaded CI
   host that window is milliseconds; on a slow connection it is
   seconds.
2. *An anchor with no `href` is not a control at all.* It is out of the
   tab order entirely, so the row was **permanently unreachable by
   keyboard** — not intermittently, always, on the live page, since the
   editor shipped. No spec had ever pressed Tab at it. Measured before
   the fix: Tab from the preamble link walked eight stops without ever
   landing on a chip.

**What shipped.** The chips are real `<button type="button">`, and the
click path is **one delegated listener installed from the page's head
block** — before `<main>` is parsed, so there is no moment at which a
parsed chip is unbound. Until the editor exists the requested key is
queued (last one wins); the IIFE calls `window.FbeExamples.ready(fn)`
straight after `createEditor()` and the queue drains into it, once. The
per-chip `addEventListener` loop is **gone** rather than kept alongside
— a temporary binding plus a permanent one is two systems for one
control, which is the drift generator.

**`styles.css` was not touched.** `.widget-try button` and
`.widget-try button:focus-visible` already existed — seven other
`.widget-try` rows (economizers, air-handlers, VAV, building-pressure,
duct-static, air-unit-identification, and the workbench's own) have used
the button twin since #142/#143, and the CSS comment on it already read
*"new try-rows should use buttons."* The anchors here were the outlier,
not the norm. Measured at 1366 dark: every chip's `x` and `width`
unchanged to the pixel, and `color` / `font` / `border-bottom` /
`margin` / `padding` / `cursor` byte-identical. Two rendered
consequences of inline → inline-block, both matching the existing button
rows exactly (economizers measures the same 20.03px box): the dashed
underline sits ~3px lower, and a chip no longer splits mid-label across
a line wrap — *"hot-water reset"* moves to the second line whole.

**Spec side.** `fbe-geometry.spec.js` needed **no change** — its
`openSheet` already waited on the example's wire count; that wait was
what timed out when the click no-op'd, so the page was the only thing
that could fix it. Every `[data-example]` locator under `tests/` was
already attribute-only (the SVG-selector convention paying off outside
SVG), so nothing broke on the element change. Two new rows in
`fbe-editor.spec.js` cover one arm each, and **both fail against the
pre-fix page** — the pre-mount one with this entry's exact signature,
`locator resolved to 5 elements`. It reproduces the race deterministically
instead of racing for it: `page.route` holds `/scripts/fbe-editor.js` at
the network, the chip is clicked while the editor is provably absent
(`typeof window.FBEEditor === 'undefined'`), then the gate is released
and the queue drains to the seven-wire sheet.

**The standing note above is retired.** A red on that geometry row is no
longer this race — the click cannot no-op any more. Read the failure.

### 282. A spec cites the ledger by line number, and the ledger moved *(noticed 2026-08-10, the handoff verification session — comment-only defect; **RESOLVED 2026-08-12** — cites #260 by number)*

`tests/ddc-workbench-session.spec.js:442` cites
`codebase-issues.md:11589` for #260 — but #260's entry sits well over
a hundred lines further down (and moves again every time an earlier
entry gains an annotation, including in the very PR that logs this).
Line 11589 is inside a different entry (the FCU roster `Fan Spd`
rename ruling), so the citation points a reader at unrelated text. It
is the only `codebase-issues.md:<line>` citation under `tests/` — the
others live in archived `docs/audits/` files, where staleness is
expected and harmless. A hardcoded line number into an append-only,
annotated markdown file cannot survive. Fix shape: cite `#260` by
number (or by its heading text), never by line; fix it in whichever
PR next touches that spec.

**RESOLVED 2026-08-12 (the clear-the-decks queue).** The citation now
reads `codebase-issues.md #260 ("The workbench shell's first …")` —
number + heading text, no line. Comment-only diff; `node --check`
green; the entry's own prediction held (the cited line had drifted
again by fix time, to inside yet another entry).

### 283. The fullscreen cockpit's override indications don't scale — several points overridden eats real screen estate *(reported 2026-08-10 by the owner — fullscreen UX, DESIGN CALL; design round DONE 2026-08-10 late; owner ruled 2026-08-11 — T-A shipped, T-C the recorded destination — measurements, treatments and the ruling below)*

Owner report, verbatim intent: once multiple points are overridden,
the override indications take up a significant amount of screen real
estate in fullscreen. Likely mechanism (unverified — pin with
screenshots before designing): the shell-owned off-program window
(`#ddcw-offprog`, one `<li>` per point whose resolved command is not
the program's, on both workbench pages) grows a row per override —
and every scenario preset seizes all five AHU points to slot-8
Manual, so the window maxes out on the most common path into an
interesting state. The per-point amber "operator is holding
something" indications stack on top of that.

**This is a design pass, not a blind fix.** The off-program window is
teaching surface (the stale-override lesson depends on it), and the
owner builds production equipment graphics professionally — the
design round should bring him screenshots of the maxed-out state
plus 2–3 compact treatments (e.g. per-point flag/hand marker with a
summary count that expands, vs the growing list) and ask how his own
graphics show override state at density. Constraint from the COV work
(#229/#493): whatever renders must not reintroduce per-tick churn —
signature-guard any repaint.


**Design round (2026-08-10, late session).** Measured on the built
site at 1366×768: the off-program window alone grows 1 px → 154 px
when a preset seizes the AHU's five points — 29 % of the fullscreen
instrument pane (18 % at 1920×1080; FCU 118 px / −21 %) — and the
same 154 px overlays the wiresheet editor. Sharper than this entry's
hypothesis: the amber forcing chrome contributes nothing under
presets, and NO per-point override marker exists anywhere — chips,
wells and mirror render a held point identically to a following one,
so the verbose window carries the entire indication job (57 % of its
band empty at max). Three treatments were mocked in house tokens and
delivered to the owner: T-A group-by-slot (154 → ~56 px, smallest
diff), T-B summary + disclosure (→ 34 px; the live region becomes
the summary line), T-C hold-moves-onto-the-point (per-point marker,
the BAS-authentic destination, largest diff). Recommendation on
record: T-A now, T-C as the destination — pending the owner's glyph
ruling and his production-graphics conventions. Deliberately NOT
shipped under the 2026-08-10 night grant: the depiction call is his.

**Owner ruling, and T-A shipped (2026-08-11 — PR #513,
`issue-283/offprog-group-by-slot`).** He took the recommendation:
**T-A now**, and `renderOffProgram()` now emits one line per SLOT
FAMILY rather than one per point — each point as `<name> <value>`
joined by ` · `, the family's teaching tail written once, `all` only
when the family holds more than one point. Measured on the built site
at 1366×768, same method as the design round: the AHU's maxed window
**154 px → 64.63 px (−58 %)**, the FCU's **118 px → 64.63 px**, both
now a single unwrapped line, and the AHU instrument pane comes back
377 → 466 px. (The design round's ~56 px was an estimate off the
mock; the fixed chrome — label, padding, borders — is ~47 px of it,
so one line lands at 64.63 px. Reported as measured rather than tuned
to the estimate.) Nothing the per-point sentences carried is lost:
which points, which slot, at what value, how to release. Three
further calls, all his:

- **T-C remains the destination**, for a future lane — the hold moves
  onto the point (statusbar chip marker + a permanent summary line),
  because that is the workstation idiom the page is teaching.
- **The T-C marker glyph is RULED: the `@8` priority tag** — it
  teaches the array itself and generalises to `@1` / `@16`, where the
  hand glyph and the corner flag only say "someone is holding this".
  Recorded, not built.
- **One treatment everywhere** — the cockpit and normal flow render
  the same window. T-B's fullscreen-only split is dead: the two
  surfaces must never disagree about what is off program. (T-A needed
  no mode-dependent code for this, and none was added.)

Still **open**, deferred to the T-C lane: proposal Q5 — whether the
unit graphic's own wells eventually carry the hold, or override state
stays off the drawing on purpose — plus whatever Q1 production-
convention detail the marker's register needs at that point.

> **Q5 ANSWERED early (2026-08-12, the clear-the-decks decision
> batch)** — the owner ruled without waiting for the T-C lane:
> **override state stays off the drawing on purpose.** The unit
> graphic's wells never carry the hold; the statusbar chip marker
> (the ruled `@8` tag) plus the permanent summary line own the whole
> indication, matching his production-graphics convention. What the
> T-C lane still owes is only the Q1 register detail of the marker
> itself.

### 284. The FCU workbench has no observable outdoor-air truth — weather behavior is untestable from the DOM *(noticed 2026-08-10, the #278 fix lane — LOW, testability floor, deliberate design)*

The FCU roster has no `oat` point (outdoor air is a sim knob there,
not a BACnet point — deliberate), so no chip or readout shows the
outdoor-air truth and no page-driving spec can assert weather
behavior; the #278 lane split its coverage engine-direct plus a
session-snapshot read (a recorded exception to that spec's
read-off-surfaces policy). Standing floor the next weather change
hits too. Related asymmetry: `tests/ddc-workbench-session.spec.js`'s
FCU → AHU → FCU round-trip asserts only `offprog` / `program` /
`forcedValue` while the AHU side asserts more; partly covered by the
lane's new snapshot row.

### 285. The older details idioms' closed ink is measured only through a Chromium UA implementation detail *(noticed 2026-08-10, the collapse pilot's guard work — LOW)*

The contrast sweep reaches closed-`<details>` ink on the ~30
`details.tool-preamble` pages and the pid-spoiler only because
Chromium's UA shadow-slot hiding is invisible to the walker's skip
set — an implementation detail, not a contract. PR #507's `settle()`
arm removes that dependence for `details.prose-fold` ONLY;
deliberately not widened, since force-opening 30+ pages' hidden
prose could surface latent reds that are not a pilot's call. Widening
the arm (and triaging what it finds) is its own pass.

### 286. Print never reaches non-active tab panes — site-wide, pre-existing *(noticed 2026-08-10, the print-shim verification — LOW)*

`.tab-pane { display: none }` is not lifted in any `@media print`
block, so tab content off the active tab never prints anywhere on
the site. Surfaced because #507's shim opens folds for print, yet
all four folds sit inside `#tab-wiresheet` — a fold the shim opens
still cannot reach paper unless the reader prints from that tab. Not
a #507 regression; recorded so the shim's "paper shows the page"
contract is understood as tab-scoped.

### 287. details-print.js: two minor hardening notes *(noticed 2026-08-10, the pilot verification — MINOR)*

(1) `details-print.js` resets its `forcedOpen` set at every
`beforeprint`, so correctness silently assumes browsers always pair
beforeprint/afterprint; dropping the reset (afterprint already
clears it) would degrade an unpaired beforeprint to a harmless
duplicate push instead of a leaked-open set. (2)
`tests/details-print.spec.js`'s inert-page guard asserts no
`pageerror` immediately after the dispatching evaluate resolves, but
pageerror delivery is async — the guard cannot flake, but it can
pass vacuously. Both one-liners; ride whichever PR next touches the
shim.

### 288. Fullscreen's applyInert would disable gloss panels on a future gloss-marked tool page *(noticed 2026-08-10, the gloss verification — LATENT, out of pilot scope; **RESOLVED 2026-08-12 · PR #558** — fixed while still latent; the entry's diagnosis held on both counts, measurements below)*

`fullscreen-toggle.js`'s `applyInert` inerts all body-level siblings
except `#palette`; `.gloss-tip` panels render at body end, so on a
future gloss-marked page with a fullscreened tool-card the panels go
inert — `aria-describedby` still announces, but pointer travel onto
the panel (the 1.4.13 hoverable grace) dies. Nothing breaks today
(the pilot page has no fullscreen target). Add a palette-style
exemption when glosses reach tool/simulator pages.

**RESOLVED 2026-08-12 (PR #558), still latent.** `applyInert()` now
skips `.gloss-tip`, one line after the `#palette` skip and for the same
reason — a second overlay that layers above the z-300 card
(`.gloss-tip` is z-index 900) and whose trigger sits in the prose
INSIDE the card, so the panel is live content rather than covered
chrome. Like the palette it is never tagged `data-fs-inert`, which is
what makes both inverse paths free: `clearInert()` has nothing to undo,
and `search.js`'s palette-close arm — which holds `inert` only on
`data-fs-inert` carriers — restores it. Both were measured, not
assumed: 0 leftover attributes after exit and after three cycles;
palette open over a fullscreen card leaves 3/3 panels inert (correct,
it is `aria-modal`) and 0 tagged, and palette close returns all three
to live with the nav still contained.

**The entry was right about the mechanism, and about its limit.**
Measured on the built site with the pilot page's card fullscreened,
pointer travelling from the trigger onto the open panel: **before**, 0
`mouseover` events reached the panel, `elementFromPoint` at the panel's
own centre resolved elsewhere, and the panel closed once the 200 ms
grace elapsed — permanently, since nothing reopens it; **after**, 1
`mouseover`, `elementFromPoint` resolves into the panel, and it
survives 500 ms of dwell. The cause is that Chromium's `inert` is not
hit-testable, so the pointer can never land where the grace period
expects it. And the entry's "`aria-describedby` still announces" was
confirmed rather than merely inherited: the accessible DESCRIPTION is
byte-identical inert and not (CDP `Accessibility.getPartialAXTree`,
`ignored: false` both ways), so this was only ever the pointer half —
never the screen-reader half the `gloss.js` header calls the whole
no-JS story.

Covered by three arms in `tests/fullscreen-toggle.spec.js`. Since no
live page carries both halves, they run on the gloss pilot page — real
panels, real runtime, real triggers — and supply fullscreen through
`window.Fullscreen.toggle()`, the idiom that file's `#106` arm already
uses. Two of the three fail with the skip removed; the third is a
boundary against the wrong reading of #288 (that the panels should be
actively un-inerted, which would trample a page's own `inert`) and
passes either way by design. The arms assert hit-testability rather
than choreographing the gesture — that is what `inert` removes and what
the grace needs, and it is deterministic where the gesture needs
`gloss.spec.js`'s whole `park()` apparatus. When a gloss-marked tool
page ships, delete the `toggle()` call and point them at its button.

### 289. A blown fuse and a running fuse render the same green on the wiring sim *(noticed 2026-08-10, the #280 lane — **CLOSED 2026-08-11 · NOT A DEFECT · PR #517**; the entry's premise was DISPROVEN before any fix shipped — correction block at the end)*

**As first written (2026-08-10):** `controller-wiring.html:910` builds
`'led ' + (blown ? '' : 'led--run')` — clearly intending the lamp to
stop reading as "run" on a blown fuse — but the base `.led` default
painted the bare element the same green `.led--run` uses, so the
blown state appears never to have been visually distinct. (PR #505
froze the default's COLOR theme-constant; the logic is untouched.)
**Owner ruling 2026-08-10: blown = dark — `led--off`** (the lamp
depicts circuit-powered / fuse-OK, matching the code's intent).
One-line fix; queued as its own lane.

**Premise correction, recorded before implementation (2026-08-11).**
The lamp was never green. This page carries its own rule —
`controller-wiring.html:103`,
`.cw-fuse.cw-fuse--blown .led { --c: var(--red); }` — which the entry
missed. At `(0,3,0)` it out-specifies the `.led` default's `(0,1,0)`,
and `:908` toggles `cw-fuse--blown` on the parent in the same
`refresh()` breath that `:910` rewrites the child, so the two are
never out of step. Measured on the built site, `broken-fuse` preset,
both themes: **healthy `#6cb23a` green, blown `#e85d4f` red** (light
theme `#c4382f`) — plus the `cw-fuse-flash` red-glow animation `:281`
fires on the failure edge. Only the JS line LOOKED bare; the render
was distinct the whole time.

**The ruled fix would also have regressed the page.** `led--off` is
`(0,1,0)` and loses to that same `:103` rule, so `--c` stays red and
only the `box-shadow` flips — measured, both themes: a red dot with
its glow swapped for a dark inset, desynced from the flash keyframes
that still animate red glow. Reaching an actually-dark lamp meant
deleting `:103`, i.e. removing the red failure cue — a design change,
not the one-line fix the entry scoped.

**Owner re-ruling 2026-08-11, with the true facts in front of him:
RED STAYS.** The fuse lamp is the panel's fault annunciator, and the
dark/unpowered story is already told by the ten terminal LEDs, which
do go `led--off` on a blown fuse (`wiring-engine.js:330` / `:527`
return `led: 'off'` for dead points). The 2026-08-10 ruling is
superseded — it answered a report of a defect that did not exist.

**Shipped anyway, as cleanup (PR #517):** the repaint line (`:919`
after the change, `:910` before) now names the state explicitly —
`'led ' + (blown ? 'cw-fuse-led--blown' : 'led--run')` — and the
`:103` rule was retargeted onto that class rather than the parent, so
the colour has exactly one source and it is visible from the JS line
instead of hiding in an invisible descendant rule; that opacity is
what made this entry misread the page. Zero
rendered change, measured before/after in both themes (fill, shadow,
box). The trailing-space nit in the old string died with it. The
`smoke.spec.js` broken-fuse row now pins both classes and asserts the
blown fill differs from the running fill, so the green-on-green the
entry alleged could not ship unnoticed today. `styles.css`'s LED
comment, which repeated the same false claim, was corrected in the
same PR.

### 290. Simulator prose is set smaller AND dimmer than lesson prose — squint territory *(reported 2026-08-11 by the owner — site-wide legibility, DESIGN CALL; survey measured; treatment ruled 2026-08-12 — both levers; **pass shipped 2026-08-12 · PR #530**)*

Owner report, verbatim intent: a lot of the sim prose is almost too
dark to read, and very small — the two combined make you squint.
Raised as bigger than any one page, board-first.

Measured mechanism (2026-08-11 survey of every `html/simulators/*.html`
prose class): lesson body prose renders at **0.95rem in `--text`**
(`.tool-body p`, styles.css:1240; lead paragraphs 1.0rem) — but the
simulators essentially never use it (ddc-workbench: 2 plain `<p>` vs
36 classed). Simulator explanatory prose instead runs
**0.70–0.82rem, nearly all of it in `--text-dim`** (`#919cab` dark /
`#636b63` light) — simultaneously ~75–85 % of lesson size AND one ink
step dimmer. Base scale: 1rem = 16px (the body's 18px does not move
`rem`), so these are 11.2–13.1px paragraphs.

Ranked worst offenders:

1. `pid-tuner.html:392` — **inline** 0.66rem mono `--text-dim`
   (10.56px; classless, escapes any shared-class fix).
2. `p.tool-preamble` — 0.70rem mono `--text-dim` (styles.css:1285) —
   on **all 10 simulator pages and 31 tool pages**.
3. `p.ahu-point-note` — 0.70rem, line-height 1.4 (the tightest
   leading of any sim prose), `--blue-ink` (ddc-workbench.html:904).
4. `p.pid-note` — 0.72rem mono `--text-dim` (styles.css:2636;
   pid-tuner ×6). `p.vfdm-mode-note` matches at 0.72rem.
5. `p.ref-note` — 0.74rem `--text-dim` (styles.css:3770) — highest
   volume site-wide, **53 files**.
6. `p.ddcw-sheet-note` — 0.78rem mono `--text-dim` (styles.css:5140)
   — the dominant workbench prose (×17 across the two pages, plus
   every `details.prose-fold` body). The fold summary itself is
   0.72rem `--text-dim` (styles.css:1366 — the affordance lane may
   brighten it, which chips at this issue for that one surface).

Why no guard caught it: every class above passes
`contrast-sweep.spec.js`'s 4.5:1 small-text floor (dark `--text-dim`
measured 4.81–6.63:1, light 4.60+; no `opacity` involved anywhere).
The defect is **size × dim ink**, a legibility axis the sweep
structurally does not measure — AA-passing is not the same thing as
comfortable at 11px.

Scope note: the shared classes reach 31 tools + 17 lessons, so any
retune is a **site-wide design pass, not a simulator patch**. #168's
"dim captions are working as designed" ruling covers the LABEL/value
scan hierarchy; running prose paragraphs are a different surface and
are not covered by it. Treatment levers for the design round (owner
rules): a size floor for prose-length text, ink promotion for prose
(`--text-dim` stays for captions), or both — plus classes for the
inline stragglers either way.

**Owner ruling (2026-08-12) — both levers, adopted as a principle:
prose-length text is never both small and dim.** Running prose
promotes to `--text` (captions and labels keep `--text-dim` — the
#168 ruling is untouched), AND paragraph-shaped text gets a size
floor around 0.78rem; the inline stragglers get classes either way.
Ships as the site-wide pass the scope note above predicts; the entry
stays open until that pass lands.

**Resolution (PR #530, 2026-08-12).** The pass shipped as ruled: a
**0.78rem floor** on paragraph-shaped text and `--text-dim` → `--text`
on its ink, across ~44 rules in `styles.css` plus ~20 pages. Nothing
already at or above 0.78rem was raised, and the **`--text-dim` token
itself was not touched** — only per-rule declarations moved, so #168's
caption/label hierarchy stands unchanged. **Semantic inks were kept**
throughout: `--blue-ink` (register provenance, `p.ahu-point-note`),
`--amber-ink` (override state, the four workbench announcement lines),
`--heat` / `--red-text` (status hues), and the equipment register.
Those surfaces took the size floor only. The inline stragglers got
classes as ruled — `pid-tuner.html:392`'s classless 0.66rem `<p>`, the
worst offender in the ranked list above, is now `p.pt-note`.

**Scope excluded: SVG `<text>`.** The ruling covers HTML prose only, so
diagram labels, axis captions and in-drawing callouts keep their
current size and ink site-wide. That is a real remaining surface, not
a closed one — it would need its own survey (the measurement here was
of HTML prose classes, and SVG text is sized in **user units against a
viewBox**, so a `rem` floor does not even transfer). Logged as the
boundary rather than as a follow-on entry.

**One thing to not undo:** `p.ref-note` keeps its `p` element
qualifier, and the rule now carries a comment saying why in its own
terms. `ol.ref-note.worked-list` matches only the padding rule at
`:3793`, so ~85 worked-example `<li>` render at body size on `--text`
**precisely because** the base rule cannot reach them. De-qualifying to
a bare `.ref-note` — which looks like a tidy-up — would shrink every
one of them to 0.78rem.

**One documented exception: `.nav-menu-blurb` landed at 0.72rem**, not
the floor. It sits in a fixed-measure dropdown panel against a 240px
capped text box, and the full step re-flows the panel geometry; the ink
promotion applies normally. Flagged in the PR for the owner's
before/after eye.

Two survey findings worth keeping. Of the nineteen inline
`font-size:0.86rem` declarations the survey read as no-op duplicates of
`.callout p`, **two are not**: `education/hydronic-loops.html:381` and
`education/pump-control.html:363` are `<ul>` elements, not `<p>`.
`.callout p` cannot reach them and there is no `.callout ul`, so they
fall to `.tool-body ul` at 0.95rem — deleting their `font-size` would
have *enlarged* both lists. 17 removed, not 19. And
`tools/psychrometric-chart.html:420`'s "gray" span already carried the
explicit `--text-dim` the plan called for adding before `p.bit-hint`
promoted, so no edit was needed there.

*Stale line-number corrections to the ranked list above,* re-derived
against `main` at 4219463 when the pass ran — the entry's cites had
drifted as the files grew: `p.pid-note` is styles.css **:2645** (not
2636); `p.ref-note` is **:3779** (not 3770); `p.ddcw-sheet-note` is
**:5155** (not 5140); `p.ahu-point-note` is ddc-workbench.html **:933**
(not :904); `p.vfdm-mode-note` is vfd-mock.html **:140** (not :143).
The `details.prose-fold` summary is styles.css **:1374** (not 1366),
and the entry's "0.72rem `--text-dim`" reading of it is stale on the
ink: it is **already `--text`**, brightened by the affordance lane
before this pass ran. Its size is still 0.72rem, and it was held out
of this pass deliberately as that lane's surface — so read it as one
lever paid, not as resolved.

### 291. Negative assertions keyed on incidental punctuation go vacuous silently *(noticed 2026-08-11, the #283 T-A lane — test-pattern class, LOW)*

`tests/ddc-workbench-fcu-safeties.spec.js` asserted
`not.toContain('Clg Stg 1 —')` to prove a stage was NOT listed
off-program — a match keyed on the em dash that happened to follow a
point name in the old per-point format. The #283 grouping moved the
value inline (`Clg Stg 1 ON · …`), so the assertion would have kept
passing **even with the stage listed**: the punctuation left, not the
point. The lane fixed that instance (`not.toContain('Clg Stg 1')`),
but the *class* is the entry: a negative assertion whose match
depends on incidental punctuation or formatting is a guard that a
format change silently disarms — it cannot fail red, only vacuous.
Sweep candidate: grep the specs for `not.toContain` / `not.toMatch`
arguments carrying ` — `, ` · `, trailing colons or parens, and
re-anchor each on the name or a structural locator. Same defect
family as the anti-vacuity probes the build guards carry
(`flowGeometryLive`'s exempt-path check, the contrast `ALLOWLIST`
self-test) — negatives need a way to prove they still bite.

### 292. ddcw-shell.js's header `Tests:` list has drifted *(noticed 2026-08-11, the #283 T-A lane — docs drift, MINOR; **RESOLVED 2026-08-12** — both specs added)*

The shell header names `ddcw-shell.spec.js` /
`ddc-workbench-fcu.spec.js` / `ddc-workbench-fcu-priority.spec.js`;
`ddc-workbench-ahu-page.spec.js` and
`ddc-workbench-fcu-safeties.spec.js` also drive shell surfaces — the
AHU spec now pins the off-program window's grouped format directly.
Comment-only, but the shell is a live-page script, so it rides the
next PR that touches `ddcw-shell.js` rather than shipping alone.

**RESOLVED 2026-08-12 (the clear-the-decks queue).** Both named specs
added to the header's `Tests:` list with one line each on what they
pin. The "rides the next PR" condition was overtaken by the owner's
overnight clearance — no queued lane touches the shell, and the
close-out's batched version bump covers the cache question a solo
comment-only ship would otherwise raise. `ddc-workbench-session.
spec.js` was considered and deliberately NOT added: the session
machinery it pins lives in `ddcw-session.js`, which has its own
header — listing it here would re-create the drift this entry is
about, one file over.

### 293. The blown-fuse flash cancels itself — `refresh()` wipes the class the drift tick then never restores *(noticed 2026-08-11, the #289 lane — cosmetic, log-don't-fix)*

`fireBlownFuse` (`controller-wiring.html:983`) adds `cw-fuse-flash`
and removes it on a 1600 ms timer, driving a 1.5 s red-glow keyframe
(`0.5s steps(2) 3`). But `refresh()` repaints the lamp with a whole
`className` assignment (`:919`), which **wipes `cw-fuse-flash`** along
with everything else, and the re-arm at `:932` is edge-gated
(`blown && !lastBlown`) — so once `lastBlown` is set the flash never
comes back. Any `refresh()` inside the window silently truncates the
cue.

One fires on its own: the cosmetic-drift tick (`:1172`,
`setInterval(…, 2500)`) calls `refresh()` whenever a `therm10k` sits
on the bench (`:1170`) — and the `broken-fuse` preset **places one**
(`:1096`), so this is the canonical failure demo, not an edge case.
The tick's phase against the click decides the outcome; predicted
duty 1500/2500 = 60 %.

Measured on the shipped build (8 reps, click staggered 380 ms across
the interval, polling for the class): flash armed every time, dropped
at **253 / 656 / 1008 / 1418 ms** in four reps against **~1612 ms**
(the timeout firing normally) in the other four — **4 of 8 truncated
mid-animation**, consistent with the predicted duty at this sample
size.

Cosmetic only: colour, tag text, faults and readouts are all correct
either way — the visitor just gets a shorter flash, or a single
frame of one. Fix shape, when it's worth it: swap `:919`'s
`className` assignment for targeted `classList` toggles so the repaint
stops clobbering unrelated state, or re-arm from the `blown` state
rather than the edge. Left unfixed deliberately — noticed in passing
during #289, and the house rule is log-don't-fix.

### 294. The fullscreen cockpit fades in over ~1s — a settle trap for every capture and computed-style measurement *(noticed 2026-08-11, the #266 lane — measurement trap, LOW)*

`.tool-card.is-fullscreen` reaches full opacity over roughly a
second; measured at 300 ms after the toggle the card sits at
`opacity: 0.89` with the page ghosting through it. Not a defect —
but any screenshot, contrast measurement, or computed-style read of
a fullscreen cockpit taken before the fade settles is measuring a
composite, and `contrast-sweep.spec.js` composites `opacity` up to
`<html>` by design — so if the sweep (or any future spec) ever
force-enters fullscreen, it needs a real settle first or it will
report ratios ~11 % low. Same family as ledger #259's
entrance-fade actionability trap; record here so the next fullscreen
measurement doesn't rediscover it.

### 295. AHU fullscreen puts `.ahu-points` in a `minmax(0,1fr)` column — width bands measured in normal flow don't transfer *(noticed 2026-08-11, the #266 lane — measurement trap, LOW)*

In the AHU page's fullscreen grid the mirror sits in a
`minmax(0, 1fr)` column, making viewport→grid width roughly 2.5:1 —
so a width threshold measured in normal flow lands somewhere else
entirely in the cockpit, and vice versa. Any future width-band
measurement on that page must be taken in BOTH states. Same
transfer-trap class as #267 (mockup→live); this is the
normal-flow→fullscreen edition, found while re-measuring #266's
bleed bands.

### 296. styles.css's filter-chip comment names two of the four chip landings *(noticed 2026-08-11, the #274 lane — docs drift, MINOR; **RESOLVED 2026-08-12 · PR #549**, rode the #272 `styles.css` PR exactly as this entry planned)*

`html/styles.css:2665` says the chip row sits "above the `.card-grid`
on `/tools/` and `/education/`" — it already omitted `/practice/`
and now also omits `/simulators/` (#274). Comment-only, but fixing it
alone would make the version bump load-bearing for a no-op byte
change, so it rides whichever PR next touches `styles.css` — the
#274 lane deliberately left it for exactly that reason.

**RESOLVED 2026-08-12 · PR #549.** The #272 lane was the next
`styles.css` PR, and carried it. The comment now names all four
chip-bearing landings — `/tools/`, `/simulators/`, `/education/`,
`/practice/` — verified against the tree rather than the entry:
`grep -rl 'filter-chips' html/` returns exactly those four
`index.html`s, so the list is complete as written and not merely two
longer than before. The plan worked as designed: no version bump was
spent on a comment.

### 297. Two pages still run hrefless-anchor example chips — hydronic-loop-builder carries #281's race whole, with a latent suite flake *(noticed 2026-08-11, the #281 lane's site-wide grep — sibling sweep; **RESOLVED 2026-08-12 · PR #527**, both pages converted; equipment-staging's race turned out to be REAL and is characterized in the resolution block, and the entry's "complete remaining set" claim did not survive the lane — see #299)*

The #281 lane's closing grep (`<a data-` without `href`) found the
complete remaining set of anchor-shaped controls, two files:

- `html/simulators/hydronic-loop-builder.html:341-343` — three
  `<a data-example>` chips, bound in the end-of-body IIFE at :1280.
  **Both halves of #281**: keyboard-dead permanently, and the same
  pre-mount race — and `tests/smoke.spec.js:249` clicks
  `[data-example="parallel"]` on that page, so the identical flake
  is LATENT in the suite, just not yet observed. Strongest candidate
  first.
- `html/education/equipment-staging.html:334-336` — three
  `<a data-demand>` chips, the keyboard-dead half (race exposure not
  yet characterized; check when the lane opens).

Fix is a copy of #281's shipped shape (PR #522): chips become
`<button type="button">`, one permanent head-block delegation that
queues a pre-mount click and drains on mount, per-chip bindings
removed. Open the lane AFTER #522 merges so the pattern is on main
to copy. The #281 resolution block records why page-side beat
spec-side; the same reasoning transfers whole.

**RESOLVED 2026-08-12 · PR #527.** Both chip rows are
`<button type="button">`, each page's click path is one delegated
listener installed from its own `{% block head %}`, and both per-chip
`addEventListener` loops are gone. `styles.css` was not touched, for
the second time — `.widget-try button` and its `:focus-visible` twin
already existed, so the conversion is markup-only.

**equipment-staging's race exposure: REAL, and measured.** The entry
left this open ("check when the lane opens"), and the answer is yes.
Its bindings sit in the end-of-body inline IIFE inside
`{% block scripts %}`; the page has **no page-specific `<script src>`**,
which is what made the question look like it might resolve to "no
window." It doesn't, because the *layout's* eight site-wide scripts
(`theme` / `units` / `search` / `nav-menu` / `flow-engine` /
`schematic-bg` / `fullscreen-toggle` / `details-print`) are **classic,
non-deferred, and therefore parser-blocking**, and every one of them
renders above `{% block scripts %}` in `layouts/page.njk`. The chip row
is parsed partway up `<main>`, far above all of them. So the window is
eight fetches wide instead of the loop builder's nine — narrower, not
absent, and the failure at the end of it is the same silent no-op (the
click vanishes and the widget stays at its authored 20% demand). This
was not reasoned to, it was **reproduced**: the new pre-mount spec run
against the pre-fix page reports the demand readout stuck at `20`.

The generalisation worth keeping: **any page whose controls are bound
from an end-of-body IIFE has this window**, whether or not it loads a
script of its own, because the site-wide eight are always in front of
it. A page-script-free page is not a page-fetch-free page.

**Spec side.** Four rows in `tests/smoke.spec.js` — where per-page
behavioral coverage lives for these two, neither having a dedicated
spec file — two per page, one arm each. All four **fail against the
pre-fix pages**, verified by stashing only the page edits: the two
keyboard rows report Tab never landing on a chip, the loop builder's
pre-mount row reports `locator resolved to 4 elements` (the boot
sheet — #281's exact signature shape, one sheet over), and the staging
row reports the demand stuck at `20`. The pre-mount rows hold a
parser-blocking script at the network with `page.route` rather than
racing for the window, and each proves the page script is genuinely
absent at click time before clicking (`typeof window.HYDRO`, an empty
`.es-pump` rack) so neither can pass vacuously.

**One placement difference from #522, and it is load-bearing.** On
`hydronic-loop-builder` the `ready()` handover sits *after* the boot
`loadExample('single')`, not where the old per-chip loop did. That page
boots its default sheet at the very END of its IIFE, so draining the
queue at the old binding site would hand the visitor's queued choice to
`loadExample` and then immediately overwrite it with the default. The
FBE page and equipment-staging both boot before that point, so their
handovers sit in place. **The rule is "drain after the page's own boot
load," not "drain where the old loop was"** — the two coincide on two
of the three pages and diverge on the third.

**The entry's scope claim did not survive the lane.** It called its two
files "the complete remaining set of anchor-shaped controls"; they were
the complete set the #281 grep could see. Ten more hrefless
`.widget-try` chips are addressed by `id` rather than a `data-`
attribute, on three further live pages — logged as **#299**, not fixed
here.

### 298. The FCU spends half the AHU's register key and shows none of it — blue without green, and no key at all *(noticed 2026-08-11, the #269 lane — DESIGN CALL, log-don't-fix; **RESOLVED 2026-08-12 · PR #532** — owner took the full-parity shape AND split the two-point cell, which is what made the ink assignable at all)*

Surfaced while deriving #269's glosses, and it is the visual half of
that entry rather than a separate defect: **the FCU has a calculated
register and no commanded one.**

The AHU spends a full key — green `.is-cmd`, blue `.is-calc`, plain
measured — on the drawing *and* the mirror, and prints the legend on
the page (`.ahu-key-well`, `html/simulators/ddc-workbench.html:2403`).
The FCU spends `--blue` on ΔT alone (`.fcu-dt-val` on the drawing,
`.accent` in the mirror) and nothing else, and prints **no key**. So
`fcu-fan-r` and `fcu-comp-r` — genuinely commanded outputs — render in
exactly the ink `fcu-rat-r` does.

Why it is worth a row rather than a shrug: the convention is
cross-page, and a reader who learned it on the AHU will read the FCU's
blue correctly and then read its un-coloured fan and compressor as
**measured**, which is wrong. A partial key is a worse teacher than no
key, because it looks complete. This is the standing "base everything
off the AHU" tiebreak pointing at a gap the tiebreak has not been
applied to.

#269 closed the *accessible* channel (every caption now names its kind
in text, which is why that fix is not merely a screen-reader
courtesy here — it was the only channel of any kind). It deliberately
did **not** touch paint: adding `.is-cmd` to this page is a depiction
change on a live graphic, it wants the owner's equipment-graphics eye,
and it would drag `styles.css` or the page's key markup along with it.
Three shapes, not costed here: spend green + print the key (full AHU
parity), print a two-row key for what the page *does* spend (honest,
smaller), or drop the blue too and let the glosses carry provenance
alone (internally consistent, loses ΔT's cue). Owner's pick.

**RESOLVED 2026-08-12 · PR #532.** Owner ruled (2026-08-12) for shape
one — **full AHU parity** — after a mock round put all three in front of
him, **and** added the amendment the entry above did not anticipate: the
`Zone / setpoint` mirror cell **splits into two rows**.

**The split is not a garnish on the paint; it is what makes the paint
possible.** #269's resolution had to hang two glosses on one caption —
*Zone (measured) / setpoint (commanded)* — because that cell printed a
sensed temperature beside the param it answers to. A caption can carry
two words. **A span cannot carry two colours.** So the moment the page
started spending green, the combined cell became unpaintable: either
half of it would have been lying. The pair separated the way the AHU's
always was (`Zone temp` / `Cooling SP`), each row now carries one gloss
and one register, and #269's two-gloss wart goes with it. The spec row
that used to say "the one cell carrying two points of two kinds" now
says the opposite, and asserts it: `collapsed.length === 1` per cell.

What shipped:

| surface | before | after |
|---|---|---|
| mirror — fan / compressor | `--text-bright` (measured ink) | `.is-cmd` → `--accent-ink` |
| mirror — cooling setpoint | *(inside the zone cell, uncoloured)* | own row, `.is-cmd` |
| mirror — zone | `76.0 / 72.0 °F`, two glosses | `76.0 °F`, one gloss, measured |
| mirror — ΔT | `.accent` → `--blue` | `.accent` → `--blue-ink` |
| drawing — `#fcu-fan-v` / `#fcu-comp-v` | `--text-dim` (via `.fcu-pt-cap`) | `--accent-ink` |
| drawing — zone `COOLING SP` well | `--text-bright` | `--accent-ink` |
| the key | *(none)* | `.fcu-key`, register row, above the verdict |

**Three things worth carrying forward.**

1. **The key is the REGISTER row only.** The AHU's `.ahu-key` is two
   rows — component identity colours, then value states. This drawing
   does not spend the identity code, and a legend for a code the page
   never uses is *the same defect this entry is about*, pointing the
   other way. The markup keeps the grid (rather than collapsing to a
   bare flex row) so a component row can land later without restyling.
2. **Green-on-green, accepted pending the owner's in-flesh read.**
   `#fcu-comp-v` now prints `STG 1 · ON` in the commanded ink an inch
   from the compressor's `--accent` **state LED**: two meanings of green
   side by side, the dot saying *producing* and the text saying *this is
   a command*. A commanded **OFF** paints green for the same reason.
   That is correct under the doctrine the AHU states — *the code is cut
   on PROVENANCE, not point type* — and this page draws state on its own
   channels anyway (the LED, the fan blades). The AHU layers an
   `.is-false` dim override on top of its inks; **porting that is a
   second depiction call and was deliberately left out of scope**, since
   it needs a class the render loop toggles and a ruling on whether an
   OFF command should read dim here at all.
   *The in-flesh read happened at merge (owner, 2026-08-12): both this
   and the 7-cell narrow rhythm are the same tensions he weighs
   building production graphics, and the shipped answers stand —
   "changes become subjective better rather than objective" from here,
   deferrable. Read both flags as deliberately parked, not open.*
3. **The drawing's ΔT stays `--blue`, not `--blue-ink`** — a knowing
   divergence from the AHU's SVG calculated ink. The ΔT badge FRAME is
   `--blue` (`.fcu-badge-dt`), so moving only the value splits a pair
   that currently reads as one unit, and SVG text is outside
   `contrast-sweep.spec.js` so nothing forces the step. The MIRROR's ΔT
   did move (`--blue` → `--blue-ink`), because that one is HTML text and
   inside the sweep. Left as a depiction call rather than fixed silently.

**The key CSS is page-local, per the widget-internals convention** —
same standing as this page's copy of the parameter rail, the mirror diet
and the forced-sensor marker. That makes it the **second copy of one
legend** across the two workbench pages, which joins the #263 / #273
duplication family **by mandate rather than by accident**: a graduation
to `styles.css` is a decision about that whole family (and about a
`.ddcw-key` rename), not about this block on its own.

**One asymmetry left standing on purpose.** The mirror's calculated
class is `.accent` here and `.is-calc` on the AHU, while the commanded
one is `.is-cmd` on both. Renaming `.accent` would touch a class the
#269 spec row reads and buys nothing a reader sees; the INK is what the
parity ruling was about, and the ink now matches. Noted so a future
harmonisation lane finds it rather than rediscovers it.

**Guarded.** `tests/ddc-workbench-fcu.spec.js`'s register describe could
not assert an ink before this — the page had no commanded class, so
deriving the expected word FROM the colour (the AHU twin's shape) would
have passed vacuously, which the #269 resolution said in as many words.
It can now, and the row derives **both** channels from the live roster
rather than one from the other, so a gloss and an ink that agree with
each other and are both wrong still fails. Added alongside: the key
prints three registers in the inks the mirror actually spends (colours
read off the live mirror, plus a distinctness check so a token collapse
cannot pass it), the samples convert on the units toggle, the key is
placed explicitly in the fullscreen cockpit, and the split rows are
shown moving apart under a forced sensor.

### 299. The hrefless-chip set was three pages bigger than #297 said — the grep keyed on `data-`, and ten chips key on `id` *(noticed 2026-08-12, the #297 lane — sibling sweep; **RESOLVED 2026-08-12 · PR #540**, all four pages converted; the entry's page/line list held except for a two-line drift, and the handover placement rule #297 wrote turned out to have a second, sharper reason — see the resolution block)*

#297 opened on the #281 lane's closing grep (`<a data-` with no
`href`) and called its two files "the complete remaining set of
anchor-shaped controls." They were the complete set **that grep can
see**. The chip rows it missed carry no `data-` attribute at all —
they are addressed by `id`, one `getElementById` per chip:

- `html/education/pump-control.html:573-575` — three `<a id="pc-w2-try-*">`
  chips, bound in the end-of-body IIFE at `:851-853`.
- `html/education/vfds.html:352-354` — three `<a id="vfd-try-*">` chips,
  bound at `:745-747`.
- `html/simulators/vfd-mock.html:289-292` — **four** `<a id="vfdm-try-*">`
  chips, bound at `:943-955` (four separate `getElementById` calls).

All ten are inside a `.widget-try` row, all ten have no `href` and no
`tabindex`, and all ten are therefore **out of the tab order
permanently** — #281's second and worse defect, unchanged, on three
more live pages. The pre-mount race applies too: every one is bound
from an end-of-body IIFE sitting below the eight parser-blocking
site-wide `<script src>` tags (`vfd-mock` and `vfds` add page scripts
on top of that).

A fourth page is a **near miss, not a hit**:
`html/education/load-piping.html:621-622` uses
`<a href="#" id="lp-w-try-*">`. The `href` puts those two in the tab
order, so the keyboard half does not apply — what is left is an
anchor that does not navigate (its handler must `preventDefault`) and
the same pre-mount window. Lower stakes, same conversion.

**The durable lesson is about the grep, not the pages.** A search for
anchor-shaped controls has to key on the *element and its missing
`href`*, not on the attribute that happens to address it. The check
that finds all of them:

    grep -rn -A8 'class="widget-try"' html/ --include=*.html | grep '<a '

Fix is the same copy of #522's shape #297 shipped, per page: chips
become `<button type="button">`, one permanent head-block delegation
queues a pre-mount click and drains on mount, per-chip bindings
removed. `styles.css` needs nothing — `.widget-try button` and its
`:focus-visible` twin already exist and already carry the "new
try-rows should use buttons" comment. The three pages are independent
of each other, so this can ship as one lane or three.

**RESOLVED 2026-08-12 · PR #540.** All four rows — the three hrefless
pages and the `href="#"` near miss — are `<button type="button">`, each
page's click path is one delegated listener installed from its own
`{% block head %}`, and every per-chip `getElementById(...)` +
`addEventListener` pair is gone (the now-unused element consts went with
them). `styles.css` was not touched, for the **third** time: the
conversion stays markup-only because `.widget-try button` and its
`:focus-visible` twin were already there.

**The entry's page list held; one line number had drifted.** Ten
hrefless chips over three pages, plus the two-chip near miss — exactly
as written. `pump-control.html:573-575` and `vfd-mock.html:289-292` and
`load-piping.html:621-622` were all exact. `vfds.html` was cited as
`352-354`; 352 is the `<div class="widget-try">` opener and the three
chips sit at **354-356**. Nothing else in the entry moved.

**The addressing scheme was kept, deliberately.** The chips are still
keyed by `id`, and the delegated listener queues `chip.id` rather than a
new `data-` attribute; the id→preset mapping stays in each page's IIFE
where the widget's vocabulary lives. Two reasons. The entry's own
durable lesson is that a chip is a control because of its **element and
binding**, not the attribute that addresses it — so re-addressing them
would have treated the incidental half as the defect. And
`tests/smoke.spec.js` already clicked `#vfd-try-classic` /
`#vfd-try-network` by id, so a swap would have meant editing live
selectors to no end.

**The handover placement rule from #297 is real, and it has a second
reason that is sharper than the first.** #297 recorded it as *"drain
after the page's own boot load"*, discovered because the loop builder's
boot `loadExample('single')` would overwrite a queued choice. None of
these four pages boots that way — each ends its IIFE with a bare
`render()` that only PAINTS state — so on the first pass all four
handovers were placed where the old per-chip loops had been, and three
of them worked.

`vfd-mock` did not, and the failure was **not** a paint-order problem:
`applyPreset → render → ensureTickRunning` reads `motorTickId`, a `let`
declared ~60 lines further down the IIFE. A queued click therefore threw
`Cannot access 'motorTickId' before initialization` and the drive never
mounted at all. The per-chip listeners never met this because a
`addEventListener` call only *registers*; the handover **calls** the
applier, synchronously, at handover time. New spec caught it on its
first run.

So the rule generalises past its original wording: **a handover is a
CALL, not a binding, so it belongs after everything the call can reach**
— after the boot paint (the #297 reason) *and* after every `let` on the
call path is initialised (this one). All four pages now drain at the
very end of their IIFE, which satisfies both without needing a per-page
judgement, and each carries the reasoning in a comment.

**Spec side.** Eight rows in `tests/smoke.spec.js` — where per-page
behavioral coverage lives for all four, none having a dedicated spec
file — two per page, one arm each. **Seven of the eight fail against the
pre-fix pages**, verified by stashing only the page edits. The eighth is
`load piping — the preset chips stay keyboard-reachable`, and it passing
pre-fix is correct rather than vacuous: those two chips carried `href`,
so they were already in the tab order and there is no keyboard
regression to catch. That row is kept as the standing proof the
conversion did not *cost* the tab order, and its `location.hash` assert
is the part that is genuinely new — the old handlers had to
`preventDefault` their own `href`, and a `<button type="button">` has no
default action to suppress.

The pre-mount rows hold `/scripts/flow-engine.js` at the network with
`page.route` rather than racing for the window. That is a change from
#297's choice of `details-print.js`, and it buys a **universal
anti-vacuity probe**: `flow-engine.js` exports `window.FlowEngine`, so
`typeof window.FlowEngine === 'undefined'` proves the parser is still
blocked on every page, without needing a per-page DOM fact. Three of the
four also assert one (empty valve rack, empty status panel, empty
parameter table); `load-piping` has none available, because its static
markup mirrors its boot state exactly — sys flow 30, pump 50%, state OK
— so there is no DOM difference between "not mounted" and "mounted and
idle." The script probe is sufficient there on document order alone: the
IIFE is strictly below the held script.

**One thing this lane creates.** `.widget-try a` in `styles.css` is now
dead — these four rows were its last consumers. Logged as **#306**, not
swept here: `styles.css` is a live-page file whose edits carry the
cache-bust question, and this PR is otherwise markup-and-spec only.

### 300. The gloss gesture specs raced the environment's own scrolls — and one run reported the failures as green *(noticed 2026-08-12, triaging the merge-queue suite run — test infrastructure; **RESOLVED 2026-08-12 · PR #529**, mechanism instrumented both ways; resolution block below)*

`tests/gloss.spec.js`'s behavior rows failed 5-for-5 on one full-suite
run, 1-in-11 isolated, and 25-of-110 under `--repeat-each=10` — every
failure the same signature: the panel a gesture just opened resolves
`hidden` and stays hidden for the assert's whole retry window.
Something dismissed it once, and nothing reopens it.

Instrumented timelines split the dismissal into two mechanisms, both
environmental, both arriving as a scroll event the reader never made,
after `gloss.js`'s deliberately one-frame arming grace:

1. **`park()` raced late layout.** At domcontentloaded+150ms the page
   can still be growing; the trigger measured in-viewport, the instant
   `scrollIntoView` no-oped (a probe caught `scrollY` still 0 after
   parking), and the CLICK inherited the scrolling — smooth, per
   styles.css — emitting dismissal scrolls for ~270ms. The captured
   timeline: panel SHOWN at +287ms, dismissed at +310ms, easing curve
   settling ~250ms later.
2. **Scroll anchoring moved the page under load.** Late font reflow
   above the parked trigger makes Chromium adjust `scrollTop`, which
   fires a native scroll mid-gesture. Under repeat-load this one
   mechanism explained every failing row — hover and tap included.

The REAL keyboard path was probed the same day and survives: a
Tab-focus scroll is instant and lands inside the one-rAF grace exactly
as `armDismiss()`'s comment intends. So the fix is test-side (PR
#529): `park()` re-scrolls until the trigger's rect is stable across
two frames and fully in-viewport, waits on `document.fonts.ready`, and
freezes the scroll ecology (`scroll-behavior: auto`,
`overflow-anchor: none`) — which does not un-test dismissal, because
that contract is asserted with DISPATCHED events. Measured 26-of-110
failing before, **110/110 after**, on the same instrument.

**The reporting half is its own trap, recorded here for the record:**
the original 5-failure run was reported GREEN in-session because the
command piped Playwright through `tail`, which replaced the exit code
with the pipe's and cut the failed-list out of the visible window. A
test run's exit code and summary must come from the runner itself —
redirect to a file, never pipe. (Tooling recipe updated the same day.)

### 301. A mouse click on an edge-clipped gloss trigger can dismiss the panel it opens *(noticed 2026-08-12, the #300 diagnosis — page-side residual, DESIGN CALL, log-don't-fix)*

The narrow real-user shape of #300's mechanism 1, on the live page: a
trigger sits partially clipped at the viewport's bottom edge, the
reader clicks its visible half, the click's focus makes the browser
scroll the trigger fully into view — animated, because styles.css
sets `html { scroll-behavior: smooth }` — and the animation's scroll
events outlive `armDismiss()`'s one-frame grace. The panel opens and
closes in the same gesture. The component is following its own rule
(a page scroll is a dismissal, and the panel WAS placed at pre-scroll
coordinates, so leaving it open would leave it misaligned); the rule
just cannot tell the opening gesture's own scroll from the reader's.

Reachable only by mouse on a clipped trigger — the keyboard path is
instant-scroll and safe (probed, #300), and a fully-visible trigger
produces no scroll at all. Self-healing in practice: the second click
finds the trigger already in view and the panel opens clean, which is
also why this files as log-don't-fix rather than a defect lane.

If it ever earns a fix, the honest shape is *re-place-on-settle*, not
a longer grace: treat the opening gesture's scroll as part of the
open, and when it settles, re-run `place()` against the trigger's new
position instead of closing — a timer-free version of the same
"whose scroll is this" question the arming grace already answers for
focus. Owner's call whether the reach justifies it.

> **Owner reviewed 2026-08-12 (the clear-the-decks decision batch):
> log-don't-fix STANDS.** The reach doesn't justify a component
> change; *re-place-on-settle* stays the recorded shape if it ever
> earns one.

### 302. `details.tool-preamble > summary:hover` is a no-op since the #290 promotion *(noticed 2026-08-12, the #290 lane — cosmetic, small design call; **RESOLVED 2026-08-12 · PR #552** — owner ruled the `--text-bright` step; the entry's third option, letting the `▸ more` affordance carry hover alone, turned out to describe a thing the file does not do — see the resolution block)*

The hover rule (styles.css, the tool-preamble block) lifts the
summary's ink to `var(--text)` — but PR #530 moved the summary's
RESTING ink to `var(--text)`, so hovering now changes nothing. Either
the disclosure wants a different hover cue (a step to
`--text-bright`, or letting the `▸ more` affordance carry hover
alone) or the rule should go. Harmless until decided; whichever
lane next touches the preamble block should carry the call.

**RESOLVED 2026-08-12 · PR #552.** Owner ruled (2026-08-12) for the
first option: the hover steps to `var(--text-bright)`. One token, one
rule — `html/styles.css:1334` — keeping pointer feedback on an
interactive element rather than deleting the rule.

Three things the lane verified that the entry left open:

- **The no-op spans one rule, not two.** `git log -L 1316,1340` on the
  block pins the collision to commit `8d4f785` (the #290 promotion,
  PR #530), which lifted the resting ink `--text-dim` → `--text` and
  left the `:hover` line untouched at `--text`. Nothing else in the
  block collided.
- **The entry's second option was not available.** "Letting the
  `▸ more` affordance carry hover alone" assumes the affordance
  responds to hover — it does not. `details.tool-preamble >
  summary::after` declares its own `color: var(--accent)`, and there
  is no `:hover::after` rule anywhere in `styles.css`, so the summary's
  hover cannot reach it and the affordance has no hover state of its
  own to lean on. Taking that option would have shipped a disclosure
  with no hover feedback at all, which is the defect this entry opened
  on. Worth recording because the option read plausible from the
  markup.
- **The ruled fix lands the block on an idiom the file already runs.**
  `details.prose-fold > summary:hover` (`styles.css:1394`) steps to
  `--text-bright` while its `::before` marker keeps `--accent` — now
  byte-for-byte the same shape as the preamble's. The third family
  member, `.pid-spoiler > summary:hover` (`:2525`), hovers to
  `--accent` instead; that difference is deliberate (a titled filled
  box, not a quiet caption) and was left alone.

`--text-bright` is defined in the dark `:root` (`:129`), the light
block (`:269`) and the `@media print` block (`:390`), so the step
survives both themes and paper — the `-fill`-family print trap does
not apply here. No version bump was spent: `styles.css`'s cache-bust
bump rides the merge captain's close-out batch.

### 303. `.fcu-point-val.dim` is dead CSS on the FCU workbench *(noticed 2026-08-12, the #298 lane — cleanup, LOW)*

Defined in `ddc-workbench-fcu.html`'s mirror CSS block next to
`.accent`; nothing in the page, `ddcw-fcu-unit.js`, or any spec ever
applies it — likely a leftover from the pre-diet mirror. Delete in
the next lane that touches the FCU head block, with a grep first in
case a consumer lands in between.

**RESOLVED 2026-08-12 (PR #555).** Deleted. The grep the entry asked
for was re-run at `20d5ad2` rather than trusted from this text, since
the page had moved in between — #219's static-placeholder pass merged
the same night as PR #553, and the branch is cut from exactly that
commit. Zero consumers at that HEAD, on five surfaces: the seven
`.fcu-point-val` spans wear `is-cmd` (3), `accent` (1) or no modifier
(3); `ddcw-fcu-unit.js` writes those spans' `textContent` only and
never their class (its class mutations all land on the verdict pill,
the SVG sensor groups, buttons, a chevron and the tab pane);
`ddcw-shell.js`'s one computed class string is `'ddcw-chip-val' + cls`
with `cls` ∈ `{'', 'on', 'off'}`, a different element; `classBoth` in
`ddcw-ahu-unit.js` — the other computed-class site — passes the
literal `'is-false'` at all four callers, on the other page; and no
`dim` token appears anywhere under `tests/`. `styles.css` carries no
`.dim` rule either, so nothing shared was feeding it.

The strongest single piece of evidence is that
`tests/ddc-workbench-fcu.spec.js` declares
`REGISTER_CLASSES = ['is-cmd', 'accent']` — the ink code's own
bidirectional guard had already fixed the register set at two, so
`dim` was outside the code it sat beside, not an unguarded third
member of it.

Per the lane's don't-leave-a-twin check, `.accent` was verified alive
before touching anything: worn by `#fcu-dt-r` and pinned in both
directions by that spec's `bearing('accent') === ['fcu-dt-r']`.
`.is-cmd` likewise. Both untouched, and so was the block's comment,
which called the survivors "this pair of rules" — accurate only once
the third was gone. No visual change in either theme (the rule matched
no element in any state), and no version bump spent: the edit is CSS
removal inside the page's own `{% block head %}`, not `styles.css` or
a shared script, so there is no cache-busting exposure — the bump
rides the merge captain's close-out batch.

### 304. Five byte-identical `*-empty td` rules across the lookup tools *(noticed 2026-08-12, the #290 lane — consolidation candidate, LOW)*

`bacnet-error-codes` / `bacnet-objects` / `bacnet-units` /
`bacnet-vendor-ids` / `modbus-functions` each define the same
italic empty-state cell rule page-locally (the #290 pass edited all
five in lockstep, which is the tell). A shared `styles.css` class
would collapse them; the empty-state is genuinely shared chrome, not
a widget internal. Log-don't-fix until something touches the family.

**Resolved (2026-08-12, `issue-304/shared-empty-cell`, PR #556).** The
clear-the-decks arc was the touch the entry was waiting for. One
`.ref-empty td` now lives in `styles.css` after the `.ref-table-dense`
base block, named for the `ref-` family that already carries shared
reference-table chrome (`.ref-table`, `.ref-table-dense`,
`p.ref-note`).

The census confirmed the entry and closed its open end: exactly five
pages and **eleven** rows, the five rule bodies byte-identical, and
**no sixth consumer** — grepping the declaration body and every
`colspan` row under `html/` returns those eleven and nothing else.

Three things worth carrying forward:

- **The page-local `<prefix>-empty` classes stayed on the markup.**
  They stopped being styling hooks but remain *script* and *spec*
  hooks — each filter does `body.querySelector('.<prefix>-empty')`,
  and `smoke.spec.js` asserts on `.bo-empty` / `.bvid-empty` by name.
  Only the CSS moved. A future lane reading "the rules were
  consolidated" should not take that as licence to delete the classes.
- **The rule's placement is load-bearing, not cosmetic.**
  `.ref-empty td` is (0,1,1) — the shape the page-local rules had —
  and only out-orders `.ref-table-dense td`'s equal-specificity colour
  because it sits *after* both table families in the file, which is
  what the inline `<style>` gave it for free before. Moving it above
  them would be a silent behaviour change. The `.rt-stack` ≤620px cell
  rules are (0,3,3) and set neither `font-style` nor `text-align`, so
  that relationship is unchanged in both directions.
- **Identity was measured, not argued.** All five filters were driven
  into their no-match state and 18 computed properties diffed on every
  empty cell, in both themes at 1400px and 600px (the `.rt-stack`
  branch): 44 cells, each asserted visible so the check could not pass
  vacuously, byte-for-byte identical before and after. Suite 1204
  passed / 1 skipped / 0 failed, contrast sweep included.

Per the #296 lesson the shared rule's comment names the consumer
*family* — every filter-driven lookup table — rather than the five
page names, which would drift the moment a sixth adopts it. No
version bump was spent: `styles.css`'s cache-bust bump rides the merge
captain's close-out batch.

### 305. The SVG diagram alt-text audit lived only in an archived doc *(logged 2026-08-12, the clear-the-decks hygiene pass — deferred SEO audit, LOW)*

The one still-open item anywhere under `docs/audits/` — the SVG
diagram alt-text audit, named in
`docs/audits/2026-05-refinement/priorities.md`'s deferred tail as "a
future SEO bottleneck" — lived only in that archived doc, where
nothing would ever surface it again. Moved here so the live ledger
carries it; the archived doc stays unedited per its own convention.

What it is: an SEO-richness pass over the diagram SVGs' accessible
text, not a compliance fix — the diagrams already carried `<title>` /
`<desc>` when the item was written (per #21), and the quiz figure
banks enforce native naming at mount. The audit would ask whether
those texts do indexing work — do they name the concepts a search
would use, or just describe the picture — and it was deferred "until
other SEO items land and the gap becomes the next bottleneck."

Scale has moved since 2026-05: the item was scoped at 8 education
pages; the site now carries 40 lessons plus the simulators, so the
audit is bigger and the per-page payoff unmeasured. Log-don't-fix.
A natural trigger: if a GSC read shows education pages
underperforming on impressions relative to tools, this is the first
cheap lever to reach for.

### 306. `.widget-try a` is dead CSS as of the #299 conversion *(noticed 2026-08-12, the #299 lane — cleanup, LOW)*

The anchor half of the `.widget-try` chip rule (`styles.css`, the
`WIDGET CHROME` block) plus its `:hover` twin. #281 / #297 / #299
converted every `.widget-try` chip on the site to `<button>`, and
`.widget-try a` had no other consumers — the check is the same one #299
wrote for finding them:

    grep -rn -A10 'class="widget-try"' html/ --include=*.html | grep '<a '

which now returns nothing. The button rule below it already carries the
comment saying new try-rows should use buttons; with the anchors gone
that comment is the whole story and the `a` rule is the historical
half.

Not swept in the #299 lane on purpose. `styles.css` is a live-page file
— its edits need owner approval and raise the cache-bust question
(#84), while that PR was markup-and-spec only. Fold this into whatever
lane next has `styles.css` open for its own reasons; deleting ~10 lines
of unreachable CSS does not earn a version bump by itself.

One caveat for whoever takes it: the rule is dead only while nothing
re-introduces a `.widget-try` anchor. That is now a convention rather
than a guarantee — there is no build guard on it, and the four
conversions were each caught by a hand-run grep, so re-run the one
above before deleting.
