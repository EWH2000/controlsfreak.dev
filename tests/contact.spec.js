const { test, expect } = require('@playwright/test');

// In production the page is served at the clean URL "/contact" via the
// Worker's html_handling; the local `python -m http.server` only knows the
// real file path, so the tests hit /contact.html.
const CONTACT_URL = '/contact.html';

test('contact page loads', async ({ page }) => {
    const res = await page.goto(CONTACT_URL);
    expect(res.status()).toBe(200);
    await expect(page.locator('#contact-form')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
});

test('empty submit triggers built-in validation and makes no network call', async ({ page }) => {
    await page.goto(CONTACT_URL);

    let apiCalled = false;
    page.on('request', (r) => { if (r.url().includes('/api/contact')) apiCalled = true; });

    await page.click('#contact-form button[type="submit"]');

    // Required fields are empty, so the browser blocks submission before our
    // onsubmit handler runs: no fetch, the result panel stays hidden, and the
    // form reports itself invalid. No hard wait — the toBeHidden() check
    // auto-retries; checkValidity() and apiCalled are settled the moment the
    // synchronous click handler returns (browser-side validation is
    // synchronous; if it had submitted the form, a fetch would have already
    // been queued and the `request` listener triggered).
    await expect(page.locator('#contact-result')).toBeHidden();
    expect(apiCalled).toBe(false);
    expect(await page.evaluate(() => document.getElementById('contact-form').checkValidity())).toBe(false);
});

// TODO: this exercises POST /api/contact, which only exists on the Worker.
// The local python http.server can't serve it. test.fixme (not test.skip)
// marks the test as "expected to pass once the wrangler-dev fixture exists";
// Playwright reports it with a fixme annotation that nudges follow-up.
// Run against a deployed Worker (or `wrangler dev`) to verify the honeypot
// path: filling the hidden "website" field should get back { ok: true } and
// no email should be sent.
test.fixme('honeypot submission returns { ok: true } without sending mail', async ({ page }) => {
    await page.goto(CONTACT_URL);
    const data = await page.evaluate(async () => {
        const body = new URLSearchParams({
            website: 'http://bot.example/',   // honeypot — a real visitor never fills this
            name: 'Spam Bot',
            email: 'bot@example.com',
            message: 'buy my stuff',
        });
        const res = await fetch('/api/contact', { method: 'POST', body });
        return res.json();
    });
    expect(data.ok).toBe(true);
});
