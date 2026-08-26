# Migration Summary

Replacement of all hardcoded/mock frontend data with the Truzov Spring API.
Planning and per-item detail: `FRONTEND_API_MIGRATION_PLAN.md`.

**Status:** implementation complete. Public storefront verified end to end against the real backend.
Authenticated flows are code-complete but **not yet verified live** — see
[Verification](#verification) for exactly why and what remains.

---

## 1. What was replaced

### Removed entirely

| Deleted | What it was |
|---|---|
| `lib/data/fixtures.ts` | 17 KB of fixtures: 6 products, 2 reviews, 4 users, 2 addresses, 2 orders, 5 vendors, lab reports, verification submissions, admin metrics, 2 banners |
| `mocks/handlers.ts`, `mocks/browser.ts` | MSW worker. Its routes never matched the real API (`/user/profile`, `/cart/sync`, `/auth/register`), so it could not have served as a fallback |
| `store/cart.store.ts` | Local persisted cart, client-side stock clamping, hardcoded coupon list |
| `store/address.store.ts` | Address list **seeded from fixtures** — the clearest case of mock data reaching shipped state |
| `store/orders.store.ts` | Client-minted orders (`TRZ-${Date.now()}`) |
| `store/wishlist.store.ts` | Local `ids: string[]` |
| `types/index.ts` | Fixture-shaped view models, superseded by `types/api.ts` |
| `components/screens/AuthScreens.tsx` | Fake role login: submitted a form, ignored the credentials, called `loginAs(role)` |
| `components/commerce/CartItemRow.tsx` | Cart-wired row used on order detail; replaced by read-only `OrderItemRow` |
| `components/dashboard/StatCard.tsx`, `VerificationKanban.tsx`, `lib/utils/verification.ts` | Orphaned once the unbacked dashboards were gated |
| `msw` dependency + `npm run mock` script | No longer used |

### Foundation added

`lib/config/env.ts` · `types/api.ts` · `lib/api/errors.ts` · `lib/api/token-store.ts` ·
`lib/api/auth-events.ts` · `lib/api/client.ts` (rewritten) · `lib/api/endpoints/*` (7 modules) ·
`lib/api/queries.ts` · `hooks/api/*` (4 modules) · `components/ui/ErrorState.tsx` ·
`components/ui/NotAvailableYet.tsx` · `components/auth/AuthEventBridge.tsx` · `.env.example`

The client implements the reference's "Frontend implementation notes" in one place: bearer
attachment, `{data}`/`{error}` envelopes, `204`→`undefined`, **single-flight** 401→refresh→retry-once,
429 with `Retry-After` and no retry, and 403 `PHONE_NOT_VERIFIED`/`ACCOUNT_NOT_VERIFIED` →
`/verify-otp`.

The single-flight guard is the non-obvious part. A page fires several authenticated requests at once;
if the access token has expired they all 401 together. Refresh *rotates* and invalidates the old
token, so N parallel refreshes means the first succeeds and the rest fail with
`REFRESH_TOKEN_INVALID` — logging the user out at exactly the moment their session was recoverable.
One shared in-flight promise prevents that, and there is a test for it.

### Screens migrated

| Screen | Endpoint(s) |
|---|---|
| Home | `GET /home` (+ `GET /banners?placement=hero` fallback, see §3) |
| Filter sidebar | `GET /categories` |
| Listing / category / search | `GET /products`, `GET /search` — server-side filter, sort, paging |
| Product detail | `GET /products/{slugOrId}` |
| Reviews tab | `GET /products/{slugOrId}/reviews` (fetched only when the tab is opened) |
| Similar products | `GET /products/{slugOrId}/related` |
| Lab reports | `GET /lab-reports` + `POST /products/batch` to resolve names |
| Signup | `POST /auth/signup` |
| OTP send / resend / verify | `POST /auth/otp/send`, `POST /auth/otp/verify` |
| Password login | `POST /auth/login` |
| Session restore, profile | `GET /auth/me`, `PATCH /users/me` |
| Logout | `POST /auth/logout` (revokes server-side) |
| Cart, header badge | `GET /cart`, `POST /cart/items`, `PATCH`/`DELETE /cart/items/{itemId}` |
| Wishlist | `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/{itemId}` |
| Addresses | `GET`/`POST /users/me/addresses` |
| Checkout | `POST /checkout` |
| Orders list / detail / cancel | `GET /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/status` |
| Vendor product create | `POST /vendor/products` |
| Admin role change | `PUT /admin/users/{id}/role` |

Every one has a loading state (reusing the existing `components/ui/Skeleton.tsx` exports), an error
state with retry (`ErrorState`), and an empty state (`EmptyState`).

### Bugs fixed along the way

These were latent behind the fixtures and would have shipped:

- **Wrong product on an unknown slug.** `findProduct(slug) ?? products[0]` rendered an unrelated
  product — with a 200, so crawlers indexed it. Now `notFound()`.
- **Wrong order on an unknown id.** `findOrder(id)` fell back to `orders[0]`, showing a different
  order's items and total.
- **Someone else's orders.** `OrdersScreen` fell back to fixture orders whenever the local store was
  empty, so a brand-new customer saw two orders that were not theirs.
- **Logged-in users bounced to `/login` on refresh.** `useProtectedRoute` had no "still deciding"
  state and `isLoading` started `false`. Invisible with a synchronously-persisted fake flag;
  guaranteed with real tokens, since the access token is memory-only.
- **`"[object Object]"` shown to users.** The old client did `body?.message ?? body?.error`, but the
  envelope is `{ error: { … } }`, so `body.error` is an object.
- **Blank error box.** A response with no parseable envelope produced an empty message. Caught by a
  unit test written for this migration, then fixed.
- **Buy Now skipped the cart.** It was a bare `<Link href="/checkout/address">`, so the user arrived
  at checkout without the product they had just chosen.
- **Empty-string image src.** `src={product.images[0]?.url ?? ''}` — invalid for `next/image`.
- **Sessions not actually revoked.** `logout()` only cleared local state; the refresh token stayed
  valid until expiry.
- **Client-side privilege selection.** `loginAs(role)` and the "Google" / "Vendor ID" / "Demo {role}
  login" buttons granted a session with no credentials and a role the client picked.

### Security posture

- Access token in memory only; refresh token in `localStorage` under its own key. This is an
  **accepted risk, documented in code** (`lib/api/token-store.ts`) and in plan §8.5: the API exposes
  no httpOnly-cookie refresh flow and runs `cors.allow-credentials: false`, so this trades CSRF
  exposure for XSS-driven token theft. **Ticket §T1 must land before wider production rollout, and
  a Content-Security-Policy plus output sanitisation are required alongside it — neither is in place
  yet.**
- Card number / expiry / CVV / UPI inputs **deleted**, not hidden behind a flag. They posted nowhere,
  and a card-shaped field in the DOM is scope creep for any future PCI review.
- Client-side role gate on the vendor/admin/lab shell. Defence in depth only — the server remains
  authoritative on every endpoint.
- No hardcoded URLs, tokens or secrets. Base URL comes from `NEXT_PUBLIC_API_BASE_URL` and the app
  throws at boot if it is missing, rather than silently issuing requests against a relative path.

---

## 2. Money handling

Per the reference's instruction not to compute checkout totals client-side, **every displayed amount
now comes from the server**:

- `calculateCartTotals`, `FREE_SHIPPING_THRESHOLD`, `STANDARD_SHIPPING` deleted. They computed a
  subtotal, coupon discount, shipping fee and total from hardcoded policy (10% capped at ₹150; free
  over ₹499, else ₹49) — none of which is the server's pricing, so the "Total Amount" shown was not
  what the user would be charged.
- Cart line prices use `CartItemDto.lineTotal`, never `unitPrice * quantity`.
- Order money uses `OrderDto.subtotal` / `deliveryFee` / `totalAmount`.
- Product `discount` percentages come from the DTO, never recomputed from price/MRP.
- **Before checkout the panel deliberately shows no total.** `GET /cart` returns only `subtotal`;
  delivery fee and total exist only on an order. "Total MRP" and "Discount on MRP" were removed
  rather than reconstructed.
- One unit conversion, in one place (`lib/utils/filters.ts`): product prices are integer **rupees**,
  but the `/products` `minPrice`/`maxPrice` **query parameters are paise**. Getting this wrong does
  not error — it filters by a hundredth of the intended amount and silently returns nothing. Covered
  by a test.

---

## 3. Still mocked, removed, or gated — nothing silently faked

### Removed because no endpoint exists

Coupons (`applyCoupon` + the `TRUZOV10`/`WELCOME20`/`FIRST50` list, the coupon form, "10% off" and
"7.5% cashback" copy) · payment-method selection and all card/UPI/wallet inputs · per-item cart
selection · address edit / delete / set-default · delivery estimates · the fabricated "Delivery by
Thu, Oct 24" and "Free delivery over ₹999" · seller rating "4.9/5 • 2k+ Sales" · product `batchId` /
`sellerName` / `reportAvailable` · "Download Invoice" · order tracking URL and `paymentMethod` ·
profile `gender` / `dateOfBirth` / `location` (the inputs accepted typing and discarded it) ·
notification and language preferences · social login.

### Gated behind an explicit "not available yet" state

Roughly 30 vendor, admin and lab screens. **No fixture data remains on any reachable screen** — per
the agreed approach, demo vendor/order/user records get mistaken for real ones eventually, and that
is a trust problem rather than a cosmetic one. Each gate names the endpoint it is waiting for.

- **Vendor** — dashboard tiles, revenue chart, product list, inventory, orders + order detail,
  payouts, analytics, verification tracker, product edit. Only create/replace/delete exist; there is
  no vendor-scoped product **GET**.
- **Admin** — dashboard metrics, action queue, vendor management + detail (there is no vendor entity
  in the API at all), product queue + review, order list + detail, verification kanban, content
  management, configuration, user directory. Only `PUT /admin/users/{id}/role` exists.
- **Lab** — dashboard, sample requests + detail, report upload, verification history.
  `GET /lab-reports` is public, read-only, and returns only passed reports for live products.

Nothing is left behind a flag that a real user could flip. If the fixture designs are needed for
stakeholder review, that should be a dev-only build-excluded flag, which does not exist today.

### Backend follow-ups filed (plan §10)

`§T1` httpOnly refresh cookie (+ `allow-credentials`) · `§T2` endpoints for the gated workspaces ·
`§T3` guest-cart merge · `§T4` CSP headers · `§T5` shipping-address snapshot on `OrderDto` ·
`§T6` address `PATCH`/`DELETE`/set-default · `§T7` `labReportId`/`pdfUrl` on `ProductDetailDto` ·
`§T8` `GET /home` returns `banners: []` · `§T9` soft 404 on `/products/[slug]` ·
`§T10` error responses from filters carry no CORS headers.

Three were discovered by measuring the running backend rather than reading the doc:

**§T8 — `/home` returned `banners: []`** while `GET /banners?placement=hero` returned the seeded
`ban_hero`. **FIXED 2026-08-22.** `HomeService` asked for the placement literal `"homepage"`, but the
seed data and the reference's own example both use `"hero"`, so the query matched nothing. Fixed in
`application/home/HomeService.java` via a named `HOMEPAGE_PLACEMENT = "hero"` constant; verified that
`/home` now returns the banner. The frontend's `useBanners` fallback is self-clearing and simply stops
firing, so no frontend change was needed.

**§T9 — `notFound()` returns HTTP 200. ACCEPTED, not fixed.** The user never sees a wrong product, but
the status is a soft 404. Measured in dev *and* a production build, with and without the route's
`loading.tsx`, with `dynamic = 'force-dynamic'`, and with `notFound()` called from `generateMetadata`:
none of them change it. The HTML shell flushes and commits 200 before the async server component
throws.

*Mitigation and its precise limits.* `generateMetadata` returns
`robots: { index: false, follow: false }` for a missing product. Re-verified 2026-08-25 by raw `curl`
against a production build, with the exact placement measured rather than mere presence:

```
HTTP:200   total 79322 bytes
</head> at offset                                     1864
<meta name="robots" content="noindex"/>        at offset 78411
<meta name="robots" content="noindex, nofollow"/>  at 78639
robots INSIDE head?  False
```

So the tag **is server-rendered and needs no JavaScript to exist in the raw HTML** — but it lands
~76 KB into the `<body>`, outside `<head>`, and only reaches `<head>` when React relocates it during
hydration. The consequence, stated plainly: **effective for JS-executing crawlers (Googlebot,
Bingbot), not effective for non-JS crawlers**, which are the ones a soft 404 would otherwise mislead.
This is not specific to the not-found path — a real product page's `<title>` is emitted outside
`<head>` too — it is how Next streams metadata.

*Decision:* accepted and closed rather than fixed. The only complete fix is a `middleware.ts`
existence check, which would add a second backend round-trip to **every** product page view to cover
non-JS crawlers on a soft 404. That is the wrong trade: major search engines already handle soft 404s
heuristically, and the JS-executing crawlers that matter for ranking are covered by the current
mitigation. Revisit only given evidence of real non-JS-crawler traffic depending on it.

**§T10 — error responses from filters carry no CORS headers.** The most consequential of the three,
and the reason the 429 path cannot engage in a browser.

Measured 2026-08-22 against the running backend: `200 /api/v1/categories` returns
`Access-Control-Allow-Origin: http://localhost:3000` plus
`Access-Control-Expose-Headers: X-Request-Id`. A rate-limited `429 /api/v1/products` returns
`Retry-After: 1` and **no `Access-Control-*` headers at all**.

The rate-limit filter short-circuits before the CORS filter, so the browser blocks the response and
`fetch` rejects rather than resolving with a readable 429. From the frontend there is nothing to fix:
the client cannot distinguish a blocked response from being offline, so a rate-limited user is told
"Could not reach the server. Please check your connection." — and the entire 429 path
(`Retry-After`, the wait message, suppressing retries) is unreachable from a browser despite being
implemented and unit-tested. It also explains e2e failures that looked unrelated: a product page
rendering its error state because a 429 arrived as an opaque network failure.

Two backend fixes are needed: (a) apply CORS headers to error responses produced by filters, and
(b) add `Retry-After` to `Access-Control-Expose-Headers`, since it is not CORS-safelisted and
JavaScript cannot read it cross-origin unless the server exposes it. Pinned by
`e2e/rate-limit.spec.ts` with `test.fail()`, so it passes while the bug exists and starts failing the
moment it is fixed.

---

## 4. Verification

Backend used: `C:\Users\piyus\OneDrive\Desktop\database 2`, seeded with
`src/main/resources/db/seed/data.sql` (never auto-run — `spring.sql.init.mode: never`).

### Verified against the real backend

Backend run as `SPRING_PROFILES_ACTIVE=dev` (mock OTP, fixed code `123456`) with
`SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5434/truzov`.

Note the datasource port: Postgres on this machine listens on **5434**, not the 5432 default in
`application.yml`, so the override is required or the app fails to boot on `Connection refused`.

**Public storefront — `e2e/critical-paths.spec.ts`, 11/11 passing:**

- Homepage banner headline, categories and best sellers from `GET /home`
- Listing shows the server's `total` (3 of 3), not `items.length`
- Category filter applied server-side (ghee absent when filtering honey)
- Out-of-stock product (`prd_oil`) shows "Currently out of stock", Add to Cart disabled
- Product detail: ₹449, server-computed 25% off, seeded variants (250g/1kg), real lab metrics
  including the `warning`-status Moisture reading
- Reviews tab loads on demand
- Unverified product (`prd_ghee`) shows "Verification in progress" instead of a lab badge
- Unknown slug renders not-found and leaks no other product
- Lab reports list with the product name resolved via `POST /products/batch`
- Guest add-to-cart opens the auth modal (confirms the no-guest-cart decision)
- Search queries the server

**Authenticated journey — `e2e/authenticated-flow.spec.ts`, 8/8 passing.** This was the last open
gate, and it is now closed. Watched running in a real browser:

- Signup → OTP `123456` → real session; profile shows the name, phone, and **Verified**
- A wrong OTP is rejected and the session survives, then the correct code still works — the
  `OTP_INVALID` vs `OTP_EXPIRED` distinction, in practice
- Cart is server state: quantity increment goes through `PATCH /cart/items/{itemId}`, the line total
  becomes ₹898, and it **survives a page reload**
- No cart total shown before checkout, and no coupon box
- Address created via `POST /users/me/addresses`, auto-selected as default
- Review step has no card, UPI, COD or "simulate failure" controls
- `POST /checkout` places the order → confirmation shows subtotal, delivery ("Free"), total and
  payment status
- Checkout **consumed the server cart**: the bag is empty afterwards, with no client-side clear
- Order appears in `GET /orders`; `PATCH /orders/{id}/status` cancels it and the action disappears
- Wishlist survives a reload
- Logout revokes the session, and a protected route then redirects to login

Mock mode fakes only OTP generation and delivery — verification, JWT issuance and refresh rotation
are the production paths, so these tokens are real.

**429 handling — `e2e/rate-limit.spec.ts`, 2/2 passing, with rate limiting ENABLED.** See §T10: the
first test proves our handling given a well-formed response (server message, "Please wait 30
seconds", no retry button, trace id); the second is a `test.fail()` pinning the backend CORS gap.

**Two backend configurations, deliberately separate.** They are mutually exclusive, which is why the
specs are split:

```powershell
# Functional suites (critical-paths + authenticated-flow) — 19/19
$env:SPRING_PROFILES_ACTIVE="dev"; $env:TRUZOV_AUTH_RATE_LIMIT_ENABLED="false"
$env:TRUZOV_RATE_LIMIT_ENABLED="false"; $env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5434/truzov"

# Rate-limit suite — 2/2, limiters at their ON default
$env:SPRING_PROFILES_ACTIVE="dev"; $env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5434/truzov"
```

The journey suite genuinely cannot run under the limiters: 8 browser journeys make well over 100
API calls per minute (storefront tier) and ~16 auth calls against a bucket of 5 (auth tier). The
backend's own integration tests disable the limiters for the same reason. **Rate limiting was
restored to its ON default afterwards and verified: 27 × 429 in 120 requests.**

Also confirmed by direct API probes: `{data}`/`{error}` envelope shapes, `PagedData`, `images` as
`{id,url,alt,sortOrder}` objects, variant shape `{id,label,value,priceModifier,inStock}`, no `userId`
on reviews, and null fields omitted entirely (`default-property-inclusion: non_null`). The `VERIFY:`
notes in `types/api.ts` were updated to record what was observed.

### Bugs found and fixed during verification

- **`AuthForm` used an in-page OTP step on the `/signup` and `/login` pages**, not just the modal, so
  the URL still read `/signup` while showing an OTP form and a reload lost the pending session.
  Now the in-place step is modal-only; pages navigate to the dedicated `/verify-otp` route.
- **`/home` returned `banners: []`** (backend) — fixed, see §T8.
- **Soft 404 on missing products** — mitigated with `noindex`, see §T9.
- **429 responses lack CORS headers** (backend) — found, pinned, not fixable from the frontend, see
  §T10.

### Static checks

`npm run typecheck` clean · `npx eslint app components hooks lib store types tests` clean (one
pre-existing `<img>` warning in `AuthLayout.tsx`, untouched) · `npm run build` succeeds ·
`npm run test` **30/30 passing**.

### Accepted as out of scope for this migration

These need real third-party infrastructure, and are documented as known-unverified rather than faked:

- **`POST /payments/webhook`.** Gateway-to-server with an HMAC-SHA256 signature; not a client call at
  all. Verifying it needs a real payment gateway sandbox. Consequence: `OrderDto.paymentStatus` stays
  at its initial value locally, so the `captured` branch of the payment badge is untested against
  real data.
- **Real OTP delivery over SMS or email.** Needs a real provider: SMTP is deliberately unset, and per
  the backend's own config comments a Twilio *trial* account cannot send custom text (error 572006),
  so it could never carry an OTP code. Verified through `dev` mock mode instead, which exercises the
  production verification, JWT issuance and refresh-rotation paths.
- **A real browser 429.** Implemented, unit-tested, and verified in a browser against a well-formed
  response - but currently unreachable from a browser against the live backend, because limited
  responses carry no CORS headers (§T10). Blocked on the backend, not on this migration.
---

## 5. Tests changed

| File | Change |
|---|---|
| `tests/utils.test.ts` | Rewritten. Previously asserted `calculateCartTotals(...)` → `{subtotal: 998, discount: 100, shipping: 0, total: 898}` and `filterProducts` against fixtures — both functions are gone. Now covers the URL↔query adapter (including rupee→paise), money formatting and the image/alt helpers. 14 tests. |
| `tests/api-client.test.ts` | **New.** Envelope unwrapping, `204` without reading a body, error mapping, `Retry-After` capture, retry policy, 401→refresh→retry-once, the single-flight guard under concurrency, session-cleared events, 403 OTP announcement, and query construction. 14 tests. |
| `tests/checkout.test.tsx` | **Deleted.** Seeded `useCartStore`/`useAddressStore` from fixtures and asserted per-item selection — all three are gone, and those flows are now covered against the real backend in `e2e/`. |
| `tests/payment-flow.test.ts` | **Deleted.** A Playwright spec sitting in the Vitest directory (so it failed the unit run), asserting the client-side order flow: clicking "Pay Rs…" and watching `truzov-cart` in `localStorage` empty out. No such key, button or flow exists now. |
| `tests/components.test.tsx` | Unchanged and passing. |
| `tests/setup.ts` | Sets `NEXT_PUBLIC_API_BASE_URL` to a deliberately invalid host, so a test that accidentally reaches the network fails loudly instead of hitting a real localhost backend. |
| `e2e/critical-paths.spec.ts` | Rewritten against seeded data. Previously expected the fixture product "Pure Wildflower Honey" and an admin verification board with no backend. 11 tests. |
| `e2e/authenticated-flow.spec.ts` | **New.** The token-gated journey in a real browser: signup → OTP → cart → address → checkout → order → cancel, plus wishlist and logout. Serial, and requires the limiters off. 8 tests. |
| `e2e/rate-limit.spec.ts` | **New.** 429 handling. One test proves our handling against a well-formed limited response; one is a `test.fail()` pinning the backend CORS gap (§T10) so it flags the day it is fixed. 2 tests. |
| `e2e/cart-increment-regression.spec.ts` | **New.** D7 regression: asserts `POST /cart/items` returns a fresh quantity when it increments an existing line, comparing the POST response against an immediate `GET /cart` across four consecutive adds. API-level, no browser, and it passes with rate limiting at its ON default — so unlike the journey suite it needs no limiter overrides. See §7 for what it does and does not prove. 1 test. |

---

## 6. Incidental changes worth flagging

Three changes outside the migration proper, each needed to make verification possible:

- **`eslint.config.mjs`** — added `.next/**` and `node_modules/**` to `ignores`. ESLint was linting
  generated build output and reporting hundreds of errors from bundled code, which made
  `npm run lint` unusable as a gate.
- **`playwright.config.ts`** — `baseURL` changed from `http://127.0.0.1:3000` to
  `http://localhost:3000`. Those are different **origins** to a browser, and the backend's CORS
  allow-list is `http://localhost:3000`, so every API call in the suite failed preflight. The
  resulting console error names CORS rather than the request, so it reads like an auth bug.
- **`next.config.ts`** — allowed `placehold.co` in `images.remotePatterns`. The seeded product and
  banner images point there, so `next/image` threw on every seeded product and the catalogue would
  not render at all.

Playwright's Chromium browser was also installed (`npx playwright install chromium`), as it was
missing.

---

## 7. Known rough edges

- **D7 (stale cart quantity) — diagnosed, fixed, committed, and the guard is validated.**
  `POST /cart/items` returned a stale quantity when it incremented an existing line: the response
  carried the pre-increment value while the database already held the new one.
  Mechanism: `CartService.addItem` runs a native `INSERT ... ON CONFLICT DO UPDATE` and then builds its
  response by re-reading via `getCart()` in the same transaction. A native query bypasses the JPA
  persistence context, so the re-read was served from Hibernate's first-level cache and returned the
  entity as it was before the upsert. The database was always correct; only the immediate response was
  not.
  Fix: `@Modifying(clearAutomatically = true)` on `upsertWithoutVariant` and `upsertWithVariant` in
  `CartItemRepository`, which evicts the persistence context so the re-read hits the database. It had
  been sitting UNCOMMITTED in the backend working tree; committed 2026-08-25 as `a462a9d`
  ("fix(cart): clear persistence context after cart item upserts") on `feat/auth-module`, as an
  isolated one-file commit.
  Guarded by `e2e/cart-increment-regression.spec.ts`, and the guard is **proven** rather than assumed
  — a revert round trip confirmed both directions:
  - annotations reverted to bare `@Modifying` → test FAILS:
    `add #2: POST response quantity (1) disagrees with the authoritative GET (2)`
  - fix restored → test PASSES.
- Nine `loading.tsx` files under the gated vendor/admin/lab routes still render `DataTableSkeleton`,
  so a table skeleton flashes before the "not available" panel. Harmless, and they become correct
  again when those endpoints land.
- `components/dashboard/DataTable.tsx` is currently referenced only by its own test. Kept
  deliberately: it is a generic primitive that the first §T2 endpoint will need.
- Search suggestions (`GET /search/suggestions`) are implemented in the endpoint layer but not wired
  into the header, which still navigates straight to `/search`.
- Product images cannot be added through `POST /vendor/products`, so vendor-created products are
  necessarily imageless until an upload endpoint exists. The form says so.
