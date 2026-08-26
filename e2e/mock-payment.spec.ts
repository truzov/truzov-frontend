import { expect, test, type Page } from '@playwright/test';

/**
 * The mock payment journey, in a real browser against a real backend.
 *
 * Prerequisites, same as authenticated-flow.spec.ts:
 *   SPRING_PROFILES_ACTIVE=dev              mock OTP, fixed code 123456
 *   TRUZOV_PAYMENT_WEBHOOK_SECRET=<any>     the mock signs a real webhook, which the backend
 *                                           rejects with 401 when no shared secret is configured
 *   TRUZOV_AUTH_RATE_LIMIT_ENABLED=false    the auth limiter is 5 requests / 15 min per IP
 *   seed data loaded (db/seed/data.sql)
 *
 * Why this belongs in a browser rather than at the API level: the defects it guards were all
 * rendering failures that API assertions passed straight through. Order-level totals were always
 * correct — it was the item names, the line totals and the payment badge that were wrong, because
 * the frontend types named fields the API does not return.
 *
 * Helpers are duplicated from authenticated-flow.spec.ts rather than shared. They are a dozen lines,
 * and importing across spec files couples two suites that assert different things: a change made for
 * this file would then have to be safe for that one too.
 */

const OTP_CODE = '123456';
const HONEY_SLUG = 'raw-forest-honey-500g';

function uniquePhone(): string {
  const tail = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  return `9${tail}`;
}

async function signUpAndVerify(page: Page) {
  const phone = uniquePhone();
  await page.goto('/signup');
  await page.getByLabel('Full Name').fill('Pay E2E');
  await page.getByLabel('Phone Number').fill(phone);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByLabel('Confirm Password').fill('secret123');
  await page.getByRole('button', { name: /Create Account/i }).click();

  await page.waitForURL('**/verify-otp**');
  await page.getByLabel('Digit 1').fill(OTP_CODE);
  await page.getByRole('button', { name: /Verify & Proceed/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('verify-otp'));
}

/**
 * Adds the honey to the cart, asserting the SERVER accepted it.
 *
 * Retries once if the click produced no request at all. That happens intermittently under a long
 * run against `next dev`: the button is rendered and enabled, the click reports success, and no
 * POST is ever issued. Retrying is safe precisely because nothing was sent — there is no risk of
 * adding two units — and the reload discards any half-initialised client state first.
 */
async function addToCart(page: Page) {
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

/** Cart, address and review, leaving the page on /checkout/payment ready to place the order. */
async function readyToPlaceOrder(page: Page) {
  await addToCart(page);

  await page.goto('/checkout/address');
  await page.getByRole('button', { name: /Add an address/i }).click();
  await page.getByLabel('Full Name').fill('Pay E2E');
  await page.getByLabel('Phone', { exact: true }).fill('9876543210');
  await page.getByLabel('Pincode').fill('411001');
  await page.getByLabel('City').fill('Pune');
  await page.getByLabel('State').fill('Maharashtra');
  await page.getByLabel('Address Line 1').fill('12 Main Street, Near Market');
  await page.getByRole('button', { name: /Save Address/i }).click();
  await expect(page.getByRole('radio').first()).toBeChecked();

  await page.getByRole('button', { name: /^Continue$/ }).click();
  await page.waitForURL('**/checkout/payment');
}

test.describe('mock payment', () => {
  // Serial for the same reason as the other journey suite: parallel workers share an IP and trip the
  // 100-requests-per-minute storefront limiter, which surfaces as unrelated-looking UI errors.
  //
  // The raised timeout is about `next dev`, not about the app. Routes are compiled on first request,
  // and a cold /products/[slug] or /checkout/* can take tens of seconds, which exceeded the default
  // 30s and produced timeouts that looked like product bugs. Against a production build these tests
  // finish in a few seconds each.
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  test('a successful mock payment moves the order from unpaid to paid on screen', async ({
    page,
  }) => {
    await signUpAndVerify(page);
    await readyToPlaceOrder(page);

    await page.getByRole('button', { name: /Place Order/i }).click();

    // Checkout hands off to a payment session rather than going straight to the confirmation.
    await page.waitForURL('**/pay/**', { timeout: 20_000 });
    await expect(page.getByText(/Test Mode/i)).toBeVisible();

    // The order starts unpaid, read from the server rather than assumed. Exact match matters:
    // "unpaid" contains "paid", so a loose matcher would pass even when nothing worked.
    await expect(page.getByText('unpaid', { exact: true })).toBeVisible();

    await page.getByTestId('simulate-payment-success').click();

    // Back on the confirmation, now paid. That value came from the webhook the mock delivered to the
    // backend over real HTTP; the frontend never wrote it.
    await page.waitForURL('**/checkout/confirm**', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Order confirmed/i })).toBeVisible();
    await expect(page.getByText('paid', { exact: true })).toBeVisible();
    await expect(page.getByText('unpaid', { exact: true })).toHaveCount(0);
  });

  test('order lines show a real product name and line total, never blank or NaN', async ({
    page,
  }) => {
    await signUpAndVerify(page);
    await readyToPlaceOrder(page);
    await page.getByRole('button', { name: /Place Order/i }).click();
    await page.waitForURL('**/pay/**', { timeout: 20_000 });
    await page.getByTestId('simulate-payment-success').click();
    await page.waitForURL('**/checkout/confirm**', { timeout: 20_000 });

    // Guards defect D-3. The frontend types called these fields `name` and `lineTotal`; the API
    // returns `productName` and `totalPrice`. The result was a blank name and a literal NaN on this
    // exact screen while every order-level total stayed correct, which is why asserting on totals
    // at the API level did not catch it.
    await expect(page.getByText('Raw Forest Honey 500g').first()).toBeVisible();
    await expect(page.getByText(/NaN/)).toHaveCount(0);
    await expect(page.getByText('₹449').first()).toBeVisible();
  });

  test('a failed mock payment leaves the order unpaid and says so', async ({ page }) => {
    await signUpAndVerify(page);
    await readyToPlaceOrder(page);
    await page.getByRole('button', { name: /Place Order/i }).click();
    await page.waitForURL('**/pay/**', { timeout: 20_000 });

    await page.getByTestId('simulate-payment-failure').click();

    // The order still exists — a failed payment must not lose it — and is honestly reported as
    // unpaid rather than shown as paid.
    await page.waitForURL('**/checkout/confirm**', { timeout: 20_000 });
    await expect(page.getByText('unpaid', { exact: true })).toBeVisible();
    await expect(page.getByText('paid', { exact: true })).toHaveCount(0);
  });

  test('the payment page collects no card, CVV or UPI details', async ({ page }) => {
    await signUpAndVerify(page);
    await readyToPlaceOrder(page);
    await page.getByRole('button', { name: /Place Order/i }).click();
    await page.waitForURL('**/pay/**', { timeout: 20_000 });

    // Card-shaped fields were deliberately deleted from this app: collecting them would put the
    // whole frontend in PCI scope. A test screen is exactly where they would creep back in.
    await expect(page.getByPlaceholder(/4111|card number/i)).toHaveCount(0);
    await expect(page.getByPlaceholder(/cvv|cvc/i)).toHaveCount(0);
    await expect(page.getByPlaceholder(/name@upi|upi id/i)).toHaveCount(0);
    await expect(page.getByText('Cash on Delivery')).toHaveCount(0);

    // And it is unmistakably a test screen, not something a customer could mistake for real.
    await expect(page.getByText(/Test Mode/i)).toBeVisible();
    await expect(page.getByText(/No real payment is taken/i)).toBeVisible();
  });
});
