# controlsfreak.dev

A field-reference tool site for building-controls engineers — open
calculators and lookup utilities for BACnet, Modbus, HVAC, and building
automation work, plus plain-English explainers. "No login, no ads, just
tools that are actually useful on a job site." Source pages under
`html/` plus a small Cloudflare Worker (only for `/contact`). The
toolchain is deliberately minimal: 11ty (Eleventy) templates the
shared chrome — `<head>`, nav, footer — out of every page;
everything else is vanilla. No client-side framework, no bundler, no
transpiler. View-source of the rendered page is still readable HTML,
and browsers ten years from now will still run it. There's a personal
"About" card on the home page, but the project is the tools, not a
personal homepage.

For per-page design history, scope decisions, and ideas-not-yet-shipped,
see `site-ideas-and-friction.md`. For open code-quality items needing a
decision, see `codebase-issues.md`. For the user-facing tour of what
the site does, see `README.md`.

## Stack

- **Eleventy (11ty) build pipeline.** `.eleventy.js` runs every
  `.html` file under `html/` through Nunjucks and writes to `_site/`.
  Pages carry YAML frontmatter and extend the shared layout (see
  *Templating*, below). Static assets (`scripts/`, `styles.css`,
  `assets/`, `robots.txt`, `sitemap.xml`) are passthrough-copied at
  the same relative paths the pages reference. Build is fast (~0.2s
  for 17 pages); there's no JS transpile or bundle step — Nunjucks
  is the only thing the build does. Cloudflare Workers Build runs
  `npm install && npm run build` on push to `main`; the deploy
  serves `_site/`.
- **Templates under `html/_includes/`:**
  - `layouts/page.njk` — the page shell. Renders `<!DOCTYPE html>` /
    `<html>` / `<head>` (via `head.njk`) / `<body>` / nav (via
    `nav.njk`) / page content / footer (via `footer.njk`). Exposes
    three named blocks for pages to fill: `{% block head %}` (inline
    `<style>` or third-party loader scripts in the head),
    `{% block content %}` (everything between nav and footer),
    `{% block scripts %}` (end-of-body scripts — shared script
    `<script src="…">` tags plus the page's inline `<script>`).
  - `head.njk` — the standard `<head>` block: meta charset/viewport,
    `<title>` / `<meta name="description">` / 6 Open Graph tags
    (filled from frontmatter), 3 favicon links, Google Fonts
    (preconnect + IBM Plex Mono + Overpass), `<link rel="stylesheet"
    href="/styles.css">`, the units-bootstrap inline script.
  - `nav.njk` — the shared top nav. `Tools` / `Education` / etc.
    take `.active` based on the `nav` frontmatter value.
  - `footer.njk` — `controlsfreak.dev — open tools…` line and the
    version string. Bump the version here when shipping something
    notable; it carries to every page automatically.
- **Directory data file:** `html/html.11tydata.js` — overrides 11ty's
  default pretty-URL permalink so `signal-scaling.html` lands at
  `_site/tools/signal-scaling.html` with its original filename
  intact (not `signal-scaling/index.html`). Load-bearing for two
  reasons: every anchor on the site uses explicit `.html` extensions,
  and wrangler's `assets.html_handling: auto-trailing-slash` expects
  `foo.html` files, not `foo/index.html` directories.
- **`html/styles.css`** — the shared design system. Every page picks
  it up via `head.njk`'s `<link rel="stylesheet" href="/styles.css">`.
  Shared rules live in the file; page-only rules stay inline via
  `{% block head %}`.
- **Shared scripts** in `html/scripts/` are **classic scripts** (not
  ES modules — there's no bundler doing module-graph work, and the
  shared helpers expose globals like `Units`, `simulatePid`, and
  `FlowEngine` that page IIFEs reach for by name).
  Loaded with `<script src="/scripts/xxx.js"></script>` inside
  `{% block scripts %}`, *before* the page's inline `<script>`.
  Today:
  - `pid-engine.js` — PID simulation core (FOPDT, conditional-
    integration anti-windup). Exposes `PID_PROC`, `simulatePid()`.
  - `flow-engine.js` — particle-flow animation for SVG schematics.
    Walks `<circle>` particles along paths annotated with
    `data-flow="supply"|"return"` via `getPointAtLength()`. Exposes
    `FlowEngine.init()`, `FlowEngine.refreshPath(el)`. Attribute
    conventions in `site-ideas-and-friction.md` under "Engine
    attribute conventions."
  - `thermistor-data.js` — R/T curves (`THERMISTOR_TYPES`). Curves
    are *generated* from a small parameter set (β, R25, shunt, R0,
    TCR); the file header lists per-type confidence (verified
    2026-05 — one PENDING: JCI 10K+8.7K shunt, no public R/T table).
  - `units.js` — site-wide US/metric toggle. State in `localStorage`
    (`cf_units`), 12 quantity conversions, DOM walker for
    `data-us` / `data-metric` spans, `unitschange` event on
    `document`. Exposes `window.Units`. The tiny inline bootstrap
    in `head.njk` reads `localStorage` before first paint to avoid
    a US flash for metric visitors.
  - `ui.js` — `switchTab(name, btn)`, `copyText(btn, text)`,
    `copyReadouts(btn, sep, ...ids)`. Clipboard failures fail
    silently (insecure context, no user activation).
- **Worker:** `src/worker.js` — ES-module Worker. Handles
  `POST /api/contact` (validate, drop honeypot hits silently, verify
  Turnstile, send via Resend with `reply_to` = submitter); falls
  through to `env.ASSETS.fetch(request)` otherwise. Secrets:
  `TURNSTILE_SECRET`, `RESEND_API_KEY` (`wrangler secret put …`). The
  Turnstile *site* key lives in `contact.html`. `from`/`to` =
  `contact@controlsfreak.dev` (verified Resend sender).
- **Fonts:** Google Fonts (IBM Plex Mono + Overpass) with `preconnect`
  — loaded once via `head.njk`. Self-hosting is reasonable future
  cleanup.
- **Hosting:** Cloudflare Workers. Auto-deploys on push to `main` via
  GitHub integration (~60s); the dashboard's build step runs `npm
  install && npm run build` before each deploy.
- **Config:** `wrangler.jsonc` — `name`, `main`, `assets.directory`
  (`./_site` — built output, not the source `./html/`),
  `assets.binding` (`ASSETS`), `assets.html_handling`
  (`auto-trailing-slash` — `/contact.html` redirects to `/contact`,
  `/tools/` serves `tools/index.html`), and `compatibility_date` are
  all load-bearing; touch carefully. `_site/` is gitignored — only
  source files commit.

### Templating

Every page in `html/` (other than the partials under `_includes/`)
has this shape:

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
        /* Page-specific CSS lives here. Indented to column 4 to
           match the rest of the head's indentation. Inner rules
           sit at column 8. */
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

Frontmatter fields:

- `title` — used verbatim for both `<title>` and `og:title`. Em-dashes
  and other Unicode are fine unquoted; quote the string if it contains
  a YAML-special character at the start (`-`, `?`, `:`-followed-by-
  space, etc.) or any of `: { } [ ] , & * # ? | < > = ! % @ \``.
- `description` — used verbatim for both `<meta name="description">`
  and `og:description`. 140–160 chars, human-written, never reused.
  **Important:** the description renders through `{{ description }}`
  which is HTML-autoescaped — an apostrophe becomes `&#39;`, a `<`
  becomes `&lt;`. Visually identical in the page and to search
  engines, but ugly in view-source. If a description has apostrophes
  and you'd rather they stay as `'` in the rendered HTML, rephrase
  to avoid them.
- `canonical` — full URL with `.html` extension. Used for `og:url`.
- `nav` — one of `home`, `tools`, `education`, `contact`. Drives the
  `.active` marker on the top nav. Omit (or use an empty string) on
  pages that don't fit one of those.

Blocks:

- `{% block head %}` is optional — only fill it if the page has
  inline `<style>` or a third-party loader script that has to go in
  the head (Turnstile on `contact.html` is the only current example).
- `{% block content %}` is required and holds everything between the
  nav and the footer — for almost every page, an outer `<main>…</main>`.
- `{% block scripts %}` is where end-of-body scripts go. Shared
  script `<script src="…">` tags first, then the page's inline
  `<script>`. The order matters — the inline script references
  symbols the shared scripts export.

The layout uses `trimBlocks: true` + `lstripBlocks: true`
(`.eleventy.js`), so empty `{% block %}{% endblock %}` pairs and
indented `{% include %}` tags don't leak stray whitespace into the
rendered HTML. Result: the rendered output looks like a hand-written
file.

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
- **Vanilla JS only** — no libraries, no client-side frameworks. The
  11ty build templates the shared chrome and does nothing else; JS
  ships to the browser exactly as written, no transpile. Per-page
  logic in an inline `<script>` inside `{% block scripts %}`;
  genuinely shared JS goes in `html/scripts/` as a classic script.
- Prefer semantic HTML over div soup. Fast and accessible: no heavy
  media, no auto-play, no tracking or analytics.
- **Education page scope rule** (one question per page, forward-link
  for adjacent topics) lives in `site-ideas-and-friction.md` under
  "Education page scope — one question per page."
- **Forward-link convention:** anchor only if the target page exists
  today; if it's still a future page, write the topic as plain prose
  so a visitor doesn't click into a 404. Either way, the friction file
  tracks the topic as `[future: <page>]`.

### Gotchas

- **`{{ description }}` is HTML-autoescaped.** Apostrophes become
  `&#39;`, quotes become `&quot;`. Renders fine, but if you care
  about clean view-source, rephrase to avoid those characters in the
  description. The title and canonical render through the same path
  but rarely contain those characters.
- **Inline `<style>` in `{% block head %}` is indented to column 4**
  to match the surrounding head context (which is itself indented to
  column 4 inside the rendered `<head>`). Inner CSS rules sit at
  column 8. The `vfd-mock.html`, `pump-control.html`, and
  `psychrometric-chart.html` heads are the canonical references.
- **Read→Write silently normalizes U+00A0 to ASCII space.** Caught
  once during the 11ty migration on `signal-scaling.html` — 4 NBSPs
  in the inline script (value/unit separators and before ⚠ glyphs)
  collapsed to ordinary spaces during a Write. Visually identical
  in most rendering contexts, but NBSP suppresses line breaks at
  that point. If a file has NBSPs and you're rewriting large
  chunks, audit before and after with
  `LC_ALL=C grep -ao $'\xc2\xa0' file | wc -l`; patch with `sed -i`
  using literal `\xc2\xa0` if drift is detected.
- **SVG files in `html/assets/` must avoid `--` sequences inside
  `<!-- comments -->`.** ImageMagick's librsvg parser rejects them as
  invalid XML even though most browsers tolerate them. Write `bg` or
  "the bg color" rather than `--bg` when referring to a custom
  property in a comment.
- **Turnstile never goes idle** — for Playwright on `contact.html` use
  `waitUntil: 'domcontentloaded'`, not `'networkidle'`.
- **Selectors targeting SVG geometry are attribute-only, not
  element-qualified.** Pipe runs mix `<line>` and `<path>`, so
  `path[id^="d1-return"]` silently drops half. Use `[id^="d1-return"]`
  (no element qualifier) in both `querySelectorAll` and CSS. Applies
  to `flow-engine.js` and any future engine enumerating SVG elements
  by id pattern.
- **Converging-flow segments need to be drawn as two paths.** On a
  diverting-valve tee, one unified line can't animate both directions
  and would miscolor the still-hot half as return. Split into two
  segments (e.g. `lp-3wd-coil-to-tee` left half dashed/return walking
  L→R; `lp-3wd-bypass-to-tee` right half solid/supply walking R→L).

## Repo structure

```
controlsfreak.dev/
├── CLAUDE.md
├── README.md
├── site-ideas-and-friction.md
├── codebase-issues.md
├── .eleventy.js              # 11ty config — passthroughs, Nunjucks options
├── wrangler.jsonc            # serves _site/ via env.ASSETS
├── package.json              # scripts: build / dev / test
├── src/
│   └── worker.js
├── html/                     # source (input to 11ty)
│   ├── html.11tydata.js      # permalink override — keeps .html extensions
│   ├── _includes/
│   │   ├── head.njk
│   │   ├── nav.njk
│   │   ├── footer.njk
│   │   └── layouts/
│   │       └── page.njk      # the shared layout, exposes 3 blocks
│   ├── index.html
│   ├── contact.html
│   ├── styles.css            # passthrough → _site/styles.css
│   ├── robots.txt            # passthrough
│   ├── sitemap.xml           # passthrough; hand-maintained, keep in sync
│   ├── assets/               # passthrough; og-image.svg/.png, favicons
│   ├── scripts/              # passthrough; pid-engine, flow-engine, …
│   ├── tools/
│   │   ├── index.html        # Tools landing (live grid + "Coming Soon")
│   │   ├── signal-scaling.html
│   │   ├── modbus-register-viewer.html
│   │   ├── pid-tuner.html
│   │   ├── bacnet-ip-converter.html
│   │   ├── psychrometric-chart.html
│   │   ├── thermistor-calculator.html
│   │   └── vfd-mock.html
│   └── education/
│       ├── index.html        # Education landing
│       ├── pid-basics.html
│       ├── hydronic-loops.html
│       ├── load-piping.html
│       ├── vfds.html
│       ├── pump-control.html
│       └── balancing.html
├── tests/                    # Playwright (smoke.spec.js, contact.spec.js)
└── _site/                    # build output — gitignored
```

## Design landmarks

Cross-cutting decisions that aren't obvious from any single file. For
per-page history and the *why* behind each, see
`site-ideas-and-friction.md`; for the user-facing tour, see
`README.md`.

- **Shared top nav** (`.site-nav`, in `nav.njk`): Home / Tools /
  Education / Contact. The `nav` frontmatter field on each page
  drives the `.active` marker; no JS. `Tools` and `Education` link
  to hub landings (`/tools/`, `/education/`).
- **Page archetypes:**
  - *Tools* mostly use the **three-column property-sheet layout**
    (`.tool-body-3col` + `.ps-*` + `.ref-table-dense`) — Input /
    Output / Reference side-by-side, Niagara-style label-left /
    value-right rows. Adopters: BACnet converter, Signal Scaling,
    Modbus Register Viewer, Psychrometric Chart (custom column
    split + page-widened to 1280px via `{% block head %}`),
    Thermistor (custom left-biased split). A tool with no useful
    reference content drops the third column and runs two
    (`grid-column: span 2` on Output).
  - *PID tuner* and *Mock VFD* keep **custom stacked layouts** — a
    simulator block doesn't fit Input/Output/Reference. PID tuner
    uses `.ps-section-label` standalone for its bottom Reference
    region.
  - *Education* pages use the **lesson layout** (`.tool-card` /
    `.tool-body`), NOT the 3-col pattern. **Prose sits above each
    diagram; the diagram is the visual capstone.**
- **Animation:** pages with pipe-flow diagrams load
  `/scripts/flow-engine.js`; pipes annotated with
  `data-flow="supply"|"return"` carry particle flow at constant
  velocity (so longer paths show as longer cycles — direct-vs-
  reverse-return pedagogy). Shared pipe-flow styling is `.edu-svg` /
  `.edu-legend` in `styles.css` (supply solid + `--blue`, return
  dashed + `--blue-cool`; the `flow-active` `[data-flow="return"]`
  override drops dashes while particles run). The VFDs page uses a
  page-local `.vfd-svg` for its block diagrams (no `data-flow`, no
  dashed-return concept), so the next pipe-flow Education page is
  the consolidation trigger for `.vfd-svg`.
- **Variable-flow story:** `load-piping` → `vfds` → `pump-control` →
  `balancing` form a quartet. Cross-links pay off forward-link debts
  between them. The twin-T subhead in `hydronic-loops.html` carries
  `id="d3"` so `load-piping.html`'s closing section can deep-link.
- **Tool ↔ Education pairings:** `tools/pid-tuner.html` ↔
  `education/pid-basics.html` (share `pid-engine.js`);
  `tools/vfd-mock.html` ↔ `education/vfds.html` (source-parameter
  pedagogy, with a parameter tree to navigate on the tool side).
- **Contact form:** `.tool-card` with name/email/message, an
  off-screen CSS honeypot (`.hp-field`, named `website`), Turnstile
  widget. POSTs form-encoded data to `/api/contact`.
- **Tools landing** shows live tools as a `.nav-card` grid above a
  "Coming Soon" `.tool-grid` of dimmed `.tool-preview` cards (the
  roadmap surface).

## Design system

The design system lives in `html/styles.css`. A new tool/page should
be built from this vocabulary, not freshly styled. Aesthetic: flat,
light "workstation" look — white panels on light gray-green chrome,
hairline borders, a green accent — with quiet nods to BAS UIs
(slightly shaded panel headers, property-sheet-style zebra tables,
flat underlined tabs). No drop shadows, no background texture.
Light-only (`color-scheme: light`); no dark variant.

- **Layout:** body is a flex column (`min-height:100vh`) with
  `main { flex: 1 }` so the footer sits at the viewport bottom on
  short pages. `main` / `.hero` / `footer` need `width: 100%` alongside
  `margin: 0 auto` — without it, `margin: 0 auto` on a flex child
  shrinks instead of centering.
- **CSS custom properties** in `:root` — change colors by editing
  these, not by hardcoding. Surfaces: `--bg`, `--surface`,
  `--surface-2` (panel headers/table heads), `--surface-3` (recessed
  reference panels). Borders: `--border`, `--border-faint`. Accents:
  `--accent` (`#43881c` green), `--accent-dim`, `--accent-glow`.
  Text: `--text`, `--text-bright`, `--text-dim`. Data: `--blue`
  (`#1577b8`, live readouts; "supply water"; "cooling/dehum" on the
  psych chart), `--blue-cool` (`#5e8aa0`, "return water" paired with
  dashed line), `--red` (fault/alarm), `--heat` (`#c8782a`, "heating"
  on the psych chart). Fonts: `--mono` (IBM Plex Mono), `--sans`
  (Overpass). The canvas chart reads colors via `getComputedStyle` at
  draw time.
- **Three-column layout** — the grid sits directly inside a
  `.tab-pane` or `.tool-card`, not inside a padded `.tool-body`;
  tabs above take `.tabs.tabs-flush`. A row's value can be `.ps-value`
  (mono) — plus `.live` / `.muted` / `.error` — or an
  `input.ps-input` / `select.ps-input` / `textarea.ps-input` (the
  form-control variant; qualified by element so it outranks the
  global `input[type=…]` / `select` block). At ≤900px columns
  collapse to a single stack; purpose-built mobile is a future task.
  Naming gotchas: `.ps-section-label` is named that to avoid
  collision with `.section-label` (in `.section-header`); the live-
  value modifier is `.live` to avoid collision with `.readout` (the
  bit-viewer / PID-metrics box).
- **Widget chrome (`.widget-*`)** — the recessed-panel idiom used by
  the interactive widgets on `pump-control` (×2), `balancing`,
  `vfds`, `vfd-mock`, `hydronic-loops` (d3 twin-T injection-pump
  widget). `.widget` is the outer recessed `--surface-3` panel;
  `.widget-try` is the "Try this:" prompt-link row; `.widget-section-label`
  is the mono caps label; `.widget-slider-head` + `.v` is the
  label-with-blue-live-value row above a `.widget-slider`;
  `.widget-readout-label` / `.widget-readout-value` (+ `.unit`) is
  the labeled blue mono readout; `.widget-anecdote-wrap` reserves
  vertical space so a `.widget-anecdote` reveal doesn't reflow the
  page below. `.widget-anecdote.warn` flips the left rule to
  `--red` for failure callouts. `.widget-fan` / `.widget-fan-blades`
  is the 5-blade fan icon shared between the vfds run/speed widget
  and pump-control's Widget 1; pages add their own positioning
  rules (e.g. `.vfd-w-status-row .widget-fan`,
  `.pc-w-fan-wrap .widget-fan`) and own their own animation loop.
  Widget INTERNALS (LCDs, keypads, branch states, valve pills,
  temperature swatches, pump-curve canvases) stay in each page's
  `{% block head %}` since only that page uses them.

For the full component vocabulary, read `styles.css` — it's terse and
well-grouped.

### JS patterns

- **Event wiring:** every page wraps its inline script in an IIFE
  (`(function () { … })();`) and binds events with
  `addEventListener` against element ids. Buttons that need to pass
  themselves to a handler (e.g. for an active-class toggle) go
  through an arrow wrapper: `btn.addEventListener('click', e =>
  fn(arg, e.currentTarget))`. Where several buttons share a handler
  shape, prefer `data-*` attributes + a single `querySelectorAll`
  loop over per-button bindings. The convention is uniform — no
  inline `on*` attributes anywhere.
- **Declarations:** `const` by default; `let` only for genuinely
  reassigned bindings and for-loop counters. No `var` in shared
  scripts under `html/scripts/` or in page-inline IIFEs. The one
  intentional exception is the units-bootstrap one-liner in
  `_includes/head.njk`, which runs before first paint and stays
  maximally conservative.
- **Validate-and-mute:** read inputs with `parseFloat`; if anything
  isn't finite (use `!isFinite(x)`, not `isNaN(x)` — `isFinite`
  also rejects `Infinity`, which `isNaN` doesn't, and the
  difference matters on calcs like `1 / (max - min)` where equal
  bounds produce `Infinity`. See codebase-issues #2), set the
  result to `class="result-value muted"` with text `—` and clear
  the formula.
- **Tabs:** `switchTab(name, btn)` (from `/scripts/ui.js`) is scoped
  to the clicked button's nearest `.tool-card`, so a page with
  multiple tabbed tools doesn't clear another's panes.
- Lookup tables for fixed domain data (e.g. `SIG`: signal type →
  `{ min, max, unit }`; `PID_PROC`: process type → FOPDT params).
- **UI vocabulary:** **AI / AO** = analog input/output. Don't use
  "EU" — ambiguous (electrical vs engineering unit); say "Eng. Units"
  / "Engineering Value" instead.

## Adding a new tool

1. Create `html/tools/<tool-name>.html` from the template shape (see
   *Templating* above for the full skeleton):
   - **Frontmatter:**
     - `title` — unique, ending in `— controlsfreak.dev`.
     - `description` — 140–160 chars, human-written, never reused
       (duplicate metadata is worse than none). Avoid apostrophes
       and quotes unless you're OK with `&#39;` in view-source.
     - `canonical` — full URL with `.html` extension.
     - `nav: tools`.
   - `{% extends "layouts/page.njk" %}` directly after the
     frontmatter.
   - `{% block head %}` only if the page needs inline `<style>` or a
     third-party loader script — `<style>` indented to column 4,
     inner rules to column 8.
   - `{% block content %}` wrapping `<main>` with `.section-header`
     + the `.tool-card` + an
     `<a class="back-link" href="/tools/">← All tools</a>`.
   - `{% block scripts %}` with the shared script tags first
     (typically `<script src="/scripts/units.js"></script>`, plus
     any engines like `pid-engine.js`), then the page's inline
     `<script>`.
   - Anchor `href`s use explicit `.html` extensions.
2. For the page's logic, use the IIFE + `addEventListener` pattern
   (see *JS patterns*). Apply validate-and-mute on numeric inputs.
3. Add a `.nav-card` for the page to the `.card-grid` on
   `tools/index.html`.
4. If it graduates a Coming-Soon item, delete the matching
   `.tool-preview` card from `tools/index.html`.
5. Add the page's URL to `html/sitemap.xml` (hand-maintained — no
   generator).
6. Bump the version string in `html/_includes/footer.njk` when
   shipping something notable (currently `v1.3 · 2026`, carried by
   every page automatically).

## Workflow

Claude Code edits source files and may write commits when explicitly
asked, but defaults to waiting for permission. Specifically:

- **Editing files** — go.
- **`git commit`** — wait for explicit permission ("commit this," "go
  ahead and commit," etc.). Don't auto-commit at the end of a task,
  even if the work is "obviously done." Drafting a commit message in
  text for the user to review is fine and often welcome.
- **`git push`** — the user mostly pushes themselves after reviewing
  the local commit. Only push when the user explicitly asks, or when
  they're hitting errors with their own push and want help.
- **`git add`** — staging is implicit in commit permission. When
  staging, prefer specific file lists over `git add -A` / `git add .`
  to avoid sweeping in stray files.
- **Logging caught issues** — any code-quality issue noticed in
  passing, *even if unrelated to the current task*, gets a new entry
  appended to `codebase-issues.md` under *Open*. Don't silently fix
  it inline (scope creep) and don't drop it on the floor (it'll get
  lost). Mention it to the user when surfacing it so they know to
  expect the appended entry.

Typical loop: user asks for a change → Claude edits source under
`html/` → user reviews the diff → user says "commit" → Claude commits
→ user pushes → Cloudflare Workers Build runs `npm install && npm run
build` → deploy serves `_site/` within ~60s.

## Local preview & tests

Two ways to view the site locally:

- **Live-reload dev server:** `npm run dev` — runs
  `eleventy --serve --port=8000`. Rebuilds and reloads on every
  source change. Best for iterating on a page.
- **Build + static-serve:** `npm run build && python3 -m http.server
  8000 --directory _site` — produces the same `_site/` Cloudflare
  serves and exposes it on `http://localhost:8000`. This is what the
  Playwright specs expect; start the server yourself before running
  tests (there's no `webServer` block in the Playwright config).

Tests:

- **Run:** `npm test` (or `npx playwright test --reporter=list`).
  Specs in `tests/`: `smoke.spec.js` (every page: 200, title, nav,
  no console errors, plus behavior spot-checks) and
  `contact.spec.js` (the form). Chromium only. Don't restructure
  the Playwright scaffolding (config, `package.json` scripts)
  without being asked.
- **Eyeball a change:** `@playwright/test` re-exports browsers — use
  `const { chromium } = require('@playwright/test')`,
  `page.screenshot({ path, fullPage: true })`, read the PNG. Useful
  for canvas rendering, layout, console errors. For `contact.html`
  use `waitUntil: 'domcontentloaded'` (Turnstile never goes idle).
  Remember to rebuild (`npm run build`) before screenshotting if
  you're serving `_site/` and haven't been running `npm run dev`.

## About the user

- Background in building automation / controls programming (BACnet,
  Modbus TCP, Niagara, EBO); Northeast U.S.
- Solid IP networking fundamentals; learning software dev workflows;
  side project for "exploring vibe coding."
- Comfortable in a terminal, getting comfortable with Git.
- Wants to understand what's happening, not just have it work — when
  introducing a new concept or command, briefly explain it.

## What to avoid

- Don't write raw HTML pages without frontmatter + `{% extends %}` —
  templated form is the convention. The build won't error on a
  missing layout (the file would just render as-is), but it'd ship
  a page that doesn't match the rest of the site.
- Don't move page-local CSS or scripts into the shared partials
  (`head.njk`, `nav.njk`, `footer.njk`). Page-only rules belong in
  the page's `{% block head %}` or inline `<script>`.
- Don't restructure `html.11tydata.js` or `.eleventy.js` casually —
  the permalink override and the passthrough mappings are
  load-bearing.
- Don't suggest adding a client-side framework, a bundler, or a JS
  transpiler. The 11ty build templates the HTML chrome; nothing
  touches the JS or CSS shipped to the browser.
- Don't run Git commands on the user's behalf.
- Don't modify `wrangler.jsonc` casually — see Stack notes.
- Don't add tracking, analytics, or third-party scripts.
- Don't restyle existing tools to introduce a new look — extend the
  design system in `styles.css` instead.
- Don't inline CSS that belongs in `styles.css`, and don't move
  page-only rules into it.

## Roadmap

Near-term tools are tracked as `.tool-preview` cards in "Coming Soon"
on `tools/index.html`. Other near-term work — thermistor *identify
mode*, psych chart *floating state-point chip*, more Education pages
— lives in `site-ideas-and-friction.md`.

Block C (post-migration cleanup) landed 2026-05-16: the
`isFinite`-vs-`isNaN` retrofit (#2), the inline-handler →
`addEventListener` retrofit across the 8 older pages (#3), and the
widget-shell CSS consolidation under the shared `.widget-*` prefix in
`styles.css` (#5) are all done. Remaining open entries in
`codebase-issues.md` (#6 psychrometric monolith, #7 worker rate-limit,
#8 reduced-motion) are explicit *hold* decisions, not pending work.
