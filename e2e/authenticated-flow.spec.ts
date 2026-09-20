import { expect, test, type Page } from '@playwright/test';

/**
 * Authenticated journey against a REAL backend, in a real browser.
 *
 * Prerequisites — these are the reason this file is separate from critical-paths.spec.ts:
 *   SPRING_PROFILES_ACTIVE=dev          mock OTP, fixed code 123456
 *   TRUZOV_AUTH_RATE_LIMIT_ENABLED=false  the auth limiter is 5 requests / 15 min per IP, and one
 *                                         signup + one verify + a refresh would exhaust it
 *   seed data loaded (db/seed/data.sql)
 *
 * Mock mode fakes only OTP generation and delivery. Verification, JWT issuance and refresh-token
 * rotation are the same production code paths, so a successful verify here mints real tokens — which
 * is what makes this a meaningful test of the authenticated stack rather than a stub.
 *
 * Each test signs up its OWN user. Sharing one would make the tests order-dependent, and the cart is
 * per-user server state, so a leftover cart from a previous test would leak into the next.
 */

const OTP_CODE = '123456';
const HONEY_SLUG = 'raw-forest-honey-500g';

/** Unique phone per run. The backend rejects a duplicate, so a fixed number passes exactly once. */
function uniquePhone(): string {
  // 10 digits starting with 9, from the timestamp plus noise — collisions across a parallel run
  // would otherwise surface as a confusing 409 rather than a test failure.
  const tail = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  return `9${tail}`;
}

/** Signs up and verifies the OTP, leaving the page authenticated. */
async function signUpAndVerify(page: Page): Promise<string> {
  const phone = uniquePhone();

  await page.goto('/signup');
  await page.getByLabel('Full Name').fill('E2E Customer');
  await page.getByLabel('Phone Number').fill(phone);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByLabel('Confirm Password').fill('secret123');
  await page.getByRole('button', { name: /Create Account/i }).click();

  // Signup returns an OTP session and NO tokens, so the app must land on verification rather than
  // logging the user in — the old mock set isLoggedIn immediately and skipped this entirely.
  await page.waitForURL('**/verify-otp**');
  await expect(page.getByText(new RegExp(phone))).toBeVisible();

  // The first box accepts a pasted full code and spreads it across the six inputs.
  await page.getByLabel('Digit 1').fill(OTP_CODE);
  await page.getByRole('button', { name: /Verify & Proceed/i }).click();

  // Verification mints tokens and returns home.
  await page.waitForURL((url) => !url.pathname.includes('verify-otp'));

  return phone;
}

/**
 * Adds the honey to the cart, asserting the SERVER accepted it rather than watching for the toast,
 * which auto-dismisses and made this a race.
 *
 * Retries once if the click produced no request at all. That happens intermittently under a long run
 * against `next dev`: the button is rendered and enabled, the click reports success, and no POST is
 * ever issued. Retrying is safe precisely because nothing was sent — there is no risk of adding two
 * units — and the reload discards any half-initialised client state first.
 */
async function addHoneyToCart(page: Page) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt === 1) {
      await page.goto(`/products/${HONEY_SLUG}`);
    } else {
      await page.reload();
    }

    const pending = page
      .waitForResponse(
        (r) => r.url().includes('/cart/items') && r.request().method() === 'POST',
        { timeout: 15_000 }
      )
      .catch(() => null);

    await page.getByRole('button', { name: /^Add to Cart$/ }).click();
    const response = await pending;

    if (response) {
      expect(response.status(), 'POST /cart/items should succeed').toBeLessThan(300);
      return;
    }
  }

  throw new Error('Add to Cart produced no POST /cart/items after two attempts');
}

/**
 * Places the order and completes the mock payment, ending on the confirmation.
 *
 * Checkout no longer lands on the confirmation directly. It opens a payment session and routes to
 * the mock gateway's page, mirroring how a real hosted checkout takes over — paying is what returns
 * the customer. Tests that only care about having a placed order still go through here, because
 * that is now the only route to the confirmation screen.
 */
async function placeOrderAndPay(page: Page, outcome: 'success' | 'failure' = 'success') {
  await page.getByRole('button', { name: /Place Order/i }).click();

  // The order exists from this point on, whatever happens to the payment.
  await page.waitForURL('**/pay/**', { timeout: 20_000 });

  await page
    .getByTestId(outcome === 'success' ? 'simulate-payment-success' : 'simulate-payment-failure')
    .click();

  await page.waitForURL('**/checkout/confirm**', { timeout: 20_000 });
}

test.describe('authenticated journey', () => {
  /**
   * Serial, deliberately.
   *
   * The storefront rate limiter is left ENABLED (truzov.rate-limit, 100 requests/minute per IP) —
   * only the tighter auth limiter is disabled for these tests. Parallel workers all originate from
   * the same IP, and each test here performs a signup plus several page loads, so running them
   * concurrently trips the limiter and produces 429s that look like unrelated UI failures (a product
   * page rendering its error state, so "Add to Cart" never appears). Verified: the same tests pass
   * individually and fail in parallel.
   *
   * A journey suite has no reason to be parallel anyway.
   */
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  test('signup, OTP verification, and a real session', async ({ page }) => {
    const phone = await signUpAndVerify(page);

    // The account menu reflects the profile from the token response / GET /auth/me.
    await page.goto('/account');
    await expect(page.getByText('E2E Customer').first()).toBeVisible();
    await expect(page.getByText(phone).first()).toBeVisible();
    // Phone is verified by the OTP flow, which is what unblocks checkout.
    await expect(page.getByText('Verified').first()).toBeVisible();
  });

  test('a wrong OTP is rejected without destroying the session', async ({ page }) => {
    const phone = uniquePhone();

    await page.goto('/signup');
    await page.getByLabel('Full Name').fill('Wrong Code');
    await page.getByLabel('Phone Number').fill(phone);
    await page.getByLabel('Password', { exact: true }).fill('secret123');
    await page.getByLabel('Confirm Password').fill('secret123');
    await page.getByRole('button', { name: /Create Account/i }).click();
    await page.waitForURL('**/verify-otp**');

    await page.getByLabel('Digit 1').fill('000000');
    await page.getByRole('button', { name: /Verify & Proceed/i }).click();

    // 400 OTP_INVALID: the message shows and the form stays usable, because the session is still
    // alive. This is the case the old code conflated with an expired session.
    //
    // Waits for the ACTUAL error text. This previously asserted /code|otp/i, which also matches the
    // static helper line "Enter the 6-digit code sent to your phone" and so passed instantly without
    // waiting for the response at all. The component clears the inputs when the error lands, so the
    // correct code below was being typed BEFORE that clear and then wiped — leaving the submit button
    // disabled on an empty form and the retry timing out.
    await expect(page.getByText(/incorrect/i)).toBeVisible();
    await expect(page).toHaveURL(/verify-otp/);

    // The correct code still works on the same session.
    await page.getByLabel('Digit 1').fill(OTP_CODE);
    await page.getByRole('button', { name: /Verify & Proceed/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('verify-otp'));
  });

  test('cart reflects server state, not a local basket', async ({ page }) => {
    await signUpAndVerify(page);
    await addHoneyToCart(page);

    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /1 Item in Your Bag/i })).toBeVisible();
    await expect(page.getByText('Raw Forest Honey 500g')).toBeVisible();
    // lineTotal from the server, and the subtotal it reports — never unitPrice * quantity.
    await expect(page.getByText('₹449').first()).toBeVisible();

    // Increment goes through PATCH /cart/items/{itemId} and the server recomputes the line.
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(page.getByText('Qty: 2')).toBeVisible();
    await expect(page.getByText('₹898').first()).toBeVisible();

    // A reload proves it is server state: a local cart would have been the only source before.
    await page.reload();
    await expect(page.getByText('Qty: 2')).toBeVisible();
  });

  test('no cart total is shown before checkout', async ({ page }) => {
    await signUpAndVerify(page);
    await addHoneyToCart(page);
    await page.goto('/cart');

    // GET /cart returns only `subtotal`, so a "Total Amount" here would be a client-side guess at
    // the server's pricing. Deliberately absent (plan D3).
    await expect(page.getByText('Subtotal')).toBeVisible();
    await expect(page.getByText('Total Amount')).toHaveCount(0);
    // The removed coupon box must not come back.
    await expect(page.getByPlaceholder(/TRUZOV10/i)).toHaveCount(0);
  });

  test('address creation, checkout, and the placed order', async ({ page }) => {
    await signUpAndVerify(page);
    await addHoneyToCart(page);

    await page.goto('/cart');
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.waitForURL('**/checkout/address');

    // A brand-new account has no addresses; checkout requires one.
    await expect(page.getByRole('heading', { name: /No saved addresses/i })).toBeVisible();
    await page.getByRole('button', { name: /Add an address/i }).click();

    await page.getByLabel('Full Name').fill('E2E Customer');
    await page.getByLabel('Phone', { exact: true }).fill('9876543210');
    await page.getByLabel('Pincode').fill('411001');
    await page.getByLabel('City').fill('Pune');
    await page.getByLabel('State').fill('Maharashtra');
    await page.getByLabel('Address Line 1').fill('12 Main Street, Near Market');
    await page.getByRole('button', { name: /Save Address/i }).click();

    // Created via POST /users/me/addresses and re-read from GET, then auto-selected as the default.
    await expect(page.getByText(/12 Main Street/)).toBeVisible();
    const radio = page.getByRole('radio').first();
    await expect(radio).toBeChecked();

    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.waitForURL('**/checkout/payment');

    // The review step. No card fields, no UPI, no payment-method list — deleted, not hidden.
    await expect(page.getByRole('heading', { name: /Review your order/i })).toBeVisible();
    await expect(page.getByPlaceholder(/4111/)).toHaveCount(0);
    await expect(page.getByPlaceholder(/name@upi/)).toHaveCount(0);
    await expect(page.getByText('Cash on Delivery')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Simulate payment failure/i })).toHaveCount(0);

    await page.getByRole('button', { name: /Place Order/i }).click();

    // POST /checkout returns the order, then a payment session opens and the mock gateway's page
    // takes over. The order id travels in the URL throughout, so a reload still works.
    await page.waitForURL('**/pay/**', { timeout: 20_000 });
    await page.getByTestId('simulate-payment-success').click();
    await page.waitForURL('**/checkout/confirm**', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Order confirmed/i })).toBeVisible();

    // Server money only: subtotal, delivery (0 locally, shown as Free) and total. Exact matches —
    // "Total" is otherwise a substring of "Subtotal:".
    await expect(page.getByText('Subtotal:', { exact: true })).toBeVisible();
    await expect(page.getByText('Total', { exact: true })).toBeVisible();
    await expect(page.getByText('Payment:', { exact: true })).toBeVisible();
    // Delivery fee is 0 on local config (truzov.commerce.delivery-fee), which is a real value
    // rendered as "Free" rather than hidden.
    await expect(page.getByText('Free', { exact: true })).toBeVisible();

    // Checkout CONSUMES the server cart, so the badge and cart page must now be empty. Previously a
    // client-side clearCart() faked this.
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /Your bag is empty/i })).toBeVisible();

    // The order appears in the real orders list.
    await page.goto('/account/orders');
    await expect(page.getByRole('link', { name: /View Order/i }).first()).toBeVisible();
    await expect(page.getByText(/1 item/i).first()).toBeVisible();
  });

  test('a pending order can be cancelled', async ({ page }) => {
    await signUpAndVerify(page);
    await addHoneyToCart(page);

    // Straight to the address step; the flow above already covers the intermediate assertions.
    await page.goto('/checkout/address');
    await page.getByRole('button', { name: /Add an address/i }).click();
    await page.getByLabel('Full Name').fill('E2E Customer');
    await page.getByLabel('Phone', { exact: true }).fill('9876543210');
    await page.getByLabel('Pincode').fill('411001');
    await page.getByLabel('City').fill('Pune');
    await page.getByLabel('State').fill('Maharashtra');
    await page.getByLabel('Address Line 1').fill('12 Main Street, Near Market');
    await page.getByRole('button', { name: /Save Address/i }).click();
    await expect(page.getByRole('radio').first()).toBeChecked();

    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.waitForURL('**/checkout/payment');
    await placeOrderAndPay(page);

    await page.getByRole('button', { name: /View Order/i }).click();
    await page.waitForURL('**/account/orders/**');

    // Customers may cancel only before fulfilment, so a freshly placed order offers it.
    const cancel = page.getByRole('button', { name: /Cancel Order/i });
    await expect(cancel).toBeVisible();
    await cancel.click();

    // PATCH /orders/{id}/status returns the updated order; the timeline switches to its terminal
    // wording and the action disappears, because a second cancel would be a 409.
    await expect(page.getByText(/was cancelled/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel Order/i })).toHaveCount(0);
  });

  test('wishlist is server state and survives a reload', async ({ page }) => {
    await signUpAndVerify(page);

    await page.goto(`/products/${HONEY_SLUG}`);
    await page.getByRole('button', { name: /Add to Wishlist/i }).click();
    // Label flips once GET /wishlist is refetched and the productId -> itemId map is rebuilt.
    await expect(page.getByRole('button', { name: /In Wishlist/i })).toBeVisible();

    await page.goto('/wishlist');
    // Rendered through the normal ProductCard, resolved via POST /products/batch.
    await expect(page.getByText('Raw Forest Honey 500g').first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('Raw Forest Honey 500g').first()).toBeVisible();
  });

  test('logout revokes the session and protected routes redirect', async ({ page }) => {
    await signUpAndVerify(page);

    await page.goto('/account');
    await expect(page.getByText('E2E Customer').first()).toBeVisible();

    await page.getByRole('button', { name: 'Account' }).first().click();
    await page.getByRole('button', { name: /Logout/i }).click();

    // The guard waits for session restore before deciding, so this must land on login rather than
    // flashing the account page. That race is what used to bounce valid sessions on reload.
    await page.goto('/account');
    await page.waitForURL('**/login**');
  });
});
