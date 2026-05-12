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
    `html/tools/pid-tuner.html`, `html/tools/bacnet-ip-converter.html`,
    `html/tools/psychrometric-chart.html` — one page per tool, each a
    `.tool-card` with its own inline `<script>` for page-specific logic.
  - `html/education/pid-basics.html` — the Education section's first page:
    the plain-English P/I/D explainer + three working one-knob mini-sims
    (P only → P+I → P+I+D), each an inline simulator built on
    `/scripts/pid-engine.js` (see "What's on the site today"). It loads
    `pid-engine.js` like the PID tuner does — a `<script src>` before its
    own inline `<script>`.
  - `html/contact.html` — the contact form.
  - `html/styles.css` — **the shared design system** (all the `:root`
    custom properties and component classes). Every page links it with
    `<link rel="stylesheet" href="/styles.css">`. Page-specific CSS stays
    inline on the page that needs it — currently only `contact.html`,
    which keeps a tiny inline `<style>` for `.hp-field` / `.contact-intro` /
    `#contact-result-value`.
  - `html/scripts/pid-engine.js` — **the shared PID simulation core** (the
    first-order-plus-dead-time process model + discrete-time stepping +
    derived metrics; exposes `PID_PROC` and `simulatePid()`). The
    controller has conditional-integration anti-windup — it stops winding
    the integrator at a rail it's only pushing further into *and* while
    derivative action is braking hard toward setpoint (otherwise adding D
    would just wind the integral up to "cover" the brake, *adding*
    overshoot instead of damping it; with the default Td = 0 that second
    clause never fires). It's a *classic* script, not an ES module, so its
    globals are visible to the inline `on*` handlers and the page's own
    `<script>`; load it with `<script src="/scripts/pid-engine.js"></script>`
    *before* the page's inline script. **Two pages use it:**
    `tools/pid-tuner.html` (the full power-user UI) and
    `education/pid-basics.html` (three stripped-down one-knob mini-sims) —
    same engine, different UI surfaces.

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
│   │   ├── pid-tuner.html          # also loads /scripts/pid-engine.js; loop-speed reference table lives here
│   │   ├── bacnet-ip-converter.html
│   │   └── psychrometric-chart.html   # interactive psych chart — three-column layout, psychrometrics inline
│   └── education/
│       └── pid-basics.html         # Education section — P/I/D explainer + three working PID mini-sims (also loads /scripts/pid-engine.js)
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
  — three tabs, on the three-column property-sheet layout:
  - *Signal → Eng. Units* — mA/V signal to engineering units; Input column
    (signal type, value, eng. range), Output column (eng. value, % of span,
    range bar, "Copy value" button, worked formula — kept *inside* the
    column rather than as a full-width footer so the column isn't dwarfed
    by the reference one), Reference column (a common-signal-types lookup
    with a "live zero" column + a one-line note)
  - *Eng. Units → Signal* — the inverse; same shape — Output also shows
    "% of span" and a "Copy signal" button, same reference table
  - *2-Point → Slope / Offset* — two known IO pairs to `y = mx + b`, with
    copy buttons (aimed at pasting into Niagara's ProxyExt). Two-column
    (Input | Output spanning the right two-thirds, via `grid-column: span 2`
    on the Output section) — the worked formula has nowhere useful to grow,
    so there's no reference column on this tab; the formula is a full-width
    footer here.
- **Modbus Register Viewer** (`tools/modbus-register-viewer.html`, "Modbus")
  — on the three-column property-sheet layout: Input column (decimal / hex
  inputs + the 16-bit clickable toggle grid, laid out 8×2 so it stays
  legible in a third-width column), Output column (dec / hex / binary
  readouts as `.ps-row`s), Reference column (a Modbus function-code
  lookup, FC01–16, with the read-only vs read/write note)
- **PID Tuning Helper** (`tools/pid-tuner.html`, "Loops") — a step-response
  simulator (process-type `<select>`, a parameter-style `<select>` that
  relabels the controls — gain·reset·rate / Ti·Td in minutes or seconds /
  proportional band — preset-tuning chips, three `<input type=range>`
  sliders with Ti / Td / PB equivalents shown beneath each, a `<canvas>`
  plot of PV vs. setpoint, and overshoot / settling-time /
  steady-state-error readouts), then a **Reference** region near the
  bottom: a *Loop Speed Reference* `.ps-section-label` + the fast/medium/slow
  `.ref-table` (time constants, dead times, HVAC examples + the dead-time÷τ
  note — this table moved here from the Education page, since it's
  operational reference, not conceptual material) and a tightened
  *Symptom → Tuning Move* `.subhead` + `.ref-table-dense` (short arrow
  codes — ↑/↓, P/I/D — not prose). Plus a short "New to PID? Start with the
  basics →" cross-link to the Education page (where the long-form explainer
  and the three mini-sims live) and a vendor-style "rule of thumb" note
  describing how the Parameter Style selector maps to Niagara / EBO /
  Distech conventions. **This tool deliberately keeps its custom stacked
  layout** rather than the three-column property-sheet pattern — the
  simulator block doesn't fit Input / Output / Reference without forcing
  it; only the cheat sheet adopts the `.ref-table-dense` styling (partial
  adoption). The simulation core lives in `/scripts/pid-engine.js`
  (`PID_PROC`, `simulatePid()`); this page owns the sliders, preset chips,
  label/unit relabeling, and the canvas drawing — everything UI. The
  controller runs on canonical params (gain, repeats/min, minutes); the
  parameter-style selector only changes labels/units. The simulated process
  is a toy first-order-plus-dead-time model — it exists for intuition, not
  for tuning a real loop.
- **BACnet/IP Hex Converter** (`tools/bacnet-ip-converter.html`, "BACnet")
  — two tabs, on the three-column property-sheet layout: *Hex → IP* (paste
  the hex address string EBO shows for a BACnet/IP device — tolerant of
  spaces/dots/dashes/`0x` — get dotted-decimal IP and, for a 12-digit
  string, the UDP port, with the default `BAC0`/47808 flagged) and
  *IP → Hex* (the inverse; blank port → 8-digit string, port given →
  12-digit). Copy buttons on the outputs. The right (Reference) column
  holds a placeholder UDP-port lookup — the BBMD / port-reference content
  is flagged `// user to verify` pending refinement. This was the first
  tool migrated to the property-sheet pattern; the conversion logic is
  unchanged from the pre-redesign tool, only the markup it drives moved.
- **Psychrometric Chart** (`tools/psychrometric-chart.html`, "HVAC") — an
  interactive psych chart on a `<canvas>`: saturation curve, constant-RH
  curves, constant-wet-bulb/enthalpy lines, a draggable state point with
  crosshairs. Set the point by dragging on the chart, or by typing a
  dry-bulb plus one of {RH, wet-bulb, dew point, humidity ratio, enthalpy}
  (the "define by" selector relabels the second input). Altitude-adjustable
  (alters the barometric pressure → reshapes the chart). **Uses the
  three-column property-sheet layout** (joining the BACnet converter,
  Signal Scaling, and Modbus Register Viewer as adopters — the PID tuner
  still keeps its own custom layout): a left **Inputs** column (`.ps-row`s
  for altitude / dry-bulb / "define by" / its value), a wide **Chart**
  centre column (the canvas + the curve-legend caption), and a right
  **State Point** column — all nine readouts (dry-bulb, wet-bulb, dew
  point, RH, humidity ratio gr/lb, enthalpy, specific volume, vapor
  pressure, barometric pressure) as a `.ps-row` stack with `.ps-value.live`
  values, so the whole state stays visible while you drag. Because the
  canvas wants more room than the standard 880px allows, the page carries a
  small inline `<style>` widening `main`/`footer` to 1280px and giving
  `.tool-body-3col` a custom 25%/1fr/25% split (collapsing to one stack at
  ≤900px); the `.ps-*` classes themselves are the shared design system. A
  full-width caveat paragraph below the columns holds the longer ASHRAE /
  "per pound of dry air" note. The psychrometrics (ASHRAE IP-unit
  formulations: saturation pressure, humidity-ratio conversions, a
  bisection for wet-bulb and dew point, enthalpy, specific volume,
  altitude→pressure) plus the chart drawing and the drag handling all live
  inline in the page's `<script>` — it's a self-contained, reusable chunk;
  extract it to `html/scripts/` if a second tool ever needs it. For
  building feel / quick state-point checks, not a calibrated load-study
  tool. (Step 2 from `site-ideas-and-friction.md` — drawing process lines /
  mixing between two points — is a future build.)

**Education — PID Basics** (`education/pid-basics.html`) — two stacked
sections under section headers: *What P, I, and D Actually Do* (the
long-form explainer, three `.pid-term` cards each with a worked HVAC
example) and *See Each Term in Action* — **three working mini-sims**, one
per `.tool-card` (tags "Sim 1 / Sim 2 / Sim 3", not category tags),
cumulative: **Sim 1 (P only)** exposes a gain slider, shows the
steady-state offset that never closes; **Sim 2 (P + I)** fixes P at Sim 1's
default and exposes a reset (rep/min) slider, shows the offset closing but
overshoot appearing if you push it; **Sim 3 (P + I + D)** fixes the
aggressive P + I from Sim 2 and exposes a rate (Td, min) slider, shows
derivative crushing the overshoot (then over-damping if you overdo it) —
and its rate slider's `max` re-ranges per loop speed (≈0.15 / 0.5 / 2 min
for fast / medium / slow), keeping the thumb's *position* on a chip switch,
because useful derivative time scales with the process time constant (a
30 s rate that's plenty on a 45 s loop is a rounding error on a 4 min one;
Sims 1 & 2 need no such re-ranging — gain and reset have the same useful
range across speeds). Each is its own stripped-down surface over
`/scripts/pid-engine.js` — a caption, three Fast / Medium / Slow
process-speed chips (default Medium), one `<input type=range>` slider, a
half-height `<canvas>` PV-vs-setpoint plot (≈160px vs the tuner's 260px),
and one or two `.ps-row` + `.ps-value.live` metric callouts; everything
auto-reruns on change, no Run button. The
inline `<script>` (loaded after `pid-engine.js`) is the same shape as the
tuner's — slider/chip/canvas glue, much smaller. A `.cta-button` ("Try it
for yourself →") links to the PID Tuning Helper at the bottom. The
fast/medium/slow loop-speed reference table that used to be a third section
here moved to the PID tuner (operational reference belongs with the tool).
The Education section has just this one page for now; there's no
`education/index.html` landing yet.

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

- **Page layout** is a flex column on `body` (`display:flex;
  flex-direction:column; min-height:100vh`) with `main { flex: 1 }`, so
  the footer hugs the viewport bottom on short pages instead of leaving
  a dead gap. Children that need to be horizontally centered at a
  `max-width` (`main`, `.hero`, `footer`) carry `width: 100%` alongside
  `margin: 0 auto` — without that, `margin: 0 auto` on a flex child
  would shrink-to-fit instead of centering, and `justify-content:
  space-between` on `footer` would collapse to a single clump.

- **CSS custom properties** in `:root` (the theme lives here — change
  colors by editing these, not by hardcoding): `--bg` (light gray-green
  app chrome) / `--surface` (white panes) / `--surface-2` (panel headers,
  table heads, insets) / `--surface-3` (recessed background for reference /
  context panels — a notch below `--bg`; e.g. the BACnet converter's
  reference column); `--border` (hairlines — panel & section edges) /
  `--border-faint` (lighter hairline for inner row dividers — property-sheet
  rows, dense tables); `--accent` (`#43881c`,
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
  `.tool-card-title` / `.tool-tag` (+ `.pending` — a muted gray variant
  for "Coming soon" placeholder cards; currently unused since the
  Education mini-sims became real, kept for future placeholders) /
  `.tool-body`; `.tabs` / `.tab-btn` / `.tab-pane`; `.form-row`
  (+ `.three`) / `.field` / `label`; `.result-panel` / `.result-label` /
  `.result-value` (+ `.error` / `.muted` / `.warn`); `.result-formula`;
  `.range-bar-wrap` / `.range-bar` / `.range-bar-fill`; `.copy-btn`
  (+ `.copied` / `.active`); `.section-header` / `.section-label` /
  `.section-line`; `.subhead` (a section divider inside a `.tool-body`);
  `.bit-readouts` / `.readout` / `.readout-label` / `.readout-value`
  (also reused for the PID metrics row); `.ref-table` (reference
  tables); `.pid-terms` / `.pid-term`; `.btn-row`, `.slider-field` /
  `.slider-head` / `.slider-val`, `input[type=range]`, `.sim-canvas-wrap`
  / `.sim-legend` (the PID simulator); `.tool-grid` / `.tool-preview`
  (the dimmed "Coming Soon" cards on the Tools landing); `.card-grid`
  (+ `.two`) / `.nav-card` / `.nav-card-tag` / `.nav-card-name` /
  `.nav-card-desc` (the clickable landing tiles on the home page and
  Tools landing); `.back-link` (the "← All tools" anchor under a tool's
  `.tool-card`); `.cta-button` (a prominent in-page anchor styled like a
  primary button — used for "Try it for yourself →" and other
  end-of-page calls to action); `.tool-body-3col` / `.ps-section-label` / `.ps-row` / `.ps-label` /
  `.ps-value` (+ `.live` — a blue live readout value; + `.muted` — a note
  or an absent value; + `.error` — out-of-range, red) / `input.ps-input`
  (also `select.ps-input` / `textarea.ps-input`) / `.ref-table-dense` /
  `.ref-note` / `.tabs.tabs-flush` (the three-column property-sheet layout — see the
  bullet below); `.hero` / `.hero-eyebrow` /
  `.hero-badges` / `.badge` (the home hero). Shared across pages:
  `.site-nav` / `.site-nav-brand` / `.site-nav-links` (the top nav).
  Contact page only: `.hp-field` (off-screen honeypot wrapper),
  `.contact-intro` (these stay in `contact.html`'s inline `<style>`, not
  `styles.css`); `textarea` and `input[type=email]` are styled by the
  same rule as the other form inputs (so a `textarea` gets the standard
  input look, `--bg` background and all — not `--surface`).

- **Three-column property-sheet layout** (`.tool-body-3col` + the `.ps-*`
  classes + `.ref-table-dense`): a denser "workstation tool" layout —
  Input / Output / Reference as three surfaces side by side, Niagara-style
  label-left / value-right rows with hairline dividers, a recessed
  reference panel (`--surface-3`) *alongside* the active tool, dense
  lookup tables. The `.tool-body-3col` grid sits directly inside a
  `.tab-pane` (or `.tool-card`), not inside a padded `.tool-body`; tabs
  above it take `.tabs.tabs-flush`. A row's value cell can hold a `.ps-value`
  (mono) — plus `.live` (blue, a live readout), `.muted` (a note / absent
  value), or `.error` (out-of-range, red) — or an `input.ps-input` /
  `select.ps-input` / `textarea.ps-input` (the dense form-control variant).
  **Adopters: the BACnet/IP converter, Signal Scaling, Modbus Register
  Viewer, and the Psychrometric Chart** — the psych chart with a custom
  25%/1fr/25% column split and a page-widened `main` (a draggable chart
  needs the room; see its tool entry above), and with Inputs / Chart /
  State Point sections rather than Input / Output / Reference, but it's the
  same `.tool-body-3col` + `.ps-*` + `.ref-note` vocabulary. The PID tuner
  deliberately keeps its own custom stacked layout — a simulator block
  (sliders, parameter-style selector, preset chips, metrics) doesn't fit
  Input/Output/Reference — and uses `.ps-section-label` standalone for its
  bottom "Reference" region (the loop-speed table + the `.ref-table-dense`
  cheat sheet). A tool with no genuinely useful
  reference content drops the third column and runs two (e.g. Signal
  Scaling's slope/offset tab — Output spans the right two-thirds via
  `grid-column: span 2`). This pattern serves the "Visual design — two
  products, one codebase" framework — see `site-ideas-and-friction.md` for
  the philosophy. Naming gotchas: the redesign mockup called
  `.ps-section-label` just `.section-label` (renamed — `.section-label` is
  already the page-level divider label in `.section-header`), and called
  the live-value modifier `.readout` (renamed to `.live` — `.readout` is
  already the bit-viewer / PID-metrics box class, which a `.ps-value.readout`
  element would otherwise inherit). The form-control variant is qualified
  by element (`input.ps-input` etc., not bare `.ps-input`) so it outranks
  the global `input[type=…]` / `select` block. Responsive: at ≤900px the
  columns collapse to a single stack (Input → Output → Reference);
  purpose-built mobile experiences for these tools are a future task.

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
   an `<a class="back-link" href="/tools/">← All tools</a>`, the shared
   `<footer>`, then an inline `<script>` for the page-specific logic
   (and, if the tool needs the PID simulator,
   `<script src="/scripts/pid-engine.js"></script>` *before* that).
   Anchor `href`s get explicit `.html` extensions (see the Stack note).
2. Follow the validate-and-mute pattern in the JS.
3. Add a `.nav-card` for the new page to the `.card-grid` on
   `tools/index.html`.
4. If it graduates a Coming-Soon item, delete the matching
   `.tool-preview` card from the "Coming Soon" `.tool-grid` on
   `tools/index.html`.
5. Bump the version string in the footer (currently `v0.7 · 2026`,
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

Other near-term work, tracked in `site-ideas-and-friction.md`: the
thermistor calculator, process lines / mixing on the psychrometric chart
(its "step 2"), and more Education pages. ✅ *Done:* the three cumulative
PID mini-sims on `education/pid-basics.html` (P only → P+I → P+I+D, each a
stripped-down UI over `/scripts/pid-engine.js`); the PID long-form
explainer moved onto that page earlier, and the fast/medium/slow loop-speed
reference table now lives on the PID tuner (operational reference belongs
with the tool).

The contact / bug-report path is live at `/contact`, and the About card
on the home page links to it.

Longer-term: possibly a static site generator (Hugo or 11ty are the
leading candidates) once the site outgrows hand-written pages. The
duplicated inline `<style>` that used to motivate this is gone (now
`html/styles.css`); the next thing pushing that way would be the
nav/header markup copied across every page — appropriate when the page
count reaches ~15–20. Keep markup patterns consistent so migration stays
clean.
