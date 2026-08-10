# Tooltip / glossary — the scoping pass (2026-08-09)

> **What this is.** The scoping record the friction file's 2026-08-09
> candidacy note promises — a term inventory, a marking-site estimate,
> and a sense-collision classification for the site-wide
> tooltip/glossary question. It exists to make the arc *decidable*, not
> to argue for it. **Nothing here is built**, no page or script was
> touched, and no design decision is taken: the disclosure grain, the
> hand-marked-over-walker ruling and the glossary-more-than-widget
> framing were all settled in
> `site-ideas-and-friction.md` §*Hover tooltips — a SITE-WIDE
> affordance question* and are not re-argued below.
>
> **Status: a scoping record feeding the next-arc decision.** The
> candidacy was framed as decidable *after #275 ships*, against the
> scenario drills and the MS/TP bus sim. #275 shipped the same day
> (PR #496), so the gate named in that note has cleared; the choice
> between the three candidates is the owner's and is not made here.
>
> **Method.** An eleven-agent read-only workflow over `html/`: seven
> section sweeps (tools split in half alphabetically, education split
> in half, simulators, the quiz banks under `html/_data/quizzes/`, and
> the home page + section landings + four topic hubs + `guides/`), each
> returning its 25 strongest terms plus that section's existing gloss
> idioms and a marking-site estimate; one merge into a ≤60-term
> inventory; then three collision checkers that re-grepped each term's
> **actual usages** and classified its sense structure. The
> classifications in §4 and §5 are grep-of-usage with a page cited per
> sense — not theory about what a word could mean. The sweeps' own
> `senseSuspicion` flag is a *suspicion*, and §2 records how well it
> held up.
>
> **Measured at `main` @ `7c40e12`**, branch
> `docs/tooltip-scoping-record`.

---

## 1. What the pass covers, and what it doesn't

Seven lanes, by assigned surface:

| Lane | Surface | Marking-site estimate |
|---|---|---|
| Tools A | first ~16 files alphabetically under `html/tools/` | 250 |
| Tools B | the remaining `html/tools/` files | 130 |
| Education A | first ~20 files under `html/education/` | 210 |
| Education B | the remaining `html/education/` files | 300 |
| Simulators | all of `html/simulators/` (mockup skipped) | 380 |
| Quiz banks | `html/_data/quizzes/*.js` | 750 |
| Landings | `html/index.html`, the four section landings, the four topic hubs, `guides/` | 340 |

Deliberately out of scope: the `practice/*.html` shells (empty
`Quiz.mount` mounts — the terms live in the banks, which lane 6
covered), and the non-content pages (`contact`, `privacy`, `404`,
`styleguide`).

Two structural limits on the inventory, both worth holding on to when
reading any number below:

- **Each lane returned its 25 strongest terms, not all of them**, and
  the merge capped the union at 60. So the inventory is a top-of-top.
  It is a good list of the terms most worth glossing; it is not a
  census of the site's terms of trade.
- **44 of the 60 inventory terms reached a collision checker.** The
  other 16 were never dispatched — all 16 carry `senseSuspicion:
  false` from their sweep, which is a filter, not a verification.
  Those 16 are marked *(unchecked)* wherever they appear below.

---

## 2. The headline numbers

**~2,360 marking sites — an estimate, and here is the mechanism.**
It is the arithmetic sum of seven independent per-lane estimates
(table above). Each lane was asked for "the total count of occurrences
your section would need if high+medium terms were hand-marked," and
answered over *its own* 25 strongest terms. Nobody counted the site
end-to-end; nobody counted the 60-term inventory specifically.

What moves it, in rough order of leverage:

1. **The quiz banks are 750 of the 2,360 — 32%** — and §7.2 argues
   that surface may not be markable at all in the ordinary way.
   Excluding it lands at **~1,610**.
2. **The collision tier is disproportionately the high-frequency
   words.** Raw occurrence counts recorded by the sweeps: `reset`
   ~150 line hits in the banks alone, `coil` ~147, `deadband` ~58,
   `interlock` ~33. If §4's terms go unmarked (or get per-context
   handling only), a large share of the 2,360 goes with them.
3. **Every-occurrence vs first-occurrence-per-page is unset**, and it
   is a factor-of-two-or-three lever on its own.
4. **Counting convention drifted between lanes.** Tools B explicitly
   scoped MBH to "prose uses (~12), not every label suffix"; the quiz
   lane counted raw occurrences including the ubiquitous senses it
   then said not to mark. The lanes were not normalised against each
   other.

So: **2,360 is the right order of magnitude for a full hand-marking
pass and is accurate to about a factor of two in either direction.**
It is not a work estimate for a tier-1-first program, which would be
much smaller, and it is not a ceiling on the site's terms of trade,
which is larger. Do not carry the bare number without the mechanism.

**Inventory: 60 terms**, every one rated `glossworthy: high` after the
merge (the medium-rated ones fell out at the cap).

**Tier counts** over the 44 that were collision-checked:

| Classification | Count | Meaning |
|---|---|---|
| single-sense | 17 | one meaning site-wide; a single definition is right everywhere |
| colliding | 14 | a one-definition tooltip would be **wrong** somewhere it appears |
| multi-benign | 13 | senses differ but context always disambiguates |
| *(unchecked)* | 16 | never dispatched; presumed single-sense on the sweep flag alone |

**The suspicion flag calibrated well, and that is a reusable finding.**
Of the 44 checked terms, 21 carried `senseSuspicion: true` and 23 did
not. **All 14 confirmed collisions came from the flagged 21** — no
unflagged term came back colliding. The flag over-called by about a
third (7 of 21 flagged terms downgraded: `bypass`, `freezestat`,
`interlock`, `normally open/closed`, `lead/lag`, `K-factor/Ak factor`
to multi-benign, `economizer` to single-sense), which is the cheap
direction to be wrong in. A per-section suspicion flag is therefore a
sound *filter* for which terms need the expensive per-term check —
subject to the caveat that this recall claim is measured over the 23
unflagged terms that were checked, not the 16 that weren't.

---

## 3. Tier 1 — single-sense, high-stall

The strongest tooltip candidates: a newcomer stalls, and one
definition is correct at every occurrence. Several are *defined
thoroughly on exactly one page and used bare everywhere else* — which
is the stall story in one sentence, because a reader who lands
mid-corpus never sees the page that defines it.

### 3a. Verified single-sense (17)

- **priority array (`Priority_Array`) / commandable** — the widest
  BACnet term in the corpus. Defined exhaustively on
  `tools/bacnet-priority.html` and `education/bacnet-basics.html`
  (16 slots, lowest non-null wins, slot 8 vs 16); bare on
  `tools/bacnet-error-codes.html`, both workbench control labels, the
  landings and two quiz banks. Curation: match the full phrase, never
  bare *priority* — the corpus also carries "top-priority fault" and
  the BACnet abort reason `preempted-by-higher-priority-task`.
- **relinquish default (`Relinquish_Default`)** — canonical at
  `tools/bacnet-priority.html:252` ("not slot 17"); the workbench
  preambles and `scripts/point-arbitration.js` already repeat that
  exact framing, so a glossary can't drift from them.
  `tools/bacnet-objects.html` alludes to it only as "104" of the daily
  three — a pure stall site. Match both the spaced and underscored
  forms.
- **BBMD / Broadcast Distribution Table (BDT) / foreign device** —
  `education/bacnet-networking.html` §bbmd defines BBMD, BDT, the
  symmetric-BDT trap and foreign-device registration in one passage;
  dropped undefined in `education/bacnet-basics.html:693` and
  `tools/bacnet-ip-converter.html:152`. Care point: the converter's
  mention is about the six-byte address *format* a BDT entry carries,
  so a gloss there must not imply the tool configures BBMDs.
- **COV / change-of-value / `COV_Increment`** — defined in the
  `bacnet-basics` bank ("flips the polling model"); bare in
  `education/status-and-proof.html:200` and in landing copy. The FCU
  workbench's live-region pacing applies the same rule deliberately
  and says so, but only in comments.
- **DDC** — 21 raw occurrences across the landings, including the home
  page, and **the site never expands it**: a grep for "direct digital"
  across `html/` returns zero prose hits. Highest frequency-to-effort
  ratio in the inventory.
- **DX (direct expansion)** — "DX coil", "DX stage 1", "CFM per active
  ton of DX cooling" across every section; the expansion exists only
  in an `air-handlers` gloss and an SVG `<desc>` (an AT-only surface).
  Visible prose never expands it anywhere.
- **MAT / OAT / RAT / DAT** — defined in air-path order on
  `education/air-handlers.html` and self-glossed on the workbenches by
  the point-mirror caption idiom ("MAT · mixed"); leaned on bare in
  `education/economizers.html`, tool formulas and ~30 workbench sites.
  Two care points: unify the `MA-T` / `MAT` spellings, and **do not
  extend the family to SAT** — that one is two-sensed (supply-air
  temperature vs saturation on the refrigeration pages).
- **HOA (Hand-Off-Auto)** — one meaning across ~52 hits; full
  authority semantics on `education/start-stop-commands.html:217`,
  bare elsewhere and never expanded on the landings.
- **interposing relay** — the two-reason definition (contact rating +
  voltage class) sits at `education/start-stop-commands.html:68` with
  its own definitional quiz question; named undefined in
  `tools/transformer-sizing.html`'s worked example, where it is the
  same physical device being power-budgeted.
- **permissive / permissive chain / run permit** — canonical at
  `education/boolean-logic-latches.html:70`; the object of the permit
  varies (motor run, compressor stage, economizer mode) but the
  meaning never does. Noun uses only — bare "permitted" is ordinary
  English.
- **latch / SR latch / set-dominant** — every latch on the site, block
  or behaviour, is hold-until-cleared. Drafting care: the site
  deliberately discloses that reset-dominant flavours exist and matter
  for safeties, so define *SR latch* neutrally and let *set-dominant*
  be its own qualifier.
- **wiresheet** — defined on `education/function-blocks.html` with a
  vendor-collision-aware origin note; ~16 uses across the Programming
  chapter and 15 on landings, where the card promises the definition
  and no landing gives it. Keep the entry platform-neutral.
- **superheat / subcooling** — ~370 hits, always the refrigerant-circuit
  quantities. Defined in the lesson and the P-T tool, then assumed
  everywhere, including 7 of 10 landings. Controls people are exactly
  the audience that lacks this pair.
- **glide** — one term-of-art sense (zeotropic bubble-to-dew range),
  defined by bold first-use in the lessons and the P-T tool, used
  unqualified in `simulators/refrigerant-loop.html`'s model caveats.
  Matching care: *glide* is also an ordinary verb on the air-side
  pages ("the dampers glide"), so scope marking to refrigeration
  context or hand-mark it.
- **deadhead** — glossed once at `education/pump-control.html:193`,
  then bare in `education/load-piping.html` and
  `education/equipment-staging.html`, which is where a newcomer
  stalls. Noun and verb forms both resolve to the one entry.
- **MBH** — ~30 occurrences; defined only on
  `tools/power-energy-converter.html:115`, which itself calls
  misreading it a 1000× error. The definition should carry the trap
  (M is the Roman thousand, not mega) because that is what a confused
  reader hovers for.
- **economizer / free cooling / enthalpy changeover** — no competing
  sense anywhere in `html/` (in particular, no waterside/plate-and-frame
  economizer). One drafting note: the gate's disable half is called
  "high-limit lockout" on the lesson, which walks straight into §4's
  `high-limit` collision — link that phrase to the economizer-specific
  sense, never to a generic entry.

### 3b. Presumed single-sense — never collision-checked (16)

These carry only their sweep's unflagged suspicion. Several are the
purest stall candidates in the whole pass, so they belong in tier 1 —
but each needs the ten-minute grep before a definition is written.

- **APDU** *(unchecked)* — used ~8 times on
  `tools/bacnet-error-codes.html` and `tools/bacnet-ip-converter.html`
  ("the APDU was malformed", "the BVLL/NPDU/APDU frame") and **never
  expanded on either page**; the lessons carry the expansion.
- **TSM** *(unchecked)* — "almost always segmentation, a TSM timeout,
  or the device running out of buffer" on
  `tools/bacnet-error-codes.html`. A bare acronym (Transaction State
  Machine) never expanded anywhere on the page. Extreme stall even for
  working BACnet techs.
- **BIBB** *(unchecked)* — defined at length on
  `education/bacnet-services.html` (area-service-role anatomy, the A/B
  mnemonic), referenced *before* definition on
  `education/bacnet-basics.html`.
- **holding register / input register** *(unchecked)* — defined in the
  `modbus-basics` bank ("a register is just sixteen bits; the protocol
  never says what they mean"), worked hard in `modbus-decoding`
  (4xxxx/3xxxx, 0-based wire addresses), assumed in `troubleshooting`.
  **Flagged matching hazard, not a verified collision:** *register* is
  also a verb in `education/bacnet-networking.html`
  (Register-Foreign-Device). Compound-only matching handles it, but
  the term itself was never checked.
- **dry contact / wet contact / wetting current** *(unchecked)* —
  defined in the `controller-wiring` bank (the BI supplies its own
  wetting current; wet = externally powered, back-feed hazard); bare
  elsewhere. The words are maximally ordinary, so matching needs the
  full phrase.
- **Y1 / Y2 / G** *(unchecked)* — thermostat terminal designators on
  both workbench pages with zero expansion. ~6 sites, total stall for
  a reader without residential/RTU background.
- **make / break / cut-out** *(unchecked)* — "the stage makes at 74.0
  and breaks back at 72.0". The cut-out sentence is explained on both
  workbenches; make/break itself — relay dialect applied to a staging
  call — never is.
- **floodback** *(unchecked)*, **Cv (flow coefficient) / Kv**
  *(unchecked)*, **inherent vs installed characteristic /
  equal-percentage** *(unchecked)*, **velocity pressure (VP)**
  *(unchecked)*, **dry-bulb / wet-bulb** *(unchecked)*, **turndown /
  short-cycling** *(unchecked)*, **inrush vs holding (sealed) VA**
  *(unchecked)*, **primary-secondary / closely-spaced tees**
  *(unchecked)*, **service factor** *(unchecked)* — the last of these
  sits inside a damage-stakes sentence on `tools/affinity-laws.html`
  ("whether the motor survives the new speed is decided by the
  nameplate HP, the service factor, and the overload settings") whose
  middle term is never defined. One site, high stakes.

---

## 4. Tier 2 — the collision class

Fourteen terms where **a single definition would be wrong somewhere it
appears.** This tier is the standing argument for hand-marking: every
entry here is a place a context-free walker would have shipped a
falsehood, and several are places the site *itself* spends prose
drawing the distinction the tooltip would flatten.

**deadband — the documented exemplar, and the corpus is worse than the
ruling alone.** Three senses found: per-setpoint/per-stage hysteresis
(the canonical `education/comparators-and-deadband.html`; the AHU
module's heating 68 / cooling 72 / deadband 2); the between-setpoints
region (`education/vav-systems.html:696`,
`education/building-pressure.html:511`); and the BACnet alarm
`Deadband` property (`_data/bacnetEnums.js:101`, rendered in
`tools/bacnet-objects.html`). `simulators/staging-sequencer.html:407`
adds the stage-up/stage-down gap. **~58 occurrences in the quiz banks
alone**, and `quizzes/surviving-first-months.js:134` *quizzes the
collision directly* — a spec's "4 °F deadband" against a controller's
2.0 °F hysteresis, with the explain saying both numbers are correct and
are not measuring the same thing. Curation: **never auto-mark.** If the
glossary carries the word at all it must be a disambiguation entry
presenting both field senses side by side and linking
`comparators-and-deadband.html`; a one-definition tooltip contradicts
the site's own teaching on one page or the other.

**coil — three senses, and two of them co-occur inside single quiz
explains.** Modbus coil, the 1-bit discrete-output table
(`tools/modbus-functions.html:114`, `modbus-register-viewer.html:207`,
`quizzes/modbus-basics.js`); heat-exchange coil, ubiquitous across ~50
files; and the electromagnetic winding — the relay/contactor coil a
BO's pilot-duty contact must not switch directly
(`tools/electrical-quick-calc.html:114`,
`education/start-stop-commands.html:68`). ~147 occurrences.
`quizzes/start-stop-commands.js` carries contactor coils and freezing
evaporator coils **inside the same explain strings**. Curation: never
auto-mark bare *coil*; the heat-exchanger sense needs no tooltip at all
(it is the trade's default reading and page prose always carries it).
If entries exist, scope them: a *coil (Modbus)* entry marked only on
the two Modbus tools and the Modbus banks — where the site already
glosses it inline — and optionally a *contactor coil* compound on the
electrical surfaces.

**differential — four live senses, two of them on one page.** Switch
hysteresis, the trip-to-reset spread
(`education/comparators-and-deadband.html:472`,
`education/status-and-proof.html:200`); differential pressure, the
measured ΔP (`status-and-proof.html:77`, `pump-control.html:383`,
`balancing.html:402`); differential changeover, the comparative
economizer decision (`economizers.html:219`,
`ddc-workbench.html:2984`); and temperature differential across a coil
(`balancing.html:607`). Senses 1 and 2 share `status-and-proof.html`,
whose prose explicitly flags the word doing different work — sense 1
names the spread that a DP switch, sense 2's own device, has.
Curation: never auto-mark bare *differential*; mark only collocations
(*differential pressure* → ΔP, *differential dry-bulb/enthalpy* →
changeover) and leave bare uses to page prose, which already
self-disambiguates. Note the standing CLAUDE.md ruling is **page-local
to the workbench graphics** — the zone sense in
`comparators-and-deadband.html`'s terminology paragraph is correct and
is the page to link.

**reset — the worst collision in the set, worse than deadband, because
the senses co-occur on single surfaces.** Five: PID integral action,
reset in repeats/min (`education/pid-basics.html:47`,
`simulators/pid-tuner.html`); setpoint reset schedules — OA reset, DP
reset, most-open-valve, trim & respond
(`education/setpoint-math-reset.html`, `pump-control.html:552`,
`duct-static-control.html:322`); latch/safety/fault reset — the R input,
the manual-reset button on a freeze stat, a VFD's auto-reset
(`boolean-logic-latches.html:245`, `ddc-workbench.html:2400`,
`vfds.html:484`); a TON's elapsed-time reset
(`timers-and-delays.html:110`); and UI chrome (the quiz engine's *Reset
best*, the FBE's Reset button) — not content, but string-identical to a
marker. `education/reading-a-wiresheet.html` puts "Latch + manual
reset" (L198) and "Reset chain · the schedule" (L213) in **adjacent
summary cards**; `simulators/function-block-editor.html` carries SR
set/reset, PID reset, a hot-water reset example sheet, a *Man Reset*
block and a UI Reset button **on one page**, and its own code comment
already dodges the ambiguity by naming a schedule slope `Rst Slope`.
Curation: never auto-mark. Either per-compound entries only (*reset
schedule*, *reset (integral)*, *manual reset*), each scoped to its
section — or exclude the word entirely, which is defensible, since
every lesson already defines its own sense at first use.

**dew point** — moist-air condensation temperature
(`education/psychrometrics-basics.html:113`,
`tools/dew-point-calculator.html`) vs refrigerant dew point, the
saturated-vapour point of a blend with no moisture in the story
(`tools/refrigerant-pt.html:108`,
`education/superheat-subcooling.html:77` — "superheat = line T − dew
T") vs *apparatus dew point*, the coil's
effective surface state (`tools/coil-sizing.html:314`). A moist-air
definition is flat wrong on every P-T surface. Curation: key by
section, or give the refrigeration pages no tooltip at all —
`refrigerant-pt.html:143` already carries the bubble/dew explainer that
*is* the definition. *Apparatus dew point* is a safe standalone
compound.

**low-limit / high-limit** — *high-limit* names two unrelated
protections: the economizer changeover lockout
(`economizers.html:219`, `economizer-ratio.html:222`) and the duct
high-static safety (`duct-sizer.html:213`,
`duct-static-control.html`). *Low-limit* is one protective idea across
a modulating software override (`economizers.html:398`,
`coil-freeze-risk.html:277`), a hardwired manual-reset stat
(`ddc-workbench.html:1919`), an FCU DAT annunciator, and the BACnet
`Low_Limit` alarm property. Curation: no bare entries; tooltip the
specific single-sense names instead — *freeze stat*, *mixed-air
low-limit override*, *economizer high limit*, *high-static cutout*.

**static** — duct static (the fan control variable, and the
"high-static" safety named from it), building static (the envelope
residual, hundredths of an inch), and static head/lift on the water
side. `education/building-pressure.html:515` already ships a dedicated
*"Not the same pressure"* callout distinguishing the first two ("the
classic conflation, worth killing on sight") — the model for any
disambiguation entry. Mark full collocations only.

**head / head pressure** — pump head in feet vs refrigerant discharge
pressure. **Two nav-card descs on `simulators/index.html` use the word
in different senses** (L86 vs L96), and the hydronics and refrigeration
hubs each use it bare in their own. The page is also full of
non-glossable homographs (block head, subhead, probe head, sensor
head). Curation: two entries under distinct headwords — *pump head*,
*head pressure* — plus *ft of head*; bare *head* stays unmarked
everywhere.

**RTU** — Modbus RTU, the serial framing mode with the CRC-16 envelope
(`tools/modbus-functions.html:176`, `education/modbus-basics.html:176`)
vs rooftop unit, the packaged machine, including schedule tags RTU-1 /
RTU-3 (`education/air-handlers.html:271`,
`air-unit-identification.html:223`). Both appear **bare**, on
overlapping page families — `education/vfds.html` carries "Modbus RTU"
twice in a table while the air-side chapter uses bare RTU for the
machine, and `bacnet-basics.html:505` has a rooftop `RTU-1` tag inside
an SVG on a protocol page. Curation: two collocation-keyed entries
(*Modbus RTU*; *packaged RTU* / tag-shaped `RTU-N`); bare hits
unmarked or hand-tagged.

**lockout / locked out** — a condition-based mode disable that
self-clears (economizer OAT lockout), a fault hold-off
(`staging-sequencer.html:489`, `ddc-workbench-fcu.html:1555`), and
**lockout/tagout**, the OSHA procedure the site explicitly fences off
(`start-stop-commands.html:220`: an HOA in Off is *not* lockout/tagout).
Curation: never auto-mark; hard-exclude any occurrence adjacent to
*tagout* — defining *lockout* as a controls disable on the very
sentence whose point is the opposite would undercut a safety teaching.

**floating** — floating/tri-state actuator control, an electrically
floating conductor (MS/TP bias, a BI leg never reaching COM), and
floating-point values in the Modbus banks. Proven inside a single
paragraph: `quizzes/controller-wiring.js:142`'s explain says a triac
"isn't a floating, isolated contact" and then recommends triacs for
"floating actuators" — two senses doing opposite work in one answer.
Curation: compound entries only.

**proof / proven / proof window** — a technical-vs-ordinary-English
collision rather than two technical senses, but a real one:
`education/controls-commissioning.html` uses *proof* almost entirely in
the generic evidentiary sense ("proof over time" is an H2), so a
device-sense tooltip would be wrong on a whole listed page, and roughly
half the quiz hits are the ordinary verb. Curation: mark only the
single-sense compounds — *proof window*, *fail-to-start*, *proof of
flow*, *proven airflow*, and the workbench point name `PROOF`.

**valve authority (β) — and bare *authority***. Three senses, all
technical: the ΔP ratio (`tools/valve-authority.html:92`,
`valve-cv.html:178`, `education/load-piping.html:343`); loop authority /
"out of authority", the actuator range exhausted
(`quizzes/metering-devices-txv-eev.js:138`, the AHU sheet note ~L3108);
and command authority — which source outranks which
(`quizzes/start-stop-commands.js:84`, `status-and-proof.js:102`). The β
definition is flat wrong on the workbench note and all four quiz uses.
Curation: tooltip the compound *valve authority* or the symbol β only;
*out of authority* deserves its own entry; the command-priority sense
stays in prose.

**direct-acting / reverse-acting** — actuator stroke-vs-signal
(`commanding-actuators.html:184`) vs loop output-vs-measurement, direct
= cooling, reverse = heating (`comparators-and-deadband.html:432`,
`scripts/fbe-engine.js:344`). **The site drills the compounding of the
two as a field trap** — `quizzes/commanding-actuators.js:79` is a
question whose whole point is that the actuator's switch and the PID
loop's setting are not the same setting. Curation: this is the one
colliding term where auto-marking is arguably *safe* — but only with a
single entry that **leads with the fork** rather than defining either
sense, because the confusion between them is the lesson.

---

## 5. Multi-benign (13)

Senses differ, context always disambiguates, so a single definition is
safe **if it is written at the shared abstraction and matched on the
right token.** In nearly every case the curation note is about
*matching*, not about definitions:

- **front end / head end** — one referent (the supervisory
  workstation), two names used interchangeably; never defined
  anywhere, 9 bare uses on the workbench pages alone. One exclusion:
  the fixed compound *regenerative front end* in `quizzes/vfds.js:121`.
- **AI / AO / BI / BO / UI** — single-sense in everything a visitor
  reads; the user-interface sense of UI lives only in code comments
  and the `ui.js` filename. The curation rule is **scope, not
  definitions**: mark rendered prose only.
- **lead/lag** — the compound and role collocations always carry the
  staging sense; bare *lead* is a sensor wire on
  `temperature-sensors.html` and bare *lag* is process lag on the PID
  pages. Match the compound and it is single-definition; tokenize it
  and it degrades to colliding.
- **freezestat / freeze stat / low-limit stat** — the device term is
  one sense site-wide. The trap is stemming: bare *low-limit* **is**
  colliding (§4), and the prose repeatedly distinguishes device from
  override inside a single sentence. Match whole compounds; never stem
  down to "low limit".
- **interlock (incl. safety string)** — one core meaning realized in
  hardware or software; the site polices the only boundary that
  matters itself ("life-safety trips live in copper"). Write it
  medium-neutrally and give *safety string* its own entry.
- **normally open / normally closed** — contact at-rest state vs valve
  spring position. One definition at the shared abstraction works;
  prefer **suppressing** the tooltip on
  `education/commanding-actuators.html` itself, which *is* the
  definition and whose teaching beat a tooltip would shadow.
- **live zero / railed** — *live zero* is the model single-definition
  candidate in the whole pass. *Railed* must be defined as "pinned at
  the end of its range" and must **not** be glossed as a failed sensor
  — the `analog-sensing` quiz explicitly corrects that misreading. The
  noun *rail* (a drawing metaphor) should not be marked at all.
- **K-factor / Ak factor** — two quantities in one TAB domain, each
  defined inline by its own tool; two cross-referenced entries. One
  mechanical trap: `K-factor` is a substring of `Ak-factor`, so
  matching must be token-boundary-aware.
- **bypass** — hydronic leg, VFD electrical bypass, air-side bypass
  damper, plus the verb (authority routed around). Every occurrence
  names its medium in the same breath. Per-domain entries anchored on
  compounds; never mark the bare verb.
- **enthalpy** — moist-air total heat vs the refrigerant P-h quantity
  (mentioned once, only to disclaim it). Write it fluid-neutrally or
  exclude the refrigeration pages.
- **sensible / latent heat** — the thermal senses never conflict; the
  only trap is the ordinary adjective *sensible* ("a sensible
  tightening on a 25-device trunk"). Key on compounds.
- **hunting / hunt** — uniformly technical on every page that matters;
  the ordinary verb lives in quiz prompts and chrome ("Where do you
  hunt now?"). Key on the gerund in loop/valve/staging contexts.
- **PICV** — the acronym is single-sense; the bare modifier
  *pressure-independent* also correctly describes VAV boxes. Match the
  acronym and full compound only.

---

## 6. Existing gloss idioms

The site already glosses terms constantly — it has no *system*, it has
about a dozen **idioms**, and a glossary would be absorbing some of
them and deliberately leaving others alone. Deduped across the seven
lanes:

**Prose idioms (a glossary would absorb or standardise these).**
Em-dash appositive at first use (the dominant idiom site-wide, and the
dominant one inside quiz `explain` fields — the explains are already
half a glossary); parenthetical acronym expansion at first use; the
reversed form (term first, spell-out after an em dash); quoted-term +
colon micro-definition in a `p.ref-note`
(`signal-scaling.html`: *"Live zero": a broken wire reads below-range
and faults*); bold first-use definition, often clustered
(`refrigerant-pt.html`'s zeotropic/bubble/dew/glide passage);
`<em>`-led first-use; field-alias parentheticals recording trade
synonyms ("you'll also hear…"); term-origin notes flagging
vendor-specific vocabulary.

**Structural idioms (already doing a glossary's job on one page).**
The FAQ frontmatter block rendered by `faqBlock` — per-page
definitional Q&A that doubles as JSON-LD; a dedicated definition
section under its own `ps-section-label` h2; the bold-term-led bullet
mini-glossary (`modbus-register-viewer.html`'s *Modbus essentials*);
callout-grid mini-glossary cards; reference-table gloss columns;
`staging-sequencer.html`'s *What Each Knob Does* table, which is
effectively a glossary of the staging vocabulary; the
notation-trap explainer paragraph (*M is the Roman thousand, not
mega*).

**Workbench idioms — the site's own one-clause glosses.** The
middle-dot point-mirror caption (*MAT · mixed*, *DAT · discharge*); the
em-dash caption pairing a protocol term with its field meaning (*NULL —
released*, 8 instances); the control-label parenthetical (*Compressor
stage — Y1 / Y2 (slot 8 — Manual Operator)*); the select-option
self-gloss naming term and role together (*RAT — the differential
changeover reference*); the inline bold-term triplet (*a green value is
something the program is commanding, a plain value is something a
sensor is measuring, and a blue value is calculated*). These are the
closest thing the site has to the proposed component, and they are
**terse, in-place and non-interactive** — a useful register to write
glossary copy in.

**Idioms a glossary should leave alone.**

- **SVG `<title>` / `<desc>`** — an AT-only surface governed by the
  owner's describe-the-topology-fully ruling. It is where
  *direct-expansion* is actually spelled out, which is a finding about
  the prose, not a licence to move glosses there.
- **`data-us` / `data-metric` dual-unit spans** and the static metric
  parentheticals in the banks — a different system with its own
  blocking guard.
- **In-place disambiguation callouts** (`building-pressure.html`'s *Not
  the same pressure*; `commanding-actuators.html`'s *the words
  collide*; the `surviving-first-months` deadband gotcha). These are
  the **manual version of what a tooltip system would automate — and
  §4 is the argument that they should stay manual.**
- **`<abbr title="…">`** — present on exactly one page. Worth knowing
  it exists; not worth generalising without the WCAG 1.4.13 decision
  the friction file frames.
- **The define-elsewhere deferral link** in every simulator preamble
  ("New to PID? Start with the basics →"). Every simulator already
  defers its vocabulary to a paired education page. A glossary
  complements this; it does not replace it.

---

## 7. Constraints discovered

### 7.1 Prose that static marking cannot reach

`education/vfds.html:876` paints its widget anecdote from JS string
concatenation, and the phrase splits across source lines:

```js
'sat there stopped. Spent an hour re-checking the sequence, the AV mapping, the network priority ' +
```

So the page's only *priority array* occurrence is unreachable by any
build-time marking of the HTML source — the same class of surface the
units walker deliberately misses. Any coverage claim about a term must
be a claim about **markable** sites, not occurrences.

### 7.2 The quiz banks — the largest single lane, and the most constrained

Two independent constraints stack on `html/_data/quizzes/*.js`, which
carries **750 of the 2,360 estimated sites (32%)**:

1. Quiz text is **engine-painted DOM**. The units walker deliberately
   does not reach it (every bank header says so), and a tooltip DOM
   walker would not either.
2. **Prompt text is stripped to plain text twice** — by the Review/miss
   table *and* by `head.njk`'s FAQPage JSON-LD emitter. In-prompt
   markup would therefore either leak into structured data or be
   silently stripped from the rendered surface.

So marking in this lane cannot be raw spans in the bank files. It would
have to go through `quiz-engine.js` cooperation — term-marking at
render time, or gloss support confined to `explain` / choice rendering,
where the FAQPage constraint does not bite. **That is a component
decision, not a content decision**, and it should be made before anyone
counts the banks as in scope.

### 7.3 The AHU workbench has already spent the hover gesture

`html/simulators/ddc-workbench.html:617-627` uses `:has()`-driven hover
highlighting: hovering a sensor glyph lights its annotation callout. A
tooltip triggering off the same hover competes with the highlight for
the same gesture on the most crowded screen in the site — which is the
friction file's own reason not to prototype the pattern there. The
workbench pages are simultaneously the **densest term surface** in the
pass (Y1/Y2/G, make/break, front end, MAT family, DX, priority array,
relinquish default, low-limit's three referents) and the **worst place
to land the first tooltip**.

### 7.4 A page that teaches a term is the wrong place to gloss it

Recurring across three checkers, and worth stating once as a
constraint: marking a term on the page that defines it can *shadow the
page's own teaching beat* — `commanding-actuators.html` for
normally-open/closed, `comparators-and-deadband.html` for deadband and
differential, `analog-sensing.html` for live zero, the AHU's
`low-limit` arc. Suppression-on-the-owning-page is not an optimisation;
it is part of the correctness argument.

---

## 8. A draft curation rule — for the owner to accept, amend or reject

The friction note is explicit that the arc needs a written curation
rule or it licenses the eleventh-tooltip creep. This is a **draft**,
derived from what the sweeps and checkers actually found. It is not in
force.

**A term earns a gloss when all three hold:**

1. **It is a term of trade** — the reader's job vocabulary, not
   ordinary English used precisely. *DDC*, *relinquish default*, *live
   zero*, *deadhead*. Not *proof*, *authority*, *reset* as bare words.
2. **A reader plausibly stalls on it** — measured by the pass's own
   test: is it *defined thoroughly on one page and used bare on
   others*? That pattern is the stall, and it is what the site's
   define-elsewhere idiom leaves behind by design.
3. **It is single-sense site-wide, or resolvable to one sense by the
   collocation being marked.** *Modbus RTU* qualifies; bare *RTU* does
   not. *Valve authority* qualifies; bare *authority* does not.

**A term never gets a gloss when any of these hold:**

- **It is a §4 colliding term without per-context handling.** The
  default for that tier is *no marking*; per-compound entries are the
  exception, and each one needs its own written scope.
- **The page defines it in the same viewport** (§7.4). The gloss
  competes with the teaching, and on the disambiguation pages it can
  contradict it.
- **It is ubiquitous even for beginners** — the heat-exchanger sense of
  *coil* is the standing example. The trade's default reading of a word
  needs no tooltip.
- **It is ordinary English sharpened by context** — the command sense
  of *authority*, the evidentiary sense of *proof*, the search sense of
  *hunt*. These read correctly without help; marking them is where the
  eleventh-tooltip creep starts.
- **The occurrence is inside a proper name or a fixed compound whose
  surrounding words already disambiguate** — *DDC Workbench*,
  *regenerative front end*.

**The eleventh-tooltip test.** Before adding a term, ask: *if this one
earns a gloss, what is the argument that the next ten don't?* If the
answer is only "we stopped," the rule isn't doing work. Two concrete
guards fall out of the tiers: cap the first phase at the verified
tier-1 set and require a written scope note per term beyond it; and
treat a request to gloss a §4 term as a request to write a
**disambiguation entry**, never a definition.

---

## 9. Sizing summary

**Definitions to write.** 60 inventory rows. Several rows are families
(*MAT/OAT/RAT/DAT* is four headwords, *AI/AO/BI/BO/UI* is five,
*superheat/subcooling* is two), so the headword count is meaningfully
higher than 60 — count it when the definitions are drafted rather than
guessing it now. Of the 44 checked rows, **17 are plain entries** (§3a),
**14 are disambiguation entries or per-compound splits** (§4), and 13
are plain entries with a written matching rule (§5). The 16 unchecked
rows need a grep each before drafting.

**Marking sites: ~2,360**, with the mechanism and the four levers in
§2. Read it as an order of magnitude for a full pass, ±a factor of two
— not a work estimate, and never quoted bare.

**Phasing implication.** The tiers give the phase boundaries directly:

1. **Tier 1 first** — the verified single-sense set, on the prose
   surfaces (tools, education, landings). One definition each, correct
   everywhere, no per-context machinery, and it includes the
   highest-frequency zero-definition terms in the corpus (*DDC*, *DX*,
   *APDU* once checked).
2. **The 16 unchecked terms** join tier 1 after a per-term grep. Cheap,
   and several are the purest stall candidates in the pass.
3. **Multi-benign next**, since the work there is writing a matching
   rule per term, not resolving meaning.
4. **The collision tier only with per-context handling** — sense-aware
   marking, or exclusion. It should not gate the earlier phases, and on
   present evidence several of its terms (*reset* above all) are better
   left to the page prose that already defines them at first use.

The quiz banks (32% of the estimate) sit outside all four phases until
the §7.2 component question is answered, and the workbench pages —
densest surface, spent hover gesture — are the last place the pattern
should land, not the first.
