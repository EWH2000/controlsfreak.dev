// 11ty config — see codebase-issues.md entry #4 for the original
// decision rationale. The build's only job is to template the shared
// HTML chrome (head / nav / footer / layout) into each page; everything
// else passes through unchanged. Per-page logic remains vanilla JS in
// the page's inline <script>; shared engines live as classic scripts
// under html/scripts/. No bundler, no transpile.

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
    eleventyConfig.addPassthroughCopy({ "html/sitemap.xml": "sitemap.xml" });

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
