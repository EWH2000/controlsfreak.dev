# Decision-sitting rulings — 2026-10-05

> **Disposition: the durable record of the owner's 2026-10-05 decision sitting (a record).** Sixteen agenda items, all ruled the same day, in the order they were taken. Each section carries the owner's verbatim words, the facts measured before the ruling, what ships and who merges it, and the marker now on the ledger or friction entry. **Supersedes** the perishable session-scratchpad list the rulings were first captured in — that file is not durable and must not be cited. The *live* state of each item is its ledger heading and `npm run status`; where this file and those disagree, they are current and this is history. Companion to `state-map.md` (the map these items came from — its §2 numbers are given per section) and `pr602-assessment.md`.
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
