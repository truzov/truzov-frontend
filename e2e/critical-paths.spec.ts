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

test('homepage shows the verified marketplace and published products', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: /every label, verified\.\s*every claim, tested\./i })).toBeVisible();
  await expect(page.locator('.home-category-care')).toContainText('personal care');
  await expect(page.locator('.home-category-food')).toContainText('food');
  await expect(page.getByRole('link', { name: /Raw Forest Honey 500g/i })).toHaveAttribute('href', `/products/${HONEY_SLUG}`);
  await expect(page.locator('.home-product')).toHaveCount(3);
  await expect(page.locator('.home-product')).toContainText(['Raw Forest Honey 500g', 'A2 Cow Ghee 1L', 'Cold Pressed Coconut Oil 1L']);
  await expect(page.locator('.home-product').filter({ hasText: 'Raw Forest Honey 500g' }).locator('.home-verified')).toHaveCount(1);
  await expect(page.locator('.home-product').filter({ hasText: 'A2 Cow Ghee 1L' }).locator('.home-verified')).toHaveCount(0);
  await expect(page.locator('.home-product').filter({ hasText: 'Cold Pressed Coconut Oil 1L' })).toContainText('currently unavailable');
  await expect(page.getByRole('link', { name: /shop verified products/i })).toHaveAttribute('href', '/products?labVerified=true');
});

test('homepage remains usable at phone, tablet and desktop widths', async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /every label, verified/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /shop verified products/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('homepage labels only products with verification and a passing report', async ({ page }) => {
  const products = [
    { id: 'passed', slug: 'passed-product', name: 'Passing product', brand: 'Truzov', price: 100, images: [], isLabVerified: true },
    { id: 'pending', slug: 'pending-product', name: 'Pending product', brand: 'Truzov', price: 100, images: [], isLabVerified: true },
    { id: 'unverified', slug: 'unverified-product', name: 'Unverified product', brand: 'Truzov', price: 100, images: [], isLabVerified: false },
  ];
  await page.route('**/api/v1/home', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': 'http://localhost:3000' },
    contentType: 'application/json',
    body: JSON.stringify({ data: { banners: [], categories: [], featured: products, newArrivals: [], bestSellers: [] } }),
  }));
  await page.route('**/api/v1/products?**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': 'http://localhost:3000' },
    contentType: 'application/json',
    body: JSON.stringify({ data: { items: products, total: products.length, page: 1, limit: 4 } }),
  }));
  await page.route('**/api/v1/lab-reports**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': 'http://localhost:3000' },
    contentType: 'application/json',
    body: JSON.stringify({ data: { items: [{ productId: 'passed', status: 'pass' }, { productId: 'pending', status: 'pending' }, { productId: 'unverified', status: 'pass' }], total: 3, page: 1, limit: 20 } }),
  }));
  await page.goto('/');
  const grid = page.locator('.home-product-grid');
  await expect(grid).toContainText('Passing product');
  await expect(grid).toContainText('Pending product');
  await expect(grid).toContainText('Unverified product');
  await expect(grid.locator('.home-verified')).toHaveCount(1);
  await expect(grid.locator('.home-product').filter({ hasText: 'Passing product' }).locator('.home-verified')).toHaveCount(1);
  await expect(grid.locator('.home-product').filter({ hasText: 'Pending product' }).locator('.home-verified')).toHaveCount(0);
  await expect(grid.locator('.home-product').filter({ hasText: 'Unverified product' }).locator('.home-verified')).toHaveCount(0);
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
  // The default variant is 1kg; select the seeded 500g option for its ₹449 price.
  await page.getByRole('button', { name: '500g' }).click();
  // Price and MRP from the selected variant DTO.
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

test('adding to cart as a guest saves the item locally', async ({ page }) => {
  await page.goto(`/products/${HONEY_SLUG}`);

  await page.getByRole('button', { name: /^Add to Cart$/ }).click();

  await expect(page.getByText('Added to cart', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Cart, 1 items/i })).toBeVisible();
});

test('search queries the server', async ({ page }) => {
  await page.goto('/search?q=ghee');

  await expect(page.getByText('A2 Cow Ghee 1L').first()).toBeVisible();
  await expect(page.getByText('Raw Forest Honey 500g')).toHaveCount(0);
});
