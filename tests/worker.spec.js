// Worker tests (audit-2026-06 #45): src/worker.js had zero coverage —
// a LEGACY_TOOL_REDIRECTS target drifting to a 404 would ship green
// even though CLAUDE.md instructs growing the map on every page move.
// Node-side like psychro-engine.spec.js: the redirect-target check is
// the PAGES-drift-test pattern against _site/ (built by the webServer
// hook before any test runs), and the behavioral checks import the
// ES-module worker with a stubbed env.ASSETS — un-fixme'ing the spirit
// of the parked honeypot item (codebase-issues #20 bullet 5).

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WORKER_PATH = path.join(__dirname, '..', 'src', 'worker.js');
const ORIGIN = 'https://controlsfreak.dev';

test('every LEGACY_TOOL_REDIRECTS target resolves under _site/ (#45)', () => {
    const src = fs.readFileSync(WORKER_PATH, 'utf8');
    const entries = [...src.matchAll(/"(\/[^"]+\.html)":\s+"(\/[^"]+\.html)"/g)];
    expect(entries.length, 'sanity: the redirect map has entries').toBeGreaterThanOrEqual(3);
    for (const [, from, to] of entries) {
        const built = path.join(__dirname, '..', '_site', to);
        expect(fs.existsSync(built), `${from} → ${to} must exist in _site`).toBe(true);
    }
});

async function loadWorker() {
    // The repo is a CommonJS package, so Node refuses to import() the
    // ES-module worker by its .js path — copy it to a temp .mjs first.
    // The dynamic-import cache makes repeat calls within a run cheap.
    const tmp = path.join(os.tmpdir(), 'cf-worker-under-test.mjs');
    fs.writeFileSync(tmp, fs.readFileSync(WORKER_PATH));
    return (await import(pathToFileURL(tmp).href)).default;
}

const stubEnv = () => ({
    ASSETS: { fetch: () => new Response('asset', { status: 200 }) },
    TURNSTILE_SECRET: 'test-secret',
    RESEND_API_KEY: 'test-key',
});

test('legacy tool URLs 301 to their simulator homes', async () => {
    const worker = await loadWorker();
    const res = await worker.fetch(
        new Request(ORIGIN + '/tools/pid-tuner.html'), stubEnv());
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe(ORIGIN + '/simulators/pid-tuner.html');
});

test('non-POST /api/contact is 405 with Allow', async () => {
    const worker = await loadWorker();
    const res = await worker.fetch(
        new Request(ORIGIN + '/api/contact'), stubEnv());
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
});

test('cross-origin POST is rejected before parsing', async () => {
    const worker = await loadWorker();
    const res = await worker.fetch(
        new Request(ORIGIN + '/api/contact', {
            method: 'POST',
            headers: { origin: 'https://evil.example' },
            body: new URLSearchParams({ message: 'hi' }),
        }), stubEnv());
    expect(res.status).toBe(403);
});

test('honeypot submissions get a success-shaped response and send nothing', async () => {
    const worker = await loadWorker();
    // The "website" field is invisible to humans; a filled value walks
    // the bot path — success-shaped JSON, no Turnstile or Resend call
    // (this test makes no network requests; reaching either upstream
    // would throw on the stub secrets).
    // Constructed Requests don't get a synthesized Content-Length the
    // way a dispatched browser POST does — set it like the real form.
    const body = new URLSearchParams({
        website: 'http://spam.example',
        email: 'bot@example.com',
        message: 'buy things',
        'cf-turnstile-response': 'tok',
    }).toString();
    const res = await worker.fetch(
        new Request(ORIGIN + '/api/contact', {
            method: 'POST',
            headers: {
                origin: ORIGIN,
                'content-type': 'application/x-www-form-urlencoded',
                'content-length': String(body.length),
            },
            body,
        }), stubEnv());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
});

test('absent Content-Length is rejected (MAX_BODY hardening)', async () => {
    const worker = await loadWorker();
    // A chunked/hand-crafted POST without Content-Length used to skip
    // the size pre-check entirely — formData() has no documented
    // ceiling below the platform cap. The site's own form always sends
    // the header.
    const res = await worker.fetch(
        new Request(ORIGIN + '/api/contact', {
            method: 'POST',
            headers: { origin: ORIGIN },
            body: new ReadableStream({
                start(c) { c.enqueue(new TextEncoder().encode('message=hi')); c.close(); },
            }),
            duplex: 'half',
        }), stubEnv());
    expect(res.status).toBe(411);
});
