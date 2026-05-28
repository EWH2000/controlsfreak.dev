// Dev tool — screenshots every diagram-class SVG on the site to /tmp/audit-*.png
// so a visual audit pass can start from rendered output instead of source.
//
// Why this exists: a previous diagram audit dispatched source-only readers
// that reported "all clean" while the rendered SVG had real overlaps and
// a missing arrowhead the coordinate math missed. One command that dumps
// every diagram as a PNG turns those audits into eyeball-on-image, not
// arithmetic-on-coordinates.
//
// Usage: `npm run screenshots` (needs a server on :8000; `npm run dev` or
// the playwright-config webServer both work). Set CF_BASE_URL to override.
//
// Targets the diagram-class set in DIAGRAM_SELECTOR — currently the chart-
// scale SVGs across education, tools, simulators. Tiny icons (sbg-motif,
// fs-icon-*) are excluded by class, not by size. Add a class here when a
// new diagram family lands.

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.CF_BASE_URL || 'http://localhost:8000';
const OUT_DIR = process.env.CF_SCREENSHOT_DIR || '/tmp';
const DIAGRAM_SELECTOR = [
    'svg.edu-svg',
    'svg.bac-svg',
    'svg.fb-svg',
    'svg.mb-svg',
    'svg.vfd-svg',
    'svg.lp-w-schematic',
].join(', ');

async function fetchSitemapUrls() {
    const res = await fetch(BASE + '/sitemap.xml');
    if (!res.ok) {
        throw new Error(`sitemap fetch failed: ${res.status} — is the dev server running on ${BASE}?`);
    }
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    return urls.map((u) => new URL(u).pathname);
}

function slugFor(pathname) {
    // /education/refrigerant-cycle-basics.html → education-refrigerant-cycle-basics
    // /                                        → index
    return pathname
        .replace(/^\//, '')
        .replace(/\.html$/, '')
        .replace(/\/$/, '/index')
        .replace(/\//g, '-')
        || 'index';
}

async function main() {
    await mkdir(OUT_DIR, { recursive: true });
    const paths = await fetchSitemapUrls();
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    let saved = 0;
    let skipped = 0;
    for (const pathname of paths) {
        await page.goto(BASE + pathname, { waitUntil: 'domcontentloaded' });
        const svgs = await page.locator(DIAGRAM_SELECTOR).all();
        if (svgs.length === 0) {
            skipped++;
            continue;
        }
        const pageSlug = slugFor(pathname);
        for (let i = 0; i < svgs.length; i++) {
            const id = (await svgs[i].getAttribute('id')) || `idx${i}`;
            const out = join(OUT_DIR, `audit-${pageSlug}-${id}.png`);
            await svgs[i].screenshot({ path: out });
            console.log(out);
            saved++;
        }
    }
    await browser.close();
    console.log(`\nsaved ${saved} screenshot${saved === 1 ? '' : 's'} from ${paths.length - skipped} page${paths.length - skipped === 1 ? '' : 's'} (${skipped} page${skipped === 1 ? '' : 's'} carry no diagrams)`);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
