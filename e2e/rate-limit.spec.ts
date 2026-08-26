import { expect, test } from '@playwright/test';

/**
 * 429 handling.
 *
 * Run on its own — tripping the limiter deliberately would fail any concurrently running test for an
 * unrelated reason:
 *   npx playwright test e2e/rate-limit.spec.ts --project=chromium
 *
 * Rate limiting must be ENABLED (its secure default). Measured on this backend:
 *   auth tier       5 requests / 15 min per IP over signup, otp/send, otp/verify, login, refresh
 *   storefront tier 100 requests / minute per IP
 *   limited response: `Retry-After` header + `{ error: { code: "RATE_LIMITED", ... } }`
 *
 * IMPORTANT FINDING, see the second test: a limited response currently carries NO CORS headers, so a
 * browser cannot read it at all. The frontend handling below is correct and unit-tested, but it
 * cannot engage in a real browser until the backend fixes that (plan §T10).
 */

test.describe('rate limiting', () => {
  test.describe.configure({ mode: 'serial' });

  test('a readable 429 shows the server message and the wait, with no retry button', async ({
    page,
  }) => {
    /**
     * Deterministic 429 via interception, using the exact body captured from this backend PLUS the
     * CORS headers a correctly-configured error response would carry.
     *
     * The added headers are the point of this test, not a convenience. `Retry-After` is not a
     * CORS-safelisted response header, so cross-origin JavaScript can only read it when the server
     * lists it in `Access-Control-Expose-Headers`. This backend exposes only `X-Request-Id`. So this
     * test proves OUR code does the right thing given a well-formed response, and the next test
     * records that real responses are not yet well-formed.
     */
    await page.route('**/api/v1/products**', (route) =>
      route.fulfill({
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '30',
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Expose-Headers': 'Retry-After, X-Request-Id',
        },
        body: JSON.stringify({
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded. Retry after 30s.',
            traceId: '1ea8f0ae',
            status: 429,
            path: '/api/v1/products',
          },
        }),
      })
    );

    await page.goto('/products');

    // The server's own message, not a generic failure — and not "[object Object]", which is what the
    // pre-migration client produced for this envelope shape.
    await expect(page.getByText(/Rate limit exceeded/i)).toBeVisible();
    await expect(page.getByText('[object Object]')).toHaveCount(0);

    // The wait, derived from Retry-After.
    await expect(page.getByText(/Please wait 30 seconds before trying again/i)).toBeVisible();

    /**
     * No retry affordance. The API reference is explicit that a 429 must respect Retry-After and
     * avoid immediate retries, so a button here would invite the user to do the one thing that
     * extends the block. React Query's retry predicate declines 429 for the same reason.
     */
    await expect(page.getByRole('button', { name: /Try again/i })).toHaveCount(0);

    // The trace id is surfaced for support.
    await expect(page.getByText(/1ea8f0ae/)).toBeVisible();
  });

  /**
   * EXPECTED TO FAIL until the backend adds CORS headers to filter-level error responses.
   *
   * `test.fail()` rather than a skip or a deleted test: it passes while the bug exists and starts
   * FAILING the moment the backend is fixed, which is precisely when someone should come back and
   * flip it to a normal test. A skip would go stale silently.
   *
   * Measured 2026-08-22 against the running backend:
   *   200 /categories -> Access-Control-Allow-Origin: http://localhost:3000
   *                      Access-Control-Expose-Headers: X-Request-Id
   *   429 /products   -> Retry-After: 1, and NO Access-Control-* headers at all
   *
   * The rate-limit filter short-circuits before the CORS filter, so the browser blocks the response
   * and `fetch` rejects. The client cannot distinguish that from being offline, so a rate-limited
   * user is told "Could not reach the server. Please check your connection." — misleading, and it
   * makes the whole 429 path (Retry-After, the wait message, suppressing retries) unreachable from a
   * browser.
   *
   * Two fixes are needed: CORS headers on error responses produced by filters, and `Retry-After`
   * added to `Access-Control-Expose-Headers`.
   */
  test.fail(
    'a real limited response is readable by the browser',
    async ({ page }) => {
      await page.goto('/login');

      // Exhaust the limiter from inside the page, so it is the same origin and the same per-IP
      // bucket the app's own requests use. Playwright's `request` fixture is a separate client and
      // `localhost` can resolve to ::1 there vs 127.0.0.1 in the browser — different buckets.
      const outcome = await page.evaluate(async () => {
        const statuses: Array<number | string> = [];

        for (let i = 0; i < 12; i += 1) {
          try {
            const response = await fetch('http://localhost:8080/api/v1/auth/otp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identifier: `90000000${String(i).padStart(2, '0')}`,
                purpose: 'login',
              }),
            });
            statuses.push(response.status);
          } catch {
            // A CORS-blocked response rejects rather than resolving with 429.
            statuses.push('blocked');
          }
        }

        return statuses;
      });

      // Fails today: the limited responses come back as 'blocked' instead of 429.
      expect(outcome).toContain(429);
    }
  );
});
