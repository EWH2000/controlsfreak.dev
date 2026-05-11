# controlsfreak.dev

A field-reference tool site for building-controls engineers — open
calculators and lookup utilities for BACnet, Modbus, HVAC, and building
automation work, plus plain-English explainers for newer techs. "No
login, no ads, just tools that are actually useful on a job site."
Hand-written HTML pages plus a small Cloudflare Worker (only for the
`/contact` form) — **no framework, no build step.** ("No build step" is
the load-bearing property: the browser loads the pages, a shared
`styles.css`, and a small shared script directly — there's no bundler,
transpiler, or generator. Pages sharing external CSS/JS files is fine;
that's still no build step.) There's a personal "About" card on the home
page, but the project is the tools, not a personal homepage.

## Stack

- **Pages — a small multi-page static site under `html/`** (served as-is,
  bound as `env.ASSETS`):
  - `html/index.html` — the home page: a short site intro, two
    `.nav-card` tiles linking to **Tools** and **Education**, and the
    personal About card.
  - `html/tools/index.html` — the Tools landing: a `.nav-card` grid of
    the live tools plus a "Coming Soon" grid of `.tool-preview` cards.
  - `html/tools/signal-scaling.html`, `html/tools/modbus-register-viewer.html`,
    `html/tools/pid-tuner.html`, `html/tools/bacnet-ip-converter.html` —
    one page per tool, each a `.tool-card` with its own inline `<script>`
    for page-specific logic.
  - `html/education/pid-basics.html` — the Education section's first page
    (currently a stub; see "What's on the site today").
  - `html/contact.html` — the contact form.
  - `html/styles.css` — **the shared design system** (all the `:root`
    custom properties and component classes). Every page links it with
    `<link rel="stylesheet" href="/styles.css">`. Page-specific CSS stays
    inline on the page that needs it — currently only `contact.html`,
    which keeps a tiny inline `<style>` for `.hp-field` / `.contact-intro` /
    `#contact-result-value`.
  - `html/scripts/pid-engine.js` — **the shared PID simulation core** (the
    first-order-plus-dead-time process model + discrete-time stepping +
    derived metrics; exposes `PID_PROC` and `simulatePid()`). It's a
    *classic* script, not an ES module, so its globals are visible to the
    inline `on*` handlers and the page's own `<script>`; load it with
    `<script src="/scripts/pid-engine.js"></script>` *before* the page's
    inline script. `tools/pid-tuner.html` uses it today; the planned
    Education mini-sims will reuse it with a stripped-down UI.

  Anchor `href`s use **explicit `.html` extensions** (e.g.
  `/tools/signal-scaling.html`, `/education/pid-basics.html`,
  `/contact.html`) — directory URLs (`/`, `/tools/`) stay clean. This
  works against the local `python -m http.server` (no clean-URL
  rewriting) and against the Worker, which `auto-trailing-slash` happily
  redirects `.html` requests to the clean form, so the address bar still
  ends up clean in production after the first hop. Use this pattern for
  every new `<a href>`. Asset references (`/styles.css`,
  `/scripts/pid-engine.js`) are absolute so they work from any directory
  depth.
- **Worker:** `src/worker.js` — an ES-module Worker. Handles
  `POST /api/contact` (validate input, silently drop honeypot hits,
  verify the Turnstile token, send the message via Resend with
  `reply_to` = the submitter) and falls through to
  `env.ASSETS.fetch(request)` for everything else, so the rest of the
  site behaves like a plain static deploy. Needs two secrets in the
  environment — `TURNSTILE_SECRET` and `RESEND_API_KEY` (set with
  `wrangler secret put ...`). The Turnstile *site* key lives in
  `contact.html`'s Turnstile widget markup (`data-sitekey="..."`). The
  `from`/`to` address is `contact@controlsfreak.dev` (must be a verified
  Resend sender).
- **Fonts:** Google Fonts (IBM Plex Mono + Overpass) from
  `fonts.googleapis.com` with a `preconnect`, declared in each page's
  `<head>`. (`contact.html` also loads Cloudflare's Turnstile script.)
  Self-hosting the fonts is a reasonable future cleanup.
- **Hosting:** Cloudflare Workers — the Worker above, with `html/` bound
  as static assets.
- **Deploy:** Auto-deploys on push to `main` via GitHub integration.
- **Config:** `wrangler.jsonc` at repo root — `name` (Worker name),
  `main` (`src/worker.js`), `assets.directory` (`./html`),
  `assets.binding` (`ASSETS`, so the Worker can serve static files), and
  `assets.html_handling` (`auto-trailing-slash` — strips `.html` on the
  way out, e.g. a request for `/contact.html` is redirected to `/contact`,
  and `/tools/` serves `tools/index.html`), plus `compatibility_date`,
  are all load-bearing; touch carefully.

## Repo structure

```
controlsfreak.dev/
├── CLAUDE.md           # this file
├── README.md           # human-facing project description
├── wrangler.jsonc      # Cloudflare config (Worker + static assets) — touch carefully
├── package.json        # dev tooling only (Playwright) — the site itself has no build step
├── package-lock.json
├── .gitignore
├── src/
│   └── worker.js       # Cloudflare Worker — POST /api/contact, else fall through to assets
├── html/               # static assets, served as-is (bound as env.ASSETS)
│   ├── index.html      # home — intro + Tools/Education tiles + About
│   ├── contact.html    # the contact form (keeps a tiny inline <style> for page-only rules)
│   ├── styles.css      # the shared design system (every page links it)
│   ├── scripts/
│   │   └── pid-engine.js   # shared PID simulation core (classic script: PID_PROC, simulatePid)
│   ├── tools/
│   │   ├── index.html              # Tools landing — live tools grid + "Coming Soon"
│   │   ├── signal-scaling.html
│   │   ├── modbus-register-viewer.html
│   │   ├── pid-tuner.html          # also loads /scripts/pid-engine.js
│   │   └── bacnet-ip-converter.html
│   └── education/
│       └── pid-basics.html         # Education section — currently a stub
├── tests/              # Playwright specs (smoke.spec.js, contact.spec.js)
├── node_modules/       # gitignored
└── test-results/       # Playwright output — gitignored
```

## What's on the site today

A multi-page site with a shared top nav (`.site-nav`): **Home / Tools /
Education / Contact** (hardcode `.active` on the current page's link, no
JS). Pages link the shared `styles.css`.

**Home** (`index.html`) — a short hero intro, two `.nav-card` tiles
(Tools, Education), and the personal **About** card.

**Tools landing** (`tools/index.html`) — a `.nav-card` grid linking to
each live tool, then a "Coming Soon" `.tool-grid` of dimmed
`.tool-preview` cards (the roadmap items). Each live tool is its own page:

- **Signal Scaling Calculator** (`tools/signal-scaling.html`, "Analog I/O")
  — three tabs:
  - *Signal → Eng. Units* — mA/V signal to engineering units, with % of
    span, a range bar, and the worked formula
  - *Eng. Units → Signal* — the inverse
  - *2-Point → Slope / Offset* — two known IO pairs to `y = mx + b`,
    with copy buttons (aimed at pasting into Niagara's ProxyExt)
- **Modbus Register Viewer** (`tools/modbus-register-viewer.html`, "Modbus")
  — 16-bit clickable toggle grid, two-way bound to decimal / hex inputs,
  with dec / hex / binary readouts
- **PID Tuning Helper** (`tools/pid-tuner.html`, "Loops") — a step-response
  simulator (process-type `<select>`, a parameter-style `<select>` that
  relabels the controls — gain·reset·rate / Ti·Td in minutes or seconds /
  proportional band — preset-tuning chips, three `<input type=range>`
  sliders with Ti / Td / PB equivalents shown beneath each, a `<canvas>`
  plot of PV vs. setpoint, and overshoot / settling-time /
  steady-state-error readouts), a tightened symptom → tuning-move
  `.ref-table` (short arrow codes — ↑/↓, P/I/D — not prose), and a
  plain-English P/I/D explainer. The simulation core lives in
  `/scripts/pid-engine.js` (`PID_PROC`, `simulatePid()`); this page owns
  the sliders, preset chips, label/unit relabeling, and the canvas
  drawing — everything UI. The controller runs on canonical params (gain,
  repeats/min, minutes); the parameter-style selector only changes
  labels/units. The simulated process is a toy first-order-plus-dead-time
  model — it exists for intuition, not for tuning a real loop. (The
  longer P/I/D explainer and three cumulative mini-sims are slated to move
  to `education/pid-basics.html`; see `site-ideas-and-friction.md`.)
- **BACnet/IP Hex Converter** (`tools/bacnet-ip-converter.html`, "BACnet")
  — two tabs: *Hex → IP* (paste the hex address string EBO shows for a
  BACnet/IP device — tolerant of spaces/dots/dashes/`0x` — get
  dotted-decimal IP and, for a 12-digit string, the UDP port, with the
  default `BAC0`/47808 flagged) and *IP → Hex* (the inverse; blank port →
  8-digit string, port given → 12-digit). Copy buttons on the outputs.

**Education** (`education/pid-basics.html`) — currently a stub: the page
shell plus a `.tool-card` placeholder and a comment block describing what
will fill it (the P/I/D explainer moved over from the PID tuner, plus
three "Coming soon" mini-sim placeholder cards). Enough that the
Education nav link doesn't 404. The Education section has just this one
page for now; there's no `education/index.html` landing yet.

**Contact** (`contact.html`) — a `.tool-card` with a name / email /
message form, an off-screen CSS honeypot (`.hp-field`, named `website`),
and a Cloudflare Turnstile widget; POSTs form-encoded data to the
Worker's `/api/contact`. The Worker validates, silently drops honeypot
hits (returns `{ok:true}` without sending), verifies the Turnstile token,
then emails via Resend with `reply_to` set to the submitter. Submit
feedback is shown in a `.result-panel` (the JS in `contact.html` is just
`submitContact()`).

## Conventions

- **Indentation: 4 spaces** everywhere — HTML, CSS (`styles.css` is at
  base indent 0), JS. Nested CSS inside an HTML `<style>` block goes
  deeper to match its surroundings.
- Prefer semantic HTML over div soup.
- Vanilla JS only — no libraries, no frameworks, no build step. Per-page
  JS lives in an inline `<script>` at the bottom of each page; genuinely
  shared JS goes in a real file under `html/scripts/` loaded via
  `<script src>` (currently just `pid-engine.js`, a classic script —
  modules would break the inline `on*` handlers). Bundlers, transpilers,
  frameworks, and static site generators are still out.
- Keep it fast and accessible — no heavy media, no auto-playing anything,
  no tracking or analytics scripts.

### Design system (reuse, don't reinvent)

The design system lives in `html/styles.css`, which every page links. A
new tool/page should be built from this vocabulary, not freshly styled.
*(The restructure that split the single page into many didn't change the
design system at all — same custom properties, same component classes,
same patterns; what changed is **where they live**: one shared file
instead of an inline `<style>` duplicated across pages.)*

- **CSS custom properties** in `:root` (the theme lives here — change
  colors by editing these, not by hardcoding): `--bg` (light gray-green
  app chrome) / `--surface` (white panes) / `--surface-2` (panel headers,
  table heads, insets); `--border` (hairlines); `--accent` (`#43881c`,
  the green — chosen to stay readable on white for text and UI) /
  `--accent-dim` / `--accent-glow`; `--text` / `--text-bright` /
  `--text-dim`; `--blue` (`#1577b8`, data readouts / highlight); `--red`
  (fault/alarm); `--mono` (IBM Plex Mono) / `--sans` (Overpass). The site
  sets `color-scheme: light` and is light-only — no dark variant, no
  `prefers-color-scheme` switch. Aesthetic: flat, light "workstation"
  look — white panels on light gray-green chrome, hairline borders, a
  green accent — with quiet nods to building-automation UIs (slightly
  shaded panel headers, property-sheet-style zebra tables, flat
  underlined tabs). No drop shadows, no background texture. The canvas
  chart reads its colors from these vars via `getComputedStyle` at draw
  time, so it follows any palette change automatically.
- **Component classes:** `.tool-card` / `.tool-card-header` /
  `.tool-card-title` / `.tool-tag` / `.tool-body`; `.tabs` / `.tab-btn`
  / `.tab-pane`; `.form-row` (+ `.three`) / `.field` / `label`;
  `.result-panel` / `.result-label` / `.result-value` (+ `.error` /
  `.muted` / `.warn`); `.result-formula`; `.range-bar-wrap` /
  `.range-bar` / `.range-bar-fill`; `.copy-btn` (+ `.copied` /
  `.active`); `.section-header` / `.section-label` / `.section-line`;
  `.subhead` (a section divider inside a `.tool-body`); `.bit-readouts`
  / `.readout` / `.readout-label` / `.readout-value` (also reused for
  the PID metrics row); `.ref-table` (reference tables); `.pid-terms` /
  `.pid-term`; `.btn-row`, `.slider-field` / `.slider-head` /
  `.slider-val`, `input[type=range]`, `.sim-canvas-wrap` / `.sim-legend`
  (the PID simulator); `.tool-grid` / `.tool-preview` (the dimmed
  "Coming Soon" cards on the Tools landing); `.card-grid` (+ `.two`) /
  `.nav-card` / `.nav-card-tag` / `.nav-card-name` / `.nav-card-desc`
  (the clickable landing tiles on the home page and Tools landing);
  `.hero` / `.hero-eyebrow` / `.hero-badges` / `.badge` (the home
  hero). Shared across pages: `.site-nav` / `.site-nav-brand` /
  `.site-nav-links` (the top nav). Contact page only: `.hp-field`
  (off-screen honeypot wrapper), `.contact-intro` (these stay in
  `contact.html`'s inline `<style>`, not `styles.css`); `textarea` and
  `input[type=email]` are styled by the same rule as the other form
  inputs (so a `textarea` gets the standard input look, `--bg`
  background and all — not `--surface`).

### JS patterns

- Plain functions wired up with inline `on*` attributes
  (`oninput="calcScaling()"`, `onclick="switchTab(...)"`).
- Validate-and-mute: read inputs with `parseFloat`, and if anything is
  `NaN` (or otherwise invalid) set the result element to
  `class="result-value muted"` with text `—` and clear the formula.
- Tabs via `switchTab(name, btn)` — scoped to the clicked button's
  nearest `.tool-card`, so a page with more than one tabbed tool doesn't
  clear another's panes. (Each page that has tabs carries its own copy
  of this small helper in its inline `<script>`; same for `copyVal`.)
- Lookup tables for fixed domain data (e.g. the `SIG` object: signal
  type → `{ min, max, unit }`; `PID_PROC`: process type → FOPDT params).
- Domain shorthand in the UI: **AI / AO** = analog input / output.
  Don't use "EU" — it's ambiguous (electrical vs engineering unit); the
  Signal Scaling tool says "Eng. Units" / "Eng. Value" / "Engineering
  Value" instead.

### Adding a new tool

1. Create `html/tools/<tool-name>.html` from the standard page shell:
   the `<head>` (charset/viewport, a `<title>`, a `<meta description>`,
   the Google Fonts `<link>`s, then `<link rel="stylesheet" href="/styles.css">`),
   the `.site-nav` with `Tools` marked `.active`, a `<main>` with a
   `.section-header` + the `.tool-card` (header / `.tool-body` /
   `.form-row` / `.result-panel` markup, matching the existing tools) +
   an "← All tools" link, the shared `<footer>`, then an inline
   `<script>` for the page-specific logic (and, if the tool needs the PID
   simulator, `<script src="/scripts/pid-engine.js"></script>` *before*
   that).
2. Follow the validate-and-mute pattern in the JS.
3. Add a `.nav-card` for the new page to the `.card-grid` on
   `tools/index.html`.
4. If it graduates a Coming-Soon item, delete the matching
   `.tool-preview` card from the "Coming Soon" `.tool-grid` on
   `tools/index.html`.
5. Bump the version string in the footer (currently `v0.3 · 2026`,
   carried by every page) when shipping something notable.

## Workflow

The user runs Git commands themselves. Claude Code's job is editing
source files; the user handles staging, committing, and pushing.
Do not run `git add`, `git commit`, or `git push` unless explicitly
asked.

Typical loop:
1. User asks for an HTML/CSS/JS change
2. Claude Code edits the relevant file under `html/`
3. User reviews the diff (`git diff`)
4. User commits and pushes
5. Cloudflare auto-deploys within ~60 seconds

## Local preview & tests (Playwright)

Playwright is set up (`@playwright/test`, a dev dependency only — the
site itself still has no build step). Use it to actually look at the
page after a UI change instead of guessing; this has been verified
working.

- **Serve the site:** `python3 -m http.server 8000 --directory html`
  — the specs expect it on port 8000. There is no `webServer` block in
  the Playwright config, so start the server yourself before running
  tests or screenshots. Because the site's anchors use explicit `.html`
  paths (see the Stack note above), every page navigates correctly
  against the plain http.server — no clean-URL rewriting needed locally.
- **Run the specs:** `npx playwright test --reporter=list`
- **Eyeball a change:** the standalone `playwright` package isn't
  installed, but `@playwright/test` re-exports the browsers — script a
  page with `const { chromium } = require('@playwright/test')`,
  `page.screenshot({ path, fullPage: true })`, then read the PNG. Worth
  doing for canvas rendering, layout, and catching console errors. (For
  pages that load Turnstile — `contact.html` — use `waitUntil:
  'domcontentloaded'`, not `'networkidle'`; the Turnstile script never
  goes idle.)

Specs live in `tests/`: `smoke.spec.js` checks every page loads (200,
title, nav visible, no console/page errors) plus a couple of behavior
spot-checks; `contact.spec.js` covers the contact form. Chromium is the
installed browser. Don't restructure the Playwright scaffolding (config,
`package.json` scripts) without being asked — the user owns it; keeping
the spec *contents* in step with the pages is fine.

## About the user

- Background in building automation / controls programming (BACnet,
  Modbus TCP, Niagara, EBO); based in the Northeast U.S.
- Solid IP networking fundamentals; learning software dev workflows;
  describes this as a side project for "exploring vibe coding"
- Comfortable in a terminal, getting comfortable with Git
- Wants to understand what's happening, not just have it work — when
  introducing a new concept or command, briefly explain it

## What to avoid

- Don't suggest adding frameworks, bundlers, transpilers, or static site
  generators without being asked. The site is intentionally simple — "no
  build step" is a feature.
- Don't run Git commands on the user's behalf.
- Don't modify `wrangler.jsonc` casually — `name`, `assets.directory`,
  `assets.html_handling`, and `compatibility_date` are load-bearing for
  deploys.
- Don't add tracking, analytics, or third-party scripts without being
  asked.
- Don't restyle existing tools to introduce a new look — extend the
  design system in `styles.css` instead.
- Don't inline CSS that belongs in the shared `styles.css` (or move
  page-only rules into it) — shared rules live in the file, page-specific
  rules stay inline on their page.

## Roadmap

Near-term tools are tracked as `.tool-preview` cards in the "Coming Soon"
section of `tools/index.html`:

- Temperature Conversion (°F / °C / K / °R with HVAC setpoint reference)
- VAV Balancing (K-factor, design CFM, velocity pressure)
- BACnet Object Reference (object type codes, property IDs, data types)
- Modbus Function Codes (FC01–FC23 with frame breakdowns)
- Duct Pressure Calculator (static / velocity / total pressure)

Other near-term work, tracked in `site-ideas-and-friction.md`: fleshing
out `education/pid-basics.html` (the P/I/D explainer moved over from the
PID tuner, plus three cumulative mini-sims that reuse `pid-engine.js`),
and tools like the thermistor calculator and the interactive
psychrometric simulator.

The contact / bug-report path is live at `/contact`, and the About card
on the home page links to it.

Longer-term: possibly a static site generator (Hugo or 11ty are the
leading candidates) once the site outgrows hand-written pages. The
duplicated inline `<style>` that used to motivate this is gone (now
`html/styles.css`); the next thing pushing that way would be the
nav/header markup copied across every page — appropriate when the page
count reaches ~15–20. Keep markup patterns consistent so migration stays
clean.
