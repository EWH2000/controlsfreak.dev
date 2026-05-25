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
- **Modbus Register Viewer** — Single Register tab: a 16-bit
  register as a clickable bit grid with decimal / hex / binary
  readouts plus a signed/unsigned toggle on the decimal
  interpretation. 32-bit Pair tab: feed two consecutive registers,
  see the combined value decoded as int32 / uint32 / IEEE-754 float
  across all four byte orderings (ABCD / CDAB / BADC / DCBA) — the
  word-order question that bites every Modbus tech, surfaced as a
  scannable table. "Modbus essentials" tips row beneath both tabs
  covers addressing offsets, signed/unsigned, byte order, function
  codes, and exception responses; FC01–16 reference table sits
  there too.
- **BACnet/IP Hex Converter** — paste a hex device address (with
  or without an appended UDP port), get dotted-decimal back, and
  vice versa.
- **Psychrometric Chart** — walk an air handler through its
  psychrometric processes on an altitude-adjustable ASHRAE IP-unit
  chart: mix outdoor and return air, then cool, heat, and humidify.
  Step pills pick the focused stage; OA and RA are draggable on the
  chart. Process segments are color-coded (mixing, cooling/dehum,
  heating, adiabatic humidification). Optional AHU airflow input
  surfaces coil capacities in MBH with the sensible / latent split.
  For building feel, not calibrated load studies.
- **Economizer Ratio Helper** — required %OA to mix outdoor and
  return air down to a mixed-air dry-bulb setpoint, with a
  feasibility verdict ("setpoint between OA and RA — feasible",
  "OA hotter than setpoint — infeasible", "OA cool but not enough —
  damper goes 100 % OA, coil picks up the rest"). Enthalpy tab
  takes full OA/RA states (Define-by pattern, same as the chart
  tool) and adds the resulting full mixed state plus the OA-vs-RA
  enthalpy changeover verdict a high-end BAS uses to gate free
  cooling before any dry-bulb modulation runs.
- **Air-Mixing Calculator** — blend three air streams by mass flow
  (CFMs at the panel) or by mass fraction (percentages off a
  schematic) and read out the full mixed-air state — dry-bulb,
  wet-bulb, humidity, enthalpy, dew point. The mass-fraction tab
  flags fractions that don't sum to 100 % rather than silently
  renormalizing.
- **Coil-Sizing Calculator** — one coil in isolation. Capacity tab:
  entering air + leaving air + airflow → total / sensible / latent
  capacity and the sensible heat ratio. Leaving-state tab runs it
  backwards — entering air + airflow + the coil's load → the
  leaving-air state, flagging the apparatus dew point when a latent
  load drives the leaving point onto the saturation curve. Cooling
  or heating coil; sea-level pressure.
- **Thermistor / RTD Calculator** — table-driven R↔T curve for
  common sensor types (10K Type II/III, JCI 10K+8.7K shunt,
  Schneider/TAC "Type 5" 10K-3+11K shunt, 20K, 3K, 1K Balco,
  Pt100, Pt1000). Lookup mode gives temperature ↔ resistance with
  the full R/T table alongside; Identify mode ranks every type
  against measured points to name an unknown sensor. Curve
  parameters verified against BAPI, Vector Controls, Sontay, US
  Sensor, Schneider EBO, ACI, and IEC 60751 — see the data file
  header for per-type confidence and the page's "About these
  tables" card for the methodology. JCI 8.7K-shunt curve is the
  one type still nominal (no public R/T table).

### Simulators

Running models you can play with — no install, no sign-in. Each one
is paired with an Education explainer for the underlying concepts.

- **PID Tuning Helper** — step-response simulator with process-type
  presets and a parameter-style toggle (Niagara gain·reset·rate
  vs. EBO Ti·Td vs. Distech proportional-band conventions; the
  controller runs canonical units, the labels follow you). Bottom
  reference panel has a loop-speed table and a symptom → tuning-move
  cheat sheet. Cross-links to the PID Basics explainer.
- **Mock VFD Interface** — generic drive keypad to practice
  navigating a parameter tree without a live drive in front of you.
  13 parameters in 4 groups, fixed 20×4 mono LCD, linear-ramp motor
  model, LOCAL/REMOTE override. The run-source / speed-source
  pedagogy from the VFDs explainer in hand: a keypad RUN with the
  run-source set to TERMINALS sits there and does nothing.
- **Function-Block Editor** — graphical wiresheet sandbox: drag
  logic, math, timer, and PID blocks onto a sheet, wire them up,
  and watch a control sequence run live. Five worked examples
  built in (economizer-enable, freeze-stat lockout, dual-thermostat
  staging, heating PID, divide-by-zero edge case). Pairs with the
  Function-Block Basics explainer.

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
- **Pump Control** — how the BMS decides what speed reference to
  send to a variable-flow pump. Pump curves and the operating point
  (interactive chart), affinity laws, DP-based control with a remote
  sensor, and DP setpoint reset for the bottom of the cube-law
  savings. Two widgets, deadhead-anecdote reveal at zero demand.
  Closes out the variable-flow story with Load Piping and VFDs.
- **Hydronic Balancing** — getting design flow to every load on a
  loop. Calibrated balancing valves, automatic balancing valves,
  and pressure-independent control valves (PICVs) — what each one
  is, how it behaves, and when to reach for it. Interactive widget
  comparing all three branches under varying system Δp, with a
  burst-coil anecdote at the low-pressure extreme. Pays off forward
  links from Hydronic Loops, Load Piping, and Pump Control.

## How it's built

A multi-page static site under `html/` plus a small Cloudflare
Worker (only for `POST /api/contact`). The toolchain is deliberately
minimal: 11ty (Eleventy) templates the shared chrome — `<head>`,
nav, footer — out of every page; everything else is vanilla. No
client-side framework, no bundler, no JS transpiler. View-source of
the rendered page is still readable HTML, and browsers ten years
from now will still run it.

### Architecture

- **Source pages** under `html/` with YAML frontmatter, extending a
  shared Nunjucks layout (`html/_includes/layouts/page.njk`).
  Four-space indentation, anchor `href`s use explicit `.html`
  extensions. The shared partials (`head.njk`, `nav.njk`,
  `footer.njk`) supply the `<head>` block, the top nav, and the
  footer.
- **Build:** 11ty (`npm run build`) renders each page from its
  frontmatter + the layout, passes through `styles.css`, `scripts/`,
  `assets/`, `robots.txt`, and `sitemap.xml`, and writes to `_site/`.
  Build is fast (~0.3s for 30 pages); the only thing the build does
  is templating, no JS transpile or bundle. Cloudflare Workers Build
  runs `npm install && npm run build` on push to `main` and serves
  `_site/`.
- **Shared design system** — `html/styles.css`. Flat
  "workstation" aesthetic borrowing visual grammar from BAS UIs
  (Niagara-ish property-sheet rows, EBO-clean panels, slightly
  shaded panel headers, flat underlined tabs). On wide screens
  (≥1240px), the side gutters carry an as-built schematic
  collage — 3-way diverting valves, hydronic pump-coil loops,
  4-20mA current loops, comparator and AND-gate logic snippets, and
  JACE supervisor trunks — that draws itself in as it scrolls
  into view. Decorative, not navigational; hidden on smaller
  screens where load weight outranks decoration. Nav cards across
  Home / Tools / Simulators / Education share an instrument-frame
  shape (titlebar with a section prefix + status pill, body, and
  a bullet-separated semantic statusline) so the landings read as
  instrument racks. One design system, applied across every page;
  page-specific CSS stays inline via the layout's
  `{% block head %}`.
- **Shared scripts** in `html/scripts/` as *classic* scripts (not
  ES modules — there's no bundler doing module-graph work, and the
  shared helpers expose globals like `Units`, `simulatePid`, and
  `FlowEngine` that page IIFEs reach for by name). Most pages
  load them per-page with `<script src="/scripts/xxx.js"></script>`
  before the inline `<script>`; `flow-engine.js` and
  `schematic-bg.js` are loaded site-wide by the layout so the
  gutter art animates everywhere.
  - `pid-engine.js` — FOPDT process model + PID controller with
    conditional-integration anti-windup. Drives the PID Tuning
    Helper simulator and the three PID Basics mini-sims.
  - `fbe-engine.js` — function-block catalog + per-tick evaluator
    behind the Function-Block Editor simulator.
  - `flow-engine.js` — animation engine for SVG schematics with
    two modes: continuous particle flow on `data-flow` paths
    (hydronic supply / return), and discrete pulses on
    `data-pulse` paths (control wiring, logic-block signal
    chains, BACnet/IP comm traces). The function-block editor
    drives the discrete-pulse mode directly via
    `FlowEngine.pulse(el)` when a wire updates. Respects
    `prefers-reduced-motion`.
  - `schematic-bg.js` — scroll-driven reveal for the gutter
    schematic motifs; bootstraps `flow-engine.js` once on
    DOMContentLoaded.
  - `thermistor-data.js` — sensor R/T curves consumed by the
    Thermistor Lookup tool.
- **Worker** at `src/worker.js` — ES-module Worker. Validates
  the contact form, drops honeypot submissions silently, verifies
  Turnstile, and sends via Resend. Falls through to
  `env.ASSETS.fetch(request)` for everything else.
- **Hosting:** Cloudflare Workers. Auto-deploys on push to `main`
  via the GitHub integration (~60s); the dashboard runs the 11ty
  build before each deploy.
- **Config:** `wrangler.jsonc` — `name`, `main`,
  `assets.directory` (`./_site`), `assets.binding`,
  `assets.html_handling`, and `compatibility_date` are all
  load-bearing; touch carefully.

`CLAUDE.md` has the architecture documentation, conventions, and
gotchas. `site-ideas-and-friction.md` is the running log of ideas,
design decisions, and friction encountered while building.
`codebase-issues.md` tracks code-quality items that need a design
decision before they can be acted on.

## Local development

```sh
# install dev dependencies (11ty + Playwright + wrangler — the
# site itself ships zero runtime JS dependencies)
npm install

# live-reload dev server on http://localhost:8000
npm run dev

# or: one-shot build + plain static serve
npm run build
python3 -m http.server 8000 --directory _site

# smoke tests cover every page + a few behaviour spot-checks
npm test
```

Tests live under `tests/`: `smoke.spec.js` (every page returns
200, has the expected title and nav, no console errors, plus
behaviour spot-checks), `contact.spec.js` (the contact form),
and `psychro-engine.spec.js` (pure-Node engine math). Chromium
only. The Playwright config has a `webServer` block that builds
and serves `_site/`, so `npm test` is self-sufficient on a fresh
checkout — a running `npm run dev` on port 8000 is reused.

For UI changes, screenshot the page after editing rather than
guessing — `@playwright/test` re-exports `chromium` for one-shot
captures. For `contact.html` use `waitUntil: 'domcontentloaded'`
(Turnstile never goes idle).

## Contact

The site's [contact form](https://controlsfreak.dev/contact)
takes bug reports, tool requests, and corrections. GitHub Issues
is also fine for code-side questions.
