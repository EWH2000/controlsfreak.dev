# The §4 collision tier — disposition proposal

> **Status: DRAFT — FOR OWNER RULING.** One recommendation per family,
> argued; the menu exists so the owner can overrule, not so this doc
> can hedge. A five-checker adversarial refutation round runs on this
> draft before the PR opens; findings land in §9.

## Provenance and method

- **Repo state:** HEAD `7d5c97d04eae5301e2789fd593e65d51c5fbe0fc`,
  clean tree, 2026-08-20. The four inventory lanes ran at `d32b6db`;
  `git diff d32b6db..7d5c97d` touches only `README.md`, `docs/*` and
  `tests/quiz-banks.spec.js` — nothing under `html/` moved, so lane
  cites carry. **Every figure and file:line printed in this document
  was nonetheless re-derived at `7d5c97d`** by the proposal writer;
  where a lane figure did not reproduce, the true-up is stated inline
  and the re-derived figure is the one printed.
- **Evidence base:** the completed 4-lane inventory fan-out over all
  14 §4 families (2026-08-20). The raw lane output lives at a
  **session-scoped** path
  (`…/tasks/wutr8ni1f.output` under the session scratchpad) and will
  not outlive the session — per the handoffs-must-not-point-at-
  perishables rule, **the durable evidence is IN this document**: the
  exhibits, counts and pre-payment ledgers below are the record.
  Lane assignments: lane 0 — coil, RTU; lane 1 — static,
  head/head-pressure, dew point; lane 2 — reset, proof, lockout,
  floating; lane 3 — deadband, differential, low/high-limit, valve
  authority, direct/reverse-acting.
- **Counting rule** (the `docs/glossary-arc.md` L91-116 precedent,
  stated in full): counts are **occurrences, not matching lines**,
  matched case-insensitively over **raw source** with hrefs and
  attribute values included, **whitespace-collapsed** so a multi-word
  stem matches across a line wrap, and every count is labelled with
  the surface class it is for. Two lane counts moved under the
  collapse clause when re-derived: *dew point* 174 → **177** (three
  line-wrapped occurrences) and *duct static* 99 → **100** (one);
  *static pressure* 14 → **15**. All other headline counts
  reproduced exactly.
- **Marking scope** (SWEEP-SCOPE, inherited): this tier inherits the
  §5 banner's SWEEP-SCOPE ruling verbatim — marks land on
  education / tools / guides / landings **prose only**; simulator
  pages, quiz banks, scripts and deep practice pages are sense
  evidence, never mark sites. In-scope file set: **82 files** — 40
  `html/education/*.html` (minus index), 32 `html/tools/*.html`
  (minus index), 5 guides (`html/guides/index.html` + the four topic
  hubs), 5 landings (`html/index.html` + the education / tools /
  simulators / practice indexes).
- **Mark-state baseline, re-derived at HEAD:** 63 glossary entries;
  **369 marks in pages** (372 raw matches under `html/`, of which 3
  are documentation-header examples of `sr-latch` in `glossary.js`,
  `gloss.js` and `styles.css`); **57 distinct marked ids**; 6
  markless entries (`hoa`, `enthalpy-changeover`, `glide`, `ui`,
  `safety-string`, `ak-factor`). One lane note claimed "385 total
  marks" — that figure is wrong and is corrected here. No §4
  headword or compound has an entry or a mark anywhere.

### Index

1. Provenance and method (above)
2. The ruling menu
3. Per-family dispositions (3.1–3.14)
4. The disambiguation component
5. Reserved headwords — the EXCLUDED guard
6. Cross-cutting questions Q1–Q7
7. Sizing
8. Housekeeping rider
9. Refutation appendix + condensed inventory
10. Closing summary

---

## 2. The ruling menu

Three dispositions, defined once. A family's checkbox line in §3
refers to these; **A+B is combinable** in one family (dew point is
the live case). The `as amended:` blank is where a variant gets
written — several recommendations below use it.

- **A — bare-headword disambiguation entry.** The bare word gets an
  entry with `kind: 'disambiguation'`: a visibly distinct panel that
  names the fork rather than defining one sense, and points at the
  site's canonical disambiguation page for the term. This is the
  shape §8's ratified rule demands for a §4 term that gets marked at
  all ("treat a request to gloss a §4 term as a request to write a
  disambiguation entry, never a definition"). Component design: §4
  of this doc.
- **B — compound-split.** The bare headword ships **no** entry and is
  recorded as reserved; the single-sense compounds that carry the
  term get ordinary §5-style plain entries, **each with its own
  written matching rule** in its entry-leading comment (the §5 lane
  contract, per §8's "each one needs its own written scope").
- **C — exclude entirely.** No entry of any shape; the family gets a
  recorded EXCLUDED ruling (§5 of this doc) naming the reason and
  the hazard, so the exclusion is a decision with a date rather than
  an absence.

One measured variant recurs below and belongs on the `as amended:`
line rather than in a fourth menu letter: a family whose collision is
**entirely contained by owners[]** — every rival-sense occurrence
sits on pages that teach it — can ship the bare headword as a
**plain** entry in the §5 register, suppression doing the
disambiguation work, with the fork named in a closing clause instead
of a `kind` panel. Dew point is the case for this; the recommendation
there spells it out.

---

## 3. Per-family dispositions

Format per family: evidence summary (counts labelled by surface
class), senses, one to three verbatim exhibits re-derived at HEAD,
compound candidates with existing-entry overlap, hazards, one
RECOMMENDED disposition with the argument, and the owner's ruling
line. "Lane estimate" marks a figure derived from a lane's hand
classification (re-derivable from its stated protocol, not from a
single grep); everything unlabelled is a re-derived grep count.

### 3.1 coil

**Evidence.** 898 raw in-scope occurrences across 63 files (edu 567,
tools 242, guides 53, landings 36); 579 of them prose after the
markup-class split (103 sit in `<script>`, 55 in HTML comments, 83 in
SVG text/desc, the rest in tags/attributes/styles). Evidence-side:
sims 505, banks 192, scripts 249. Three senses: heat-exchange
(~92 % of the pool — lane estimate, sampled 62-site read with a
353-occurrence confirmed floor), **Modbus coil** (28, exhaustive),
**electromagnetic winding** (44, exhaustive).

**Exhibits (re-derived).**

- `html/education/start-stop-commands.html:313` — "…the freeze stat
  guarding a coil full of water — has to outrank *all* of that, and
  copper in series with the coil is the only authority that does."
  HEATX and WINDING **eleven words apart in one sentence**. The
  marquee exhibit: any single definition is wrong on one of the two.
- `html/education/modbus-basics.html:117-119` (one sentence wrapped
  across three source lines) — "The two single-bit tables —
  **coils** and **discrete inputs** — predate the registers; they
  map back to relay-style controllers, where \"coil\" meant the
  energizing coil of a control relay…" The site's own etymology beat
  defines the Modbus sense **by** the winding sense. A Modbus-keyed
  panel on the first token would be right; the same panel three
  words later would be flatly wrong.

**Compounds and pre-payment.** The decisive finding: the string
`Modbus coil` occurs **zero** times site-wide (re-derived), so the
one compound that could key the Modbus sense has no trigger text
anywhere — executing B there means marking bare `coil(s)` under a
sense-scoped id, a headword/trigger divergence Q2 recommends
against. `contactor coil` (12) is pre-paid twice over:
`interposing-relay`'s def carries "a contactor coil's inductive
draw" and is **already marked immediately left of the word** at
`html/tools/transformer-sizing.html:153`; `inrush`'s def carries
"a coil or motor first energizes". `DX coil` is pre-paid by `dx`
("A DX coil is that evaporator"), marked beside the word at
`html/tools/equipment-airflow.html:31`. `freezestat`'s def owns the
coil-face/coil-freeze ground. The heat-exchange compounds
(cooling/heating/reheat/steam coil) are the trade's default reading
and are taught in place.

**Hazards.** The surviving Modbus-leg prose sites are all blocked by
MIXED-RUN (`discrete-input` has no entry while `holding-register` /
`input-register` are already buttoned in the same enumerations) and
are self-defining in place ("coils and discrete inputs (single
bits)"). The winding leg's residue after owners[] on
start-stop-commands + controller-wiring is ~5–8 sites, every one
adjacent to an existing `interposing-relay` or `inrush` panel. The
lane's funnel: 898 raw → 579 prose → **exactly one clean residual
mark site** for the whole family
(`html/education/bacnet-vs-modbus.html:133`, "If two masters fight
over a coil…"). One site is the DPBV / face-and-bypass shape the §5
banner already ruled does not earn an entry.

**RECOMMENDED: C** — exclude the family; record
start-stop-commands:313 as the standing exhibit for why no walker
may ever touch this word. This is a **direction change from the
2026-08-09 note's conditional-B**, and the change is measured, not
re-judged: (1) SWEEP-SCOPE voided the note's "and the Modbus banks"
volume; (2) the two Modbus tools the note would mark are the sense's
teachers, so owners[] empties them and MIXED-RUN blocks the rest;
(3) the "optional contactor coil compound" was pre-paid by entries
that shipped after the note was written. The lane also leaned C; I
concur.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.2 RTU

**Evidence.** 57 raw in-scope occurrences across 11 files (edu 45,
tools 6, guides 3, landings 3); 30 prose. Two senses with **no
shared abstraction**: packaged rooftop unit (38 raw / 17 prose) and
Modbus RTU serial framing (19 raw / 13 prose). `modbus[ -]rtu` as a
collocation: **10 in scope** (re-derived). Zero simulator
occurrences.

**Exhibits (re-derived).**

- `html/education/index.html:259` ("…the RTU / AHU / MAU / split
  lineup…", rooftop) against `html/tools/index.html:88` ("…an RTU
  CRC-16 calculator…", Modbus) — **two sibling section landings one
  nav click apart, bare token, opposite senses.** The collision is
  cross-surface, not within-page: no in-scope page carries both.
- `html/education/bacnet-basics.html:509` — a rooftop schedule tag
  `RTU-1` inside an SVG `<text>` on a protocol page (unmarkable, so
  a hazard rather than a mark site).
- `html/education/vfds.html:576` — "Same wire as Modbus RTU;
  different protocol", protocol sense in a drive-network table on an
  equipment lesson: the cleanest mark candidate in the family.

**Compounds and pre-payment.** `Modbus RTU` is single-sense, 10
occurrences, 6 prose, no entry overlap. The rooftop leg is markless
by structure: all 17 prose occurrences sit on its two teach pages
(air-unit-identification, air-handlers) or inside navCard() args —
which are unmarkable on **two independent grounds**, verified in
`html/_includes/nav-card.njk`: the macro wraps the whole card in one
`<a>` (ANCHORED-LINK) and renders `{{ opts.desc }}` autoescaped, so
a spliced button would print as literal text. `packaged RTU` /
`RTU-N` add nothing (owner-page or SVG/NAME-REFERENCE).

**RECOMMENDED: B, narrowed** — one entry, id `modbus-rtu`, matching
rule pinned to the **collocation** `Modbus RTU` only, owners[] =
modbus-basics + modbus-functions; the rooftop leg gets a recorded
exclusion in the §5-banner style ("every occurrence sits on its
teacher or inside a navCard arg"). This narrows the lane's B, which
entertained firing the entry on the **bare** token at
`bacnet-vs-modbus.html:112` ("RTU / ASCII (RS-485 serial), TCP") —
I rule that site out on two grounds: it is a MIXED-RUN (`ascii` and
`tcp` have no entries) and bare-token marking is the
headword/trigger divergence Q2 recommends against. Honest yield
after that narrowing: **1–2 marks** (vfds:576 certainly; vfds:567's
`<td>Modbus RTU</td>` name cell is a judgment call for the marking
lane — a first-column name cell of a table whose sibling rows have
no entries; modbus-decoding:409 is a NAME-REFERENCE). The entry
still pays the palette / JSON-LD consumers, the §5 markless-entry
precedent. The 2026-08-09 note wanted two entries; the rooftop one
cannot be built, and this doc says so rather than shipping a
symmetric pair.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.3 static

**Evidence.** 459 raw in-scope occurrences (edu 402, tools 33,
landings 24, guides 0) — and **46 % of that is one markup
attribute**: 213 are `data-flow-static` (the flowStaticGuard
assertion), 38 are the string `duct-static-control` in
hrefs/frontmatter, and 38 are the ordinary-English "not animated"
homograph, which the lane verified sits **100 % inside HTML/CSS/JS
comments** — zero reader-facing occurrences. Pressure-sense residue:
~170, split ~159 duct/air-side, 6 static head/lift, 3 building
static, 2 pitot (lane classification of a full 212-window read).

**Exhibits (re-derived).**

- `html/education/building-pressure.html:515-516` — the site's own
  disambiguation callout: "**Not the same pressure** · building
  static ≠ duct static … The classic conflation, worth killing on
  sight…" Better than any panel could be — and on the page that
  would own the entry, so a panel can never appear beside it.
- `html/tools/affinity-laws.html:85` — "head (ft) for pumps, static
  pressure (in. w.c.) for fans" — the static and head families
  **entangled in one sentence** of markable `p.ref-note` prose; :134
  adds "static lift … real static head" on the same page. Neither
  family's 2026-08-09 note mentions the other.

**Compounds and pre-payment.** `duct static` (incl. `duct-static`
and `duct static pressure`): **100** in scope, of which 38 are the
URL/page-name string → **62 term-of-trade occurrences**, the
highest-volume clean compound in the whole tier (~25–35 markable
after owners[] and the rulings — lane estimate; includes the one
genuinely markable landing site, `forced-air/index.html:21`'s
`.landing-intro`). `building static`: 3, all on its teacher.
Pitot-static: 2, pre-paid by `velocity-pressure` ("total minus
static at the probe"). `static head/lift`: 6, half of them
FAQ-frontmatter — routed to the head family (3.4). `high-static`:
10, routed to the limit family (3.12) as the scoping record already
does.

**RECOMMENDED: B** — ship `duct-static` (term "duct static
pressure"; matching rule: the `duct static` collocation plus
compounds that carry it — static setpoint / static reset resolve
through it — never bare `static`); reserve bare `static` in the
EXCLUDED map; route `high-static` to 3.12 and fold static head into
`pump-head`'s def (3.4). **Do not ship the lane's optional markless
`building static` entry**: all three occurrences sit on
building-pressure.html, its teacher, and unlike `safety-string`
(shipped markless as a named future-page target with a written
matching rule) nothing on the site's roadmap says a second page will
use the phrase bare; record it as a re-open trigger instead. The
note's "mark full collocations only" is upheld; its admiration of
building-pressure:515 as "the model for any disambiguation entry"
is answered by geography — the model callout lives where the entry
would be suppressed.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.4 head / head pressure

**Evidence.** 207 raw in-scope occurrences — and **46 % can never be
the term of trade**: 53 are `{% block head %}` (the single biggest
false-positive generator in the tier), 36 are CSS class/selector
forms (`widget-slider-head` et al.), 6 are JS identifiers, 13 are
ordinary English **that reaches reader-facing prose** ("hold it in
your head", "head-scratcher") — the opposite structural exposure
from static's comment-buried homograph, worth naming because
"homograph risk" is not one thing. Term-of-trade residue: ~83
hydronic head vs **5** refrigerant head pressure, plus 7 sensor-head
(device noun), 2 head end.

**Exhibits (re-derived).**

- `html/hydronics/index.html:21` ("the pump head and speed…") vs
  `html/refrigeration/index.html:21` ("the suction and head
  pressures…") — **sibling hub landing-intros, structurally parallel
  sentences, opposite senses, and both lines already carry live
  gloss marks** (`cv`; `superheat`/`subcooling`), so these are
  markable prose, not chrome. The strongest exhibit in the family —
  and in-scope, unlike the simulators/index navCard pair the
  2026-08-09 note cited (that pair still exists, drifted to
  :110/:120-121, but navCard args are structurally unmarkable).
- `html/education/refrigerant-cycle-basics.html:47` — "a
  head-pressure trip" **undefined in the page-intro**, on a page
  that then teaches the quantity as "discharge pressure" / "high
  side" (:75/:79) and never connects the names. A panel here is
  purely additive and shadows nothing.

**Compounds and pre-payment.** `head end` is **already marked** via
`front-end` at `html/education/bacnet-vs-modbus.html:147`; both
hyphenated `dead-head`s are already marked via `deadhead`
(`load-piping.html:653/:858`). `ft of head`: all 6 occurrences
unmarkable (JS comments + one UNITS-SPAN) — drop it, fold the unit
into the `pump-head` def. `velocity head`: zero site-wide. `sensor
head` is a device noun (the enthalpy DEVICE-NOUN exclusion shape).
`head pressure` has **no owner page** — the sense is taught nowhere
under that name — so all 3 markable sites survive.

**RECOMMENDED: B** — two entries: `pump-head` (owner:
pump-control.html; def carries feet-of-water, friction vs static
head, the affinity-laws boundary) and `head-pressure` (owners: `[]`
— the zero-definition stall shape the ratified §8 amendment brought
into scope; expected marks: refrigerant-cycle-basics:47,
superheat-subcooling:176, refrigeration/index:21). Reserve bare
`head` — unworkable as a headword since its dominant string form on
this site is a template keyword and a CSS class, not English.
`head-pressure` is the single best additive opportunity in the tier.
Concurs with the lane (high) and the note's direction, minus the
note's `ft of head` entry.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.5 dew point

**Evidence.** **177** raw in-scope occurrences (wrap-safe;
the lane's line-bound 174 missed three), tools 81 + edu ~73 +
landings 23. Three senses: moist-air (~140 — the trade's dominant
reading here), refrigerant blend dew (~17, page-disjoint from the
moist-air sense), apparatus dew point (**9**, not page-disjoint).
Chrome is heavy: 14 `<option>` captions, 8 UNITS-SPAN label
interiors, 29 navCard-arg occurrences; `tools/air-mixing.html`
carries 13 occurrences and **zero markable prose** — the standing
warning against sizing a family by its count.

**Exhibits (re-derived).**

- `html/education/psychrometrics-basics.html:178` — "The cooling
  coil dips below the entering dew point … bends
  down-and-to-the-left toward the coil's apparatus dew point." The
  air's property and the coil's property **in one sentence-pair, 30
  words apart**, on the page that owns the moist-air definition. The
  sharpest exhibit in the family, and the 2026-08-09 note never
  noticed it.
- `html/tools/refrigerant-pt.html:143-145` and `:268-274` — the
  bubble/dew teaching beats ("the **dew point** where the last vapor
  would condense. Superheat is measured against the dew point…"). A
  moist-air def is flat wrong here — and worse than wrong: the
  shipped `glide` and `superheat` entries **already define the
  refrigerant dew sense** (`glide`: "the dew point (saturated
  vapor)"; `superheat`: "superheat = line T − dew T"), so a
  moist-air panel on these pages would contradict two live sibling
  panels, a hazard class no other family has.

**Compounds and pre-payment.** `apparatus dew point`: 9, single-
sense, no overlap, 6 markable — the note's "safe standalone
compound", confirmed. The refrigerant sense is fully pre-paid by
`glide` (markless, owners = refrigerant-pt +
refrigerant-cycle-basics + superheat-subcooling — exactly the three
pages a bare entry must be suppressed on) and by
`superheat`/`subcooling` naming their reference ends. `ADP`: zero
site-wide.

**RECOMMENDED: A+B, with A amended to the plain register.** B-half:
ship `apparatus-dew-point`, owners[] =
`['/education/dedicated-outdoor-air.html',
'/education/psychrometrics-basics.html']` — both define it inline —
leaving `tools/coil-sizing.html:314` as its one expected mark (the
appositive there names the term but does not teach the
coil-property-vs-air-property distinction the panel carries; flagged
as a judgment call for the refutation round). A-half: ship bare
`dew-point` as a **plain** entry — *not* a `kind: 'disambiguation'`
panel — defining the moist-air property, owners[] =
psychrometrics-basics + dew-point-calculator + refrigerant-pt +
superheat-subcooling + refrigerant-cycle-basics, with a closing
clause naming the blend and apparatus forks, and a matching rule
that never fires inside the `apparatus dew point` compound. The
measured ground for the amendment: the refrigerant sense is
**page-disjoint** (refrigerant-pt and superheat-subcooling carry
zero moist-air uses; dew-point-calculator carries zero refrigerant
ones — the only shared surfaces are navCard args, doubly
unmarkable), and all three refrigerant pages genuinely teach the
headword, so owners[] suppression is the *semantically correct* use
of §7.4, not a workaround — `glide` set that exact precedent. A
fork-first `kind` panel would tax ~140 moist-air readers to serve a
fork that suppression already contains. The lane flagged this
reading in its own caveat; this doc elevates it to the
recommendation.

Ruling: `[ ] A  [ ] B  [ ] A+B  [ ] C  [ ] as amended: ____________`

### 3.6 reset

**Evidence.** 245 raw in-scope occurrences across 28 files (edu 193,
landings 26, tools 21, guides 5), read at 100 % coverage by the
lane. **Eight** sense-classes: setpoint-reset schedules (R1,
dominant), PID integral (R2), the SR latch's R input (R3),
fault/manual reset (R4), timer ET reset (R5), UI chrome (R6),
ordinary English (R7), code homographs (R8). All 26 landing
occurrences are navCard args; ~23 more are the page name "Setpoint
Math & Reset Schedules" or its slug.

**Exhibits (re-derived).**

- `html/education/controls-commissioning.html:128` — "Drive a reset
  input across its range and confirm the reset output walks the way
  the sequence draws it" (R1: the OAT input to a schedule) against
  `html/education/timers-and-delays.html:255` — "a reset input
  waits on the latch's R for a human" (R3: the latch pin). **The
  identical two-word collocation, opposite senses, two in-scope
  lessons in one chapter.** This refutes B outright: a
  compound-split requires single-sense compounds, and the family's
  highest-frequency non-schedule compound fails the test.
- `html/tools/duct-sizer.html:117` — "resetting expectations on the
  static setpoint" — ordinary English **immediately before an
  anchor to the static-reset lesson**: the false positive is not
  hypothetical.
- Evidence-side, the site's own code already dodges the word:
  `html/simulators/function-block-editor.html:243`'s comment renames
  a schedule slope `Rst Slope` *because* Reset was ambiguous on a
  sheet carrying R1, R2, R3, R4 and R6 at once.

**Compounds and pre-payment.** `manual reset` (7) is **fully
pre-paid**: `freezestat`'s def ends "commonly manual-reset: a trip
stays tripped until a person finds out why", and its owners[] are
precisely the three pages the compound lives on. `reset (integral)`
has two carriers and both teach it. `reset schedule` (23) — the one
clean, unpaid, single-sense compound — survives owners[] and the
navCard/anchor/heading rulings at **exactly one site**
(`html/education/function-blocks.html:299`). Every sense
self-defines at first use on the page that carries it; the union of
owners is essentially the corpus.

**RECOMMENDED: C** — exclude entirely, hardening the 2026-08-09
note's "either/or" to the exclude arm. One mark is not worth
reopening the site's worst homograph. If the owner wants any
coverage, the single defensible amendment is a B-shaped
`reset-schedule` entry (owners[] = setpoint-math-reset +
pump-control + duct-static-control; matching rule pins the full
two-word collocation) shipping with one mark — the §5 record makes
that shape legitimate — but the recommendation is the clean
exclusion, with the EXCLUDED row naming the `reset input` collision
and the duct-sizer near-miss as the reasons. Lane concurs (high).

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.7 proof / proven / proof window

**Evidence.** 206 raw in-scope occurrences across ~29 files, read at
100 % coverage; concentration is extreme (status-and-proof 50 +
timers-and-delays 48 + controls-commissioning 20 = 57 % of the
pool). Two registers, not two technical senses: the device noun
(proof of flow, the proof window, "proven airflow") vs ordinary
evidentiary English — which is what makes it dangerous, since the
reader needs no panel on the ordinary half.

**Exhibits (re-derived).**

- `html/education/controls-commissioning.html:136` — `<h2>` "Trend
  logs — proof over time", on a page whose 20 occurrences run
  **18-to-2 ordinary-vs-device** (lane full read; the two device
  uses are :63's "proof-of-flow switch" and the :90 table cell). A
  device-sense panel would be wrong on 90 % of a page that already
  carries 18 gloss buttons.
- `html/education/controls-commissioning.html:143` — "…has proven
  the plumbing; the trends are what prove the *sequence*" — the
  ordinary register in body prose ~80 lines from the device
  register.

**Compounds and pre-payment.** `proof window`: **18 raw in scope**
(the lane's 17 counted the space form only; the 18th is a
hyphenated `proof-window` inside an HTML comment at
`timers-and-delays.html:420`, comment-masked — so 17 renderable),
single-sense, the only unpaid teachable compound. After owners[]
(status-and-proof + timers-and-delays) it survives at **one** site,
`html/education/reading-a-wiresheet.html:234` — whose sentence
already anchors the owning lesson three words earlier, so a
reasonable reader of the yield calls it zero. `proof of flow` (9) is
pre-paid by `interlock` ("proof of flow before a heater draws") and
`bi` ("a status, a proof, an alarm"). Six shipped defs already use
the word, one (`dat`) in the ordinary sense.

**RECOMMENDED: B, with the yield stated to the owner rather than
assumed** — one entry, `proof-window`, def at the device sense,
matching rule pinning the two-word collocation and barring every
bare form (proof / proofs / prove / proves / proved / proving /
proven), owners[] = status-and-proof + timers-and-delays, **shipping
with one mark or zero**. The §5 record legitimises markless entries,
and the palette / quiz-engine / JSON-LD consumers are the standing
reason to carry a headword the transform barely uses — but that is a
real cost trade the owner should rule on knowingly, which is why the
lane's own words ("correct but nearly empty") lead this
recommendation instead of being buried. Bare `proof` is a hard entry
in the EXCLUDED map. Separately: **`fail-to-start` (6 in scope) is a
clean single-sense headword with no overlap and no ordinary-English
twin — a better entry than anything in this family. It contains no
form of "proof" and is routed to the post-arc re-triage as its own
candidate, not folded into this ruling.**

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.8 lockout / locked out

**Evidence.** **7** raw in-scope occurrences (verb forms "locks
out" / "Lock out" included — the pattern covers lockout / lock out /
locked out / locks out / locking out; 48 site-wide). The thinnest
family by an order of magnitude, and the multi-sense mass is
entirely evidence-side (30 occurrences on simulator surfaces). Of
the 7: one keywords line, two JS-painted strings, one owner-page
teach beat, one tagout hard-exclude — **two markable sites remain**.

**Exhibits (re-derived).**

- `html/education/start-stop-commands.html:220` — "…though an HOA in
  Off is *not* lockout/tagout; the starter's line side is still hot,
  and nothing about a selector switch protects anyone working
  inside." The hard-exclude: a safety sentence whose entire content
  is a **negation**, on a page where the marking lane is
  demonstrably active (owner of `hoa` and `safety-string`).
- `html/education/temperature-sensors.html:73` — "…quietly skews
  economizer changeovers and lockouts for years" — the one clean
  condition-lockout site, sitting **one word after a live
  `economizer` button**, while the shipped `oat` def already
  contains "low-ambient lockouts".
- `html/education/vav-systems.html:508` — "a stage locks out rather
  than run starved — the interlock chooses…" — the one fault-holdoff
  site, one word after a live `interlock` button whose def covers
  the idea.

**RECOMMENDED: C** — at HEAD this is not a collision family in
marking scope; it is a **hazard family**. Both surviving sites
already have a correct panel within one word; the fault-holdoff
sense has **no teach page inside marking scope** (its teachers are
all simulators), so an entry covering it would have no owners[]
anchor for the guard's anti-vacuity probe to hold onto. The EXCLUDED
row must name the tagout hazard explicitly: *never mark any
occurrence adjacent to "tagout" — defining lockout as a controls
disable on the sentence whose point is the opposite would undercut a
safety teaching.* Note for whichever ruling lands: `economizers.html:219`
renders "high-limit lockout" — one phrase containing **two** reserved
§4 headwords; the `economizer` entry already carries the recorded
ruling (glossary.js:833-840) that the collocation resolves to the
economizer sense there. Lane concurs (high); the 2026-08-09 note's
hard-exclude instinct is upheld and its collision framing downgraded.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.9 floating

**Evidence.** 38 raw in-scope occurrences — the highest
sense-density-per-occurrence in the tier: tri-state actuation (13,
incl. landings), IEEE-754 floating point (15), electrically floating
(4), physical buoyancy (2), layout/code homograph (4). Per-sense
counts are exact (they sum to 38 with no residue — lane full read).

**Exhibits (re-derived).**

- `html/education/controller-wiring.html:243` — "They're common for
  driving floating/tristate actuators … but a triac … isn't a
  floating, isolated contact…" — **two senses doing opposite work
  about the same device, ~30 words apart, in one in-scope lesson
  sentence.** An upgrade on the 2026-08-09 note, whose only exhibit
  was this collision's quiz-bank twin
  (`quizzes/controller-wiring.js:142`, confirmed verbatim, evidence-
  only under SWEEP-SCOPE).
- `html/tools/minimum-outdoor-air.html:211` — "Warm air from the
  same diffuser floats, hugs the ceiling…" — buoyancy on a tools
  page; any technical panel here is absurd, which settles A.
- `html/education/balancing.html:497` — "analog or floating-point
  input, 0–100 % open" — **the tri-state sense written as the
  IEEE-754 compound**, the exact string the site uses for 32-bit
  values five files away. This breaks the assumption that
  `floating-point` is a safe single-sense compound, and it is
  flagged to the owner below as a probable copy defect independent
  of the ruling.

**RECOMMENDED: B** — one entry, id `floating-actuator`, term
"floating (tri-state) actuator", owners[] =
`['/education/commanding-actuators.html']` (the :327 teach beat),
matching rule pinning the actuator collocation and explicitly
barring bare `floating` / `float`, `floating-point`, `floating
common`, and any use whose head noun is a conductor, a value, or
air. Yield after owners[]: **one mark**, and it is the collision
sentence itself — controller-wiring:243's "floating/tristate
actuators" — which is the best possible mark in the family
precisely because it resolves the reader's exact confusion at the
one place the site creates it; the trigger wraps the full phrase so
the panel's headword matches what the reader tapped. `tri-state` is
the safer headword in the abstract (zero homographs) but never
occurs free of the floating token, so it lives in the `term`, not
the match. **Owner question (routed via §6/Q7 notes):**
`balancing.html:497` — is "floating-point input" as a synonym for
tri-state actuation field usage you'd stand behind, or a copy defect
to fix? The page carries zero gloss marks today, so nothing protects
it either way. Lane concurs (medium); the note's "compound entries
only" is upheld with the evidence upgraded from bank to lesson.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.10 deadband

**Evidence.** 76 raw in-scope occurrences (edu 69, landings 7, tools
0 in raw source — but see the enum hazard below); 302 site-wide. The
raw pool collapses hard: 33 of 76 are the page name "Comparators &
Deadband" or its slug, 26 sit on the owning lesson, and after
headings / SVG / comments / navCards the markable payload is **~8–11
sites** (lane classification), every one either S1 (the band around
one switching decision) or S2 (the stage-up/stage-down gap) — the
same geometric idea at two scales, which is exactly the connection
`comparators-and-deadband.html:450` draws in prose.

**Exhibits (re-derived).**

- `html/education/comparators-and-deadband.html:420-423` — ":420 the
  DB constant here is *half* the band … :423 Vendors split on this.
  Some deadband parameters mean the full width, some the half; copy
  a value between platforms without checking and you've silently
  doubled or halved the band." The site runs **both arithmetic
  conventions live**: this lesson and `setpoint-math-reset.html:67`
  (72 + 2 = 74 and 72 − 2 = 70) use half-band; CLAUDE.md's
  house-usage block and `ddcw-ahu-unit.js` apply the constant once
  (cooling makes at CSP + db). **Any def that states the arithmetic
  contradicts one half of the site** — a constraint tighter than the
  cross-sense fork, and one the 2026-08-09 note never surfaced.
- `html/education/comparators-and-deadband.html:475-477` (the
  `#which-sense` paragraph, anchor at :468) — the canonical
  disambiguation, including the zone sense *named as differential*:
  "…a zone's is the separation held between the heating and cooling
  setpoints."
- `html/_data/bacnetEnums.js:101` — property 25 `Deadband`, rendered
  into `tools/bacnet-objects.html` (:158 loop) **and** fed to
  `definedTermSetJsonLd` at `html/_includes/head.njk:43`: invisible
  to any raw grep of the tools class, permanently unmarkable on the
  FAQ-FRONTMATTER dual-consumer ground, and a fifth referent for the
  word.

**RECOMMENDED: A** — the tier's one genuine disambiguation entry.
`kind: 'disambiguation'`, fork-first register: a band around one
switching decision, or the deliberate gap between two staging
thresholds — read the values the number lives between, not the
label — naming the canonical page (`comparators-and-deadband.html`,
`#which-sense`). Hard def constraints, both from the corpus rather
than taste: **never state the arithmetic** (half vs full width are
both live and both correct), and **never claim the zone
setpoint-separation sense** (the site deliberately files that under
*differential*; the deadband count for it in marking scope is zero —
a correction to the scoping note, whose `building-pressure.html:511`
cite reads at HEAD as a loop-insensitivity band, S1, and whose
`vav-systems.html:696` cite is a JS comment). B is unavailable — the
only compounds with volume are `deadband constant` (4, three on one
page) and the doubly-unmarkable navCard pair — and C throws away the
term the site thought was worth a whole lesson and a `#which-sense`
anchor. This entry is consistent with CLAUDE.md's two-senses
convention block: the panel discloses the variation and sends the
reader to the page that teaches pattern-reading; it never legislates
a house answer. Expected marks: ~8–11. Lane concurs (medium); the
note's A upheld with the arithmetic constraint added.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.11 differential

**Evidence.** 30 raw in-scope occurrences (edu 27, guides 3) — and
**21 of the 30 are the single-sense compound `differential
pressure`** (incl. `differential transducer`). The residue splits
four ways: switch hysteresis (2 — both sites define it in situ),
changeover (5, pre-paid), temperature differential (1), the zone
sense (1, on the canonical disambiguation page). A quarter of the
pool is unmarkable on markup grounds alone (6 SVG `<desc>`, 1
`aria-label`, 2 frontmatter).

**Exhibits (re-derived).**

- `html/education/status-and-proof.html:77` vs `:200` — ":77 A
  **differential-pressure switch** reads the pressure rise across
  the fan…" then ":200 …let the switch's built-in **differential**
  do its job — section 1's word doing different work here, naming
  not a pressure difference but the switch's own hysteresis…" The
  page stops mid-sentence to disambiguate itself — the single
  strongest §4 exhibit in the corpus, because a one-definition panel
  would contradict the page's own explicit flag **on the sentence
  that makes it**.
- `html/education/comparators-and-deadband.html:475-484` — the
  four-sense `#which-sense` paragraph, closing "take the convention
  from those, not from the label" — an instruction to distrust
  exactly the kind of label a tooltip is.

**RECOMMENDED: B** — ship `differential-pressure` (the ΔP quantity
plus the switch/transducer that reads it; ~10–12 marks after the
teach pages suppress); reserve bare `differential` in the EXCLUDED
map. Leave the changeover arm alone: `enthalpy-changeover` owns both
its pages and the `rat` def already ends "…the reference side of a
differential economizer changeover" (marked twice today). The
hysteresis sense needs no entry — it occurs twice and both
occurrences are the site defining it in place. One page-local
caution carried into the entry's comment: CLAUDE.md's
"the workbench graphics do not call the setpoint separation a
differential" ruling is page-local — comparators-and-deadband:477's
zone sense is correct, canonical, and is the page any future def in
this family links. Nesting hazard for the marking lane:
`economizers.html:219` has an existing `dry-bulb` button **inside**
the `differential dry-bulb` collocation — never split a collocation
across two panels. Lane concurs (high); the note's collocation-only
curation is confirmed.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.12 low-limit / high-limit

**Evidence.** 28 raw in-scope occurrences (site-wide 151, which
reconciles exactly: 28 in scope + 122 evidence + 1 stray in
`schematic-bg.njk`). Not one term with senses — a **modifier
pattern**, `<adjective> limit`, attached to at least **six**
unrelated referents, four of them taught on four different pages:
economizer changeover high limit (a comfort/energy *decision*, not a
protection), duct high-static safety, furnace heat-exchanger high
limit and boiler aquastat high limit (both **missed by the
2026-08-09 note**), freeze-stat low limit, mixed-air low-limit
override, plus the BACnet `High_Limit`/`Low_Limit` properties
(rendered from `bacnetEnums.js` into bacnet-objects.html and its
JSON-LD — invisible to a raw tools-class grep, the counting hazard
recorded in §1).

**Exhibits (re-derived).**

- `html/tools/economizer-ratio.html:222` ("dry-bulb with a humidity
  high-limit", already carrying five gloss buttons) vs `:235`
  thirteen lines later ("let the low-limit protections decide…") —
  one page, one machine, a comfort gate and a freeze floor sharing
  one token.
- `html/tools/duct-sizer.html:213` ("drives static toward the duct
  high-limit's territory") vs `html/tools/equipment-airflow.html:243`
  ("the exchanger overheats — the high-limit switch trips") — the
  identical token, a pressure switch on one damage-stakes ref-note
  and a thermal cutout on the next.
- `html/education/controls-commissioning.html:128` — "Trip the
  freezestat (a low-limit thermostat set just above freezing) …
  Trip the high-static cutout…" — L1 and H2 in one sentence run,
  with L1 **already glossed** by the `freezestat` button four words
  earlier (its def: "Also called a freeze stat or low-limit stat").

**RECOMMENDED: B** — two entries: `high-static-cutout` (10 in-scope
sites for the compound; the one referent currently undefined
anywhere; `safety-string`'s def names the device but nothing defines
it; ~2–3 marks after its teach pages suppress) and
`mixed-air-low-limit` (term "mixed-air low-limit override"; the
entry that separates the modulating override from the hard trip —
exactly the confusion worth paying for; ~3–4 marks). Reserve both
bare headwords in the EXCLUDED map. The note's other two targets are
spent: *freeze stat* is fully shipped inside `freezestat`, and
*economizer high limit* is pre-paid by `economizer` +
`enthalpy-changeover`, which own both its pages. `high-limit
lockout` (economizers:219) must never get an entry — it straddles
two reserved families, and the `economizer` entry already carries
the recorded resolution. Note `high-static-cutout` embeds *static*,
a reserved bare headword — legal, because a hyphenated coinage is
its own lexical item (COINED-COMPOUND), and worth stating so the
refutation round doesn't read it as a contradiction. Lane concurs
(high).

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.13 valve authority (β) / bare authority

**Evidence.** 93 raw in-scope occurrences, of which **38 are
literally the two words `valve authority`** and nearly all the rest
that mean β sit on the two tools that teach it (valve-authority 35,
valve-cv 25 — together 60 of 93). The residue is five other
readings, including two the 2026-08-09 note missed entirely:
**ordinary/regulatory authority** — "the authority having
jurisdiction" (`minimum-outdoor-air.html:266`), "a commissioning
authority" (`equipment-airflow.html:262`, `air-balancing.html:366`)
— and the command-priority sense now live in education prose
(`start-stop-commands.html:220/:313`, `status-and-proof.html:181`),
not just quiz banks.

**Exhibits (re-derived).**

- `html/tools/minimum-outdoor-air.html:266` — "The ventilation
  schedule on the stamped design documents and the authority having
  jurisdiction govern." A code phrase inside a damage-stakes scope
  note; a hydronic ΔP-ratio panel here is dispositive against any
  bare entry on its own.
- `html/education/balancing.html:410` vs `:501` — "the one with the
  most authority over the system" (branch influence) then
  "Traditional control valves have an *authority* problem" (β), two
  readings 91 lines apart on one hydronic lesson.
- `html/education/start-stop-commands.html:220` — "a complete
  statement about authority" in the same sentence as the
  lockout/tagout safety fence (3.8's exhibit) — the one place in the
  tier where a family's token sits inside the site's OSHA teaching.

**RECOMMENDED: B** — ship `valve-authority` keyed on the two-word
collocation (β = the wide-open valve's share of the circuit's
pressure drop; why oversizing collapses it), owners[] =
valve-authority + valve-cv + load-piping; reserve bare `authority`.
Expected marks ~3–4 (balancing:501, commanding-actuators:357,
`hydronics/index.html:21`'s landing-intro — where a `cv` button
already sits two words earlier — and load-piping:403 if its
parenthetical self-definition is judged not to be a teaching beat).
The def must **complement, not restate**, `installed-characteristic`,
whose def already carries "high valve authority — as authority
falls, the installed curve bows away" and whose owners[] is
/tools/valve-authority.html. The other senses stay in prose:
"out of authority" has one in-scope site
(`metering-devices-txv-eev.html:269`) that self-defines in its own
clause and already carries `railed` + `superheat` buttons — the
note's "deserves its own entry" does not survive measurement;
command authority is carried by `hoa` / `priority-array` /
`safety-string` / `interlock`; the regulatory sense is not a
controls term. Lane concurs (high).

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.14 direct-acting / reverse-acting

**Evidence.** 13 raw in-scope occurrences (36 site-wide on the
widened `act(ing|ion)` stem; nearly two-thirds of the corpus is
evidence-side before any ruling applies). Two senses, each with
exactly one teach page: actuator stroke-vs-signal
(`commanding-actuators.html:184`) and loop output-vs-measurement
(`comparators-and-deadband.html:435-436`, direct = cooling).

**Exhibits (re-derived).**

- `html/_data/quizzes/commanding-actuators.js:79` — "A damper
  actuator has a direct/reverse (CW/CCW) switch on its body. Your
  PID loop configuration also has a direct/reverse-acting setting.
  Same setting in two places?" The site **drills the compounding as
  a field trap** — and this bank question is the *only* surface
  anywhere on the site where both senses are live at once. Each
  lesson is internally single-sense; neither cross-links the other
  on this point.

**The number that decides it:** after owners[] on the two teach
pages, the markable count in marking scope is **zero** — the two
remaining occurrences are navCard descs, unmarkable twice over
(anchor-wrapped + autoescaped).

**RECOMMENDED: C** — a **direction change from the 2026-08-09
note's A** ("the one colliding term where auto-marking is arguably
safe"), and not because the collision is disputed: the note's
exhibit reproduces verbatim. An entry needs somewhere to land, and
this one has nowhere. The §5 markless-entry precedent doesn't
rescue it: the shipped markless entries are cross-reference targets
or named future-page surfaces; this would be a markless entry
justified only by pages that do not exist — the exact shape the
no-coming-soon rule exists to keep out of the product. Record the
EXCLUDED row with a **written re-open trigger**: the moment a third
page uses either compound without defining it, this family comes
back as an A whose panel leads with the fork (device switch vs loop
setting), per the note's own design. If the owner would rather bank
the fork-leading A entry now, that is the defensible amendment —
it costs a `kind` entry that renders nowhere. Lane concurs (medium,
same direction change).

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

---

## 4. The disambiguation component

**Conditional on ≥1 A surviving the ruling.** Under the
recommendations above exactly **one** A exists (deadband, 3.10; dew
point's A-half is amended to the plain register and needs no
component). If the owner flips 3.10 to C or amends it to plain,
**zero A survive — no component gets built, and the
`kind: 'disambiguation'` comment at `glossary.js:42` stays exactly
as written.** That outcome is a feature, not a gap: the comment was
written as a deliberate deferral, and a tier that measures out to
zero disambiguation entries has simply answered the question the
comment left open.

### 4.1 Data shape

Two options priced; **minimal shape recommended.**

- **Structured `senses[]`** — `{kind, term, senses: [{label, def,
  owner}], link}`. Machine-checkable ≥2-senses anti-vacuity; a
  render loop builds the panel. Costs: a second entry schema for the
  guard to lint and keep from drifting; an escaping policy per
  field; and every future consumer (palette row, quiz-engine explain
  rendering, JSON-LD DefinedTerm) flattens to text anyway, so the
  structure serves exactly one consumer — the panel — while doubling
  the shapes every consumer must understand.
- **Minimal** — the existing `{term, def, owners}` plus
  `kind: 'disambiguation'` and one new `link` field (root-relative
  path + optional fragment to the canonical disambiguation page).
  `def` stays trusted authored markup exactly as the file header
  doctrine states — the fork is *written*, in house voice, not
  assembled from parts. This is one field on one branch point, and
  it is all one surviving entry needs. If the post-arc re-triage
  ever grows several A entries, revisit `senses[]` then, with real
  instances to design against.

### 4.2 Render design

The single branch point is the panel builder at
`.eleventy.js:875-881` — a conditional on `entry.kind` that (a) adds
a `gloss-tip-disambig` class beside `gloss-tip`, (b) appends the
eyebrow's variant, (c) appends the link line if Q3 resolves to
shipping one. Proposed look, using existing tokens only:

- **Class:** `class="gloss-tip gloss-tip-disambig"` — additive, so
  every base rule (geometry, opaque `--surface-2` background,
  z-index) is inherited. `tests/contrast-sweep.spec.js`'s
  `COLLAPSED_CHROME` already force-opens `.gloss-tip`
  (spec lines 431/443), so the child class's ink is contrast-measured
  in both themes **with no spec change** — stated here so the
  refutation round doesn't file it as a gap.
- **Eyebrow:** the `.gloss-tip-term` line keeps the `<dfn>` headword
  and gains a terse suffix in the same mono/uppercase register —
  `deadband · varies by context` — so the panel declares its
  register before the reader parses a sentence.
- **Left rule:** the base panel carries `border-left: 2px solid
  var(--blue)` (styles.css:1496). The disambig variant swaps the
  hue: recommend `var(--amber-fill)` — amber is the house *warn*
  register, and "this word varies — read carefully" is honestly a
  caution, which makes the connotation earn the color rather than
  decorate. `-fill` tokens are legal in border paint and forbidden
  in `color:`; write it as `border-left-color:` (or confirm
  `fill-token-misuse.spec.js` classifies the `border-left` shorthand
  — an unclassifiable sink fails CI by design, which is the guard
  working). Alternatives if the owner's eye disagrees on the mockup:
  a doubled `--blue` rule (4px, reads as "more of the same" rather
  than "different kind"), or the eyebrow variant alone (quietest).
  This is exactly the class of call the owner rules on a rendered
  mockup, per the standing mockup-first pattern.
- **Register:** fork-first prose, not a sense list — one short
  paragraph naming both readings and ending on the pattern-reading
  instruction, in the site's voice. A `<dl>` sense list is the
  right shape at four-plus senses, which Q5 caps out of existence.

### 4.3 Guard arms (`glossaryGuard`, `.eleventy.js:649-685`)

- **Kind whitelist:** `entry.kind` absent or `'disambiguation'`;
  anything else fails. Keeps the field from becoming a freeform
  taxonomy.
- **Link-target resolution:** `entry.link` required on kind entries,
  resolved against the same `pagePaths` set the owners arm builds
  (`.eleventy.js:653-657`, reuse — path portion must name a page
  carrying that canonical). The fragment is checkable cheaply by
  reading the target file for the literal `id="…"` — recommended,
  since `#which-sense` going stale would silently point the panel at
  the page top; a stale fragment should fail the build the way a
  stale owners path does.
- **Anti-vacuity (≥2 senses):** under the minimal shape this cannot
  be counted structurally; the proxy is `owners.length >= 2` on kind
  entries — a disambiguation entry's owners[] is defined as the
  **union of all senses' teach pages** (deadband:
  comparators-and-deadband + function-blocks + timers-and-delays +
  equipment-staging + bacnet-objects), so a kind entry with fewer
  than two owners is structurally suspicious and fails. Stated
  honestly: this is a proxy, not a proof, and the refutation round
  should attack it.
- **Mutual exclusion with §5:** a kind entry never carries a §5
  matching-rule comment claiming single-sense; nothing enforces
  prose, but the drafting convention says so.

### 4.4 Runtime cost of a link line

`gloss.js` carries zero per-frame work at rest, and its blur path
already treats focus moving INTO the panel as not-a-dismissal
(gloss.js:341 — the door deliberately left open). What does **not**
exist is Enter/Space moving focus into the panel, Escape returning
it, and a tab-order story for a panel parked at body end — real
additions, not tweaks. Scroll-closes stays (a dismissal, not a
1.4.13 failure). Under Q3's recommendation the link line does **not
ship**, so the runtime change is zero; the cost above is the price
list for the day the owner wants the link, not a bill this proposal
pays.

---

## 5. Reserved headwords — the EXCLUDED guard

Every C ruling above, plus every B family's reserved bare headword,
becomes a row in a machine-readable EXCLUDED map. Proposed shape: a
new small data file `html/_data/glossaryExcluded.js` —

```js
    module.exports = {
        // id: { reason, ruled } — one row per reserved bare headword.
        'coil': {
            reason: 'three senses; start-stop-commands:313 puts two '
                  + 'in one sentence; compounds pre-paid (dx, '
                  + 'freezestat, interposing-relay, inrush)',
            ruled: '2026-08-XX',
        },
        // …
    };
```

— kept separate from `glossary.js` because `glossaryGuard` iterates
`Object.keys(glossary)` and lints every key as an entry; a foreign
key inside the entries object would trip the shape lint or, worse,
require softening it.

**Menu:** (a) banner-only documentation — a §4 banner comment in
`glossary.js`, the §5 banner's sibling; (b) build-enforced — the
banner **plus** a `glossaryGuard` arm requiring that no id in the
EXCLUDED map also exists in `glossary`, and that every row carries a
non-empty reason and date.

**RECOMMENDED: (b), enforced.** Guards never decay is house
doctrine, and this family of mistakes is exactly a slow one: the
danger is not today's lanes but a drafting lane eighteen months from
now, holding the scoping note but not this ruling, shipping a bare
`reset` entry that passes every existing check (marking an excluded
id already fails via unknown-id, but **defining** one does not fail
anywhere today). The arm is ~10 lines inside the existing guard.
Anti-vacuity: the collision arm is self-probing (an EXCLUDED id that
gains an entry fails loudly), the shape lint covers the rest, and an
emptied map alongside recorded C rulings in the arc log is a
reviewable contradiction rather than a silent one. Rows for the
recommended mix: `coil`, `rtu` (bare token; `modbus-rtu` is the
entry), `static`, `head`, `reset`, `proof`, `lockout`, `floating`,
`differential`, `low-limit`, `high-limit`, `authority`,
`direct-acting`, `reverse-acting` — the lockout row carrying the
tagout hazard sentence, the direct/reverse-acting row carrying its
written re-open trigger.

---

## 6. Cross-cutting owner questions

**Q1 — panel register for a `kind` entry.** Options: a multi-sense
list; a fork-first paragraph; a minimal "varies — see the lesson"
line plus link. **Recommend fork-first paragraph** — the list
under-uses the one entry we have (two senses), the minimal line
wastes the tap (a reader who opened a panel wants a sentence, not a
referral slip), and fork-first is the register the site already
teaches in (`#which-sense` is a fork-first paragraph). See 4.2.

**Q2 — context-free vs context-keyed marks.** Could a mark carry a
context key (`data-gloss="coil" data-gloss-sense="modbus"`) so one
headword serves several senses? **Recommend AGAINST, firmly.** It
breaks the site's one markup contract —
`data-gloss="id"` ↔ `glossary[id]` ↔ `gloss-tip-<id>` is the public
triple the transform, the runtime, the guard and the docs all lean
on — and disposition B already sense-keys the honest way: distinct
entries with distinct ids and written matching rules. A second
attribute is a second thing the malformed-form arm must police and
the eleventh-tooltip creep's best friend (every "just this once"
sense fits in a key). The one temptation it served — marking bare
`coil`/`RTU` under a sense-scoped id — is exactly the
headword/trigger divergence 3.1 and 3.2 rule out.

**Q3 — the link line, stated honestly.** The panel is
`role="tooltip"` (`.eleventy.js:877`), and the ARIA tooltip pattern
carries **no interactive content**; `aria-describedby` flattens the
panel to a text string, so a no-JS screen-reader user would *hear*
the link's text but could never operate it — the described-by
relation is the entire no-JS story, and it cannot carry an anchor.
Options: **(a)** link-free def that names the lesson in plain text
("the Comparators & Deadband lesson draws this line"), no ARIA
deviation, zero runtime change; **(b)** ship the link and document
the deviation — sighted mouse/touch users get it, `focusin` keeps
the panel open for keyboard once focus management is added (§4.4's
price list), no-JS SR users hear inert text; **(c)** re-role kind
panels only — the trigger becomes a disclosure
(`aria-expanded`/`aria-controls`, no `role="tooltip"`), which makes
interactive content legitimate at the cost of two divergent trigger
semantics in one component. **Recommend (a)** — it is also the
standing owner ruling (D2, 2026-08-10: "definitions only — no
owning-lesson link inside the panel yet", structure kept
link-ready), so shipping the kind panel link-free extends a
precedent rather than spending a new decision. If the owner wants
the operable link later, (c) is the honest mechanism and (b) is the
cheap one; either revisits this section.

**Q4 — EXCLUDED enforcement.** See §5. **Recommend build-enforced.**

**Q5 — panel geometry.** The panel is `max-width: min(21rem,
calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow-y:
auto` (styles.css:1490-1492) — a taller disambiguation panel scrolls
rather than breaks. **Recommend keeping 21rem** — the fork-first
paragraph is prose-shaped and the plain panels' width fits it; a
wider kind panel would visually shout on phones where width is
already viewport-capped. Sense ceiling: **three senses in one
panel**, and in practice one fork — anything needing more is a
lesson wearing a tooltip's clothes, and the site already has the
page for that. The scroll cap is the safety net, not the plan.

**Q6 — trigger affordance.** **Recommend identical dotted underline
for kind and plain triggers; the panel differentiates.** The anchor
is the styles.css AFFORDANCE comment (:1427-1432): however quiet one
marker is, forty stripe a lesson — the control is marking density, a
curation policy, "never a louder or quieter style here." A second
trigger style would also leak the taxonomy into the prose: a reader
should tap because a term is unfamiliar, not triage two kinds of
underline first.

**Q7 — the per-family table.** The main ruling **is** §3's fourteen
checkbox lines; Q1–Q6 exist so those fourteen can be ruled without
re-litigating the machinery under each one. Two owner questions
routed out of the families for visibility: `balancing.html:497`'s
"floating-point input" (3.9 — field usage or copy defect?), and
`fail-to-start` as a standalone re-triage candidate (3.7).

---

## 7. Sizing

**Raw pool, re-derived at HEAD:** 2,534 in-scope occurrences across
the 14 families (sum of §3's headline counts, dew point at the
wrap-safe 177). For calibration only — §1's counting rule and the
per-family funnels are why this number must never be quoted bare.

**Recommended mix:** 13 new entries — 12 plain + 1 disambiguation —
taking `glossary.js` from 63 to 76:

| Entry | Family | Expected marks |
|---|---|---|
| `modbus-rtu` | 3.2 | 1–2 |
| `duct-static` | 3.3 | ~25–35 (lane est.) |
| `pump-head` | 3.4 | ~10–13 (lane-derived, owners-adjusted) |
| `head-pressure` | 3.4 | 3 |
| `dew-point` (plain, amended A) | 3.5 | ~30–50 (planning band — see below) |
| `apparatus-dew-point` | 3.5 | 0–1 |
| `proof-window` | 3.7 | 0–1 |
| `floating-actuator` | 3.9 | 1 |
| `deadband` (kind) | 3.10 | ~8–11 |
| `differential-pressure` | 3.11 | ~10–12 |
| `high-static-cutout` | 3.12 | ~2–3 |
| `mixed-air-low-limit` | 3.12 | ~3–4 |
| `valve-authority` | 3.13 | ~3–4 |

**Total expected marks: roughly 60–105**, on top of today's 369.
The `dew-point` band is the honest soft spot: the lane classified
the family's senses but did not reduce the ~140-occurrence moist-air
pool to a post-ruling residue, and its chrome fraction is the
tier's heaviest (a 13-occurrence page with zero markable prose), so
the figure is a planning band to be fixed by the marking lane's
per-page classification — the §5 process, which is what corrected
every earlier overshoot.

**Against the §5 heuristic:** raw ÷ ~10 (the measured §5 funnel:
~1,100 → 110) would predict ~250 marks from this pool. The expected
60–105 is a steeper cut — ÷ 25–40 — and the gap is exactly the
tier's character: four families take C outright; two families carry
~46 % pure markup noise (`data-flow-static`, `{% block head %}`);
and §4 owners-suppression runs at full strength, because a term only
becomes a collision by being taught in two places — the lane-2
structural finding, and the single most transferable lesson in this
inventory: *the pages that use a colliding term heavily are the
pages that teach it.*

**Bear case (every B collapses to C at ruling):** 1 entry
(`deadband`), ~8–11 marks, the component still gets built for it.
**Full-bear (A falls too):** zero entries, zero marks, no component,
`glossary.js:42`'s comment stands unedited, and the tier closes as a
recorded set of EXCLUDED rulings — which is a legitimate close, not
a failure: §8's default for this tier was always *no marking*.

---

## 8. Housekeeping rider (post-ruling PR — recorded for completeness)

Flagged 2026-08-20: of the six markless entries, three carry
entry-local annotations that explain the shape (`safety-string` and
`ak-factor` say "ZERO markable sites today — ships anyway" with a
future-page matching rule; `ui` explains its sense boundary) and
three do not: **`hoa`** (no leading comment at all,
glossary.js:660), **`enthalpy-changeover`** (:851 — comment covers
drafting care, not marklessness), **`glide`** (:1033 — same).
Post-ruling, annotate all three as markless-by-design with the
reason, or resolve otherwise — `glide` in particular is now
load-bearing for 3.5's refrigerant-sense pre-payment and deserves to
say so where the next drafting lane will read it.

---

## 9. Refutation appendix

### 9.1 Refutation ledger

*(Empty until the five-checker adversarial round runs on this draft.
Findings — applied or refuted, with the evidence — land here before
the PR opens. Attack-first suggestions from the writer: the
≥2-owners anti-vacuity proxy in 4.3; the dew-point plain-register
amendment in 3.5; the coil C against the note's conditional-B in
3.1; the 60–105 sizing band's dew-point soft spot in §7.)*

### 9.2 Condensed inventory

Counts re-derived at `7d5c97d` per §1's rule; "lean" is the lane's
disposition (confidence); "rec." is §3's recommendation.

| Family | In-scope | Site-wide | Senses | Lane lean | Rec. | Entries |
|---|---|---|---|---|---|---|
| coil | 898 | — | 3 | C (med) | **C** | — |
| RTU | 57 | — | 2 | B (med) | **B** | modbus-rtu |
| static | 459 | — | 4 + 2 non-senses | B (high) | **B** | duct-static |
| head / head pressure | 207 | — | 4 + 2 non-senses | B (high) | **B** | pump-head, head-pressure |
| dew point | 177 | — | 3 | A+B (med) | **A+B amended** | dew-point, apparatus-dew-point |
| reset | 245 | — | 5 + 3 non-senses | C (high) | **C** | — |
| proof | 206 | — | 2 registers | B (med) | **B** | proof-window |
| lockout | 7 | 48 | 3 | C (high) | **C** | — |
| floating | 38 | — | 5 | B (med) | **B** | floating-actuator |
| deadband | 76 | 302 | 5 | A (med) | **A** | deadband (kind) |
| differential | 30 | 57 | 5 | B (high) | **B** | differential-pressure |
| low/high-limit | 28 | 151 | 6+ referents | B (high) | **B** | high-static-cutout, mixed-air-low-limit |
| valve authority | 93 | 125 | 5 | B (high) | **B** | valve-authority |
| direct/reverse-acting | 13 | 36 | 2 | C (med) | **C** | — |

---

## 10. Closing summary

1. **The ask (§2, §3):** rule each of the 14 collision families
   A / B / C on the checkbox lines in §3. Every figure was
   re-derived at HEAD `7d5c97d`; the quotes are in the doc so the
   evidence outlives the session (§1).
2. **The recommended mix (§3, §7):** four exclusions — coil (3.1),
   reset (3.6), lockout (3.8), direct/reverse-acting (3.14); nine
   compound-splits yielding 12 plain entries; one true
   disambiguation entry — **deadband** (3.10). Net: 63 → 76 entries,
   roughly 60–105 new marks on top of today's 369.
3. **Two direction changes from the 2026-08-09 scoping note**, both
   measured rather than re-judged: coil's conditional-B collapses to
   C because its compounds got pre-paid and MIXED-RUN blocks the
   rest (3.1); direct/reverse-acting's A collapses to C because
   owners[] leaves it zero markable sites (3.14). Reset hardens from
   "either/or" to C on the `reset input` two-sense refutation (3.6).
4. **One reframing:** dew point ships A+B with the A-half **amended
   to a plain entry** — owners[] provably contains the refrigerant
   fork (page-disjoint senses; `glide` precedent), so no `kind`
   panel is needed there (3.5).
5. **The component (§4):** built only because deadband survives as
   A; minimal data shape (`kind` + `link` on the existing entry
   shape), fork-first register, amber-rule variant on the existing
   panel, guard arms including link-target resolution and an
   owners-count anti-vacuity proxy. Zero-A means no component and
   the `glossary.js:42` comment stands — a feature, not a gap.
6. **The guard (§5):** a build-enforced EXCLUDED map
   (`glossaryExcluded.js` + a `glossaryGuard` arm) so a reserved
   bare headword can never quietly gain an entry. Recommend
   enforced (Q4).
7. **The seven questions (§6):** fork-first register (Q1); no
   context-keyed marks (Q2); **no link line in the kind panel** —
   plain-text lesson naming, per the standing D2 ruling, with the
   ARIA cost of the alternatives stated honestly (Q3); enforced
   exclusions (Q4); keep 21rem, cap at three senses (Q5); identical
   trigger affordance (Q6); the ruling is §3's fourteen checkboxes
   (Q7).
8. **Two items routed to the owner beyond the rulings:**
   `balancing.html:497`'s "floating-point input" — probable copy
   defect vs field usage (3.9); `fail-to-start` as a standalone
   entry candidate at the re-triage (3.7). Plus the §8 housekeeping
   rider: annotate the three unannotated markless entries.
9. **Lane true-ups recorded (§1):** "385 total marks" → 372 raw /
   369 in pages / 57 ids; proof-window 17 → 18 raw (one
   comment-masked); wrap-safe counting moves dew point 174 → 177 and
   duct static 99 → 100.
10. **After the ruling:** the decision lands as a dated entry in
    `docs/glossary-arc.md`'s decision log; the EXCLUDED map, the
    entries and the marking lanes follow as separate PRs under the
    §5 process; §9.1 holds the refutation round's findings before
    this doc's PR opens.
