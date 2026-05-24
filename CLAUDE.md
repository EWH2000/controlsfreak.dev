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
  `.html` under `html/` through Nunjucks and writes to `_site/`.
  Pages carry YAML frontmatter and extend the shared layout (see
  *Templating*). Static assets (`scripts/`, `styles.css`, `assets/`,
  `robots.txt`) are passthrough-copied; `sitemap.xml` is generated
  (see *Sitemap*). Build is fast (~0.3s for 30 pages); Nunjucks is
  the only thing the build does — no JS transpile or bundle step.
- **Templates under `html/_includes/`:**
  - `layouts/page.njk` — the page shell. Composes `head.njk` /
    `schematic-bg.njk` / `nav.njk` / `footer.njk`, loads the
    site-wide shared scripts (`flow-engine.js`, `schematic-bg.js`)
    at end-of-body, and exposes three named blocks (`head`,
    `content`, `scripts`) for pages to fill. See *Templating* for
    the block contract.
  - `head.njk` — standard `<head>`: meta tags, OG tags from
    frontmatter, favicons, Google Fonts, `/styles.css`, units-bootstrap
    inline script.
  - `nav.njk` — shared top nav; `.active` driven by the `nav`
    frontmatter value.
  - `footer.njk` — tagline + version string. `{{ site.version }}`
    re-exports `package.json.version` via `html/_data/site.js`, so
    bumping the version is a one-line edit in `package.json`. Bump
    cadence under *Adding a new tool*.
  - `schematic-bg.njk` — the gutter schematic-collage: two narrow
    vertical SVG strips in the side gutters, each holding ~60
    inline-SVG motifs (pipe-valves, pump-coils, AI/AO terminals,
    BI/BO terminals, logic-chains, BACnet/IP nodes) drawn from a
    `motifBody` macro. Included by `layouts/page.njk` directly —
    no per-page opt-in. Hidden below 1240px viewport ("field
    device" cutoff — see *Gotchas*) and in print; reduced-motion
    snaps to drawn state. Path tagging conventions
    (`data-flow` / `data-pulse` / `data-sbg-stroke` / `pathLength="1"`)
    are documented in the partial's header.
  - `nav-card.njk` — `navCard()` macro that produces a hero-frame
    nav-card. All 27 nav cards on the home / tools / education /
    simulators landings share this shape: `.nav-card-titlebar`
    (mono caps prefix + ellipsis-clipped title + OK pill),
    `.nav-card-body`, and `.nav-card-statusline` (bullet-separated
    semantic pills). Sections drive an accent-color cascade via
    `.nav-card--{home,tools,education,simulators}` and the
    `--section-accent` / `--section-accent-dim` / `--section-accent-glow`
    tokens. Macro params: `section`, `href`, `titleShort`,
    `titleFull`, `desc`, `pills[]`, optional `category`.
- **Directory data file:** `html/html.11tydata.js` — overrides 11ty's
  pretty-URL permalink so `signal-scaling.html` lands at
  `_site/tools/signal-scaling.html` (not `signal-scaling/index.html`).
  Load-bearing for the `.html`-extension convention (see *Conventions*).
- **`html/styles.css`** — the shared design system. Every page picks
  it up via `head.njk`'s `<link rel="stylesheet" href="/styles.css">`.
  Shared rules live in the file; page-only rules stay inline via
  `{% block head %}`.
- **Shared scripts** in `html/scripts/` are **classic scripts** (not
  ES modules — no bundler, and helpers expose globals like `Units`,
  `simulatePid`, `FlowEngine` that page IIFEs reach for by name).
  Most are loaded per-page via `<script src="/scripts/xxx.js"></script>`
  inside `{% block scripts %}`, *before* the page's inline
  `<script>`; `flow-engine.js` and `schematic-bg.js` are loaded
  site-wide by `layouts/page.njk` instead (gutter motifs need them
  on every page). Each script's file header documents its exports.
  - `pid-engine.js` — PID simulation core (FOPDT + conditional-
    integration anti-windup). Pure math, no DOM. Paired with
    `pid-chart.js` (canvas drawer + unit-aware delta formatter).
  - `flow-engine.js` — animation engine for SVG schematics. Two
    motion modes:
    - `data-flow="supply"|"return"` — continuous particle stream
      (hydronic pipes; longer paths = longer cycles, direct-vs-
      reverse-return pedagogy).
    - `data-pulse="signal"` — discrete pulse (head + 4-circle trail)
      that travels the path once and retires; EBO-style "signal
      just updated" cue. Auto-fires on `data-pulse-interval` (default
      4000ms) and is IO-gated so off-screen motifs don't churn.
      External callers fire on demand with `FlowEngine.pulse(el)` —
      the function-block editor uses this to flash a wire when its
      source block updates.
    `init()` is idempotent (rAF loop has a `frameStarted` guard;
    pools de-dupe via `poolsByEl`), so `schematic-bg.js`'s site-wide
    init call composes safely with any page-level `FlowEngine.init()`.
    Engine attribute conventions also documented in
    `site-ideas-and-friction.md`.
  - `schematic-bg.js` — scroll-driven reveal for the gutter
    schematic motifs. IntersectionObserver toggles `.is-drawn` on
    each motif as it scrolls in (CSS handles the stroke-dashoffset
    transition); also calls `FlowEngine.init()` once on
    DOMContentLoaded so the gutter pipes carry particles and the
    wiring / logic-chain / BACnet paths auto-pulse. Under
    `prefers-reduced-motion: reduce`, snaps every motif to drawn
    state synchronously instead.
  - `thermistor-data.js` — R/T curves generated from per-type
    parameters (β, R25, shunt, R0, TCR); file header tracks
    per-type confidence.
  - `units.js` — site-wide US/metric toggle. State in `localStorage`
    (`cf_units`), `unitschange` event on `document`, exposes
    `window.Units`. Head bootstrap reads `localStorage` before first
    paint to avoid a US flash for metric visitors.
  - `ui.js` — `switchTab`, `copyText`, `copyReadouts`. Clipboard
    failures fail silently.
  - `psy-widget.js` — Define-by widget helpers shared by
    `psychrometric-chart`, `air-mixing`, `economizer-ratio`, and
    `coil-sizing`.
    Exposes `buildSecondProp()` (per-mode label + step catalog that
    tracks the active unit system) and `secondToCanonical(mode,
    value)` (display-units → canonical-IP conversion). No DOM
    access; pages keep their own id-prefix-aware wiring.
- **Worker:** `src/worker.js` — ES-module Worker. Handles
  `POST /api/contact` (validate, drop honeypot silently, verify
  Turnstile, send via Resend with `reply_to` = submitter); falls
  through to `env.ASSETS.fetch(request)` otherwise. Secrets:
  `TURNSTILE_SECRET`, `RESEND_API_KEY` (`wrangler secret put …`).
  Turnstile *site* key lives in `contact.html`. `from`/`to` =
  `contact@controlsfreak.dev` (verified Resend sender).
- **Fonts:** Google Fonts (IBM Plex Mono + Overpass) with `preconnect`
  — loaded once via `head.njk`. Self-hosting is reasonable future
  cleanup.
- **Hosting:** Cloudflare Workers. Auto-deploys on push to `main` via
  GitHub integration (~60s); the dashboard runs
  `npm install && npm run build` before each deploy and serves
  `_site/`.
- **Config:** `wrangler.jsonc` — `name`, `main`, `assets.directory`
  (`./_site`, not the source `./html/`), `assets.binding` (`ASSETS`),
  `assets.html_handling` (`auto-trailing-slash` —
  `/contact.html` redirects to `/contact`, `/tools/` serves
  `tools/index.html`), and `compatibility_date` are all load-bearing.
  `_site/` is gitignored.

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

Frontmatter fields:

- `title` — used verbatim for `<title>` and `og:title`. Quote only
  if it starts with a YAML-special character.
- `description` — used verbatim for `<meta name="description">` and
  `og:description`. 140–160 chars, human-written, never reused —
  enforced by a build-time guard in `.eleventy.js` (the
  `descriptionLengthGuard` collection) that fails the build on any
  out-of-range description. Renders HTML-autoescaped: `'` becomes
  `&#39;`, `<` becomes `&lt;` in view-source. Rephrase to avoid those
  characters if clean view-source matters.
- `canonical` — full URL with `.html` extension. Used for `og:url`.
- `nav` — one of `home`, `tools`, `simulators`, `education`, `contact`. Drives the
  `.active` marker on the top nav. Omit (or empty string) on pages
  that don't fit.

Blocks:

- `{% block head %}` — optional; for inline `<style>` or a head-loaded
  third-party script (Turnstile on `contact.html` is the only current
  example).
- `{% block content %}` — required; everything between nav and footer
  (for almost every page, an outer `<main>…</main>`).
- `{% block scripts %}` — end-of-body scripts. Shared `<script src>`
  tags first, then the page's inline `<script>` — order matters since
  the inline code references symbols the shared scripts export.

The layout uses `trimBlocks: true` + `lstripBlocks: true`, so empty
blocks and indented includes don't leak whitespace into the rendered
HTML.

### Sitemap

`html/sitemap.njk` renders `_site/sitemap.xml` at build time — it is
not a hand-maintained file. The `sitemapPages` collection in
`.eleventy.js` gathers every template carrying a `canonical`
frontmatter (all 30 real pages; the sitemap template has none, so it
self-excludes) and sorts by canonical URL. Each `<loc>` is the page's
`canonical`; each `<lastmod>` comes from the `gitLastmod` filter,
which runs `git log -1 --format=%cd --date=short -- <inputPath>` and
falls back to the build date if git has no record. A new page with a
`canonical` is picked up automatically — no sitemap edit needed (do
update the `PAGES` array in `tests/smoke.spec.js`, which the drift
test checks against the built sitemap). CI checks out with
`fetch-depth: 0` so the dates resolve; if the Cloudflare deploy build
ever shallow-clones, every `<lastmod>` collapses to the build date —
harmless, but the signal is lost.

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
  drawing in ~10% of the transition. See codebase-issues#69.
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

```
controlsfreak.dev/
├── CLAUDE.md
├── README.md
├── site-ideas-and-friction.md
├── codebase-issues.md
├── .eleventy.js              # 11ty config — passthroughs, Nunjucks options
├── wrangler.jsonc            # serves _site/ via env.ASSETS
├── package.json              # scripts: build / dev / test
├── src/worker.js
├── html/                     # source (input to 11ty)
│   ├── html.11tydata.js      # permalink override — keeps .html extensions
│   ├── _includes/            # head.njk, nav.njk, nav-card.njk, schematic-bg.njk, footer.njk, layouts/page.njk
│   ├── styles.css            # passthrough → _site/styles.css
│   ├── scripts/              # passthrough; pid-engine, flow-engine, units, …
│   ├── assets/               # passthrough; og-image, favicons
│   ├── sitemap.njk           # generated → _site/sitemap.xml (see Sitemap)
│   ├── robots.txt            # passthrough
│   ├── index.html
│   ├── contact.html
│   ├── tools/                # tool pages + tools/index.html landing
│   ├── simulators/           # simulator pages + simulators/index.html landing
│   └── education/            # lesson pages + education/index.html landing
├── tests/                    # Playwright (smoke.spec.js, contact.spec.js)
└── _site/                    # build output — gitignored
```

## Design landmarks

Cross-cutting decisions that aren't obvious from any single file. For
per-page history and the *why* behind each, see
`site-ideas-and-friction.md`; for the user-facing tour, see
`README.md`.

- **Shared top nav** (`.site-nav`, in `nav.njk`): Home / Tools /
  Simulators / Education / Contact. The `nav` frontmatter field on
  each page drives the `.active` marker; no JS. `Tools`, `Simulators`,
  and `Education` link to hub landings (`/tools/`, `/simulators/`,
  `/education/`).
- **Page archetypes:**
  - *Tools* mostly use the **property-sheet layout** (`.ps-*` +
    `.ref-table-dense`) — Niagara-style label-left / value-right
    rows. Two flavors of grid carry it:
    - **2-col + below-grid row** (`.tool-body-2col` + sibling
      `.tool-body-row`) — Input | Output side-by-side, with
      reference / worked-example / tips content flowing full-width
      beneath. The dominant pattern (`bacnet-ip-converter`,
      `economizer-ratio`, `air-mixing`, `coil-sizing`,
      `signal-scaling`, `modbus-register-viewer`). The
      `.tool-body-row` sibling can
      sit inside a `.tab-pane` (per-tab worked example, as on
      economizer-ratio / air-mixing) or as a sibling of all the
      tab-panes inside `.tool-card` (shared reference, as on
      signal-scaling / modbus-register-viewer — `switchTab` in
      `ui.js` only toggles `.tab-pane` descendants).
    - **3-col** (`.tool-body-3col`) — Input | Output | Reference
      side-by-side. Right for tools whose middle / reference column
      has comparable density to Input + Output (`psychrometric-chart`
      with its canvas mid-column; `thermistor-calculator` with its
      tall R/T table as the page's deliverable). Codebase-issues #29
      documents when *not* to reach for this.
  - *Simulators* (`/simulators/`) keep **custom stacked layouts** —
    a running model (PID tuner, Mock VFD, Function-Block Editor)
    doesn't fit Input/Output/Reference. They live in their own
    section rather than under `/tools/` because they're for *playing
    with a model*, not *looking something up*.
  - *Education* pages use the **lesson layout** (`.tool-card` /
    `.tool-body`), NOT the column-grid patterns. **Prose sits above
    each diagram; the diagram is the visual capstone.**
- **Animation:** the shared engine `/scripts/flow-engine.js`
  (loaded site-wide from `layouts/page.njk`) drives two motion
  primitives:
  - **Continuous particle flow** on `data-flow="supply"|"return"`
    paths — constant velocity, longer paths = longer cycles
    (direct-vs-reverse-return pedagogy). Shared styling (`.edu-svg`,
    `.edu-legend`) in `styles.css`: supply solid `--blue`, return
    dashed `--blue-cool`, `flow-active [data-flow="return"]` drops
    dashes while running. The encoding is "physical media moving
    through pipes / air handlers."
  - **Discrete signal pulse** on `data-pulse="signal"` paths — a
    head + trailing 4-circle tail launches from the path start,
    travels at fixed pixel-speed, and retires at the end. The
    encoding is "control signal just updated" (an analog wire
    sampling, a logic block firing, a BACnet/IP comm trace
    delivering). Auto-fires on `data-pulse-interval`; the
    function-block editor calls `FlowEngine.pulse(el)` directly
    when a wire's source block updates.
- **Schematic-collage gutter art:** `_includes/schematic-bg.njk`
  emits two narrow SVG strips in the side gutters (left + right,
  ~60 motifs each, 230px stride), holding inline-SVG instrument
  primitives — pipe-valves and pump-coils (carry continuous flow),
  AI/AO and BI/BO terminals (amber wiring + binary signal lines
  pulse), logic-chains (plum AND/PID block wires pulse), BACnet/IP
  nodes (teal comm traces pulse). Each motif draws itself in via
  stroke-dashoffset as it scrolls in (IntersectionObserver in
  `schematic-bg.js` toggles `.is-drawn`). Hidden below 1240px viewport
  — anything that small is a "field device" where load time outranks
  decoration. VFDs page uses a page-local `.vfd-svg` (no `data-flow`).
- **Variable-flow story:** `load-piping` → `vfds` → `pump-control` →
  `balancing` form a quartet. Cross-links pay off forward-link debts
  between them. The twin-T subhead in `hydronic-loops.html` carries
  `id="d3"` so `load-piping.html`'s closing section can deep-link.
- **Simulator ↔ Education pairings:** `simulators/pid-tuner.html` ↔
  `education/pid-basics.html` (share `pid-engine.js` + `pid-chart.js`);
  `simulators/vfd-mock.html` ↔ `education/vfds.html` (source-parameter
  pedagogy, with a parameter tree to navigate on the sim side);
  `simulators/function-block-editor.html` ↔
  `education/function-blocks.html` (share `fbe-engine.js`).
- **Contact form:** `.tool-card` with name/email/message, an
  off-screen CSS honeypot (`.hp-field`, named `website`), Turnstile
  widget. POSTs form-encoded data to `/api/contact`.
- **Nav cards** (all 27 across home / tools / education / simulators)
  are rendered by the `navCard()` macro in `_includes/nav-card.njk`,
  not hand-rolled. Each card is a hero-style instrument frame:
  `.nav-card-titlebar` (mono-caps section prefix — TOOL / LESSON /
  SIM / SECTION — plus ellipsis-clipped title + status pill) on
  top, body in the middle, `.nav-card-statusline` (bullet-separated
  semantic pills) on the bottom. Section drives an accent-color
  cascade via `.nav-card--{home,tools,education,simulators}`. Pass
  `titleShort` trimmed enough to fit one line at the 4-col 1920px
  breakpoint (the title region clips with ellipsis, so over-long
  values truncate silently — see `8cfedff` for the prior sweep).
- **Tools landing** is a `.nav-card` grid of live tools, with a
  filter-chip row above. **Simulators landing** is the same
  `.nav-card` grid minus the filter chips — add the row back if
  the section grows past ~6 entries.
- **Legacy redirects:** when a page moves between sections (e.g.
  the original Tools → Simulators migration that introduced
  `/simulators/`), add the old URL to `LEGACY_TOOL_REDIRECTS` in
  `src/worker.js`. The Worker 301s old paths to the new ones so
  inbound links keep working.

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
  short pages. `main` / `.hero` need `width: 100%` alongside
  `margin: 0 auto` — without it, `margin: 0 auto` on a flex child
  shrinks instead of centering. `.site-nav` and `footer` are
  full-bleed (no max-width cap) — they're status-bar chrome, not
  centered content.
- **CSS custom properties** in `:root` — change colors by editing
  these, not by hardcoding. Surface / border / accent / text /
  data-color / font families are all defined there; read `styles.css`
  for the full set and per-color semantics. Two palette families:
  - **Physical-media palette** — `--blue` (supply water + live
    readouts), `--blue-cool` (return water), `--red` /
    `--accent` (heat / general highlight), `--heat` (heating on
    the psych chart).
  - **Control-vocabulary palette** (added with the schematic-bg
    gutter art) — desaturated hues for the *control* side of a
    diagram: `--teal` / `--teal-dim` / `--teal-glow` for BACnet/IP
    comm traces; `--amber` for energized analog control wiring
    (AI/AO traces); `--plum` / `--plum-dim` / `--plum-glow` for
    logic-block signal lines (AND, PID, TMR chains). Same `--*-dim`
    / `--*-glow` pattern as `--accent-dim` / `--accent-glow` — the
    dim variants drive subtle backgrounds and the glow variants
    drive borders / focus rings.

  The canvas chart reads colors via `getComputedStyle` at draw time.
  **No `var(--x, #hex)` fallbacks** — `var(--x)` is the canonical
  form site-wide; every custom property used in HTML attributes or
  canvas-JS must be defined in `:root` first. If a property is ever
  removed from `:root` without removing its consumers, `var(--x)`
  returns empty and the consumer no-ops the color — louder failure
  mode than a stale fallback hex.
- **Focus indicators (`:focus-visible`).** Every custom-styled
  interactive element with a `:hover` rule needs a paired
  `:focus-visible` — the browser default outline is suppressed by
  the `outline: none` on `.skip-link` / form inputs / the range
  track, so a styled button or link inherits no focus cue without
  one. All such rules live in the single consolidated
  `FOCUS INDICATORS` block in `styles.css` (`outline: 2px solid
  var(--accent)` for buttons/links/cards; an extra `--accent-glow`
  ring on the range-slider thumb). When adding a new custom
  interactive, add its selector to that block — don't scatter a
  one-off rule next to the `:hover`.
- **Column-grid layouts** (`.tool-body-2col` / `.tool-body-3col` /
  `.tool-body-row`) — all live in `styles.css` as one family.
  `.tool-body-2col` is two equal columns; `.tool-body-3col` is three;
  `.tool-body-row` is the full-width sibling that sits below either
  grid (recessed `--surface-3` background + top border — same recess
  the 3-col third column gets via `:last-child`). Each `.tool-body-*`
  grid sits directly inside a `.tab-pane` or `.tool-card`, not inside
  a padded `.tool-body`; tabs above take `.tabs.tabs-flush`. A row's
  value can be `.ps-value` (mono, plus `.live` / `.muted` / `.error`)
  or an `input/select/textarea.ps-input` (form-control variant;
  qualified by element so it outranks the global `input[type=…]` /
  `select` block). The grids collapse to a single stack at
  different breakpoints — `.tool-body-3col` at ≤1000px (three
  columns get cramped earlier inside the 1120px main cap),
  `.tool-body-2col` at ≤900px. `.tool-body-row` has no grid
  template to collapse and just stays full-width. Note: `.ps-section-label` is named that
  to avoid collision with `.section-label`; the live-value modifier
  is `.live` to avoid collision with `.readout`.
- **Widget chrome (`.widget-*`)** — the recessed-panel idiom used by
  interactive widgets on `pump-control`, `balancing`, `vfds`,
  `vfd-mock`, and `hydronic-loops`. The shared vocabulary
  (`.widget`, `.widget-try`, `.widget-section-label`,
  `.widget-slider-head` + `.v`, `.widget-readout-label/value`,
  `.widget-anecdote-wrap` + `.widget-anecdote[.warn]`, `.widget-fan`)
  lives in `styles.css`; grep there for the full set. Pages add their
  own positioning rules and own their own animation loops. Widget
  INTERNALS (LCDs, keypads, branch states, valve pills, temperature
  swatches, pump-curve canvases) stay in each page's `{% block head %}`
  since only that page uses them.
- **Prose typography classes** — body-prose shape lives in
  `.tool-body p`; accent colour on body anchors in `.tool-body a`;
  the lead paragraph at the top of an education page wears
  `<p class="page-intro">`. Use these instead of inlining the
  same triplet. `.result-formula` has two modifiers: `.flush` (sits
  flat under a tabbed Output panel) and `.wrap` (long readable
  expressions, break on word boundaries). Page-local utility classes
  (`p.bit-hint`, `p.pid-note`, `p.ref-note`, `p.tool-preamble`) are
  element-qualified — the `p` is load-bearing so they tie
  `.tool-body p` on specificity and win on cascade. Keep that shape
  when adding new small-text utility paragraphs. `p.tool-preamble`
  is the mono small-caps caption that sits under a
  `.tool-card-header` (typography only — padding/margin varies by
  whether it sits inside `.tool-body` or in the gap above it).
  `.ref-note` carries two modifiers: `.worked-intro` /
  `ol.ref-note.worked-list` for the worked-example paragraph+list
  pair inside a `.tool-body-row`, and `.compact` for mini-sim
  captions that sit tight under a canvas readout (no top border).

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
- **`'use strict';`** — first statement inside every page-inline
  IIFE and every shared classic script under `html/scripts/`
  (after the header comment block). Catches undeclared-global
  assignment and a few other footguns. `src/worker.js` is an
  ES module (implicit-strict), so no directive needed there.
  `html/education/load-piping.html` is the one exception — it has
  no inline IIFE, just a top-level `FlowEngine.init()` call.
- **Validate-and-mute:** read inputs with `parseFloat`; if anything
  isn't finite (use `!isFinite(x)`, not `isNaN(x)` — `isFinite` also
  rejects `Infinity`, which matters on calcs like `1 / (max - min)`
  where equal bounds produce `Infinity`), set the result to
  `class="result-value muted"` with text `—` and clear the formula.
- **Tabs:** `.tab-btn` carries `data-tab="<name>"`, the pane carries
  `id="tab-<name>"`, and one `querySelectorAll('[data-tab]')` pass
  wires them to `switchTab` (from `/scripts/ui.js`). `switchTab` is
  scoped to the clicked button's nearest `.tool-card`, so multiple
  tabbed tools on a page don't clear each other. See
  `tools/signal-scaling.html` for the canonical wiring.
- Lookup tables for fixed domain data (e.g. `SIG`: signal type →
  `{ min, max, unit }`; `PID_PROC`: process type → FOPDT params).
- **UI vocabulary:** **AI / AO** = analog input/output. Don't use
  "EU" — ambiguous (electrical vs engineering unit); say "Eng. Units"
  / "Engineering Value" instead.

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
5. Bump `package.json.version` when shipping something notable; the
   footer reads it via `html/_data/site.js`. A new tool is a minor
   bump (`1.X.0`); a bug fix is a patch bump (`1.X.Y`).

**Adding a new simulator** follows the same steps under
`html/simulators/` instead, with `nav: simulators` in the
frontmatter and the new `.nav-card` added to
`simulators/index.html`. No filter chips to recount there.

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

Preview: `npm run dev` runs `eleventy --serve --port=8000` with
live reload — best for iterating on a page.

Tests:

- **Run:** `npm test` (or `npx playwright test`). Chromium only.
  Self-sufficient — `playwright.config.js` carries a `webServer`
  block that builds the site and serves `_site/` for the run, so a
  fresh checkout needs no second terminal. If a dev server
  (`npm run dev`, same port 8000) is already up, `reuseExistingServer`
  reuses it instead of starting another. `baseURL` in the config is
  the test host, so specs use leading-slash paths. Specs in `tests/`:
  `smoke.spec.js` (every page: 200, title, nav, no console errors,
  behavior spot-checks), `contact.spec.js`, and `psychro-engine.spec.js`
  (pure-Node engine math). Don't restructure the scaffolding without
  being asked.
- **CI:** `.github/workflows/test.yml` runs the same `npm test` on
  every PR to `main` (Chromium installed in the runner; the config's
  `webServer` build means the `descriptionLengthGuard` runs too). The
  deploy itself stays with Cloudflare Workers Build — CI gates the
  PR, it doesn't deploy.
- **Eyeball a change:** `const { chromium } = require('@playwright/test')`
  + `page.screenshot({ path, fullPage: true })`. Useful for canvas
  rendering, layout, console errors. For `contact.html` use
  `waitUntil: 'domcontentloaded'`. Rebuild (`npm run build`) before
  screenshotting `_site/` unless `npm run dev` is running.

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
more Education pages — lives in
`site-ideas-and-friction.md` (feature ideas) and
`codebase-issues.md` (code-quality holds).
