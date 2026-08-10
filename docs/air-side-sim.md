# Air-side equipment DDC simulator — design & backlog

> Living design doc for the air-side / equipment DDC simulator line. Owner-active,
> scope evolves through interaction (mockup → react → refine). Started 2026-07-21.
> It superseded `docs/air-side-sim-scoping.md`, the 2026-07-19 feasibility pass,
> which was **retired 2026-08-08** once the sim shipped — that file's own
> lifecycle condition. What survived it is folded into *Reuse findings carried
> forward from the feasibility pass* below; git history holds the full text.

## North star

Take a tech from a rough idea of how an AHU works to **reading a DDC graphic and
diagnosing it** — seeing how the air flows and changes through the machine
(temperature, enthalpy, MAT, sometimes CO₂/OA) and naming the fault: *"there's
no ΔT over the coil,"* *"the OA dampers aren't feeding back right and it's tanking
MAT."* The coil physics, control sequence, and psychrometrics are all **means to
that diagnostic end**, not the point.

- **Look = DDC supervisory graphic (software register)** — the BAS front-end a
  tech reads, not a hardware device face.
- **Hub of sims ("walk up to the unit")** — components on the graphic drill into
  device-level sims (fan → VFD sim, DX coil → heat-pump sim), which unifies the
  existing sims and gives future ones a front door. *(See "drill-down" under open
  questions — the redundant tile UI is out; the in-graphic click may stay.)*
- **FCU first, grow toward the AHU.** The fan coil is the smallest diagnosable
  unit; the owner's own fault examples are AHU faults, so the structure grows
  toward OA/mixing → MAT and beyond.

## Pre-graduation record — Phase 7 and the pre-Phase-8 discussion, both COMPLETE (PRs #472–#476); the final review and Phase 8 have since EXECUTED

> **Correction of record (2026-08-04): the final review happened and
> Phase 8 EXECUTED.** Both workbench unit pages carry canonicals and
> graduated into the sitemap / search index / nav / the landing /
> `tests/pages.js`; the mockup stays hidden. Present-tense hidden-page
> and still-queued claims below this line are the pre-graduation
> record — the full execution record is the *Phase 8 — graduation
> EXECUTED* section below.

Three pages carry this line, and **one of them is still hidden.**
*(Corrected 2026-08-08: as written this paragraph called all three hidden,
which stopped being true at Phase 8. Verified against the three pages' own
frontmatter.)* Both workbench unit pages carry a `canonical` and no
`noindex` / `eleventyExcludeFromCollections` — they are live, indexed pages
reachable from nav, search and the sitemap since 2026-08-04. Only the AHU
depiction mockup is still `noindex` + `eleventyExcludeFromCollections` with
**no `canonical`**, so it is reachable at its URL and absent from nav /
search / sitemap / the landing — **crawl-hidden, not undeployed.** All three
build and ship to Cloudflare on every merge.

- **`html/simulators/ddc-workbench-fcu.html`** *(LIVE and indexed since
  2026-08-04; retitled `DDC Workbench — Fan Coil` at graduation)* — the working
  Workbench, a DX fan
  coil (renamed from `fcu-ddc.html`, then off the bare `ddc-workbench` name —
  that slot is reserved for the AHU). Two tabbed views on one runtime: a
  **Unit** view (the DDC graphic) and a **Wiresheet** view (the Function-Block
  Editor, lazy-mounted), with an **FBE control program driving the unit every
  10 Hz tick** through a generic binding driver. The unit-agnostic shell lives
  in `html/scripts/ddcw-shell.js`, the FCU plug-in in
  `html/scripts/ddcw-fcu-unit.js`.
- **`html/simulators/ddc-workbench.html`** *(LIVE and indexed since
  2026-08-04)* — **the AHU Workbench, and it was
  live at its URL as of 2026-07-30.** Same shell, same two tabs, the AHU plug-in
  driving it: the approved round-2 depiction as the Unit view, one starter
  program (`econ-2stage` — economizer permit, 2-stage DX, proportional HW, all
  six actuators authored) on the Wiresheet, a five-way sensor-override block,
  and an outdoor-air slider that reaches −20 °F. The bare `ddc-workbench` name
  was reserved for exactly this.
- **`html/simulators/ddc-workbench-ahu-mockup.html`** *(the one page still
  hidden)* — the AHU depiction
  mockup: one machine drawn twice, round two rebuilt on the owner's own
  production-graphic conventions, with round one's three compositions kept below
  it as the reference he asked to keep. Drawing and static plausible values
  only — no physics, no runtime. **Archival now that the live page exists** —
  it is the depiction record, and prose derived from its numbers must be
  re-derived rather than copied (see the setpoint ruling below).

> ⚠️ **A hidden page is invisible to the whole test suite.** No `canonical`
> means no entry in `tests/pages.js`, and that manifest is what the smoke walk,
> the responsive sweep and the blocking contrast sweep all iterate — so a green
> run proves *nothing* about such a page. Any further hidden page needs its own
> spec, written by hand. *(Corrected 2026-08-08: this warning applied to all
> three pages when written and now binds only the mockup — the two unit pages
> joined `tests/pages.js` at graduation and the sweeps reach them. The mockup is
> covered only where a spec names its URL directly.)*

**The loop is CLOSED** (PR #425, 2026-07-24): `plant.zoneT` is an integrated
state driven by a zone heat balance, so the staging program holds the space on
its own. A 1–60× speed slider scales the one `dtSim` that drives both the zone
integrator and `FBE.tick`.

**Where the arc stands.** The depiction increment, the FBE Workbench,
closed-loop physics and the **full-experience arc** are all merged — the last of
those bringing 3-slot BACnet priority arbitration in place of HAND/AUTO, a
relaid-out wiresheet, the *2-stage + safeties* sample program (latched DAT
low-limit, full-stop-only min-off) into the program library, the shell / unit
plug-in extraction, sensor glyphs on the graphic (RAT and DAT insertion probes
and a space-temp wall plate, each activatable to highlight its chip), and a
**signed** coil ΔT — leaving minus entering, negative while cooling.

**Phase 7 — the AHU round — opened** with a pre-AHU hygiene lane and the
depiction round (PRs #446–#448), which is what put the mockup page, the
component-identity `-fill` token family and the DX distributor on the site.

**The AHU's physics half now exists** — `html/scripts/ddcw-ahu-unit.js`, plus
the shared `Psychro.mixStreams()` helper it is built on and two engine-direct
specs (`tests/ddcw-ahu-unit.spec.js`, `tests/psychro-mixstreams.spec.js`). What
that file is, exactly:

- The **17-point roster** the machine is defined by (5 AI, 1 BI, 3 AO, 3 BO,
  5 params), the plant factory, and the per-tick integrator — mixing box → HW
  coil → DX coil → draw-through fan, a lagged coil-leaving temp, a fan-proof
  timer behind the `fan-status` BI, and the lumped-capacitance zone balance.
  `plantKey === id` throughout.
- **DOM-free by construction.** It exposes `{ points, createPlant, update }`
  and nothing else, and its spec loads it in a bare vm context — the load is
  the proof.
- **It now satisfies the shell's unit contract** (2026-07-30, the page lane).
  The DOM half — `create(cfg)`, `renderUnit`, `syncControls`, `wireControls`,
  `initAnim`, `onResize`, the program registry and the pacing constants — sits
  under its own banner below the physics, and `ddc-workbench.html` boots the
  shell against it. The DOM-free load still holds: every `document` read is
  behind `bindDom()`, which `wireControls` calls as the first unit method the
  shell invokes, and the bare-vm spec row is what proves it.
- **Three deliberate divergences from the FCU** a reader will trip over, each
  argued in the file: the DX stage count is **additive** rather than
  Y2-implies-Y1 (a miswired Y2-without-Y1 then delivers half capacity, which
  is diagnosable); the weather and load knobs live **on the plant** rather
  than in module scope (the FCU's module-level `let`s cannot be swept from a
  spec, and "more outdoor air lowers MAT" is the AHU's first invariant); and
  the mixing box is weighted by **volumetric flow**, stated at the call site
  with the ~2 °F cold-day divergence from a mass basis written down.
- **Each coil is bounded, and the bounds belong to an ENERGIZED coil.** The DX
  side holds a freeze floor and an entering-air ceiling *inside* the
  `capActive` branch — the review round caught the floor firing on a
  de-energized coil, which invented up to 55 °F of rise across two dead coils
  on a design-cold morning and quietly did the sequence's freeze protection
  for it, hiding the "someone deleted the min-OA block" fault the damper model
  exists to make showable. A starved coil whose psych inversion fails now pins
  at the floor rather than falling back to no cooling, so the coil ΔT is
  monotone in airflow. The heating side gained the mirror bound,
  `HW_LEAVE_MAX` — a hot-water coil approaches the entering water temperature
  and cannot pass it — which also keeps the leaving state inside the psych
  engine's own validity envelope (above 212 °F at sea level a saturation
  humidity ratio does not exist, and the engine was silently zeroing the
  humidity ratio there). Details and the measured before/after in the file's
  own comments; the residuals it surfaced are codebase-issues **#236**
  (`mixStreams` fog branch), **#237** (the FCU carries the same starved-coil
  fallback, and it is live) and **#238** (`buildState` degenerates quietly
  above boiling).

The **second AHU sheet SHIPPED 2026-08-02 (PR #468, adversarially verified)** —
`econ-2stage-lowlimits`, the winter-protections sequence built to the owner's
field architecture (the Lane C rulings below): the direct-acting MAT low-limit
PID capping the damper through a MIN — riding it below the 20 % ventilation
minimum when freeze protection outranks ventilation — and the software LLS off
DAT tripping a latched full stop (damper closed, HW valve held open downstream
of the proof select, fan stopped), with a free `LLS Reset` bi as the deliberate
release. 55 blocks / 68 wires on a widened 1926×980 canvas; `mat` and `dat` are
wired there and stay deliberately unwired on the starter. The LLS constant is
**35 °F, measured as this machine's own boundary** — in clean integrated
econ+DX cooling DAT rides exactly 35.0 (the 34 °F energized-coil floor plus
1 °F of draw-through fan heat), so a 36 °F stat nuisance-trips ordinary
cooling; the derivation sits in the literal for a one-click retune. War story
#4 renders on the Unit teach block. The **FCU ⇄ AHU unit selector shipped the
same day (PR #470)** — a `Unit — FCU | AHU` statusbar link pair with
`aria-current="page"` on the self link, adversarially verified with zero
defects.

**The pre-Phase-8 discussion has now been held AND executed** — the owner
ruled a slate in one sitting on 2026-08-03 and five serial lanes shipped
against it (**PRs #472–#476**, each built by a lane agent and adversarially
verified before merge): operator-editable setpoints on both param rails, the
mirror diet, the FCU harmonized to the AHU plus the owner's long-parked
"fix 1", his name-pass rulings executed verbatim with the final war-story
paragraph, and the Unit tab made an honest phone surface. The rulings and
the execution record are the dated section below; the merge-by-merge detail
lived in `docs/next-session-handoff.md`, which briefed the review session
and was **retired at graduation** (git history retains it) — the
*Phase 8 — graduation EXECUTED* section below is now the record.
**What comes next is the owner's own final review, run WITH him in a fresh
session** — his instruction, and the gate on everything after it. **Phase 8
is graduation, and it executes only after his push-live call** — until then
the Workbench is a react-baseline and reference point, not a surfaced page.

### Rulings that landed with the AHU page (2026-07-30)

- **Setpoints — the PHYSICS MODULE wins (codebase-issues #242).** The AHU ships
  cooling 72 / heating 68 / deadband 2, so cooling **makes at 74 and breaks at
  72** (the setpoint is the CUT-OUT) and the separation between the two
  setpoints is **4 °F**. `ddcw-ahu-unit.js`'s seeds and its measured
  cycling-arrival comments are correct and are not to be re-measured. The
  mockup's 73 / 68 depiction stands as an archival record and was **not**
  edited. Consequence, and it is the trap: any prose carried off the mockup has
  to be re-derived. Its "a space of 74.0 °F can sit under a lit stage"
  illustration **collapses** at 72 + 2, because 74 *is* the make point — the
  live page states **73.0 °F**.
- **Outdoor-air range (codebase-issues #243).** The AHU's slider is
  `min="-20" max="110" step="1"`, default 80. The FCU's 55…110 stays. The
  OAT-indexed figures in the physics comments are scoped to that range: the
  fogging onset (about −2 °F at a 50 % damper against a 72 °F zone), the 0 °F
  case and the −20 °F / 70 % corner are all **reachable**; the −30 °F / 65 % /
  90 °F-zone corner is out of range and reads as an illustration only.
- **`role="img"` stays on the graphic (codebase-issues #227b), on BOTH pages.**
  Nothing inside either drawing is focusable — `role="img"` prunes the subtree,
  which is what keeps ~19 duplicated `<text>` nodes from being read twice — and
  the activation affordance is real HTML **buttons in the point mirror**. The
  ruling was one change across both pages, and both shipped in this lane.
- **All five AI points carry a sensor override** (space-temp, oat, rat, mat,
  dat). The plant's override map is keyed by sensor point id, and the four
  missing entries were added in the same lane — `sensedValue` returns truth for
  a missing key, so four of the five toggles would otherwise have been silently
  inert.
- **A fogging MAT gets a marker (codebase-issues #240) — one candidate, built
  to be looked at.** Wave strokes beside the MAT well plus a real sentence in
  the mirror, driven off `mixStreams`' own `fogging` flag. It is **suppressed
  while the MAT sensor is forced**, because the marker is a disclosure about the
  number in that well and that well paints the SENSED value. The owner may
  redesign it; a silent bare number is the one option ruled out.
- **The drawing's fan row is `RUN`, not `STATUS`.** The roster's `fan-status`
  BI is the PROOF and paints the "Fan Sts" chip, so a drawing row showing the
  fan COMMAND under the word STATUS put the same name on two disagreeing
  surfaces — on the one page whose prose teaches that command, status and proof
  are three different claims.

> ⚠️ **Two protections stack on the safeties sheet, and the page's own note
> describes only one** — a trip is itself a stop, so it arms the min-off TON as
> it cuts the stages. Logged as codebase-issues **#226**, with **#225** (that
> sheet carries no airflow proof, so its DAT low-limit goes blind when the fan
> stops). Both deferred by owner decision to a single pre-live sweep alongside
> the AHU programs. Read them before touching a sequence here.

### Rulings from the depiction review (2026-07-31)

- **Provenance is about what KIND of point it is, not how the number was
  derived** (owner, 2026-07-31). This is the general rule for the register
  colours, not a note about one well. Every commanded value on the drawing is
  computed by the program — a damper position, a valve position, a stage call
  and a fan speed are all arithmetic somewhere — so derivation cannot be the
  test, or the whole screen would go blue. **A command is a command.** Blue /
  CALCULATED is reserved for a readout that is **not a point at all**: the ΔT
  well, which is arithmetic on two other numbers already on the screen and
  exists nowhere in the controller. Audited against the shipped page and it
  already matches — **9 commanded wells, 1 calculated (ΔT), 6 measured**.
- **Damper blades draw the commanded angle, and the two vertical-flow sets
  were rebuilt to make that true** (codebase-issues **#253** carries the
  mechanism and the measured before/after). The return damper also **moved up
  into the drop**, above the casing roof, which is where a return damper
  actually sits and what puts the recirculated air *through* it. The intake
  damper keeps its mild skew by owner decision — it reads correct at every
  position, and the half-extent that causes the skew is what seals the intake
  opening edge to edge.
- **Status is usually all you get, and the ΔT well is the cross-check** (owner,
  2026-07-31). The page already taught that command, status and proof are three
  different claims; what it did not say is that in the field you rarely have all
  three, so the real work is deciding whether to believe the one you have. That
  beat shipped in the airflow-proof paragraph of the wiresheet prose, **on this
  page only** — the paired live lesson (`education/status-and-proof.html`) was
  deliberately left for a separate pass rather than widened into a depiction PR.

**The FCU line, increment by increment** — a closed record of how the fan-coil
Workbench got built, kept because the PR is where the reasoning lives. Phase 7
and later do not extend it; read *Where the arc stands* above for the present.

- **PR #420** — the DX fan-coil DDC-graphic mockup (Increment 1's depiction:
  live points EAT / DAT / ΔT / zone / fan / compressor, chevron airflow, fault
  presets, the "no ΔT over the coil" tell, fullscreen, in-graphic drill-downs).
- **PR #421** — the FBE editor wire-visibility fix (delete-one-blanked-all).
- **PR #422** — extracted the drag-wire editor into the shared module
  `html/scripts/fbe-editor.js` (`window.FBEEditor.createEditor`) + fixed
  codebase-issues #196 (render/cache decoupled from the wire data objects);
  version 3.72.1 → 3.73.0.
- **PR #423** — the Workbench itself (two tabs, the host tick loop, the generic
  binding driver, the FCU unit plug-in, 3 sample programs).
- **PR #424** — the verdict pill reads idle (neutral), not a red fault, when the
  program satisfies the space (auto-fan cycles the fan off).
- **PR #425** — closed-loop physics (the zone integrator + the speed slider).
- **PRs #436–#442** — the decision round and its sidecars, #209 priority
  arbitration, a real IBM Plex Mono 700 face, the program rewrite +
  candidate-A wiresheet relayout, the shell/unit extraction, and the `-fcu`
  page rename.
- **PR #443** — the fourth program, *2-stage + safeties*.
- **PR #444** — Phase 6 **visible sensors**: three glyphs (RAT and DAT
  insertion probes, a space-temp wall plate), each click / Enter / Space
  activatable to pulse the matching IO chip via the shell's `highlightChip`
  host hook. **RAT is a real AI point reading TRUTH zone temp**, so overriding
  the wall stat splits the two chips — the real-vs-sensed beat. Mockup-first:
  glyph CSS stays page-inline until the AHU page graduates it.
- **PR #445** — the signed coil ΔT and the min-off teaching beat.

### Rulings from the naming arc (2026-08-01 — PRs #458–#465, v3.79.0)

Every block head across all three FBE surfaces now renders **`TAG · Name`**:
the mechanism landed in PR #458 (per-type `tag`, per-instance top-level
`name`, roster-derived stamps for point-backed workbench blocks via
`ddcw-shell.js`'s `buildNamedPrograms()`), and the hand-authored set landed
in PR #465 off **`docs/name-inventory.md`** — the committed naming record.
⚠️ Read that file's HEADER before its body: its three supersessions are
owner-ruled. Rulings, all 2026-08-01:

- **The `readout` type is GONE — folded into `ao`** (PR #461). Owner: "the
  type is the same, the name carries the meaning" — a display-only sink type
  was an editor invention; in the field the NAME says what an output does.
  The public PID sheet's probe became `AO · HW Vlv` (the AHU roster's own
  name for that point) and its redundant second AO was dropped — "one
  command signal, one output point."
- **Comparator tags are ASCII** (`A>=B` / `A<=B` / `A!=B`) — #255 option 2;
  the glyph labels stay pretty. Option 3 (re-subset SIX woff2 files, adding
  the comparator codepoints AND Δ/≈/→) is a logged future typography lane
  in `site-ideas-and-friction.md`.
- **`SEL · Proof Dmpr`** replaced the inventory's falsified `Occ Dmpr` (the
  wire moved to `fan-status` in `cadd43e`; the chain reads what-selects-at-
  each-step: `Econ Dmpr` → `Proof Dmpr` → `OA Dmpr`). ⚠️ The owner would
  personally call it "Fan Sts Check" but kept the chain theme — and flagged
  that **he may want a full pass over all block names in his own voice**
  later. Offer that pass when Lane C or Phase 8 touches the sheets; don't
  re-litigate single names before then.
- The FCU safeties sheet **keeps its six `DAT*` names** (the recorded
  `Above Clear`/`Below Trip` alternate was declined).
- **#247** low-charge verdict softened to symptom-plus-candidate
  (disposition 3, PR #460); **#256** closed as a **written exemption** —
  its touch-tablet scenario was DISPROVEN (the wiresheet gate is an OR;
  no touch-primary device reaches the inspector at any width); the FCU
  roster's `fan-speed` renamed **`Fan Spd`** (PR #463, ledger #258);
  **bandAfterHeat's JS-selected ink tokens BLESSED** (ledger #257 — FIVE
  inks including the dead-grey `off` band; `var()` references only, never
  resolved colors; revisit only inside a bigger animation pass).
- **Fullscreen scroll** (PR #462): the unit console (AHU) / graphic (FCU)
  pins sticky while the pane scrolls, yielding its overhang at the end of
  travel so the verdict pill stays reachable. Normal flow deliberately
  untouched (the left column is the tall one there).
- Testing lesson for any measured spec (ledger #259): the tool-card
  entrance fade's DELAY phase defeats Playwright's actionability wait
  (stationary at opacity 0) — settle composited opacity before measuring
  ink after a tab click.

**Lane C implication:** a new AHU sheet authors `name:` keys on its
non-point blocks and adds its per-sheet floor to
`tests/fbe-block-names.spec.js`'s `MIN_HAND_NAMED` map — a sheet with no
floor row ships its names unguarded.

### Lane C rulings, and the war story #4 record (2026-08-02)

The owner ruled the Lane C decision slate in one sitting. All 2026-08-02:

1. **The second sheet is winter protections, built to his own field
   architecture.** His description, near-verbatim: a **direct-acting PID
   running to a min MAT** ("something around 45 to 60 depending on
   application"), hooked to a **MIN block with the vent demand** and
   whatever else — "it's the last PID before the LLS MUX block." The LLS
   is physical, but he also adds **an AND with a software LLS somewhere
   around 40 — ideally what the real LLS is set to — off DAT.** License
   granted with it: *"You don't have to follow that exactly, but if you
   don't, at least design around that."*
   FBE mapping, agreed: the catalog's `pid` block
   (`fbe-engine.js:341` — `action: 'direct'` is a literal param) with
   SP = a hand-named min-MAT const, PV = `mat`; its OUT into a `MIN`
   with the `dmpsel` chain's demand, then the LLS select, then the
   existing fan-proof select. The software LLS is a comparator off
   `dat` against a const named for the physical device's setting. **The
   physical LLS exists in prose only — the roster gains no point.**
   Trip actions and latch behavior are the lane's to design and defend
   (the fan-stop → DAT-reads-zone → self-clear short-cycle interaction
   is the known trap family, #225's story).
   ⚠️ Correction of record: an orchestrator claim that the FBE had no
   PID block — grounds for a gain-and-clamp design-around — was
   **falsified by the owner live on the preview**; the claim came from
   a truncated catalog grep. The catalog has carried `pid` (with
   anti-windup, derivative-on-PV) all along.
2. **No flawed sheet is needed for go-live.** The flawed-programs
   direction (2026-07-26) stands as *add-on material*: "if I have good
   war stories that come to mind I can build those programs or describe
   the failure mode and add eventually, but that's not needed to go
   live, that's add on type material anyway."
3. **War story #4 renders on the Unit tab's teach block**, extending the
   "Two setpoints, and what happens when they overlap" paragraph — he
   accepted the recommendation and "may tweak once I have a full
   preview."
4. **The full block-name pass is NOT folded into Lane C** — "all that
   isn't an amount to 'fold in' to a lane." It waits for the dedicated
   pre-Phase-8 discussion.
5. **#240 fog marker: RESOLVED same day — keep as-is.** The owner's
   first look could not reproduce it because the recipe had been quoted
   against the page-load zone (76 °F) rather than the settled winter
   sawtooth (~66–67 °F). He reproduced it with the corrected recipe
   (outdoor air −15 °F, manual damper 60 %) and ruled the candidate
   ships unchanged: fog in AUTO would be *"an extreme fringe case on a
   well programmed system,"* so manual-only reachability mirrors the
   field. `codebase-issues` #240 carries the measured findings.
   *(2026-08-09: this recipe SURVIVES PR #488 unchanged — the settled
   program holds the hot-water valve at 100 %, so nothing trips. Only
   the SPEC's arrival-plant recipe moved. See the Phase 9A section's
   fog correction before "fixing" either.)*

#### War story #4 — the record (supplied 2026-07-29)

Owner-true, collected live; render in house voice, never paraphrased
into something he didn't say. The quote:

> *"I have had multiple customers put heating set points above cooling
> set point when they don't know what they're doing. They think 'oh
> cold is a lower temperature so I'll put it lower' … you'd be
> surprised how often people get confused with them when they have
> access to both on the BMS."*

**The mechanism, pinned so it can't drift.** Correct is heating setpoint
BELOW cooling setpoint; the gap between them is the neutral zone — the
`SP DIFF` rail well, **never "the deadband" and never "the
differential" in prose**. The deadband is the separate per-setpoint
hysteresis: as shipped, cooling 72 / heating 68 / deadband 2, so cooling
makes at 74 and breaks at 72. Invert the setpoints and the two sides'
active regions overlap — both call at once. The mental model that
produces the inversion: *"cooling means cold, so the cooling number is
the low one"* — a reasonable inference from the label, and wrong,
because a cooling setpoint is not a cold temperature, it is the
temperature **above which cooling starts**. (A first draft of the
out-of-repo note conflated the setpoint gap with the deadband while
documenting this very confusion — evidence the collision is real;
re-check that phrase every time it is written.)

**The framing, corrected twice by the owner (2026-07-29):**

1. **The customer DID enter a wrong number** — do not absolve it. His
   words: *"The customer did enter the wrong number, but it wasn't
   their fault."* The entry was wrong; the front end set them up for
   it. Blame moves to the design, the error stays an error.
2. **The affordance that confused one customer is what another customer
   wants** — *"some customers want the same thing that was confusing
   for other customers."* The lesson is therefore NOT "don't expose
   both setpoints"; it is a design judgement with no house answer.
3. **Two obligations on the programmer, both stated:** get the
   cooling-vs-heating setpoint model right *yourself*, and build the
   graphic toward where the customer actually stands — his range:
   *"equal to someone in the field, or someone who knows just the very
   basics of HVAC"*; his example stays generic (a rural school's
   custodian vs a large factory campus team), *"not just because the
   controls are different."*

**Emphasis and vocabulary (settled 2026-07-29 — he changed his mind
mid-thread; the later instruction wins):** keep the user-level point at
FULL weight — *"I changed my mind, I'd rather keep my real voice so
ignore the first instruction"* (which had asked to shorten it). It stays
an aside inside technical copy, not a section of its own. Say
**"user", never "audience"** — *"I'd rather sound like a standard
software dev than a consultant."* Two owner lines usable as-is in page
copy: *"consider who will use the system and what their skill level
is"*, and — about the sim exposing both setpoints to everyone —
*"this is where a mistake is free and can even be fun to see."* That
second line is the reframe: the exposure isn't a contradiction, it is
the sim's whole purpose.

**Two connections surfaced and ratified, not to be re-derived:** this
failure mode is what his green-commanded/grey-no-point well convention
was invented to prevent (same instinct, opposite directions — the
graphic makes the argument visually, which is why the prose aside can
stay an aside); and the label "cooling setpoint" inviting the wrong
inference is the same naming-beat family as the "differential"
collision.

### The pre-Phase-8 discussion — rulings and execution (2026-08-03)

The dedicated discussion Lane C deferred the block-name pass to. The owner
ruled a slate in one sitting and five serial lanes executed it the same
day — **PRs #472–#476**, all merged, each adversarially verified before
merge. Everything below is a ruling of record; where he is
quoted the words are his. What is NOT here is as load-bearing as what is:
on the name pass **everything unmentioned stands as shipped**, with tweak
rights reserved for his preview walk.

**1. Unit-tab operability — the param rails become editable (PR #472).**
The decision slate the lane carried as D1–D4 was ruled in favour of a real
operator surface on both pages: labelled number inputs in the AHU's param
rail and a new FCU mini-rail, writing the **RUNNING graph's `const`
block** through a new `host.writeParam` hook (never `plant.params` — that
is a per-tick block→plant mirror and a direct write there is clobbered
inside one tick). Commit on Enter or blur, never per keystroke; Escape
reverts; display-unit-aware; clamped to the roster's new per-param
min/max; **disabled** when a custom sheet lacks the block. Two of the
ruled details carry the reasoning:

- **The clamp is ANNOUNCED, and that is a deliberate inversion of field
  practice.** A real front end keeps its rails quiet — the shipped rail
  note states the inversion in the reader's own terms: *"A real front end
  usually keeps its rails silent — you rarely want occupants to know where
  they are — but this is a classroom, so this graphic announces them."*
  The announcement is the teaching surface, not a UI nicety.
- **No cross-field separation guard, by ruling** — the rails clamp each
  parameter to its own range and nothing stops the two setpoints from
  crossing. Disclosed on the page as genuine field variation rather than
  papered over, and it is the same commitment the roadmap ruling below
  makes globally.

**D2 — the commit FEEL — is the one item he reserved**, pending hands-on at
the preview; so are all of the clamp ranges themselves, which the lane
flagged for retune rather than defending.

**2. The mirror diet (PR #473).** Above a measured 900px cutoff the
**plain** mirror cells stop taking space; the sensor **buttons** stay at
every width. The buttons are the only keyboard path to the chip pulse
(`role="img"` prunes the drawing's subtree — #227b), so they are not
diet-eligible, and the plain cells go **visually hidden, not
`display: none`**, because three AHU values have no statusbar chip and the
mirror is their only text rendering. The fullscreen non-vacuity floors
were **re-derived** against the diet rather than patched to pass.

**3. "Base everything off the AHU" — a STANDING tiebreak, not a one-time
instruction (PR #474).** Where the two pages disagree about a shared
pattern, the AHU is the reference and the FCU moves. Its first application
harmonized the FCU's sensed-value painting to the AHU's (truth appears
only at the override readout) and moved the FCU drawing to **RAT**
vocabulary, the probe having already been drawn where it physically lives;
the prose keeps the honest gloss that on a recirculating unit the return
air *is* the entering air. Reach for this rule before inventing a third
pattern.

**4. The name pass (CLOSED).** The roster renames — `y1`/`y2` →
`Clg Stg 1` / `Clg Stg 2` and `space-temp` → `Zone Temp`, on BOTH rosters
— cascade to the chips, the off-program verbatim spec strings, the
override picker, every hand-written graphic and mirror caption, and the
spec pins. The sheet literals gained the `Stg 1 …` / `Stg 2 …` family in
place of the `Y1 …` one, `dmpout` became `Fan Sts Chk` (the name he said
he would personally use, offered and taken when the sheets were next
open), and `gain` became `Heat Kp`. The rest of the damper tail is
deliberately unchanged.

- **The value-name convention, and its boundary.** A **pure reference**
  const feeding a select or a mux is named for the value it carries —
  `0%`, `100%`, `60%` — because on that block the number *is* the meaning.
  **Setpoints and tuning parameters keep semantic names**, on his rule:
  *"I don't have set points or PID tuning parameters as just the
  numbers."* Deduplication happens **only where two value-names collide on
  one sheet** (his minimal-dedup rule), which is why winter's pair reads
  `100% Spd` / `100% Pos` while the starter's fan reference stays a bare
  `100%` — a conscious asymmetry, not a miss. If a temperature reference
  ever lands, the ASCII head constraint versus `°` gets decided then.
- ⚠ **Values in value-names must be re-derived from the shipped literals,
  never trusted from a document.** `tests/fbe-engine.spec.js` pins the
  pairing with a count floor, so a retune moves the name and the value
  together or the suite reddens.

**5. War story #4 — FINAL text, and two supersessions.** He read the
paragraph and said *"Ship it"*; it ships byte-identical on the AHU Unit
teach block. Both supersessions are of his own earlier instructions:

- **The explicit blame sentence is DELETED** — the 2026-07-29 ruling to
  render *"the error stays an error / it wasn't the customer's fault"*
  explicitly is superseded. The framing now lives implicitly in the
  description of the action ("the access that trapped this customer is
  exactly what the next one is paying for"). The record above stands as
  history; the paragraph is the current text.
- **"Two obligations" is gone, count-free.** The programmer's obligations
  are now stated as *"obligations attached"* and then named, rather than
  counted — the same reason the site's prose convention distrusts a
  number that an addition can falsify.

**6. Roadmap commitment — NO CROSSING GUARDS, ever, in this library.** No
program in the workbench library ships setpoint-crossing protection,
logic-side or point-side. His reason: *"if we're putting this much effort
into teaching this, guarding against experiencing that failure mode is not
a good idea."* **Scope is exactly the crossing failure mode.** Safeties
are a different category and keep shipping — the low-limit stat, the
airflow proofs, the min-off timer all stay. The war-story paragraph
carries the practiced-eye disclaimer so the absence reads as intent
rather than as an oversight.

**7. Hover tooltips — DEFERRED until after go-live, and reclassified.**
Not a workbench item at all: he ruled it an independent **site-wide**
concern. It is therefore out of this backlog and lives in
`site-ideas-and-friction.md`, where the native-versus-custom distinction
that makes it decidable already sits.

**8. Mobile — the open question is ANSWERED by declaration (PR #476).**
*The Unit tab IS the limited mobile version* — declared, not newly built:
*"see the unit and poke at it… also entices return traffic on desktop"*,
and he already uses it to preview off-laptop. What that declaration OWED
was proof, and the lane paid it: a driven audit at phone and tablet
widths, the fixes it surfaced, hand-written responsive/touch spec rows
(hidden pages are invisible to `responsive.spec.js`), and an honest
one-line note for a phone reader who opens the wiresheet. The wiresheet
keeps its existing touch gate (#256).

**9. "Fix 1" is EXECUTED (PR #474)** — parked since 2026-07-22 and folded
into the harmonization lane on his call, *"while it's cheap."* The FCU's
return duct now drops into the cabinet **top** instead of wrapping the
left side, the RAT probe moved onto the new run (still drawn where it
physically lives), the badges got breathing room, the `<desc>` was
rewritten and the chevron/geometry spec rows re-derived. His eye reviews
the result at the final review; tweak rights standing.

**10. Damage-stakes — CLOSED, and Phase 8's gate list drops it.** The
workbench needs **no added damage-stakes boilerplate**: the existing
page-tailored prose satisfies the convention under the
existing-stronger-note rule (the electrical-quick-calc precedent), the
low-limits sheet note being the strongest instance — *"where in that band
to put one is a judgement about the machine it protects."* His ruling:
*"if a person is taking random site info to protect their equipment,
that's out of our hands and my LLS number is the least of their concerns,
not that our existing warnings are not good, we want to educate too after
all."*

**11. The endgame — the final review runs in a FRESH session, WITH him.**
His instruction: *"fresh agent's eyes just like my fresh human eyes."* The
session that finishes the queue prepares the review rather than running
it; `docs/next-session-handoff.md` was that briefing — it carried what
shipped, what waited on his call, and Phase 8's full gate list, and was
**retired at graduation** once all three were spent (git history retains
it). The *Phase 8 — graduation EXECUTED* section below records the review
it briefed and what actually shipped.
**Phase 8 executes only after his push-live call.** The flawed-programs
framing needs no further discussion — it stands as ruled (no flawed sheet
for go-live; add-on material he seeds), now with the no-crossing-guards
commitment beside it.

**Queued by the lanes for that review, not blocking:** the
zone-vocabulary collision (both zone boxes paint the SENSED value
captioned `ZONE TEMP` while the truth readout beside the override says
"zone NN.N °F" — before the rename the SPACE-vs-zone wording itself
carried that split; by his explicit ruling the caption follows the roster,
so any fix lands on the TRUTH READOUT's label); `Stg2 Call`, now the only
unspaced `Stg2` left, on the two FCU sheets that still carry that block;
and the console caption "Compressor stage — Y1 / Y2", which kept
thermostat-TERMINAL vocabulary rather than the new point names — lane
judgement, field-realistic, his to confirm or rename.

## Phase 8 — graduation EXECUTED (2026-08-04, PR #478, v3.80.0)

The owner's final review ran 2026-08-04 in a fresh session,
decisions-first on the handoff's eleven calls. Rulings: **everything
accepted as shipped** (clamp ranges, D2 commit feel, fix-1, the 900px
mirror-diet cutoff, the zone-vocabulary collision, the Y1/Y2 console
caption, the 375 chip wall — option (c) accept, phone-scale legibility,
the war story in place), with one fix ruled in: **`Stg2 Call` →
`Stg 2 Call`** on the two FCU sheets. Two graduation-time calls rode
along: the **FCU retitled** to `DDC Workbench — Fan Coil` (title
frontmatter only — with both pages public the bare title was
indistinguishable from the AHU's in nav/palette/search, the Bing
duplicate-title lesson), and the home **Featured badge repointed** at
the AHU.

What shipped (PR #478, merged and verified live 2026-08-04):

- canonicals on both unit pages (`noindex` + the collections exclusion
  out; `keywords` in); sitemap / search index / flat Simulators
  dropdown followed automatically from the collections
- `tests/pages.js` rows — the smoke / responsive / contrast sweeps
  reach both pages now; the first-ever both-themes contrast sweep of
  the pages found **zero** new failures (the `-ink` discipline held —
  no ALLOWLIST entries needed); `.ddcw-offprog.is-empty` joined the
  responsive sweep's INTENTIONAL list
- landing cards lead the simulators grid; home Browse pill 7 → 9;
  README tour bullets; Status & Proof pays the reverse cross-link both
  pages owed it (both anchor the lesson)
- the in-page GRADUATION TRIGGERS were honored: the unit-selector CSS
  and `p.ddcw-sheet-mobile-note` promoted to `styles.css`; the
  header-clearance pair stays page-local (site-wide selectors — #272's
  open design call), the forced-mark pair deferred as **#273** (wants
  a `.ddcw-forced-mark` rename); the simulators landing crossing its
  documented ~6-entry chips threshold at nine cards logged as **#274**
  (no category taxonomy exists for sims — design call)
- the hidden-state comment sweep across the specs, the unit scripts,
  `perf-profile.mjs` and CLAUDE.md (whose merge-authority boundary
  flipped: both pages plus `ddcw-shell.js`, `ddcw-ahu-unit.js`,
  `ddcw-fcu-unit.js` and `point-arbitration.js` are LIVE surfaces
  now); **#271 executed and RESOLVED** riding the 3.80.0 bump
- the diff was adversarially verified pre-push (five refutation
  lenses; nine confirmed findings, all comment/docs truthfulness,
  fixed on the branch), the full suite ran green locally (1089/0) and
  in CI, IndexNow fired on the merge with the clean URLs, and the LAN
  preview was republished even with main

`docs/next-session-handoff.md` is **retired** (its lifecycle condition
— review happened, Phase 8 shipped — is met; git history retains it).
This section is the durable record.

## Phase 9A — the hardwired low-limit stat + the sustained-cold ramp — SHIPPED (2026-08-09, PR #488, v3.81.0)

What shipped, from owner rulings on 2026-08-08/09:

- **A hardwired manual-reset low-limit stat modelled in the plant**,
  tripping at truth DAT < 38 °F, latched, dropping the fan on both
  sheets beside the belt fault. **Not a roster point** — the
  instrumentation gap IS the lesson (the unit stops and the program
  cannot say why). It reads the truth discharge, not the DAT sensor: a
  forced-low sensor trips the software limit and leaves this one made.
  No verdict branch names the trip — the ladder reports only the
  consequence, and a spec vocabulary ban pins it.
- **The software `LLS Trip` moved 35 → 41** (low-limits sheet only),
  from field practice rather than the model's own constants: hardware
  ~38, program 40–42, a 3 °F spread, scoped in-code to the owner's
  Northeast US practice. Measured before the change, 35 was dead code —
  across every ordinary drive the coldest discharge was 38.83 °F
  (verified twice, engine-direct).
- **Reset lives on a `.device` equipment-register face** — the physical
  button on the machine. The drawn stat on the graphic is unmarked and
  stateless (identity ink; the trip is legible at the device face). The
  reset confirmation is written AFTER the repaint it triggers — the
  synchronous paint latch blanks anything written before it (caught and
  fixed pre-merge, with a spec row that fails against the unfixed tip).
- **The sustained-cold ramp** (owner ruling, 2026-08-09: *"I'm fine with
  one drag doing it, but I don't want someone to trip it just testing
  the slider itself"*): the OA slider writes a TARGET and the outdoor
  air walks toward it at 0.5 °F/sim-s — a usability constant, not
  weather realism, tuned by measurement. A drag-and-release at the
  default 20× clock must be held ~4.4 wall-s before it can trip; a
  slider left cold trips in ~3–5 wall-s. Presets snap (deliberate
  staging, not slider-testing). Accepted residual: at 50× effective a
  deep drag held ~1.2–1.8 s can still trip. Two measured surprises
  behind the tuning: the accident was drag-and-RELEASE (the teleporting
  knob made any release position permanent weather), and full depth was
  NOT the worst case — crashing the zone drops the stage before the
  discharge gets cold, so the dangerous release band was ~40–45 °F.
- **The "Compressor running on air already near freezing" verdict became
  unsittable on a protected machine** (structural: with a stage lit and
  no heat, every discharge the coil floor allows in that band trips the
  38 °F stat). Kept, `test.fixme` with the argument written above it.
  The defeat/jumper follow-on (shipped 2026-08-09, PR #495, v3.82.0)
  makes it sittable again — owner rulings there: the state word
  is JUMPERED with the term defined in adjacent copy, and the jumper
  survives presets and program switches.

**The fog-recipe record, corrected (2026-08-09).** An earlier draft of
PR #488's body — and its spec's note — claimed the recorded #240
reproduction (ruling 5 in the Lane C section above: OAT −15, manual
damper 60 % against the settled winter zone) "no longer reaches."
**Refuted by engine-direct measurement, twice:** in the settled winter
state the program already holds the hot-water valve at 100 %, so the
mixed air sits ≈ 17–19 °F while the discharge rides in the nineties,
55 °F clear of the stat — fog asserts, nothing trips, and the recorded
reproduction survives unchanged on the low-limits sheet. What #488
actually retired is the SPEC's own arrival-plant recipe (zone 76 °F,
valve 0 %): cold air across a dry coil now trips the stat on the first
tick. The spec's replacement recipe (damper 50 %, HW valve 80 %,
OAT −15, compressor off) restores the same mixing-box state with the
valve open — exactly as the settled machine holds it for itself — and
its fog window is a ≈ 17-sim-minute transient whose spec rows land well
inside it via arrival-polls rather than fixed settles.

## The AHU, as designed (owner rulings, 2026-07-27 / 28)

A **single-zone constant-volume air handler**: two stages of DX cooling, a
**modulating hot-water heating coil**, and a **dry-bulb economizer** with a
differential enable *and* a fixed high limit — `OAT < RAT` **and**
`OAT < econ-lockout`. All dry-bulb, so `economizers.html`'s enthalpy contract
stays unbound while the high limit's *purpose* becomes demonstrable. The supply
fan is **draw-through**, downstream of both coils, so `DAT` is coil-leaving plus
fan heat exactly as `air-handlers.html` already teaches. Air path, in the
canonical site order: OA louver → mixing box → filter → HW coil → DX coil →
supply fan → supply duct → zone, with the return coming back to the mixing box
through an EA/relief branch.

The heating coil supersedes the arc plan's cooling-only sketch. It is nearly
free in physics — `Psychro.invertProcess` already models one (`type !== 'cool'`
flips the sign and ignores latent, since a heating coil rides humidity ratio
through unchanged) — and it pays for itself architecturally, because
`hydronic-loop-builder.html` becomes the HW coil's drill-down spoke alongside
the FCU's DX coil → `refrigerant-loop.html` and fan → `vfd-mock.html`.

- **The AHU takes the bare `ddc-workbench.html`** at graduation; the FCU keeps
  `ddc-workbench-fcu.html`. ⚠️ **No legacy redirect** — the bare name used to
  mean the FCU, so a redirect would land an FCU-seeker on the wrong machine, and
  the page was never public, so no inbound link exists.
- **ΔT is `DAT − MAT`.** The AHU reads MAT as entering, so
  leaving-minus-entering holds unchanged across both units — and now reads
  **positive in heating**, which is the reason `abs()` was rejected.
- **`FAN_HEAT` deliberately differs** — `1.0 °F` on the AHU, `0.6 °F` on the
  FCU. Modelled, not drift: an FCU sits in the zone it conditions, while an AHU
  typically sits in a mechanical room and picks up casing heat on top of motor
  work. The reason belongs in the AHU's `TUNE BY FEEL` comment so nobody
  harmonises the two later.
- **Two separate setpoints**, heating and cooling, rather than one plus a signed
  offset — so **overlapping them is reachable**. A unit fighting itself is a
  real field fault and the site has no interactive demonstration of it.
- **The statusbar chip strip stays** alongside the graphic's own callouts: two
  views of the same data for two jobs, since the Wiresheet tab and phone widths
  need the strip. No shared-shell change, and the FCU page is untouched by the
  AHU annotation work.
- **Component identity never rests on hue alone** — the `-fill` token family and
  the drawn hardware difference between the two serpentines. See
  `codebase-issues` #230 and #231.
- **`role="img"` stays on the graphic**, and the activation affordance moves to
  real HTML buttons outside the SVG with the point-mirror chips as the
  activators. Ruled at `codebase-issues` #227(b), scheduled to the graphic lane.

The new physics it needed — damper command → OA fraction (linear, carrying
`air-handlers.html`'s caveat that a commanded position is not really a flow
fraction), a `Psychro.mixStreams()` helper for the mixed-air state, fan-proof
physics behind a real `bi` point, and a second coil stage in series — all
shipped with the physics half above. Neither engine needed a change:
`fbe-engine.js` already ships the `select` block the sequence stages through,
and the mixing helper went in **additively**, with the four existing inline
call sites deliberately left alone (rewiring them is `codebase-issues` #228,
scheduled on its own).

Two of those pieces exist to make an existing hole demonstrable rather than to
model it away. The fan-off branch on DAT is kept — with no air moving, DAT
reads the ZONE, which is precisely what makes a discharge low-limit go blind
(`codebase-issues` #225) — and `fan-status` is what a correct sequence
interlocks on instead. The plant carries **no** minimum-outdoor-air floor of
its own, so a sequence that loses its min-OA block visibly loses its minimum.

## Confirmed decisions (owner)

- Interactive from the start; **FCU-DX first**; **DDC / software register**; grow
  toward the AHU.
- **Zone temp is an input for now** (a slider); simulating it as driven state is
  a *later* step — good to defer.
- The **fan's thermal gain is honest and kept** (a real draw-through pickup); it
  just needs a short callout so it doesn't read as a bug (below).
- The **"which box is starving"** framing is *not* the north star (a prior
  agent's idea). Diagnostic fluency is.

## Live-look feedback → refinements (2026-07-21)

### Depiction & space — the pressing cluster
- **Ductwork needs width.** The flow-engine's "liquid-through-a-pipe on a
  centerline" reads wrong for air. Real DDC graphics show ducts with visible
  **width** (realistic-ish, still in our AX-sharp style). Air is a fluid, but it
  shouldn't read like liquid in a line.
- **Airflow animation should extend *inside* the unit** — through the coil and
  fan, not stop at the cabinet boundary.
- **Fullscreen treatment.** Wider ducts need room; adopt the fullscreen pattern
  the other sims already use (refrigerant-loop is the reference).
- **Remove the drill-down tiles below the graphic** (redundant with top-nav +
  the command-palette **search** — the owner's most-used QOL feature — and the
  direction needs the real estate). **Keep the in-graphic component-click**
  "walk up to the unit" (owner, 2026-07-21): the sub-sims live *in the unit*,
  **keyboard-reachable**, a small delight to discover when inspecting a
  component — but a clear-enough affordance that it isn't missed.
- **Mobile can't fully realize this sim.** Plan a **limited mobile version**;
  figure out the shape later (likely a desktop-gate + a reduced read-only view —
  see guardrails).

### Honesty & teaching
- **Fan thermal-gain callout.** Keep the gain; add a **short, explicit** callout
  so it doesn't look buggy, and use it as a hook to talk **calibration** (offset
  a real DAT sensor carries). Keep it brief — not longwinded.

### Confirmed defers (from this look)
- Zone-temp-as-simulated-state → later (see Horizon).
- Airflow-on-fault animation → folded into the ductwork/airflow rework above
  (an airflow fault should visibly starve the air, not keep it flowing full).

## Backlog — tiered (owner brain-dump 2026-07-21, refined)

### Near-term — depiction & space *(SHIPPED 2026-07-22 as Increment 1)*
Duct **width** + realistic-ish DDC ductwork (our style) · airflow animation that
reads as **air** and extends **inside** the unit · **fullscreen** · **remove the
tiles** · short **fan-heat/calibration callout** · **improved fan animation**
(and coil, but mostly the fan). *(One item held back: the upper-left composition
— parked as "fix 1", see Increment 1 below.)*

### Mid-term — features
- **Visible sensors** on the graphic (temp/pressure/flow points as real sensor
  glyphs) → seeds a future **meter & sensor sim** the graphic could drill into.
- **Thermographics on the zone** — a thermal-image-style temperature read of the
  zone (gradient/color), so the zone's condition is legible at a glance.
- **Selectable unit type** (FCU / AHU / …) — the concrete form of "grow toward
  the AHU" and the hub's "show different units." *(shipped 2026-08-02, PR
  #470 — the statusbar link pair between the two workbench pages)*
- **LLS trip annunciation on the Unit tab** (from PR #468's verify;
  graduation-era candidate) — a tripped low limit reads as fan off / damper
  0 / valve 100 with no alarm surface; the trip state is legible only on the
  wiresheet, where a real graphic would banner a freezestat trip.
  *(2026-08-09: PR #488's device face annunciates the HARDWIRED stat on
  the Unit tab; the SOFTWARE latch this entry is about is still
  wiresheet-only — entry stands.)*
- **A scenario preset for the LLS defeat/short-cycle demo** (winter-protections
  sheet) — the demo is real but fragile to reach by hand (needs a wound-up PID
  integral, a still-warm zone, and Min MAT sabotaged below the coil floor);
  a preset would make it one click. Measured period 24–26 sim-s in that
  state, 3–5 sim-s in a manual-damper freeze.
  *(Disambiguation, 2026-08-09: this entry is the SOFTWARE latch defeat —
  LLS Reset wired true, the short-cycling signature. The hardwired stat's
  JUMPER — a contacts defeat, the runs-straight-through signature — is a
  different feature shipping via `feat/ahu-low-limit-stat-defeat` and
  must not mark this entry shipped.)*
- **PID warm-start prose line** — a fresh program load starts the PID integral
  at zero, so on an economizing day the damper briefly tracks the winding-up
  loop; the download-stops-a-running-unit teaching family, worth a sentence in
  the sheet notes someday.

### Horizon — dynamic, FBE-driven control (ambitious, coupled)

> **Status (2026-07-24): SHIPPED — this increment is built and merged (PR #425,
> `main` @ `3cd2538`).** The closed loop, the time-step, zone-temp-as-state, the
> hybrid gain, and a real-vs-sensed sensor override are live on the hidden
> `ddc-workbench-fcu.html`; a coil/DAT response lag followed. The prose below is
> the original design reasoning (now largely realized).
>
> **Superseded again 2026-07-27 — the polish-arc framing this note used to carry
> is spent.** The owner replaced it with the **full-experience arc** (full
> experience BEFORE public), which is now merged in full: arbitration, the
> wiresheet relayout, the program rewrite (**no longer deferred** — it shipped in
> #440, and #443 added a fourth sample), visible sensors, and the signed coil ΔT.
> The FCU-only-vs-more-units scope question is **settled**: two pages sharing an
> extracted shell, approved at the #441 review. What remains is **Phase 7, the
> AHU round** (owner-gated — do not build ahead), then **Phase 8, graduation**;
> *Current state* and *The AHU, as designed* above carry both. Feel constants
> stay tune-in-place (`TUNE BY FEEL` block).

The unit runs a **closed-loop control strategy** — zone temp becomes driven
state and the equipment operates on its own, not just manual knobs. Per the owner
(2026-07-21), that control strategy should be an **FBE program from the gate**,
not a bespoke hand-coded sequence — because a **lead BMS programmer can verify
the control logic with real-programmer accuracy** instead of trusting hand-written
JS. Verifiability by the domain expert is the whole argument, and it makes the sim
a genuinely novel teaching tool (write a program, watch it run the model).

- **Feasibility is strong — the runtime already exists.** `html/scripts/fbe-engine.js`
  is a **tick-based execution engine** (`FBE.tick(graph, dt)`): PURE / no DOM,
  topologically evaluates a `{blocks, wires}` graph each tick, with PID / timers
  (`ton`/`tof`) / latches (`sr`) / comparators as stateful blocks. It's a real
  controls runtime, not a drawing tool, and everything is client-side — so
  FBE↔sim is an **in-browser** wiring, no server.
- **Architectural principle to adopt EARLY (even before control lands):** design
  the sim around a clean **IO point surface** — named AI/AO/BI/BO points with
  engineering units (sensors in, commands out). Then *whatever* drives the unit
  — a trivial hand stub now, an FBE graph later — plugs into the same contract.
  That makes FBE-first a wiring job, not a rewrite.
- **Real remaining work / dependency:** FBE control needs the sim to have
  **dynamics** to act on — a **time-step** (today it's quasi-static) and
  **zone-temp-as-state**. So the increment is: sim dynamics + the IO surface +
  input/output "point" blocks that bind an FBE graph to the sim's points. The
  FBE *evaluator* is done. This is one coupled increment (the old "auto-run" and
  "FBE tie-in" are the same thing now), and it stays behind the near-term
  depiction work.
- **Sequencing — manual override FIRST, then FBE (owner, 2026-07-21).** Build the
  dynamics + IO surface with **manual point override** (force a command/value,
  the way a tech overrides an AO/BO at a controller). The owner then **drives the
  unit by hand to commission the physics** — confirm it responds correctly and
  tune the response *feel* — **before** finalizing, *then* layers FBE control on
  the *same* points. The override state is the commissioning bench and a useful
  deliverable on its own. **Add the FBE's IO point-blocks early** (owner-agreed)
  so the binding surface exists before the control work, not bolted on last.
  - ⚠️ **Refined 2026-07-22 (see "DDC Workbench" below):** the owner set the
    strict override-first order aside *for focus* — do **all** the FBE build in
    one session with the loop **open** (zone temp stays an input you nudge by
    hand), then a dedicated **physics** session for closed-loop dynamics +
    psychro tuning. HAND/AUTO override still ships in the FBE session; the
    commission-by-hand payoff arrives once the physics session lands dynamics.

## Engineering guardrails (carry into any increment)

- **`flow-engine.js` is shared site-wide** (every forced-air + hydronics lesson
  drives it). Duct-width / air-animation changes must be **page-local or opt-in**
  — do not regress the lessons by changing the shared engine's default behavior.
- **Desktop gate.** A fullscreen, duct-heavy sim that can't work on a phone
  likely needs the `.desktop-only-sim` tips panel below ~1000px + an entry in
  `tests/sim-desktop-only.spec.js` (same pattern as the drag-to-place sims),
  unless the "limited mobile version" gives it a genuine reduced view instead.
- **Ship-time gates** (when it graduates from mockup): the blocking
  `contrast-sweep` (both themes), `PAGES` manifest, sitemap/nav wiring, README,
  and a version bump. ~~the damage-stakes note question~~ *(CLOSED
  2026-08-03 by owner ruling — the existing page-tailored prose satisfies
  the convention; see the pre-Phase-8 rulings section.)* The gate list
  lived in `docs/next-session-handoff.md`, retired at graduation; **every
  gate on it was met on 2026-08-04** — what was gated and what shipped is
  the *Phase 8 — graduation EXECUTED* section above.

## Reuse findings carried forward from the feasibility pass

`docs/air-side-sim-scoping.md` (the 2026-07-19 read-only feasibility pass,
`main` @ `2ddd7d0`) was **retired 2026-08-08** — its own header said to
retire it when the sim shipped or the scope was decided, and both happened.
Most of it is spent: the Option-A-vs-B scope recommendation was superseded
2026-07-21 by this doc, the hero-demo constraint and the refrigerant-loop
standard both live in `site-ideas-and-friction.md`, the desktop gate is in
*Engineering guardrails* above, and the #174 / #175 revisit triggers are
written on those deferrals in `codebase-issues.md`. Four findings had no
second home, and this is it. Git history holds the full text; treat the
line numbers and counts in it as drifted, per its own warning.

- **The reuse map for a future air-DISTRIBUTION sim, which is what the
  Workbench did NOT build.** The Workbench is the psychrometric/sequence
  half — mixing box, coils, economizer, staging. A VAV / duct-static sim
  would need one genuinely new solver, and `hydronic-engine.js` is its
  **structural template**: a nonlinear resistor network solved as a
  linearized nodal system, iterated to convergence, then a one-pass thermal
  sweep on settled flows — the same mathematics with a fan curve as the
  source instead of a pump. The water constants don't port; the
  architecture does (`COMPONENTS` catalog, `createComponent`, `makeSystem`
  deep-cloning so literals are never mutated, `tick(system, dt)`, and a
  `solve()` returning hydraulics-only for tests). Also on the shelf:
  `duct-engine.js` (Altshul-Tsal friction, Huebscher rect↔round, bisection
  solvers) if real duct geometry is modelled, and `pid-engine.js` +
  `pid-chart.js` if loops run rather than quasi-static solves.
- **The numeric-agreement contract with the lesson widgets is still
  undecided, and it binds a distribution sim, not this one.** Several
  forced-air lessons carry owner-blessed constants — 30,000 CFM design and
  a 5.5 in. w.c. shutoff in `duct-static-control`, a 200/1000 CFM box with
  `k=1000` and a 400 CFM/ton coil floor in `vav-systems`, a 0.5 Btu/lb
  enthalpy wash band in `economizers`. Three options, unchanged: the sim
  adopts them and the widgets are later refactored onto the shared engine;
  the sim adopts them and both stand independently; or the sim re-derives
  and the widgets drift. **Decide before freezing constants** — the repo
  has been bitten by this class before. The Workbench sidestepped it by
  modelling a different machine with its own seeds; a duct-static sim
  cannot.
- **The time-step question is answered for this line.** The scoping pass
  posed `solve(inputs)→state` versus `tick(system, dt)` as a call that is
  *not cheaply interconvertible*. The Workbench answered it: a 10 Hz tick
  driving both the zone integrator and `FBE.tick`, with a 1–60× speed
  slider scaling the one `dtSim`. A future air-side sim on this line
  inherits the tick, not `refrigerant-loop`'s recompute-on-change.
- **`air-unit-identification.html` is the odd one out in any
  "lessons with a model" count — and that is a trap, not trivia.** It
  carries a substantial interactive widget but **zero physical constants**:
  it is a constraint-satisfaction identification game
  (FAMILIES / MYSTERIES / QUESTIONS / survivors / firstMismatch), so it has
  nothing for a physics sim to consolidate. The retired file carried two
  counts that differed for exactly this reason and a session once
  "corrected" one into the other, making a true statement false; it was
  reverted the next day. Naming the page instead of counting the set is
  what makes the fact survive the chapter growing. (`air-balancing.html`
  and `dedicated-outdoor-air.html` are the lessons with no interactive
  widget at all — any physics they need is genuinely new work.)

## Open questions

1. ~~**Duct width — how wide, what style?**~~ *(answered — filled duct body +
   marching chevrons, treatment B; shipped in Increment 1, 2026-07-22.)*
2. ~~**Limited mobile version** — desktop-gate + read-only view, or a
   genuinely reduced interactive layout?~~ *(answered 2026-08-03 by owner
   ruling — neither: the **Unit tab IS** the limited mobile version, declared
   rather than newly built, and proven at phone/tablet widths in PR #476.
   The wiresheet keeps its touch gate. See the pre-Phase-8 rulings section.)*

## Increment 1 — "ductwork & space" — SHIPPED (2026-07-22)

Duct treatment **B** (filled body + marching chevrons) ported onto `fcu-ddc.html`
and **merged (PR #420)**. Delivered: page-local chevron airflow crossing the
open cabinet through coil+fan (flow-engine dependency dropped), filled
**exterior-only** ducts (the "duct within a duct" fixed — no body inside the
cabinet), fan-speed-coupled chevron speed with smooth sub-sample interpolation,
air recolor across the coil, fullscreen, in-graphic keyboard-reachable
SVG-`<a>` drill-downs (tiles removed), fan-heat / calibration note, a fuller fan
impeller, compressor LED moved to the cabinet base off the airstream. Owner's
two porting fixes (slow chevrons, kill duct-in-duct) both applied; a fix-up
round fattened the ducts and cleared label overlaps.

- **Parked by owner (2026-07-22): the upper-left composition** (the return-duct
  box crowds the EAT/ΔT/DAT badges + the cabinet corner). Owner: **"no fix" for
  now** — he builds similar nested boxes in his own graphics, and canvas
  headroom shrinks as units get bigger. Eventual fix named **"fix 1": re-route
  the return so it drops into the cabinet *top*** rather than wrap the whole left
  side. Revisit in a later depiction pass, not now.
  **EXECUTED 2026-08-03 (PR #474)**, folded into the FCU harmonization lane on
  the owner's call — *"while it's cheap."* The drop lands on the cabinet top,
  the RAT probe moved onto the new run, the badges were recomposed, the
  `<desc>` rewritten and the chevron/geometry spec rows re-derived. His eye
  reviews it at the final review (tweak rights standing).

## Increment 2 — the FBE "DDC Workbench" — SHIPPED (2026-07-23)

> Shipped across PRs #421–#424 (see *Current state*). The design below is as
> decided; two deviations from it, as built: (1) the editor was **extracted to a
> shared module** (`fbe-editor.js`, PR #422) rather than generalizing the editor
> page in place; (2) the IO-point **param binding is block→plant** — setpoint /
> deadband live in the FBE program's `const` blocks and are read INTO the plant,
> so editing the setpoint on the wiresheet changes staging (the reverse of an
> early plan sketch; it's what makes the wiresheet-editable-setpoint behaviour
> work). ~~The immediate next increment is the physics session (closed-loop
> dynamics + psychro tuning).~~ **Superseded 2026-07-26: that increment
> SHIPPED** — PR #425, `ddc: close the thermal loop — integrated zone temp +
> sensor override`, merged 2026-07-24. ~~The next increment is the **polish
> arc**, not more physics.~~ **Superseded again 2026-07-26:** the owner replaced
> the polish framing with the full-experience arc, and the AHU round followed it.
> See *Current state* near the top of this file.

**ALL the FBE work in one focused session** (owner: "get the bouncing out of the
way"), so the session *after* is pure sim physics. The FCU sim is reframed as the
**"DDC Workbench Sim."**

- **Model A — one page, one runtime, two tabbed views:** a **Unit** view (the DDC
  graphic) and a **Wiresheet** view (the FBE editor), the editor view
  **lazy-built** so the Unit tab stays light. The owner rejected truly-separate
  documents synced over a channel as fragile.
- **Two-tier program model:** a few **sample programs** for non-authors + a
  **live editable wiresheet** to write your own and watch it run; picking a
  sample loads its logic onto the wiresheet. The **Unit** tab's control
  affordance shows the **live IO values + the running program's name**.
- **Data-driven IO point surface** (owner: build it so bigger units are a config
  change, not a rewrite): cooling-only DX to start — AI Space Temp + DAT; AO
  Supply-Fan Speed; BO Fan-Enable / Y1 / Y2; params Cooling SP + Deadband. Maps
  onto the FBE I/O blocks.
- **HAND/AUTO override** on the points (HAND drives by hand, AUTO lets the FBE
  graph drive).
- **The loop stayed OPEN for that session** (owner-confirmed): the program ran
  and drove the unit and you watched the air state react, but **zone temp was an
  input you nudged by hand** — closed-loop dynamics + psychro tuning were the
  SESSION AFTER (see Horizon). A deliberate split, not an oversight. *(That
  session landed as PR #425; the loop has been closed since — see* Current
  state *above.)*
- **Reuse the existing FBE stack:** `fbe-engine.js` (tick runtime + block library
  incl. I/O blocks + PID) and `function-block-editor.html` (a working drag-wire
  editor with loadable example programs). ⚠️ The editor's logic is **inline** in
  that page, not a shared module — embedding it likely means **extracting a
  reusable editor module** into `html/scripts/` (or making the Workbench the
  generalized editor). First real architectural task.
- **Precondition met:** the FBE editor's wire-visibility bug (delete-one-blanks-
  all; new-wire-blanks-previous) was a live production bug — fixed, verified, and
  **PR #421 merged 2026-07-22**. Its deeper root (render cache on the wire data
  objects) is logged as codebase-issues **#196** — a good decoupling target if
  the editor is being extracted anyway.

Everything else (visible sensors, zone thermographics, selectable unit type, and
the closed-loop dynamics + psychro tuning) stays in the backlog / the physics
session.
