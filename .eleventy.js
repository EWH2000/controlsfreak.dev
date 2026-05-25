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
    // sitemap.xml is no longer passthrough — html/sitemap.njk renders it
    // from the sitemapPages collection (see below) with git-derived
    // <lastmod> dates. codebase-issues.md #45.

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
        if (offenders.length) {
            throw new Error(
                `description frontmatter must be ${MIN}–${MAX} chars ` +
                `(CLAUDE.md "Templating"):\n${offenders.join("\n")}`
            );
        }
        return [];
    });

    // Pages for sitemap.njk: every template that carries a `canonical`
    // frontmatter (all 20 real pages — the sitemap template itself has
    // none, so it self-excludes). Sorted by canonical URL for a stable,
    // diff-friendly output order.
    eleventyConfig.addCollection("sitemapPages", (collectionApi) =>
        collectionApi.getAll()
            .filter((item) => typeof item.data.canonical === "string")
            .sort((a, b) => a.data.canonical.localeCompare(b.data.canonical))
    );

    // Last-modified date for a source file, from git's last commit that
    // touched it — `git log -1 --format=%cd --date=short -- <path>`.
    // execFileSync (no shell) passes the path as an argv element.
    // Falls back to today's date if git has no record (an uncommitted
    // file, or a build environment without full history). Used by
    // sitemap.njk for <lastmod>. codebase-issues.md #45.
    eleventyConfig.addFilter("gitLastmod", (inputPath) => {
        try {
            const out = execFileSync(
                "git",
                ["log", "-1", "--format=%cd", "--date=short", "--", inputPath],
                { encoding: "utf8" }
            ).trim();
            return out || new Date().toISOString().slice(0, 10);
        } catch (err) {
            return new Date().toISOString().slice(0, 10);
        }
    });

    // First-modified (created) date for a source file — the date of the
    // earliest commit touching the path. Used by head.njk for the
    // `datePublished` field of TechArticle JSON-LD on education pages
    // (`dateModified` reuses gitLastmod). Same fallback shape.
    eleventyConfig.addFilter("gitFirstmod", (inputPath) => {
        try {
            const out = execFileSync(
                "git",
                ["log", "--format=%cd", "--date=short", "--reverse", "--", inputPath],
                { encoding: "utf8" }
            ).trim().split("\n")[0];
            return out || new Date().toISOString().slice(0, 10);
        } catch (err) {
            return new Date().toISOString().slice(0, 10);
        }
    });

    // BreadcrumbList JSON-LD for a page, driven by its `canonical` URL,
    // `nav` frontmatter, and `title`. Returns a JSON string for embedding
    // inside <script type="application/ld+json">, or an empty string when
    // a breadcrumb doesn't apply (home page, pages without `nav`).
    // Google still surfaces breadcrumbs as a rich result under the snippet.
    const SECTION_MAP = {
        tools:      { name: "Tools",      url: "https://controlsfreak.dev/tools/" },
        simulators: { name: "Simulators", url: "https://controlsfreak.dev/simulators/" },
        education:  { name: "Education",  url: "https://controlsfreak.dev/education/" },
        contact:    { name: "Contact",    url: "https://controlsfreak.dev/contact.html" }
    };
    eleventyConfig.addFilter("breadcrumbJsonLd", (canonical, nav, title) => {
        if (!canonical || canonical === "https://controlsfreak.dev/") return "";
        const cleanTitle = (title || "").replace(/\s+—\s+controlsfreak\.dev\s*$/, "");
        const items = [{ name: "Home", url: "https://controlsfreak.dev/" }];
        const section = SECTION_MAP[nav];
        if (section) {
            if (canonical === section.url) {
                items.push({ name: section.name, url: canonical });
            } else {
                items.push(section);
                items.push({ name: cleanTitle, url: canonical });
            }
        } else {
            // No recognized section (e.g. /privacy.html) — flat
            // Home → Page breadcrumb. Skipping unknown nav values would
            // leave top-level utility pages without any breadcrumb at all.
            items.push({ name: cleanTitle, url: canonical });
        }
        return JSON.stringify({
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
    // injection (the same data is also emitted as FAQPage JSON-LD via
    // faqPageJsonLd below — same safety story applies there too).
    eleventyConfig.addFilter("safeScriptJson", (value) =>
        JSON.stringify(value).replace(/</g, "\\u003c")
    );

    // TechArticle JSON-LD for education pages — establishes content type,
    // attributes authorship to the Person entity declared on the home page
    // (E-E-A-T), and carries datePublished / dateModified from git history.
    // Emitted from head.njk only when `nav: education`.
    eleventyConfig.addFilter("techArticleJsonLd", (canonical, title, description, datePublished, dateModified) => {
        if (!canonical) return "";
        const cleanTitle = (title || "").replace(/\s+—\s+controlsfreak\.dev\s*$/, "");
        return JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": cleanTitle,
            "description": description,
            "url": canonical,
            "mainEntityOfPage": canonical,
            "datePublished": datePublished,
            "dateModified": dateModified,
            "author": { "@id": "https://controlsfreak.dev/#author" },
            "publisher": { "@id": "https://controlsfreak.dev/#website" }
        });
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
