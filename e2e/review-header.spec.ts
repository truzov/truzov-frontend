import { expect, test } from '@playwright/test';

for (const width of [375, 1024, 1152, 1280, 1440, 1536]) {
  test(`header overlay and hero at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // Fixtures prevent customer/API writes; run only with isolated local frontend and API.
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith('/home')
        ? { banners: [], categories: [], featured: [], bestSellers: [], newArrivals: [] }
        : path.endsWith('/categories') ? [
          { id: 'personal', slug: 'personal-care', name: 'Personal care', isActive: true },
          { id: 'food', slug: 'food', name: 'Food', isActive: true },
        ] : { items: [], total: 0, page: 1, limit: 20 };
      return route.fulfill({ json: { data } });
    });
    await page.goto('/');
    await expect(page.locator('.home-hero')).toBeVisible();
    const before = await page.evaluate(() => ({ header: document.querySelector('header')!.getBoundingClientRect().bottom, hero: document.querySelector('.home-hero')!.getBoundingClientRect().top, main: document.querySelector('#main-content')!.getBoundingClientRect().top, overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(before.overflow).toBe(false);
    expect(Math.abs(before.hero - before.header)).toBeLessThanOrEqual(1);
    if (width < 1536) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
      expect(await page.locator('#main-content').evaluate((node) => node.getBoundingClientRect().top)).toBe(before.main);
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'offers & coupons' })).toHaveAttribute('href', '/offers');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
      expect(await page.locator('#main-content').evaluate((node) => node.getBoundingClientRect().top)).toBe(before.main);
    } else {
      await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'offers & coupons' })).toHaveAttribute('href', '/offers');
    }
  });
}
