# Engine standardization — the #228 mixing-helper design note

> **Disposition: PROPOSAL, 2026-10-06 — ACCEPTED by the owner the same
> day with the three §6 defaults (*"I like your defaults"*): add
> `Psychro.mixAir` / `mixFraction` and keep `mixStreams`; no caveat text
> in the engine; no workbench mass-delta readout for now. Supersedes
> nothing; feeds `codebase-issues` #228's execution, a lane still to
> schedule.** The design the
> owner reads *before* any extraction begins (owner direction
> 2026-07-27: *"it may be good to standardise some engines"*). Docs
> only — no `html/` or script changed. Every number below was
> re-measured on 2026-10-06 against `html/scripts/psychro-engine.js` at
> `b54a6c8` by a vm script that transcribes each page's inline form from
> the lines cited; the script — the seven-case table *and* the sweep
> loop behind the §1 maxima and cell counts — lives in the PR body, not
> the repo, because §4 step 0's spec is what keeps the table honest
> from then on.
> §6 carries the three questions and the defaults the owner took; a lane
> executes them as written.

## 1. The problem, measured

#228 found air mixing re-implemented inline on five public surfaces in
three forms, with no helper anywhere. Since then the kernel has landed
— `Psychro.mixStreams(streams, P)` (`2f2d556`, hardened by #236 / #238)
— but it has exactly **one** consumer, the workbench AHU
(`ddcw-ahu-unit.js:726`). The five public pages still mix inline, so
the site now publishes **four forms across six surfaces** (seven call
sites: air-mixing has two tabs), and a reader who types the same
numbers into two of them gets two answers. Fed the same OA / RA /
fraction at sea level, mixed-air dry-bulb in °F:

| case | A exact, fraction as weight (air-mixing frac tab · psych chart) | E `mixStreams`, vol. weights (workbench) | B linear T+W (economizer-ratio) | C linear T, tenths (coil-freeze-risk) | D linear T (air-handlers) | F mass basis from CFM (air-mixing flow tab) | mass % implied | fog |
|---|---|---|---|---|---|---|---|---|
| #228 bench — OA 35 °F / 80 %, RA 75 °F / 50 %, 50 % | 55.11 | 55.11 | 55.00 | 55.0 | 55.00 | 54.24 | 52.2 % | no |
| #228 design-day — OA 0 °F / 60 %, RA 70 °F / 30 %, 30 % | 49.11 | 49.11 | 49.00 | 49.0 | 49.00 | 46.87 | 33.2 % | no |
| friction ruling — OA 0 °F / 40 %, RA 75 °F / 50 %, 20 % | 60.20 | 60.20 | 60.00 | 60.0 | 60.00 | 58.13 | 22.8 % | no |
| air-handlers example — OA 35 °F / 80 %, RA 75 °F / 50 %, 20 % | 67.07 | 67.07 | 67.00 | 67.0 | 67.00 | 66.50 | 21.4 % | no |
| summer — OA 95 °F / 75 °F WB, RA 75 °F / 50 %, 25 % | 80.03 | 80.03 | 80.00 | 80.0 | 80.00 | 79.87 | 24.2 % | no |
| hot-dry — OA 105 °F / 10 %, RA 75 °F / 50 %, 30 % | 83.95 | 83.95 | 84.00 | 84.0 | 84.00 | 83.65 | 29.0 % | no |
| fog corner — OA −20 °F / 40 %, RA 80 °F / 50 %, 70 % | **10.42** | **17.67** | 10.00 | 10.0 | 10.00 | 12.81 (fog) | 74.4 % | yes |

Three disagreements sit in that table, an order of magnitude apart each:

- **Formula** (A/E against B/C/D). ~0.1 °F across the ordinary band —
  a 13,400-cell sweep (OA −20…110 °F step 5, 20–90 % RH step 10;
  RA 68–80 °F step 2 at 50 %; 10–100 % OA step 10 — 15,120 cells less
  the 1,720 that fog) peaks at 0.84 °F only at 110 °F /
  90 % / 50 %, and the sign flips on hot-dry mixes (1,161 cells
  negative). Small, but the tools print one decimal: #228's closure
  check fails by exactly this — economizer-ratio answers 50.0 % for a
  55 °F setpoint, and air-mixing reads that 50 % back as 55.1 °F. The
  bench row's secondaries move with it: RH 68.8 vs 69.0 %, h 20.09 vs
  20.06 Btu/lb.
- **Basis** (A against F). What "% OA" *means*. ~2 °F at a 20 % minimum
  on a 0 °F morning; 3.97 °F at −15 °F / 20 % RH / 30 % (same grid).
  Not a formula
  defect — a **label** defect: same digits, different quantity, and only
  air-mixing says which one it wants.
- **Fog** (A against E, last row — the one #228 could not list, because
  the fix it is waiting on landed after it). The inline exact forms
  clamp `W` to saturation and keep the *cold, pre-#236* dry-bulb:
  10.42 against the engine's re-solved 17.67 °F (frac tab, psych
  chart), 5.93 against 12.81 on the flow tab's mass weights. Seven
  degrees, and it is the **public pages** — not the hidden sim — that
  are wrong. The #236 ruling has reached one surface out of six.

## 2. Classification — every duplicate, with a verdict

Per #228's own split: **(a)** duplicated implementation that can
silently diverge · **(b)** pedagogical restatement — the arithmetic *is*
the content · **(c)** deliberately different arithmetic for a stated
page reason.

| site | lines | form | class | verdict |
|---|---|---|---|---|
| `tools/air-mixing.html` frac tab | `:546-551` | exact, fraction as mass weight | (a) | **Migrate** → `mixAir({ basis: 'mass' })`. Fog rows change — intended (§4). |
| `tools/air-mixing.html` flow tab | `:527` + `:546-551` | `CFM ÷ v` then exact | (a) | **Migrate** → `mixAir({ basis: 'volume' })` with CFM shares. Same fog caveat. |
| `tools/psychrometric-chart.html` | `:672-676` | exact, fraction as mass weight | (a) | **Migrate** → `basis: 'mass'`; label `:334` gains "by mass". |
| `tools/economizer-ratio.html` | `:328` / `:493` inverse, `:535-538` rebuild | linear T **and** W, then `buildState` | (c) — must close on its own setpoint | **Migrate onto the `linear` branch** (`mixFraction` + `mixAir(…).linear.state`): zero numeric change by construction; cite `exact` as an aside. |
| `tools/coil-freeze-risk.html` | `:440-458` | linear T, integer tenths, ties-away | (c) — displayed-operand arithmetic | **Keep inline**, under a comment naming `Psychro.mixAir`. The helper enters this page through the ruled "hand math runs warm" row (friction, 2026-10-05), whose figures it computes live. |
| `education/air-handlers.html` | `:729-731` | linear T only, `RA_T = 75` | (b)-shaped executable | **Keep inline**, naming comment. The lesson teaches the linear form, is dry-bulb-only by design, and carries no moisture input — there is no state to build. |
| `scripts/ddcw-ahu-unit.js` | `:726-729` | `mixStreams`, volumetric weights | ruled | **Keep.** Model basis is the owner's (friction file). Display path only, §4 last. |
| `coil-sizing.html:189/:308`, `air-mixing.html:213-214`, `psychrometric-chart.html:476/:480` | — | `<code>` prose | (b) | **Leave.** Not executable. |
| `psychro-engine.js` | `:209/:216/:246` | `0.240 + 0.444·W` ×3 | (a), internal | Fold into a private `cp(W)` in §4 step 0. Same file, zero change. (`:502` is the inversion, same constant pair.) |

**What "% OA" will mean after migration** — each page states its basis
in the label *and* in the `basis` argument, so the two cannot drift:

| page | means | why |
|---|---|---|
| air-mixing frac tab, psych chart | **mass** | they weight `W` and `h`, which conserve by mass |
| air-mixing flow tab | **volume → mass** | `CFM ÷ v` per stream — already right, already labelled |
| economizer-ratio, coil-freeze-risk, air-handlers | **volume** (hand-arithmetic convention) | a damper % or a CFM split is what the tech has; the exact mass answer is the aside, not the headline |
| workbench | **volume** | ruled |

## 3. The helper family

**The kernel stays.** `Psychro.mixStreams(streams, P)` is unchanged —
basis-agnostic weights, fog re-solve, pinned by
`tests/psychro-mixstreams.spec.js`. Renaming it buys no number and
breaks a shipped spec plus a shipped consumer (Q1).

**Add two page-facing combinators** to the `Psychro` IIFE in
`psychro-engine.js` — classic script, globals, header tier-2 list gains
two lines, "candidate second consumers" line finally retired:

```
Psychro.mixAir({ streams: [{ state, share }, …], basis: 'mass' | 'volume', P })
  → { ok: true, basis, P,
      shares: { mass: [f…], volume: [f…] },     // both fraction sets, normalised
      exact:  <mixStreams result on the MASS weights>,
                                                 // tdb W h rh twb tdp v + fogging / condensate
      linear: { tdb, W, state } }                // Σ share·tdb and Σ share·W on the shares
                                                 // AS GIVEN, plus buildState of that pair
Psychro.mixFraction({ oa, ra, targetTdb, basis, recovery: 'linear' | 'exact', P })
  → { ok: true, fraction, within }               // 'linear' = (MA − RA) ÷ (OA − RA), the
                                                 // economizer-ratio form; 'exact' bisects
                                                 // mixAir(…).exact.tdb onto the target
```

Contract:

- **Units are the engine's** — °F, lb/lb, psia, Btu/lb, ft³/lb; convert
  at the display boundary. `share` is CFM (or anything proportional to
  volume) under `'volume'`, lb_da/h or a plain fraction under `'mass'`.
  Shares are normalised, so fractions need not sum to 1 — air-mixing's
  ±0.1 sum check is a *page* rule and stays on the page.
- **`basis: 'volume'`** → mass weight = `share / state.v`, exactly
  `air-mixing.html:527`; `exact` is then `mixStreams` on those weights.
  **`basis: 'mass'`** → `exact` is `mixStreams(shares)` — identical to
  today's inline inversion clear of the curve, and the #236 re-solve in
  fog.
- **`linear.tdb` is the hand arithmetic on the shares as given** — the
  number a tech gets off the graphic, and what B / C / D print today.
  `exact.tdb − linear.tdb` is the figure the ruled coil-freeze-risk row
  prints, *computed* rather than copied from a note.
- **`ok:false` is `buildState`'s shape**: `{ ok: false, error: '…' }`.
  Guards, in order: no streams · any `state.ok === false` · a share
  non-finite or negative after one `Number()` coercion (the `'0200'`
  accumulator lesson in `mixStreams`' body) · zero total · `basis` not
  in the enum · under `'volume'`, any `state.v <= 0`.
- **Pure.** No DOM, no `window.Units`; the bare `{}` vm context is the
  assertion, as for every other engine export.
- **Not in the contract: display rounding.** The integer-tenths blend
  is display-precision arithmetic (the equipment-airflow rule) and the
  engine stays unaware of one decimal. This departs from #228's wording
  ("belongs in the helper's contract") — a psychrometric engine that
  knows what a page prints has crossed the line its own header draws.

**Rule for keeping inline mixing arithmetic.** Executable mixing math
may stay on a page only as class (c), under a comment that **names the
helper it does not call and says why** — the labelled-mirror shape
`thermistor-calculator.html:379` already uses. Class (b) prose needs
nothing. A *new* page gets no (c) exemption without a line in #228.

## 4. Migration order

Rules for every step: **one page per PR**; the **engine-direct spec
lands first** (`tests/psychro-mixair.spec.js`, the
`psychro-engine.spec.js` vm pattern); each page PR carries a
**before/after fixture** — the page's displayed MAT / RH / h for a
fixed input set, read off the built page — proving **zero change clear
of saturation**, with fog cases **enumerated as the intended #236
correction**, before/after in the PR body; every step touches a live
page or a live script, so **owner merges after review**; step 0 is a
**minor `package.json.version` bump** (cache-busting a shared script is
load-bearing).

0. **Engine** — `mixAir` + `mixFraction` + private `cp(W)`. Spec pins:
   mass-basis `exact` ≡ `mixStreams`; `linear` ≡ Σ share·x; volume→mass
   conversion against `specificVolume`; every `ok:false` guard; **and
   the §1 table regenerated from the engine**, so this document's
   figures acquire a guard. Blast radius: nine live pages load the
   engine.
1. **psychrometric-chart** — one call site, already loads the engine;
   label `:334` gains "by mass". Smallest diff, first page.
2. **air-mixing** — both tabs, three streams. `exact.fogging` becomes
   available; surfacing it in the status pill is a *follow-on*, not
   this PR.
3. **economizer-ratio** — `mixFraction({ recovery: 'linear' })` for
   `:328` / `:493`, `mixAir(…).linear.state` for `:535-538`. Closure
   preserved by construction; optionally an `exact` aside in the formula
   line, which also collapses the `:365` / `:512` duplication #228
   named.
4. **coil-freeze-risk** — naming comment on `:452-458`. The engine
   `<script src>` and the `mixAir({ basis: 'volume' })` call arrive with
   the ruled row, which the queued content lane owns; this step is the
   instruction to that lane, not a second PR.
5. **air-handlers** — naming comment on `:653` / `:731`. Comment-only,
   live page.
6. **Workbench — last, display path only** (`ddcw-shell.js` / the AHU
   page's DOM half). The model's `mixStreams` call is untouched by
   ruling; whether anything is added at all is Q3.

## 5. What this does not touch

- **`units.js` stays a display-boundary walker.** No unconditional
  `F2C` / `C2F` lands here — that is #228's utility-layer item (with
  #65), a separate lane with a separate home.
- **No new conversion library**, no module system, no bundler. Two
  functions in an existing classic script.
- `mixStreams`' signature, `psychro-mixstreams.spec.js`, the fog / ice
  convention (#236), the workbench model's basis (friction ruling), and
  `FAN_HEAT` (ruled 2026-08-12).
- #228's other workstreams — `ductArea`, `clamp` / `tidy` / `snap`,
  `mDot` — are separate PRs. This note is the **mixing** branch only.
- The "% OA" label fix rides each page's own PR rather than a sweep: the
  label and the `basis` argument must change in the same diff.

## 6. Three questions for the owner

1. **Naming.** *Default:* **add** `Psychro.mixAir` / `Psychro.mixFraction`
   and keep `mixStreams` as the kernel. Alternatives: rename
   `mixStreams` → `mixAir` with a basis option (breaks the spec and the
   workbench for zero numeric gain); a `Psychro.mix.*` sub-namespace
   (no precedent in the engine's two-tier header).
2. **Should the helper carry the cp-weighting caveat text** — the
   "recovered dry-bulb sits a shade off the plain blend" sentence — as a
   returned `note` string? *Default:* **no.** Numbers from the engine
   (`exact.tdb`, `linear.tdb`, both share sets); the sentence from each
   page in its own register — the damage-stakes "never boilerplate"
   rule. If a *third* page prints it, it moves to `html/_data/` as one
   Nunjucks string, never into the engine.
3. **Should the workbench display show the mass-basis delta** beside
   the MAT well? *Default:* **not now.** The ruling called a mass basis
   on a linear damper model false precision; "58.1 by mass" next to a
   published 60.2 invites the reader to conclude the model is wrong,
   and the beat has a ruled home (the coil-freeze-risk row). The
   yes-variant, specified so it can be flipped: one sentence in the
   point mirror, from `mixAir({ basis: 'volume' })` on the display path
   only, model untouched. Revisit once the row ships and readers react.
