# controlsfreak.dev

A field-reference tool site for building-controls engineers — open
calculators and lookup utilities for BACnet, Modbus, HVAC, and building
automation work. "No login, no ads, just tools that are actually useful
on a job site." Hand-written HTML pages plus a small Cloudflare Worker
(only for the `/contact` form) — no framework, no build step. There's a
personal "About" card on the home page, but the project is the tools,
not a personal homepage.

## Stack

- **Pages:** `html/index.html` (the tools) and `html/contact.html` (the
  contact form). Each is a single file — HTML, one inline `<style>`, one
  inline `<script>`; no external CSS/JS. The two pages carry the *same*
  inline `<style>` (copy/paste — a small, accepted duplication for a
  two-page hand-written site); `contact.html` appends a few page-specific
  rules at the end (`.hp-field`, `.contact-intro`, `#contact-result-value`).
  If you edit the shared part, keep both copies in sync.
- **Worker:** `src/worker.js` — an ES-module Worker. Handles
  `POST /api/contact` (validate input, silently drop honeypot hits,
  verify the Turnstile token, send the message via Resend with
  `reply_to` = the submitter) and falls through to
  `env.ASSETS.fetch(request)` for everything else, so the rest of the
  site behaves like a plain static deploy. Needs two secrets in the
  environment — `TURNSTILE_SECRET` and `RESEND_API_KEY` (set with
  `wrangler secret put ...`). The Turnstile *site* key is a placeholder
  in `contact.html` (`REPLACE_WITH_SITE_KEY`); the user pastes the real
  one. The `from`/`to` address is `contact@controlsfreak.dev` (must be a
  verified Resend sender).
- **Fonts:** Google Fonts (IBM Plex Mono + Overpass) from
  `fonts.googleapis.com` with a `preconnect`. (`contact.html` also loads
  Cloudflare's Turnstile script.) Self-hosting the fonts is a reasonable
  future cleanup.
- **Hosting:** Cloudflare Workers — the Worker above, with `html/` bound
  as static assets.
- **Deploy:** Auto-deploys on push to `main` via GitHub integration.
- **Config:** `wrangler.jsonc` at repo root — `name` (Worker name),
  `main` (`src/worker.js`), `assets.directory` (`./html`),
  `assets.binding` (`ASSETS`, so the Worker can serve static files), and
  `assets.html_handling` (`auto-trailing-slash` — gives clean URLs like
  `/contact` → `contact.html`), plus `compatibility_date`, are all
  load-bearing; touch carefully.

## Repo structure

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
│   ├── index.html      # the tools page
│   └── contact.html    # the contact form
├── tests/              # Playwright specs (smoke.spec.js, contact.spec.js)
├── node_modules/       # gitignored
└── test-results/       # Playwright output — gitignored

## What's on the site today

Two pages with a shared top nav (`.site-nav`). The home page
(`index.html`) has three sections (`#tools`, `#roadmap`, About):

- **Signal Scaling Calculator** (`.tool-card`, "Analog I/O") — three
  tabs:
  - *Signal → Eng. Units* — mA/V signal to engineering units, with % of
    span, a range bar, and the worked formula
  - *Eng. Units → Signal* — the inverse
  - *2-Point → Slope / Offset* — two known IO pairs to `y = mx + b`,
    with copy buttons (aimed at pasting into Niagara's ProxyExt)
- **Modbus Register Viewer** (`.tool-card`, "Modbus") — 16-bit
  clickable toggle grid, two-way bound to decimal / hex inputs, with
  dec / hex / binary readouts
- **PID Tuning Helper** (`.tool-card`, "Loops") — three stacked parts:
  a step-response simulator (process-type `<select>`, a parameter-style
  `<select>` that relabels the controls — gain·reset·rate / Ti·Td in
  minutes or seconds / proportional band — preset-tuning chips, three
  `<input type=range>` sliders with Ti / Td / PB equivalents shown
  beneath each, a `<canvas>` plot of PV vs. setpoint, and overshoot /
  settling-time / steady-state-error readouts), a symptom →
  what-to-change `<table>`, and a plain-English P/I/D explainer. The
  controller runs on canonical params (gain, repeats/min, minutes); the
  parameter-style selector only changes labels/units. The simulated
  process is a toy first-order-plus-dead-time model — it exists for
  intuition, not for tuning a real loop. All of it (chart included) is
  plain JS.
- **Roadmap** (`#roadmap`) — `.tool-preview` cards for tools not built
  yet (see below)
- **About** — short personal blurb

The **Contact** page (`contact.html`) is a `.tool-card` with a
name / email / message form — plus an off-screen CSS honeypot
(`.hp-field`, named `website`) and a Cloudflare Turnstile widget — that
POSTs form-encoded data to the Worker's `/api/contact`. The Worker
validates, silently drops honeypot hits (returns `{ok:true}` without
sending), verifies the Turnstile token, then emails via Resend with
`reply_to` set to the submitter. Submit feedback is shown in a
`.result-panel` (the JS in `contact.html` is just `submitContact()`).

## Conventions

- **Indentation: 4 spaces** in `index.html` (HTML and JS; nested CSS
  goes deeper to match).
- Prefer semantic HTML over div soup.
- Vanilla JS only — no libraries, no build step, no frameworks. All JS
  lives in the single `<script>` at the bottom of `index.html`.
- Keep it fast and accessible — no heavy media, no auto-playing
  anything, no tracking or analytics scripts.

### Design system (reuse, don't reinvent)

The page defines a small vocabulary in the inline `<style>`. A new tool
should be built from these, not freshly styled:

- **CSS custom properties** in `:root` (the theme lives here — change
  colors by editing these, not by hardcoding): `--bg` (light gray-green
  app chrome) / `--surface` (white panes) / `--surface-2` (panel headers,
  table heads, insets); `--border` (hairlines); `--accent` (`#43881c`,
  the green — chosen to stay readable on white for text and UI) /
  `--accent-dim` / `--accent-glow`; `--text` / `--text-bright` /
  `--text-dim`; `--blue` (`#1577b8`, data readouts / highlight); `--red`
  (fault/alarm); `--mono` (IBM Plex Mono) / `--sans` (Overpass). The page
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
  (the PID simulator). Shared across pages: `.site-nav` /
  `.site-nav-brand` / `.site-nav-links` (the top nav — hardcode `.active`
  on the current page's right-side link, no JS). Contact page only:
  `.hp-field` (off-screen honeypot wrapper), `.contact-intro`;
  `textarea` and `input[type=email]` are styled by the same rule as the
  other form inputs (so a `textarea` gets the standard input look,
  `--bg` background and all — not `--surface`).

### JS patterns

- Plain functions wired up with inline `on*` attributes
  (`oninput="calcScaling()"`, `onclick="switchTab(...)"`).
- Validate-and-mute: read inputs with `parseFloat`, and if anything is
  `NaN` (or otherwise invalid) set the result element to
  `class="result-value muted"` with text `—` and clear the formula.
- Tabs via `switchTab(name, btn)`.
- Lookup tables for fixed domain data (e.g. the `SIG` object: signal
  type → `{ min, max, unit }`).
- Domain shorthand in the UI: **AI / AO** = analog input / output.
  Don't use "EU" — it's ambiguous (electrical vs engineering unit); the
  Signal Scaling tool says "Eng. Units" / "Eng. Value" / "Engineering
  Value" instead.

### Adding a new tool

1. Add a `.tool-card` block under `<main id="tools">`, following the
   header / `.tool-body` / `.form-row` / `.result-panel` markup of the
   existing tools.
2. Add its function(s) to the single `<script>` at the bottom, following
   the validate-and-mute pattern.
3. If it graduates a roadmap item, delete the matching `.tool-preview`
   card from the `#roadmap` grid.
4. Bump the version string in the footer (currently `v0.2 · 2026`) when
   shipping something notable.

## Workflow

The user runs Git commands themselves. Claude Code's job is editing
source files; the user handles staging, committing, and pushing.
Do not run `git add`, `git commit`, or `git push` unless explicitly
asked.

Typical loop:
1. User asks for an HTML/CSS/JS change
2. Claude Code edits `html/index.html`
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
  tests or screenshots.
- **Run the specs:** `npx playwright test --reporter=list`
- **Eyeball a change:** script a page with the `playwright` package and
  `page.screenshot({ path, fullPage: true })`, then read the PNG —
  worth doing for canvas rendering, layout, and catching console errors.

Specs live in `tests/` (`smoke.spec.js` checks the page loads). Chromium
is the installed browser. Don't restructure the Playwright scaffolding
(config, `package.json` scripts) without being asked — the user owns it.

## About the user

- Background in building automation / controls programming (BACnet,
  Modbus TCP, Niagara, EBO); based in the Northeast U.S.
- Solid IP networking fundamentals; learning software dev workflows;
  describes this as a side project for "exploring vibe coding"
- Comfortable in a terminal, getting comfortable with Git
- Wants to understand what's happening, not just have it work — when
  introducing a new concept or command, briefly explain it

## What to avoid

- Don't suggest adding frameworks, bundlers, or build steps without
  being asked. The site is intentionally simple.
- Don't run Git commands on the user's behalf.
- Don't modify `wrangler.jsonc` casually — `name`, `assets.directory`,
  and `compatibility_date` are load-bearing for deploys.
- Don't add tracking, analytics, or third-party scripts without being
  asked.
- Don't restyle existing tools to introduce a new look — extend the
  design system above instead.

## Roadmap

Near-term tools are tracked as `.tool-preview` cards in the `#roadmap`
section of `index.html`:

- Temperature Conversion (°F / °C / K / °R with HVAC setpoint reference)
- VAV Balancing (K-factor, design CFM, velocity pressure)
- BACnet Object Reference (object type codes, property IDs, data types)
- Modbus Function Codes (FC01–FC23 with frame breakdowns)
- Duct Pressure Calculator (static / velocity / total pressure)

The contact / bug-report path is now live at `/contact`, and the About
card on the home page links to it.

Longer-term: possibly a static site generator (Hugo or 11ty are the
leading candidates) once the site outgrows hand-written pages — the
duplicated inline `<style>` across `index.html` and `contact.html` is
the first thing that would motivate it. Keep markup patterns consistent
so that migration stays clean.
