import { expect, test } from '@playwright/test';

/**
 * Storefront smoke tests against a REAL backend.
 *
 * Prerequisites (these tests fail loudly rather than silently passing if they are missing):
 *   1. Backend running on http://localhost:8080 with SPRING_PROFILES_ACTIVE=dev
 *   2. Seed data loaded: psql -U truzov -d truzov -f src/main/resources/db/seed/data.sql
 *
 * Expectations reference the seeded catalogue by name, so a change to data.sql should change
 * these values too:
 *   prd_honey / raw-forest-honey-500g   Raw Forest Honey 500g   Rs 449 (MRP 599)  in stock, lab verified
 *   prd_ghee  / a2-cow-ghee-1l          A2 Cow Ghee 1L          Rs 899            in stock, NOT lab verified
 *   prd_oil   / cold-pressed-coconut-oil-1l                     Rs 549            OUT OF STOCK
 *
 * The previous version of this file asserted against `lib/data/fixtures.ts` ("Pure Wildflower
 * Honey") and included an admin verification board that has no backend endpoint at all.
 */

const HONEY_SLUG = 'raw-forest-honey-500g';

test('homepage renders banner, categories and best sellers from the API', async ({ page }) => {
  await page.goto('/');

  // Headline comes from the seeded `ban_hero` content banner, not hardcoded copy.
  await expect(page.getByRole('heading', { name: /Pure\. Tested\. Trusted\./i })).toBeVisible();

  // Seeded categories.
  await expect(page.getByRole('link', { name: /Honey/ }).first()).toBeVisible();

  // Best sellers carousel is populated from GET /home.
  await expect(page.getByText('Raw Forest Honey 500g').first()).toBeVisible();
});

test('product listing shows the real server-side total', async ({ page }) => {
  await page.goto('/products');

  // `total` from PagedData, not items.length — three seeded products.
  await expect(page.getByText(/Showing 3 of 3 products/i)).toBeVisible();
  await expect(page.getByText('A2 Cow Ghee 1L').first()).toBeVisible();
});

test('category filter queries the server rather than filtering in the browser', async ({ page }) => {
  await page.goto('/products?category=honey');

  await expect(page.getByText(/Showing 1 of 1 products/i)).toBeVisible();
  await expect(page.getByText('Raw Forest Honey 500g').first()).toBeVisible();
  // Ghee must be absent: proof the filter was applied server-side.
  await expect(page.getByText('A2 Cow Ghee 1L')).toHaveCount(0);
});

test('an out-of-stock product is not purchasable', async ({ page }) => {
  await page.goto('/products/cold-pressed-coconut-oil-1l');

  await expect(page.getByRole('heading', { name: 'Cold Pressed Coconut Oil 1L' })).toBeVisible();
  await expect(page.getByText(/Currently out of stock/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add to Cart$/ })).toBeDisabled();
});

test('product detail shows real price, variants and lab metrics', async ({ page }) => {
  await page.goto(`/products/${HONEY_SLUG}`);

  await expect(page.getByRole('heading', { name: 'Raw Forest Honey 500g' })).toBeVisible();
  // Price and MRP from the DTO. `discount` is the server's number (25%), never recomputed.
  await expect(page.getByText('₹449').first()).toBeVisible();
  await expect(page.getByText(/25% OFF/)).toBeVisible();

  // Seeded variants.
  await expect(page.getByRole('button', { name: '250g' })).toBeVisible();
  await expect(page.getByRole('button', { name: '1kg' })).toBeVisible();

  // Real lab metrics, including the seeded `warning` status — the old screen showed a
  // hardcoded all-pass table for every product.
  await page.getByRole('tab', { name: 'Lab Report' }).click();
  await expect(page.getByText('Purity')).toBeVisible();
  await expect(page.getByText('99.2%')).toBeVisible();
  await expect(page.getByText('Moisture')).toBeVisible();
});

test('reviews tab loads approved reviews on demand', async ({ page }) => {
  await page.goto(`/products/${HONEY_SLUG}`);

  await page.getByRole('tab', { name: 'Reviews' }).click();
  await expect(page.getByText('Best honey I have had')).toBeVisible();
  await expect(page.getByText('Arya Sharma')).toBeVisible();
});

test('an unverified product shows verification in progress instead of a lab badge', async ({
  page,
}) => {
  await page.goto('/products/a2-cow-ghee-1l');

  // prd_ghee is seeded with is_lab_verified = false.
  await expect(page.getByText(/Verification in progress/i)).toBeVisible();
});

test('unknown product slug shows not-found rather than a different product', async ({ page }) => {
  await page.goto('/products/this-slug-does-not-exist');

  /**
   * The bug this guards is that `findProduct(slug) ?? products[0]` used to render a completely
   * UNRELATED product for any unknown slug. That is fixed: the page calls notFound().
   *
   * Asserted on content, not status, because of a measured Next.js limitation: the HTML shell is
   * flushed (committing HTTP 200) before the async server component throws, so `notFound()`
   * produces a SOFT 404 here — verified at 200 in both dev and a production build, with and
   * without the route's loading.tsx. A crawler would therefore index this as a valid page.
   * Tracked as plan §T9; do not "fix" this test by asserting 200, and do not assume the status
   * is correct because this test passes.
   */
  await expect(page.getByText(/This page could not be found|Product not found/i).first()).toBeVisible();
  await expect(page.getByText('Raw Forest Honey 500g')).toHaveCount(0);
});

test('lab reports page lists published reports', async ({ page }) => {
  await page.goto('/trust/lab-reports');

  await expect(page.getByText(/Batch #BATCH-H-001 - FSSAI Approved Testing Lab/)).toBeVisible();

  // The report DTO carries only a productId, so the name arrives from a second request
  // (POST /products/batch). Waiting on the link proves that resolution actually happened rather
  // than falling back to the batch-id heading.
  await expect(page.getByRole('link', { name: 'Raw Forest Honey 500g' })).toBeVisible();

  // Seeded metrics, including the one with a `warning` status.
  await expect(page.getByText('99.2%')).toBeVisible();
  await expect(page.getByText('18.5%')).toBeVisible();
});

test('adding to cart as a guest prompts sign-in instead of a local cart', async ({ page }) => {
  await page.goto(`/products/${HONEY_SLUG}`);

  await page.getByRole('button', { name: /^Add to Cart$/ }).click();

  // The cart endpoint is bearer-only, so there is no guest cart to fall back on (plan §8.1).
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Login with OTP/i })).toBeVisible();
});

test('search queries the server', async ({ page }) => {
  await page.goto('/search?q=ghee');

  await expect(page.getByText('A2 Cow Ghee 1L').first()).toBeVisible();
  await expect(page.getByText('Raw Forest Honey 500g')).toHaveCount(0);
});
