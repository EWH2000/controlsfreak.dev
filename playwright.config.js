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
        url: 'http://localhost:8000',
        reuseExistingServer: !process.env.CI,
    },
});
