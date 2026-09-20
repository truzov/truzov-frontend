import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /**
   * Serial, and not because the tests are order-dependent.
   *
   * The backend's storefront rate limiter allows 100 requests/minute per IP and is ON by default.
   * Parallel workers all originate from the same IP, and each browser page load makes several API
   * calls, so a parallel run trips the limiter. Worse, a limited response currently carries no CORS
   * headers (see e2e/rate-limit.spec.ts and plan §T10), so the browser cannot read it and the failure
   * surfaces as an unrelated-looking UI error — a product page rendering its error state, so a button
   * the test is waiting for never appears. Running serially keeps the suite honest against
   * production-like limits instead of requiring them to be switched off.
   */
  fullyParallel: false,
  workers: 1,
  use: {
    /**
     * `localhost`, NOT `127.0.0.1`.
     *
     * These are different ORIGINS to a browser, and the backend's CORS allow-list defaults to
     * `http://localhost:3000` (truzov.cors.allowed-origins). Running the suite against
     * 127.0.0.1 makes every API call fail its preflight, and the resulting console error names
     * CORS rather than the request — so it reads like an auth bug and gets debugged as one.
     */
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: '.\\node_modules\\.bin\\next.cmd dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
