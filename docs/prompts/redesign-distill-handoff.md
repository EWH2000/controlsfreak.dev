# Handoff — Dark redesign, Phase 1b (distillation)

> **For a fresh, higher-effort session.** Paste this file's path as your
> starting context. Read the two sources of truth first (below), then execute
> the distillation. The design *language* is LOCKED; this phase makes it real
> in `styles.css`. **Do not redesign the look** — translate the approved spike
> faithfully.

## Read these first (authoritative)
1. **Memory:** `~/.claude/projects/-home-ehill-controlsfreak-dev/memory/project_site_redesign_dark_industrial.md`
   — the full locked spec (token hexes, two-register rules, all decisions).
2. **Reference implementation:** `design-spike.html` at the repo root —
   untracked scratch file, **NOT in the 11ty build**. It is the visual
   source-of-truth for the locked language. Open/screenshot it
   (`file://…/design-spike.html`) before changing anything.
3. `CLAUDE.md` — the design-system conventions you must keep (vanilla JS, no
   framework/bundler, kebab-case ids, indentation, descriptionLengthGuard,
   etc.). Note: CLAUDE.md currently *codifies the old rules* (light-only, flat,
   the current tokens) — updating it is part of this work (see below).

## The locked language (summary — spike + memory are authoritative)
**Two registers used semantically:**
- **Software register = DEFAULT, "AX-sharp" cool slate.** Square corners
  (radius 0), hard 1px seams, flat fills, NO floating shadows, NO glow washes.
  Green = brand/action, blue = data/selection. Niagara cues (nav-tree,
  wiresheet). CAD-style corner registration ticks as the "sharp" signal.
- **Equipment register = warm device + POSITIVE-MODE DOT-MATRIX CHARACTER
  LCD** (lit olive backlight, dark ink, 3px pixel-mesh via
  `radial-gradient(... ) ... mix-blend-mode:multiply`, NO scanlines/glow).
  Used ONLY where we depict hardware: VFD/DMM sims, device widgets, and the
  one readout in a software tool that shows a field value.
- Dark-default tokens + `[data-theme="light"]` overrides (light ≈ today's
  look). Equipment LCD stays olive in both themes.
- Token hexes are in the memory file's "LOCKED LANGUAGE — spike v4" block and
  in `design-spike.html`'s `:root`.

## Phase 1b — the distillation task
Branch `feat/redesign-design-language` is already checked out (only
`design-spike.html` is untracked). Work here or cut a fresh `feat/` branch.

1. **`html/styles.css` `:root`** → dark-default tokens (copy from the spike's
   `:root`). Add `:root[data-theme="light"]` with today's values (currently in
   `:root` — move them). Keep `color-scheme` flipping per theme. Equipment-LCD
   tokens (`--lcd-bg`, `--lcd-ink`, etc.) stay constant across themes.
2. **Equipment component classes** → port `.device`, `.lcd` (dot-matrix),
   `.gauge.eq`, keypad/LED bits from the spike into `styles.css`. These are
   genuinely shared (VFD sim, device widgets) so they belong in the shared
   sheet, not per-page.
3. **Software-register sharpening** → square corners + flat seams across the
   existing components (`.tool-card`, `.tabs`, `.ps-*`, `.nav-card`, buttons,
   `.filter-chip`, quiz `.quiz-*`, etc.). Most already use tokens, so the
   palette flip carries them; the *shape* (radius/shadow) is the manual part.
4. **Theme toggle** → add a nav pill mirroring the **units** pattern exactly:
   - `html/_includes/nav.njk` — add a theme pill next to `.units-toggle`.
   - `html/scripts/units.js` is the model for a tiny theme script (or extend
     it) — persist `cf_theme`, sync `aria-pressed`, flip
     `document.documentElement.dataset.theme`.
   - `html/_includes/head.njk:47` has the units bootstrap one-liner — add a
     sibling that sets `data-theme` before paint, honoring
     `prefers-color-scheme` when no `cf_theme` is stored. Update the
     `theme-color` meta (currently `#ffffff`) to flip too.
5. **Body background** → port the cool graticule (and drop the global
   scanlines — texture is localized to equipment LCDs now). Keep the blueprint
   grid behavior for the light theme.
6. **Sweep + docs (required, not cleanup):**
   - Update **CLAUDE.md** — it states light-only + flat + the old token rules;
     rewrite those sections to the new dual-theme two-register system.
   - Update `site-ideas-and-friction.md` redesign notes.
   - If a `/styleguide` page ships (recommended — evolve `design-spike.html`
     into `html/styleguide.html`), add it to `PAGES` in `tests/smoke.spec.js`
     and it'll hit the sitemap automatically. Otherwise delete
     `design-spike.html` from the working tree.

## OPEN — do NOT treat as decided
- **The HERO CONCEPT is being rethought.** The user decided the
  **living control-loop is probably not the right home hero**. Keep the
  control loop in the spike only as a *demo of the two registers merging* —
  it is NOT the committed hero. Leave the real home hero as a placeholder /
  hold for a separate decision. Don't ship a final home hero this phase unless
  the user has since chosen one.
- Equipment device bezels are currently fully square (radius 0) from the
  sharp sweep; a 1–2px radius on `.device` only is an open nicety if the user
  wants devices to feel a hair more physical.

## Constraints / gotchas (carry-over)
- Vanilla JS, no framework/bundler. `'use strict'` IIFEs, `addEventListener`.
- A11y: re-check contrast in BOTH themes; `prefers-reduced-motion` (LCD ticks,
  flow dots, trend draw all freeze). Touch-target floor block.
- `descriptionLengthGuard` (140–160) on any new page. SVG `--` comment gotcha.
  kebab-case ids. 4-space indent.
- The light theme must stay readable for prose-heavy Education pages (that was
  the whole reason for dual-theme rather than dark-only).

## Verify
- `npm run build` (catches description-guard + Nunjucks errors).
- `npm test` (Playwright). Re-screenshot key pages in BOTH themes (toggle via
  `document.documentElement.dataset.theme`), plus `npm run screenshots` for
  the diagram audit on dark.
- Branch → PR per the repo's git conventions. **Do NOT merge** — the user
  merges on GitHub.
