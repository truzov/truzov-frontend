import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import type { AddCartItemRequest, CartDto, OtpSendRequest, OtpVerifyRequest, UserProfileDto } from '../types/api';

const categories = [
  { id: 'personal', slug: 'personal-care', name: 'Personal care', isActive: true },
  { id: 'food', slug: 'food', name: 'Food', isActive: true },
];
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,authorization,x-request-id,idempotency-key',
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
};
const product = {
  id: 'fixture-honey', slug: 'raw-forest-honey-500g', name: 'Fixture honey', brand: 'truzov', categorySlug: 'food',
  price: 120, mrp: 120, discount: 0, inStock: true, stockCount: 13, rating: 0, reviewCount: 0,
  isBestseller: false, isOrganic: false, isFeatured: false, isNewArrival: false, isLabVerified: false,
  images: [1, 2, 3, 4, 5, 6].map((number) => ({ url: '/truzov-logo-final.png', alt: `Honey image ${number}` })),
  weight: '250 g', description: 'Fixture description', verificationStatus: 'pending',
  benefits: [], ingredients: [], certifications: [], labMetrics: [],
  variants: [
    { id: 'small', label: 'Size', value: '500g', priceModifier: 0, stockCount: 3, inStock: true },
    { id: 'large', label: 'Size', value: '1kg', priceModifier: 100, stockCount: 10, inStock: true },
    { id: 'sold-out', label: 'Size', value: '250g', priceModifier: -20, stockCount: 0, inStock: false },
  ],
};
// The product page verifies this seeded slug on the server before the browser fixture runs.
const productPath = `/products/${product.slug}`;
async function fixtureApi(page: Page, override?: (route: Route, pathname: string) => Promise<boolean>) {
  page.on('pageerror', error => console.log('Browser runtime error:', error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('Browser error:', message.text()); });
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (await override?.(route, pathname)) return;
    let data: unknown = { items: [], total: 0, page: 1, limit: 24 };
    if (pathname.endsWith('/home')) data = { banners: [], categories: [], featured: [], bestSellers: [], newArrivals: [] };
    else if (pathname.endsWith('/categories')) data = categories;
    else if (pathname.endsWith(productPath) || pathname.endsWith(`/products/${product.id}`)) data = product;
    else if (pathname.endsWith('/products')) data = { items: [product], total: 1, page: 1, limit: 24 };
    else if (pathname.endsWith('/related') || pathname.endsWith('/wishlist')) data = [];
    else if (pathname.endsWith('/offers')) data = [{ code: 'FIXTURE10', title: 'Fixture offer', shortDescription: 'Fixture only', couponAmount: 10, minAmount: 100, endDate: '2099-10-28T00:00:00Z' }];
    return route.fulfill({ headers: corsHeaders, json: { data } });
  });
}

test('one guest login control through narrow-to-wide resizing and neutral keyboard focus', async ({ page }) => {
  await fixtureApi(page);
  await page.goto('/');
  await expect(page.locator('.home-hero')).toBeVisible();
  for (const width of [320, 375, 425, 768, 1024, 1280, 1440, 1535, 1536, 1920, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('button', { name: /login \/ signup/i, exact: true }), `width ${width}`).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'My Account', exact: true })).toHaveCount(0);
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(node => ({ tag: node.tagName, cls: node.className, right: node.getBoundingClientRect().right })) }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(width);
    const bottom = page.getByRole('navigation', { name: 'Bottom navigation' });
    if (width < 1536) {
      await expect(bottom).toBeVisible();
      await expect(bottom.getByRole('link')).toHaveText(['Home', 'Categories', 'Search', 'Wishlist']);
      const login = bottom.getByRole('button', { name: 'Login / Signup' });
      expect(await login.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      const tab = (await bottom.getByRole('link', { name: 'Home', exact: true }).boundingBox())!;
      const account = (await login.boundingBox())!;
      expect(Math.abs(account.width - tab.width)).toBeLessThanOrEqual(1);
    } else await expect(bottom).toBeHidden();
  }
  const menu = page.getByRole('button', { name: 'Open menu' });
  await menu.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor)).toBe('rgb(100, 116, 139)');
  await menu.click();
  expect(await page.getByRole('button', { name: 'Close menu' }).evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none');
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.getByRole('navigation', { name: 'Bottom navigation' })
    .getByRole('button', { name: 'Login / Signup' }).click();
  await expect(page.getByRole('dialog', { name: 'Welcome back' })).toBeVisible();
});

test('saved addresses confirm, survive a failed delete, and disappear on success', async ({ page }) => {
  const user = { id: 'buyer', name: 'Buyer', role: 'customer', phoneVerified: true, emailVerified: true };
  const tokens = { accessToken: 'fixture-access', refreshToken: 'fixture-refresh', user };
  let addresses = [
    { id: 'home', fullName: 'Home recipient', line1: 'Home street', isDefault: true },
    { id: 'work', fullName: 'Work recipient', line1: 'Work street', isDefault: false },
  ];
  const deletes: string[] = [];
  let finishRestore!: () => void;
  const pendingRestore = new Promise<void>((resolve) => { finishRestore = resolve; });
  let finishFailedDelete!: () => void;
  const pendingDelete = new Promise<void>((resolve) => { finishFailedDelete = resolve; });
  await page.addInitScript(() => localStorage.setItem('truzov.refreshToken', 'fixture-refresh'));
  await fixtureApi(page, async (route, path) => {
    const method = route.request().method();
    if (method === 'OPTIONS') await route.fulfill({ status: 204, headers: corsHeaders });
    else if (path.endsWith('/auth/refresh')) {
      await pendingRestore;
      await route.fulfill({ headers: corsHeaders, json: { data: tokens } });
    } else if (path.endsWith('/auth/me')) {
      const authorized = route.request().headers().authorization === 'Bearer fixture-access';
      await route.fulfill({ status: authorized ? 200 : 401, headers: corsHeaders, json: { data: user } });
    } else if (path.endsWith('/users/me/addresses')) {
      await route.fulfill({ headers: corsHeaders, json: { data: addresses } });
    } else if (method === 'DELETE' && path.includes('/users/me/addresses/')) {
      expect(route.request().headers().authorization).toBe('Bearer fixture-access');
      const id = path.split('/').pop()!;
      deletes.push(id);
      if (deletes.length === 1) {
        await pendingDelete;
        await route.abort('failed');
      } else {
        addresses = addresses.filter((address) => address.id !== id);
        if (addresses[0]) addresses[0].isDefault = true;
        await route.fulfill({ status: 204, headers: corsHeaders });
      }
    } else return false;
    return true;
  });

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/account/addresses');
  const nav = page.getByRole('navigation', { name: 'Bottom navigation' });
  await expect(nav.getByText('Account', { exact: true })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Login / Signup' })).toHaveCount(0);
  finishRestore();
  await expect(nav.getByRole('link', { name: 'My Account' })).toHaveAttribute('href', '/account');
  await expect(nav.getByRole('button', { name: 'Login / Signup' })).toHaveCount(0);
  const home = page.getByRole('article').filter({ hasText: 'Home recipient' });
  const work = page.getByRole('article').filter({ hasText: 'Work recipient' });
  const dialog = page.getByRole('dialog', { name: 'Delete this address?' });
  const confirm = dialog.getByRole('button', { name: 'Delete', exact: true });

  await home.getByRole('button', { name: 'Delete' }).click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(deletes).toEqual([]);
  await home.getByRole('button', { name: 'Delete' }).click();
  await confirm.click();
  await expect(dialog.getByRole('button', { name: 'Deleting address' })).toBeDisabled();
  finishFailedDelete();
  await expect(page.getByText('Could not delete address')).toBeVisible();
  await expect(home).toBeVisible();
  await confirm.click();
  await expect(page.getByText('Address deleted')).toBeVisible();
  await expect(home).toHaveCount(0);
  await expect(work.getByText('Default')).toBeVisible();

  await page.setViewportSize({ width: 1536, height: 900 });
  await expect(nav).toBeHidden();
  await work.getByRole('button', { name: 'Delete' }).click();
  await confirm.click();
  await expect(page.getByText('No saved addresses')).toBeVisible();
  expect(deletes).toEqual(['home', 'home', 'work']);
});

test('email-only account adds and verifies its own phone before checkout', async ({ page }) => {
  let user: UserProfileDto = {
    id: 'buyer', name: 'Fixture Buyer', role: 'customer', email: 'buyer@example.invalid',
    emailVerified: true, phoneVerified: false, createdAt: '2026-01-01T00:00:00Z',
  };
  const cart: CartDto = {
    items: [{
      id: 'line', productId: product.id, name: product.name, slug: product.slug, quantity: 1,
      unitPrice: 120, lineTotal: 120, inStock: true, availableStock: 3,
    }],
    itemCount: 1, subtotal: 120,
  };
  const sends: OtpSendRequest[] = [];
  const verifications: OtpVerifyRequest[] = [];
  const authenticated = { accessToken: 'fixture-access', refreshToken: 'fixture-refresh' };
  await page.addInitScript(() => localStorage.setItem('truzov.refreshToken', 'fixture-refresh'));
  await fixtureApi(page, async (route, path) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return true;
    }
    let data: unknown;
    let status = 200;
    if (path.endsWith('/auth/refresh')) data = { ...authenticated, user };
    else if (path.endsWith('/auth/me')) {
      status = request.headers().authorization === 'Bearer fixture-access' ? 200 : 401;
      data = user;
    } else if (path.endsWith('/cart')) data = cart;
    else if (path.endsWith('/users/me/addresses')) {
      data = [{ id: 'address', fullName: user.name, line1: 'Fixture street', isDefault: true }];
    } else if (path.endsWith('/coupons/quote')) {
      data = { code: null, discountAmount: 0, subtotal: 120, total: 120, deliveryFee: 0 };
    } else if (path.endsWith('/auth/otp/send')) {
      expect(request.headers().authorization).toBe('Bearer fixture-access');
      sends.push(request.postDataJSON() as OtpSendRequest);
      data = { otpSessionId: `phone-${sends.length}`, channel: 'phone', expiresInSeconds: 300 };
    } else if (path.endsWith('/auth/otp/verify')) {
      expect(request.headers().authorization).toBe('Bearer fixture-access');
      const verification = request.postDataJSON() as OtpVerifyRequest;
      verifications.push(verification);
      if (verification.code !== '123456') {
        await route.fulfill({ status: 400, headers: corsHeaders, json: { error: { code: 'OTP_INVALID', message: 'That code was incorrect.' } } });
        return true;
      }
      expect(verification.otpSessionId).toBe(`phone-${sends.length}`);
      user = { ...user, phone: sends.at(-1)?.identifier, phoneVerified: true };
      data = { ...authenticated, user };
    } else return false;
    await route.fulfill({ status, headers: corsHeaders, json: { data } });
    return true;
  });

  await page.goto('/account');
  const phoneRow = page.getByText('Mobile number', { exact: true }).locator('..');
  const emailRow = page.getByText('Email address', { exact: true }).locator('..');
  await expect(phoneRow.getByText(/not added/i)).toBeVisible();
  await expect(emailRow.getByText('Verified', { exact: true })).toBeVisible();
  const legacyPlaceholder = '__mig_browser-fixture';
  user = { ...user, phone: legacyPlaceholder };
  await page.reload();
  await expect(phoneRow.getByText(/not added/i)).toBeVisible();
  await expect(page.getByText(legacyPlaceholder, { exact: true })).toHaveCount(0);
  user = { ...user, phone: undefined };
  const addPhone = page.getByRole('button', { name: 'Add mobile number', exact: true });
  const addDialog = page.getByRole('dialog', { name: /^Add mobile number$/i });
  const mobileNumber = (dialog: Locator) => dialog.getByRole('textbox', { name: /^(new )?mobile number$/i });
  const sendCode = (dialog: Locator) => dialog.getByRole('button', { name: /^Send Code$/i });
  const verificationCode = (dialog: Locator) => dialog.getByRole('textbox', { name: 'Verification Code' });
  const verify = (dialog: Locator) => dialog.getByRole('button', { name: /^Verify & Update$/i });
  await addPhone.click();
  await mobileNumber(addDialog).fill('123');
  await sendCode(addDialog).click();
  await expect(addDialog.getByText(/valid.*(?:phone|mobile) number/i)).toBeVisible();
  expect(sends).toEqual([]);
  await addDialog.getByRole('button', { name: 'Close modal' }).click();

  await page.goto('/checkout/address');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('/checkout/payment');
  const placeOrder = page.getByRole('button', { name: 'Place order', exact: true });
  await expect(placeOrder).toBeDisabled();
  await page.getByRole('button', { name: 'Add and verify number', exact: true }).click();
  await mobileNumber(addDialog).fill('9876543210');
  await sendCode(addDialog).click();
  await expect(addDialog.getByText(/not verified yet/i)).toBeVisible();
  await verificationCode(addDialog).fill('000000');
  await verify(addDialog).click();
  await expect(addDialog.getByText('That code was incorrect.')).toBeVisible();
  expect(user.phone).toBeUndefined();
  expect(user.phoneVerified).toBe(false);
  await expect(placeOrder).toBeDisabled();

  await addDialog.getByRole('button', { name: /^Resend code$/i }).click();
  await expect.poll(() => sends).toEqual([
    { identifier: '9876543210', purpose: 'phone_change' },
    { identifier: '9876543210', purpose: 'phone_change' },
  ]);
  await expect(verificationCode(addDialog)).toHaveValue('');
  await verificationCode(addDialog).fill('123456');
  await verify(addDialog).click();
  await expect(addDialog).toBeHidden();
  await expect(placeOrder).toBeEnabled();

  await page.goto('/account');
  await expect(phoneRow).toContainText('9876543210');
  await expect(phoneRow.getByText('Verified', { exact: true })).toBeVisible();
  await expect(emailRow.getByText('Verified', { exact: true })).toBeVisible();
  const changeDialog = page.getByRole('dialog', { name: /^Change mobile number$/i });
  await page.getByRole('button', { name: 'Change mobile number', exact: true }).click();
  await mobileNumber(changeDialog).fill('9876543211');
  await sendCode(changeDialog).click();
  await verificationCode(changeDialog).fill('123456');
  await verify(changeDialog).click();
  await expect(changeDialog).toBeHidden();
  await expect(phoneRow).toContainText('9876543211');
  expect(verifications).toEqual([
    { otpSessionId: 'phone-1', code: '000000' },
    { otpSessionId: 'phone-2', code: '123456' },
    { otpSessionId: 'phone-3', code: '123456' },
  ]);
});

function renderedImageScale(image: Locator) {
  return image.evaluate((node: HTMLImageElement) => node.getBoundingClientRect().width / node.offsetWidth);
}

test('image viewer locks desktop scroll and supports zoom, navigation, focus, and Back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop pointer interactions');
  await fixtureApi(page);
  await page.goto(productPath);
  const gallery = page.getByRole('button', { name: /^View full image:/ });
  await expect(gallery).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 70, behavior: 'instant' }));
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);
  const galleryImage = gallery.getByRole('img');
  const galleryButton = (await gallery.elementHandle())!;
  const frame = (await gallery.boundingBox())!;
  for (const [x, y] of [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85], [0.5, 0.5]]) {
    await page.mouse.move(frame.x + frame.width * x, frame.y + frame.height * y);
    await expect.poll(() => renderedImageScale(galleryImage)).toBeGreaterThan(1.8);
    await expect.poll(async () => galleryImage.evaluate((node: HTMLImageElement, { x, y }) => {
      const [originX, originY] = getComputedStyle(node).transformOrigin.split(' ').map(parseFloat);
      return Math.abs(originX / node.offsetWidth - x) + Math.abs(originY / node.offsetHeight - y);
    }, { x, y })).toBeLessThan(0.08);
  }
  await page.mouse.move(frame.x + frame.width + 10, frame.y + frame.height / 2);
  await expect.poll(() => renderedImageScale(galleryImage)).toBeCloseTo(1);

  await gallery.click();
  const viewer = page.getByRole('dialog', { name: 'Product image viewer' });
  await expect(viewer).toBeVisible();
  const close = viewer.getByRole('button', { name: 'Close image viewer' });
  const zoom = viewer.getByRole('button', { name: 'Zoom product image' });
  const image = zoom.getByRole('img');
  await expect.poll(() => renderedImageScale(image)).toBeGreaterThan(0);
  await zoom.hover();
  await expect.poll(() => renderedImageScale(image)).toBeGreaterThan(1.8);
  await zoom.click();
  await close.hover();
  await expect.poll(() => renderedImageScale(image)).toBeGreaterThan(1.8);
  await zoom.click();
  await close.hover();
  await expect.poll(() => renderedImageScale(image)).toBeCloseTo(1);
  await expect(viewer.getByText('1 / 6')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(image).toHaveAttribute('alt', 'Honey image 2');
  await page.keyboard.press('ArrowRight');
  await expect(image).toHaveAttribute('alt', 'Honey image 3');
  await page.keyboard.press('ArrowLeft');
  await expect(image).toHaveAttribute('alt', 'Honey image 2');
  await viewer.getByRole('button', { name: 'Previous image' }).click();
  await expect(image).toHaveAttribute('alt', 'Honey image 1');

  await page.mouse.wheel(0, 700);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await galleryButton.boundingBox())?.y).toBeCloseTo(frame.y, 0);
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(viewer.getByRole('button', { name: 'View image 6' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(gallery).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);

  await gallery.click();
  await expect(viewer).toBeVisible();
  await page.evaluate(() => history.back());
  await expect(viewer).toBeHidden();
  await expect(page).toHaveURL(productPath);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
  for (let index = 0; index < 7; index++) {
    await gallery.click();
    await close.click();
    await expect(viewer).toBeHidden();
  }
  await gallery.click();
  await page.mouse.click((page.viewportSize()?.width ?? 100) / 2, 12);
  await expect(viewer).toBeHidden();
  await page.mouse.wheel(0, 350);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollY);

  const singleImage = { ...product.images[0], url: '/truzov-hero.webp' };
  await page.route(`**/api/v1${productPath}`, (route) => route.fulfill({
    headers: corsHeaders,
    json: { data: { ...product, images: [singleImage] } },
  }));
  let finishImage!: () => void;
  const pendingImage = new Promise<void>((resolve) => { finishImage = resolve; });
  await page.route('**/_next/image?**', async (route) => {
    const { searchParams } = new URL(route.request().url());
    if (searchParams.get('url') === singleImage.url && Number(searchParams.get('w')) > 1280) {
      await pendingImage;
    }
    await route.continue();
  });
  await page.reload();
  await gallery.click();
  await expect(viewer.getByText('Loading image…')).toBeVisible();
  finishImage();
  await expect(viewer.getByText('Loading image…')).toBeHidden();
  await expect(image).toHaveAttribute('alt', 'Honey image 1');
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await expect(viewer.getByRole('button', { name: 'Previous image' })).toHaveCount(0);
  await expect(viewer.getByRole('button', { name: 'Next image' })).toHaveCount(0);
  await expect(viewer.getByText('1 / 1')).toHaveCount(0);
});

test('image viewer supports touch swipe, pinch, pan, and double-tap', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Requires a touch viewport');
  await fixtureApi(page);
  await page.goto(productPath);
  const gallery = page.getByRole('button', { name: /^View full image:/ });
  await expect(gallery).toBeVisible();
  await gallery.hover();
  await expect.poll(() => renderedImageScale(gallery.getByRole('img'))).toBeCloseTo(1);

  const cdp = await page.context().newCDPSession(page);
  async function gesture(start: Array<[number, number]>, end: Array<[number, number]>) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: start.map(([x, y], id) => ({ x, y, id })),
    });
    for (const fraction of [0.33, 0.67, 1]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: start.map(([x, y], id) => ({
          x: x + (end[id][0] - x) * fraction,
          y: y + (end[id][1] - y) * fraction,
          id,
        })),
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  const galleryBox = (await gallery.boundingBox())!;
  const galleryX = galleryBox.x + galleryBox.width / 2;
  const galleryY = galleryBox.y + galleryBox.height / 2;
  await gesture([[galleryX + 90, galleryY]], [[galleryX - 90, galleryY]]);
  await expect(gallery).toHaveAccessibleName('View full image: Honey image 2');
  const galleryButton = (await gallery.elementHandle())!;
  const galleryTop = (await galleryButton.boundingBox())!.y;
  await gallery.tap();

  const viewer = page.getByRole('dialog', { name: 'Product image viewer' });
  const zoom = viewer.getByRole('button', { name: 'Zoom product image' });
  const image = zoom.getByRole('img');
  await expect(image).toHaveAttribute('alt', 'Honey image 2');
  const stage = (await zoom.boundingBox())!;
  const x = stage.x + stage.width / 2;
  const y = stage.y + stage.height / 2;
  await gesture([[x, y + 70]], [[x, y - 70]]);
  await expect.poll(async () => (await galleryButton.boundingBox())?.y).toBeCloseTo(galleryTop, 0);
  await expect(image).toHaveAttribute('alt', 'Honey image 2');
  await gesture([[x + 90, y]], [[x - 90, y]]);
  await expect(image).toHaveAttribute('alt', 'Honey image 3');
  await gesture([[x - 35, y], [x + 35, y]], [[x - 95, y], [x + 95, y]]);
  await expect.poll(() => renderedImageScale(image)).toBeGreaterThan(1.8);
  const zoomedX = (await image.boundingBox())!.x;
  await gesture([[x, y]], [[x + 85, y]]);
  await expect.poll(async () => (await image.boundingBox())!.x).toBeGreaterThan(zoomedX + 20);
  await expect(image).toHaveAttribute('alt', 'Honey image 3');
  await page.touchscreen.tap(x, y);
  await page.touchscreen.tap(x, y);
  await expect.poll(() => renderedImageScale(image)).toBeCloseTo(1);
  await page.setViewportSize({ width: 740, height: 393 });
  const landscapeImage = (await image.boundingBox())!;
  expect(landscapeImage.y).toBeGreaterThanOrEqual(0);
  expect(landscapeImage.y + landscapeImage.height).toBeLessThanOrEqual(393);
  const close = viewer.getByRole('button', { name: 'Close image viewer' });
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await close.tap();
  await expect(viewer).toBeHidden();
});

for (const width of [375, 768, 1440]) {
  test(`gallery, tabs and guest cart at ${width}px`, async ({ page, isMobile }) => {
    await fixtureApi(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(productPath);
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
    const quantity = page.getByRole('spinbutton', { name: 'Quantity' });
    const add = page.getByRole('button', { name: 'Add Fixture honey', exact: true });
    const size = (name: string) => page.getByRole('button', { name, exact: true });
    const activate = (control: Locator) => isMobile ? control.tap() : control.click();
    const badge = (count: number) => page.getByRole('link', { name: `Cart, ${count} items` });
    await expect(size('250g')).toBeDisabled();
    await quantity.fill('3');
    await activate(size('1kg'));
    await expect(quantity).toHaveValue('1');
    await expect(quantity).toHaveAttribute('max', '10');
    await expect(page.getByText('₹220', { exact: true }).first()).toBeVisible();
    await quantity.fill('99');
    await quantity.press('Tab');
    await expect(quantity).toHaveValue('10');
    await quantity.fill('5');
    await activate(add);
    await expect(badge(5)).toBeVisible();
    await expect(page.getByText('Added to cart', { exact: true })).toBeVisible();
    await expect(quantity).toHaveValue('1');
    await expect(add).toBeVisible();
    await expect(page.getByRole('button', { name: 'Increase quantity of Fixture honey' })).toHaveCount(0);

    await quantity.fill('2');
    await activate(add);
    await expect(badge(7)).toBeVisible();
    await activate(size('500g'));
    await activate(add);
    await expect(badge(8)).toBeVisible();
    await page.reload();
    await expect(badge(8)).toBeVisible();
    await badge(8).click();
    await expect(page.getByRole('article').filter({ hasText: '1kg' }).getByText('Qty: 7', { exact: true })).toBeVisible();
    await expect(page.getByRole('article').filter({ hasText: '500g' }).getByText('Qty: 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Fixture honey', exact: true })).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('signed-in PDP guards ADD and sends Buy Now quantity directly to checkout', async ({ page }) => {
  const user = { id: 'buyer', name: 'Buyer', role: 'customer', phone: '+919876543210', phoneVerified: true, emailVerified: true };
  const tokens = { accessToken: 'fixture-access', refreshToken: 'fixture-refresh', user };
  const requests: AddCartItemRequest[] = [];
  let quoteIntent: unknown;
  let checkoutIntent: unknown;
  let cart: CartDto = { items: [], itemCount: 0, subtotal: 0 };
  let releaseAdd!: () => void;
  const pendingAdd = new Promise<void>((resolve) => { releaseAdd = resolve; });
  await fixtureApi(page, async (route, path) => {
    const method = route.request().method();
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return true;
    }
    let data: unknown;
    let status = 200;
    if (path.endsWith('/auth/refresh')) data = tokens;
    else if (path.endsWith('/auth/me')) {
      status = route.request().headers().authorization === 'Bearer fixture-access' ? 200 : 401;
      data = user;
    } else if (path.endsWith('/cart')) data = cart;
    else if (path.endsWith('/users/me/addresses')) data = [{ id: 'address', line1: 'Fixture street', isDefault: true }];
    else if (path.endsWith('/coupons/quote')) {
      quoteIntent = route.request().postDataJSON();
      data = { code: null, discountAmount: 0, subtotal: 240, total: 240, deliveryFee: 0 };
    } else if (path.endsWith('/checkout') && method === 'POST') {
      checkoutIntent = route.request().postDataJSON();
      await route.fulfill({ status: 409, headers: corsHeaders, json: { error: { code: 'CONFLICT', message: 'Fixture checkout stopped after request' } } });
      return true;
    }
    else if (path.endsWith('/cart/items') && method === 'POST') {
      const request = route.request().postDataJSON() as AddCartItemRequest;
      requests.push(request);
      if (requests.length === 2) {
        await route.abort('failed');
        return true;
      }
      if (requests.length === 3) await pendingAdd;
      const variant = product.variants.find((entry) => entry.id === request.variantId)!;
      const unitPrice = product.price + variant.priceModifier;
      const quantity = request.quantity;
      const items = [...cart.items, {
        id: variant.id, productId: request.productId, variantId: variant.id, variantLabel: variant.value,
        name: product.name, slug: product.slug, unitPrice, quantity, lineTotal: unitPrice * quantity,
        inStock: true, availableStock: variant.stockCount,
      }];
      data = cart = {
        items,
        itemCount: items.reduce((total, item) => total + item.quantity, 0),
        subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
      };
    } else return false;
    await route.fulfill({ status, headers: corsHeaders, json: { data } });
    return true;
  });

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(productPath);
  const quantity = page.getByRole('spinbutton', { name: 'Quantity' });
  const add = page.getByRole('button', { name: 'Add Fixture honey', exact: true });
  const guestRequest = { productId: product.id, variantId: 'small', quantity: 1 };
  const largeRequest = { productId: product.id, variantId: 'large', quantity: 3 };
  const guestBadge = page.getByRole('link', { name: 'Cart, 1 items' });
  await expect(page.getByRole('button', { name: '500g', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await add.click();
  await expect(guestBadge).toBeVisible();
  expect(requests).toEqual([]);
  await page.evaluate(() => localStorage.setItem('truzov.refreshToken', 'fixture-refresh'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'My Account' })).toBeVisible();
  await expect.poll(() => requests).toEqual([guestRequest]);
  await expect(guestBadge).toBeVisible();

  await page.getByRole('button', { name: '1kg', exact: true }).click();
  await quantity.fill('3');
  await add.click();
  await expect(page.getByText('Could not add to cart')).toBeVisible();
  await expect(quantity).toHaveValue('3');
  await expect(guestBadge).toBeVisible();
  expect(requests).toEqual([guestRequest, largeRequest]);

  await add.dblclick();
  await expect(add).toBeDisabled();
  await expect.poll(() => requests).toEqual([guestRequest, largeRequest, largeRequest]);
  releaseAdd();
  await expect(page.getByRole('link', { name: 'Cart, 4 items' })).toBeVisible();
  await expect(quantity).toHaveValue('1');

  await page.getByRole('button', { name: '500g', exact: true }).click();
  await quantity.fill('2');
  await page.getByRole('button', { name: 'Buy Now', exact: true }).click();
  await expect(page).toHaveURL('/checkout/address');
  const buyNow = { productId: product.id, variantId: 'small', quantity: 2 };
  await expect.poll(() => quoteIntent).toMatchObject({ buyNow });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL('/checkout/payment');
  const orderItems = page.getByRole('region', { name: 'Order items' });
  await expect(orderItems.getByText('500g', { exact: true })).toBeVisible();
  await expect(orderItems.getByText('1kg', { exact: true })).toHaveCount(0);
  await expect(orderItems.getByRole('heading', { name: '2 items' })).toBeVisible();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect.poll(() => checkoutIntent).toMatchObject({ addressId: 'address', buyNow });
  expect(checkoutIntent).not.toHaveProperty('cartItemIds');
  expect(requests).toEqual([guestRequest, largeRequest, largeRequest]);
});

test('homepage loading skeleton fits a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  let releaseHome: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { releaseHome = resolve; });
  await page.route('**/api/v1/**', async route => {
    await waiting;
    return route.fulfill({ headers: corsHeaders, json: { data: { banners: [], categories: [], featured: [], bestSellers: [], newArrivals: [] } } });
  });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  releaseHome!();
});

for (const width of [375, 1440]) {
  test(`combined filters survive refresh and clear at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/products');
    const mobile = width < 1024;
    if (mobile) {
      const bar = page.getByRole('group', { name: 'Product list controls' });
      await expect(bar.getByRole('button')).toHaveText(['Sort', 'Filter']);
      await bar.getByRole('button', { name: 'Filter', exact: true }).click();
    }
    const controls = mobile ? page.getByRole('dialog', { name: 'Filters' }) : page.locator('.catalogue-filters');
    await controls.getByRole('checkbox', { name: /^Honey/i }).click();
    if (!mobile) await expect(page).toHaveURL(/category=honey/);
    if (mobile) await controls.getByRole('button', { name: 'Availability and trust' }).click();
    await controls.getByRole('checkbox', { name: /^In stock only/i }).click();
    if (!mobile) await expect(page).toHaveURL(/inStock=true/);
    await controls.getByRole('checkbox', { name: /^Lab verified only/i }).click();
    if (mobile) await expect(page).not.toHaveURL(/category=honey/);
    if (mobile) await controls.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page).toHaveURL(/category=honey/);
    await expect(page).toHaveURL(/inStock=true/);
    await expect(page).toHaveURL(/labVerified=true/);
    await page.reload();
    if (mobile) await page.getByRole('button', { name: /^Filter/ }).click();
    const refreshed = mobile ? page.getByRole('dialog', { name: 'Filters' }) : page.locator('.catalogue-filters');
    await expect(refreshed.getByRole('checkbox', { name: /^Honey/i })).toBeChecked();
    await refreshed.getByRole('button', { name: 'Clear all', exact: true }).click();
    if (mobile) await refreshed.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page).not.toHaveURL(/category=|inStock=|labVerified=/);
    if (mobile) {
      await page.getByRole('button', { name: 'Sort', exact: true }).click();
      const sort = page.getByRole('dialog', { name: 'Sort by' });
      await sort.getByRole('button', { name: 'Discount', exact: true }).click();
      await expect(sort).toBeHidden();
    } else {
      await page.getByRole('combobox', { name: 'Sort by' }).selectOption('discount');
    }
    await expect(page).toHaveURL(/sort=discount/);
  });
}
