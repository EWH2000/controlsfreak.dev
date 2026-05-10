# controlsfreak.dev

A field-reference tool site for building-controls engineers — open
calculators and lookup utilities for BACnet, Modbus, HVAC, and building
automation work. "No login, no ads, just tools that are actually useful
on a job site." Static site, hand-written HTML, no framework or build
step (yet). There's a personal "About" card on the page, but the project
is the tools, not a personal homepage.

## Stack

- **Source:** one page, `html/index.html` — HTML, an inline `<style>`,
  and an inline `<script>`. No external CSS or JS files.
- **Fonts:** Google Fonts (IBM Plex Mono + Overpass) loaded from
  `fonts.googleapis.com` with a `preconnect`. This is the one
  third-party request on the page; self-hosting the fonts is a
  reasonable future cleanup.
- **Hosting:** Cloudflare Workers (static-assets-only Worker)
- **Deploy:** Auto-deploys on push to `main` via GitHub integration
- **Config:** `wrangler.jsonc` at repo root — `name` (the Worker name),
  `assets.directory` (`./html`), and `compatibility_date` are all
  load-bearing for deploys; touch carefully.

## Repo structure

controlsfreak.dev/
├── CLAUDE.md           # this file
├── README.md           # human-facing project description
├── wrangler.jsonc      # Cloudflare deploy config — touch carefully
├── .gitignore
└── html/               # site root, served as-is
    └── index.html      # the entire site

## What's on the site today

Single page, three sections (`#tools`, `#roadmap`, About):

- **Signal Scaling Calculator** (`.tool-card`, "Analog I/O") — three
  tabs:
  - *Signal → EU* — mA/V signal to engineering units, with % of span,
    a range bar, and the worked formula
  - *EU → Signal* — the inverse
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

- **CSS custom properties** in `:root`: `--bg`, `--surface` /
  `--surface-2`, `--border`, `--accent` (`#55ae2a`), `--accent-dim` /
  `--accent-glow`, `--text` / `--text-bright` / `--text-dim`, `--green`,
  `--red`, `--mono` (IBM Plex Mono), `--sans` (Overpass). Dark
  terminal-green aesthetic with a faint dot-grid background.
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
  (the PID simulator).

### JS patterns

- Plain functions wired up with inline `on*` attributes
  (`oninput="calcScaling()"`, `onclick="switchTab(...)"`).
- Validate-and-mute: read inputs with `parseFloat`, and if anything is
  `NaN` (or otherwise invalid) set the result element to
  `class="result-value muted"` with text `—` and clear the formula.
- Tabs via `switchTab(name, btn)`.
- Lookup tables for fixed domain data (e.g. the `SIG` object: signal
  type → `{ min, max, unit }`).
- Domain shorthand used in the UI: **EU** = engineering units;
  **AI / AO** = analog input / output.

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

Longer-term: a contact / bug-report path (currently "coming soon" in
the About card), and possibly a static site generator (Hugo or 11ty are
the leading candidates) once the site outgrows a single hand-written
page. Keep markup patterns consistent so that migration stays clean.
