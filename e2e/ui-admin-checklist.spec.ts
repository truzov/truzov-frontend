import { expect, test } from '@playwright/test';

// Run against the isolated admin server with this fixture; no external API is contacted.
for (const width of [375, 768, 1440]) {
  test(`public seller application and password reset at ${width}px`, async ({ page }) => {
    const writes: string[] = [];
    await page.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'POST') writes.push(path);
      const data = path.endsWith('/seller-applications') ? { reference: 'FIXTURE-APP', id: 'fixture-application' }
        : path.endsWith('/send') ? { otpSessionId: 'fixture-reset', expiresInSeconds: 300, resendAfterSeconds: 30 }
        : null;
      return route.fulfill({ json: { data }, headers: {
        'access-control-allow-origin': 'http://127.0.0.1:3000', 'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS',
      } });
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/apply');
    await expect(page.getByRole('heading', { name: 'Apply as a seller' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Brand / company name').fill('Fixture brand');
    await page.getByLabel('Contact person').fill('Fixture person');
    await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
    await page.getByLabel('Phone').fill('9000000001');
    await page.getByLabel('Product category').fill('Food');
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('status')).toContainText('Application received');
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const identifier = page.getByLabel('Email or phone');
    await identifier.focus();
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor)).toBe('rgb(100, 116, 139)');
    await identifier.fill('fixture@example.invalid');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await expect(page.getByLabel('Verification code')).toBeVisible();
    await page.getByLabel('Verification code').fill('123456');
    await page.getByLabel('New password', { exact: true }).fill('FixturePass123');
    await page.getByLabel('Confirm new password').fill('FixturePass123');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByText('Your password has been changed. Sign in with your new password.', { exact: true })).toBeVisible();
    expect(writes).toEqual(['/api/v1/support/seller-applications', '/api/v1/auth/password-reset/send', '/api/v1/auth/password-reset/confirm']);
  });
}
