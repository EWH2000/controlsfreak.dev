// Playwright configuration. `baseURL` is the single source of truth for
// the local test host — specs use leading-slash paths (`page.goto('/')`,
// `'/tools/signal-scaling.html'`) and Playwright resolves them against it.
// The `webServer` block makes `npm test` self-sufficient: it builds the
// site and serves `_site/` itself, so a fresh checkout needs no second
// terminal. `reuseExistingServer` (off in CI) skips that when a dev
// server — `npm run dev`, same port — is already running locally.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    reporter: 'list',
    // Retry in CI only — absorbs a genuine flake without masking a
    // local failure (process.env.CI is set by GitHub Actions).
    retries: process.env.CI ? 2 : 0,
    use: {
        baseURL: 'http://localhost:8000',
    },
    webServer: {
        command: 'npm run build && python3 -m http.server 8000 --directory _site',
        // Readiness probes /sitemap.xml, not "/": any unrelated server
        // already squatting on :8000 (the documented pantryapp trap)
        // answers "/" with a 200 and the whole suite then fails 108
        // opaque ways — a 404 on the sitemap keeps Playwright waiting
        // and surfaces an explicit port-bind error instead
        // (audit-2026-06 polish, verified mechanism).
        url: 'http://localhost:8000/sitemap.xml',
        reuseExistingServer: !process.env.CI,
    },
});
