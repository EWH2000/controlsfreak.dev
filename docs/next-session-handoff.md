# Session handoff — the pre-Phase-8 build is done; the owner's final review is next (2026-08-04)

> **Lifecycle:** written 2026-08-04, after the pre-Phase-8 discussion was
> held AND executed (PRs #472–#476, all merged). Supersedes the 2026-08-01
> handoff — both of its retirement conditions were met (Lane C + 7.5
> shipped; the discussion happened). Retire this file when the owner's
> final review has happened and Phase 8 graduation has shipped — or
> rewrite it if he rules change-more.

## Read this first

Every claim in this file is a hypothesis; the repo is the truth. This
session's measured failure shapes, which the incoming session should
expect in its own lanes: **"pre-existing" claims that were one-surface
evidence generalized** (twice — a 5px cockpit scrollbar called
pre-existing on both pages was pre-existing on one and *introduced* on the
other; ground-truth such claims on a real main build before banking
them); **a measurement gone stale inside the PR that changed the layout it
measured** (the chip-wall distance moved +33px when the same lane's header
fix added a title line); and **counts in briefs wrong three times**
(a "four sheets" family lived on six; "13 value sites" were 12; "three FCU
sheets" were two). Grep, don't trust.

## Where things stand

`main` @ `6fe27ec`, **v3.79.0**, clean tree, **zero open PRs**.
(Measurements cite the commits they were taken at — deliberate, not
stale.) Counts: **40 education lessons · 34 content quizzes + 7 field
drills · 31 tools · 10 simulators** (unchanged — every change this
session was on hidden pages, so no version bump was owed).

Merged 2026-08-03/04, each built by a lane agent and adversarially
verified before merge (the verify caught real defects in four of the five):

- **#472** — adjustable setpoints from the operator graphic: labelled
  number inputs in the AHU param rail + a new FCU mini-rail, writing the
  RUNNING graph's const block through a new `host.writeParam`
  (`plant.params` is a per-tick block→plant mirror — never write it).
  Commit on Enter/blur, Escape reverts (only while dirty — the verify's
  fullscreen-strand fix), display-unit-aware, clamped to new roster
  min/max with a visible aria-live announcement, disabled when a custom
  sheet lacks the block. Survives the #260 first-mount clone (spec-pinned).
- **#473** — mirror diet: plain mirror cells (11 AHU / 3 FCU) leave the
  visual flow above a measured 900px cutoff via visually-hidden geometry
  (NOT display:none — three AHU values have no chip and the mirror is
  their only text rendering); the 5/3 sensor buttons stay at all widths.
- **#474** — FCU harmonized to the AHU (sensed-value painting with truth
  only at the override readout; RAT vocabulary on the drawing) + the
  owner's "fix 1": the return duct now drops into the cabinet TOP, probe
  relocated, badges recomposed, `<desc>` rewritten.
- **#475** — the owner's name-pass rulings executed verbatim (roster:
  `Clg Stg 1/2`, `Zone Temp`; the six-sheet `Stg 1 …` family;
  `Fan Sts Chk`; `Heat Kp`; reference consts value-named `0%`/`100%`/
  `60%`, winter's colliding pair suffixed `100% Spd`/`100% Pos`) + the
  FINAL war-story paragraph, byte-identical to his ruled text.
- **#476** — the Unit tab made an honest, proven phone surface (the
  owner's mobile-Q2 ruling): six page-local fixes incl. 44×44 floors and
  the honest wiresheet note, 15 hand-written mobile spec rows.

Suite at head: **1085 passed / 1 skipped / 0 failed.** The LAN preview
(https://cfdev.home.arpa/) was republished after every merge and is even
with origin/main.

**The full rulings + execution record for the 2026-08-03 discussion lives
in `docs/air-side-sim.md`** (landed by the same docs PR that carries this
file) — cite it, never a session scratchpad.

## Corrections to prior working assumptions — do not rediscover these

1. **The wiresheet touch gate hides the WHOLE `.fbe-live` workspace**, not
   "the inspector" — on touch-primary at any width the pane is sheet-notes
   prose + the desktop-tool panel + (now) the honest note, whose media
   query textually equals the workspace gate (verified in all four
   width×input regimes).
2. **Value-named consts are spec-pinned to their values**
   (`fbe-engine.spec.js`, count-floor 12): retuning a `%` const's value or
   renaming it means moving name and value TOGETHER or the suite reddens.
3. **The anti-drift head row cannot redden on a roster rename** — it
   re-derives expected heads from the live roster (single source), so a
   rename moves both sides. Rename regressions are caught by the chip-key
   and off-program verbatim rows instead.
4. **`MIN_HAND_NAMED` floors count hand-named blocks** — renames leave
   them untouched; only adding/removing named blocks moves them.
5. The **static `min`/`max`/`step` attributes in the rail markup are
   cosmetic twins** of the roster values — runtime overwrites them at
   wire-up, but an owner retune of the roster leaves the markup stale
   until synced by hand.

## The work, in order

### 1. THE OWNER'S FINAL REVIEW — run it WITH him, decisions-first

**Owner instruction (2026-08-03, verbatim in spirit):** he wants the fresh
session's eyes "just like my fresh human eyes." Bring the list below with
a recommendation per item, take his rulings, execute. He reviews desktop
AND phone on the preview.

His open calls, each with where it lives:

1. **Clamp-range retunes** — every range flagged in #472's body; roster
   min/max in both unit scripts (see correction 5 above, and correction 2
   if a `%` const moves).
2. **D2 commit-feel sign-off** — Enter/blur commit, the metric clamp
   no-op, Escape semantics. He reserved judgment until hands-on.
3. **Fix-1 re-route verdict** — his eye on the recomposed FCU upper-left
   (he approved the shots; the live page is the real test).
4. **Mirror-diet cutoff (900px)** — desktop shows 5/3 sensor buttons
   only; below 900 the register fills in.
5. **The zone-vocabulary collision** — both zone boxes paint the SENSED
   value captioned `ZONE TEMP` while the truth readout beside the
   override says "zone NN.N °F"; before the rename the SPACE-vs-zone
   wording itself carried the sensed/truth split. If he wants distinction
   restored, the fix is the TRUTH READOUT's label (the caption follows
   the roster by his explicit ruling).
6. **`Stg2 Call` spacing** — two FCU sheets (cool-2stage, fanon); the
   only unspaced Stg2 left; `AND · Stg 2 Call` = 16, fits.
7. **Console caption "Compressor stage — Y1 / Y2"** — kept
   thermostat-TERMINAL vocabulary (FCU sibling: "Fan enable — G command";
   the AHU sibling says "start command"). Confirm or rename.
8. **The AHU chip wall at 375px** — 9 rows / 422px; graphic top ≈1118px
   (≈1.68 screens) down. Options measured in #476 + its verify comment:
   scroll-row (saves ~388px), disclosure fold, or accept (the mirror
   carries the values). Not restructured without him.
9. **Phone-scale graphic legibility** (labels ~2.8px at 375) — explicit
   acceptance or a direction.
10. **The war story on the live page** — shipped byte-exact to his
    ruling; last read in place.
11. Whatever his walk surfaces.

### 2. Phase 8 — graduation (ONLY after his push-live call)

Gates, updated by this session's rulings: `canonical` frontmatter on the
workbench pages (+ they enter the sitemap + search index automatically) ·
`tests/pages.js` manifest rows · the **both-themes contrast sweep reaches
these pages for the first time — expect findings** · the empty-JSON-LD
trap · nav/simulators-landing cards + chips + home count surfaces +
README tour bullets · the `education/status-and-proof.html` reverse
cross-link (Phase 8's to pay) · version bump (minor) + `Latest:` badge
editorial call · **the damage-stakes question is CLOSED** (owner ruling
2026-08-03: existing page-tailored prose satisfies the convention — no
boilerplate; recorded in the design doc) · graduation **flips every
merge-freely classification** for these pages and their scripts, and
IndexNow fires on the merge automatically.

**Explicitly declined / parked — do not carry as open work:** hover
tooltips (owner 2026-08-03: deferred post-live, reclassified SITE-WIDE —
friction file has it) · heating mode on units (named future; never in
copy) · zone thermographics · guided fault-diagnosis · #244 canvas cost ·
#228 engine standardisation (owner-scheduled separately) · the #255
option-3 typography lane (parked, friction file).

## Decisions waiting on the owner

Only the final-review list above. Nothing else blocks.

## Process notes that earned their keep

- **Opus = mechanical build, Fable = judgment build, Fable = EVERY verify.**
  The adversarial verify caught shipped defects in 4 of 5 lanes this
  session (metric clamp erosion; an Escape trap; an introduced cockpit
  scrollbar; a falsified comment) and added a coverage row a sabotage
  probe proved missing. Do not merge an unverified lane.
- **Verify "pre-existing" claims on a real main build** — the measured
  lesson of the session, twice.
- **Serial lanes on shared files** — all five lanes touched the same two
  pages; parallelizing them would have been merge chaos.
- **Watch-then-merge**: `gh pr checks N --watch --interval 30 && gh pr
  merge N --merge` in the background (the repo does not allow auto-merge);
  republish the preview after every merge; reap worktrees + local
  branches immediately.
- **Per-lane throwaway Playwright configs on unique high ports**,
  foreground waits, `npm ci` in fresh worktrees. One random full-suite
  failure = isolate to confirm; CI is the arbiter.
- **Orphan hygiene**: a 2-day-old 0.0.0.0 `http.server` from a prior
  session's deleted worktree was found and reaped mid-run — check
  `ss -tlnp` when a port behaves oddly.

## One passing note

The workbench is behaviorally complete, named in the owner's voice,
honest on a phone, and proven by 1085 green tests with every lane
adversarially verified. The remaining distance to live is one review
conversation and the mechanical graduation wiring — the quality bar is
now his eye, not the code.
