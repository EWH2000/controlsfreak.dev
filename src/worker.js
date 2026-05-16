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

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONTACT_ADDRESS = "contact@controlsfreak.dev";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

async function handleContact(request, env) {
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
    const name = field("name").trim();
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

    // ── Turnstile ─────────────────────────────────────────────
    let verify;
    try {
        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret: env.TURNSTILE_SECRET || "",
                response: token,
            }),
        });
        verify = await res.json();
    } catch (err) {
        verify = { success: false };
    }
    if (!verify || verify.success === false) {
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
        sent = await fetch("https://api.resend.com/emails", {
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
        });
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
        if (request.method === "POST" && url.pathname === "/api/contact") {
            return handleContact(request, env);
        }
        return env.ASSETS.fetch(request);
    },
};
