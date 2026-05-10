const { test, expect } = require('@playwright/test');

test('homepage loads', async ({ page }) => {
  await page.goto('http://localhost:8000');
  await expect(page).toHaveTitle(/.+/);
});
