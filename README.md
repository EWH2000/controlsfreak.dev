# controlsfreak.dev

Open calculators, converters, and plain-English explainers for
building-controls engineers — BACnet, Modbus, HVAC, and building
automation work. No login, no ads, no tracking, just tools that
are actually useful on a job site.

Live at [controlsfreak.dev](https://controlsfreak.dev).

## What's on the site

### Tools

Calculators, converters, and lookups — open one, get an answer.

- **Signal Scaling** — mA / V analog signals to engineering units
  and back, plus a 2-point → slope/offset solver for `y = mx + b`.
- **Modbus Register Viewer** — a 16-bit register as a clickable
  bit grid with decimal / hex / binary readouts, alongside an
  FC01–16 function-code reference.
- **PID Tuning Helper** — step-response simulator with process-type
  presets and a parameter-style toggle (Niagara gain·reset·rate
  vs. EBO Ti·Td vs. Distech proportional-band conventions; the
  controller runs canonical units, the labels follow you). Bottom
  reference panel has a loop-speed table and a symptom → tuning-move
  cheat sheet. Cross-links to the PID Basics explainer.
- **BACnet/IP Hex Converter** — paste a hex device address (with
  or without an appended UDP port), get dotted-decimal back, and
  vice versa.
- **Psychrometric Chart** — draggable state point on an
  altitude-adjustable ASHRAE IP-unit chart. Type a dry-bulb plus
  one of {RH, WB, DP, humidity ratio, enthalpy} and the rest fall
  out. For building feel, not calibrated load studies.
- **Thermistor / RTD Lookup** — table-driven R↔T curve for common
  sensor types (10K Type II/III, JCI 10K+8.7K shunt,
  Schneider/TAC "Type 5" 10K-3+11K shunt, 20K, 3K, 1K Balco,
  Pt100, Pt1000) with the full R/T table alongside the single
  answer. Tables flagged **pending field verification** — see the
  data file header.
- **Mock VFD Interface** — generic drive keypad to practice
  navigating a parameter tree without a live drive in front of you.
  13 parameters in 4 groups, fixed 20×4 mono LCD, linear-ramp motor
  model, LOCAL/REMOTE override. The run-source / speed-source
  pedagogy from the VFDs explainer in hand: a keypad RUN with the
  run-source set to TERMINALS sits there and does nothing.

Roadmap (Coming Soon cards on the Tools landing):
Temperature Conversion, VAV Balancing, BACnet Object Reference,
Modbus Function Codes, Duct Pressure Calculator.

### Education

Plain-English explainers with hand-drawn SVG schematics. Aimed at
techs new to the industry and anyone wanting a refresh.

- **PID Basics** — what proportional, integral, and derivative
  actually *do* on an HVAC loop, with three cumulative mini-sims
  (P only → P+I → P+I+D) so you can move one knob at a time.
- **Hydronic Loops** — 2-pipe direct return, reverse return, and
  the primary-secondary "twin-T" boiler-injection configuration.
  Animated schematics, plus an interactive injection-pump widget
  on the twin-T section with a hidden failure-state anecdote at
  0 Hz.
- **Load Piping** — two-way vs. three-way valves at hydronic
  loads, variable vs. constant system flow, the differential
  pressure bypass valve (DPBV) on variable-flow systems, and what
  the load-side valve choice cascades to at the loop level. Pays
  off a forward callout from Hydronic Loops.
- **VFDs** — variable-frequency drives from the controls-tech
  angle: block-diagram intro, the cube-law energy story, and the
  *run command vs. speed reference* parameters that gate every
  command from the BMS. Includes an interactive widget that reveals
  a war story when you set up the configuration mistake that
  catches everyone. Pairs with the Mock VFD interface tool.

## How it's built

A multi-page static site under `html/` plus a small Cloudflare
Worker (only for `POST /api/contact`). **No framework, no build
step.** That's load-bearing: the browser loads pages, the shared
`styles.css`, and any shared scripts directly — no bundler, no
transpiler, no generator. View-source shows the real code.
Browsers ten years from now will still run it.

### Architecture

- **Static pages** under `html/`, bound to the Worker as
  `env.ASSETS`. Hand-written HTML, four-space indentation, anchor
  `href`s use explicit `.html` extensions.
- **Shared design system** — `html/styles.css`. Flat
  "workstation" aesthetic borrowing visual grammar from BAS UIs
  (Niagara-ish property-sheet rows, EBO-clean panels, slightly
  shaded panel headers, flat underlined tabs). One design system,
  applied across every page; page-specific CSS stays inline.
- **Shared scripts** in `html/scripts/` as *classic* scripts (not
  ES modules — modules would break the inline `on*` handlers).
  Loaded with `<script src="/scripts/xxx.js"></script>` before
  the page's inline `<script>`:
  - `pid-engine.js` — FOPDT process model + PID controller with
    conditional-integration anti-windup. Drives the PID Tuning
    Helper tool and the three PID Basics mini-sims.
  - `flow-engine.js` — particle-flow animation engine for SVG
    schematics on the hydronic Education pages. Walks
    `<circle>` particles along paths annotated with
    `data-flow="supply"|"return"`. Respects
    `prefers-reduced-motion`.
  - `thermistor-data.js` — sensor R/T curves consumed by the
    Thermistor Lookup tool.
- **Worker** at `src/worker.js` — ES-module Worker. Validates
  the contact form, drops honeypot submissions silently, verifies
  Turnstile, and sends via Resend. Falls through to
  `env.ASSETS.fetch(request)` for everything else.
- **Hosting:** Cloudflare Workers. Auto-deploys on push to `main`
  via the GitHub integration (~60s).
- **Config:** `wrangler.jsonc` — `name`, `main`,
  `assets.directory`, `assets.binding`, `assets.html_handling`,
  and `compatibility_date` are all load-bearing; touch carefully.

`CLAUDE.md` has the full architecture documentation, naming
conventions, design-system component index, and per-page notes.
`site-ideas-and-friction.md` is the running log of ideas,
design decisions, and friction encountered while building.

## Local development

The site has no build step, so most work is just edit-and-reload.

```sh
# serve the static site locally on http://localhost:8000
python3 -m http.server 8000 --directory html

# install dev dependencies (Playwright only — the site itself
# ships zero runtime JS dependencies)
npm install

# smoke tests cover every page + a few behaviour spot-checks
npx playwright test --reporter=list
```

Tests live under `tests/`: `smoke.spec.js` (every page returns
200, has the expected title and nav, no console errors, plus
behaviour spot-checks) and `contact.spec.js` (the contact form).
Chromium only.

For UI changes, screenshot the page after editing rather than
guessing — `@playwright/test` re-exports `chromium` for one-shot
captures. For `contact.html` use `waitUntil: 'domcontentloaded'`
(Turnstile never goes idle).

## Contact

The site's [contact form](https://controlsfreak.dev/contact)
takes bug reports, tool requests, and corrections. GitHub Issues
is also fine for code-side questions.
