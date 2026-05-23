# Design-sparkle exploration for controlsfreak.dev

I want a creative design pass on **controlsfreak.dev** — a field-reference site for building-controls engineers (BACnet/Modbus calculators, HVAC tools, plain-English lessons). The site just shipped its **v2.0.0 "workstation-console" identity** (console title bars, BACnet object-ref numbering on section headers, status-bar footer with build date / OK pill / heartbeat dot, rebuilt hero + property-sheet About card) and the **v2.0.1 blueprint-grid background** that followed it. **Now I want sparkle on top of that** — polish that elevates the workstation identity without re-litigating it. Not bug fixes, not new features — sparkle.

## Read first (in this order)

- `CLAUDE.md` — full project + design-system documentation
- `html/styles.css` — the entire visual vocabulary lives here
- `site-ideas-and-friction.md` — design history, scope decisions, what's been tried and ruled out
- `README.md` — the user-facing tour
- The home page (`html/index.html`) — the v2 hero / About card live here; the home is the canonical sample of the new identity
- 1–2 representative pages from `html/tools/`, `html/simulators/`, and `html/education/`

## Aesthetic the site has earned (do not violate)

- Flat, light "workstation-console" look: white panels on warm gray-green chrome (`--bg: #eef1ec`), hairline borders, a single green accent (`--accent: #43881c`)
- Quiet nods to BAS/SCADA UIs — console title bars with `///` separators + `OK` pill, BACnet object-ref numbering (`data-objref="001"`) on section labels, status-bar footer carrying version / build date / heartbeat dot / OK pill, property-sheet-style label/value rows on the About card, shaded panel headers, flat underlined tabs, mono-caps eyebrow labels
- Subtle blueprint-grid background (32px squares in `--border`, 1.5px) — the v2.0.1 chrome
- IBM Plex Mono (display + data) + Overpass (body)
- Light-only, no dark mode
- No drop shadows, no background texture *beyond* the blueprint grid, no decorative animation — the only motion today is purposeful pipe-flow particles on hydronic diagrams and the slow heartbeat dot in the footer
- View-source must stay readable HTML

## What v2.0.0 / v2.0.1 already absorbed (don't re-suggest)

These ideas have already been tried, shipped, or explicitly ruled out — re-pitching them is wasted motion. Read the commits / `site-ideas-and-friction.md` for the full story before proposing.

- **Drop caps on education page intros** — tried in v2.0.1 (commit faa31c5), pulled the same day (commit 17b3dea). Reads as decorative-for-its-own-sake on the workstation aesthetic. Don't bring it back.
- **Console title bars on the hero** — shipped in v2.0.0 (`.console-titlebar` with `///` separator + `OK` pill).
- **Status-bar footer** — shipped in v2.0.0. Currently carries `OK` pill, tagline, version (`v{{ site.version }}`), build year/date (`time datetime=…`), and a slow heartbeat dot.
- **BACnet object-ref numbering on `<h2>`s** — shipped in v2.0.0 (commit 61099fe). Each section label carries `data-objref="NNN"` rendered as a small mono prefix.
- **Property-sheet About card** — shipped in v2.0.0 (commit 1d90fb6). Role / Industry / Location / Verified / Status rows + a single prose paragraph + colophon. (The wall-of-prose original is gone.)
- **Blueprint grid background** — shipped in v2.0.1, 1.5px in `--border` at 32px pitch.
- **Wider page cap + larger body type** — shipped in v1.x via `ba2a5a8` (1120px main cap, 18px body). The chrome is already proportioned for current readability.

## Areas worth exploring (suggestions, not a checklist)

- **Micro-interactions** — hover states, focus transitions, subtle motion on the *right* elements (engineer-honest, not bouncy). The heartbeat dot in the footer is the one decorative motion currently — anything new should be similarly purposeful.
- **Typographic flourishes** — tabular figures on numeric data, small-caps marginalia, italic accents inside hero copy (`<em>built for the field.</em>` is the v2 hero precedent; could the same shape carry elsewhere?). Drop caps explicitly ruled out above.
- **Section markers** — current eyebrow is `── LABEL ──` plus the `data-objref="NNN"` BACnet prefix. Could the divider line carry more identity (tick marks, length variation, a one-pixel object-ref reflection)?
- **Diagram embellishments** — SVG annotations, hand-drawn-feeling callouts, direction arrows that aren't just isosceles triangles. The pipe-flow particle engine is the precedent for "engine-honest motion."
- **Status-bar refinement** — the footer + hero status-line vocabulary already exists (`OK` pill, `VERSION`, `LAST BUILT`, `UPTIME 24×7`). Could it carry one more thoughtful detail without becoming busy? An hourly-resync glyph? A subtle "freshness" indicator on `LAST BUILT`?
- **Hero presence** — v2 added the console title bar + status line. The hero copy is centered with `<em>built for the field.</em>` and a badge row. Could one of the badges carry a small live element (a tiny BACnet object dot, a rotating mini-diagram) without violating the "no decorative animation" rule?
- **Console title bar variation** — currently identical on every page (the home eyebrow is the same as a tool page's). Could it carry per-page identity — the page's BACnet object-ref, the tool's input/output signature, a one-glyph "this page is a calculator vs. an explainer" marker?
- **About card seal / verification line** — the property-sheet card has a `Verified: 2026` row and `Status: Active` live readout. Could one row carry a small handwritten-feeling element (an initial, a date stamp, a one-symbol glyph) that says "a human stands behind this"?

## Hard constraints

- **Vanilla CSS only** (in `html/styles.css` or page-local `<style>` blocks). No frameworks, no preprocessors, no build steps beyond the existing 11ty templating.
- **No JS dependencies**. The classic scripts in `html/scripts/` are the ceiling — no npm packages, no CDN libraries.
- **No tracking, no analytics, no new third-party origins**. Google Fonts is already loaded; nothing else.
- **No AI-generic aesthetics**. Avoid gradient blobs, glassmorphism, generic SaaS hero patterns, particle-field backgrounds, glow effects for their own sake.
- **Mission first**: "tools that are actually useful on a job site." Sparkle should *support* the workstation-honest feel, not fight it. The v2 identity has earned the right to be quietly elaborate; it has not earned the right to be precious.

## Workflow

- Use the **`/frontend-design`** skill — it's tuned for this kind of creative exploration.
- Show me a few directions before going deep. I'd rather compare 2–4 sketched possibilities than receive one finished thing I have to undo.
- Branch convention: `feat/<slug>` or `refactor/<slug>`. Commit prefix: `css:` for styling.
- Open a PR with Summary / Changes / Test plan sections (see CLAUDE.md "Git conventions").
- Do **not** merge — I review on GitHub.

## Deliverable

Your call between:
1. A **mood-board PR** with 2–4 distinct directions sketched small enough to compare side-by-side
2. A **single-direction PR** that picks the strongest idea and ships it polished

Pick whichever fits better after you've read the design history. Show your thinking before doing a lot of work. The footer's current shape — `OK · controlsfreak.dev · open tools for controls professionals · v2.0.1 · BUILT 2026 · ▪` — is the visual anchor to design against.
