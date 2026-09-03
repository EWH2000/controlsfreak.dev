// Directory data file — applies to every template under html/.
//
// 11ty's default permalink turns foo.html into foo/index.html
// ("pretty URLs"). We override it so signal-scaling.html lands at
// _site/tools/signal-scaling.html with its original filename intact.
// Two reasons we need this:
//
//   1. Every anchor on the site uses explicit .html extensions
//      (e.g. href="/tools/signal-scaling.html"). The pretty-URL
//      form would 404 against those.
//   2. wrangler.jsonc has assets.html_handling: auto-trailing-slash,
//      which expects foo.html files in place — not foo/index.html
//      directories.
//
// page.filePathStem strips the .html extension and gives a path like
// /tools/signal-scaling; appending ".html" puts it back. Works for
// index.html files too (html/index.html → filePathStem "/index" →
// permalink "/index.html").

module.exports = {
    locale: "en",
    permalink: function(data) {
        return data.page.filePathStem + ".html";
    }
};
