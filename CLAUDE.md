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
  `hydronic-loops.html`, `vfds.html`, `vfd-mock.html`,
  `pump-control.html`). `load-piping.html` is now style-block-empty
  after the `.edu-svg` consolidation; it links the shared sheet and
  carries no inline rules. Shared rules live in the file; page-only
  rules stay inline. Pipe-flow diagrams across Education pages share
  `.edu-svg` / `.edu-legend` (defined in `styles.css`); the VFDs
  block diagrams use a page-local `.vfd-svg` because they have no
  `data-flow`/dashed-return concept.
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
    `THERMISTOR_TYPES`). The R/T tables are *generated* from a small
    set of curve parameters (β, R25, shunt, R0, TCR), so auditing
    the parameters covers all 500+ cells. The parameters were
    verified in the 2026-05 pass against BAPI 10K-2 / 10K-3 /
    10K-3(11K) output tables, US Sensor "Curve G", Sontay's
    Compatibility Chart, Vector Controls' multi-curve reference,
    Schneider EBO's Balco chart, the ACI BALCO datasheet, and IEC
    60751:2008. The file header lists per-type confidence
    (HIGH / GOOD / PENDING). One type remains PENDING — the JCI
    10K + 8.7K-shunt curve — because the canonical Johnson Controls
    TE-6300 Product Bulletin URL redirects to a docs-portal landing
    page and no public R/T table is available for that
    configuration. The thermistor calculator page carries an "About
    these tables" tool-card surfacing the methodology and disclaimers
    to end users.
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
│   │   └── thermistor-data.js        # THERMISTOR_TYPES — curves verified 2026-05 (JCI 8.7K still PENDING)
│   ├── tools/
│   │   ├── index.html                # Tools landing — live grid + "Coming Soon"
│   │   ├── signal-scaling.html
│   │   ├── modbus-register-viewer.html
│   │   ├── pid-tuner.html            # loads /scripts/pid-engine.js; owns loop-speed reference table
│   │   ├── bacnet-ip-converter.html
│   │   ├── psychrometric-chart.html  # 3-col layout widened to 1280px; AHU process chain (OA+RA → MA → CC → HC → HUM → SA) with step pills + per-process segment colors
│   │   ├── thermistor-calculator.html # 3-col layout, loads /scripts/thermistor-data.js
│   │   └── vfd-mock.html             # 2-col simulator: keypad + 20×4 LCD + linear-ramp motor model; pairs with education/vfds.html
│   └── education/
│       ├── index.html                # Education landing
│       ├── pid-basics.html           # P/I/D explainer + three mini-sims (loads /scripts/pid-engine.js)
│       ├── hydronic-loops.html       # 2-pipe direct → reverse → twin-T, inline SVG schematics (.edu-svg)
│       ├── load-piping.html          # 2-way vs 3-way load valves, four SVG diagrams (.edu-svg); pays off the twin-T #d3 forward callout
│       ├── vfds.html                 # block diagram + cube law + run/speed widget + parameter groups + bypass; pairs with tools/vfd-mock.html
│       └── pump-control.html         # pump curves + operating point + DP control + DP setpoint reset; two widgets (operating-point chart, DP-reset sim); pairs with vfds.html and load-piping.html
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
  layout (Inputs / Chart / Stages + State Point) with a **custom 26%/1fr/26%
  split and page widened to 1280px inline** — a draggable canvas plus a
  per-stage results table needs the room. Phase 2 (v1.3, 2026-05) turned
  the single-point tool into a full AHU process chain: fixed canonical
  sequence `OA + RA → MA → CC → HC → HUM → SA` with per-stage off-toggles
  on CC / HC / HUM. Inputs column carries a row of **step pills** (mono
  font, dim when their stage is off, accent when selected) that swaps the
  editor below; one editor visible at a time. Per-stage editors use
  **hybrid inputs** matching how a tech thinks about each:
  OA/RA = DB + "define by" {RH, WB, DP, W, h} (same as phase 1);
  MA = single `% OA` field with live MA-state readouts; CC = leaving DB +
  "define by"; HC = `Leaving DB ↔ ΔT rise` toggle + value;
  HUM = leaving RH % (adiabatic only, constant WB). Global inputs at top
  of the Inputs column: Altitude (ft) and **optional AHU CFM** — when set,
  the per-stage table grows a Q (MBH) column and the process-delta block
  adds Q total / Q sens / Q lat per coil. **Chart** draws process
  segments between active stages, color-coded: mixing in `--text-dim`
  gray, cooling/dehum in `--blue`, heating in `--heat` (new orange added
  to `:root` for this build), adiabatic humidification in `--accent`
  green dashed. **Source nodes (OA, RA) carry an outer drag-affordance
  ring**; drag scope is OA + RA only, everything downstream computed.
  **Node labels** — OA, RA always; SA always (folded into the coincident
  upstream node's label as `X / SA` when SA = last upstream); intermediate
  labels only when the pill is selected. **Right column** is a compact
  per-stage results table (`.ref-table-dense psy-stage-tbl`, page-local
  tightening) above the v1 nine-property detail block, plus a
  conditional process-delta block (ΔDB / ΔW / Δh / SHR for cooling /
  Q values if CFM). The detail-block label reads
  `CC — bypassed (pass-through)` when a selected coil/humidifier is off,
  so the displayed values aren't misleading. Defaults open in summer
  cooling (OA 92/76 WB, RA 75/63 WB, 20% OA, CC on at 55/54, HC + HUM
  off) so visitors see a colored process train on first paint. ASHRAE
  IP-unit psychrometrics + chain solver + chart drawing + drag handling
  all live inline in the page's `<script>` — extract to `html/scripts/`
  only if a second tool needs them. For building feel, not calibrated
  load studies. (Floating state-point chip is the deferred "phase 3" —
  see `site-ideas-and-friction.md`.)
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
  mode only; identify-mode is a future build (friction file). Curve
  parameters verified 2026-05 against BAPI / US Sensor / Sontay /
  Vector / Schneider EBO / ACI / IEC 60751 — see the data file header
  for per-type confidence. **An "About these tables" tool-card below
  the calculator surfaces the methodology and disclaimers to end
  users** (uses page-local `.about-tables p` rules to restore
  paragraph spacing past the global `* { margin: 0 }` reset).
- **Mock VFD Interface** (`vfd-mock.html`, "Drives") — 2-col layout
  (keypad + LCD on the left, motor response + external inputs on the
  right; stacks on mobile). 13 parameters in 4 groups; 7-key keypad
  (▲/▼/ENT/ESC/RUN/STOP/L-R); fixed 20×4 mono LCD on a light recessed
  panel (drive-style brevity via the grid constraint, on-brand palette).
  Linear-ramp motor model uses R01/R02; LOCAL is the universal override
  (drops both run latches when toggled); keypad STOP can't reach a
  hardwired DI (teaching point); RUN/STOP/L-R always return to HOME so
  flash messages land on line 4 where the user expects feedback.
  Parameter reference table at the bottom is live (the keypad edits it
  in place). Custom layout (not `.tool-body-3col`), same precedent as
  the PID tuner. Inline JS state machine; CSS prefix `vfdm-`. Paired
  with `education/vfds.html`'s run/speed widget — same source-parameter
  pedagogy, here with a parameter tree to navigate.

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
  page" for the rule. **Forward-link convention:** anchor only if
  the target page exists today (e.g. `vfds.html` is linked from
  `load-piping.html` because it shipped); if the target is still a
  future page, write it as plain prose so a visitor doesn't click
  into a 404. Either way, the friction file tracks the topic as
  `[future: <page>]` so the breadcrumb survives. **Diverting-valve tee gotcha** (recorded in
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
- **Pump Control** (`pump-control.html`) — completes the variable-flow
  trio (load piping → VFDs → pump control). One question: how does
  the BMS decide what speed reference to send? Seven sections:
  *constant-speed pumps* (the foil), *pump curve and system curve*
  (operating-point Widget 1: SVG chart with two sliders for pump
  speed + valve openness, fan icon), *how a VFD moves the operating
  point* (affinity laws, cube-law cross-link to vfds), *DP-based
  control* (local vs. remote DP sensor, pipe-flow diagram with
  pump+VFD on the left, three two-way loads, remote ΔP sensor at the
  far end), *DP setpoint reset* (Widget 2: mode toggle Fixed/Reset,
  demand slider, five valve cells, readouts; deadhead anecdote
  reveals at demand=0%), *lead/lag — a note* (deliberately shallow,
  forward-points to `[future: sequencing.html]`), *tying it
  together* (closing payoff to load-piping + vfds). Inline JS, CSS
  prefix `pc-w-`. The Widget 1 chart is SVG (small chart, short
  polylines layer cleanly with static axes); the Widget 2 valve
  cells are HTML/CSS not SVG. Pipe-flow diagram in Section 5 uses
  `.edu-svg` from day one — this is the page that triggered the
  `.hd-svg` / `.lp-svg` → `.edu-svg` consolidation in `styles.css`.

- **VFDs** (`vfds.html`) — variable-frequency drives explainer paired
  with `tools/vfd-mock.html`. One question: *what is a VFD, and what
  does a controls tech need to know about it?* Seven sections, gentle
  ramp into practitioner depth: *What a VFD is* (static block diagram,
  labeled boxes only); *Why drives are everywhere* (cube-law prose +
  `.pid-term`-style numbers callout); *Run command vs. speed reference*
  (the centerpiece — a 3×3 source/command-surface widget with a
  spinning-fan visual indicator next to the status panel, rotation
  rate proportional to the active speed reference, and a hidden
  anecdote reveal on the "classic mistake" configuration —
  run=TERMINALS + speed=NETWORK + Send BACnet RUN); *Parameter groups*
  (six `.pid-term` cards: motor data, ramps, references/sources,
  run/stop sources, I/O, faults); *Network integration* (small
  `.ref-table` for Modbus RTU / BACnet MS/TP / BACnet/IP, inline
  cross-links to the BACnet/IP converter and Modbus register viewer);
  *Fault codes* (small `.ref-table` of six categories); *Bypass
  arrangements* (short prose + small static SVG of the 3-position
  selector topology). Opens with a hook to load-piping (variable-flow
  pump side); closes paying it off and forward-linking to
  `/tools/vfd-mock.html` and `[future: pump-control.html]`. Diagrams
  use an inline `.vfd-svg` class — the `.edu-svg` consolidation
  trigger from the load-piping friction entry was deferred because
  the block diagram is structurally different from pipe-flow diagrams
  (no `data-flow`, no dashed-return override); trigger now belongs to
  the next pipe-flow Education page.

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
  diagrams; also "cooling / dehumidification" on the psych chart's
  process segments), `--blue-cool` (`#5e8aa0`, muted; "return water",
  paired with dashed line so it reads without color). `--red`
  (fault/alarm). `--heat` (`#c8782a`, warm orange — "heating" on the
  psych chart's process segments; companion to `--blue` for cooling.
  Added 2026-05 for the AHU process-chain build). Fonts: `--mono`
  (IBM Plex Mono), `--sans` (Overpass). The canvas chart reads colors
  via `getComputedStyle` at draw time.
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
  `.edu-svg` / `.edu-legend` (shared pipe-flow diagram styling for
  Education pages — supply solid + `--blue`, return dashed +
  `--blue-cool`; carries the `flow-active` `[data-flow="return"]`
  override that drops the dashes while particles are running);
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
  column split, page-widened, plus page-local **step-pills** that pick
  the focused AHU stage and per-stage editors that swap underneath),
  Thermistor (custom column split). PID tuner keeps its own custom
  stacked layout (uses `.ps-section-label` standalone for its bottom
  Reference region). A tool with no useful
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
on `tools/index.html` (Temperature Conversion, VAV Balancing, BACnet
Object Reference, Modbus Function Codes, Duct Pressure Calculator).
Other near-term work — thermistor *identify mode*, psych chart
*floating state-point chip* (deferred phase 3 after the AHU process
chain shipped in v1.3), more Education pages — lives in
`site-ideas-and-friction.md`.

Longer-term: possibly a static site generator (Hugo or 11ty) once the
site outgrows hand-written pages. The duplicated inline `<style>` that
used to motivate this is gone; the next thing pushing that way is the
nav/header markup copied across every page — appropriate when the page
count reaches ~15–20. Keep markup patterns consistent so migration
stays clean.
