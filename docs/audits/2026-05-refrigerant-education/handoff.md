# Refrigerant cycle — Education chapter

> **Archived 2026-06-15.** The chapter shipped — all three pages are
> live (`education/refrigerant-cycle-basics.html`,
> `superheat-subcooling.html`, `metering-devices-txv-eev.html`) and
> cross-linked across the site. The optional **page 4 (refrigerants +
> pressures)** was the only deferred item; it now lives on the
> `site-ideas-and-friction.md` wishlist. Moved from repo root into
> `docs/audits/` per this file's own graduation note. The "Resume
> here" block below is historical — do not act on it.

A self-contained handoff prompt for the refrigerant cycle Education
work. Paste this (or its key sections) as the first message of a
fresh conversation when picking up the chapter.

Generated 2026-05-27 after the refinement phase closed (PRs #142–#151).
Last updated 2026-05-28 after page 2 shipped (PR #153).

---

## Resume here (2026-05-28)

**State: 2 of 3 pages shipped. Page 3 (TXVs vs EEVs) is next.**

You are on branch `feat/metering-devices-txv-eev`, the working
branch for page 3. The branch is page-3-only; the chapter-level
chrome and pages 1–2 are already on `main`.

### What's already on main

- **Page 1 — Refrigerant Cycle Basics**
  (`/education/refrigerant-cycle-basics.html`), PR #152, merged
  2026-05-27. Page-id prefix `rc-*`. Cycle SVG with flow-engine
  animated particles (hot-side recoloured to `--heat` via
  `setPathColor`). Established the saturation P-T lock as the
  chapter's load-bearing concept.
- **Page 2 — Superheat & Subcooling**
  (`/education/superheat-subcooling.html`), PR #153, merged
  2026-05-28. Page-id prefix `shsc-*`. Static conceptual P-T
  saturation diagram with one SH and one SC example marked, plus
  one abnormal-reading walkthrough in the worked example. Vocabulary
  mirrors the P-T tool's verdict-pill language.

### Chapter-level chrome already in place (do NOT re-ask these)

- **Sequence slot.** Page 3 lands at slot 10 in
  `educationSequence.js`, between `superheat-subcooling.html` and
  `psychrometrics-basics.html`.
- **Filter chip.** A `Refrigerant` chip exists on
  `education/index.html`. When page 3 ships, bump `Refrigerant`
  2→3 and `All` 15→16. Category for the new nav card:
  `'refrigerant'`.
- **P-T tool cross-link.** `tools/refrigerant-pt.html` already has
  a `lessons:` group on its `relatedLinks` call listing pages 1
  and 2; append page 3 when it ships.
- **Forward-link convention.** Both pages 1 and 2 currently
  reference page 3 *as prose only* (page 1's "What this sets up"
  section names TXV/EEV; page 2's "What abnormal readings tell
  you" closes with a paragraph about metering devices). When page
  3 ships, turn those prose references into anchors per the
  forward-link convention.
- **Latest hero badge.** Currently
  `Latest: Education — Superheat & Subcooling`. Bump to page 3
  when it ships.
- **`package.json` version.** Currently `2.13.0`. Minor bump for a
  new page → `2.14.0` when page 3 ships.

### Page-3 design questions to settle in plan mode

The "Per-page lifecycle" section below lists "diagram approach,
prereq cross-links, depth of the worked example" as the
likely settle-in-plan-mode topics. Concrete questions to consider:

1. **Number and shape of diagrams.** A TXV bulb-on-suction-line
   cross-section is the iconic visual (handoff calls it out).
   Does the page also want an EEV stepper-driven schematic in
   parallel, or is the EEV better explained as a side-by-side
   comparison block or inline prose riding off the TXV diagram?
2. **Where the TXV-as-RaT-sensor anecdote lands.** A standalone
   callout? Folded into the TXV section? Page intro hook? The
   chapter handoff is explicit: *once, in context — not the
   spine of the page.*
3. **Worked-example continuity.** Page 2 closed at R-410A 118 psig
   + 50 °F suction → 10 °F superheat. Page 3 could continue that
   scenario (TXV / EEV holding the 10 °F SH by modulating as load
   or ambient changes) or pick a fresh framing.
4. **Page-id prefix.** Pages 1 and 2 use `rc-*` and `shsc-*`.
   Page 3 needs its own — likely `txv-*` or `meter-*` (both
   unambiguous against `rc-*` / `shsc-*` / the tool's `rf-*`).

### How to start (this new session)

1. You are on branch `feat/metering-devices-txv-eev`, pulled from
   origin. Page 3 is the only outstanding work in the chapter.
2. Re-read this plan file in full. Re-read
   `/education/refrigerant-cycle-basics.html` and
   `/education/superheat-subcooling.html` on disk for vocabulary
   continuity. The "Pitfalls specific to this domain" section
   stays load-bearing — refrigerant content is unforgiving.
3. Enter plan mode. Walk through the page-3 design questions
   above via `AskUserQuestion` (sequentially — they invite real
   content elaboration). Write the plan file (overwriting the
   page-2 plan at the path the system gives you).
   `ExitPlanMode` for approval.
4. Execute: author the page, wire the chrome list above, build /
   test / screenshot, commit on this branch, push, open the PR.
   Stop and surface the URL — do not merge.

### Recommended starter prompt for the new conversation

> Pick up the refrigerant Education chapter. Pages 1 and 2 are
> shipped on `main`; page 3 (TXVs vs EEVs) is next, and I'm on
> branch `feat/metering-devices-txv-eev`. Read
> `refrigerant-education-plan.md` start to bottom — the
> "Resume here" block at the top is the load-bearing state
> summary — then proceed.

---

## Quick context

The **Refrigerant P-T & Superheat tool** already ships at
`/tools/refrigerant-pt.html` (landed 2026-05-21). It's the
calculator half of a larger refrigerant chapter; the Education
side — the pages that teach what the tool's numbers *mean* — was
deferred at the time and is what this chapter delivers.

The chapter is a **3-page set** paired with the shipped tool. The
P-T tool currently cross-links only to `coil-sizing`; adding the
new lessons closes the loop so a tech who lands on the tool with
"what does this mean?" has somewhere to read first, and a learner
who finishes the lessons has somewhere to *use* what they learned.

This is a **new chapter**, not a sweep — one PR per page, plan-
mode-first per page, with design questions settled in the first
plan-mode session before any code lands.

## Read first

1. **`site-ideas-and-friction.md`, lines 609–715** — the full
   refrigerant-cycle scope writeup. Names the 3 (+1 optional)
   pages, the credibility hooks (TXV-as-RaT-sensor anecdote;
   superheat/subcooling as the two measurements that prove a cycle
   is running right), and the design choices that already landed
   on the P-T tool. Re-read in full before planning page 1.
2. **`html/tools/refrigerant-pt.html`** — the shipped tool. The
   page's preamble, P-T tab, and SH/SC tab establish the
   vocabulary the lessons should match (bubble/dew, gauge
   pressure, glide handling, low-superheat → floodback / high
   superheat → starved evaporator). Don't drift terminology — the
   lessons explain what the tool computes; mismatched names
   between the two surfaces confuses readers.
3. **CLAUDE.md `## Adding a new tool`** has the page-add checklist;
   the Education flavor is the same shape under `html/education/`
   (`nav: education`, `relatedLinks({...})` at the end, sequence
   slot in `html/_data/educationSequence.js`, smoke-spec PAGES
   entry, optional `Latest:` hero badge bump). The "Education page
   conventions" section of `site-ideas-and-friction.md` (around
   line 1528) is the second authoritative source — read it once
   before page 1.
4. **`html/education/modbus-decoding.html`** is the closest shape
   precedent (paired Education page for a non-trivial Tools page,
   ships in the `.tool-card` / lesson layout, uses prose-above-
   diagram framing). Read it as the template for page-internal
   structure.

## The 3-page set

The order below is also the **prereq order**: each page assumes
the prior one. Treat the order as load-bearing for the
`educationSequence.js` slot and for any `relatedLinks({lessons: …})`
cross-links.

### Page 1 — Refrigerant cycle basics

**Scope (from the friction writeup):** the four components
(compressor, condenser, metering device, evaporator), high side
vs. low side, what each does and why. The **pressure-temperature
relationship for saturated refrigerant** is the load-bearing
concept — it's what makes every measurement in pages 2 and 3
meaningful, and the bridge to the P-T tool.

**Visual capstone:** one diagram showing the cycle end-to-end with
high/low side coloring (suggested: hot/red on the high side, cool/
blue on the low side, transitions across the compressor +
metering device). The site already has the SVG + flow-engine
vocabulary for this (pump-control / load-piping precedent).
**Static carries the meaning** — animation is additive, per the
education page conventions.

**Effort: L.** New-page authoring + a custom SVG that doesn't have
a precedent in the existing diagrams. Could span 2 sessions
(diagram in one, prose in the other).

### Page 2 — Superheat and subcooling

**Scope:** what each is (vapor warmer than its saturation temp;
liquid cooler than its saturation temp), the BMS-visible sensors
that compute each (suction temp + suction pressure → superheat;
liquid temp + liquid pressure → subcooling), and what abnormal
readings mean (low superheat → floodback risk, high → starved
evaporator, low subcooling → undercharge or restriction, etc.).

**Cross-link payoff:** every concept here maps directly onto the
P-T tool's SH/SC tab. Forward-link to `/tools/refrigerant-pt.html`
inline (not as a footer-only). This is the page where the lesson
↔ tool pairing earns its keep.

**Effort: M.** Page 1's pattern is set; this is largely prose
with one or two small diagrams (a P-T-curve close-up + arrow
showing where SH/SC sit relative to the saturation curve).

### Page 3 — TXVs vs. EEVs (metering devices)

**Scope:** TXV mechanical loop (bulb senses suction temp,
diaphragm balances bulb pressure vs. evaporator pressure vs.
spring, modulates flow to hold superheat). EEV: same job,
stepper-driven, commanded by the unit controller or BMS — *the
surface controls people actually interact with*. **The
TXV-as-RaT-sensor anecdote lives here** — it's the credibility
hook for the page and the chapter's most quotable moment.

**Effort: M.** Some diagram work (TXV bulb-on-suction-line cross-
section is the iconic visual) but the page is shorter than 1 or
2 and prose-heavy.

### Optional page 4 — Refrigerants and pressures

**Scope:** common refrigerants (R-410A on its way out, R-32 and
R-454B as A2L successors, R-134a still common in centrifugal
chillers, R-22 retrofits), glide on blends, why some blends need
bubble-vs-dew handling.

**Decision deferred to the chapter-end retrospective.** The P-T
tool already enumerates six refrigerants in its dropdown with
data behind each — page 4 would explain the field context that
table elides. **Ship pages 1–3 first**; if they read complete
without it, page 4 might stay out (added to
`site-ideas-and-friction.md`'s wishlist tail). If pages 1–3 keep
referring to "see refrigerants page" forward-links, page 4 earns
its slot.

## Design questions to settle in plan mode (page 1)

These shape the entire chapter — settle them in the first plan-
mode session before any code lands. Use `AskUserQuestion` to walk
through them.

1. **Sequence-slot in `educationSequence.js`.** The chapter sits
   at the end of the current 13-page chain. Drop the 3 pages
   after `bacnet-networking.html`? Or interleave somewhere (e.g.
   after `psychrometrics-basics.html`, since both are
   thermodynamics-adjacent)? Affects the prev/next chain and the
   visible curriculum on `education/index.html`.
2. **Card-grid placement on `education/index.html`.** Mirror the
   sequence decision above (the card grid IS the curriculum per
   the educationSequence comments) or pick an editorial position.
3. **Cross-link wiring on the P-T tool.** Add a `lessons:` group
   to `tools/refrigerant-pt.html`'s `relatedLinks({...})` call —
   which of the 3 pages get listed (all three? page 2 only since
   it's the tightest match?). Probably all three for completeness;
   confirm.
4. **Pairing JSON-LD.** None of the 3 pages have a 1:1 quiz pair
   today (no Practice quiz exists for refrigerants — that could
   become a v2 entry following the Modbus shape). So
   `pairedQuiz` / `pairedLesson` stays unset for now; the
   structured-data hook from PR #151 just doesn't apply here yet.
   Worth noting in case a refrigerant quiz lands later.
5. **Diagram strategy for page 1's cycle diagram.** Custom SVG
   from scratch (matches the load-piping / hydronic-loops
   precedent — most editorial control, most time)? Or sketch
   first, defer the polished version to a follow-up PR? Setting
   expectations early prevents the chapter from stalling on
   diagram polish.
6. **Page 4 (refrigerants + pressures) — ship together, or defer
   until 1–3 land?** The friction writeup says optional / "later
   data entry" flavor. Default recommendation: defer.

## Per-page lifecycle

Same shape as the refinement-phase cadence (now archived at
`docs/audits/2026-05-refinement/handoff.md` for reference):

1. **Plan mode** — Explore → settle the page's open design
   questions via `AskUserQuestion` (likely: diagram approach,
   prereq cross-links, depth of the worked example) → write plan
   file → `ExitPlanMode` for approval.
2. **One page, one branch, one PR.** Branch off updated `main`
   (`git checkout main && git pull --ff-only` first).
3. **Branch naming** — `feat/refrigerant-cycle-basics`,
   `feat/superheat-subcooling`, `feat/metering-devices-txv-eev`.
   (`feat/` because new pages; `education/` is the commit-subject
   prefix.)
4. **Commit subject** — `education: ship refrigerant cycle basics
   page` and so on. New pages with no per-page issue tracker
   reference; the PR body cites this plan file by name.
5. **Commit body** — *why* (chapter context + which prereq) +
   *what changed, per file* (the new page + the educationSequence
   slot + the smoke-spec PAGES entry + the P-T tool's
   relatedLinks update if that's the page that earns it +
   optional Latest: hero badge bump + `package.json.version`
   minor bump).
6. **PR body** — `## Summary` / `## Changes` / `## Test plan`.
   Cite this plan file in Summary
   (*"Page 1 of the refrigerant Education chapter — see
   `refrigerant-education-plan.md`."*).
7. **Push → `gh pr create` → stop, surface URL.** Wait for the
   user to merge and sign off before picking up the next page.

## Pitfalls specific to this domain

Refrigerant content is unusually unforgiving compared to most
HVAC content the site has shipped. A wrong number in a worked
example or a sloppy phrase in an SH/SC explanation gets repeated
by techs in the field. Push back on these:

- **Don't invent saturation values.** Every P-T number in a
  worked example must come off a published P-T chart (or the
  shipped tool, which is itself sourced — see
  `html/scripts/refrigerant-data.js`'s header for provenance).
  Cite the refrigerant + the pressure → temp value the tool
  agrees with.
- **Glide matters on blends.** R-410A is near-azeotropic so
  single-temp prose is fine; R-407C / R-454B have real glide and
  any worked example must distinguish bubble vs. dew. The P-T
  tool gets this right today; the lessons must match.
- **Don't conflate units.** Gauge pressure (psig / kPa-gauge)
  matches manifold gauges and the source charts — same as the
  tool. Absolute pressure (psia) is wrong for SH/SC field use
  even if it's "more physical."
- **The TXV-as-RaT-sensor anecdote is on-brand, but it's a
  *credibility hook*, not the page's spine.** Land it once in
  page 3, in context — don't open with it, don't sprinkle it
  across all three pages.
- **No charging procedures.** The lessons explain what SH/SC
  *mean* and what abnormal readings *indicate*; they do not
  prescribe charging adjustments. That's a service-tech domain
  with system-specific procedures, liability surface, and EPA
  608 certification implications. Stay in the explainer lane.

## How to start

*Note (2026-05-28): pages 1 and 2 are shipped. If you're resuming
the chapter, the "Resume here" section at the top of this file is
the authoritative starting point — it supersedes the page-1-era
guidance below.*

Open `site-ideas-and-friction.md` to lines 609–715 first, then
`/tools/refrigerant-pt.html` to see the shipped vocabulary, then
enter plan mode on **page 1 (refrigerant cycle basics)**. The
plan-mode session settles the 6 design questions above and writes
a plan file scoped to page 1 only. Do NOT bundle pages 2–3 into
the same plan — each gets its own plan-mode session after the
prior page merges.

Default first-question prompt (if the user doesn't redirect):
*"Page 1 of the refrigerant Education chapter. Should we settle
the sequence-slot + card-grid placement + P-T tool cross-link
wiring + diagram-scope decisions before starting?"*

---

*This plan file lives at the repo root while the chapter is
active, matching the `quiz-section-plan.md` precedent. When the
chapter is complete (pages 1–3 shipped, page 4 decided), graduate
to `docs/audits/2026-05-refrigerant-education/` per the
`docs/audits/<topic>/` convention.*
