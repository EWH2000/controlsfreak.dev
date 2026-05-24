# audit-triage.md

A handoff prompt for walking through the 17 remaining substantive findings from the refinement-period content audit, one decision at a time, with pros and cons spelled out for each.

This document is a **conversation script**, not a spec — paste / point a Claude Code session at it (or read top-to-bottom yourself) and you should be able to make each pick informed by the trade-offs already laid out. After all picks are in, the assistant queues the implementation; nothing in this file is acted on by reading it.

## Context

The audit (PRs #110–113, all merged) produced 24 substantive findings across 28 pages in `content-audit.md`. The 7 unambiguous mechanical fixes shipped in PR #114 (`polish/mechanical-audit-fixes`). The 17 remaining findings need editorial picks: convention rules, copy choices, voice/framing calls, UX trade-offs.

The audit also produced minor-polish lists in each batch section. Those are NOT in this file — they roll up into an editorial sweep at the end once the substantive picks are settled.

## Instructions for the assistant reading this

1. **One decision at a time.** Use `AskUserQuestion` per decision, not batched. Per `feedback_design_questions_one_at_a_time` in the user's memory, decisions that invite content elaboration get individual prompts.
2. **Lead with the audit's recommendation.** Where the audit suggested a direction, present that as the first option labeled `(Audit recommendation)`. The user can still pick differently.
3. **Stop and confirm if a pick has downstream dependencies.** Several decisions cascade — flagged inline below as `Depends on: <other>`. If the upstream decision hasn't been settled, ask about it first.
4. **Log decisions as you go.** Append each pick to a fresh `audit-triage-decisions.md` in repo root, with the finding number, the chosen option, and a one-line note on why (the user's actual words if they elaborated). This becomes the source of truth for the implementation phase.
5. **Don't implement during triage.** Pure decision-gathering. Implementation gets a separate session with the decisions doc as input.
6. **Pause every ~4 decisions** to check whether the user wants a break or to keep going. Triage fatigue is real.

## Order of decisions

Organized by **decision dependency**, not by batch — picks that gate other picks come first.

1. [Failure-state idiom](#1--failure-state-idiom--25) (#25) — sets the visual vocabulary
2. [Eyebrow taxonomy rule](#2--eyebrow-taxonomy-rule--29-32-14) (#29 / #32 / #14) — sets cross-section rule
3. [Initial-state policy for cold tools](#3--initial-state-policy-for-cold-tools--20) (#20)
4. [Preamble policy for protocol/signals tools](#4--preamble-policy-for-protocolsignals-tools--21) (#21)
5. [Copy-button labeling convention](#5--copy-button-labeling-convention--26) (#26)
6. [Narrow-width honesty callout](#6--narrow-width-honesty-callout--30-paired-with-23) (#30, paired with #23)
7. [Mobile bit-grid](#7--mobile-bit-grid--23) (#23)
8. [Education filter chips](#8--education-filter-chips--12) (#12)
9. [Education title pattern](#9--education-title-pattern--31) (#31)
10. [SEC:NNN numbering](#10--secnnn-numbering--33) (#33)
11. [Home "My Most Common Tools" framing](#11--home-my-most-common-tools-framing--11) (#11)
12. [Hero "More coming" badge](#12--hero-more-coming-badge--15) (#15)
13. [Hero UPTIME 24×7 statline](#13--hero-uptime-247-statline--16) (#16)
14. [Curriculum vs chip-browse tension](#14--curriculum-vs-chip-browse-tension--17) (#17)
15. [Minor-polish sweep](#15--minor-polish-sweep) — editorial round-up

---

## 1 — Failure-state idiom (#25)

**Problem.** When inputs land in a state the math can't (or shouldn't) resolve, the 9 tools handle it 5 different ways. Best-in-class is `economizer-ratio`'s amber callout with prose ("Out of range — OA cooler than setpoint, but not cold enough... damper goes 100 % OA, coil picks up the rest"). Others mostly fall back to `—` with no diagnostic.

**Why this is first.** Several other findings depend on whether there's a canonical "doesn't compute" visual. The copy-button decision (#26), the cold-tool initial-state decision (#20), and the bit-grid mobile decision (#23) all touch what users see when something goes wrong.

### Options

**Option A — Canonize the amber-callout pattern across all 9 tools** *(Audit recommendation)*

- *Pros:* Best-in-class teaching moment; econ-ratio's callout *teaches while it fails*, naming the failure mode and the action. Consistent shape across all tools. CSS class shape already exists in `styles.css` (matches the existing notice/alert chrome). High-signal experience for the field-tech lens.
- *Cons:* Requires editorial work per tool — each invalid-state branch needs prose describing the specific failure. Not all failure modes have a clear physical-systems explanation (e.g., signal-scaling with equal-bounds → division-by-zero is harder to write a teaching callout for). Adds page-specific copy that has to stay correct as math changes.

**Option B — Pick a leaner pattern: amber pill + one-line message, no full prose**

- *Pros:* Lower editorial cost. Still surfaces "something is wrong" rather than blank `—`. Consistent shape. Easy to retrofit without per-tool copy writing.
- *Cons:* Loses the *teaching* dimension that makes econ-ratio's version genuinely useful. Reads as warning chrome rather than insight.

**Option C — Status quo (5 different idioms)**

- *Pros:* No work. Each tool's failure shape is already calibrated to its own context.
- *Cons:* The audit finding stands — cross-tool experience is inconsistent. A user moving between tools gets different "doesn't compute" treatments, which is the kind of papercut a polished site avoids.

### Cascade

If A or B is picked, this becomes the visual base for #26 (copy-button labels can stay simple because failure-state has its own treatment) and #20 (cold tools can land *with* a callout explaining "fill in a value to compute" rather than just blank outputs).

---

## 2 — Eyebrow taxonomy rule (#29, #32, #14)

**Problem.** The site has three sections (Tools, Simulators, Education) and three different eyebrow conventions:
- **Tools** use `<span class="section-label">Analog I/O</span>` — just the category, one to two words.
- **Simulators** use the same — `Loops`, `Drives`, `Logic` (just landed).
- **Education** uses two-part — `<span class="section-label">Education · Pump Control</span>` (section name + page name).

Plus the sim-card `titleShort` for the function-block-editor (#14) is currently `Wiresheet`, which conflicts with the page's actual product name (`Function-Block Editor`). The right `titleShort` depends on the broader naming convention.

**Why this is second.** Three findings cluster here (#29 within-sims, #32 cross-section, #14 the sim-card text). A single ruling resolves all three. Several other downstream decisions (preamble copy in #21, title patterns in #31) lean on what counts as "the right level of detail for a page's identity strip."

### Option A — Drop "Education · " prefix on education page eyebrows; sweep to one-word categories site-wide

- *Pros:* Consistent across all three sections. Matches the existing tools/sims shape. The eyebrow's job becomes "carry the category"; the active-nav highlight + page title fill in the rest. Cleanest.
- *Cons:* Education pages lose the explicit "you are inside the curriculum" signal. A deep-link visitor lands on `/education/pump-control.html` and the eyebrow says just "Hydronics" — they have to glance at the nav to know they're on an education page (not a tool, not a sim).

### Option B — Add section name to tools/sims eyebrows ("Tools · Signal Scaling", "Simulators · PID Tuner")

- *Pros:* Heavier but explicit. Every page's eyebrow names both its section and itself. Most decode-able for a deep-linker. Mirrors breadcrumb pattern.
- *Cons:* Adds noise to the simpler tool pages where the existing one-word category was tight. Reads as belt-and-braces given the nav already highlights the active section.

### Option C — Keep the asymmetry, document why ("Education carries section because curriculum matters; tools/sims don't because they're standalone utilities")

- *Pros:* No code change. Codifies the existing intent.
- *Cons:* The audit finding stands as a real cross-section inconsistency. Documenting a drift doesn't fix the visual.

### Cascade for #14 — `titleShort` for Function-Block Editor sim card

Independent of A/B/C above — pick the short name to display in the simulators landing card titlebar:

- **`FB Editor`** — direct abbreviation of the full name. Reads as "function-block editor" without using the surface term. *(Audit recommendation)*
- **`Fn Blocks`** — generic shortform. Same logic, slightly more abstract.
- **`Block Editor`** — drops the "function" qualifier; reads as a generic block editor.
- **`Wiresheet`** (status quo) — names the surface metaphor, but conflicts with the page's actual product name and the home nav references the tool as "Function-Block Editor."

---

## 3 — Initial-state policy for cold tools (#20)

**Problem.** Three tools (`signal-scaling`, `modbus-register-viewer`, `bacnet-ip-converter`) land with every input blank-with-placeholder. Six HVAC tools land with credible worked examples. The cold landings make the *simplest* tools the hardest to approach — exactly inverted from where the friction should be.

### Option A — Add `value=` defaults to the 3 cold tools *(Audit recommendation)*

Suggested defaults from the audit:
- **signal-scaling** — 12 mA on 4–20 mA, 0–100 psi span, unit "psi" → result 50.0 psi · 50.0 % of span
- **modbus-register-viewer** — decimal 43981 / hex 0xABCD (promote the existing placeholder to `value=`)
- **bacnet-ip-converter** — hex `C0A80164BAC0` (decodes to 192.168.1.100 + port 47808)

- *Pros:* First paint shows a real computed result; the tool teaches what it does in a glance. Aligns with the worked-default majority. Lowers approach-friction for the simplest tools. Field-tech use stays clean (override the one value that differs, ignore the rest).
- *Cons:* A returning power-user who knew the cold-start now has to clear fields they didn't ask to be pre-filled. Risk that the "default scenario" reads as the tool's only use case. Picked defaults need to be credible enough not to teach the wrong intuition.

### Option B — Strip `value=` defaults from the 6 HVAC tools instead — make cold-landing universal

- *Pros:* No tool ships with state. Every visit starts intentional. Cleaner.
- *Cons:* The HVAC tools' worked-state landings are pedagogically strong — psych chart loading with summer cooling, econ ratio loading at OA-cooler-than-setpoint, etc. Removing them loses real teaching value. Pushes the burden onto the visitor to construct a scenario from scratch.

### Option C — Status quo (split: protocols cold, HVAC worked)

- *Pros:* No work.
- *Cons:* The audit finding stands. Cross-tool inconsistency.

### Cascade

If Option A is picked, the picked values need to be reviewed for engineering credibility — a wrong default teaches the wrong thing on first paint. The audit's suggestions are starting points; the user knows the trade better.

---

## 4 — Preamble policy for protocol/signals tools (#21)

**Problem.** Every HVAC tool opens with a task-framed 2–4 sentence preamble (`economizer-ratio` is canonical: *"How far do I open the outdoor-air damper to hit a mixed-air setpoint at these conditions?..."*). The four non-HVAC tools — `signal-scaling`, `modbus-register-viewer`, `bacnet-ip-converter`, `thermistor-calculator` — have **no preamble** above their inputs.

**Stacks with #20.** Same three tools (sig-scaling, modbus, bacnet) land cold *and* lack a preamble — exactly the simplest tools doing the least to onboard the visitor.

### Option A — Write task-framed preambles for the 4 non-HVAC tools *(Audit recommendation)*

Modeled on econ-ratio's shape: a question or task in the lead sentence, then a sentence per tab if the tabs are functionally distinct.

- *Pros:* Visitor reads "what is this tool for?" before any input field. Consistent with the HVAC tools. Onboards a newcomer; gives a returning tech a quick "yes this is the one I want" confirmation.
- *Cons:* Editorial work per tool — 4 new paragraphs that have to stay accurate. The simpler tools' preambles risk reading as padding ("This tool converts mA to engineering units" is information-thin compared to econ-ratio's framing).

### Option B — Strip preambles from the HVAC tools — make no-preamble universal

- *Pros:* All tools start with the calculator. Field-tech speed.
- *Cons:* HVAC preambles are genuinely useful, especially for the multi-tab tools (psych chart, econ ratio, refrig P-T) where the tabs aren't self-explanatory. Losing them costs orientation.

### Option C — Status quo

- *Pros:* No work.
- *Cons:* Audit finding stands.

### Cascade

If A: also pick whether each preamble includes the prereq cross-link inline (matching the lesson→tool pattern). E.g., does signal-scaling's preamble link to a future "Analog I/O basics" lesson, or stay tool-only? *Note: no current lesson exists for signal-scaling or BACnet/IP hex; only modbus has both (modbus-basics + modbus-decoding) and thermistor has none.*

---

## 5 — Copy-button labeling convention (#26)

**Problem.** Copy buttons across the 9 tools use 3 patterns: generic *"Copy value"* (3 tools), task-specific *"Copy %OA"* / *"COPY IP"* / *"COPY MIXED STATE"* (3 tools), or no copy at all (3 tools).

### Option A — Task-specific everywhere *(Audit recommendation)*

- *Pros:* The button text disambiguates which value gets copied — a tech with multiple tabs open knows what they're grabbing. Reads professional. Matches the BAS instrument-feel where every readout names what it is.
- *Cons:* Per-tool editorial work. Tools with multiple primary outputs need multiple buttons or a button-with-scope ("Copy current readout"). Risk of label-sprawl across the page.

### Option B — Generic "Copy" everywhere

- *Pros:* Consistent. No editorial work. Less visual weight.
- *Cons:* Loses the disambiguation. User has to know what the active output is. Reads anonymous.

### Option C — Hybrid rule: single-output tools use "Copy value", multi-output tools use task-specific labels

- *Pros:* Each shape stays where it works. Documents the rule for future tools.
- *Cons:* Still 2 patterns to maintain. Boundary cases (is psych chart "multi-output"? It has 7 properties...) need judgment.

### Cascade (sub-decisions)

- **Should modbus and psych chart gain copy primitives?** Modbus could copy hex/dec/binary; psych chart could copy the property table for the selected stage.
- **Where do copy buttons live on multi-tab tools?** Currently per-tab — consider whether a single global "Copy current results" button per tool would simplify.

---

## 6 — Narrow-width honesty callout (#30, paired with #23)

**Problem (strength flag).** `function-block-editor` shows a narrow-width callout at tablet/mobile sizes:

> *"This editor is built for a wider screen and a pointer — wiring blocks on a phone is cramped. The regions stack below, and it still works, but a laptop gives it room to breathe."*

This is the field-tech voice the friction file's *field-use conditions* rule asks for, applied honestly. Other tools with known narrow-width tradeoffs (modbus bit-grid in #23, psych chart canvas) have no equivalent callout.

### Option A — Canonize the pattern; add a `.narrow-width-note` class; deploy to tools that need it *(Audit recommendation)*

- *Pros:* Honest communication beats false-optimism. Doesn't block use; just sets expectations. Class promotion is small (`display:none` default; `@media (max-width:700px) { display:block; ... }`). Documents the pattern in `styles.css` for future tools.
- *Cons:* Adds copy that has to be written per tool. Some tools (psych chart, PID tuner) might not have a clean one-sentence message about the trade-off. Risk of over-using the pattern (every page apologizing for itself).

### Option B — Don't canonize; keep fbe's callout as a one-off

- *Pros:* No new class. fbe stays the odd one out with its own justification.
- *Cons:* Inconsistent. Doesn't help #23 (modbus bit-grid is a real mobile-tap issue).

### Option C — Add the callout only where there's a measurable mobile UX problem (modbus bit-grid, maybe psych chart)

- *Pros:* Targeted; doesn't pollute every tool. Solves the specific finding.
- *Cons:* Still adds per-tool copy. Same writing cost as A but applied to fewer tools.

### Cascade

This pairs with #23 — the bit-grid finding wants either a responsive restructure (4×4 grid at narrow widths) OR an honesty callout that says "this is a desktop primary interaction." Pick the bigger pattern first.

---

## 7 — Mobile bit-grid (#23)

**Problem.** Modbus Register Viewer's bit-grid cells render at ~30 px square at 375 px mobile viewport — well below Apple's 44 px tap-target minimum, and noticeably below thumbable size with gloves on.

**Depends on #6** — the honesty-callout decision affects whether this needs a structural fix or a "we know" callout.

### Option A — Responsive grid restructure: 4×4 at narrow widths

- *Pros:* Each cell becomes ~65 px square — comfortable tap target. Preserves the tool's pedagogy (individual bit toggling stays the affordance). Pure CSS change (media-query rewrite of `grid-template-columns`).
- *Cons:* 4×4 changes the bit-position layout — currently the source documents 8×2 as an editorial choice (cell legibility at 50 px in the 2-col layout). The 4×4 layout puts bit 8 next to bit 11 in the same row, which obscures the "high byte vs low byte" visual that 8×2 makes explicit. A user used to the desktop layout sees a different mental model on mobile.

### Option B — Honest narrow-width callout (per #6) + accept the cramped grid

- *Pros:* No layout change. The bit-grid pedagogy stays intact on both desktop and mobile (just cramped on mobile). The callout sets the field-tech expectation that this is a desktop-primary tool.
- *Cons:* Mobile tap targets stay below the threshold. A tech who needs to flip a bit on the floor still has to zoom or accept misclicks.

### Option C — Drop the bit-grid on mobile; surface a fallback UI (binary-string editor, or dec/hex inputs only)

- *Pros:* Mobile gets a usable interaction. Desktop keeps the grid.
- *Cons:* Two UIs to maintain. The educational value of "click bit 5 to see what changes" is the tool's whole point — losing it on mobile reduces the tool to a calc.

### Option D — Status quo

- *Pros:* No work.
- *Cons:* Audit finding stands.

---

## 8 — Education filter chips (#12)

**Problem.** The education landing has 8 filter chips: All 13, Hydronics 4, Drives 1, Control 1, HVAC 1, Sequencing 1, Logic 1, Protocols 4. **Five chips return a single card on click** — chrome implies "narrow this collection," result is one card top-left in an otherwise-empty grid. Reads as a broken or empty state.

### Option A — Drop singleton chips; keep only multi-card categories (Hydronics 4, Protocols 4, + "Other" for the remaining 5) *(Audit recommendation, variant)*

- *Pros:* Every chip click yields a meaningful subset. The chip row gets shorter and easier to thumb. Singleton categories implicitly become "everything else."
- *Cons:* "Other" is a weak category name; needs a better noun (e.g., "Concepts," "Fundamentals"). Loses category visibility for the singleton topics (a visitor looking specifically for "Drives" doesn't see it as a chip). 4 chips total feels thin.

### Option B — Drop chips entirely; group cards visually by category with subheads

- *Pros:* No false-affordance issue. Subheads ("HYDRONICS" / "PROTOCOLS" / "CONCEPTS") group the curriculum visually without implying filtering. Reads as a structured catalog.
- *Cons:* Loses the deep-link affordance (`#hydronics` no longer scrolls/filters). Browsing by category requires scrolling rather than clicking. Heavier visual layout change.

### Option C — Drop chips entirely; keep the linear ordered list (no grouping)

- *Pros:* Simplest. The curriculum order tells the story. Cleanest field-tech experience.
- *Cons:* No browse-by-category affordance at all. A returning visitor who wants "the BACnet stuff" has to scan 13 cards.

### Option D — Keep singletons but change the chip behavior: single-chip click *highlights* in place (scroll-to + accent) instead of filter-others

- *Pros:* Preserves the categorical taxonomy. No card hides on click. Works for the curriculum vs chip-browse tension (#14 below).
- *Cons:* Behavior diverges from typical filter-chip UX. Users expect filtering when they see chips; getting scroll-to-highlight is surprising.

### Cascade

Affects #14 (curriculum vs chip-browse tension) — if chips go away, the curriculum order becomes the only path and that tension resolves.

---

## 9 — Education title pattern (#31)

**Problem.** 8 education pages carry an em-dash subtitle answering the page's question (*"Pump Control — How a BMS Drives the Pump"*). 5 newer protocol/logic pages go bare (*"BACnet Basics"*). Split tracks chronology, not page type — looks like the convention drifted mid-project.

### Option A — Adopt subtitle pattern across all 13

Suggested subtitles for the bare 5 (from the audit):
- `BACnet Basics — Objects, Properties, and the Wire`
- `BACnet Networking — Three Addresses and How the Frame Travels`
- `Function-Block Basics — Logic by Wiresheet`
- `Modbus Basics — What's on the Wire and How a Request Looks`
- `Modbus Decoding — Why the Register Reads Wrong`

Plus rewrite `vfds`'s acronym-expansion subtitle (*"VFDs — Variable Frequency Drives"*) into a question (e.g., *"VFDs — What the Drive Actually Does"*).

- *Pros:* Cards on the landing read "here's what you'll learn." Consistent. Subtitles invite curiosity.
- *Cons:* Editorial work — 5+1 subtitles to write that stay accurate. Risks the page-title bar becoming long on mobile.

### Option B — Adopt bare pattern across all 13

- *Pros:* Tighter. Each page's lead sentence does the same job the subtitle would. Less visual weight.
- *Cons:* Loses the "question framing" the older pages established. Cards on the landing read flatter.

### Option C — Keep both; document the rule

The rule would be something like: "narrative-arc pages get subtitles; reference/vocabulary pages go bare." The 5 bare pages are all vocabulary/reference; the 8 with subtitles are all narrative.

- *Pros:* The chronology drift becomes a documented design rule. No retrofit needed.
- *Cons:* The rule has to be clear enough that future pages know which they are. Some pages straddle (is `equipment-staging` narrative or reference?). Risks looking like post-hoc rationalization.

---

## 10 — SEC:NNN numbering (#33)

**Problem.** Two pages (pid-basics, psychrometrics-basics) carry `data-objref="NNN"` on their h2 subheads, rendered as `SEC:001 · LABEL`. The other 11 education pages have no such prefix. The original intent (BACnet-flavor decoration for curriculum sequence) doesn't clearly apply to 2 of 13.

### Option A — Drop the SEC:NNN prefix on the two pages

- *Pros:* Removes inconsistent decoration. Sub-section ordering is implicit in document order. Cleanest.
- *Cons:* Loses the BAS-instrument flavor on those two pages. The rendered numbering does add a "you are in section X" cue that some readers like.

### Option B — Add SEC:NNN to all 13 education pages

- *Pros:* Commits to the curriculum-sequence visual cue. Universal consistency. Strengthens the BAS-instrument frame across the education section.
- *Cons:* Per-page work to add `data-objref` to every h2. Risk of looking like decoration that got force-extended for consistency rather than because each page benefits from the cue.

### Option C — Extend only to the "paired with a sim" cohort: pid-basics, psychrometrics-basics, function-blocks

- *Pros:* Defines a rule ("paired-with-a-sim pages get the BAS-instrument numbering"). Function-blocks just gets the prefix added — small lift. The cohort has shared structure (pages that pair with an interactive sim).
- *Cons:* The "paired with a sim" rule isn't intuitive — why would those pages need numbering and not others? Risks looking like post-hoc justification.

### Option D — Status quo

- *Pros:* No work.
- *Cons:* Audit finding stands.

---

## 11 — Home "My Most Common Tools" framing (#11)

**Problem.** Home Stage 1 reads "MY MOST COMMON TOOLS" — first-person ownership implies the site author's preferences, but a new visitor doesn't know who "I" is until they reach the About section two stages later.

### Option A — Rename to a visitor-oriented eyebrow

Candidates: *"Most-reached-for tools"* / *"Quick access"* / *"Field favorites"* / *"Common tools"*.

- *Pros:* Welcomes a first-time visitor without assuming they've read the About. Consistent with the "field-reference site, not a personal portfolio" voice the rest of the site cultivates.
- *Cons:* Loses the personal voice that makes the site feel hand-built. The "MY" framing IS part of the field-voice the friction file values.

### Option B — Keep "MY MOST COMMON TOOLS"; add a one-line subhead explaining

E.g., a short sentence under the stage label: *"What I reach for most when I'm at a panel."*

- *Pros:* Keeps the personal voice. Adds the context a newcomer needs without losing the framing.
- *Cons:* More visual weight on the section header. Two voices in one block.

### Option C — Keep status quo; trust the About section to land the "I" later

- *Pros:* No work. The personal voice is preserved.
- *Cons:* Audit finding stands. A visitor scanning home for ~5 seconds may bounce before the About paragraph lands.

---

## 12 — Hero "More coming" badge (#15)

**Problem.** Hero badges row ends with `<span class="badge">More coming</span>`. With 25+ pages shipped and growing actively, the badge reads as apologetic — undercuts the surrounding badges' confidence (BACnet/IP Hex, Modbus Register Viewer, Psychrometric Chart, etc.).

### Option A — Drop the badge entirely

- *Pros:* Removes the apologetic note. The remaining badges read as a representative sample without claiming exhaustiveness. Cleanest.
- *Cons:* Loses the "this site is growing" signal — some visitors interpret "More coming" as "this is active, come back."

### Option B — Replace with a concrete additional badge (e.g., "Refrigerant P-T", "Function-Block Editor")

- *Pros:* Adds a real catalog item to the row. Visitor sees more breadth at a glance.
- *Cons:* Picks a winner among non-displayed tools. Still implicitly "more exist" by being a sample.

### Option C — Replace with a "v2.8.0" or build-date style "active" badge

- *Pros:* Signals activity without naming specific tools. Reuses existing version metadata.
- *Cons:* Duplicates the version/build chrome in the console-statusline below the hero.

### Option D — Status quo

- *Pros:* No work.
- *Cons:* Audit finding stands.

---

## 13 — Hero UPTIME 24×7 statline (#16)

**Problem.** Hero console-statusline reads `OK · VERSION v2.8.0 · LAST BUILT 2026-05-24 · UPTIME 24×7`. The first three carry meaning; `UPTIME 24×7` is a static-site claim about uptime that the site doesn't actually measure. Against the otherwise-credible field-reference frame, this is the one beat that swings to joke.

### Option A — Drop the UPTIME line

- *Pros:* Removes the only non-verifiable claim in the statline. Tightens the BAS-instrument frame.
- *Cons:* Slightly less visual content in the statline. Three stats instead of four.

### Option B — Replace with something verifiable

Candidates:
- `RESPONSE <1S` (no network round-trip for tool answers)
- `PUBLIC` (mirrors "no login")
- `OFFLINE-READY` (the tools work without network)

- *Pros:* Keeps the four-stat shape. New stat carries a real claim about the site's design.
- *Cons:* Each replacement has its own framing. `PUBLIC` is borderline-redundant with "no login"; `OFFLINE-READY` overstates (tools work offline once loaded, but the page itself requires network for the first hit).

### Option C — Keep UPTIME 24×7 as deliberate BAS-flair

- *Pros:* The statline IS visual flair — the OK pill, the mono font, the bullet separators are all decorative. The audit's flag treats it as a credibility issue; the user may treat it as theater.
- *Cons:* Audit finding stands.

---

## 14 — Curriculum vs chip-browse tension (#17)

**Problem.** Education cards are ordered as a curriculum sequence (PID Basics → Hydronic Loops → Load Piping → ...). The filter chip row at the top of the page implies categorical browsing. A newcomer who tapped "Hydronics" first gets 4 cards that don't include the PID Basics prerequisite; one who tapped "Protocols" first gets BACnet/Modbus topics that the sequence puts *last*.

**Depends on #8.** If #8 picks Option B or C (drop chips), this tension resolves automatically.

### Option A — Reframe the chip row as "Already comfortable with X? Jump to:" — explicitly the shortcut for non-newcomers

- *Pros:* Acknowledges both use cases. Newcomers read top-to-bottom; experienced users use the chips. Doesn't require restructuring.
- *Cons:* "Already comfortable" framing is wordy for a filter chip row. Risk of being too cute.

### Option B — Add a small "Read in order" hint above the grid

E.g., a one-line note: *"If you're new to controls, start at the top and work down."*

- *Pros:* Cheap. Signals intent. Doesn't conflict with the chip affordance.
- *Cons:* Adds chrome to the landing. Hint may go unread.

### Option C — Resolved by #8

If #8 drops chips, no separate fix needed. The card order tells the only story.

### Option D — Status quo

- *Pros:* No work.
- *Cons:* Audit finding stands.

---

## 15 — Minor-polish sweep

Each batch's audit section in `content-audit.md` has a *Minor polish* list — phrasing, undefined-jargon, alignment, voice-swing items that don't rise to substantive but accumulate.

**Recommendation:** treat as a single editorial sweep after the 14 design-choice picks above land. One PR, one commit per batch (or one commit per page if it stays clean), each items in the lists either fixed inline or struck through with a one-line reason for skipping.

### Bundled questions to confirm before that sweep

1. **"Common sense" → "Practical" / "Plain-English" on the education landing lead?** Audit flagged "common sense" as slightly self-deprecating. Pick one.
2. **VFDs page title — drop the acronym-expansion subtitle or rewrite as a question?** Depends on #9 (Education title pattern). If A picked, rewrite as question; if B picked, drop the em-dash entirely.
3. **Home About card "Verified: 2026" — what was verified?** Pick a clearer label (e.g., "Active since: 2026" or "Content reviewed: 2026").
4. **Modbus essentials lead voice swing** — flag if you want it tightened or if the swing is deliberate.
5. **Coil-sizing AIRFLOW section header for one CFM input** — collapse to a ps-row inside LEAVING AIR, or keep as its own section?

---

## After all decisions

Implementation phase happens in a fresh session with `audit-triage-decisions.md` as input. The assistant should:

1. Read the decisions doc.
2. Propose a PR grouping that batches related decisions (e.g., all eyebrow renames in one PR, all preamble adds in one PR, etc.).
3. Run the changes in one branch with focused commits.
4. Run tests, push, open PR.
5. Update `codebase-issues.md` for any newly-arisen code items.
6. Update the *Minor polish* lists in `content-audit.md` to strike through items that got resolved inline during the substantive fixes.

After the implementation PR merges, revisit the nav-card grid question (parked since the plan kickoff) — the implementation choices may have changed what the grid needs to be.
