# controlsfreak.dev

A field-reference tool site for building-controls engineers — open
calculators and lookup utilities for BACnet, Modbus, HVAC, and building
automation work, plus plain-English explainers. Source pages under
`html/` plus a small Cloudflare Worker (only for `/contact`). 11ty
templates the shared chrome (`<head>`, nav, footer) out of every page;
everything else is vanilla — no client-side framework, no bundler, no
transpiler.

Companion docs: `README.md` for the user-facing tour;
`site-ideas-and-friction.md` for per-page design history and
ideas-not-yet-shipped; `codebase-issues.md` for open code-quality
items needing a decision; `content-audit.md` for editorial
findings from the recurring content-accuracy audits.

## Stack

- **Eleventy (11ty) build pipeline.** `.eleventy.js` runs every
  `.html` under `html/` through Nunjucks and writes to `_site/`. YAML
  frontmatter + shared layout (see *Templating*). Static assets
  (`scripts/`, `styles.css`, `assets/`, `robots.txt`) passthrough;
  `sitemap.xml` generated (see *Sitemap*). Build ~0.3s for 30 pages;
  no JS transpile or bundle step.
- **Templates under `html/_includes/`:**
  - `layouts/page.njk` — page shell. Composes `head.njk` /
    `schematic-bg.njk` / `nav.njk` / `footer.njk`; loads
    `flow-engine.js` + `schematic-bg.js` at end-of-body; exposes
    `head` / `content` / `scripts` blocks. See *Templating*.
  - `head.njk` — `<head>`: meta, OG, favicons, fonts, `/styles.css`,
    units-bootstrap inline script.
  - `nav.njk` — top nav; `.active` driven by `nav` frontmatter.
  - `footer.njk` — tagline + version string (re-exports
    `package.json.version` via `html/_data/site.js`).
  - `schematic-bg.njk` — gutter SVG collage. Hidden below 1240px
    (see *Gotchas*). Path-tagging conventions in the partial's
    header.
  - `nav-card.njk` — `navCard()` macro for the hero-frame nav-cards
    used across home / tools / education / simulators / practice
    landings. Params: `section`, `href`, `titleShort`, `titleFull`,
    `desc`, `pills[]`, optional `category`.
  - `related-links.njk` — `relatedLinks()` macro for end-of-page
    cross-links. Takes up to four optional groups: `tools`,
    `simulators`, `lessons`, `quizzes` — each `[{href, label}]`.
    Per the forward-link convention, only link pages that exist.
- **Directory data:** `html/html.11tydata.js` overrides 11ty's
  pretty-URL permalink so `signal-scaling.html` lands at
  `_site/tools/signal-scaling.html`. Load-bearing for the
  `.html`-extension convention.
- **`html/styles.css`** — shared design system; every page links it
  via `head.njk`. Page-only rules stay inline via `{% block head %}`.
- **Shared scripts** in `html/scripts/` are **classic scripts** (no
  ES modules, no bundler) that expose globals like `Units`,
  `simulatePid`, `FlowEngine`, `Quiz` for page IIFEs to reach by
  name. Each file has a thorough header — **read it for the API**.
  `flow-engine.js` and `schematic-bg.js` are loaded site-wide from
  `layouts/page.njk`; the rest load per-page inside `{% block scripts %}`
  *before* the page's inline `<script>`.
- **Worker:** `src/worker.js` — ES-module Worker. Handles
  `POST /api/contact` (validate, honeypot, Turnstile, Resend); falls
  through to `env.ASSETS.fetch(request)`. Secrets: `TURNSTILE_SECRET`,
  `RESEND_API_KEY` via `wrangler secret put …`. Turnstile *site* key
  lives in `contact.html`.
- **Hosting:** Cloudflare Workers; auto-deploys ~60s on push to
  `main` (the dashboard runs `npm install && npm run build` and
  serves `_site/`).
- **Config:** `wrangler.jsonc` — `name`, `main`, `assets.directory`
  (`./_site`), `assets.binding` (`ASSETS`), `assets.html_handling`
  (`auto-trailing-slash`), and `compatibility_date` are all
  load-bearing.

### Templating

Every page in `html/` (other than partials under `_includes/`) has
this shape:

```nunjucks
---
title: Signal Scaling — controlsfreak.dev
description: mA / V analog signals to engineering units and back, plus a 2-point → slope/offset solver for y = mx + b.
canonical: https://controlsfreak.dev/tools/signal-scaling.html
nav: tools
---
{% extends "layouts/page.njk" %}

{% block head %}
    <style>
        /* Page-only CSS; `<style>` at col 4, inner rules at col 8. */
        .page-only { … }
    </style>
{% endblock %}

{% block content %}
<main>

    <div class="section-header">…</div>

    <div class="tool-card">…</div>

    <a class="back-link" href="/tools/">← All tools</a>

</main>
{% endblock %}

{% block scripts %}
<script src="/scripts/units.js"></script>
<script src="/scripts/pid-engine.js"></script>
<script>
    // page logic
</script>
{% endblock %}
```

Frontmatter:

- `title` — verbatim for `<title>` and `og:title`.
- `description` — verbatim for `<meta name=description>` and
  `og:description`. **140–160 chars**, human-written, never reused —
  enforced by `descriptionLengthGuard` in `.eleventy.js` (fails the
  build on out-of-range). Renders HTML-autoescaped, so rephrase to
  avoid `'` and `<` if clean view-source matters.
- `canonical` — full URL with `.html` extension; used for `og:url`.
- `nav` — one of `home`, `tools`, `simulators`, `education`,
  `practice`, `contact`; drives the `.active` marker. Omit on pages
  that don't fit.

Blocks: `head` (optional — inline `<style>` or head-loaded script;
Turnstile on `contact.html` is the only current head-script example);
`content` (required); `scripts` (end-of-body — shared `<script src>`
first, then the page's inline `<script>`, since the inline code
references symbols the shared scripts export).

### Sitemap

`html/sitemap.njk` renders `_site/sitemap.xml` at build time from the
`sitemapPages` collection (every template with a `canonical`
frontmatter). `<lastmod>` comes from the `gitLastmod` filter
(`git log -1 --format=%cd --date=short`), falls back to build date.
A new page with `canonical` is picked up automatically — but **update
the `PAGES` array in `tests/smoke.spec.js`** (the drift test checks
it against the built sitemap). CI uses `fetch-depth: 0` so dates
resolve.

### Conventions

- **Anchor `href`s use explicit `.html` extensions** (e.g.
  `/tools/signal-scaling.html`, `/contact.html`); directory URLs (`/`,
  `/tools/`) stay clean. Works against the eleventy dev server,
  against `python -m http.server` serving `_site/`, and against the
  Worker (which redirects to the clean form). Asset references
  (`/styles.css`, `/scripts/…`) are absolute. The `html.11tydata.js`
  permalink override is what keeps this working — 11ty's pretty-URL
  default would break it.
- **Indentation: 4 spaces** everywhere — HTML, CSS, JS, Nunjucks
  template syntax.
- **ID naming: kebab-case site-wide.** Every `id="…"` is lowercase
  ASCII letters, digits, and hyphens. Hyphens separate words;
  digits attach without a hyphen when they're part of a token
  (`d1`, `pc-w1`, `bal-f4-sup-a`). No underscores, no camelCase.
  Per-page id prefixes match the widget-CSS prefixes already in
  `styles.css` (e.g. `pc-*` for pump-control, `bal-*` for balancing,
  `psy-*` for psychrometric) — grep `styles.css` for the full set
  when starting a new page. The same id rule applies to in-page JS
  string literals, template-literal id construction, CSS selectors
  inside `{% block head %}`, and `aria-labelledby` /
  `aria-describedby` / `for=` targets.
- **Vanilla JS only** — no libraries, no client-side frameworks. The
  11ty build templates the shared chrome and does nothing else; JS
  ships to the browser exactly as written, no transpile. Per-page
  logic in an inline `<script>` inside `{% block scripts %}`;
  genuinely shared JS goes in `html/scripts/` as a classic script.
- Prefer semantic HTML over div soup. Fast and accessible: no heavy
  media, no auto-play, no tracking or analytics.
- **Form-input labels are `<label for="…">`, not `<span>`.** In the
  property-sheet pattern, `<label class="ps-label" for="x">` pairs
  with `<input/select/textarea class="ps-input" id="x">`. Rows that
  label a *readout* (`<span class="ps-value">`) stay `<span>` —
  `for=` is only valid for form controls. For a button group, use
  `<div role="group" aria-labelledby="…">` with the caption carrying
  the matching `id=`; the caption's class matches the container's
  type peers (`field-label` inside `.field`, `ps-label` inside
  `.ps-row`). A `<label>` without `for=` or a wrapped control has no
  semantic meaning; implicit `<label><input> Text</label>` wraps are
  fine.
- **Skip-to-content link + `<main id="main">`.** Layout renders
  `<a href="#main" class="skip-link">` as the first body child; every
  `<main>` must carry `id="main"` or the link jumps nowhere.
  Section-header containers use `<div class="section-header">` +
  `<div class="section-line">`; `<section>` is reserved for actual
  document-outline sections, not visual chrome.
- **Heading hierarchy.** Exactly one `<h1>` per page — usually
  `.tool-card-title`; on landings without a tool-card, the eyebrow
  `.section-label` carries it instead. `.section-label` /
  `.ps-section-label` / `.subhead` are `<h2>`; callout cards and
  nested `.tool-card-title`s are `<h3>`. The label classes are
  element-agnostic and reset `margin: 0`.
- **Section-label eyebrow shape.** Deep pages (tools, simulators,
  education, practice) use the `<Section> · <Page Name>` shape in
  their `<span class="section-label">` — e.g. `Tools · Signal
  Scaling`, `Simulators · PID Tuner`, `Education · Hydronic Loops`.
  The section word matches the top-nav active section. Landings
  carry just the section word as the page's `<h1>` (`Tools`,
  `Simulators`, etc.). Avoid bare-category eyebrows (`Loops`,
  `Drives`, `Logic`) — they fragment the shape across sections and
  read as ad-hoc taxonomy.
- **`titleShort` discipline (nav cards).** Use the conventional
  in-trade abbreviation if one exists (`PID`, `VFD`, `BACnet`,
  `P-T`, `FB`); otherwise the full title. Drop trailing scaffolding
  words like `Calculator`, `Converter`, `Interface`, `Helper`. Don't
  invent informal shortenings (`Hyd`, `Sig`, `Econ`, `Ctrl`, `Reg`,
  `Net`, `Fn`) — those save keystrokes, not recognition. Length cap
  still applies (see *Design landmarks → Nav cards*).
- **Education page scope rule** (one question per page, forward-link
  for adjacent topics) lives in `site-ideas-and-friction.md` under
  "Education page scope — one question per page."
- **Forward-link convention:** anchor only if the target page exists
  today; if it's still a future page, write the topic as plain prose
  so a visitor doesn't click into a 404. Either way, the friction file
  tracks the topic as `[future: <page>]`.
- **Placeholder-content markers:** unverified data in a shipped page
  carries an HTML comment
  `<!-- // user to verify <thing> — placeholder data, refine after review -->`,
  ideally above and below the block. The `//` prefix is the
  site-wide marker; pair with `TODO` / `FIXME` / `XXX` when grepping
  in sweeps.

### Gotchas

- **Inline `<style>` in `{% block head %}` is indented to column 4**
  to match the surrounding head context (which is itself indented to
  column 4 inside the rendered `<head>`). Inner CSS rules sit at
  column 8. The `vfd-mock.html`, `pump-control.html`, and
  `psychrometric-chart.html` heads are the canonical references.
- **SVG files in `html/assets/` must avoid `--` sequences inside
  `<!-- comments -->`.** ImageMagick's librsvg parser rejects them as
  invalid XML even though most browsers tolerate them. Write `bg` or
  "the bg color" rather than `--bg` when referring to a custom
  property in a comment.
- **Turnstile on `contact.html`.** Never goes idle, so Playwright
  navigations use `waitUntil: 'domcontentloaded'` (not `'networkidle'`).
  On sandboxed/CI localhost it can't reach `challenges.cloudflare.com`,
  produces unfilterable `pageerror` + `console.error` noise, and fires
  `onTsError` which disables the submit button. Callbacks
  (`window.onTsOk` / `onTsExpired` / `onTsError`) live on `window` so
  the widget's `data-callback` attrs can find them; they only flip the
  submit button's `disabled` state. `smoke.spec.js`'s `contact loads
  cleanly` check passes by racing in before Turnstile's failure
  surfaces — don't extend that `watchErrors` pattern to
  `contact.spec.js`. `contact.spec.js`'s "empty submit" route-blocks
  `challenges.cloudflare.com` before navigating so the click is
  deterministic (codebase-issues #55).
- **`aria-pressed` flicker on units toggle is accepted.** Nav buttons
  hard-code `aria-pressed="true"` for US at render time; the head
  units-bootstrap sets `[data-units]` before paint but can't reach
  the buttons (not parsed yet). `units.js` re-syncs `aria-pressed`
  at end-of-body. For a few tens of ms a screen reader on a metric
  device hears "US toggled on" while the page already displays
  metric. No clean fix.
- **Selectors targeting SVG geometry are attribute-only, not
  element-qualified.** Pipe runs mix `<line>` and `<path>`, so
  `path[id^="d1-return"]` silently drops half. Use `[id^="d1-return"]`
  (no element qualifier) in both `querySelectorAll` and CSS. Applies
  to `flow-engine.js` and any future SVG-id-pattern enumeration.
- **Converging-flow segments need to be drawn as two paths.** On a
  diverting-valve tee, one unified line can't animate both directions
  and would miscolor the still-hot half as return. Split into two
  segments (e.g. `lp-3wd-coil-to-tee` left half dashed/return walking
  L→R; `lp-3wd-bypass-to-tee` right half solid/supply walking R→L).
- **Gutter schematic-bg is hidden below 1240px viewport.** Don't
  use motifs to convey page semantics — they're chrome. The cutoff
  is deliberate: anything that small is a "field device" (laptop on
  a roof, phone on a ladder, tablet in a mech room), and load
  weight outranks decoration there. Print also drops them. The
  reduced-motion path keeps them visible but snaps them to drawn
  state instead of revealing.
- **`[data-sbg-stroke]` draw-in uses a single fixed dasharray, not
  per-path normalization.** The CSS rule sets
  `stroke-dasharray: 600; stroke-dashoffset: 600` on every
  `[data-sbg-stroke]` element (motif paths are ~200 user units at
  most). Three earlier approaches — `getTotalLength()`-driven
  `--sbg-len`, `pathLength="1"` on every element, and case-split
  `pathLength="1"` on safe straight elements only — all hit
  Chromium quirks. The last attempt (case-split on `<line>` /
  L-only `<path>`) failed in a particularly subtle way:
  `pathLength="1"` IS honored for `getTotalLength()` (the API
  returned the actual geometric length, 104px on a sample line),
  but NOT for `stroke-dasharray` computation, where Chromium
  treats `1` as 1 actual pixel and renders the path as ~50 tiny
  speckled dashes instead of one normalized dash. Permanent
  fallback: trust the fixed-600 + accept that short paths finish
  drawing in ~10% of the transition. See codebase-issues #69.
- **`FlowEngine.init()` is idempotent.** `schematic-bg.js` calls
  it once site-wide on DOMContentLoaded; page-level
  `FlowEngine.init()` calls in education pages with their own
  animations (hydronic-loops, load-piping, balancing) are
  effectively refreshes — the `frameStarted` guard prevents a
  second rAF loop and `poolsByEl` de-dupes pool registration.
  Pages with no `[data-flow]` / `[data-pulse]` elements can omit
  their own init entirely (it's still called once by
  `schematic-bg.js`).

## Repo structure

- `html/` — source (input to 11ty). Pages, `_includes/` partials,
  `styles.css`, `scripts/`, `assets/`, `sitemap.njk`, `robots.txt`,
  `html.11tydata.js`.
- `src/worker.js` — the Cloudflare Worker.
- `tests/` — Playwright specs (`smoke.spec.js`, `contact.spec.js`,
  `psychro-engine.spec.js`).
- `_site/` — build output (gitignored).
- `docs/` — archived audit artifacts and one-shot prompts.
  `docs/audits/<topic>/` collects the triage / decisions /
  implementation docs from each completed audit cycle in one
  place; `docs/prompts/` collects one-shot creative briefs.
- Root: `CLAUDE.md`, `README.md`, `site-ideas-and-friction.md`,
  `codebase-issues.md`, `content-audit.md`, `.eleventy.js`,
  `wrangler.jsonc`, `package.json`.

## Design landmarks

Cross-cutting decisions. For per-page history and *why*, see
`site-ideas-and-friction.md`; for the user-facing tour, see
`README.md`. This section only carries what's load-bearing when
adding or moving pages.

- **Shared top nav:** Home / Tools / Simulators / Education /
  Practice / Contact. `nav` frontmatter drives `.active`. Tools /
  Simulators / Education / Practice link to hub landings.
- **Page archetypes:**
  - *Tools* mostly use the **property-sheet layout** (`.ps-*` +
    `.ref-table-dense`). Two grid flavors:
    - `.tool-body-2col` + sibling `.tool-body-row` — Input | Output
      side-by-side, reference / worked-example flowing full-width
      beneath (the dominant pattern). The `.tool-body-row` can sit
      inside a `.tab-pane` (per-tab worked example) or as a sibling
      of all tab-panes inside `.tool-card` (shared reference) —
      `switchTab` in `ui.js` only toggles `.tab-pane` descendants.
    - `.tool-body-3col` — Input | Output | Reference side-by-side.
      Right for tools whose Reference column has comparable density
      (`psychrometric-chart`, `thermistor-calculator`).
      Codebase-issues #29 documents when *not* to reach for this.
  - *Simulators* (`/simulators/`) keep **custom stacked layouts** —
    a running model doesn't fit Input/Output/Reference.
  - *Education* pages use the **lesson layout** (`.tool-card` /
    `.tool-body`). **Prose sits above each diagram; the diagram is
    the visual capstone.**
  - *Practice* pages (`/practice/<slug>.html`) wrap the shared
    `Quiz` engine: a single `.tool-card` containing an empty
    `<div id="quiz"></div>`, with an inline IIFE that defines a
    `const questions = [...]` bank and calls `Quiz.mount`. The
    engine owns every DOM node inside the mount target (settings
    row, progress, prompt, choices/numeric, reveal panel, results
    card). See `html/scripts/quiz-engine.js` for the schema + the
    Modbus Decoding page for canonical wiring.
- **Nav cards** are rendered by the `navCard()` macro in
  `_includes/nav-card.njk` (NOT hand-rolled) for all landings.
  Hero-frame shape with `.nav-card-titlebar` + `.nav-card-body` +
  `.nav-card-statusline`. Section drives an accent cascade
  (`.nav-card--{home,tools,education,simulators,practice}`). Trim
  `titleShort` enough to fit one line at the 4-col 1920px breakpoint
  — the title region clips with ellipsis, so over-long values
  truncate silently.
- **Tools landing** has a filter-chip row above the card grid;
  bump the All chip count when adding a tool, add a per-category
  chip if the new tool opens a new category. **Simulators landing**
  is the same grid minus chips — add chips back if it grows past
  ~6 entries. **Practice landing** is two H2 sections (Content
  Quizzes / Field Drills) with a topic chip row above; chips
  collapse both grids into a flat filtered view, `[All]` restores
  the sectioned layout. Drill cards use `category: 'field'` (no
  chip) so they hide under any topic-specific chip.
- **Legacy redirects.** When a page moves between sections, add the
  old URL to `LEGACY_TOOL_REDIRECTS` in `src/worker.js`. The Worker
  301s old paths to the new ones so inbound links keep working.

## Design system

The design system lives in `html/styles.css` — flat "workstation"
look (white panels on light gray-green chrome, hairline borders,
green accent) with quiet nods to BAS UIs. Light-only
(`color-scheme: light`). A new tool/page should be built from this
vocabulary, not freshly styled. Read `styles.css` for the full
component catalog — it's terse and well-grouped with section
headers.

- **CSS custom properties** in `:root` are the theme — change colors
  there, not by hardcoding. **No `var(--x, #hex)` fallbacks**:
  `var(--x)` is the canonical form site-wide. If a property is ever
  removed from `:root` without removing its consumers, `var(--x)`
  returns empty and the consumer no-ops the color — louder failure
  mode than a stale fallback hex.
- **Focus indicators (`:focus-visible`)** live in one consolidated
  `FOCUS INDICATORS` block in `styles.css` (the browser default
  outline is suppressed elsewhere). When adding a new custom-styled
  interactive element with a `:hover` rule, add its selector to that
  block — don't scatter a one-off rule next to the `:hover`.
- **Column-grid family** — `.tool-body-2col` / `.tool-body-3col` /
  `.tool-body-row` all live in `styles.css`. Each grid sits directly
  inside a `.tab-pane` or `.tool-card`, not inside a padded
  `.tool-body`; tabs above take `.tabs.tabs-flush`. Collapse
  breakpoints: 3col at ≤1000px, 2col at ≤900px. `.tool-body-row`
  stays full-width.
- **Widget chrome** (`.widget-*`) is shared in `styles.css`; widget
  INTERNALS (LCDs, keypads, pump-curve canvases, valve pills) stay
  in each page's `{% block head %}` since only that page uses them.
- **Prose typography utility classes are element-qualified**
  (`p.bit-hint`, `p.pid-note`, `p.ref-note`, `p.tool-preamble`).
  The `p` is load-bearing — it ties `.tool-body p` on specificity
  and wins on cascade. Keep that shape when adding new small-text
  utility paragraphs.

### JS patterns

- **Event wiring:** every page wraps its inline script in an IIFE
  (`(function () { … })();`) and binds events with
  `addEventListener` against element ids. Buttons that need to pass
  themselves to a handler go through an arrow wrapper:
  `btn.addEventListener('click', e => fn(arg, e.currentTarget))`.
  Where several buttons share a handler shape, prefer `data-*`
  attributes + a single `querySelectorAll` loop over per-button
  bindings. No inline `on*` attributes anywhere.
- **Declarations:** `const` by default; `let` only for genuinely
  reassigned bindings and for-loop counters. No `var` in shared
  scripts or page-inline IIFEs. The one intentional exception is
  the units-bootstrap one-liner in `_includes/head.njk`.
- **`'use strict';`** — first statement inside every page-inline
  IIFE and every shared classic script under `html/scripts/`.
  `src/worker.js` is an ES module (implicit-strict).
  `html/education/load-piping.html` is the one exception — no
  inline IIFE, just a top-level `FlowEngine.init()` call.
- **Validate-and-mute:** read inputs with `parseFloat`; if anything
  isn't finite (use `!isFinite(x)`, not `isNaN(x)` — `isFinite`
  also rejects `Infinity`, which matters on calcs like
  `1 / (max - min)` where equal bounds produce `Infinity`), set the
  result to `class="result-value muted"` with text `—` and clear
  the formula.
- **Tabs:** `.tab-btn` carries `data-tab="<name>"`, pane carries
  `id="tab-<name>"`, and one `querySelectorAll('[data-tab]')` pass
  wires them to `switchTab` (from `/scripts/ui.js`). `switchTab` is
  scoped to the clicked button's nearest `.tool-card`, so multiple
  tabbed tools on a page don't clear each other. See
  `tools/signal-scaling.html` for canonical wiring.
- **UI vocabulary:** **AI / AO** = analog input/output. Don't use
  "EU" — ambiguous; say "Eng. Units" / "Engineering Value" instead.

## Adding a new tool

1. Create `html/tools/<tool-name>.html` from the *Templating*
   skeleton. Pick a kebab-case page-id prefix that matches its
   widget-CSS prefix in `styles.css`.
2. Wrap page logic in an IIFE + `addEventListener` (see *JS patterns*);
   apply validate-and-mute on numeric inputs.
3. Add a `.nav-card` to the `.card-grid` on `tools/index.html`.
   Bump the All chip count and add a per-category chip if the new
   tool opens a category not already represented.
4. Add the page's URL to the `PAGES` array in `tests/smoke.spec.js`
   (the sitemap is automatic — see *Sitemap* — but the drift test
   fails until `PAGES` is updated).
5. Consider bumping the home-page hero's `Latest: <name>` badge
   to point at the new tool — `html/index.html`, the last entry
   in `.hero-badges`. Editorial pick; skip on small revisions.
6. Bump `package.json.version` when shipping something notable; the
   footer reads it via `html/_data/site.js`. A new tool is a minor
   bump (`1.X.0`); a bug fix is a patch bump (`1.X.Y`).

**Adding a new simulator** follows the same steps under
`html/simulators/` instead, with `nav: simulators` in the
frontmatter and the new `.nav-card` added to
`simulators/index.html`. No filter chips to recount there.

**Adding a new quiz / drill** follows a similar shape under
`html/practice/`:

1. Create `html/practice/<slug>.html`. Frontmatter `nav: practice`;
   `.tool-card` with the page's `<h1 class="tool-card-title">` +
   a short `.page-intro` + an empty `<div id="quiz"></div>`. See
   `practice/modbus-decoding.html` for canonical wiring.
2. `{% block scripts %}` loads `/scripts/quiz-engine.js`, then an
   inline IIFE defines `const questions = [ … ]` and calls
   `Quiz.mount('#quiz', questions, { slug: '<slug>', title: '…' })`.
   The slug **must be kebab-case** (engine validates) and is the
   namespace for `cf_quiz_<slug>_*` localStorage keys.
3. Question schema lives in `quiz-engine.js`'s header — `type` is
   one of `mcq` / `tf` / `gotcha` / `numeric`; shared
   `id` / `prompt` / `explain` / `learnMore` / `tags` across all
   types. `id` is kebab-case and stable across edits.
4. Add a `navCard` (section `'practice'`) to the appropriate H2
   section on `html/practice/index.html` — *Content Quizzes* if
   every question maps to an existing page, *Field Drills* if the
   scope is broader. Use `category: 'modbus'` (or the topic), or
   `category: 'field'` for drills with no specific topic. Bump the
   All chip count; add a per-topic chip if the new entry opens a
   topic not already represented.
5. Cross-link from the paired Education page via the
   `relatedLinks({...})` call — add a `quizzes:` group. If the quiz
   pairs 1:1 with a single lesson, also set `pairedQuiz:` (full URL)
   on the lesson's frontmatter and `pairedLesson:` (full URL) on the
   quiz's frontmatter — the head template emits reciprocal `hasPart`
   / `isPartOf` JSON-LD off those keys. Field drills with broader
   scope (multiple paired lessons) omit both — no single parent.
6. Add the new URL to `PAGES` in `tests/smoke.spec.js`; consider
   a behavioral spot-check for any new format the engine hasn't
   exercised yet.
7. Same `Latest:` badge + `package.json.version` rules as tools.

## Git conventions

Branch names, commit subjects, commit bodies, and PR descriptions
follow a fixed shape so history stays scannable in `git log --oneline`
and on GitHub. The `## Workflow` section below covers *when* each step
happens; this section covers *what those things should look like*.

### Branch names

`<type>/<slug>`, lowercase kebab-case, 3–6 word slug. Types:

- `issue-NN/<slug>` — one item from `codebase-issues.md` (e.g.
  `issue-15/pid-chart-extract`). The issue number is load-bearing
  for the sweep workflow.
- `fix/<slug>` — a bug fix not tracked in codebase-issues.
- `feat/<slug>` — a new tool, page, or visible feature.
- `refactor/<slug>` — behavior-preserving change.
- `docs/<slug>` — `*.md`, the friction file, comment-only sweeps.
- `chore/<slug>` — deps, build config, `.gitignore`, scaffolding.
- `test/<slug>` — test-only changes.

One issue or topic per branch; don't bundle.

### Commit subjects

Hybrid: lowercase, colon-separated, imperative mood, ≤72 chars,
optional `(#NN)` suffix when the commit closes a codebase-issues
item.

- **Code changes** use a *semantic-area* prefix naming the code area
  touched (e.g. `pid:`, `bacnet:`, `worker:`, `psychrometric:`,
  `flow-engine:`, `units:`). Cross-cutting concerns get their own
  (`a11y:`, `tests:`). Grep `git log --oneline` for the in-use set.
- **Non-code changes** use a *Conventional Commits type*: `docs:`,
  `chore:`, `test:`.

Examples:

    pid: extract drawPidChart + delta formatter to /scripts/pid-chart.js
    a11y: associate every form-input label with its control (#12)
    worker: defense-in-depth on /api/contact (#13)
    docs: catch CLAUDE.md drift after PR #8

When a change touches both code and docs in the same logical unit,
use the code-area prefix; the docs update is part of that scope.

### Commit bodies

Every non-trivial commit has a body covering two things:

1. **Why** — the motivating problem, constraint, or decision. Subject
   states *what*; body explains *why now*. The diff covers the rest.
2. **What changed, per file** — when the commit touches 3+ files,
   bullet `path/to/file.ext` + one-line note. Tells the reviewer
   where to focus before opening the diff.

Body wraps at 72 columns. Footer carries `Co-Authored-By:` when
Claude collaborated, and an optional
`Refs: codebase-issues#NN` / `Closes codebase-issues#NN` line.

Trivial commits (typo, punctuation, single-line CSS tweak) can ship
subject-only.

### PR descriptions

Every PR carries three required sections:

```markdown
## Summary

<1–3 sentences a stranger could read with no prior context — area,
change, and the why in one breath.>

## Changes

<Bulleted list of what shipped, grouped by file or logical chunk.
The human-readable diff index for reviewers.>

## Test plan

<Markdown checkbox list. `[x]` = done; `[ ]` = pending.>
```

Optional sections when relevant: `## Why now` (non-obvious timing),
`## Risk / rollback` (blast radius, revert procedure), `## Out-of-band`
(changes outside the PR diff — memory writes, dashboard config flips).

PR titles use commit-subject style. For multi-commit PRs the title is
thematic (area + umbrella change); individual commit subjects carry
per-step detail.

### Commits per PR

As many commits as make natural review chunks. A two-step extraction
ships as two commits; a doc fix caught during review ships as a third
on the same PR. Each commit body follows the why + what-per-file rule
independently. Don't squash mid-development (granularity helps
`git bisect` and makes review chunks visible), but don't fragment
unnaturally either — a typo fix doesn't need its own commit unless
it's genuinely separate from the work.

## Workflow

The standard loop is branch → edit → commit → push → open PR (shapes
under *Git conventions*). Stage specific file lists, not
`git add -A` / `git add .`.

- **Never merge by default.** `gh pr merge` only on explicit request
  ("merge it," "go ahead and merge"). The user merges on GitHub
  after review.
- **Log caught issues.** Code-quality issues noticed in passing —
  *even if unrelated to the current task* — get appended to
  `codebase-issues.md` under *Open*. Don't silently fix inline
  (scope creep) or drop on the floor; mention the appended entry
  to the user.
- **Sweep on convention shifts.** When a convention changes (new
  CLAUDE.md bullet, new shared rule in `styles.css`, new `:root`
  token, renamed id pattern, frontmatter-shape adjustment, new
  shared script) *or* when a new page lands, grep site-wide before
  closing the PR. Two directions:
  - *Convention → consumers.* Grep existing pages for the old
    pattern and update in the same PR.
  - *New page → conventions.* Re-run the *Adding a new tool*
    checklist against it before merging.

  Large sweeps log under `codebase-issues.md` rather than skip.

CI on every PR runs `npm test` (`.github/workflows/test.yml`);
Cloudflare Workers Build deploys `_site/` ~60s after merge.

## Local preview & tests

- **Preview:** `npm run dev` (`eleventy --serve --port=8000`, live
  reload).
- **Tests:** `npm test` (Chromium only). `playwright.config.js` has
  a `webServer` block that builds and serves `_site/`, so a fresh
  checkout needs no second terminal; a running `npm run dev` on
  port 8000 is reused. Specs in `tests/`: `smoke.spec.js` (every
  page: 200, title, nav, no console errors, behavior spot-checks),
  `contact.spec.js`, `psychro-engine.spec.js` (pure-Node engine
  math). Don't restructure scaffolding without being asked.
- **CI:** `.github/workflows/test.yml` runs the same `npm test` on
  every PR to `main`. Deploy stays with Cloudflare Workers Build —
  CI gates the PR, it doesn't deploy.
- **Eyeball a change:** `const { chromium } = require('@playwright/test')`
  + `page.screenshot({ path, fullPage: true })`. For `contact.html`
  use `waitUntil: 'domcontentloaded'`. Rebuild (`npm run build`)
  before screenshotting `_site/` unless `npm run dev` is running.

## About the user

- Background in building automation / controls programming (BACnet,
  Modbus TCP, Niagara, EBO); Northeast U.S.
- Solid IP networking fundamentals; learning software dev workflows;
  side project for "exploring vibe coding."
- Comfortable in a terminal, getting comfortable with Git.
- Wants to understand what's happening, not just have it work — when
  introducing a new concept or command, briefly explain it.

## Roadmap

Near-term work — new tools, psych chart *floating state-point chip*,
more Education pages — lives in `site-ideas-and-friction.md`
(feature ideas) and `codebase-issues.md` (code-quality holds).
