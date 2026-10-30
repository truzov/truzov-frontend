import { expect, test, type Page } from '@playwright/test';

const categories = [
  { id: 'personal', slug: 'personal-care', name: 'Personal care', isActive: true },
  { id: 'food', slug: 'food', name: 'Food', isActive: true },
];
const product = {
  id: 'fixture-honey', slug: 'fixture-honey', name: 'Fixture honey', brand: 'truzov', categorySlug: 'food',
  price: 120, mrp: 120, discount: 0, inStock: true, stockCount: 3, rating: 0, reviewCount: 0,
  isBestseller: false, isOrganic: false, isFeatured: false, isNewArrival: false, isLabVerified: false,
  images: [1, 2, 3, 4, 5, 6].map((number) => ({ url: '/truzov-logo-final.png', alt: `Honey image ${number}` })),
  weight: '250 g', description: 'Fixture description', verificationStatus: 'pending',
  benefits: [], ingredients: [], certifications: [], variants: [], labMetrics: [],
};
async function fixtureApi(page: Page) {
  page.on('pageerror', error => console.log('Browser runtime error:', error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('Browser error:', message.text()); });
  await page.route('**/api/v1/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let data: unknown = { items: [], total: 0, page: 1, limit: 24 };
    if (pathname.endsWith('/home')) data = { banners: [], categories: [], featured: [], bestSellers: [], newArrivals: [] };
    else if (pathname.endsWith('/categories')) data = categories;
    else if (pathname.endsWith('/products/fixture-honey')) data = product;
    else if (pathname.endsWith('/products')) data = { items: [product], total: 1, page: 1, limit: 24 };
    else if (pathname.endsWith('/related')) data = [];
    else if (pathname.endsWith('/offers')) data = [{ code: 'FIXTURE10', title: 'Fixture offer', shortDescription: 'Fixture only', couponAmount: 10, minAmount: 100, endDate: '2099-10-28T00:00:00Z' }];
    return route.fulfill({ headers: { 'access-control-allow-origin': 'http://127.0.0.1:3000', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, json: { data } });
  });
}

test('one guest login control through narrow-to-wide resizing and neutral keyboard focus', async ({ page }) => {
  await fixtureApi(page);
  await page.goto('/');
  await expect(page.locator('.home-hero')).toBeVisible();
  for (const width of [320, 375, 768, 1024, 1280, 1440, 1535, 1536, 1920, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('button', { name: /login \/ signup/i, exact: true }), `width ${width}`).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'My Account', exact: true })).toHaveCount(0);
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(node => ({ tag: node.tagName, cls: node.className, right: node.getBoundingClientRect().right })) }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
    const bottom = page.getByRole('navigation', { name: 'Bottom navigation' });
    if (width < 1536) await expect(bottom).toBeVisible();
    else await expect(bottom).toBeHidden();
  }
  const menu = page.getByRole('button', { name: 'Open menu' });
  await menu.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor)).toBe('rgb(100, 116, 139)');
  await menu.click();
  expect(await page.getByRole('button', { name: 'Close menu' }).evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none');
});

for (const width of [375, 768, 1440]) {
  test(`gallery, tabs and guest cart at ${width}px`, async ({ page }) => {
    await fixtureApi(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/products/fixture-honey');
    await expect(page.getByRole('heading', { name: 'Fixture honey', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'View image 2', exact: true }).click();
    await expect(page.getByRole('button', { name: 'View full image: Honey image 2', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View image 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Show 2 more images', exact: true }).click();
    await expect(page.getByRole('button', { name: 'View image 6', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share product' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to wishlist' }).first()).toBeVisible();
    const details = page.getByRole('tab', { name: 'Product Details', exact: true });
    await details.scrollIntoViewIfNeeded();
    const top = (await details.boundingBox())!.y;
    for (const name of ['Lab Report', 'Reviews', 'Product Details']) {
      await page.getByRole('tab', { name, exact: true }).click();
      expect(Math.abs((await details.boundingBox())!.y - top)).toBeLessThanOrEqual(1);
    }
    await page.getByRole('button', { name: 'Add Fixture honey', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Increase quantity of Fixture honey' })).toBeVisible();
    await page.getByRole('button', { name: 'Increase quantity of Fixture honey' }).click();
    await page.getByRole('button', { name: 'Increase quantity of Fixture honey' }).click();
    await expect(page.getByRole('button', { name: 'Increase quantity of Fixture honey' })).toBeDisabled();
    await page.goto('/cart');
    await expect(page.getByText('Qty: 3', { exact: true })).toBeVisible();
    await page.goto('/products/fixture-honey');
    for (let index = 0; index < 3; index++) await page.getByRole('button', { name: 'Decrease quantity of Fixture honey' }).click();
    await expect(page.getByRole('button', { name: 'Add Fixture honey', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('homepage loading skeleton fits a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  let releaseHome: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { releaseHome = resolve; });
  await page.route('**/api/v1/**', async route => {
    await waiting;
    return route.fulfill({ headers: { 'access-control-allow-origin': 'http://127.0.0.1:3000', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,authorization' }, json: { data: { banners: [], categories: [], featured: [], bestSellers: [], newArrivals: [] } } });
  });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  releaseHome!();
});

for (const width of [375, 1440]) {
  test(`combined filters survive refresh and clear at ${width}px`, async ({ page }) => {
    await fixtureApi(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/products');
    const mobile = width < 1024;
    if (mobile) await page.getByRole('button', { name: 'Filters', exact: true }).click();
    const controls = mobile ? page.getByRole('dialog', { name: 'Filters' }) : page.locator('.catalogue-filters');
    await controls.getByRole('button', { name: 'Food', exact: true }).click();
    await controls.getByRole('button', { name: 'In stock only' }).click();
    await controls.getByRole('button', { name: 'Lab Verified Only', exact: true }).click();
    if (mobile) await controls.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page).toHaveURL(/category=food/);
    await expect(page).toHaveURL(/inStock=true/);
    await expect(page).toHaveURL(/labVerified=true/);
    await page.reload();
    if (mobile) await page.getByRole('button', { name: /^Filters/ }).click();
    const refreshed = mobile ? page.getByRole('dialog', { name: 'Filters' }) : page.locator('.catalogue-filters');
    await expect(refreshed.getByRole('button', { name: 'Food', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await refreshed.getByRole('button', { name: mobile ? 'Clear' : 'Clear all', exact: true }).click();
    if (mobile) await refreshed.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page).not.toHaveURL(/category=|inStock=|labVerified=/);
  });
}
