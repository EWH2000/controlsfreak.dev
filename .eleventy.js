// 11ty config — see codebase-issues.md entry #4 for the original
// decision rationale. The build's only job is to template the shared
// HTML chrome (head / nav / footer / layout) into each page; everything
// else passes through unchanged. Per-page logic remains vanilla JS in
// the page's inline <script>; shared engines live as classic scripts
// under html/scripts/. No bundler, no transpile.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 11ty's input + includes directories, hoisted out of the `dir` object
// returned at the bottom of this file so flowStaticGuard's on-disk scan
// splits pages from partials on the same directories 11ty itself uses —
// it is how the scan knows which `.html` is a page (the `nav: education`
// arm owns those) and which is an include, and it keys the
// EXEMPT_TEMPLATES path. Two literals would drift; one can't.
const INPUT_DIR = "html";
const INCLUDES_DIR = "_includes";

module.exports = function(eleventyConfig) {
    // .html files run through Nunjucks so signal-scaling.html →
    // _site/tools/signal-scaling.html (preserves the existing URL
    // structure exactly — no /tools/signal-scaling/index.html
    // rewriting).
    eleventyConfig.setTemplateFormats(["html", "njk"]);

    // Strip the newline after a block tag and the indent before one.
    // Keeps the rendered HTML close to what a hand-written file would
    // look like — empty {% block %}{% endblock %} pairs no longer
    // leave stray blank lines, and indented {% include %} tags don't
    // double-indent the first line of the included content. Standard
    // Jinja-family convention.
    eleventyConfig.setNunjucksEnvironmentOptions({
        trimBlocks: true,
        lstripBlocks: true
    });

    // Static assets — copied verbatim to _site/ at the same relative
    // paths the existing pages reference. The mapping object form
    // (`{src: dest}`) makes the output paths explicit: html/scripts
    // lands at _site/scripts, not _site/html/scripts.
    eleventyConfig.addPassthroughCopy({ "html/scripts": "scripts" });
    eleventyConfig.addPassthroughCopy({ "html/styles.css": "styles.css" });
    eleventyConfig.addPassthroughCopy({ "html/assets": "assets" });
    eleventyConfig.addPassthroughCopy({ "html/robots.txt": "robots.txt" });
    // IndexNow ownership key — a public token (NOT a wrangler secret),
    // served at the site root so the IndexNow consortium can verify we
    // control the domain before honoring a URL submission. Same hosting
    // mechanism as robots.txt; see .github/workflows/indexnow.yml.
    eleventyConfig.addPassthroughCopy({
        "html/5ceefff6b33f4eb68bbcad4e54ce30b1.txt": "5ceefff6b33f4eb68bbcad4e54ce30b1.txt"
    });
    // sitemap.xml is no longer passthrough — html/sitemap.njk renders it
    // from the sitemapPages collection (see below) with git-derived
    // <lastmod> dates. codebase-issues.md #45.

    // ── Nav dropdown categories ──────────────────────────────────────
    // Per-section sub-category order + labels for the cascading nav
    // dropdowns (rendered by nav-dropdown.njk via the `navGroups`
    // filter, expanded by scripts/nav-menu.js). The KEY matches each
    // page's `category` frontmatter; the LABEL is the category-row text;
    // array order is display order. Simulators has no entry — it stays a
    // flat dropdown. These keys mirror the landing pages' navCard()
    // `category` values; the two are independent sources today and must
    // be kept in sync by hand (codebase-issues — two-source category).
    const NAV_CATEGORIES = {
        tools: [["hvac", "HVAC"], ["protocols", "Protocols"], ["signals", "Signals"], ["airflow", "Airflow"], ["electrical", "Electrical"], ["hydronics", "Hydronics"]],
        education: [["fundamentals", "Fundamentals"], ["signals", "Signals & Sensing"], ["hydronics", "Hydronics"], ["refrigerant", "Refrigerant"], ["forced-air", "Forced Air Systems"], ["programming", "Programming"], ["protocols", "Protocols"]],
        practice: [["modbus", "Modbus"], ["bacnet", "BACnet"], ["hydronics", "Hydronics"], ["refrigeration", "Refrigeration"], ["signals", "Signals & Sensing"], ["controls", "Controls"], ["programming", "Programming"], ["psychrometrics", "Psychrometrics"], ["forced-air", "Forced Air Systems"], ["field", "Field Drills"]],
    };

    // Build-time guard for the 140–160 char `description` frontmatter
    // target documented in CLAUDE.md "Templating". The convention had
    // no measurable check, so it drifted across eleven pages between
    // audits (codebase-issues.md #35 / #51) — this fails the build on
    // any out-of-range description. A named collection is the cleanest
    // hook with access to the resolved data cascade; it returns nothing
    // and exists only for the side-effecting length check.
    eleventyConfig.addCollection("descriptionLengthGuard", (collectionApi) => {
        const MIN = 140;
        const MAX = 160;
        const offenders = collectionApi.getAll()
            .filter((item) => typeof item.data.description === "string")
            .filter((item) => {
                const len = item.data.description.length;
                return len < MIN || len > MAX;
            })
            .map((item) => `  ${item.inputPath} — ${item.data.description.length} chars`);
        // A *missing* description used to pass silently (the typeof
        // filter skipped it) — any page real enough to carry a canonical
        // must also carry a description (audit-2026-06 polish; the
        // noindex 404 has neither and stays exempt).
        const missing = collectionApi.getAll()
            .filter((item) => typeof item.data.canonical === "string"
                && typeof item.data.description !== "string")
            .map((item) => `  ${item.inputPath} — canonical but no description`);
        const all = offenders.concat(missing);
        if (all.length) {
            throw new Error(
                `description frontmatter must be ${MIN}–${MAX} chars ` +
                `(CLAUDE.md "Templating"):\n${all.join("\n")}`
            );
        }
        return [];
    });

    // Build-time guard: every page in a categorized section
    // (tools/education/practice) must carry a `category` frontmatter
    // whose value exists in NAV_CATEGORIES — otherwise the page silently
    // vanishes from its cascading nav dropdown (navGroups drops it). The
    // section landings are exempt (they aren't dropdown children).
    // Mirrors descriptionLengthGuard: a side-effecting named collection.
    eleventyConfig.addCollection("navCategoryGuard", (collectionApi) => {
        const offenders = [];
        Object.keys(NAV_CATEGORIES).forEach((section) => {
            const valid = new Set(NAV_CATEGORIES[section].map(([key]) => key));
            const landing = `https://controlsfreak.dev/${section}/`;
            collectionApi.getAll()
                .filter((item) => item.data.nav === section
                    && typeof item.data.canonical === "string"
                    && item.data.canonical !== landing)
                .forEach((item) => {
                    const c = item.data.category;
                    if (!c) offenders.push(`  ${item.inputPath} — nav:${section} but no \`category\``);
                    else if (!valid.has(c)) offenders.push(`  ${item.inputPath} — category "${c}" not in ${section} config`);
                });
        });
        if (offenders.length) {
            throw new Error(
                `nav \`category\` frontmatter (CLAUDE.md "Search index & nav menus"):\n${offenders.join("\n")}`
            );
        }
        return [];
    });

    // Build-time guard: every `nav: education` lesson must appear in the
    // educationSequence order array, and every URL in that array must be
    // claimed by a real education page. Without this, a new lesson silently
    // emits no rel=prev/next and the prev/next chain skips it — exactly how
    // controller-wiring and bacnet-mstp drifted out of a 16-entry list while
    // the grid grew to 18 (codebase-issues #93). Membership only: the array's
    // ORDER must still be kept in lockstep with the index.html grid by hand
    // (the grid order isn't machine-readable here). Mirrors navCategoryGuard.
    eleventyConfig.addCollection("educationSequenceGuard", (collectionApi) => {
        const sequence = require("./html/_data/educationSequence.js");
        const sequenced = new Set(Object.keys(sequence));
        const landing = "https://controlsfreak.dev/education/";
        const pagePaths = new Set();
        const offenders = [];
        collectionApi.getAll()
            .filter((item) => item.data.nav === "education"
                && typeof item.data.canonical === "string"
                && item.data.canonical !== landing)
            .forEach((item) => {
                const path = item.data.canonical.replace("https://controlsfreak.dev", "");
                pagePaths.add(path);
                if (!sequenced.has(path)) {
                    offenders.push(`  ${item.inputPath} — nav:education page absent from educationSequence order`);
                }
            });
        sequenced.forEach((url) => {
            if (!pagePaths.has(url)) {
                offenders.push(`  educationSequence lists ${url} but no nav:education page claims that canonical`);
            }
        });
        if (offenders.length) {
            throw new Error(
                `educationSequence must list every nav:education lesson ` +
                `(html/_data/educationSequence.js header invariant):\n${offenders.join("\n")}`
            );
        }
        return [];
    });

    // Build-time guard: every literal `data-flow` element in a
    // `nav: education` page's own source must carry
    // `data-flow-static="true"`, unless the page declares
    // `flowGeometryLive: true` in its frontmatter.
    //
    // WHY THE FLAG MATTERS, AND WHY A GUARD RATHER THAN A SPEC.
    // `data-flow-static="true"` opts one path into flow-engine's sampled
    // point table: the engine samples the path ONCE at pool-build time and
    // interpolates, instead of calling getPointAtLength() per particle per
    // frame. On education/hydronic-loops.html that was the difference
    // between ~50 and ~4 layouts per rendered frame. It is an ASSERTION,
    // not a hint (flow-engine.js header): "this path's `d` never changes
    // after the engine samples it, unless FlowEngine.refreshPath() is
    // called for it." Set it where that is FALSE and the particles animate
    // along stale geometry — beside the pipe instead of on it. That failure
    // is silent and purely visual: particle counts, colours and movement
    // all still read correct, so every existing assertion stays green while
    // the diagram is wrong. Nothing in `npm test` can see it, which is why
    // the invariant is pinned here, at build time, off the markup itself.
    //
    // THE OPT-OUT is `flowGeometryLive: true` — a page-level declaration
    // that a flow path here has its geometry rewritten WITHOUT an immediate
    // refresh, so its particles must keep the live read. (A page that
    // rewrites `d` and calls refreshPath in the same breath does NOT need
    // the opt-out; simulators/refrigerant-loop.html is that case and
    // carries the flag.) No education page needs it today. It exists so a
    // future lesson with a dragged or re-routed pipe declares that in one
    // line, instead of quietly dropping the attribute and leaving the next
    // reader to guess whether that was deliberate.
    //
    // HOW IT READS MARKUP. A collection callback CANNOT see rendered
    // output: `item.templateContent` / `item.content` throw "Tried to use
    // templateContent too early" at this point in the build (verified on
    // 11ty 3.1.5). `item.rawInput` IS available — the page's own template
    // source, frontmatter stripped, pre-render. Every education
    // `data-flow` attribute is literal in the page file, so pre-render
    // reaches all of them.
    //
    // TEMPLATES ARE SCANNED SEPARATELY, because rawInput is the page's OWN
    // source and stops at the `{% include %}` tag. That hole was proved by
    // construction (2026-07-25): an `_includes` partial holding
    // `<path data-flow="supply" d="…"/>`, plus a `nav: education` page
    // whose entire body was `{% include %}` of it, built clean and shipped
    // an unflagged content flow path. An include's markup can land on any
    // page, so it must carry the flag wherever it lands, independently of
    // which page pulls it in.
    //
    // THE SCAN ROOT IS THE WORKING DIRECTORY, NOT `html/_includes`. A first
    // cut walked the includes directory alone; that was narrowed, not
    // closed. Nunjucks' loader resolves an include name against BOTH the
    // includes dir and the working dir —
    // `@11ty/eleventy/src/Engines/Nunjucks.js#getFileSystemDirs()` returns
    // `[includesDir, TemplatePath.getWorkingDir()]` — so a partial parked
    // anywhere else reaches an education page completely unscanned. Proved
    // by construction (2026-07-25) with `partials/zz-root.njk` at the repo
    // root: exit 0, and the page shipped the unflagged path. The walk is
    // therefore rooted at `process.cwd()`, which is the same call
    // `getWorkingDir()` makes, so the guard and the loader cannot disagree
    // about where an include may live.
    //
    // WHICH FILES: every `.njk` under the root, plus every `.html` that is
    // NOT an 11ty page — i.e. outside the input dir, or inside `_includes`.
    // Extension alone is not enough in either direction. Restricting to
    // `.njk` leaves the identical hole one extension away (`partials/
    // zz-root.html` reproduced it — the loader does not care about the
    // extension). Taking every `.html` would drag the input dir's pages in
    // and silently extend PAGE SCOPE to simulators, which the note below
    // forbids. So `.html` pages under `html/` stay with the `nav: education`
    // arm above, and everything else a loader could pull in is scanned.
    // `node_modules` / `.git` / `.claude` are skipped by EXACT NAME, and any
    // directory whose name STARTS WITH `_site` by PREFIX: none of them is
    // source, and the last three carry whole copies of the tree (worktrees,
    // build output) that would report phantom offenders.
    //
    // THE PREFIX, NOT A FOURTH LITERAL, is what keeps an `--output=` override
    // usable. `npx @11ty/eleventy --output=_site_probe` lands a full build
    // inside the scan root under a name a literal `_site` never matches, and
    // the NEXT build scans it: 134 phantom offenders, each of the form
    // "`_site_probe/404.html` — 360 of 360 data-flow elements lack
    // data-flow-static" (360 = the gutter count the exempt partial injects
    // into every rendered page). Measured 2026-07-26 at both behaviours.
    // It failed LOUDLY, so nothing could ship through it — but it made
    // `--output` overrides and side-by-side build comparisons unusable and
    // buried any real offender line (codebase-issues #207(b)).
    //
    // DOCUMENTED LIMITATION — SYMLINKED TEMPLATES ARE NOT SCANNED, so read
    // the paragraphs above as coverage of what `readdirSync` reports as a
    // real file or a real directory, NOT as coverage of the working
    // directory. The walk tests `entry.isDirectory()` / `entry.isFile()` and
    // neither follows a symlink, so a symlinked template FILE and a symlinked
    // template DIRECTORY are both skipped in silence. That is this scan
    // root's own hole reached by another route: proved by construction
    // (2026-07-25) with a root-level `zzlinkfile.njk` symlinked to a file
    // outside the tree holding one unflagged `data-flow` path — included by a
    // `nav: education` page, the build exited 0 and shipped the path.
    // NAMED AND ACCEPTED rather than fixed (codebase-issues #207(a)):
    // following symlinks means resolving and cycle-guarding a guard that has
    // already needed three adversarial rounds, to close a route nothing on
    // this tree uses. The point of writing it down is that the guard's own
    // argument for rooting at `process.cwd()` is "a partial parked anywhere
    // else reaches an education page completely unscanned" — a reader is
    // owed the one way a partial can still do exactly that.
    //
    // An include has no frontmatter and therefore no `flowGeometryLive`
    // opt-out; one that genuinely needs the live read earns an
    // EXEMPT_TEMPLATES entry with a written reason.
    // `html/_includes/schematic-bg.njk` is the sole entry today, and for the
    // opposite reason: flow-engine tables the gutter unconditionally
    // (`pool.gutter` in buildPoolForEl), so its motifs need no opt-in and
    // adding one would misstate why they are cached. Entries are keyed on
    // the path relative to the scan root, NOT the basename — a basename key
    // hands its pass to any file that merely shares the name, proved with
    // `html/_includes/zzsub/schematic-bg.njk` shipping an unflagged path
    // through the gutter's exemption (2026-07-25). Each exempt path must
    // resolve to a real scanned file, so an exemption that stops matching
    // becomes an offender instead of decaying into a silent permanent pass
    // — same discipline as the contrast sweep's ALLOWLIST. That arm doubles
    // as the walk's anti-vacuity probe for the includes tree: it can only
    // pass if the walk actually reached `html/_includes/`.
    //
    // A fail-closed "declare your includes" rule was considered and does
    // NOT work: 15 of the 15 flow-bearing lessons already carry
    // `{% from "related-links.njk" import relatedLinks %}`, so a rule that
    // fires on any macro call fires on every page it is meant to protect.
    //
    // COMMENTS ARE MASKED FIRST — as insurance against a COMMENTED-OUT
    // MARKUP EXAMPLE, not against prose. What the mask defends: a comment
    // containing a full example start tag (`<!-- <path data-flow="supply"
    // d="…"/> -->`) would otherwise parse as a real element and fail the
    // build as a phantom offender. None exists in the tree today; the
    // mask is what keeps that a safe thing to write tomorrow. What the
    // mask does NOT do is neutralize prose mentions of `data-flow=` —
    // the attribute parse below already does that on its own (a sentence
    // about the attribute has no `<`, so it never parses as a start tag).
    // Measured (codebase-issues #203): replacing the mask with the
    // identity function changes the guard's verdict on ZERO scanned
    // files. An earlier version of this paragraph credited the mask with
    // the prose case; that was true of the guard's substring-probing
    // first cut and went stale when the attribute parse landed —
    // two correct fixes, one stale explanation between them.
    //
    // ATTRIBUTES ARE PARSED, NOT SUBSTRING-PROBED. The first cut tested
    // each tag's attribute text for `/\sdata-flow\s*=/`, which is wrong in
    // both directions: it MISSED a valueless `data-flow` — flow-engine
    // selects on `[data-flow]` and getAttribute returns "", which falls
    // through to SUPPLY_FILL, so `<path data-flow d="…"/>` animated on a
    // lesson while never being asked for the flag — and it would fire on a
    // `data-flow=` sitting inside some other attribute's quoted value.
    // attrsOf() walks name/value pairs instead, which also makes the
    // `data-flow-static` read quote-agnostic.
    //
    // PAGE SCOPE IS `nav: education` ONLY, DELIBERATELY (the template
    // scan above is separate and unconditional) — it does not reach
    // simulators, and must not be extended there as-is. A MARKUP scan is
    // structurally blind to the standing counter-example:
    // simulators/hydronic-loop-builder.html creates its flow paths from JS
    // and rewrites `d` on every pointermove, refreshing only on pointer-up,
    // so its source contains zero `data-flow=` attributes and a rule of
    // this shape would pass it VACUOUSLY. Silent false assurance about the
    // one page that must never carry the flag is worse than no rule. On
    // simulators the call stays a per-page judgement made by reading the
    // page's geometry writes.
    //
    // THAT BLIND SPOT IS THE GUARD'S FLOOR, and widening the file coverage
    // does not raise it: an attribute that is not LITERAL in any scanned
    // file cannot be caught by a scan of files. The JS-created paths above
    // are one form; `_data`-supplied markup and a templated attribute name
    // (`{% set fa = "data-flow" %}<path {{ fa }}="supply" …/>`, which builds
    // clean) are the others. This is structural, not a gap to close — read
    // the scan as "no LITERAL unflagged education flow path ships", never
    // as "no unflagged flow path ships."
    //
    // DIRECTION: this enforces "an education flow path carries the flag."
    // It cannot enforce the converse — that a page carrying the flag is
    // entitled to it — since that is a claim about runtime behaviour. What
    // it can also check is internal consistency with the opt-out, so it
    // does, in both directions. Mirrors educationSequenceGuard: accumulate
    // every offender, throw once, contribute no pages.
    eleventyConfig.addCollection("flowStaticGuard", (collectionApi) => {
        // Blank a comment to spaces rather than deleting it, so the
        // surrounding markup keeps its shape.
        const blank = (m) => m.replace(/[^\n]/g, " ");
        // LINE COMMENTS ARE BLANKED FIRST, and the order is load-bearing.
        // The delimited passes are non-greedy `open … close` scans that do
        // not know a delimiter is itself inside a line comment, so running
        // one before the `//` pass lets a stray opener in one `//` line pair
        // with a stray closer in a LATER one and blank everything between —
        // including a diagram. Proved on a `nav: education` page
        // (2026-07-25): `// ratio is length /* width` … an unflagged
        // `data-flow` path … `// divide by 2 */ done` built clean at exit 0
        // and shipped the path. Blanking `//` lines first removes both
        // strays before anything can pair them, and closes the same hole for
        // `-->` and `#}` (identical shape, not separately reproduced).
        //
        // WHAT THAT DEFENDS, EXACTLY — the `//` pass is LINE-ANCHORED
        // (`trimStart().startsWith("//")`), so the pairing defence above
        // holds for `//` comments that START their line and for nothing
        // else. Put the same two strays in `//` comments that TRAIL other
        // markup and the pass never fires — the line starts with `<script>`,
        // not `//` — so the `/* … */` pass pairs them and blanks the diagram
        // between them out of the scan. Measured against this mask
        // (2026-07-26): the line-start construction leaves the path visible
        // to scan(), the trailing twin does not. That is the OVER-masking
        // direction and it fails SILENTLY, hiding a real offender rather
        // than inventing a phantom one (codebase-issues #204(a)). Nothing on
        // this tree is near it — it needs an unbalanced `/*` inside one
        // trailing `//` comment, a `*/` inside a later one, and an unflagged
        // `data-flow` path between them.
        //
        // AND THE POSITIVE SEARCH BELOW IS ONE-DIRECTIONAL. It looks for
        // `//` lines carrying delimiters; it never looks for delimited
        // comments carrying `//`. The reorder moved that second shape too:
        // `/* css */ // js` on ONE line used to be fully masked (the `/* */`
        // pass ran first, leaving a line that then started with `//`) and
        // now leaves the trailing `// …` unmasked, so an example start tag
        // inside it would be counted. Measured the same way, same date. That
        // direction is the SAFE one — an unmasked comment yields a phantom
        // offender and a loud break, never a shipped path — and it reaches
        // zero files today (codebase-issues #204(b)).
        //
        // SO THE CLAIM IS: safe on this tree by search, in both directions —
        // no `.njk` / `.html` file under html/ has a `//` line containing
        // `-->`, `#}`, `*/` or `/*`, and none has a `*/` followed by `//`
        // (`grep -rnE --include='*.njk' --include='*.html'
        // '^[[:space:]]*//.*(-->|#\}|\*/|/\*)' html/` and
        // `grep -rnE --include='*.njk' --include='*.html' '\*/[[:space:]]*//'
        // html/`, both 0 on 2026-07-26; the include filters matter, since the
        // unrestricted form also reads .css / .js and returns 4). What that
        // buys is that the reorder cannot change masking on any file that
        // EXISTS. It is not a claim that the comment-pairing hole is closed.
        const maskComments = (src) => src
            .split("\n")
            .map((line) => (line.trimStart().startsWith("//") ? blank(line) : line))
            .join("\n")
            .replace(/<!--[\s\S]*?-->/g, blank)      // HTML comments
            .replace(/\{#[\s\S]*?#\}/g, blank)       // Nunjucks comments — stripped before render
            .replace(/\/\*[\s\S]*?\*\//g, blank);    // CSS block comments in {% block head %}
        const offenders = [];

        // One start tag's attribute text → a name → value map. Names are
        // matched positionally (name, optional `= value` with the value
        // consumed whole), so a `data-flow` mentioned inside another
        // attribute's quoted value can't register as an attribute, and a
        // valueless attribute reads as "" — the same thing getAttribute
        // returns for it in the browser.
        const attrsOf = (text) => {
            const attr = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
            const out = new Map();
            let m = attr.exec(text);
            while (m !== null) {
                const v = m[2] !== undefined ? m[2]
                    : m[3] !== undefined ? m[3]
                    : m[4];
                out.set(m[1].toLowerCase(), v === undefined ? "" : v);
                m = attr.exec(text);
            }
            return out;
        };

        // Count one template's `data-flow` elements and how many of them
        // carry the flag; report any whose flag is present but not exactly
        // "true". `label` is what an offender line names.
        const scan = (src, label) => {
            // One element start tag; the capture is its attribute text,
            // with quoted values consumed whole so a `>` inside one
            // can't end the tag early.
            const tag = /<[a-zA-Z][\w:.-]*((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
            let flow = 0;
            let flagged = 0;
            let match = tag.exec(src);
            while (match !== null) {
                const attrs = attrsOf(match[1]);
                if (attrs.has("data-flow")) {
                    flow++;
                    // The engine string-compares against "true"
                    // (flow-engine.js buildPoolForEl), so any other
                    // value is a silent no-opt-in, not a looser yes.
                    if (attrs.get("data-flow-static") === "true") flagged++;
                    else if (attrs.has("data-flow-static")) {
                        offenders.push(`  ${label} — data-flow-static must be exactly "true"; the engine string-compares`);
                    }
                }
                match = tag.exec(src);
            }
            return { flow, flagged };
        };

        collectionApi.getAll()
            .filter((item) => item.data.nav === "education")
            .forEach((item) => {
                if (typeof item.rawInput !== "string") {
                    // Anti-vacuity: an 11ty upgrade that stops exposing
                    // rawInput would otherwise disarm this guard silently.
                    offenders.push(`  ${item.inputPath} — no rawInput to scan; this guard cannot see the page`);
                    return;
                }
                const optedOut = item.data.flowGeometryLive === true;
                const { flow, flagged } = scan(maskComments(item.rawInput), item.inputPath);
                if (!optedOut && flow > flagged) {
                    offenders.push(`  ${item.inputPath} — ${flow - flagged} of ${flow} data-flow elements lack data-flow-static="true"`);
                }
                if (optedOut && flagged) {
                    offenders.push(`  ${item.inputPath} — flowGeometryLive: true, but ${flagged} data-flow elements carry data-flow-static`);
                }
                if (optedOut && !flow) {
                    offenders.push(`  ${item.inputPath} — flowGeometryLive: true, but the page has no data-flow element`);
                }
            });

        // Every template a Nunjucks include could reach — the surface a
        // page's rawInput cannot show. Exempt by PATH RELATIVE TO THE SCAN
        // ROOT, so an exemption names one file rather than every file that
        // happens to share its basename; each entry carries its reason
        // above. Moving an exempt partial re-points its entry by hand,
        // which is the intended friction.
        const EXEMPT_TEMPLATES = new Set([`${INPUT_DIR}/${INCLUDES_DIR}/schematic-bg.njk`]);
        // Not source, or a whole second copy of the tree. Three exact names
        // plus a `_site` PREFIX on directories — see the WHICH FILES note in
        // the header for why the prefix rather than a fourth literal, and
        // codebase-issues #207(b) for what the literal cost. The prefix is
        // tested on directories only: a FILE named `_site…` (a `_sitemap.njk`
        // partial, say) is real source and must stay in scope.
        const SKIP_DIRS = new Set(["node_modules", ".git", ".claude"]);
        const isSkippedDir = (entry) => SKIP_DIRS.has(entry.name)
            || (entry.isDirectory() && entry.name.startsWith("_site"));
        const pagesPrefix = `${INPUT_DIR}/`;
        const includesPrefix = `${INPUT_DIR}/${INCLUDES_DIR}/`;
        // `.html` inside the input dir but outside `_includes` is an 11ty
        // PAGE — the `nav: education` arm above owns it, deliberately.
        const isScannable = (rel) => {
            if (rel.endsWith(".njk")) return true;
            if (!rel.endsWith(".html")) return false;
            return !rel.startsWith(pagesPrefix) || rel.startsWith(includesPrefix);
        };
        const scanRoot = process.cwd();
        const exemptSeen = new Set();
        let templatesScanned = 0;
        const walkTemplates = (dir) => {
            fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
                if (isSkippedDir(entry)) return;
                const full = path.join(dir, entry.name);
                // Dirent type tests do not follow symlinks, so a symlinked
                // directory is skipped rather than walked — no cycles, and
                // no crash on the `node_modules` symlink an agent worktree
                // uses (it is skipped by name anyway). That is a benefit AND
                // a COVERAGE GAP, in both entry kinds: a symlinked template
                // file falls through `isFile()` below just as silently, so
                // neither is scanned. Accepted, not fixed — the header's
                // DOCUMENTED LIMITATION note carries the reproduction and the
                // reasoning (codebase-issues #207(a)).
                if (entry.isDirectory()) {
                    walkTemplates(full);
                    return;
                }
                if (!entry.isFile()) return;
                const rel = path.relative(scanRoot, full).split(path.sep).join("/");
                if (!isScannable(rel)) return;
                templatesScanned++;
                if (EXEMPT_TEMPLATES.has(rel)) {
                    exemptSeen.add(rel);
                    return;
                }
                const { flow, flagged } = scan(maskComments(fs.readFileSync(full, "utf8")), rel);
                if (flow > flagged) {
                    offenders.push(`  ${rel} — ${flow - flagged} of ${flow} data-flow elements lack data-flow-static="true"; a template reaches its host page without that page's source ever showing it`);
                }
            });
        };
        walkTemplates(scanRoot);
        // This guard must never be able to pass because it found nothing to
        // look at. The exempt-path arm below is the stronger probe — it can
        // only pass if the walk reached html/_includes/ — but the count
        // keeps a floor under an empty EXEMPT_TEMPLATES.
        if (!templatesScanned) {
            offenders.push(`  ${scanRoot} — no templates found; this guard cannot see the template tree`);
        }
        EXEMPT_TEMPLATES.forEach((rel) => {
            if (!exemptSeen.has(rel)) {
                offenders.push(`  ${rel} — exempt template no longer exists at that path; drop the exemption or re-point it`);
            }
        });

        if (offenders.length) {
            throw new Error(
                `data-flow-static="true" is required on every education flow ` +
                `path and on every template flow path — opt out with ` +
                `\`flowGeometryLive: true\` frontmatter (pages) or an ` +
                `EXEMPT_TEMPLATES entry (partials) (CLAUDE.md "Templating"; ` +
                `the assertion it makes is in the flow-engine.js ` +
                `header):\n${offenders.join("\n")}`
            );
        }
        return [];
    });

    // Build-time guard: every CONTENT quiz must appear in the quizOrder
    // curriculum list, and every slug in that list must be claimed by a
    // real practice page. Without this a new quiz silently gets no
    // "Next quiz →" target and drops out of the curriculum chain, while
    // the page itself renders fine and every existing test passes —
    // tests/smoke.spec.js only compares the landing GRID to quizOrder, so
    // a quiz missing from BOTH is invisible there. Mirrors
    // educationSequenceGuard: same accumulate-then-throw shape, same
    // both-directions check, data file required inside the callback.
    //
    // `category !== "field"` is the discriminator because field drills
    // are deliberately NOT part of the curriculum — html/_data/quizOrder.js
    // lines 1-8 record the invariant ("Field drills are not a curriculum
    // and carry no next-link"), and `category: field` is the same flag the
    // practice landing uses to hide drill cards under a topic chip. The
    // invariant is a set equality, not a count: every non-field
    // `nav: practice` page appears in quizOrder, and every quizOrder slug
    // is claimed by one such page — so appending a quiz or a drill cannot
    // falsify this comment.
    eleventyConfig.addCollection("quizOrderGuard", (collectionApi) => {
        const order = require("./html/_data/quizOrder.js");
        const ordered = new Set(order.map((entry) => `/practice/${entry.slug}.html`));
        const landing = "https://controlsfreak.dev/practice/";
        const pagePaths = new Set();
        const offenders = [];
        collectionApi.getAll()
            .filter((item) => item.data.nav === "practice"
                && typeof item.data.canonical === "string"
                && item.data.canonical !== landing
                && item.data.category !== "field")
            .forEach((item) => {
                const path = item.data.canonical.replace("https://controlsfreak.dev", "");
                pagePaths.add(path);
                if (!ordered.has(path)) {
                    offenders.push(`  ${item.inputPath} — content quiz absent from quizOrder`);
                }
            });
        ordered.forEach((url) => {
            if (!pagePaths.has(url)) {
                offenders.push(`  quizOrder lists ${url} but no non-field nav:practice page claims that canonical`);
            }
        });
        if (offenders.length) {
            throw new Error(
                `quizOrder must list every content quiz — field drills are ` +
                `exempt by design (html/_data/quizOrder.js header ` +
                `invariant):\n${offenders.join("\n")}`
            );
        }
        return [];
    });

    // ── GLOSS / GLOSSARY ─────────────────────────────────────────────
    // Two halves, deliberately split by what each one can see:
    //
    //   glossaryGuard (below)  — the DATA-FILE lint arm. Runs once per
    //       build, inside a collection, because only a collection has the
    //       page list an `owners` path must resolve against.
    //   the `gloss` transform  — the PER-PAGE arm. Runs after render,
    //       because that is the only point where a trigger arriving via a
    //       partial or an {% include %} is visible at all. (A paired
    //       shortcode would be pre-render and blind to exactly that.)
    //
    // This is the repo's first addTransform, so the mechanism choice is
    // recorded here rather than left implicit.

    // Build-time guard: the glossary data file itself. Entry ids must be
    // kebab-case (the house id rule, and the ids become DOM ids); every
    // entry needs a `term` and a `def`; and every `owners` path must name
    // a real page. That last check is the anti-vacuity probe — an owners
    // path that stops resolving would silently stop SUPPRESSING, and §7.4
    // suppression is part of the correctness argument, not an
    // optimisation. Same reasoning as EXEMPT_TEMPLATES' stops-resolving
    // rule in flowStaticGuard: a guard must never decay into a quiet
    // pass. Mirrors quizOrderGuard's accumulate-then-throw shape.
    //
    // NOT an error: a glossary entry no page marks yet. Phase 2 marks
    // gradually, so entries are allowed to precede their marks.
    eleventyConfig.addCollection("glossaryGuard", (collectionApi) => {
        const glossary = require("./html/_data/glossary.js");
        const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        const offenders = [];
        const pagePaths = new Set(
            collectionApi.getAll()
                .filter((item) => typeof item.data.canonical === "string")
                .map((item) => item.data.canonical.replace("https://controlsfreak.dev", ""))
        );
        const keys = Object.keys(glossary);
        // The walk must never pass because it found nothing to look at —
        // an emptied glossary would make every arm below vacuously true.
        if (!keys.length) offenders.push("  html/_data/glossary.js — no entries; this guard cannot see anything");
        if (!pagePaths.size) offenders.push("  no pages carry a canonical; the owners arm cannot resolve anything");
        keys.forEach((key) => {
            const entry = glossary[key] || {};
            if (!KEBAB.test(key)) offenders.push(`  ${key} — entry id is not kebab-case (CLAUDE.md "ID naming")`);
            if (typeof entry.term !== "string" || !entry.term.trim()) offenders.push(`  ${key} — missing \`term\``);
            if (typeof entry.def !== "string" || !entry.def.trim()) offenders.push(`  ${key} — missing or empty \`def\``);
            if (!Array.isArray(entry.owners)) {
                offenders.push(`  ${key} — \`owners\` must be an array (use [] for a term defined nowhere yet)`);
                return;
            }
            entry.owners.forEach((owner) => {
                if (!pagePaths.has(owner)) {
                    offenders.push(`  ${key} — owners path ${owner} names no page that carries that canonical; re-point it or drop it`);
                }
            });
        });
        if (offenders.length) {
            throw new Error(
                `html/_data/glossary.js shape + owners resolution ` +
                `(docs/tooltip-glossary-scoping.md §7.4, §8):\n${offenders.join("\n")}`
            );
        }
        return [];
    });

    // Build-time guard: the §4 reserved-headword map
    // (html/_data/glossaryExcluded.js) — the exclusion half of the
    // 2026-08-20 §4 collision-tier ruling
    // (docs/glossary-s4-collision-proposal.md §5; ruled build-enforced,
    // Q4). Three legs:
    //   1. Anti-vacuity — the tier has shipped, so an empty map means
    //      this guard is watching nothing; fail rather than decay into a
    //      quiet pass (the glossaryGuard-header doctrine).
    //   2. Row lint — kebab keys (the key IS the reservation, and the
    //      term-equality leg compares against it), a written non-empty
    //      `reason` and `ruled` date per row; `reopen` optional but
    //      non-empty when present.
    //   3. Collision + term-equality — no glossary entry may carry an id
    //      OR a kebab-normalized `term` equal to a reserved headword (id
    //      `reset-value` with term "reset" is the near-id hole the term
    //      leg closes). A lane that wants a reserved word as an entry
    //      must edit the map row — which cites the ruling it would be
    //      overturning — in the same change, never work around this.
    eleventyConfig.addCollection("glossaryExcludedGuard", () => {
        const glossary = require("./html/_data/glossary.js");
        const excluded = require("./html/_data/glossaryExcluded.js");
        const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        const offenders = [];
        const keys = Object.keys(excluded);
        // Leg 1 — anti-vacuity.
        if (!keys.length) {
            offenders.push(
                "  html/_data/glossaryExcluded.js — empty; the §4 tier shipped " +
                "2026-08-20 and its reserved headwords must be here, or this " +
                "guard is watching nothing"
            );
        }
        // Leg 2 — row lint.
        keys.forEach((key) => {
            const row = excluded[key] || {};
            if (!KEBAB.test(key)) offenders.push(`  ${key} — reserved headword is not kebab-case (CLAUDE.md "ID naming"; the term-equality leg compares kebab-normalized terms against these keys)`);
            if (typeof row.reason !== "string" || !row.reason.trim()) offenders.push(`  ${key} — missing \`reason\`; an exclusion is a decision with a date and a hazard, not an absence`);
            if (typeof row.ruled !== "string" || !row.ruled.trim()) offenders.push(`  ${key} — missing \`ruled\` date`);
            if ("reopen" in row && (typeof row.reopen !== "string" || !row.reopen.trim())) offenders.push(`  ${key} — \`reopen\`, when present, must be a non-empty string naming the trigger`);
        });
        // Leg 3 — collision + term-equality against the live glossary.
        const kebabize = (s) => String(s).toLowerCase()
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        // hasOwnProperty, not bracket truthiness — a kebab-legal entry id
        // like 'constructor' would otherwise hit Object.prototype and
        // throw citing a ruling row that does not exist.
        const reserved = (key) => Object.prototype.hasOwnProperty.call(excluded, key);
        Object.keys(glossary).forEach((id) => {
            const hit = reserved(id) ? id : null;
            const termKebab = kebabize((glossary[id] || {}).term || "");
            const termHit = !hit && reserved(termKebab) ? termKebab : null;
            if (hit) {
                offenders.push(`  ${id} — this entry id is a RESERVED §4 headword (EXCLUDED, ruled ${excluded[hit].ruled}: docs/glossary-s4-collision-proposal.md §5). Shipping it means overturning that ruling — edit its row in html/_data/glossaryExcluded.js (with the owner's new ruling) in the same change, never around it`);
            } else if (termHit) {
                offenders.push(`  ${id} — this entry's term ${JSON.stringify(glossary[id].term)} kebab-normalizes to the RESERVED §4 headword '${termHit}' (EXCLUDED, ruled ${excluded[termHit].ruled}: docs/glossary-s4-collision-proposal.md §5). A different id does not un-reserve the word — edit the map row (with the owner's new ruling) or re-scope the term`);
            }
        });
        if (offenders.length) {
            throw new Error(
                `html/_data/glossaryExcluded.js — the §4 reserved-headword guard ` +
                `(docs/glossary-s4-collision-proposal.md §5, ratified 2026-08-20):\n${offenders.join("\n")}`
            );
        }
        return [];
    });

    // The per-page arm. On every rendered .html page: validate each
    // `data-gloss` mark, splice in the `aria-describedby` that wires the
    // trigger to its panel, then inject one panel per DISTINCT term plus
    // the runtime — all before </body>. A page with no marks returns its
    // input byte-identical.
    //
    // Because the build owns the panels and the script tag, a page can
    // never carry triggers without them: the drift class "author forgot
    // the script tag" is unrepresentable.
    //
    // THE GUARD'S FLOOR, stated honestly (the flowStaticGuard lesson):
    // it reads literal `data-gloss="…"` attributes in rendered HTML.
    // JS-painted prose (vfds.html's concatenated anecdote, quiz-engine
    // DOM) is invisible to it — which is fine, because §7.2 rules those
    // surfaces out of scope until the component question is answered.
    // Read it as *no marked trigger ships unresolved or on its owning
    // page*, never as *every occurrence is marked*.
    //
    // "Literal" means DOUBLE-quoted. Every other spelling — single-
    // quoted, unquoted, valueless, a spaced `=` — is not skipped, it is
    // rejected: see the malformed-form arm below, which exists because
    // skipping any of them ships a styled trigger with no panel. Since
    // the #312 widening (owner ruling 2026-08-15) no quoting variant
    // sits outside the floor; what remains outside is JS-painted prose
    // only, per the paragraph above.
    eleventyConfig.addTransform("gloss", function (content, outputPath) {
        const out = (this.page && this.page.outputPath) || outputPath;
        if (typeof out !== "string" || !out.endsWith(".html")) return content;
        if (!content.includes("data-gloss")) return content;

        const glossary = require("./html/_data/glossary.js");
        const version = require("./package.json").version;
        const pageUrl = (this.page && this.page.url) || "";
        const inputPath = (this.page && this.page.inputPath) || out;
        const offenders = [];
        const used = [];

        // HTML comments are masked before the scan, LENGTH-PRESERVINGLY,
        // so a match index in the masked copy addresses the same
        // characters in the original and the splice can work on real
        // text. Without this, commented-out example markup — the natural
        // way to park a trigger you are not shipping — fails the build on
        // an unknown id, or worse, silently earns a panel and an
        // aria-describedby splice inside dead markup. Same masking idea
        // as flowStaticGuard's maskComments; only the HTML-comment arm is
        // wanted here, because this runs on RENDERED output, where
        // Nunjucks comments are already gone and blanking `//` lines
        // would reach into prose.
        const blank = (m) => m.replace(/[^\n]/g, " ");
        const scannable = content.replace(/<!--[\s\S]*?-->/g, blank);

        // The malformed-form arm, and it runs OUTSIDE the trigger loop
        // below on purpose: a page whose only mark is misspelled has
        // zero valid triggers, so that loop never executes and nothing
        // else here would ever look at the page. The
        // `content.includes("data-gloss")` precondition above still
        // admits every spelling — the substring is there however the
        // value is quoted, which is what makes this reachable at all.
        //
        // Why it fails the build rather than being tolerated: TRIGGER_RE
        // matches only the canonical `data-gloss="…"`, so the
        // single-quoted, unquoted, valueless and spaced-equals spellings
        // are all invisible to every check AND to the splice. The word
        // still picks up the `button[data-gloss]` underline from
        // styles.css (an attribute-PRESENCE selector — it matches every
        // spelling alike), so what ships is a styled affordance with no
        // panel, no runtime and no aria-describedby — a dead trigger
        // that looks live, the exact silent-drift class this transform
        // exists to make unrepresentable. Widening TRIGGER_RE to accept
        // the other forms would also work, but the markup contract is
        // ONE form; rejecting the rest keeps it that way instead of
        // quietly blessing alternate spellings. (Ledger #312 — this arm
        // began as a single-quote check on PR #567 and was widened to
        // every non-canonical spelling at the owner's ruling,
        // 2026-08-15.)
        //
        // `(?![\w-])` keeps `data-glossary`-shaped tokens from
        // matching; `(?!=")` passes the one canonical spelling through
        // to TRIGGER_RE. A match preceded by `[`, `'` or `"` is a CSS
        // attribute selector or a quoted string MENTION of the
        // attribute — neither is an attribute on an element — and both
        // stay legal: no rendered page carries either today, and the
        // exclusion is what keeps a future inline `button[data-gloss]`
        // style rule or a documentation <code> span from tripping a
        // guard that is about markup.
        //
        // Scans `scannable`, so a commented-out example in any spelling
        // is masked out and does not fail — same courtesy the trigger
        // loop extends to a parked double-quoted one.
        const MALFORMED_RE = /\bdata-gloss(?![\w-])(?!=")/g;
        let mf;
        MALFORMED_RE.lastIndex = 0;
        while ((mf = MALFORMED_RE.exec(scannable)) !== null) {
            const prev = mf.index > 0 ? scannable[mf.index - 1] : "";
            if (prev === "[" || prev === "'" || prev === '"') continue;
            const context = scannable.slice(mf.index, mf.index + 48).split(">")[0].trimEnd();
            offenders.push(`  ${context} — a data-gloss value must be exactly double-quoted (data-gloss="id"); every other spelling (single-quoted, unquoted, valueless, spaced =) is invisible to the gloss transform and ships a styled trigger with no panel`);
        }

        // Opening tags carrying a data-gloss attribute. `[^>]*` is the
        // textual floor named above — an attribute VALUE containing a
        // literal ">" would defeat it, which no house trigger does. A
        // `data-gloss=` inside a <script> STRING would still be seen;
        // that fails loudly rather than silently, and no page does it.
        const TRIGGER_RE = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*\bdata-gloss="([^"]*)"[^>]*)>/g;

        let spliced = "";
        let cursor = 0;
        let m;
        TRIGGER_RE.lastIndex = 0;
        while ((m = TRIGGER_RE.exec(scannable)) !== null) {
            const rawTag = m[1];
            const attrs = m[2];
            const id = m[3];
            const start = m.index;
            const end = start + m[0].length;
            // The real characters at the same span — masking only ever
            // blanks comment regions, which cannot match this pattern.
            const original = content.slice(start, end);
            const tag = rawTag.toLowerCase();
            let ok = true;

            if (tag !== "button") {
                offenders.push(`  <${tag} data-gloss="${id}"> — a gloss trigger must be a <button>; the trigger contract is uniform semantics`);
                ok = false;
            } else if (!/\btype="button"/.test(attrs)) {
                // A <button> with no type defaults to type="submit". On a
                // form-bearing page (contact.html today, any future one)
                // that turns a definition into a form submission.
                offenders.push(`  data-gloss="${id}" — the trigger needs an explicit type="button"; a bare <button> defaults to type="submit" and would submit any form it lands inside`);
                ok = false;
            }
            const entry = glossary[id];
            if (ok && !entry) {
                offenders.push(`  data-gloss="${id}" — no such glossary entry. Known ids: ${Object.keys(glossary).join(", ")}`);
                ok = false;
            }
            if (ok && entry.owners.indexOf(pageUrl) !== -1) {
                offenders.push(`  data-gloss="${id}" — this page TEACHES that term (glossary owners), and a gloss there shadows the page's own teaching beat (docs/tooltip-glossary-scoping.md §7.4). Remove the mark; never soften the guard`);
                ok = false;
            }
            if (ok && /\baria-describedby=/.test(attrs)) {
                offenders.push(`  data-gloss="${id}" — the trigger already carries aria-describedby; the build owns that attribute`);
                ok = false;
            }

            spliced += content.slice(cursor, start);
            if (ok) {
                if (used.indexOf(id) === -1) used.push(id);
                spliced += original.slice(0, -1) + ` aria-describedby="gloss-tip-${id}">`;
            } else {
                spliced += original;
            }
            cursor = end;
        }
        spliced += content.slice(cursor);

        // The gloss-tip-<id> id namespace has to be ours alone on this
        // page. A page that already carries id="gloss-tip-wiresheet" on
        // some other element wins document order, so getElementById
        // hands the runtime that element instead of the panel and the
        // gloss silently does nothing — while aria-describedby points a
        // screen reader at the wrong node. Checked against the masked
        // copy so a commented-out example id doesn't trip it.
        used.forEach((id) => {
            if (scannable.indexOf(`id="gloss-tip-${id}"`) !== -1) {
                offenders.push(`  data-gloss="${id}" — this page already carries id="gloss-tip-${id}" on another element; the gloss-tip-<id> namespace belongs to the build. Rename the page's id`);
            }
        });

        if (offenders.length) {
            throw new Error(
                `gloss triggers in ${inputPath} (definitions + curation notes ` +
                `in html/_data/glossary.js; the markup contract is in the ` +
                `html/scripts/gloss.js header):\n${offenders.join("\n")}`
            );
        }
        if (!used.length) return content;

        // One panel per distinct term, at body end — outside <main>, so
        // position:fixed never inherits a future ancestor transform, and
        // above body.has-fullscreen-tool main (z-index 400) while staying
        // below the command palette (1000). `term` is plain text and gets
        // escaped; `def` is trusted authored markup and goes in raw (see
        // the data file's header).
        const esc = (s) => String(s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const panels = used.map((id) => {
            const entry = glossary[id];
            return `<div class="gloss-tip" role="tooltip" id="gloss-tip-${id}" hidden>\n`
                 + `    <p class="gloss-tip-term"><dfn>${esc(entry.term)}</dfn></p>\n`
                 + `    <p class="gloss-tip-def">${entry.def}</p>\n`
                 + `</div>`;
        }).join("\n");

        const injected = `${panels}\n<script src="/scripts/gloss.js?v=${version}"></script>\n</body>`;
        const at = spliced.lastIndexOf("</body>");
        if (at === -1) {
            throw new Error(
                `gloss: ${inputPath} carries ${used.length} gloss term(s) but has no ` +
                `</body> to inject the panels and runtime into`
            );
        }
        return spliced.slice(0, at) + injected + spliced.slice(at + "</body>".length);
    });

    // Pages for sitemap.njk: every template that carries a `canonical`
    // frontmatter — i.e. every real page; the sitemap template itself
    // has none, so it self-excludes. (Counts drift: a hardcoded "all 20
    // real pages" here survived to a 64-page site — audit-2026-06.)
    // Sorted by canonical URL for a stable, diff-friendly output order.
    eleventyConfig.addCollection("sitemapPages", (collectionApi) =>
        collectionApi.getAll()
            .filter((item) => typeof item.data.canonical === "string")
            .sort((a, b) => a.data.canonical.localeCompare(b.data.canonical))
    );

    // "Next quiz →" target for a content quiz's results card — wraps at
    // the end so the grind loop continues (owner decision 2026-06-10,
    // audit #22). Returns null for slugs outside the canonical order
    // (the field drills aren't a curriculum). Titles come from the
    // quiz pages' own frontmatter at build time via the collection.
    eleventyConfig.addFilter("nextQuiz", function (slug) {
        const order = require("./html/_data/quizOrder.js");
        const i = order.findIndex((e) => e.slug === slug);
        if (i === -1) return null;
        const next = order[(i + 1) % order.length];
        return { href: "/practice/" + next.slug + ".html", label: next.label };
    });

    // Page title with the shared " — controlsfreak.dev" suffix stripped.
    // The JSON-LD filters below, the search index, and the nav dropdowns
    // all want the bare title — factored out here so the regex lives once.
    const cleanTitle = (title) =>
        (title || "").replace(/\s+—\s+controlsfreak\.dev\s*$/, "");
    eleventyConfig.addFilter("cleanTitle", cleanTitle);

    // A page's `canonical` is a full https://controlsfreak.dev/… URL; the
    // search index and nav menus need the path only (the site's hrefs are
    // root-relative with explicit .html extensions). The home canonical
    // (".../") collapses to "/" rather than the empty string.
    eleventyConfig.addFilter("canonicalPath", (url) =>
        (url || "").replace("https://controlsfreak.dev", "") || "/");

    // The crawl-facing URL form. `canonical` frontmatter carries the `.html`
    // extension (the site's documented anchor convention — CLAUDE.md), but
    // Cloudflare Assets `html_handling` 307-redirects `/foo.html` → `/foo`.
    // A canonical/og:url/sitemap <loc> that points at the *redirecting*
    // `.html` URL — while the clean 200 URL disclaims itself — made Google
    // index both forms as separate results (codebase-issues #86, revisit
    // trigger fired by the 2026-07 Search Console data). So every crawl
    // signal renders the clean, self-referential form via this filter;
    // frontmatter stays `.html` as the single source of truth, and internal
    // `.html` anchors are unchanged (they 307 fine within the site). Applied
    // to canonical, og:url, the sitemap <loc>, and every JSON-LD url/@id so
    // the structured-data graph stays internally consistent (paired
    // hasPart/isPartOf @ids must byte-match their target's url).
    eleventyConfig.addFilter("cleanCanonical", (url) =>
        (url || "").replace(/\.html$/, ""));

    // Pages for the site search index (html/search-index.njk → the static
    // /search-index.json the command palette fetches). Same membership as
    // sitemapPages today — every page with a canonical is a real
    // destination — but kept as its own collection so results can later be
    // narrowed (e.g. drop utility pages) without touching the sitemap.
    eleventyConfig.addCollection("searchPages", (collectionApi) =>
        collectionApi.getAll()
            .filter((item) => typeof item.data.canonical === "string")
            .sort((a, b) => a.data.canonical.localeCompare(b.data.canonical))
    );

    // Per-section page lists for the nav dropdowns (nav.njk). Same shape as
    // sitemapPages but split by `nav` and with the section landing itself
    // excluded — the top-level nav link already points there. Sorted by
    // VISIBLE title (cleanTitle), not slug: 13 of 14 tool labels happened
    // to read alphabetically under the old slug sort, which trained an
    // alphabetical scan that then failed at exactly one entry ("Pump &
    // Fan Affinity Laws" filed under A for affinity-laws). Title sort is
    // equally diff-stable; owner-approved 2026-06-10 (codebase-issues
    // #88).
    const navSection = (collectionApi, section, landing) =>
        collectionApi.getAll()
            .filter((item) => item.data.nav === section
                && typeof item.data.canonical === "string"
                && item.data.canonical !== landing)
            .sort((a, b) => cleanTitle(a.data.title).localeCompare(cleanTitle(b.data.title)));
    eleventyConfig.addCollection("navTools", (api) =>
        navSection(api, "tools", "https://controlsfreak.dev/tools/"));
    eleventyConfig.addCollection("navSimulators", (api) =>
        navSection(api, "simulators", "https://controlsfreak.dev/simulators/"));
    eleventyConfig.addCollection("navEducation", (api) =>
        navSection(api, "education", "https://controlsfreak.dev/education/"));
    eleventyConfig.addCollection("navPractice", (api) =>
        navSection(api, "practice", "https://controlsfreak.dev/practice/"));
    // Topic-cluster hubs (nav: guides) for the flat "Guides" dropdown —
    // same shape as Simulators. Short dropdown labels come from each hub's
    // navLabel frontmatter (navDropdown's flat branch falls back to title).
    eleventyConfig.addCollection("navGuides", (api) =>
        navSection(api, "guides", "https://controlsfreak.dev/guides/"));

    // Group a nav collection (navTools/navEducation/navPractice) by its
    // pages' `category` for the cascading dropdowns. Returns
    // [{ key, label, pages }] in NAV_CATEGORIES display order, each
    // `pages` list inheriting the collection's title sort; empty
    // categories are dropped. Simulators has no NAV_CATEGORIES entry, so
    // it never calls this — it renders flat.
    eleventyConfig.addFilter("navGroups", (pages, section) =>
        (NAV_CATEGORIES[section] || [])
            .map(([key, label]) => ({
                key,
                label,
                pages: (pages || []).filter((p) => p.data.category === key),
            }))
            .filter((g) => g.pages.length));

    // Last-modified date for a source file, from git's last commit that
    // touched it — `git log -1 --format=%cd --date=short -- <path>`.
    // execFileSync (no shell) passes the path as an argv element.
    // Falls back to today's date if git has no record (an uncommitted
    // file, or a build environment without full history). Used by
    // sitemap.njk for <lastmod>. codebase-issues.md #45.
    //
    // STRICT_GIT_DATES (audit-2026-06 #35): the silent fallback is what
    // let production ship every <lastmod> and every TechArticle
    // datePublished as the deploy date — Cloudflare Workers Build clones
    // shallow, both filters fell back on all 64 pages, and nothing
    // failed. With STRICT_GIT_DATES set (intended for the deploy build
    // command, alongside a `git fetch --unshallow`), an empty git answer
    // throws instead of falling back, so a history-less production
    // build fails loudly. Local/CI builds without the env keep the
    // forgiving behavior for uncommitted files.
    const strictGitDates = !!process.env.STRICT_GIT_DATES;
    if (strictGitDates) {
        // A shallow clone isn't caught by the empty-output guards below —
        // `git log` still answers with the lone fetched commit, which is
        // exactly the every-date-collapses-to-deploy-date failure. Detect
        // it head-on and fail the build before a single page renders.
        const shallow = execFileSync(
            "git", ["rev-parse", "--is-shallow-repository"],
            { encoding: "utf8" }
        ).trim();
        if (shallow === "true") {
            throw new Error(
                "STRICT_GIT_DATES: this is a shallow clone — every <lastmod> " +
                "and datePublished would collapse to the deploy date. " +
                "Run `git fetch --unshallow` before the build."
            );
        }
    }
    const gitDateFallback = (inputPath, what) => {
        if (strictGitDates) {
            throw new Error(
                `STRICT_GIT_DATES: git has no ${what} for ${inputPath} — ` +
                "shallow clone? Run `git fetch --unshallow` before the build."
            );
        }
        return new Date().toISOString().slice(0, 10);
    };
    eleventyConfig.addFilter("gitLastmod", (inputPath) => {
        try {
            const out = execFileSync(
                "git",
                ["log", "-1", "--format=%cd", "--date=short", "--", inputPath],
                { encoding: "utf8" }
            ).trim();
            return out || gitDateFallback(inputPath, "last-modified date");
        } catch (err) {
            if (strictGitDates) throw err;
            return gitDateFallback(inputPath, "last-modified date");
        }
    });

    // First-modified (created) date for a source file — the date of the
    // earliest commit touching the path. Used by head.njk for the
    // `datePublished` field of TechArticle JSON-LD on education pages
    // (`dateModified` reuses gitLastmod). Same fallback shape — and the
    // same STRICT_GIT_DATES guard: a shallow production clone walked
    // datePublished forward on every deploy, an anti-freshness signal
    // for the E-E-A-T JSON-LD it was built for.
    eleventyConfig.addFilter("gitFirstmod", (inputPath) => {
        try {
            const out = execFileSync(
                "git",
                ["log", "--format=%cd", "--date=short", "--reverse", "--", inputPath],
                { encoding: "utf8" }
            ).trim().split("\n")[0];
            return out || gitDateFallback(inputPath, "first-commit date");
        } catch (err) {
            if (strictGitDates) throw err;
            return gitDateFallback(inputPath, "first-commit date");
        }
    });

    // BreadcrumbList JSON-LD for a page, driven by its `canonical` URL,
    // `nav` frontmatter, and `title`. Returns a JSON string for embedding
    // inside <script type="application/ld+json">, or an empty string when
    // a breadcrumb doesn't apply (home page, pages without `nav`).
    // Google still surfaces breadcrumbs as a rich result under the snippet.
    // One entry per nav section that has a landing to breadcrumb
    // through. audit-2026-06 #36: practice was missing (the map predates
    // the practice landing by a day), so all 21 practice pages emitted a
    // flat Home→Page trail — a new nav section needs an entry here
    // (convention→consumers sweep).
    const SECTION_MAP = {
        tools:      { name: "Tools",      url: "https://controlsfreak.dev/tools/" },
        simulators: { name: "Simulators", url: "https://controlsfreak.dev/simulators/" },
        education:  { name: "Education",  url: "https://controlsfreak.dev/education/" },
        practice:   { name: "Practice",   url: "https://controlsfreak.dev/practice/" },
        contact:    { name: "Contact",    url: "https://controlsfreak.dev/contact.html" }
    };
    eleventyConfig.addFilter("breadcrumbJsonLd", (canonical, nav, title) => {
        if (!canonical || canonical === "https://controlsfreak.dev/") return "";
        const items = [{ name: "Home", url: "https://controlsfreak.dev/" }];
        const section = SECTION_MAP[nav];
        if (section) {
            if (canonical === section.url) {
                items.push({ name: section.name, url: canonical });
            } else {
                items.push(section);
                items.push({ name: cleanTitle(title), url: canonical });
            }
        } else {
            // No recognized section (e.g. /privacy.html) — flat
            // Home → Page breadcrumb. Skipping unknown nav values would
            // leave top-level utility pages without any breadcrumb at all.
            items.push({ name: cleanTitle(title), url: canonical });
        }
        return scriptSafeStringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": items.map((item, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "name": item.name,
                "item": item.url
            }))
        });
    });

    // JSON.stringify, but with every `<` escaped to `<` so the result is
    // safe to drop directly into an inline `<script>` tag without risking a
    // `</script>` sequence inside a string terminating the tag early. The
    // round-tripped value is byte-identical to the unescaped form once the
    // browser parses the JSON literal; this only affects the embedded HTML
    // representation. Used for the quiz pages' inline `const questions = …`
    // injection AND by every JSON-LD filter in this file (breadcrumb,
    // FAQPage, SoftwareApplication, TechArticle) — they all land inside
    // inline <script> tags, so they all need the same escape
    // (audit-2026-06 polish: three of the four previously used plain
    // JSON.stringify while this comment claimed parity; the data is
    // repo-committed frontmatter, so the exposure was author-self-XSS,
    // but the invariant should hold by construction).
    const scriptSafeStringify = (value) =>
        JSON.stringify(value).replace(/</g, "\\u003c");
    eleventyConfig.addFilter("safeScriptJson", scriptSafeStringify);

    // FAQPage JSON-LD for quiz pages. Each question in the bank becomes a
    // Question entity with an Answer that combines the correct choice (or
    // True/False, or the numeric value) with the explanation prose, both
    // stripped of HTML for schema cleanliness. The same data the inline IIFE
    // uses to mount the quiz engine in the browser. When the quiz sets
    // `pairedLesson:` frontmatter (a single 1:1 lesson companion), the node
    // also carries `isPartOf` pointing at the lesson's TechArticle node —
    // the reciprocal of the lesson's `hasPart`. Emitted from head.njk only
    // when nav: practice AND _data/quizzes/<page.fileSlug>.js exists, so the
    // practice landing (which has neither) gets nothing.
    const stripHtml = (s) =>
        String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const buildQuestionName = (q) =>
        stripHtml(q.prompt) + (q.snippet ? " " + stripHtml(q.snippet) : "");
    const buildAnswerText = (q) => {
        let answer = "";
        if (q.type === "tf") {
            answer = q.answer ? "True" : "False";
        } else if (q.type === "numeric") {
            answer = String(q.answer) + (q.unit ? " " + q.unit : "");
        } else {
            const correct = (q.choices || []).find((c) => c.correct);
            answer = correct ? stripHtml(correct.text) : "";
        }
        const explanation = stripHtml(q.explain);
        // The join is a sentence break, so it supplies only the punctuation
        // the answer is missing: a choice written as a full sentence already
        // ends in one, and an unconditional ". " published
        // "…before you touch a setpoint.. Both numbers…" on most entries
        // (#254 — 295 of 416 at the time it was fixed).
        const separator = /[.!?]$/.test(answer) ? " " : ". ";
        return answer + (answer && explanation ? separator : "") + explanation;
    };
    eleventyConfig.addFilter("faqPageJsonLd", (canonical, questions, title, pairedLesson) => {
        if (!canonical || !Array.isArray(questions) || !questions.length) return "";
        const node = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "name": cleanTitle(title),
            "url": canonical,
            "mainEntity": questions.map((q) => ({
                "@type": "Question",
                "name": buildQuestionName(q),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": buildAnswerText(q),
                },
            })),
        };
        if (pairedLesson) {
            node.isPartOf = { "@type": "TechArticle", "@id": pairedLesson };
        }
        return scriptSafeStringify(node);
    });

    // FAQPage JSON-LD for non-quiz pages — any page that sets a `faqs:`
    // frontmatter array of `{ q, a }` pairs (tool pages, mainly). Distinct
    // from the quiz faqPageJsonLd above (which derives Q&A from the quiz
    // bank's schema); this takes hand-written entries — the SAME source the
    // page's visible FAQ block renders from (the faqBlock macro in
    // _includes/faq.njk), so the structured data can't drift from on-page
    // copy. Answers may carry inline HTML for display; it's stripped for the
    // schema text. Emitted from head.njk whenever `faqs` is set; keep it off
    // practice pages so a page never emits two FAQPage nodes.
    eleventyConfig.addFilter("faqJsonLd", (canonical, faqs, title) => {
        if (!canonical || !Array.isArray(faqs) || !faqs.length) return "";
        return scriptSafeStringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "name": cleanTitle(title),
            "url": canonical,
            "mainEntity": faqs.map((item) => ({
                "@type": "Question",
                "name": stripHtml(item.q),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": stripHtml(item.a),
                },
            })),
        });
    });

    // DefinedTermSet JSON-LD for enum-reference pages — one set per
    // `termSets:` frontmatter entry ({ key, fragment, name, description }),
    // with the term arrays coming from the bacnetEnums data module (the
    // SAME source the visible tables render from, so schema and table
    // can't drift — the quiz-bank pattern). Each term maps to a
    // DefinedTerm with termCode = the enum number and name = the
    // identifier; desc is optional (the units array has none).
    // `inDefinedTermSet` per term is omitted — implied by nesting, and
    // it would bloat ~130 terms. The @id anchors to a real on-page h2
    // fragment so the node is a resolvable URL. head.njk hardcodes the
    // bacnetEnums lookup today (precedent: quizzes[page.fileSlug]); a
    // second enum domain wanting this is the trigger to promote the
    // lookup to a generic _data/termSets.js wrapper.
    eleventyConfig.addFilter("definedTermSetJsonLd", (canonical, terms, name, fragment, description) => {
        if (!canonical || !Array.isArray(terms) || !terms.length) return "";
        const setId = canonical + "#" + fragment;
        const node = {
            "@context": "https://schema.org",
            "@type": "DefinedTermSet",
            "@id": setId,
            "name": name,
            "url": setId,
        };
        if (description) node.description = description;
        node.hasDefinedTerm = terms.map((t) => {
            const term = {
                "@type": "DefinedTerm",
                "termCode": String(t.id),
                "name": t.name,
            };
            if (t.desc) term.description = stripHtml(t.desc);
            return term;
        });
        return scriptSafeStringify(node);
    });

    // SoftwareApplication JSON-LD for tool pages — declares the per-tool
    // calculator as a free, web-only utility app for Google's
    // SoftwareApplication rich-result eligibility. Uniform shape across
    // every tool page (another drifted count: "all 9 tools" survived to a
    // 14-tool site — audit-2026-06; applicationCategory + operatingSystem don't vary
    // meaningfully); per-page data comes from the existing `title`,
    // `description`, and `canonical` frontmatter. `offers` with price=0
    // satisfies Google's "free app" validation (alternative would be
    // aggregateRating, which we don't have). Emitted from head.njk only
    // when nav: tools AND not on the tools landing itself.
    eleventyConfig.addFilter("softwareApplicationJsonLd", (canonical, title, description) => {
        if (!canonical) return "";
        return scriptSafeStringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": cleanTitle(title),
            "description": description,
            "url": canonical,
            "applicationCategory": "UtilityApplication",
            "operatingSystem": "Web",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
            },
        });
    });

    // TechArticle JSON-LD for education pages — establishes content type,
    // attributes authorship to the Person entity declared on the home page
    // (E-E-A-T), and carries datePublished / dateModified from git history.
    // When the lesson sets `pairedQuiz:` frontmatter (a single 1:1 quiz
    // companion), the node also carries `hasPart` pointing at the quiz's
    // FAQPage node — schema.org pairing that mirrors the
    // `relatedLinks({quizzes: …})` cross-link rendered in the body.
    // Emitted from head.njk only when `nav: education`.
    eleventyConfig.addFilter("techArticleJsonLd", (canonical, title, description, datePublished, dateModified, pairedQuiz) => {
        if (!canonical) return "";
        const node = {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": cleanTitle(title),
            "description": description,
            "url": canonical,
            "mainEntityOfPage": canonical,
            "datePublished": datePublished,
            "dateModified": dateModified,
            "author": { "@id": "https://controlsfreak.dev/#author" },
            "publisher": { "@id": "https://controlsfreak.dev/#website" }
        };
        if (pairedQuiz) {
            node.hasPart = { "@type": "FAQPage", "@id": pairedQuiz };
        }
        return scriptSafeStringify(node);
    });

    return {
        dir: {
            input: INPUT_DIR,
            output: "_site",
            includes: INCLUDES_DIR,
            layouts: `${INCLUDES_DIR}/layouts`
        },
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk"
    };
};
