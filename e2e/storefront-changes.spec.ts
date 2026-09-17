import { expect, test, type Page } from '@playwright/test';

/**
 * Storefront changes from the `auth-toast-buy-now-variant-selection` spec, covering only the parts
 * a real browser can decide and jsdom cannot: stacking order and pointer hit-testing.
 *
 * Prerequisites (same shape as the other suites in this folder — these tests fail loudly rather than
 * quietly passing when they are missing):
 *   1. Backend on http://localhost:8080 with SPRING_PROFILES_ACTIVE=dev
 *   2. Seed data loaded: psql -U truzov -d truzov -f src/main/resources/db/seed/data.sql
 *   3. TRUZOV_AUTH_RATE_LIMIT_ENABLED=false — the auth tier is 5 requests / 15 min per IP and this
 *      file deliberately spends a failed POST /auth/login on each project.
 */

/** A real 401 from the backend. The seeded accounts have placeholder password hashes anyway. */
const UNKNOWN_IDENTIFIER = 'no-such-account@truzov-e2e.invalid';
const WRONG_PASSWORD = 'wrong-password-1';

test.describe('toast over the auth modal', () => {
  /**
   * Requirements 1.10 and 1.11.
   *
   * What makes this a Playwright test and not a Vitest one: `tests/auth-toast.test.ts` can assert
   * that the Toaster container carries `z-[90]` and `pointer-events-none`, but jsdom has no layout
   * and no compositing, so it cannot tell whether the toast actually paints above the modal's
   * `z-[80]` overlay, nor whether anything intercepts a click on the modal's close button. Both are
   * decided here by hit-testing, which is why the assertions below use `elementFromPoint` and a real
   * `click()` rather than `toBeVisible()`. Visibility in Playwright means "has a non-empty box and is
   * not `visibility: hidden`" — it says nothing about occlusion, so a toast rendered *behind* the
   * dimmed overlay would still be reported visible.
   *
   * The geometry that makes this worth asserting: the Toaster is `fixed right-4 top-4` with a
   * `max-w-sm` card, and `AuthModal`'s close button is `absolute right-4 top-4` inside the modal
   * card. On a narrow viewport (the `mobile` project) the modal card is nearly full-width, so the
   * toast lands directly over that button; on `chromium` the modal is `max-w-md` and centred, so the
   * boxes clear each other. The check is unconditional because Requirement 1.10 is unconditional.
   */
  test('an error toast paints above the modal and does not swallow its close button', async ({
    page,
  }) => {
    await page.goto('/');

    // Both header layouts render an AccountMenu (one `lg:hidden`, one desktop-only), so filter to
    // the one actually laid out at this viewport instead of guessing with `.first()`.
    await page
      .getByRole('button', { name: 'Account' })
      .filter({ visible: true })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: /Login with OTP/i })).toBeVisible();

    // Password sign-in is the only login path that fails in one request. The OTP path answers
    // identically for known and unknown identifiers by design, so it cannot produce a failure toast.
    await page.getByRole('button', { name: /Sign in with a password instead/i }).click();
    await page.getByLabel('Email or Phone Number').fill(UNKNOWN_IDENTIFIER);
    await page.getByLabel('Password', { exact: true }).fill(WRONG_PASSWORD);

    /**
     * Waiting on the RESPONSE, not on the toast, distinguishes the two failure toasts from each
     * other: a rejected request produces "Login failed", while a request that never reached the
     * server produces "Network error, please try again". A timeout here therefore means prerequisite
     * 1 above is not met — the backend is not reachable, so no response event is ever emitted.
     */
    const login = page.waitForResponse(
      (response) =>
        response.url().includes('/auth/login') && response.request().method() === 'POST',
      { timeout: 15_000 }
    );
    await page.getByRole('button', { name: /^Sign In$/ }).click();
    const response = await login;

    // Asserted so that a backend which somehow accepted these credentials fails here, rather than
    // further down where the missing failure toast would read like a frontend bug.
    expect(
      response.status(),
      `POST /auth/login should have rejected ${UNKNOWN_IDENTIFIER}`
    ).toBeGreaterThanOrEqual(400);

    // The modal stays open on a failed attempt — that is the whole premise of this test.
    await expect(dialog).toBeVisible();

    /**
     * The toast. `'Login failed'` is the fixed title from `loginFailureToast`; the backend's own
     * message goes in the toast's `message` slot and is also rendered inline by `LoginForm`, so
     * matching on the title is what distinguishes the toast from the in-form error.
     */
    const toastTitle = page.getByText('Login failed', { exact: true });
    await expect(toastTitle).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dismiss notification' })).toBeVisible();

    // Requirement 1.11 — the toast is the topmost element at its own centre, so it is painted above
    // the modal's full-screen `z-[80]` overlay rather than behind the dim.
    const stacking = await page.evaluate(() => {
      const title = Array.from(document.querySelectorAll('p')).find(
        (node) => node.textContent?.trim() === 'Login failed'
      );
      if (!title) {
        return { found: false as const };
      }

      const card = title.closest('div[class*="pointer-events-auto"]') ?? title.parentElement;
      const box = title.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);

      return {
        found: true as const,
        topmostIsToast: Boolean(card && hit && card.contains(hit)),
        topmost:
          hit instanceof HTMLElement ? `${hit.tagName.toLowerCase()}.${hit.className}` : String(hit),
      };
    });

    expect(stacking.found, 'the toast title should be in the DOM').toBe(true);
    expect(
      stacking.topmostIsToast,
      `the toast is covered by ${stacking.found ? stacking.topmost : 'nothing'} — the Toaster ` +
        `container must sit above AuthModal's z-[80] overlay`
    ).toBe(true);

    /**
     * Requirement 1.10 — the modal's close button is still hittable while the toast is up.
     *
     * Two assertions, because they fail differently. `elementFromPoint` names whatever is on top, so
     * a regression reports "the Toaster container is over the close button" instead of a bare
     * timeout; the `click()` that follows is the real proof, since Playwright's actionability check
     * refuses to click through an intercepting element.
     */
    const closeButton = page.getByRole('button', { name: 'Close account dialog' });
    const closeBox = await closeButton.boundingBox();
    expect(closeBox, 'the close button should have a layout box').not.toBeNull();

    const atCloseButton = await page.evaluate(
      ({ x, y }) => {
        const hit = document.elementFromPoint(x, y);
        return {
          label: hit?.closest('button')?.getAttribute('aria-label') ?? null,
          topmost:
            hit instanceof HTMLElement
              ? `${hit.tagName.toLowerCase()}.${hit.className}`
              : String(hit),
        };
      },
      { x: closeBox!.x + closeBox!.width / 2, y: closeBox!.y + closeBox!.height / 2 }
    );

    expect(
      atCloseButton.label,
      `the close button's own centre resolves to ${atCloseButton.topmost}. A toast overlapping it ` +
        `means the Toaster's z-[90]/pointer-events pair is not doing its job (Requirement 1.10).`
    ).toBe('Close account dialog');

    await closeButton.click({ timeout: 5_000 });
    await expect(dialog).toHaveCount(0);

    // The toast outlives the modal it was raised over: a non-modal notification is not the modal's
    // child, and closing the dialog must not have been a click that landed on the toast instead.
    await expect(toastTitle).toBeVisible();
  });
});

test.describe('mixed-grid card layout', () => {
  /**
   * Requirements 4.2, 4.3, 4.5.
   *
   * What makes this a Playwright test and not a Vitest one: `ProductCard` gains a variant
   * selector or not purely from data (`(product.variants?.length ?? 0) >= 2`), and the layout
   * fix is `flex h-full flex-col` on the `<article>` plus `mt-auto` on the CTA block — a CSS
   * flex/grid stretch outcome that jsdom does not lay out. Only a real browser can measure
   * `getBoundingClientRect()` and prove the two card shapes still line up.
   *
   * Row adjacency, and why this test does not require it: the task calls for measuring "a grid
   * row containing both a variant card and a simple card" at 320/768/1280/1920px. The seed
   * catalogue (see prerequisite 2 above) has exactly three published products — Raw Forest Honey
   * (3 variants), A2 Cow Ghee (2 variants), and Cold Pressed Coconut Oil (0 variants, and
   * out of stock) — against a grid that is 2 columns at the smallest breakpoint and up to 5
   * columns at 1920px (`grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5` in
   * `ProductGrid`). With only one Simple_Product in the catalogue, "same row" is only true by
   * accident of column count at a given width, not guaranteed across all four widths — at
   * `md:grid-cols-3` and wider every product fits in a single row regardless, but a catalogue
   * with a fourth product (or a differently seeded database) could easily put the simple card in
   * a row by itself. Rather than encode that row-count coincidence as a hard requirement — which
   * would make this test brittle to unrelated seed-data or grid changes — this test locates any
   * variant card and any simple card on the page and compares their card height and Add to Cart
   * offset directly. That is a strictly stronger check than "same row": Requirement 4.5 asks for
   * the tolerance to hold at every viewport width regardless of layout, and the CSS mechanism
   * from the design (`flex h-full flex-col` + `mt-auto`, no breakpoint-specific rule) makes every
   * card's internal offset independent of which row it lands in. If row adjacency specifically
   * is later required, the seed catalogue needs a second Simple_Product so a mixed row is
   * guaranteed at every listed width.
   */
  test('variant and simple product cards share height and Add to Cart offset at every listed viewport width', async ({
    page,
  }) => {
    const widths = [320, 768, 1280, 1920];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto('/products');

      const cards = page.locator('article').filter({ has: page.locator('img, span') });
      await expect(cards.first()).toBeVisible();

      const cardCount = await cards.count();
      let variantCardIndex = -1;
      let simpleCardIndex = -1;

      for (let i = 0; i < cardCount; i += 1) {
        // The selector is a `role="group"` rendered by VariantPills only for a Variant_Product
        // (2+ variants); its absence is exactly what marks a Simple_Product card (Requirement 4.1).
        const hasSelector = await cards.nth(i).locator('[role="group"]').count();
        if (hasSelector > 0 && variantCardIndex === -1) {
          variantCardIndex = i;
        } else if (hasSelector === 0 && simpleCardIndex === -1) {
          simpleCardIndex = i;
        }
        if (variantCardIndex !== -1 && simpleCardIndex !== -1) {
          break;
        }
      }

      expect(
        variantCardIndex,
        `expected at least one Variant_Product card at ${width}px — prerequisite 2's seed data ` +
          `(Raw Forest Honey, A2 Cow Ghee) should always produce one`
      ).toBeGreaterThanOrEqual(0);
      expect(
        simpleCardIndex,
        `expected at least one Simple_Product card at ${width}px — prerequisite 2's seed data ` +
          `(Cold Pressed Coconut Oil) should always produce one`
      ).toBeGreaterThanOrEqual(0);

      const variantCard = cards.nth(variantCardIndex);
      const simpleCard = cards.nth(simpleCardIndex);

      // The CTA block is the last child of the card body and holds the Add to Cart / Out of
      // Stock / Buy Now buttons — its own box is what "vertical offset from the card bottom
      // edge" (Requirement 4.3) is measured against, via `article` bottom minus CTA bottom.
      const ctaSelector = 'button:has-text("Add to Cart"), button:has-text("Out of Stock")';

      const [variantCardBox, simpleCardBox, variantCtaBox, simpleCtaBox] = await Promise.all([
        variantCard.boundingBox(),
        simpleCard.boundingBox(),
        variantCard.locator(ctaSelector).first().boundingBox(),
        simpleCard.locator(ctaSelector).first().boundingBox(),
      ]);

      expect(variantCardBox, `variant card should have a layout box at ${width}px`).not.toBeNull();
      expect(simpleCardBox, `simple card should have a layout box at ${width}px`).not.toBeNull();
      expect(
        variantCtaBox,
        `variant card's Add to Cart control should have a layout box at ${width}px`
      ).not.toBeNull();
      expect(
        simpleCtaBox,
        `simple card's Add to Cart control should have a layout box at ${width}px`
      ).not.toBeNull();

      // Requirement 4.2 — same card height, ±1px.
      const heightDiff = Math.abs(variantCardBox!.height - simpleCardBox!.height);
      expect(
        heightDiff,
        `card heights differ by ${heightDiff}px at ${width}px (variant: ${variantCardBox!.height}, ` +
          `simple: ${simpleCardBox!.height})`
      ).toBeLessThanOrEqual(1);

      // Requirement 4.3 — same Add to Cart offset from each card's own bottom edge, ±1px. Using
      // each card's own bottom edge (rather than the buttons' raw y-position) is what makes this
      // assertion correct even if the two cards do not end up in the same grid row.
      const variantOffset = variantCardBox!.y + variantCardBox!.height - (variantCtaBox!.y + variantCtaBox!.height);
      const simpleOffset = simpleCardBox!.y + simpleCardBox!.height - (simpleCtaBox!.y + simpleCtaBox!.height);
      const offsetDiff = Math.abs(variantOffset - simpleOffset);
      expect(
        offsetDiff,
        `Add to Cart bottom offsets differ by ${offsetDiff}px at ${width}px (variant: ` +
          `${variantOffset}, simple: ${simpleOffset})`
      ).toBeLessThanOrEqual(1);
    }
  });
});


test.describe('Buy Now navigates to checkout with the item in the cart', () => {
  /**
   * Requirement 2.10.
   *
   * What makes this a Playwright test and not a Vitest one: `tests/buy-now.test.tsx` already
   * covers `useBuyNow`'s add-then-navigate sequencing against a mocked `addAsync`, but it cannot
   * prove that a REAL `POST /api/v1/cart/items` followed by a REAL navigation to
   * `/checkout/address` leaves the item sitting in the REAL server cart that the checkout page
   * then reads via `GET /api/v1/cart`. That round trip through an actual backend is exactly what
   * jsdom has no way to exercise.
   *
   * Auth pattern reused, not invented: signup + OTP verification is the same flow
   * `e2e/authenticated-flow.spec.ts` uses (`signUpAndVerify`), with the same prerequisites —
   * `SPRING_PROFILES_ACTIVE=dev` (mock OTP, fixed code 123456) and
   * `TRUZOV_AUTH_RATE_LIMIT_ENABLED=false`. Each test signs up its own user for the same reason
   * that file gives: the cart is per-user server state, so a shared user would make this test
   * order-dependent on whatever an earlier test left in the cart.
   *
   * `raw-forest-honey-500g` is the seeded Variant_Product used throughout this spec file's sibling
   * suite (see the "mixed-grid card layout" comment above) and in `authenticated-flow.spec.ts`
   * (`HONEY_SLUG`) — a product with 3 variants, so `defaultVariantId` preselects the first in-stock
   * one and the Buy Now button is never disabled by `noSelectableVariant`.
   *
   * The assertion reads the cart from its own source of truth, `GET /api/v1/cart`, rather than
   * page text: `AddressScreen` (the component behind `/checkout/address`) does not render any
   * per-item product name — only `CheckoutPriceDetails`' item count and subtotal — so a text
   * assertion on that route would not actually prove the line exists, only that *some* item does.
   * Asserting on the response body is also exactly the mechanism the task description points at:
   * "checkout reads the whole server cart via GET /api/v1/cart, so the Buy Now item is a cart line
   * like any other."
   */
  const OTP_CODE = '123456';
  const HONEY_SLUG = 'raw-forest-honey-500g';

  function uniquePhone(): string {
    const tail = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
    return `9${tail}`;
  }

  async function signUpAndVerify(page: Page): Promise<void> {
    const phone = uniquePhone();

    await page.goto('/signup');
    await page.getByLabel('Full Name').fill('E2E Buy Now Customer');
    await page.getByLabel('Phone Number').fill(phone);
    await page.getByLabel('Password', { exact: true }).fill('secret123');
    await page.getByLabel('Confirm Password').fill('secret123');
    await page.getByRole('button', { name: /Create Account/i }).click();

    await page.waitForURL('**/verify-otp**');
    await page.getByLabel('Digit 1').fill(OTP_CODE);
    await page.getByRole('button', { name: /Verify & Proceed/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('verify-otp'));
  }

  test('signed-in Buy Now lands on /checkout/address with the item in the server cart', async ({
    page,
  }) => {
    await signUpAndVerify(page);

    await page.goto(`/products/${HONEY_SLUG}`);
    await expect(page.getByRole('heading', { name: /Raw Forest Honey/i })).toBeVisible();

    // Waiting on the POST /cart/items response (not on the URL alone) is what proves the add
    // happened, rather than a navigation that raced ahead of it — `useBuyNow.checkout` awaits the
    // add before pushing, so the response event and the navigation are causally ordered, but a
    // flaky assertion on the URL alone would not distinguish "added, then navigated" from a bug
    // that navigated first.
    const addToCart = page.waitForResponse(
      (response) =>
        response.url().includes('/cart/items') && response.request().method() === 'POST',
      { timeout: 15_000 }
    );
    await page.getByRole('button', { name: /^Buy Now$/ }).click();
    const addResponse = await addToCart;

    expect(addResponse.status(), 'POST /cart/items for the Buy Now intent should succeed').toBeLessThan(
      300
    );

    // Requirement 2.5/2.7 — navigation only after the add succeeds, landing on /checkout/address.
    await page.waitForURL('**/checkout/address', { timeout: 15_000 });

    // Requirement 2.10 — the item is a cart line like any other, provable only against the
    // server's own GET /cart, which /checkout/address reads via useCart().
    const cartResponse = await page.waitForResponse(
      (response) => response.url().includes('/api/v1/cart') && response.request().method() === 'GET',
      { timeout: 15_000 }
    );
    const cartBody = (await cartResponse.json()) as { data?: { items?: Array<{ slug?: string }> } };
    const items = cartBody.data?.items ?? [];

    expect(
      items.some((item) => item.slug === HONEY_SLUG),
      `expected GET /api/v1/cart to include a line for ${HONEY_SLUG}, got slugs: ` +
        JSON.stringify(items.map((item) => item.slug))
    ).toBe(true);

    // Sanity check that the address screen itself reflects a non-empty cart rather than falling
    // through to its empty-cart state, which would otherwise make the response-body assertion
    // above pass for the wrong reason (e.g. a stale response from a previous test run).
    await expect(page.getByRole('heading', { name: /Select Delivery Address/i })).toBeVisible();
  });
});
