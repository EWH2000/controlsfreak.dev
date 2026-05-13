# controlsfreak.dev — Ideas & Friction

Running list of feature ideas and things that annoy me about the site
as I use it. Drop notes here as they come up; flesh out later. Items
graduate from here into `#roadmap` in `index.html`, then into actual
tools.

---

## Feature ideas

### PID tuner — explicit loop speed numbers
The current "fast loop / slow loop" framing is vague for users who
don't already have intuition for what those mean in real units. Add
concrete numbers — e.g. process time constant in seconds, loop period,
or a small reference ("fast ≈ X s, medium ≈ Y s, slow ≈ Z s, typical
HVAC examples for each"). Goal is to help someone who's never tuned a
loop calibrate what they're looking at before they touch a slider.

### BACnet/IP hex ↔ dotted-decimal converter
EBO displays BACnet/IP device addresses in hex (e.g. `C0A80164`) instead
of the IPv4 form (`192.168.1.100`). Currently a hex-to-IP converter is
needed every time. Build a small tool that converts both directions —
paste hex, get dotted decimal, and vice versa. Probably worth also
showing the UDP port (BACnet/IP appends a 2-byte port after the address,
default `BAC0` = 47808), since EBO's hex string often includes it.
Likely fits in the same "Networking" or "BACnet" category as the future
BACnet object reference tool.

### Thermistor calculator
Two related modes (probably tabs, à la Signal Scaling):

- **Lookup mode (must-have).** Pick a thermistor type, enter either
  temp or resistance, get the other. Common types to support: 10K
  Type II, 10K Type III, 10K Type 8.7K (Johnson), 10K Type 5 with
  11K shunt (Schneider/EBO convention — Type 3 linearized with a
  shunt resistor, common in older TAC/Andover gear), 20K, 3K, 1K
  Balco (nickel-iron alloy, RTD-style — still appears in retrofits
  on older Honeywell/Johnson jobs), plus Pt100 / Pt1000 RTDs (not
  strictly thermistors but used the same way on the troubleshooting
  side, so worth including with a label noting they're RTDs).
  Probably also show the full R/T table for the selected type
  alongside the single answer — techs often want to scan the curve,
  not just one value.
- **Identify mode (more ambitious).** User enters 2+ (temp, resistance)
  pairs from an unknown sensor and the tool reports which standard
  type best fits, with a confidence indicator. Useful when there's an
  unlabeled sensor in the field. Needs a clear accuracy disclaimer —
  sensor tolerance, measurement noise, and the fact that 2 points
  often can't distinguish between similar curves all matter. More
  points = better answer; maybe require 3 minimum and surface
  per-point residuals so the user can see how clean the fit is.

Implementation question for later: lookup tables vs. Steinhart-Hart
coefficients. Tables are bulletproof and match what's in
manufacturer datasheets; coefficients are more compact and let you
interpolate smoothly. Probably tables for the common types
(copy-paste from datasheets, verified) — that's the "no surprises"
answer for a tool people use on job sites.

### Interactive psychrometric chart *(initial build shipped)*
The state-point calculator + draggable dot shipped (v0.6, US units,
altitude-adjustable, full ASHRAE formulations). What's still pending:

**Process lines.** The original idea was a two-stage build — state
point first, then processes on top. Stage two: draw mixing lines
between two points, show sensible/latent heating and cooling paths,
humidification and dehumidification. The "drag a state point" surface
becomes a "pick two state points and a process type" surface for this.
Worth keeping as the next-major-feature for this tool; the pattern's
already partly there from the existing state-point interaction.

**Floating state-point chip.** A small tooltip-style readout that
follows the dot as it drags, showing maybe 2–3 key values (DB, WB, RH)
next to the cursor. The full property table on the right still owns
the complete state. Direct-manipulation feedback pattern — the most
important values appear on the object the user is manipulating.

  Deferred until after process lines ship, because a fully opaque
  chip would cover the process lines underneath as the user drags.
  When we build it, lower the chip's background opacity (~70–80%)
  so the underlying chart and process lines remain visible. May
  also want to position the chip with an offset from the cursor
  (e.g. 12–15px up-and-right of the dot) so the dot itself isn't
  obscured.

Implementation note from the initial build: canvas was the right call
(matches the PID plot's approach). Drag handling on canvas works
cleanly; the chip would be a straightforward HTML element positioned
absolutely over the canvas, updated on each drag event.

### Controller commissioner *(larger build — may span multiple sessions)*
A point-by-point commissioning workbench. User defines the controller's
IO list (AI / AO / BI / BO, with name, type, range/units, expected
behavior), then walks through each point on a job site, marking it
commissioned, adding observed values + notes, and flagging anomalies.

Open design questions to think about:
- **Persistence:** localStorage at minimum (so a job survives a tab
  reload). Multiple jobs at once? Probably yes — needs a job
  picker / list.
- **Sanity checks:** auto-warn on obvious issues — AI reading outside
  range, AO commanded but no feedback movement, BI stuck, units that
  don't match the configured type, etc. Keep the rules conservative;
  false positives kill trust fast.
- **Input shape:** type-in is fine for v1, but eventually a CSV / point-
  list paste would be huge (most controllers have an exportable point
  list from the tool — Niagara, EBO, etc.).
- **Export pipeline (the interesting part):** CSV for sure. PDF
  commissioning report is the dream — date, tech, controller ID, every
  point with status + notes + anomalies. Worth investigating: can it be
  done client-side with something like jsPDF, or does it need the
  Worker? Keeping it client-side preserves "no login, no backend" — feels
  right for the site.
- **Scope creep risk:** this could turn into a full CMMS-lite. Resist.
  Goal is "better than a clipboard," not "replace Niagara."

This is the first tool on the site that's stateful + persistent. Worth
thinking about whether that pattern should generalize (e.g. PID tuner
saves last sliders, Modbus viewer remembers last register) before
hardcoding localStorage just for this one tool.

### System animations for Education *(in progress — hydronic loops first)*

The Education explainer pages land harder if the schematics move — flow
pulsing around a loop, the injection pump speeding up and the supply
temperature creeping up. The framing that anchors this work: a tech on
a roof on limited cell service should still get full value from the
page. That sets the bar — static SVG carries the full meaning, motion
is additive only, page renders usefully on a phone with two bars.

**Per-diagram scope on `education/hydronic-loops.html`:**
- *2-Pipe Direct Return* — illustrative ambient motion. Same flow
  indicators on every load branch, near branch visibly faster than far
  branch, so "self-unbalancing" is something you can see.
- *Reverse Return* — illustrative ambient motion. Return-main flow
  direction matches supply (the contrast with Direct is the point),
  load-branch speeds roughly equal.
- *Twin-T Primary-Secondary* — graduates to a small **interactive
  widget**: slider on injection-pump speed, system supply temperature
  shifts color in response, worked-example flow numbers update live.
  Same precedent as the PID mini-sims — interactive doesn't only live
  in Tools, it lives wherever it teaches. See "Where interactive
  widgets live" below.

**Progressive-enhancement baseline.** The static inline SVGs are
deliberately the baseline this layers onto: every equipment element is
a named `<g>` (`#d3-boiler`, `#d3-injection-pump`, `#d3-load-A`, …),
every pipe run is a named `<path>` / `<line>` (`#d3-inject-pipe`,
`#d3-system-return`, …), labels are real `<text>`, and flow arrows are
grouped (`#d3-flow-arrows`). The animated version is *additive* — CSS
keyframes (`stroke-dashoffset` on pipes for "moving water",
opacity/transform on arrows) keyed off those ids, plus a small
`<script>` for the Twin-T widget's slider — not a rewrite. Anything
new under `education/` keeps that habit: clean named groups, semantic
ids, equipment as separately-targetable elements.

**Animation policy.**
- No JS framework or animation lib (Mermaid, D3, GSAP, Lottie) —
  hand-written, same "no build step" property as everything else.
- CSS keyframes on SVG elements where possible; vanilla JS only when
  interactivity requires it (the Twin-T widget).
- Ambient continuous motion (slow flow indication, on the order of one
  cycle per few seconds, peripheral) is in-bounds — matches what a live
  BAS graphic does. The test is "would this distract a tech reading on
  bad cell." If yes, don't.
- Demanding-attention motion is out: full-screen takeovers, video-style
  flourishes, bouncy easing. That's the spirit of "no autoplay."
- Honor `prefers-reduced-motion: reduce` — the static SVG is already
  the correct reduced-motion state.
- The page must still teach with the animation off and on any device.

---

## Site structure / organization
### Where interactive widgets live

Tools = calculators, converters, lookups. Pull-it-up-and-use-it
utilities. Standalone, get a Tools-landing card, show up in "Coming
Soon" while pending.

Education = prose + diagrams + sometimes interactive widgets that exist
to teach a specific concept. The PID mini-sims (P only → P+I → P+I+D)
and the Twin-T injection-pump widget on Hydronic Loops are on Education
pages on purpose — the widget *is part of the explanation*, not a
standalone tool, and it gets read in sequence with the prose around it.

The rule: standalone "open it and use it" cases go to Tools. Teaching
widgets stay in Education and don't get a Tools-landing card. If a
piece of interactive content is useful both ways, the simulator goes
to Tools and a stripped-down teaching version goes to Education (the
PID tuner is the worked example of this split).

### Split into "Tools" and "Education" sections
When breaking the single page into multiple pages, organize the site
into two top-level categories rather than one flat tool list:

- **Tools** — the calculators / converters / viewers (Signal Scaling,
  Modbus Register Viewer, BACnet/IP converter, etc.). Job-site
  utilities.
- **Education** — explainer content for newer techs. Could host things
  like the P/I/D plain-English explainer (currently buried inside the
  PID tuner), BACnet basics, Modbus basics, controls vocabulary, common
  sequence-of-operations patterns, etc. Teaching new guys is one of the
  best parts of the job — having a dedicated home for that on the site
  fits naturally.

Worth thinking about: some content straddles both (the PID tuner is a
tool *with* an explainer baked in). Options — cross-link between
sections, or duplicate the explainer in both places, or split the PID
tuner so the explainer lives in Education and the simulator lives in
Tools with a link to the explainer. Probably figure this out per-tool
when restructuring.

Top nav grows from `Home / Contact` to `Tools / Education / Contact`
(or `Home / Tools / Education / Contact`).

### PID tuner — Education/Tools split plan
Concrete plan for how the PID content divides:

**Tools side (the simulator page):**
- The full sim — all parameters, parameter-style toggle, presets, plot,
  metrics readouts. Stays as power-user surface.
- The symptom → change cheat sheet, but **tightened** — favor short
  codes / arrows over prose so it scans fast for people who already
  know what's going on. Beginners are routed to Education instead of
  babysat here. (Exact shorthand style TBD — see open Qs.)
- A small "New to this? Start here →" link near the top pointing to the
  Education page.

**Education side (PID basics page):**
- Long-form explainer, fleshed out well beyond the current blurb
  (worked HVAC examples, the loop-speed-numbers content from above
  folded in naturally, diagrams if worth it).
- Three sequential mini-sims, one per parameter, encountered as the
  reader works down the page. Each has a much simpler UI than the
  main tool — pre-set process type, narrower controls (maybe
  Low / Medium / High preset chips instead of free sliders), one knob
  at a time exposed.
- Leaning cumulative rather than isolated:
  - Sim 1: P only → see steady-state offset
  - Sim 2: P + I → see how I kills offset but can oscillate
  - Sim 3: P + I + D → see how D damps the oscillation
- "Try it for yourself →" button at the bottom linking to the full
  tuner.

**Architecture:** the simulation engine (first-order-plus-dead-time
process + discrete-time stepping) lives in one place and is shared
across all four UI surfaces (3 education sims + main tool). Pull it
into a real external `.js` module during the restructure, loaded via
`<script src=...>`. This is a deliberate shift from the current
"everything inline per page" pattern — see the site-architecture
note below for the reasoning.

**Open questions:**
- Exact form of the shortened cheat sheet (short codes? trimmed prose?
  arrow grid?).

---

## Visual design — two products, one codebase

The site serves two distinct use cases that should each get a
purpose-fit experience, not a one-design-fits-both compromise.

**Mobile = job-site reference tool.** Tech on a roof or ladder,
gloves on, needs an answer in under 30 seconds. Calculators,
converters, lookups, reference tables. Light, fast, scannable.
*Not* the full PID sim (sliders unusable, chart unreadable on a
phone). *Not* the mini-sims. Education is skim-readable at best —
full study is a desktop activity.

**Desktop = learning environment + workshop.** Tech (or new hire,
or curious veteran) at a desk, time to read, time to play. Full
sims, education content fleshed out, denser layouts with reference
panels alongside active tools. The whole site, not a subset.

### Implications

- Mobile is a *subset*, not just a narrower desktop. Some surfaces
  should hide on mobile entirely (the PID sim canvas, the mini-sims,
  possibly long Education prose). "Hide on mobile" is a deliberate
  design move under this framework, not a fallback.
- The mobile home page eventually differs in *content shape* from
  the desktop home. Desktop home is for browsing categories; mobile
  home is for finding a specific tool fast. Same URL, layout swaps
  via `@media`.
- Mobile network constraints matter. Job sites have bad cell service.
  Conservative about external requests; pushes toward self-hosting
  fonts (already a known cleanup item) and being judicious about
  anything network-dependent.

### Visual grammar — Niagara-ish, EBO-clean, neither stolen

The site should feel intuitive to BMS people without being a copy of
any specific platform. Strategy: borrow Niagara's visual grammar
(the most widespread, so the largest audience finds it familiar),
keep EBO's cleanness (current site is already close to this), avoid
either's specific palette or chrome.

**Grammar to borrow (Niagara-ish):**
- Property-sheet form rows — label LEFT, input/value RIGHT, hairline
  divider between rows. Not the current label-above-input.
- Dense data tables with tight row heights and zebra striping
  (current `.ref-table` is close to this; push further).
- Tabs with thin underline indicator (already in use — keep).
- Slightly recessed panel headers, different background than panel
  body (already in use via `.section-header`, `.subhead` — keep).
- Accent colors reserved for actionable or live data values, never
  decorative chrome (already mostly in use via `--blue` for readouts).
- Reference panels sitting *alongside* active tools, not below them.
  The single most "BMS-coded" move on the list.

**To avoid:**
- Niagara's specific palette (the Tridium teal-blues). Current green
  is already distinct — keep it.
- Wholesale window chrome that mimics Workbench too literally.
- EBO's specific blues for the same reason.

### Prototype strategy

Don't redesign every page in one pass. **The BACnet/IP converter is
the prototype** — small, side-by-side input/output layout is the
most obvious fit for the new language, and the user uses it
personally so feedback is immediate. Once that page feels right,
patterns propagate to the other tools.

---

## Site architecture — the "no build step" question

`CLAUDE.md` describes the project as "no framework, no build step,
hand-written" — which is two separate properties tangled together.

**"No build step"** is the valuable property: no transpilation, no
bundling, no tooling that can drift or break. View-source shows the
real code. Browsers ten years from now will still run it.

**"Everything inlined per page"** is a *stylistic* choice that's been
behaving as if it were part of that property. It isn't. External
`styles.css` and external `.js` files loaded via `<link>` and
`<script src>` are still no build step.

**Stance moving forward (Level 2):** shared CSS and shared JS live in
real external files in the repo. Per-page logic can still be inline
when it's truly page-specific. Drivers pushing this way:

- The duplicated `<style>` between `index.html` and `contact.html` is
  already flagged in `CLAUDE.md` as the first motivator for cleanup;
  adding more pages multiplies the cost.
- The shared PID sim engine (above) wants to be a real file.
- Education mini-sims will reuse that engine — same argument.

What's *not* being adopted: bundlers, transpilers, frameworks, npm
build steps, or a static site generator. Those stay future-cleanup
items, appropriate when the page count reaches 15–20 and the
nav/header copying genuinely hurts. Today's move is just letting the
browser load shared files instead of duplicating them.

**Action during restructure:**
- Extract shared CSS to `html/styles.css`. Both existing pages link
  it. Page-specific CSS (the `contact.html` extras) can stay inline
  or move to its own file — pick whichever ages better.
- Create `html/scripts/` (or similar) for shared JS. First inhabitant
  is the PID sim engine.
- Update `CLAUDE.md` to reflect the new stance — strike the
  "everything in one file per page" framing, keep the "no build step"
  framing, and add a brief note on where shared assets live.

---

## Friction log

### PID tuner — integral slider direction is confusing in Ti mode
Coworker feedback: the integral slider feels unintuitive when the
parameter style is set to Ti (reset time in minutes/seconds). Slider
right = stronger integral action (canonical repeats/min goes up), but
the displayed Ti *number* goes down (shorter reset time = more
aggressive). The slider direction is "correct" by the principle
"slider right = greater effect on the loop" — but the number moving
the opposite way breaks intuition for people thinking in Ti.

Possible directions (pick one or combine):
- **Keep slider direction, clarify visually.** Add a "← weaker /
  stronger →" label under the slider, or an arrow icon, so the user
  isn't relying on the number alone to read direction. Cheapest fix,
  doesn't compromise the design principle.
- **Show both values side-by-side more prominently.** Make
  repeats/min always visible next to Ti so the user sees the canonical
  value going up while Ti goes down — turns the confusion into a
  learning moment about *why* they're inverses.
- **Per-user slider-direction option.** Setting that lets the user
  pick "slider right = stronger" (current) or "slider right = larger
  displayed number" (flips in Ti/Td mode). More work, but probably the
  most honest answer since there's a real split in how techs think
  about it.

Lean toward the first two as a combined cheap fix; the toggle is
nice-to-have if the friction keeps coming up. Either way, the
underlying design principle to preserve: **slider right = stronger
effect on the loop, regardless of parameter style.**

---

*Last updated: started during brainstorming session, pre-coding.*
