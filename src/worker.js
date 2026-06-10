// Cloudflare Worker for controlsfreak.dev.
//
// Handles POST /api/contact (validate input, drop bots, verify Turnstile,
// send the message via Resend). Every other request falls through to the
// static assets (env.ASSETS), so the site keeps behaving like a plain
// static-assets deploy.
//
// Secrets expected in the environment (set with `wrangler secret put ...`):
//   TURNSTILE_SECRET   — Cloudflare Turnstile secret key
//   RESEND_API_KEY     — Resend API key

// Not RFC 5321-exact — deliberately simple. Rejects empty parts and
// leading/trailing dots in the local part and the domain (.user@x.com,
// user.@x.com, user@.x.com, user@x.com.) so malformed input gets a 400
// "valid email" here instead of Resend's generic 502. Internal and
// consecutive dots are still tolerated — only the pathological-dot
// positions are in scope.
const EMAIL_RE = /^[^\s@.](?:[^\s@]*[^\s@.])?@[^\s@.](?:[^\s@]*[^\s@.])?\.[^\s@.](?:[^\s@]*[^\s@.])?$/;
const CONTACT_ADDRESS = "contact@controlsfreak.dev";
const ORIGIN_ALLOWED = "https://controlsfreak.dev";
const MAX_BODY = 20 * 1024;       // 20 KB — legitimate form is < 6 KB.
const FETCH_TIMEOUT_MS = 8000;    // Turnstile + Resend upstream hard cap.

// Pages that moved from /tools/ to /simulators/ when the Simulators section
// landed. 301 so search engines transfer signal to the new URL and so any
// older bookmarks / inbound links keep working. html_handling on the assets
// binding handles the .html → clean-URL hop on the new path on its own.
const LEGACY_TOOL_REDIRECTS = {
    "/tools/pid-tuner.html":             "/simulators/pid-tuner.html",
    "/tools/vfd-mock.html":              "/simulators/vfd-mock.html",
    "/tools/function-block-editor.html": "/simulators/function-block-editor.html",
};

// ── Static-asset caching (codebase-issues #84, owner decision
// 2026-06-10) ──────────────────────────────────────────────────────
// Workers Assets defaults every file to `max-age=0, must-revalidate`,
// which cost repeat visitors ~7-8 conditional revalidations per
// navigation. Long-lived caching instead, with two safety shapes:
//   /assets/fonts/*   — always immutable. Font files are immutable
//                       BY NAME (rename on re-subset — the rule lives
//                       in assets/fonts/LICENSE.txt).
//   /scripts/*, /styles.css, /assets/* — immutable ONLY when the
//                       request carries the `?v=` param the templates
//                       append ({{ site.version }}), so an unversioned
//                       reference can never get stuck stale: it just
//                       keeps the revalidate default.
// HTML keeps the default on purpose — deploys propagate instantly.
// NOTE: the package.json version bump is load-bearing for busting —
// a styles/scripts change without a bump leaves returning visitors
// on the old file for up to a year (owner accepted, no CI guard).
function assetCacheControl(url) {
    if (url.pathname.startsWith("/assets/fonts/")) {
        return "public, max-age=31536000, immutable";
    }
    const fingerprintable =
        url.pathname.startsWith("/scripts/") ||
        url.pathname.startsWith("/assets/") ||
        url.pathname === "/styles.css";
    if (fingerprintable && url.searchParams.has("v")) {
        return "public, max-age=31536000, immutable";
    }
    return null;
}

function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "x-content-type-options": "nosniff",
            "cache-control": "no-store",
            ...extraHeaders,
        },
    });
}

// fetch() wrapper that aborts on timeout so a hung upstream can't stall the
// user's spinner until Cloudflare kills the worker invocation.
async function fetchWithTimeout(url, init, timeoutMs) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: ac.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function handleContact(request, env) {
    // ── Origin check ──────────────────────────────────────────
    // Browsers send Origin on cross-origin POST. If it's present and not us,
    // it's a CSRF / drive-by — short-circuit before any parsing cost.
    const origin = request.headers.get("origin");
    if (origin && origin !== ORIGIN_ALLOWED) {
        return json({ ok: false, error: "Bad origin." }, 403);
    }

    // ── Body size pre-check ───────────────────────────────────
    // Cloudflare caps bodies at 100 MB; we want < 20 KB. The header is
    // the only cheap pre-parse signal, so absent or non-numeric
    // Content-Length (a chunked/hand-crafted POST — the site's own form
    // always sends it) is rejected outright: formData() has NO
    // documented ceiling below the platform cap, so letting headerless
    // bodies through skipped the size check entirely (audit-2026-06
    // polish; the previous comment claimed otherwise).
    const contentLength = parseInt(request.headers.get("content-length") || "", 10);
    if (!Number.isFinite(contentLength)) {
        return json({ ok: false, error: "Missing request length." }, 411);
    }
    if (contentLength > MAX_BODY) {
        return json({ ok: false, error: "Request body too large." }, 413);
    }

    let form;
    try {
        form = await request.formData();
    } catch (err) {
        return json({ ok: false, error: "Could not read the form data." }, 400);
    }

    // formData.get returns string | File | null. The form has no file inputs,
    // so a File here would be from a hand-crafted POST — coerce-to-empty so
    // it can't sneak through as "[object File]".
    const field = (name) => {
        const v = form.get(name);
        return typeof v === "string" ? v : "";
    };

    // ── Honeypot ──────────────────────────────────────────────
    // The "website" field is hidden from humans (off-screen in CSS). If it
    // came back filled, it's a bot — return a success-shaped response so it
    // moves on, but don't send anything.
    if (field("website").trim() !== "") {
        return json({ ok: true });
    }

    // ── Validate ──────────────────────────────────────────────
    // Strip CR/LF from name — today it lands in body text only, but this
    // future-proofs against a refactor that ever templates name into a header.
    const name = field("name").trim().replace(/[\r\n]+/g, " ");
    const email = field("email").trim();
    const message = field("message").trim();
    const token = field("cf-turnstile-response");

    if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
        return json({ ok: false, error: "Please enter a valid email address." }, 400);
    }
    if (!message || message.length > 5000) {
        return json({ ok: false, error: "Message must be between 1 and 5000 characters." }, 400);
    }
    if (name.length > 200) {
        return json({ ok: false, error: "That name is too long." }, 400);
    }
    if (!token) {
        return json({ ok: false, error: "Verification failed." }, 400);
    }

    // ── Turnstile ─────────────────────────────────────────────
    // Gate explicitly on success === true (not "not false"): a degraded
    // siteverify response of {}, {success: null}, {success: "true"}, or a
    // non-2xx body that happens to lack a success field must fail closed.
    let verify;
    try {
        const res = await fetchWithTimeout(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: { "content-type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    secret: env.TURNSTILE_SECRET || "",
                    response: token,
                }),
            },
            FETCH_TIMEOUT_MS,
        );
        verify = res.ok ? await res.json() : { success: false };
    } catch (err) {
        verify = { success: false };
    }
    // Hostname check: tokens are minted against whatever hostnames the
    // widget config allows (commonly localhost during testing) — without
    // this, a token minted on an attacker's own machine with the public
    // sitekey verifies fine and Turnstile stops being a per-message
    // human cost (audit-2026-06 #34; defense-in-depth alongside the
    // dashboard's allowed-hostnames list).
    if (!verify || verify.success !== true || verify.hostname !== "controlsfreak.dev") {
        return json({ ok: false, error: "Verification failed." }, 400);
    }

    // ── Send via Resend ───────────────────────────────────────
    // Collapse whitespace for the subject so a multi-line message doesn't
    // produce a broken header.
    const subjectSnippet = message.slice(0, 60).replace(/\s+/g, " ").trim();
    const subject = "Contact form: " + (subjectSnippet || "No subject");
    const text =
        "From: " + (name || "(not provided)") + "\n" +
        "Email: " + email + "\n\n" +
        message + "\n";

    let sent;
    try {
        sent = await fetchWithTimeout(
            "https://api.resend.com/emails",
            {
                method: "POST",
                headers: {
                    "authorization": "Bearer " + (env.RESEND_API_KEY || ""),
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    from: CONTACT_ADDRESS,
                    to: CONTACT_ADDRESS,
                    // Reply goes to the actual sender, not back to ourselves.
                    reply_to: email,
                    subject,
                    text,
                }),
            },
            FETCH_TIMEOUT_MS,
        );
    } catch (err) {
        console.error("Resend request failed", err);
        return json({ ok: false, error: "Could not send message right now." }, 502);
    }

    if (!sent.ok) {
        const detail = await sent.text().catch(() => "");
        console.error("Resend returned non-2xx", sent.status, detail);
        return json({ ok: false, error: "Could not send message right now." }, 502);
    }

    return json({ ok: true });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const legacyTarget = LEGACY_TOOL_REDIRECTS[url.pathname];
        if (legacyTarget) {
            return Response.redirect(new URL(legacyTarget, url.origin), 301);
        }
        if (url.pathname === "/api/contact") {
            if (request.method === "POST") {
                return handleContact(request, env);
            }
            return json(
                { ok: false, error: "Method not allowed." },
                405,
                { allow: "POST" },
            );
        }
        const assetRes = await env.ASSETS.fetch(request);
        const cc = assetCacheControl(url);
        if (cc && assetRes.ok) {
            const cached = new Response(assetRes.body, assetRes);
            cached.headers.set("cache-control", cc);
            return cached;
        }
        return assetRes;
    },
};
