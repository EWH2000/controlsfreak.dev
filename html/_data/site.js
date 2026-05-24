// Site-level data exposed to Nunjucks templates as `site.*`.
// Version mirrors package.json so the footer and the machine-readable
// manifest can't drift apart — bump package.json and the footer updates
// at build time. See codebase-issues.md #31.
//
// v2.0.0 — also expose buildDate / buildYear so the home-page status
// line and the footer can render a semantic `<time datetime>` element.
// buildDate is the latest commit date in the working tree (git log -1
// across all paths); falls back to today if git has no record. The
// Cloudflare build runs `npm install && npm run build` after each push
// to main, so the date lands on the merge commit's date — close enough
// for a status line.

const { execFileSync } = require("child_process");

function gitLastCommitDate() {
    try {
        return execFileSync(
            "git",
            ["log", "-1", "--format=%cd", "--date=short"],
            { encoding: "utf8" }
        ).trim() || new Date().toISOString().slice(0, 10);
    } catch (err) {
        return new Date().toISOString().slice(0, 10);
    }
}

module.exports = {
    version:   require("../../package.json").version,
    buildDate: gitLastCommitDate(),
    buildYear: String(new Date().getFullYear()),
    // Manual cadence — bump when a content-review sweep lands across
    // pages. NOT git-derived: the whole point of REV is editorial
    // cadence (when the site was last audited end-to-end), not commit
    // cadence. Last sweep: PRs #110–113 (Batches 1–4 of the content
    // audit), landed 2026-05-24.
    lastRev:   '2026-05-24',
};
