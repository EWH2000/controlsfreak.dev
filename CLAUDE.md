# controlsfreak.dev

A field-reference tool site for building-controls engineers — open
calculators and lookup utilities for BACnet, Modbus, HVAC, and building
automation work, plus practical explainers. Source pages under
`html/` plus a small Cloudflare Worker (only for `/contact`). 11ty
templates the shared chrome (`<head>`, nav, footer) out of every page;
everything else is vanilla — no client-side framework, no bundler, no
transpiler.

Companion docs: `README.md` for the user-facing tour; under
`docs/` — `docs/site-ideas-and-friction.md` for per-page design
history and ideas-not-yet-shipped (also the live source for
Practice-section planning since the quiz plan was retired
2026-07-19); `docs/codebase-issues.md` for open code-quality items
needing a decision; `docs/content-audit.md` for editorial findings
from the recurring content-accuracy audits.

## Stack

- **Eleventy (11ty) build pipeline.** `.eleventy.js` runs every
  `.html` under `html/` through Nunjucks and writes to `_site/`. YAML
  frontmatter + shared layout (see *Templating*). Static assets
  (`scripts/`, `styles.css`, `assets/`, `robots.txt`) passthrough;
  `sitemap.xml` generated (see *Sitemap*). Build is a few seconds for
  the whole site (the git-date filters dominate); no JS transpile or
  bundle step.
- **Templates under `html/_includes/`:**
  - `layouts/page.njk` — page shell. Composes `head.njk` /
    `schematic-bg.njk` / `nav.njk` / `footer.njk`; hosts the
    command-palette dialog markup and loads the site-wide scripts
    (`theme` / `units` / `search` / `nav-menu` / `flow-engine` /
    `schematic-bg` / `fullscreen-toggle`) at end-of-body; exposes
    `head` / `content` / `scripts` blocks. See *Templating*.
  - `head.njk` — `<head>`: meta, OG, favicons, fonts, `/styles.css`,
    units + theme before-paint bootstrap scripts.
  - `nav.njk` — top nav; `.active` driven by `nav` frontmatter.
    Guides / Tools / Simulators / Education / Practice carry **dropdown
    menus** of direct links (disclosure buttons populated from collections — see *Search
    index & nav menus*); the bar also holds the **command-palette
    search button** and, below 620px, a **hamburger** that collapses
    the link bar (`nav-menu.js`).
  - `footer.njk` — tagline + version string (re-exports
    `package.json.version` via `html/_data/site.js`).
  - `schematic-bg.njk` — gutter SVG collage. Hidden below 1240px
    (see *Gotchas*). Path-tagging conventions in the partial's
    header.
  - `nav-card.njk` — `navCard()` macro for the hero-frame nav-cards
    used across home / tools / education / simulators / practice
    landings. Params: `section`, `href`, `titleShort`, `titleFull`,
    `desc`, `pills[]`, optional `category`.
  - `related-links.njk` — `relatedLinks()` macro for end-of-page
    cross-links. Takes up to four optional groups: `tools`,
    `simulators`, `lessons`, `quizzes` — each `[{href, label}]` —
    plus an optional single `hub` `{href, label}` that renders first
    as a "Part of" column (the spoke→pillar link for a topic cluster;
    every BACnet page points back at `/bacnet/` this way). Per the
    forward-link convention, only link pages that exist.
- **Directory data:** `html/html.11tydata.js` overrides 11ty's
  pretty-URL permalink so `signal-scaling.html` lands at
  `_site/tools/signal-scaling.html`. Load-bearing for the
  `.html`-extension convention.
- **`html/styles.css`** — shared design system; every page links it
  via `head.njk`. Page-only rules stay inline via `{% block head %}`.
- **Shared scripts** in `html/scripts/` are **classic scripts** (no
  ES modules, no bundler) that expose globals like `Units`,
  `simulatePid`, `FlowEngine`, `Quiz` for page IIFEs to reach by
  name. Each file has a thorough header — **read it for the API**.
  `theme.js`, `units.js`, `search.js`, `nav-menu.js`,
  `flow-engine.js`, `schematic-bg.js`, and `fullscreen-toggle.js` are
  loaded site-wide from `layouts/page.njk` (theme + units toggles,
  command palette, nav dropdowns + mobile hamburger, gutter motifs,
  and fullscreen all appear on every page — units.js's DOM walker
  no-ops without `data-us` spans, and pages must not load it
  themselves); the rest load per-page inside
  `{% block scripts %}` *before* the page's inline `<script>`.
- **Worker:** `src/worker.js` — ES-module Worker. Handles
  `POST /api/contact` (validate, honeypot, Turnstile, Resend); falls
  through to `env.ASSETS.fetch(request)`. Secrets: `TURNSTILE_SECRET`,
  `RESEND_API_KEY` via `wrangler secret put …`. Turnstile *site* key
  lives in `contact.html`.
- **IndexNow:** `html/<key>.txt` (currently
  `5ceefff6b33f4eb68bbcad4e54ce30b1.txt`) is a **public ownership
  token**, NOT a `wrangler secret` — it's passthrough-copied to the
  site root (like `robots.txt`) so the IndexNow consortium can verify
  the domain. `.github/scripts/indexnow.mjs` + the `indexnow.yml`
  workflow ping Bing/Yandex/etc. (not Google) with changed canonical
  URLs on push to `main` — the **clean** (extensionless) form, stripped
  from the `.html` frontmatter the same way `sitemap.njk` does, so the
  submitter and the sitemap agree (submitting `.html` fed Bing the
  redirecting form and it indexed both — see the URL-conventions note).
  See *Workflow*.
- **Hosting:** Cloudflare Workers; auto-deploys ~60s on push to
  `main` (the dashboard runs `npm ci`, unshallows the clone, sets
  `STRICT_GIT_DATES=1`, then `npm run build` and serves `_site/`).
- **Asset caching:** the Worker serves `/assets/fonts/*` as immutable
  always (font files are immutable BY NAME — rename on change), and
  `/scripts/*` / `/styles.css` / `/assets/*` as immutable when the
  request carries the `?v={{ site.version }}` param the templates
  append. **The version bump is therefore load-bearing for cache
  busting**: shipping a styles.css or shared-script change without a
  bump leaves returning visitors on the old file (owner accepted, no
  CI guard — codebase-issues #84). Per-page `{% block scripts %}`
  references stay unversioned and keep the revalidate default.
- **Config:** `wrangler.jsonc` — `name`, `main`, `assets.directory`
  (`./_site`), `assets.binding` (`ASSETS`), `assets.html_handling`
  (`auto-trailing-slash`), and `compatibility_date` are all
  load-bearing.

### Templating

Every page in `html/` (other than partials under `_includes/`) has
this shape:

```nunjucks
---
title: Signal Scaling — controlsfreak.dev
description: mA / V analog signals to engineering units and back, plus a 2-point → slope/offset solver for y = mx + b.
canonical: https://controlsfreak.dev/tools/signal-scaling.html
nav: tools
---
{% extends "layouts/page.njk" %}

{% block head %}
    <style>
        /* Page-only CSS; `<style>` at col 4, inner rules at col 8. */
        .page-only { … }
    </style>
{% endblock %}

{% block content %}
<main>

    <div class="section-header">…</div>

    <div class="tool-card">…</div>

    <a class="back-link" href="/tools/">← All tools</a>

</main>
{% endblock %}

{% block scripts %}
<script src="/scripts/pid-engine.js"></script>
<script>
    // page logic
</script>
{% endblock %}
```

Frontmatter:

- `title` — verbatim for `<title>` and `og:title`.
- `description` — verbatim for `<meta name=description>` and
  `og:description`. **140–160 chars**, human-written, never reused —
  enforced by `descriptionLengthGuard` in `.eleventy.js` (fails the
  build on out-of-range). Renders HTML-autoescaped, so rephrase to
  avoid `'` and `<` if clean view-source matters.
- `canonical` — full URL with `.html` extension; used for `og:url`.
- `nav` — one of `home`, `guides`, `tools`, `simulators`, `education`,
  `practice`, `contact`; drives the `.active` marker. Omit on pages
  that don't fit.
- `keywords` — optional space- or comma-separated synonyms fed only to
  the search index (`search-index.njk`), never to `<meta>`. Use for
  field terms the title/description miss (e.g. signal-scaling →
  `4-20mA span slope offset`). Unconstrained by the description guard.
- `category` — **required on tools / education / practice pages**
  (not simulators); the cascading nav dropdown's category bucket. Must
  be a key in that section's `NAV_CATEGORIES` (`.eleventy.js`) — the
  `navCategoryGuard` collection fails the build otherwise. Keep it equal
  to the page's `navCard()` `category` on the section landing. See
  *Search index & nav menus → Cascading category dropdowns*.
- `flowGeometryLive` — optional, **education pages only**. Every
  `data-flow` element in a `nav: education` page must carry
  `data-flow-static="true"` (`flowStaticGuard` in `.eleventy.js` fails
  the build otherwise); `flowGeometryLive: true` is the opt-out.
  `data-flow-static` is an **assertion**, not a hint: *this path's `d`
  never changes after the engine samples it unless
  `FlowEngine.refreshPath()` is called for it.* Where that holds, the
  engine samples the path once instead of calling `getPointAtLength()`
  per particle per frame — worth ~50 → ~4 layouts per rendered frame on
  a lesson diagram. Where it doesn't, particles animate along **stale
  geometry**, which is silent and purely visual: counts, colours and
  movement all still assert green. So set the opt-out on a lesson whose
  flow path gets re-pathed without an immediate refresh (a page that
  refreshes in the same breath keeps the flag — that's
  `simulators/refrigerant-loop.html`). No lesson needs it today. The
  guard deliberately does **not** reach simulators: a markup scan can't
  see `simulators/hydronic-loop-builder.html`, which builds its paths
  from JS and is the standing page that must never carry the flag — so
  it would pass vacuously. On simulators the call stays a per-page
  judgement.
  The guard reads a page's own `rawInput`, which stops at an
  `{% include %}` tag — so it **also walks the working directory on disk**
  and holds every partial to the same rule, regardless of which page pulls
  one in. The scan root is `process.cwd()`, not `html/_includes`, because
  Nunjucks resolves an include name against **both** the includes dir and
  the working dir (`getFileSystemDirs()`), so a partial parked anywhere —
  `partials/foo.njk` at the repo root — reaches a lesson too. It scans
  every `.njk`, plus every `.html` that is *not* an 11ty page (outside
  `html/`, or inside `_includes`); `.html` pages stay with the
  `nav: education` arm, which is what keeps the scan from silently
  extending page scope to simulators. `node_modules` / `_site` / `.git` /
  `.claude` are skipped. A partial has no frontmatter and so no
  `flowGeometryLive`; the escape hatch there is an `EXEMPT_TEMPLATES` entry
  in `.eleventy.js` with a written reason, **keyed on the path relative to
  the scan root** — a basename key hands its pass to every file sharing the
  name. `html/_includes/schematic-bg.njk` is the only one, and for the
  opposite reason — flow-engine tables the gutter unconditionally, so its
  motifs need no opt-in. An exempt path that stops resolving to a real
  file fails the build rather than decaying into a silent pass, which
  doubles as the walk's anti-vacuity probe.
  **The guard's floor:** it can only see attributes that are LITERAL in a
  scanned file. JS-created paths, `_data`-supplied markup and a templated
  attribute name all pass. Read it as *no literal unflagged education flow
  path ships*, never as *no unflagged flow path ships*.

Blocks: `head` (optional — inline `<style>` or head-loaded script;
Turnstile on `contact.html` is the only current head-script example);
`content` (required); `scripts` (end-of-body — shared `<script src>`
first, then the page's inline `<script>`, since the inline code
references symbols the shared scripts export).

### Sitemap

`html/sitemap.njk` renders `_site/sitemap.xml` at build time from the
`sitemapPages` collection (every template with a `canonical`
frontmatter). `<lastmod>` comes from the `gitLastmod` filter
(`git log -1 --format=%cd --date=short`), falls back to build date.
A new page with `canonical` is picked up automatically — but **update
the `PAGES` array in `tests/pages.js`** (the shared page manifest that
`smoke.spec.js`, `responsive.spec.js` and `contrast-sweep.spec.js` all
`require`; the drift test
checks it against the built sitemap). CI uses `fetch-depth: 0` so dates
resolve.

### Search index & nav menus

`html/search-index.njk` renders `_site/search-index.json` at build
time (mirrors `sitemap.njk`) from the `searchPages` collection — one
`{title, description, url, section, keywords}` entry per page. The
command palette (`scripts/search.js`, `window.Palette`; opens on `/`
or Ctrl/⌘-K or the nav search button) fetches it once on first open.
The JSON has no `canonical` and is `eleventyExcludeFromCollections`,
so it stays out of `sitemapPages` and the `PAGES` drift test — same
status as `sitemap.xml`.

The nav dropdowns are built from `navGuides` / `navTools` /
`navSimulators` / `navEducation` / `navPractice` collections (each
`nav: <section>` minus the landing).
Two shared `.eleventy.js` filters serve both the index and the menus:
`cleanTitle` (strips the ` — controlsfreak.dev` suffix) and
`canonicalPath` (full canonical URL → root-relative `.html` href).
`scripts/nav-menu.js` (`window.NavMenu`) drives the disclosure
toggles + the mobile hamburger; the open mobile sheet caps its height
and scrolls internally (see *Gotchas*).

**Cascading category dropdowns.** Tools / Education / Practice render
**two-level** dropdowns: their pages sit under expandable category rows
(`_includes/nav-dropdown.njk` macro). The per-section category order +
labels live in the `NAV_CATEGORIES` const in `.eleventy.js`; the
`navGroups(collection, section)` filter buckets a nav collection into
`[{key, label, pages}]` in that order (empties dropped); each page
declares its bucket via a **`category` frontmatter** key. A
`navCategoryGuard` collection fails the build if any tools/education/
practice page lacks a `category` or carries one not in its section's
config. Guides and Simulators have no `NAV_CATEGORIES` entry, so they
render flat.
`nav-menu.js` layers a second disclosure level (`.nav-group-toggle` /
`.nav-submenu`, one category open at a time, Escape steps category →
section). **Category keys mirror the landing pages' `navCard()`
`category` values but are an independent source — keep the two in sync
(codebase-issues, two-source category drift).**

### Conventions

- **Anchor `href`s use explicit `.html` extensions** (e.g.
  `/tools/signal-scaling.html`, `/contact.html`); directory URLs (`/`,
  `/tools/`) stay clean. Works against the eleventy dev server,
  against `python -m http.server` serving `_site/`, and against the
  Worker (which **301**-redirects to the clean form). Asset references
  (`/styles.css`, `/scripts/…`) are absolute. The `html.11tydata.js`
  permalink override is what keeps this working — 11ty's pretty-URL
  default would break it. **Crawl-facing URLs render the clean,
  extensionless form**: `head.njk` passes `canonical`/`og:url` and every
  JSON-LD `url`/`@id` through the `cleanCanonical` filter (strips the
  trailing `.html`), and `sitemap.njk`'s `<loc>` does the same. The
  `canonical` frontmatter stays `.html` as the single source of truth;
  only the *rendered* crawl signals are clean. This reverses the
  2026-06-10 acceptance of the 307-through (codebase-issues #86): the
  2026-07 Search Console data showed Google indexing both the `.html` and
  clean form of every page — the documented revisit trigger — because a
  canonical pointing at a redirecting URL, while the clean 200 disclaimed
  itself, is self-contradictory. **The `.html` → clean redirect is a
  `301` (permanent), not a `307`** (`src/worker.js` upgrades the
  `html_handling` 307): a 307 is *temporary*, so search engines keep the
  source URL indexed — Bing surfaced this in Webmaster as "too many pages
  with identical titles / meta descriptions" (the `.html` and clean form
  of each page), and IndexNow (which pings Bing/Yandex, **not** Google)
  had been submitting the `.html` form, so we were actively feeding Bing
  the duplicate. The 301 consolidates it; the indexnow submitter now
  sends clean URLs too (2026-07-15 — codebase-issues #86 Bing follow-on).
  Internal anchors keep the `.html` form (they **301** fine within the
  site — one cached permanent hop); the on-site search index keeps
  `.html` too (client-side navigation, not a crawl signal).
- **Indentation: 4 spaces** everywhere — HTML, CSS, JS, Nunjucks
  template syntax.
- **ID naming: kebab-case site-wide.** Every `id="…"` is lowercase
  ASCII letters, digits, and hyphens. Hyphens separate words;
  digits attach without a hyphen when they're part of a token
  (`d1`, `pc-w1`, `bal-f4-sup-a`). No underscores, no camelCase.
  Per-page id prefixes match the widget-CSS prefixes already in
  `styles.css` (e.g. `pc-*` for pump-control, `bal-*` for balancing,
  `psy-*` for psychrometric) — grep `styles.css` for the full set
  when starting a new page. The same id rule applies to in-page JS
  string literals, template-literal id construction, CSS selectors
  inside `{% block head %}`, and `aria-labelledby` /
  `aria-describedby` / `for=` targets.
- **Vanilla JS only** — no libraries, no client-side frameworks. The
  11ty build templates the shared chrome and does nothing else; JS
  ships to the browser exactly as written, no transpile. Per-page
  logic in an inline `<script>` inside `{% block scripts %}`;
  genuinely shared JS goes in `html/scripts/` as a classic script.
- Prefer semantic HTML over div soup. Fast and accessible: no heavy
  media, no auto-play, no tracking or analytics.
- **Form-input labels are `<label for="…">`, not `<span>`.** In the
  property-sheet pattern, `<label class="ps-label" for="x">` pairs
  with `<input/select/textarea class="ps-input" id="x">`. Rows that
  label a *readout* (`<span class="ps-value">`) stay `<span>` —
  `for=` is only valid for form controls. For a button group, use
  `<div role="group" aria-labelledby="…">` with the caption carrying
  the matching `id=`; the caption's class matches the container's
  type peers (`field-label` inside `.field`, `ps-label` inside
  `.ps-row`). A `<label>` without `for=` or a wrapped control has no
  semantic meaning; implicit `<label><input> Text</label>` wraps are
  fine.
- **Skip-to-content link + `<main id="main">`.** Layout renders
  `<a href="#main" class="skip-link">` as the first body child; every
  `<main>` must carry `id="main"` or the link jumps nowhere.
  Section-header containers use `<div class="section-header">` +
  `<div class="section-line">`; `<section>` is reserved for actual
  document-outline sections, not visual chrome.
- **Heading hierarchy.** Exactly one `<h1>` per page — usually
  `.tool-card-title`; on landings without a tool-card, the eyebrow
  `.section-label` carries it instead. `.section-label` /
  `.ps-section-label` / `.subhead` are `<h2>`; callout cards and
  nested `.tool-card-title`s are `<h3>`. The label classes are
  element-agnostic and reset `margin: 0`.
- **Section-label eyebrow shape.** Deep pages (tools, simulators,
  education, practice) use the `<Section> · <Page Name>` shape in
  their `<span class="section-label">` — e.g. `Tools · Signal
  Scaling`, `Simulators · PID Tuner`, `Education · Hydronic Loops`.
  The section word matches the top-nav active section. Landings
  carry just the section word as the page's `<h1>` (`Tools`,
  `Simulators`, etc.). Avoid bare-category eyebrows (`Loops`,
  `Drives`, `Logic`) — they fragment the shape across sections and
  read as ad-hoc taxonomy.
- **`titleShort` discipline (nav cards).** Use the conventional
  in-trade abbreviation if one exists (`PID`, `VFD`, `BACnet`,
  `P-T`, `FB`); otherwise the full title. Drop trailing scaffolding
  words like `Calculator`, `Converter`, `Interface`, `Helper`. Don't
  invent informal shortenings (`Hyd`, `Sig`, `Econ`, `Ctrl`, `Reg`,
  `Net`, `Fn`) — those save keystrokes, not recognition. Length cap
  still applies (see *Design landmarks → Nav cards*).
- **Education page scope rule** (one question per page, forward-link
  for adjacent topics) lives in `site-ideas-and-friction.md` under
  "Education page scope — one question per page."
- **Forward-link convention:** anchor only if the target page exists
  today; if it's still a future page, write the topic as plain prose
  so a visitor doesn't click into a 404. Either way, the friction file
  tracks the topic as `[future: <page>]`.
- **New `cf_*` browser-storage keys update `privacy.html` in the same
  PR — `localStorage` AND `sessionStorage`.** The policy's
  on-device-storage paragraph reads as exhaustive, so it must be: the
  theme toggle's `cf_theme` shipped five days after the list was
  written and silently drifted (audit-2026-06 #52). The rule broadened
  beyond localStorage when the DDC Workbench's per-tab session snapshot
  landed (`cf_ddcw_ahu` / `cf_ddcw_fcu`, codebase-issues #275) — a
  reader asking what this site keeps on their device does not care
  which Web Storage area it sits in, and a rule that names only one is
  a rule with a hole in it. The two areas differ in LIFETIME, so the
  policy states each one's: localStorage persists between visits,
  sessionStorage dies with the tab. Say which, per key.
- **Metric worked-example rounding policy** (audit-2026-06 #53):
  metric temperatures in worked examples round to **one decimal**, and
  any stated delta/result is the arithmetic of the **displayed**
  operands — never the unrounded canonical value — so the taught math
  closes for a metric reader (12.8 / 15.6 / 2.8 reconciles; 13 / 16 /
  2.8 doesn't). Where a tool can replicate the example, state the
  result a metric user actually sees. Lesson prose dual-states with
  `data-us`/`data-metric` spans; quiz prompts (painted post-load, the
  walker doesn't reach them) use static parentheticals —
  `48 °F (8.9 °C)`. Engine-methodology formula lines with IP constants
  (0.240, CFM·60/v) stay IP-native with a "computes in IP, converts at
  the display boundary" caveat rather than a converted twin.
- **Placeholder-content markers:** unverified data in a shipped page
  carries an HTML comment
  `<!-- // user to verify <thing> — placeholder data, refine after review -->`,
  ideally above and below the block. The `//` prefix is the
  site-wide marker; pair with `TODO` / `FIXME` / `XXX` when grepping
  in sweeps.
- **Write claims that can't go stale** (the 2026-07-19 prose sweep's
  most valuable finding — same defect family as the de-enumeration
  items #160 / #170 / #180). The curriculum grows by *append*, so any
  sentence that fixes a chapter's size or its last page is a
  time bomb. Countable-but-uncounted phrasings ("its own page in this
  chapter", "the pages before it") survived every chapter expansion;
  **numbered and terminal ones went stale the moment a page landed** —
  "the last page of this chapter", "these six pages", "closes this
  chapter", "the chapter closer". One such claim propagated to six
  files before anyone caught it. **Prefer phrasing that cannot drift
  over phrasing that is merely correct today.** Concretely: don't
  assert a page is last or a chapter is closed; don't count pages,
  lessons, or files in prose when naming the set does the same work
  ("the capstone for the hydronics chapter", not "for the five
  hydronic lessons"). Counts that a build guard or a live render keeps
  honest are fine — but check that the guard actually covers the
  surface: `home-hero.spec.js`'s drift test asserts the Tools-by-
  Category pills and the four Browse cards keyed to `/tools/`,
  `/simulators/`, `/education/`, `/practice/`, and **nothing else**.
  The four topic-hub cards (`/bacnet/`, `/forced-air/`, `/hydronics/`,
  `/refrigeration/`) on the home page and the Guides landing are
  unguarded, and README prose is unguarded. Section landings and hub
  pages are the *one* place ordinals belong, since they enumerate the
  sequence anyway — that exemption is about **ordinals**, not counts
  or terminal claims, which stay in scope on a landing like anywhere
  else.
  **The test is falsifiability, not numerals** (owner decision,
  2026-07-20): a count is a violation only if *appending* can falsify
  it. So counting **specifically named** pages is fine — "the two
  pages are neighbors" survives any expansion once both are named and
  linked — while "work the five lessons in order" does not, and
  neither does a count of an *open-ended* set even when its current
  members are named ("two pages follow it" is falsified by a ninth
  lesson regardless of which two you then link). The landing/hub
  carve-out covers the **enumerated list itself** — the `hub-path`
  steps and the `Step N` nav-card pills, which are bare ordinals with
  no "of N", so an append leaves them incomplete rather than wrong.
  (Nothing enforces that a new lesson reaches its topic hub:
  `educationSequenceGuard` covers `_data/educationSequence.js` only,
  and `landing-completeness.spec.js` deliberately excludes the
  single-page topic hubs. Update the hub by hand.) The carve-out does
  **not** cover the intro prose above the list: hub `.landing-intro`
  copy is in scope and must name the sequence rather than count it.
  **`npm run prose-lint` finds candidates for this rule** (report-only;
  see *Local preview & tests*) — run it instead of hand-greping.
- **No coming-soon copy.** Never promise an unbuilt page in
  reader-facing prose — no "gets its own lesson", "coming later", "a
  future page covers this". Owner decision 2026-07-19: *"I don't like
  a 'coming soon' look to things. There's plenty of content, and if
  someone is looking for something specific when already on the site,
  the homepage makes it evident the site is ever expanding."* State
  the scope boundary and why the topic sits outside it, then move on —
  a page that may never ship must not leave a reader waiting. The
  roadmap lives in `site-ideas-and-friction.md` as a `[future:]`
  marker; that marker is the tracking mechanism, page copy is not.
  Complements the forward-link convention above: that one governs
  *anchors* (never link an unbuilt page), this one governs *promises*.
- **Avoid "plain English" / "plain-English" in copy** (owner
  preference, restored 2026-07-12 after it drifted out): **"Plain
  English" is the name of Schneider Electric's EBO / Continuum
  programming language**, so in building-controls copy the phrase
  reads as that vendor product rather than the everyday "clear
  wording" sense — a vendor-collision concern (ties into the
  *avoid exact vendor names* guardrail). It's therefore banned as
  generic filler. Describe explainers/lessons as **practical**
  ("practical explainers", "practical lessons"), and render "in
  plain English" as **"in plain terms"**. The phrase is allowed
  *only* as a deliberate, correct reference to the EBO language (or
  a pun on it), and only where it genuinely fits. Applies to page
  copy, meta descriptions, nav/search blurbs, and code comments
  alike; grep `plain.english` before shipping a content sweep.
- **"Deadband" has two legitimate senses — disambiguate wherever both
  are in play.** Not a ban: on any surface carrying both quantities, say
  which you mean. **House usage on the DDC Workbench:** `deadband` is
  the **per-setpoint hysteresis** — the AHU module ships heating 68 /
  cooling 72 / deadband 2, so cooling makes at CSP + db = 74 and breaks
  at CSP = 72 (the setpoint is the CUT-OUT). The live page and the
  module agree on those figures; the mockup still shows the older
  73 / 68 → makes 75, breaks 73 **by design** — it was deliberately
  frozen as the archival depiction record when #242 resolved
  (2026-07-30, the module won and the live page's prose was re-derived
  from it rather than copied), so read its numbers as historical, never
  as the house pair. Its *"Setpoints and the deadband"* paragraph is
  still the reference implementation for telling the two apart on one
  screen. The **separation between the heating and cooling
  setpoints** is named by layer: *setpoint gap* in code comments and the
  graphic's terse `SP DIFF` caption, spelled out as *the separation
  between the two setpoints* in running prose, where the short name was
  deliberately dropped (2026-07-28) because the lessons use bare *gap*
  for a deadband. On the workbench graphics that separation is likewise
  **not** called a *differential* — but **that ruling is page-local**:
  the zone sense of *differential* in the terminology paragraph of
  `education/comparators-and-deadband.html` (the canonical
  disambiguation, and the page to link) is correct, disclosing field
  variation rather than fixing one house name. The other sense is right
  in its own context too — in VAV the region between the mode ranges
  genuinely *is* the deadband (`education/vav-systems.html:696`, a model
  comment).
- **A function-block head is `TAG · Name` — and it must never grow the
  block.** Every entry in `fbe-engine.js`'s `BLOCKS` catalog carries a
  short **`tag`** (2–5 chars: `AI`, `BO`, `CONST`, `SR`, `SEL`,
  `A>B`…) alongside its full **`label`**. The `label` is the type's
  name and still drives the palette buttons and the inspector caption —
  **specs match palette buttons by `label` text**, exactly in
  `tests/fbe-wires.spec.js` (`textContent === label`) and
  `tests/fbe-block-names.spec.js` (`:text-is()`), by SUBSTRING in
  `tests/smoke.spec.js` (`{ hasText: … }`). The derived rule is the same
  under either matcher: a tag is added *beside* a label, never in place
  of one. The `tag` is what the block HEAD renders, because it is the
  only form that leaves room for a name. **A tag is ASCII-only** — the
  head is the one surface where a codepoint outside the bundled mono's
  subset drags in the visitor's system fallback face, so `ge` / `le` /
  `ne` tag `A>=B` / `A<=B` / `A!=B` while their labels keep `≥` / `≤` /
  `≠` (owner ruling 2026-08-01, codebase-issues #255). A block instance
  may carry an optional top-level **`name`**
  (`{ id, type, x, y, params, …, name? }`) saying what THIS block does
  on THIS sheet; the head then reads `TAG · Name`, with the `·` supplied
  by CSS (`.fbe-block-tag::after`) so it is not selectable. Its alt text
  is a SPACE, not empty: the tag and name spans are adjacent with no
  whitespace between them, so an empty alt would delete the only word
  boundary and a screen reader would hear "AIOAT". Engines that ignore
  alt text fall back to the bare `content` line and announce the dot —
  both branches are acceptable, an unbounded string is not. With no
  `name` the head renders `label` as
  a single text node, exactly as it did before names existed — which is
  what a block dragged off the palette looks like until the inspector's
  **Name** field is filled in. `name` is a **top-level block field,
  never a param**: `tests/fbe-engine.spec.js`'s literal sweep rejects
  any key in `params` the block type doesn't declare.
  **The head budget is 18 characters**, tag and separator included
  (8.5rem block, 1px borders inside the border-box, 0.62rem mono at
  0.04em tracking). It was *measured* to hold across root fonts
  12–32px — one term in it (the border) is px and doesn't scale, so
  the budget had no right to be root-font-invariant and the
  measurement is the only reason to believe it is. `.fbe-block-head`
  is `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
  and **that is load-bearing, not polish** — pins live in
  `.fbe-block-body` AFTER the head in DOM order, so a head that wraps
  to a second line moves every pin and wire endpoint below it, and the
  AHU workbench stacks ~89.72px blocks on a 90px row pitch — 0.28px of
  clearance, the tightest column on any workbench sheet (no FCU column
  comes within 5px, so the AHU is the binding case). Measured: a
  19-character head grew its block 72.97 → 88.84px before the rule. **On the workbench pages the
  names are NOT authored into the program literals** — `ddcw-shell.js`
  derives them from the point roster (`unit.points[].name`, the same
  string the statusbar chip and the off-program window print), because
  point id === FBE block id is the binding invariant and a second copy
  of the string is a drift generator. `tests/fbe-block-names.spec.js`
  pins both halves.
- **Damage-stakes scope note** (owner decision, 2026-07-11): any tool
  whose output, acted on directly, can damage equipment (burst coil,
  cracked heat exchanger, slugged compressor, burned motor, cooked
  transformer) ends its last `.tool-card` with a `p.ref-note` scope
  disclaimer. The recurring spine: the tool is a theory check, a
  learning aid, and a second opinion — the physical protections and
  the manufacturer's data govern. Wording is page-tailored, never
  boilerplate. On tabbed tools the note sits in a `.tool-body-row`
  *sibling* of the panes so every tab shows it. An existing stronger
  note satisfies the convention (electrical-quick-calc's permanent
  failure-callout). Current set: coil-freeze-risk, equipment-airflow,
  refrigerant-pt, air-mixing, economizer-ratio, affinity-laws,
  transformer-sizing, electrical-quick-calc, minimum-outdoor-air,
  duct-sizer, refrigerant-loop (simulator). Rationale + tiering in the friction file under
  "Damage-stakes scope notes."

### Gotchas

- **A page with no `canonical` is rendered by NO spec, so a green suite
  proves nothing about it.** `tests/pages.js` is the manifest
  `smoke.spec.js` / `responsive.spec.js` / `contrast-sweep.spec.js` all
  walk, and its drift test checks it against the built sitemap — which
  a `canonical`-less page is deliberately absent from. So the manifest
  cannot list one without failing that test, and the three sweeps never
  reach it: no load check, no console-error check, no phone-width
  overflow check, and **no blocking contrast sweep in either theme**.
  This is the standing shape of a **hidden page** (`noindex` + no
  `canonical`, plus `eleventyExcludeFromCollections` where the page
  must also stay out of the collections) — the AHU depiction mockup
  under `html/simulators/` carries all three, `styleguide.html` is
  `noindex`-only. (The two workbench unit pages graduated out of this
  set 2026-08-04.) Hidden pages are covered only because specs name
  their URLs directly. **Any new hidden page needs its own
  hand-written spec**; the omission from `tests/pages.js` is correct
  and must not be "fixed."
- **Inline `<style>` in `{% block head %}` is indented to column 4**
  to match the surrounding head context (which is itself indented to
  column 4 inside the rendered `<head>`). Inner CSS rules sit at
  column 8. The `vfd-mock.html`, `pump-control.html`, and
  `psychrometric-chart.html` heads are the canonical references.
- **SVG files in `html/assets/` must avoid `--` sequences inside
  `<!-- comments -->`.** ImageMagick's librsvg parser rejects them as
  invalid XML even though most browsers tolerate them. Write `bg` or
  "the bg color" rather than `--bg` when referring to a custom
  property in a comment.
- **Turnstile on `contact.html`.** Never goes idle, so Playwright
  navigations use `waitUntil: 'domcontentloaded'` (not `'networkidle'`).
  On sandboxed/CI localhost it can't reach `challenges.cloudflare.com`,
  produces unfilterable `pageerror` + `console.error` noise, and fires
  `onTsError` which disables the submit button. Callbacks
  (`window.onTsOk` / `onTsExpired` / `onTsError`) live on `window` so
  the widget's `data-callback` attrs can find them; they only flip the
  submit button's `disabled` state. `smoke.spec.js`'s `contact loads
  cleanly` check passes by racing in before Turnstile's failure
  surfaces — don't extend that `watchErrors` pattern to
  `contact.spec.js`. `contact.spec.js`'s "empty submit" route-blocks
  `challenges.cloudflare.com` before navigating so the click is
  deterministic (codebase-issues #55).
- **`aria-pressed` flicker on the units / theme toggles is accepted.**
  Nav buttons hard-code `aria-pressed="true"` for US / Dark at render
  time; the head bootstraps set `[data-units]` / `[data-theme]` before
  paint but can't reach the buttons (not parsed yet). `units.js` /
  `theme.js` re-sync `aria-pressed` at end-of-body. For a few tens of
  ms a screen reader on a metric / light device hears "US / Dark
  toggled on" while the page already displays metric / light. No clean
  fix. (Theme has one extra wrinkle: the *visual* active state is
  correct from first paint because `[data-theme]` drives the CSS — only
  the aria lags.)
- **Selectors targeting SVG geometry are attribute-only, not
  element-qualified.** Pipe runs mix `<line>` and `<path>`, so
  `path[id^="d1-return"]` silently drops half. Use `[id^="d1-return"]`
  (no element qualifier) in both `querySelectorAll` and CSS. Applies
  to `flow-engine.js` and any future SVG-id-pattern enumeration.
- **Converging-flow segments need to be drawn as two paths.** On a
  diverting-valve tee, one unified line can't animate both directions
  and would miscolor the still-hot half as return. Split into two
  segments (e.g. `lp-3wd-coil-to-tee` left half dashed/return walking
  L→R; `lp-3wd-bypass-to-tee` right half solid/supply walking R→L).
- **Gutter schematic-bg is hidden below 1240px viewport.** Don't
  use motifs to convey page semantics — they're chrome. The cutoff
  is deliberate: anything that small is a "field device" (laptop on
  a roof, phone on a ladder, tablet in a mech room), and load
  weight outranks decoration there. Print also drops them. The
  reduced-motion path keeps them visible but snaps them to drawn
  state instead of revealing.
- **`[data-sbg-stroke]` draw-in uses a single fixed dasharray, not
  per-path normalization.** The CSS rule sets
  `stroke-dasharray: 600; stroke-dashoffset: 600` on every
  `[data-sbg-stroke]` element (motif paths are ~200 user units at
  most). Three earlier approaches — `getTotalLength()`-driven
  `--sbg-len`, `pathLength="1"` on every element, and case-split
  `pathLength="1"` on safe straight elements only — all hit
  Chromium quirks. The last attempt (case-split on `<line>` /
  L-only `<path>`) failed in a particularly subtle way:
  `pathLength="1"` IS honored for `getTotalLength()` (the API
  returned the actual geometric length, 104px on a sample line),
  but NOT for `stroke-dasharray` computation, where Chromium
  treats `1` as 1 actual pixel and renders the path as ~50 tiny
  speckled dashes instead of one normalized dash. Permanent
  fallback: trust the fixed-600 + accept that short paths finish
  drawing in ~10% of the transition. See codebase-issues #69.
- **`FlowEngine.init()` is idempotent.** `schematic-bg.js` calls
  it once site-wide on DOMContentLoaded; page-level
  `FlowEngine.init()` calls in education pages with their own
  animations (hydronic-loops, load-piping, balancing) are
  effectively refreshes — the `frameStarted` guard prevents a
  second rAF loop and `poolsByEl` de-dupes pool registration.
  Pages with no `[data-flow]` / `[data-pulse]` elements can omit
  their own init entirely (it's still called once by
  `schematic-bg.js`).
- **Mobile nav sheet must `flex-wrap: nowrap` + cap its height.** The
  hamburger sheet (`.site-nav.nav-open .site-nav-links` ≤620px) is a
  flex column that inherits the desktop `flex-wrap: wrap`; once it has
  a `max-height`, a column taller than the cap **wraps into a second
  column off to the right** → sideways scroll. It also needs explicit
  `overflow-x: hidden` (setting only `overflow-y: auto` makes the
  browser compute `overflow-x` to `auto`) and long item names set to
  `white-space: normal`. The sheet is height-capped (`100dvh − 5rem`)
  with its own `overflow-y: auto` + `overscroll-behavior: contain`,
  and the body is scroll-locked while open, because `.site-nav` is
  `position: sticky` — a sheet taller than the viewport otherwise lets
  the page scroll behind the pinned bar (jumpy, unresponsive menu).
- **`input[type="range"]` is `width: 100%` globally** (`styles.css`).
  A page that wants a narrower slider must out-specify it — e.g. the
  home hero uses `.hseam-controls .hseam-sp { width: clamp(…) }`, not
  a bare `.hseam-sp`.

## Repo structure

- `html/` — source (input to 11ty). Pages, `_includes/` partials,
  `styles.css`, `scripts/`, `assets/`, `sitemap.njk`,
  `search-index.njk`, `robots.txt`, `html.11tydata.js`.
- `src/worker.js` — the Cloudflare Worker.
- `tests/` — Playwright specs: `smoke.spec.js` plus per-surface
  behavioral and engine-direct specs. The directory is the source of
  truth — enumerating them here drifted twice (audit-2026-06 docs
  sweep), so don't.
- `_site/` — build output (gitignored).
- `docs/` — the tracking markdowns (`site-ideas-and-friction.md`,
  `codebase-issues.md`, `content-audit.md`)
  plus archived audit artifacts. `docs/audits/<topic>/`
  collects the triage / decisions / implementation / findings docs
  from each completed audit cycle in one place (the durable record;
  each carries a disposition header). Spent one-shot prompt briefs
  are deleted once their deliverable ships — git history retains them.
- Root: `CLAUDE.md`, `README.md`, `.eleventy.js`,
  `wrangler.jsonc`, `package.json`.

## Design landmarks

Cross-cutting decisions. For per-page history and *why*, see
`site-ideas-and-friction.md`; for the user-facing tour, see
`README.md`. This section only carries what's load-bearing when
adding or moving pages.

- **Shared top nav:** Home / Guides / Tools / Simulators / Education /
  Practice / Contact. `nav` frontmatter drives `.active`. Guides /
  Tools / Simulators / Education / Practice each link to a hub landing
  and **drop down** to direct links — Tools / Education / Practice
  cascade through category rows, Guides / Simulators render flat
  (see *Search index & nav menus*). A
  command-palette **search** button (`/` or Ctrl/⌘-K) sits in the
  bar; below 620px the whole link bar collapses behind a
  **hamburger**, with the search icon kept in the top bar
  (`nav-menu.js`).
- **Page archetypes:**
  - *Tools* mostly use the **property-sheet layout** (`.ps-*` +
    `.ref-table-dense`). Two grid flavors:
    - `.tool-body-2col` + sibling `.tool-body-row` — Input | Output
      side-by-side, reference / worked-example flowing full-width
      beneath (the dominant pattern). The `.tool-body-row` can sit
      inside a `.tab-pane` (per-tab worked example) or as a sibling
      of all tab-panes inside `.tool-card` (shared reference) —
      `switchTab` in `ui.js` only toggles `.tab-pane` descendants.
    - `.tool-body-3col` — Input | Output | Reference side-by-side.
      Right for tools whose Reference column has comparable density
      (`psychrometric-chart`, `thermistor-calculator`).
      Codebase-issues #29 documents when *not* to reach for this.
  - *Simulators* (`/simulators/`) keep **custom stacked layouts** —
    a running model doesn't fit Input/Output/Reference.
  - *Education* pages use the **lesson layout** (`.tool-card` /
    `.tool-body`). **Prose sits above each diagram; the diagram is
    the visual capstone.**
  - *Practice* pages (`/practice/<slug>.html`) wrap the shared
    `Quiz` engine: a single `.tool-card` containing an empty
    `<div id="quiz"></div>`, with an inline IIFE that calls
    `Quiz.mount`. The question bank lives in a **separate data
    file** `html/_data/quizzes/<slug>.js` (`module.exports = [...]`),
    injected into the IIFE as
    `const questions = {{ quizzes['<slug>'] | safeScriptJson | safe }};`
    — kept out-of-line so two consumers read one source: the
    browser-side engine and the FAQPage JSON-LD emitter in
    `head.njk`. The engine owns every DOM node inside the mount
    target (settings row, progress, prompt, choices/numeric, reveal
    panel, results card). See `html/scripts/quiz-engine.js` for the
    schema + the Modbus Decoding page for canonical wiring.
- **Nav cards** are rendered by the `navCard()` macro in
  `_includes/nav-card.njk` (NOT hand-rolled) for all landings.
  Hero-frame shape with `.nav-card-titlebar` + `.nav-card-body` +
  `.nav-card-statusline`. Section drives an accent cascade
  (`.nav-card--{home,tools,education,simulators,practice}`). Trim
  `titleShort` enough to fit one line at the 4-col 1920px breakpoint
  — the title region clips with ellipsis, so over-long values
  truncate silently.
- **Tools landing** has a filter-chip row above the card grid;
  bump the All chip count when adding a tool, add a per-category
  chip if the new tool opens a new category. **Simulators landing**
  is the same grid minus chips — add chips back if it grows past
  ~6 entries. **Practice landing** is two H2 sections (Content
  Quizzes / Field Drills) with a topic chip row above; chips
  collapse both grids into a flat filtered view, `[All]` restores
  the sectioned layout. Drill cards use `category: 'field'` (no
  chip) so they hide under any topic-specific chip.
- **Legacy redirects.** When a page moves between sections, add the
  old URL to `LEGACY_TOOL_REDIRECTS` in `src/worker.js`. The Worker
  301s old paths to the new ones so inbound links keep working.

## Design system

The design system lives in `html/styles.css` — an "AX-sharp" BAS
workstation look: square corners (`--rail: 0`), hard 1px seams, flat
fills, no floating shadows, quiet nods to Niagara/SCADA UIs. It runs
in **two semantic registers** and **two themes**:

- **Software register = the default chrome** (cool blue-slate in dark /
  warm white in light) — carries the whole site: nav, tools, lessons,
  drills, landings. Green = brand/action, blue = data/selection.
- **Equipment register** — a warm device face + positive-mode
  dot-matrix character LCD (`.device` / `.lcd` / `.gauge.eq` /
  `.keypad` / `.led`, in the `EQUIPMENT REGISTER` block of
  `styles.css`), used ONLY where a page depicts real hardware (VFD/DMM
  sims, device widgets, the one readout in a software tool that shows a
  field value). Constant across both themes — a device is a device.

**Dark is the default theme** (`:root`); `[data-theme="light"]` is the
opt-in override (≈ the older look). A new tool/page should be built
from this vocabulary, not freshly styled — see `/styleguide.html` (a
noindex living reference that exercises both registers in both themes)
and read `styles.css` for the full catalog (terse, well-grouped with
section headers).

- **CSS custom properties** in `:root` are the theme — change colors
  there, not by hardcoding. `:root` holds the **dark** values (the
  default); `:root[data-theme="light"]` overrides them with the light
  set. Every software-register token carries both; the equipment
  `--dev-*` / `--lcd-*` tokens and `--rail` are defined once and stay
  constant across themes. Pages — including their inline
  `{% block head %}` styles — reference `var(--x)` and theme for free.
  **No `var(--x, #hex)` fallbacks**: `var(--x)` is
  the canonical form site-wide. If a property is ever removed from
  `:root` without removing its consumers, `var(--x)` returns empty and
  the consumer no-ops the color — louder failure mode than a stale
  fallback hex.
- **Theme toggle** mirrors the units toggle: a nav `.theme-btn` pill,
  `cf_theme` in localStorage, `[data-theme]` on `<html>`. A before-paint
  bootstrap in `head.njk` sets it from `cf_theme` (else
  `prefers-color-scheme`, default dark) and flips the `theme-color`
  meta; `/scripts/theme.js` — loaded **site-wide** from `page.njk` —
  owns the runtime and persistence. `units.js` is likewise site-wide
  (since the audit-2026-06 #2 fix; its DOM walker no-ops on pages
  without `data-us` spans) — pages must not load it themselves. The
  two pills share one CSS block (`UNITS + THEME TOGGLES`).
- **Contrast is guarded, and the guard blocks.**
  `tests/contrast-sweep.spec.js` walks every page in **both themes**,
  composites `opacity` up to `<html>`, resolves the effective
  background by walking ancestors, and asserts the WCAG AA floor for
  each ink source's computed size and weight. Four things count as
  text, because three of them are invisible to a `childNodes` scan: an
  element's own text nodes, `::before` / `::after` string content,
  an `<input>` / `<textarea>` VALUE, and `::placeholder`. It
  runs in `npm test` like any other spec, so a token retune or a new
  `color:` that lands under 4.5:1 fails CI instead of shipping. Two
  things to know when it goes red: **name the ink token, don't fudge
  the colour** — the `-ink` family (`--accent-ink`, `--blue-ink`,
  `--red-text`) exists because small text needs a deeper/brighter step
  than the base hue, per theme, and reaching for one of those is
  almost always the fix; and **a separate `opacity` on the text
  element counts** — that is what the sweep composites, and it is the
  blind spot that hid `.bit-idx` at 1.83:1 behind a declared 4.83:1.
  Genuine exceptions go in the spec's `ALLOWLIST` **with a measured
  ratio and a written reason**, never as a threshold change, and an
  entry that stops matching fails its own test so it cannot decay into
  a silent permanent exemption. Scope exclusions (SVG diagram text,
  the equipment register, decorative pseudo-element separators, and
  state-dependent markup no stylesheet can open — the spec force-opens
  the nav dropdowns, tab panes and command palette so those DO get
  measured) are documented in the spec header.
- **The `-fill` family is object paint, and it is never type.**
  `--amber-fill` / `--heat-fill` are the mirror of `-ink`: where an
  `-ink` token is a deeper/brighter step because small TEXT needs one,
  a `-fill` token is a brighter step because drawn GEOMETRY answers
  WCAG **1.4.11's 3:1 non-text floor**, not 1.4.3's 4.5:1 small-text
  floor. Legal in `fill` / `stroke` / `border-color` / `background`;
  **forbidden in `color:`** — and forbidden on an SVG `<text>`, where
  `fill:` *is* ink. `tests/fill-token-misuse.spec.js` blocks CI on
  both: a source scan that classifies every `var(--…-fill)` reference
  by the property it lands in (an unclassifiable reference fails too,
  so a new sink idiom can't slip past), plus a rendered arm for the
  SVG-text case and a test pinning the `@media print` block against
  the light one — a `-fill` token missing from print falls back to the
  **dark** value on paper. A twin exists **only** where the light-theme
  text floor pushed a hue out of its own name (dark yellow is olive,
  dark desaturated orange is brown); `--accent` and `--blue` are
  darkened just as hard and stay recognisably themselves, so they get
  none. **Don't add one for symmetry** — an alias token is a drift
  generator, the same asymmetry `-ink` has. Rationale and the measured
  before/after live in `codebase-issues.md` #230.
- **Focus indicators (`:focus-visible`)** live in one consolidated
  `FOCUS INDICATORS` block in `styles.css` (the browser default
  outline is suppressed elsewhere). When adding a new custom-styled
  interactive element with a `:hover` rule, add its selector to that
  block — don't scatter a one-off rule next to the `:hover`.
- **Touch-target floor** lives in one consolidated `TOUCH-TARGET
  FLOOR` block in `styles.css` (right after `FOCUS INDICATORS`),
  scoped to `@media (hover: none)`. On touch devices the chrome-level
  controls (`.site-nav-links a`, `.units-btn`, `.theme-btn`, `.tab-btn`,
  `.quiz-settings-select`, `.quiz-reset-best`) are padded to ≥44px
  (WCAG 2.5.5 / Apple HIG) while desktop pointer density stays
  compact. When adding a new *chrome-level* interactive (nav,
  toggle, tab, settings control), add its selector here rather than
  setting a per-component `min-height`. The form-control family
  (`.field` inputs + selects, `.ps-input`) and the measured-short
  buttons (`.copy-btn`, `.quiz-action`) are in the block too —
  successive measurement passes (audit-2026-06 #24, codebase-issues
  #164 / #172) disproved the old "already clear 44px" claims; only
  `.quiz-choice` and the multi-row textareas genuinely clear the
  floor natively. The block holds *shared-class* selectors only:
  widget internals with no shared class (the vfds source selects)
  get a page-local `(hover: none)` floor in their own
  `{% block head %}`.
- **Column-grid family** — `.tool-body-2col` / `.tool-body-3col` /
  `.tool-body-row` all live in `styles.css`. Each grid sits directly
  inside a `.tab-pane` or `.tool-card`, not inside a padded
  `.tool-body`; tabs above take `.tabs.tabs-flush`. Collapse
  breakpoints: 3col at ≤1000px, 2col at ≤900px. `.tool-body-row`
  stays full-width.
- **Widget chrome** (`.widget-*`) is shared in `styles.css`; widget
  INTERNALS (LCDs, keypads, pump-curve canvases, valve pills) stay
  in each page's `{% block head %}` since only that page uses them.
- **Tool-output status chrome** is two shared `styles.css` classes:
  `.failure-callout` (a single static warn callout with a left rule —
  one-shot invalid-input message) and `.status-pill` (a stateful
  `.ok` / `.warn` / `.error` verdict pill, shared by economizer-ratio /
  air-mixing / coil-sizing / refrigerant-pt). Reach for the pill when a
  tool reports a multi-state verdict, the callout for a single failure
  line. A page needing a near-pill variant (e.g. dew-point-calculator's
  amber `.edge` state) stacks page-local deltas on the shared base
  (`class="status-pill dew-verdict"`) rather than growing
  `.status-pill` a tool-specific state or forking the base.
- **Prose typography utility classes are element-qualified**
  (`p.bit-hint`, `p.pid-note`, `p.ref-note`, `p.tool-preamble`).
  The `p` is load-bearing — it ties `.tool-body p` on specificity
  and wins on cascade. Keep that shape when adding new small-text
  utility paragraphs.
- **Form labels are deliberately dimmer than their values** — the
  shared `label, .field-label` rule paints captions `--text-dim` while
  values render bright/accent. That inversion looks like a bug and
  isn't: quiet caption + loud value is the intended scan hierarchy, and
  it clears WCAG (measured `--text-dim` on `--surface`: **5.67:1** dark
  / **5.51:1** light, against a 4.5:1 small-text AA floor — the light
  figure follows the 2026-07-20 `--text-dim` retune; the
  `label, .field-label` comment in `styles.css` repeats this pair and
  `.fbe-block-tag`'s cites it, so recompute both if the token moves).
  Owner decision 2026-07-20, standing answer to codebase-issues #168:
  **working as designed — do not retune it site-wide** (it would flatten
  the hierarchy on all ~47 label-bearing pages). When a page's
  control block is dense enough that the captions genuinely *are* the
  scan target, override **page-locally** (lift color only; size, casing
  and values stay put) — `simulators/refrigerant-loop.html`'s
  `.rl-controls` / `.rl-presets` / `.rl-mode` block is the reference
  implementation.
- **Lesson prose rhythm is automatic — don't hand-set it.** The
  global reset zeroes every margin, so a `<p>` following another `<p>`
  renders flush. Education lessons used to compensate with inline
  `style="margin-top:1.25rem;"` on each follow-on paragraph, which
  drifted (13 of 40 lessons had run-together prose — codebase-issues
  #179). The shared `LESSON PROSE RHYTHM` rule in `styles.css` now
  owns it: `body.education-page .tool-body p + p:not([class])`. **New
  lessons write plain `<p>` and inherit the rhythm.** The scope is
  deliberately narrow — `.tool-body` alone doesn't scope (tools /
  simulators / practice share the class and tune their own spacing),
  and `:not([class])` keeps the rule off the prose utilities above,
  which own their spacing. Inline `margin-top` still out-specifies
  the rule, so the 201 redundant declarations the rule reached were
  stripped in the same arc (codebase-issues #190) and **1.25rem is
  now the single house rhythm** — the 51 declarations that sat at
  1.1rem (balancing, coil-selection, controls-commissioning,
  status-and-proof — three different chapters, not one) went with
  them, and so did the two lone one-offs at 0.9rem
  (`hydronic-loops.html`) and 1rem (`psychrometrics-basics.html`),
  owner decision 2026-07-20. **An inline `margin-top` that survives
  on a lesson paragraph is one of two cases** — check which before
  deleting one:
  1. *Deliberate and rule-reachable* — carries a comment saying why
     (see `pid-basics.html`'s callout examples at 0.6rem).
  2. *Outside the selector* — a first `<p>` in its container, a
     classed prose utility, or prose outside `.tool-body` — where
     the inline value is the only thing setting the gap.
- **`body.education-page` is the one *build-time* body class.**
  `layouts/page.njk` emits it from the `nav: education` frontmatter —
  the same key that drives the active nav link, so the styling scope
  can't drift from what the site calls an education page. Reach for
  this pattern when a rule must scope to one section: `.tool-body`
  and friends are shared across archetypes and won't do it. The other
  body classes (`palette-open`, `nav-sheet-open`,
  `has-fullscreen-tool`) are JS-toggled *runtime state*, not scoping
  hooks — don't read them as precedent for either job.

### JS patterns

- **Event wiring:** every page wraps its inline script in an IIFE
  (`(function () { … })();`) and binds events with
  `addEventListener` against element ids. Buttons that need to pass
  themselves to a handler go through an arrow wrapper:
  `btn.addEventListener('click', e => fn(arg, e.currentTarget))`.
  Where several buttons share a handler shape, prefer `data-*`
  attributes + a single `querySelectorAll` loop over per-button
  bindings. No inline `on*` attributes anywhere.
- **Declarations:** `const` by default; `let` only for genuinely
  reassigned bindings and for-loop counters. No `var` in shared
  scripts or page-inline IIFEs. The one intentional exception is
  the units-bootstrap one-liner in `_includes/head.njk`.
- **`'use strict';`** — first statement inside every page-inline
  IIFE and every shared classic script under `html/scripts/`.
  `src/worker.js` is an ES module (implicit-strict).
  `html/education/load-piping.html` is the one exception — no
  inline IIFE, just a top-level `FlowEngine.init()` call.
- **Validate-and-mute:** read inputs with `parseFloat`; if anything
  isn't finite (use `!isFinite(x)`, not `isNaN(x)` — `isFinite`
  also rejects `Infinity`, which matters on calcs like
  `1 / (max - min)` where equal bounds produce `Infinity`), set the
  result to `class="result-value muted"` with text `—` and clear
  the formula.
- **Tabs:** `.tab-btn` carries `data-tab="<name>"`, pane carries
  `id="tab-<name>"`, and one `querySelectorAll('[data-tab]')` pass
  wires them to `switchTab` (from `/scripts/ui.js`). `switchTab` is
  scoped to the clicked button's nearest `.tool-card`, so multiple
  tabbed tools on a page don't clear each other. See
  `tools/signal-scaling.html` for canonical wiring.
- **UI vocabulary:** **AI / AO** = analog input/output. Don't use
  "EU" — ambiguous; say "Eng. Units" / "Engineering Value" instead.

## Adding a new tool

1. Create `html/tools/<tool-name>.html` from the *Templating*
   skeleton. Pick a kebab-case page-id prefix that matches its
   widget-CSS prefix in `styles.css`. Give it a `category` frontmatter
   in the section's `NAV_CATEGORIES` set (`.eleventy.js`) — the build
   fails without it (`navCategoryGuard`). A genuinely new category means
   adding a `[key, label]` entry to `NAV_CATEGORIES.tools`.
2. Wrap page logic in an IIFE + `addEventListener` (see *JS patterns*);
   apply validate-and-mute on numeric inputs.
2b. If the tool's output, acted on directly, can damage equipment,
   end the last `.tool-card` with the damage-stakes scope note
   (see *Conventions*).
3. Add a `.nav-card` to the `.card-grid` on `tools/index.html` with the
   **same `category`** as the frontmatter (the two are independent
   sources — keep them equal). Bump the All chip count and add a
   per-category chip if the new tool opens a category not already
   represented.
3b. True up the **home page count surfaces** (`html/index.html`): the
   Browse-card `N Tools` pill, and — under *Tools by Category* — that
   category card's `N tools` pill + its name-listing `desc` (add a new
   category card if the tool is the first in a category not yet shown).
   The `home count pills stay in sync with the landings (drift guard)`
   test in `home-hero.spec.js` fails CI if any home pill falls out of
   sync with the `/tools/` chips or the section-landing card counts.
   A second guard in the same file — `home nav-card descs only name
   pages that still exist (drift guard)` — covers the **desc wording**:
   any run of 2+ Title-Case words inside a home nav-card desc must match
   some page's `title` frontmatter, so a renamed or retired page can't
   leave the home copy stale. It is a shape heuristic, so a Title-Case
   phrase that names no page (a section heading, a capitalized term of
   art) trips it too — that's expected; add the phrase to the spec's
   `NON_PAGE_NAMES` set rather than reword around it.
4. Add the page's URL to the `PAGES` array in `tests/pages.js` (the
   shared manifest `smoke.spec.js` + `responsive.spec.js` +
   `contrast-sweep.spec.js` require; the
   sitemap is automatic — see *Sitemap* — but the drift test fails
   until `PAGES` is updated).
5. Retire the page's `[future: …]` markers: grep
   `site-ideas-and-friction.md` for the new page's filename and
   annotate each hit `*(shipped YYYY-MM-DD)*` — nine markers went
   stale between audits because shipping skipped this step
   (audit-2026-06 docs sweep).
5b. Add the page's bullet to `README.md`'s tour (Tools / Simulators /
   Education list, or the Practice groups + counts). The tour reads
   as exhaustive, and this step wasn't in the checklist — which is
   how the README drifted 24 page bullets (plus the Practice counts:
   8 quizzes and 3 drills unlisted) behind by 2026-07-01.
6. Consider bumping the home-page hero's `Latest: <name>` badge
   to point at the new tool — `html/index.html`, the
   `<p class="hero-latest">` paragraph (~L382). Editorial pick; skip
   on small revisions.
7. Bump `package.json.version` when shipping something notable; the
   footer reads it via `html/_data/site.js`. A new tool is a minor
   bump (`1.X.0`); a bug fix is a patch bump (`1.X.Y`). Bump with
   `npm version <minor|patch> --no-git-tag-version` — it updates
   `package-lock.json`'s `version` fields in the same step, so the
   two files can't drift (codebase-issues #156).

**Adding a new simulator** follows the same steps under
`html/simulators/` instead, with `nav: simulators` in the
frontmatter and the new `.nav-card` added to
`simulators/index.html`. No filter chips to recount there.

**Adding a new education lesson** follows the same steps under
`html/education/` (`nav: education` + a `category` in
`NAV_CATEGORIES.education`); **additionally, add the page's URL to the
`order` array in `html/_data/educationSequence.js`** (kept in the same
order as the `education/index.html` grid) — `educationSequenceGuard`
fails the build if a `nav: education` page is missing from it
(codebase-issues #93, #157). **Follow-on paragraph spacing is
automatic** — the shared lesson-prose-rhythm rule handles it off the
`nav: education` frontmatter, so body prose is plain `<p>` with no
inline `margin-top` (see *Design system*). **A lesson with an animated
diagram puts `data-flow-static="true"` next to every `data-flow`** —
the build fails without it (`flowStaticGuard`); read the assertion it
makes under *Templating → `flowGeometryLive`* before reaching for the
opt-out.

**Adding a new quiz / drill** follows a similar shape under
`html/practice/`:

1. Create `html/practice/<slug>.html`. Frontmatter `nav: practice` +
   a `category` in `NAV_CATEGORIES.practice` (`field` for a drill with
   no topic; the build fails without one — `navCategoryGuard`);
   `.tool-card` with the page's `<h1 class="tool-card-title">` +
   a short `.page-intro` + an empty `<div id="quiz"></div>`. See
   `practice/modbus-decoding.html` for canonical wiring.
2. Put the question bank in its own data file
   `html/_data/quizzes/<slug>.js` (`module.exports = [ … ]`), NOT
   inline — `head.njk`'s FAQPage JSON-LD reads the same source via
   `quizzes['<slug>']`, so the page and the structured data can't
   drift. `{% block scripts %}` loads `/scripts/quiz-engine.js`,
   then an inline IIFE pulls the bank in with
   `const questions = {{ quizzes['<slug>'] | safeScriptJson | safe }};`
   and calls
   `Quiz.mount('#quiz', questions, { slug: '<slug>', title: '…' })`.
   The slug **must be kebab-case** (engine validates), **must match
   the page's filename** (the JSON-LD keys off `page.fileSlug`), and
   is the namespace for `cf_quiz_<slug>_*` localStorage keys.
3. Question schema lives in `quiz-engine.js`'s header — `type` is
   one of `mcq` / `tf` / `gotcha` / `numeric`; shared
   `id` / `prompt` / `explain` / `learnMore` / `tags` / `figure`
   across all types. `id` is kebab-case and stable across edits.
   **A question that needs a diagram uses `figure`, never an SVG
   inside `prompt`** — `prompt` is stripped to text by the
   Review/miss table *and* by `head.njk`'s FAQPage JSON-LD, so an
   inline SVG publishes every `<title>` / `<desc>` / `<text>` node
   as structured data. `figure` is the kebab-case **element id** of
   an `<svg class="… hidden" id="…">` in a static figure bank on the
   page; the engine clones it into the `.quiz-figure` slot and mount
   fails loudly if the id doesn't resolve. Ids in the clone are
   **renamed** with a per-render prefix and every internal reference
   (`url(#…)`, `<use href="#…">`) is rewritten to match, so the clone
   stays self-contained without colliding with the live source —
   stripping the ids instead silently blanks markers, gradients and
   patterns. The figure must name itself natively (`role="img"` +
   `<title>` / `<desc>`); `aria-labelledby` / `aria-describedby` on a
   figure **fails mount** — note this is the opposite of the
   education-page SVG idiom, so a lesson SVG needs its labelling
   converted when it moves into a figure bank.

   **Owner decision (2026-07-20) — settled: describe the topology
   fully.** A drill figure's `<desc>` states the topology and the live
   values completely, in the drawing's own neutral register, and
   **never names the fault or states the verdict** — that lives in
   `explain`, which every reader gets after answering.

   This was raised 2026-07-19 as an open question, on the argument that
   describing a red-herring branch completely describes it away, and
   that **WCAG 1.1.1's Test exception** — non-text content that is a
   test may carry only *descriptive identification* — licensed a short
   `<desc>` instead. The owner ruled for the full description on trade
   grounds: *someone visually impaired who is function-block
   programming is best served by hearing the longer description and
   mapping it out in their head.* Note the Test exception is
   **permissive, not prescriptive** — it says a test *may* carry only
   descriptive identification, so the fuller `<desc>` is a choice
   inside the standard, not a departure from it.

   The apparent self-contradiction dissolves in practice: the `<desc>`
   describes **what is drawn**, not **what is wrong with it**. "A NOT
   block sits between the freeze stat and the AND" is the same
   information a sighted reader gets from the picture — both still have
   to know that placement is wrong. Write each `<desc>` as if it were
   the only way you could see the diagram, then re-read it hunting for
   a leaked verdict.
4. Add a `navCard` (section `'practice'`) to the appropriate H2
   section on `html/practice/index.html` — *Content Quizzes* if
   every question maps to an existing page, *Field Drills* if the
   scope is broader. Use `category: 'modbus'` (or the topic), or
   `category: 'field'` for drills with no specific topic. Bump the
   All chip count; add a per-topic chip if the new entry opens a
   topic not already represented.
5. Cross-link from the paired Education page via the
   `relatedLinks({...})` call — add a `quizzes:` group. If the quiz
   pairs 1:1 with a single lesson, also set `pairedQuiz:` (full URL)
   on the lesson's frontmatter and `pairedLesson:` (full URL) on the
   quiz's frontmatter — the head template emits reciprocal `hasPart`
   / `isPartOf` JSON-LD off those keys. Field drills with broader
   scope (multiple paired lessons) omit both — no single parent.
6. Add the new URL to `PAGES` in `tests/pages.js` (the shared manifest
   `smoke.spec.js` + `responsive.spec.js` + `contrast-sweep.spec.js`
   require); consider a
   behavioral spot-check for any new format the engine hasn't
   exercised yet.
7. Add the quiz/drill to `README.md`'s Practice groups and bump its
   count sentence (same reason as tools step 5b — the tour is
   exhaustive).
8. Same `Latest:` badge + `package.json.version` rules as tools.

## Git conventions

Branch names, commit subjects, commit bodies, and PR descriptions
follow a fixed shape so history stays scannable in `git log --oneline`
and on GitHub. The `## Workflow` section below covers *when* each step
happens; this section covers *what those things should look like*.

### Branch names

`<type>/<slug>`, lowercase kebab-case, 3–6 word slug. Types:

- `issue-NN/<slug>` — one item from `codebase-issues.md` (e.g.
  `issue-15/pid-chart-extract`). The issue number is load-bearing
  for the sweep workflow.
- `fix/<slug>` — a bug fix not tracked in codebase-issues.
- `feat/<slug>` — a new tool, page, or visible feature.
- `refactor/<slug>` — behavior-preserving change.
- `docs/<slug>` — `*.md`, the friction file, comment-only sweeps.
- `chore/<slug>` — deps, build config, `.gitignore`, scaffolding.
- `test/<slug>` — test-only changes.

One issue or topic per branch; don't bundle.

### Commit subjects

Hybrid: lowercase, colon-separated, imperative mood, ≤72 chars,
optional `(#NN)` suffix when the commit closes a codebase-issues
item.

- **Code changes** use a *semantic-area* prefix naming the code area
  touched (e.g. `pid:`, `bacnet:`, `worker:`, `psychrometric:`,
  `flow-engine:`, `units:`). Cross-cutting concerns get their own
  (`a11y:`, `tests:`). Grep `git log --oneline` for the in-use set.
- **Non-code changes** use a *Conventional Commits type*: `docs:`,
  `chore:`, `test:`.

Examples:

    pid: extract drawPidChart + delta formatter to /scripts/pid-chart.js
    a11y: associate every form-input label with its control (#12)
    worker: defense-in-depth on /api/contact (#13)
    docs: catch CLAUDE.md drift after PR #8

When a change touches both code and docs in the same logical unit,
use the code-area prefix; the docs update is part of that scope.

### Commit bodies

Every non-trivial commit has a body covering two things:

1. **Why** — the motivating problem, constraint, or decision. Subject
   states *what*; body explains *why now*. The diff covers the rest.
2. **What changed, per file** — when the commit touches 3+ files,
   bullet `path/to/file.ext` + one-line note. Tells the reviewer
   where to focus before opening the diff.

Body wraps at 72 columns. Footer carries `Co-Authored-By:` when
Claude collaborated, and an optional
`Refs: codebase-issues#NN` / `Closes codebase-issues#NN` line.

Trivial commits (typo, punctuation, single-line CSS tweak) can ship
subject-only.

### PR descriptions

Every PR carries three required sections:

```markdown
## Summary

<1–3 sentences a stranger could read with no prior context — area,
change, and the why in one breath.>

## Changes

<Bulleted list of what shipped, grouped by file or logical chunk.
The human-readable diff index for reviewers.>

## Test plan

<Markdown checkbox list. `[x]` = done; `[ ]` = pending.>
```

Optional sections when relevant: `## Why now` (non-obvious timing),
`## Risk / rollback` (blast radius, revert procedure), `## Out-of-band`
(changes outside the PR diff — memory writes, dashboard config flips).

PR titles use commit-subject style. For multi-commit PRs the title is
thematic (area + umbrella change); individual commit subjects carry
per-step detail.

### Commits per PR

As many commits as make natural review chunks. A two-step extraction
ships as two commits; a doc fix caught during review ships as a third
on the same PR. Each commit body follows the why + what-per-file rule
independently. Don't squash mid-development (granularity helps
`git bisect` and makes review chunks visible), but don't fragment
unnaturally either — a typo fix doesn't need its own commit unless
it's genuinely separate from the work.

## Workflow

The standard loop is branch → edit → commit → push → open PR (shapes
under *Git conventions*). Stage specific file lists, not
`git add -A` / `git add .`.

- **Merge approval is scoped to the LIVE site** (owner amendment,
  2026-07-29). Where a change reaches a page a visitor can land on, the
  old rule stands: `gh pr merge` only on explicit request ("merge it,"
  "go ahead and merge"), the user reviews on GitHub. Everywhere else the
  default **flips from ask to merge** — a mergeable PR left open is now
  the thing to avoid (*"I don't want PRs to pile up … I just want our
  git work as clean as possible"*). **`sitemap.xml` is the operational
  PROXY, not the definition.** It is generated from `canonical`
  frontmatter, so it enumerates what is *indexed*, while everything in
  `_site/` is *served* — read it as the definition and you classify the
  404 page as private. The real test is whether a visitor can land on a
  page **without already knowing its URL**: via the nav, the search
  index, the sitemap, or the not-found handler. **Derive the
  `canonical`-less set, never cite a count for it** — a new hidden page
  joins it silently, and this file has already carried a stale number
  once. `npm run build`, then diff `_site/**/*.html` against
  `_site/sitemap.xml`'s `<loc>`s; every page the diff returns is a
  candidate, and `html/404.html` is the one it answers wrong about (see
  *Needs approval*).
  - *Merge freely:* the **genuinely unreachable hidden pages'** own HTML
    — as of 2026-08-04 (Phase 8 graduated both workbench unit pages)
    that is `styleguide.html` plus `simulators/ddc-workbench-ahu-mockup.html`.
    ⚠️ **The test is not "no inbound anchor anywhere in `html/`"** — the
    correct test is *no inbound anchor from a page a visitor can land
    on* (the unit-selector era proved the difference: the then-hidden
    workbench pages cross-anchored each other and stayed hidden). It
    holds for both remaining pages — nothing anchors either, and
    `searchPages` filters on `canonical` too, so they are absent from
    the palette as well as the sitemap. A script ONLY hidden pages load
    (today: none — the mockup and the styleguide load only the
    site-wide layout set, no per-page scripts; `ddcw-shell.js` and both
    unit scripts became live-page scripts at graduation — verify with a
    `grep` over
    `html/`, since a live page picking one up is exactly the trap
    below); anything under `tests/` or `docs/`; plus `CLAUDE.md` and
    `README.md`.
  - *Needs approval:* any page carrying a `canonical`, **plus
    `html/404.html`** — `wrangler.jsonc` sets
    `not_found_handling: "404-page"`, so it is served for every
    unmatched URL and is live-facing despite carrying the exact
    hidden-page frontmatter shape *Gotchas* describes. This is the one
    page the proxy answers wrong about. Also `styles.css`, **any script
    a live page loads** (site-wide from `layouts/page.njk` *or*
    per-page — see the trap below), anything in `_includes/` or
    `html/_data/` (a quiz bank or an enum table is not itself a page,
    but it renders into one — that is the whole basis of #241),
    `.eleventy.js`, `src/worker.js`, `wrangler.jsonc`, and a
    `package.json` version bump.
  - ⚠️ **The trap is SHARED code — "the PR is about a hidden page" is
    NOT the test.** PR #452 was about the hidden AHU but modified
    `html/scripts/psychro-engine.js`, which **eight pages load and
    seven of those are live**: even a purely additive function ships
    new bytes to all seven, and a parse error there breaks all seven.
  - The boundary **moved at graduation** (Phase 8, 2026-08-04): the
    workbench pages gained canonicals, entered the sitemap, and every
    merge-freely row flipped for them and their scripts. The rule keeps
    governing any future hidden page the same way.
- **Log caught issues.** Code-quality issues noticed in passing —
  *even if unrelated to the current task* — get appended to
  `codebase-issues.md` under *Open*. Don't silently fix inline
  (scope creep) or drop on the floor; mention the appended entry
  to the user.
- **Sweep on convention shifts.** When a convention changes (new
  CLAUDE.md bullet, new shared rule in `styles.css`, new `:root`
  token, renamed id pattern, frontmatter-shape adjustment, new
  shared script) *or* when a new page lands, grep site-wide before
  closing the PR. Two directions:
  - *Convention → consumers.* Grep existing pages for the old
    pattern and update in the same PR.
  - *New page → conventions.* Re-run the *Adding a new tool*
    checklist against it before merging.

  Large sweeps log under `codebase-issues.md` rather than skip.
- **Name the payer for every reverse cross-link.** When parallel
  lanes will cross-link each other's pages, the lane spec must say
  **which lane pays each reverse link**, decided before the second
  lane opens. Otherwise the debt gets recorded in a PR body and
  evaporates the moment that PR merges — nothing carries it forward.
  The 2026-07-18 arc shipped two chapters under identical conventions
  with opposite outcomes: Signals' `relatedLinks()` reciprocity was
  fully paid, Programming's was **entirely unpaid** (four lessons
  naming each other in prose with zero sibling links). The difference
  was structural, not carelessness — Signals happened to have a lane
  that merged second and retro-paid the anchors; Programming had none.
- **PR bodies are not a reliable debt ledger, in either direction.**
  Roughly a third of the debt itemized in that arc's PR bodies was
  phantom — already paid during conflict resolution, bodies never
  amended — while real debt went unrecorded. Reconcile against the
  built site, never against the prose in a merged PR.

CI on every PR runs `npm test` (`.github/workflows/test.yml`);
Cloudflare Workers Build deploys `_site/` ~60s after merge. A separate
`.github/workflows/indexnow.yml` fires on push to `main` and submits the
merge's changed canonical URLs — in the **clean** (extensionless) form,
matching the sitemap — to IndexNow (no secrets — the key is the
public `html/<key>.txt`). Run it by hand with `npm run indexnow`
(changed since last commit) or `npm run indexnow -- --all` (full
re-submit); add `--dry-run` to print the URL list without POSTing.

## Local preview & tests

- **Preview:** `npm run dev` (`eleventy --serve --port=8000`, live
  reload).
- **LAN preview of the built site:** `npm run publish:preview` (add
  `-- --build` for a clean rebuild first) rsyncs `_site/` into the
  home server's hub docroot, where a rootless Caddy serves it at
  `https://cfdev.home.arpa/`. **Owner's box only** — it is a home-lab
  convenience, not part of the deploy path, and it no-ops nowhere
  else (the destination guard refuses any path not ending
  `/caddy/dashboard/cfdev`). It publishes a **snapshot, not a
  server**: nothing watches, so every build you want to see needs
  another publish. It also can't exercise the Worker — clean-URL
  301s, the legacy tool redirects and `POST /api/contact` are all
  Worker behaviour and simply absent. `_built.txt` at the docroot
  carries the publish time plus git provenance (commit, ref, dirty
  flag, drift vs `origin/main`), which is what distinguishes a stale
  preview from one built off unmerged work. Rationale, SELinux traps
  and the Caddy vhost live in the box's own (un-version-controlled)
  `~/caddy/CLAUDE.md` §*Site preview (Controls Freak)*; the script
  header in `.github/scripts/publish-preview.mjs` is the durable
  copy.
- **Tests:** `npm test` (Chromium only). `playwright.config.js` has
  a `webServer` block that builds and serves `_site/`, so a fresh
  checkout needs no second terminal; a running `npm run dev` on
  port 8000 is reused. Specs in `tests/`: `smoke.spec.js` (every
  page: 200, title, nav, no console errors, behavior spot-checks)
  plus per-surface specs — engine-direct ones run pure-Node inside
  the Playwright workers (the `psychro-engine.spec.js` vm pattern),
  the rest drive the built site. The directory is the source of
  truth for the list. Don't restructure scaffolding without being
  asked.
- **CI:** `.github/workflows/test.yml` runs the same `npm test` on
  every PR to `main`. Deploy stays with Cloudflare Workers Build —
  CI gates the PR, it doesn't deploy.
- **Eyeball a change:** `const { chromium } = require('@playwright/test')`
  + `page.screenshot({ path, fullPage: true })`. For `contact.html`
  use `waitUntil: 'domcontentloaded'`. Rebuild (`npm run build`)
  before screenshotting `_site/` unless `npm run dev` is running.
- **Stale-claim prose lint:** `npm run prose-lint` reports prose that
  fixes a chapter's size or names its last page — the *Write claims
  that can't go stale* convention above, made greppable. Eight rules
  over four classes (`terminal` / `count` / `ordinal` / `positional`),
  with anchor-wrapped matches downgraded a step.
  **The report is split into two sections that are never summed**
  (owner ruling 2026-07-20): **append-fragile** — stale when a lesson
  is added to the END of a chapter (terminal claims, counted sets,
  ordinal *runs*), ranked HIGH, the class the convention is actually
  about — versus **insertion-fragile** — stale only when a lesson is
  inserted MID-SEQUENCE (the `next` / positional family — `next`
  *only*; "last in this chapter" is a terminal claim and files under
  append — plus lone ordinal *references*), ranked MEDIUM. The
  `ordinal` class is the one that spans both sections: several
  ordinals enumerating a chapter go incomplete on append, while a lone
  "from page 2" survives one and shifts only on insertion, so they are
  two rules split by proximity (owner ruling 2026-07-20 — one label
  must never cover two failure modes). Both are real; they measure
  different risks,
  so there is deliberately **no combined headline number** in any
  output mode. One label covering two failure modes is what made the
  two earlier formulations of this check unarguable. The append total
  is a **ceiling** — the script header records the known misfiles in
  it, since a PR body is not a durable ledger.
  **Report-only and deliberately NOT in `test.yml`** — it is a
  candidates-for-review list, not a gate, and "the last page" is a
  homograph the lint cannot disambiguate (backward reference vs
  terminal claim), so expect to dismiss some findings by reading the
  sentence. `--json` for machine-readable output, `--files` for the
  scanned file list. Script: `.github/scripts/prose-lint.mjs`; its
  header pins every formulation choice (vocabulary, masking, path
  exclusions) with the reasoning, so disagree with a specific line
  rather than re-deriving the pattern — two earlier hand-rolled
  formulations of this exact check produced confident numbers that
  were never reproducible.
- **Metric-conversion guard — two arms, and only one of them gates.**
  *Arm 1* is `tests/metric-spans.spec.js`, a **blocking** spec in `npm test`:
  it walks every `data-us`/`data-metric` span **and** every
  `48 °F (8.9 °C)` parenthetical under `html/` (the quiz-bank notation, which
  `quiz-banks.spec.js` is shape-only about) and fails on any °F → °C figure
  that is neither a valid absolute nor a valid delta conversion. *Arm 2* is
  `npm run metric-lint` — **report-only, deliberately NOT in `test.yml`**,
  the same standing as `prose-lint` — which asks the question arm 1
  structurally cannot: does a stated delta agree with the metric operands its
  own passage paints? **Arm 1 would not have caught the defect that motivated
  it** — `1.1 °C` for `2 °F` is a *valid* delta, and is wrong only against
  the 23.9 / 22.7 painted two sentences away (content-audit #57,
  codebase-issues #232). Arm 1 closes *the conversion is outright wrong*;
  arm 2 is the only thing that reaches *the conversion is valid but
  contradicts the page's own numbers*, and it is advisory — measured at two
  of the three known instances, with false positives expected. Both read one
  parser, `tests/metric-spans.js`, whose header pins the tolerance (measured
  off the corpus, not picked), the entity/sign normalisation (load-bearing —
  folding an en dash to a hyphen mis-signs every range), and the scan scope.
  Arm 1's `ALLOWLIST` follows the `contrast-sweep.spec.js` convention: a
  written reason per entry, and an entry that stops matching fails its own
  test.
- **Diagram audit pass:** `npm run screenshots` (with a server on
  :8000) dumps every diagram-class SVG across the sitemap to
  `/tmp/audit-<page>-<id>.png`. Use it as the starting point for any
  visual review of diagrams — coordinate math on the source misses
  real overlaps that font rendering surfaces. Script:
  `tests/screenshot-diagrams.mjs`; add a class to its
  `DIAGRAM_SELECTOR` when a new diagram family lands.
- **Idle-animation profiler:** `npm run perf-profile` reports what
  each page costs while the user does nothing — frame rate, CPU
  relative to a no-animation control page, layout/style work per
  rendered frame, and a population liveness count. **Report-only and
  deliberately NOT in `test.yml`** (owner ruling 2026-07-24: CPU
  numbers are machine-dependent and a threshold over them flakes; a
  muted gate is worse than none). Run it **before merging any PR that
  touches an animation loop, a rAF/setInterval gate, `schematic-bg`,
  or an animation rule in `styles.css`** — idle cost has regressed
  silently four times through a green `npm test` (codebase-issues
  #70 / #109 / #110 / #113, history in #200). Needs a server on the
  built site; 8000-8099 are occupied on this box, so:
  `npm run build && python3 -m http.server 9401 --directory _site &`
  then `CF_BASE_URL=http://127.0.0.1:9401 npm run perf-profile`.
  Flags: `--json`, `--only=<id>`, `--reps=N`, `--viewport=WxH`,
  `--list`. Script: `tests/perf-profile.mjs`; its header pins the
  measured baseline, how each tolerance was derived, and the caveats —
  above all that **CPU% INVERTS on a saturated page** (removing work
  frees the thread to render the frames it was dropping, so CPU rises
  while fps improves), which is why fps and not CPU is the ranking
  signal. It walks a **hand-picked manifest, not the sitemap** —
  originally because `ddc-workbench-fcu` was sitemap-absent (hidden)
  and a sitemap walker would have skipped the very page the profiler
  exists for; the workbench pages joined the sitemap at graduation
  (2026-08-04), and the manifest stays hand-picked for its curated
  rows + control page.
- **Fedora Chromium deps:** Playwright's bundled headless Chromium
  isn't statically linked, and `npx playwright install-deps` only
  knows Debian/Ubuntu. On Fedora 44 the runtime set is:
  `sudo dnf install atk at-spi2-atk alsa-lib mesa-libgbm
  libXcomposite libXdamage libXfixes libXrandr`. If `npm test`,
  `npm run screenshots`, or `npm run perf-profile` fails with
  `error while loading shared libraries`, this is the missing piece.

## About the user

- Background in building automation / controls programming (BACnet,
  Modbus TCP, Niagara, EBO); Northeast U.S.
- Solid IP networking fundamentals; learning software dev workflows;
  side project for "exploring vibe coding."
- Comfortable in a terminal, getting comfortable with Git.
- Wants to understand what's happening, not just have it work — when
  introducing a new concept or command, briefly explain it.

## Roadmap

Near-term work — new tools, psych chart *floating state-point chip*,
more Education pages — lives in `site-ideas-and-friction.md`
(feature ideas) and `codebase-issues.md` (code-quality holds).
