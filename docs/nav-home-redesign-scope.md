# Nav + home redesign — scoping (2026-07-13)

**Status: ACTIVE planning doc** (not a completed-audit record). Owner
decisions are locked; the build is sequenced but not yet started. When
the work ships, the durable design-history summary folds into
`site-ideas-and-friction.md` (alongside the BACnet pillar note at
~SIF:174–199 and the Forced-Air retrigger note at ~SIF:431–439) and
this doc can be retired — git history retains it, same lifecycle as a
spent prompt brief.

Grounded by a fan-out mapping of the current nav/home/hub IA (five
readers) + three independent IA proposals + an adversarial critique.
This doc is the synthesized result and the build reference.

---

## Why now

The site just gained its **second** topic-cluster pillar hub. `/bacnet/`
shipped as the first (owner picked the pillar-page form over a nav
sub-grouping 2026-07-12; SIF:174–190). The Forced-Air chapter is now
complete — **6 lessons + 6 paired quizzes** under a `forced-air`
category, plus **6 airflow tools** and ~9 cross-listed air-side pages —
and its deferred "does this get its own nav grouping / hub page" call
came due (SIF:431–439). A second hub is exactly where the **format-based
top nav** starts colliding with the **topic-based hubs**, so the owner
opened the larger question: is the six-lane nav bar itself due for a
rethink, and should the home hero stop steering the mechanically-inclined
trades away?

## The core tension: two taxonomies, one nav bar

- **Format axis** (today's nav): Home / Tools / Simulators / Education /
  Practice / Contact — "what *kind* of thing is this."
- **Topic axis** (the hubs): BACnet, Forced Air, … — "what am I *working
  on*." A field tech's mental model is usually topic-first.

Both are legitimate. The redesign question is *which axis is primary in
the chrome, and where the other one lives* — not "add a BACnet item and a
Forced Air item," which is the version that doesn't scale on mobile.

## Owner decisions (2026-07-13)

| Fork | Decision |
|---|---|
| **How much nav change now** | Incremental: add **one "Guides" lane** for the hubs (Proposal 2). NOT the topic-primary rewrite (Proposal 1). NOT the Simulators-fold (Proposal 3). |
| **Lane name** | **"Guides"** (single narrow word — protects desktop bar width, the whole concern). |
| **Home hero framing** | Broaden to the **whole mechanical stack** ("air, water, refrigerant, power, and the controls that tie them together"). Do **not** name specific trades. Author provenance stays literally true. |
| **Second home demo sim** | **Deferred** as a live widget — no air-side simulator exists to hand off to. A home "browse by topic" card carries the air-side story instead. |

## The key decoupling (why this is low-risk)

**The `/forced-air/` hub *page* is fully separable from the nav-taxonomy
decision.** It is a pure clone of `html/bacnet/index.html` (no `nav:` /
`category:`, clean-directory `canonical`, exempt from `navCategoryGuard`
because the guard only fires on tools/education/practice pages); the pages
it gathers **do not move**; and every nav option — the Guides lane, the
future topic-primary rewrite, or the interim featured pin — consumes the
hub only as a URL reference, never by restructuring it. So the hub ships
first with **zero rework risk**, and the nav change follows as its own
deliberate step.

## Sequencing — two PRs

### PR-1 — `feat/forced-air-hub` — the hub page (nav-independent)

Clone `/bacnet/`'s anatomy (all reusable; only the four page-local
`.bhub-*` heading classes are copied, optionally renamed):

1. **`html/forced-air/index.html`** — frontmatter: `title`,
   `description` (140–160, `descriptionLengthGuard`),
   `canonical: https://controlsfreak.dev/forced-air/`, `keywords`;
   **no `nav:`, no `category:`**. `{% extends "layouts/page.njk" %}` +
   `{% from "nav-card.njk" import navCard %}`.
2. **Body:** `.section-header` H1 (`<h1 class="section-label">Forced
   Air</h1>`), two `.landing-intro` paragraphs, a "start here" reading
   path, then `.card-grid`s of `navCard()` calls — lessons
   `section: 'education'`, tools `section: 'tools'` — grouped
   lessons-vs-tools with purpose sub-groups, closing `.back-link`
   (`← Back to Education`).
3. **Page-local `{% block head %}`** — copy the `.bhub-*` `<style>`
   block (or rename `.bhub-*` → `.hub-*`). *Decision:* with a second
   clone now existing, **promote the block to a shared `.hub-*` set in
   `styles.css`** so it isn't duplicated — this makes the
   `package.json` version bump **load-bearing** for cache-busting
   (immutable-asset rule).
4. **Spoke backlinks** — add
   `hub: {href: '/forced-air/', label: 'The forced-air reference hub'}`
   to the `relatedLinks({…})` call on the **13 core spokes** (6 airflow
   tools + 6 forced-air lessons + **affinity-laws**, the cross-cluster
   full member — owner call 2026-07-13; see *spoke set*). The macro
   already supports the `hub:` param — no macro edit.
5. **Home Browse featured card** — add a
   `navCard({ section: 'reference', wide: true, href: '/forced-air/', … })`
   to the head of `.browse-grid` in `html/index.html` (the `reference`
   accent + `wide` variants already exist — no styles change). Re-check
   the `home count pills … drift guard` in `home-hero.spec.js` if pill
   wording shifts.
6. **Interim chrome reach** — mirror BACnet exactly: extend the
   section-gated `nav-menu-featured` block in `nav-dropdown.njk` to also
   emit a `/forced-air/` pin in the relevant dropdowns. This keeps the
   hub fully reachable if PR-2 slips. **PR-2 deletes both pins** once the
   Guides lane is live — never delete a pin before its replacement ships
   (orphan risk).
7. **Housekeeping** — `tests/pages.js` add `{ url: '/forced-air/' }`
   (sitemap + search-index auto-pick from `canonical`); README tour
   entry; retire any `[future:]` markers; `package.json` minor bump.

### PR-2 — `feat/guides-nav-lane` — the Guides lane + home reword

1. **`html/_data/hubs.js`** — `[{href:'/bacnet/',label:'BACnet'},
   {href:'/forced-air/',label:'Forced Air'}]`. A future hub is **one
   data line** — no macro or `NAV_CATEGORIES` touch.
2. **`nav.njk`** — insert a **Guides** `navDropdown()` right after Home;
   **remove** the standalone `nav-start-here` "Start here →" CTA (L6) so
   the effective text-item count stays **7 → 7**. Guides renders **flat**
   (the Simulators pattern, `groups=null`): a `.nav-menu-blurb` + one
   link per hub from `hubs.js`.
3. **`.eleventy.js`** — add a `navGuides` collection (no
   `NAV_CATEGORIES.guides` — flat; `navCategoryGuard` **not** extended,
   Guides pages need no `category`).
4. **`nav-dropdown.njk`** — **delete** the hardcoded section-gated
   `/bacnet/` featured pin *and* the PR-1 interim `/forced-air/` pin
   (both now redundant — the Guides lane replaces them). This removes the
   one BACnet-specific hardcode from shared chrome.
5. **Hub frontmatter** — add `nav: guides` to `html/bacnet/index.html`
   and `html/forced-air/index.html` so the `navGuides` collection feeds
   the dropdown and the lane lights `.active` on a hub. *This is a
   deliberate deviation from the nav-less pillar archetype* (it pins each
   hub to one lane); accepted for the real `.active` state, and it fixes
   today's oddity where a hub lights no nav section at all. **Note it in
   the friction file when it ships.**
6. **`html/guides/index.html`** — a "pillar of pillars" landing (clone
   the hub anatomy: `.section-header` H1 "Guides", `.landing-intro`, a
   `.card-grid` of `navCard({section:'reference'})` hub cards). Keep a
   couple of orienting intro paragraphs so it isn't a bare 2-link list
   until a 3rd hub lands. `tests/pages.js` add `{ url: '/guides/' }`.
7. **Home reword** — see direction below; add a **"Browse by topic"**
   card row (hubs first) so the air-side broadening is *structural*, not
   just copy. Re-true the count-pill drift guard.
8. **Sweep + bump** — shared-chrome change re-renders every page → full
   `npm test` sweep (not just smoke). Minor `package.json` bump.

## The `/forced-air/` spoke set (curation)

The reader confirmed the membership. Three tiers:

- **Core spokes (12) — hub card AND `hub:` backlink** (unambiguously
  forced-air, exactly like BACnet's 11 spokes):
  - Tools (6, `category: airflow`): `airflow`, `airside-load`,
    `duct-sizer`, `duct-traverse`, `equipment-airflow`,
    `minimum-outdoor-air`.
  - Lessons (6, `category: forced-air`): `air-handlers`, `economizers`,
    `building-pressure`, `air-unit-identification`, `vav-systems`,
    `duct-static-control`.
- **Cross-cluster full member (1) — hub card AND `hub:` backlink, but
  category unchanged** (owner call 2026-07-13): **`affinity-laws`**.
  Fan affinity laws are core to duct-static / VAV fan control, so it's a
  true dual member (fans **and** pumps). It stays `category: hydronics`
  (its taxonomy home) and gets a forced-air "Part of" backlink — a
  cross-link, **not** a re-parenting. It's the **first genuinely
  multi-cluster tool**, so it seeds the *core-tool retrigger* below.
  (Note the current limit: with single-value `category:`, affinity-laws
  can't yet appear under *both* the Airflow and Hydronics nav/chip
  buckets — that dual-taxonomy listing is the deferred core-tool
  feature; the hub card + backlink is how it "appears under forced air"
  today.)
- **Cross-listed (grid card only, NO backlink)** — they belong
  primarily to another axis; a single-parent forced-air backlink would
  mis-parent them, and none was owner-flagged as dual like affinity-laws:
  - Tools under `hvac`: `air-mixing`, `economizer-ratio`,
    `coil-freeze-risk`, `coil-sizing`, `psychrometric-chart`,
    `dew-point-calculator`.
  - Lessons under `fundamentals`: `psychrometrics-basics`, `vfds`.
  - The 6 forced-air **quizzes** (optional in the grid; they already
    pair 1:1 with the lessons via `pairedQuiz`/`pairedLesson`).
  - *(The core-tool retrigger will revisit whether some of these —
    air-mixing especially — deserve fuller multi-membership too.)*

*Tools-side note:* education/practice use a `forced-air` category; tools
use `airflow`. **Do not** rename `airflow` → `forced-air` on the tools
side — it would churn category keys, the `/tools/` filter chips, and the
home count pills for no gain. The hub page *is* the cross-section
grouping; the tools category stays `airflow`.

## Home hero reword — direction

Broaden the **audience** clause; keep the **author** clause literally
true (owner is a controls programmer, so the Person JSON-LD
`jobTitle: "Controls Programmer"` and "built by someone in controls" stay
verbatim — the site *serves* the trades, it doesn't gate on the author's
lane).

- **H1** (today: *"Tools for those in controls, built by someone in
  controls."*) → name the mechanical stack whose nouns mirror the topic
  axis, keeping the single-weight mono shape, e.g. *"Field math and
  reference for the whole mechanical stack — air, water, refrigerant,
  power, and the controls that tie them together. Built by someone in
  controls."*
- **Subcopy** — broaden the controls-panel placement *"the math you
  don't want to redo at the panel"* to work-site-neutral *"in the
  mechanical room, on the roof, or at the panel,"* and name
  mechanical-side tool families (airflow / duct sizing, coil &
  psychrometrics, valve / pump) alongside the controls ones (signal
  scaling, BACnet/IP, Modbus), handing off with *"browse by what you're
  working on."*
- **Meta + JSON-LD** — widen the frontmatter `description` **and** the
  WebSite JSON-LD `description` from "for building-controls engineers" to
  name the air/water/mechanical trades that share the equipment (re-hit
  the 140–160 `descriptionLengthGuard`).
- **Newcomer intent** — "Start here →" leaves the nav; re-home its
  intent: keep the on-ramp line (*"three weeks in or thirty years in"*)
  and Practice's *"new to the field?"* line, and let the Education
  dropdown blurb carry the CTA.

## Second home demo — deferred (rationale)

The decisive blocker: **none of the six simulators is air-side**
(pid-tuner, vfd-mock, function-block-editor, staging-sequencer,
controller-wiring, hydronic-loop-builder), so a second demo would have
no full simulator to hand off to — it would be bespoke JS pointing at a
*tool*. The hero was deliberately composed with **one** loop as "the
payoff at the bottom"; a second stacked widget dilutes that single
conversion moment and adds mobile height + units/reduced-motion handling.
Path: let the home "Browse by topic" grid's Forced Air card carry the
air-side story; **gate** a true second live demo behind first shipping an
air-side simulator (mixed-air/economizer or VAV/duct-static). If one is
built sooner, make it a **toggle/tab on the existing `.hero-seam-stage`**
("Controls loop | Air-side"), not a second stacked widget.
`[future: an air-side simulator → then a second hero demo]`

## Deferred: topic-primary nav (the north star)

**Proposal 1** — replace the four format lanes with ~6 equipment/topic
hub lanes (BACnet, Forced Air, Hydronics, Refrigeration, Electrical,
Controls & I/O) + a single "Browse ▾" for the demoted format axis, with a
new `cluster:` frontmatter driving `.active` + the `hub:` backlink. This
is the **right destination** — the strongest hub-and-spoke internal-link
concentration for the young-domain pillar-cluster SEO play — but it is
disproportionate as the *current* move:

- Commits to **5 new hub pages** when only `/forced-air/`'s spoke set is
  scoped; the hubs are uneven (Electrical is tools-only; Signals/Modbus
  have no honest standalone home → a catch-all "Controls & I/O" lane).
- Adds a **third** hand-kept taxonomy tag (`cluster:`) on top of the
  existing `category` ↔ `navCard` two-source drift (codebase-issues #92)
  — do **not** adopt without also building an interim `clusterGuard`, or
  metadata drift gets worse, not better.
- Full nav rewrite + `nav-menu.js` surgery + ~40 frontmatter edits on the
  flagship front door; loses the dropdowns' deep-link affordance.

**Revisit trigger:** hub count reaches **~4** AND the **mid-August 2026
GSC pull** shows the pillars earning rank (ties into
`seo-growth-plan-2026-07`). `[future: topic-primary nav rewrite]`

## Deferred: "core tool" / multi-membership taxonomy (retrigger)

*(New retrigger, owner-requested 2026-07-13, seeded by affinity-laws.)*

Today the taxonomy is **single-value**: a page's `category:` frontmatter
is one key (it buckets the nav dropdown and the tools-landing filter
chip), and `relatedLinks`'s `hub:` param is one object (one "Part of"
parent). Some tools genuinely belong to **2+ clusters**. `affinity-laws`
is the first: fan **and** pump affinity laws, so forced-air **and**
hydronics. For now it's handled by hand — full membership in the
forced-air hub (card + backlink) while its `category` stays `hydronics`
— but that's a one-off, not a mechanism, and it can't express true
dual-taxonomy listing (appearing under both the Airflow and Hydronics
nav/chip buckets).

**When the pattern recurs, introduce a multi-membership mechanism.**
Candidate shapes (decide at build time):
- `hub:` → accept an **array** so a spoke can be "Part of" multiple hubs
  (the cleanest first step; needed the moment a tool wants two hub
  backlinks).
- Multi-value `category:` (or an `alsoIn: []` companion) so a tool lists
  under multiple dropdown buckets + landing chips — a bigger change
  (touches `navGroups`, `navCategoryGuard`, the chip counts, and the
  two-source `category` ↔ `navCard` drift in codebase-issues #92).
- A lightweight `coreTool: true` tag for tools foundational enough to
  surface across clusters (affinity-laws, arguably signal-scaling,
  psychrometric-chart).

**Revisit trigger — fires on EITHER, whichever first:**
1. The **hydronics hub ships** — `affinity-laws` would then need to
   backlink *both* forced-air and hydronics, which the single `hub:`
   object can't express (forces the `hub:` → array step).
2. **≥3 tools** need to appear under 2+ category buckets on the tools
   landing / nav dropdown (e.g. air-mixing, psychrometric-chart join
   affinity-laws).

First instance: `affinity-laws`. `[future: multi-membership "core tool" taxonomy]`

## Rejected: fold Simulators into Tools (Proposal 3)

Slimming the format nav to Tools+Learn would shorten the mobile top level
(7→5), but it breaks the **`<Section> · <Page>` eyebrow ↔ active-nav
convention** on ~13 pages (a page under the Tools lane would still read
"Simulators · …" / "Practice · …"). That's a documented convention
violation needing an explicit owner waiver — not worth the mobile-row win
that dropping "Start here →" nearly matches for free.

## Related open items to honor

- **codebase-issues #92** (two-source category drift) — *not* worsened by
  the Guides lane (Guides is flat, no `NAV_CATEGORIES`). It *would* be
  worsened by the P1 `cluster:` overlay — gate P1 on building the
  `clusterGuard` first.
- **codebase-issues #140** (`.nav-menu-blurb` bottom rule under-spans an
  expanded panel) — cosmetic; the PR-2 nav work touches this partial, so
  fix opportunistically if cheap, else leave logged.
- **`privacy.html`** — no new `cf_*` localStorage keys in either PR, so
  no policy update needed.
