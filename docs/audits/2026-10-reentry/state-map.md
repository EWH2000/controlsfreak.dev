# State of controlsfreak.dev — 2026-10-05

> **Disposition: the state-of-project map (a record).** Produced 2026-10-05, the owner's first session back after a two-month pause, by a read-only 21-agent workflow (6 Sonnet ledger-classification lanes + 2 content-audit lanes, each adversarially refuted by an Opus lane; Opus lanes over the friction file, the arc docs and the open external PR; a Sonnet drift-check lane; one Fable synthesis). Repo read at local main `44a1322` with origin/main at `e33a825` (PR #601). **A snapshot, not live state** — the live readout is `npm run status`; where this file and that script disagree, the script is current. Superseded by nothing yet.
>
> **Owner rulings taken the same day, on this material:** (1) the dashboard is a durable report-only `npm run status` script plus this record; (2) **PR #602 (external Korean localization) was CLOSED** courteously with a fork suggestion — see `pr602-assessment.md`; (3) the first work lanes after the decision sitting are **mechanical cleanup only**; (4) **the next content arc is deliberately NOT picked** — §2 item 3 (the §7.2 gloss lane vs the dev-arc-brief re-triage) stays an open owner item.


Synthesis of the read-only state-map lanes (codebase-issues c1–c6 + refutation, content-audit a1–a2 + refutation, friction file, arc docs, health, PR #602). Repo read at local main `44a1322`; origin/main is `e33a825` (PR #601, 2026-09-02). Appendix: `appendix.md` beside this file.

## 1. Headline numbers

| Metric | Value | Source |
|---|---|---|
| Canonical pages | **134** — tools 33 · simulators 10 · education 41 (40 lessons + landing) · practice 42 (41 quiz/drill pages + landing) · guides 1 · topic hubs 4 · root 3. Hidden: 3 (`ddc-workbench-ahu-mockup`, `404`, `styleguide`) | health #1 |
| Manifest / sequence drift | `tests/pages.js` 134 = 134 canonical; `educationSequence.js` 40 = 40 | health #2, #3 |
| codebase-issues audited | **122** entries (#19, #138–#321). After refutation: **resolved 76 · partially-resolved 11 · deferred 13 · open 16 · decision-needed 6**; owner-flagged 8 (#247, #268, #316–#321) | appendix §A tally |
| Refutation overturns | 4 of 122 statuses (#19, #221, #310, #315) + 2 field corrections (#197, #178); 0 of 36 content-audit | §7 |
| content-audit audited | 36 (#31–#64, #88, #89): resolved 32 · accepted 2 (#52, #64) · **open 2 (#88, #89)** | a1, a2 |
| `[future:]` markers | 115 occurrences; 72 lack an inline shipped annotation; ~10 are prose mentions, 1 a rejected idea; **~35 distinct unshipped targets**; 3 stale tracking markers (friction 2786, 2793, 5558) + 2 stale prose mentions (80, 634) | friction notes |
| Gloss | 399 `data-gloss` marks (arc doc claims 396); 74 entries (matches) | health #8 |
| Quiz banks | 41; **38 under 15** (34 at 10, 3 at 11, 1 at 13); 3 at ≥15; 0 at the 20+ goal; modbus-decoding frozen at 10 | health #9 |
| Git | local main 0 ahead / **2 behind**; **8 branches to reap**; no stray worktrees; stash empty | health #10a/b |
| Version | 3.90.0 (`package.json` = lock) | health #13 |
| Dependencies behind | 3: eleventy 3.1.6, playwright 1.63.0, wrangler 4.147.0 | health #11 |
| README tour gaps | 24 canonical pages unmatched by filename or title (lane count; 25 names listed) | health #4 |
| Copy hygiene | 0 placeholder markers; 0 "plain English" in `html/` | health #6, #7 |
| Open PRs | #602 (Korean i18n): 358 files, +49,546/−2,318, MERGEABLE, **CI never executed** (0 jobs on both runs) | pr602 |

## 2. Open owner decisions

Each: source · ask · what the owner needs to know.

**Tier 1 — blocking or time-sensitive**
1. **PR #602 Korean edition** (pr602) — merge / request changes / close. Needs: whether a Korean audience is wanted at all; CI runs 33315757210 and 33705257235 expired unapproved with 0 jobs, so "CI failing" is not a reason; the guards would fail the build on ~half of recent merges (82/173, 2026-07-28→08-30) and hash-lock every quiz bank. Lane recommends **close courteously + fork route (MIT)**.
2. **#319 Cloudflare AI Crawl Control** (L14968) — owner opens the dashboard and confirms no Training/AI-bot block (legacy toggle also blocks Googlebot). Action, not choice; downside is silent deindexing.
3. **Which is next: §7.2 gloss lane or dev-arc-brief re-triage** (friction:6345 vs glossary-arc.md:637-639). Needs: the friction trigger fired 2026-08-14 (glossary-arc.md:421); neither doc records the later order as an owner ruling.
4. **#318 Speed Brain** (L14938) — turn off or record acceptance; it is 100% inert.

**Tier 2 — structured data (logged 2026-08-27/28; none fixed by ef7cade despite its title)**
5. **#317 FAQPage JSON-LD** (L14907) — keep / keep + recorrect rationale / retire. Position 2 cheapest.
6. **#320 TechArticle author/publisher** (L14992) — A: author name/sameAs on 40 lessons; B: publisher (delete recommended). Then one hunk at `.eleventy.js:1384-1385`.
7. **#321 Guides as a section?** (L15047) — add `guides` to `SECTION_MAP` or accept two-item breadcrumbs.

**Tier 3 — a11y / workbench**
8. **#316 (= #285) widen contrast-sweep force-open** to `details.tool-preamble` / `.pid-spoiler`, ~30 pages (L14883; `contrast-sweep.spec.js:459-463`). Needs: whether the 2026-08-09 "add collapsed patterns to the force-open list" direction already decides it; budget for what it finds.
9. **#268 `#ahu-desc` 5,609-char SVG desc shape** (L12704) — nested `role=img` groups / HTML below graphic / leave. Length itself is ruled.
10. **#247 AHU twin of the low-charge over-claim** (L11575-81; `ddcw-ahu-unit.js:1998`) — apply the FCU disposition-3 hedge? Tracked nowhere else.
11. **#273 + `.ddcw-key` duplication family** (L12977, L14264) — graduate to `styles.css` as `.ddcw-forced-mark`? Mechanical, live, version bump.

**Tier 4 — content calls (S once answered)**
12. **balancing.html:497 "floating-point input"** (glossary-s4-collision-proposal.md:779; glossary-arc.md:588-590) — field usage or copy defect? Suggested "floating (tri-state)". Lives only in the arc docs.
13. **fail-to-start** as re-triage candidate (s4 proposal :689) — its value is the §7.2 quiz surface.
14. **Three live coming-soon promises** (`tools/airflow.html:183`, `tools/waterside-load.html:65`, `tools/voltage-drop.html:158`) — approve removal (violates CLAUDE.md no-coming-soon).
15. **#88 / #89 ASHRAE 135 softenings** (content-audit L3117, L3137) — confirmation against the owner's copy is optional; direction is concrete.
16. **PID basics direct/reverse-acting** (friction:2397) — aside vs example swap; pairs with EXCLUDED-map trigger (friction:6288-6291).
17. **Mixed-air mass-vs-volume beat** (friction:6410) — home: coil-freeze-risk reference column or air-mixing note.
18. **Warm-climate P1/P4/P5 copy** (warm-climate-freeze-protection.md:566) — dedicated small lane or opportunistic; no page named, no pointer anywhere.

**Tier 5 — arc selection (the re-triage agenda)**
19. **Dev-arc-brief re-triage** (friction:6332; 27 items) — rule the undispositioned A1, A4, C4, D2, D4, E2 and the §0 N2 gap; confirm F4 case-file spine (mockup-first), LON go/no-go (C2/C3), E1/E2 + Controller Commissioner stay parked, pool E3/D1/D3/A2/A3. Inputs: quiz-expansion CEO signal (friction:6302), fail-to-start, mock-service-call audit re-run (friction:12).
20. **Second live hero demo** (friction:7021) — precondition met 2026-08-04; green-light a mockup?
21. **Education-diagram phone legibility** (friction:2237; 12+ pages) — dedicated audit cycle or opportunistic.
22. **Smaller yes/no**: URL deep links (friction:2271), palette recents (2263), FBE annotation primitive + value heads (4728, 4758), CamelCase note (4789), war-story sheets (air-side-sim.md:370), workbench backlog (LLS annunciation :860, preset :870, thermographics :853), #228 scheduling (L9444), GSC export for the late-October pillar re-read (friction:7035).

## 3. Open work by arc

Sizes from entry text; "?" = text does not support one.

**Glossary §7.2 component lane** (glossary-arc.md:637; decided-unbuilt)
- §7.2 quiz-engine gloss component — design proposal first (render-time vs explain/choices-only; FAQPage + Review-table strip; owners[] → bank mapping). No code exists. ?
- EXCLUDED-map re-exam at opening (friction:6282): per-row rulings; direct/reverse-acting return conflicts with the "no kind component" ruling (s4 proposal :3-50). S per row.
- Rides along: #185 mount-validator symmetry (L6771, "one-line", S); #313 gloss.spec.js arm count (S); #314 subhead ids at bacnet-basics:466, bacnet-networking:534/598 (S); balancing:497 (S if defect).
- Deferred: #301 (owner log-don't-fix).

**Quiz growth waves 2–3** (friction:2532, 6302; in-progress)
- 38 banks under 15, goal 20+; one bank at a time, refute-then-PR; format pills are bank claims. S per bank; arc ?
- New quizzes: interview-prep-junior (friction:2726); order-the-steps / identify-on-diagram formats deferred until a question needs them.
- Dependencies: data files vs §7.2 engine lane (low conflict); PR #602 would hash-lock every bank.

**DDC workbench follow-ons**
- **#283 T-C** (L13558): statusbar chip @8 marker + permanent summary line; only Q1 register detail owed; no `@8` in source. ?
- #208 rem-proportional coordinates (L8281; 39 burials at F=20). ? · #260 first-mount state reset (L12222). ? · #273 rename (S; `ddc-workbench-fcu.html:212`, `…-sensors.spec.js:251`) · #307 register-key well ids (L14689). S? · #247 AHU hedge (S).
- Backlog (air-side-sim.md:852-893): LLS software-trip annunciation (:860), LLS-defeat preset (:870), PID warm-start sentence (:890, S), thermographics / meter-sensor sim (:853, ?), war-story sheets (:370, owner-seeded).
- Deferred with triggers: #263 (third unit), #239 (latent seam), #244 (wire-layer sizing), #233, #270, #277, #310; standing notes #284, #295.
- friction:709-723 residuals: intake arrow; #240 fog-marker redesign (owner).

**SEO / structured data #317–#321** — decision-gated (§2 items 2, 4–7). After answers: #320 one hunk + @id guard (S); #321 one key (S). #305 alt-text audit deferred on GSC trigger. Late-October GSC re-pull (friction:7035) is input only.

**Content-audit editorial**
- #88 soften `bacnet-networking.html:521` + `second-network-next-port` explain (S).
- #89 soften `bacnet-mstp.html:105` + `bacnet-mstp.js:68` to amortized PFM, matching PR #592 (S).
- New (a1 refutation): `hydronic-engine.js:199` comment keeps the old formula; `branchHsrcSlope` :645 uses −2a·Q·spd² (correct −2a·Q). Jacobian only; converged point correct. S; needs a ledger entry.

**Warm-climate copy** — P1/P4/P5 blessed, P2/P3 provisional, nothing shipped (warm-climate-freeze-protection.md:566); likely homes coil-freeze-risk, AHU low-limits sheet note, economizer pages. S per page. Coil-freeze-protection lesson (friction:1944): research done. ?

**a11y / legibility** — #316/#285 widen + triage (?); #286 `@media print` for `.tab-pane` (`styles.css:1630`; S); #262 TOUCH-TARGET FLOOR width audit (L12345; ?); #268 (decision); #255 opt 3 font re-subset (friction:4712; 6 immutable files + cache-bust; ?); phone-width diagram labels (friction:2237; per-diagram design, ?); deferred #146, #252.

**Tests / guards** — #238 `buildState` ok:false guard + spec (`psychro-engine.js:184`; S); #228 engine standardisation (L9444; util.js absent; owner-directed "scheduled separately"; G1 golden values ride it; ?); #291 negative-assertion re-anchor sweep (L13979; ?); #191 anchor-text guard (L7016; ?); #204(a) line-anchored mask ("wants its own PR"); #207(a) accepted; #277, #294 standing; mock-service-call audit re-run (friction:12).

**Docs hygiene** — §5 and §6 rows; plus #186 close-read ~8 prose-lint HIGH flags (L6827; S), #309 comment (`styles.css:1205`; S), #306 `.widget-try a` dead CSS (`styles.css:4073/4080`; S, needs a styles.css lane).

## 4. Recommended order

Rules applied: utility over SEO (owner 2026-07-14); flagship standard (RL sim); the owner's 2026-08-07 brief + 2026-08-12 triage (friction:6332-6392); the arc doc's "next" (glossary-arc.md:637-639); live-merge approval scope; Opus/Sonnet for mechanical lanes, Fable for judgment (owner 2026-08-01, re-affirmed in this run).

**Docs disagree on what is next**: friction:6345 ("re-triage when glossary phases 2–3 are done" — fired 2026-08-14) vs glossary-arc.md:637-639 (§7.2 lane, then re-triage). Flagged as §2 item 3; the plan below parallelises so the answer costs nothing.

0. **Day-1 hygiene** (§5) and **answer PR #602** (close, option D). Rationale: every content merge conflicts #602, and the contributor has had no reply since 2026-08-30. Rejected: merge (A) — permanent twin obligation, unreviewable Korean, no off-switch; leave open (E) — rots on the first merge.
1. **Decision batch** (§2 tiers 1–4; the 2026-08-12 "clear-the-decks" pattern). Rationale: six decision-needed entries plus #319 have waited since 2026-08-27; most are five-minute answers that unblock S fixes. #319 first.
2. **Mechanical S-lane** (Opus/Sonnet; one PR per concern; one shared-file version bump): #88, #89, #238, #286, #313, #309, #306, #273, #314, #247 hedge, the three coming-soon lines, hydronic slope, #320/#321 hunks once answered, and a docs-drift PR covering §6 rows 1–12. Rationale: all verified open in source by the refutation lanes; clearing them makes the open set honest before the arc pick. Rejected: folding them into arc lanes — that is how #313/#306 have sat since 2026-08-12.
3. **§7.2 design proposal** (Fable) in parallel with **re-triage agenda prep** (this document + the brief's 27 items + mock-service-call re-run). Rationale: the proposal is agent work, the re-triage is owner time; they compete only at §7.2 execution. Rejected: strict serial either way — wastes return-day attention, or leaves the glossary arc without a defined next step.
4. **Quiz-bank growth continues** (Opus/Sonnet, data files, refute-then-PR, owner merges; start with the 34 banks at 10). Rationale: CEO signal (friction:6302), standing disposition, no engine conflict. Rejected: pausing for §7.2 — the arc doc says sequence deliberately, not serialize.
5. **Re-triage pick** — grounded recommendation: **F4 case-file pilot (mockup-first, owner-supplied stories)** + **coil-freeze-protection lesson** (research done and blessed) + **#228 as the tax lane with G1 golden values**. Rationale: utility over SEO; anecdotes must be owner-supplied; research already refuted. Rejected: MS/TP bus sim (flagship-scale, "ships when someone wants it", friction:3667); Theme B (guardrail-impossible); topic-primary nav (decided-NO 2026-08-12); hero demo #2 (needs its own mockup; fits after the pick).
6. **Late October**: GSC export → pillar re-read (friction:7035). Information, not a driver.

## 5. Return-to-work hygiene

| Item | Evidence |
|---|---|
| `git pull` — local main 2 behind origin/main (`e33a825`) | health #10b |
| Reap 8 merged branches: `docs/glossary-arc-verification-corrections`, `feat/gloss-marks-s4-education`, `feat/gloss-marks-s4-tools-landings`, `fix/structured-data-defects`, 4× `worktree-agent-*` | health #10a |
| `npm outdated`: eleventy 3.1.6, playwright 1.63.0, wrangler 4.147.0 (no `engines`; node v22.23.1) | health #11 |
| Baseline `npm test` on an obscure port (8000–8099 occupied); last recorded suite 1208 passed | memory; L13735 |
| Annotate markers friction 2786/2793 (sequencing partly paid), 5558 (commissioning controls half shipped); fix heading 6332 (trigger fired), heading 5717, entry 3286, list 709-723 | friction notes |
| README tour: eyeball the 24/25 unmatched pages (17 practice, 7 tools, privacy) | health #4 |
| Copy orphaned owner items (balancing:497, fail-to-start) and the warm-climate pointer into friction/ledger | arc docs |
| Log in codebase-issues: three coming-soon lines; hydronic-engine slope; #247 AHU twin | friction (d); a1; c3 |
| Verify the #84 cache-bust bump for details-print.js landed | #287 L13737-13740 |
| Decide PR #602 before the first content merge | pr602 |

## 6. Drift and contradictions found

| # | Where | Disagreement |
|---|---|---|
| 1 | friction:6345 vs glossary-arc.md:637-639 | Re-triage order; friction trigger fired 2026-08-14 (glossary-arc.md:421), heading unchanged |
| 2 | friction:6389-6390 vs psychro-engine.js:46-47 | Header names air-mixing/coil-sizing/economizer-ratio, not D1/D3 |
| 3 | tools/airflow.html:183, waterside-load.html:65, voltage-drop.html:158 | Live "tracked/planned follow-up" promises vs no-coming-soon rule |
| 4 | friction:709-723 vs air-side-sim.md:150 | econ-2stage-lowlimits shipped PR #468; mat/dat wired |
| 5 | friction:3286 | Says refrigeration lessons/animation are future; lessons, RL sim (2026-07-15), hub (2026-07-18) shipped |
| 6 | friction:5717 | "Modbus shipping, BACnet to follow" — both shipped |
| 7 | friction:1756 vs #152; friction:3872 vs #134 | Both addressed (2026-07-12, 2026-07-14) |
| 8 | friction 2786, 2793, 5558; 80, 634 | Partly-paid markers unannotated; shipped-page prose mentions |
| 9 | air-side-sim.md:225-230 vs ledger L9187, L9258 | #225/#226 "deferred to pre-live sweep" — RESOLVED 2026-07-30 |
| 10 | air-side-sim.md:314-317 vs :515 | Own-voice name pass offered vs CLOSED 2026-08-03 |
| 11 | name-inventory.md:10-21 vs ddc-workbench.html:3840, :4101 | "Proof Dmpr" vs shipped "Fan Sts Chk"; omits y1/y2, space-temp, gain renames |
| 12 | ledger #204 L8036-8037 vs #203 L7816 | "#203 stays open" — resolved 2026-08-12 |
| 13 | ledger #227 ~L9322 vs #251 L11722; ddc-workbench-fcu.html:192 | "FCU unchanged, keeps focusable glyphs" — glyphs dropped |
| 14 | ledger #221 L9003-9010 | Cites #219 as accepted (fixed PR #553) and page as noindex (graduated 2026-08-04) |
| 15 | ledger #244 L11224 | "Hidden and noindex" premise — graduated 2026-08-04 |
| 16 | ledger #197 L7407-7416; #178 L5603 | Follow-ons already absorbed as #308 (resolved, L14696) and #309 (L14727) |
| 17 | ledger #19 L731 | Heading reads partial; #23 addressed (L1052), p+p rule shipped (#190 L6964) |
| 18 | commit ef7cade vs #317–#321 | Title "repair three structured-data defects (#317–#321)" fixes none of them |
| 19 | ledger #247 L11575-81 vs ddcw-ahu-unit.js:1998 | AHU over-claim live, untracked |
| 20 | content-audit #44 vs hydronic-engine.js:199, :645 | Old formula in comment; slope −2a·Q·spd² |
| 21 | glossary-arc.md (396) vs html (399 marks) | +3 unexplained |
| 22 | README.md vs 24/25 canonical pages | Practice listed by group; 7 tools + privacy absent |
| 23 | privacy.html vs CLAUDE.md "say which, per key" | localStorage families (cf_units, cf_theme, cf_psy_range, cf_rf_refrigerant, cf_th_type, cf_quiz_*) in prose only |
| 24 | glossary-arc.md:588-590, :638-642; s4 proposal :689, :779 | Two owner items absent from ledger and friction |
| 25 | warm-climate-freeze-protection.md:566 | Blessed copy has no pointer in friction/ledger |
| 26 | tests/gloss.spec.js:26 vs #312/#578 | "SEVEN" arms stale (#313) |
| 27 | ledger #316 L14896-14898 | 2026-08-09 direction cited as argument; may already be a ruling |
| 28 | ledger #287 L13737-13740 | #84 bump deferred to merge captain; unverified |
| 29 | PR #602 brief "CI failing twice" | 0 jobs; runs expired unapproved (approval_policy=all_external_contributors) |
| 30 | PR #602 → codebase-issues #317/#320/#321 | Counts rewritten to doubled per-locale figures |
| 31 | ~/CLAUDE.md "as of 2026-06-07", "2026-07-25"; repo CLAUDE.md "13 of 40", "eight pages/seven live", "nine cards" | Dated/counted claims >2 months old (stale-prone, not wrong) |
| 32 | Workflow brief vs friction/health lanes | "grep -v shipped" 89 overstates (22 wrapped annotations); brief's stale-page examples all shipped; `educationSequence.js` exports a derived array, not an `order` property |

## 7. Refutation summary

| Chunk | Entries | Overturned | What moved |
|---|---|---|---|
| c1 | 20 | 1 | #19 partially-resolved → resolved (handoff to #23 not chased) |
| c2 | 20 | 1 | #221 deferred → resolved ("by design, no action" read as pending) |
| c3 | 20 | 0 | — |
| c4 | 21 | 0 | — |
| c5 | 20 | 0 | — |
| c6 | 21 | 2 | #310 open → deferred (same trigger-gated shape as #305); #315 deferred → resolved (GRANDFATHER ruling read as deferral) |
| a1, a2 | 36 | 0 | — |

4 of 158 statuses (2.5%; 3.3% of ledger entries), every one moving toward *more closed* — Sonnet under-closed, never over-closed. Three mechanisms: it did not follow cross-references forward (#19→#23, #197→#308, #178→#309, so two `owner_decision_required`/`suggested_next` fields were stale); it treated no-action rulings ("by design", "GRANDFATHER", "declined") as pending work; and its open/deferred boundary was inconsistent (refutation's line: open = fix wanted, waiting for a vehicle; deferred = outside trigger or owner log-don't-fix). Line cites drifted 1–6 lines in ~10 entries with the quoted text present. Severity labels are lane judgment, not file text (#266 medium; #319 high, supported by L14987-14988). Either-way labels upheld as-is: #142, #165, #185, #207, #252, #270, #277, #284, #291, #294, #295, #64. Calibration: statuses ~97% reliable; re-check owner flags and next-steps against later entries; the friction, arc-docs, health and PR lanes had **no** refutation stage (self-reported brief corrections only), so weight their counts accordingly.

## 8. Appendix

Complete per-entry tables (122 ledger entries with lane and refutation columns, 36 content-audit entries, 50 friction items, 15 arc-doc items, 14 health checks, full PR #602 analysis, lane notes): `docs/audits/2026-10-reentry/appendix.md`