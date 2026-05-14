# controlsfreak.dev

A field-reference tool site for building-controls engineers — open
calculators and lookup utilities for BACnet, Modbus, HVAC, and building
automation work, plus plain-English explainers. "No login, no ads, just
tools that are actually useful on a job site." Hand-written HTML pages
plus a small Cloudflare Worker (only for `/contact`) — **no framework,
no build step.** That's load-bearing: the browser loads pages, the
shared `styles.css`, and any shared scripts directly — no bundler,
transpiler, or generator. Sharing external CSS/JS files is fine; that's
still no build step. There's a personal "About" card on the home page,
but the project is the tools, not a personal homepage.

## Stack

- **Static pages under `html/`**, bound to the Worker as `env.ASSETS`.
  See the repo tree below.
- **`html/styles.css`** — the shared design system. Every page links it
  with `<link rel="stylesheet" href="/styles.css">`. Page-specific CSS
  stays inline on the page that needs it (currently: `contact.html`,
  `psychrometric-chart.html`, `thermistor-calculator.html`,
  `hydronic-loops.html`, `load-piping.html`). Shared rules live in the
  file; page-only rules stay inline.
- **Shared scripts** in `html/scripts/` are **classic scripts** (not ES
  modules — modules would break the inline `on*` handlers). Load with
  `<script src="/scripts/xxx.js"></script>` *before* the page's inline
  `<script>`. Today:
  - `pid-engine.js` — PID simulation core (FOPDT model, conditional-
    integration anti-windup; exposes `PID_PROC` and `simulatePid()`).
    Used by `tools/pid-tuner.html` (full UI) and
    `education/pid-basics.html` (three mini-sims).
  - `flow-engine.js` — particle-flow animation engine for SVG
    schematics (exposes `FlowEngine.init()` and
    `FlowEngine.refreshPath(el)`). Walks `<circle>` particles along
    paths annotated with `data-flow="supply"|"return"` via
    `getPointAtLength()`. Used by `education/hydronic-loops.html`
    (three diagrams + the twin-T injection-pump widget). Conventions
    and attribute surface documented in `site-ideas-and-friction.md`
    under "Engine attribute conventions."
  - `thermistor-data.js` — sensor R/T curves (exposes
    `THERMISTOR_TYPES`). **The R/T tables are generated from nominal
    curve parameters, not transcribed from datasheets, and are flagged
    PENDING FIELD VERIFICATION** — see the file header for which curves
    are highest/lowest confidence. A verification pass with a second
    tech is planned before the tool is treated as authoritative.
- **Worker:** `src/worker.js` — ES-module Worker. Handles
  `POST /api/contact` (validate, drop honeypot hits silently, verify
  Turnstile, send via Resend with `reply_to` = submitter) and falls
  through to `env.ASSETS.fetch(request)` for everything else. Secrets:
  `TURNSTILE_SECRET`, `RESEND_API_KEY` (`wrangler secret put …`). The
  Turnstile *site* key lives in `contact.html`. `from`/`to` is
  `contact@controlsfreak.dev` (a verified Resend sender).
- **Fonts:** Google Fonts (IBM Plex Mono + Overpass) with `preconnect`,
  declared in each page's `<head>`. Self-hosting is reasonable future
  cleanup.
- **Hosting:** Cloudflare Workers. Auto-deploys on push to `main` via
  GitHub integration (~60s).
- **Config:** `wrangler.jsonc` — `name`, `main`, `assets.directory`
  (`./html`), `assets.binding` (`ASSETS`),
  `assets.html_handling` (`auto-trailing-slash` — `/contact.html`
  redirects to `/contact`, `/tools/` serves `tools/index.html`), and
  `compatibility_date` are all load-bearing; touch carefully.

### Conventions

- **Anchor `href`s use explicit `.html` extensions** (e.g.
  `/tools/signal-scaling.html`, `/contact.html`); directory URLs (`/`,
  `/tools/`) stay clean. Works against `python -m http.server` locally
  (no rewriting) and against the Worker, which redirects to the clean
  form. Asset references (`/styles.css`, `/scripts/…`) are absolute so
  they work from any depth.
- **Indentation: 4 spaces** everywhere — HTML, CSS, JS (`styles.css` is
  at base indent 0; nested CSS inside an HTML `<style>` matches its
  surroundings).
- **Vanilla JS only** — no libraries, no frameworks, no build step.
  Per-page logic in an inline `<script>` at the bottom; genuinely
  shared JS goes in `html/scripts/` as a classic script.
- Prefer semantic HTML over div soup. Keep it fast and accessible: no
  heavy media, no auto-play, no tracking or analytics.
- **Education page scope rule** (one question per page, forward-links
  for adjacent topics) lives in `site-ideas-and-friction.md` under
  "Education page scope — one question per page."

### Gotchas

- **SVG files in `html/assets/` must avoid `--` sequences inside
  `<!-- comments -->`.** ImageMagick's librsvg parser rejects them as
  invalid XML even though most browsers tolerate them. When referencing
  CSS custom property names in comments, write `bg` or "the bg color"
  rather than `--bg`.
- **Turnstile never goes idle** — for Playwright on `contact.html` use
  `waitUntil: 'domcontentloaded'`, not `'networkidle'`.
- **Selectors targeting SVG geometry are attribute-only, not
  element-qualified.** Pipe runs in the hydronic diagrams use mixed
  element types — return-flow on `hydronic-loops.html` mixes `<line>`
  and `<path>`, for instance — so `path[id^="d1-return"]` silently
  drops half the geometry. Use `[id^="d1-return"]` (no element
  qualifier) for `querySelectorAll` and CSS selectors alike. Convention
  applies to `flow-engine.js` and any future engine that enumerates SVG
  elements by id pattern.

## Repo structure

```
controlsfreak.dev/
├── CLAUDE.md           # this file
├── README.md
├── wrangler.jsonc      # Cloudflare config (Worker + static assets) — touch carefully
├── package.json        # dev tooling only (Playwright)
├── src/
│   └── worker.js       # POST /api/contact, else falls through to assets
├── html/               # static assets (bound as env.ASSETS)
│   ├── index.html      # home — intro + Tools/Education tiles + About
│   ├── contact.html    # contact form (tiny inline <style> for page-only rules)
│   ├── styles.css      # the shared design system
│   ├── robots.txt
│   ├── sitemap.xml     # hand-maintained — keep in sync when adding/removing pages
│   ├── assets/
│   │   ├── og-image.svg / .png       # 1200×630 link-preview image (every page shares it; re-render PNG if SVG edited)
│   │   ├── favicon.svg
│   │   ├── favicon-32.png            # PNG fallback
│   │   └── favicon-180.png           # Apple touch icon
│   ├── scripts/
│   │   ├── pid-engine.js             # PID_PROC, simulatePid (classic script)
│   │   ├── flow-engine.js            # FlowEngine.init(), refreshPath() — particle animation
│   │   └── thermistor-data.js        # THERMISTOR_TYPES — tables PENDING field verification
│   ├── tools/
│   │   ├── index.html                # Tools landing — live grid + "Coming Soon"
│   │   ├── signal-scaling.html
│   │   ├── modbus-register-viewer.html
│   │   ├── pid-tuner.html            # loads /scripts/pid-engine.js; owns loop-speed reference table
│   │   ├── bacnet-ip-converter.html
│   │   ├── psychrometric-chart.html  # 3-col layout, widened to 1280px inline
│   │   └── thermistor-calculator.html # 3-col layout, loads /scripts/thermistor-data.js
│   └── education/
│       ├── index.html                # Education landing
│       ├── pid-basics.html           # P/I/D explainer + three mini-sims (loads /scripts/pid-engine.js)
│       ├── hydronic-loops.html       # 2-pipe direct → reverse → twin-T, inline SVG schematics
│       └── load-piping.html          # 2-way vs 3-way load valves, three SVG diagrams; pays off the twin-T #d3 forward callout
└── tests/              # Playwright (smoke.spec.js, contact.spec.js)
```

## What's on the site today

A multi-page site with a shared top nav (`.site-nav`): **Home / Tools /
Education / Contact** (hardcode `.active` on the current page's link;
no JS). `Tools` and `Education` link to their hub landings
(`/tools/`, `/education/`); the home page's two `.nav-card` tiles do
the same.

**Home** (`index.html`) — short hero intro, two `.nav-card` tiles, and
the About card.

**Tools landing** (`tools/index.html`) — `.nav-card` grid of live
tools, then a "Coming Soon" `.tool-grid` of dimmed `.tool-preview`
cards (the roadmap). Live tools:

- **Signal Scaling** (`signal-scaling.html`, "Analog I/O") — three tabs
  on the 3-col layout: *Signal → Eng. Units*, *Eng. Units → Signal*,
  *2-Point → Slope / Offset* (this tab is 2-col — Output spans the right
  two-thirds via `grid-column: span 2`).
- **Modbus Register Viewer** (`modbus-register-viewer.html`, "Modbus") —
  3-col layout. Dec/hex inputs + 16-bit toggle grid (8×2) on the left,
  dec/hex/binary readouts in the middle, FC01–16 function-code lookup on
  the right.
- **PID Tuning Helper** (`pid-tuner.html`, "Loops") — step-response
  simulator with process-type select, parameter-style select (relabels
  controls: gain·reset·rate / Ti·Td / proportional band; maps to
  Niagara / EBO / Distech conventions — labels/units only, controller
  runs canonical gain/repeats-per-min/minutes), preset chips, three
  sliders (rate slider's `max` re-ranges with process type — ≈0.15 / 0.5
  / 2 min for fast/medium/slow, thumb position preserved on switch),
  canvas plot, metrics. **Keeps its own stacked layout** rather than
  3-col — a simulator block doesn't fit Input/Output/Reference. Bottom
  Reference region uses `.ps-section-label` standalone for the
  loop-speed table (`.ref-table`) and Symptom→Tuning-Move cheat sheet
  (`.ref-table-dense`, short arrow codes). Cross-links to PID Basics
  for the long-form explainer.
- **BACnet/IP Hex Converter** (`bacnet-ip-converter.html`, "BACnet") —
  3-col layout, two tabs (*Hex → IP*, *IP → Hex*). Tolerant of
  spaces/dots/dashes/`0x`. 8-digit = no port, 12-digit includes UDP
  port (`BAC0`/47808 default flagged). Reference column is a
  placeholder UDP-port lookup, marked `// user to verify`.
- **Psychrometric Chart** (`psychrometric-chart.html`, "HVAC") — 3-col
  layout (Inputs / Chart / State Point) with a **custom 25%/1fr/25%
  split and page widened to 1280px inline** — a draggable canvas needs
  the room. Drag the state point or type a dry-bulb plus one of {RH,
  WB, DP, humidity ratio, enthalpy}; altitude-adjustable. ASHRAE
  IP-unit psychrometrics + chart drawing + drag handling all live
  inline in the page's `<script>` — extract to `html/scripts/` only if
  a second tool needs them. For building feel, not calibrated load
  studies. (Process lines / mixing is the deferred "step 2" — see
  `site-ideas-and-friction.md`.)
- **Thermistor / RTD Lookup** (`thermistor-calculator.html`, "Sensors")
  — 3-col layout with a **left-biased custom split** (defined inline).
  Type select with two `<optgroup>`s (NTC: 10K Type II/III, JCI
  10K+8.7K shunt, Schneider/TAC "Type 5" 10K-3+11K shunt, 20K, 3K /
  RTD: 1K Balco — flagged "RTD, not a thermistor" so a "Balco" search
  lands here — Pt100, Pt1000). Temperature ↔ Resistance toggle, °F/°C
  toggle, the field you aren't looking up by goes `disabled`. Middle
  shows defining point + result; right shows the full R/T table
  (`.ref-table-dense` in a scrollable box with sticky `thead`, current
  row highlighted) + notes. Interpolation is **linear between table
  rows** (the table is the source of truth — no Steinhart-Hart). Lookup
  mode only; identify-mode is a future build (friction file). **Tables
  pending field verification — see the data file.**

**Education landing** (`education/index.html`) — `.nav-card` grid
(mirrors Tools, no "Coming Soon" yet).

- **PID Basics** (`pid-basics.html`) — two sections: *What P, I, and D
  Actually Do* (three `.pid-term` cards, worked HVAC examples) and *See
  Each Term in Action* — three cumulative mini-sims, one per
  `.tool-card`, tags "Sim 1/2/3": **Sim 1 (P only)** exposes a gain
  slider, shows steady-state offset; **Sim 2 (P+I)** fixes P, exposes
  reset, shows offset closing + overshoot appearing; **Sim 3 (P+I+D)**
  fixes P+I, exposes rate (Td, min), shows derivative crushing
  overshoot. Sim 3's rate slider re-ranges per loop speed (same logic
  as the tuner). Each is a stripped-down surface over `pid-engine.js`
  — caption, Fast/Medium/Slow chips (default Medium), one slider,
  half-height canvas (~160px), one or two metric callouts;
  auto-reruns, no Run button. `.cta-button` ("Try it for yourself →")
  to the PID tuner; `.back-link` to the Education hub.
- **Hydronic Loops** (`hydronic-loops.html`) — plain-English explainer
  for hydronic distribution: intro, then *2-Pipe Direct Return*,
  *Reverse Return*, *Primary-Secondary "Twin-T" Boiler Injection*. Each
  section has a **hand-written inline `<svg>`** (named `<g>` groups +
  semantic IDs, real `<text>` labels, flow-arrow `<polygon>`s,
  `<title>` + `<desc>`; supply solid in `var(--blue)`, return dashed in
  `var(--blue-cool)` so it reads without color). Lesson-page layout
  (`.tool-card` / `.tool-body`), NOT the 3-col pattern. **Prose sits
  above each diagram; the diagram is the visual capstone** — Education
  page convention, see friction file. The twin-T section is built to
  defeat the "all the building's water flows through the boiler"
  misconception — boiler primary loop with its own pump, system loop
  with its own pump, joined only at closely-spaced tees with an
  injection pump; a worked example (100/200/40 GPM) walks the split.
  **Animated:** loads `/scripts/flow-engine.js`; pipes annotated with
  `data-flow="supply"|"return"` carry particle flow at constant
  velocity (so longer paths show as longer cycles — the direct-vs-
  reverse-return pedagogy). Twin-T section adds an interactive
  injection-pump widget: slider in Hz / GPM / % of design speed,
  live supply-temp mixing math, three discrete states (normal /
  warning at <20 Hz / failure at 0 Hz with a hidden anecdote
  reveal). A discovery-style callout under the twin-T diagram
  forward-links to `load-piping.html` for the load-side answer; the
  twin-T subhead carries `id="d3"` so the load-piping closing section
  can link straight to it.
- **Load Piping** (`load-piping.html`) — paired explainer to Hydronic
  Loops, scoped to one question: *what does the connection between a
  load and a hydronic loop look like, and what does that connection
  point have to decide?* Two main sections — *Two-Way Valve (variable
  system flow)* and *Three-Way Valve (constant system flow)* — with
  three inline `<svg>` diagrams (one for two-way, then mixing and
  diverting three-way) plus a fourth tie-back diagram in the closing
  section that mirrors d3's layout with each load box opened up
  (Load A 2-way, Load B 3-way diverting). Closing section ties back
  to the twin-T `#d3` anchor and spells out the consequence: two-way
  loads ⇒ variable secondary, three-way loads ⇒ constant secondary.
  Same diagram conventions as Hydronic Loops (named groups, semantic
  IDs `lp-2w-…` / `lp-3wm-…` / `lp-3wd-…` / `lp-tt-…`, supply solid /
  return dashed). **Animated:** loads `/scripts/flow-engine.js`; pipes
  annotated with `data-flow="supply"|"return"` carry particle flow at
  the engine's global velocity, uniform density (d1/d2 convention —
  no interactive density mutation here). Lesson-page layout; no
  widgets. **Balancing was deliberately scoped out** — forward-linked
  to a future balancing page rather than treated as a section here;
  see friction-file entry "Education page scope — one question per
  page" for the rule. **Forward-link convention:** when prose
  references a page that doesn't exist yet (e.g. VFDs, balancing), use
  a normal `<a>` with `color: var(--accent)` and `href` to the future
  path (`/education/vfds.html`); the friction file tracks the marker
  as `[future: <page>]`. **Diverting-valve tee gotcha** (recorded in
  the friction file too): the horizontal where coil-out and bypass
  converge has to be drawn as TWO segments (`lp-3wd-coil-to-tee` left
  half, dashed/return, walks L→R; `lp-3wd-bypass-to-tee` right half,
  solid/supply, walks R→L). One unified line can't animate both
  converging directions, and the right half is also miscolored as
  return when it's still hot supply water until it mixes at the tee.
  **DPBV (differential pressure bypass valve)** is marked on the
  tie-back's system loop at the far end (right-edge vertical at x=760),
  opposite the system pump where pump head climbs highest when demand
  drops. Sits as a discrete bowtie symbol (`lp-tt-dpbv`) on the
  existing return-side path — no topology change, just an identifying
  symbol — with prose between the two-way and three-way paragraphs
  explaining its role as pump protection on the variable-flow side
  (three-way systems don't need one; per-load bypasses already
  guarantee constant pump flow). Symbol is identical to the 2-way
  control-valve bowtie; disambiguation is by the `DPBV` label + prose.
  A possible future enhancement is a small two-state diagram showing
  the DPBV closed at high demand vs. open at low demand — deferred
  per user preference for the simpler "add + prose" pass first.

**Contact** (`contact.html`) — `.tool-card` with name/email/message,
an off-screen CSS honeypot (`.hp-field`, named `website`), and a
Turnstile widget. POSTs form-encoded data to `/api/contact`. JS is just
`submitContact()`; feedback in a `.result-panel`.

## Design system

The design system lives in `html/styles.css`. A new tool/page should
be built from this vocabulary, not freshly styled. Aesthetic: flat,
light "workstation" look — white panels on light gray-green chrome,
hairline borders, a green accent — with quiet nods to BAS UIs (slightly
shaded panel headers, property-sheet-style zebra tables, flat
underlined tabs). No drop shadows, no background texture. Light-only
(`color-scheme: light`); no dark variant.

- **Layout:** body is a flex column (`min-height:100vh`) with
  `main { flex: 1 }` so the footer sits at the viewport bottom on
  short pages. `main` / `.hero` / `footer` need `width: 100%` alongside
  `margin: 0 auto` — without it, `margin: 0 auto` on a flex child
  shrinks instead of centering.
- **CSS custom properties** in `:root` — change colors by editing these,
  not by hardcoding. Surfaces: `--bg` (app chrome), `--surface` (white
  panes), `--surface-2` (panel headers, table heads), `--surface-3`
  (recessed background for reference panels). Borders: `--border`,
  `--border-faint` (inner row dividers). Accents: `--accent` (`#43881c`,
  green — chosen to stay readable on white), `--accent-dim`,
  `--accent-glow`. Text: `--text`, `--text-bright`, `--text-dim`. Data:
  `--blue` (`#1577b8`, live readouts; also "supply water" in hydronic
  diagrams), `--blue-cool` (`#5e8aa0`, muted; "return water", paired
  with dashed line so it reads without color). `--red` (fault/alarm).
  Fonts: `--mono` (IBM Plex Mono), `--sans` (Overpass). The canvas
  chart reads colors via `getComputedStyle` at draw time.
- **Component classes** (terse index — read `styles.css` for details):
  `.tool-card` / `.tool-card-header` / `.tool-card-title` / `.tool-tag`
  (+ `.pending` for "Coming Soon") / `.tool-body`; `.tabs` / `.tab-btn`
  / `.tab-pane` (+ `.tabs-flush` for the 3-col layout); `.form-row`
  (+ `.three`) / `.field`; `.result-panel` / `.result-label` /
  `.result-value` (+ `.error` / `.muted` / `.warn`); `.result-formula`;
  `.range-bar-wrap` / `.range-bar` / `.range-bar-fill`; `.copy-btn`
  (+ `.copied` / `.active`); `.section-header` / `.section-label` /
  `.section-line`; `.subhead`; `.bit-readouts` / `.readout` /
  `.readout-label` / `.readout-value` (reused for PID metrics);
  `.ref-table`; `.pid-terms` / `.pid-term`; `.btn-row` / `.slider-field`
  / `.slider-head` / `.slider-val` / `input[type=range]` /
  `.sim-canvas-wrap` / `.sim-legend` (PID simulator); `.tool-grid` /
  `.tool-preview` (Coming Soon cards); `.card-grid` (+ `.two`) /
  `.nav-card` / `.nav-card-tag` / `.nav-card-name` / `.nav-card-desc`;
  `.back-link`; `.cta-button` (prominent in-page button-style anchor);
  `.hero` / `.hero-eyebrow` / `.hero-badges` / `.badge`; `.site-nav` /
  `.site-nav-brand` / `.site-nav-links`. Three-column layout (below):
  `.tool-body-3col` / `.ps-section-label` / `.ps-row` / `.ps-label` /
  `.ps-value` (+ `.live` blue readout / `.muted` / `.error`) /
  `input.ps-input` (and `select.ps-input` / `textarea.ps-input`) /
  `.ref-table-dense` / `.ref-note`.
- **Three-column property-sheet layout** (`.tool-body-3col` + `.ps-*` +
  `.ref-table-dense`): the established denser layout — Input / Output
  / Reference as three surfaces side by side, Niagara-style label-left
  / value-right rows with hairline dividers, recessed reference panel
  (`--surface-3`) *alongside* the active tool. The grid sits directly
  inside a `.tab-pane` or `.tool-card`, not inside a padded
  `.tool-body`; tabs above take `.tabs.tabs-flush`. A row's value can
  be `.ps-value` (mono) — plus `.live` / `.muted` / `.error` — or an
  `input.ps-input` / `select.ps-input` / `textarea.ps-input` (the
  form-control variant; qualified by element so it outranks the global
  `input[type=…]` / `select` block). **Adopters:** BACnet converter,
  Signal Scaling, Modbus Register Viewer, Psychrometric Chart (custom
  column split, page-widened), Thermistor (custom column split). PID
  tuner keeps its own custom stacked layout (uses `.ps-section-label`
  standalone for its bottom Reference region). A tool with no useful
  reference content drops the third column and runs two
  (`grid-column: span 2` on Output). At ≤900px the columns collapse
  to a single stack; purpose-built mobile is a future task. Naming
  gotchas: `.ps-section-label` is named that to avoid collision with
  the page-level `.section-label` in `.section-header`; the live-value
  modifier is `.live` to avoid collision with `.readout` (the bit-viewer
  / PID-metrics box).

### JS patterns

- Plain functions wired with inline `on*` attributes
  (`oninput="calcScaling()"`, `onclick="switchTab(...)"`).
- **Validate-and-mute:** read inputs with `parseFloat`; if anything is
  `NaN` set the result to `class="result-value muted"` with text `—`
  and clear the formula.
- **Tabs:** `switchTab(name, btn)` scoped to the clicked button's
  nearest `.tool-card`, so a page with multiple tabbed tools doesn't
  clear another's panes. Each tabbed page carries its own copy of this
  helper inline; same for `copyVal`.
- Lookup tables for fixed domain data (e.g. `SIG`: signal type →
  `{ min, max, unit }`; `PID_PROC`: process type → FOPDT params).
- **UI vocabulary:** **AI / AO** = analog input/output. Don't use "EU"
  — ambiguous (electrical vs engineering unit); say "Eng. Units" /
  "Engineering Value" instead.

## Adding a new tool

1. Create `html/tools/<tool-name>.html` from the standard page shell:
   - `<head>`: charset/viewport; a unique `<title>`; a unique
     `<meta name="description">` (140–160 chars, human-written, never
     reused — duplicate metadata is worse than none).
   - **Six Open Graph tags** immediately after: `og:title`,
     `og:description`, `og:type=website`, `og:url` (canonical URL),
     `og:image` = `https://controlsfreak.dev/assets/og-image.png` (every
     page shares this), `og:site_name=controlsfreak.dev`. `og:title`
     mirrors `<title>` and `og:description` mirrors the meta description
     verbatim — don't reword.
   - **Three favicon link tags** (byte-identical across pages):
     `<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">`,
     `<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">`,
     `<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon-180.png">`.
   - Google Fonts links, then `<link rel="stylesheet" href="/styles.css">`.
   - `.site-nav` with `Tools` marked `.active`.
   - `<main>` with `.section-header` + the `.tool-card` + an
     `<a class="back-link" href="/tools/">← All tools</a>`.
   - Shared `<footer>`, then an inline `<script>` for page logic. If
     the tool uses the PID engine, load
     `<script src="/scripts/pid-engine.js"></script>` *before* the
     inline script.
   - Anchor `href`s use explicit `.html` extensions.
2. Follow the validate-and-mute JS pattern.
3. Add a `.nav-card` for the page to the `.card-grid` on
   `tools/index.html`.
4. If it graduates a Coming-Soon item, delete the matching
   `.tool-preview` card from `tools/index.html`.
5. Add the page's URL to `html/sitemap.xml` (hand-maintained — no
   generator).
6. Bump the version string in the footer when shipping something
   notable (currently `v0.9 · 2026`, carried by every page).

## Workflow

The user runs Git commands themselves. Claude Code's job is editing
source files. Do not run `git add`, `git commit`, or `git push` unless
explicitly asked.

Typical loop: user asks for a change → Claude edits → user reviews
diff, commits, pushes → Cloudflare auto-deploys within ~60s.

## Local preview & tests

Playwright is set up (`@playwright/test`, dev dependency only — the
site itself still has no build step). Use it to actually look at the
page after a UI change instead of guessing.

- **Serve:** `python3 -m http.server 8000 --directory html` — specs
  expect port 8000. No `webServer` block in the Playwright config;
  start the server yourself.
- **Run specs:** `npx playwright test --reporter=list`. Specs are in
  `tests/`: `smoke.spec.js` (every page: 200, title, nav, no console
  errors + behavior spot-checks); `contact.spec.js` (the form).
  Chromium only. Don't restructure the Playwright scaffolding
  (config, `package.json` scripts) without being asked.
- **Eyeball a change:** `@playwright/test` re-exports browsers — use
  `const { chromium } = require('@playwright/test')`,
  `page.screenshot({ path, fullPage: true })`, read the PNG. Useful
  for canvas rendering, layout, console errors. For `contact.html` use
  `waitUntil: 'domcontentloaded'` (Turnstile never goes idle).

## About the user

- Background in building automation / controls programming (BACnet,
  Modbus TCP, Niagara, EBO); Northeast U.S.
- Solid IP networking fundamentals; learning software dev workflows;
  side project for "exploring vibe coding."
- Comfortable in a terminal, getting comfortable with Git.
- Wants to understand what's happening, not just have it work — when
  introducing a new concept or command, briefly explain it.

## What to avoid

- Don't suggest frameworks, bundlers, transpilers, or static site
  generators without being asked — "no build step" is a feature.
- Don't run Git commands on the user's behalf.
- Don't modify `wrangler.jsonc` casually — see Stack notes.
- Don't add tracking, analytics, or third-party scripts.
- Don't restyle existing tools to introduce a new look — extend the
  design system in `styles.css` instead.
- Don't inline CSS that belongs in `styles.css`, and don't move
  page-only rules into it.

## Roadmap

Near-term tools are tracked as `.tool-preview` cards in "Coming Soon"
on `tools/index.html` (Temperature Conversion, VAV Balancing, BACnet
Object Reference, Modbus Function Codes, Duct Pressure Calculator).
Other near-term work — thermistor *identify mode*, psych chart process
lines / mixing, more Education pages — lives in
`site-ideas-and-friction.md`.

Longer-term: possibly a static site generator (Hugo or 11ty) once the
site outgrows hand-written pages. The duplicated inline `<style>` that
used to motivate this is gone; the next thing pushing that way is the
nav/header markup copied across every page — appropriate when the page
count reaches ~15–20. Keep markup patterns consistent so migration
stays clean.
