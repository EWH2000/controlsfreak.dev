// 11ty config — see codebase-issues.md entry #4 for the original
// decision rationale. The build's only job is to template the shared
// HTML chrome (head / nav / footer / layout) into each page; everything
// else passes through unchanged. Per-page logic remains vanilla JS in
// the page's inline <script>; shared engines live as classic scripts
// under html/scripts/. No bundler, no transpile.

const { execFileSync } = require("child_process");

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
        education: [["fundamentals", "Fundamentals"], ["hydronics", "Hydronics"], ["refrigerant", "Refrigerant"], ["forced-air", "Forced Air Systems"], ["protocols", "Protocols"]],
        practice: [["modbus", "Modbus"], ["bacnet", "BACnet"], ["hydronics", "Hydronics"], ["refrigeration", "Refrigeration"], ["controls", "Controls"], ["psychrometrics", "Psychrometrics"], ["forced-air", "Forced Air Systems"], ["field", "Field Drills"]],
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
        return answer + (answer && explanation ? ". " : "") + explanation;
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
            input: "html",
            output: "_site",
            includes: "_includes",
            layouts: "_includes/layouts"
        },
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk"
    };
};
