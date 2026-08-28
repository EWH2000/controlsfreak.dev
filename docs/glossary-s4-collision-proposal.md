# The §4 collision tier — disposition proposal

> **RATIFIED, 2026-08-20 — the owner has ruled; this block
> governs.** Ruling taken in-session (conversation, 2026-08-20),
> after PR #587 merged the refutation-hardened draft. Per the §8
> ratify-in-place pattern, the status blockquote below describes
> the draft when it was written and §3's checkbox lines record the
> menu as it was put to the owner; the two amended families carry
> ⟨marked⟩ in-place notes. The ruled table:
>
> - 3.1 coil — **C, as amended: the `contactor-coil` compound
>   option is TAKEN** (1–2 marks; motivated by the panel-free
>   electrical-quick-calc winding sites the refutation round
>   surfaced). Bare `coil` stays excluded.
> - 3.2 RTU — **B, as recommended** (`modbus-rtu`).
> - 3.3 static — **B, as recommended** (`duct-static`).
> - 3.4 head — **B, as recommended** (`head-pressure` only;
>   `pump-head` dropped).
> - 3.5 dew point — **A as amended, as recommended** (plain
>   register; apparatus folded into the closing clause).
> - 3.6 reset — **C, as recommended** (both menu options declined).
> - 3.7 proof — **B, as recommended** (`proof-window`).
> - 3.8 lockout — **C, as recommended.**
> - 3.9 floating — **B, as recommended** (`floating-actuator`).
> - 3.10 deadband — **A AS AMENDED: the plain geometric-register
>   entry**, chosen over the kind panel after the full breakdown
>   (the owner was initially leaning C; the deciding argument was
>   that the corpus shows one idea at two scales — his own lesson's
>   framing — and the width-convention disclosure fits a closing
>   clause). **Consequence, recorded explicitly: zero A survives ⇒
>   the disambiguation component is NOT built; §4 below stands as
>   the record of the unbuilt design and `glossary.js`'s CURATION
>   header keeps that record.** *(Cite de-pinned 2026-08-27: this
>   read "`glossary.js:42`'s deferral comment stays". PR #594's
>   §8-rider rewrote that header, so the line cite is stale and the
>   surviving text records a settled NOT-BUILT ruling with its
>   re-open triggers, not a deferral. The three later copies at
>   §§851 / 1063 / 1401 are left as written — this file's header
>   declares everything below the governing block a record of the
>   draft as it stood.)*
> - 3.11 differential — **B, as recommended**
>   (`differential-pressure`).
> - 3.12 low/high-limit — **B, as recommended**
>   (`high-static-cutout`, `mixed-air-low-limit`).
> - 3.13 valve authority — **C, as recommended** (the 0–1-mark B
>   declined).
> - 3.14 direct/reverse-acting — **C, as recommended** (the
>   two-armed re-open trigger stands).
>
> Cross-cutting: **Q4 RATIFIED — build-enforced at ENTRY
> DEFINITION**: the EXCLUDED map ships machine-readable as its own
> file, `html/_data/glossaryExcluded.js`, with the three-legged
> guard arm (non-empty once the tier ships, kebab lint,
> term-equality leg). *(Corrected 2026-08-27: this said the map
> ships "in `glossary.js`". It does not, and cannot — §5 gives the
> mechanical reason: `glossaryGuard` iterates
> `Object.keys(glossary)` and would lint every reserved headword as
> a malformed entry. Scope also pinned: the guard blocks a reserved
> id or `term`, not a reserved word appearing as trigger TEXT.)*
> **Q2 stands** and governs the B compounds'
> written matching rules. **Q1 / Q3 / Q5 / Q6 are MOOT** — zero A
> means no kind panel exists to register, link, size or style;
> closed by consequence, not left unanswered. **Q7** is the table
> above. By-catch rulings: the commanding-actuators:190 loop-action
> anchor retarget is **APPROVED** (rides the execution wave as a
> small live-page PR); the electrical-quick-calc coil sites are
> served by the new `contactor-coil` entry. Ruled mix: **11 plain
> entries, glossary 63 → 74, no component, expected ~45–75 marks.**
> The §8-rider execution items (the `glossary.js:40-43` header
> true-up, the EXCLUDED map + guard arm) belong to the EXECUTION
> PR, not this ratification — nothing outside `docs/` changes here.

> **Status: DRAFT — FOR OWNER RULING.** One recommendation per family,
> argued; the menu exists so the owner can overrule, not so this doc
> can hedge. The five-checker adversarial refutation round has run on
> this draft (2026-08-20: 7 BLOCKING, 23 SHOULD-FIX, 16 NIT, 22
> attacks CLEARED) — every finding was re-derived by the writer before
> application, and the full applied/refuted ledger is §9.1. Two
> findings partially refuted on re-derivation; everything else held.

## Provenance and method

- **Repo state:** HEAD `7d5c97d04eae5301e2789fd593e65d51c5fbe0fc`,
  clean tree, 2026-08-20. The four inventory lanes ran at `d32b6db`;
  `git diff d32b6db..7d5c97d` touches only `README.md`, `docs/*` and
  `tests/quiz-banks.spec.js` — nothing under `html/` moved, so lane
  cites carry. **Every figure and file:line printed in this document
  was re-derived at `7d5c97d`** by the proposal writer — first for
  the draft, then again for every refutation-round finding before it
  was applied; where a figure moved, the printed one is the
  re-derived one and §9.1 records the change.
- **Evidence base:** the completed 4-lane inventory fan-out over all
  14 §4 families (2026-08-20), then the 5-checker refutation round
  on the draft (exclusion-advocate, reader-value, cite-auditor,
  component-a11y, future-consumer seats). Both raw outputs live at
  **session-scoped** paths under the session scratchpad and will not
  outlive the session — per the handoffs-must-not-point-at-
  perishables rule, **the durable evidence is IN this document**: the
  exhibits, counts, pre-payment ledgers and the §9.1 refutation
  ledger are the record. Inventory lane assignments: lane 0 — coil,
  RTU; lane 1 — static, head/head-pressure, dew point; lane 2 —
  reset, proof, lockout, floating; lane 3 — deadband, differential,
  low/high-limit, valve authority, direct/reverse-acting.
- **Counting rule** (the `docs/glossary-arc.md` L91-116 precedent,
  stated in full): counts are **occurrences, not matching lines**,
  matched case-insensitively over **raw source** with hrefs and
  attribute values included, **whitespace-collapsed** so a multi-word
  stem matches across a line wrap, and every count is labelled with
  the surface class it is for. Counts that moved under the collapse
  clause when re-derived: *dew point* 174 → **177**, *duct static*
  99 → **100**, *static pressure* 14 → **15** (draft round);
  *low/high-limit* 28 → **29** in scope / 151 → **147** site-wide and
  *deadband constant* 4 → **6** (refutation round — both were
  line-bound artifacts of the writer's own re-checks; §9.1). The
  low/high-limit pattern, stated because three variants disagree:
  `(low|high)` + a **required** space/hyphen/underscore separator +
  `limit(s)` — underscore included so the BACnet `High_Limit` /
  `Low_Limit` properties count; the solid code-identifier forms
  (`lowLimit`, `lowlimits`, 6 site-wide) sit outside it by design.
- **Marking scope** (SWEEP-SCOPE, inherited and extended): this tier
  inherits the §5 banner's SWEEP-SCOPE ruling — marks land on
  education / tools / guides / landings **prose only**; simulator
  pages and deep practice pages are out per the banner's own text,
  and quiz banks and scripts are out on the same ground (the §7.2
  ruling defers them to the future quiz-engine component lane) — all
  four are sense evidence, never mark sites, until §7.2 opens.
  In-scope file set: **82 files** — 40 `html/education/*.html` (minus
  index), 32 `html/tools/*.html` (minus index), 5 guides
  (`html/guides/index.html` + the four topic hubs), 5 landings
  (`html/index.html` + the education / tools / simulators / practice
  indexes).
- **Mark-state baseline, re-derived at HEAD:** 63 glossary entries;
  **369 marks in pages** (372 raw matches under `html/`, of which 3
  are documentation-header examples of `sr-latch` in `glossary.js`,
  `gloss.js` and `styles.css`); **57 distinct marked ids**; 6
  markless entries (`hoa`, `enthalpy-changeover`, `glide`, `ui`,
  `safety-string`, `ak-factor`). One inventory-lane note claimed
  "385 total marks" — wrong, corrected here. No §4 headword or
  compound has an entry or a mark anywhere.

### Index

1. Provenance and method (above)
2. The ruling menu
3. Per-family dispositions (3.1–3.14)
4. The disambiguation component
5. Reserved headwords — the EXCLUDED guard
6. Cross-cutting questions Q1–Q7
7. Sizing
8. Housekeeping rider
9. Refutation ledger + condensed inventory
10. Closing summary

---

## 2. The ruling menu

Three dispositions, defined once. A family's checkbox line in §3
refers to these; **A+B is combinable** in one family (dew point is
the live case). The `as amended:` blank is where a variant gets
written — several recommendations below use it.

- **A — bare-headword disambiguation entry.** The bare word gets an
  entry with `kind: 'disambiguation'`: a visibly distinct panel that
  names the fork rather than defining one sense, and carries the
  site's canonical disambiguation page as a guard-resolved data
  field — rendered as an inert lesson naming per Q3's
  recommendation, with the operable link deferred per the D2
  precedent. This is the shape §8's ratified rule demands for a §4
  term that gets marked at all ("treat a request to gloss a §4 term
  as a request to write a disambiguation entry, never a
  definition"). Component design: §4 of this doc.
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
line rather than in a fourth menu letter: a bare headword can ship
as a **plain** entry in the §5 register — the fork named in a
closing clause instead of a `kind` panel — when measurement shows
the collision is already dead on the marking surface by either of
two routes: **containment** (every rival-sense occurrence sits on
pages that teach it, so owners[] suppression is doing the
disambiguation — dew point, 3.5) or **sense-compatibility** (every
surviving markable site reads correctly under one def written at the
senses' shared abstraction — the deadband option, 3.10). The
refutation round's exclusion advocate surfaced the second route; the
first draft priced only the first. Note both routes amend the
ratified §8 rule's letter for that family — §8 of this doc schedules
the dated-amendment bookkeeping if the owner takes one.

---

## 3. Per-family dispositions

Format per family: evidence summary (counts labelled by surface
class), senses, one to three verbatim exhibits re-derived at HEAD,
compound candidates with existing-entry overlap, hazards, one
RECOMMENDED disposition with the argument, and the owner's ruling
line. "Lane estimate" marks a figure derived from a lane's hand
classification (re-derivable from its stated protocol, not from a
single grep); everything unlabelled is a re-derived grep count.

**The ≤2-mark basket, named once.** Several B entries below survive
at **two or fewer expected marks** (`modbus-rtu`, `proof-window`,
`floating-actuator`, `high-static-cutout`, `mixed-air-low-limit`,
plus the menu options `manual-reset`, `contactor-coil` and
`pump-head`). Their common secondary justification — the palette /
quiz-engine / JSON-LD consumers named in `glossary.js`'s header — is
a **scheduled future, not a present consumer**: nothing outside the
gloss transform, the guard and `tests/gloss.spec.js` reads the file
today. The §7.2 quiz-bank lane (owner-ruled IN scope 2026-08-12,
sequenced immediately after this tier) is the first real second
surface, and it is why a thin plain entry can still be worth
banking. Every basket member's ruling line is where the owner
accepts or declines that trade — this paragraph exists so the trade
is priced once, honestly, instead of implied eight times.

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
  defines the Modbus sense **by** the winding sense.

**Compounds and pre-payment.** The decisive structural finding: the
string `Modbus coil` occurs **zero** times site-wide, so the one
compound that could key the Modbus sense has no trigger text
anywhere. `contactor coil` (12) is pre-paid twice over:
`interposing-relay`'s def carries "a contactor coil's inductive
draw" and is **already marked immediately left of the word** at
`html/tools/transformer-sizing.html:153`; `inrush`'s def carries "a
coil or motor first energizes". `DX coil` is pre-paid by `dx` ("A DX
coil is that evaporator"), marked beside the word at
`html/tools/equipment-airflow.html:31`. `freezestat`'s def owns the
coil-face/coil-freeze ground. The heat-exchange compounds are the
trade's default reading and are taught in place.

**The residue, restated on the true count** (refutation round — the
draft's "exactly one clean residual mark site" was **false**). The
clean residual sites are **three, on two pages**:

- `html/education/bacnet-vs-modbus.html:133` — "If two masters fight
  over a coil…" (Modbus sense; the page's :33 self-defined the term
  earlier — "coils and discrete inputs (single bits)").
- `html/tools/electrical-quick-calc.html:114` — "a relay coil
  measures **R = 4 Ω**…" and `:121` — "So the coil draws 3 A …
  sanity-check that against the coil's wattage rating" — winding-
  sense worked-example prose on a page that carries **zero gloss
  marks** (re-derived), so no `interposing-relay`/`inrush` panel
  reaches it. The draft's "every one adjacent to an existing panel"
  was wrong about exactly this page. (:114 carries the compound
  `relay coil`; :121 is anaphoric bare `coil`.)

The remaining winding-leg residue after owners[] on
start-stop-commands + controller-wiring sits adjacent to existing
panels as originally stated; the Modbus-leg residue beyond :133 is
MIXED-RUN-blocked (`discrete-input` has no entry while
`holding-register` / `input-register` are already buttoned in the
same enumerations) and self-defining in place.

**RECOMMENDED: C** — exclude the family, now argued on the true
residue: three marginal sites against an 898-occurrence three-sense
homograph is still the DPBV shape, and the one compound-keyed
alternative is priced here so the owner declines it knowingly
rather than by omission: a `contactor-coil` entry (term "contactor /
relay coil", owners[] = start-stop-commands + controller-wiring +
electrical-quick-calc-or-not) would yield **1–2 marks**, essentially
electrical-quick-calc:114 — an Ohm's-law worked example where the
reader's task is arithmetic, not vocabulary. The C also still
stands on the note-to-C direction change argued in the first draft:
SWEEP-SCOPE voided the note's bank volume, owners[] + MIXED-RUN
empty the Modbus leg, and the contactor compound was pre-paid
between the note and now. Record start-stop-commands:313 as the
standing exhibit for why no walker may ever touch this word.

Ruling: `[ ] A  [ ] B  [x] C, as amended` ⟨RULED 2026-08-20 — C on
bare `coil`, AND the priced `contactor-coil` compound option TAKEN
at 1–2 marks; see the ratification block⟩

### 3.2 RTU

**Evidence.** 57 raw in-scope occurrences across 11 files (edu 45,
tools 6, guides 3, landings 3); 30 prose. Two senses with **no
shared abstraction**: packaged rooftop unit (38 raw / 17 prose) and
Modbus RTU serial framing (19 raw / 13 prose). `Modbus RTU` as a
collocation: **10 in scope**. Zero simulator occurrences.

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
unmarkable on **two independent grounds**, verified in
`html/_includes/nav-card.njk`: the macro wraps the whole card in one
`<a>` (ANCHORED-LINK) and renders `{{ opts.desc }}` autoescaped.
`packaged RTU` / `RTU-N` add nothing (owner-page or
SVG/NAME-REFERENCE).

**RECOMMENDED: B, narrowed** — one entry, id `modbus-rtu`, matching
rule pinned to the **collocation** `Modbus RTU` only, owners[] =
modbus-basics + modbus-functions; the rooftop leg gets a recorded
exclusion in the §5-banner style. This narrows the inventory lane's
B, which entertained firing the entry on the **bare** token at
`bacnet-vs-modbus.html:112` ("RTU / ASCII (RS-485 serial), TCP") — I
rule that site out on two grounds: it is a MIXED-RUN (`ascii` and
`tcp` have no entries), and bare `RTU` is a **sense-ambiguous
token**, which is what Q2's restated rule actually forbids (see Q2 —
the refutation round corrected the draft's broader
headword/trigger-divergence framing, which live house practice
contradicts). Honest yield: **1–2 marks** (vfds:576 certainly;
vfds:567's `<td>Modbus RTU</td>` name cell is a marking-lane
judgment call — table-cell marks are precedented, per the
refutation round's check of five existing `<td>` marks
*(corrected 2026-08-21, execution-round mechanical audit: the
measured figure is seven marks across six cells; the precedent
claim stands either way)*;
modbus-decoding:409 is a NAME-REFERENCE). A ≤2-mark-basket member —
the trade is priced in §3's preamble.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.3 static

**Evidence.** 459 raw in-scope occurrences (edu 402, tools 33,
guides 13, landings 11 — the draft's "landings 24 / guides 0"
misallocated the topic hubs against §1's own class definitions;
corrected) — and **46 % of that is one markup attribute**: 213 are
`data-flow-static` (the flowStaticGuard assertion), 38 are the
string `duct-static-control` in hrefs/frontmatter, and 38 are the
ordinary-English "not animated" homograph, which sits **100 % inside
HTML/CSS/JS comments** — zero reader-facing occurrences.
Pressure-sense residue: ~170, split ~159 duct/air-side, 6 static
head/lift, 3 building static, 2 **pitot-sense bare `static`** (the
draft's "pitot-static: 2" named a compound that occurs zero times
site-wide; renamed).

**Exhibits (re-derived).**

- `html/education/building-pressure.html:515-516` — the site's own
  disambiguation callout: "**Not the same pressure** · building
  static ≠ duct static … The classic conflation, worth killing on
  sight…" Better than any panel could be — and on the page that
  would own the entry, so a panel can never appear beside it.
- `html/tools/affinity-laws.html:85` — "head (ft) for pumps, static
  pressure (in. w.c.) for fans" — the static and head families
  **entangled in one sentence** of markable `p.ref-note` prose.

**Compounds and pre-payment.** `duct static` (incl. `duct-static`
and `duct static pressure`): **100** in scope, of which 38 are the
URL/page-name string → **62 term-of-trade occurrences**. But the
refutation round killed the draft's ~25–35 mark estimate
(BLOCKING): the owner page holds 16 of the compound's occurrences,
and the off-owner pool collapses under the rulings (h3s, SVG,
navCards, keywords, anchor-wrapped uses like duct-sizer:117's
`static setpoint` inside an `<a>` to the owner lesson). The
enumerable markable sites (checker enumeration, spot-verified by the
writer): analog-sensing:55, vav-systems:148/:606,
forced-air/index:21 (the `.landing-intro`),
air-unit-identification:335 (×2), air-balancing:212,
controls-commissioning:139 — **yield ~8–12**. Still the tier's
highest-yield compound entry, but a mid-single-digits-to-low-teens
entry, not a volume anchor. `building static`: 3, all on its
teacher. Pitot-sense static: 2, pre-paid by `velocity-pressure`
("total minus static at the probe"). `static head/lift`: 6 — routed
to the head family (3.4). `high-static`: 10 tokens, routed to 3.12.

**RECOMMENDED: B** — ship `duct-static` (term "duct static
pressure"; matching rule: the `duct static` collocation plus the
derived collocations `static setpoint` / `static reset` where the
referent is the duct loop — never bare `static`), with one **def
constraint** added at the refutation round's demand (the family's
core reader hazard was unaddressed): the def's closing clause names
the building-static fork with the order-of-magnitude contrast —
whole inches vs a few hundredths — and names the Building Pressure
lesson in plain text per the Q3/D2 link-free precedent, because
every mark this entry earns lands on a page **without** the :515
callout. Reserve bare `static` in the EXCLUDED map; route
`high-static` to 3.12; fold static head into 3.4's menu. Do not
ship a markless `building static` entry (all three occurrences on
its teacher; no roadmap page needs it) — record it as a re-open
trigger instead.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.4 head / head pressure

**Evidence.** 207 raw in-scope occurrences — and **46 % can never be
the term of trade**: 53 are `{% block head %}`, 36 are CSS
class/selector forms, 6 are JS identifiers, 13 are ordinary English
**that reaches reader-facing prose** ("hold it in your head") — the
opposite structural exposure from static's comment-buried homograph.
Term-of-trade residue: ~83 hydronic head vs **5** refrigerant head
pressure, plus 7 sensor-head (device noun), 2 head end.

**Exhibits (re-derived).**

- `html/hydronics/index.html:21` ("the pump head and speed…") vs
  `html/refrigeration/index.html:21` ("the suction and head
  pressures…") — **sibling hub landing-intros, structurally parallel
  sentences, opposite senses, and both lines already carry live
  gloss marks** (`cv`; `superheat`/`subcooling`), so these are
  markable prose, not chrome.
- `html/education/refrigerant-cycle-basics.html:47` — "a
  head-pressure trip" **undefined in the page-intro**, on a page
  that then teaches the quantity as "discharge pressure" / "high
  side" (:75/:79) and never connects the names. A panel here is
  purely additive and shadows nothing.

**Compounds and pre-payment.** `head end` is **already marked** via
`front-end` at `html/education/bacnet-vs-modbus.html:147`; both
hyphenated `dead-head`s are already marked via `deadhead`
(`load-piping.html:653/:858`). `ft of head` / `ft head`: 6
occurrences — **5 JS comments plus one markable prose site**,
`tools/affinity-laws.html:122` ("…100 GPM, 50 ft head, 10 bhp", a
`p.ref-note` worked-example intro with no units span) — the draft's
"all 6 unmarkable (JS comments + one UNITS-SPAN)" was wrong on both
halves (refutation round). `velocity head`: zero site-wide. `sensor
head` is a device noun. `head pressure` has **no owner page** — the
sense is taught nowhere under that name — so all 3 markable sites
survive.

**The pump-head collapse (refutation round, BLOCKING).** The draft
estimated ~10–13 marks for a `pump-head` entry without stating its
matching rule. Stated and measured: the literal collocation
`pump head` occurs 6 times in scope — and off the owner
(pump-control.html) the sites are `load-piping.html:616` and `:845`
(**both inside HTML comments** — the inventory lane misfiled them
as prose), `:1037` (a JS string literal), and
`hydronics/index.html:21` — **one markable site**. Reaching double
digits required marking bare hydronic `head`, the sense-ambiguous
token the family's own EXCLUDED reservation forbids.

**RECOMMENDED: B for `head-pressure` alone** — owners `[]` (the
zero-definition stall shape the ratified §8 amendment brought into
scope; expected marks: refrigerant-cycle-basics:47,
superheat-subcooling:176, refrigeration/index:21 — the single best
additive opportunity in the tier). **`pump-head` moves to the
amendment menu, recommended dropped**: at one mark under the honest
rule, the hydronic half of the family takes C — bare `head` stays
reserved, `deadhead` / `front-end` / `velocity-pressure` /
`installed-characteristic` already hold the surrounding ground, and
the hydronic prose (pump-control, load-piping, affinity-laws)
teaches in place. Menu options priced: keep `pump-head` at 1 mark
(hydronics/index:21); or widen its rule to admit the unit
collocation (`N ft head`), adding affinity-laws:122 for 2. The
draft's two-entry recommendation is withdrawn on the measured
yield, not on the concept.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.5 dew point

**Evidence.** **177** raw in-scope occurrences (wrap-safe), tools 81
+ edu ~73 + landings 23. Three senses: moist-air (~140 — the trade's
dominant reading here), refrigerant blend dew (~17, page-disjoint
from the moist-air sense on the marking surface), apparatus dew
point (**9**, not page-disjoint). Chrome is heavy: 14 `<option>`
captions, **4 units-span labels** (8 attribute copies + rendered
text ≈ 12 raw tokens — the draft's "8 UNITS-SPAN label interiors"
restated at the span level), **23 navCard-arg occurrences** (the
draft's 29 exceeded the 10 navCard-calling pages' total; corrected);
`tools/air-mixing.html` carries 13 occurrences and **zero markable
prose**.

**Exhibits (re-derived).**

- `html/education/psychrometrics-basics.html:178` — "The cooling
  coil dips below the entering dew point … bends
  down-and-to-the-left toward the coil's apparatus dew point." The
  air's property and the coil's property **in one sentence-pair, 30
  words apart**, on the page that owns the moist-air definition.
- `html/tools/refrigerant-pt.html:143-145` and `:268-274` — the
  bubble/dew teaching beats. A moist-air def is flat wrong here —
  and worse: the shipped `glide` and `superheat` entries **already
  define the refrigerant dew sense**, so a moist-air panel on these
  pages would contradict two live sibling panels.

**Compounds and pre-payment.** `apparatus dew point`: 9,
single-sense, no overlap, 6 markable — but its one expected mark,
`coil-sizing.html:314`, is an appositive that names the concept in
place ("the leaving point lands on the saturation curve — the
coil's apparatus dew point") inside a `<li>` already carrying four
gloss buttons — the self-defining-in-place shape this doc uses to
exclude sites in 3.1, 3.11 and 3.13 (refutation round). The
refrigerant sense is fully pre-paid by `glide` (markless, owners =
exactly the three refrigerant teach pages) and by
`superheat`/`subcooling` naming their reference ends. `ADP`: zero
site-wide.

**RECOMMENDED: A amended to the plain register, with the apparatus
compound folded into it** (revised — the draft shipped
`apparatus-dew-point` as a separate B entry; the refutation round's
consistency check against 3.14's markless-entry standard, plus the
appositive above, flips it to a fold, with the keep-option priced on
the ruling line). One entry: bare `dew-point`, **plain** — *not* a
`kind: 'disambiguation'` panel — defining the moist-air property,
with a closing clause naming **both** forks (the blend's
bubble/dew, and the apparatus dew point as the coil-side variant).

The amendment's ground, **scoped honestly** (refutation round,
BLOCKING — the draft presented this unscoped): the refrigerant
sense is page-disjoint and its three teach pages go in owners[], so
the collision is contained **on today's marking surface — the
page-prose transform, where owners[] suppression exists**. That
containment does NOT extend to the §7.2 quiz-bank lane (owner-ruled
IN scope 2026-08-12, sequenced next), where owners[] has no
mechanism and the blend sense is live in bank text today
(`quizzes/refrigerant-cycle-basics.js:114` "a range (bubble point
to dew point)", `:121` — re-derived). Three consequences, written
into the entry's contract:

- The **written matching rule travels to every future surface**:
  never mark `dew-point` in refrigerant-blend context — banks
  included when the §7.2 component lands — and never inside the
  `apparatus dew point` compound.
- The built-in mitigation is stated: the closing clause names both
  forks, so a future mis-mark degrades to imprecise rather than
  flatly wrong.
- The fallback is named: if the §7.2 lane finds bare-headword
  curation unmanageable there, the `kind` panel remains what the
  un-amended A would have bought.

**owners[], with each path's ground stated** (refutation round —
owners[] means "pages that TEACH this term", and parking
rival-sense pages there without saying why inverts the recorded
semantics; the entry-leading comment must carry the split):

- *Teach this def (moist-air):* psychrometrics-basics,
  dew-point-calculator, **dedicated-outdoor-air** (added — its
  :187-190 teaches the condensation mechanic in earnest and anchors
  the calculator; the draft omitted it).
- *Rival-sense containment (teach the blend sense; a moist-air
  panel would contradict their own `glide`/`superheat` panels):*
  refrigerant-pt, superheat-subcooling, refrigerant-cycle-basics.

Expected marks: **~20–40** (planning band, narrowed from the
draft's ~30–50 by the DOAS suppression and the corrected chrome
split; still the marking lane's to fix per the §5 process).

Ruling: `[ ] A  [ ] B  [ ] A+B  [ ] C  [ ] as amended: ____________`
*(the recommendation = "A as amended: plain register, apparatus
folded"; "A+B" is the checkbox for keeping `apparatus-dew-point` as
its own 0–1-mark entry)*

### 3.6 reset

**Evidence.** 245 raw in-scope occurrences across **27 files** (edu
193, landings 26, tools 21, guides 5 — the draft said 28 files; the
refutation round's file-count correction holds, its 247/edu-195
recount does not reproduce under §1's rule and is recorded refuted
in §9.1). **Eight** sense-classes: setpoint-reset schedules (R1,
dominant), PID integral (R2), the SR latch's R input (R3),
fault/manual reset (R4), timer ET reset (R5), UI chrome (R6),
ordinary English (R7), code homographs (R8).

**Exhibits (re-derived).**

- `html/education/controls-commissioning.html:128` — "Drive a reset
  input across its range…" (R1: the OAT input to a schedule) against
  `html/education/timers-and-delays.html:255` — "a reset input
  waits on the latch's R for a human" (R3: the latch pin). **The
  identical two-word collocation, opposite senses, two in-scope
  lessons in one chapter.** This refutes B outright.
- `html/tools/duct-sizer.html:117` — "resetting expectations on the
  static setpoint" — ordinary English **immediately before an anchor
  to the static-reset lesson**: the false positive is not
  hypothetical.
- Evidence-side, the site's own code already dodges the word
  (`function-block-editor.html:243`'s `Rst Slope` comment).

**Compounds and pre-payment — corrected.** The draft's "manual
reset is fully pre-paid; freezestat's owners[] are precisely the
three pages the compound lives on" was **false** (refutation round,
BLOCKING): the compound lives on **six** pages (7 occurrences —
start-stop-commands ×2, boolean-logic-latches, coil-freeze-risk,
reading-a-wiresheet, duct-static-control, timers-and-delays;
re-derived), freezestat's owners[] covers the first three, and of
the rest reading-a-wiresheet:200 is an `<h3>` while
**duct-static-control:469 and timers-and-delays:386 are clean
markable prose on pages that carry no freezestat panel at all**
(re-derived: neither page is in the freezestat mark set). `reset
(integral)` has two carriers and both teach it. `reset schedule`
(23) survives owners[] at exactly one site — and the refutation
round settled its true worth: `function-blocks.html:299` reads "a
reset schedule **(sliding a setpoint with outdoor temperature)**" —
an inline appositive definition, so a mark there shadows the page's
own teaching beat and the honest yield is **zero**.

**RECOMMENDED: C** — and the corrected facts cut both ways, so both
are printed. The C *hardens* on reset-schedule (its "one mark" was
really zero — there is no defensible reset-schedule amendment). It
*softens* on manual-reset, which now has a real amendment case the
owner should see: a `manual-reset` entry (matching rule: the
hyphenated-or-spaced compound only, never bare `reset`; owners[] =
freezestat's three pages ∪ boolean-logic-latches) yielding **~2
marks** (duct-static-control:469, timers-and-delays:386), def
complementing — never restating — `freezestat`'s "a trip stays
tripped until a person finds out why." The recommendation stays C
because two marks do not outweigh reopening the site's worst
homograph family, and both surviving sentences already explain the
idiom in their own clause ("…so a human has to come find out why")
— but the menu is now honest. EXCLUDED row names the `reset input`
collision and the duct-sizer near-miss.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.7 proof / proven / proof window

**Evidence.** 206 raw in-scope occurrences across ~29 files;
concentration extreme (status-and-proof 50 + timers-and-delays 48 +
controls-commissioning 20 = 57 % of the pool). Two registers, not
two technical senses: the device noun vs ordinary evidentiary
English.

**Exhibits (re-derived).**

- `html/education/controls-commissioning.html:136` — `<h2>` "Trend
  logs — proof over time", on a page whose 20 occurrences run
  **18-to-2 ordinary-vs-device** (lane full read). A device-sense
  panel would be wrong on 90 % of a page already carrying 18 gloss
  buttons.
- `html/education/controls-commissioning.html:143` — "…has proven
  the plumbing; the trends are what prove the *sequence*."

**Compounds and pre-payment.** `proof window`: **18 raw in scope**
(one comment-masked hyphenated form at `timers-and-delays.html:420`,
so 17 renderable), single-sense, the only unpaid teachable compound
— no shipped def carries the phrase (re-derived; the `glide`
cross-reference precedent does not apply). After owners[]
(status-and-proof + timers-and-delays) it survives at **one** site,
`reading-a-wiresheet.html:234`, whose sentence already anchors the
owning lesson three words earlier — a reasonable reader calls the
yield zero. `proof of flow` (9) is pre-paid by `interlock` and
`bi`.

**RECOMMENDED: B — one entry, `proof-window`, at an honest 0–1
marks — with the distinction from 3.14's rejected markless shape
stated rather than assumed** (the refutation round demanded it):
this is a **plain** entry needing no component, whose matching rule
pins a two-word collocation with no bare-form risk, and whose
term appears **15 times across four banks** on the §7.2 surface the
owner has already ruled into scope — a scheduled second surface,
not a hoped-for one. 3.14's entry, by contrast, would need the
`kind` component built to render it, and its fork is already
disclosed in prose at the teach moment. If the owner reads the
0–1-mark yield as not worth banking even so, the C option is a
clean EXCLUDED row (device-noun register; teach pages own every
site; bare forms barred) — the ruling line decides. Bare `proof` is
a hard EXCLUDED row either way.

Separately: **`fail-to-start` — 14 in scope / 21 site-wide**
(re-derived; the draft's 6 was wrong) — remains routed to the
re-triage as its own candidate, with its funnel stated honestly:
the raw number strengthens the case, the markable one weakens it
(post-owners residue ≈ 1 prose site + 3 navCard args;
status-and-proof:177 self-defines — "that is a **fail-to-start**:
the controller alarms…"), so its case is the §7.2 consumer surface,
not page marks.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.8 lockout / locked out

**Evidence.** **7** raw in-scope occurrences (verb forms included;
48 site-wide). The thinnest family by an order of magnitude; the
multi-sense mass is entirely evidence-side (30 occurrences on
simulator surfaces). Of the 7: one keywords line, two JS-painted
strings, one owner-page teach beat, one tagout hard-exclude — **two
markable sites remain**.

**Exhibits (re-derived, geometry corrected per the refutation
round — the draft's "within one word" was false at both sites).**

- `html/education/start-stop-commands.html:220` — "…though an HOA in
  Off is *not* lockout/tagout; the starter's line side is still hot,
  and nothing about a selector switch protects anyone working
  inside." The hard-exclude: a safety sentence whose entire content
  is a **negation**, on a page where the marking lane is
  demonstrably active.
- `html/education/temperature-sensors.html:73` — "…quietly skews
  economizer changeovers and lockouts for years" — **a live
  `economizer` panel in the same phrase** (three words ahead of
  "lockouts"), while the shipped `oat` def already contains
  "low-ambient lockouts".
- `html/education/vav-systems.html:508` — "a stage locks out rather
  than run starved — the interlock chooses…" — **a live `interlock`
  panel in the same sentence** (five words after "locks out"), whose
  def covers the idea.

**RECOMMENDED: C** — at HEAD this is not a collision family in
marking scope; it is a **hazard family**. Both surviving sites sit
in the same sentence as a correct, already-shipped panel, so an
entry would ship for two sites the reader can already resolve
without it. One supporting claim from the draft is withdrawn as
mechanically false (refutation round): owners[] **can** anchor on
simulator pages — they carry canonicals and resolve in both the
guard and the spec arm — so "no owners[] anchor" was wrong; the C
stands on the marks side (zero unpaid markable sites), not on guard
mechanics. The EXCLUDED row must name the tagout hazard explicitly:
*never mark any occurrence adjacent to "tagout".* Note for
whichever ruling lands: `economizers.html:219`'s "high-limit
lockout" phrase contains two reserved §4 headwords; the `economizer`
entry already carries the recorded resolution
(glossary.js:832-835).

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.9 floating

**Evidence.** 38 raw in-scope occurrences — the highest
sense-density-per-occurrence in the tier: tri-state actuation (13,
incl. landings), IEEE-754 floating point (15), electrically floating
(4), physical buoyancy (2), layout/code homograph (4). Per-sense
counts are exact.

**Exhibits (re-derived).**

- `html/education/controller-wiring.html:243` — "They're common for
  driving floating/tristate actuators … but a triac … isn't a
  floating, isolated contact…" — **two senses doing opposite work
  about the same device, ~30 words apart, in one in-scope lesson
  sentence.**
- `html/tools/minimum-outdoor-air.html:210-211` — "Warm air from the
  same diffuser floats, hugs the ceiling…" — buoyancy on a tools
  page; any technical panel here is absurd, which settles A.
- `html/education/balancing.html:497` — "analog or floating-point
  input, 0–100 % open" — **the tri-state sense written as the
  IEEE-754 compound**; flagged to the owner below as a probable copy
  defect independent of the ruling.

**RECOMMENDED: B** — one entry, id `floating-actuator`, term
"floating (tri-state) actuator", owners[] =
`['/education/commanding-actuators.html']`, matching rule pinning
the actuator collocation and explicitly barring bare `floating` /
`float`, `floating-point`, `floating common`, and any use whose
head noun is a conductor, a value, or air. Yield after owners[]:
**one mark** — controller-wiring:243, the collision sentence
itself, the best possible mark in the family because it resolves
the reader's exact confusion at the one place the site creates it;
the trigger wraps the full "floating/tristate actuators" phrase.
**Owner question (routed):** `balancing.html:497` — field usage
you'd stand behind, or a copy defect to fix? The page carries zero
gloss marks today.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.10 deadband

**Evidence.** 76 raw in-scope occurrences (edu 69, landings 7, tools
0 in raw source — the BACnet property renders from `bacnetEnums.js`
into bacnet-objects.html and its JSON-LD, invisible to a raw tools
grep); 302 site-wide. The pool collapses hard: 33 of 76 are the page
name "Comparators & Deadband" or its slug, 26 sit on the owning
lesson. `deadband constant`: **6 raw** (wrap-safe; 2 each on
comparators-and-deadband / reading-a-wiresheet /
setpoint-math-reset, two of the six in SVG `<desc>`) — the draft's
"4, three on one page" was wrong on both halves (refutation round).

**Exhibits (re-derived).**

- `html/education/comparators-and-deadband.html:420-425` — ":420 the
  DB constant here is *half* the band … :423-425 Vendors split on
  this. Some deadband parameters mean the full width, some the half;
  copy a value between platforms without checking and you've
  silently doubled or halved the band." The site runs **both
  arithmetic conventions live** (this lesson and
  setpoint-math-reset:67 half-band; CLAUDE.md's house-usage block
  and `ddcw-ahu-unit.js` full-width). **Any def that states the
  arithmetic contradicts one half of the site.**
- `:475-477` (the `#which-sense` paragraph, anchor at :468) — the
  canonical disambiguation, including the zone sense *named as
  differential*.
- `html/_data/bacnetEnums.js:101` — property 25 `Deadband`,
  dual-consumer unmarkable, a fifth referent for the word.

**The choice this family carries — stated in full, because this one
checkbox decides whether the §4 component gets built at all.** Two
honest shapes survived the refutation round; the owner rules:

**Option A (the draft's recommendation): the tier's one true
`kind: 'disambiguation'` entry.** Fork-first register — a band
around one switching decision, or the deliberate gap between two
staging thresholds; read the values the number lives between, not
the label — naming the canonical page. Grounds: §8's ratified
letter ("a disambiguation entry, never a definition"); deadband is
the scoping record's documented exemplar; and the width-convention
trap means the panel must warn regardless, which is the kind
register's native job.

**Option A-as-amended (the exclusion advocate's case, priced
honestly): a plain entry in the geometric register.** Every
markable surviving site is S1 or S2 — "the same geometric idea at
two scales, which is exactly the connection
comparators-and-deadband:450 draws in prose" — so one def written
at that shared abstraction ("a deliberate gap between the threshold
that acts and the threshold that releases, so the decision doesn't
chatter") is *true at every surviving site*, with a closing clause
disclosing the width convention and naming the lesson. This is the
sense-compatibility route §2 now names. It reads naturally at every
site a fork-first panel would tax with a warning the site's context
has already resolved.

Both options carry the same two hard def constraints: **never state
the arithmetic** (both width conventions are live and correct), and
**never claim the zone setpoint-separation sense** (the site files
that under *differential*; its in-scope deadband count is zero). B
is unavailable (no compound has yield); C throws away the term the
site thought was worth a whole lesson and a `#which-sense` anchor.

**Yield, reconciled against the owners union** (the draft's ~8–11
never subtracted the extra owner pages — refutation round): with
owners[] = comparators-and-deadband + function-blocks +
timers-and-delays + equipment-staging (the S1/S2 teach set;
**bacnet-objects is dropped** — its raw source carries zero
`deadband` tokens, so it is a padding owner that could never
suppress anything), the extra three pages remove 18 more raw
occurrences and the honest band is **~4–7 marks** — lower still if
setpoint-math-reset (worked edge arithmetic + anchor) and
reading-a-wiresheet ("Band-edge cluster · the deadband" section)
are read as the de facto teach pages they resemble.

**RECOMMENDED: A** — by a hair, on §8's letter and on the
width-trap-wants-a-warning argument — with A-as-amended fully
priced above as the equally defensible reading of the same
evidence. **Ruling-line consequence, stated plainly: A-as-amended
or C here means zero `kind` entries survive anywhere, so the §4
component does not get built and `glossary.js:42`'s comment stands —
the outcome §4 below already calls a feature, not a gap.**

Ruling: `[ ] A  [x] A as amended (plain, geometric register)
[ ] B  [ ] C` ⟨RULED 2026-08-20 — the plain geometric-register
entry; zero A survives, the component is not built; see the
ratification block⟩

### 3.11 differential

**Evidence.** 30 raw in-scope occurrences (edu 27, guides 3) — and
**22 of the 30 are the single-sense compound `differential
pressure`** (incl. `differential transducer`; the draft said 21 —
corrected). The 8-token residue: 2 switch-hysteresis (both sites
define it in situ), 5 changeover (3 prose + 2 comments, pre-paid),
1 temperature-differential. A quarter of the pool is unmarkable on
markup grounds alone (6 SVG `<desc>`, 1 `aria-label`, 2
frontmatter).

**Exhibits (re-derived).**

- `html/education/status-and-proof.html:77` vs `:200` — ":77 A
  **differential-pressure switch** reads the pressure rise across
  the fan…" then ":200 …let the switch's built-in **differential**
  do its job — section 1's word doing different work here…" The
  page stops mid-sentence to disambiguate itself — the strongest §4
  exhibit in the corpus.
- `html/education/comparators-and-deadband.html:475-484` — the
  four-sense `#which-sense` paragraph, closing "take the convention
  from those, not from the label."

**RECOMMENDED: B** — ship `differential-pressure` (the ΔP quantity
plus the switch/transducer that reads it), reserve bare
`differential`. Yield, re-derived at the compound level against
owners[] = status-and-proof + pump-control + balancing (which hold
12 of the 22 compound occurrences): the off-owner residue loses its
SVG-desc, anchor-text, navCard and keywords members, landing at
**~4–6 marks** (the draft's ~10–12 was computed before the
compound-level suppression arithmetic). Leave the changeover arm to
`enthalpy-changeover` and `rat`; the hysteresis sense needs no
entry. Page-local caution carried into the entry comment:
CLAUDE.md's workbench differential ruling is page-local —
comparators-and-deadband:477's zone sense is correct and canonical.
Nesting hazard: `economizers.html:219` has a `dry-bulb` button
inside the `differential dry-bulb` collocation — never split a
collocation across two panels.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.12 low-limit / high-limit

**Evidence.** **29** raw in-scope occurrences / **147** site-wide
(wrap-safe under §1's stated pattern; the draft's 28/151 was the
writer's line-bound artifact — refutation round; the reconciliation
is 29 in scope + 117 evidence + 1 stray in `schematic-bg.njk`). Not
one term with senses — a **modifier pattern**, `<adjective> limit`,
attached to at least **six** unrelated referents, four taught on
four different pages, plus the BACnet `High_Limit`/`Low_Limit`
properties (rendered from `bacnetEnums.js`, invisible to a raw
tools-class grep).

**Exhibits (re-derived).**

- `html/tools/economizer-ratio.html:222` ("dry-bulb with a humidity
  high-limit", five gloss buttons already in the sentence) vs `:235`
  thirteen lines later ("let the low-limit protections decide…") —
  one page, one machine, a comfort gate and a freeze floor sharing
  one token.
- `html/tools/duct-sizer.html:213` (duct pressure cutout) vs
  `html/tools/equipment-airflow.html:243` (furnace thermal cutout) —
  the identical token on adjacent damage-stakes ref-notes.
- `html/education/controls-commissioning.html:128` — "Trip the
  freezestat (a low-limit thermostat set just above freezing) …
  Trip the high-static cutout…" — L1 and H2 in one sentence run,
  with L1 already glossed by the `freezestat` button **two words
  earlier**.

**RECOMMENDED: B** — two entries: `high-static-cutout` (**9
compound sites** — the 10th `high-static` token is a keywords line;
matching rule covers the `high-static` compound with either device
noun, *cutout* or *switch*, per the family's written-scope
contract; yield **~2** after its teach pages
(duct-static-control, boolean-logic-latches) suppress —
essentially controls-commissioning:128/:132) and
`mixed-air-low-limit` (term "mixed-air low-limit override";
owners[] = economizers — its :398 defines the override in place —
plus coil-freeze-risk; yield **~2**: economizer-ratio:239,
minimum-outdoor-air:290; air-mixing:362's "low-limit hardware" is a
deliberate near-miss the written rule does not reach). Both bare
headwords reserved. *freeze stat* is spent (`freezestat` def:
"Also called a freeze stat or low-limit stat"); *economizer high
limit* is pre-paid (`economizer` + `enthalpy-changeover` own both
its pages); `high-limit lockout` must never get an entry (two
reserved families in one phrase; resolution recorded at
glossary.js:832-835). Both entries are ≤2-mark-basket members.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

### 3.13 valve authority (β) / bare authority

**Evidence.** 93 raw in-scope occurrences, of which **38 are the two
words `valve authority`** — but the refutation round's re-derivation
(BLOCKING, confirmed by the writer) showed where they sit: 25 on
the two teach tools (valve-authority 13, valve-cv 12), 9 in
navCards/keywords (hydronics/index 4, tools/index 4, index.html 1),
and 4 on commanding-actuators — **all four being the page name
"Valve Authority Calculator" or its URL** (anchor text and
relatedLinks args at :359/:370, NAME-REFERENCE + ANCHORED-LINK).
The residue is five other readings, including the regulatory sense
("the authority having jurisdiction", `minimum-outdoor-air.html:266`,
inside a damage-stakes scope note) and the command sense inside the
site's OSHA fence (`start-stop-commands.html:220`).

**Exhibits (re-derived).**

- `html/tools/minimum-outdoor-air.html:266` — "The ventilation
  schedule on the stamped design documents and the authority having
  jurisdiction govern." Dispositive against any bare entry on its
  own.
- `html/education/balancing.html:410` vs `:501` — branch-influence
  authority, then "Traditional control valves have an *authority*
  problem" — two readings, 91 lines apart, **both bare tokens** (no
  bigram; :501's paragraph then explains the problem in place).
- `html/education/metering-devices-txv-eev.html:269` — "the loop has
  run out of authority — feed isn't the limit anymore…" —
  self-defining, with `railed` + `superheat` buttons already in the
  sentence.

**The arithmetic that decides it (refutation round):** under the
collocation rule this doc's own Q2 requires, the entry yields
**zero marks** — every off-owner bigram is a page-name, URL,
navCard or keywords occurrence; the bare-token sites (balancing:501,
commanding-actuators:357, hydronics/index:21) are exactly the
sense-ambiguous-token marks Q2 forbids; and load-piping:403
self-defines in its parenthetical **and** sits in the proposed
owners[], where a mark fails the build. The draft's ~3–4 was
unreachable by any rule its own principles permit.

**RECOMMENDED: C (revised — the draft said B).** The β sense is
taught by two tools plus load-piping; `installed-characteristic`'s
shipped def already carries "high valve authority — as authority
falls, the installed curve bows away" and owns
/tools/valve-authority.html; `hunting` leaks "poor authority" from
15 live marks; and the regulatory/command residues are the tier's
sharpest bare-token hazards. The honest-B option is priced for the
ruling line: a `valve-authority` entry at **0–1 marks** (drop
load-piping from owners[] and the one candidate is its :403
sentence — which self-defines, so even that mark shadows), carried
for the §7.2/consumer future alone. The EXCLUDED row reserves bare
`authority` either way, with the regulatory and OSHA-fence sites
named as the hazards.

Ruling: `[ ] A  [ ] B (0–1 marks)  [ ] C  [ ] as amended: ________`

### 3.14 direct-acting / reverse-acting

**Evidence.** 13 raw in-scope occurrences (36 site-wide on the
widened `act(ing|ion)` stem). Two senses, each with exactly one
teach page: actuator stroke-vs-signal
(`commanding-actuators.html:184`) and loop output-vs-measurement
(`comparators-and-deadband.html:435-436`, direct = cooling).

**Exhibits (re-derived — the draft's two evidence claims here were
false and are replaced; the correction *strengthens* the C).**

- `html/education/commanding-actuators.html:186-190` — the site
  already discloses the fork, in prose, at the teach moment: "One
  disambiguation, because the words collide: this is direction *at
  the actuator*, the mapping from signal to stroke. A control
  loop's direct/reverse *action* — which way the controller's
  output moves as the measurement rises — is a different setting
  solving a different problem, and it belongs to PID Basics." So
  the two senses ARE live on one in-scope surface (the draft
  claimed only the quiz bank had both), and one lesson DOES
  cross-link on this point (the draft claimed neither did) — the
  reader's need is met exactly where it arises, which is the
  strongest possible answer to the reader-value case for an entry.
- `html/_data/quizzes/commanding-actuators.js:79` — "Same setting
  in two places?" — the site drills the compounding on the bank
  surface (evidence-side today; the §7.2 surface tomorrow).

**The number that decides it:** after owners[] on the two teach
pages, the markable count in marking scope is **zero** — the two
remaining occurrences are navCard descs, unmarkable twice over.

**RECOMMENDED: C** — a direction change from the 2026-08-09 note's
A, on grounds the note could not have had: the fork is already
disclosed in prose where readers meet it, and owners[] leaves an
entry nowhere to land. The re-open trigger is now two-armed
(refutation round): (1) a third *page* uses either compound without
defining it, or (2) **the §7.2 quiz-bank component lane opens** —
the surface where the site's own drill lives — at which point this
family comes back as an A whose panel leads with the fork, per the
scoping note's design. Banking that A now would mean building the
`kind` component for an entry that renders nowhere until then.
**Routed owner item (refutation round):** commanding-actuators:190
anchors its loop-action disclosure to `pid-basics.html`, which
never covers direct/reverse action (re-derived: zero matches) — the
page that does is `comparators-and-deadband.html:435-436`. A
one-anchor retarget, independent of this ruling.

Ruling: `[ ] A  [ ] B  [ ] C  [ ] as amended: ____________`

---

## 4. The disambiguation component

**Conditional on ≥1 A surviving the ruling.** Under the
recommendations above exactly **one** A candidate exists — deadband
(3.10), and only under its Option-A reading; dew point's A is
amended to the plain register and needs no component. **If 3.10
lands A-as-amended or C, zero A survive: no component gets built,
and the `kind: 'disambiguation'` comment at `glossary.js:42` stays
exactly as written.** That outcome is a feature, not a gap: the
comment was a deliberate deferral, and a tier that measures out to
zero disambiguation entries has answered the question the comment
left open. (Under any ruling that ships entries, the header still
needs its §8-rider true-up — see §8.)

⟨Ruled 2026-08-20: 3.10 took A-as-amended, so **zero A survives —
the component is NOT built**. This section stands as the record of
the unbuilt design, for the re-open triggers that could revive it
(3.14's two arms, the §7.2 lane's re-examination of the EXCLUDED
map).⟩

### 4.1 Data shape

Three options priced; the **labels-plus-minimal** middle shape is
recommended (adopted from the refutation round — both advocates and
the component auditor converged on it, closing the anti-vacuity
hole §4.3's first draft carried).

- **Structured `senses[]`** (full) — per-sense `{label, def,
  owner}` objects and a render loop. Machine-checkable everything,
  but a second entry schema with its own escaping policy, guard
  arms and drift surface, purchased for one entry — and the future
  consumers flatten to text anyway (the in-house precedent:
  `definedTermSetJsonLd` emits one flattened `description` per
  term).
- **Minimal** (the draft's recommendation) — `kind` + `link` on the
  existing shape, fork written as authored prose in `def`. Cheapest,
  but ≥2-senses becomes structurally uncheckable, and the draft's
  `owners.length >= 2` proxy fails both ways (§4.3).
- **Labels-plus-minimal (RECOMMENDED)** — the minimal shape plus one
  field: `senses: ['band around one switching decision', 'gap
  between staging thresholds']` — an array of **plain-text sense
  labels**, escaped exactly as `term` is, guard-enforced
  `length >= 2` (structural anti-vacuity, no proxy), optionally
  feeding the panel eyebrow. `def` stays trusted authored prose —
  the fork is *written*, not assembled. Cost: one escaped-text
  field, not a second schema.

### 4.2 Render design

The single branch point is the panel builder at
`.eleventy.js:875-881` — a conditional on `entry.kind` that (a) adds
a `gloss-tip-disambig` class beside `gloss-tip`, (b) appends the
eyebrow's variant, (c) appends the link line if Q3 ever resolves to
shipping one. Proposed look, using existing tokens only:

- **Class:** `class="gloss-tip gloss-tip-disambig"` — additive, so
  every base rule (geometry, opaque `--surface-2` background,
  z-index) is inherited — **including the print rule**
  (`styles.css:1526-1529`: definitions don't print, panels are
  `display: none` on paper; `details-print.js` is about `<details>`
  and does not interact). `tests/contrast-sweep.spec.js`'s
  `COLLAPSED_CHROME` already force-opens `.gloss-tip` (spec lines
  431/443), so the child class's ink is contrast-measured in both
  themes **with no spec change**.
- **Eyebrow:** the `.gloss-tip-term` line keeps the `<dfn>` headword
  and gains a terse suffix in the same mono/uppercase register —
  `deadband · varies by context` — so the panel declares its
  register before the reader parses a sentence.
- **Left rule:** the base panel carries `border-left: 2px solid
  var(--blue)` (styles.css:1496). The disambig variant swaps the
  hue to `var(--amber-fill)` — amber is the house *warn* register,
  and "this word varies — read carefully" is honestly a caution.
  This is CI-clean as a **verified fact**, not a hedge (refutation
  round): `tests/fill-token-misuse.spec.js:90-93` classifies both
  `border-left-color` and the `border-left` shorthand as legal
  paint sinks, with a fixture at :465 asserting `border: 2px solid
  var(--amber-fill)` legal. Alternatives if the owner's eye
  disagrees on the mockup: a doubled `--blue` rule, or the eyebrow
  variant alone.
- **Register:** fork-first prose, not a sense list — one short
  paragraph naming both readings and ending on the pattern-reading
  instruction, in the site's voice.

### 4.3 Guard arms (`glossaryGuard`, `.eleventy.js:649-685`)

- **Kind whitelist:** `entry.kind` absent or `'disambiguation'`;
  anything else fails.
- **Anti-vacuity, structural:** `entry.senses.length >= 2` on kind
  entries (the labels array, §4.1). This **replaces** the draft's
  `owners.length >= 2` proxy, which the refutation round broke in
  both directions: false-pass (owners padded with pages that merely
  mention the word — and one proposed owner, bacnet-objects,
  carries **zero** raw `deadband` tokens, so it could never
  suppress anything) and false-fail (a genuine two-sense collision
  taught on one page, or taught only on simulator pages, would flunk
  an owners count).
- **Link-target resolution:** `entry.link` required on kind entries,
  path resolved against the guard's existing `pagePaths` set
  (`.eleventy.js:653-657`, reuse), fragment resolved by reading the
  target file for the literal `id="…"` — a stale `#which-sense`
  fails the build the way a stale owners path does. The resolved
  link doubles as corroborating structural evidence of a real fork:
  a canonical disambiguation anchor must exist to point at.
- **owners[] keeps its recorded §7.4 meaning** — pages whose
  teaching a panel would shadow — and for deadband that is
  comparators-and-deadband + function-blocks + timers-and-delays +
  equipment-staging (**bacnet-objects dropped** as a padding owner).
  The union's residual cost is stated so the owner inherits it
  knowingly: a passing mention on an owner page
  (function-blocks:144's palette-tour enumeration) loses its panel,
  and a future cross-sense use on an owner page would fail the
  build and need a §7.4 judgment call at that time.
- **Entry-leading comment contract** (kind entries): name each
  sense and its teach page (humans check it's true; the guard
  checks the senses array exists), and — because Q3's recommended
  panel names the lesson in **def prose** while `link` is the
  guarded copy — state which copy is authoritative and that a
  lesson retitle sweeps this entry (the two-source-drift class the
  house already names; the guard covers the path/fragment, never
  the prose title).
- **Spec-side twin:** `tests/gloss.spec.js`'s data-file arm
  ("glossary entries hold their shape", :362) gains matching
  kind-whitelist, senses-length and link-resolution checks in the
  same PR, so a rename fails at both altitudes — its own stated
  design.

### 4.4 Runtime cost of a link line

`gloss.js` carries zero per-frame work at rest, and its blur path
already treats focus moving INTO the panel as not-a-dismissal
(gloss.js:341). What does **not** exist is Enter/Space moving focus
into the panel, Escape returning it, and a tab-order story for a
panel parked at body end — real additions. Under Q3's
recommendation the link line does **not ship**, so the runtime
change is zero; this is the price list for the day the owner wants
the link.

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
`Object.keys(glossary)` and lints every key as an entry.

**Scope of a row, stated once (refutation round):** a row binds
**entry definition on every surface** — page marks today, the §7.2
bank surface when its component lands — and the map is re-examined
at the §7.2 lane's opening, because several reasons recorded below
are page-transform mechanics (owners-emptying, MIXED-RUN) whose
force does not transfer to a surface with no owners[] mechanism. A
row's reason should therefore name its hazard (which travels) ahead
of its arithmetic (which may not).

**Menu:** (a) banner-only documentation; (b) build-enforced.

**RECOMMENDED: (b), enforced — with a three-legged arm** (the
draft's single collision check could pass vacuously and be walked
around; refutation round):

1. **Collision:** no id in the EXCLUDED map also exists in
   `glossary` — a reserved headword gaining an entry fails loudly.
2. **Term-equality:** no glossary entry's kebab-normalized `term`
   equals a reserved headword id — closes the near-id hole (id
   `reset-value`, term "reset") for one line of code.
3. **Anti-vacuity:** once the tier's ruling lands, an empty map
   fails (`if (!Object.keys(excluded).length)`) — the
   glossaryGuard-header doctrine ("a guard must never decay into a
   quiet pass"), not a human cross-reading two documents. Rows keep
   the kebab lint and the non-empty reason + date.

Rows for the recommended mix: `coil`, `rtu`, `static`, `head`,
`reset`, `proof`, `lockout`, `floating`, `differential`,
`low-limit`, `high-limit`, `authority`, `direct-acting`,
`reverse-acting` — the lockout row carrying the tagout hazard
sentence, the direct/reverse-acting row carrying its two-armed
re-open trigger, and each new-lesson lane reminded of the map by a
`[future:]`-style marker in the friction file (the trigger's only
watcher is a human, so put it where page-adding lanes actually
look; post-ruling PR item).

---

## 6. Cross-cutting owner questions

**Q1 — panel register for a `kind` entry.** Options: a multi-sense
list; a fork-first paragraph; a minimal "varies — see the lesson"
line plus link. **Recommend fork-first paragraph** — the list
under-uses a two-sense entry, the minimal line wastes the tap, and
fork-first is the register the site already teaches in
(`#which-sense` is a fork-first paragraph). See 4.2. ⟨2026-08-20:
MOOT — zero A; closed by consequence.⟩

**Q2 — context-free vs context-keyed marks (restated at the
refutation round — the draft's broader rule was contradicted by
live house practice).** The real ground: the hazard is marking a
**sense-ambiguous visible token** (bare `coil`, bare `RTU`, bare
`authority`) under a sense-scoped id — a wrong-panel risk the
moment the same token appears in a rival sense. That is what 3.1,
3.2 and 3.13 rule out. It is NOT headword/trigger divergence per
se: the site already marks the synonym "head end" under the
`front-end` entry (bacnet-vs-modbus:147), and that is fine, because
the token is sense-unambiguous where it appears. Synonym-divergence
on an unambiguous token: accepted house practice.
Sense-scoping a colliding token: rejected. Context *keys*
(`data-gloss-sense="…"`) stay rejected with them — a second
attribute the malformed-form arm must police, and disposition B
already sense-keys the honest way. Note for the record: the §7.2
bank lane is where these rejected options will get re-pitched
(banks have no owners[] mechanism), so this rationale is written
down for that lane to inherit. ⟨2026-08-20: RATIFIED — the
sense-ambiguous-token principle governs the B compounds' written
matching rules.⟩

**Q3 — the link line, stated honestly.** The panel is
`role="tooltip"` (`.eleventy.js:877`), and the ARIA tooltip pattern
carries **no interactive content**; `aria-describedby` flattens the
panel to a text string, so a no-JS screen-reader user would *hear*
the link's text but could never operate it. Options: **(a)**
link-free def that names the lesson in plain text, no ARIA
deviation, zero runtime change; **(b)** ship the link and document
the deviation — mouse/touch users get it, keyboard needs §4.4's
focus-management work, no-JS SR users hear inert text; **(c)**
re-role kind panels only — disclosure semantics
(`aria-expanded`/`aria-controls`), making interactive content
legitimate at the cost of two divergent trigger semantics in one
component; **(d)** `aria-details` alongside `describedby` — the
relation designed for rich descriptions — rejected: announcement
support is unreliable, and leaning on it would trade away the
describedby no-JS floor the site's design already banks on.
**Recommend (a)** — also the standing owner ruling (D2,
2026-08-10: "definitions only — no owning-lesson link inside the
panel yet", structure kept link-ready), so the kind panel extends a
precedent rather than spending a new decision. The def-prose vs
`link`-field drift risk this creates is named in §4.3's
leading-comment contract. ⟨2026-08-20: MOOT — zero A; closed by
consequence.⟩

**Q4 — EXCLUDED enforcement.** See §5. **Recommend build-enforced,
three-legged.** ⟨2026-08-20: RATIFIED — build-enforced, all three
legs; ships in the execution PR.⟩

**Q5 — panel geometry.** The panel is `max-width: min(21rem,
calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow-y:
auto` (styles.css:1490-1492) — a taller panel scrolls rather than
breaks. **Recommend keeping 21rem.** Sense ceiling: **three senses
in one panel**; anything needing more is a lesson wearing a
tooltip's clothes. The scroll cap is the safety net, not the plan.
⟨2026-08-20: MOOT — zero A; closed by consequence.⟩

**Q6 — trigger affordance.** **Recommend identical dotted underline
for kind and plain triggers; the panel differentiates.** The anchor
is the styles.css AFFORDANCE comment (:1427-1432): the control for
marker noise is marking density, a curation policy, "never a louder
or quieter style here." A second trigger style would leak taxonomy
into the prose. ⟨2026-08-20: MOOT — zero A; closed by consequence.⟩

**Q7 — the per-family table.** The main ruling **is** §3's fourteen
checkbox lines; Q1–Q6 exist so those fourteen can be ruled without
re-litigating the machinery under each one. **Three owner questions
routed out of the families:** `balancing.html:497`'s
"floating-point input" (3.9 — field usage or copy defect?);
`fail-to-start` as a standalone re-triage candidate (3.7); and the
`commanding-actuators.html:190` anchor that sends the loop-action
reader to pid-basics, which never covers loop action — retarget to
comparators-and-deadband:435-436 or grow the pid-basics beat (3.14).
⟨2026-08-20: the table is ruled — see the ratification block. The
anchor retarget is APPROVED (rides the execution wave as a small
live-page PR); balancing:497 and the fail-to-start re-triage
routing remain open owner items.⟩

---

## 7. Sizing

**Raw pool, re-derived at HEAD:** **2,535** in-scope occurrences
across the 14 families (sum of §3's headline counts — dew point at
the wrap-safe 177, low/high-limit at the wrap-safe 29). For
calibration only; §1's counting rule and the per-family funnels are
why this number must never be quoted bare.

**Recommended mix (as revised by the refutation round):** **10 new
entries** — 9 plain + 1 disambiguation — taking `glossary.js` from
63 to 73:

| Entry | Family | Expected marks |
|---|---|---|
| `modbus-rtu` | 3.2 | 1–2 |
| `duct-static` | 3.3 | ~8–12 |
| `head-pressure` | 3.4 | 3 |
| `dew-point` (plain, amended A; apparatus folded) | 3.5 | ~20–40 (band) |
| `proof-window` | 3.7 | 0–1 |
| `floating-actuator` | 3.9 | 1 |
| `deadband` (kind, under Option A) | 3.10 | ~4–7 |
| `differential-pressure` | 3.11 | ~4–6 |
| `high-static-cutout` | 3.12 | ~2 |
| `mixed-air-low-limit` | 3.12 | ~2 |

Menu options that add back if the owner takes them: `pump-head`
(1–2), `valve-authority` (0–1), `apparatus-dew-point` (0–1),
`manual-reset` (~2), `contactor-coil` (1–2). ⟨Ruled 2026-08-20:
`contactor-coil` TAKEN, the rest declined — ruled mix is 11 plain
entries, glossary 63 → 74, no component, ~45–75 marks.⟩

**Total expected marks: roughly 45–75**, on top of today's 369 —
**and outside the dew-point band the whole tier yields ~25–35
marks.** The draft said 60–105; every family the refutation round
re-derived came down, none went up. That thinness is itself
decision-relevant, and it is presented as such rather than
smoothed: the tier's measurable value is one soft-band plain entry
(`dew-point`), two mid-single-digit entries (`duct-static`,
`differential-pressure`), `head-pressure`'s three clean additive
marks, deadband's ~4–7 — and then a tail of ≤2-mark entries whose
real case is the §7.2 surface (§3's basket paragraph). §8's default
for this tier was always *no marking*; the numbers now show how
close to that default the corpus actually sits.

**Against the §5 heuristic:** raw ÷ ~10 (the measured §5 funnel)
would predict ~250 marks from this pool. The expected 45–75 is a
÷ 34–56 cut, and the gap is the tier's character: four-to-five
families take C outright; two families carry ~46 % pure markup
noise; and §4 owners-suppression runs at full strength, because a
term only becomes a collision by being taught in two places — the
single most transferable lesson in this inventory.

**Bear case (every B collapses to C at ruling): 2 entries** —
`deadband` (if A survives) and `dew-point` (the amended A) — ~24–47
marks (the draft said 1 entry; the A-half of 3.5 is an A, not a B —
refutation round). **Full-bear (both A checkboxes fall too):** zero
entries, zero marks, no component, `glossary.js:42`'s comment
stands unedited, and the tier closes as a recorded set of EXCLUDED
rulings — a legitimate close, not a failure.

---

## 8. Housekeeping rider (post-ruling PR — recorded for completeness)

⟨Ruled 2026-08-20: every item below belongs to the **execution PR**
— the ratification PR touches nothing outside `docs/`.⟩

- Flagged 2026-08-20: of the six markless entries, three carry
  entry-local annotations that explain the shape and three do not:
  **`hoa`** (no leading comment, glossary.js:660),
  **`enthalpy-changeover`** (:851 — drafting care only),
  **`glide`** (:1033 — same). Annotate all three as
  markless-by-design with the reason, or resolve otherwise —
  `glide` is now load-bearing for 3.5's refrigerant-sense
  pre-payment and deserves to say so where the next drafting lane
  will read it.
- **Under any ruling that ships an entry** (refutation round): true
  up `glossary.js:40-43`'s header comment in the same PR — its
  "§4 collision terms are NOT eligible for a plain entry … 
  Deliberately not built now" clauses are falsified by a shipped
  `dew-point` plain entry and/or a built kind component. Point the
  header at the EXCLUDED map, the component (if built), and the
  per-family rulings with their date. Record the dew-point (and, if
  taken, deadband) plain-register carve-out as a dated amendment
  beside the ratified §8 blockquote in
  `docs/tooltip-glossary-scoping.md` — the rule's letter says
  "never a definition," and an owner-ruled amendment is how the
  house changes a ratified rule's letter.
- Add the EXCLUDED map's re-open triggers as a `[future:]`-style
  marker in `docs/site-ideas-and-friction.md` (the map's only
  watcher is a human; put the trigger where page-adding lanes look).

---

## 9. Refutation ledger + condensed inventory

### 9.1 Refutation ledger (round of 2026-08-20 — five checkers)

Verdict counts as issued: **7 BLOCKING, 23 SHOULD-FIX, 16 NIT, 22
attacks CLEARED.** Every finding was re-derived by the writer before
application. Disposition of every non-cleared finding:

**Exclusion-advocate seat (4 BLOCKING, 4 SHOULD-FIX, 1 NIT):**

- BLOCKING duct-static yield (~25–35 impossible) — **APPLIED**:
  ~8–12 with the site enumeration (3.3, §7).
- BLOCKING valve-authority zero yield — **APPLIED**, writer-verified
  (the four commanding-actuators bigrams are the tool's name/URL):
  3.13 revised to C with the honest-B option priced.
- BLOCKING pump-head yield (~10–13 unreachable) — **APPLIED**,
  writer-verified (load-piping :616/:845 are HTML comments): 3.4
  revised; `pump-head` to the menu, recommended dropped.
- BLOCKING deadband amended-plain option unpriced — **APPLIED**:
  option added at full depth (3.10), §2's amendment routes widened
  (sense-compatibility named), component consequence on the ruling
  line. The A/A-amended choice itself is left to the owner.
- SF proof-window + apparatus-dew-point vs 3.14's standard —
  **APPLIED**: apparatus folded into the dew-point closing clause
  (keep-option priced); proof-window kept at B with the
  distinction stated (plain entry, no component dependency, 15
  bank occurrences on the scheduled §7.2 surface) and a C option
  on the line.
- SF mixed-air-low-limit yield/owners — **APPLIED**: ~2, owners
  named; air-mixing:362 recorded as a deliberate rule near-miss.
- SF ≥2-owners proxy failure modes — **APPLIED** via the
  labels-senses shape (4.1/4.3).
- SF dew-point owners semantics + DOAS — **APPLIED**: grounds
  stated per path; DOAS added as a teach-page owner; band narrowed.
- NIT high-static cutout/switch variants — **APPLIED** (rule covers
  both device nouns; 9 compound sites).

**Reader-value seat (1 BLOCKING, 5 SHOULD-FIX, 2 NIT):**

- BLOCKING coil "exactly one clean residual site" false —
  **APPLIED**, writer-verified (electrical-quick-calc:114/:121,
  zero marks on the page): residue restated as three named sites;
  C re-argued on the true count with the `contactor-coil` option
  priced (3.1).
- SF 3.14 false evidence claims — **APPLIED**: replaced with the
  commanding-actuators:186-190 in-prose disclosure, which
  strengthens the C.
- SF pid-basics anchor defect — **APPLIED** as the third routed
  owner item (Q7, 3.14).
- SF Q2 contradicted by the front-end/"head end" precedent —
  **APPLIED**: ground restated as sense-ambiguous-token marking
  (Q2), consuming families re-worded.
- SF reset-schedule/proof-window asymmetry + function-blocks:299
  appositive — **APPLIED**: reset-schedule's yield corrected to
  zero (hardens 3.6's C); the asymmetry resolved by the stated
  proof-window distinction (3.7).
- SF duct-static def constraint — **APPLIED** (3.3: the def names
  the building-static fork with the magnitude contrast).
- NIT fail-to-start oversold — **APPLIED** (funnel stated; ~0
  markable).
- NIT re-open trigger has no watcher — **APPLIED** (§5/§8:
  friction-file marker).

**Cite-auditor seat (1 BLOCKING, 7 SHOULD-FIX, 8 NIT):**

- BLOCKING manual-reset "fully pre-paid" false — **APPLIED**,
  writer-verified (six pages; two clean unpaid prose sites): 3.6
  corrected, `manual-reset` added to the amendment menu.
- SF reset 247 / 27 files / edu 195 — **PARTIAL**: the 27-file
  correction **APPLIED**; the 247/edu-195 recount **REFUTED** —
  245/193 reproduces under §1's stated rule at HEAD (single-word
  stem, no wrap sensitivity; recorded here per the
  refutation-stage doctrine).
- SF ft-of-head "all 6 unmarkable" false — **APPLIED**,
  writer-verified (affinity-laws:122 is plain ref-note prose, no
  units span): 3.4 corrected.
- SF fail-to-start 14 — **PARTIAL**: 14 in scope **APPLIED**;
  site-wide re-derives to **21**, not the finding's 23 (printed
  21).
- SF dew navCard 23 — **APPLIED** (23; units-spans restated as 4
  spans ≈ 12 raw tokens).
- SF lockout "within one word" — **APPLIED** (same-sentence
  geometry, both sites re-derived).
- SF low/high-limit 28/151 — **APPLIED**: 29/147 under the
  wrap-safe required-separator pattern, now stated in §1; the
  draft's figures were the writer's line-bound artifact.
- SF deadband owners-union not subtracted — **APPLIED** (band
  ~4–7 against the four-page union; 3.10, §7).
- SF deadband-constant 6 — **APPLIED** (6 wrap-safe, 2/2/2; the
  writer's own line-bound recheck initially "refuted" this and was
  itself wrong — recorded as a counting-rule lesson).
- NITs (static guides/landings split; pitot-sense rename;
  differential 22; high-static 9; exhibit ranges :420-425 and
  :210-211; freezestat two words; glossary.js:832-835; SWEEP-SCOPE
  "verbatim" wording) — **ALL APPLIED**.

**Component-a11y seat (4 SHOULD-FIX, 3 NIT):**

- SF proxy fails both ways + labels-senses middle option —
  **APPLIED** (4.1 recommendation changed to labels-plus-minimal;
  structural anti-vacuity).
- SF lockout owners-anchor claim mechanically false — **APPLIED**
  (3.8 reworded; C stands marks-side).
- SF link-field vs def-prose drift inversion — **APPLIED** (4.3
  leading-comment contract names the authoritative copy).
- SF EXCLUDED vacuity + near-id hole — **APPLIED** (three-legged
  arm, §5).
- NITs (print story; aria-details option (d); gloss.spec.js twin) —
  **ALL APPLIED**.

**Future-consumer seat (1 BLOCKING, 3 SHOULD-FIX, 2 NIT):**

- BLOCKING dew-point containment claim unscoped to the §7.2
  surface — **APPLIED**, writer-verified (blend-sense dew in
  refrigerant-cycle-basics.js:114/:121): claim scoped, matching
  rule extended to future surfaces, mitigation + kind-panel
  fallback stated (3.5).
- SF owners-union circularity + padding owner — **APPLIED**
  (bacnet-objects dropped — zero raw tokens, writer-verified; link
  resolution as corroborating structure; §7.4 meaning kept).
- SF §7.2 vs C rulings / EXCLUDED scope — **APPLIED** (3.14
  two-armed trigger; §5 scope-of-a-row paragraph; Q2 note).
- SF glossary.js header true-up unscheduled — **APPLIED** (§8
  rider extended, incl. the scoping-record dated amendment).
- NITs (bear-case arithmetic — 2 entries; §2-A pointer clause) —
  **BOTH APPLIED**.

**Cleared attacks recorded** (the round's negative results, kept
because they are evidence too): head-pressure survived a dedicated
attack (owners:[] precedented, all three marks verified);
modbus-rtu's table-cell mark is precedented (five existing `<td>`
marks — *corrected 2026-08-21: seven marks across six cells*); the
dew page-disjointness, zone-sense-zero and
high-limit-lockout rulings reproduce; all four C families' marquee
exhibits reproduce; the COLLAPSED_CHROME no-spec-change claim holds
mechanically; the amber border is CI-clean as fact; the Q3
ARIA/D2/1.4.13 analysis survived cite-checking; all 13 (now 10)
proposed ids are kebab-legal, collision-free and panel-namespace
clean; and thirteen of fourteen family headline counts reproduced
exactly, several to the subtotal and file count.

**Writer's refutations of the round, for symmetry:** 2 of 41
substantive findings partially refuted (reset 247/edu-195;
fail-to-start site-wide 23) — both on re-derivation under §1's
stated rule; and one of the writer's own counter-refutations
(deadband-constant "4") was itself overturned by a wrap-safe
re-check, which is the counting rule earning its keep in both
directions.

### 9.2 Condensed inventory

Counts re-derived at `7d5c97d` per §1's rule; "lean" is the
inventory lane's disposition (confidence); "rec." is §3's
post-refutation recommendation.

| Family | In-scope | Site-wide | Senses | Lane lean | Rec. | Entries |
|---|---|---|---|---|---|---|
| coil | 898 | — | 3 | C (med) | **C** | — (menu: contactor-coil) |
| RTU | 57 | — | 2 | B (med) | **B** | modbus-rtu |
| static | 459 | — | 4 + 2 non-senses | B (high) | **B** | duct-static |
| head / head pressure | 207 | — | 4 + 2 non-senses | B (high) | **B** | head-pressure (menu: pump-head) |
| dew point | 177 | — | 3 | A+B (med) | **A amended** | dew-point (menu: apparatus-dew-point) |
| reset | 245 | — | 5 + 3 non-senses | C (high) | **C** | — (menu: manual-reset) |
| proof | 206 | — | 2 registers | B (med) | **B** | proof-window |
| lockout | 7 | 48 | 3 | C (high) | **C** | — |
| floating | 38 | — | 5 | B (med) | **B** | floating-actuator |
| deadband | 76 | 302 | 5 | A (med) | **A / A-amended (owner)** | deadband |
| differential | 30 | 57 | 5 | B (high) | **B** | differential-pressure |
| low/high-limit | 29 | 147 | 6+ referents | B (high) | **B** | high-static-cutout, mixed-air-low-limit |
| valve authority | 93 | 125 | 5 | B (high) | **C** (rev.) | — (menu: valve-authority 0–1) |
| direct/reverse-acting | 13 | 36 | 2 | C (med) | **C** | — |

---

## 10. Closing summary

1. **The ask (§2, §3):** rule each of the 14 collision families on
   the checkbox lines in §3. Every figure was re-derived at HEAD
   `7d5c97d` — twice, the second pass against the five-checker
   refutation round whose full ledger is §9.1 (7 BLOCKING, 23
   SHOULD-FIX, 16 NIT, 22 CLEARED; 2 findings partially refuted,
   the rest applied).
2. **The revised recommended mix (§3, §7):** five exclusions — coil
   (3.1), reset (3.6), lockout (3.8), **valve authority (3.13 —
   revised from B: the collocation yield re-derives to zero)**,
   direct/reverse-acting (3.14); Bs yielding 9 plain entries; and
   deadband (3.10) as the tier's one A candidate. Net: 63 → 73
   entries, **~45–75 new marks** (the draft's 60–105 collapsed
   under re-derivation — every family came down, none went up), of
   which the dew-point band is over half: **outside it the whole
   tier yields ~25–35 marks.** The thinness is decision-relevant
   and presented as such.
3. **The one checkbox that builds or kills the component (3.10):**
   deadband now carries two fully-priced shapes — the `kind`
   disambiguation panel (recommended by a hair, on §8's letter and
   the width-convention trap) and a plain geometric-register def
   (the exclusion advocate's case; §2's new sense-compatibility
   route). **A-as-amended or C there ⇒ zero A ⇒ no component gets
   built** — which §4 calls a feature, not a gap.
4. **What the refutation round changed structurally:** yields
   re-derived across every B (§7); coil's funnel restated on three
   real residual sites (3.1); manual-reset joins reset's amendment
   menu on a corrected premise (3.6); dew point's containment claim
   scoped to today's transform with the §7.2 bank surface named as
   the boundary it does not cross (3.5); apparatus-dew-point folded
   (3.5); Q2 restated on its real ground (sense-ambiguous tokens,
   not divergence per se); the component's anti-vacuity became
   structural via a labels-only `senses[]` (4.1/4.3); the EXCLUDED
   arm grew three legs and a scope statement (§5); 3.14's C got
   *stronger* evidence (the site already discloses the fork in
   prose) plus a two-armed re-open trigger.
5. **The ≤2-mark basket (§3 preamble):** the thin tail's honest
   justification is the scheduled §7.2 quiz-bank surface, not
   present consumers — priced once, so the owner accepts or
   declines that trade per family with open eyes.
6. **The seven questions (§6):** fork-first register (Q1);
   sense-ambiguous-token rule (Q2); link-free kind panel per the D2
   precedent, aria-details named and rejected (Q3); enforced
   three-legged exclusions (Q4); keep 21rem, three-sense ceiling
   (Q5); identical trigger affordance (Q6); the ruling is §3's
   fourteen checkboxes (Q7).
7. **Three items routed to the owner beyond the rulings (Q7):**
   `balancing.html:497`'s "floating-point input";
   `fail-to-start` at the re-triage; and the
   commanding-actuators:190 anchor that promises loop-action
   teaching pid-basics doesn't deliver.
8. **Housekeeping (§8):** annotate the three unannotated markless
   entries; under any entry-shipping ruling, true up
   `glossary.js:40-43`'s header and record the plain-register
   carve-outs as dated amendments beside the ratified §8 rule;
   plant the EXCLUDED re-open marker in the friction file.
9. **After the ruling:** the decision lands as a dated entry in
   `docs/glossary-arc.md`'s decision log; the EXCLUDED map, the
   entries and the marking lanes follow as separate PRs under the
   §5 process.
