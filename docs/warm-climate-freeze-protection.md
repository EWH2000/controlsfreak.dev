# Warm-climate freeze protection — research record

> **Disposition: research record. Feeds future page copy. No page copy
> has shipped from it.** Written 2026-08-09 against
> `docs/next-session-handoff.md` **item 3**, which the owner opened with
> *"do this properly, with sources — not as a hedge in prose."* Nothing
> in this file is reader-facing yet, and §5 is the only place that
> proposes wording; those are **proposals awaiting an owner pick**
> *(made 2026-08-09 — see the pick note in §5)*, not
> copy.
>
> **Method.** Four independent finder agents, one per angle
> (low-SAT/latent · freeze-stat practice · duct condensation ·
> freeze-exposure mechanics), a merge stage that consolidated their
> output into eight claims, then **one adversarial refuter per claim** —
> eight refuters, each tasked to break its claim at primary sources
> rather than confirm it. This follows the BACnet-enum verification
> precedent and the repo's standing rule that *a correct finding does
> not imply a correct remedy*, extended here to *a sourced claim does
> not imply a sound citation*.
>
> **Outcome: 8 claims, 8 survived, 0 refuted — but the refutation stage
> was not idle.** It produced 18 demotions and citation defects, several
> of which would have shipped a wrong sentence. Those are §3, and they
> are the most useful part of this document.
>
> **Scope.** US model codes and US practice literature. Every quotation
> below was re-verified at its source by a second agent unless the entry
> says otherwise. Manufacturer names (Trane, Honeywell, Belimo) appear
> here as **sources**; the *avoid exact vendor names* guardrail governs
> page copy, not a citation list.

---

## 1. The question

PR #488 shipped a hardwired low-limit stat on the AHU workbench at
38 °F with the software limit at 41, **explicitly scoped in-code to the
owner's Northeast US practice**. The owner asked whether that scoping is
real: do warmer climates run lower supply temperatures, is their duct
better insulated, and do southern jobs skip the low-limit stat
entirely?

The handoff recorded three things as **not known, do not assert**:
whether southern jobs commonly omit the LLS, any specific southern
setpoint, and code requirements by jurisdiction. §4 says which of those
this research moved and which stand.

---

## 2. What survived

Eight claims, all surviving adversarial refutation. Confidence is the
merge stage's, carried forward where the refuter agreed.

### SAT practice

**S1 — Low supply-air temperature is a latent decision, not an
envelope one.** `confidence: high`

Air cooled to ~55 °F leaves the coil near a 55 °F dew point, which
wrings out enough moisture for a typically occupied space; the industry
history ties the 55–60 °F ceiling to humidity control. Cold-air
distribution pushes to 45–48 °F (42 °F exists) for two stated drivers —
a 30–40 % supply-airflow reduction and a markedly drier space (40–45 %
RH vs 55–60 % at 55 °F SAT), the latter sold explicitly as mold and
condensation control under hot-humid conditions. For DOAS in humid
climates a 55 °F supply dew point is often **not low enough**; ~45 °F
DP may be needed to hold 50 %-RH-class space conditions at part load.

*Insulation appears in this literature only as a mitigation the cold
air imposes — never as the reason for it.* That null survived a
targeted hunt.

- Trane Engineers Newsletter 29-2 (2000): "the 55 °F dictated by
  current practice"; above 60 °F SAT "fan horsepower and fan noise
  increased noticeably, and loss of humidity control became more
  likely"; cold-air Table 1 (55 °F/55–60 % RH/553 cfm·ton⁻¹ vs
  45 °F/40–45 % RH/335); "Any cold surfaces located outside this
  envelope must be completely insulated."
  <https://www.trane.com/content/dam/Trane/Commercial/global/products-systems/education-training/engineers-newsletters/airside-design/enews_29_2_042400.pdf>
- Rundell Engineering: cooling to 55 °F "brings the dewpoint … to
  approximately 55 °F which wrings out just enough moisture."
  <https://www.rundellengineering.com/blog/supply-air-temp-reset>
- Trane EN 49-1 (2020), Fig. 2 caption: "Dehumidifying to 55 °F dew
  point may actually add latent load to the space."
  <https://www.trane.com/content/dam/Trane/Commercial/global/products-systems/education-training/engineers-newsletters/airside-design/ADM-APN073-EN_032020.pdf>

*Survived:* every quotation verified verbatim against extracted full
text; independently corroborated by a CED Engineering cold-air course
and Mitchell Paulus's "Why is 55 °F so important." See **T1–T2** for
what the refuter demoted.

### Codes & standards

**S2 — ASHRAE 90.1 caps DOAS supply temperature and special-cases the
humid zones in its SAT-reset rules.** `confidence: high`

§6.5.2.6 (2016 ed.) forbids warming ventilation supply air above 60 °F
when the majority of zones require cooling — **even with
recovered-energy reheat**. ASHRAE's official interpretation states the
principle outright:
*"Dehumidification is achieved by reducing the humidity ratio of the
supply air, not by reheating it to a high temperature to achieve a low
relative humidity."* Separately, 90.1-2010 §6.5.3.4 granted a **blanket
exemption from SAT reset in climate zones 1A/2A/3A**; 90.1-2019 §6.5.3.5
removed it, permitting humidity-based reset adjustment only in
`0B, 1B, 2B, 3B, 3C, 4–8` and otherwise requiring humid-zone designs to
decouple dehumidification (separate OA coil / DOAS) so SAT can reset
without losing humidity control.

- IC 90.1-2016-6 (approved 2018-01-20; requester an engineer in
  Maitland, FL).
  <https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20intepretations/ic-90.1-2016-6.pdf>
- ASHRAE's own 90.1-2010 HVAC compliance form, under "Supply air
  temperature reset control (6.5.3.4)": "N2 — N/A system is located in
  climate zone 1a, 2a or 3a."
  <https://www.ashrae.org/File%20Library/Technical%20Resources/Standards%20and%20Guidelines/Forms%20and%20Procedures/2010ComplianceForms/HVAC-Compliance-Forms---Part-3.pdf>
- DOE Building Energy Codes 90.1-2019 training deck (standard text
  paywalled): "Blanket SAT reset exception for climate zones 0A, 1A,
  2A, and 3A removed."
  <https://www.oregon.gov/bcd/codes-stand/Documents/90.1-2019-HVAC-training.pdf>

*Survived:* verified verbatim from ASHRAE's own PDFs plus the Oregon
BCD deck at slides 101/114/115, and independently against Colorado's
2024 energy code carrying the 90.1-2019-derived text. See **T3–T4**.

**S3 — The energy code does not ask for an airside economizer at all in
the very-hot zones, and it locks humid-zone economizers out earlier.**
`confidence: high`

90.1-2013 requires economizers on fan-cooling units > 54,000 Btu/hr
(4.5 tons) in every climate zone **except 1A and 1B**, "where the
benefit of airside economizing would be limited." Where one is
installed in a humid zone, fixed dry-bulb high-limit is
**OA > 65 °F in 1A/2A/3A/4A** (70 °F in 5A/6A, 75 °F in the dry, marine
and cold zones incl. 7 and 8), and **differential dry-bulb control is
not permitted in 1A/2A/3A/4A at all**. Trane's stated rationale:
"Climates with hotter and more humid weather have a lower setpoint to
minimize the introduction of humid outdoor air."

- Trane EN 44-2, ADM-APN054-EN, Table 1 and Figure 1.
  <https://www.trane.com/content/dam/Trane/Commercial/global/products-systems/education-training/engineers-newsletters/airside-design/ADM-APN054-EN_05202015.pdf>
- IESVE, on 1A/1B: "the higher enthalpy of outside air throughout the
  year eliminates the advantages of having an economizer."
  <https://www.iesve.com/discoveries/view/2982/airside-economizers>

*Survived:* the refuter re-extracted the Trane PDF, rendered page 1 to
confirm the map, **and independently confirmed the whole table against
real code text** (IECC 2018 C403.5 / Table C403.5.3.3 as adopted in
Colorado). A contradicting secondary source (MEP Academy, claiming
differential dry-bulb is barred in "1A–6A") was itself refuted by the
code table. Edition-scoped to 90.1-2013 — see §4. See **T5–T7**;
**T7 is the trap that matters.**

### Freeze-stat practice

**S4 — Whether the hardwired low-limit stat is "required" depends
entirely on which authority you read, and no building code mandates
it.** `confidence: medium`

Three findings that only make sense together:

1. **No code mandate found.** A targeted hunt over IMC, IBC and the
   energy codes found nothing requiring a coil freezestat. IMC Ch. 12
   (hydronic) has no freeze-protection section; 90.1 §6.4.3.7 and its
   IECC mirror regulate the *controls on* freeze-protection systems
   (shut off above 40 °F) — an energy limit, not an install mandate.
2. **UFGS 23 09 93** — the major public national guide spec
   (USACE/NAVFAC/AFCEC, Nov 2015) — includes the freeze stat
   **unconditionally**, under "Safeties" in every hydronic-coil AHU
   sequence, "Direct-hardwire interlock safeties to the fan starter
   circuit" (to the VFD in VAV), manual reset at the device. The word
   *climate* appears nowhere in the section.
3. **ASHRAE Guideline 36** — the flagship sequence guideline — treats
   it as **optional**, layered over a mandatory *software* freeze
   sequence: "If a freeze-stat is present, it may be hardwired to
   perform some or all of these functions… but maintain the alarms,"
   and "Upon signal from the freeze-stat (if installed)."

- UFGS 23 09 93. <https://www.wbdg.org/FFC/DOD/UFGS/UFGS%2023%2009%2093.pdf>
- G36-2021 Addendum e (public) — zone-level Freeze Protection Setback,
  40 °F entering / 45 °F clearing, Level 3 alarm.
  <https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/g36_2021_e_20240229.pdf>
- LBL Modelica reference implementation of G36 §5.18.11, exposing a
  four-value freeze-stat parameter (`No_freeze_stat`,
  `Connected_to_BAS_NO`, `Connected_to_BAS_NC`,
  `Hardwired_to_equipment`).
  <https://simulationresearch.lbl.gov/modelica/releases/v9.1.0/help/Buildings_Controls_OBC_ASHRAE_G36_AHUs_SingleZone_VAV.html>

**Climate dependence shows up as silence, not as a rule.** Cold-climate
owner standards require it explicitly (UConn: manual-reset freezestat
stops the fan, closes OA/exhaust dampers, drives the preheat valve to
100 %, "Manual reset at the unit is required"; Yale requires glycol
preheat with manual-reset freeze stats). Warm-climate standards simply
never mention it — UCF (Orlando, 2A), 273 pages: **zero**
freezestat / low-limit / glycol / preheat hits against 46 "chilled
water" mentions, its only "freeze protection" hits being fire-sprinkler
piping. University of Arizona (Tucson, 2B): zero freeze mentions.
**No authoritative source was found that either waives or mandates the
freezestat by climate zone.**

- UCF Design & Construction Standards.
  <https://fp.ucf.edu/wp-content/uploads/resources/Standards%20and%20Requirements/Design%20Construction%20and%20Renovation%20Standards%20Q3%20FINAL_UPDATE.pdf>
- U. Arizona §15855.
  <https://pdc.arizona.edu/sites/default/files/2025-05/Section-15855-Air-Handling-Systems-03.25.pdf>
- UConn BAS design standards.
  <https://updc.uconn.edu/wp-content/uploads/sites/1525/2020/09/Appendix-V-Building-Automation-Design-Standards-August-2020.pdf>
- Yale 23 75 00.
  <https://facilities.yale.edu/sites/default/files/files/Design%20Standards/Updated%20Design%20Standards/23%20HVAC/23%2075%2000%20Air%20Handling%20Equipment_06_15_16.pdf>

*Survived, and was strengthened.* The refuter found the UFGS freeze-stat
entries are **unbracketed while the adjacent "Return air smoke (RA-SMK)"
entry is bracketed** — proving the spec's designer-option convention is
in active use and the freeze stat deliberately sits outside it. It also
located a public mirror of G36-2021 itself and confirmed the optional
language at the primary source, and noted that **G36 does write explicit
climate carve-outs elsewhere** (plant-side basin heaters / heat trace:
"Keep… for freezing climates. Delete otherwise") **but none for AHU
freeze protection.** UCF's two numbers (0 and 46) reproduced exactly.
See **T8**.

**S5 — The freezestat is a wet-coil discipline, with remarkably
consistent application details.** `confidence: high`

Vapor-charged capillary element serpentined across the coil face on the
**leaving-air** side, tripping on its **coldest 8–12 in.**, setpoint
~35–37 °F, manual reset, NC contact hardwired in series with the
fan/VFD safety circuit. Honeywell L482A is the archetype (factory 35 °F,
5 °F differential, 20-ft capillary, 2 SPST). Entering-air-side mounting
is rejected because stratified minimum OA can chill a short length of
tube "while the coil itself is in no danger."

The **burst**-protection literature targets water and steam coils
exclusively — the NIH 100 %-OA bulletin's whole toolkit is glycol
preheat, distributing steam coils, drainable coils, pressure-relief
caps, N+1 pumps. DX coils appear nowhere in it. **State the positive
claim** (freeze-burst protection protects water and steam coils) rather
than the negative.

- HPAC Engineering (Felker, Belimo, 2019).
  <https://www.hpac.com/air-conditioning/article/20929880/freezestat-control-methods-protect-coils>
- Honeywell L482A installation instructions (Kele).
  <https://www.kele.com/Catalog/22%20Thermostats_Controllers/PDFs/L482%20Installation%20Instructions.pdf>
- Engineered Air Balance (Texas TAB/Cx firm) — 35 °F typical, NC in
  series with the VFD safety interlock, freeze-spray trip verification
  on 12–18 in. of element.
  <https://www.eabcoinc.com/technical-article/freeze-protection-engineered-air-balance/>
- NIH ORF Technical Bulletin #130 (Feb 2023).
  <https://orf.od.nih.gov/TechnicalResources/Documents/Technical%20Bulletins/23TB/Heating%20and%20Cooling%20Coil%20Freeze%20Protection%20Design%20for%20100%25%20Outside%20Air%20AHUs%20February%202023_508.pdf>

*Survived, and the refutation attempt corroborated instead:* DX-coil
"freeze" literature is uniformly about surface ice, airflow loss and
compressor damage — no burst mechanism; a vendor's burst-protection
product line is offered only for hot-water, chilled-water and steam
coils; and two trade sources go further than this claim does, stating
outright that DX coils do not need freezestats. See **T9–T10**.

### Duct & condensation

**S6 — Duct insulation in humid climates answers two legally distinct
code paths, and only one of them is about energy.** `confidence: high`

1. **Energy code — disclaims condensation on its face.** The
   90.1-style Table 6.8.2 carries footnote a: *"The required minimum
   thicknesses do not consider water vapor transmission and possible
   surface condensation."* The residential IECC baseline (R403.3.1) is
   R-8 for attic ducts ≥ 3 in. / R-6 smaller, with **no humidity
   trigger**.
2. **Mechanical code — supplies it separately.** IMC 603.12:
   "Provisions shall be made to prevent the formation of condensation
   on the exterior of any duct." IMC 604.11: externally insulated
   **cooling** ducts get a vapor retarder ≤ 0.05 perm (or 2-mil
   aluminum foil), joints and seams sealed. The trigger is *"ducts used
   for cooling"* — low supply temperature — **not** climate zone or
   R-value; 604.1 separately defers R-values to the IECC, confirming
   two distinct paths.
3. **The one moisture-keyed R-value bump.** Buried-duct provisions
   (2018+ IECC/IRC; 2024 IRC N1103.3.5 / R403.3.5): supply ducts buried
   in ceiling insulation in **Climate Zones 0A, 1A, 2A and 3A** get
   **R-13** (vs the R-8 attic baseline) plus the IRC M1601.4.6 vapor
   retarder. The trigger is the zone **letter** (A = moist), not the
   number — hot-dry 2B gets no bump.

- 90.1-2022 Addendum r (footnote extracted verbatim from the PDF).
  <https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/90_1_2022_r_20240531.pdf>
- IMC 603.12 / 604.11 / 604.1 (2021 IMC as adopted in CT).
  <https://up.codes/viewer/connecticut/imc-2021/chapter/6/duct-systems>
- Buried-duct text. <https://up.codes/s/ducts-buried-within-ceiling-insulation>
- Insulation Institute TechSpec on the rationale: R-13 in 1A/2A/3A "to
  minimize condensation potential."
  <https://insulationinstitute.org/wp-content/uploads/2017/01/TechSpec-Buried-Ducts_FINAL.pdf>

*Survived, with a sharper argument than the claim made.* The refuter
noted the thermal reading is **structurally impossible**: colder zones
5–7 keep R-8 while hot-humid 1A gets R-13. It also found the PNNL
Building America brief showing the 2018 predecessor
(R403.3.6 / N1103.3.6) **explicitly cross-referencing IMC 604.11** —
welding the moist-zone increment to the mechanical-code condensation
path. IMC 603.12 confirmed as base ICC text across 2009–2024, not a
state amendment. See **T15**.

**S7 — The sweating margin in warm-humid climates is real and thin, and
vapor-barrier continuity ranks with R-value.** `confidence: medium`

Supply air runs ~55 °F while outdoor and attic dew points average
mid-70s °F and reach ~80 °F on the humid coast. Practice is to size
insulation so the jacket surface stays above ambient dew point, and to
treat end-to-end vapor-barrier integrity as **just as important as the
R-value** — because moist air that penetrates porous insulation
condenses on the cold duct wall *regardless of thickness*.

- Energy Vanguard (Allison Bailes) — the 55 °F-vs-dew-point passage
  **and** the "end-to-end integrity of the vapor barrier … is just as
  important as the R-value" line (a quotation, not our synthesis).
  <https://www.energyvanguard.com/blog/buried-ducts-risk-condensation-humid-climates/>
- Insulation Outlook (NIA): "Maintaining the surfaces of below-ambient
  systems above the dew point temperature is paramount"; a vapor
  retarder is "absolutely necessary."
  <https://insulation.org/io/articles/condensation-control-why-the-proper-insulation-choices-will-keep-you-out-of-the-rain/>
  ·
  <https://insulation.org/io/articles/avoiding-condensation-on-systems-that-operate-at-below-ambient-temperatures/>
- Contracting Business — sweating supply duct in unconditioned space as
  a routine southern service call.
  <https://www.contractingbusiness.com/service/article/20866331/solutions-to-the-case-of-the-sweating-duct>

*Survived*, and the refuter independently confirmed the FSEC / Building
America buried-duct research is real and **condensation-motivated**
(OSTI hot-humid buried-duct moisture report; "Compact Buried Ducts in a
Hot-Humid Climate House," 2016) — i.e. R-8 alone was never presumed
sufficient against condensation there. See **T16–T17**, and §4 on the
inversion this does *not* license.

### Mechanics

**S8 — Freeze exposure is three terms multiplied: cold design OA
temperature × outdoor-air fraction × a wet coil. Climate sets one of
them.** `confidence: medium`

At the ASHRAE 99.6 % heating design condition, hot-humid cities never
reach freezing or sit barely below it — Miami **46.3 °F**, Tampa 36.6,
Corpus Christi 32.5, New Orleans 30.6, Houston 27.7, Austin 25.7 —
while cold-zone cities design for deeply subfreezing air: Chicago −5.0,
Minneapolis −14.9, Bismarck −20.8 (Boston 7.7, Atlanta 18.8). In Miami
the coldest air a designer plans for is ~14 °F **above** freezing, so
coil burst is outside the design envelope; in Minneapolis it is ~47 °F
below.

The OA-fraction term is independent of climate. NIH names 100 % OA
units "particularly at risk for freezing and bursting heating and
cooling coils, causing building flooding," and prescribes preheat with
cooling-coil circulation pumps running "whenever the temperature of the
air leaving the preheat coil is less than 40 °F." Below 100 % OA the
mechanism is stratification: "Cold outdoor air mixed with warm return
air tends to remain stratified. This can freeze the bottom of water
coils."

**Exposure is not zero in the South.** Houston's design temperature is
below freezing, and southern cold snaps produce well-documented losses
— the February 2021 Texas freeze being canonical, with a Texas TAB firm
documenting a school district that "decided to ignore Freeze Protection
protocol," shut its central plant down, and flooded.

- FGIA compilation of ASHRAE 99.6 % heating design temperatures
  (extracted from the 2005 Handbook of Fundamentals; the Handbook
  itself is paywalled — this is a **secondary** compilation).
  <https://fgiaonline.org/wp-content/uploads/2025/02/ASHRAE-Temperatures-for-Major-US-Cities.pdf>
- NIH ORF TB #130 (above); BetterBricks on preheat placement
  <https://betterbricks.com/resources/ahu-preheat-heating-coil-and-cooling-coil/>;
  Cooney on stratification
  <https://cooneyengineeredsolutions.com/engineering/cold-climate-hvac-design/>;
  Engineered Air Balance on Feb 2021 (above).

*Survived* an unusually hard refutation pass: all eleven design
temperatures reproduced to the decimal, every quotation verified, and a
targeted hunt for any source framing preheat/glycol freeze-protection
design as a *hot-humid-zone* concern **found none**. The refuter also
turned up unsolicited support the claim had not cited — US patent
6,318,096, premised on stratified sub-freezing layers freezing coils in
mixed-air AHUs. But this claim also carries the worst citation defects
in the set: see **T11–T14**.

---

## 3. Nothing was refuted — here is what the refutation stage demoted

Zero of eight claims fell. Eighteen sub-elements did. **These are the
traps future prose must not fall into**, and three of them (T7, T9,
T11) would each have shipped a wrong sentence that read perfectly well.

**On S1 (low SAT):**

- **T1** — "latent-driven across the whole spectrum," read in
  isolation, overstates the cold-air case. EN 29-2's **first** stated
  driver for 45–48 °F is the 30–40 % airflow reduction (first cost /
  fan energy); the drier space is second. And its 60 °F ceiling is
  attributed to three things at once — fan horsepower, fan noise *and*
  humidity control — in a passage that opens "There is no one right
  answer."
- **T2** — numeric drift inside the sources themselves: EN 49-1's
  worked space is **73 °F**/50 % RH, not 75; EN 29-2's body text says
  55–65 % RH for 55 °F supply where its own Table 1 says 55–60 %.
  Cite the table and don't harden either figure.

**On S2 (90.1 DOAS / SAT reset):**

- **T3** — "dry/marine/cold zones" is a loose gloss for `4–8`, which
  contains **moist 4A and 5A**. Use the explicit zone list or say
  nothing.
- **T4** — humid zones keep a third exception (≥ 80 % OA with
  exhaust-air energy recovery, §6.5.6.1) plus two all-zone exceptions.
  "Only narrow OA-volume exceptions" undersells the set.

**On S3 (economizers):**

- **T5** — differential dry-bulb **is** permitted in 5A and 6A, which
  are also moist "A" zones. The prohibition is `1A/2A/3A/4A`, never
  "the A zones."
- **T6** — the 75 °F fixed dry-bulb group includes cold zones **7 and
  8**, not just the dry and marine ones.
- **T7 — the trap that matters.** The high-limit table constrains only
  the **warm** end of the economizer band. 90.1 explicitly contemplates
  economizing into freeze-risk air: the same Trane newsletter records
  that the OA damper *shall not begin to close to prevent coil freezing
  until leaving-air temperature is below 45 °F.* Southern economizers
  running in a narrow mild band is an accurate description of *where
  they operate*; it must never be written as **the code forbidding
  cold-weather economizing in the South**, which it does not.

**On S4 (freeze-stat authority):**

- **T8** — UFGS 23 09 00 is an inert citation. The Aug 2024 edition
  carries no freezestat content; the hardware requirement lives in the
  23 09 23.x product sections that 23 09 93's designer note references.
  Cite **23 09 93 alone**.

**On S5 (freeze-stat application):**

- **T9** — **"capillary averaging element" is a mislabel** and the
  original finder used it. The element trips on its **coldest** 8–12
  in., which is the opposite of averaging — that distinction is the
  whole reason it is mounted downstream. Say *vapor-charged capillary
  element*.
- **T10** — the L482A's range conflicts inside its own paperwork:
  catalogs and HPAC say 15–55 °F, the Honeywell installation sheet says
  an internal physical stop limits adjustment to **35–55 °F**. And
  manual reset is the consistent *application* practice, not the only
  product form — auto-reset freezestats exist.

**On S8 (freeze mechanics) — the worst-cited claim in the set:**

- **T11 — an inverted quotation.** The HPAC stratification sentence is
  about the freezestat **capillary**, not the coil, and HPAC offers it
  as a reason *not* to mount the element on the entering-air side: a
  short length of tube sees below-freezing air "while the coil itself
  is in no danger." HPAC treats stratification purely as a
  **nuisance-trip** cause. Cite **Cooney**, not HPAC, for stratification
  freezing the bottom of a coil at less than 100 % OA.
- **T12** — the "RTUs with water coils should always have freeze stats,
  even if using a water/glycol mixture" quotation is real but published
  by Dynamic Air (`dac-hvac.com`, a **Boston** contractor — itself
  cold-climate), not the site it was attributed to.
- **T13** — two Cooney items could be found on **none** of five Cooney
  pages checked: the "most systems have no coil-freeze safeguards"
  prevalence claim and the "active winter CHW operation across
  FL/GA/SC/AL/MS/LA/TX" note. Drop both. (The first was vendor
  marketing regardless.)
- **T14** — the FGIA compilation shows visible transcription sloppiness
  elsewhere in the same table (Las Vegas / Reno / Carson City labelled
  "NE," Indianapolis "IA"). All eleven cited values reproduce, but it
  is a secondary compilation of a paywalled Handbook — say so whenever
  a design temperature is quoted.

**On S6 / S7 (duct):**

- **T15** — the residential R-8 / R-6 attic baseline is **uniform**
  across zones, not scaling with them. Only the 90.1-style commercial
  table scales, and it scales by zone **number**.
- **T16** — the "low-permeance retarder goes on the exterior (warm)
  side" detail is standard practice but appears in **neither** cited
  Insulation Outlook article. Don't cite them for it.
- **T17** — the Mechanical Insulation Design Guide is **free** on WBDG
  (`wbdg.org/midg`); only the ASHRAE Handbook chapter is paywalled. An
  earlier draft called both paywalled.
- **T18** — the USA Coil "Florida Freeze Warning" page still returns
  HTTP 500. It was never read; only search snippets. Do not cite it.

---

## 4. Still not established — do not assert

The handoff's three items, resolved individually, plus what the
refutation stage added.

**Stands, unchanged — whether southern jobs commonly omit the LLS.**
The *structural* question is now answered (S4): no code mandates it,
G36 makes it optional, UFGS requires it unconditionally, and
warm-climate owner standards are silent where cold-climate ones are
explicit. What is still missing is a **frequency**. No practitioner
source affirmatively says "we don't fit them down here." The refuter
hunted for one — HVAC-Talk is bot-gated, Reddit surfaced nothing on
point, and the single hint concerned *residential heat pumps*, a
different device class. Absence of mention in a 2-page criteria
document is weak evidence, and MasterSpec-derived project specs
(paywalled) may include the device regardless. **Say practice varies
and no climate cutoff exists in any authority; never say southern jobs
omit it.**

**Stands, with a useful correction — any specific southern setpoint.**
Not only is no southern-specific setpoint established, **no source
gives a climate-differentiated setpoint at all**. The ~35–37 °F band is
a *national device band* (Honeywell factory 35, HPAC "typically 37,"
EAB 35, NIH 37 adj.) — it is not a Northeast number. That is a finding,
and it still licenses no southern figure.

**Splits — code requirements by jurisdiction.** Three different
answers:

- *Freeze protection:* **upgraded to a sourced negative.** No IMC / IBC
  / energy-code mandate for a coil freezestat, per a targeted hunt that
  checked IMC Ch. 12, 90.1 §6.4.3.7 and a site-restricted search of
  `codes.iccsafe.org`. Scope honestly: model codes plus spot state
  adoptions, **not** an exhaustive sweep of state and local amendments.
- *Duct insulation and condensation:* **upgraded to established**, with
  verbatim code text (S6) — IMC 603.12 / 604.11, IECC R403.3.1, the
  0A–3A buried-duct R-13, and 90.1 Table 6.8.2 footnote a.
- *Economizers and SAT reset:* **upgraded to established by zone**
  (S2, S3), **edition-scoped**. The economizer figures are 90.1-2013 via
  Trane, independently confirmed against IECC 2018 as adopted in
  Colorado. Spot-checks suggest 1A/1B stayed exempt in later editions
  but this was not verified edition by edition, and Climate Zone 0
  entered in 2016+.

**Added to the list by this research:**

- **The north-freeze / south-sweat inversion is our synthesis, not a
  finding.** Both halves are sourced; the *equivalence between them* is
  stated by no source found. Ship it as the site's own framing, in the
  site's own voice, or not at all — never with a citation behind it.
- **"DX coils cannot burst from freezing."** Two trade sources say it
  and the physics is plain, but the *sourced* claim is the positive
  one: freeze-burst protection protects water and steam coils.
- **How often condensation rather than energy governs final insulation
  thickness** on exposed low-SAT duct. No source quantifies it; the
  methodology lives in ASHRAE Handbook—Fundamentals Ch. 23 (paywalled).
- **Whether warm climates run lower supply temperatures *than cold
  climates* on ordinary jobs.** Nothing establishes that comparison —
  and it is the owner's original phrasing, so it needs saying plainly.
  What *is* established is that the humid-climate constraint prevents
  raising SAT the way a dry or cold climate can, which is a different
  sentence.
- **Whether southern freezestats are absent or present-but-defeated.**
  Nuisance-trip setpoint-lowering is documented as a *general* practice,
  not a southern one.

---

## 5. Proposed prose directions — owner review required

**Proposals, not copy.** None of these has been written into a page;
each names the variation rather than legislating a second house answer.
Pick, reject or rewrite.

> **Owner pick, 2026-08-09 (same day):** **P1, P4 and P5 are blessed**
> for lanes to draw on when they next touch relevant copy. **P2 and P3
> "may earn their place"** — provisional, not rejected. His
> accompanying concern became a standing direction of its own: dense
> pages ship background prose collapsed and expandable per section
> (recorded in the friction file's site-wide tooltips entry, and the
> glossary arc's pilot surface is where it first lands).

**P1 — The two cold surfaces.** *"Cold air is a hazard in both
climates. The hazard sits on opposite sides of the duct wall."* Up
north, air near freezing crossing a wet coil bursts the coil. Down
south, 55 °F air inside a duct running through an attic at an 80 °F dew
point sweats the outside of it — and the margin is thin enough that a
southern job specifies the vapor barrier as carefully as the R-value.
⚠️ **This is the handoff's inversion, corrected.** The handoff phrased
it as *"the same low supply temp is a freeze problem up north and a
sweating problem down south"* — but the northern hazard is not the
55 °F design supply temperature; it is the air at the coil, a different
quantity. The honest form names two surfaces, not one temperature. And
per §4 the inversion carries no citation.

**P2 — The low limit is an engineering decision, not a code line.** Two
flagship documents point in opposite directions: a national guide spec
puts a hardwired freeze stat in *every* hydronic-coil AHU sequence,
unbracketed, wired to the fan starter; the flagship sequence guideline
says "if a freeze-stat is present" and "if installed." No building code
requires one. The teaching move is that the answer lives in **this
job's** specification, and the reader should go read it — the exact
"name the variation, teach pattern-reading" shape.

**P3 — Silence is not a rule.** Warm-climate owner standards don't say
to omit the freezestat; they simply never mention it, while cold-climate
standards spell out every trip action. Pair that with February 2021 in
Texas, where the weather stepped outside the design envelope and the
buildings flooded. The lesson is about reading an absence correctly —
a project-by-project answer, not a regional one.

**P4 — Freeze exposure has three terms, and climate sets one.** Design
OA temperature × outdoor-air fraction × a wet coil. A 100 % OA unit in
Atlanta can be more exposed than a minimum-OA mixed-air unit in Boston,
and a DX rooftop has no coil to burst at all. This is the framing that
makes the workbench's Northeast scoping honest **without inventing a
southern number** — it gives the reader the multiplication instead of a
setpoint.

**P5 — Why the economizer sequence looks different down south.** The
energy code doesn't ask for an airside economizer at all in the
very-hot zones, and where one exists in a humid zone it locks out at a
lower outdoor temperature and can't use the differential strategy —
because pulling in humid outdoor air costs more than the free cooling
saves. ⚠️ Must carry **T7**: the code constrains only the warm end of
the band, and still contemplates economizing into freeze-risk air.

### Two notes on shipped work — not prose proposals

- **PR #488's software limit has an external reference point.** 90.1 /
  the Trane newsletter records the OA damper not beginning to close for
  coil-freeze protection until **leaving-air temperature is below
  45 °F** — an independent, published number in the same family as the
  workbench's software `LLS Trip` at 41 with hardware at 38. Not a
  reason to change anything; worth knowing that 41 sits inside a
  recognisable band rather than alone.
- **Nothing found contradicts PR #488's scoping.** Its numbers are
  scoped in-code to Northeast US practice and it invents no
  other-climate figures, which is exactly what this research says the
  evidence supports. The 35–37 °F device band (§4) is national, so the
  hardware stat's 38 °F is a house choice near the top of a national
  band, not a regional value.
