// Site-level data exposed to Nunjucks templates as `site.*`.
// Version mirrors package.json so the footer and the machine-readable
// manifest can't drift apart — bump package.json and the footer updates
// at build time. See codebase-issues.md #31.

module.exports = {
    version: require("../../package.json").version
};
