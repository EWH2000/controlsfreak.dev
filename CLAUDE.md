# controlsfreak.dev

> **Migration in progress (2026-05-16):** Block B per
> `codebase-issues.md` #4 — partial migration to Eleventy (11ty).
> Build pipeline is live: Cloudflare Workers Build runs
> `npm install && npm run build` on push, and `wrangler.jsonc`
> serves `./_site/`. 4 of 17 pages are templated against
> `html/_includes/` (`index`, `contact`, `tools/index`,
> `education/index`); the rest are still in the original hand-
> written shell and convert in upcoming batches. The notes below
> describe the pre-migration architecture and get rewritten in
> migration Step 6 once all pages are converted. Existing
> templated pages are the reference for new work.

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

For per-page design history, scope decisions, and ideas-not-yet-shipped,
see `site-ideas-and-friction.md`. For open code-quality items needing a
decision, see `codebase-issues.md`. For the user-facing tour of what
the site does, see `README.md`.

## Stack

- **Static pages under `html/`**, bound to the Worker as `env.ASSETS`.
- **`html/styles.css`** — the shared design system. Every page links it
  with `<link rel="stylesheet" href="/styles.css">`. Shared rules live
  in the file; page-only rules stay inline.
- **Shared scripts** in `html/scripts/` are **classic scripts** (not ES
  modules — modules would break the inline `on*` handlers). Load with
  `<script src="/scripts/xxx.js"></script>` *before* the page's inline
  `<script>`. Today:
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
    `document`. Exposes `window.Units`. A tiny inline `<script>` in
    every page's `<head>` reads it before first paint to avoid a US
    flash for metric visitors.
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
- **Fonts:** Google Fonts (IBM Plex Mono + Overpass) with `preconnect`,
  per page. Self-hosting is reasonable future cleanup.
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
  and against the Worker (which redirects to the clean form). Asset
  references (`/styles.css`, `/scripts/…`) are absolute.
- **Indentation: 4 spaces** everywhere — HTML, CSS, JS.
- **Vanilla JS only** — no libraries, no frameworks, no build step.
  Per-page logic in an inline `<script>` at the bottom; genuinely
  shared JS goes in `html/scripts/` as a classic script.
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
├── wrangler.jsonc
├── package.json
├── src/
│   └── worker.js
├── html/
│   ├── index.html
│   ├── contact.html
│   ├── styles.css
│   ├── robots.txt
│   ├── sitemap.xml          # hand-maintained — keep in sync
│   ├── assets/              # og-image.svg/.png, favicons
│   ├── scripts/             # pid-engine, flow-engine, thermistor-data, units, ui
│   ├── tools/
│   │   ├── index.html       # Tools landing (live grid + "Coming Soon")
│   │   ├── signal-scaling.html
│   │   ├── modbus-register-viewer.html
│   │   ├── pid-tuner.html
│   │   ├── bacnet-ip-converter.html
│   │   ├── psychrometric-chart.html
│   │   ├── thermistor-calculator.html
│   │   └── vfd-mock.html
│   └── education/
│       ├── index.html       # Education landing
│       ├── pid-basics.html
│       ├── hydronic-loops.html
│       ├── load-piping.html
│       ├── vfds.html
│       ├── pump-control.html
│       └── balancing.html
└── tests/                   # Playwright (smoke.spec.js, contact.spec.js)
```

## Design landmarks

Cross-cutting decisions that aren't obvious from any single file. For
per-page history and the *why* behind each, see
`site-ideas-and-friction.md`; for the user-facing tour, see
`README.md`.

- **Shared top nav** (`.site-nav`): Home / Tools / Education / Contact.
  Hardcode `.active` on the current page's link; no JS. `Tools` and
  `Education` link to hub landings (`/tools/`, `/education/`).
- **Page archetypes:**
  - *Tools* mostly use the **three-column property-sheet layout**
    (`.tool-body-3col` + `.ps-*` + `.ref-table-dense`) — Input /
    Output / Reference side-by-side, Niagara-style label-left /
    value-right rows. Adopters: BACnet converter, Signal Scaling,
    Modbus Register Viewer, Psychrometric Chart (custom column
    split + page-widened to 1280px inline), Thermistor (custom
    left-biased split). A tool with no useful reference content
    drops the third column and runs two (`grid-column: span 2` on
    Output).
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

For the full component vocabulary, read `styles.css` — it's terse and
well-grouped.

### JS patterns

- Plain functions wired with inline `on*` attributes
  (`oninput="calcScaling()"`, `onclick="switchTab(...)"`).
- **Validate-and-mute:** read inputs with `parseFloat`; if anything is
  `NaN` set the result to `class="result-value muted"` with text `—`
  and clear the formula.
- **Tabs:** `switchTab(name, btn)` (from `/scripts/ui.js`) is scoped
  to the clicked button's nearest `.tool-card`, so a page with
  multiple tabbed tools doesn't clear another's panes.
- Lookup tables for fixed domain data (e.g. `SIG`: signal type →
  `{ min, max, unit }`; `PID_PROC`: process type → FOPDT params).
- **UI vocabulary:** **AI / AO** = analog input/output. Don't use
  "EU" — ambiguous (electrical vs engineering unit); say "Eng. Units"
  / "Engineering Value" instead.

## Adding a new tool

1. Create `html/tools/<tool-name>.html` from the standard page shell:
   - `<head>`: charset/viewport; a unique `<title>`; a unique
     `<meta name="description">` (140–160 chars, human-written, never
     reused — duplicate metadata is worse than none).
   - **Six Open Graph tags** immediately after: `og:title`,
     `og:description`, `og:type=website`, `og:url` (canonical URL),
     `og:image` = `https://controlsfreak.dev/assets/og-image.png`
     (every page shares this), `og:site_name=controlsfreak.dev`.
     `og:title` mirrors `<title>` and `og:description` mirrors the
     meta description verbatim — don't reword.
   - **Three favicon link tags** (byte-identical across pages):
     `<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">`,
     `<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">`,
     `<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon-180.png">`.
   - Google Fonts links, then `<link rel="stylesheet" href="/styles.css">`.
   - `.site-nav` with `Tools` marked `.active`.
   - `<main>` with `.section-header` + the `.tool-card` + an
     `<a class="back-link" href="/tools/">← All tools</a>`.
   - Shared `<footer>`, then an inline `<script>` for page logic.
     Load any shared scripts (`/scripts/pid-engine.js`,
     `/scripts/flow-engine.js`, etc.) *before* the inline script.
   - Anchor `href`s use explicit `.html` extensions.
2. Follow the validate-and-mute JS pattern.
3. Add a `.nav-card` for the page to the `.card-grid` on
   `tools/index.html`.
4. If it graduates a Coming-Soon item, delete the matching
   `.tool-preview` card from `tools/index.html`.
5. Add the page's URL to `html/sitemap.xml` (hand-maintained — no
   generator).
6. Bump the version string in the footer when shipping something
   notable (currently `v1.3 · 2026`, carried by every page).

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

Typical loop: user asks for a change → Claude edits → user reviews
the diff → user says "commit" → Claude commits → user pushes →
Cloudflare auto-deploys within ~60s.

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
on `tools/index.html`. Other near-term work — thermistor *identify
mode*, psych chart *floating state-point chip*, more Education pages
— lives in `site-ideas-and-friction.md`.

Longer-term: possibly a static site generator (Hugo or 11ty) once the
site outgrows hand-written pages. The nav/header markup copied across
every page is the next thing pushing that way — appropriate when the
page count reaches ~15–20. Keep markup patterns consistent so
migration stays clean.
