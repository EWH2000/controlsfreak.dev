# controlsfreak.dev — Ideas & Friction

Running list of feature ideas and things that annoy me about the site
as I use it. Drop notes here as they come up; flesh out later. Items
graduate from here into `#roadmap` in `index.html`, then into actual
tools.

---

## Feature ideas

### Mock-service-call lineup audit — method + 2026-06 findings *(reviewed 2026-06-10)*

A repeatable way to stress-test the tool lineup: put agents into
realistic field scenarios as roleplayed techs (with the full page
inventory), have them walk the call minute-by-minute, note every
reach-for moment, and report covered-vs-gap. Run five in 2026-06:
RTU economizer complaint, VAV commissioning day, MS/TP trunk dropping
devices, panel retrofit (transformer/wire-run math), and a
chiller-plant low-ΔT / short-cycling call — the last deliberately in
the site's strongest territory as a *control*. The control held (the
hydronics/sequencing coverage was reached for and delivered), so the
gaps are signal, not invented work.

**The convergent finding: concepts are taught; the quantitative field
math beside them is missing.** Four clusters, all owner-approved as
the 2026-06 build queue:

1. **Waterside load solver** (q = 500·GPM·ΔT — daily-use; the hole
   dead-center in the hydronics strength) — *(shipped 2026-06-10,
   see entry below)*.
2. **Airflow / K-factor tool** (CFM = K·√VP both directions, duct
   velocity V = 4005·√VP — opens the missing airside-flow category;
   new `airflow` landing chip approved at count 1) — *(shipped
   2026-06-10, see entry below)*.
3. **Control-power electrical tools** (transformer VA budget + fuse
   sizing; wire-run voltage drop with per-signal-type verdicts — the
   quantitative layer the controller-wiring content lacks; new
   `electrical` chip) — *(shipped 2026-06-10, see entry below)*.
4. **MS/TP lesson** (`bacnet-mstp.html`) — both BACnet lessons
   explicitly defer to it and it doesn't exist; lesson first, the
   parked `[future: bus simulator]` stays its eventual hands-on pair
   — *(shipped 2026-06-10, see entry below)*.

Also decided in the same review: **Controller commissioner stays
parked** (annotated on its entry), **cross-page Mix quizzes deferred**
(annotated in the Practice entry), and the scenario-drill arc below
was opened. Re-run the audit method when the lineup shifts enough
that the 2026-06 verdicts go stale.

### Branching diagnostic scenario drills — "mock service call" as a feature *(future arc, opened 2026-06-10)*

The chiller-plant audit agent independently asked for a "capstone
case study: given trends + symptoms, reason backward to the root
cause" — which is the mock-service-call idea turned into a product
feature. A choose-your-path diagnostic drill: "It's 6 AM, the kitchen
calls — walk-in too warm. What do you check first?" Each choice costs
sim-time and reveals readings; wrong paths are survivable but slower;
the debrief names the optimal route and links the lessons/tools it
leaned on. No other free site has this; it plays to the war-story
credibility the Education anecdotes already trade on, and the owner's
real calls become scenario seeds (the dew-point/coil call is an
obvious first candidate).

Real cost, stated up front: this is a **new engine format**, not a
quiz-bank entry — a `scenario-engine.js` sibling to `quiz-engine.js`
(branching state graph, time ledger, readings reveal, debrief
renderer), plus a data-file schema for scenarios. Build **after** the
2026-06 four-PR queue above. Scope discipline when it starts: one
engine, one scenario, the existing practice-landing card shape; no
scoring leaderboards (the quiz plan's hard-nos carry over).

### BACnet buildout — the flagship subsection *(opened 2026-07-07, completed 2026-07-12 — all five pages + the pillar shipped)*

The topic-cluster play from the `seo-growth-plan-2026-07` analysis,
ported here from a since-deleted GitHub issue (#294 — the repo's
Issues tab was disabled 2026-07-07 after attachment spam; this entry
is now the canonical checklist). **Why:** BACnet is the one cluster
where the young domain already ranks page 1–2 and earns essentially
all search clicks (Jul-2026 GSC: ip-converter ~pos 5 with 6–9% CTR,
bacnet-networking ~6.7, bacnet-objects ~pos 20, "47808 in hex" at 7).
The decoder/reference long-tail is a *soft* SERP — winnable now —
while the reference head terms ("bacnet object types") sit with
Chipkin/bacnet.org authority and come only with domain age. Goal: a
tightly interlinked tools ⇄ lessons ⇄ quizzes cluster, not scattered
pages.

Shipped so far:

- **Deepen what ranks** — bacnet-objects h2s + DefinedTermSet schema +
  enum expansion + FAQ + retitle; ip-converter per-tab topic h2s +
  FAQ; tool ⇄ tool cross-links; `html/_data/bacnetEnums.js` single
  source *(shipped 2026-07-07, PR 1 — addenda on both tool entries
  below)*.
- **MS/TP practice quiz** de-orphaning the bacnet-mstp lesson + full
  cluster relatedLinks reciprocity *(shipped 2026-07-07, PR 2)*.
- **BACnet Vendor ID lookup** — searchable vendor-ID ⇄ manufacturer
  table (property 120 `Vendor_Identifier`), imported from the public
  ASHRAE registry by script, not hand-transcribed *(shipped
  2026-07-08, PR 3 — entry below)*.
- **BACnet Engineering Units decoder** — `tools/bacnet-units.html`,
  the full 0–254 standard `Units` enumeration (property 117) as a
  filterable/copy table + reverse-decode box, deeper than the
  Object-Reference tab's ~80-row slice. Data is a **generated** file
  (`html/_data/bacnetUnits.js`, `npm run import-bacnet-units`) parsed
  from bacnet-stack's `bacenum.h` and overlaid with `bacnetEnums.js`'s
  curated names/symbols/groups by id (curated-wins, so it can't drift
  from the Object Reference). Long-tail rows carry bacnet-stack
  spellings + a page provenance note to verify against ASHRAE 135.
  *(shipped 2026-07-12, PR 4 — mirrors the vendor-ID tool + importer
  pattern)*.
- **BACnet error / reject / abort code decoder** —
  `tools/bacnet-error-codes.html`, a PDU-mode decode box (Error =
  class + code, Reject, Abort) + four filterable reference tables.
  Enum truth is **generated** (`html/_data/bacnetErrors.js`, `npm run
  import-bacnet-errors`) from bacnet-stack's four error enums (8
  classes, 225 codes, 11 reject, 12 abort); the field-common
  descriptions live hand-authored in `html/_data/bacnetErrorNotes.js`
  (overlaid by name), **drafted + adversarially verified via a
  workflow** (3 independent BACnet lenses per item) before shipping.
  Long tail (BACnet/SC, HTTP/TLS/DNS, OAuth-scope codes) is name-only.
  *(shipped 2026-07-12, PR 5 — generated/curated split; the
  descriptions carry the placeholder-verify convention)*.
- **Priority Array resolver** — `tools/bacnet-priority.html`, an
  interactive 16-slot editor (type a value or clear to NULL in any
  slot) that resolves `Present_Value` to the lowest-numbered non-NULL
  slot, or `Relinquish_Default` when the whole array is empty; the
  winning slot highlights and the panel computes what takes over if you
  release it. Ships the standard reservation table (1 manual / 2 auto
  life-safety, 5 critical-equipment, 6 min-on/off, 8 manual-operator;
  the rest available) — slot table cross-checked against ASHRAE 135
  command-prioritization references (Chipkin, Beckhoff/TwinCAT). Caught
  and fixed a factual slip in `education/bacnet-basics.html` (it had
  critical/min-on-off at slots 6/7 in both the prose and the SVG —
  corrected to 5/6). *(shipped 2026-07-12, PR 6 — interactive tool, no
  imported data; the widget the Modbus/BACnet lessons had drafted out
  for the lesson pages lives here as a standalone tool)*.
- **Services / BIBBs reference** — `education/bacnet-services.html`, a
  lesson (category `protocols`, not a tool — the parked slot was
  always `education/`) that deepens bacnet-basics' services section:
  what a service is, the confirmed / unconfirmed split (with a
  two-lane message-sequence diagram), a field-relevant service-family
  reference table, then **BIBBs** — the A = client / B = server role
  convention, a `DS-RP-B` anatomy diagram, and a common-BIBBs table —
  and device profiles + the PICS. Facts (interop-area codes, BIBB
  names, A/B role direction, device profiles, PICS) cross-checked
  against Chipkin / Beckhoff / 7NOX and the search consensus. Inserted
  into `educationSequence.js` **between bacnet-basics and
  bacnet-networking** (basics introduces services → this deepens them
  → networking moves them across routers); reciprocal relatedLinks +
  a live forward-link added to both neighbours. *(shipped 2026-07-12,
  PR 7 — lesson page, `.bac-svg` already consolidated so no page CSS)*.
- **BACnet vs Modbus** explainer — `education/bacnet-vs-modbus.html`,
  the classic "difference" query and the bridge between the two
  protocol clusters. Opens on the deepest split — a Modbus register is
  anonymous, a BACnet object describes itself — with a "same physical
  point, two protocols" diagram (register 40012 = 552 vs. an Analog
  Input whose `Units`/`Object_Name`/`Description` ride with the value).
  Then the SEO payload: a dimension-by-dimension comparison table
  (origin, data model, self-description, discovery, COV vs polling,
  command arbitration, alarming, scheduling, transports, conformance,
  typical gear, byte-order), sections unpacking discovery + COV +
  priority-vs-last-write + PICS/BIBBs-vs-vendor-map, and a
  gateway-at-the-seam diagram for "when you meet each." Facts (origin
  years, four Modbus tables, transports, conformance mechanisms)
  cross-checked against the existing Modbus/BACnet lessons + protocol
  references. Inserted into `educationSequence.js` **between
  modbus-decoding and bacnet-basics** (the modbus→bacnet seam, test-safe
  — last lesson stays bacnet-mstp); heavy reciprocal relatedLinks into
  both clusters (modbus-basics, modbus-decoding, bacnet-basics all now
  forward-link it). *(shipped 2026-07-12, PR 8 — lesson page, `.bac-svg`
  reused, no page CSS)*.

- **Mini-hub / "start here" pillar** — `html/bacnet/index.html`, served
  at `/bacnet/`, the buildout capstone. Owner picked the pillar-page
  form (over a nav sub-grouping or cross-link-only) 2026-07-12. A
  topic-cluster hub-and-spoke landing: a "what BACnet is" lead (ASHRAE
  135 / self-describing object model), a numbered **start-here reading
  path** through the five lessons (Basics → Services → Networking →
  MS/TP → vs Modbus, each a `navCard` with a Step-N pill), and the six
  tools grouped by job (Decoders / Addresses &amp; commands / Reference).
  New page archetype — a cross-section landing with **no `nav`
  frontmatter** (so it sits in no nav dropdown and lights no `.active`;
  routes via the same `html.11tydata.js` permalink as `/tools/`, and the
  breadcrumb JSON-LD falls back to a flat Home → title). **Spokes link
  back:** a new optional `hub:` slot on the `relatedLinks` macro renders
  a "Part of" column, added to all 11 BACnet pages — the pillar's
  inbound-link structure. Home entry via the (unguarded) `hero-latest`
  badge, repointed from bacnet-priority to `/bacnet/`. *(shipped
  2026-07-12, PR 9 — closes the BACnet buildout)*.
  *(Archetype evolved 2026-07-13 by the Guides nav lane: hubs now DO
  carry `nav: guides` + a short `navLabel`, so they sit in the flat
  "Guides" dropdown and light `.active` — the "hub lights no section"
  gap is closed. See *Guides nav lane + topic-hub IA — the nav/home
  redesign* under **Site structure / organization**.)*

**BACnet buildout — COMPLETE (2026-07-12).** All five content pages +
the pillar shipped across PRs 5–9 (units decoder, error decoder,
priority-array resolver, Services/BIBBs lesson, BACnet vs Modbus, and
the `/bacnet/` hub). Cluster now 11 pages — 6 tools + 5 lessons — under
one pillar, every page cross-linked and every spoke pointing back. Next
BACnet work (BACnet/SC, deeper alarm/event, segmentation) is fresh
scope, not part of this arc; re-pull GSC mid-Aug 2026 (per
`seo-growth-plan-2026-07`) to see what the cluster earned.

### Forced-air buildout — the air-side chapter *(opened 2026-07-09, completed 2026-07-11 — all six shipped)*

The site's biggest taught-around hole, opened as a six-page Education
chapter with paired quizzes, one PR per page. **Why:** the air side
is a tool cluster without a hub — psychrometric-chart (a full AHU
process chain), air-mixing, economizer-ratio, coil-sizing, airflow,
and dew-point all pointed their lessons-links at
psychrometrics-basics, which teaches air *state*, not air *systems*;
affinity-laws is fan-capable but files under hydronics and links only
pump lessons. The mock-service-call audit put two of its five
scenarios on exactly this ground (RTU economizer complaint, VAV
commissioning day) — demand signal, not invented work. And it's the
owner's own learning list: power exhaust, damper positions ↔ building
pressure, and naming the unit you're standing in front of are the
personal pain points that pick the depth spots. New education
category `forced-air` (label "Forced Air Systems"), matching practice
category for the quizzes — rollout notes below.

Reading order (educationSequence + both landing grids; the block
inserts after psychrometrics-basics and before function-blocks — air
state precedes air systems, protocols stay last; reorder the grid,
educationSequence.js, and quizOrder.js together, same PR):
air-handlers → economizers → building-pressure →
air-unit-identification → vav-systems → duct-static-control. The
VAV → duct-static close mirrors the hydronic arc's load-piping →
pump-control ("loads throttle, mover responds") on purpose — the
pages should say so. Ship order may deviate to 1 → 4 → 2 → 3 → 5 → 6
to give the identification sidestep a live link sooner; keep 2 → 3
adjacent either way (the damper ↔ pressure debt pays next-PR).

Shipped so far:

- **Air Handlers** *(shipped 2026-07-09, buildout PR 1)* —
  `education/air-handlers.html` + paired quiz + the `forced-air`
  category rollout (education + practice) + the `data-flow="air"`
  engine type. Chapter opener/hub: the air path from return grille
  to supply duct, generic draw-through AHU with a budgeted RTU
  callout, sensor-strip widget (owner's RTU MA-T-placement story),
  and the prose sidestep toward unit identification. Declared
  question + scope contract below.
- **Economizers** *(shipped 2026-07-09, buildout PR 2)* —
  `education/economizers.html` + paired quiz. The free-cooling
  decision end to end: the modulating damper assembly (D1 reuses
  the page-1 damper glyphs at free-cooling positions, MA-T sensor +
  amber econ-loop signal wire), the deceptive-wedge psych sketch
  (equal-enthalpy line vs same-dry-bulb line through the return
  state, worst-case limit at the saturation intersection), a
  changeover-explorer widget judging one OA state by dry-bulb and
  enthalpy side by side — first psychro-engine use on an education
  page; derives the worst-case dry-bulb limit for humidity-blind
  buildings; owner's all-dry-bulb-building story (occupants were
  the only humidity sensor; fix was the worst-case calc) in the
  reveal — the integrated-staging band chart, and field failures
  with the muggy-morning worked diagnosis. Modulating diagram
  stayed static; densities carry the recipe, no `setPathColor`.
  Declared question + scope contract below.
- **Building Pressure** *(shipped 2026-07-10, buildout PR 3)* —
  `education/building-pressure.html` + paired quiz. The air ledger
  (pressure as the residual; supply/return never cross the envelope;
  the large-AHU asymmetry — OA minimum sized over the exhaust that
  never returns, owner-requested), the relief lineup (barometric's
  positive-only physics, power exhaust as the deep treatment —
  "not a return fan" — return-fan tracking with the ledger-derived
  offset), the two damper↔pressure failure corners paying page 2's
  callout, and probe placement / the duct-static distinction. A
  pressure-ledger widget solves the building by bisection against
  an envelope orifice curve under four relief strategies; its
  interlock-mistake preset replays the owner's own program (power
  exhaust interlocked to the supply fan like a return fan → negative
  building, heavy doors, whistling — fix: call the fan with the
  damper). Both prior pages' promises upgraded to live links.
  Declared question + scope contract below.
- **Unit Identification** *(shipped 2026-07-10, buildout PR 4)* —
  `education/air-unit-identification.html` + paired quiz. The three
  field questions (siting / cabinet / connections) as the method;
  the five-family lineup with its connection fingerprints — packaged
  RTU plus the heat-pump variant whose tell is paper, built-up AHU
  ("the pipes outrank the address"), MAU/DOAS named by the missing
  return duct, splits by the lineset, fan coils at recognition depth
  only — and the CV-vs-VAV conjunction callout (drive + boxes +
  duct-static setpoint; a drive alone proves nothing, per page 1's
  every-modern-fan-rides-a-VFD claim); schedule-tag / mechanical-
  schedule / nameplate literacy (tonnage-digits worked example, the
  three "schedules" disambiguated); and the taught off-season
  override — "command the season that's asleep" — with guardrails.
  A lineup-walker widget narrows five family cards as the reader
  answers the three questions; four mysteries deal field scenes the
  reader walks from the clues (the widget grades the ID), the last
  replaying the owner's real building — FCUs/AHUs/RTUs under
  wrong-family graphics and stale prints, identified one point at a
  time by off-season commands, metering outputs where no LEDs
  existed. THE sidestep debt paid: the opener's callout and page 3's
  closing hand-off both upgraded to live links; the closing walks
  back to the opener's air path. Declared question + scope contract
  below.
- **VAV Systems** *(shipped 2026-07-10, buildout PR 5)* —
  `education/vav-systems.html` + paired quiz. One trunk, thirty
  claims: boxes throttle volume, not temperature — the load-piping
  mirror named out loud, pump-control cited as the answering half;
  box anatomy (damper, flow ring, controller; CFM = K·√VP deferred
  to the airflow tool's math and echoing its K = 1000 example); the
  two-loop cascade and pressure independence ("damper position is
  nobody's setpoint"), with min/max CFM traced schedule → balancer's
  hood → back-solved K; the floors — ventilation at the box, reheat
  riding the minimum (DAT cascade, ~90 °F cap), and measured OA at
  the unit (pays page 3's §dampers-pressure wrinkle); a coil-floor
  section the contract didn't promise (DX minimum airflow, ~400
  CFM/ton, and the relief lineup: generous minimums / airflow
  interlock / bypass / dump zone) — the owner's war story picked the
  depth spot, same as power exhaust on page 3. Box-walker widget
  with a system strip: zone-temp slider drives the flow cascade, the
  sibling mood moves the damper while flow holds (pressure
  independence live), and the starved-coil preset replays the
  owner's building — a retired chiller hacked into two field-built
  DX circuits, no bypass / dump zone / interlock / low-pressure
  cutout, iced coils and lost compressors, band-aided with boxes
  pinned to max, return-temp staging, and summer boilers until the
  mechanical fix lands. Closes on the chapter cliff-hanger: every
  box shuts at once — where does the pressure go? Declared question
  + scope contract below.
- **Duct static control** *(shipped 2026-07-11, buildout PR 6 — THE
  CHAPTER CLOSER)* — `education/duct-static-control.html` + paired
  quiz. Catches page 5's six-o'clock cliff-hanger mid-scene and
  answers it: static is the signal because the duct does the
  arithmetic (boxes close → static rises → fan slows — the
  pump-control mirror said out loud, same sign, both fluids); the
  loop (transducer + 1.5 in. w.c. setpoint + fast PID on the VFD,
  pid-tuner's supply-fan scene linked as the hands-on pair); sensor
  placement taught as air's compromise on pump-control's local-vs-
  remote logic (~two-thirds out — no prior page stated the rule, so
  this page introduces it); trim & respond reset to the most-open
  damper with a ventilation-floor rationale (vs hydronic deadhead);
  then the page's soul, "Static Is Not Flow" — the starved-DX
  building re-read from the fan's side in three escalating beats:
  static ≠ flow by design (1.5 at 30,000 and at 7,600 CFM identical
  at the sensor — why page 5's interlock is airflow-proven), the
  loop masking an iced coil (same flow, same static, +14 Hz;
  Hz-at-flow is the honest number), and the owner's earlier fix
  attempt — cranking the fan against pressure-independent boxes,
  which moved no flow and railed the 0–2.5 in. w.c. / 0–10 V
  transducer at full scale ("the fan makes pressure, the boxes make
  flow"; signal-scaling tool linked for the railed-reading
  literacy). Safeties: the high-static cutout as an independent
  mechanical switch (the owner's building had none — the
  LP-cutout's twin), sensing-tube failures both directions, blown
  duct. Static-loop widget = pump-control's DP-reset model with air
  in it (fan curve 5.5·r² − K·Q², design 30,000 CFM at 4.0 total /
  1.5 held; demand slider, fixed/reset, clean/iced, loop/pinned);
  the old-fix preset rails the sensor and pins the anecdote. Closes
  with the refrigerant-precedent walk of all six pages. Pays:
  page 5's cliff-hanger callout + opener plant + ref-note + the
  vav-every-box learnMore (retargeted), page 3's ≠-callout + "the
  fan's own speed", page 1's fan fence + the chapter map's last
  unlinked clause, page 4's closing plant, vfds' water-only
  hand-off (air-side twin sentence added), affinity-laws' fan-side
  orphanhood (lessons + quizzes), pid-tuner's back-edge, and
  pump-control's mirror back-edge. Declared question + scope
  contract below.

Remaining: **none — the six-page chapter is complete** (reading
order air-handlers → economizers → building-pressure →
air-unit-identification → vav-systems → duct-static-control, all
shipped with paired quizzes). Still open from the rollout notes: the
parked terminal-unit pages (markers only, demand-driven); the deferred
mini-hub / "start here" decision below is now **resolved** — the
`/forced-air/` hub is shipping. New idea noted
while shipping page 6 (owner request 2026-07-11): an **analog
sensing / transmitters lesson** — ranges and scaling, live-zero,
railed signals as ceilings not measurements — seeded by the
railed-transducer beat; natural home for the signal-scaling tool's
lessons-link. `[future: education/analog-sensing.html]`

**The identification sidestep.** Linear order stands, but the opener
plants an early callout toward naming the unit ("not sure what to
call the box you're standing in front of? that's its own question")
— plain prose + the `[future: education/air-unit-identification.html]`
marker until the ID page ships, never a dead link *(shipped
2026-07-10 — prose upgraded to a live link)*. Upgrading that
prose to a real link is a tracked forward-link debt the ID page pays
in its own PR, alongside its closing section sending readers back to
the opener's air path ("whatever the nameplate says, it's the same
stations"). Same discipline as the twin-T → load-piping payoff: the
marker is the record, and the ID page doesn't ship without paying it.

**Quiz plan.** Every page ships its paired quiz in the same PR —
bank in `html/_data/quizzes/<slug>.js` (never inline; head.njk's
FAQPage reads the same source), 10 questions banked from the page's
own sections, `pairedQuiz`/`pairedLesson` frontmatter both ways,
quizOrder.js + the practice landing grid inserted at the curriculum
position (after psychrometrics-basics, before function-blocks; the
nextQuiz chain re-routes at build). The bacnet-mstp lesson-first
parking re-opened the 1:1 lesson↔quiz matrix and borrowed a sibling
quiz for a month — don't repeat it.

**Category rollout (landed with PR 1).** `.eleventy.js`
NAV_CATEGORIES: education gained `["forced-air", "Forced Air
Systems"]` between refrigerant and protocols; practice gained the
same pair between psychrometrics and field. Education landing chip
"Forced Air Systems" at count 1 (All 18→19 — airflow-chip precedent:
a one-entry chip is fine as a declared category opener); practice
chip at count 1 (All 22→23). Card-level `category: 'forced-air'` on
both landings (NOT added to the education filter's FUNDAMENTALS
catch-all set); frontmatter `category: forced-air` (navCategoryGuard
fails the build without it). The 18-char label is safe in the nav
dropdown and the wrapping chip rows, but NOT beside an h1 — per-page
`.tool-tag` uses the short display form **"Air Systems"** (tags
already diverge from category labels: "HVAC" on fundamentals pages,
"Field Drill" on field), and long h1s stay short ("Building
Pressure", not "Building Pressure & Exhaust") so the 320-width sweep
stays green. Key stays `forced-air` everywhere; labels are
display-only.

Per-PR mechanics, same every time: educationSequence.js +
education/index.html grid (reorder together), quizOrder.js +
practice/index.html grid (ditto), chip counts on both landings,
tests/pages.js (the 375 sweep + sitemap-drift test), README tour,
description 140–160 chars (build-enforced), retire the page's
`[future:]` markers with *(shipped YYYY-MM-DD)* annotations,
relatedLinks reciprocity on the tools each page adopts, minor
version bump.

Parked, NOT committed pages (terminal-unit follow-ons — markers only,
they earn pages when demand shows): `[future:
education/fan-powered-boxes.html]` (series vs parallel), `[future:
education/vvt.html]` (looks like VAV, isn't), `[future:
education/fan-coil-units.html]`, `[future: DOAS / ERV page]`
*(shipped 2026-07-15 — education/dedicated-outdoor-air.html)*, `[future:
single-zone VAV]` (drive tracks the zone's own load, no boxes, no
static setpoint — the ID page's CV-vs-VAV callout names it as the
bare-trunk exception; surfaced by the PR-4 review).

**Mini-hub / "start here" decision deferred** until 3–4 pages land —
revisit whether Forced Air needs its own nav grouping / hub page, and
whether affinity-laws' hydronics-only filing needs more than the
relatedLinks fix page 6 gives it. *(Status 2026-07-11: the chapter is
complete at six pages, so this decision is now due — an owner call.
The relatedLinks half is done: affinity-laws links both pump-control
and duct-static-control, so its fan side has a lesson home; whether
its landing-card category should say more than "hydronics" is part
of the same call.)* *(Resolved 2026-07-13 — owner call made. Forced
Air gets a **hub page** (`/forced-air/`, a `/bacnet/` clone), surfaced
by a new single **"Guides"** nav lane — NOT a topic-primary nav
rewrite (that's the documented north star, gated on ~4 hubs + GSC
data). affinity-laws stays filed `hydronics` (its category home) but becomes a
**full forced-air hub spoke** — grid card + a `hub:` "Part of" backlink
(owner call: fans **and** pumps, so the backlink is a cross-link, not a
re-parenting). It's the first genuinely multi-cluster tool, which
spawns a new **"core tool" / multi-membership retrigger** (fires when
the hydronics hub ships — affinity-laws would then need to backlink
both — or when ≥3 tools need 2+ category buckets). Full scope, the
two-PR sequencing, the deferred topic-primary north star, the P3
(fold-Simulators) rejection, the home-hero reword direction, and the
core-tool retrigger are folded into *Guides nav lane + topic-hub IA —
the nav/home redesign* under **Site structure / organization** (the
scope doc is retired; git history keeps the full text).)*
*(Retrigger fired 2026-07-14 — the **hydronics hub** shipped
(`/hydronics/`, a third `/bacnet/`-clone pillar wired into the Guides
lane via `nav: guides` + `navLabel`). The single-`hub:` limit came due
exactly as predicted: `affinity-laws` now backlinks **both** forced air
and hydronics, handled by the `hub:` → **array** step — the cleanest
candidate from the scope doc. The `relatedLinks` macro normalizes a
single `{href,label}` object or an array of them, so the 24 existing
single-hub spokes are untouched. affinity-laws keeps `category:
hydronics`; the dual-taxonomy nav/chip listing stays deferred.)*

**Declared questions — all six, locked before drafting (one-question
rule).** Each page's shipped entry will open with the same question
and record what actually landed; these are the scope contracts.

**1 · Air handlers** (`air-handlers.html`) *(shipped 2026-07-09)*
*One question: what path does air walk through an air handler — from
return grille to supply duct — and what job does each station on
that path do?*
In scope: the air-path walk (RA → mixing box → filter → coils →
supply fan → SA, generic draw-through AHU); each station's controls
surface (what moves it, what sensor watches it — MA-T/DA-T, filter
ΔP, damper + valve actuators); the packaged-RTU callout (same
anatomy folded into a rooftop box, DX coil instead of chilled water
— hard budget set before drafting: one callout, ≤4 sentences, no
diagram; growth pulls it into the ID page — budget held). Closing
names the downstream questions — this page is deliberately the
chapter hub.
Out of scope: economizer logic `[future: education/economizers.html]`
*(shipped 2026-07-09 — prose upgraded to live links)*;
relief/exhaust path `[future: education/building-pressure.html]`
*(shipped 2026-07-10 — prose upgraded to live links)*;
naming the box `[future: education/air-unit-identification.html]`
*(shipped 2026-07-10 — sidestep callout upgraded to a live link)*;
the terminal side `[future:
education/vav-systems.html]` *(shipped 2026-07-10 — chapter-map
clause upgraded to a live link)* and the fan's speed `[future:
education/duct-static-control.html]` *(shipped 2026-07-11 — fan
fence and chapter-map clause both upgraded to live links)*;
air-state math — existing
links, not markers (psychrometrics-basics §Processes, air-mixing,
coil-sizing, psychrometric-chart).
Debts: incurred the five chapter markers above. Paid: first lesson
hub for the psychrometric-chart / air-mixing / coil-sizing
lessons-links (reciprocity landed same PR, plus back-edges from
psychrometrics-basics, load-piping, vfds, refrigerant-cycle-basics).

**2 · Economizers** (`economizers.html`) *(shipped 2026-07-09)*
*One question: when should an air handler cool with outside air
instead of running the coil — and how do the dampers, the changeover
check, and the minimum-OA floor make that decision safely?*
In scope: the damper set as one modulating assembly (linked OA/RA/EA
action, minimum-OA position vs free-cooling modulation, MAT as the
controlled variable); changeover (dry-bulb vs enthalpy, high-limit
lockout, why enthalpy wins humid climates); the cooling sequence
(economizer as first stage, integrated with DX/CHW staging, the
enable logic); field failure modes (stuck/hunting dampers,
freeze-stat, the RTU-economizer audit scenario as the worked
diagnosis).
Out of scope: where the air goes at 100 % OA `[future:
education/building-pressure.html]` *(shipped 2026-07-10 — both
planted callouts upgraded to live links)*;
demand-controlled ventilation / CO₂ resets `[future: DCV]`; 90.1
climate-zone high-limit tables `[future: changeover-limit reference
on economizer-ratio.html]`; mixing math (links to
psychrometrics-basics / air-mixing, not markers).
Debts: paid function-blocks' economizer-enable worked sheet (in-prose
"what the enabled device actually does" link + relatedLinks entry),
economizer-ratio's lessons-link orphanhood (lessons + quizzes groups),
sequencing-scenarios' three economizer reveals (learnMore now
deep-links the lesson's anchors; the low-limit gotcha finally has
one), and page 1's economizer marker (three prose upgrades +
relatedLinks). Incurred the building-pressure callout (the damper ↔
pressure tie, planted in §damper-assembly and the closing) and the
DCV marker. The worked diagnosis landed as the generalized
muggy-morning complaint rather than RTU-specific — the owner's
source story was built-up AHUs.

**3 · Building pressure & exhaust** (`building-pressure.html`)
*(shipped 2026-07-10)*
*One question: why does a building go positive or negative, and how
do relief, return, and power-exhaust fans keep it near neutral while
the dampers move?*
In scope (all landed): the air ledger (OA in vs
exhaust/relief/exfiltration out — pressure is the residual;
setpoints ~+0.02–0.05 in. w.c.; door and elevator symptoms; plus an
owner-requested addition — the large-AHU asymmetry, where gang
restroom exhausts steal supply CFM that never returns, so the OA
minimum must cover exhaust + surplus); the relief lineup (barometric
relief, power exhaust staged off damper position — the owner's named
pain, deepest treatment, its own `#power-exhaust` section anchored
on "not a return fan" — return/relief fan with the ledger-derived
tracking offset); damper positions ↔ building pressure (100 % OA
with no relief path, minimum-OA against a big exhaust load — paid
page 2's callout); measuring it (probe away from doors/elevators,
shielded outdoor reference, slow noisy signal). The widget is a
solvable ledger (bisection against an envelope orifice curve) with
four relief strategies and the interlock-mistake preset carrying the
owner's anecdote.
Out of scope: duct static — a different pressure with a different
sensor and loop; the conflation named in a callout and deferred
`[future: education/duct-static-control.html]` *(shipped 2026-07-11
— ≠-callout and the closing's "fan's own speed" both upgraded to
live links)*; kitchen / lab /
dedicated exhaust `[future: kitchen & lab exhaust]` (named in the
worked-example callout); stairwell pressurization and smoke control
`[future: smoke control]` (same sentence); VAV-minimum ventilation
interactions `[future: section in education/vav-systems.html]`
(named in §dampers-pressure as "belongs to the VAV pages")
*(shipped 2026-07-10 — §minimums carries the unit-level OA wrinkle;
the §dampers-pressure prose upgraded to a live link)*.
Debts: paid page 2's callout (both plants now live links) and
page 1's relief-path marker (mixing-box prose + closing chapter map
+ relatedLinks). Incurred the duct-static distinction (paid page 6)
plus the uncommitted exhaust/smoke markers.

**4 · Unit identification** (`air-unit-identification.html`)
*(shipped 2026-07-10)*
*One question: you're standing in front of an air-side unit you've
never seen — how do you work out what it is, what it does, and what
to call it on the radio?*
In scope (all landed): the three field questions (where does it sit,
what's in the cabinet — coils, compressors, just fans — where does
its air come from and go) as a walkable decision path — the widget
IS the path, plus a static three-questions diagram; the lineup
(packaged RTU incl. the heat-pump variant whose tell is paper,
built-up/indoor AHU, MAU/DOAS 100 % OA, splits, and the CV-vs-VAV
tell — deliberately a three-leg conjunction, drive + boxes +
duct-static setpoint, to stay consistent with page 1's
every-modern-fan-rides-a-VFD claim); nameplate + drawings literacy
(schedule tags AHU-1 / RTU-3 / EF-2, model-number tonnage digits,
matching unit to mechanical schedule, the three "schedules"
disambiguated); closing tie-back — whatever the box is called, walk
the same stations (pays the sidestep). One deliberate scope call:
fan coils appear in the lineup at RECOGNITION depth (the walker
needs an exit for "not an air handler at all," and the owner's
anecdote building was full of them) — anatomy and sequences stay
with the future FCU page. Grew beyond the contract by one taught
method: the off-season override ("command the season that's
asleep"), formalized with guardrails at the owner's direction —
it's the anecdote's technique.
Out of scope: terminal-unit identification `[future:
education/vav-systems.html]` *(shipped 2026-07-10 — CV-or-VAV
callout + closing hand-off upgraded to live links)*; FCUs beyond
recognition `[future:
education/fan-coil-units.html]`; VVT `[future: education/vvt.html]`
(named in prose in the CV-vs-VAV callout); DOAS/ERV psychrometrics
`[future: DOAS / ERV page]` *(shipped 2026-07-15 —
education/dedicated-outdoor-air.html; the "what a DOAS is" explainer,
not a psychrometrics deep-dive)*; what the unit should
*do* once named — the rest of the chapter.
Debts: paid THE sidestep — the opener's prose callout upgraded to a
live link, closing walks back to the opener's air path — plus an
unledgered second plant the grep sweep surfaced: page 3's closing
"naming the box" hand-off, also upgraded. Incurs the parked
terminal-unit markers.

**5 · VAV systems** (`vav-systems.html`) *(shipped 2026-07-10)*
*One question: how does one air handler serve thirty zones that all
want different things — what is a VAV box actually doing when its
zone calls?*
In scope: the system shape (constant-ish cold supply, boxes throttle
volume not temperature — the load-throttles half of the hydronic
mirror); box anatomy (damper, flow ring + velocity sensor, CFM =
K·√VP — pays the airflow tool's K-factor tab — controller,
pressure-independent operation, min/max CFM and where commissioning
gets them); reheat at minimum (ventilation floor + comfort, the
DAT/flow cascade); the cliff-hanger — every box closes at once:
where does the pressure go? `[future:
education/duct-static-control.html]` (discovery-prompt callout the
next page pays) *(shipped 2026-07-11 — callout, opener plant,
cube-law paragraph, and widget ref-note all upgraded to live links;
the vav-every-box learnMore retargeted at the page that answers
it)*.
Out of scope: duct static / fan response `[future:
education/duct-static-control.html]` *(shipped 2026-07-11)*;
fan-powered boxes `[future:
education/fan-powered-boxes.html]`; VVT `[future: education/vvt.html]`;
TAB procedure (the airflow tool's traverse note carries the math;
no lesson promised) *(the air-side TAB lesson shipped anyway as
education/air-balancing.html 2026-07-14 — flow-ring verification,
box setpoints, proportional balancing, building pressure)*.
Debts: pays vfds.html's naked "VAV systems" prose in the cube-law
section (gains its link), the airflow tool's lessons-link
orphanhood, and the VAV-commissioning audit scenario. Incurs the
duct-static cliff-hanger and the parked terminal markers.
As shipped: grew a coil-floor section beyond the contract (`#the-
coil-floor` — DX minimum airflow and the bypass / dump-zone /
interlock relief lineup; the owner's starved-coil story needed a
taught basis, and the topic is squarely inside the page's one
question since it's what happens when the boxes throttle). Also
paid page 3's VAV-minimum ventilation marker in §minimums. VVT,
fan-powered boxes, and single-zone VAV stay parked — named nowhere
on the page beyond the CV-or-VAV callout it inherits by link.

**6 · Duct static control** (`duct-static-control.html`)
*(shipped 2026-07-11 — see the Shipped entry above)*
*One question: how does the supply fan know how much air the
building wants — and why does it hold duct static pressure rather
than flow?*
In scope: why static is the signal (boxes throttle → static rises →
fan slows; the explicit pump-control mirror — the chapter's
hydronic-arc payoff, said out loud); the loop (sensor ~2/3 down the
duct, setpoint, PID on the VFD — hands-on pair is the pid-tuner's
supply-fan VFD · duct static scene); static-pressure reset (trim &
respond off box positions; a fixed setpoint wastes the cube-law
savings — affinity-laws carries the math); safeties + field
failures (high-static cutout, blown duct, plugged/frozen sensing
tube).
Out of scope: return-fan / relief tracking — building-pressure.html
backlink (exists by then — link, not marker); fan arrays /
redundancy `[future: fan arrays]`; lab/critical pressure cascades
`[future: critical environments]`; affinity derivations — the tool.
Debts: pays page 5's cliff-hanger, page 3's duct-static ≠
building-static marker, page 1's fan marker, affinity-laws' fan-side
orphanhood (tool lessons-links gain this page), and vfds' air-side
cube-law story. Closes the chapter — the closing section walks the
full air path once more (refrigerant-chapter page-1/closing-framing
precedent).
As shipped: contract held, with one owner-driven addition — the
war-story section grew a third beat (the earlier fix attempt that
cranked the fan and railed the 0–2.5 in. w.c. / 0–10 V transducer at
full scale; supplied in the design round 2026-07-11), which brought
the signal-scaling tie-in and seeded the analog-sensing lesson idea
noted in the Shipped section. The ~2/3 sensor-placement rule entered
the site on this page (pump-control teaches local-vs-remote, not a
fraction — the page frames air's rule as that logic's compromise).
Extra debts paid beyond the contract line: page 4's closing plant,
vfds' water-only hand-off (air-side twin sentence), pid-tuner's
lessons back-edge, and pump-control's mirror back-edge (precedent:
load-piping → vav-systems).

### Airflow tools buildout — the airside-tools queue *(opened 2026-07-11, completed 2026-07-11 — all six shipped)*

The tools-side sequel to the Forced-air buildout: that chapter shipped
six lessons and deliberately zero new tools, leaving the Airflow chip
at one entry and several documented gaps (`qs = 1.08 × CFM × ΔT`
appeared nowhere on the site; the 400 CFM/ton DX floor was
prose-only). Owner picked the full slate 2026-07-11 — four proposed
tools plus two owner ideas — shipping **one tool per branch/PR**, in
this order (field utility first, verification-gated items last):

1. **Airside Load** — `/tools/airside-load.html` *(shipped
   2026-07-11 — see its Shipped entry below)*.
2. **Duct Traverse** — `/tools/duct-traverse.html` *(shipped
   2026-07-11 — see its Shipped entry below)*.
3. **Equipment Airflow Check** — `/tools/equipment-airflow.html`
   *(shipped 2026-07-11 — see its Shipped entry below; owner
   blessed bands 350/400/500 and the stages-or-% mode select)*.
4. **Coil Freeze Risk** — `/tools/coil-freeze-risk.html` *(shipped
   2026-07-11 — see its Shipped entry below; owner picked
   diagnostic-first framing and the user-set freezestat-setpoint top
   band edge)*.
5. **Minimum Outdoor Air (62.1)** — `/tools/minimum-outdoor-air.html`
   *(shipped 2026-07-11 — see its Shipped entry below; owner picked
   the draft-10 preset list and the "ASHRAE 62.1-2022" edition stamp;
   the Rp/Ra sign-off gate rides the PR review before merge)*.
6. **Duct Sizer** — `/tools/duct-sizer.html` *(shipped 2026-07-11 —
   see its Shipped entry below; the queue's last item, closing the
   buildout)*.

Deferred with the queue: airflow.html's tracked metric-VP-tab and
density-correction-row markers stay parked (owner call 2026-07-11).
Full scoping detail (inputs, math, risks, per-tool cross-link plans)
lives in the 2026-07-11 planning round; each tool gets a brief
re-plan at build time.

### BACnet Vendor ID lookup — tool *(shipped 2026-07-08, buildout PR 3)*
*One question: whose device is this — the number a discovery log, a
property sheet, or a Wireshark I-Am decode shows as
`Vendor_Identifier` (property 120), resolved to a manufacturer.*

`/tools/bacnet-vendor-ids.html` — decode box (seeded 260) over the
full ASHRAE registry rendered as one filterable `.ref-table-dense` at
build time. Decisions worth remembering:

- **Scripted import, never hand-transcribed.** `npm run
  import-vendor-ids` (`.github/scripts/import-bacnet-vendor-ids.mjs`)
  fetches bacnet.org, validates (ascending unique ids, id 0 = ASHRAE,
  count floor, the seven reserved holds), and regenerates
  `html/_data/bacnetVendorIds.js`. The build never fetches; the
  checked-in snapshot + its `retrieved` date are the freshness
  contract. Re-running the import IS the maintenance story — the
  provenance ref-note under the table and the beyond-snapshot decode
  state both template from the module, so a refresh updates
  everything at once. The registry markup has a missing `</tr>` in
  the wild (row 1500), so the parser splits on `<tr>` openings.
- **Privacy call:** the registry lists a contact person + mailing
  address per vendor; only id + organization are republished.
- **Escaping contract:** imported org strings are stored
  entity-decoded and render Nunjucks-autoescaped (no `| safe`) — the
  opposite of the site-authored `bacnetEnums.js`. External data never
  gets `| safe`.
- **No DefinedTermSet** — a 1,600-term JSON-LD node is head bloat with
  no rich-result payoff; the page carries FAQPage +
  SoftwareApplication + BreadcrumbList instead. The SEO surface is the
  build-time-rendered rows themselves (~35 KB gzipped, the accepted
  cost of full crawlability).
- **Decode box + filter are separate inputs** — exact-ID decode gives
  status semantics a substring filter can't ("260" as a filter also
  matches 1260), and the four pill states (registered / reserved /
  unassigned-gap / beyond-snapshot) each say something a hidden row
  can't.
- If the registry ever triples, revisit chunked `<tbody>` wrappers;
  `content-visibility` on `<tr>` is a spec no-op (size containment
  doesn't apply to internal table boxes), so lean row markup is the
  only mitigation applied.

### BACnet MS/TP — Education page *(shipped 2026-06-10)*
*One question: why do devices fall off an MS/TP trunk — and what do
the token ring, the addressing, and the two wires each need to stay
healthy?*

PR 4 of the mock-call build queue, and the most-validated gap: the
MS/TP audit scenario found both BACnet lessons explicitly deferring
to a page that didn't exist — a tech following those links from the
field found nothing. Ships at `html/education/bacnet-mstp.html`,
prefix `bm-`, Protocols chip (Education All 17→18, Protocols 4→5).

In scope (sections shipped):
- *The token ring* — token passing, Poll-For-Master,
  `Max_Info_Frames` (router wants 10–20, field devices 1), and the
  **`Max_Master` capped-ring silent failure** as the centerpiece.
  SVG #1 (`bm-token-*`): token-walk with MAC 45 greyed outside a
  `Max_Master = 40` boundary, "never polled."
- *Two addresses* — MAC (0–127, per-segment) vs device instance
  (site-wide), the arbitrary pairing, and the duplicate-MAC
  taking-turns-offline symptom (classic after a controller swap
  lands at factory default).
- *The two wires* — daisy-chain only / no star taps, 120 Ω EOL at
  both physical ends only, single-point bias, polarity (and the
  A/B-labels-disagree trap), shield at one end, segment budgets.
  SVG #2 (`bm-term-*`): correct chain with EOLs highlighted, a
  red-crossed star tap. The length/device/baud budget paragraph
  shipped behind placeholder markers; **owner review landed
  2026-06-10** — markers retired, paragraph rewritten to the owner's
  two-tier framing: past the *vendor's* derated figure it *could be*
  a problem, past the *standard's* 4000 ft / 32-unit-load figure it
  *is* a problem (repeater or second segment).
- *Symptom → layer table* — five rows mapping the field complaint
  to ring / addressing / electrical before the meter comes out;
  closes by paying the audit scenario's own case (the extended
  trunk usually breaks several layers at once).

Out of scope (named in closing): the **bus simulator** (still
`[future: bus simulator]` — this page is the lesson half of that
eventual pairing; the wiring sim's NET terminals remain the seam),
transmission-line physics, BACnet/SC.

Build notes:
- **`.bac-svg` consolidation trigger fired** (third BACnet-family
  page): `.bac-svg`/`.mb-svg` moved to a shared
  `BLOCK-AND-BYTE DIAGRAMS` block in `styles.css`; the four per-page
  copies (which had drifted to a 740/760 mix on `.wide`) deleted,
  `.wide` unified at 760. `screenshot-diagrams.mjs` already
  enumerated `svg.bac-svg`.
- Deferral payoffs landed on `bacnet-basics` (two passages),
  `bacnet-networking` (out-of-scope bullet), and
  `controller-wiring` (network paragraph now anchors the lesson
  while keeping the bus-sim deferral as prose); reciprocal
  relatedLinks on both BACnet lessons.
- **Paired practice quiz parked**: `[future:
  practice/bacnet-mstp.html]` *(shipped 2026-07-07)* — parking this
  re-opened the 1:1 lesson↔quiz matrix and the page's "Test yourself"
  group borrowed the BACnet Networking quiz in the interim. The banked
  question material (Max_Master capping, duplicate MAC, EOL placement,
  A/B polarity trap, symptom→layer rows) became the shipped bank, and
  the quizzes group now points at the page's own quiz.

### Control-power electrical tools — Transformer VA Budget + Wire Run / Voltage Drop *(shipped 2026-06-10)*

PR 3 of the mock-call build queue: the panel-retrofit audit scenario
found the wiring *concepts* covered well (phasing rule, commons,
loop power) and the *numbers* absent — "does my 40 VA transformer
have headroom for this actuator?" had no tool anywhere. Two pages,
one PR, new `Electrical` chip at count 2 (All 16→18). Two tools
rather than one tabbed page: each needs its own reference table and
verdict surface, and a combined page would have been the cramped
layout codebase-issues #29 warns about.

**Transformer VA Budget** (`/tools/transformer-sizing.html`, `xf-`):
- **8 fixed device rows** (air-mixing's fixed-rows precedent — no
  dynamic add/remove), name + VA per row, blank rows skipped as
  spares, rows 1–5 seeded with the worked example. Transformer
  select 40/75/96/100/custom.
- Status pill: ok ≤ 80 % / warn 80–100 % / error > 100 %. **Owner
  review landed 2026-06-10**: pill and table-note wording moved to
  the owner's two-tier framing — above 80 % it *could be* a problem,
  above 100 % it *is* a problem.
- Fuse suggestion sized off the **transformer rating**, not the
  connected load (`rating ÷ 24 × 1.25`, rounded up the standard
  ladder) — the rule and the typical-VA sanity table shipped behind
  `// user to verify` placeholder markers; retired 2026-06-10 with
  the owner's review pass.

**Wire Run / Voltage Drop** (`/tools/voltage-drop.html`, `vd-`):
- One signal-type select drives conditional rows (coil-sizing's
  show/hide idiom) instead of three tabs duplicating gauge+length.
- AWG Ω/1000 ft from NEC Ch. 9 Table 8; US-native.
  `[future: metric mm² / Ω-per-km option on voltage-drop.html]`.
- Per-signal verdicts that TEACH: 4-20 mA computes transmitter
  supply margin + max run ("copper costs headroom, not accuracy");
  0-10 V computes the IR drop to show it's millivolts — "suspect
  ground offset or noise, not wire"; sensor mode computes the °F
  lead error for 10K Type II / 1K Balco / Pt100 side by side —
  **slopes finite-differenced live from `THERMISTOR_TYPES` tables**
  (thermistor-data.js loaded as a second consumer), so the tool
  can't drift from the thermistor calculator and the
  same-copper-different-lie asymmetry (~0.02 °F vs ~30 °F) is
  computed, not asserted.

### Field Electrical Quick Calc *(shipped 2026-06-17)*

The third `electrical` tool (`/tools/electrical-quick-calc.html`,
`eq-`, `Electrical` chip 2→3, All 18→19) and the first *multifunction*
one — the bread-and-butter math a controls tech double-checks on a
call, which the two single-purpose electrical tools (VA budget, voltage
drop) deliberately don't touch. One tabbed page (signal-scaling idiom)
rather than four tools: each tab is a few rows, none earns its own
reference surface, and they share the "did I get this right?" framing.
Four tabs, scoped by three independent design lenses converging on the
same set (Ohm's law / AC power / motor; voltage imbalance added by
owner pick), every formula numerically verified before build:

- **Ohm's Law & Power** — the 12-form wheel; enter exactly two of
  V/I/R/P, the other two solve and paint blue + a `· solved` label
  suffix (color-independent cue). Strict two-input rule (over-determined
  mutes) — the recompute-from-last-two-edited UX was considered and
  deferred. DC/resistive scope note points reactive loads to the AC tab.
- **AC Power** — 1φ/3φ line-quantity power triangle; line voltage + PF +
  one of {amps, kW, kVA} → the rest. √3 carried full-precision; voltage
  inputs labeled line-to-line with the 208/240/480 hint (the field's #1
  √3 mistake). No pill — deterministic algebra. *(fix 2026-07-11)* The
  original UI implemented "one of {amps, kW, kVA}" as a **"Solve from"**
  selector feeding a single shared input, defaulting to line current —
  which read as "solve *for* line current" and, because that made current
  a required-then-echoed input, muted every output until a current was
  typed (so "calculate line current" appeared broken). Replaced with
  three optional magnitude inputs (`eq-ac-i-in` / `eq-ac-kw-in` /
  `eq-ac-kva-in`) and an exactly-one gate, mirroring the Ohm's-Law tab's
  fill-in-what-you-know pattern — leave current blank, enter kW/kVA, and
  it solves back to amps. The documented design ("one of the three → the
  rest") was always the intent; only the selector implementation forced
  the misread. Same PR folded in two cosmetic audit findings: the AC
  voltage label is now phase-aware (`Vₗ (L-L)` for 3φ, `Vₗ (L-N)` for
  1φ, via `eq-ac-vl-label`), and the Ohm's-Law `iv` guard distinguishes
  a true 0/0 entry ("0 V and 0 A … don't define a resistance") from an
  open circuit (V present, I = 0) rather than always claiming a voltage
  is present.
- **Motor HP / kW / FLA** — HP↔kW + an FLA *estimate*; the
  always-visible "estimate only — size off NEC 430.250/430.248, not this
  number" disclaimer is the load-bearing content. Optional measured-amps
  field drives the only verdict pill on the tab (meas ÷ estimate). PF/η
  shown as editable assumptions; η accepts 0–1 or a percent.
- **Voltage Imbalance** — NEMA MG-1: % unbalance from three L-L readings,
  multi-state pill (≤1% ok / 1–5% derate / >5% don't operate). The
  current-unbalance ~6–10× rule of thumb in the reference.
- No global Units toggle / no `data-us` spans / no `cf_*` keys (matches
  the sibling electrical tools; privacy.html untouched). NEC FLC table
  verified all-correct by the UX-audit data-research pass and its
  `// user to verify` markers cleared (`9626f8b`, 2026-06-20,
  merged to main via #281 on 2026-06-22).
  `[future: voltage imbalance derate
  curve as numeric factors; PF-correction / capacitor-bank sizing tab]`.

### Power & Energy Converter *(shipped 2026-06-19, PR #280)*

Born from a boiler service call: the site's first **general unit
converter**, at `/tools/power-energy-converter.html` (prefix `pe-`,
category `hvac`). Three tabs:

- *Convert* — any power **or** energy unit → every equivalent in its
  dimension, live, input row highlighted, copy-all. Units: W·kW·MW,
  BTU/hr, MBH, MMBtu/hr, ton, hp, boiler hp, kcal/hr; J·kJ·MJ·GJ,
  Wh·kWh·MWh, BTU, kBtu, MMBtu, therm, kcal.
- *Power × Time = Energy* — solve-for triangle (E = P·t and both
  rearrangements) with a worked-formula line.
- *Boiler / Burner* — the applied layer that motivated the tool:
  effective turndown (input ÷ min fire), min-fire %, per-boiler ×
  quantity plant total, a Riello `a/b ÷ c` firing-string parser, and
  graded verdict pills (healthy / moderate / poor, plus *incompatible*
  and *oversized* errors).

Design decisions worth remembering: the **BTU-family factors**
(BTU/hr, MBH, ton, boiler hp) all derive from **one constant**
(1 BTU = 1055.05585262 J) so that family can't drift internally —
hp and kcal carry their own defining constants (745.699…, 4186.8);
the **MBH (thousand) vs MMBtu (million)** trap is defused
at the labels and in the parser; and the page is deliberately
**unit-explicit** — it does *not* route through the site-wide Units
toggle (a converter that self-converts would double-convert), so no
`data-us` spans and no `privacy.html` change. Cross-linked both ways
with electrical-quick-calc (the hp↔kW tie), coil-sizing,
waterside-load, transformer-sizing. Adversarial review before ship
caught five fixes (stale readout on hand-edit, descending-band guard,
reference rounding, parser hardening, bridge-result `aria-labelledby`).

### Duct Sizer *(shipped 2026-07-11)*

Tool #6 of the airflow buildout — the last item, closing the queue
(`/tools/duct-sizer.html`, prefix `dz-`, airflow — chips went
Airflow 5→6, All 27→28). v3.39.0. Design notes:

- **Field-first framing, as planned:** the default solve mode is the
  diagnostic direction a cardboard ductulator is clumsy at — duct
  exists, traverse says what it's moving, how hard is it working? —
  with the three classic wheel spins (diameter from friction,
  capacity from a size, diameter from velocity) behind the solve-for
  select. The whole page runs one continuous story: 1,200 CFM found
  in a 12-in. main → 1,529 FPM / 0.26 in/100 ft (≈3× the 0.08
  convention) → wants a 15.3-in. round → a 12-in. was only ever good
  for ~626 CFM → tab 2 continues it: 10 in. of ceiling depth → other
  side 20.2 → sheet-metal 20 × 10 (De 15.2) → the equal-friction ≠
  equal-velocity gotcha lands on the same numbers (863 vs 952 FPM).
- **First airflow-family engine file:** the pure math lives in
  `/scripts/duct-engine.js` (Altshul-Tsal + the two bisection solvers
  + Huebscher both ways), not in the page IIFE — because a pure-Node
  vm spec (`tests/duct-engine.spec.js`, the psychro-engine pattern)
  can then sweep published-chart anchors (12 in @ 1000 FPM → 0.12;
  Huebscher table rows 20×10/12×12/30×12/8×8/24×18), monotonicity,
  round-trips, and refusal edges — verification DOM tests can't do
  cheaply. Snapping, mute messages, and formula lines stay on the
  page per the engine convention.
- **Solvers refuse instead of pinning:** unreachable targets (a
  million CFM at 0.08; De 3 with a 10-in. side) return NaN from the
  engine and a teaching mute on the page — never a silently clamped
  bound. Re < 4000 mutes as "not real duct flow" (the fit is
  turbulent-only); friction below 0.005 displays "< 0.01" rather
  than a broken-looking "0.00".
- **Damage-stakes 2b (in scope — Tier 2):** initial lean was
  out-of-scope ("sizing guidance, no direct damage chain") but the
  forward-curved-blower ride-out chain is real and field-classic —
  oversizing drops resistance, the wheel rides out its curve, the
  motor overloads (the "why did it trip after we cleaned the
  filters" story) — and undersizing drives static toward the duct
  high-limit. The scope note ships in the shared `.tool-body-row`
  (both tabs see it) with an affinity-laws inline anchor.
- **Near-miss caught at reciprocal-wiring time:** the lesson at
  `education/balancing.html` is *hydronic* balancing — an air
  "rebalancing" anchor and a relatedLinks row pointed at it were
  removed before commit. Reciprocity landed on 8 hosts: airflow,
  duct-traverse, airside-load, equipment-airflow, the
  duct-static-control and vav-systems lessons, and both their
  quizzes.
- **US-native with the m/s ride-along** (the duct-traverse posture,
  no units-toggle participation — codebase-issues #152's extraction
  trigger still hasn't fired). Velocity/friction guidance
  (0.08–0.10 in/100 ft; mains ~1,000–1,500 FPM, branches ~600–900)
  ships as prose "conventions, loosely held" — soft trade guidance,
  deliberately not a verdict pill, and not placeholder-marked (band
  prose, not a data table). `[future: SI ductulator mode]` (carried
  from the queue item). `[future: fitting equivalent-length helper]`
  — the shared row names fittings as the static that this page
  deliberately doesn't price.
- **Adversarial ship-review (11 agents: 3 dimensions → 2 skeptics per
  finding):** 3 confirmed, all fixed pre-PR. The keeper: a mutation
  test proved the engine spec never pinned the low-f′ correction —
  deleting `f = 0.85f′ + 0.0028` passed every chart anchor (the
  ±0.01 chart tolerance is loosest exactly where the correction is
  active), silently reading large-duct friction 6–12 % low; two
  tight corrected-region anchors (60 in @ 1500 dp100, 36 in @ 2000
  f) now kill that mutant. Also fixed: the optional rect-tab
  velocity comparison printed "Infinity FPM" when a sub-inch duct
  snapped its area to 0.00 (isFinite guard); and the methodology
  attribution was inverted in three places — the ASHRAE chart is
  computed from Colebrook (Wright 1945), Altshul-Tsal (1989) is the
  closed-form fit offered *in place of* it, not the fit the chart
  "is drawn from". Conventions and integration dimensions came back
  clean.

### Minimum Outdoor Air calculator *(shipped 2026-07-11)*

Tool #5 of the airflow buildout (`/tools/minimum-outdoor-air.html`,
prefix `vo-`, airflow — chips went Airflow 4→5, All 26→27). v3.38.0.
Design notes:

- **Owner gates (2026-07-11):** the draft-10 preset list (office,
  conference, classroom 9+, lecture, retail, dining, health club,
  lobby, corridor [area-only], break room) and the explicit
  **"ASHRAE 62.1-2022, Table 6-1" edition stamp** in visible prose
  (over citing the IMC or a vague no-edition phrasing). The queue's
  one data gate — **owner sign-off on the shipped Rp/Ra rows** —
  rides the PR review before merge; the rows carry placeholder-verify
  comments in both the visible table and the JS `PRESETS` map until
  then. Defensibility posture unchanged from planning: the same
  values are adopted verbatim into public mechanical codes
  (IMC Table 403.3.1.1).
- **The teaching spine is the split.** Per-person (Rp × Pz) and
  per-area (Ra × Az) render as separate output rows because that IS
  the DCV argument: CO₂ can prove the people left, not that the
  carpet did — a DCV reset trims the per-person share only, and the
  per-area share is the floor under it. The seed (1,500 ft² office,
  12 people, 1,200 CFM) lands 60 + 90 = 150 cfm → 12.5 % OA and was
  chosen so the floor outweighs the people AND the honest answer
  undercuts the folkloric 20 % minimum position.
- **Damper % ≠ flow %** stated in the worked example: 12.5 % is a
  flow fraction, proven by airflow station or traverse, not a blade
  angle. Keeps the tool from blessing "command the damper to 12.5".
- **Preset-populates-editable-inputs is a new pattern** (no prior
  on-site select writes into editable fields): selecting a category
  seeds Rp/Ra via `tidy()`, hand-editing either flips the select to
  Custom. No persistence — unlike `cf_rf_refrigerant` there's no
  re-select-every-visit pain (the office default is the common
  case), so no new `cf_*` key and no privacy.html change.
- **Ez as a select** (1.0 cooling / 0.8 ceiling heating / 1.2
  displacement / custom) with the Table 6-2 mini-table and the
  short-circuiting story tied back to the air-handlers lesson's
  stratification prose. Custom Ez validates > 0 with a teaching mute.
- **%OA is optional and honest:** blank Vpz hides the row (neutral
  pill asks for it); Vpz ≤ 0 gets its own message without muting the
  breathing-zone math; > 100 % is an error whose fix is "more supply
  air, not damper position."
- **US-native** (the duct-traverse posture): 62.1's IP edition and
  this market's schedules are cfm/ft². The `PRESETS` map carries
  `rpSI`/`raSI` twins from day one; `[future: L/s mode]`. Notably
  this means codebase-issues #152's "next units-toggle tool triggers
  the rewriteInput extraction" did NOT fire here — copy #9 is still
  unwritten.
- **Single-zone only**, stated in the preamble and the About card —
  multi-zone Ev/critical-zone math is real work, not a row.
  `[future: multi-zone Ev]` `[future: education/ventilation-dcv.html]`
  (the DCV split row is the seed of that lesson).
- **Adversarial-review record (19 agents):** 7 confirmed findings,
  all fixed pre-PR. The big one flipped a design call: I'd judged the
  page outside the damage-stakes convention ("under-ventilation is a
  health stake, not equipment damage") and two dimensions
  independently overturned it — the %OA output feeds winter
  minimum-position settings, which is economizer-ratio's Tier-2
  freeze chain — so the About card now ends with the scope note
  ("the ventilation floor and the freeze floor both bind"). Also
  caught: the Ez table rows dropped Table 6-2's conditions (the
  floor-jet 1.0 credit read as an escape from the ≥15 °F 0.8 row —
  qualifiers folded in, wrong-direction risk since Ez=1.0 vs 0.8
  under-delivers OA by 20 %); a mis-attributed stratification
  cross-reference (the story lives in vav-systems' reheat cap, not
  air-handlers — re-anchored); the formula line printed raw rate ×
  count products that a .05-tie could round away from (now sums the
  two displayed shares, which close by construction); air-handlers'
  20 %-mixing example silently equated damper position with flow
  fraction (given a building-pressure-style parenthetical, since the
  file was already in the diff); and the one missing reciprocal
  (practice/air-handlers).

### Damage-stakes scope notes — the cross-tool disclaimer convention *(shipped 2026-07-11)*

Owner call right after coil-freeze-risk merged: any tool that risks
equipment damage if improperly implemented should say plainly what it
is — good for checking whether a theory is logical, as a learning
tool, and as a secondary verification method — and what it isn't
(the protection). Owner picked per-tool notes as a recorded
convention over a universal line on the tools landing (both were
offered): search deep-links skip the landing, so a landing-only line
is invisible to most visitors, and a note on all 26 tools would
dilute it on pages with no damage stakes.

A full-tool-list sweep put the set at eight pages, tiered:

- **Tier 1 — the page's whole point is a damage-protection verdict:**
  coil-freeze-risk (burst coils), equipment-airflow (iced coil /
  cracked heat exchanger), refrigerant-pt (mischarge → slugged
  compressor).
- **Tier 2 — the output directly feeds a damage-relevant action:**
  air-mixing and economizer-ratio (both feed freeze decisions),
  affinity-laws (cube-law power on a speed *increase* → overloaded
  motor — its tail taught the slow-down energy case and never
  mentioned that 10 % over asks for 33 % more power),
  transformer-sizing (the suggested-fuse row), and — added by its own
  ship-review the same day — minimum-outdoor-air (its %OA output is a
  winter minimum-position source; a dense-occupancy floor of 30–50 %
  OA is the coil-freeze chain, the same reason economizer-ratio
  qualified). duct-sizer joined at its own build the same day, note
  shipped from day one: an undersized run drives static toward the
  duct high-limit's territory, and an *oversized* one on a
  forward-curved wheel rides out the fan curve into motor-overload
  amps — the affinity-laws chain approached from the resistance side
  instead of the speed side.
- **Already compliant:** electrical-quick-calc — its permanent
  "Estimate only — not a code value… never this number"
  failure-callout plus the worked example's "size off the table
  value" close are stronger than the convention's note; a third
  repetition would be noise.
- **Judged out of scope** (measurement math; the damage chain runs
  through other tools that carry the note): airflow, duct-traverse,
  dew-point-calculator.

Shape: a final `p.ref-note` with a `<strong>` lead-in as the last
content in the page's last `.tool-card` — the established caveat
register, zero new CSS, and the class's `border-top` gives the
footnote seam for free. On tabbed pages (air-mixing,
economizer-ratio, affinity-laws) it's a `.tool-body-row` *sibling*
of the panes so both tabs show it. Wording is page-tailored around a
recognizable spine (theory check / learning aid / second opinion;
the hardware and the manufacturer's data govern) — never copy-pasted
boilerplate. Convention recorded in CLAUDE.md (*Conventions* bullet +
*Adding a new tool* step 2b).

*Extended to a simulator (2026-07-15):* the refrigerant-loop sim
(`/simulators/refrigerant-loop.html`) is the first non-tool to carry
the note. It depicts equipment whose *starvation* damages it — a coil
starved of airflow ices solid and slugs the compressor — so its last
`.tool-card` ends with a page-tailored `p.ref-note` naming the real
protections (low-pressure cutout, freeze-stat, high-pressure switch,
and the manufacturer's charging chart). Same spine, sim-flavoured:
don't diagnose a charge or a freeze off a directional toy. Added to
the CLAUDE.md "Current set" list.

### Coil Freeze Risk Checker *(shipped 2026-07-11)*

Tool #4 of the airflow buildout (`/tools/coil-freeze-risk.html`,
prefix `cfr-`, **hvac** — the buildout's one non-airflow category;
chips went HVAC 7→8, All 25→26). v3.37.0. Design notes:

- **Owner gates (decided at build start, 2026-07-11):**
  *diagnostic-first framing* — the page opens from the field
  complaint ("the freezestat tripped at 6 AM — was it right?") and
  inputs read like a BAS trend review; and the *user-set freezestat
  setpoint drives the top band edge* (default 38 °F; the 35 °F floor
  and the fluid freeze/burst points sit fixed beneath it). The
  setpoint-as-edge choice bought the tool its best diagnostic line
  free: when MAT lands below the setpoint band, the verdict can say
  "the stat should already have tripped — a fan still running means
  the stat is failed, bypassed, or reading somewhere warmer."
- **Margin + risk-factor verdict, not a physics predictor** (per the
  queue scoping): tube-wall freeze needs coil geometry the field
  never has. MAT (straight weighted average, or entered directly off
  the trend), fluid freeze + burst points, categorical flow state
  (full / modulating low / valve closed / pump off — tube velocity
  isn't computable from GPM without circuiting, so no fake ft/s),
  freezestat presence + setpoint. Overall pill plus flow/steam and
  freezestat factor pills.
- **Freeze vs burst is the teaching spine**: slush flows without
  splitting tubes, so glycol below its freeze point splits into the
  burst-protection case (pump off — warn, "don't push a pump into
  slush") vs operating-below-freeze (error). And glycol protects
  *tubes, not trips* — the trip band is an air-temperature fact, so
  the worked example's glycol paragraph shows the margin opening to
  29.5 °F while the 38 °F stat trips anyway.
- **Band logic escalations kept principled**: plain water + stagnant
  flow (closed/off) in the 32–35 °F band escalates to error via the
  stratification argument (a poorly-mixed cold layer runs 10–20 °F
  below the calculated average); glycol in the same band does NOT
  escalate (fluid margin is real). Sub-freezing water at full proven
  flow reads warn, not error — the designed preheat-coil condition.
  The flat −5 °F stratification penalty was offered and rejected
  (invents precision); stratification is taught in prose and in the
  escalation texts instead.
- **Steam path is rules-verdict + taught mechanism** (nothing numeric
  is honest): throttled modulating valve → sub-atmospheric coil →
  vacuum holds condensate in tubes → sub-freezing air splits them;
  fixes are piping (vacuum breaker, drip leg + generous trap) and
  arrangement (two-position + face-and-bypass), not tuning.
- **Glycol freeze/burst table ships as placeholder-verify data**
  (typical inhibited-glycol chart values, % by volume, EG + PG at
  10–50 %; marked above and below the table). **Verify once, use
  twice**: this is the freeze/burst half of the data waterside-load's
  parked glycol row wants — that row still needs the density/cp
  correction factors, which did NOT ship here (different columns,
  same datasheet session). Prose sends users to the fluid maker's
  chart and a refractometer; the `below −60 °F` chart-edge cells are
  `null` in the JS table and simply can't reach the burst band.
- **Integer-tenths MAT blend** — a new wrinkle on the snap-inputs
  rule: the metric seed lands on an exact .x5 (0.5 × −15 + 0.5 ×
  21.1 = 3.05 °C) and floating-point evaluation order rounds it
  either way, so the blend of 1-dp operands is computed in integer
  tenths with one half-up round. A hand calculation of the printed
  operands now lands on exactly the printed result in both unit
  systems, by construction.
- **Full units-toggle participant** (its hvac siblings air-mixing /
  economizer-ratio set the posture): waterside-load's
  active-system-native solve + `rewriteInput` resync; band edges are
  unit-native constants (35 °F ↔ 1.7 °C, 38 °F ↔ 3.3 °C), so the two
  systems' verdicts agree except within one display-rounding step of
  an edge (accepted, same class as the US/metric constant divergence
  on waterside/airside).
- First glycol content anywhere on the site (recon found zero prior
  mentions in lessons or quiz banks). Reciprocal links landed on
  air-mixing, economizer-ratio, equipment-airflow, waterside-load
  (its water-only ref-note now hands the freeze/burst half of the
  glycol story here, plus a relatedLinks entry), air-handlers +
  economizers lessons (including an inline anchor on the economizers
  freeze-protection passage's "coil-bursting territory"), and the
  air-handlers quiz. sequencing-scenarios' low-limit question keeps
  its lesson `learnMore` (a tool link would displace a better
  teaching target).
- **Adversarial review (2026-07-11, 27 agents) confirmed six
  findings, all fixed pre-PR**: the at-risk band's "only fires once
  ice is already possible" clause was domain-false for stats set
  between the freeze point and 35 °F (now tier-split like the stat
  pill); freeze-band prose said "sub-freezing"/"below" on an
  inclusive `<=` band (now "at or below", matching the burst band's
  edge wording); the steam trip band claimed a stat that a no-stat
  unit doesn't have (now splits like the water ladder); `mute()`'s
  `setPill` class-wipe un-hid the inactive service's factor pill
  (mute now re-applies visibility); and this entry itself claimed a
  waterside-load reciprocal before it existed (link then made real).
  Also folded in from the contested set: exact-setpoint wording
  ("sits exactly at" instead of "clears by 0 °F"), MAT-blend ties
  now round away from zero (toFixed's rule, so negative .x5 metric
  blends match hand math), the protection stack is an `<ol>` (it
  says "roughly in order"), and the freeze-band full-flow text now
  splits HW (preheat-coil condition, warn) from CHW (no heat to
  bring — error).
- `[future: education/coil-freeze-protection.html]` — the lesson this
  tool will eventually pair with; the protection-stack reference row
  is its outline.

### Equipment Airflow Check *(shipped 2026-07-11)*

Queue fill #3 of the **Airflow tools buildout** (Feature ideas
above) and the Airflow chip's fourth entry. Ships at
`/tools/equipment-airflow.html`, prefix `ea-` (All 24→25, Airflow
3→4): two verdict tabs — DX **CFM per active ton** and gas-HX
**temperature-rise window → allowable CFM band** — the site's first
tool whose whole product is a judgment (`.status-pill`) rather than
a number. IP-native like duct-traverse (CFM/ton and °F rise are the
trade's frames); metric only as prose ride-alongs (400 CFM/ton ≈
54 L/s per kW).

Decisions worth remembering:
- **Owner-blessed edges + staging shape (2026-07-11, recorded
  gate):** bands error <350 / warn 350–400 / ok 400–500 (≈450
  nominal in prose) / warn >500; staging entry is a **mode select**
  — Stages (N of M, equal split assumed) or Capacity running (%) —
  the % mode is also where fractional-stage entries get redirected
  ("stages come in whole numbers" teaching mute).
- **Active-ton denominator is the page's crux**: the seed (10-ton,
  stage 1 of 2, 2,400 CFM) deliberately makes the naive read a
  panic (240) and the honest read healthy (480); a "per nameplate
  ton (ignores staging)" contrast row appears only when staging
  discounts capacity, and hides when everything runs.
- **Verdicts band on the DISPLAYED value** (the tidied CFM/ton), so
  pill and readout can never disagree at an edge — the
  displayed-operand policy applied to a verdict, not just a formula.
- **The gas tab's rise window is taught as an airflow band in
  disguise** (max rise → *minimum* CFM; the inversion is stated
  everywhere it appears), and a measured rise doubles as a
  poor-man's flow measurement (two thermometers, no traverse) —
  worked example closes 100 MBH × 80 % → 1,235–2,469 CFM, 44 °F →
  1,684 CFM. Verdict severity is asymmetric on purpose: rise above
  window = limit-trip **error** (immediate safety device), below =
  flue-condensation **warn** (seasons-scale corrosion).
- **The static check is descoped honestly**: a fixed-speed TSP↔CFM
  mapping IS the vendor blower curve; the shared row teaches the
  blower-table field method and links affinity-laws instead of
  faking a tab. `[future: user-entered two-point blower-curve
  interpolation]` if demand shows.
- **Inputs snap to formula-line display precision at parse**
  (capacity 2 dp, CFM 0 dp, percents/rises 1 dp) — the adversarial
  review's confirmed finding set: computing from raw values while
  printing tidied ones let formula rows fail to reproduce
  (50 tons × 33.34 % printed "× 33.3 … = 16.67"), let the gas
  verdict contradict its own printed numbers at a window edge
  (rise 60.04 → red pill saying "60 °F is above the 30–60 window"),
  and let a divisor tidy to 0 and paint "Infinity CFM" inside a
  live pill. One rule fixes all three: snap first, compute only
  from what the reader can see, and mute a zero-snapped divisor.
  The band-edge CFM parentheticals say "against the floor/ceiling"
  rather than strict over/under, because a tiny furnace can round
  the implied flow onto the band edge itself.
- Debts paid: airside-load's `[future: CFM/ton verdict row]` marker
  (its Total-tab prose now links here) and vav-systems' coil-floor
  prose (the 400-CFM/ton mention now links here; the lesson's
  interactive keeps its own scenario thresholds). Reciprocal
  relatedLinks: airside-load, duct-traverse, vav-systems (lesson +
  quiz), equipment-staging (lesson + quiz — the lesson's first
  tools group).

### Duct Traverse calculator *(shipped 2026-07-11)*

Queue fill #2 of the **Airflow tools buildout** (Feature ideas
above) and the Airflow chip's third entry. Ships at
`/tools/duct-traverse.html`, prefix `tr-` (All 23→24, Airflow 2→3):
two tabs — full-grid traverse average and diffuser Ak-factor flow —
built around the one rule the page exists to teach: **root each VP
reading, then average**. mean(√VP) ≤ √(mean VP) whenever the
readings differ (the root is concave), so the wrong order always
reads high.

Decisions worth remembering:
- **Textarea, not N inputs**: a traverse is 25+ points logged in the
  field; paste beats form-filling. Splits on whitespace / commas /
  semicolons so one textarea line per duct row preserves the log's
  shape; a live "N readings" counter sits under it. Page-local
  `.tr-stack` single-column `.ps-row` variant gives the textarea the
  full column (the 38 % label split was built for one-line inputs).
- **`Number()`, not `parseFloat()`, per token** —
  `parseFloat('0.o484')` returns 0 off the leading digit and
  silently swallows a mid-log typo; `Number()` rejects the whole
  token so the per-point mute ("Reading 7 isn't a number") can name
  it. The single-input convention elsewhere stays parseFloat.
- **The order-check line is computed live** against the user's own
  traverse (naive √(mean VP) velocity + % high, chained off
  displayed operands), not just asserted in prose. The seeded 5 × 5
  grid uses perfect-square VPs so the mean root is 0.2164 *exactly*:
  867 FPM honest vs 884 FPM wrong-order — 2 % high, 34 CFM of
  phantom air on one duct. Guarded for near-uniform profiles (the
  pre-ship review's one confirmed finding): the two display-rounded
  chains can tie or invert when the true gap is below rounding, so
  the line switches to an "agree to display precision" phrasing
  rather than printing a negative "% high" under a
  can-only-read-high sentence.
- **A negative reading mutes as plane advice** (flow reversing or
  tumbling — relocate, ~7.5 straight diameters), not a generic
  error. Velocity-type readings (hot-wire / vane) average directly
  and hide the order check — no roots involved, nothing to get
  backwards.
- **Point counts in rules form, no reproduced table**: ≥25 points
  rectangular (5 / 6 / 7 per side at <30 / 30–36 / >36 in.), two
  perpendicular diameters × 6–10 points round; the log-Tchebycheff /
  log-linear position tables stay in ASHRAE 111 and the instrument
  manual (copyright + false-precision risk).
- **Ak back-solve is first-class** (airflow.html's K-calibration
  precedent): hood one diffuser, derive the Ak your instrument
  actually sees, carry it to the identical rest. The worked example
  names the trap — Ak ≠ neck πr² (0.65 vs 0.79 ft², ~20 % high).
- US-native + m/s ride-along, same 4005 and same altitude wording as
  airflow.html (velocity scales 1/√ρ, so "a few percent per
  few-thousand feet" is correct here — unlike the heat constants'
  ~3 %/1,000 ft on airside-load). Debts paid: airflow.html's
  traverse note upgraded to a live link, and the vav-systems entry's
  out-of-scope TAB note finally has a tool to point at. Reciprocal
  relatedLinks landed in the same PR: airflow, airside-load,
  economizer-ratio, the vav-systems / duct-static-control /
  building-pressure lessons, and the vav-systems +
  duct-static-control quizzes.

### Airside Load calculator *(shipped 2026-07-11)*

First fill of the **Airflow tools buildout** queue (see its Feature
ideas section above, opened 2026-07-11) and the Airflow chip's second
entry — the "natural future fills" the airflow-tool entry below
predicted. Ships at
`/tools/airside-load.html` as a three-tab `.tool-body-2col` tool,
prefix `asl-` (All 22→23, Airflow 1→2): the airside twin of
waterside-load, running the pocket-card trio `qs = 1.08 × CFM × ΔT`
/ `ql = 0.68 × CFM × Δgr` / `qt = 4.5 × CFM × Δh`, each solved for
load / airflow / delta. Notably, `1.08` appeared *nowhere* on the
site before this page — no tool, not even prose.

Decisions worth remembering:
- **Tabs, not a mode select**: three sibling equations each get
  waterside-load's proven single-equation pane (solve-for select,
  hidden solved-variable row, per-tab worked example); a Mode select
  stacked over a Solve-for select would be two levels of hidden
  state in one pane, and the tab bar itself teaches the trio. The
  constants/standard-air row is a shared sibling of the panes
  (airflow.html's "where 4005 comes from" pattern). One `MODES`
  config + one `calc(mode)` — not three copies of waterside's calc.
- **Active-unit-system solve with per-system first-class constants**
  (waterside's pattern): US 1.08 / 0.68 / 4.5; metric 0.34 / 0.83 /
  0.33 in W per m³/h·unit — 0.34 is the entrenched European
  ventilation constant, 0.83 and 0.33 are derivation-clean at
  ρ = 1.2 kg/m³, h_fg = 2,500 kJ/kg. Owner call 2026-07-11: the
  trade-rounded set over exact-twin 0.335 / 0.821 / 0.334. The pairs
  disagree ~1–1.5 % by construction; the derivation row says so in
  visible prose.
- **Tons ride the Total tab only** — a ton is 12 MBH of *total*
  heat, and tons on the sensible tab would invite exactly the
  sensible-vs-total confusion the 400 CFM/ton rule exists to fix.
  The sensible tab carries a pointer note instead. Deliberate
  departure from waterside's tons-whenever-load.
- **Δh and Δgr are direct inputs; no psychro-engine** — computing
  air states from DB/RH is coil-sizing's whole job. The boundary is
  stated in the preamble and the shared row ("pocket-card arithmetic
  for when you already hold the deltas"), and staying engine-free
  also skips the #139 engine-guard obligation.
- **425 CFM/ton stays prose**: the Total tab's worked example lands
  at 2000 ÷ 4.7 ≈ 425 CFM/ton and points at the VAV lesson's coil
  floor; the computed verdict row belongs to the queued
  equipment-checks tool. `[future: CFM/ton verdict row —
  equipment-checks tool]` *(shipped 2026-07-11 —
  equipment-airflow.html; the Total-tab prose now links it)*.
- Worked examples run one coil narrative across the three tabs,
  closing with the **waterside handshake** (43.2 MBH at a 12 °F
  water ΔT = 7.2 GPM — the two sides of one coil have to agree) and
  the sensible + latent = total cross-check, rounding reconciliation
  stated. Reciprocal relatedLinks edges landed in the same PR:
  air-handlers + vav-systems lessons, waterside-load, airflow,
  coil-sizing, dew-point-calculator.

### Airflow & Velocity Pressure tool *(shipped 2026-06-10)*

PR 2 of the mock-call build queue, and the **airside-flow category
opener** — the site had air *state* (psychrometrics) thoroughly and
nothing about air *moving*. Ships at `/tools/airflow.html` as a
two-tab `.tool-body-2col` tool, prefix `vp-` (`af-` was already
taken by affinity-laws), new `Airflow` landing chip at count 1
(All 15→16; owner approved the one-entry chip as the declared
category opener — pitot/traverse/fan siblings are natural future
fills).

- **Tab 1 — K-factor flow**, both directions a commissioning tech
  needs: `CFM = K × √VP` forward, and `K = CFM ÷ √VP` back-solved
  from a balancer's hood reading — the calibration move that works
  regardless of whose K convention the paperwork used.
- **Tab 2 — Duct velocity**: `V = 4005 × √VP` (standard air),
  rect/round duct area, CFM. Chained readouts (CFM = displayed V ×
  displayed A) close on displayed values, the metric-rounding-policy
  habit applied to chained rows. A traverse note keeps the one-point
  reading honest.
- **US-native** (valve-cv posture): US K-factors are CFM at
  1.0 in. w.c. — a metric K is a different number on a different
  label — and 4005 is an IP constant. An m/s equivalent row rides
  along (the Kv idiom).
  `[future: metric VP tab on airflow.html — L/s, Pa, V = 1.291·√Pa,
  metric K]` if a metric user asks.
- **Standard-air caveat, not a density row**: an altitude-only
  correction without temperature is half a correction with false
  confidence, and balancing instruments mostly correct internally.
  The shared reference row states the assumption and the error
  direction.
  `[future: density-correction row on airflow.html]` — needs the
  temperature+altitude pair done properly, probably via
  psychro-engine.
- **Teaching mutes**: negative VP mutes with "sensing lines swapped"
  — the actual field meaning of a negative reading — rather than a
  generic validation message.

### Waterside Load calculator *(shipped 2026-06-10)*

PR 1 of the mock-call build queue. Ships at
`/tools/waterside-load.html` as a single-pane `.tool-body-2col` +
worked-example row (valve-cv's shell minus tabs), prefix `wl-`,
Hydronics chip (All 14→15, Hydronics 2→3). Solve-for select covers
load / flow / ΔT; tons ride along when load is the answer.

Decisions worth remembering:
- **Computes in the active unit system with that system's own
  constant** (500 IP, 4.187 metric) — deliberately *not* the
  canonical-IP engine pattern, because the metric rounding policy
  (audit-2026-06 #53) requires the formula line to close on displayed
  operands, and the metric constant is first-class. The two constants
  differ ~0.14 % by construction; each system is internally
  consistent. Unit flips still resync inputs from retained canonical
  values via coil-sizing's `rewriteInput`.
- **Tons derive from the displayed load**, not the unrounded value,
  same policy — a reader's own arithmetic reproduces the row.
- **Water only in v1**, said in visible prose (the refrigerant-pt
  "more correct than the pocket card" posture): the constant bakes in
  water's density and cp, and glycol moves both.
  `[future: glycol correction row in waterside-load.html]` — a fluid
  select (water / 30% PG / 50% PG…) whose factors need
  datasheet-grade verification before shipping.

### Modbus 5-digit address ↔ wire offset converter *(shipped 2026-06-10)*

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (lineup gap + finding #30,
2026-06-10). Neither Modbus tool converts a device-manual address like
43021 into the FC03 offset actually polled — the weekly commissioning
task the Modbus Decoding lesson teaches statically. Two halves, one
pitch:

- **The converter:** a three-field mini-converter (5-digit address ↔
  table ↔ wire offset), most naturally a strip on the Register Viewer,
  with "40001 30001 offset" keywords so the palette dead-end (#30's
  first leg) closes too.
- **The inline trap detection (#30):** the Register Viewer happily
  decodes 40013 typed into its decimal *value* field as 0x9C4D with no
  hint, even though 4xxxx-shaped entries are the exact "5-digit
  register trap" the site teaches. Detect table-prefixed 5-digit
  values (30001–39999 / 40001–49999) and show a one-line non-blocking
  hint ("Looks like a register address — 40013 is holding-table offset
  12 (FC03). See Modbus Decoding.").

Build or just track? Owner's call (Step-3 list, 2026-06 handoff).

**Shipped (2026-06-10):** owner approved the build. Landed as a third
tab on the Register Viewer ("Address ↔ Offset") rather than a strip —
two-way sync between 5-digit address and table+offset, FC readout, a
"why the off-by-one" explainer row, loud failure on the unowned
20001–29999 / 50000+ ranges. The trap hint fires on typed decimal
values in 30001–39999 / 40001–49999 (non-blocking, names table /
offset / FC, links Modbus Decoding); it stays quiet on first paint —
the teaching default 43981 is address-shaped but wasn't typed. The
"40001 30001 offset" keywords had already shipped in the
keyword sweep (#15).

### BACnet Object_Identifier encoder/decoder *(shipped 2026-06-10)*

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (lineup gap, 2026-06-10). Two
lessons teach the 10-bit-type + 22-bit-instance packing in prose;
nothing on the site decodes one. Natural third tab on the BACnet/IP
converter, reusing the bacnet-objects type table. Build or just track?
Owner's call.

**Shipped (2026-06-10):** owner approved the build. Third tab
("Object ID") on the BACnet/IP converter: raw 32-bit value (dec or
0x hex) ⇄ type + instance, two-way; type names mirror the
bacnet-objects reference table (comment in the page marks that table
canonical — update both together), with reserved (31–127) and
vendor-proprietary (128–1023) ranges named; instance 4194303 flagged
as the unassigned/wildcard value; formula line shows the
type × 2²² + instance arithmetic. Default example decodes
0x020004D2 → Device, 1234. Home hero "Latest" badge points here.

### Education-diagram legibility at phone width — per-diagram pass *(opened 2026-07-09, from the phone-overflow sweep)*

The 2026-07 phone-viewport vision audit's one big systemic finding
that the overflow-fix PR deliberately did NOT touch: education-page
SVG diagrams are desktop-proportioned (wide viewBoxes, 9–11-unit
label text), so at 375px they scale uniformly and their annotations
render at ~6–8px equivalent — pinch-zoom territory. Flagged on 12+
pages: bacnet-networking (all schematics), bacnet-mstp (trunk
diagram), metering-devices-txv-eev (TXV/EEV cutaways),
hydronic-loops, load-piping (twin-T comparison), pump-control,
refrigerant-cycle-basics, superheat-subcooling (P-T curve), vfds
(power-stage), controller-wiring, balancing (riser), modbus-decoding
(byte-order), bacnet-basics (device/properties + priority-array). No
information is lost — the audit confirmed the adjacent prose carries
the same facts — so this is a polish arc, not a bug.

A real fix is per-diagram design work, not a CSS sweep: bump SVG
font sizes toward a floor that survives the scale-down, split wide
diagrams into taller phone-friendly variants, or drop secondary
annotations under a media-gated `<text>` class. Do it topic-by-topic
as pages get touched, or as its own audit cycle. *(Codebase-issues
#147 — the fixed-geometry label collisions originally batched into
this arc — went first on its own: closed 2026-07-11 by the site-wide
label-collision pass, 26 fixes across 13 files. The font-size arc
remains open.)*

### Command palette — recents list *(from the 2026-06 audit)*

Cross-filed from `docs/audits/2026-06-extensive/findings.md` (power-user polish, 2026-06-10).
The palette opens empty for a returning user, so every weekly lookup
is retyped. A `cf_palette_recent` last-5 list rendered on open +
Enter-on-empty-goes-to-top would make repeat lookups one keystroke.
(Any new `cf_*` key also gets a privacy.html line.)

### URL state / deep links — should tools be bookmarkable? *(from the 2026-06 audit)*

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #18 (2026-06-10). Zero URL params
site-wide (the `/tools/#cat` chip filter is the lone hash consumer) —
no tool state survives a bookmark or a shared link. Three distinct
layers, only the last is this entry:

1. *Last-entered values* in localStorage — already parked (see the
   controller-commissioner entry's persistence question).
2. *Preset-class enums* (refrigerant, lookup-by mode) under `cf_*` —
   precedent exists (`cf_psy_range`); tracked as codebase-issues #83.
3. *URL-state deep-linking* (`?r=r22`) — genuinely untracked anywhere;
   would make "send a colleague this exact chart" work. This is the
   open design question: which tools, which params, and does the URL
   win over localStorage when both exist?

### Home hero units — which surfaces convert? *(shipped 2026-06-10, PR #235 — everything converts, LCDs included)*

**Shipped 2026-06-10** (PR #235, `units/hero-converts`): the decision
below shipped as written — the whole hero (software-register strings
*and* the device LCDs) now follows the units toggle, and
`home-hero.spec.js`'s "hero converts every surface for a metric visitor"
guards it. The pid-tuner chart y-axis half (codebase-issues #91) landed
in the same PR. The original finding is preserved below as the record.

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #5 (2026-06-10). The hero's
"LIVE AHU-1 supply-air loop" is hard-coded °F everywhere (tree,
readout, slider output, LCD, packet, `aria-valuetext`) — the first
interactive a metric visitor sees ignores their preference. The
right-hand device LCDs could claim the equipment-register/canonical
convention by analogy with the pid-tuner decision, but the
software-register side has no such cover. Decision: route the
software-register strings through `Units.display` (the sim runs on a
canonical °F model — display-boundary change), or extend the canonical
convention to the whole hero and document it. Related: the pid-tuner
chart y-axis question is codebase-issues #91 — settle the
canonical-vs-converted line once, in one place.

### Practice path continuity — landing order, results-card next step, best-score badges *(shipped 2026-06-10)*

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #21 + #22 (2026-06-10, verifier:
low-medium both). Three connected curriculum/UX calls:

- **Landing order (#21):** /practice/ orders the 16 content-quiz
  topics by ship-wave history while /education/ uses the documented
  curriculum sequence (PID 1st vs 13th) — a student's "next card down"
  means different things on each. Suggested: mirror the Education
  order — one canonical sequence.
- **Results-card onward path (#22):** `renderResults()` builds exactly
  one action (Restart); a "Next quiz: <topic> →" link (landing order)
  would close the loop.
- **Best-score badges (#22):** the landing shows no completed/best
  state despite `cf_quiz_<slug>_best` sitting in localStorage; a small
  badge painted at load would let a student grinding 21 quizzes see
  where they stand. (`quiz-section-plan.md`'s hard-nos — accounts,
  leaderboards, server scoring — don't cover this.) Coordinate with
  the best-score semantics question (codebase-issues #89).

**Shipped (2026-06-10):** owner approved all three (results-card link
AND badges, not either/or). One canonical sequence now lives in
`html/_data/quizOrder.js`; the `nextQuiz` filter in `.eleventy.js`
injects each page's `next:` opt into `Quiz.mount` at build time, so
the 21 practice pages can't drift from the data file. The landing's
Content Quizzes grid was hand-reordered to match (comment in
`practice/index.html` points back at quizOrder.js — re-order both
together). The next-link wraps from the last quiz back to the first;
field drills carry no next-link (they sit outside the curriculum).
Badges are painted client-side on the landing from
`cf_quiz_<slug>_best(_total)` — `Best N/M`, brighter when perfect —
honoring the #89 equal-or-longer best-score rule already in the
engine.

### Thermistor calculator — default to Type II? *(decided 2026-06-10: yes — Type II is the default)*

Cross-filed from `docs/audits/2026-06-extensive/findings.md` #29 (2026-06-10, verifier:
low-medium, default choice partly editorial). The type select defaults
to 10K Type III while the tool's own note calls Type 2 "the most
widespread BAS thermistor curve"; the common cold task ("10k Type II
reads 14.2 kΩ") requires changing two controls, and missing the type
select silently gives 61.9 °F instead of 63.1 °F. Decision: default to
10K Type II (matching the note), and/or persist last-used
type+direction (pairs with codebase-issues #83's preset persistence).

**Decided (2026-06-10):** owner picked Type II as the default (one
attribute swap, shipped); last-used persistence also approved and
lands with the #83 preset-persistence batch.

### PID tuner — bump-test → SIMC starting gains *(shipped 2026-07-01, PR #291 — closes UX-audit S-001)*

The audit's last build item: the tuner taught the feel of the knobs and
read them in every platform's parameter style, then explicitly declined
the one thing a working programmer most wants — a defensible starting
point for a real loop. Now a "Starting Gains from a Bump Test" section
below the closing note turns a short manual test (step the output
5–10 %, read dead time θ and time constant τ off the trend) into
conservative PI starting gains, rendered through the existing Parameter
Style selector.

**Owner engineering calls (2026-07-01, do not re-litigate):**

- **Rule: SIMC** (Skogestad 2003) over IMC/lambda and Cohen-Coon —
  the `Ti = min(τ, 4(θ+λ))` cap keeps lag-dominant HVAC loops (zone
  temp, DAT) from the uselessly long integral times plain IMC gives;
  Cohen-Coon is too aggressive for a commission-from-here number.
- **Conservativeness: fixed λ = 3θ** — one defensible default, no
  extra UI, forgiving of rough field-measured τ/θ.
- **Process-gain input: bump-test % form** — ΔCO % and ΔPV as % of
  loop span (K = ΔPV%/ΔCO%), the field-natural shape; the prose
  teaches the span normalization with a dual-stated worked example.

Design details: **rate stays 0** (starting point is PI); the seeded
example (ΔCO 10 %, ΔPV 10 %, τ 120 s, θ 15 s) is arranged to land
exactly on the sim's **Decent PI preset** (Kc 2.0 / reset 0.50), tying
the calculator to the toy loop above it; **signed ΔCO/ΔPV** are both
accepted and the acting-direction note keys on the sign of the *ratio*
— negative process gain (PV against the output) flags **direct-acting**
per the fbe-engine convention. The adversarial review pass earned its
keep here: the first draft said *reverse*-acting for that case
(positive-feedback advice — the exact "PV runs away" failure the page's
own cheat sheet names) and the reviewer caught it against the site's
own docs before ship. θ ≤ 0 mutes with a use-the-sample-interval
pointer instead of silence; gains echo to a debounced sr-only live
region (the metrics-announcer precedent). `[future: a "load these into
the sliders" affordance was considered and skipped — user gains on the
toy process would misread as a simulation of their loop]`

### PID basics — surface direct vs reverse acting? *(idea, noted 2026-07-14)*
*Surfaced by the codebase-issues #154 sim/tool physics diff — an
observation, not a defect: the physics on the page is correct.* The P
callout's only worked example is a **chilled-water valve** (PV above SP,
valve opens as error grows — a cooling / direct-acting loop), while every
mini-sim and the engine (`e = SP − pv`, presets start below SP) is a
**heating / reverse-acting** loop. Both are right in isolation, but the
page never names the direct/reverse distinction, so a careful reader can
be briefly thrown that the example's valve opens as PV *rises* while Sim 1
drives *up* from below. The full tuner's Symptom→Move cheat sheet even
lists "flip acting (direct ↔ reverse)" — a control the engine has no
parameter for (it's fixed reverse-acting). Candidate: a one-line aside in
the P callout naming acting direction, or switch the worked example to a
heating valve so it matches the sims. Low priority; the arithmetic is
sound either way.

### PID tuner — live process visualization + tune-it-blind spoiler *(shipped 2026-06-08)*
*The interactive home hero sells a live loop, then links to the tuner —
which by contrast drew a **static** step-response chart and showed none
of the gear the loop drives. Make the tuner show the process, make the
process changeable, and turn it into a practice tool for tuning gut-feel.*

**Replay playhead, not a second sim.** Kept the analytic step-response
chart (and its overshoot/settling/offset metrics) and added a time
cursor that sweeps it on a ~7 s wall-clock loop, restarting on every
tuning change. The cursor draws on a **separate overlay `<canvas>`** over
`#pid-canvas` (a no-padding `.pid-canvas-stack` gives them a shared 0,0
origin) — redrawing the whole chart each frame would re-run
`getComputedStyle` + restroke 601 points for a line and a dot. The
overlay can't recompute `Y()` (the chart's y-range is data-fit), so
`drawPidChart` now stamps `canvas._pidGeom` and the overlay reads it.
One rAF for the whole feature (cursor + equipment), cancel-before-
reschedule so a slider drag can't stack loops; reduced-motion snaps to
the settled frame and never schedules.

**Engine exposes `u`/`uEff`.** `simulatePid` already computed the
commanded output and its dead-time-delayed form; now it returns both.
The actuator tracks `u` (it moves immediately); PV (driven by `uEff`)
lags by the dead time — so dead time becomes something you *watch* (the
valve slams, the sensor barely stirs), not just a number. Backward-
compatible: the pid-basics mini-sims ignore the extra fields.

**Equipment leads; loop speed is a spoiler.** The Process Type selector
became **Equipment** (`2-way valve · discharge-air temp`, `VAV damper ·
duct static`, `Radiator · space temp`, `Reheat coil · long duct run`),
τ/dead numbers stripped out. Those, plus the Loop Speed Reference and the
Symptom → Move cheat sheet, now sit behind a default-collapsed
`<details>` "Reveal loop details (spoiler)". The live scene, the chart,
and the metrics stay outside the gate — they're feedback on *your*
tuning, not the answer key. So you can pick a radiator, try to tame it by
feel, then reveal that it's a slow loop and see why aggressive gain rang
it. Engine keys (fast/med/slow/vhigh) are unchanged, so the relabel
doesn't touch presets or value-based tests.

**Four scenes, mostly reused art.** Each equipment swaps a bespoke SVG
scene (controller output gauge → actuator → process → sensor LCD,
feedback line beneath), reusing the equipment-register device faces
(`.device` / `.lcd` / `.gauge.eq`) and the existing 5-blade `.widget-fan`,
bowtie valve, and coil. The **damper** is the one symbol drawn fresh
(blades rotate 0–90° with `u`). The vhigh "long run" spreads the flow
particles to dramatize transport delay.

**Decisions worth remembering:**
- *FlowEngine density tracks `u` in coarse bands, not per frame* —
  changing density needs `refreshPath`, which restitches the particle
  pool (a visible flicker); per-frame would churn. Quantized to a few
  bands; per-frame liveliness lives in the cheap actuator transforms.
- *Hidden scenes report zero-length SVG paths* — a `display:none` SVG's
  `getTotalLength()` is 0, so FlowEngine skips it; pools are (re)built
  lazily after a scene is un-hidden.
- *Sensor LCD stays in canonical units* (°F / in. w.c.). The unit-aware
  converters (`formatPidDelta`) are delta-only; the device face is
  illustrative, so the rigorously unit-toggled value stays the
  Steady-State Error metric.
- *Reduced-motion test gotcha* — `test.use({ reducedMotion: 'reduce' })`
  didn't reach `matchMedia` in this runner; `page.emulateMedia(…)` before
  `goto` does. (Playwright forces `no-preference` by default, so the
  motion-on tests need no emulation.)

**Future:** a *mystery / randomize* practice mode (hide the equipment
too, randomize which dynamics back it, score the tune) would push the
gut-feel angle further; an `IntersectionObserver` could pause the rAF
when the strip scrolls out of view (deferred — it's a compact,
usually-in-view region).

### Time-to-answer — search, nav dropdowns, interactive hero *(shipped 2026-06-08)*
*One question: after the v3 "seam" hero redesign, how fast can someone
actually GET to the tool they came for — and does the home page read as
a reliable field tool or as marketing fluff?*

The redesign buried the fast path: the live loop sat above the headline
and above every tool link (~600px to the first one), and a passive
animation over the tools risks reading as fluff to a no-nonsense
engineer. Site-wide, browse-only discovery (nav → landing → grid →
tool) only gets slower as the catalog grows. Three levers, three PRs:

**1. Command palette (#193).** `/` or Ctrl/⌘-K (or a nav button) opens
a fuzzy search over every page — one keystroke to anywhere, the durable
answer as the catalog grows. Index is a build-time
`/search-index.json` (`search-index.njk` ← `searchPages`), fetched once
and ranked client-side in `search.js`; no Worker change. Optional
`keywords` frontmatter feeds field synonyms (`4-20mA`, `NTC`, `CRC`).

**2. Nav dropdowns + mobile hamburger (#194).** Tools / Simulators /
Education drop to direct links (built from `navTools`/etc collections +
the `cleanTitle`/`canonicalPath` filters) so any page is one click from
anywhere — disclosure buttons, **not** CSS-hover, since hover dies on
keyboard + touch. On mobile the flat flex-wrap nav was **52% of an S25
screen**; it now collapses behind a hamburger (~8%), with the search
icon kept in the top bar (the palette is the fast path, so collapsing
the nav doesn't cost reach). Hard-won mobile fixes, all in *Gotchas*
now: search-in-top-bar via a second icon button (the labelled one
wrapped the desktop bar); a height-capped sheet with internal scroll
(sticky nav taller than the viewport scrolled the *page* behind it);
`flex-wrap: nowrap` (a capped wrapping column broke into a second
column → sideways scroll); explicit `overflow-x: hidden`.

**3. Interactive hero (#195).** A quick-tools strip leads the hero
(top-4 tools, above the fold). The AHU loop now **auto-demos until the
visitor grabs the setpoint slider, then chases their target** — the
"I don't have time → huh, fun, bookmark it" conversion for the skeptic,
with `Open the full PID Tuner →` to the real sim. The slider lives
outside the `aria-hidden` stage, self-announces via `aria-valuetext`,
and works under reduced-motion. Stage-1's redundant "Most-Reached-For"
cards became **Tools by Category** (HVAC / Protocols / Signals /
Hydronics) that deep-link to `/tools/#<cat>`, reusing the landing's
hash-driven filter chips.

**The reframe that made it cohere:** solving discovery *globally*
(search + dropdowns) de-risked the hero — it no longer has to be the
only fast path, so the loop stays as a premise-seller, just now a
playable one. Personas: the skeptic and the returning power user both
want substance-first (served by the strip + search); the curious
browser wants the premise sold (served by the now-playable loop).

### Practice section — quizzes + field drills *(v1 shipped 2026-05-25)*
*One question: how does someone using the site as a self-paced course
know what they actually absorbed, and how do techs prepping for
interviews / certs get a free no-login drill site?*

Sixth top-level nav lane at `/practice/`. Closes the Education loop
with active recall (read a page → quiz yourself on its gotchas) and
opens a new audience lane (techs studying for interviews, BAS Pro,
journeyman exams). Full planning doc with rationale + the v2/v3
roadmap lives in `quiz-section-plan.md` at the root; this entry is
the friction-doc graduating note.

**v1 ships:**
- **Engine** at `html/scripts/quiz-engine.js` — classic script
  exposing `window.Quiz` with `Quiz.mount(target, questions, opts)`.
  Page provides an empty `<div>` + a `const questions = [...]`
  array; the engine owns every DOM node inside the mount target
  (settings row, progress, prompt, choices/numeric, reveal panel,
  results card). Schema covers `mcq` / `tf` / `gotcha` / `numeric`;
  validated on mount with a single `console.warn` on bad input.
  ARIA radio pattern on choice lists (`aria-checked`, not
  `aria-pressed`); `aria-live="polite"` reveal panel built in a
  `DocumentFragment` so screen readers announce once per submit.
- **Landing** at `/practice/` — two `<h2>` sections (Content
  Quizzes / Field Drills) with a topic chip row above. Chips
  collapse both grids into a flat filtered view; `[All]` restores
  the sectioned layout. Field-drill cards use `category: 'field'`
  (no chip) so they hide under any topic chip.
- **Modbus Decoding quiz** — content quiz, 10 questions exercising
  MCQ + T/F + spot-the-gotcha + numeric in one drill (densest
  gotcha set on the site — chosen to validate all four formats on
  the first quiz).
- **Surviving Your First Months** — field drill, 10-question
  sampler for techs in their first months. Replaced the
  empty-state placeholder so the section ships populated. Topic
  is intentionally broad; may be retired once more specialized
  drills (Field Wiring & Sensors, Sequencing Scenarios, Junior
  Interview Prep) land.

**Design decisions that landed:**
- *Single nav lane, not two* — "Practice" covers both quizzes and
  drills; the landing carries the disambiguation.
- *"Practice" over "Drills"/"Quizzes"* — softer label that covers
  both inner categories without label/content mismatch. URL is
  `/practice/`.
- *Two-section landing with chip refinement* — visual headings make
  the scope difference obvious to a first-time visitor; chips give
  returning visitors topic-filter ergonomics.
- *Amber section accent* — `--amber-dim` / `--amber-glow` triple
  added to `:root`; `.nav-card--practice` follows the existing
  `.nav-card--{section}` pattern.
- *localStorage* — per the site-wide `cf_<feature>_<key>`
  convention: `cf_quiz_<slug>_{best,best_total,best_time_ms,attempts,last_iso}`.
  Quiet failure in private mode. No in-progress save/restore in
  v1; refresh = restart. Mid-quiz setting changes surface a
  "Restart to apply" notice rather than silently reshuffling.
- *Cross-link path* — extended `related-links.njk` macro with a
  fourth optional `quizzes` group rendered as "Test yourself"
  after lessons. Education pages opt in by adding a `quizzes:`
  array to their `relatedLinks()` call (Modbus Decoding lesson
  did this in v1).
- *Stable anchor ids on lesson `<h2>`s* — added to
  `modbus-decoding.html` (`five-digit-trap`, `signed-vs-unsigned`,
  `byte-order`, `scaling`) and `modbus-basics.html`
  (`function-codes`, `exceptions`) so the quiz's per-question
  `learnMore` deep-links land in the right section.
- *nav-card.njk macro extended* — `section: 'practice'` maps to
  prefix word `QUIZ` and status pill `GO`.

**v2 batch shipped 2026-05-29/30** (three PRs):
- Protocol content quizzes — Modbus Basics, BACnet Basics, BACnet
  Networking (joining the v1 Modbus Decoding quiz). New `BACnet`
  topic chip.
- Hydronics content quizzes — Pump Control, Hydronic Loops, Load
  Piping, Hydronic Balancing. New `Hydronics` topic chip.
- Controller Swap field drill — self-contained (no paired lesson),
  hardware + software coverage of replacing a DDC controller.
- All paired lessons gained `pairedQuiz` + a "Test yourself" group,
  and the `<h2>` anchors their `learnMore` deep-links needed.

**Content-quiz matrix completed 2026-06-05** (three PRs — the v3
content-quiz arm): the remaining eight lessons gained paired quizzes,
so all 16 Education pages now have a 1:1 Practice quiz. Refrigeration
(Refrigerant Cycle Basics, Superheat & Subcooling, TXVs vs. EEVs;
new `Refrigeration` chip), Controls & Logic (PID Basics, VFDs,
Function Blocks; new `Controls` chip), and Air & Pumps (Psychrometrics
Basics → new `Psychrometrics` chip; Equipment Staging → joined the
`Hydronics` chip). Each ships the reciprocal FAQPage / `hasPart` /
`isPartOf` JSON-LD off the paired frontmatter, and added the `<h2>`
(or P/I/D callout) anchors its `learnMore` deep-links needed. Topic
chips are now All(21) · Modbus · BACnet · Hydronics(5) ·
Refrigeration(3) · Controls(3) · Psychrometrics(1).

**Three specialized field drills shipped 2026-06-05** (PR #178):
Field Wiring & Sensors, Sequencing Scenarios, and Troubleshooting —
each a 10-question bank in the field-drill mold (no paired lesson,
inline explanations, `learnMore` only to pages that exist,
`category: 'field'` so the cards hide under any topic chip). All chip
count went 18 → 21; no new topic chips (field drills add none). The
Field Drills section now holds five cards (First Months, Controller
Swap, + these three).

> **Friction — the field-card count is hard-coded in the smoke test.**
> `tests/smoke.spec.js`'s "practice landing — Modbus chip collapses
> sections" test asserts a literal field-card count (two `toHaveCount`
> sites, bumped `2 → 5` in PR #178). It's derived from nothing, so the
> next field drill silently fails that test until the number is bumped
> again. Cheap to fix when it bites (search the test for the count);
> noted here so the next drill author expects it. Not worth
> auto-deriving today — the count rarely changes and the explicit
> number doubles as a "did you remember to add the card" check.

**Practice gained a nav dropdown 2026-06-14** (mobile-nav polish PR):
Practice was the one hub lane left as a bare nav link while Tools /
Simulators / Education dropped down to their child pages. It's now a
`.nav-item--has-menu` fed by a new `navPractice` collection (the shared
`navSection` helper), so all four hub lanes behave the same; Contact
stays a plain link (single page). The same PR fixed the mobile
hamburger sheet — the touch-floor `justify-content: center` was
centering the full-width Home / Practice / Contact links while the
dropdown rows read left-aligned — and tidied the sheet into a separated
list with the caret pushed to each row's right edge. Bumped the
`machine-sweep` dropdown-count assertion 3 → 4.

**Cascading category dropdowns 2026-06-14** (follow-up PR): the flat
dropdowns (Tools 18 / Education 18 / Practice 21) became *expandable
categories* — each section's menu now shows its category rows (HVAC,
Protocols, …) that click-expand their pages inline, collapsing the long
scan. Chosen over hover fly-outs (clumsy on touch, against nav-menu.js's
no-hover stance) and flat grouped-headings (doesn't shorten the list).
Mechanics: a `category` frontmatter on every tools/education/practice
page (the bucket), `NAV_CATEGORIES` order+labels + a `navGroups` filter +
a `navCategoryGuard` build check in `.eleventy.js`, a `nav-dropdown.njk`
macro (grouped vs. flat), and a second disclosure level in nav-menu.js
(one category open at a time; Escape steps category → section). The
four hand-written dropdown blocks collapsed into the one macro.
Simulators (5 items, no categories) stays flat. *Friction:* category
lives in **two** places — page frontmatter (nav) and the landing's
`navCard()` call (chips) — with no build tie; logged in
`codebase-issues.md`.

**Still parked for v3** (full detail in `quiz-section-plan.md`):
- Remaining field drills (Commissioning, Tridium / EBO quirks, full
  Junior + Senior Interview Prep).
- **Cross-page Mix quizzes (All Protocols, All Hydronics) — now
  unblocked, but deferred 2026-06-10:** 2+ protocol banks and 4
  hydronics banks exist, so the aggregation is buildable — but the
  per-topic quizzes already cover the material and nobody has asked
  for a shuffle mode; the build-time `_data/quiz-banks/` machinery
  isn't worth it on spec. Revisit when a real user asks.
- A **Commissioning education lesson** would give the Controller
  Swap drill (and a future Commissioning drill) a proper parent to
  pair against — today the drill is self-contained by necessity.
- Order-the-steps + identify-on-diagram question formats — both
  schema additions, deferred until a question genuinely needs them.

**Hard nos** (explicit non-goals in `quiz-section-plan.md`):
accounts / leaderboards / server-side scoring / adaptive difficulty
/ spaced repetition / drill-of-the-day / share images / on-site
authoring UI.

`quiz-section-plan.md` stays at the root for now since v2/v3
increments are still active planning; full file moves to
`docs/audits/quiz/` once v3 ships per the doc's own self-direction.

---

### Pump control — Education page *(shipped 2026-05-15)*
*One question: how does the BMS decide what speed reference to send to
a variable-flow pump?*

Lands the third-leg of the variable-flow story (load piping → VFDs →
pump control). The question framing held through drafting; widened
slightly from the friction-file's narrowest version to also touch
constant-speed pumping (one section), pump-curve / system-curve
theory (Widget 1), affinity laws (cross-ref vfds cube law), DP-based
control + sensor placement (pipe-flow diagram), DP setpoint reset
(Widget 2), and a brief lead/lag note that forward-points to a
future sequencing page. User chose the broader "How to control a
pump" framing during scoping; the page held to a single question
because the broader frame still answers *one* question (how),
just with a longer chain of sub-answers.

In scope (sections shipped):
- *Constant-speed pumps — the simplest case* — the foil for the rest
  of the page; DPBV cross-link to load-piping
- *Pump curve and system curve — the operating point* — explainer
  prose + Widget 1 (interactive pump/system curve chart with
  operating-point dot, two sliders, fan icon)
- *How a VFD moves the operating point — affinity laws* —
  cube-law cross-link to vfds page
- *DP-based control — sensor at the far end of the loop* — local DP
  vs. remote DP tradeoff + a pipe-flow diagram (third Education page
  with pipe-flow diagrams; this is the trigger that finally landed
  the `.edu-svg` consolidation in styles.css — see consolidation
  entry below)
- *DP setpoint reset — squeezing the last bit* — most-open-valve
  reset prose + Widget 2 (mode toggle, demand slider, valve cells,
  readouts, deadhead anecdote at demand=0)
- *Lead/lag and parallel pumps — a note* — short forward-link to
  `[future: sequencing.html]`; user explicitly said "sequencing
  should get a lot of attention" so this page deliberately stays
  shallow on it
- *Tying it together* — closing payoff to load-piping + VFDs

Out of scope (forward links, not content):
- Pump staging / lead-lag rotation / end-of-curve protection /
  bumpless transitions — [future: sequencing.html]
- Hydronic balancing — [future: balancing.html] *(shipped 2026-05-16)*
  (reachable from load-piping)
- Open-loop systems with static head (cooling towers, sumps) —
  brief mention only; full treatment belongs to a different page
- Specific pump-controller manufacturer parameter trees — keeps the
  cross-manufacturer pattern, same scope discipline as the VFDs page

**Two interactive widgets — Education-page idiom holds.** Per the
"both" answer at scoping. Widget 1 (operating-point chart) introduces
the concept; Widget 2 (DP-reset simulation) is the practitioner pay-
off. Two widgets on one page is a lot, but PID Basics ships three
mini-sims, so there's precedent. The widgets share the visual
vocabulary established by the d3 injection-pump widget on
hydronic-loops and the run/speed widget on vfds: recessed
`--surface-3` background, mono section labels, blue readouts, fan
icon for "the drive is energising something." Class prefix `pc-w-`
inline on the page, mirroring the `vfd-w-` naming used on vfds.

**Widget 1 — operating-point chart.** SVG-based chart (not canvas
this time — the chart is small, the polylines are short, and SVG
layered cleanly with the static axes/legend without a per-frame
redraw cost). Sliders for pump speed (0–60 Hz, matching the VFDs
widget) and valve openness (10–100%). Math is intentionally simple
and recorded inline in the page script: pump curve as a downward
parabola scaled by speed-ratio² per affinity laws, system curve
as a parabola through origin steepening as valves close, operating
point at the analytic intersection. Reference pump curve at 60 Hz
stays drawn as a faded dashed line so the speed scaling reads
visually. Numbers chosen so the design point lands at exactly
(100 GPM, 50 ft) — easy to verify in the readouts and easy to
sanity-check against intuition.

**Widget 2 — DP setpoint reset.** Demand slider drives flow; mode
toggle picks Fixed DP vs. Reset DP; five identical valve cells
visualize valve openness; readouts show DP setpoint, pump Hz, flow,
power-vs-full. Uniform-load model — all five valves at the same
opening — simplifies the reset story (in real systems with
non-uniform demand the reset advantage is even more dramatic).
Approximate physics: pipe-friction coefficient sized so design
operating point matches Widget 1, DP setpoint either fixed at 25 ft
or walked linearly down to a 5 ft floor in reset mode, pump Hz
inverted from the pump curve and clamped to a 10 Hz minimum (real
VFD parameter). Recorded inline in the script for the next reader.

**Deadhead anecdote — extreme-state reward.** Same pattern as the d3
0 Hz failure-state and the vfds widget's classic-mistake reveal. The
trigger here is demand = 0% (slider all the way down) — all valves
closed, nowhere for water to go. The reveal callout is a short prose
description of the deadhead failure mode followed by the user's
own war story (deadheaded a pump on a loop with all 2-way valves,
caught it because they were standing in the mechanical room and the
noise was unmistakable). Frames the rest of the page's content as
"this control story is what protects against this." Same pinned-
once-shown semantic as the other anecdotes — yanking it back on the
next slider tweak would be petty.

**`.edu-svg` consolidation — finally landed.** The load-piping
friction entry called out the *next* Education page with pipe-flow
diagrams as the trigger to fold `.hd-svg` + `.lp-svg` into a shared
`.edu-svg` rule in `styles.css`. The vfds page deferred the trigger
because its diagrams were structurally different (no `data-flow`,
no dashed-return override). Pump-control's Section 5 has a pipe-
flow diagram, so the trigger fired:

- New `.edu-svg` + `.edu-legend` block in `styles.css`, plus the
  `@media screen { svg.flow-active [data-flow="return"] }` override
  that previously lived inline on hydronic-loops and load-piping.
- `hydronic-loops.html` and `load-piping.html` retrofitted: inline
  style blocks shrunk to a one-line "moved to styles.css" comment
  plus the page-specific d3-widget styles for hydronic-loops; class
  attributes swapped from `hd-svg` / `hd-legend` and
  `lp-svg` / `lp-legend` to `edu-svg` / `edu-legend`.
- Smoke-test selectors updated to match (`svg.hd-svg` /
  `svg.lp-svg` → `svg.edu-svg`).
- Pump-control uses `.edu-svg` from day one for its Section 5
  pipe-flow diagram. Widget-internal SVG (the pump-curve chart in
  Widget 1, the fan icons) intentionally stay outside `.edu-svg` —
  the rule is for pipe-flow schematics specifically, not for any
  SVG on an Education page.

The block-diagram-style `.vfd-svg` on vfds.html stays separate, per
the rule recorded in the vfds friction entry (different shape:
no supply/return, no `data-flow`, no dashed-return override). The
`.edu-svg` family is for pipe-flow diagrams; `.vfd-svg` is for the
VFDs page's structural diagrams; future page-specific diagram
classes can follow either precedent depending on what they're
drawing.

**Forward-link debts this page incurred:**
- `equipment-staging.html` — the lead/lag note. **Paid 2026-05-21.**
  The note's plain-prose "a dedicated sequencing lesson will land
  here when it ships" is now a live link to the equipment-staging
  page (staging up/down + lead/lag rotation). The user's flag that
  sequencing should get real attention held — staging got a full
  page with two widgets, and this page stayed deliberately shallow
  on it so it didn't pre-cover ground.
- `[future: sequencing.html]` (the closing) — **partly paid.** The
  closing's staging mention now links to equipment-staging.html;
  the rest of the broader sequence layer — setpoint reset against
  outside-air temperature, mode transitions, morning warm-up —
  stays plain-prose forward-link for future pages.
- `[future: balancing.html]` *(shipped 2026-05-16)* — not directly forward-linked from
  pump-control (the load-piping page already carries the link),
  but worth noting that pump-control's "DP setpoint reset assumes
  uniform demand" caveat would tie back to the balancing page if
  both ship.

**Forward-link payoffs landed:**
- `vfds.html` closing was previously plain prose ("A pump-control
  lesson will land here when it ships. Forward-link, breadcrumb
  dropped."). Updated to an active anchor pointing at the new page.
- `load-piping.html` two-way section's reference to the variable-
  speed pump still anchors at vfds.html (which then forward-links
  to pump-control); intentionally not retargeted, since load-
  piping's hook is "what pump goes here?" → vfds (the equipment),
  and pump-control is the next-step. The two-page chain reads
  correctly.

### Equipment staging — Education page *(shipped 2026-05-21)*
*One question: when a plant has several identical units, how does the
BMS decide how many to run, and which ones?*

The first **sequencing** page. `sequencing.html` had been a `[future:]`
target since pump-control shipped; the friction file flagged the topic
as deliberately broad (staging, lead/lag rotation, end-of-curve
protection, bumpless mode changes, OAT/setpoint reset, morning warm-up),
and the one-question-per-page rule won't carry all of that. Per the
scope rule's item 4, a *function* like staging is its own page — so
this page is scoped to staging + lead/lag only, and named
`equipment-staging.html` rather than claiming the broad
`sequencing.html` slug. The remaining sequencing topics keep their
`[future:]` markers for later pages.

Worked example: parallel **pumps** (chosen with the user during
scoping), continuing the variable-flow story (load-piping → vfds →
pump-control → balancing) and paying pump-control's lead/lag
forward-link debt directly. One sentence notes the logic is identical
for boilers and chillers.

In scope (sections shipped):
- *Why a plant runs several identical units* — the foil: the turndown
  limits of one pump, N+1 redundancy. Static parallel-pump schematic.
- *Staging up and down — how many to run* — the demand signal, the
  stage-up / stage-down thresholds, the deadband between them
  (anti-hunting), stage-delay timers, minimum-stage-time /
  anti-short-cycle. Widget 1.
- *Lead/lag and rotation — which ones* — lead/lag designation,
  runtime-equalized rotation, standby exercise, failure promotion.
  Widget 2.
- *Tying it together* — pays the pump-control debt; forward-points (as
  plain prose) to the still-future reset / modes / warm-up pages.

Out of scope (forward links, not content):
- Setpoint / OAT reset, mode transitions, optimal / morning warm-up
  start, bumpless transitions — [future: sequencing page(s)]
- End-of-curve protection / deadhead — covered on pump-control;
  linked back, not re-taught
- Manufacturer-specific staging logic — keeps the cross-manufacturer
  discipline of the vfds / pump-control pages
- Chiller / boiler plant-optimization specifics — different systems,
  brief mention only

**Two interactive widgets** (per the user's scoping choice — "two
smaller widgets" over one combined sim). Class prefix `es-` inline on
the page; no styles.css edits — widget internals are page-local, and
the step/reset buttons reuse the shared `.copy-btn`.
- *Widget 1 — staging simulator.* A demand slider drives three pumps;
  stage-up near 90% of online capacity, stage-down with hysteresis
  well below. A stage-delay countdown gates each change; a
  minimum-stage-time lock after a change blocks the next — drag the
  slider fast and the sequence shows a "stage change held" state. The
  100 ms timing loop uses lazy start/stop (codebase-issues #1) so it
  doesn't spin idle.
- *Widget 2 — runtime equalization.* Step the plant forward a week at
  a time; Fixed-lead pins the lead to P1, Runtime-equalized hands it
  to the lowest-hour pump. Runtime bars + spread readout. The
  discovery-reward callout reveals after 12 fixed-lead weeks (the
  worn-lead-pump consequence) and stays pinned. Written as generic
  prose, not a first-person war story — the user can swap in a
  personal anecdote later if they have one.

The intro schematic is an animated pipe-flow diagram — `.edu-svg` +
`flow-engine.js` + `data-flow` annotations, same idiom as the
load-piping / pump-control diagrams (supply solid, return dashed,
particles walking; suction header + from-system drop walk reversed).
The two widgets are the visual capstones of their own sections.

**Forward-link payoffs landed:**
- pump-control's lead/lag note — the plain-prose "a dedicated
  sequencing lesson will land here" is now a live link to this page.
- pump-control's closing — the staging mention now links here; the
  broader sequence-layer breadcrumb (reset, modes, warm-up) stays
  plain prose.

### VFDs — Education page *(shipped 2026-05-14)*
*One question: what is a VFD, and what does a controls tech need to
know about it?*

The original planning entry framed this as a multi-week project
covering both the explainer and a mock-keypad tool. During scoping
the decision was to keep the page broad (the question is "what is a
VFD" not just "the run/speed gotcha") and accept a long page — same
PID-Basics-style structure of gentle ramp into practitioner depth.
The single-question rule still applied; the in-scope list runs longer
than four items because the foundational sections (block diagram,
cube law) and the practitioner sections (parameter groups, network,
fault codes, bypass) each pay off the same question.

In scope (sections delivered):
- *What a VFD Is* — static block diagram (AC IN → Rectifier → DC Bus
  → Inverter → AC OUT variable), labeled boxes only, no waveforms
  (trusts prose to carry "what variable frequency means")
- *Why Drives Are Everywhere — the Cube Law* — prose + a
  `.callout`-style numbers callout showing 80/70/50/30% speed →
  power scaling
- *Run Command vs. Speed Reference — the centerpiece* — explainer
  prose + the page's interactive widget (see below)
- *The Parameter Groups Every Drive Has* — six `.callout` cards
  (motor data, ramps, references/sources, run/stop sources, I/O,
  faults) — one card per group, ALL-CAPS sub-titles, worked
  per-group commentary
- *Network Integration* — small `.ref-table` comparing Modbus RTU /
  BACnet MS/TP / BACnet/IP plus an inline list of the four points a
  BMS reads or writes (run cmd, speed ref, run status, actual Hz);
  inline cross-links to the BACnet/IP converter and Modbus register
  viewer
- *Fault Codes — the Conceptual Categories* — small `.ref-table`
  with six categories (overcurrent, overvoltage, undervoltage,
  ground fault, motor overload, drive overtemp), each with "what's
  happening" and "usual cause"
- *Bypass Arrangements* — short prose + a static SVG of the
  three-position selector topology (LINE IN → selector → either
  through-DRIVE or direct → MOTOR)
- *Tying It Back to Load Piping* — closing payoff section paying
  off the forward-link from `load-piping.html#two-way`; introduces
  the natural follow-up on pump-control as `[future:
  pump-control.html]` *(shipped 2026-05-15)*

Out of scope (forward links, not content):
- The keypad-and-parameter-tree story — own tool, see Mock VFD
  interface entry below
- Pump-control / DP-setpoint reset / pump curves — [future:
  pump-control.html] *(shipped 2026-05-15)*
- Specific manufacturer parameter numbers / keypad menu trees — the
  site's angle is the cross-manufacturer pattern; the friction file
  resists this as scope creep
- V/Hz curves, vector control, slip compensation — electrical /
  motor-engineering side, not the controls surface

**Tie-back to load piping landed correctly.** The original forward-
link from `load-piping.html:155` was a `<a href="/education/
vfds.html">variable-speed pump</a>` reference; the new page's
closing section pays it off explicitly with the inverse framing
("on load piping we set up the variable-flow picture from the load
side ... this page is the pump side of that picture"). User chose
"both opening hook + closing payoff" during scoping; the opening
hero paragraph anchors the page in load-piping's setup and the
closing section ties off the loop.

**Run/speed source widget — interactive centerpiece.** A three-by-
three matrix (three source values × three command surfaces). The
user picks Run Source and Speed Source from dropdowns, then attempts
a run from each of the three command surfaces (keypad RUN/STOP
buttons, terminal DI Open/Closed toggle, network Send BACnet
RUN/STOP). The status panel narrates which command was accepted and
which was ignored. Same idiom as the PID-Basics mini-sims and the
hydronic-loops twin-T injection-pump widget — interactive doesn't
only live in Tools.

**Fan animation — visual handle for "the drive is energising
something."** Five-blade SVG fan in the widget status panel,
clockwise rotation. Rate is proportional to the active speed
reference (60 Hz ⇒ ~1 rev/sec); slider moves while running and the
blades visibly speed up or slow down. Blades brighten from
`--blue-cool` to `--blue` when the drive is running, matching the
"active = blue, dim = blue-cool" palette used elsewhere. Honours
`prefers-reduced-motion` (engine short-circuits; colour change
still communicates state). Driven by `setInterval(40 ms)` writing
the rotate transform attribute on the parent `<g>` — CSS-driven
animation would have been simpler but changing animation-duration
mid-animation makes the angle jump on every slider tick. Visual
speed scale picked for *readability*, not realism — a real fan at
60 Hz is invisibly fast; this animation tops out at 1 rev/sec
because the goal is "you can see it spinning," not "this is
accurate." Chosen as cube-law equipment to tie the visual to the
energy-savings story higher up the page.

**Hidden anecdote — the "classic mistake" reveal.** Same Easter-egg
pattern as the d3 widget's failure-state reveal on hydronic-loops.
Trigger: configure run-source = TERMINALS and speed-source =
NETWORK, then press "Send BACnet RUN" with the DI still open. The
state stays STOPPED (correct behavior) and a `.vfd-w-anecdote`
callout appears below with a war-story paragraph about losing an
afternoon to exactly this configuration. Once revealed in a session
it stays pinned — yanking it back on the next slider tweak would
be petty.

**Inputs and styling vocabulary.** Three source-select rows + a
single speed-reference slider (labeled per the active speed source;
single value, source-name follows the dropdown). Three command-
surface rows below for keypad / terminals / network. Same `--surface
-3` recessed background as the d3 widget. Status panel + reserved
anecdote space at the bottom. CSS class prefix `vfd-w-` inline on
the page.

**Diagram CSS decision — defer the `.edu-svg` consolidation.** The
load-piping friction entry flagged the third Education page with
diagrams as the trigger to fold `.hd-svg` + `.lp-svg` into a shared
`.edu-svg` rule. The VFDs page does have diagrams but they are
*structurally different* — no pipes, no `data-flow`, no dashed-
return override, no particle engine. A minimal `.vfd-svg` class
inlined on the page does the job; folding it in with the pipe-
diagram rules would import irrelevant baggage. The consolidation
trigger now belongs to the *next pipe-flow Education page*, not
just the next page with diagrams. Recorded so the rule reads
correctly when someone next reaches for it.

**Forward-link debts this page incurred:**
- `[future: pump-control.html]` *(shipped 2026-05-15 — and it does
  tie back)* — referenced in the closing tie-back as the natural
  follow-up for "how the BMS decides what speed reference to send."
- `/simulators/vfd-mock.html` — explicit CTA at the end of the page,
  paid off by the Mock VFD interface entry below.

### Mock VFD interface — tool *(shipped 2026-05-15)*
*One question: what does it feel like to navigate a drive's
parameter tree from the keypad, and what gets ignored when the
source parameters don't agree?*

The friction-file scope discipline ("~10–15 parameters in 3–4
groups, generic interface, minimal motor response, no faults in
v1") held. Final shape: 13 parameters in 4 groups, generic
keypad UI, linear-ramp motor model.

**Layout — two-column on desktop, stacks on mobile.** Keypad +
display on the left, motor response readouts + external inputs
panel on the right. Parameter reference table sits below the
simulator grid. Custom layout, not the `.tool-body-3col` Input/
Output/Reference pattern — same precedent as the PID tuner page,
which also keeps its own stacked layout for its simulator body.
The 3-col pattern doesn't fit a keypad-driven tool any better
than it fit a step-response simulator.

**Display — hybrid LCD: light recessed panel with fixed 20×4
character grid.** Site-on-brand palette (`--surface-3` recessed
background, `--text-bright` mono text, hairline `--border`), but
constrained to exactly 20 mono-character columns × 4 lines via a
`width: 20ch` inner div and `white-space: pre`. The fixed grid
forces drive-style brevity — "RATED VOLT" not "Rated voltage,"
"SRC=TERMS" not "ignored because the run source parameter is set
to TERMINALS." Same affordance a real drive's hardware LCD gives
you. Dark-LCD aesthetic was offered but the on-brand recessed
panel won the readability tradeoff while still feeling drive-y
through the grid constraint.

**Keypad — 7 buttons:** ▲ UP, ▼ DOWN, ↵ ENT, × ESC, ▶ RUN
(styled in `--blue`), ■ STOP, ⇄ L/R (spans two columns to
balance the 4-wide grid). Flat site-style chrome on the buttons
themselves — the drive-keypad feel lives in the LCD grid and the
layout, not in mimicking dark plastic. Real drives' STOP keys are
red; the site's `--red` is reserved for fault/alarm state, so
STOP stays on the neutral text colour. Mouse-clickable only;
keyboard shortcuts would be nice but aren't in v1.

**Parameter tree — 13 params × 4 groups:**
- *Motor Data*: M01 Rated FLA, M02 Rated voltage, M03 Rated
  frequency, M04 Rated speed (RPM)
- *Ramps*: R01 Accel time, R02 Decel time
- *Sources*: S01 Run command source (KEYPAD/TERMINALS/NETWORK),
  S02 Speed reference source, S03 Minimum frequency, S04 Maximum
  frequency
- *I/O*: I01 Keypad speed setpoint, I02 Preset speed 1 (decorative
  — exists for tree-navigation realism, not wired into the
  simulation), I03 DI1 function

Each parameter has a short `lcd` ALL-CAPS name (≤11 chars to fit
the "EDIT PNN XYZ" header) and a long `name` for the reference
table. Numerics carry `{ value, unit, step, min, max }`; enums
carry `{ value: index, options: [labels] }`.

**Motor model — linear ramp using R01/R02.** No V/Hz curve, no
slip, no current limit. `state.actualHz` moves toward `target` at
`rated_freq / accel_time` Hz/s when accelerating and `rated_freq /
decel_time` Hz/s when decelerating. Tick every 50 ms. The friction
file scope said "just enough to make accel/decel feel like they do
something"; this matches that exactly. Resisted the temptation to
add overcurrent, regen-brake, or torque limits.

**LOCAL/REMOTE — universal override semantic.** LOCAL mode forces
the drive to ignore both source parameters (S01 and S02) and run
from the keypad: RUN starts it, STOP stops it, speed reference
comes from I01. REMOTE is the default and is what the rest of the
parameter tree actually configures. Pressing L/R drops both run
latches (keypad and network) so the user doesn't get confused
about "why is it still running?" after the override changes.

**RUN/STOP/L-R always return to HOME.** A small UX fix discovered
during smoke-testing: if the user pressed RUN while navigating a
parameter menu, the IGNORED-flash overwrote the L/R indicator in
the menu header. Cleaner fix: pressing an operate key (RUN, STOP,
L/R) returns the navigation to HOME mode, so the flash lands on
line 4 of the home screen where the user expects "what just
happened" feedback. Real drives behave this way too.

**Keypad STOP can't reach a hardwired DI.** Pressing keypad STOP
clears the keypad-run and network-run latches but does not change
the terminal DI state. If the drive is running because S01 =
TERMINALS and the DI is closed, keypad STOP shows the flash
"STOP IGN: DI HW" — you can't open a hardwired contact from the
keypad. A small but real teaching point preserved in the model.

**Preset chips — same idiom as the d3 widget and the VFDs
Education-page widget.** Four `Try this:` links above the
simulator pre-set the source parameters and LOCAL state to a
named configuration: factory defaults (run=TERMINALS,
speed=NETWORK, REMOTE), keypad commissioning (all KEYPAD, LOCAL),
BAS auto (all NETWORK, REMOTE), the classic mistake (run=TERMS,
speed=NETWORK, REMOTE).

**External inputs panel — contextual visibility.** All three
external surfaces are always present (terminal DI toggle, network
RUN/STOP buttons, external speed slider), but the rows fade to
35% opacity when the configured source parameters aren't
listening to them. They remain operable — the external world is
still asserting them — they're just not what the drive is acting
on. Matches what a real installation looks like (you can keep
toggling the DI even when the drive isn't using it; nothing
unplugs).

**Cube-law and pump-control content stays in the Education page,
not here.** This tool is a parameter-tree navigation trainer.
Adding cube-law demos or DP-setpoint reset sequences would push
it back toward a drive-engineering trainer, which the friction
file explicitly rejects.

**Resist scope creep — validated.** v1 deliberately omitted:
- Fault simulation (friction-file scope said v1 = no faults).
- V/Hz curves, slip comp, current limits.
- Multiple DIs, AIs, AO/DO assignment editing (one DI, one
  external speed input).
- Drive auto-tune.
- Multi-protocol network simulation (one "network" button, not
  separate BACnet vs. Modbus surfaces).
- Keyboard shortcuts for the keypad (clickable buttons only).
- Persistence (state resets on reload).

Any of these can be revisited if the tool gets used and one
specifically comes up as friction. Until then the friction-file
"feels like a drive keypad, not replaces one" rule holds.

**Future synergy** (preserved from the original planning entry).
The PID tuner already simulates a control loop; this tool
simulates a VFD. Eventually a combined demo where the PID loop's
output drives the VFD's frequency reference (pressure control
sequence: PID controls duct static, output → VFD frequency ref →
fan speed) would tie a lot together. Not v1, not v2; the two
engines staying standalone keeps that door open. If it happens,
the integration point is `setExternalSpeedHz()` on the VFD mock
and a new "external write" sink on the PID tuner.

**Face-symmetry fix + full equipment dress-up *(2026-06-12)*.**
The user flagged the device face as asymmetrical — the keypad
(321px) jutted out past the LCD (214px), both left-aligned, and a
latent bug made the "20×4" LCD render as a portrait slab:
`white-space: pre` sat on `.vfdm-lcd-inner`, so the markup's
newline text nodes between the four line spans rendered as
phantom blank lines (359px tall instead of ~148px). Fixes, all in
the page: `pre` moved to the line spans (whitespace-only inline
content between block boxes drops out); the LCD became the
device's width-setter with the keypad on `repeat(4, 1fr)` so it
stretches flush (display and keys share one width, like a real
face); LCD font bumped to 1.2rem for presence. The dress-up
adopted the rest of the equipment register: `.device-tb` titlebar
(comm LED + generic `CF-MOCK 100` badge) and a `.dev-leds` row
(RUN green / LOC amber / FAULT off — no fault model yet) replacing
the hand-rolled `.vfdm-localrem` dot. The pedagogically
load-bearing mode sentence ("REMOTE — drive follows configured
sources") moved outside the bezel as `p.vfdm-mode-note` (a device
face has LEDs, not sentences) — and it MUST stay outside: its
max-content width exceeds the LCD's and would silently become the
shrink-wrapped face's width-setter. The dial-arc ("pure visual
flare" twin of the gauge bar) was removed with the user's sign-off
to rebalance the columns. This supersedes the "hybrid LCD /
flat site-style keypad" decisions above — the face is now fully
equipment-register.


### Refrigerant cycle — Education section, possibly with calculator *(parked 2026-05-29 — revisit when the topic is next picked up)*

**Parked 2026-05-29.** The user is happy with where the refrigerant
section sits. Shipped so far: the P-T / superheat tool
(`/tools/refrigerant-pt.html`) and three Education pages
(`refrigerant-cycle-basics.html`, `superheat-subcooling.html`,
`metering-devices-txv-eev.html`). Everything still open below — the
optional "Refrigerants and their pressures" page, the parked data
follow-ups (R-32 entry, bonus blends R-448A / R-507A / R-422D /
R-407F), and the possible refrigerant-cycle animation sharing
saturation math — is parked until the topic is revisited. Detail
preserved below.

The refrigerant side is where everyone in HVAC has a fuzzy grasp and
few have a clear one — especially controls people, who tend to treat
it as someone else's problem until they're staring at a low-suction
alarm and don't know whether to trust the sensor. The vapor-compression
cycle isn't actually that hard; it's just that nobody walks you through
it end-to-end with the controls-relevant pieces emphasized. I messed
with the TXV on my window unit thinking it was a RaT sensor — the
suction-line bulb plus capillary tube does look the part if you've
never seen one explained — and I know controls guys decades in who'd
make the same mistake. That's the credibility hook for this content:
name the things people actually trip on, including the look-alikes.

**Rough Education scope** (multiple pages, not one mega-page):

- **Refrigerant cycle basics** — the four components (compressor,
  condenser, metering device, evaporator), high side vs. low side,
  what each does and why. The pressure-temperature relationship for
  saturated refrigerant is the load-bearing concept; it's what makes
  every other measurement meaningful.
- **Superheat and subcooling** — the two measurements that prove a
  cycle is running right. What they are (vapor warmer than its
  saturation temp, liquid cooler than its saturation temp), what
  abnormal readings mean (low superheat → liquid floodback risk,
  high superheat → starved evaporator, low subcooling → undercharge
  or restriction, etc.), and how the BMS-visible sensors fit:
  suction temp + suction pressure → superheat; liquid temp + liquid
  pressure → subcooling.
- **TXVs vs. EEVs — the metering devices.** TXV mechanical loop: bulb
  senses suction temp, diaphragm balances bulb pressure vs. evaporator
  pressure vs. spring, modulates flow to hold superheat. EEV: same
  job, stepper-driven, commanded by the unit controller or BMS — which
  is the surface controls people actually interact with. The
  TXV-as-RaT-sensor anecdote lives here.
- Optional later: **refrigerants and their pressures** — common ones
  (R-410A on its way out, R-32 and R-454B as the A2L successors,
  R-134a still common in centrifugal chillers), glide on blends, why
  R-22 retrofits get weird.

**Tool potential — P-T / superheat calculator.** The most-asked-for
refrigerant calculation in the field: given refrigerant + pressure,
get saturation temperature; given pressure + measured line temp, get
superheat or subcooling. Fits the calculator-tool pattern (3-col,
single purpose). Refrigerant select + high/low side + temperature
input + result. Detail to get right: glide on non-azeotropic blends.
R-410A is near-azeotropic so single-temp is fine; R-407C has ~10°F
glide and needs bubble vs. dew handled correctly, or the calculator
will quietly be a few degrees wrong on the systems where being right
matters most. Worth shipping later than ship-with-bugs — this is a
tool whose job is to be more correct than a pocket P-T card, not less.

**P-T / superheat tool — shipped 2026-05-21.** Ships at
`/tools/refrigerant-pt.html` as a two-tab `.tool-body-2col` tool
(page-id prefix `rf-`), the calculator half of this idea; the
Education pages above stay future work (no forward-links, since the
target pages don't exist yet).

Decisions settled during scoping:
- *Two tabs* — P-T (saturation) with a Pressure ↔ Temperature
  "look up by" toggle, and Superheat / Subcooling with a Suction /
  Liquid line toggle. Suction → superheat off the dew point; liquid
  → subcooling off the bubble point — the same procedure printed on
  a manufacturer P-T chart.
- *Gauge pressure (psig / kPa-gauge)* — matches manifold gauges and
  the source charts. Canonical internal unit is psig, not psia: the
  source charts are psig and the input is psig, so no absolute-
  pressure conversion is needed. The site Units `pressure` quantity
  is a pure scale (1 psi = 6.89476 kPa) so it converts psig ↔
  kPa-gauge unchanged; only the suffix label is overridden ('psig' /
  'kPa', not `U.suffix.pressure`'s 'psia' / 'kPa').
- *Always show bubble + dew* on the P-T tab, with the glide between
  them — glide is visible by default, not hidden until a blend is
  picked. Pure refrigerants show the two equal.
- *Number + caveated guidance* on the SH/SC verdict — the pill names
  the likely fault direction (low superheat → floodback, high →
  starved evaporator, etc.) but states plainly that the target is
  system- and metering-device-specific.

Data — `html/scripts/refrigerant-data.js`, a transcribed-table data
file in the `thermistor-data.js` mould (one global,
`REFRIGERANT_TYPES`; raw tables normalized to bubble/dew curves in a
load-time IIFE). v1 covers six refrigerants: R-410A, R-22, R-134a,
R-407C, R-404A, R-454B. **The data is transcribed, not modeled** —
every row is keyed off a published manufacturer P-T chart (Honeywell
Genetron/Solstice for five of them; an iGas chart for R-410A). The
remaining verification step is a row-by-row proofread against the
source PDFs; the smoke suite spot-checks a transcribed R-407C row
(100 psig → 51.1 / 61.6 °F) and the R-410A interpolation.

Out of scope / parked:
- *R-32* — dropped from v1; no good full-range P-T chart sourced yet.
  Slots in as one more data entry when a chart turns up.
- *Bonus refrigerants* — the Honeywell chart also covers R-448A,
  R-507A, R-422D, R-407F and older blends; not added, but each is a
  cheap follow-up data entry.
- *Sourcing lesson* — manufacturer P-T PDFs don't parse via WebFetch
  (binary streams) and chart-site HTML 403s; a *charging* chart
  (subcooling grid) is not a P-T chart and can't substitute. The
  user supplied the source PDFs directly. The PDFs are authoring
  inputs only — deleted before the PR, never committed.

**Open questions for the design chat when this gets closer:**
- The P-T calculator and a future refrigerant-cycle animation might
  share saturation-curve / state-point math. Or not — wait until the
  second piece exists before deciding, same logic as the engines
  question.

### PID tuner — explicit loop speed numbers *(shipped 2026-05-16)*
The original ask was to put concrete time-constant numbers somewhere
the user encounters them *before* picking a Process Type. Done in two
places that now share a single source of truth:

1. **Dropdown options carry τ ranges inline** — `Fast (τ ~5–15 s) —
   e.g. duct static pressure`, `Medium (τ ~30 s – 2 min) — e.g.
   discharge air temp`, `Slow (τ ~2–10 min) — e.g. space temperature`.
   The calibration shows up at the moment of selection, not 800 px
   down the page in the Reference column.
2. **Loop Speed Reference table at the bottom of the Reference column**
   (already in place) shows the same τ ranges + dead-time + fuller
   HVAC examples + the dead-time/τ controllability ratio note.

Numbers match between the two surfaces — if the table is ever
retuned, the dropdown labels should follow. Kept the brief
selector labels short enough that the τ range and one canonical
HVAC example still fit on a single line at the rendered widths.

**Superseded 2026-06-08** by *PID tuner — live process visualization*
(top of file): the dropdown is now equipment-led and the τ numbers
moved behind the loop-details spoiler, so the two surfaces no longer
both carry them — the spoiler's Loop Speed Reference table is the
single source, plus a JS-generated per-equipment τ/dead sidenote.

### BACnet/IP hex ↔ dotted-decimal converter *(shipped)*
EBO displays BACnet/IP device addresses in hex (e.g. `C0A80164`)
instead of the IPv4 form (`192.168.1.100`), so a hex-to-IP converter
was needed every time. Shipped at `/tools/bacnet-ip-converter.html`:
converts both directions, paste hex → dotted decimal and vice versa.
Also handles the optional 2-byte UDP port EBO often appends to the
hex string (default `BAC0` = 47808). Sits under the BACnet category
alongside the BACnet object reference tool (shipped — see below).

**2026-07-07 addendum (BACnet buildout, PR 1).** Each tab gained a
trailing topic `<h2>` + ref-note ("How a BACnet/IP address packs into
hex", "BACnet Object Identifier decoder — 10-bit type, 22-bit
instance"…) to broaden the query surface without touching the
inputs/outputs of a page ranking ~pos 5; the port-reference card's h2
now carries "UDP 47808 (0xBAC0)". The Object ID tab's type-name map
now injects from `html/_data/bacnetEnums.js` at build time — the old
"update both together" comment contract with bacnet-objects is dead.
A `faqs:` block covers the port / Object-ID / wildcard questions.

### BACnet object reference *(shipped)*
The companion the BACnet/IP converter pointed at. A controller, a
packet capture, or a workstation hands you numbers where you want
names — object type 1, property 85, units enum 62. Three tabbed
`.ref-table-dense` tables (the `Object_Type`, `Property_Identifier`,
and a common slice of the `Units` enumerations) sit behind one filter
box that hides non-matching rows across **all three at once** and
writes a live match count into each tab — so a search for `85` from
the Object Types tab still points you at `Property IDs · 1`. Scope:
object types 0–30 plus 54/55/56 (lighting + network-port), with a note
that 31–53 cover access control and the value-object family; the
property list is the common read/override slice; the units tab is the
HVAC slice of the ~200-value enumeration. The data carries
`// user to verify` placeholder markers and a visible caveat, since
enum codes shift by edition and a device may expose vendor extensions.
Sits under Protocols at `/tools/bacnet-objects.html`; cross-linked from
both BACnet lessons. First of the v3.1 tools batch closing the
protocols/hydronics tooling gap.

**2026-07-07 addendum — deepened for SEO (BACnet buildout, PR 1).**
The scope sentence above is stale: coverage is now the **full 0–64
object-type range**, a ~60-property slice, and ~80 units grouped by
domain with field symbols (°C, kW, CFM…). The enum data moved out of
the page into `html/_data/bacnetEnums.js` — one source feeding the
three tables, the converter's Object ID type names, and the new
DefinedTermSet JSON-LD (`termSets:` frontmatter → `definedTermSetJsonLd`
filter). The three tab topics became real `<h2>`s (the searched
phrases previously appeared in no heading), a `faqs:` block landed,
and the `<title>` became "BACnet Object Types & Property IDs
Reference" (h1/nav-card unchanged). The original verify markers were
resolved 2026-05-17; the expansion rows carry **fresh**
`// user to verify` markers in the data module — numbers cross-checked
against the bacnet-stack reference enums, pending owner review.

### Valve Cv sizing *(shipped)*
Hydronics had five education pages and zero tools — the worst
content-to-tooling gap on the site. This is the cluster's first tool.
Two tabs on the property-sheet shell: a `Cv = Q√(SG/ΔP)` solver with a
"solve for" select (Cv / flow / ΔP, hiding whichever quantity is the
output — the signal-scaling custom-row idiom) and a valve-authority
check (`β = ΔP_valve,open ÷ total`) with an ok / marginal / poor
verdict pill mirroring the economizer feasibility line. Kept US-native
(Cv, GPM, psi — Cv's defining units) rather than wiring the global
US/Metric toggle, because the coefficient itself changes name and
meaning across unit systems (Cv vs Kv); instead it carries a permanent
`Kv ≈ 0.865 · Cv` readout. The authority tab is unit-agnostic (a
ratio). Introduces a new **Hydronics** tools chip at
`/tools/valve-cv.html`; cross-linked from Balancing + Load Piping.
Future refinement: metric flow/pressure inputs alongside the Kv
readout, if a metric user asks.

### Valve authority — split to its own page *(shipped 2026-07-07)*
SEO-driven. The 2026-07 Search Console data showed "valve authority"
is the single highest-impression query on the whole site (40 impr) yet
stuck at position 56–69 — because the concept was buried as tab 2 of a
page *titled* "Valve Cv Sizing," so nothing indexable said "valve
authority." The term has no Wikipedia page and no strong free
interactive competitor, so a dedicated `/tools/valve-authority.html`
with an authority-first title / H1 / slug is a near-free rescue.
The page mirrors the β calculator + verdict pill out of valve-cv and
adds the differentiator: a **live installed-characteristic plot** —
inherent equal-% vs. linear ideal vs. the installed curve at the
computed β, drawn from `q(h) = φ / √(β + (1−β)·φ²)` and redrawn on
input, so the curve visibly front-loads as authority drops. First
consumer of the new `faqs:` frontmatter → FAQPage mechanism. valve-cv
keeps its authority quick-check tab and links out to the full page
(Cv page canonical for sizing, authority page for authority — no
cannibalization). Anti-drift note: the β math is duplicated across the
two pages; if it grows, extract to a shared script.

### Pump & fan affinity laws *(shipped)*
The second Hydronics-chip tool, pairing with Pump Control + VFDs.
Scales one operating point (Q, H, P — each optional) by a ratio: by
speed (the VFD case, exact) or by impeller diameter (trim, approximate
for modest cuts of the same casing). Flow ∝ ratio, head ∝ ratio²,
power ∝ ratio³ — the cube on power is the headline, the energy case for
variable-speed pumping. Like valve authority it's pure ratios, so the
tool is unit-agnostic: speeds/diameters take any consistent unit and
Q/H/P pass through in whatever the visitor enters (head ft for pumps,
static pressure in. w.c. for fans, power bhp or kW). One shared calc
factory drives both tabs; the only difference is the ratio's source
field. Tagged "Pumps & Fans" (the tag/category split is already the
norm — Analog I/O vs signals) while sitting under the Hydronics chip.
At `/tools/affinity-laws.html`.

### Modbus function codes & CRC *(shipped)*
Third Protocols tool, completing the protocols side of the v3.x batch
and reusing the BACnet reference's search + tabbed-table pattern. Three
tabs: function codes (1–43, with the dec-vs-hex gotcha — FC 15 = 0x0F,
FC 16 = 0x10 — in plain sight), exception codes (with the FC + 0x80
high-bit rule), and a CRC-16/MODBUS calculator (poly 0xA001, init
0xFFFF) that both builds the append bytes (low byte first) and verifies
a captured frame's trailing two bytes. The shared filter box hides
itself on the CRC tab, which is a calculator rather than a table.
Validated in the smoke suite against the canonical 0x4B37 check value
for "123456789". At `/tools/modbus-functions.html`; cross-linked from
both Modbus lessons.

### Equipment Staging Sequencer — 4th simulator *(shipped 2026-06-06)*
The last page of the v3.x batch and the simulators wing's missing
category: plant **sequencing**. Spins the demo-only logic from the
Equipment Staging *lesson* (two hard-coded widgets — staging up/down,
fixed-vs-equalized rotation) into one configurable, continuously
running plant. Custom stacked layout (like the PID tuner / VFD mock),
prefix `stg-`, at `/simulators/staging-sequencer.html`.

What it adds over the lesson:
- **A live sim clock + day-load curve.** A single clock advances while
  playing (adjustable sim-hours/sec, Play/Pause/Reset). Demand follows
  a smooth 24-hour load curve (one mid-afternoon peak) by default, or a
  Manual toggle hands the demand slider to the operator. Per-unit
  runtime accrues in sim-hours as it runs, so staging *and* rotation
  play out hands-free.
- **Two deliberate changes when porting the lesson math.** (1) Timers
  run on the *sim* clock (sim-seconds), not `Date.now()`, so the speed
  slider makes the stage delay / minimum-stage-time observable.
  (2) Thresholds generalize to any unit count via per-unit load
  `L = d·N/k`: add a unit when `d > U·k/N`, drop one when
  `d < D·(k−1)/N`. `D < U` is enforced — that gap *is* the deadband and
  provably stops re-stage hunting in either direction. Defaults U=85 /
  D=45 reproduce the lesson's 3-pump behavior.
- **A live trend chart** (canvas, not SVG — so out of the
  `screenshot-diagrams` SVG audit, same as the PID tuner) plotting
  demand (blue) vs. online staged capacity (green step) over the
  scrolling window, plus a `role="log"` **event log** of every
  stage/rotate/fault move — the feature that makes it a simulator, not
  a lesson widget.
- **Three rotation strategies** (Fixed / Runtime-equalized / Scheduled
  weekly auto-rotate), **fault injection** ("Trip lead" → promote a
  standby, faulted unit locked out until cleared; a capacity-shortfall
  banner when redundancy is exhausted — the N+1 lesson), and
  **configurable 2–4 units** + a cosmetic type label
  (pumps/boilers/chillers).
- **Reduced motion:** starts paused on a seeded static day rather than
  auto-playing ambient motion; Play is always user-initiated.

Cross-linked reciprocally with the Equipment Staging lesson (plain
`relatedLinks` both ways — `head.njk` emits pairing JSON-LD only for
quiz↔lesson, not sims). Smoke spec spot-checks a stage-up event.
Possible future refinement: a standby-exercise timer (run an idle unit
briefly on a schedule), which the lesson mentions but the sim doesn't
model yet.

**Unit cards became equipment-register devices *(2026-06-12)*.** Part
of a "sims are where fun-and-flashy lives" visual pass (alongside the
VFD-mock face fix and the FBE live-wire animation). The flat software
panels (text state + plain runtime bar) are now mini device faces
built entirely from shared classes — `.device` shell, status `.led`
(green run / off standby / blinking red `.led--alarm` fault), a
compact one-row `.lcd` hour meter, and a `.gauge.eq` dot-matrix
runtime bar. Pumps/boilers/chillers are hardware, so this is the
register's intended use; the cards now read like a row of starter
panels. Page CSS only lays out internals; face/LED/LCD/gauge texture
all come from `styles.css`. The `unitCells` cached-element render
pattern is unchanged (an LED element joins the cache). Fault keeps
the red card border; the runtime bar no longer turns red on fault —
the blinking LED, state text, and border carry it.

### Controller Wiring Simulator — 5th simulator *(Phase 1 shipped 2026-06-06, PR #187)*
The hands-on counterpart to the site's already-strong *text* coverage of
field wiring (the `field-wiring-sensors` and `controller-swap` drills,
`signal-scaling` and `thermistor-calculator` tools). Nowhere could you
actually *do* the wiring; this is a **wire-and-validate sandbox** at
`/simulators/controller-wiring.html`, prefix `cw-`. Designed with the user
across five questions — the load-bearing decisions:

- **Wire-and-validate, not a quiz.** A generic **GENERIC DDC-8** controller
  (equipment register `.device` faceplate) plus a tray of field devices on a
  canvas; click terminal-to-terminal to lay a conductor on a borrowed copy of
  the FBE's SVG wire layer. Points read live (72.4 °F, 60 %, ON) when landed
  right.
- **Failures are emergent and *obvious*** (explicit user ask: "failures must
  be possible and obvious"). No inject button — you wire it wrong, it fails:
  reversed power **sparks**, a dead short **blows the fuse** and drops every
  point dead, an unpowered actuator sits **DEAD**, and a FAULTS panel names
  each one in plain terms. Reduced-motion path snaps straight to the
  blown/dead state (no spark/flash), same discipline as `schematic-bg`.
- **Scope = Power (24 VAC) + Inputs (UI/BI) + Outputs (AO/BO).** Network was
  deliberately cut: the NET terminals render greyed "future" — see
  `[future: bus simulator]` below.
- **New engine, different shape from `fbe-engine.js`.** `wiring-engine.js`
  (`window.Wiring`) is a *circuit* solver: union-find the terminals into nets,
  classify HOT/COM off the transformer, then walk each device to a reading or
  fault. Conductors are **undirected** (it's copper — there's no type-gating
  on the wire; wrongness emerges in `evaluate()`), unlike the FBE's directional
  dataflow tick. Node-tested across the whole fault catalog.
- **Four presets**, mirroring the FBE's example chips: a correct AHU panel, a
  4-20 mA loop + status, and two **"find the fault"** broken panels (blown
  fuse, dead sensor).

Three review refinements after first ship:
- **Drag the whole device card,** not just its title bar (the FBE drags by the
  bar, but these cards have a tall body, so body-drags felt broken). Pointer
  capture on the card, guarding presses that start on a pin or toggle so
  click-to-wire and the contact switch still work.
- **Bigger faceplate text + wider controller** (296→330 px, canvas grown to
  fit) — the dot-matrix readouts were too small to read.
- **AO sliders ran off the controller — a CSS specificity gotcha worth
  remembering:** the global `input[type="range"] { width: 100% }` reset in
  `styles.css` (specificity 0,1,1) outranks a page-level `.cw-ao-slider`
  (0,1,0), so the slider stretched to fill the row. **Element-qualify
  page-level range widths** (`input[type="range"].cw-ao-slider`) to win the
  cascade. Same fix shape applies to any future tool that sizes a slider.
- **Orthogonal (Manhattan) wire routing** replaced crossing beziers — a
  horizontal stub out of each pin, a vertical run in the gap, a horizontal stub
  in. Reads like a real wiring diagram. The same `wirePath` shape was then
  ported back to the **Function-Block Editor** (PR #188), which handles
  feedback/backward edges by exiting right and re-entering the target from its
  left so a wire never doubles back across its own block.

**Phase 2 — paired Education explainer — ✅ shipped 2026-06-07.** Was built as
a clean hand-off: `[future: education/controller-wiring.html]` *(shipped
2026-06-07)* — lesson layout, one
question ("how a field point lands on a DDC controller — power, inputs,
outputs"), cross-linked to the sim via `relatedLinks` both ways (no JSON-LD
key; that's quiz↔lesson only). Networking is the adjacent topic → forward-link
to the future bus sim as prose, not a 404.

`[future: bus simulator]` — a standalone RS-485 / MS-TP **bus simulator** the
user floated while scoping this one: a daisy-chain trunk with +/- polarity,
end-of-line termination at both ends only, biasing, and MAC/device-instance
addressing. The Controller Wiring sim's greyed NET terminals are the seam it
plugs into.

**Desktop-only on mobile/touch *(2026-06-13)*.** Click-to-wire +
drag-to-place has the same touch flaw as the Function-Block Editor — a
finger can't both drag a device and pan the canvas. So the same gate
applies: `@media (max-width: 999px), (hover: none) and (pointer:
coarse)` hides the `.cw-live` bench and shows the shared
`.desktop-only-sim` tips panel (power-first / sensor-wiring /
transmitter / output / failure-mode bullets that stand alone without
the canvas, plus a link to the mobile-friendly explainer). No JS gate
needed here — the cosmetic drift interval no-ops on an empty panel,
which is all a mobile visitor ever sees. See the Function-Block Editor
section for the full rationale (shipped together in one PR).

**Landing-card "Desktop only" marker *(2026-06-14)*.** Follow-up to the
gate above: both drag-wiring sim cards on `/simulators/` now carry a
`desktopOnly` flag on the `navCard()` macro, which prepends an amber
`.nav-card-pill--desktop` marker ("Desktop only") to the statusline.
The gate itself is honest — a mobile visitor still lands on the tips
panel, not a dead canvas — but the badge warns *before* the tap, so the
constraint reads at browse time instead of after a wasted navigation.
Amber + bold (not the neutral feature-pill grey) so it parses as a
constraint, not another capability. Macro-level, so any future
desktop-only page opts in with one flag.

### Hydronic Loop Builder — 6th simulator *(shipped 2026-06-16)*
The running capstone for the hydronic teaching set (`hydronic-loops`,
`load-piping`, `balancing`, `pump-control` lessons; `valve-cv`,
`affinity-laws`, `waterside-load`, `coil-sizing` tools): an FBE-style
editor, but for the **piping of a building** instead of control logic.
Drop a plant, pump, coils, and valves on an **elevation canvas**, click
port-to-port to lay pipe, hit run, and a **real steady-state hydraulic +
thermal balance** solves every tick — flow finds its operating point and
water temperature propagates around the loop. `/simulators/hydronic-loop-builder.html`,
prefix `hlb-`. Mirrors the proven FBE two-layer split.

- **New engine, a third solver shape.** `hydronic-engine.js`
  (`window.HYDRO`) is neither the FBE's directional dataflow tick nor the
  wiring sim's undirected net classification — it's a **nonlinear nodal
  network solve**: union-find merges junctions (a tee) into pressure
  nodes, every flow path (component branch *and* pipe) is a signed branch,
  and a linearized system `G·P = I` is assembled (secant conductance
  `g = 1/(k|Q|)`, pump head + elevation as Norton current injections),
  Gaussian-solved with one **per-island reference node** pinned, and
  under-relaxed to the operating point. Site-canonical constants reused so
  numbers agree with the tools: `q = 500·GPM·ΔT`, valve `ΔP = (Q/Cv)²`,
  pump `H = (H₀−a·Q²)·(speed/100)²`.
- **Tests from day one** (explicit user ask: "build `.js` tests from
  day 1 to make sure things are accurate"). `tests/hydronic-engine.spec.js`
  — 29 engine-direct vm tests (the `wiring-engine.spec.js` loader trick):
  closed-form operating point, mass conservation (KCL) at every node, the
  signed branch law on every branch, parallel split sums, elevation
  cancels around a closed loop, valve throttling, 3-way constant-flow,
  balance-valve rebalancing, `ΔT = q/500·GPM`, warm-up + chilled mode, and
  every must-never-NaN edge (shut valve, dead pump, disconnected islands,
  empty system).
- **Hardened by an adversarial review pass before merge** — a multi-agent
  review (solver numerics / conservation / NaN-hunt / thermal / page) found
  11 real issues, each fixed with a regression test: a **setpoint plant now
  respects heat/cool mode** (a boiler could otherwise *cool* a loop whose
  return ran above setpoint — the default-reachable physics inversion);
  **adaptive under-relaxation + a secant-conductance floor** so two pumps in
  series (or a steep curve) converge instead of limit-cycling; a saturated
  `Q_CAP` clamp now reports `converged:false` instead of masquerading as
  solved; deleting a component mid-pipe no longer leaves a dangling pipe that
  threw every tick; the FlowEngine density bucket no longer collapses
  near-zero flow to "0" (which the engine re-read as *full* density, so shut
  pipes animated densest); plus `makeSystem` fail-soft coercion (non-array /
  null / duplicate-id literals), a self-loop-branch guard, and a raw-literal
  `solve()` guard.
- **Three corrections kept from the design review** (in code comments so
  they don't get "simplified" away): secant `g = 1/(k|Q|)` with 0.5
  relaxation (not the tangent `1/2k|Q|`); a shut valve is a **large finite**
  `K_CLOSED = 1e9`, never `Infinity` (Infinity → `g = 0` would manufacture
  NaN); the pump enters as a **current injection**, not a fixed-pressure
  node (which would over-constrain a closed loop). Elevation **cancels
  around any closed loop** — correct physics, only nets out in an open
  system (deferred).
- **One deliberate divergence from the handoff brief: pipes are tiny-
  resistance *branches*, not pure node-merges.** A pure merge leaves pipes
  flowless (and ambiguous at a tee); making each pipe a branch gives it a
  first-class solver-computed flow + direction for the visualization, keeps
  the matrix well-conditioned, and is more physical. The small `K_PIPE` is
  negligible head (≈0.6 ft at 35 GPM) and is exactly the field phase 2
  promotes to length/size-dependent for a pipe-sizing lesson.
- **Cold-start needed a guard the brief didn't call out.** A `Q = 0`
  cold start makes the secant conductance astronomically large and the
  first iteration overshoots wildly; a per-iteration physical flow clamp
  (`Q_CAP = 1000 GPM`, far above any real loop) tames it — cold converges
  in ~12 iters, warm-started ticks in 1–3.
- **Thermal reuses the FBE one-tick-delay.** A loop reads its upstream
  temperature from last tick, so a cold loop visibly **warms up over a few
  seconds** (transport lag, pedagogically the point); unconditionally
  stable (every node a bounded flow-weighted average). Coil sign is
  physics-derived (water moves toward the space temp), so no plant↔coil
  coupling is needed. Bridged valve ΔP (psi) ↔ head (ft) with
  **2.31 ft/psi** — no existing tool set this precedent, so it's introduced
  and documented here.
- **Three worked loops** as example chips (FBE pattern): single loop
  (operating point + warm-up + ΔT), parallel coils + balance valve, and a
  3-way diverting bypass. Live **equipment-register readouts** (`.device` /
  `.lcd` pump + plant faceplates) per "sims are the fun-and-flashy zone,"
  and **FlowEngine** particles drive the flow on each pipe (density from
  `|Q|`, direction from `sign(Q)`, a hot→cold colour lerp from `--blue` →
  `--heat` pushed via `setPathColor`; `refreshPath` throttled to bucket /
  direction changes so it doesn't rebuild pools every tick).
- **Desktop-only on touch**, same gate + `desktopOnly` landing badge as
  the FBE / Controller Wiring sims — drag-to-place + click-to-pipe is the
  same finger-can't-both-drag-and-pan flaw.
- **Canvas-builder simulators are pointer-only by design** (recorded once
  here so it isn't re-litigated per page). The clickable port dots and pipe
  paths are `<div>` / `<path>` with pointer handlers, not focusable buttons,
  so there's no keyboard path to place/pipe/drag — matching the proven FBE.
  This is a known WCAG 2.1.1 gap accepted for the canvas interaction (the
  page is already gated + badged desktop-only, and the lessons carry the
  same concepts keyboard-accessibly). If the bar is ever raised, scope a
  focusable-port / arrow-nudge model against the FB editor at the same time
  so the two stay consistent — don't add a keyboard path to one sim alone.

### Hydronic Loop Builder — phase 2: 3D dual-elevation + developed-length friction + UA coil *(shipped 2026-06-20)*
Phase 2 turned the single X–Z elevation into a **3D builder** and made the
geometry hydraulically real, plus a second coil model. The forks were resolved
with the user up front: dual synced panes (chosen over a single swap-toggle),
and depth made to *matter* via friction rather than left cosmetic — "without
that an engineer would pick it apart."

- **Dual synced elevations, not a toggle.** Two panes — **north** (width × height,
  X–Z) and **east** (depth × height, Y–Z) — share the vertical Z axis and the
  selection / pending-pipe state; each `VIEW` owns its own inner surface, SVG
  pipe layer, `els` / `pipeEls` maps, `flowCache`, and `INNER_W/H`. A drag writes
  the dragged pane's horizontal axis (`pos.x` in north, `pos.y` in east) plus the
  shared `pos.z` and reflows **both** panes in place. `pos.y` was dead in phase 1
  (the engine read only `x`/`z`); it's now live for the east view + 3D length.
  Per-pane **maximize** buttons (page-level, distinct from the whole-card
  fullscreen) — the user asked for "both, with buttons to blow up either one."
- **Developed-length pipe friction — the credibility fix.** The engine derives
  each pipe's resistance from its true 3D run: `k = max(K_PIPE, K_PER_FT·L)`,
  `K_PER_FT = 2.4e-5 ft/GPM²/ft` (≈2" pipe, ~3 ft/100 ft at 35 GPM), **floored at
  the old flat `K_PIPE`** so it never enters codebase-issues #134's stiff
  (small-k) regime — a longer run only *adds* friction. Pump head now tracks the
  layout (raise a coil onto a 30 ft riser → flow shaves 34.3 → 34.1 GPM), while
  the **static** lift still cancels around the closed loop (the expansion tank
  holds it). The static-cancellation invariant test was re-based as a
  *whole-system lift* (identical flow); a sibling test proves the longer riser
  adds friction. This is a deliberately **bounded** subset of the old "length/
  size-dependent `k_pipe`" item: **no diameter UI, no pipe-sizing lesson** (those
  stay deferred — a user-selectable diameter is the part that would raise solver
  stiffness, so it wants the #134 Newton step first).
- **UA-based coil, opt-in.** A coil gains a `coilmode` enum (`load` default | `ua`)
  + a `ua` param. In `ua` mode `q = UA·|Tin − tspace|`, so duty tracks the
  approach (falls as the water nears the space, climbs with a bigger approach);
  default `load` preserves every prior example/test exactly. The plant's
  dual-mode `srcmode` was the precedent.
- **Readouts + #135/#136.** New surfaces: a **LOOP** readout card (total developed
  pipe run + segment count) and a per-pipe **inspector** (developed length +
  friction head loss). #136 (drag wiped the particle layer every `pointermove`)
  was **fixed** in passing via the in-place pipe-`d` update. #135 (valve
  `out.authority` dead/mislabeled) was deliberately **not** reused by any new
  readout — it stays open.
- **Hardened by the same adversarial review** as phase 1: a 4-dimension
  multi-agent pass (engine numerics / dual-view page / integration-UX /
  tests-docs), each finding independently refuted-or-confirmed, surfaced 6 real
  items (0 false positives) — a fullscreen half-pane SVG overflow (a `max(900,…)`
  floor), the maximize button bubbling to clear-selection, a stale iter-count
  comment, a cosmetic self-loop length readout — all fixed before merge.

`[future: hydronic-loop-builder phase 2]` *(largely shipped 2026-06-20 — see the
phase-2 section above)* — the **X↔Y dual-elevation view** + **drag-in-both-views
depth editing**, a bounded **developed-length pipe friction**, and a **UA-based
coil** shipped. Still deferred: a user-selectable pipe **diameter** + the
dedicated pipe-sizing lesson (the part that raises solver stiffness —
codebase-issues #134), and the open-system fill-pressure / **expansion-tank
reference node** — the one place elevation **stops** cancelling.

`[future: hydronic-loop-builder education explainer]` — unlike the
Controller Wiring sim, this one ships without a single new paired lesson:
it's the capstone for **four** existing hydronic lessons, all cross-linked
both ways via `relatedLinks`. A dedicated "how a loop finds its operating
point" explainer could still be worth writing.

Two modes, tabs à la Signal Scaling. Both are shipped and the curves
are datasheet-verified.

- **Lookup mode** *(shipped).* Pick a thermistor type, enter either
  temp or resistance, get the other. Types live in
  `html/scripts/thermistor-data.js`: 10K Type II, 10K Type III, 10K
  + 8.7K (Johnson), 10K Type 5 with 11K shunt (Schneider/EBO
  convention — Type 3 linearized with a shunt resistor, common in
  older TAC/Andover gear), 20K, 3K, 1K Balco (nickel-iron alloy,
  RTD-style — still appears in retrofits on older Honeywell/Johnson
  jobs), plus Pt100 / Pt1000 RTDs (not strictly thermistors but used
  the same way on the troubleshooting side, labeled "RTD" in the
  card tag). Page shows the full R/T table for the selected type
  alongside the single answer — techs often want to scan the curve,
  not just one value.
- **Identify mode** *(shipped).* A second tab. The user enters
  measured (temp, resistance) pairs from an unknown sensor — three
  blank rows by default, add/remove as needed, two filled minimum —
  and the tool ranks every standard type by fit. Each type carries
  two error figures: an equivalent-temperature error (the ranking
  key — push the measured resistance through the type's curve,
  compare the implied temperature to the measured one, RMS across
  points) and a resistance percent error shown alongside. A type
  whose curve can't span every entered point is listed but flagged
  "out of range" rather than scored. The winner gets a confidence
  verdict (strong / likely / ambiguous / weak — heuristic
  thresholds on the °F error and the gap to the runner-up) plus a
  per-point fit breakdown. Each ranked row is a button that opens
  that type in Lookup mode. An accuracy disclaimer under the
  breakdown covers sensor tolerance, meter noise, and the fact that
  two close points often can't separate similar curves. Open
  follow-up: the dropped pieces from the original sketch were a
  per-input out-of-range marker (a complete row outside −40–250 °F
  is silently counted in the "ignored" tally instead) and a
  resistance-error column in the per-point table (the aggregate %
  lives in the ranked table; the breakdown shows the temp residual
  only).

**Implementation question — settled.** The original open question was
lookup tables vs. Steinhart-Hart coefficients. The codebase landed on
a hybrid: each type carries a small `curve:` block (β, R25, shunt for
the linearized 10K curves, R0 + temperature coefficient for the RTDs,
Callendar–Van Dusen for Pt100/Pt1000), and the displayed R/T table is
*generated* from that — single-β model for the NTC curves, linear for
Balco, IEC 60751 polynomial for the platinum RTDs, then linear
interpolation between displayed table rows for the page lookup. This
means auditing the small parameter set covers all 500+ table cells.
Trade-off documented in the data file header.

**Verification pass — done (2026-05).** The 2026-05 pass cross-checked
every type against published datasheets: BAPI 10K-2 / 10K-3 / 10K-3(11K)
output tables, US Sensor "Curve G", Sontay's Compatibility Chart,
Vector Controls' multi-curve reference, Schneider EBO's Balco chart,
the ACI BALCO datasheet, IEC 60751:2008. The biggest finding was that
the original Type III β (3976) was off by ~15 % at the cold end — the
canonical Type III curve has effective β25/85 ≈ 3693 and is the
*shallower* of the two common 10K curves, not the steeper one. Type
III dragged Type 5 (TAC) with it (shunted Type III element). Both
retuned. 1K Balco TCR was also 30 % too high; retuned to ACI's 2.2 Ω/°F.
Pt100/Pt1000 confirmed exact against the international standard. JCI
10K + 8.7K remains the one PENDING type — its canonical TE-6300
Product Bulletin URL redirects to a docs-portal landing page and no
public R/T table for the 8.7K-shunted variant has been located.
The thermistor page now carries an "About these tables" tool-card
surfacing the methodology and disclaimers to end users.

### Interactive psychrometric chart *(phase 3 shipped 2026-05-17)*
Phase 1 (v0.6) shipped the state-point calculator + draggable dot on an
altitude-adjustable ASHRAE IP-unit chart. Phase 2 (v1.3, shipped 2026-05-15)
turned the single-point surface into an air-handler process chain: outdoor
air + return air mix to mixed air, then a cooling coil, a heating coil,
and a humidifier walk the state toward supply air. Each stage is a labelled
node on the chart connected by a color-coded process segment; everything
downstream of the source nodes is computed from the editor's process
parameters and updates live as you type or drag.

Phase 3 (shipped 2026-05-17) added three things, in two PRs:

- **PR 1 — math extraction.** Pure psych math moved to
  `html/scripts/psychro-engine.js` with a two-tier API (ASHRAE primitives
  flat, `Psychro.solveState` / `buildState` / `computeProcess` namespaced)
  so the chip lands on a smaller page. See codebase-issues #6 for the
  resolution note.
- **PR 2 — chart-side interactions.** Three changes:
  - *Floating state-point chip.* Small monospace tooltip that follows the
    OA / RA / MA dot on hover and during drag, showing DB / WB / RH at
    current display units. Absolutely positioned over the canvas, anchored
    to `.sim-canvas-wrap` (which now carries `position: relative`).
    Edge-flipped in JS so it never leaves the wrapper. Opacity 0.88 — high
    enough to read clearly, low enough that process lines still show
    through. The full property table on the right still owns the complete
    state; the chip is the at-the-cursor glance aid.
  - *MA draggable along the OA-RA line.* The mixed-air dot now slides
    along the canvas-pixel mix line between OA and RA; the projection's
    OA-fraction parameter writes back to `ma-pct`, clamped to [0, 100].
    OA / RA still drag freely; MA's drag is constrained by the chain's
    own geometry. MA gets the same outer drag-handle ring OA and RA carry,
    so the affordance reads from the chart alone.
  - *Click-to-select on every visible node.* Clicking any rendered dot
    (OA / RA / MA / CC / HC / HUM / SA) activates that stage's pill — the
    chart and the pill row stay in sync regardless of which one the user
    drives. CC / HC / HUM / SA stay non-draggable (they're chain-derived);
    they're click-to-select only and don't get the outer ring.
- **`.psy-toggle` polish.** Dropped the static "On" text from the CC / HC
  / HUM checkboxes; replaced with a `::after { content }` rule keyed on
  `:has(input:checked)` so the label reads "Off" when unchecked, "On"
  when checked. Added `line-height: 1` to the label so the text aligns
  vertically against the checkbox glyph instead of riding above it.

The "Floating state-point chip" and "`.psy-toggle` polish" deferred items
that lived in this section below have shipped under the PR 2 summary
above; their detail blocks have been removed.

In scope (shipped):
- *AHU chain* — fixed canonical sequence `OA + RA → MA → CC → HC → HUM
  → SA`. CC / HC / HUM each carry a per-stage off-toggle so a job
  without (say) a humidifier just disables that stage and the chain
  collapses cleanly to `OA + RA → MA → CC → HC → SA`.
- *Step pills + single editor* — a horizontal pills row at the top of
  the Inputs column picks the focused stage; the editor below swaps to
  match. Same idea as Niagara's object inspector. Pills for disabled
  stages render dim. Selected pill shows the accent.
- *Hybrid editor inputs per stage* — each stage's editor takes the
  inputs that match how a tech thinks about it:
    - OA, RA — full v1 "DB + define-by {RH, WB, DP, W, h}" surface
    - MA — single % OA field (mass-weighted mix), plus live readouts
      for the resulting MA DB / W / RH so the user can sanity-check
    - CC — leaving DB + the same "define-by" dropdown
    - HC — toggle between `Leaving DB` and `ΔT rise`, single value field
    - HUM — leaving RH %, adiabatic only (constant wet-bulb)
- *Optional AHU airflow (CFM)* — when set, the per-stage table grows a
  Q (MBH) column and the process-delta block adds Q total / Q sensible
  / Q latent for each coil. Mass flow ṁ = CFM × 60 / v_inlet (lb_da/h);
  Q_sens = ṁ × (0.240 + 0.444·W_in) × ΔT. Optional by design — the
  per-lb-dry-air math reads cleanly without it.
- *Process segments on the chart, color-coded by type* — mixing in
  `--text-dim` gray, cooling/dehumidification in `--blue`, heating in
  a new `--heat` orange, adiabatic humidification in `--accent` green
  dashed. Caption under the chart names the four colors. Source nodes
  (OA, RA) carry a faint outer ring as a drag-affordance cue.
- *Node labels* — OA, RA, SA always labelled; intermediate stages
  (MA / CC / HC / HUM) only labelled when their pill is selected.
  Keeps the chart legible when all coils are on.
- *Drag scope* — OA and RA only. Everything downstream is deterministic
  from the editor. Hit-test radius 18 px; the drag preserves the
  source's current "define by" mode (so dragging a state defined by RH
  rewrites the RH input, not WB).
- *Per-stage results table on the right* — compact `.ref-table-dense`
  with one row per active stage (Leaving DB / W / RH / h), plus Q MBH
  when CFM is set. Selected row gets the `--accent-dim` highlight.
- *Selected-step detail block* — the full nine-property table from v1,
  now driven by the selected pill rather than a single static point.
  Label reads `OA — Outdoor air` / `MA — Mixed air` / etc.
- *Process-delta block* — appears under the detail block only when a
  coil/humidifier stage is selected AND on. Shows ΔDB, ΔW, Δh, SHR
  (cool only), and Q total / Q sens / Q lat when CFM is set.
- *Defaults open in summer cooling* — OA 92/76 WB, RA 75/63 WB, 20% OA,
  CC on at 55/54 WB, HC off, HUM off. The visitor sees a coloured
  process train on first paint, not an empty chart.

The chain solver lives inline in the page (one consumer; no point
factoring out a `psychro-engine.js` until a second tool needs the
math). Algorithm walks each stage in order, threading the running
`current` state and pushing successful coil/hum legs into a `stages[]`
array used by the chart and the per-stage table. Failures are localised
— if CC is on but its leaving condition is invalid, OA/RA/MA still
render and the error surfaces in the status line; everything downstream
mutes to "—".

**Design decisions (locked during pre-build consultation, in order):**
1. *Conceptual model* — AHU-style chain over "two-point + process" or
   free-form points. Mirrors how a controls engineer reads an air
   handler.
2. *Process types* — mixing, sensible heat/cool, cooling+dehum, and
   humidification (adiabatic only). Light treatment for humidification
   per "less common on commercial jobs."
3. *Input style* — hybrid per process: mixing by % OA, sensible by
   ΔT or leaving DB, cooling by leaving DB + define-by, humidification
   by leaving RH.
4. *Chain shape* — fixed canonical with per-stage off-toggles, not
   add/remove/reorder. Builder-style UI was out of scope for v1.3;
   reconsider if DOAS / makeup-air / lab-exhaust use cases come up.
5. *Editor layout* — step pills + single editor below, not a stack
   of cards. Keeps the Inputs column tidy.
6. *Airflow input* — optional CFM, primary readouts stay per-lb-dry-
   air; MBH appears when filled. Tool works either way.
7. *Drag scope* — OA + RA only. Downstream stages tweak by typing.
8. *Initial state* — worked summer cooling example, not empty.
9. *CC editor* — "Leaving DB + define-by" mirrors v1 (general,
   familiar) over fixed leaving DB/WB pair or coil ADP + bypass.
10. *HC editor* — `Leaving DB ↔ ΔT` toggle, both mental models
    covered for tiny UI cost.
11. *HUM editor* — adiabatic only with leaving RH %; steam left
    deferred.
12. *Segment colors* — per-process, with a new `--heat` orange added
    to `:root` in `styles.css`. Reusing `--red` for heating risked
    confusion with the fault/alarm semantics already established
    elsewhere on the site.
13. *Node labels* — always-on for chain endpoints (OA, RA, SA);
    selected-only for intermediates.

**Friction caught in the post-build audit:**
- *SA label vanishing.* The initial dedup logic skipped drawing SA
  entirely when SA coincided with the last upstream node, which is the
  common case (default summer cooling: SA = CC leaving; all coils off:
  SA = MA). The supply-air callout disappeared from the chart. Fixed
  by folding `/ SA` into the coincident node's label rather than
  dropping it — default now shows `SA` at the CC dot, all-off shows
  `SA` at the MA dot, and HC-on shows `HC / SA`.
- *Bypass detail label.* Clicking the CC / HC / HUM pill with the
  stage toggled off kept the detail-block label as `CC — After cooling
  coil` (etc.) while displaying the pass-through (= entering) values.
  Reads like the coil is doing something. Fixed: when a selected
  coil/humidifier is off, the detail label becomes
  `CC — bypassed (pass-through)`.
- *Default coil values assume the canonical chain.* HC's default
  leaving DB of 75 °F and HUM's default leaving RH of 50 % only make
  sense downstream of an active CC. Toggle CC off without adjusting
  HC, and the chain errors because MA (~78 °F) > HC leaving (75 °F).
  Decided to leave this as-is — the red error message is a teaching
  moment about coil-stage dependencies, and "smart defaults" that
  always pass would hide the lesson.
- *Adiabatic-humidifier segment shares colour with the saturation
  curve.* Both are `--accent` green; dashes-vs-solid is the only
  distinction. Acceptable in practice — adiabatic humidification *is*
  motion toward saturation, so the colour affinity is even thematically
  apt.

### Psychrometric chart — Cold-climate range preset *(shipped 2026-05-18)*

Triggered by the user working in a climate where outdoor air stays
below 20 °F for months. The chart was hardcoded to TDB 30–120 °F, so
sub-30 °F state points simply didn't render. Adds a two-button "Chart
range" toggle in the Air handler input column:

- **Standard** — 30–120 °F (0–50 °C), the original.
- **Cold** — −20–100 °F (−30–40 °C). Trims the top by 20 °F so the
  wider DB span doesn't squash vertically — aspect ratio reads close
  to Standard.

Preset persists across sessions in `localStorage` under
`cf_psy_range`. Same sticky-once-picked semantics as the units toggle.

**Design choice that held — binary preset over dynamic.** Three
options were considered: binary preset (Standard/Cold), three-preset
(adds a "Wide" or "chilled-water" variant), and dynamic min/max DB
inputs. Picked binary because:

- The mental model is binary at heart — "my chart" vs. "the other
  chart." Field techs pick one for where they work and leave it.
- Each preset can be hand-tuned (gridline density, wb contour set,
  label placement) — looks intentional at both zoom levels rather
  than math-derived.
- Dynamic adds real edge cases (axis re-tuning, validation of
  `max > min + something`, a user entering 50–55 producing a chart
  that's mostly empty space). High complexity for low usage.

Third preset (chilled-water 0–80 °F or similar) waits for a second
user to ask. The `setRangeBounds()` helper extends cleanly with a new
case if it earns its keep.

**Implementation — single-let swap is the whole story.** `TDB_MIN /
TDB_MAX` flipped from `const` to `let`, set from a small helper at
init and on toggle. Every existing call site (X-mapping, in-bounds
filters, curve sample ranges, drag clamp, drag inverse) reads them
dynamically — no other math changed. Tick arrays for both axes and wb
contours / labels gain a per-preset variant. RH labels stay shared
across presets. Redraw runs through the same `psyRecompute()` entry
the units toggle already uses, so no new redraw plumbing.

**Out of scope (parked):**
- *Dynamic / user-defined min/max DB* — see "Design choice."
- *Auto-detect from a setting or IP geolocate* — the user picks.
- *Per-preset W_MAX tuning* — `W_MAX` stays shared. Cold air is drier,
  so a bit of extra W headroom at the top of the cold chart reads
  correctly and reinforces the "this air can't hold much water"
  intuition.

### Psychrometrics — paired Education page *(shipped 2026-05-18)*

**The page's one question:** "What are the seven properties on a
psychrometric chart, and which combinations of them actually let a
controls engineer hold a space?"

`html/education/psychrometrics-basics.html` ships as the lesson half of
the `psychrometric-chart.html` pairing, matching the
`pid-tuner.html` ↔ `pid-basics.html` model. Page lead is the natatorium
anecdote in the user's voice (high-stakes humidity control on a real
pool job), establishing credibility before any equations show up; the
rest is the vocabulary for that fight.

**What shipped (in document order):**
- *Two properties lock the rest* — the Mollier intuition (moist air
  has 2 DOF at fixed P), with a short pairwise-source table (DB+RH,
  DB+WB, DB+DP, DB+W, DB+h — where each one comes from in the field).
- *The seven properties* — a `.callout-grid` of seven `.callout`s
  (DB, WB, DP, W, RH, h, v), each with what it physically is, which
  instrument measures it, and the controls relevance.
- *Pool-space condensation widget* — three sliders (space DB, space
  RH, coldest surface temp), live readouts for W, dew point,
  enthalpy, and the safety margin (surface − dew-point), plus a
  three-state status panel (green / orange / red) keyed off canonical
  IP margin. Reuses `humRatioFromRH`, `vapPressFromHumRatio`,
  `dewPointFromVapPress`, `enthalpy`, plus `P_STD` and `GR_PER_LB`
  from `psychro-engine.js`. Discovery-payoff anecdote fires at the
  natatorium corner of the slider space (warm DB + high RH + cold
  surface + condensation state).
- *Process families on the chart* — four short paragraphs on
  sensible heat / cooling+dehum / mixing / adiabatic humidification,
  naming what each one changes and what it leaves alone. Forward-
  links to the chart tool's interactive surface rather than re-doing
  the visualisation in prose.
- *Gotchas* — a four-callout grid: RH alone tells you nothing; dew
  point is the property that condenses; enthalpy is the right basis
  for coil capacity; specific volume is the CFM-to-mass-flow bridge.

**Cross-links wired both directions:**
- Chart tool → lesson via a small `.tool-card` callout below the main
  chart card, above the back-link.
- Lesson → chart via the `.cta-button` at the bottom and inline
  anchors in the two-properties / process-families / gotchas sections.

**Scope decisions during build:**
- Single page, not a two-page split. The friction-file scope sketch
  (properties + processes + gotchas) was three sections; scoped tight
  with one widget and one short process-families section, it fits the
  "one question per page" rule. Process families get prose only — the
  chart tool already does the visual heavy lifting, so prose-then-
  forward-link beats a redundant mini-diagram.
- Widget pick: pool / condensation guard rather than a same-RH
  comparator or a coil sensible-vs-latent split. The pool widget
  replays the lead anecdote, hammers the dew-point lesson viscerally,
  and ties the whole page to the controls problem the user actually
  fought.
- Anecdote handled in the lead (verbatim, in the user's voice). A
  smaller discovery payoff fires in the widget at the natatorium
  regime, callback rather than repeat.
- Slider canonicalisation: state stays in IP throughout; sliders
  rebuild on `unitschange` with unit-system-specific step sizes
  (1 °F / 0.5 °C; 1 % RH in both). Same pattern as
  `tools/psychrometric-chart.html`'s `buildSecondProp`.

**Out-of-scope (parked, forward-linked where the lesson touches them):**
- Air-mixing N-stream calculator *(tracked as candidate tool below)*
- Coil-sizing calculator *(tracked)*
- Economizer-ratio helper *(tracked)*
- Comfort zone overlay / ASHRAE 55 — different question (comfort vs.
  process control); not added.
- DOAS / ERV / makeup-air psychrometrics — different question; not
  added.
- A second, deeper "Psychrometric Processes" Education page if the
  one-paragraph process-families treatment ever feels insufficient.
  Not promoted today — the chart tool plus the lesson's process
  section read coherently together.

**Reframed 2026-05-18** — same day as ship, after a re-read on a
cold open. The natatorium anecdote opened the page with confidence
but also opened it with a *pool job*, which is one of the hardest
applications on the chart. A tech meeting psychrometrics for the
first time was being shown the deep end before the words on the
chart even resolved. Three changes shipped in this pass:

- *Lead quote replaced.* The natatorium quote moved down to the
  pool widget where it pays for itself against the simulator.
  The new lead is the page's actual mission statement — the
  chart looks intimidating; this page makes it approachable.
- *Section reorder — vocabulary → elegance → processes → gotchas
  → widget.* The seven properties come first so the words on the
  chart resolve before any 2-DOF intuition or process-families
  prose. The pool widget becomes the page's applied capstone
  instead of a mid-page demo.
- *Structural alignment with peer Education pages.* The page now
  uses the single `.tool-card` shape that `vfds`, `pump-control`,
  `balancing`, `hydronic-loops`, and `load-piping` all use:
  eyebrow section-header on top, one outer card with
  `h1.tool-card-title` + `<span class="tool-tag">HVAC</span>` +
  `.page-intro` + `h2.subhead` subsections inside. The pool
  widget is broken out as a second `.tool-card` capstone (a
  small departure from the strict peer pattern, but it lets the
  widget read as the page's deliverable rather than another
  inline diagram).

### Air-mixing calculator *(shipped 2026-05-18)*

Ships at `/tools/air-mixing.html` as a two-tab `.tool-body-2col` tool
with a worked-example row beneath the grid (second consumer of
economizer-ratio's `.er-example` pattern, per codebase-issues #29 step
1). Generalizes the chart's and economizer's two-stream mix to three
streams. Tab 1 (by mass flow) takes a CFM and a full Define-by state
per stream; tab 2 (by mass fraction) takes percentages that must sum
to 100 % (±0.1 tolerance). Output column shows the mixed-air state —
DB, WB, DP, W, RH, h, v — plus a Copy button. Per-stream `solveState`
errors surface inline below the bad stream; tab-level warnings
(fraction-sum drift, zero total mass, mixed-state out of range) land
in a status pill above the readouts. Shared altitude input above the
tabs feeds `pressFromAltitude` into both tabs.

**Framing decisions settled during build:**
- *Three streams, not dynamic.* The use cases that actually surface
  in practice (OA + RA + ERV exhaust; economizer + return + makeup;
  recovery-wheel sanity check) are all three-stream. A 4th-stream ask
  hasn't come up, and dynamic add/remove buttons would add an
  interaction pattern not used elsewhere on the site for no current
  payoff. Zeroing a stream's weight drops it from the mix cleanly.
- *Altitude shared, not per-stream.* One input above the tabs feeds
  both. Streams "mixing under different pressures" don't physically
  mix without flow work — single pressure is the honest model.
- *Mass-fraction tab surfaces the percentage check.* `|Σ − 100| > 0.1`
  surfaces a tab-level warning rather than silently renormalizing.
  Renormalize-on-input would hide the bug class where a tech mistypes
  one digit and doesn't notice.

**Engine API review — `psychro-engine.js` flat primitives (second
audit).** Second second-consumer landed; the API survived again:
- `Psychro.solveState` covered all three per-stream Define-by call
  sites without modification. Same `.ok` branching as economizer.
- `Psychro.buildState` materialized the mixed state from the recovered
  `(T_mix, W_mix)` cleanly. The "build from two scalars at pressure"
  shape is the right one for this kind of derived state.
- `pressFromAltitude` is the first non-namespaced primitive a tool has
  called directly other than the chart (economizer hardcoded `P_STD`).
  Worked fine as a top-level `const` reachable from a later inline
  script — the classic-script global pattern holds.
- The only new math was the algebraic inversion of `enthalpy(tdb, W)`
  to recover `T_mix` from `(W_mix, h_mix)`. One inline line — not
  engine surface; the algebra is shape-of-tool, not shape-of-air.
- No new primitives added. Two of two predicted second-consumers
  (economizer-ratio, air-mixing) shipped without touching the engine.
  Two-tier API is now validated across three pages. Coil-sizing
  remains the next probe; if its solve-for-leaving-state shape wants
  a `Psychro.invertProcess` sibling, that's the trigger.

**Out of scope (deliberate, parked):**
- *4th stream / dynamic stream count* — see "Framing decisions."
- *By-volume-flow without specific-volume adjustment* — not exposed.
  CFM is volumetric; the tool derives mass from `CFM ÷ v` per stream,
  which is the right thing.
- *Different pressures per stream* — see "Framing decisions."
- *localStorage persistence of last-entered values* — no tool persists
  input state today; not changing that pattern for this one. The
  controller-commissioner entry is the right place to start that
  conversation.
- *Promote `.am-example` and `.er-example` to a shared
  `.tool-body-row` utility in `styles.css`* — **shipped 2026-05-18**
  in the codebase-issues #29 PR. Both pages now apply
  `class="tool-body-row"` directly; the page-local rules dropped from
  each page's `{% block head %}`. Same PR retrofitted
  `signal-scaling.html` (3-col → 2-col + shared row) and PR #33
  added a third consumer on `modbus-register-viewer.html`.

### Coil-sizing calculator *(shipped 2026-05-21)*

Ships at `/tools/coil-sizing.html` as a two-tab `.tool-body-2col` tool
with a worked-example `.tool-body-row` beneath each tab — same shell as
`economizer-ratio.html` and `air-mixing.html`. Page-id prefix `cs-`. A
single coil in isolation: the math the psychrometric chart runs on its
CC / HC stages, surfaced on its own so a quick capacity check doesn't
need a whole AHU chain.

In scope (shipped):
- *Coil-type toggle* — Cooling / Heating, shared above the tabs in a
  thin `.cs-type-strip` band (mirrors air-mixing's altitude strip).
  Humidifying was dropped from the v1 sketch — humidifier sizing is a
  different question and a rare ask; coil sizing is the cooling/heating
  pair. Cooling-only rows carry `.cs-cool-only`, heating-only rows
  `.cs-heat-only`; the toggle shows/hides them and recomputes.
- *Capacity tab (forward)* — entering state + leaving state (both the
  "Define by" pattern) + airflow → total / sensible / latent MBH, SHR
  (cooling only), ΔDB / ΔW / Δh. For a heating coil the leaving editor
  collapses to a single dry-bulb field — humidity ratio rides through
  unchanged, so the define-by rows hide. Straight `Psychro.solveState`
  ×2 → `Psychro.computeProcess` — no new engine math.
- *Leaving-state tab (inverse)* — entering state + airflow + the load
  the coil carries → the leaving-air state. Cooling takes sensible +
  latent MBH as two fields (a load calc hands you both); heating takes
  one capacity field.
- *Sea-level pressure for v1* — same call as economizer-ratio; the
  worked example forward-links to the chart tool for altitude.

**Engine — `Psychro.invertProcess` added.** The friction-file note on
this entry and the air-mixing entry both flagged the coil-sizing
inverse as the trigger for a `Psychro.invertProcess` sibling. It
landed: `invertProcess(inlet, { type, cfm, qSens, qLat })` is the
exact algebraic inverse of `computeProcess`'s q-formulas — feed a
result of one into the other and it round-trips. Loads are positive
magnitudes; `type` sets the sign. The returned state carries an extra
`saturated` flag — true when the requested latent load drives the
leaving point onto the saturation curve (its apparatus dew point),
which the leaving-state tab surfaces as a `warn` status. Heating is
the clean case (pure sensible, W constant); cooling needs the latent
split, hence the two load fields. No other engine surface changed —
`solveState` / `buildState` / `computeProcess` were untouched.

**Friction caught in build:**
- *Coil type vs. what the numbers say.* Entering a leaving dry-bulb
  warmer than the entering air on a coil set to "Cooling" (or cooler,
  on "Heating") is a real mistake a tech can make. Rather than error,
  the Capacity tab's status pill warns and names the actual process —
  a teaching nudge, same spirit as the chart's coil-stage error
  messages.
- *Cooling that adds moisture.* If the leaving state on the Capacity
  tab is more humid than entering, the status warns — a cooling coil
  removes water, it can't add it.

### Dew-point calculator *(shipped 2026-06-08)*

Ships at `/tools/dew-point-calculator.html` as a single-card
`.tool-body-2col` tool — no tabs — with a "Field notes"
`.tool-body-row` beneath. Page-id prefix `dew-`. Born from a real
over-humidity service call: the user needed the return-air dew point
fast to judge whether the cooling coil was actually pulling the supply
air below it, and found the psychrometric chart too slow to drive for
one number. A thin UI over `Psychro.solveState` — no new engine math.

The build was scoped live in plan mode, one design question at a time:

- *Hero + strip, not a full property pad.* Dew point is the one number
  you glance at, rendered large (`.dew-hero`); wet-bulb, grains, and
  enthalpy sit under it as plain `.ps-row` readouts. Specific volume
  and RH-as-output were dropped — RH is the input in RH mode, so it
  would be redundant. It earns its own row only in wet-bulb mode.
- *Coil check, reframed from "surface condensation."* The first sketch
  was a generic "will it sweat on a cold surface?" margin. The user's
  actual call was sharper: return DB/RH in, supply dry-bulb in, "is the
  coil hitting dew point?" So the optional `dew-surface` field compares
  the leaving / surface temp to the *entering* dew point and the
  verdict pill speaks coil language — below = dehumidifying, above =
  sensible-only with humidity riding up. The honest physics (leaving-
  air DB below the entering dew point guarantees the coil surface is
  colder still, so condensation is certain; above is a strong but not
  absolute sign of little latent removal) lives in the Field notes, not
  the pill.
- *DB + RH default, one-tap wet-bulb toggle.* RH off the space sensor
  is the common field read; a visible `.dew-seg` segmented toggle (not
  a dropdown — one tap under the gun) flips the second input to wet-
  bulb for a sling psychrometer. In wet-bulb mode RH joins the readout.
- *Altitude-adjustable* via `pressFromAltitude`, sea level by default —
  one row the hurried path ignores and the accuracy-minded set.

Reuse mirrors `coil-sizing.html`: `data-us` / `data-metric` label
swap, the `rewriteInput` unit-flip resync, `U.display.humidityRatio(W
* 7000)` for grains. `psy-widget.js` wasn't needed — only the `rh` /
`wb` modes are used, and their second value canonicalizes directly
(RH unitless, WB a temperature).

**Friction caught in build:**
- *`[hidden]` loses to `.ps-row`.* The RH output row started with the
  `hidden` attribute and rendered anyway — `.ps-row` sets a `display`
  that outranks the UA `[hidden] { display: none }`. Switched to the
  `.hidden` class, which sits later in `styles.css` source order and
  wins. Same trap `.nav-card[hidden]` / `.quiz-*[hidden]` re-assert
  against; worth remembering for any future `.ps-row` toggled hidden.
- *Version coincidence, not collision.* The branch bumped 3.6.0 → 3.7.0
  off `main`; the parallel controller-wiring-lesson branch made the
  identical 3.7.0 bump and merged first, so git auto-merged the same
  change with no conflict. Net: 3.7.0 covers both features.

### Economizer-ratio helper *(shipped 2026-05-18)*

Ships at `/tools/economizer-ratio.html` as a two-tab `.tool-body-3col`
tool. Tab 1 (dry-bulb) is the calc a tech runs at the panel — three
temperature inputs, one %OA out, feasibility verdict. Tab 2 (enthalpy /
full state) takes full OA + RA states via the chart-page Define-by
pattern and adds two things on top of the dry-bulb answer: the
**resulting mixed-air state** (DB, WB, W, RH, h — what the coil actually
sees) and an **OA-vs-RA enthalpy-changeover verdict** (favorable /
wash / unfavorable), which is the high-limit gate a real enthalpy
economizer uses to decide whether free cooling is worth running before
any dry-bulb modulation runs. Both tabs follow the global Units toggle
with input-value conversion on flip; sea-level pressure for v1 (an
altitude field would have leaked from chart-tool surface for marginal
gain, see "Out of scope" below).

**Framing decision settled during build.** The friction-file scope
sketch read as "OA enthalpy + RA enthalpy + MA enthalpy setpoint → %OA"
for the enthalpy tab. In practice no controls engineer specifies an MA
enthalpy setpoint — they specify an MA *dry-bulb* setpoint, and a
high-end BAS uses enthalpy only as the changeover criterion (not the
modulating variable). The tool reflects that: %OA on both tabs is a
DB mass balance; enthalpy buys you the full mixed-state readouts plus
the changeover comparison.

**Engine API review — `psychro-engine.js` flat primitives.** First
second-consumer landed; the API survived as-is:
- `Psychro.solveState(mode, tdb, second, P)` was the ergonomic call on
  the OA / RA editors — three lookups (Define-by selector, dry-bulb
  input, second value) feed straight in, error path is uniform.
- `Psychro.buildState(tdb, W, P)` was the right shape for the mixed
  state once %OA was known; humidity ratio is a clean mix variable
  alongside dry-bulb.
- No new primitives needed; the existing `enthalpy`, `humRatioFromRH`,
  etc. flat exports weren't touched directly because solveState covers
  every Define-by mode behind one function.
- One small drag: `solveState` returns `{ ok, error }` *or* the state
  object, and consumers have to keep both shapes in mind. Not a redesign
  trigger — three of three call sites in this tool branch on `.ok`
  cleanly — but if a fourth consumer wants a "just throw on bad input"
  variant, that'd be the time to add a sibling rather than refactor.
- `computeProcess` wasn't needed (no coil-process delta to compute);
  appropriately namespace-only.

Verdict: **the two-tier API holds.** Air-mixing calculator and
coil-sizing calculator can land against the current surface without
preliminary refactor; flag a re-audit when one of those exposes a
real shape mismatch.

**Out of scope (deliberate, parked):**
- *Altitude / pressure input* — kept sea-level for v1. Chart tool has
  altitude and that's the right place for it; this tool's job is the
  fast panel calc. Pulling altitude over would have meant a wider
  Input column and rebuilt-on-flip pressure plumbing for no
  daily-use payoff. The "atmospheric pressure fixed at sea level"
  note in the enthalpy tab forward-points to the chart for an
  altitude-adjusted answer.
- *MA enthalpy setpoint input* — see framing decision above.
- *Economizer-changeover threshold reference table* (ASHRAE 90.1 by
  climate zone) — would have made the Reference column denser without
  changing the math. Worked-example walkthrough won the slot; the
  changeover-verdict pill in the enthalpy tab is the live equivalent.

### Mock function-block editor *(shipped 2026-05-22)*
*One question: what does it feel like to build a control sequence
out of function blocks, and how does a wiresheet actually evaluate?*

Ships at `/simulators/function-block-editor.html` as a custom-layout simulator
(palette · canvas with a full-width inspector strip below), page-id
prefix `fbe-`. The graphical wiresheet half of the BAS programming
story — same `mock` framing as `vfd-mock.html`: feels like the real
thing, doesn't replace it. Paired with the
`/education/function-blocks.html` explainer (entry below), matching
the `vfd-mock ↔ vfds` and `pid-tuner ↔ pid-basics` precedents.

**Engine extraction landed day-one** — `html/scripts/fbe-engine.js`
holds the block catalog and the per-tick evaluator as a pure classic
script (`window.FBE`, no DOM); the page owns canvas / drag / wiring /
tick loop. Codebase-issues #6's "extract before the page becomes a
monolith" lesson applied directly: the paired Education page is the
near-certain second consumer, and the engine is a clean boundary
(block registry + topological evaluator). Mirrors pid-engine.js /
psychro-engine.js. Engine-direct unit tests
(`tests/fbe-engine.spec.js`) cover catalog shape, combinational
settling, set-dominant SR latch, TON delay, PID step, and
feedback-cycle one-tick delay.

**Block roster — 28 blocks** across six palette categories. Boolean:
AND / OR / NOT / XOR / SR latch (set-dominant). Comparators:
= / ≠ / > / < / ≥ / ≤. Math: add / sub / mul / div / min / max
(divide guards `/0 → 0`). Timers: TON / TOF, both stateful with a
preset-time param. Selection: select (boolean switch) and limit
(clamp). I/O: constant, AI / BI / AO / BO point stubs, and a
generic readout sink. Control: a real per-tick PID. Friction-file
long-tail (pulse timer, average) parked — trivial registry entries
to add later if a real use case asks.

**Real working PID in v1 — architectural argument.** The pre-build
sketch on this entry said "no actual PID block" for scope discipline
(echoing the VFD-mock posture). Re-evaluated during planning:
TON / TOF and SR latch already force a *stateful-block* engine, so
a real per-tick PID is the same category — retrofit cost ≈ build-in
cost. Built it in, with the PID-loop example program (PV + SP → PID
→ AO + readout) as the tie-back to `pid-tuner.html`. Implementation
is a fresh ~20-line per-tick controller with conditional-integration
anti-windup, output clamped 0–100 %; distinct from `pid-engine.js`'s
`simulatePid`, which is a whole step-response simulation (different
shape). The pid-tuner / pid-basics pages remain the place for PID
internals; this tool just lets you wire the loop into a sequence.

**Five canned example programs** load via a `widget-try` chip row:
1. *Freeze-stat shutdown chain* — freeze BI sets an SR latch, the
   latch drops the fan via NOT and lights an alarm BO.
2. *Economizer enable* — AI(OAT) `<` const(setpoint) AND BI(cool
   mode) → BO. Six blocks; default-loaded on first paint as the
   most immediately legible sheet.
3. *Direct-acting (cooling) thermostat* — AI(temp), const(SP),
   const(deadband); add / sub build the band edges; GT/LT feed an
   SR latch (set on over-temp, reset on under-temp); output drives
   a cooling BO. Output rises with temperature = direct-acting.
4. *Reverse-acting (heating) thermostat* — same nine-block shape,
   the SR latch's S and R inputs swapped — output rises as
   temperature falls = reverse-acting. The two thermostats
   deliberately ship as a pair to teach the direct / reverse-acting
   vocabulary.
5. *PID loop* — AI(PV), const(SP), PID block, AO + readout. The
   loop visibly climbs toward setpoint once running.

**Tick semantics — one-tick delay for cycles.** Kahn topological
sort on the wire DAG; combinational chains settle in dependency
order within a single tick (a comparator's result reaches the
downstream AND in the same tick). Cycles (feedback edges) read the
*previous* tick's value — so an SR latch holds, a NOT wired back to
itself toggles each tick instead of looping forever, and the engine
never hangs. Stateful blocks carry their own state across ticks.
Tested explicitly in `fbe-engine.spec.js`. Tick rate: 100 ms (10 Hz),
a fixed dt the page passes to `FBE.tick(graph, dt)` — fixed dt
matters for the PID integrator and timer resolution (same reasoning
as codebase-issues #1's motor-tick decision). The page's
`setInterval` is captured and paused on `visibilitychange` hidden,
honouring #1's "no idle background work" posture.

**Interaction settled during build:**
- *Click-to-add from palette*, not drag-from-palette. Simpler,
  keyboard- and touch-friendly, robust. New blocks cascade into a
  tidy 5-column grid so they don't stack.
- *Pin wiring is two clicks*: click an output pin, then a compatible
  input pin. Kind-checked (analog can't feed digital). One wire per
  input pin — wiring a second wire to the same input replaces the
  first.
- *Drag blocks by their title bar* via pointer events (works on
  touch). Pin clicks short-circuit drag, so a click on a pin always
  reaches the wiring handler.
- *Inspector* is a full-width strip below the canvas — not a third
  column, which left the canvas too narrow. Horizontal row of
  stacked label / field pairs for the selected block's params; live
  edits feed back on the next tick.
- *Delete / Backspace* removes the selected block (and its wires) or
  the selected wire. *Escape* cancels a pending wire.
- *Run / Pause / Step / Reset / Clear* sit above the workspace.
  Reset clears every block's state without altering the graph
  (timers restart, PID integral zeroes, latches drop).
- *Wire colours encode pin kind* — analog = `--blue`, digital TRUE
  = `--accent`, digital FALSE = `--border` (gray). No new `:root`
  token needed.

**Layout — desktop-first interaction, intentionally.** The
friction-file pre-accepted desktop-only ("drag-wiring on a touch
device is its own design problem"). Below the 860 px breakpoint the
palette stacks above the canvas, a `.fbe-narrow-note` sets
expectations, and the tool still functions (pointer events cover
touch for both dragging and click-wiring) — the real cost on small
screens is screen real estate. Canvas inner is 900×480 with
horizontal scroll; examples lay out left-to-right within it.
Wiresheet scrolling is the expected behaviour for this kind of tool
— every real wiresheet scrolls.

**Update *(2026-06-13)* — desktop-only made hard, not soft.** The
"tool still functions on touch" claim above was wrong: dragging a
block and panning the canvas are the *same* finger gesture (nothing
sets `touch-action: none`), so the drag never lands. Fixing that
means a separate pan affordance + drag-handles — real work, pointless
for a tool that's desktop-only anyway. So the soft narrow-note was
replaced by a hard gate: `@media (max-width: 999px), (hover: none)
and (pointer: coarse)` hides the whole `.fbe-live` workspace and flips
the shared `.desktop-only-sim` tips panel visible in its place (a
short "open on a desktop" line + five mental-model bullets that teach
the wiresheet without the canvas). Same gate now hides the
`.fs-desktop-only` fullscreen button and, via a `matchMedia('(min-width:
1000px)')` guard, parks the 10 Hz scan below the width so a hidden
sheet doesn't burn ticks. The 999 px line matches the long-standing
`.fs-desktop-only` threshold; the touch clause catches landscape
tablets ≥1000 px that a finger still can't drive. The same treatment
shipped on the **Controller Wiring Simulator** in the same PR — see
its section.

**Out of scope (deliberate, parked):**
- *Persistence / save / load / JSON export.* Session-only — same as
  every other tool on the site. The Controller-commissioner entry
  remains the place to start the persistence conversation.
- *Touch-optimised drag-wiring.* Pre-accepted desktop-first.
- *Pulse timer, average, additional comparators.* Trivial registry
  entries; add when a real use case asks.
- *Deeper pid-tuner ↔ editor integration.* The PID block stands on
  its own; deeper PID pedagogy stays on `pid-basics.html` (cross-
  linked from the lesson, accessible via the PID block's behaviour).
- *Multi-pass settling beyond one tick.* One-tick-delay is
  sufficient for v1 and matches how real controllers behave.

**Live-signal wire animation *(2026-06-12)*.** Part of the sims
fun-and-flashy pass (with the VFD-mock face fix and the staging
sequencer's device cards). While the sim runs (`.fbe-running` on the
canvas, toggled in `setRunning`), energized wires march from source
to sink: digital TRUE pulses briskly (dash 7 5, 0.45 s), analog
crawls with a long dash (9 3, 1.1 s) so the line stays traceable.
FALSE wires stay still — a dead wire doesn't pulse; a paused sheet
is fully static, which makes run/pause legible at a glance. Both
dash periods are 12, so one keyframe (`offset −12` = exactly one
cycle) serves both speeds seamlessly. Wire paths are drawn
output → input, so the negative dashoffset walks in true signal
direction. Works because the wire `<path>` elements persist across
ticks (`refreshValues` only rewrites class attributes; `renderAll`
rebuilds only on structural edits) — CSS animations never restart
mid-run. Gated on `prefers-reduced-motion: no-preference` rather
than relying on the global reduce block: that block only freezes
animations, and frozen dashes would read as the selection dash
pattern — reduced motion keeps fully solid wires. Selected wires
opt out (selection owns the dash pattern).

### Function-block programming — paired Education page *(shipped 2026-05-22)*

**One question:** *what is function-block programming, and why do
controls people use it?* Ships at
`html/education/function-blocks.html` as the lesson half of the
Function-Block Editor pairing, mirroring `vfd-mock ↔ vfds` and
`pid-tuner ↔ pid-basics`.

In scope (sections shipped):
- *Blocks and wiresheets* — what a block is (pins, body, output),
  what a wiresheet is, the digital / analog distinction. Anchored
  by a static SVG annotating a single AND block (inputs ·
  behavior · output).
- *Why controls people work this way* — the diagram is the program,
  you can watch it run, the vocabulary travels across vendors.
- *The block families* — a six-callout grid (I/O · Boolean ·
  Comparator · Math · Timer · Control), one paragraph each. The
  Control card forward-links to `pid-basics.html` for PID
  internals.
- *How a wiresheet runs* — the scan, combinational settling in
  dependency order, the one-tick-delay for feedback. The same
  semantics the editor's engine implements; the lesson explains the
  *why* the editor demonstrates.
- *A worked sheet — economizer enable* — capstone walkthrough of
  the same six-block sequence the editor ships as a default
  example. A full static SVG wiresheet with blue analog wires and
  green digital-TRUE wires.
- *Build one yourself* — `.cta-button` to the editor as the closing.

Out of scope (forward-links, not content):
- The editor itself — full hands-on lives in the tool (closing CTA;
  the tool's preamble links back).
- *PID internals* — `pid-basics.html` cross-link.
- *Vendor-specific environments* — cross-manufacturer discipline,
  brief mention only.
- *An embedded live mini-demo using `fbe-engine.js`* — considered
  during scoping, parked: the editor is the interactivity, one
  click away, and a redundant demo would dilute it. Same logic the
  psychrometrics-basics page applied (forward-link to the chart
  tool rather than re-doing the visualisation).

**Diagram CSS — page-local `.fb-svg` class** (precedent: `.vfd-svg`).
Block-diagram structural drawings get their own page-local class;
the `.edu-svg` family stays scoped to pipe-flow diagrams with
`data-flow` annotations. Two SVGs ship on the page: the
anatomy-of-a-block schematic and the economizer-enable wiresheet.

**Cross-links wired both directions:**
- Tool → lesson: the editor's `.tool-preamble` carries "New to it?
  Start with Function-Block Basics →" from day one.
- Lesson → tool: inline anchors plus the closing `.cta-button`.

**Forward-link debts this page incurred:** none net-new — the
related future page (`pid-basics.html`) already exists, so the
lesson cross-links to it for PID internals without a `[future:]`
marker.

### Controller commissioner *(larger build — reviewed 2026-06-10: stays parked)*

**Reviewed 2026-06-10 (mock-call audit, owner concurred): stays
parked.** It's the opposite of the site's proven pattern — the wins
(dew-point, address↔offset) are fast, stateless, single-number tools
born from specific struggles; this is stateful, multi-session, and a
CMMS-creep magnet, and none of the five audit scenarios reached for
it. The on-pattern alternative for the commissioning itch is the
**commissioning Education lesson** (already owed by three
forward-link debts). Revisit only if a real job makes the owner want
it again. Original sketch preserved below.
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

### Education page conventions

**Engine conventions.** When functionality benefits from a shared
script (the PID simulator, the flow animation engine, future
thermo/mixing models for Twin-T or similar), it lives under
`html/scripts/` as a classic script (no `type="module"`) named
`<purpose>-engine.js`, exposing plain globals — `PID_PROC` /
`simulatePid` for the PID engine, `FlowEngine.init()` for the flow
engine — that inline page scripts (loaded after the engine) consume.
Engines don't share code with each other; the shared *convention*
(location, naming, classic-script + globals) is the integration. If a
third engine appears that genuinely shapes like one of the existing
two, revisit then — don't pre-abstract a "core."

The Education explainer pages land harder if the schematics move — flow
pulsing around a loop, the injection pump speeding up and the supply
temperature creeping up. The framing that anchors this work: a tech on
a roof on limited cell service should still get full value from the
page. That sets the bar — static SVG carries the full meaning, motion
is additive only, page renders usefully on a phone with two bars.

**Per-diagram scope on `education/hydronic-loops.html`:**
- *2-Pipe Direct Return* — illustrative ambient motion. Same particle
  behavior on every branch (constant velocity, equal spacing); because
  path length to near vs. far loads is unequal, the near load's round
  trip visibly completes sooner than the far load's. That asymmetry is
  the contrast Reverse Return cancels.
- *Reverse Return* — illustrative ambient motion. Return-main flow
  direction matches supply (the contrast with Direct is the point),
  load-branch speeds roughly equal.
- *Twin-T Primary-Secondary* — graduates to a small **interactive
  widget**: slider on injection-pump speed, system supply temperature
  shifts color in response, worked-example flow numbers update live.
  Same precedent as the PID mini-sims — interactive doesn't only live
  in Tools, it lives wherever it teaches. See "Where interactive
  widgets live" below.
- **viewBox empty space ≠ CSS whitespace.** If a diagram's pipework
  doesn't fill the rendered SVG width, check the content's bounding
  box against the viewBox before reaching for CSS. Content should
  fill its viewBox so `.hd-svg { width: 100% }` does what it looks
  like it should.

**Progressive-enhancement baseline.**
The static inline SVGs are
deliberately the baseline this layers onto: every equipment element is
a named `<g>` (`#d3-boiler`, `#d3-injection-pump`, `#d3-load-A`, …),
every pipe run is a named `<path>` / `<line>` (`#d3-inject-pipe`,
`#d3-system-return`, …), labels are real `<text>`, and flow arrows are
grouped (`#d3-flow-arrows`). The animated version is *additive* — a
small JS particle engine (`/scripts/flow-engine.js`) walks discrete
`<circle>` particles along the named paths via `getPointAtLength()`,
keyed off `data-flow="supply"|"return"` attributes on each path; the
static flow arrows stay on as the motion-off direction cue. The Twin-T
section adds a small `<script>` for the injection-pump slider — not a
rewrite. Anything new under `education/` keeps that habit: clean named
groups, semantic ids, equipment as separately-targetable elements. The
dashed return is the static-state encoding; in the animated state the
engine drops the dashes and direction-of-motion carries the redundant cue.

**Prose-above-diagrams convention** *(Education pages)*

All prose for a section sits above its diagram; the diagram is the
visual capstone after the explanation rather than the centerpiece
that prose flows around. Includes intro, mechanism explanation,
worked examples, and synthesis paragraphs. The legend stays
immediately below the diagram. Interactive widgets (where present)
sit below the diagram with any associated callouts.

Driven by the d3 case where the diagram + widget pair has to fit
in a single viewport for the interactive feedback loop to work.
Below-diagram prose pushed the widget too far down to see the
particle response while dragging the slider. Lighter fixes (sticky
positioning, viewBox trim, side-by-side layout) didn't fully solve
it; the convention change does, and it stays predictable for AHU
and future Education pages.

Tradeoff knowingly accepted: d1 and d2 lose their below-diagram
synthesis paragraphs (now above), which slightly changes the
rhythm of those sections. The diagram becomes punctuation rather
than centerpiece. Reads naturally; not a loss.

Consequence worth knowing for future Education pages: prose-above
produces tall sections. d3 lands at ~1700px total because the
worked-example aside and the synthesis prose both sit above the
diagram. Worth a pull-through at the bottom of every section —
d3 has the widget, future sections should either keep prose tight
or earn the length with a payoff at the bottom worth scrolling
for.

**Animation policy.**
- No JS framework or animation lib (Mermaid, D3, GSAP, Lottie) —
  hand-written, same "no build step" property as everything else.
- Flow indication is a vanilla JS particle engine
  (`html/scripts/flow-engine.js`), driven by `requestAnimationFrame`,
  walking `<circle>` particles along `data-flow`-annotated paths via
  `getPointAtLength()`. CSS for static styling only.
- Constant particle velocity globally — longer paths take longer to
  traverse. Intentional and pedagogical: the contrast between Direct
  Return (unequal cycle times to near vs. far loads) and Reverse
  Return (equal cycle times) depends on it.
- Per-segment particle pools, no path-stitching at branches. Each
  path cycles its own pool independently; flow continuity at tees
  reads correctly as long as the rates match.
- Ambient continuous motion (peripheral, slow) is in-bounds — matches
  what a live BAS graphic does. The test is "would this distract a
  tech reading on bad cell." If yes, don't.
- Demanding-attention motion is out: full-screen takeovers, video-
  style flourishes, bouncy easing. That's the spirit of "no autoplay."
- Honor `prefers-reduced-motion: reduce` — engine short-circuits at
  init, no alternate render path; the static SVG is already the
  correct reduced-motion state.
- The page must still teach with the animation off and on any device.
- The dashed-stroke-vs-moving-particle perceptual issue and the 
screen-only toggle that fixed it. Future animations on any 
dashed-encoded element will hit this; recording the resolution saves 
the rediscovery.
- The path/line/circle/etc. selector convention — return-flow markup
uses mixed element types, so attribute selectors should be 
[data-flow="return"] not path[data-flow="return"]. Small but exactly the 
kind of catch that costs an afternoon next time.
- **Animating a diagram audits its static markup.** Latent
  inconsistencies that survive prose review — a flow arrow
  pointing the wrong way, a path drawn against direction, a label
  placed near the wrong element — surface immediately once
  particles contradict them. Hit on d3 (a return-flow arrow apex
  pointing right while the engine demonstrably moved particles
  left). Expect more on future diagrams; the audit is a feature
  of the work, not noise.
- **Edge case: state-dependent callout reserved height.**
  Widgets whose callout text changes between states should
  reserve space for the worst-case content. d3's failure-state
  anecdote exceeds the 4.5rem reserved alert min-height on
  narrow viewports (~7 lines on a 375px column), pushing
  subsequent content down. Documented limitation rather than a
  bug — the back-link below shifts but nothing overlaps. Future
  state-dependent widgets should either reserve for the longest
  state or accept the same reflow.

**Engine attribute conventions.** Three opt-in attributes on
annotated paths. New surface bubbles up to this list first so the
engine's API doesn't grow ad-hoc — `flow-engine.js` is a small
file and the cost of an unrecorded attribute is that the next
page invents its own variant.
- `data-flow="supply"|"return"` — required marker that attaches
  an element to the engine. Picks particle color (`SUPPLY_FILL` /
  `RETURN_FILL`) and is the selector future CSS hooks key off
  (see the screen-only dashed-return override above).
- `data-flow="air"` *(added 2026-07-09, forced-air buildout PR 1)* —
  air ducts. Particle fill follows the element's `stroke` attribute
  (the same rule as the pulse-color default), so ONE type serves
  every air stream: OA `--teal`, RA `--blue-cool`, SA `--blue`, EA
  `--text-dim` live in the markup, and a pool rebuild reproduces
  them by construction (structurally immune to the #96 recolor-wipe
  class — no `setPathColor` needed for static stream colors; a page
  that recolors air ducts dynamically layers `setPathColor` on top
  and owns the rebuild caveat — the refrigerant-loop sim does this
  since PR #354: its indoor-exit lanes frost-recolor on the freeze
  latch, the recolor re-applied every solve so a density rebuild
  can't wipe it; the economizers page (buildout PR 2) kept its
  modulating diagram static and let `data-flow-density` carry the
  recipe instead). Falls back to `SUPPLY_FILL` with no stroke.
  Dashed exhaust/relief ducts drop their dashes while animated
  exactly like the water return — the shared rule in styles.css
  targets `[data-flow="air"][stroke-dasharray]`.
  One more accepted color-string form *(added 2026-07-17, the
  refrigerant-loop serpentines)*: `setPathColor` passes strings
  through verbatim, so `url(#…)` gradient references work as
  particle fills. Two-part contract: the gradient must declare
  `gradientUnits="userSpaceOnUse"` — the engine's particles are
  `<circle>`s placed by cx/cy in root user space, so only a
  user-space ramp samples at each particle's true position — and
  the page must re-apply the fill after every `refreshPath`, since
  a pool rebuild resets particle color to the `data-flow` default
  (for a gradient consumer that rebuild IS the wipe class the
  static air-stream rule above is immune to).
- `data-flow-reverse="true"` — optional, default false. Walks the
  path end-to-start instead of start-to-end. Use when a path is
  drawn against flow direction and rewriting the `d` /
  `x1,y1→x2,y2` would scramble adjacent geometry semantics. d1
  and d2 needed none; we'll see whether d3's bridge needs it.
- `data-flow-density="<float>"` — optional, default 1.0, range
  (0, 1.0]. Per-path multiplier on the engine's baseline particle
  spacing — `density 0.4` ⇒ particles spaced `SPACING / 0.4`
  viewBox units apart (sparser). For diagrams where uniform
  density misreads: Twin-T's bridge at baseline injection should
  visibly carry less particle traffic than the primary or system
  loops, since the whole point of the diagram is that most of
  the building's water never passes through the boiler. Immediate
  downstream consumer is the Twin-T injection-pump slider, which
  mutates the attribute live as the user drags.

Three rules ride with `data-flow-density` and are worth recording
alongside it:
- **Velocity stays global.** Density changes spacing only, never
  speed. This is what protects the direct-vs-reverse-return
  pedagogy (constant velocity, cycle time varies with path
  length) from getting muddied by a third axis on d3.
- **Engine caps at 1.0 on the upper end.** Densities above 1.0
  would imply pipes carrying *more* than the "main flow"
  baseline, which has no physical reading on any current diagram
  and would invite misuse later. Cleaner to clamp at the engine
  than to police it from the page.
- **Density is a visual encoding of relative flow, not absolute
  GPM.** The engine has no concept of hydraulics; page-level code
  (the slider) maps GPM → density before mutating the attribute.
  Keeping that translation outside `flow-engine.js` preserves the
  rule that the engine knows only paths, particles, and time.

**Engine public API.** Two methods on `window.FlowEngine`, named
to keep extension predictable without the surface growing ad-hoc:
- `init()` — scan the document, build particle pools for every
  annotated element, start the rAF loop. Idempotent for
  already-built pools (a second call rebuilds them in place).
  Pages call it from an inline `<script>` at the bottom of
  `<body>`, after the engine's `<script src=...>` tag.
- `refreshPath(el)` — rebuild one element's pool from its current
  attribute values. Pages call this after mutating
  `data-flow-density` (or any future engine attribute) so the
  engine picks up the change live. No-op under reduced motion,
  since `init()` never built any pools to refresh.

The refresh path is explicit rather than a MutationObserver inside
the engine. The page already knows when it just changed an
attribute, so an explicit call keeps the data flow easy to reason
about; a watcher would have the engine constantly checking DOM
for changes the page itself made, and would silently re-fire if
any other code touched the attribute. Explicit beats observed
when the page already knows what it did. New methods (if a future
engine extension needs one) bubble to this list before
implementation, same as new attributes.

### Load piping — Education page *(shipped 2026-05-14)*
*One question: what does the connection between a load and a
hydronic loop look like, and what does that connection point
have to decide?*

In scope: two-way valve at the load (variable system flow);
three-way valve at the load (constant system flow, mixing and
diverting); the tie-back to the twin-T's forward-reference
callout — which valve type the secondary loop is built around
determines whether secondary flow varies or stays constant.

Out of scope (forward links, not content):
- VFD pumping — [future: vfds.html] *(shipped 2026-05-14)*
- Hydronic balancing, circuit setters, PICVs — [future:
  balancing.html] *(shipped 2026-05-16)*
- Heat-pump loops, geothermal loops, condenser water/cooling
  towers — these are different *systems*, each its own future
  page
- Coil-specific behavior (chilled vs. hot water control
  direction) — brief mention only; full treatment is in coil-
  specific or sequence content

Pays off the twin-T (`hydronic-loops.html#d3`) discovery callout.
The closing section ties back explicitly. The twin-T subhead now
carries `id="d3"` as the cross-link anchor; the
"Find out what it is" callout on hydronic-loops is now a real
link to `load-piping.html` rather than a "coming soon"
placeholder.

**Balancing decision (recorded for the scope rule).** The
friction-file entry had originally floated balancing as a
possible in-page section if it stayed tight. During drafting it
was pulled out and replaced with a one-sentence forward link to
`[future: balancing.html]` *(shipped 2026-05-16)* instead. Reason: the page's one
question is about *valve choice at the connection point*;
balancing is a different function (making each load see its
design flow) on the same system, and a 3-paragraph treatment
would be a tease that opens more questions than it answers —
with no balancing page to absorb them yet. The "Education page
scope — one question per page" rule says different function =
its own page, and that was the trigger. The forward link
preserves the option without committing to the treatment.

**Forward-link debts this page incurred** (so the next pages
know what they're inheriting):
- `[future: vfds.html]` *(shipped 2026-05-14)* — referenced in the
  two-way section as the natural pairing for variable-flow systems.
  The VFDs page should tie back to load piping with the
  inverse framing ("here's the pump side of the variable-flow
  picture we set up there").
- `[future: balancing.html]` *(shipped 2026-05-16)* — referenced once
  in the three-way section, as a closing aside on why "constant flow" only means
  each load sees its design flow if the loop is balanced. The
  balancing page should tie back to load piping for the
  two-way/three-way context, since the balancing strategy
  differs between the two.

**Diagram-markup conventions (now animated).** Named `<g>`
groups, semantic id prefixes (`lp-2w-`, `lp-3wm-`, `lp-3wd-`,
`lp-tt-` for the tie-back diagram), real `<text>` labels,
grouped flow-arrow polygons, and `data-flow="supply"|"return"`
attributes on every pipe segment. The animation-ready markup
the page shipped with paid off in a follow-up pass: adding
`flow-engine.js` + the `@media screen` dashed-return override
+ a `FlowEngine.init()` call was the whole integration. No
markup retrofit needed except the one tee-split gotcha below.
Style classes (`.lp-svg`, `.lp-legend`) are inlined in the page
mirroring `hydronic-loops.html`'s `.hd-svg`/`.hd-legend`; if a
third Education page with diagrams appears, that's the trigger
to fold both into a shared `.edu-svg` rule in `styles.css`.

**Diverting-valve tee gotcha — converging flows need two
segments.** The horizontal at the bottom of the diverting-valve
diagram (and analogous geometry in any future converging-flow
diagram) carries two flows meeting at a tee: coil-out arrives
from the LEFT, bypass arrives from the RIGHT, combined output
leaves DOWNWARD. Drawn naively as a single `<line>` from
(coil-out point) to (bypass-down corner), the engine walks
particles in one direction along the whole line, which
animates one of the two converging flows backwards. Fix is to
split the horizontal at the tee into two segments — one per
incoming flow — each drawn in its own flow direction, and
coloured by its origin (return-dashed for coil-out side,
supply-solid for bypass side). The mixing-valve geometry on
this same page is already split correctly (`coil-out-h` and
`bypass-cross` are separate lines), which is why this only
surfaced on `lp-3wd-`. Rule for future diagrams: anywhere two
flows converge at a tee, draw each contributing leg as its
own `data-flow` element. Single lines are fine only where flow
is unidirectional along the whole segment.

**Diagram annotation layout — don't split sentences across
corners, don't dangle parentheticals far from their referent.**
Two specific failure modes caught on a label-review pass after
the diagrams shipped:

- A small dim-italic annotation pair like "total flow Q" at
  top-right + "varies with valve" at bottom-right reads as
  one sentence but forces the eye to jump between opposite
  corners of the diagram to assemble it. Fix: consolidate to a
  single short line in one place (top-right, paired
  horizontally with the existing "supply main →" label on
  the left, both in the same horizontal band — no eye-jump).
- A parenthetical sub-label like "(at coil outlet)" placed
  *below* the valve body, while its referent "3-WAY MIXING"
  sits *above*, reads as a dangling fragment. Fix: either
  drop the parenthetical entirely if the geometry already
  conveys what it says (valve at coil outlet vs. coil inlet
  is visible from where the valve is drawn), or stack it
  immediately next to its referent.
- When a sub-label is genuinely useful (e.g. "diverting"
  disambiguating Load B's 3-way valve type on the tie-back),
  parens around it are redundant: italic + dim colour already
  reads as a subtitle. Drop the parens.
- A valve label that floats in empty space far from its valve
  reads as orphaned, even when there's nothing it would collide
  with closer in. `lp-3wd`'s `3-WAY DIVERTING` originally sat at
  `x=190 anchor-end` while the valve started at `x=240` — a 50px
  gap with nothing in it — because the available horizontal
  real estate to the left of the valve was empty and the label
  drifted into it. An audit pass caught it and pulled it to
  `x=235 anchor-end` (~5px from valve). Rule: spacing should be
  governed by the valve, not by the size of the empty band the
  label happens to be drawn into.

The combined effect on `load-piping.html`'s annotations was
the loss of "(modulating)", "(at coil outlet)", "(at coil
inlet)", and four orphan halves of split-corner pairs — about
seven labels removed, all redundant or confusing — plus the
3-WAY DIVERTING reseat. Diagrams read cleaner. Rule for future
Education diagrams: write the labels last, then prune them;
every annotation should earn its real estate by saying something
the geometry can't, and sit snug to its referent.

**Label-audit maintenance pattern.** Screenshot every diagram on
a page in one pass, scan for orphaned labels / split-corner
sentences / dangling parentheticals / valve labels that drifted
into empty space, fix in a single edit cycle. Cheaper than
catching label drift one-by-one across unrelated PRs, and the
visual comparison side-by-side makes outliers obvious. Worth
re-doing periodically when the diagrams on a page have shifted.

**Tie-back diagrams mirror their referent's layout.** The page
closes with a fourth diagram (`lp-tt-…` prefix) that pays off
the twin-T discovery callout. It deliberately reuses d3's
equipment positions (boiler at the same x/y, bridge in the
same place, system loop on the right, loads at x=540 and x=680
to match d3 exactly) so the visual mapping is unmistakable —
the reader recognises the topology instantly and the new
content is just "what's INSIDE each load box." Cheap discipline
with a real payoff: don't redraw a referent diagram from
scratch when the tie-back is the whole point of the new
diagram. The rule generalises: any future Education tie-back
diagram should copy the referent's coordinate system as a
starting point and only diverge where the new content forces
it. Added in response to "the closing section is prose-only,
it doesn't *show* the connection" feedback — the prose-only
version of the tie-back was reading as commentary rather than
resolution.

**DPBV addition — system-level component the page was missing.**
Follow-up pass after the page first shipped: the tie-back
diagram showed the valve-at-load detail for both Load A and
Load B but didn't include the *differential pressure bypass
valve* at the far end of the system loop. User flagged the
omission ("there's still one component missing, the balancing
valve at the far end of the loop"); consultation confirmed DPBV
was the intent (not a CBV — the "far end of the loop" phrasing
was the giveaway, since DPBVs live opposite the pump where
head climbs highest) and the user preferred "just add it to
the tie-back + prose" over a separate two-state diagram. Added
as a bowtie symbol (`lp-tt-dpbv`) on the right-edge vertical
at (760, 115), label `DPBV` snug to its left, plus a prose
paragraph between the two-way and three-way paragraphs in the
closing section. The right-edge vertical is already part of
the `system-return` animated path, so no topology or animation
changes were needed — the valve is just a discrete symbol on
the existing pipe. The SVG `<desc>` was updated for
accessibility. Symbol is identical to the 2-way control-valve
bowtie; disambiguation is by label + prose.

*Future expansion possibilities for the page.* User noted "we
may add a full diagram, and maybe more about DP later on" —
recorded here so options stay on the table. Grouped by topic:

DPBV-related:
- A small two-state inline diagram showing the DPBV closed at
  high demand (all flow through loads) vs. open at low demand
  (minimum bypass keeps pump alive). DPBV behavior is a
  feedback-loop concept that doesn't read from one static
  drawing; the two-state view would let the prose shorten from
  ~95 words to ~40.
- A distinct DPBV symbol (e.g. bowtie with a spring or Δp-sense
  indicator) so it's not visually identical to the 2-way
  control valve at Load A. Optional even with the current label
  disambiguation, but cleaner if the page expands its DP
  content.
- More on differential pressure as a general controls topic
  (pump curves, system curves, where the operating point lives,
  why ΔP-based pump control is increasingly common). That's
  likely its own Education page rather than load-piping
  expansion — VFDs page or a dedicated pump-control page.

Loop-level coverage (carried forward from the pre-ship
"Load-piping strategies" planning entry, since the shipped page
deliberately scoped narrower — just valve choice at the load —
than the original planning):
- **Decoupler approach** as an alternative to the
  closely-spaced-tees / DPBV story. Some installations use a
  hydraulic separator (decoupler tank or large-diameter common
  pipe) instead of tees + DPBV; functionally similar but the
  visual schematic is different and the failure modes differ.
- **Terminal-unit piping families** — fan-coil units, radiant
  manifolds, AHU coils, baseboard, induction units, chilled
  beams. Each load type carries its own piping conventions that
  the current "generic coil box" abstraction flattens. Could
  become its own page if it gets long, or a short addendum
  here.
- **The broader bypass-strategy landscape** — pairing valve
  type (2-way vs 3-way) with system type (constant-flow vs
  variable-flow) with pumping strategy (constant-speed vs VFD)
  in a single decision table or matrix. The current page
  threads this implicitly through prose; a synthesis aid could
  help job-site readers map their plant onto the lesson.

Closing widget *(shipped 2026-05-23)*:
- **"See what the bypass does"** — capstone widget at the end
  of `.tool-body`, after the closing prose at the bottom of the
  twin-T tie-back section. Closes out the load-piping page's
  former "no interactive payoff" gap and brings the page into
  line with the rest of the variable-flow quartet (`vfds` /
  `pump-control` / `balancing`), each of which already closes
  on a widget.
- **Job — make the MIN-FLOW callout vivid.** Section 3's
  prose introduces the bypass as a fixture that protects a
  system pump from dead-heading when 2-way loads throttle
  down, but the reader was only *told*. The widget lets them
  watch the floor disappear and reappear under one toggle.
- **Three knobs, four readouts, one schematic.** Slider on
  *building demand* (0–100%, throttles all three loads in
  unison); segmented toggle for *pump type* (`vfd` / `cs`);
  segmented toggle for *min-flow bypass* (`off` / `on`).
  Readouts: a PUMP state pill (`OK` / `WARN` / `DEADHEAD`,
  color-shifted via `data-state` on `#lp-w`, mirroring
  balancing's per-row idiom), SYS FLOW (GPM/L·s), PUMP SPEED
  or PUMP HEAD (% only — label swaps with mode), BYPASS FLOW.
  Full-width head/speed bar under the columns with a design
  tick at 100% (CSS `::after` cribbed from
  `.bal-w-bch-bar::after`); the bar dual-codes — in VFD mode
  it tracks pump speed (shrinks below 100%), in CS mode it
  tracks pump head (grows past 100% toward shutoff at 140%).
  Small SVG schematic on the left: 3 loads with bowtie 2-way
  valves on a supply/return main, system pump at the bottom
  left, MIN-FLOW crossover at the far right. Bypass-leg
  particles toggle via `FlowEngine.setPathColor()` (the engine
  can't tear down particle pools when `data-flow` is removed —
  `flow-engine.js:178` / `:149` — so recolouring to
  `transparent` is the honest workaround; pipe stroke stays
  visible since the bypass is a present-but-closed fixture).
  CSS prefix `lp-w-`, matching the `pc-w-` / `bal-w-` / `vfd-w-`
  family.
- **Easter-egg anecdote — pinned once shown.** Reveals when
  `data-state="deadhead"` with VFD selected and bypass off
  (the canonical failure-mode corner); forward-links
  `vfds.html` and `pump-control.html`, paying off two of the
  page's existing forward-link debts. Same pinned-once-shown
  semantic as the balancing / pump-control / vfds anecdotes.
- **Presets — `design day` (50% / CS / off) and `quiet night`
  (10% / VFD / off).** One-click path to the deadhead corner
  for keyboard or time-strapped readers; standard `.widget-try`
  row at the top of the widget.
- **Deliberately deferred (scope discipline).** No H-Q curve
  canvas (that's `pump-control.html` widget 1's job). No Hz
  or ft anywhere — only `%` on PUMP SPEED / PUMP HEAD.
  Pump-control owns the dimensioned pump-curve teaching. The
  VFD/CS toggle is the *only* place this widget flexes the
  page's "one question" scope — it does so because the bypass
  means very different things on the two pump types and the
  MIN-FLOW lesson collapses if only one type is shown. Future
  reviewers: don't "fix" the absent Hz axis. It's absent on
  purpose.

### Balancing — Education page *(shipped 2026-05-16)*
*One question: how do you make sure every load in a hydronic
system actually receives the design flow it was sized for — and
how do you know when it isn't?*

Closes out the variable-flow trilogy as a quartet (load piping →
VFDs → pump control → balancing). The page inherits forward-link
debts from THREE prior pages — `hydronic-loops.html` (d1 direct-
return "every load needs a balancing valve" callout; d2 reverse-
return self-balancing claim), `load-piping.html` (three-way
constant-flow claim being conditional on balancing), and
`pump-control.html` (DP setpoint reset depending on each load
holding its own flow at low Δp) — and the closing section pays
off all three explicitly.

In scope (sections shipped):
- *A real riser, with balance valves at every branch* — opening
  hook quoting the hydronic-loops d1 half-sentence, plus the
  page's main pipe-flow diagram (4-floor riser, CBV at every
  branch, `.edu-svg` + flow-engine animated, pump in the basement
  with near/far hydraulic-distance callouts)
- *Calibrated Balancing Valves (CBVs)* — what they are, the √Δp
  orifice behaviour, the proportional balancing procedure, where
  they fit (constant-flow good, variable-flow awkward), failure
  modes (trim drift, port clogging, system-change invalidation)
- *Automatic Balancing Valves (ABVs)* — spring-loaded cartridge,
  compensation range, sizing as the load-bearing detail, where
  they fit, failure modes (cartridge stuck, sizing mismatch)
- *Pressure-Independent Control Valves (PICVs)* — control valve
  wrapped around an ABV cartridge, modern default for variable-
  flow, pairing with DP setpoint reset, overkill on constant-
  flow, actuator-failure mode
- *See it side-by-side under varying Δp* — the page's interactive
  widget (Widget structure below)
- *How do you know when the loop isn't balanced?* — diagnostics
  section, `.ref-table` of symptom → meaning → how-to-confirm,
  plus one narrative walkthrough (CBV system + post-descale
  refill drift starves floor 4)
- *Tying it back to the rest of the story* — explicit closing
  tie-backs to hydronic-loops, load-piping, and pump-control,
  plus a forward-pointing callout to the future commissioning page

Out of scope (forward links, not content):
- The commissioning procedure itself — proportional-balancing
  walk-through, sign-off documentation, tooling — [future:
  commissioning.html], referenced in the closing forward callout
- System-level DPBV — covered on `load-piping.html` (cross-link)
- Reverse return as a passive balancing approach — covered on
  `hydronic-loops.html` d2 (cross-link from closing section)
- Coil sizing / mass-flow design ("where does the design flow
  number come from") — [future: coil-selection.html] *(shipped
  2026-07-14)*, mentioned in the diagnostics section
- Specific manufacturer cartridge curves / Cv math / authority
  algebra — keeps the cross-manufacturer pattern, same scope
  discipline as the vfds page

**Widget — three branches, one slider.** Single slider on
"available Δp across the load branches" (1–60 ft of head; design
point = 20 ft). Three parallel rows — CBV / ABV / PICV — each
sized for the same design flow (30 GPM @ 20 ft Δp) so the only
difference between branches is the valve behaviour. Each row
displays live flow (with US/metric toggle), % of design, a fill
bar with a design-tick at 66.6 % of the 0–150 % scale, and a
state pill (HOLDING / STARVED / OVER) that color-shifts via
`data-state` on the row container. CBV uses pure √Δp orifice
law calibrated at design; ABV holds within a 3–50 ft Δp
compensation range and behaves as orifice outside; PICV holds
above 2 ft Δp and linearly ramps to zero below. CSS prefix
`bal-w-` inline on the page, matching the `pc-w-` pattern from
pump-control.

**Anecdote — extreme-low-pressure reveal.** Trigger fires at
Δp ≤ 4 ft (CBV branch clearly starving, PICV still comfortably
holding). The reveal is the user's actual war story: multi-floor
CBV-balanced heating system, pumps got knocked off setpoint
seasonally, available Δp at the far branches dropped, far-end
coil froze and burst. Once shown in a session, stays pinned (same
semantic as the d3 widget anecdote, pump-control deadhead
anecdote, and vfds classic-mistake reveal). Border-left is `--red`
on the callout rather than `--blue` — heavier visual weight,
because the failure mode under discussion is also more severe
than the gentler "missed-setting" stories on prior pages.

**Per-valve symbol diagrams.** Three small static SVGs (~360 ×
120-150), one above each valve section, showing the distinguishing
feature: CBV gets the handle wheel + position-lock indicator + P/T
ports; ABV gets the spring cartridge inside the body; PICV gets
the cartridge + actuator on top. Not `.edu-svg` — these are
reference schematic snippets, not pipe-flow diagrams, so they
carry a page-local `.bal-valve-fig` wrapper instead.

**Tone — practitioner-heavy, as planned.** Each valve section
follows the same internal rhythm: what it is mechanically / how
it behaves / where it fits (variable-flow vs constant-flow
context handled inside the section, per the valve-type spine
decision) / how the trade actually uses it / what goes wrong.
Section depth ~5 paragraphs each, matching pump-control's
rhythm. Diagnostics section uses the symptoms-table-plus-narrative
format (Round 3 answer); narrative case is a CBV system whose
post-descale refill silently invalidated the original balance,
caught on a manometer walk.

**Forward-link debts this page incurred:**
- `[future: commissioning.html]` *(controls half shipped 2026-07-14 as
  `controls-commissioning.html`)* — the explicit scope cut. The closing
  callout named it "Coming later: a lesson on commissioning"; that callout
  is now a "See also" cross-link to the shipped **Controls Commissioning**
  lesson, which frames commissioning as three efforts (controls functional
  testing / hydronic balancing / air balancing) and walks the controls half
  in depth. Still future: the hands-on proportional-balancing job-site walk
  ("balancing as job-site activity") — the shipped page covers the controls
  side, not that.
- `[future: coil-selection.html]` *(shipped 2026-07-14)* — mentioned
  in the diagnostics intro as the upstream source of the design-flow
  number. Shipped as the hydronics-cluster explainer for the
  load-to-flow chain; the balancing diagnostics intro now anchors it
  (the forward-link was added at ship time — the pre-ship page had the
  topic in prose but not yet as a link).

**CSS / pattern notes for the next Education page:**
- Widget chrome is yet another instance of the
  `recessed --surface-3 panel` + `mono section labels` + `blue
  readouts` + `anecdote callout with min-height reservation`
  pattern. Third Education widget after pump-control's two, plus
  vfds's run/speed widget and hydronic-loops' d3 injection-pump
  widget. The five widgets now share enough visual vocabulary
  that promoting `.pc-w-*` / `.bal-w-*` / `.vfd-w-*` to a shared
  `.edu-w-*` rule set in `styles.css` is starting to look like a
  next-restructure-pass candidate. Not urgent (each page's prefix
  reads cleanly); flag for when the sixth widget shows up.
  *(Followed up 2026-05-16: shared shell extracted to `.widget-*`
  in `styles.css` as Block C #5 — see codebase-issues.md. Each
  page's `.pc-w-*` / `.bal-w-*` / `.vfd-w-*` / `.vfdm-*` /
  `.d3-w-*` prefixes still cover the page-unique internals — LCDs,
  keypads, branch rows, valve pills, fan icons, temp swatches,
  pump-curve canvases. The "sixth widget" trigger above is
  effectively retired.)*
- The `data-state` attribute on the branch row, swapping border /
  bar fill / state-pill colour, is a clean idiom worth reusing
  for future state-driven widgets. Same idea as the
  `flow-engine`'s `flow-active` CSS hook.

**Forward-link payoffs landed (this session).** Same convention as
pump-control's "Forward-link payoffs landed" subsection — when a
new page ships, sweep prior pages that forward-linked to it (or
naturally mentioned the topic) and convert plain-prose mentions to
active anchors per the "anchor only if the target exists today"
rule. Three prior pages updated in this pass:
- `load-piping.html` (the strongest debt) — the section-3 callout
  was previously plain prose ("...will get its own lesson here when
  it's written"). Now anchors to `balancing.html` with a one-sentence
  frame of what the lesson covers.
- `hydronic-loops.html` d1 and d2 — both naturally mention
  "balancing valve(s)" in their closing prose. The phrase is now
  an active anchor on each. No prose rewriting needed; just the
  anchor.
- `pump-control.html` "Tying It Together" closing — extended with
  a one-sentence addition framing balancing as the load-side detail
  underneath the variable-flow trio, and explicitly noting that
  PICVs are the natural pairing for aggressive DP-reset. Threads
  balancing into the variable-flow story without rebuilding the
  closing paragraph.

**Review-pass findings (post-ship 2026-05-16).** A focused review
after the page first shipped surfaced four issues, all fixed in
the same session:
1. *Missing CSS classes referenced in prose.* The widget intro
   paragraph used `<span class="bal-w-tag-design">HOLDING</span>`
   (and the starved/over equivalents) to colour-prime the reader
   on the state vocabulary they were about to encounter — but
   those classes were never defined, so the spans rendered as
   plain inline text. Added `.bal-w-tag-holding` /
   `.bal-w-tag-starved` / `.bal-w-tag-over` to the widget style
   block, mirroring the per-state colours used by
   `.bal-w-branch[data-state="*"]` further down. Lesson: every
   class name written into prose has to exist in the stylesheet,
   and visual prose review (without rendering) can miss this.
2. *Grammar in the same paragraph.* "Hold each branch at design
   (HOLDING) is the goal" parses as a broken sentence. Rewritten
   to lead with the state definitions: "HOLDING means flow is
   within ±15 % of design; STARVED is below 85 %; OVER is above
   115 %." Same information, sentence works.
3. *Slider foot labels weren't unit-toggle aware.* The "1" and
   "60" min/max labels under the slider were hardcoded ft values
   — switching the global units toggle to metric would have left
   them at "1" and "60" while the live readout above moved to m.
   Added `data-us` / `data-metric` attributes so the units walker
   rewrites them ("1 ft" ↔ "0.3 m", "60 ft" ↔ "18 m"). **General
   lesson for future widgets:** every visible unit-bearing number
   needs the toggle hooks, not just the live readout. Audit
   widget chrome for absolute axis / range labels alongside the
   live values.
4. *One flow arrow drawn the wrong way.* The pump-to-supply leg
   at the bottom of the riser (line `bal-riser-pump-to-supply`)
   is drawn right-to-left (from x=385 to x=200) since flow leaves
   the pump and enters the supply riser. The corresponding arrow
   polygon at (300, 460) was authored with apex at x=309 (pointing
   right) instead of x=300 (pointing left). A single-coord swap
   fixed it. Same pattern as the "animating a diagram audits its
   static markup" lesson recorded in the animation policy — even
   without an animation pass, every arrow on a complex diagram
   benefits from a tracing-the-flow walk-through during review.

### Protocol education pages — Modbus shipping, BACnet to follow

The site's education footprint was HVAC + hydronics heavy through
2026-05; building-controls work is at least as protocol-heavy. The
protocol-side tools (BACnet/IP converter, Modbus register viewer)
shipped first; this section is where their paired explainers live.
**Nav-placement open question settled (2026-05-23):** pages land
under `/education/` alongside the HVAC pages. Reading-order argument
won — adding a third top-nav hub would crowd Tools / Education /
Contact, and discoverability is paid by tool-page cross-links.
A new `Protocols` filter-chip was added to `/education/` so the
chip grid still gives the protocol pages a one-click pull-out.

### Modbus Basics — Education page *(shipped 2026-05-23)*
*One question: what is Modbus, and what shape does a request on the
wire actually take?*

The first protocol explainer, paying the Modbus Register Viewer
tool's forward-link debt — its five-bullet "essentials" row closed
with *"A fuller Modbus education page is on the roadmap"* and now
points at this page. Scoped per the friction file's two-page split
(decided during this scoping pass): page 1 covers the message shape
and the data model; page 2 (`modbus-decoding.html`, future) will
cover what the sixteen bits returned in a successful response
actually mean.

In scope (sections shipped):

- *What Modbus is, and isn't* — Modicon 1979, function codes + data
  model, the RTU-vs-TCP framing-only difference, the "dumb on
  purpose" framing, client/server polling pattern (modernizing the
  master/slave terminology in one parenthetical). Static SVG of the
  client→request, server→response flow.
- *The four data tables* — coils / discrete inputs / input registers
  / holding registers, sorted along read/write × 1-bit/16-bit.
  Rendered as a `.callout-grid` of four cards in the
  function-blocks-page idiom rather than a 2×2 matrix SVG — the
  callout-grid carries the same information with less custom markup
  and matches the precedent.
- *Function codes — reading and writing* — FC01–06/15/16 pattern
  (single vs multiple, coil vs register), with FC03/04/06/16 named
  as the BMS-frequent quartet. Defers the full FC table to the
  Modbus tool's reference panel rather than reprinting it. Static
  SVG of an FC03 request frame (eight labeled byte cells: server,
  FC, starting address ×2, quantity ×2, CRC ×2) with grouping
  brackets and a worked caption.
- *When something goes wrong — exception responses* — the high-bit-
  set FC echo (`0x03` → `0x83`), the one-byte exception code, the
  four most-common codes in BMS work (`0x01`–`0x04`) explained with
  a typical scenario each. Static SVG of a three-byte exception
  frame with the high-bit byte highlighted in `--red` and an
  annotation arrow.

Out of scope (forward links):

- Byte order / 32-bit pairs / scaling / signed vs unsigned / 5-digit
  vendor numbering — `modbus-decoding.html`, the second page of this
  pair (forward-linked in the closing section as plain prose since
  the target page doesn't exist yet; the closing also anchors back
  to the Modbus Register Viewer tool as the practitioner cheat
  sheet).
- BACnet's object-property model as the *anti*-Modbus design choice
  — `[future: bacnet-basics.html]` *(shipped 2026-05-23)*, contrasted only by a single
  parenthetical ("A BACnet object knows its own type, units, scale,
  and name; a Modbus register is just sixteen bits") rather than a
  scoped section.
- Modbus RTU CRC computation, RS-485 multidrop wiring, baud-rate
  config — `[future: modbus-wire.html]` if demand surfaces. v1 stays
  protocol-logic-only; the wire details are a different question.

**Widget decision — drafted out.** The framing-widget candidate
(pick an FC, see the request/response frame shape) was considered
during scoping and not built. The static FC03 request-frame SVG +
the exception-frame SVG carry the byte-structure story on first
read; the practitioner-grade interactive lives one click away on
the Modbus Register Viewer tool already. The friction-file's
Education/Tools-split idiom — the page can defer to the tool rather
than ship a stripped-down twin — held here.

**Page-local CSS — `.mb-svg`.** Block-and-byte schematic class, in
the `.fb-svg` / `.vfd-svg` precedent (labeled-box diagrams, not
pipe-flow). Separate from the `.edu-svg` family. Local
`.callout-grid.loose` selector reuses the function-blocks-page
idiom for the families grid; not promoted to `styles.css` since
two pages share it and a third would be the consolidation trigger
(same posture as `.fb-svg` taking its time before earning a shared
class).

**Forward-link debts this page incurred:**
- `modbus-decoding.html` — **paid 2026-05-23.** The closing section's
  plain-prose forward-link is now an active anchor; see the next
  entry for the companion page.
- `bacnet-basics.html` — **paid 2026-05-23.** The "A BACnet object
  knows its own type, units, scale, and name" parenthetical now
  anchors to the shipped BACnet Basics page; same paragraph stays
  short on this page since the contrast grew into a section over
  there rather than expanding here.
- `modbus-wire.html` — sketched here as the third Modbus page if
  demand surfaces (RS-485 / CRC / timing). No prose mention on
  the page itself — the topic is parked entirely in this entry.

**Forward-link payoffs landed:**
- Modbus Register Viewer tool — the *"A fuller Modbus education
  page is on the roadmap"* paragraph (`html/tools/modbus-register-viewer.html:179–184`)
  becomes an active anchor to this page. After the decoding page
  shipped, the same paragraph now anchors *both* pages — Basics
  for the protocol shape, Decoding for the bit-interpretation
  gotchas.

### Modbus Decoding — Education page *(shipped 2026-05-23)*
*One question: I read a Modbus value successfully — why don't the
numbers make sense?*

The companion to Modbus Basics. Pays the second half of the Modbus
tool's five-bullet "essentials" forward-link debt — the bullets on
register addressing, signed/unsigned, byte order, and the implicit
scaling that vendor docs encode. Together with Modbus Basics, this
closes the Modbus integration loop from "how do I form a request"
through "how do I trust the number on the graphic."

In scope (sections shipped):

- *The 5-digit numbering trap* — the prefix names the table, the
  remaining four digits are 1-based, wire address = documented − 1.
  Static SVG with the leading digit (table prefix) highlighted in
  `--accent` and the offset rows showing the translation. Side note
  on the 6-digit extended form and the Modicon-style "wire-address"
  docs that drop the prefix entirely.
- *Signed vs unsigned interpretation* — two's complement in one
  paragraph, the canonical `0xFFF3` example (`65523` unsigned vs
  `−13` signed), the "negative-as-unsigned misread" failure signal
  (values jumping near 65535), and where each interpretation tends
  to live in HVAC kit.
- *32-bit values and the four byte orders* — bytes labeled A/B/C/D
  in the standard transmission order, four orderings (ABCD / CDAB /
  BADC / DCBA) shown as a four-row SVG of which bytes land in which
  register, followed by a four-card `.callout-grid` naming each.
  Cross-links the Modbus Register Viewer tool's 32-bit Pair tab as
  the practitioner-grade interactive — "figure out once per device,
  document it" framing.
- *Scaling and engineering units* — the raw-integer-to-engineering-
  value jump. Static SVG of `523 × 0.1 = 52.3 °F`, then a four-
  pattern list (implicit decimal, offset + scale, native unit,
  packed multi-field). Closes with the "wrong scale tag is worse
  than meaningless" failure: a 0.1-scaled signed register read
  unsigned reads `6553.5` when the truth is `−0.1`.

Out of scope (forward links):

- Modbus RTU on the wire (RS-485, CRC, framing timeout) —
  `[future: modbus-wire.html]`. Same parking spot as on the Basics
  page; named on this page in the closing "what this page didn't
  cover" section.
- The integration story (Niagara / EBO point-mapping, poll rates,
  stale-data flags) — platform-specific, belongs on the eventual
  Niagara / EBO pages.

**Widget decision — drafted out (same as Basics).** The framing-
widget candidate was considered and not built. The byte-order
interactive already lives on the Modbus Register Viewer tool's
32-bit Pair tab; per the Education/Tools-split idiom, the teaching
page diagrams the four orderings statically and cross-links the
tool for the interactive form. Four static SVGs carry the page
(5-digit translation, signed/unsigned branching, byte-order matrix,
scaling arrow).

**Page-local CSS — `.mb-svg` reused.** Same `.fb-svg` / `.vfd-svg`
precedent as Modbus Basics; class is now defined on two Modbus
pages (and not consolidated to `styles.css`). The third page —
either `modbus-wire.html` or a future BACnet-side equivalent —
would be the consolidation trigger.

**Forward-link debts this page incurred:**
- `modbus-wire.html` — the third Modbus page, sketched in the
  closing section. Named, not anchored, since the page doesn't
  exist yet. Carries the RS-485 / CRC / timing story.
- Niagara / EBO integration pages — named in the closing section
  as plain prose. No `[future:]` marker because these are
  larger-arc Tridium / Schneider pages, not pinpoint forward-link
  targets.

**Forward-link payoffs landed:**
- `modbus-basics.html` closing — the plain-prose "a second Modbus
  page on decoding will land here" forward-link is now an active
  anchor to this page.
- Modbus Register Viewer tool — the `ref-note` beneath the
  essentials row now anchors both Modbus pages, framing them as the
  paired explainer for the five-bullet field cheat sheet.

### BACnet Basics — Education page *(shipped 2026-05-23)*
*One question: what is BACnet, and what does a conversation between
a controller and a device actually look like?*

The third protocol explainer (after the Modbus pair), paying the
BACnet/IP Hex Converter tool's forward-link debt. Scoped per the
"one question per page" rule (decided during this scoping pass): the
BACnet surface is large enough that a single page exceeds the four-
item in-scope ceiling, so the protocol explainer ships as a pair —
this page covers the object model + services + priority array +
discovery; the companion (`bacnet-networking.html`) covers the
addressing / BBMD / hex-blob side. The modbus-basics "one
parenthetical comparison" grew into the `What BACnet is, and isn't`
section here rather than staying parenthetical.

In scope (sections shipped):

- *What BACnet is, and isn't* — ASHRAE 135 since 1987, the self-
  describing object model as the defining contrast with Modbus
  (parenthetical from modbus-basics grew to a paragraph), the
  multiple-data-links framing (MS/TP / IP / SC / Ethernet — protocol
  logic identical across them).
- *Devices, objects, properties* — the three-layer nesting; device
  instance numbers (0–4,194,302); Object_Identifier encoded as
  10-bit type + 22-bit instance but written human-readable
  (`AI:3`); the property list as where actual data lives. Static
  SVG of a device box containing object boxes with one object
  exploded to its property list. Four-card `.callout-grid` for the
  object-type families (Analog / Binary / Multi-state / Device).
- *The services you'll see* — `ReadProperty`, `WriteProperty`,
  `ReadPropertyMultiple` / `WritePropertyMultiple`, the
  `SubscribeCOV` + `ConfirmedCOV-Notification` push pair (with the
  push-vs-poll contrast to Modbus), `Who-Is` / `I-Am` named here
  and expanded in §5. The thirty-five-services-in-the-standard
  number called out so the reader knows the listed five are a
  practitioner shortlist, not the full set.
- *The priority array — BACnet's command stack* — dedicated H2,
  per scoping decision. 16-slot array, lowest-non-null wins,
  `Relinquish_Default` as the floor, conventional slot ownership
  (life-safety = 1, manual override = 8, BMS sequence = 16, slots
  9–15 free, slots 6/7 reserved). Worked example: BMS at slot 16
  writes 65 %, tech overrides at slot 8 with 0 %, resolved value
  is 0 %; writing null to slot 8 releases the override and value
  drops to 65 %. Tall static SVG of the 16-slot stack with slot 8
  and slot 16 highlighted and an arrow to the resolved
  Present_Value. Closes with the "value on the graphic is the
  resolved value, not what the sequence writes" practitioner trap.
- *Who-Is / I-Am — how devices announce themselves* — the
  broadcast / reply pair, optional device-instance range on
  Who-Is, what I-Am carries (instance + max APDU + segmentation
  + vendor ID). Static SVG of one client → three-device fan-out
  with Who-Is broadcast and three I-Am replies. Closes by setting
  up `bacnet-networking.html`'s BBMD section as "what happens
  when discovery has to cross a router."
- *MS/TP vs BACnet/IP — same protocol, different transport* —
  short H2 acknowledging both data links. RS-485 token ring vs
  UDP/47808 (0xBAC0). Defers token-rotation / `Max_Master` /
  `Max_Info_Frames` / baud / cable limits to
  `[future: bacnet-mstp.html]` *(shipped 2026-06-10)*. Static SVG of the two framing
  stacks side-by-side, with the shared NPDU+APDU payload below a
  bracket marking the data-link wrapper.

Out of scope (forward links):

- BBMD / Foreign Device Registration / the three layers of
  addressing / the BVLL+NPDU+APDU frame breakdown / the EBO hex
  blob — `bacnet-networking.html`, the second page of this pair
  (forward-linked from the closing "what this page didn't cover"
  section and from the MS/TP-vs-IP section as a live anchor).
- MS/TP deep mechanics — `[future: bacnet-mstp.html]` *(shipped 2026-06-10)*. Token
  rotation, master polling, baud rates, segment limits. Named in
  both the MS/TP-vs-IP section and the closing.
- Priority-array deeper mechanics (writeable `Relinquish_Default`,
  command prioritization under heavy override, the standard's
  full slot reservation table) — `[future: bacnet-priority.html]`
  *(shipped 2026-07-12 — `tools/bacnet-priority.html`, the interactive
  resolver + full 16-slot reservation table)*. The current section
  names slots 1 / 8 / 16 and waves at the rest.
- Alarms / event notifications, schedules, calendars, trend logs,
  file / group / loop / notification-class objects — named in the
  closing as out-of-scope. Each likely its own future page.

**Widget decision — drafted out (same as Modbus pages).** A priority-
array interactive (16-slot panel, type values into slots, watch
Present_Value resolve) was considered during scoping. The static
16-slot SVG with the worked-example arrow carries the concept on
first read; consistency with the Modbus pages' pure-prose +
static-SVG posture wins. Revisitable if the section reads weak in
review.

**Page-local CSS — `.bac-svg`.** Block-and-byte schematic class
following the `.mb-svg` / `.fb-svg` / `.vfd-svg` precedent.
Currently defined on both BACnet pages (and not consolidated to
`styles.css`); a third BACnet-side page would be the consolidation
trigger.

**Forward-link debts this page incurred:**
- `bacnet-networking.html` — **paid 2026-05-23.** The closing
  section's forward-link to the companion page is an active anchor;
  see the next entry.
- `bacnet-mstp.html` — **paid 2026-06-10.** Both the §6 (MS/TP vs IP)
  deferral and the closing's out-of-scope mention are live anchors to
  the shipped page.
- `bacnet-priority.html` — **paid 2026-07-12.** The priority-array
  section now carries a live "interactive companion" anchor to the
  shipped `tools/bacnet-priority.html`, and the tool joins the page's
  relatedLinks tools group. Shipping the tool also caught + fixed the
  slot 6/7 → 5/6 factual slip in this page's prose and SVG.

**Forward-link payoffs landed:**
- BACnet/IP Hex Converter tool — the `BACnet/IP Port Reference`
  card's `ref-note` paragraph (`html/tools/bacnet-ip-converter.html`)
  gained a second `ref-note` that anchors both BACnet pages: this
  one for the object-model side, BACnet Networking for the BBMD /
  hex-blob context.
- `modbus-basics.html` — the parenthetical "A BACnet object knows
  its own type, units, scale, and name" is now an active anchor to
  this page; the parenthetical itself stayed short here since the
  contrast grew into a full paragraph in §1.
- `vfds.html` — the "speed-reference AV (a BACnet Analog Value
  object)" sentence in the run-vs-speed-source section now anchors
  to BACnet Basics, paying the long-standing debt of naming a
  BACnet-specific object type without an explainer to back it up.
  (Single-link policy held: the other seven BACnet mentions on
  vfds.html stay plain prose.)

### BACnet Networking — Education page *(shipped 2026-05-23)*
*One question: how do BACnet devices find each other on real
networks, and why does discovery sometimes silently fail?*

The companion to BACnet Basics. Pays the BACnet/IP Hex Converter
tool's primary forward-link debt by explaining the EBO hex blob in
context — what each byte is doing, why the port suffix is usually
omitted, and what makes the converter exist in the first place.
Together with BACnet Basics, this closes the BACnet integration
loop from "what is an object" through "why doesn't this device show
up in my discovery scan."

In scope (sections shipped):

- *Three addresses, one device* — device instance (application
  layer, 22-bit identifier, the only one that's forever), network
  number (network-layer 16-bit segment ID; `0` = local, `65535` =
  broadcast-everywhere), MAC (data-link: 6 bytes on BACnet/IP =
  IPv4+UDP-port, 1 byte on MS/TP = station address). Static SVG of
  a controller box with three labeled arrows pointing inward, each
  identifier at its layer.
- *The BACnet/IP frame — BVLL + NPDU + APDU* — the three nested
  layers. BVLL: type byte `0x81`, function (`0x0A` Original-Unicast,
  `0x0B` Original-Broadcast, `0x04` Forwarded-NPDU), length, and
  the originating IP+port on a Forwarded-NPDU. NPDU: version,
  control, optional dest/src network-number + MAC fields, hop
  count. APDU: PDU type + service body. Static SVG of an annotated
  Forwarded-NPDU Who-Is frame with the BVLL function byte
  highlighted in `--accent` and a bracket explanation.
- *BBMDs — broadcasts across an L3 boundary* — the practitioner
  meat. Routers drop UDP broadcasts; BBMDs capture local broadcasts
  and unicast Forwarded-NPDUs to peer BBMDs whose IPs sit in the
  BDT (Broadcast Distribution Table); peer BBMDs re-broadcast
  locally. Static SVG of two subnets + router + two BBMDs + BDTs +
  the four-step path of a Who-Is from subnet A reaching a device
  on subnet B. Closes with the symmetric-BDT discipline rule and
  the "one BBMD per subnet" loop-prevention rule.
- *Foreign Device Registration — joining from outside* — when a
  device has no local BBMD, it registers with one on another
  subnet via `Register-Foreign-Device` (carrying a TTL) and the
  BBMD's FDT (Foreign Device Table) gains an entry; forwarded
  broadcasts then unicast to the foreign device. Static SVG of a
  remote workstation across a WAN registering with a BBMD; the
  FDT entry; subsequent forwarded-broadcasts back. Closes with
  the TTL-expiry trap (the "I could see this yesterday and now I
  can't" failure mode).
- *Reading the hex blob EBO shows you* — the converter-tool
  forward-link payoff in section form. Walks `C0A80164BAC0` as a
  side-by-side decode: `C0 A8 01 64` → `192.168.1.100`,
  `BA C0` → `0xBAC0` = port `47808`. Notes the 8-vs-12 character
  convention (port suffix omitted on default; present when on a
  non-default port per Annex J's sequential-port convention).
  Cross-links the converter tool as the live decoder.
- *When discovery silently fails* — bulleted-paragraph list of
  what to check in roughly the field-incidence order: no remote
  BBMD; asymmetric BDT; UDP-47808 firewall block; network-number
  collision; BBMD on wrong VLAN; expired FDR TTL; two BBMDs on
  one subnet (the storm condition); Max APDU mismatch on
  segmented replies. Modbus-Decoding's closing-section
  practitioner-trap energy.

Out of scope (forward links):

- MS/TP on the wire — `[future: bacnet-mstp.html]` *(shipped 2026-06-10)*. Token rotation,
  `Max_Master`, `Max_Info_Frames`, baud rates, cable / device-count
  limits. Named in the closing.
- Segmentation of long messages — `[future: bacnet-segmentation.html]`
  if it earns a page. The discovery-fails list mentions it; depth
  belongs elsewhere.
- BACnet/SC (Secure Connect) — `[future: bacnet-sc.html]`. Different
  framing, different (hub-and-spoke) discovery story; deserves its
  own page once it's common enough in BAS work.
- Capture-driven troubleshooting — `[future: bacnet-wireshark.html]`.
  Walking a Wireshark capture, naming Forwarded-NPDU vs
  Original-Broadcast on the wire, reading Abort / Reject PDUs.
  Named in the closing.
- Alarms and event notifications — their own future page; touches
  the largest object-model surface outside the analog/binary/multi-
  state core (Notification Class object, recipient lists,
  confirmed/unconfirmed alarm services).
- Vendor profile differences (Niagara / EBO / Distech / Honeywell
  exposing the same object types differently) — platform-specific,
  belongs on the eventual per-platform pages.

**Widget decision — drafted out (same as Modbus + BACnet Basics).**
A live BBMD-topology visualizer was considered (drag two BBMDs into
a network, watch a Who-Is fan out) and not built. Five static SVGs
carry the page (three-addresses, Forwarded-NPDU frame, BBMD
worked-example, FDR workstation, hex-blob decode). The Education /
Tools-split idiom holds: the interactive form for the hex-blob
decode lives on the BACnet/IP converter already.

**Page-local CSS — `.bac-svg` reused.** Same definition as
`bacnet-basics.html`; the class is now defined on two BACnet pages
in addition to the two Modbus pages defining `.mb-svg`. The
consolidation trigger for both class families is a third page in
either family — at that point both classes likely move to
`styles.css` together as one block-and-byte-diagram block.

**Forward-link debts this page incurred:**
- `bacnet-mstp.html` — **paid 2026-06-10.** The "MS/TP on the wire"
  out-of-scope bullet is a live anchor to the shipped page.
- `bacnet-segmentation.html` — named in the discovery-fails list
  and in the closing. Segmentation deserves its own treatment.
- `bacnet-sc.html` — named in the closing. The transport is rare
  enough today that this page can wait.
- `bacnet-wireshark.html` — named in the closing. A capture-driven
  troubleshooting walkthrough is more pedagogically dense than the
  current discovery-fails list can carry.

**Forward-link payoffs landed:**
- `bacnet-basics.html` closing — the forward-link to this page is
  now an active anchor.
- BACnet/IP Hex Converter tool — same `ref-note` paragraph as the
  Basics entry's payoff: this page anchors there for the BBMD /
  three-addresses / frame-breakdown context that the hex-blob
  decoding sits inside.

Lower-priority candidates still parked here for completeness:

- *Niagara Fox / Niagara N4* — tighter audience (Tridium
  ecosystem), but field reality is that many BAS techs see Fox
  more often than BACnet on the wire.
- *LonWorks / KNX* — sketched only. Possibly a single "legacy and
  European protocols" page at tour-level depth, deeper pages
  following if demand surfaces.

---

## Redesign — dark-industrial two-register language

### Phase 1b — design-language distillation *(shipped 2026-06-06)*

The whole-site redesign (agreed 2026-06-05) commits *harder* to the
operator-console / BAS identity instead of modernizing toward generic
SaaS. The **language is locked** ("spike v4", iterated live with the
user): **two registers used semantically.**

- **Software register = the default chrome** — "Niagara AX with a dark
  mode": cool blue-slate, AX-sharp (square corners via `--rail: 0`, hard
  1px seams, flat fills, no floating shadows). Green = brand/action,
  blue = data/selection. Carries the whole site.
- **Equipment register** — warm device face + positive-mode dot-matrix
  character LCD (lit olive backlight, dark ink, 3px pixel mesh; no
  scanlines, no glow). Used ONLY where a page depicts real hardware.
  Constant across both themes.
- **Dual theme, dark-default.** `:root` = dark; `[data-theme="light"]`
  ≈ the old look. Honors `prefers-color-scheme` on first load; a nav
  toggle mirrors the units pattern (`cf_theme`, before-paint bootstrap,
  `theme.js` loaded site-wide). Note: the AX-sharp *shape* (square
  corners) is theme-independent, so the light theme is now also
  square-cornered — the one deliberate divergence from "light = exactly
  the old look."

What shipped in Phase 1b (this branch): the dual-theme token system +
the AX-sharp shape sweep in `styles.css`; the `EQUIPMENT REGISTER`
component block (`.device` / `.lcd` / `.gauge.eq` / `.keypad` / `.led`);
the nav theme toggle + `theme.js` + head bootstrap; the token-driven
body graticule; and `/styleguide.html` — a noindex living reference
that exercises both registers in both themes. The token flip carried
essentially the whole site automatically because pages already
reference `var(--*)` (only two inline-style pages hardcode colours).

**Held back from this phase (Phase 3, per the lock):**

- **Home hero was on hold** (now SHIPPED — see "Phase 2 — the home hero"
  below). The living control-loop was set aside; the merge *intent* (one
  image spanning software↔equipment) survived and became "the seam."
- **Per-page dark polish** is deferred (logged in `codebase-issues.md`):
  `vfd-mock` adopting the shared `.device`/`.lcd` classes (its LCD still
  reads as a software panel, not the olive equipment look — it themes
  fine via tokens, just isn't the new register yet); the two
  hardcoded-colour inline-style pages (`psychrometric-chart`,
  `function-block-editor`); the hardcoded-rgba tints in `styles.css`
  that lose effect on dark; the legacy `.lcd-scanline` (one consumer);
  and promoting the styleguide-local `.tree` / `.wiresheet` / `.trend`
  to shared once a production page adopts them.

Authoritative spec: the `project_site_redesign_dark_industrial` memory.

### Phase 3 — dark polish *(shipped 2026-06-06)*

The per-page fit-and-finish deferred from Phase 1b (`codebase-issues.md`
#77; branch `issue-77/dark-theme-polish`). Nothing was broken on dark —
this was the polish pass that made every page *feel* finished on the new
default theme.

- **vfd-mock is the first production page to adopt the equipment
  register.** Its left "Drive Front Panel" column is now a real device
  face — `.device` bezel, positive-mode olive dot-matrix `.vfdm-lcd`
  (the `--lcd-*` tokens + 3px multiply-blended pixel mesh), embossed
  plastic keypad (green RUN / red STOP). The right "Motor Response"
  column stays software register. That left/right split *is* the
  software↔equipment seam the redesign is built around — the VFD page
  now demonstrates it in miniature. The equipment face is identical in
  light and dark (a device is a device).
- **Off-palette washes tokenized.** Three breathing/lift box-shadows
  (`.psy-chip`, `.fbe-block`, the shared `.bas-breathe`) hardcoded the
  *light* green and faint-black; re-expressed via `--accent-*` /
  `--bevel-lo`. The static tints (`.ref-table` row hover → `--blue-dim`;
  quiz wrong-answer → the new `--red-dim` token, parallel to
  `.correct`'s `--accent-dim`; `.ref-table-dense` zebra →
  `--surface-2`) now flip with the theme.
- **Canvas pages redraw on theme toggle.** `theme.js` had broadcast a
  `themechange` event since Phase 1b, but nothing listened — so the
  three `<canvas>` surfaces (psychrometric, pid-tuner, pid-basics),
  which read tokens at *draw* time, kept the old palette until a
  resize/reload. Each now subscribes, mirroring its existing
  resize→redraw (the unit handlers only refresh text — the engines are
  canonical — so resize, not `unitschange`, is the right mirror).
- **Legacy `.lcd-scanline` removed** (vfd-mock was its only consumer;
  the locked language uses the dot-matrix mesh instead). `.lcd-flicker`
  kept — it's the live value-change refresh cue (motion = data).
- **Education diagrams verified on dark** — clean. The "literal-hex
  fallbacks" the issue worried about were already gone (Phase 1b's
  `var(--x)` canonicalization removed every `var(--x,#hex)`).

Deferred (unused / no-consumer shared rules → `codebase-issues.md`
#78): consolidating `.bas-breathe` with the psy-chip variant;
tokenizing the unused `.bas-led.fault`/`.warn`; promoting the
styleguide-local `.wiresheet` (the function-block editor has its own
complete `.fbe-*` wiresheet, so no consumer). *(The `.tree`/`.trend`
half of #78 was resolved by Phase 2 — the hero is their first
production consumer.)*

### Phase 2 — the home hero, "the seam" *(shipped 2026-06-06)*

The redesign capstone (v3.0.0), and the last phase to land even though
it carries the lower number — the hero concept stayed open while the
language + polish shipped first, by design. Three concepts were
sketched (live operator workbench / interactive controller with
tooltips / "the seam"); the user picked **the seam**: the site's whole
premise as one live instrument — a **software supervisor** (Niagara
point-tree + PV-vs-SP trend, software register) on the left reading a
**field controller** (olive dot-matrix LCDs + valve gauge + LEDs,
equipment register) on the right, a dashed conductor with a feedback
packet crossing between them. It says *this site spans the software AND
the equipment it controls* in one image — and it's the merge-intent
that survived the abandoned control-loop hero.

Key decisions (live design dialogue, screenshot-driven):
- **Runs a real loop, not a looping animation.** A small AHU
  supply-air loop: the **setpoint steps at randomized intervals** and
  the supply-air temp chases it while the cooling valve modulates
  proportionally (colder target → more valve; off-setpoint → drive
  harder). The trend plots **PV (blue) vs setpoint (green dashed)** so
  the chase reads as a control loop to an engineer and as cause→effect
  to a newcomer. Tree, LCDs, gauge, trend, and the packet all read one
  shared state. Motion = process (the hard rule); reduced-motion gets a
  static, already-populated frame; the stage is `aria-hidden` and the
  copy carries the accessible content.
- **An inner labeled frame** (`LIVE · AHU-1 SUPPLY-AIR TEMPERATURE
  LOOP` head + a one-line legend) gives a newcomer context without the
  home page becoming a lesson.
- **Copy ditches the generic shape** — the old eyebrow → 2-color H1 →
  centered paragraph → badge row is gone. Now: a single-weight mono H1
  (still the page's one `<h1>`), the "tight & blunt" paragraph, and a
  full-width copy grid (title spans; paragraph + CTAs side by side;
  Latest on its own full-width line below).
- **Built from the existing kit** — the equipment classes (vfd-mock's
  register) + the promoted `.tree`/`.trend`; no new framework, vanilla
  inline IIFE, ~no perf cost. Removed the now-dead legacy hero CSS
  (`.hero-body`/`-eyebrow`/`-onramp`/`-badges`/`.badge`); that stray
  `.badge` had also been leaking a box onto the equipment device
  badges (now correctly borderless).

This closes the four-phase redesign (1a spike → 1b distill → 3 polish →
2 hero). Authoritative spec: the `project_site_redesign_dark_industrial`
memory.

---

## Site structure / organization
### Where interactive widgets live

Three sections, three jobs:

Tools = calculators, converters, lookups. Pull-it-up-and-use-it
utilities. Standalone, get a Tools-landing card, show up in "Coming
Soon" while pending.

Simulators = running models you can play with. PID Tuning Helper,
Mock VFD Interface, Function-Block Editor. They sit in their own
section rather than under Tools because they're for *playing with
a model*, not *looking something up*. Each one is paired with an
Education explainer (`pid-basics`, `vfds`, `function-blocks`).

Education = prose + diagrams + sometimes interactive widgets that exist
to teach a specific concept. The PID mini-sims (P only → P+I → P+I+D)
and the Twin-T injection-pump widget on Hydronic Loops are on Education
pages on purpose — the widget *is part of the explanation*, not a
standalone simulator, and it gets read in sequence with the prose
around it.

The rule: standalone "open it and use it" cases go to Tools.
Standalone "open it and play with the model" cases go to Simulators.
Teaching widgets stay in Education and don't get their own landing
card. If a piece of interactive content is useful both ways, the
full simulator goes to Simulators and a stripped-down teaching
version goes to Education (the PID tuner is the worked example of
this split).

### Simulators section — split out from Tools *(2026-05-23)*

Originally `/tools/` was the home for everything interactive, simulators
included. With three sims shipped (PID tuner, Mock VFD, Function-Block
Editor) the Tools landing started reading as two unrelated lists
stapled together — utilities you check numbers in, vs. models you
play with. Moving the sims to `/simulators/` sharpens the conceptual
split, lines up the new section's pages with their Education partners,
and gives the future refrigerant-loop sim a clear home.

The move:
- `git mv` of the three pages from `html/tools/` to `html/simulators/`;
  canonicals and `nav:` frontmatter retargeted.
- New `html/simulators/index.html` landing — same `.nav-card` grid as
  `tools/index.html` minus the filter-chip row (three cards don't
  warrant filtering; add it back if the section grows past ~6).
- Nav slot inserted between Tools and Education — keeps the two
  "doing" sections adjacent.
- `LEGACY_TOOL_REDIRECTS` block in `src/worker.js` 301s the three
  old `/tools/<slug>.html` URLs to their new `/simulators/`
  equivalents so any inbound links keep working.

Next sim on the radar is a refrigerant-loop sim, paired with the
refrigerant-cycle Education page (entry above under "Refrigerant cycle
— Education section, possibly with calculator"). When it ships, the
filter-chip question on the landing will resurface — re-evaluate then.

*Shipped 2026-07-15.* The Refrigerant Loop Simulator
(`/simulators/refrigerant-loop.html`) landed as the refrigeration
cluster's first interactive — a directional vapor-compression model
(manifold gauges, an animated loop, and a live P-T strip) grounded in
the existing `REFRIGERANT_TYPES` P-T tables, headlined by the
"Starve the coil" scenario. It brings the simulators landing to seven
cards; the filter-chip question resurfaced and the owner chose to
**defer** the chip row for now (still comfortably scannable at seven).
No refrigeration hub exists yet, so the sim forward-links the three
refrigerant lessons and the P-T tool without a `hub:` back-link
([future: /refrigeration/] *(shipped 2026-07-18)*).

*Shipped 2026-07-18.* The **refrigeration hub** (`/refrigeration/`, the
fourth `/bacnet/`-clone pillar, wired into the Guides lane via
`nav: guides` + `navLabel`) landed: a start-here path over the
three-lesson chapter (cycle basics → superheat & subcooling →
TXVs vs. EEVs), plus cards for the loop simulator, the P-T tool, and
two Related pages (psychrometrics-basics, coil-sizing — cards on the
hub only, no `hub:` backlinks, the hydronics Related-lessons
precedent; coil-freeze-risk stays out entirely — it's water-coil
freeze protection, a keyword match, not a subject match). `hub:`
backlinks went on exactly four spokes: the three lessons and
refrigerant-pt. **The simulator's own `hub:` backlink is deliberately
deferred** — the heat-pump-mode lane owns `refrigerant-loop.html`, so
the one-line backlink lands in whichever of the two lanes merges
second (also recorded in the hub PR body so it can't be dropped).
*(Landed 2026-07-18 with the heat-pump-mode PR #368 — the
second-merging lane, as planned; the sim now carries the "Part of"
back-link and all five core spokes point at the pillar.)*
Hub count is now **four**, which half-arms the topic-primary-nav
revisit trigger ("~4 hubs AND the mid-Aug 2026 GSC pull") — the GSC
pull is now the sole remaining condition.

*Verification round (2026-07-16).* An independent multi-agent
verification (engine re-derivation, source-PDF table audit, 6×6
browser matrix, plot pixel checks, a11y, conventions) confirmed the
physics and data exactly and shipped a fix series on the PR branch:
a MIN_LIFT floor (tCond ≥ tEvap + 10 °F — an extreme stage-1 corner
could invert the gauges), plot label/axis fixes, metric dual-stating,
AT access to the gauge pressures + LED states, measured-contrast
fixes, presets no longer overwrite the shared refrigerant memory, and
a ≥/≤ off-chart cue on a pegged dial. The airflow knobs were renamed
to **Indoor coil / Outdoor coil airflow** (hardware names; the LCDs
and verdicts keep evaporator/condenser — the *function* words). That
split is deliberate groundwork for the big one:

**[future: reversing-valve heat-pump mode]** *(shipped 2026-07-18)* —
owner decision
2026-07-16: build the FULL heating-mode model, not a cosmetic flip.
Scope sketch: an engine `mode` axis (cooling/heating) with per-mode
anchor sets (heating: outdoor coil evaporates — sat temp tracks
*outdoor* ambient, e.g. ~25–30 °F at a 47 °F rating point; indoor
coil condenses ~100–110 °F); outdoor-coil frost as the new headline
teaching story (frost accumulation below ~40 °F outdoor, defrost as
the field reality — a *normal* fault-look, unlike the cooling coil
freeze); per-mode verdict wording; a reversing-valve glyph in the
loop SVG with re-routed `data-flow` segments (the valve swaps which
coil receives discharge gas — remember the converging-flow
split-segment gotcha); presets for heating faults (frosted outdoor
coil, defrost, low-ambient heating). Its own PR after the sim
merges. Pairs naturally with per-refrigerant anchor work (#3 below).

*Shipped 2026-07-18.* The full heating model, as scoped. Engine: a
`mode` axis (`DEFAULTS.mode='cooling'` — every pre-mode caller,
preset and test bit-identical, gated by an explicit spec test) with
the driving-temperature ROLES swapped in heating (block A rides
`ambient`+`condAir`, anchored 27 °F at the 47 °F rating point; block
C rides `returnT`+`airflow`, 70 → 105 °F), per-mode CLAMPS
(`CLAMPS_HEATING`/`clampsFor()` — the page sliders re-range AND
re-default from it on a flip, single-source), hardware-keyed airside
mirrors (`tAir*Indoor/Outdoor` — the LCD remap is the engine's job,
killing the likeliest silent-bug site), and new `frost` /
`frostChoked` / `defrost` flags with per-mode verdict wording. Frost
is the deliberate anti-freeze story: sub-32 °F coil sat is NORMAL
heating (no alarm) until the ambient is in the sub-40 °F
accumulation band (warn), and reads as an error only once the
blocked face (`condAir < 0.75`) makes it the choke spiral. Page: the
six flow elements stay FUNCTION-keyed and swap GEOMETRY per cycle
(`MODE_GEOM`, spec-pinned to the markup in lockstep; draw order =
particle direction, so heating runs the loop counterclockwise), the
serpentines hoisted out of the bar groups so a re-routed run can't
hide under the other bar's face; state gradients follow their coil
between tube rows (`GRAD_Y`); a four-way reversing-valve glyph on
the left column mirrors its slide with the cycle; the frost kit is
mirrored to the top bar (`#rl-frost-top`, `.frosted`); the preset
row filters by mode (6 cooling / 3 heating, a click can never flip
the valve — owner decision), and **Defrost is the honest flow flip**
(owner decision): the valve visuals flip back to cooling, the
outdoor air lanes stop (fan off — transparent particles + a CSS
ghost), the top frost kit shows half-faded (the melt), the outdoor
air LCD mutes, and the verdict narrates "normal, and temporary"
while the mode toggle stays on Heat; any hand move steps out. The
P-T plot's 32 °F line is per-mode: freeze line in cooling, FROST
line in heating (reddening only on the frost flag — sub-32 sat is
normal there). Mode is session-only, no `cf_*` key (view-toggle
precedent, so no privacy.html edit); bars keep hardware identity
(top = outdoor) with the CONDENSER/EVAPORATOR labels swapping.
Riders: #169 (COMPRESSOR label nudged clear of the frost wash) and
visual-queue item 6 (below). Item 7 stays queued.

*Verification round (2026-07-18, pre-merge).* The independent
adversarial pass (engine re-derivation against the 47/17 °F rating
convention, ~230 browser checks, particle-diff flow-direction
analysis) confirmed the anchors, dew/bubble orientation, every
role-swap sign, the LCD remap and backward compat — and surfaced
five fixes shipped on the branch: the touch preset-row leak (the
touch-floor `display:inline-flex` beats the UA `[hidden]` rule —
`.copy-btn[hidden]` re-assert + a cross-mode guard in applyPreset +
a touch-floor regression test), a heating evaporator approach
CEILING (`MIN_APPROACH_HEAT` — the MIN_LIFT analog: light-load
corners could put the outdoor coil ABOVE the air it absorbs from),
an ambient-independent outdoor-starve verdict rung
(`STARVED_APPROACH_HEAT` — a choked coil at 45 °F ambient had read
green with suction collapsed; below 40 °F frostChoked specializes
it), the defrost caption ghosting with its stopped lanes, and honest
low-ambient wording. The wording fix then escalated by owner decision
("we should have a real ambient droop term") into a REAL cold-weather
capacity fade: heating block C gains `SPLIT_AMB_HEAT` (0.5 °F split
droop per °F below the 47 °F anchor, one-sided so mild days hold
design and never false-flag highHead) — zero at 47 °F, tCond 90 °F /
~88 °F supply at the 17 °F rating point (published 85–90 band),
cooler still in deep cold, with the supply cap at tCond − 2 carrying
the droop to the air once tCond falls under ~97 °F. The About copy
states the fade (it is why auxiliary heat exists) instead of
disclaiming it.

*Queued visual-round ideas from the verification (owner to pick):*
(1) two visible pressure LCD cells in the register (the AT summary
line covers screen readers today; visible cells would help sighted
low-vision users too) *(shipped 2026-07-17)*; (2) a flash-gas cue
when subcooling goes negative (hollow/warn-tinted liquid dot or a
"(flash gas)" label suffix) *(shipped 2026-07-17 — both: hollow
amber dot + amber label suffix)*; (3) nice rounded pressure-gridline
steps on the P-T plot (quarters of pMax currently yield 113/38-style
labels) *(shipped 2026-07-17)*; (4) clamp or shorten SH/SC gap
labels below ~450px canvas width *(shipped 2026-07-17)*; (5) a small
radial inset for the two dial ring labels flanking top-center (the
needle can bisect one mid-dial) *(superseded 2026-07-17 by the dial
re-hierarchy — needle drawn under the labels, sat ring pulled in)*;
(6) a one-line copy note making the shared-cycle framing explicit
("every refrigerant runs the same 40/105 °F cycle so the pressures
compare apples-to-apples — R-404A in real life usually runs colder
boxes") *(shipped 2026-07-18 — reworded for the heat-pump mode's
per-mode anchors: 40/105 is the COOLING cycle, heating states its
own shared 27/105 set at the 47 °F rating point)*;
(7) per-refrigerant sat-temp anchoring as the bigger
upgrade (needs per-refrigerant design-point sourcing; trades away
the clean cross-refrigerant comparability, so possibly a toggle).

*Visual refinement round (2026-07-17, owner-directed):* gauge dial
rebalance (punch-out labels, needle re-hierarchy, units moved to the
captions), the register grown to 4 rows — visible suction/head
pressure LCD cells plus air in/out temps off the new engine block F
(sensible-only airside model) — spacing normalization across the
cockpit, the fullscreen tall regime now gated on aspect ratio (the
2560×1440 landscape-QHD fix), and plot polish (rounded gridlines,
short SH/SC tags on narrow canvases, the flash-gas dot + label).
A same-evening follow-up finished the dials and the loop glyph: the
sat-temp inner ring now prints round display-unit temps at one
constant step per dial, placed where the P-T curve puts them, over a
new inner track arc with half-step minor ticks; and the compressor's
spinning fan gave way to a top-down scroll set — the moving spiral
orbits (it doesn't spin), paced by capacity like the fan was.
Items 6 and 7 above remain the queue.

*Airflow animation (2026-07-17):* the sim's first feedback-driven
addition — the owner watched the loop live and wanted the air side
(what the two airflow knobs control) visible, so both coil faces now
carry animated air lanes whose density tracks the CFM knobs, the
indoor stream frost-tinting with the freeze latch. *(Amended
2026-07-17, same day:* the lanes first ran left→right along each bar
to match the register's "air in → out" reading — but that put them
parallel to the tubes and perpendicular to the crossflow axis air
actually takes through a fin-tube face. The crossflow fix turned
them vertical — outdoor air rises through the condenser and out the
top, indoor air drops through the evaporator and out the bottom —
and retired the static heat arrows: the dim→tinted lane flip now
carries the heat story, with the italic labels reworded as airflow
statements. Lanes live in safe columns (x=260 / x=460) because the
engine's particles paint above every label; the airBand floor rose
0.3 → 0.4 so the 115px IN stubs always carry a particle.)*

*Serpentine coils + the live four-state gradient (2026-07-17):* the
owner's flagship-piece expansion of the crossflow fix — the
refrigerant no longer teleports across each coil bar. Both bars now
carry a serpentine tube circuit (the DOAS D3 coil motif flipped:
vertical zigzag legs progressing horizontally — 11 legs at 28px
pitch, ~680px of path ≈ 20 particles at baseline density), joined
to the pipe joints exactly — (200,85)→(520,85) and
(520,345)→(200,345), draw order = flow direction — so the particle
streams hand off with no gap. Each serpentine's stroke AND its
particles ride a `userSpaceOnUse` linearGradient (`rl-grad-cond` /
`rl-grad-evap`, stop colors as var() tokens, the sparkline
trend-grad pattern): particles are cx/cy circles in root user
space, so a gradient fill samples at each particle's true position,
and the stroke keeps the state change readable statically and under
reduced motion. The palette went four-state (owner decision): hot
gas `--heat` → warm liquid `--amber` across the condenser, cold mix
`--blue-cool` → cool vapor `--blue` across the evaporator, with the
liquid + suction pipes, their leg arrows, and the state annotations
adopting the new inks — the amber→blue jump lands at the metering
device, where it physically belongs. The gradients are LIVE:
updateLoop maps the solve onto the two moving stops (blend-end =
1 − subcool/40 on the condenser, 1 − superheat/50 on the
evaporator; 0.3 blend width, clamped to [0,1], writes throttled),
so a starved coil walks the vapor ink across the evaporator and
flash gas visibly keeps the condenser exit gassy. CONDENSER /
EVAPORATOR names punch a `--surface` paint-order halo (the
gauge-label idiom) through the serpentine; the air-lane group moved
before the coil groups so its in-bar strokes hide behind the bar
faces (stubs + arrowheads carry the static story — air particles
still cross the face on the engine's top layer). Freeze still
overrides the evaporator serpentine's particles to `--rl-frost`,
exactly like the suction line. *(Review follow-ups, same day:* the
blend cap became a span stretch — `pos > 1` extends the
userSpaceOnUse gradient's x2 past the bar instead of clamping the
done stop, so mild flash gas / floodback paints a genuinely
unfinished blend at the coil exit (the downstream liquid line
staying solid amber is the accepted residual — the P-T plot's
flash-gas cue covers that side); the coil names lifted out of the
bars onto the open interior band (DOAS label-off-the-rect
precedent — the paint-order halo retired here, and particles no
longer drift over the names); the light theme got page-local
`--rl-hot` / `--rl-liq` punch tokens for the warm pair (the global
light `--heat`/`--amber` sat too close); frost snowflakes reseated
between serpentine legs.)*

*Compressor-direction fixes (2026-07-18):* the owner, watching the
live sim, caught two depiction defects at the compressor — both
confirmed wrong by a two-agent investigation (kinematic derivation +
pixel-tracking on the production render). First, the **scroll orbited
in the expander sense**: the moving spiral ran clockwise on screen
(~135–139 °/s measured), the same sense the spirals wind outward, so
the sealed pockets read as sweeping outward — gas drawn at the center
and pumped out the low side. One-line fix: the orbit phase now
decrements (CCW on screen, the compression sense), still deliberately
mode/defrost-invariant — a real compressor never reverses. Second,
**the compressor's own ports swapped function with the mode**
(MODE_GEOM made the top port the discharge in cooling but the suction
in heating, and the heating discharge never touched the reversing
valve — the swap visibly happened at the compressor, the inverse of
real hardware). Fixed with a true four-port re-plumb: the ports are
now FIXED (suction always up into the bottom port, discharge always
out the top port), both compressor lines terminate at the widened
valve capsule in both modes, and only the valve's coil-side legs
re-route — cooling keeps the straight-through up the x=120 column
while the suction hairpins inside the valve and wraps beneath the
shell into the bottom port; heating crosses over inside the capsule
to the indoor-coil leg (x=162). Mode-invariant stub arrows mark the
never-swapping ports, and the port invariant is spec-pinned (§14:
identical compressor-side endpoints across modes, both lines
threading the capsule). *(Owner review, same day:* the first cut
drew the valve's interior passages as a separate slide-glyph overlay,
and in heating the particles took an H/V jog while the overlay drew a
diagonal — the mismatch made the interior "overwhelming." Root-cause
fix: the overlay is retired and the capsule's visible interior lines
ARE the flow paths — the valve body now paints *before* the pipes, so
the drawn passage and the particle track are one element and cannot
diverge; the heating suction's crossover diagonal became a real `L`
segment in its d (the one sanctioned non-H/V pipe segment, capsule-
interior only). The capsule grew 20 → 30 tall (y 142–172) to give the
crossover room, and the cool-vapor/hot-vapor tl annotation tucked up
above its horizontal run into the loop's top-left corner — the
collision pass caught the wider heating text grazing the top bar at
the first position, mono-font width being the culprit. All spec-
pinned as the §14 one-element rule.)*

*Frost-crystal reseat (2026-07-18, owner catch while testing):* the
freeze overlay's snowflake marks read as a bug — three plus-crosses
clustered on the bar's left third, nothing across the rest. Root
cause: they were hand-seated once for the pre-serpentine bar (x
215/245/275) and each later geometry redraw only re-dodged the new
legs (232/290/318) without ever extending them across the finished
320px bar. Replaced with DERIVED seating: 6-arm snowflake asterisks
(the + arms full length, the × arms at 60%; two alternating sizes as
`defs` symbols placed by `<use>`) at every serpentine inter-leg bay
mid — legs x=220+28k so mids 234+28k — except the two mids inside
the air-lane corridors, full-width on BOTH bars, plus one small
flake on each iced suction leg. The bay-mid derivation is
spec-pinned (§13 frost-crystal seating: crystal x-positions computed
from the drawn legs, lane mids skipped, kits share columns), so a
serpentine redraw can't strand them again; defrost's half-fade now
reads as a full bar of melting crystals.

### Guides nav lane + topic-hub IA — the nav/home redesign *(scoped 2026-07-13, shipped PRs #332/#333; scope doc retired 2026-07-18)*

The second pillar hub (`/forced-air/`) is where the **format-based
top nav** (Tools / Simulators / Education / Practice — "what *kind*
of thing is this") started colliding with the **topic-based hubs**
("what am I *working on*" — a field tech's mental model is usually
topic-first), so the owner opened the larger IA question. A fan-out
mapping + three independent proposals + an adversarial critique were
synthesized in `docs/nav-home-redesign-scope.md` (2026-07-13); with
everything it sequenced now shipped, that doc is retired per its own
lifecycle note — git history keeps the full scoping text, and this
entry is the durable record. Owner call: **incremental** — one
narrow **"Guides" lane** for the hubs (Proposal 2), NOT the
topic-primary rewrite (Proposal 1, the deferred north star below),
NOT folding Simulators into Tools (Proposal 3, rejected below).

**As-built (two PRs, merged 2026-07-13):**
- **PR #332 `feat/forced-air-hub`** — `/forced-air/`, a `/bacnet/`
  clone; the page-local `.bhub-*` styles promoted to a shared
  `.hub-*` set in `styles.css`; 13 core spokes got the hub card +
  `hub:` backlink (6 airflow tools + 6 forced-air lessons +
  **affinity-laws**, the cross-cluster full member — fans *and*
  pumps, `category: hydronics` unchanged); an interim featured pin
  in the dropdowns kept the hub reachable before the lane.
- **PR #333 `feat/guides-nav-lane`** — the Guides dropdown right
  after Home, with the standalone "Start here →" CTA retired so the
  text-item count held 7 → 7 (its intent re-homed to the hero
  on-ramp line + the Education dropdown blurb). As-built deviation
  from the plan: the dropdown is driven by a **`navGuides`
  collection + a short `navLabel` frontmatter** on each hub
  (`nav: guides`), NOT the planned `html/_data/hubs.js` data file —
  single source in frontmatter; a future hub is just `nav: guides`
  + `navLabel` on its own landing. Both interim pins (BACnet's
  hardcode + PR #332's) were deleted, removing the one hub-specific
  hardcode from shared chrome. `/guides/` shipped as the
  pillar-of-pillars landing; the home page gained a "Guides" topic
  section with the hub cards moved out of the format Browse.
- **Home hero as landed:** the scoped "whole mechanical stack"
  broadening shipped in PR #333, then the owner re-tightened it
  2026-07-14 — the identity stays controls-first ("Field tools for
  those in building automation/controls, advanced HVAC, and many
  other adjacent fields. Built by a building automation
  programmer."), with the broadened work-site-neutral subcopy
  ("mechanical room, on the roof, or at the panel") naming the
  mechanical tool families. A second live hero demo stays
  **deferred**: no air-side simulator exists to hand off to, and
  the seam was composed with one loop as the single payoff — if an
  air-side sim (mixed-air/economizer or VAV/duct-static) ever
  ships, make it a toggle/tab on the existing `.hero-seam-stage`,
  not a second stacked widget.
  `[future: an air-side simulator → then a second hero demo]`
- **Since then:** the hydronics hub + the `hub:` → **array** step
  (PR #350, 2026-07-14 — `relatedLinks` normalizes object-or-array;
  affinity-laws carries the dual backlink), then the refrigeration
  hub (PR #359, 2026-07-18) — **hub count four**.

**Rejected — Proposal 3, fold Simulators into Tools.** Slimming the
format nav to Tools+Learn would shorten the mobile top level (7→5),
but it breaks the **`<Section> · <Page>` eyebrow ↔ active-nav
convention** on ~13 pages (a page filed under the Tools lane would
still read "Simulators · …" / "Practice · …") — a documented
convention violation needing an explicit owner waiver, not worth a
mobile-row win that retiring "Start here →" nearly matched for free.

**Deferred — topic-primary nav rewrite (the north star).**
Proposal 1: replace the four format lanes with ~6 equipment/topic
hub lanes (BACnet, Forced Air, Hydronics, Refrigeration, Electrical,
Controls & I/O) + a single "Browse ▾" for the demoted format axis,
with a new `cluster:` frontmatter driving `.active` + the `hub:`
backlink. It's the right destination — the strongest hub-and-spoke
internal-link concentration for the young-domain pillar-cluster SEO
play — but disproportionate when scoped: it committed to hub pages
that didn't exist and are uneven (Electrical is tools-only;
Signals/Modbus have no honest standalone home → a catch-all
"Controls & I/O" lane); it adds a **third** hand-kept taxonomy tag
on top of the existing `category` ↔ `navCard` two-source drift
(codebase-issues #92) — do **NOT** adopt without building a
`clusterGuard` first, or metadata drift gets worse, not better; and
it's a full nav rewrite + `nav-menu.js` surgery + ~40 frontmatter
edits on the flagship front door that loses the dropdowns'
deep-link affordance. **Revisit trigger: hub count reaches ~4 AND
the mid-Aug 2026 GSC pull shows the pillars earning rank** (ties
into `seo-growth-plan-2026-07`). *(Half-armed 2026-07-18 — the
hub-count half fired when `/refrigeration/` made it four; the GSC
half is now the sole remaining condition.)*
`[future: topic-primary nav rewrite]`

**Deferred — multi-membership "core tool" taxonomy (retrigger,
owner-requested 2026-07-13, seeded by affinity-laws).** The
taxonomy is single-value: one `category:` key buckets the nav
dropdown + the landing filter chip. Of the scope doc's three
candidate shapes, the cleanest — `hub:` accepting an **array** —
already shipped (PR #350, when the hydronics hub fired the first
trigger arm exactly as predicted). The remainder stays deferred:
multi-value `category:` (or an `alsoIn: []` companion) so a tool
can list under multiple dropdown buckets + landing chips — a
bigger change touching `navGroups`, `navCategoryGuard`, the chip
counts, and the codebase-issues #92 two-source drift — plus the
lightweight `coreTool: true` tag idea for tools foundational
enough to surface across clusters (affinity-laws, arguably
signal-scaling, psychrometric-chart). **Remaining revisit trigger:
≥3 tools need to appear under 2+ category buckets on the tools
landing / nav dropdown** (e.g. air-mixing, psychrometric-chart join
affinity-laws — the scope doc flagged air-mixing as the likeliest
next).
`[future: multi-membership "core tool" taxonomy]`

### Schematic-bg chrome — gutter as-builts, hero-frame nav cards, discrete-pulse mode *(shipped 2026-05-23)*

A major chrome overhaul on top of the existing v2.0 workstation
aesthetic — not a new tool or page, but a new visual identity that
runs across every page. Four shipped pieces:

**1. Gutter schematic-collage.** Two narrow SVG strips, one in each
side gutter (`_includes/schematic-bg.njk`), each holding ~60
inline-SVG motifs drawn from a six-element library. Original library
shipped 2026-05 as: pipe-valve, pump-coil, AI/AO terminals, BI/BO
terminals, logic-chain (TMR / AND / PID blocks), BACnet/IP node;
sweep-refreshed 2026-05-24 (PRs #126–132) to: 3-way diverting valve
+ coil + bypass, closed-loop pump-coil with supply + return,
compare-bo (AI₁ > AI₂ → BO1), and-bo (BI₁ AND BI₂ → BO1),
current-loop (PSU/TX/AI 2-wire 4-20mA), supervisor (JACE + AHU/VAV/BLR
star). Motifs cycle through a sequence with a 270px stride (bumped
from 230 to accommodate the taller pipe-valve), two staggered
sequences (left vs right) so a wide viewport never shows a mirrored
pair. The strips sit at `z-index: -1` inside body's stacking context —
above the blueprint grid background, below every content surface.

*Why gutter, not background.* The blueprint grid was already
established (v2.0.1) for the body background; a second decorative
layer there would have competed with content legibility. Putting
the motifs in the side gutters keeps them as "as-builts in the
margin" — decoration that reads as part of the workshop, not as
chrome cluttering the work.

*Why inlined SVG, not `<use>` shadow trees.* The motifs need to be
animated by `flow-engine.js` via `getTotalLength()` /
`getPointAtLength()`, and those calls don't pierce `<use>` shadow
trees reliably in Chromium (same root cause that bit an earlier
attempt at `fill:none` inheritance). The trade-off — ~360 SVG
elements inlined into every page's DOM — is acceptable because
the engine's IntersectionObserver gates per-frame work to motifs
currently in the viewport, and the markup gzips well anyway. See
`codebase-issues#70` for the revisit trigger.

*Draw-in via stroke-dashoffset.* Three length-normalization
approaches all hit Chromium quirks:

- `--sbg-len` CSS var driven by `getTotalLength()` — broken on
  Bezier paths and circles (the AI/AO amber trace, the pump-coil
  circle), which refused to draw fully even at offset=0.
- `pathLength="1"` site-wide normalization — same class of bug
  on the same elements.
- Case-split `pathLength="1"` on safe straight elements only
  (`<line>` + L-only `<path>`), with Beziers/circles/rects falling
  through to a fixed default. Shipped in commit `b8dae2b`,
  reverted same-PR in commit `98223a5` after in-browser inspection
  showed every pathLength element rendering as broken speckle.
  Chromium honors `pathLength="1"` for the JS API
  (`getTotalLength()` returns the geometric length, 104 on a sample
  line) but NOT for `stroke-dasharray` — a CSS value of `1` is
  treated as 1 actual pixel rather than 1 normalized path unit,
  rendering a 104px line as ~50 tiny dashes that visually read as
  invisible. This is the most subtle of the three quirks because
  the path-length API works correctly; only the dasharray side
  effect breaks.

Permanent fallback (commit `e700c2a`): a single fixed dasharray
(600, well above any motif's ~200 user units) applied to every
`[data-sbg-stroke]`. Safe across every element type and every
browser. Trade-off accepted: drawing is no longer proportional
to path length — short signal wires finish in ~10% of the
transition and then sit still while long pipe runs continue.
The ease-out timing softens the disparity; correctness beats
uniformity here. Tracked in `codebase-issues#69` with a revisit
trigger (Chromium ships proper pathLength/dasharray support, or
a per-element JS-driven CSS-variable approach proves worth the
bootstrap complexity).

*1240px viewport cutoff.* Below 1240px both gutter strips drop
out via `@media (max-width: 1240px) { display: none; }`. That
covers most laptops 13"-and-smaller and every phone / tablet — the
"field device" segment where load weight and battery outrank
decoration. Print also drops them; reduced-motion keeps them but
snaps to drawn state.

**2. Hero-frame nav cards.** All 27 nav cards (9 tools, 13 education,
3 simulators, 2 home) moved from the old `.nav-card-tag` + body shape
to a three-part instrument frame mirroring the hero's
`.console-titlebar`:

- `.nav-card-titlebar` — mono small-caps prefix word (TOOL / LESSON
  / SIM / SECTION) + ellipsis-clipped title + status pill (LIVE /
  READ / RUN / OK)
- `.nav-card-body` — the card's existing description / dot grid
- `.nav-card-statusline` — bullet-separated `.nav-card-pill` spans
  carrying semantic tags (e.g., a hydronic lesson's pills read
  "Hydronics • Direct Return • Reverse Return • Primary / Secondary")

A `navCard()` macro in `_includes/nav-card.njk` takes all 27
through a single signature. Section drives an accent-color
cascade via `.nav-card--{home,tools,education,simulators}` and the
three `--section-accent{,-dim,-glow}` tokens.

*Why mirror the hero on every nav card.* The hero already
established the instrument-frame shape (titlebar + body +
statusline) as the page's "thing with an identity strip" element.
Carrying that shape into the nav cards makes the landings read as
indices of instruments rather than as link grids — and turns the
two landings (Tools, Education) into instrument racks. The pills
also encode more than a category: instead of a single category
tag, they sketch the *scope* of the page.

*titleShort trimming.* The titlebar single-lines at the 4-col
1920px breakpoint with ~195px of room beside the status pill.
Long names ("Modbus Register Viewer", "Function-Block Editor")
needed manual `titleShort` values ("Modbus Reg", "FB Editor");
CSS adds ellipsis safety via `min-width: 0` on the flex child
(commit `8cfedff`).

*`.nav-card-tag` is gone.* The old single-category-pill class
was deprecated when the new shape landed; commit `5ee8f50`
removed the dead rule.

**3. Discrete-pulse animation mode.** `flow-engine.js` grew a second
motion primitive alongside the existing continuous particle flow:

- `data-flow="supply|return"` — the original. Continuous stream of
  particles along the path, constant velocity. Encoding: physical
  media moving (water through pipes, air through ducts).
- `data-pulse="signal"` — new. A pulse head + four-circle trail
  launches from the path start, travels at fixed pixel-speed
  (default 220 px/sec), and retires at the end. Encoding: a
  control signal just updated (an analog wire sampling, a logic
  block firing, a BACnet/IP comm trace delivering).

Auto-fires on a per-path `data-pulse-interval` (default 4000ms,
±30% jitter so paths don't synchronize); external code calls
`FlowEngine.pulse(el)` for on-demand firing. The function-block
editor uses the external call to flash a wire when its source
block updates — the visual primitive for "this signal just changed."
Auto-firing is gated by an IntersectionObserver
(`rootMargin: 120px`) so the 60-deep gutter doesn't churn
pulses off-screen; explicit `FlowEngine.pulse()` bypasses the
gate.

Trail tuning constants (`PULSE_HEAD_RADIUS = 3.2px`,
`PULSE_TRAIL_LEN = 4`, `PULSE_TRAIL_GAP = 5px`, taper steps
`0.18` radius / `0.22` opacity) are module-level — no per-wire
knob. Pulse colour reads from `data-pulse-color`, then the
element's `stroke` attribute, then `var(--accent)` as ultimate
fallback (same cascade as `data-flow` colours).

**4. Control-vocabulary color family — teal / amber / plum.** Three
new desaturated hues added to `:root` for the *control* side of a
schematic:

- `--teal` (`#4a8a8a`) — BACnet/IP comm traces; the wire that
  carries packets, not water.
- `--amber` (`#c9a14a`) — energized analog control wiring (AI / AO
  signal paths); the wire that carries 4-20mA or 0-10V.
- `--plum` (`#8a5e7e`) — logic-block signal lines (AND / OR / PID
  / TMR chains); the wire inside a wiresheet.

Each carries `--*-dim` and `--*-glow` companions (10% / 22% alpha)
matching the `--accent-dim` / `--accent-glow` pattern, so the
section-accent cascade on nav cards reaches into background tints
and focus rings cleanly. The split with the physical-media palette
(`--blue`, `--blue-cool`, `--red` / `--accent`, `--heat`) is
deliberate: physical media palette = "water, air, energy moving";
control palette = "comm, wiring, logic." Diagrams that show both
read in two registers without color clashes.

*Section-accent cascade.* Each nav-card section gets one of these
hues as its primary: tools = `--accent` (existing green),
education = `--plum`, simulators = `--teal`, home = `--accent`.
Setting `.nav-card--education { --section-accent: var(--plum); }`
and consuming `var(--section-accent)` in `.nav-card:hover` /
`.nav-card-name` / `.ok-pill` flows the colour through every
themed element without per-section duplication.

**What didn't make it into this round.** Per-pulse-trail knob
(`data-pulse-trail`) — not needed by any current consumer; left
for the function-block editor to ask for if the per-wire-type
distinction becomes useful (currently all wires use the same
trail shape). Adjustable Bezier-path dashoffset draw — gave up
on this when the Chromium quirk proved durable; the fixed-600
fallback for curved elements is permanent until that bug closes.

### Discovery prompt + reward — Education page idiom

Two patterns appearing together on d3 (twin-T), establishing the
recognizable shape going forward:
- **Forward-pointing callout** — flag a deliberate gap in the
  explanation, name the discrepancy, point to where it gets
  resolved later. The d3 callout under the diagram ("Do you see
  a difference with this system I didn't mention?") forward-
  links to the planned load-piping page. Reader notices oddity
  → callout validates the noticing → future page rewards them.
- **Inward-pointing Easter egg** — reward exploring a widget's
  extreme state with content that wouldn't appear otherwise. The
  d3 widget's failure-state anecdote (the forgot-to-enable-the-
  injection-pump story) reveals only at 0 Hz. Reader drags out
  of curiosity → hits the failure state → discovers the war
  story → lesson sticks harder than prose would have made it.

Both work because they invite curiosity rather than demanding
attention. Use where the diagram or widget has a natural
question-shaped thing the page hasn't answered yet; don't
manufacture artificial gaps to fit the pattern.

### Education page scope — one question per page

Every new Education page declares its one question in the friction
file before drafting begins. The question goes at the top of the
page's entry, and it's the standard the page is held to: every
section either answers it or it doesn't belong. Vague scopes
("load piping," "refrigerant," "VFDs") drift into mega-pages
because nothing inside the scope says no to adjacent material.
A declared question does.

**Mechanics:**

1. **Declare the question first.** One sentence, in the friction-
   file entry, before any prose drafting. "What does the connection
   between a load and a hydronic loop look like, and what does that
   connection point have to decide?" is a question. "Load piping"
   is a topic. Topics drift; questions don't.

2. **In scope = what answers the question directly.** Usually two
   or three real sub-topics, each getting one section. If the in-
   scope list is longer than four items, the question is probably
   too broad and the page is two pages.

3. **Out of scope = explicit list of adjacent topics, with
   forward-link targets.** Each item gets `[future: <page name>]`
   or `[future: section in <page>]`. The marker is the discipline
   — it acknowledges the connection, drops a breadcrumb, and
   creates a record of what future page earns the topic. The
   prose draws the link with a sentence; the page doesn't *become*
   the link.

4. **Distinguish different systems from different functions when
   the question is ambiguous.** A different system (heat pumps,
   geothermal, cooling towers vs. hydronic distribution) is its
   own page. A different function (balancing, sequences, VFD
   pumping) is its own page. The current page is one system + one
   function, scoped tight.

5. **One adjacent topic may stay as a section if a budget is
   set before drafting.** Sometimes a small adjacent piece is too
   short to deserve a page but too connected to ignore. Set a hard
   length budget on it before the day session ("three paragraphs
   and one diagram, max"). If it grows past the budget during
   drafting, it gets pulled into its own page and a forward link
   replaces it. The budget is the trigger, not the judgment call
   at the end.

6. **Earn payoffs from forward references on prior pages.** If a
   previous page made a forward-pointing callout (discovery-prompt
   pattern, "find out on the load-piping page"), the new page ties
   back to it explicitly in a closing section. Don't ship the page
   without paying that debt — the discovery pattern only stays
   credible if it delivers.

**Why this isn't pre-architecting.** The rule isn't about
predicting every future page. It's about giving each page a single
question it has to answer well, and a written boundary for what
isn't its job. The forward links cost nothing — they're a record
of what's been promised, used as input when the friction file is
reviewed for what to build next. Topics surface organically as
they come up in drafting and get parked with markers; they're not
invented to fill a category tree.

**Applies retroactively as pages get extended.** PID Basics,
Hydronic Loops, and any other existing pages don't need re-
scoping today, but if they get substantially extended in a future
session, that's the moment to declare their question retroactively
and check that the additions answer it.

### Field-use conditions for reference tools

When building a calculator / converter / lookup that techs will
pull up on a job site, design for the conditions: gloves on, bad
cell signal, 30-second answer. Practical implications: tap-friendly
inputs, client-side compute (no network round-trip for the answer),
conservative external-resource weight, single-purpose tools that
beat kitchen-sink ones for the "open it, get the number, close it"
flow.

This is a *content-and-feature* consideration, not a page-architecture
rule. Pages render responsively (3-col grids collapse at ≤1000px,
2-col at ≤900px) and there's no "mobile subset" or "hide on
mobile" framework — every tool is the same tool on every device.
Use this when picking *what to build* and *how the inputs flow*, not
when deciding how the page itself is structured.

---

## Site architecture — the "no build step" question

> **Note (2026-05-16):** This section is preserved as the
> historical record of the earlier stance, when "no build step"
> was load-bearing and a static site generator was considered
> future-cleanup. After the page count grew to 17 and the
> head / nav duplication cost stopped being tolerable, the
> decision was revised: Eleventy (11ty) was adopted as a thin
> templating layer. See `codebase-issues.md` entry #4 for the
> revised decision and migration progress. The text below
> documents the stance at the time it was written.

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

*(Both 2026-05 entries — PID tuner integral-slider direction in Ti
mode, and the `.pid-term` → `.callout` rename — were cleared on
2026-05-17. The slider-direction concern was retired without code
changes; the class rename landed across `styles.css` and the five
pages that used it.)*

