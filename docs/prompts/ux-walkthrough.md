# Three-persona UX walkthrough of controlsfreak.dev

Walk the **entire** site the way three different real visitors would,
and surface every place the experience trips, confuses, slows, or
under-delivers for that person. This is a **usability / experience**
audit — not a content-accuracy pass (that's `content-audit.md`'s job)
and not a redesign. You're the fresh pair of eyes the site owner can't
be anymore because he's seen every page a hundred times.

Along the way, whenever you notice a **code-quality** problem — a bug, a
convention drift, dead code, an accessibility defect — log it too. You're
walking every page anyway; catching code issues in passing is free value.

## What the site is

`controlsfreak.dev` is a field-reference site for building-controls
people — open calculators and lookups for BACnet / Modbus / HVAC /
building-automation work, plus plain-English explainers and, newest, a
**Practice** section of quizzes and field drills. Vanilla HTML/CSS/JS
templated by 11ty; a "workstation-console" visual identity (v2.x). No
login, no analytics, no tracking. Six nav lanes: Home / Tools /
Simulators / Education / Practice / Contact.

**Recently shipped (give it extra attention — it's the least-walked):**
the Practice section's v2 batch — eight content quizzes (Modbus Basics,
Modbus Decoding, BACnet Basics, BACnet Networking, Pump Control, Hydronic
Loops, Load Piping, Hydronic Balancing) and two field drills (Surviving
Your First Months, Controller Swap).

## Read first (so you don't re-report known things)

- `../../CLAUDE.md` — project + design-system documentation, conventions,
  and the **Gotchas** section (several "this is intentional, not a bug"
  notes — e.g. the schematic-bg hidden below 1240px, the `aria-pressed`
  units-toggle flicker, Turnstile on the contact page). Don't file
  findings the Gotchas already explain as deliberate.
- `../../content-audit.md` — known **content** (accuracy / clarity)
  findings. Anything already here is logged; don't duplicate. Genuinely
  *new* content-accuracy issues you spot go here.
- `../../codebase-issues.md` — known **code-quality** items, including a
  "Deferred / Won't fix (with revisit trigger)" section. Don't re-log
  what's here or already addressed.
- `../../site-ideas-and-friction.md` — per-page design history and ideas
  tried / ruled out / parked. If the friction file says an idea was
  considered and rejected, don't pitch it back as a finding.
- `../../README.md` — the user-facing tour (what each page is for).

## The three personas

Walk the whole site **three times**, once in each head. The same page can
be fine for one persona and broken for another — that contrast is the
point. (If you fan out with subagents, one persona per agent works well;
just hold each to its own lens.)

### 1. The newcomer — new to building controls
An apprentice, a career-changer, a trade-school student, or a green tech
in their first months. They don't know what BACnet *is* yet; "MS/TP,"
"priority array," "superheat" are not yet words. They arrived from a
search or a link and are deciding in ~10 seconds whether this site is for
them. Lens:
- Does the **home page** tell them what this is and whether they belong,
  fast? Is there an obvious "start here"?
- Is jargon **explained on first use**, or assumed? Where does an
  undefined term stop them cold?
- Can they find the **Education** lane and a sensible first lesson? Does a
  lesson answer its own question by the end, or assume prior pages?
- The **Practice** quizzes: are they encouraging or punishing to someone
  who doesn't know the answers yet? Do the "learn more" links rescue them?
- Dead ends: a page that references a concept with no link to learn it.

### 2. The experienced field tech — in the mechanical room
Comfortable with BACnet/Modbus/Niagara/EBO, years in the field, **on a
phone or tablet**, standing at a panel, possibly with gloves and bad
lighting. They want an answer in seconds and they're judging whether the
tool is faster than the pocket reference they already trust. Lens:
- **Mobile is the primary surface for this persona.** Walk every tool at
  a phone viewport (≈375–414px wide) and a tablet (≈768–1024px). Tap
  targets, input ergonomics (numeric keyboards, unit toggles), tables
  that overflow, anything that needs a pinch-zoom.
- Speed-to-answer on the **tools**: signal-scaling, bacnet-ip-converter,
  modbus-register-viewer, thermistor, psychrometric, air-mixing,
  coil-sizing, economizer-ratio, refrigerant-pt. How many taps to the
  number they came for? Any tool that makes them think too hard?
- The gutter **schematic-bg art is hidden below 1240px by design** (it's a
  "field device" — see CLAUDE.md Gotchas). Confirm nothing *load-bearing*
  was put in it; flag only if meaning is lost on mobile, not its absence.
- Field drills (Surviving First Months, Controller Swap) — do they ring
  true to someone who's actually done the work, or read as classroom?

### 3. The controls engineer — designing and speccing
Designs sequences of operation, specs equipment, reviews submittals.
Wants depth, precision, and correctness, and resents being talked down
to. On a desktop, probably with three other tabs of manufacturer data.
Lens:
- Do the **tools** carry the precision an engineer needs (right
  significant figures, edge-case handling, the caveats that matter —
  e.g. glide on refrigerant blends, byte-order on Modbus)? Where does a
  tool feel like a toy vs. a trustworthy instrument?
- Do the **Education** pages go deep enough to be worth an expert's time,
  or stop at the newcomer layer? Where's the "I'd have wanted one more
  paragraph" gap?
- **Simulators** (PID tuner, VFD mock, function-block editor): do they
  behave like the real thing? Does an engineer's mental model survive
  contact with them?
- Cross-linking: when a page earns a "see also," is the link there? An
  engineer follows references; broken or missing forward-links cost trust.

## Cross-cutting checks (all three personas)

- **Navigation & wayfinding:** is the active nav lane always right? Can
  you always get home / back / to the section landing? Any orphan page?
- **Accessibility:** keyboard-only traversal (tab order, focus-visible,
  the skip-to-content link), screen-reader landmarks/headings, color
  contrast, `alt`/`aria` on diagrams and canvases, form-label
  associations. (CLAUDE.md documents the heading + label conventions.)
- **Broken/■ states:** dead links, 404s, anchors that jump nowhere,
  `learnMore` deep-links that miss their section, JS console errors,
  layout breakage at narrow/wide widths.
- **Consistency:** does every page in a section feel like a peer
  (eyebrow shape, intro cadence, back-link, related-links)? Odd ones out
  are findings.
- **Performance smell:** anything that feels heavy, janky, or slow to
  paint — especially on the mobile pass.

## How to actually walk it

- Run the site: `npm run dev` (serves at :8000 with live reload).
- Eyeball at real viewports — drive Chromium with Playwright
  (`const { chromium } = require('@playwright/test')`) and screenshot
  pages at phone / tablet / desktop widths; `page.screenshot({ fullPage:
  true })`. For `contact.html` use `waitUntil: 'domcontentloaded'` (see
  CLAUDE.md — Turnstile never goes idle).
- `npm run screenshots` (with a server on :8000) dumps every diagram SVG
  to `/tmp/audit-*.png` — a fast way to scan the diagrams.
- Keyboard pass: tab through each page, watch the focus ring and order.
- The **full page inventory** is every `.html` under `html/` with a
  `canonical:` (45 pages today) — walk all of them, not just the
  landings. Don't forget `privacy.html` and `contact.html`.
- On Fedora, if Chromium fails to launch see CLAUDE.md "Fedora Chromium
  deps."

## Where findings go (report-only — do NOT fix inline)

This is an audit: an extra set of eyes. Editorial and design calls stay
with the owner. Record, don't rewrite. Three destinations by axis:

- **UX / usability / flow / mobile / a11y-experience findings → a new
  `../../ux-audit.md`** at the repo root (you create it). Model its
  structure on `content-audit.md`: a short "how this file is used" +
  "scope" header, then **numbered findings** each carrying *persona lens ·
  location (page + region) · the issue · severity (blocker / friction /
  polish) · suggested direction (a pointer, not a finished rewrite)*. A
  per-page coverage checklist at the top is worth keeping so the next
  pass knows what was walked. Collect trivial polish separately at the
  bottom.
- **Code-quality issues caught in passing → append to
  `../../codebase-issues.md`** under *Open*, in that file's existing
  entry shape (problem · why it matters · priority · recommended action).
- **Genuine content-accuracy / clarity issues → `../../content-audit.md`**
  (its existing format), since that's their home — but stay in your lane;
  a confusing *flow* is UX, a wrong *number* is content.

If a single observation spans axes, file it where its primary fix lives
and cross-reference.

## Workflow

- Branch `audit/ux-walkthrough` (or `docs/ux-walkthrough`).
- The deliverable is **docs only**: the new `ux-audit.md` plus any
  appended entries in `codebase-issues.md` / `content-audit.md`. **Do not
  change site behavior, styling, or copy in this PR** — fixes are a
  separate, owner-triaged follow-up. (If you can't resist noting a
  one-line fix, put it in the finding's "suggested direction," not the
  code.)
- Open a PR with Summary / Changes / Test plan sections (see CLAUDE.md
  "Git conventions"). The "test plan" here is really a coverage
  statement: which pages were walked in which persona, and how (viewport
  sizes, keyboard pass, etc.).
- **Do not merge** — the owner reviews on GitHub.

## Calibration — what's signal vs. noise

- **Signal:** a newcomer hitting an undefined term with no escape hatch; a
  tool that's unusable one-handed on a phone; a dead `learnMore` link; a
  lesson that assumes a page the visitor hasn't read; a keyboard trap; a
  tool an engineer wouldn't trust the precision of.
- **Noise:** re-litigating shipped design decisions (check the friction
  file first); restating the intentional Gotchas; "I'd have used a
  different word" without a real clarity cost; pitching new features
  (that's the friction file's job, not this audit's).
- Lean toward **fewer, well-grounded findings** over an exhaustive
  nitpick list. Quote the exact page + region so a finding is actionable
  without a treasure hunt. When you're unsure whether something is
  intentional, say so and point at where you looked.
