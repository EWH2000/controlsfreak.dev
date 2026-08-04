> **A RECORD, committed 2026-08-01 — read the three corrections below before
> you read the body.**
>
> Authored **2026-07-31** by the FBE block-name lane as the design source for
> the hand-authored-names follow-up ("PR B"). PR #458 shipped the *mechanism*
> only — the `tag` catalog, the per-instance `name` field and the `TAG · Name`
> head. It is committed here 2026-08-01, after a docs sweep found it living
> only in a session scratchpad where the lane that needs it could not reach it.
>
> **STATUS — the names LANDED 2026-08-01** (PR B, `feat/hand-authored-block-names`).
> The §3 names are authored into the literals — every head on every shipped
> sheet renders `TAG · Name`, measured non-clipping in a real browser (the
> spec's per-sheet floors pin the authored counts, so this claim cannot
> silently decay).
> Two rows in §3 were **not** authored as written, both by supersession and
> both noted in the corrections below: the public `pid` sheet's `out` block no
> longer exists, and its `rd` keeps the shipped, owner-approved `HW Vlv`
> instead of `Loop %`. One row was **re-authored**: `dmpout`'s `Occ Dmpr`
> became **`Proof Dmpr`** per correction 1. Everything else went in verbatim.
> This document is now the design record, not a plan — the RUNTIME source is
> the program literals plus the two unit rosters, and
> `tests/fbe-block-names.spec.js` deliberately does not parse this file.
>
> **The body below is unedited and stays that way.** It records what was
> measured on 2026-07-31, and the measurements — budget, per-sheet tables,
> collision analysis, totals — all still hold. Three of its *judgements* have
> since been overtaken. The three corrections here supersede the body where
> they conflict with it; nothing else in it has moved.
>
> 1. **§7.5 — `Occ Dmpr` is falsified.** Commit `cadd43e` (2026-07-31, *"gate
>    the outside-air damper on airflow proof, not occupancy"*) re-sourced the
>    `dmpout.SEL` wire from `occ` to `fan-status`, resolving the doc/code
>    divergence §7.5 reports **in the comments' favour** — the prose was right
>    and the wire moved. `Occ Dmpr` named the selector as it was wired then, so
>    the name must be **re-authored to match airflow-proof gating** when the
>    names land. §7.8 anticipated exactly this: *"If the owner corrects that
>    wire, `Occ Dmpr` should be renamed with it."*
>
> 2. **§7.6 — the FCU `fan-speed` name is ruled.** Owner ruling 2026-08-01:
>    rename the FCU roster's `fan-speed` from `Fan` to **`Fan Spd`**, matching
>    the AHU, so the head no longer reads as a truncation beside `BO · Fan En`.
>    A **separate FCU lane** implemented it, 2026-08-01 — the roster `name`
>    also drives the chip strip and the off-program window. Logged as
>    codebase-issues **#258**, which is also the record that §7.6's "log it"
>    instruction went uncarried until now. **The body's FCU row 23 still reads
>    `AO · Fan`, and stays that way** — the body records what was measured on
>    2026-07-31, and this correction is what supersedes it.
>
> 3. **§2a — the `readout` / `RDO` tag question is superseded.** Owner ruling
>    2026-08-01: the readout **type folds into `ao` entirely** — *"the type is
>    the same, the name carries the meaning."* There is no `RDO` tag to author
>    or to second-guess, and §2a's `RD`-as-fallback aside is moot with it; the
>    single `rd` row in the body (the public PID sheet) will be authored as a
>    **named `ao`** instead.
>
> 4. **`Stg2 Call` is respaced.** Owner ruling 2026-08-04 (the final review):
>    the two FCU sheets' `and1` renames **`Stg2 Call` → `Stg 2 Call`**
>    (`AND · Stg 2 Call` = 16, inside the 18 budget), retiring the last
>    unspaced `Stg2` in the shipped literals. The body's §3 rows 18 for
>    `cool-2stage` and `cool-2stage-fanon` still read `Stg2 Call`, and stay
>    that way — the body records 2026-07-31; this correction supersedes it.

# FBE block-name inventory — `TAG · Name` head labels

Read-only analysis for the approved "every block gets a name" feature.
Nothing in the repo was modified. AHU sources read from
`feat/ahu-workbench-page` via `git show`; FCU and public-page sources
read from the working tree (unchanged on that branch).

---

## 1. Measured character budget

**The budget is 18 characters — not 19.** The brief's ~19 is one character
optimistic. Derived twice, independently, and the two agree exactly.

### 1a. Arithmetic

| Step | Value | Source |
|---|---|---|
| `.fbe-block` width | `8.5rem` = **136 px** @ 16 px root | `styles.css:4355` |
| `box-sizing: border-box` global | block's 1 px L/R borders are **inside** the 136 | `styles.css:412` |
| Block content width | 136 − 2 = **134 px** | |
| `.fbe-block-head` padding | `0.22rem 0.45rem` → 7.2 px × 2 = **14.4 px** | `styles.css:4371` |
| Head content width | 134 − 14.4 = **119.6 px** | |
| Head font size | `0.62rem` = **9.92 px** | `styles.css:4365` |
| IBM Plex Mono advance | **0.6 em** (600/1000 upm) | read from `ibm-plex-mono-latin-600.woff2` via fontTools |
| Glyph advance | 9.92 × 0.6 = **5.952 px** | |
| `letter-spacing: 0.04em` | 0.04 × 9.92 = **0.3968 px**, added after *every* char | `styles.css:4367` |
| Per-character advance | **6.3488 px** | |
| Max characters | 119.6 ÷ 6.3488 = **18.83 → 18** | |

### 1b. Live measurement (headless Chromium, real woff2, exact CSS replicated)

```
blockBorderBox   136        headContentW  119.6
perChar          6.396875   maxFit        18 chars
"AND · Stage Permit"  (18 chars) → 115.16 px   FITS  (4.4 px spare)
"CONST · Reset Slope" (19 chars) → 121.55 px   OVERFLOWS by 1.95 px
```

`perChar` measured 6.3969 vs 6.3488 calculated — Chromium's subpixel
advance quantization. It moves the 18/19 boundary in neither direction:
19 chars overflow under both numbers.

### 1c. Root-font invariance — verified, with a caveat

Head content width is `7.6F − 2` px and per-char advance is `0.3968F`,
so max chars = `19.153 − 5.04/F`. The **−2 px is the block's border,
which is px and does not scale** — that term is what keeps the budget
from creeping to 19 at large root fonts.

Swept in-browser at root 12 / 14 / 16 / 18 / 20 / 24 / 32 px: the
measured maximum was **18, 19, 18, 18, 20, 18, 18**. The values above 18
are Chromium advance-quantization artifacts at those specific sizes
(and per the project's headless-screenshot memory note, quantization
diverges headless vs headed). **18 is the floor across the whole range**,
and quantization only ever grants more, never fewer. `tests/fbe-geometry.spec.js`
already exercises the F = 20 case, so this range is not hypothetical.

### 1d. Recommendation

- **Hard budget: 18 characters.** `TAG · Name` → `len(tag) + 3 + len(name) ≤ 18`.
- **Author to 17** where a name has an equally good shorter form. Every
  name below is ≤ 17 except a handful noted at 17; nothing proposed hits 18.
- With `CONST` (the longest tag), a name has **10 characters**. That is the
  binding constraint on this whole inventory — see §5 and §7.4.

### 1e. ⚠ BLOCKING PREREQUISITE — `.fbe-block-head` has no `white-space` rule

`.fbe-block-head` currently sets no `white-space` and no `overflow`. Measured:

```
head height, "CONST"               → 26.03 px
head height, "CONST · Reset Slope" → 44.03 px    (+18 px — it WRAPS)
head height, same + nowrap         → 26.03 px    (fix confirmed)
```

**A single over-budget name grows its block by 18 px** — precisely the
zero-block-height-change constraint the owner made mandatory, and it would
land on a 90 px row pitch where the comparator bank has ~0.3 px clearance.
Today nothing wraps only because the longest `def.label` is 8 characters
(`SR LATCH` / `SUBTRACT` / `MULTIPLY`). Introducing `TAG · Name` — which
contains spaces, so it has wrap opportunities — removes that accident.

The implementation therefore **must** add to `.fbe-block-head`:

```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

`nowrap` alone pins the height; `overflow: hidden` + `ellipsis` converts a
future over-budget name from a silent layout break into a visible truncation.
Note this is a **`styles.css` change**, which per CLAUDE.md's merge rules is
live-facing and **needs owner approval** — it cannot ride the hidden-page
merge-freely lane even though the feature is mostly about hidden pages.

---

## 2. The `tag` table — all 28 block types

`tag` is added to each `BLOCKS` entry in `fbe-engine.js` alongside the
existing `label`, which stays for the palette and inspector.

| type | category | current `label` | proposed `tag` | len | note |
|---|---|---|---|---|---|
| `ai` | I/O | `ANALOG IN` | `AI` | 2 | house vocabulary (CLAUDE.md) |
| `bi` | I/O | `BINARY IN` | `BI` | 2 | house vocabulary |
| `ao` | I/O | `ANALOG OUT` | `AO` | 2 | house vocabulary |
| `bo` | I/O | `BINARY OUT` | `BO` | 2 | house vocabulary |
| `const` | I/O | `CONSTANT` | `CONST` | 5 | judgement — see below |
| `readout` | I/O | `READOUT` | `RDO` | 3 | judgement — see below |
| `and` | Boolean | `AND` | `AND` | 3 | unchanged |
| `or` | Boolean | `OR` | `OR` | 2 | unchanged |
| `xor` | Boolean | `XOR` | `XOR` | 3 | unchanged |
| `not` | Boolean | `NOT` | `NOT` | 3 | unchanged |
| `sr` | Boolean | `SR LATCH` | `SR` | 2 | "Latch" moves into the name where it belongs (`SR · Y1 Latch`) |
| `gt` | Comparator | `A > B` | `A>B` | 3 | spaces squeezed — see below |
| `lt` | Comparator | `A < B` | `A<B` | 3 | |
| `ge` | Comparator | `A ≥ B` | `A≥B` | 3 | ⚠ glyph note below |
| `le` | Comparator | `A ≤ B` | `A≤B` | 3 | ⚠ |
| `eq` | Comparator | `A = B` | `A=B` | 3 | |
| `ne` | Comparator | `A ≠ B` | `A≠B` | 3 | ⚠ |
| `add` | Math | `ADD` | `ADD` | 3 | unchanged |
| `sub` | Math | `SUBTRACT` | `SUB` | 3 | |
| `mul` | Math | `MULTIPLY` | `MUL` | 3 | |
| `div` | Math | `DIVIDE` | `DIV` | 3 | |
| `min` | Math | `MIN` | `MIN` | 3 | unchanged |
| `max` | Math | `MAX` | `MAX` | 3 | unchanged |
| `ton` | Timer | `TON` | `TON` | 3 | unchanged |
| `tof` | Timer | `TOF` | `TOF` | 3 | unchanged |
| `select` | Selection | `SELECT` | `SEL` | 3 | |
| `limit` | Selection | `LIMIT` | `LIM` | 3 | |
| `pid` | Control | `PID` | `PID` | 3 | unchanged |

Tag lengths: **2–5**, with `CONST` the sole outlier at 5.

### 2a. Judgement calls

**`const` → `CONST` (5), not `CON` or `K`.** It is the most common block
type across all three files (34 of 188 instances) and costs every constant
two characters of name budget versus a 3-char tag. Kept at 5 anyway:
`CONST` is the universal spelling in engineering tools, and `CON` reads as
*controller* in a BAS context — an active mis-cue on a controls site. If
budget pressure ever becomes real, this is the one lever worth revisiting;
it buys 2 characters on 34 blocks.

**`readout` → `RDO` (3).** The weakest tag here — `RDO` is not a field term,
it is an invented contraction. Accepted because (a) the type appears
**exactly once** in all 188 blocks (`rd` on the public PID sheet), so the
blast radius of a slightly-invented abbreviation is one head, and (b) the
obvious alternative `VAL` would collide conceptually with `.fbe-block-val`,
the value strip rendered directly below the head on every block. `RD` (2)
is a defensible fallback if the implementer dislikes `RDO`.

**`sr` → `SR`, dropping "LATCH".** The word moves into the name
(`SR · Y1 Latch`, `SR · DAT Run OK`), which is strictly better: "latch" is
information about *this instance's role*, not about the type — some SRs on
these sheets are staging latches, one is a safety-permit latch, and the
name is where that distinction belongs.

### 2b. Comparators — recommendation: keep the pins, drop the spaces (`A>B`)

The brief asks whether `A > B` should survive or shorten to `>`.
**Recommendation: `A>B`.** Three candidates:

| form | len | verdict |
|---|---|---|
| `A > B` (status quo) | 5 | rejected — 2 chars of pure padding on the tightest surface on the block |
| `A>B` | 3 | **recommended** |
| `>` | 1 | rejected — see below |

1. **The pin identity is the informative half, and the head is its only
   home.** The block body labels its two number inputs `A` and `B`. The head
   is the only place that says which way the comparison runs between them.
   With `A>B` a reader traces `space-temp → A`, `y1on → B` and reads the
   test directly off the picture. A bare `>` makes them recall a convention.
2. **It is not the expensive tag.** At 3 characters it ties `AND` / `NOT` /
   `SEL` / `ADD` and is shorter than `CONST`. Buying 2 characters back from
   `>` would relieve nothing — comparators are the block type whose names
   are *already* shortest (`Y1 Set`, `DAT Low`, `Diff OK`; longest is
   `A>B · Above Clear` at 17 and that is an alternate, not a primary).
3. **Dropping the spaces is free.** `A > B` → `A>B` loses no information;
   in a 600-weight monospace the operator is unambiguous unspaced.
4. **Rejected alternative: function names (`GT` / `LT` / `GE`).** Loses the
   pin identity *and* reads worse — `GE` must be decoded, `A≥B` is simply read.
5. **Counter-argument, acknowledged:** `A>B · Y1 Set` puts three
   symbol-dense tokens in a row. In practice the `·` sits at mid-height and
   the operators at x-height, so they do not blur. Comparators are also the
   most numerous logic block on these sheets (24 instances), so the
   marginal legibility of `A>B` compounds.

### 2c. ⚠ `≥` `≤` `≠` are NOT in the bundled font

Verified against the woff2 cmap: **U+2264, U+2265 and U+2260 are absent from
`ibm-plex-mono-latin-600.woff2`**, and the `@font-face` `unicode-range` in
`styles.css` excludes the Mathematical Operators block too. They render from
the system monospace fallback (measured advance 6.341 px vs Plex's 6.397 px
— a different typeface, visibly so next to it).

This is **pre-existing**, not introduced here — the current `A ≥ B` labels
already do it. And it is currently **latent**: `ge`, `le`, `eq`, `ne`, `xor`,
`div`, `min`, `max` and `tof` are used by **zero blocks** across all 188.
It only surfaces when a user drags one out of the palette. Options:

- **Keep `A≥B`** (recommended) — no regression, and the elegant form.
- Switch to ASCII `A>=B` / `A<=B` / `A!=B` (4 chars) if a deterministic
  advance matters more than the glyph. Worth logging to `codebase-issues.md`
  rather than deciding inside this feature.

---

## 3. Per-sheet block tables

Every row's `rendered head` and `len` were **computed by script**, not by
hand, from the block ids extracted out of the three literals — so the
counts, lengths and collision checks below are mechanical.

Legend: **source** `roster` = the shell stamps `block.name = point.name`
at runtime; the literal gets **no** `name:` key. `hand` = a `name:` goes
on the block literal.

### html/simulators/ddc-workbench.html (AHU)


#### Sheet `econ-2stage` — 43 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `space-temp` | `ai` | `AI` | **Space** | roster | `AI · Space` | 10 |
| 2 | `cooling-setpoint` | `const` | `CONST` | **Cool SP** | roster | `CONST · Cool SP` | 15 |
| 3 | `deadband` | `const` | `CONST` | **Deadband** | roster | `CONST · Deadband` | 16 |
| 4 | `heating-setpoint` | `const` | `CONST` | **Heat SP** | roster | `CONST · Heat SP` | 15 |
| 5 | `oat` | `ai` | `AI` | **OAT** | roster | `AI · OAT` | 8 |
| 6 | `rat` | `ai` | `AI` | **RAT** | roster | `AI · RAT` | 8 |
| 7 | `econ-lockout` | `const` | `CONST` | **Econ Lock** | roster | `CONST · Econ Lock` | 17 |
| 8 | `mat` | `ai` | `AI` | **MAT** | roster | `AI · MAT` | 8 |
| 9 | `dat` | `ai` | `AI` | **DAT** | roster | `AI · DAT` | 8 |
| 10 | `occ` | `bi` | `BI` | **Occupied** | hand | `BI · Occupied` | 13 |
| 11 | `y1on` | `add` | `ADD` | **Y1 Make** | hand | `ADD · Y1 Make` | 13 |
| 12 | `sep` | `const` | `CONST` | **Stg2 Sep** | hand | `CONST · Stg2 Sep` | 16 |
| 13 | `heaterr` | `sub` | `SUB` | **Heat Error** | hand | `SUB · Heat Error` | 16 |
| 14 | `lockok` | `lt` | `A<B` | **Lock OK** | hand | `A<B · Lock OK` | 13 |
| 15 | `diffok` | `lt` | `A<B` | **Diff OK** | hand | `A<B · Diff OK` | 13 |
| 16 | `y2on` | `add` | `ADD` | **Y2 Make** | hand | `ADD · Y2 Make` | 13 |
| 17 | `gain` | `const` | `CONST` | **Heat Gain** | hand | `CONST · Heat Gain` | 17 |
| 18 | `econok` | `and` | `AND` | **Econ Permit** | hand | `AND · Econ Permit` | 17 |
| 19 | `gt1` | `gt` | `A>B` | **Y1 Set** | hand | `A>B · Y1 Set` | 12 |
| 20 | `lt1` | `lt` | `A<B` | **Y1 Reset** | hand | `A<B · Y1 Reset` | 14 |
| 21 | `gt2` | `gt` | `A>B` | **Y2 Set** | hand | `A>B · Y2 Set` | 12 |
| 22 | `lt2` | `lt` | `A<B` | **Y2 Reset** | hand | `A<B · Y2 Reset` | 14 |
| 23 | `heatraw` | `mul` | `MUL` | **Heat Raw** | hand | `MUL · Heat Raw` | 14 |
| 24 | `sr1` | `sr` | `SR` | **Y1 Latch** | hand | `SR · Y1 Latch` | 13 |
| 25 | `sr2` | `sr` | `SR` | **Y2 Latch** | hand | `SR · Y2 Latch` | 13 |
| 26 | `heatlim` | `limit` | `LIM` | **Heat Clamp** | hand | `LIM · Heat Clamp` | 16 |
| 27 | `zero` | `const` | `CONST` | **Off Ref** | hand | `CONST · Off Ref` | 15 |
| 28 | `fan-status` | `bi` | `BI` | **Fan Sts** | roster | `BI · Fan Sts` | 12 |
| 29 | `hundred` | `const` | `CONST` | **Full Ref** | hand | `CONST · Full Ref` | 16 |
| 30 | `y1gate` | `and` | `AND` | **Y1 Gate** | hand | `AND · Y1 Gate` | 13 |
| 31 | `y2gate` | `and` | `AND` | **Y2 Gate** | hand | `AND · Y2 Gate` | 13 |
| 32 | `hwsel` | `select` | `SEL` | **HW Vlv Sel** | hand | `SEL · HW Vlv Sel` | 16 |
| 33 | `econcall` | `and` | `AND` | **Econ Call** | hand | `AND · Econ Call` | 15 |
| 34 | `fansel` | `select` | `SEL` | **Fan Spd Ref** | hand | `SEL · Fan Spd Ref` | 17 |
| 35 | `min-oa-pos` | `const` | `CONST` | **Min OA** | roster | `CONST · Min OA` | 14 |
| 36 | `dmpsel` | `select` | `SEL` | **Econ Dmpr** | hand | `SEL · Econ Dmpr` | 15 |
| 37 | `y1` | `bo` | `BO` | **Y1** | roster | `BO · Y1` | 7 |
| 38 | `y2` | `bo` | `BO` | **Y2** | roster | `BO · Y2` | 7 |
| 39 | `hw-valve` | `ao` | `AO` | **HW Vlv** | roster | `AO · HW Vlv` | 11 |
| 40 | `fan-enable` | `bo` | `BO` | **Fan En** | roster | `BO · Fan En` | 11 |
| 41 | `fan-speed` | `ao` | `AO` | **Fan Spd** | roster | `AO · Fan Spd` | 12 |
| 42 | `dmpout` | `select` | `SEL` | **Occ Dmpr** | hand | `SEL · Occ Dmpr` | 14 |
| 43 | `oa-damper` | `ao` | `AO` | **OA Dmpr** | roster | `AO · OA Dmpr` | 12 |

### html/simulators/ddc-workbench-fcu.html (FCU)


#### Sheet `cool-2stage` — 23 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `space-temp` | `ai` | `AI` | **Space** | roster | `AI · Space` | 10 |
| 2 | `cooling-setpoint` | `const` | `CONST` | **Cool SP** | roster | `CONST · Cool SP` | 15 |
| 3 | `deadband` | `const` | `CONST` | **Deadband** | roster | `CONST · Deadband` | 16 |
| 4 | `sep` | `const` | `CONST` | **Stg2 Sep** | hand | `CONST · Stg2 Sep` | 16 |
| 5 | `y1on` | `add` | `ADD` | **Y1 Make** | hand | `ADD · Y1 Make` | 13 |
| 6 | `y2on` | `add` | `ADD` | **Y2 Make** | hand | `ADD · Y2 Make` | 13 |
| 7 | `hundred` | `const` | `CONST` | **High Spd** | hand | `CONST · High Spd` | 16 |
| 8 | `dat` | `ai` | `AI` | **DAT** | roster | `AI · DAT` | 8 |
| 9 | `fan-status` | `bi` | `BI` | **Fan Sts** | roster | `BI · Fan Sts` | 12 |
| 10 | `gt1` | `gt` | `A>B` | **Y1 Set** | hand | `A>B · Y1 Set` | 12 |
| 11 | `lt1` | `lt` | `A<B` | **Y1 Reset** | hand | `A<B · Y1 Reset` | 14 |
| 12 | `gt2` | `gt` | `A>B` | **Y2 Set** | hand | `A>B · Y2 Set` | 12 |
| 13 | `lt2` | `lt` | `A<B` | **Y2 Reset** | hand | `A<B · Y2 Reset` | 14 |
| 14 | `sr1` | `sr` | `SR` | **Y1 Latch** | hand | `SR · Y1 Latch` | 13 |
| 15 | `sr2` | `sr` | `SR` | **Y2 Latch** | hand | `SR · Y2 Latch` | 13 |
| 16 | `low` | `const` | `CONST` | **Low Spd** | hand | `CONST · Low Spd` | 15 |
| 17 | `or1` | `or` | `OR` | **Cool Call** | hand | `OR · Cool Call` | 14 |
| 18 | `and1` | `and` | `AND` | **Stg2 Call** | hand | `AND · Stg2 Call` | 15 |
| 19 | `select` | `select` | `SEL` | **Spd Ref** | hand | `SEL · Spd Ref` | 13 |
| 20 | `y1` | `bo` | `BO` | **Y1** | roster | `BO · Y1` | 7 |
| 21 | `fan-enable` | `bo` | `BO` | **Fan En** | roster | `BO · Fan En` | 11 |
| 22 | `y2` | `bo` | `BO` | **Y2** | roster | `BO · Y2` | 7 |
| 23 | `fan-speed` | `ao` | `AO` | **Fan** | roster | `AO · Fan` | 8 |

#### Sheet `cool-1stage` — 14 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `space-temp` | `ai` | `AI` | **Space** | roster | `AI · Space` | 10 |
| 2 | `cooling-setpoint` | `const` | `CONST` | **Cool SP** | roster | `CONST · Cool SP` | 15 |
| 3 | `deadband` | `const` | `CONST` | **Deadband** | roster | `CONST · Deadband` | 16 |
| 4 | `dat` | `ai` | `AI` | **DAT** | roster | `AI · DAT` | 8 |
| 5 | `fan-status` | `bi` | `BI` | **Fan Sts** | roster | `BI · Fan Sts` | 12 |
| 6 | `y1on` | `add` | `ADD` | **Y1 Make** | hand | `ADD · Y1 Make` | 13 |
| 7 | `hundred` | `const` | `CONST` | **Spd Ref** | hand | `CONST · Spd Ref` | 15 |
| 8 | `gt1` | `gt` | `A>B` | **Y1 Set** | hand | `A>B · Y1 Set` | 12 |
| 9 | `lt1` | `lt` | `A<B` | **Y1 Reset** | hand | `A<B · Y1 Reset` | 14 |
| 10 | `sr1` | `sr` | `SR` | **Y1 Latch** | hand | `SR · Y1 Latch` | 13 |
| 11 | `y1` | `bo` | `BO` | **Y1** | roster | `BO · Y1` | 7 |
| 12 | `fan-enable` | `bo` | `BO` | **Fan En** | roster | `BO · Fan En` | 11 |
| 13 | `y2` | `bo` | `BO` | **Y2** | roster | `BO · Y2` | 7 |
| 14 | `fan-speed` | `ao` | `AO` | **Fan** | roster | `AO · Fan` | 8 |

#### Sheet `cool-2stage-fanon` — 24 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `space-temp` | `ai` | `AI` | **Space** | roster | `AI · Space` | 10 |
| 2 | `cooling-setpoint` | `const` | `CONST` | **Cool SP** | roster | `CONST · Cool SP` | 15 |
| 3 | `deadband` | `const` | `CONST` | **Deadband** | roster | `CONST · Deadband` | 16 |
| 4 | `sep` | `const` | `CONST` | **Stg2 Sep** | hand | `CONST · Stg2 Sep` | 16 |
| 5 | `y1on` | `add` | `ADD` | **Y1 Make** | hand | `ADD · Y1 Make` | 13 |
| 6 | `y2on` | `add` | `ADD` | **Y2 Make** | hand | `ADD · Y2 Make` | 13 |
| 7 | `hundred` | `const` | `CONST` | **High Spd** | hand | `CONST · High Spd` | 16 |
| 8 | `dat` | `ai` | `AI` | **DAT** | roster | `AI · DAT` | 8 |
| 9 | `fan-status` | `bi` | `BI` | **Fan Sts** | roster | `BI · Fan Sts` | 12 |
| 10 | `gt1` | `gt` | `A>B` | **Y1 Set** | hand | `A>B · Y1 Set` | 12 |
| 11 | `lt1` | `lt` | `A<B` | **Y1 Reset** | hand | `A<B · Y1 Reset` | 14 |
| 12 | `gt2` | `gt` | `A>B` | **Y2 Set** | hand | `A>B · Y2 Set` | 12 |
| 13 | `lt2` | `lt` | `A<B` | **Y2 Reset** | hand | `A<B · Y2 Reset` | 14 |
| 14 | `sr1` | `sr` | `SR` | **Y1 Latch** | hand | `SR · Y1 Latch` | 13 |
| 15 | `sr2` | `sr` | `SR` | **Y2 Latch** | hand | `SR · Y2 Latch` | 13 |
| 16 | `low` | `const` | `CONST` | **Low Spd** | hand | `CONST · Low Spd` | 15 |
| 17 | `or1` | `or` | `OR` | **Cool Call** | hand | `OR · Cool Call` | 14 |
| 18 | `and1` | `and` | `AND` | **Stg2 Call** | hand | `AND · Stg2 Call` | 15 |
| 19 | `fanon` | `bi` | `BI` | **Cont Fan** | hand | `BI · Cont Fan` | 13 |
| 20 | `select` | `select` | `SEL` | **Spd Ref** | hand | `SEL · Spd Ref` | 13 |
| 21 | `y1` | `bo` | `BO` | **Y1** | roster | `BO · Y1` | 7 |
| 22 | `fan-enable` | `bo` | `BO` | **Fan En** | roster | `BO · Fan En` | 11 |
| 23 | `y2` | `bo` | `BO` | **Y2** | roster | `BO · Y2` | 7 |
| 24 | `fan-speed` | `ao` | `AO` | **Fan** | roster | `AO · Fan` | 8 |

#### Sheet `cool-2stage-safeties` — 34 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `sep` | `const` | `CONST` | **Stg2 Sep** | hand | `CONST · Stg2 Sep` | 16 |
| 2 | `space-temp` | `ai` | `AI` | **Space** | roster | `AI · Space` | 10 |
| 3 | `cooling-setpoint` | `const` | `CONST` | **Cool SP** | roster | `CONST · Cool SP` | 15 |
| 4 | `deadband` | `const` | `CONST` | **Deadband** | roster | `CONST · Deadband` | 16 |
| 5 | `hilim` | `const` | `CONST` | **DAT Clear** | hand | `CONST · DAT Clear` | 17 |
| 6 | `y1on` | `add` | `ADD` | **Y1 Make** | hand | `ADD · Y1 Make` | 13 |
| 7 | `lt1` | `lt` | `A<B` | **Y1 Reset** | hand | `A<B · Y1 Reset` | 14 |
| 8 | `dat` | `ai` | `AI` | **DAT** | roster | `AI · DAT` | 8 |
| 9 | `lowlim` | `const` | `CONST` | **DAT Trip** | hand | `CONST · DAT Trip` | 16 |
| 10 | `y2on` | `add` | `ADD` | **Y2 Make** | hand | `ADD · Y2 Make` | 13 |
| 11 | `datok` | `gt` | `A>B` | **DAT OK** | hand | `A>B · DAT OK` | 12 |
| 12 | `datlow` | `lt` | `A<B` | **DAT Low** | hand | `A<B · DAT Low` | 13 |
| 13 | `gt2` | `gt` | `A>B` | **Y2 Set** | hand | `A>B · Y2 Set` | 12 |
| 14 | `gt1` | `gt` | `A>B` | **Y1 Set** | hand | `A>B · Y1 Set` | 12 |
| 15 | `lt2` | `lt` | `A<B` | **Y2 Reset** | hand | `A<B · Y2 Reset` | 14 |
| 16 | `okrun` | `sr` | `SR` | **DAT Run OK** | hand | `SR · DAT Run OK` | 15 |
| 17 | `fan-status` | `bi` | `BI` | **Fan Sts** | roster | `BI · Fan Sts` | 12 |
| 18 | `sr2` | `sr` | `SR` | **Y2 Latch** | hand | `SR · Y2 Latch` | 13 |
| 19 | `coilok` | `and` | `AND` | **Coil Safe** | hand | `AND · Coil Safe` | 15 |
| 20 | `sr1` | `sr` | `SR` | **Y1 Latch** | hand | `SR · Y1 Latch` | 13 |
| 21 | `or1` | `or` | `OR` | **Cool Call** | hand | `OR · Cool Call` | 14 |
| 22 | `low` | `const` | `CONST` | **Low Spd** | hand | `CONST · Low Spd` | 15 |
| 23 | `hundred` | `const` | `CONST` | **High Spd** | hand | `CONST · High Spd` | 16 |
| 24 | `fan-enable` | `bo` | `BO` | **Fan En** | roster | `BO · Fan En` | 11 |
| 25 | `select` | `select` | `SEL` | **Spd Ref** | hand | `SEL · Spd Ref` | 13 |
| 26 | `fan-speed` | `ao` | `AO` | **Fan** | roster | `AO · Fan` | 8 |
| 27 | `notrun` | `not` | `NOT` | **Stage Off** | hand | `NOT · Stage Off` | 15 |
| 28 | `tonoff` | `ton` | `TON` | **Min Off** | hand | `TON · Min Off` | 13 |
| 29 | `offok` | `or` | `OR` | **Cycle OK** | hand | `OR · Cycle OK` | 13 |
| 30 | `permit` | `and` | `AND` | **Run Permit** | hand | `AND · Run Permit` | 16 |
| 31 | `y1gate` | `and` | `AND` | **Y1 Gate** | hand | `AND · Y1 Gate` | 13 |
| 32 | `y2gate` | `and` | `AND` | **Y2 Gate** | hand | `AND · Y2 Gate` | 13 |
| 33 | `y1` | `bo` | `BO` | **Y1** | roster | `BO · Y1` | 7 |
| 34 | `y2` | `bo` | `BO` | **Y2** | roster | `BO · Y2` | 7 |

### html/simulators/function-block-editor.html (public)


#### Sheet `freeze` — 6 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `fz` | `bi` | `BI` | **Freezestat** | hand | `BI · Freezestat` | 15 |
| 2 | `rst` | `bi` | `BI` | **Man Reset** | hand | `BI · Man Reset` | 14 |
| 3 | `latch` | `sr` | `SR` | **Trip Latch** | hand | `SR · Trip Latch` | 15 |
| 4 | `inv` | `not` | `NOT` | **Fan Permit** | hand | `NOT · Fan Permit` | 16 |
| 5 | `fan` | `bo` | `BO` | **Fan Cmd** | hand | `BO · Fan Cmd` | 12 |
| 6 | `alarm` | `bo` | `BO` | **Frz Alarm** | hand | `BO · Frz Alarm` | 14 |

#### Sheet `econ` — 6 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `oat` | `ai` | `AI` | **OAT** | hand | `AI · OAT` | 8 |
| 2 | `oasp` | `const` | `CONST` | **Econ Lock** | hand | `CONST · Econ Lock` | 17 |
| 3 | `cool` | `bi` | `BI` | **Cool Call** | hand | `BI · Cool Call` | 14 |
| 4 | `cmp` | `lt` | `A<B` | **Lock OK** | hand | `A<B · Lock OK` | 13 |
| 5 | `gate` | `and` | `AND` | **Econ Permit** | hand | `AND · Econ Permit` | 17 |
| 6 | `econ` | `bo` | `BO` | **Econ Cmd** | hand | `BO · Econ Cmd` | 13 |

#### Sheet `tstat-cool` — 9 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `temp` | `ai` | `AI` | **Space** | hand | `AI · Space` | 10 |
| 2 | `sp` | `const` | `CONST` | **Cool SP** | hand | `CONST · Cool SP` | 15 |
| 3 | `db` | `const` | `CONST` | **Deadband** | hand | `CONST · Deadband` | 16 |
| 4 | `hi` | `add` | `ADD` | **Cool Make** | hand | `ADD · Cool Make` | 15 |
| 5 | `lo` | `sub` | `SUB` | **Cool Break** | hand | `SUB · Cool Break` | 16 |
| 6 | `over` | `gt` | `A>B` | **Cool Set** | hand | `A>B · Cool Set` | 14 |
| 7 | `under` | `lt` | `A<B` | **Cool Reset** | hand | `A<B · Cool Reset` | 16 |
| 8 | `stat` | `sr` | `SR` | **Cool Latch** | hand | `SR · Cool Latch` | 15 |
| 9 | `cool` | `bo` | `BO` | **Cool Cmd** | hand | `BO · Cool Cmd` | 13 |

#### Sheet `tstat-heat` — 9 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `temp` | `ai` | `AI` | **Space** | hand | `AI · Space` | 10 |
| 2 | `sp` | `const` | `CONST` | **Heat SP** | hand | `CONST · Heat SP` | 15 |
| 3 | `db` | `const` | `CONST` | **Deadband** | hand | `CONST · Deadband` | 16 |
| 4 | `hi` | `add` | `ADD` | **Heat Break** | hand | `ADD · Heat Break` | 16 |
| 5 | `lo` | `sub` | `SUB` | **Heat Make** | hand | `SUB · Heat Make` | 15 |
| 6 | `over` | `gt` | `A>B` | **Heat Reset** | hand | `A>B · Heat Reset` | 16 |
| 7 | `under` | `lt` | `A<B` | **Heat Set** | hand | `A<B · Heat Set` | 14 |
| 8 | `stat` | `sr` | `SR` | **Heat Latch** | hand | `SR · Heat Latch` | 15 |
| 9 | `heat` | `bo` | `BO` | **Heat Cmd** | hand | `BO · Heat Cmd` | 13 |

#### Sheet `pid` — 5 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `pv` | `ai` | `AI` | **Space** | hand | `AI · Space` | 10 |
| 2 | `sp` | `const` | `CONST` | **Heat SP** | hand | `CONST · Heat SP` | 15 |
| 3 | `ctl` | `pid` | `PID` | **Heat Loop** | hand | `PID · Heat Loop` | 15 |
| 4 | `out` | `ao` | `AO` | **Loop Out** | hand | `AO · Loop Out` | 13 |
| 5 | `rd` | `readout` | `RDO` | **Loop %** | hand | `RDO · Loop %` | 12 |

#### Sheet `proof` — 8 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `cmd` | `bi` | `BI` | **Fan Cmd** | hand | `BI · Fan Cmd` | 12 |
| 2 | `sts` | `bi` | `BI` | **Fan Sts** | hand | `BI · Fan Sts` | 12 |
| 3 | `rst` | `bi` | `BI` | **Man Reset** | hand | `BI · Man Reset` | 14 |
| 4 | `inv` | `not` | `NOT` | **No Proof** | hand | `NOT · No Proof` | 14 |
| 5 | `fail` | `and` | `AND` | **Cmd No Flow** | hand | `AND · Cmd No Flow` | 17 |
| 6 | `tmr` | `ton` | `TON` | **Fail Delay** | hand | `TON · Fail Delay` | 16 |
| 7 | `latch` | `sr` | `SR` | **Fail Latch** | hand | `SR · Fail Latch` | 15 |
| 8 | `alarm` | `bo` | `BO` | **Fan Alarm** | hand | `BO · Fan Alarm` | 14 |

#### Sheet `reset` — 7 blocks

| # | id | type | tag | name | source | rendered head | len |
|---|---|---|---|---|---|---|---|
| 1 | `oat` | `ai` | `AI` | **OAT** | hand | `AI · OAT` | 8 |
| 2 | `slope` | `const` | `CONST` | **Rst Slope** | hand | `CONST · Rst Slope` | 17 |
| 3 | `icpt` | `const` | `CONST` | **Base SP** | hand | `CONST · Base SP` | 15 |
| 4 | `scale` | `mul` | `MUL` | **Rst Offset** | hand | `MUL · Rst Offset` | 16 |
| 5 | `sum` | `add` | `ADD` | **Raw HWSP** | hand | `ADD · Raw HWSP` | 14 |
| 6 | `clamp` | `limit` | `LIM` | **HWSP Clamp** | hand | `LIM · HWSP Clamp` | 16 |
| 7 | `hwsp` | `ao` | `AO` | **HWSP** | hand | `AO · HWSP` | 9 |

---

**Totals:** 188 blocks · 53 roster · 135 hand
**Over budget (18):** NONE
**Missing names:** NONE
**Same-sheet collisions:** NONE

---

## 4. Duplicate check

**Result: zero same-sheet collisions across all 12 sheets / 188 blocks**
(machine-verified — the generator asserts uniqueness of `name` within each
sheet and reports `NONE`). Nothing needed resolving. But four families were
*designed around* to get there, and the implementer must not "simplify"
them back into collisions:

### 4.1 Collisions avoided by design

| Sheet | Would have collided | Resolution |
|---|---|---|
| `econ-2stage` | `hwsel` (SEL) and `hw-valve` (AO) both "the hot-water valve" | AO keeps the roster's `HW Vlv`; the select became **`HW Vlv Sel`** |
| `econ-2stage` | `fansel` (SEL) and `fan-speed` (AO) both "the fan speed" | AO keeps roster `Fan Spd`; select became **`Fan Spd Ref`** |
| `econ-2stage` | `dmpsel`, `dmpout` (both SEL) and `oa-damper` (AO) — three damper blocks in a chain | named by **selector**: **`Econ Dmpr`** (economizer picks the position) → **`Occ Dmpr`** (occupancy decides whether to use it) → roster `OA Dmpr` |
| `cool-2stage-safeties` | `okrun` (SR) and `permit` (AND) are both run-permissions | **`DAT Run OK`** (names its input *and* its polarity) → `Coil Safe` → **`Run Permit`** — an escalation that reads as a chain |

The three AHU near-pairs above are *benign* conflations: in each case the
select feeds the AO directly and carries the same value, so a reader who
momentarily merges them is not misled about behaviour.

### 4.2 Dense name families — reviewed, kept

Two sheets carry a prefix family big enough to be worth a look:

- **`cool-2stage-safeties`: six `DAT*` names** — `DAT` (AI), `DAT Clear`
  (52, the re-arm constant), `DAT Trip` (42, the trip constant), `DAT OK`
  (the `>` test), `DAT Low` (the `<` test), `DAT Run OK` (the latch).
  Kept: the low-limit genuinely *is* a DAT subsystem and the shared prefix
  is what shows that. Mis-pairing risk (Clear↔OK, Trip↔Low) is mitigated by
  each block's value strip showing 52 / 42 directly beneath its head.
  *Alternate if the density bothers the owner:* rename the two comparators
  to **`Above Clear`** (17) and **`Below Trip`** (16), which drops the
  family to four.
- **`tstat-cool`: six `Cool*` names.** Kept — on a cooling thermostat sheet
  everything is cooling; the second word is the differentiator and each is a
  distinct verb (Make / Break / Set / Reset / Latch / Cmd).
  *Alternate:* `hi` → **`Make Pt`** (13), `lo` → **`Break Pt`** (14).

### 4.3 Deliberate cross-sheet divergences — do NOT normalise

Same block id, different name on a different sheet, **on purpose**:

| id | sheets | names | why |
|---|---|---|---|
| `hundred` | AHU `econ-2stage` | `Full Ref` | feeds both a fan select *and* a damper select — "full" covers speed and open |
| `hundred` | FCU 2-stage sheets | `High Spd` | feeds only the speed select, paired against `low` → `Low Spd`. The pair is the teaching |
| `hundred` | FCU `cool-1stage` | `Spd Ref` | no select exists here — it wires straight to the AO. "High" would be high relative to nothing, and this sheet's whole lesson is that the reference is *uninterrupted* |
| `hi` / `lo` | `tstat-cool` vs `tstat-heat` | `Cool Make`/`Cool Break` vs `Heat Break`/`Heat Make` | **inverted**. On the cool sheet `hi` is the make point; on the heat sheet `hi` is the break point |
| `over` / `under` | `tstat-cool` vs `tstat-heat` | `Cool Set`/`Cool Reset` vs `Heat Reset`/`Heat Set` | **inverted** — the heat sheet wires `under → S` and `over → R` |
| `cool` | public `econ` (bi) vs `tstat-cool` (bo) | `Cool Call` vs `Cool Cmd` | an input call and an output command are different objects |
| `inv` | public `freeze` vs `proof` | `Fan Permit` vs `No Proof` | both NOTs, inverting different things |
| `latch` | public `freeze` vs `proof` | `Trip Latch` vs `Fail Latch` | |
| `alarm` | public `freeze` vs `proof` | `Frz Alarm` vs `Fan Alarm` | |

⚠ **The `tstat-cool` / `tstat-heat` inversion is the single highest-risk item
in this document for a copy-paste implementation.** The two sheets are
byte-similar and it is very natural to paste the names across. Doing so
would make the heat sheet claim that a *warm* space sets the heating latch —
the exact opposite of the reverse-acting lesson the sheet exists to teach.
Conversely, getting it right is arguably the **best argument for the whole
feature**: today both sheets show `A > B` / `A < B` and the inversion is
invisible; with names it becomes readable at a glance.

---

## 5. Free constants — traced, then named to teach

"Free" = a `const` block with no roster point behind it. Named from what it
**feeds**, per the brief, rather than from its value or its id.

### 5.1 AHU `econ-2stage` — 4 free constants

| id | value | feeds | what it actually is | name | head | len |
|---|---|---|---|---|---|---|
| `sep` | 2 | `y2on.B` (= y1on + sep) | the **stage-1 → stage-2 separation**. Y1 makes at 74, Y2 hangs 2 °F above it | **`Stg2 Sep`** | `CONST · Stg2 Sep` | 16 |
| `gain` | 25 | `heatraw.B` (× heat error) | the heating loop's **proportional gain**, 25 %/°F — a 4 °F error saturates the valve | **`Heat Gain`** | `CONST · Heat Gain` | 17 |
| `zero` | 0 | `hwsel.IN0`, `fansel.IN0`, `dmpout.IN0` | the **off/shut reference** every select falls back to when its permit is false | **`Off Ref`** | `CONST · Off Ref` | 15 |
| `hundred` | 100 | `fansel.IN1`, `dmpsel.IN1` | the **full reference** — full fan speed *and* full damper open | **`Full Ref`** | `CONST · Full Ref` | 16 |

`Off Ref` / `Full Ref` are deliberately a matched pair: they are the two
ends of the range, and every select on the sheet picks between one of them
and something computed. Naming them as a pair is what teaches that shape.

### ⚠ 5.1a `sep` is a THIRD quantity — not `Deadband`, and not the setpoint gap

Per the brief's warning, and confirmed by tracing: on **both** the AHU and
the FCU, `sep` is the **inter-stage separation** (Y1-on + sep = Y2-on). It is
neither of the two senses CLAUDE.md disambiguates:

| quantity | what it is | where it lives |
|---|---|---|
| **deadband** | per-setpoint hysteresis; cooling makes at CSP + db, breaks at CSP | roster point `deadband` → head `CONST · Deadband` |
| **setpoint gap** | separation between the heating and cooling setpoints | not a block; the AHU graphic's `SP DIFF` well |
| **`sep`** | separation between **stage 1 and stage 2** | free constant → **`Stg2 Sep`** |

`Stg2 Sep` names the stage it separates and cannot be misread as either
other sense. *Alternate:* `Y2 Sep` (14), which ties to the `Y2` output
rather than the stage.

### 5.2 FCU free constants — 5 distinct ids across 4 sheets

| id | value | sheets | feeds | what it is | name | len |
|---|---|---|---|---|---|---|
| `sep` | 2 | 2stage, fanon, safeties | `y2on.B` | inter-stage separation (as above) | **`Stg2 Sep`** | 16 |
| `low` | 60 | 2stage, fanon, safeties | `select.IN0` | the **stage-1 / idle fan speed** | **`Low Spd`** | 15 |
| `hundred` | 100 | all four | `select.IN1`, or the AO directly | the **stage-2 / full fan speed** (see §4.3 for the 1-stage divergence) | **`High Spd`** / **`Spd Ref`** | 16 / 15 |
| `hilim` | 52 | safeties | `datok.B` (`dat > hilim` **SETS** okrun) | the DAT **re-arm / clear** threshold | **`DAT Clear`** | 17 |
| `lowlim` | 42 | safeties | `datlow.B` (`dat < lowlim` **RESETS** okrun) | the DAT low-limit **trip** threshold | **`DAT Trip`** | 16 |

`DAT Clear` / `DAT Trip` is the strongest teaching pair in the inventory:
the ids `hilim` / `lowlim` say only *which side*, while the names say *what
happens* — and the pairing makes the latch's hysteresis legible without
reading a wire. `hilim` deliberately does **not** become "DAT Hi Lim"
(18 chars, at budget, and a restatement of the id).

### 5.3 Public-page free constants — 5 distinct ids, 8 instances

| sheet | id | value | what it is | name | len |
|---|---|---|---|---|---|
| `econ` | `oasp` | 60 | economizer changeover / lockout | **`Econ Lock`** | 17 |
| `tstat-cool` | `sp` | 74 | cooling setpoint | **`Cool SP`** | 15 |
| `tstat-cool` | `db` | 1 | **symmetric** deadband (±1 → 73 / 75) | **`Deadband`** | 16 |
| `tstat-heat` | `sp` | 70 | heating setpoint | **`Heat SP`** | 15 |
| `tstat-heat` | `db` | 1 | symmetric deadband | **`Deadband`** | 16 |
| `pid` | `sp` | 72 | setpoint (loop is `action: 'reverse'` → heating) | **`Heat SP`** | 15 |
| `reset` | `slope` | −0.667 | °F of HWSP per °F of OAT | **`Rst Slope`** | 17 |
| `reset` | `icpt` | 180 | HWSP at 0 °F OAT — the top of the reset line | **`Base SP`** | 15 |

⚠ **`Deadband` on the tstat sheets is a *different* deadband from the
workbench's.** Here `hi = sp + db` and `lo = sp − db` — a **symmetric** band
around the setpoint. On the FCU/AHU the setpoint is the **cut-out** and the
deadband is one-sided. Both usages are correct in their own context; the
generic thermostat example is not bound by the workbench's house convention.
**Do not harmonise them.** (`Deadband` is also the roster name on the
workbench sheets, so the same string legitimately means two things across
files — a naming coincidence, not a defect.)

`Rst Slope` (17) is the tightest hand name in the inventory; `Reset Slope`
would be **19** and overflow. This is the clearest illustration of `CONST`'s
5-character tag being the binding constraint (§2a).

---

## 6. Totals and true authoring cost

### 6.1 Blocks

| File | Sheets | Blocks | Roster-derived | Hand-authored |
|---|---|---|---|---|
| `html/simulators/ddc-workbench.html` (AHU) | 1 | 43 | 17 | 26 |
| `html/simulators/ddc-workbench-fcu.html` | 4 | 95 | 36 | 59 |
| `html/simulators/function-block-editor.html` | 7 | 50 | 0 | 50 |
| **Total** | **12** | **188** | **53** | **135** |

Per FCU sheet: `cool-2stage` 23 (9/14) · `cool-1stage` 14 (9/5) ·
`cool-2stage-fanon` 24 (9/15) · `cool-2stage-safeties` 34 (9/25).
Per public sheet: `freeze` 6 · `econ` 6 · `tstat-cool` 9 · `tstat-heat` 9 ·
`pid` 5 · `proof` 8 · `reset` 7.

### 6.2 True authoring cost

**135 `name:` keys** go into the literals — but only **~96 distinct strings**
have to be invented, because ids repeat across sheets:

| File | `name:` keys | distinct strings |
|---|---|---|
| AHU | 26 | 26 (single sheet) |
| FCU | 59 | **27** — the 4 sheets share a staging spine |
| Public | 50 | **43** |
| **Total** | **135** | **~96** |

The FCU is the cheapest file per block: 59 keys drawn from 27 names, because
`Y1 Make` / `Y1 Set` / `Y1 Reset` / `Y1 Latch` / `Stg2 Sep` / `Low Spd` /
`High Spd` / `Spd Ref` / `Cool Call` recur verbatim across its sheets. That
recurrence is a *feature* — flipping between the four FCU programs now shows
which blocks are the same block, which is exactly the diff-reading the sheets
were laid out for (their shared coordinates already do this positionally).

### 6.3 Roster coverage — verified

- **AHU: all 17 roster points have a block** on `econ-2stage`. Consistent
  with the page's own comment ("Every point in the roster is authored on it"),
  and required — an unauthored actuator releases slot 16 and rests at its
  `Relinquish_Default`.
- **FCU: `rat` has NO block on any of the four sheets.** It is a sensor, so
  nothing breaks (only actuators need a block to hold slot 16), but it means
  the FCU roster contributes **9**, not 10, names. Machine-verified.

---

## 7. Risks and notes for the implementer

### 7.1 ⚠ `.fbe-block-head` needs `white-space: nowrap` — blocking

See §1e. Measured: an over-budget head grows the block **18 px**. This is a
`styles.css` edit and therefore **needs owner approval** (live-facing file,
per CLAUDE.md's merge rules) even though the feature is otherwise
hidden-page work. Ship it in the same PR as the `tag`/`name` change — the
two are not separable without a window where a long name breaks layout.

### 7.2 ⚠ Shared-code blast radius — this is NOT a hidden-page-only change

`html/scripts/fbe-engine.js` (the `BLOCKS` catalog gaining `tag`) and
`html/scripts/fbe-editor.js` (the head render at :237-240) are both loaded by
**`html/simulators/function-block-editor.html`, which is a LIVE page** —
it carries a `canonical` and is in the sitemap. This is precisely the trap
CLAUDE.md documents from PR #452 (psychro-engine). The whole PR needs owner
approval; none of it rides the merge-freely lane.

### 7.3 ✅ `name` is a free field — no collision, and it survives cloning

- Nothing on a **block instance** uses `.name` today. (`pinDef.name` and
  `def.inputs[].name` are on the *definition* objects, a different shape.)
- `FBE.makeGraph()` is `JSON.parse(JSON.stringify(def))` — a full deep
  clone, so a `name:` on a literal **survives to the runtime block**
  unchanged. No engine change is needed to carry it.
- ⚠ But **`createBlock()` does not set `name`** — it returns
  `{ id, type, x, y, params, state, out, in }`. A block the user drags out
  of the palette therefore has `name === undefined`, and
  `fbe-editor.js:239` must handle it. **Decide this explicitly:**
  - `head.textContent = b.name ? def.tag + ' · ' + b.name : def.tag`
    (recommended — a fresh block reads `AND`, matching today's terse feel), or
  - fall back to the auto-generated id (`AND · and-3`), which is noisier but
    tells the user what to type into the inspector.
  - Either way this is also the argument for adding a **name field to the
    inspector**, which the brief does not scope but which the feature
    implies — a user can now see names but not author them.

### 7.4 The `CONST` tag is the binding constraint

34 of 188 blocks are constants, and `CONST` leaves them **10 characters**.
Every name that had to be trimmed in this inventory was a constant
(`Reset Slope` → `Rst Slope`, `DAT Hi Lim` → `DAT Clear`,
`Full Speed` → `Spd Ref`). If a future sheet needs more room, shortening
`CONST` is the lever — but see §2a for why it was kept at 5.

### 7.5 🐛 Doc/code divergence found on the AHU sheet — `dmpout` is gated on OCCUPANCY, not proof

Naming `dmpout` forced the question, and the page's prose is **wrong**:

- `ddc-workbench.html:2621` — `{ from: ['occ', 'O'], to: ['dmpout', 'SEL'] }`
- The sequence comment (~:2438) says *"A second select shuts it outright
  when airflow proof is down"*
- The inline wire comment (~:2619) says *"no airflow shuts it outright"*

`fan-status` reaches `y1gate.B`, `y2gate.B` and `hwsel.SEL` — **never**
`dmpout`. Two comments claim a proof interlock on the damper that the wiring
does not implement. Either the comments are stale or the wire is wrong (a
damper that stays open with no airflow is arguably the more interesting
freeze scenario, so this may be a real sequence bug rather than a doc bug).

**This is out of scope for the naming feature** — the names below describe
the wiring as it actually is (`Occ Dmpr`, named for its selector). Per
CLAUDE.md's "log caught issues" rule this should be **appended to
`docs/codebase-issues.md`** and raised with the owner, not silently fixed.
It is on the `feat/ahu-workbench-page` branch, so it can still be corrected
before that page ships.

### 7.6 Cross-roster inconsistency: FCU `fan-speed` is named `Fan`, AHU's is `Fan Spd`

`ddcw-fcu-unit.js:527` names the fan-speed AO **`Fan`**, so its head renders
`AO · Fan` (8 chars) sitting next to `BO · Fan En` — the AO looks like it is
missing a word. The AHU's equivalent is `Fan Spd`.

**Do not fix this inside the naming feature.** The roster `name` also drives
the chip strip and the off-program window, so changing it has a wider blast
radius and may need a spec update. Log it; let the owner decide.

### 7.7 No spec asserts on head TEXT — but one asserts on head geometry

Six specs reference `.fbe-block-head`, all as a click/drag target or for a
`boundingBox()`. **None reads its text**, so no spec breaks on the label
change. `tests/fbe-geometry.spec.js:479` takes a head's bounding box at
root font 20 px — a partial safety net that would catch a wrap on the `oat`
block of one sheet, but only there. **Consider adding a spec** that asserts
every rendered `.fbe-block` on every sheet has the same height as its peers,
or simply that no head's `scrollHeight` exceeds its `clientHeight`; that is
the cheap, general guard for the §1e failure mode.

### 7.8 Names describe the wiring, not the intent

Throughout, names were derived by **tracing what each block consumes and
feeds**, then checked against the surrounding page comments — not from the
comments alone. Where the two disagreed (§7.5) the wiring won. If the owner
corrects that wire, `Occ Dmpr` should be renamed with it.

---

## 8. Summary

1. **Budget: 18 characters**, verified by arithmetic and by live browser
   measurement, and it is the floor across root fonts 12–32 px (§1). The
   brief's ~19 is one char optimistic. `len(tag) + 3 + len(name) ≤ 18`.
2. **Blocking prerequisite:** `.fbe-block-head` must gain
   `white-space: nowrap` — an over-budget name currently grows its block by
   a measured **18 px** (§1e). It is a `styles.css` change → needs approval.
3. **28 tags proposed** (§2), 2–5 chars. Comparators keep their pin identity
   as **`A>B`** with the spaces squeezed out — the pin names are the
   informative half and the head is their only home (§2b).
4. **188 blocks across 12 sheets inventoried** (§3), every rendered head and
   length computed by script. **Zero over budget. Zero same-sheet collisions.**
5. **53 roster-derived / 135 hand-authored** (§6); ~96 distinct strings to
   invent, because the FCU's four sheets share a staging spine.
6. **Four collisions were designed around** rather than resolved after the
   fact (§4.1), and the `tstat-cool` / `tstat-heat` name **inversion** is the
   highest copy-paste risk in the document (§4.3).
7. **`sep` is a third quantity** — inter-stage separation, neither the
   per-setpoint deadband nor the heating/cooling setpoint gap. Named
   **`Stg2 Sep`** (§5.1a).
8. **Two issues to log, not fix here:** the AHU `dmpout` doc/code divergence
   (§7.5) and the FCU `fan-speed` roster name (§7.6).
