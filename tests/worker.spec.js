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

// codebase-issues #84: long-lived asset caching. Fonts are immutable
// by name; everything else is immutable only when the request carries
// the ?v= the templates append — unversioned stays on the safe
// revalidate default, and HTML is never touched.
test('asset cache-control: fonts always, ?v= opt-in, HTML never', async () => {
    const worker = await loadWorker();
    const get = async (path) => {
        const res = await worker.fetch(new Request(ORIGIN + path), stubEnv());
        return res.headers.get('cache-control');
    };
    expect(await get('/assets/fonts/overpass-latin-var.woff2')).toContain('immutable');
    expect(await get('/scripts/units.js?v=3.11.1')).toContain('immutable');
    expect(await get('/styles.css?v=3.11.1')).toContain('immutable');
    expect(await get('/scripts/units.js')).toBeNull();         // stub sets none; worker must not add
    expect(await get('/tools/signal-scaling.html?v=1')).toBeNull(); // html never fingerprinted
    expect(await get('/')).toBeNull();
});

// ── handleContact security paths (#94) ──────────────────────────────
// The honeypot test above is the only one that reaches into the POST
// body, and it short-circuits at worker.js's honeypot return — BEFORE
// the Turnstile gate, the hostname pin, and Resend. Those are the
// worker's only real attack surface, and a fail-OPEN regression there
// (relaxing the gate to `!== false`, dropping the hostname pin) ships
// green because the worker fails soft with no console error. The worker
// calls bare fetch() for both upstreams (= globalThis.fetch, resolved
// at call time), so we drive every branch by swapping globalThis.fetch.

// A well-formed submission that clears every pre-Turnstile gate: no
// honeypot, valid email/message, a token. Per-test tweaks via overrides.
function validBody(overrides = {}) {
    return new URLSearchParams({
        email: 'tech@example.com',
        message: 'A genuine question about BACnet MS/TP wiring.',
        name: 'A. Tech',
        'cf-turnstile-response': 'turnstile-token',
        ...overrides,
    }).toString();
}

// Stubbed fetch that routes by upstream URL. `verify` is the parsed
// siteverify JSON (status defaults 200); `verifyStatus` forces a non-2xx
// siteverify; the *Throws flags simulate a network failure / timeout.
function fetchStub({ verify, verifyStatus = 200, verifyThrows = false,
                    resendStatus = 200, resendThrows = false } = {}) {
    return async (url) => {
        const u = String(url);
        if (u.includes('siteverify')) {
            if (verifyThrows) throw new Error('siteverify unreachable');
            return new Response(JSON.stringify(verify ?? {}), { status: verifyStatus });
        }
        if (u.includes('api.resend.com')) {
            if (resendThrows) throw new Error('resend unreachable');
            return new Response('{"id":"stub"}', { status: resendStatus });
        }
        throw new Error('unexpected upstream fetch: ' + u);
    };
}

// POST a contact form with globalThis.fetch swapped for `stub`, restored
// in finally so one test's stub can't leak into the next.
async function postContact(worker, { body = validBody(), stub, headers = {} } = {}) {
    const realFetch = globalThis.fetch;
    if (stub) globalThis.fetch = stub;
    try {
        return await worker.fetch(new Request(ORIGIN + '/api/contact', {
            method: 'POST',
            headers: {
                origin: ORIGIN,
                'content-type': 'application/x-www-form-urlencoded',
                'content-length': String(Buffer.byteLength(body)),
                ...headers,
            },
            body,
        }), stubEnv());
    } finally {
        globalThis.fetch = realFetch;
    }
}

const GOOD_VERIFY = { success: true, hostname: 'controlsfreak.dev' };

test('valid submission: passing Turnstile + Resend ok → 200', async () => {
    const worker = await loadWorker();
    const res = await postContact(worker, { stub: fetchStub({ verify: GOOD_VERIFY }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
});

// Turnstile must fail CLOSED — the gate is success === true, not "not
// false". A degraded siteverify body that merely lacks a real success
// must reject (the exact mistake the worker comment warns against).
for (const [label, verify] of [
    ['empty object',          {}],
    ['success: null',         { success: null }],
    ['success: "true" string', { success: 'true' }],
    ['success: false',        { success: false }],
]) {
    test(`Turnstile fails closed on degraded verify (${label}) → 400`, async () => {
        const worker = await loadWorker();
        // hostname present so ONLY the success check can reject here.
        const res = await postContact(worker, {
            stub: fetchStub({ verify: { hostname: 'controlsfreak.dev', ...verify } }),
        });
        expect(res.status).toBe(400);
    });
}

test('Turnstile non-2xx siteverify fails closed → 400', async () => {
    const worker = await loadWorker();
    const res = await postContact(worker, {
        stub: fetchStub({ verify: GOOD_VERIFY, verifyStatus: 502 }),
    });
    expect(res.status).toBe(400);
});

test('Turnstile siteverify network failure fails closed → 400', async () => {
    const worker = await loadWorker();
    const res = await postContact(worker, { stub: fetchStub({ verifyThrows: true }) });
    expect(res.status).toBe(400);
});

test('hostname pin rejects a token minted on another host → 400 (#34)', async () => {
    const worker = await loadWorker();
    const res = await postContact(worker, {
        stub: fetchStub({ verify: { success: true, hostname: 'localhost' } }),
    });
    expect(res.status).toBe(400);
});

test('Resend non-2xx → 502', async () => {
    const worker = await loadWorker();
    const res = await postContact(worker, {
        stub: fetchStub({ verify: GOOD_VERIFY, resendStatus: 500 }),
    });
    expect(res.status).toBe(502);
});

test('Resend network failure → 502', async () => {
    const worker = await loadWorker();
    const res = await postContact(worker, {
        stub: fetchStub({ verify: GOOD_VERIFY, resendThrows: true }),
    });
    expect(res.status).toBe(502);
});

test('malformed email is rejected before any upstream → 400', async () => {
    const worker = await loadWorker();
    // The spy records + throws if reached, so the assertion that calls
    // stayed empty proves the 400 is EMAIL_RE (pre-Turnstile), not a
    // Turnstile failure.
    const calls = [];
    const spy = async (url) => { calls.push(String(url)); throw new Error('should not reach ' + url); };
    const res = await postContact(worker, { body: validBody({ email: 'user@.example.com' }), stub: spy });
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
});

test('oversize body is rejected before parsing → 413', async () => {
    const worker = await loadWorker();
    const calls = [];
    const spy = async (url) => { calls.push(String(url)); throw new Error('should not reach ' + url); };
    // Content-Length > MAX_BODY (20 KB) short-circuits before formData()
    // and before any upstream.
    const res = await postContact(worker, { body: validBody({ message: 'x'.repeat(21 * 1024) }), stub: spy });
    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
});
