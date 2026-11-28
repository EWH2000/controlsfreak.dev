# Decision-sitting rulings — 2026-10-05

> **Disposition: the durable record of the owner's 2026-10-05 decision sitting (a record).** Sixteen agenda items, all ruled the same day, in the order they were taken — plus item 17, the arc pick, ruled that evening. Each section carries the owner's verbatim words, the facts measured before the ruling, what ships and who merges it, and the marker now on the ledger or friction entry. **Supersedes** the perishable session-scratchpad list the rulings were first captured in — that file is not durable and must not be cited. The *live* state of each item is its ledger heading and `npm run status`; where this file and those disagree, they are current and this is history. Companion to `state-map.md` (the map these items came from — its §2 numbers are given per section) and `pr602-assessment.md`.
>
> **Marker grammar used below.** An item whose fix still needs a code or content PR carries `*(ruled 2026-10-05 — <verdict>; fix pending)*` at the end of its heading; `npm run status` counts it OPEN, sub-state *ruled* (never decision-class), and the `*(addressed …)*` marker appended when the fix merges closes it. An item closed with no code carries `*(addressed …)*` or `*(deferred …)*` directly.

## 1. #318 — Speed Brain *(state-map §2 item 4)*

**Owner:** turned it off in the Cloudflare dashboard (Speed → Settings → Content Optimization).
**Measured:** every Speed Brain prefetch 503'd against `run_worker_first: true` (`cf-speculation-refused: prefetch refused: disabled for worker requests`) — 100 % inert.
**Ruling:** off. Nothing in the repo changes.
**Ships / merges:** dashboard only; ledger closed in PR #606.
**Marker:** `*(addressed 2026-10-05 — owner turned Speed Brain off)*` (on the ledger since PR #606).

## 2. #319 — Cloudflare AI-crawler settings *(state-map §2 item 2)*

**Owner:** checked the dashboard — AI Crawl Control is ON; its trend data shows many successful crawler requests and **0 unsuccessful**.
**Measured:** no training/AI-bot block is in place; Googlebot is not being refused.
**Ruling:** verified, no action. Recheck only if that panel changes.
**Ships / merges:** dashboard only; ledger closed in PR #606.
**Marker:** `*(addressed 2026-10-05 — owner verified: AI Crawl Control on, zero refused requests)*` (on the ledger since PR #606).

## 3. #317 — FAQPage JSON-LD on 52 pages *(item 5)*

**Owner:** *"I agree on position 2, with more people finding resources through AI it's useful but should be stated for what it is."*
**Measured:** 52 `FAQPage` nodes; Google restricted FAQ rich results to government/health sites in Aug 2023, so they earn no SERP treatment here.
**Ruling:** position 2 — keep the nodes for AI / answer-engine readers; correct the rationale wherever the repo frames FAQ markup as a search win.
**Ships:** comment-only edits — `.eleventy.js` (the `faqPageJsonLd` / `faqJsonLd` comments), the `html/_includes/faq.njk` header, and dated correction notes on the friction-file mentions. **Owner merges** — `.eleventy.js` and `_includes/` are approval-class even for comments.
**Marker:** `*(ruled 2026-10-05 — position 2: keep for answer-engine readers, correct the rationale; fix pending)*`.

## 4. #320 — `author` / `publisher` on 40 lessons *(item 6)*

**Owner:** *"Pseudonym and delete publisher."*
**Measured:** `techArticleJsonLd` references `#author` / `#website` by bare `@id`; both nodes exist only in the home page's `@graph`, which already publishes `name: "Controls Freak"`, `jobTitle: "Controls Programmer"`.
**Ruling:** A = the pseudonym `Controls Freak`, inlined as a `Person` (name + jobTitle as on the home page); B = delete `publisher`. The pseudonym is already public, so 40 lessons repeating it disclose nothing new; a real name is the direction that does not undo cleanly; `publisher` is not on Google's recommended Article properties.
**Ships:** one hunk in `techArticleJsonLd` + a regression spec (every education-page `author`/`publisher` has a `name` or an `@id` resolving in the same document). Shares a PR with #321. Live `<head>` on 40 pages → **owner merges**.
**Marker:** `*(ruled 2026-10-05 — pseudonym author inlined, publisher deleted; fix pending)*`.

## 5. #321 — `nav: guides` breadcrumb *(item 7)*

**Owner:** *"Add it to the key, there's enough of a case for it just because of how much traffic my BACnet pages have been getting."*
**Measured:** five `nav: guides` pages emit a 2-item `Home → <page>` trail; the nav already treats Guides as a section (dropdown, `/guides/` landing, active state).
**Ruling:** add `guides: { name: "Guides", url: "https://controlsfreak.dev/guides/" }` to `SECTION_MAP`.
**Ships:** that entry + a spec (four hubs → 3-item trail; `/guides/` → `Home → Guides`), riding the #320 PR. **Owner merges.**
**Marker:** ``*(ruled 2026-10-05 — add `guides` to `SECTION_MAP`; fix pending)*``.

## 6. #316 + #285 — contrast sweep force-open *(item 8)*

**Owner:** *"Widen with bare details."*
**Measured (before the ruling):** in Playwright's Chromium 147, closed-`<details>` content reports non-zero rects and `display: block`, so the walker already measured it — #285's mechanism was right and #316's "unmeasured" premise was wrong. A full sweep with the selector widened to bare `details` passed **14/14 shards, both themes, 0 new failures** — no fix pass to budget.
**Ruling:** widen `settle()`'s third arm from `details.prose-fold` to `details`; this closes both entries (the force-open removes the dependence on the UA detail for every idiom).
**Ships:** the selector + its comment and the spec header. Test-only → **merge on green**.
**Markers:** #316 ``*(ruled 2026-10-05 — widen the force-open to bare `details`; premise corrected; fix pending)*``; #285 ``*(ruled 2026-10-05 — closes with #316's widening to bare `details`; fix pending)*``.

## 7. #268 — `#ahu-desc` as one text node *(item 9)*

**Owner:** *"Leave it with the trigger."*
**Measured:** the live desc is **6,060 chars / 1,071 words / 33 sentences** (the entry's heading says 5,609 — stale); the FCU's is 1,729.
**Ruling:** leave the single node. The topology-first ruling stands, and every live value is already skimmable real text in the points list below the drawing. Nested `role="img"` groups (option 2) and hybrids (option 3) rejected: engines treat a `role="img"` node's children differently, so the structure would be real on one stack and invisible on another. **Revisit trigger:** screen-reader user feedback, or the next restructure of the drawing — then the HTML-prose route.
**Ships:** nothing; docs only.
**Marker:** `*(deferred 2026-10-05 — leave the single node; revisit trigger in the Ruling)*`.

## 8. #247's AHU half → new #323 — low-charge verdict *(item 10)*

**Owner:** *"Hedge it."*
**Measured:** `ddcw-ahu-unit.js` still reads *"No ΔT across the machine — low charge, not cooling"*; no spec pins the string. The readings cannot separate low charge from a plugged condenser, a dead compressor or a plugged metering device — the verdict knows only because the scenario injected `d.fault`.
**Ruling:** hedge to the FCU's disposition-3 shape — *"No ΔT across the machine — air moving; low charge is one candidate, gauges settle it"* ("across the machine" kept: the AHU ΔT is discharge minus mixed air across the whole unit, fan heat included). No `.ref-note` — the AHU has no neighbouring verdict to explain an asymmetry against.
**Ships:** the string + a spec row pinning it and its `.sr-only` mirror. Live script → **owner merges**.
**Markers:** new **#323** carries `*(ruled 2026-10-05 — hedge to the FCU's disposition-3 wording; fix pending)*`; #247 stays RESOLVED (FCU half) with a one-sentence pointer to #323.

## 9. #273 — forced-mark CSS graduation *(item 11)*

**Owner:** *"Graduate it."*
**Measured:** `.ahu-forced-mark` / `.fcu-forced-mark` are declaration-identical page-local head blocks; the FCU class is pinned by name in `tests/ddc-workbench-fcu-sensors.spec.js`.
**Ruling:** graduate to `.ddcw-forced-mark` — one rule in `styles.css`'s DDC WORKBENCH SHELL, both head blocks deleted, rects + comments renamed in both SVGs, the spec's selectors updated, patch bump 3.90.0 → 3.90.1 for cache-busting.
**Ships:** two live pages + the stylesheet → **owner merges**.
**Marker:** the 2026-08-04 `*(deferred …)*` stays, followed by ``*(ruled 2026-10-05 — graduate to `.ddcw-forced-mark`; fix pending)*`` — the status script reads the later ruling as re-opening the entry for work.

## 10. balancing.html:497 — "floating-point input" *(item 12)*

**Owner:** *"I would rather say proportional at that point, a tri state is driven with 2 DOs, so we would either be adding confusion or trading one inaccuracy for another."*
**Measured:** a floating actuator has no 0–100 % command input (two DOs inch it; position is inferred from run time), so naming it in a sentence built on "tell the PICV to be 50 % open" is wrong under either spelling.
**Ruling:** drop the floating mention; say proportional. Proposed sentence, owner tweaks on the PR: *"The actuator on top is the same kind a BMS would drive on any other control valve — a proportional analog input, 0–100 % open."*
**Ships:** one sentence on a live lesson → **owner merges**.
**Marker:** a `RULED 2026-10-05` line in the friction file's glossary-arc entry (*Hover tooltips — a SITE-WIDE affordance question …*); `docs/glossary-arc.md`'s two open-item passages carry a dated ⟨…⟩ note.

## 11. fail-to-start — re-triage candidate *(item 13)*

**Owner:** *"Park it with the pointer."*
**Measured:** **zero markable sites outside the two owners** — the wiresheet hit is an `<h3>`, three are `navCard()` desc args, eight are quiz-bank uses. Its only consumer is the quiz surface.
**Ruling:** park into §7.2 and decide it with the §7.2 design.
**Ships:** the tracking pointer (this PR, docs); a code comment in `html/_data/glossary.js` rides the next approved `html/_data` PR (approval-class, so not this one). Note: there is no `fail-to-start` glossary entry — the term appears only inside `proof-window`'s `def`, so the comment lands beside that entry.
**Marker:** a `RULED 2026-10-05` line in the friction file's glossary-arc entry; the same ⟨…⟩ note in `glossary-arc.md`.

## 12. Three "follow-up" lines in scope ref-notes *(item 14)*

**Owner:** *"Narrow the clauses. coming-soon as fine buried in the page, but I don't want to advertise a list of features in a large and noticeable way, but it's fine in the current context."*
**Measured:** `tools/airflow.html:183` (metric VP mode, with a unit list and formula), `tools/voltage-drop.html:158` (metric mm² / Ω-per-km option), `tools/waterside-load.html:65` (glycol correction row — already narrow).
**Ruling:** narrow, don't cut; the no-coming-soon rule is amended — the ban is on PROMINENCE (a visible list of unbuilt features, a "coming soon" look, a promise in body or lesson prose), and a brief low-key clause at the tail of a scope `.ref-note` is acceptable.
**Ships:** airflow → "…The m/s readout rides along; a metric VP mode is a tracked follow-up."; voltage-drop → "…a metric option is a tracked follow-up."; waterside-load unchanged. Live tool pages → **owner merges**. In this PR: the CLAUDE.md amendment and the status script's coming-soon regex narrowed to the banned shapes (merge on green).
**Marker:** no ledger entry; the three friction `[future:]` markers (metric VP mode / glycol row / mm² option) stay as the tracking mechanism.
Shipped in PR #622 (airflow + voltage-drop narrowed; waterside unchanged).

## 13. content-audit #88 + #89 — ASHRAE 135 softenings *(item 15)*

**Owner:** *"Soften both, I'll check the clauses on the PR."*
**Measured:** #88 — Annex J sets the 0xBAC0 default and permits other ports; the sequential 0xBAC1/0xBAC2 practice is convention (IANA 47808–47823), not a normative rule. #89 — Clause 9's maintenance Poll-For-Master is amortized (one per `Npoll` = 50 token receipts, by the master below the gap), not a per-rotation walk.
**Ruling:** soften both surfaces of each (lesson + quiz explain) in one lane. #88 → "Annex J's default 0xBAC0, then 0xBAC1/0xBAC2 by convention (IANA 47808–47823)". #89 → the amortized story (costs: an occasional `Tusage_timeout` stall, slower newcomer discovery, slower ring re-formation; the advice taught is unchanged), converging with PR #592's `max-master-where-to-set` explain. **The PR body must quote the clauses it relies on**; the owner verifies them there.
**Ships:** live lessons + quiz banks → **owner merges**.
**Markers:** #88 `*(ruled 2026-10-05 — soften both surfaces in one lane with #89; owner checks the clause on the PR; fix pending)*`; #89 `*(ruled 2026-10-05 — soften both surfaces to the amortized Npoll story in one lane with #88; owner checks the clause on the PR; fix pending)*`.
**Correction (2026-10-05, PR #615 verifier round — the ruling above stands as recorded):** two premises under *Measured* were wrong. #88 — there is no IANA 47808–47823 block; IANA registers `bacnet` at 47808 only (47809/udp is PreSonus's `presonus-ucnet`; 47810–47999 unassigned). #89 — `Npoll` gates when a maintenance Poll-For-Master *sweep* starts, not the interval between polls: after ~50 quiet passes the master below the gap polls one address per token visit until the gap is swept, so on a small trunk at 127 most rotations carry a stall. PR #615 ships the sweep-and-rest story; details under content-audit #89.

## 14. PID basics — direct vs reverse acting *(item 16)*

**Owner:** *"The aside."*
**Measured:** the P callout's only worked example is a chilled-water (direct-acting) loop while every mini-sim is a heating (reverse-acting) loop, and the page never names the distinction.
**Ruling:** one sentence after the worked example naming **controller** action (the site also uses direct/reverse for actuator signal-to-stroke on `commanding-actuators.html` — say which sense), terms linked to `comparators-and-deadband.html`. Keep the chilled-water example — its 12.8 / 15.6 / 2.8 °C figures are CLAUDE.md's metric-rounding exemplar.
**Ships:** live lesson → **owner merges**. By-catch logged as **#324** (the tuner's cheat sheet advises "flip acting", a control the tuner lacks) — open, not ruled.
**Marker:** friction heading `*(ruled 2026-10-05 — one-sentence aside in the P callout; lane pending)*`.

## 15. Mixed air — mass vs volume basis *(item 17)*

**Owner:** *"The tool row."*
**Measured (2026-07-28, engine run):** at OA 0 °F / RA 75 °F / 20 % minimum, the mass OA fraction is 22.8 %, and MAT is 58.1 °F mass-weighted vs 60.0 °F by hand — ~2 °F optimistic against the 35–38 °F freeze band.
**Ruling:** a `.tool-body-row` reference section on `tools/coil-freeze-risk.html` ("Why hand mixed-air math runs warm on a cold day"), linking `tools/air-mixing.html`'s mass-basis FAQ; metric twins per the rounding policy; **numbers re-derived from `Psychro.mixStreams` at authoring**, not copied. If the arc picks the coil-freeze-protection lesson, the beat moves there and the row shrinks to a pointer.
**Ships:** live tool page (damage-stakes note) → **owner merges**.
**Marker:** friction heading `*(ruled 2026-10-05 — reference row on coil-freeze-risk.html; small content lane pending)*`.

## 16. Warm-climate P1 / P4 / P5 copy *(item 18)*

**Owner:** *"Pointer now plus a small lane, good calls all around."*
**Measured:** blessed 2026-08-09 in `docs/warm-climate-freeze-protection.md` §5 (8 claims, 8 survived refutation), never shipped; the only pointer lived in the handoff retired 2026-08-21.
**Ruling:** plant a friction pointer now; one small content lane after the mechanical cleanup (absorbed by the arc if it picks the freeze lesson). Natural homes: P1/P4 → `tools/coil-freeze-risk.html` or the coil-freeze-protection lesson; P5 → `tools/economizer-ratio.html`'s reference section, carrying T7.
**Ships:** the pointer (this PR, docs); the lane later → **owner merges**.
**Marker:** new friction entry *Warm-climate freeze-protection copy — P1 / P4 / P5 blessed 2026-08-09, unshipped* `*(pointer planted 2026-10-05)*`, directly after the Coil Freeze Risk Checker entry.

## 17. The next content arc *(state-map §2 item 3; owner ruling 4 had left it open)*

**Owner:** *"Freeze season plus quizzes, your recommendation."* Then, on the night plan: *"You have my blessing to do everything listed, good plan."*
**Presented:** three shapes — **freeze season plus quizzes** (recommended), **case-file spine first**, **finish the glossary (§7.2) first**. The recommendation moved from the plan file's earlier "F4 + freeze lesson + #228" because the owner's BACnet pages carry the traffic, the season is about to hand the freeze tool its busiest months, and he came back cost-conscious.
**Ruling — the arc, in order:**
1. **The coil-freeze-protection lesson first.** Its `[future:]` marker exists, the warm-climate research record (`docs/warm-climate-freeze-protection.md`) is done and verified, the tool's protection-stack row is its outline, it absorbs the mixed-air mass-vs-volume beat (item 15) and the P1 / P4 / P5 copy (item 16), and it is October with freezestat season weeks away.
2. **Quiz-growth wave 2 alongside** — one bank per PR, Opus drafts, Fable refutes, owner merges. The first three the same night: air-handlers, economizers, pid-basics (no BACnet bank was under target).
3. **#228 engine standardization** as the background tax lane — design note first.
4. **The F4 case-file content type** as ONE mockup lane at the end of the arc; stories owner-supplied only after he has seen a shape.
5. **The glossary §7.2 quiz-bank gloss component AFTER that** — real but marginal and unmeasured value, and an engine change on 42 live practice pages.
6. **The remaining dev-arc-brief items** — A1, A4, C4, D2, D4, E2, the §0 N2 gap and the LON go/no-go (C2 / C3) — to a short sitting of their own, with the friction file's banked analysis as input.

**Ships / merges:** this record and its markers (docs → merge on green); every arc lane on its own PR under the usual merge authority.
**Markers:** state-map ruling 4 `⟨2026-10-05 evening: picked — freeze season + quizzes; rulings.md item 17⟩`; friction *dev-arc brief* heading `*(re-triaged 2026-10-05 — …)*` plus a dated closing paragraph; friction *Quiz expansion* heading `*(wave 2 opened 2026-10-05 — …)*`; `glossary-arc.md`'s three "§7.2 lane next" lines `⟨2026-10-05: sequenced AFTER the freeze-season + quizzes arc — rulings.md item 17⟩`.

### Night 1 execution (2026-10-05 → 06)

Read from `gh pr list` while this record was written; the arc lanes were still opening, so this lists what existed at that moment — the live state is GitHub.

**Merged (since 2026-10-05):**
- #603 docs: add heading status markers so the ledgers read by machine
- #604 docs: record the 2026-10-05 re-entry state map and the PR #602 ruling
- #605 chore: add npm run status — a report-only project-state readout
- #606 docs: true up six ledger headings and record the two Cloudflare rulings
- #611 docs: record the 2026-10-05 decision-sitting rulings in the ledgers
- #614 tests: force-open every details in the contrast sweep (#316)
- #628 tests: true up the gloss spec header's guard-arm list (#313)
- #629 docs: true up re-entry drift in friction, air-side and name docs

**Open — owner merges** (per each body's `## Merge authority` line):
- #607 chore: bump eleventy 3.1.6, playwright 1.63, wrangler 4.147 *(no Merge-authority section; the Summary says "Worker toolchain → owner merges")*
- #608 quiz: grow pid-basics bank 10 → 15 — arc lane 2
- #609 quiz: grow air-handlers bank 10 → 15 — arc lane 2
- #610 quiz: grow economizers bank 10 → 15 — arc lane 2
- #612 ddcw: graduate the forced-sensor ring to .ddcw-forced-mark (#273)
- #613 seo: inline lesson author, drop publisher, guides crumb (#320, #321)
- #615 bacnet: soften the Annex J attribution and the Max_Master cost (content-audit #88, #89)
- #616 pid-basics: name controller action in the P worked example
- #617 seo: state the real purpose of the FAQPage JSON-LD (#317)
- #618 ddcw-ahu: hedge the low-charge verdict to the FCU wording (#323)
- #619 psychrometric: refuse buildState points at or above boiling (#238)
- #620 education: coil freeze protection lesson — arc lane 1
- #621 balancing: say proportional, not floating, for the PICV actuator
- #622 tools: narrow the metric follow-up clauses in two scope notes
- #623 print: stack every tab pane on paper, not just the active one (#286)
- #624 styles: drop the dead .widget-try anchor rule (#306)
- #625 quiz: anchor three bacnet subheads and retarget their deep links (#314)
- #626 hydronic: unscale the pump-curve Jacobian slope and fix its comments (#326)
- #627 styles: true up the tool-card stagger comment (#309)
- #630 privacy: name every localStorage key and its lifetime (#327)
- #631 docs: #228 engine-standardization design note — arc lane 3 *(docs only, but a proposal: "owner reads before merge")*

**Open — merge on green:** none at the time of reading, other than this record's own PR.

---

## Mechanical cleanup lanes

The first work after the sitting (state-map owner ruling 3: mechanical cleanup first). One PR each:

1. **#320 + #321** — `techArticleJsonLd` author/publisher hunk + `SECTION_MAP` `guides` entry + both specs. Live `<head>` → **owner merges**.
2. **#316 + #285** — `settle()` widened to bare `details`, comment + header. Test-only → **merge on green**.
3. **#273** — `.ddcw-forced-mark` graduation, spec selectors, 3.90.0 → 3.90.1. Two live pages + stylesheet → **owner merges**.
4. **#323** — AHU low-charge verdict hedge + spec row. Live script → **owner merges**.
5. **#317 rationale** — `.eleventy.js` FAQ comments, `faq.njk` header, friction correction notes. Approval-class files → **owner merges**.
6. **The coming-soon narrowings** — `airflow.html:183` and `voltage-drop.html:158` narrowed (`waterside-load.html:65` reviewed, unchanged). Live tool pages → **owner merges**.
7. **balancing.html:497** — "proportional" sentence. Live lesson → **owner merges**.

## Small content lanes, after the cleanup

1. **content-audit #88 + #89** — ASHRAE 135 softenings, lesson + bank surfaces, clauses quoted in the PR body. → **owner merges**.
2. **PID basics aside** — controller action named, linked to comparators-and-deadband. → **owner merges**.
3. **Mixed-air reference row** on coil-freeze-risk (moves to the freeze lesson if the arc picks it). → **owner merges**.
4. **Warm-climate P1 / P4 / P5** — one lane (absorbed by the arc if it picks the freeze lesson). → **owner merges**.


## 18. Review-day rulings *(2026-10-06 — the owner and the assistant walked the night-1 queue PR by PR)*

Every night-1 PR was presented in merge order with a summary and
review pointers, and merged on the owner's word. Six rulings and two
process findings came out of it.

1. **Derivative on reheat coils.** Owner: *"I wouldn't normally use Td
   on a reheat coil at all, and I don't want new programmers to start
   implementing it without understanding how limited the use for it in
   HVAC is."* → the pid-basics bank's Td-from-Ti question was replaced
   by `derivative-last-knob` (slow the reset, trim the gain, leave Td at
   zero; adding D first is the trap), and the lesson's D callout *When
   it earns its keep* paragraph was tempered: the reheat coil stays the
   textbook case, most programmers leave Td at zero even there, and the
   ¼–⅛ of Ti ratio is demoted to "if you do reach for it" (PRs #608,
   #635).
2. **Coil valves are two-way or three-way.** Owner: *"a modulating
   valve could still be 2 way or 3 way diverting/mixing."* →
   `ah-coils-are-hydronic-loads` reworded, and `air-handlers.html:362`
   now reads "the same two-way or three-way valve" (PRs #609, #635;
   closes content-audit #90).
3. **PICV actuator sentence scoped to modulating valves.** Owner: *"if
   someone hasn't read all the lessons, I don't want them to think all
   valves have a 0%-100% modulating output, some are two position."* →
   "any other **modulating** control valve — a proportional analog
   input, 0–100 % open" (PR #621).
4. **ASHRAE 135 paraphrases verified.** Owner, on PR #615's Annex J and
   Clause 9 reliance: *"Clauses check out."* Both content-audit
   verification boxes ticked (PR #634).
5. **#228 design note — defaults accepted.** Owner: *"I like your
   defaults for 631."* Q1 add `Psychro.mixAir` / `mixFraction` and keep
   `mixStreams`; Q2 no caveat text in the engine; Q3 no workbench
   mass-delta readout for now. Execution is a lane still to schedule
   (`docs/engine-standardization.md` §4: engine spec first, one page per
   PR, workbench last).
6. **Filter racks are drawn as pleated media.** Owner, on the lesson
   capstone: *"the filter lines are not right on the unit drawing.
   There are just two lines that intersect at an odd angle."* → one
   full-height zigzag path per rack, and the same idiom applied to both
   Air Handlers diagrams (PRs #620, #636). House idiom from here on.

**Process findings.** (a) A stacked PR gets no CI run when GitHub
retargets it to `main`: three chain A PRs merged on their lanes' local
runs; a full suite on `main` (1223 passed) confirmed them, and the chain
B children were rebase-pushed before merging (CLAUDE.md *Workflow*,
codebase-issues #331). (b) `publish-preview.mjs` run from a worktree
outside the repo's parent publishes to a sibling folder its suffix
guard accepts (codebase-issues #330).

Owner on the format: *"Forcing both of us to take a look at each PR in
sequence may be the most balanced workflow we've used."*

**Merged 2026-10-06:** #607 #608 #609 #610 #612 #613 #615 #616 #617
#618 #619 #620 #621 #622 #623 #624 #625 #626 #627 #630 #631 #632 #634
#635 #636. Open PRs after: none. `main` at 3.91.0.

## 19. Evening rulings before the overnight lanes *(2026-10-06 — frontloaded in the first two hours, then the assistant worked the queue alone)*

The session opened with `/verify-handoff` on `docs/next-session-handoff.md`
(140 claims: 127 verified, 12 corrected, 1 unverifiable — the corrections
are in the handoff's *Corrections* block) and then put every open call to
the owner in four rounds. He answered each one, then slept; the lanes ran
overnight and their PRs wait for the morning walk. Where a
recommendation was offered, he took it on every item but two (marked).

1. **content-audit #99 — the lesson adopts 35–38 °F** as the practical
   freezestat band (*What Actually Freezes* and protection-stack item 1 in
   `coil-freeze-protection.html`); the tool's `bandTxt` stays. *Against
   the recommendation*, which had been to relabel the tool. PR #639.
2. **codebase-issues #331 — both triggers**: `pull_request` listens for
   `edited` with a base-change gate, AND `push: branches: [main]` runs the
   suite on `main` after every merge. **Merge on green granted** (the
   recommendation had been to hold it for the walk). PR #645, merged
   2026-10-07 01:14Z; the first `push` runs on `main` followed immediately.
3. **codebase-issues #328 — narrow to scope statements.** All five
   *What this page didn't cover* bullets on `bacnet-networking.html`
   (segmentation, BACnet/SC, capture-driven troubleshooting, alarms and
   events, vendor profiles) plus `bacnet-basics.html`'s "their own future
   pages" line. The topics stay listed; the promise goes. PR #643.
4. **codebase-issues #324 — reword as field advice.** The tuner's
   cheat-sheet row now says to flip direct ↔ reverse on the real
   controller, not on this page. PR #641.
5. **content-audit #91 + #92 — fix, two sentences.** One prose pointer
   near the sensor-strip widget to the freeze lesson's 38 °F figure, and
   one sentence giving the MA-T-reads-the-coil point in prose (the story
   itself stays in the widget). PR #640.
6. **content-audit #94 + #95 — fix.** `pid-basics.html` softens "fast,
   clean loop" (duct static is noisy: D has little lag to anticipate and
   plenty of noise to amplify) and names the measured variable; the
   tuner's Fast row names duct static pressure and mixed-air temperature
   as the PVs, with the outputs they drive. PR #641 (with #324 and #329).
7. **content-audit #96 — fix, one disclosure sentence.** "Lockout" is used
   at both ends of changeover — high-limit lockout of free cooling, and a
   low-ambient / low-limit lockout at the cold end. Name both, legislate
   neither (the deadband-convention register). PR #642.
8. **content-audit #93 — no page change.** The damper-stroke caveat is a
   candidate question for a later air-handlers wave; the entry stays open
   as that pointer.
9. **Home hero badge — feature the Coil Freeze Protection lesson** for
   freezestat season; revert to the DDC Workbench in spring (the old
   anchor is preserved in an HTML comment beside the badge). PR #644.
10. **Quiz wave 3 — six banks, two batches of three.** `building-pressure`,
    `duct-static-control`, `vav-systems`, then `psychrometrics-basics`,
    `hydronic-loops`, `load-piping` — freeze-season neighbours of the new
    lesson first. Owner merges each bank PR.
11. **F4 case-file mockup — hold** until wave 3 is further along.
12. **#228 — step 0 + step 1 as stacked PRs.** Engine helpers
    (`Psychro.mixAir` / `mixFraction`) + `tests/psychro-mixair.spec.js` +
    the minor bump first; the psychrometric-chart page with its
    before/after fixture stacked on it. Owner merges both; the child is
    rebase-pushed after the parent lands (or rides #331's fix).
13. **Morning walk — combined LAN preview.** Every live-page PR merged
    into one scratch tree, published to `cfdev.home.arpa`, with full-page
    screenshots (dark + light) in the walk notes.
14. **DDC Workbench filter rack — redraw it tonight** with the pleated
    idiom (the handoff verification found the Workbench's `#ahu-filter`
    still drew the old parallel-line rack; §18.6's "site-wide" had
    covered the three lesson racks only). PR #647.
15. **Session shape.** Owner: *"use Sonnet and Opus agents for mechanical
    tasks, you judge if Opus is needed based on complexity. But use other
    Fable agents for design tasks … let's try to frontload that into the
    first 2 hours or so and then I'll want you to work after I go to
    sleep."* Merge authority overnight: #330, #331 and the wrap-up docs PR
    only; everything that reaches a live page waits for the walk.

**Overnight output (for the morning walk, in order):** #639 freeze band · #640 air-handlers pointer · #641 pid loops · #642 economizer lockout · #643 bacnet scope · #644 hero badge · #647 workbench filter rack · #650 building-pressure · #648 duct-static-control · #649 vav-systems · #651 psychro step 0 · #652 psych chart step 1 (stacked on #651) · #655 psychrometrics-basics · #654 hydronic-loops · #653 load-piping. Merged on the grant: #645 (#331), #646 (#330). Walk notes: `docs/audits/2026-10-reentry/walk-2026-10-07.md`.

**Process notes from the night.** (a) PR #645's `push: main` arm ran on
its own merge commit and on #646's and passed both times — the first
suite runs `main` has ever had. (b) A PR body edit now leaves a SKIPPED
`test` check beside the real one (codebase-issues #331 resolution). (c)
The quiz workflow's second refute round can leave an open item that the
Opus fixer then applies without a third refute; both wave-3 batch-1
open items were applied verbatim and are called out in the walk notes.
(d) Every lane reported at least one drifted line cite in the entry it
was fixing (the 2026-08-12 lesson, again).

## 20. Re-entry rulings and the operating model *(2026-11-26 — after seven weeks away; the 2026-10-07 walk of §19's fifteen PRs never happened)*

**What the history showed.** Every pause on this project began with a
queue of pull requests waiting on the owner — seven in June, three in
August, fifteen in October — and the share of work a visitor could see
shrank as each burst aged. The owner named the same two things to fix:
the review queue, and keeping hold of the thread on a project this size.

**Rulings, in the owner's words where quoted:**

1. **Merge authority — "All but new-page launches."** The assistant merges
   fixes, quiz banks, engine work and improvements to existing pages, gated
   on green CI plus an independent adversarial review by a second agent.
   New simulators / lessons / tools are built hidden; going live takes one
   yes. Unsourced field-practice claims reach him as short questions, never
   as diffs. *("I'm happy to let you take over more PR merging yourself
   since you're more likely to catch mistakes there than I am.")* This
   **supersedes** the 2026-07-29 live-vs-hidden split and §19.15's
   "everything that reaches a live page waits for the walk".
2. **New quizzes for existing lessons are the assistant's to ship.**
3. **Lock `main`: yes.** Nothing merges without a passing test run; it
   binds the assistant too. Shipped as the repository ruleset
   `main-requires-test`.
4. **Progress he can see:** a plain "what shipped" note and a short list
   crossed off, on his home hub — *"Sort of a running dashboard that lets
   me check an overview of work at any point."* Shipped as `docs/board.md`
   → `npm run board` → `https://command.home.arpa/cfboard/`.
5. **Sessions** are for stories, mockups and steering — never a review
   gate.
6. **The first five — "Freeze season":** clear the fifteen waiting changes
   · a Coil Freeze Protection quiz · quizzes you can't game (the always-"b"
   tell, the comma input, six more banks) · freeze-season loose ends · the
   case-file format.
7. **House spelling: "freeze stat"** (two words), visible text only — ids,
   anchors, `data-gloss` keys, glossary ids, quiz ids and URLs keep their
   names; the other spellings stay as search keywords. *(closes the
   question in codebase-issues #332; the sweep itself is a later run)*
8. **Mixed-air temperature is not a fast loop — "No — drop it from the
   table."** The PID tuner's Fast row keeps duct static only. **Supersedes
   the MAT half of §19.6.**
9. **Air-handlers widget label — "Keep the meaning."** "Freeze stat
   territory" stays. *(content-audit #103)*
10. **Duct static reads high with the fan at minimum — "Yes — sensor
    first."** The sensing tube / transducer is the first suspect: commoner,
    and cheapest to check. #648's key stands.
11. **Pacing:** *"Don't work longer just for the sake of working, that's
    not a road we want to go down again."* Runs are scope-bound and start
    only on his word; one item per run after the catch-up night.
12. **The always-one-letter quiz tell — "Shuffle in the engine."** *(asked
    and answered the same night; codebase-issues #335)* The quiz engine
    will randomise choice order for every bank. The explanations that
    refer to a choice by its letter are rewritten first, and a lint keeps
    new ones out. A later run, not the catch-up night.
13. **The home page's About paragraph** *(his request, same night)*: the
    "side project … exploring vibe coding" line is replaced by a plain
    statement that the site is built with AI tools, his field experience
    and direction leading it — *"merging the strengths of AI with an
    industry lacking resources"* was his brief. Shipped as PR #659 on his
    "Ship it".

**Calls the assistant made under that authority (each reversible, each
listed on the board under *Calls I made*):** Node pinned to 24 in CI and
the job-level skip on PR edits removed, so every `test` check is a real
run (PR #657; §19.2's "both triggers" is intact) · #651's two engine
defaults accepted as built · no nightly timer ·
`docs/next-session-handoff.md` and the October dashboard retired, not
replaced by another document · the cold-end lockout on the Economizers
page is named "low-limit or mixed-air", not §19.7's "low-ambient" (see
#642 below).

**Not re-asked, still standing from §19:** the 35–38 °F band (§19.1), the
freeze-season hero badge (§19.9), and the psych chart's "% by mass" label,
which shipped with #228 step 1 (§19.12 ruled the step; the label is #652's).

**October's walk points, each with one disposition** *(the "Read for" lines
of `walk-2026-10-07.md`; the walk did not happen, so each was settled by
a fix, a ruling above, or a named later run — none dropped)*:

- **#639** — "a national figure" became "range". 38 °F at the top of it
  stays the owner's own claim (§19.1).
- **#640** — the dangling ref-note clause is trimmed; the three in-prose
  anchors to the freeze lesson stay; the widget label is §20.9, the
  spelling §20.7.
- **#641** — mixed-air temperature is out of the Fast row (§20.8). The
  Medium row's two valve outputs are content-audit #100, in the
  loose-ends run.
- **#642** — "at both ends of the free-cooling range". The cold end is
  named "low-limit or mixed-air lockout": a blind review showed that
  "low-ambient lockout" (§19.7's word) usually means the compressor
  lockout in the field, which leaves the dampers modulating. The
  high-limit sense being stated twice is left.
- **#643** — the alarms bullet no longer points at pages that disclaim
  alarms; an unsourced "most installed BAS networks still run BACnet/IP" is gone;
  the segmentation claim is softened; the vendor bullet no longer says
  the page is standard-only. Content-audit #101 and codebase-issues #333
  are in the loose-ends run.
- **#644** — the badge wrapping to three lines at phone width is
  accepted; the shorter string is kept.
- **#647** — reads as a filter at cockpit scale in dark, light and
  fullscreen; the `--text-dim` stroke is accepted.
- **#648** — sensor first (§20.10); the explanation is reworded without a
  new number. The one-letter keys are §20.12.
- **#649** — 400 CFM per ton is called the rule of thumb, not a floor;
  "the code dose is a CFM, not a fraction" stands. Keys as above.
- **#650** — the invented trend snippet is removed and the question is a
  plain multiple-choice; the reused distractor stays; codebase-issues
  #337 is in the loose-ends run.
- **#651** — both design choices accepted as built; the pressure guard
  is still wanted (codebase-issues #336).
- **#652** — retargeting it to `main` dispatched a real test run, which
  settles codebase-issues #331's open half.
- **#653** — the lesson-gap note (two widget constants the prose never
  states) is logged in content-audit #105. Keys as above.
- **#654** — the reworded explanation was read by the blind reviewer and
  holds. Keys as above.
- **#655** — the comma in the prompt waits for the engine change
  (codebase-issues #334, mechanism measured); the shared dew-point beat
  is accepted; the lane's refused read of `quiz-engine.js` was answered
  by inlining the question schema in the workflow script (PR #658). Keys
  as above.

What the blind reviews raised beyond these points, and the merges did
not need, is collected in codebase-issues #338 and content-audit #105.

**The second of the five shipped the same night.** The Coil Freeze
Protection quiz merged 2026-11-27 as PR #660 (v3.93.0): fifteen questions
drawn only from the lesson, in the "freeze stat" spelling. Five blind
reviews found no wrong key and nothing unsourced; six explanations and
stems were tightened before merge on their advice, and what was left
alone — with the two reverse links still owed — is in content-audit #105.

## 21. Three answers to the board's *Your turn* lines *(2026-11-27, the day the catch-up run ended)*

The owner answered all three lines in one message. The field statements
are his; the page text built on them is in the PRs named.

1. **The dead-trunk story — what it teaches.** In his words, "the bigger
   lesson in that story was to not get bogged down with the likes of
   trying to use a DMM on a bus and theorize based on just those numbers",
   and to look instead at more apparent problems, such as all of the
   rooms in one area being out. He was "going around all day", and had he
   studied
   "the floorplan and what was offline" first, he "could have found the
   break in the bus way faster." He suggested "a lesson on bus section
   isolation". *Disposition:* item 5 of the week becomes that lesson,
   built hidden and launched on his yes, with the story told as a
   synthetic job — no site, customer or trade detail. Pattern first, meter
   last. What the meter readings meant stays out of it: that was never
   his finding.
   Two questions went back on the board for the build (the page's shape;
   where he splits a trunk and what tells him which half is good). Both
   are answered below.
2. **Duct static "should be more gentle"**, and "not just because of the
   PID math": "if duct static drops for a second, not generally an issue",
   where the differential pressure on a water-source heat-pump loop
   dropping too low trips heat pumps — "It's not ideal but that's why
   duct static is less aggressive than something like HPLDP."
   *Disposition:* the Duct Static lesson's "tuned gently" teaching
   stands; the PID tuner's "fast loops can take more aggressive gain" is
   gone; both pages carry his reason (PR #663). This answers the
   open item in content-audit #105. Checking it turned up a fault in the
   simulator, not in the teaching — codebase-issues #340 — and one
   question for him on the board (what makes a hot static loop hunt on a
   real unit), answered below.
3. **A freeze stat gotcha.** A freeze stat is sometimes in the safety
   circuit without being landed on a DI, and a trip may then look
   like a fan failure. *Disposition:* one paragraph in the lesson's
   *Reading the Trip* and a sixteenth quiz question,
   `cfp-trip-reads-as-fan-failure` (PR #662). Added, not swapped: the
   board had offered a swap, and no question in the bank had earned its
   way out.

These were session follow-through on his answers, not one of the five:
items 3–5 still start only on his word.

**The three follow-up questions, answered the same afternoon.**

4. **The dead-trunk page's shape — approved.** A hidden lesson on finding
   a break by sections, opening with the story as a made-up job: "it
   makes it feel like a game and builds real skills." *Disposition:* item
   5 will be built that way, keeping the game feel he liked.
5. **How he isolates a break.** First try to find a bus layout
   and see whether an obvious spot shows. With no layout, go by the MAC
   addresses or, better, the room numbers of the offline devices, and
   start at the highest or the lowest. If the whole bus is flaky, break
   it at the midpoint and see whether the half closer to the supervisor
   or other BACnet router becomes stable, "since sometimes a device can
   be spamming TX and take others down." *Disposition:* this is the
   source for the lesson's method section. He named one vendor's
   controller; the page will say "the supervisor or router", the wording
   `education/bacnet-mstp.html` already uses for that device.
6. **What makes a hot duct static loop hunt on a real unit.** The three
   candidates put to him were the drive's ramp, the boxes reacting, and a
   noisy transducer. His answer: "All three of those could cause it", all
   three are easy to check from a DDC workbench given drive feedback, and
   the drive is probably the least likely — a loop fighting a reasonable
   drive ramp probably has a deeper problem. *Disposition:* the
   fix recorded in codebase-issues #340 is to model transducer noise or
   the boxes' reaction in the tuner's fan scene before a drive ramp. The
   same three checks are a candidate troubleshooting beat for the Duct
   Static lesson.

## 22. Two more answers and the go-ahead for items 3 to 5 *(2026-11-27, afternoon)*

The owner answered both optional *Your turn* lines in one message and
released the rest of the week. The field statements are his; the page
text built on them is in PR #665.

1. **What a trip does on a unit whose freeze stat is not on a DI.** The
   board had asked whether the dampers and the valve still respond. His
   answer, with its condition: "if it's a proper" safety circuit, "the
   dampers and heat valve" lose 24 V, the dampers fail closed and the
   "heat valve fails open." *Disposition:* one
   sentence in the freeze lesson's *Reading the Trip*, with his
   condition kept, linked to the fail-posture section of Commanding
   Actuators. The lesson's first protection layer still says "the
   sequence then closes the outdoor dampers and drives the heating valve
   open"; that describes the unit whose controller is told, and it is
   left as written.
2. **The story for the open slot in Start/Stop Commands.** "There have
   been tons of service calls I've been on where it was as simple as
   putting eyes on the unit and resetting the freeze stat after a very
   cold night. Sometimes even as simple as resetting software freeze
   protection latching logic the user missed on the front end."
   *Disposition:* a first-person callout in *Finding the Break*: his
   two sentences lightly recast ("I have been on tons of service calls
   where…", "Sometimes it was even as simple as…") under a lead-in
   that is the page's, not his: "True story, many times over." No fact
   is added.
3. **"Green light for items 3 through 5."** *Disposition:* three runs,
   one item each (§20.11), each ending with no open pull request. The
   freeze-season loose ends
   went first (his two answers belong there, and the run clears the two
   phrases §21's record left in the lesson); the quiz engine and the
   dead-trunk lesson, built hidden, follow.
4. **The LAN page "has been very useful."** *Disposition (the
   assistant's):* the board and the preview keep being republished at
   every phase boundary.

Calls made in the loose-ends run, none of them his to make:

- **The two phrases §21's run left in the freeze lesson are gone**
  ("shows up" and "is the only place it is wired", content-audit #105).
  It says
  the trip "may look like a fan failure" and that the stat is "not
  landed on a controller input" (PR #665).
- **The spelling sweep (§20.7) is done** (PR #666): 88 changed lines in
  29 files, one of them a test's expected string. Ids, the glossary key and its 11 `data-gloss` attributes,
  quiz ids and tags, URLs and comments keep their names, except four
  comment lines in `glossary.js` that quote respelled text. The glossary
  term is "freeze stat"; its definition now says "Also written
  freezestat", because "Also called a freeze stat" would have defined
  the term by itself. The seven pages whose description or keywords
  name the device carry all three spellings across the two.
- **One old spelling stays on purpose.** The freeze lesson quotes
  ASHRAE Guideline 36, "if a freeze-stat is present." A quotation keeps
  its source's spelling.
- **The MS/TP lesson's bus-simulator promise is a scope statement**
  (codebase-issues #333, by the #328 precedent). The simulator stays on
  the board's Menu; the page no longer announces it.
- **The Coil Freeze Risk Checker's blank-setpoint hint** says "this
  tool starts at 38 °F (3.3 °C)" instead of calling 38 "the common
  default" (content-audit #102). It states what the page does and no
  field default.

## 23. Two more answers, and the first quiz run *(2026-11-27, evening)*

The owner answered the board's two optional *Your turn* lines in one
message while the quiz run was in flight.

1. **Which dampers fail which way.** "You got it right, the return
   damper fails open and OA and EA fail closed." *Disposition:* the
   freeze lesson's *Reading the Trip* names all three — the outdoor and
   exhaust dampers fail closed, the return damper fails open (PR #670).
2. **How often a safety has no input.** "The most common case is a
   freeze stat input or a whole saftey circuit input, but sometimes
   there's none at all. Most common I see is a freeze stat input, it's
   more common for the controller to not know status of the duct
   smoke." And of the gotcha he gave at midday (§21): "The original
   point was sometimes there's no information about what the saftey
   circuit is doing at all, and in those cases it can look like fan
   failure." *Disposition:* Start/Stop Commands no longer calls a string
   with no input "the common case". Both pages now say that most often
   the freeze stat has an input, or the whole circuit has one, and that
   sometimes there is none; Start/Stop Commands adds the duct smoke
   detector. The freeze lesson's trip "may look like a fan failure" when
   the front end has no information about the safety circuit. The DDC
   Workbench's teaching paragraph called a stat with no point
   "extremely common in the field"; it now says "which sometimes
   happens in the field" (found by a blind reviewer; PR #670).

Calls the assistant made in the quiz run (each reversible):

- **True/False is not shuffled.** It always reads True, then False.
  §20.12's "Shuffle in the engine" is applied to `mcq` and `gotcha`.
- **A number ladder shuffles like any other set of choices.** One
  question's choices are an ascending ladder as authored
  (`air-handlers` / `ah-cooling-coil-target`: about 45 / 55 / 65 /
  72 °F) and now come up out of order. No opt-out was built.
- **Sixteen explanations no longer point at a choice by letter or
  position** (PR #668): where the sentence already named the choice the
  letter went, and where the letter was the only handle a short phrase
  from that choice's own text replaces it.
- **The lint is a backstop, not the rule.** `tests/quiz-banks.spec.js`
  flags a parenthesised choice letter such as "(b)" and an "of the
  above" choice. Phrasings measured to pass it are listed in
  codebase-issues #342; the rule stays with whoever writes the
  question.
- **`modbus-decoding` needed no opt-out.** No spec depends on the
  order of choices: the ones that need the keyed choice find it by its
  mark.
- **Version 3.93.1, a patch.** The quiz engine is loaded unversioned by
  the 42 practice pages that mount a quiz, so no cache-buster rode on the
  bump.
- **Item 3 takes more than one run.** §22 recorded one run per item;
  §20.6 gave item 3 three parts. The shuffle was this run. The number
  box is next, then the dead-trunk lesson (item 5), then the six more
  banks. The order is the assistant's, and the board says he can
  change it.

## 24. The number-box run *(2026-11-27, night — no new word from the owner)*

Run under §22's go-ahead for items 3 to 5. Calls the assistant made
(each reversible; the ones the owner would notice are on the board):

- **One reading, by the browser's number convention.** An entry of one
  to three digits with no leading zero, one separator and exactly three
  digits after it ("10,000", "44.444") can mean two numbers. The engine
  reads it by the decimal mark the browser's own language uses, and the
  reveal says which way it was read (PR #672; codebase-issues #334 has
  the measurements).
- **The first build was withdrawn before it reached a pull request.** It
  graded such an entry right if either reading was within tolerance. A
  blind review ran it against the shipped banks and found it marking
  unit slips right: "5,000" on a 5-ton answer, "44.444" on a 44,444 lb/h
  one.
- **One kind of slip is left on purpose.** A reader whose own number
  habit is the opposite of their browser's gets the other reading of a
  two-way entry: a right answer can be marked wrong, and an answer
  wrong by a factor of exactly a thousand can be marked right. The
  reveal line is shown whenever a two-way entry is submitted. The
  alternative, always reading such an entry the English way, marks a
  reader in a comma-decimal browser wrong for writing "5,000" to mean
  five.
- **Exponent entries ("1e4") have no reading.** No shipped answer needs
  one: the numeric answers run from 0.9 to 47808.
- **The phone-width snippets (#341) were not taken.** A stylesheet
  change with a look to judge; it goes with the six-bank run, together
  with the quiz style rules that do not apply (#343).
- **Three small quiz leftovers rode in the same pull request** and its
  description names them: a test that pins the shuffle's re-draw inside
  one mount, and two stale comments (codebase-issues #342).
- **Version 3.93.2, a patch.**

Found on the way and left for him: Cloudflare is injecting its Web
Analytics beacon into served pages (three checked), and the privacy
page says there are no analytics (codebase-issues #344). The dashboard is his,
so it is a *Your turn* line and no page was changed.
