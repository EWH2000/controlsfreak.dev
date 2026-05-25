# Refinement priorities

Working backlog for the post-Practice refinement phase. Built by
walking the four buckets (`content-audit.md`, `codebase-issues.md`,
`site-ideas-and-friction.md`, SEO baseline) and ranking by leverage
÷ effort, biased toward quick wins so progress stays steady in
short sessions.

**How to use it.** Pick the top unchecked item in the highest tier
you have time for. Each entry carries a `[source-file #N]` tag —
click through to that file for the full context. Items that
genuinely batch are noted in the rationale ("do with #X").

**Retire when** Tier 1 is empty (or you want a fresh survey — the
audit is from 2026-05-24, ground will shift).

**Effort tags:** **S** = single session (a string change, a small
HTML reshuffle, ~30 min). **S-M** = a focused hour. **M** = a
substantial session, often a decision plus a sweep. **L** = a
multi-session pattern change or new shared class.

---

## Tier 1 — Quick wins (S / S-M)

Pick from the top; most are one-string or one-block edits.

- [x] `[content-audit #11]` **Home "MY MOST COMMON TOOLS" framing
      is author-centric.** Rename to remove the first-person voice
      (e.g. "Most-reached-for tools" or "Quick access"). **S** —
      one string. *Anchors the voice cluster — once you set the
      field-reference frame here, #15 and #16 are the obvious
      next two; do all three in one session.*

- [x] `[content-audit #15]` **Hero "More coming" badge reads as
      apologetic** on an actively-shipping site. Drop, or replace
      with the concrete next-ship item. **S** — one string. *Do
      with #11/#16.*

- [x] `[content-audit #16]` **Hero "UPTIME 24×7" statline is a
      gag stat** breaking an otherwise credible statline. Drop, or
      replace with a verifiable claim (`RESPONSE <1S`, `PUBLIC`).
      **S** — one string. *Do with #11/#15.*

- [x] `[content-audit #10]` **Home Browse stage is missing a
      Simulators card** — Stage 2 surfaces Tools and Education but
      not Simulators, even though the section exists in nav.
      **S** — add one `navCard()` call to the `.card-grid.two`
      block.

- [x] `[content-audit #19]` **Education lead's "reach out" CTA
      has no href** while other inline anchors on the page are
      wired. **S** — wrap the text in `<a href="/contact.html">`.

- [x] `[content-audit #14]` **Simulators "Wiresheet" titleShort
      misnames the FBE.** The product is "Function-Block Editor";
      `Wiresheet` is a surface metaphor. Rename to `FB Editor` or
      `Fn Blocks` and sync the first pill label. **S** — one
      string + a pill label.

- [x] `[content-audit #27]` **Function-Block Editor eyebrow still
      reads "Tools"** — stale from the May-23 section move
      (`html/simulators/function-block-editor.html:12`). The page
      reads `TOOLS` while nav highlights `Simulators`. Change to
      `Logic` (matches the existing tool-tag pill). **S** — one
      string. *Touches the #29/#32 eyebrow-taxonomy question
      indirectly; the one-word change is safe regardless of how
      that lands.*

- [x] `[content-audit #22]` **Psychrometric Chart prereq
      cross-link sits at the bottom** of the densest tool on the
      site — a newcomer scrolls past the chart that confused them
      before they find the link that would have helped. Move the
      `.tool-card` callout immediately under the preamble and
      reframe as a prerequisite hint ("New to this? Start with
      [Psychrometrics Basics] →"). **S-M** — move one block + a
      one-line rephrase. *Same fix as #28; do them in the same
      session.*

- [x] `[content-audit #28]` **PID Tuner prereq cross-link sits at
      the bottom** — same shape as #22. Move from the bottom
      `.pid-note` paragraph to inline in the preamble around line
      146–149, matching the `fbe`/`vfd` shape. **S** — same
      shape as #22; do them together.

- [x] `[content-audit #24]` **BACnet/IP Converter puts derived
      readouts in the Input column.** `Length` and `Format` are
      computed from the hex string but sit alongside the editable
      input, violating the site-wide Input/Output convention.
      Move both `ps-row` pairs from the Input `<section>` to the
      Output `<section>`. **S-M** — one file, two rows.

- [ ] `[SEO]` **Add `rel="related"` to anchors in
      `related-links.njk`.** The macro already builds cross-link
      blocks across tools / sims / lessons / quizzes but its
      `<a>` tags carry no `rel` attribute. Adding `rel="related"`
      to each `<a>` is a single macro edit that propagates
      site-wide. **S** — one file, four anchor templates. *Low
      individual lift but applies to every deep page on the site.*

---

## Tier 2 — Medium lifts (M)

Worth a longer session. Several batch naturally; the rationale
notes the pairings.

- [x] `[content-audit #12 + #17]` **Education chips conflict with
      curriculum sequencing.** Five of eight chips show one
      lesson each (broken filter UX, #12); meanwhile cards are
      sequenced as a prerequisite chain that chip-jumping skips
      (#17). One decision resolves both: (a) drop singleton chips,
      (b) reframe chips as "Already comfortable? Jump to:", or (c)
      drop chips entirely and lean on the curriculum order.
      **M** — design call + restructure. *Cluster issue — pick
      one direction and the rest collapses.*

- [x] `[content-audit #20 + #21]` **The simplest tools are the
      hardest to approach.** Signal Scaling / Modbus /
      BACnet-IP land *cold* (every input blank, output muted
      to "—", no formula rendered) and carry *no preamble* —
      exactly the inverse of where friction should be. Batch as
      one editorial pass: add credible `value=` defaults to the
      three cold tools (suggestions in #20) + write 2–4-sentence
      task-framed preambles (template from `economizer-ratio`).
      **M** — three defaults + 3 preambles. *Highest leverage
      for newcomer experience.*

- [x] `[content-audit #18]` **Landing-page lead `<p>`s carry
      three different inline `max-width`s (560 / 560 / 700)** —
      same pattern, copy-pasted with drift. Promote to a shared
      `.landing-intro` class (or expand `.page-intro` scope) at
      a single value (~660 px) and sweep the three landings.
      **S-M** — one CSS rule + three inline-style removals.

- [ ] `[content-audit #13]` **titleShort abbreviation discipline
      drifts** across 25+ `navCard()` calls — no written rule,
      so some aggressively abbreviate, others stay full-length.
      Pick a rule (suggest: conventional abbreviation if one
      exists in the field, otherwise full name) and sweep. **M**
      — decision + mechanical sweep. *Document the rule in
      CLAUDE.md once picked.*

- [x] `[content-audit #26]` **Copy-button labels swing between
      generic and task-specific.** Three tools say "Copy value,"
      three say "Copy %OA" / "Copy IP" etc., three have no copy.
      Pick a convention (task-specific reads better) and sweep
      the 9 tool pages. **M** — decision + 6 edits.

- [x] `[content-audit #23]` **Modbus bit-grid cells are below the
      mobile tap-target threshold** (~30 px at 375 px viewport,
      vs. 44 px HIG minimum). Either restructure to 4×4 at narrow
      widths via media query, OR adopt the #30 honesty-callout
      pattern and explicitly mark this as desktop-primary. **S-M**
      — depends on direction (the media query is small; the
      honesty callout depends on #30 landing first).

- [ ] `[SEO]` **`FAQPage` / `QAPage` JSON-LD on quiz pages.** The
      quiz engine already structures questions and answers; emit
      them as schema in the page's head so search engines can
      index the Q&A corpus. The Modbus Decoding page is the v1
      tester; sweep to subsequent quizzes once the shape is set.
      **M** — engine change + head template addition.

- [ ] `[SEO]` **`rel="prev"` / `rel="next"` on education pages.**
      Education is a deliberate prerequisite chain (per #17 +
      `site-ideas-and-friction.md` notes); declaring the sequence
      in `<head>` link relations helps both search-engine sequence
      understanding and assistive-tech navigation. **M** — needs
      a sequence definition (data file or per-page frontmatter)
      + a layout addition.

---

## Tier 3 — Bigger / structural (M-L)

Visible so they don't fall off the radar. Pick when a longer
session opens up; several pair with smaller items in Tier 1/2.

- [x] `[content-audit #25]` **Failure-state UX has no shared
      idiom across tools.** Five tools, four different shapes for
      "this doesn't compute" — from amber callout with physics
      explanation (`economizer-ratio`, best-in-class) down to a
      silent "—" (the simpler tools, worst). Pick the
      amber-callout shape as canonical, promote to a shared
      class, retrofit. **L** — design + new shared class + sweep.
      *High pedagogical value; the field-reference frame loses
      ground every time a tool silently mutes instead of
      teaching.*

- [x] `[content-audit #29 + #32]` **Eyebrow taxonomy is
      inconsistent across sections.** Tools use category nouns
      (`Modbus`, `HVAC`); Simulators mostly do (`Loops`, `Drives`)
      with one stale (`Tools`, see #27); Education uses a
      two-part `Education · Page Name` shape. Pick a single rule
      ("conceptual category, one word, not a section name") and
      sweep ~25 pages. Document in CLAUDE.md under *Conventions*.
      **M-L** — decision + sweep + doc.

- [ ] `[content-audit #30]` **Canonize the FBE narrow-width
      honesty callout.** A small `.narrow-width-note` shown at
      mobile-only tells the user "this is built for desktop"
      *above* the cramped affordance. The pattern is already
      proven on `function-block-editor`; promote to `styles.css`
      and add to `modbus-register-viewer` (#23), `psychrometric-
      chart`, and `pid-tuner`. **L** — class promotion + per-page
      callout authoring. *Unlocks #23's mobile direction.*

- [x] `[content-audit #31]` **Education title pattern splits
      8/5** — 8 older pages use `Topic — Subtitle`, 5 newer ones
      go bare. Pick a pattern (either adopt subtitles across all
      13 or drop them all) and sweep. **M** — decision +
      mechanical edit across 5 or 8 pages. *Suggested subtitles
      for the bare pages are already drafted in #31.*

- [x] `[content-audit #33]` **SEC:NNN numbering lives on 2 of 13
      education pages** — read as decoration applied
      here-and-there rather than a system. Decide: drop it on the
      two pages, add it to all 13, or extend to the
      paired-with-sim cohort (the third such page is
      `function-blocks`). **M** — editorial pick + sweep.

- [ ] `[SEO]` **`SoftwareApplication` JSON-LD on tool pages.**
      The 9 tools are interactive web calculators; declaring the
      schema (`applicationCategory: "UtilityApplication"`,
      `operatingSystem: "Web"`) increases structured-data depth.
      Conditional in `head.njk` + per-page data. **M-L** — schema
      + per-tool properties + verification.

---

## Deferred / out-of-scope

Surveyed but not ranked, with the reason. Reopen if assumptions
change.

- **`codebase-issues.md`** — surveyed; it's a *completed-work
  log*, not an open backlog. All categorized items either
  landed or were deferred with explicit revisit triggers. No
  live items to rank from this bucket.

- **`site-ideas-and-friction.md` — the formal "Friction log"
  section is empty** (historical entries only; both 2026-05
  items cleared). Real friction either lives inside the per-page
  retrospective sections (already shipped or noted in context)
  or surfaces in `content-audit.md` (where this file pulls
  from). Bucket is effectively absorbed by the audit.

- **`site-ideas-and-friction.md` wishlist** — Refrigerant cycle
  education section, Controller commissioner sim, more content
  quizzes (BACnet, PID, VFDs), more field drills (Wiring &
  Sensors, Sequencing, Commissioning), `mcq_multi` /
  order-the-steps quiz formats — all explicitly parked for v2/v3.
  Out of scope for the refinement phase; revisit when refinement
  is complete or when something starts feeling stale on the
  current set.

- **`content-audit.md` Minor polish lists** — nearly all
  entries across the four batches are already strikethrough
  (resolved in PRs #2 / #7 / #8 / #9 audit-impl, or explicitly
  skipped with reasons). The open ones are visual nits the
  author already declined; don't reopen unless the design
  context changes.

- **SVG diagram alt-text audit (SEO)** — modest indexing gain
  vs. effort across 8 education pages; the diagrams already
  carry `<title>` / `<desc>` for accessibility (per codebase-
  issues #21). Defer until other SEO items land and the gap
  becomes the next bottleneck.

- **`hasPart` / `isPartOf` JSON-LD linking quizzes ↔ lessons
  (SEO)** — depends on FAQ schema landing first; revisit then.
