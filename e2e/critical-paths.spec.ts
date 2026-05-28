import { expect, test } from '@playwright/test';

test('customer can browse to a product page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Scientific Purity/i })).toBeVisible();
  await page.getByRole('link', { name: /Pure Wildflower Honey/i }).first().click();
  await expect(page.getByRole('heading', { name: /Pure Wildflower Honey/i })).toBeVisible();
  await expect(page.getByText(/Lab Verified Authentic/i)).toBeVisible();
});

test('admin verification board renders', async ({ page }) => {
  await page.goto('/admin/verification');
  await expect(page.getByRole('heading', { name: /Verification Kanban/i })).toBeVisible();
  await expect(page.getByText(/Submitted/i).first()).toBeVisible();
});
