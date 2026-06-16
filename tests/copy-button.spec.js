// Regression test for /scripts/ui.js copyText() (codebase-issues #105).
// All copy buttons route through copyText (copyReadouts calls it), exposed
// as window.copyText. We drive it directly with a STUBBED
// navigator.clipboard.writeText whose promise we control, so we can land a
// second click inside the race window (before the first write resolves)
// deterministically — no clipboard permission needed.

const { test, expect } = require('@playwright/test');

test('copyText latches synchronously: a fast double-click never sticks (#105)', async ({ page }) => {
    await page.goto('/tools/signal-scaling.html');

    const result = await page.evaluate(async () => {
        // Stub writeText with a controllable pending promise.
        const resolvers = [];
        navigator.clipboard.writeText = () => new Promise((res) => resolvers.push(res));

        const btn = document.getElementById('ss-copy-scaling');
        const original = btn.textContent;

        // Two clicks before the first write resolves. With the fix, the
        // first call adds `copied` synchronously, so the second hits the
        // entry guard and no-ops → only ONE writeText fires. Without it,
        // both fire and the second's callback captures orig='copied!',
        // sticking the button.
        window.copyText(btn, 'AAA');
        window.copyText(btn, 'BBB');
        const calls = resolvers.length;

        resolvers.forEach((r) => r());                       // resolve the write(s)
        await new Promise((r) => setTimeout(r, 0));           // let .then() run
        const duringFlash = btn.textContent;
        await new Promise((r) => setTimeout(r, 1850));        // past the 1.8s flash
        return { calls, original, duringFlash, afterFlash: btn.textContent };
    });

    expect(result.calls, 'second click no-ops → only one writeText').toBe(1);
    expect(result.duringFlash).toBe('copied!');              // success path still flashes
    expect(result.afterFlash, 'reverts to original, not stuck on copied!').toBe(result.original);
});
