# Frontend → Truzov API Migration Plan

Source of truth for every endpoint, DTO, and error code: `TRUZOV_API_REFERENCE.md`.
Nothing in this plan invents an endpoint. Anything the UI needs that the backend does not
expose is listed in [§6 Gaps](#6-gaps--no-backend-endpoint-exists).

**Status:** Phase 1 (planning) approved 2026-08-22. Phase 2 (implementation) complete — all phases
A-F implemented. Public storefront verified live (11/11 Playwright against the real backend);
authenticated flows are code-complete but not yet verified live, because the backend is running in
live OTP mode and cannot deliver a code. See `MIGRATION_SUMMARY.md` §4 for the exact verification
state and the restart command that unblocks it.

---

## 0. What the audit found

The app is a Next.js 16 App Router + TypeScript + Tailwind + Zustand + React Query project.
It currently has **zero** real network calls. Every screen reads from one of three places:

| Source | File | Notes |
|---|---|---|
| Static fixture module | `lib/data/fixtures.ts` (17 KB) | 6 products, 2 reviews, 4 users, 2 addresses, 2 orders, 5 vendors, lab reports, verification submissions, admin metrics, 2 banners |
| MSW mock handlers | `mocks/handlers.ts`, `mocks/browser.ts` | Only active when `NEXT_PUBLIC_MSW_ENABLED=true`; routes do not match the real API (`/user/profile`, `/cart/sync`, `/auth/register`, …) |
| Fake local state | `store/auth.store.ts` (`mockAPI`, `createMockUser`, `loginAs`), `store/cart.store.ts`, `store/address.store.ts` (seeded from fixtures), `store/orders.store.ts`, `store/wishlist.store.ts` | Orders are minted client-side; auth accepts any OTP except `000000` |

`lib/api/client.ts` exists but **is imported by nothing**. `@tanstack/react-query` is installed
and `QueryClientProvider` is wired in `app/providers.tsx`, but there is not a single `useQuery`
in the codebase. React Query is therefore the data-fetching layer to use — it is already a
dependency and already provided, so no new pattern is introduced.

A complete skeleton library already exists in `components/ui/Skeleton.tsx` (16 exports, one per
screen: `HomeScreenSkeleton`, `ProductListingScreenSkeleton`, `ProductDetailScreenSkeleton`,
`CartScreenSkeleton`, `AccountScreenSkeleton`, `OrdersScreenSkeleton`, `OrderDetailScreenSkeleton`,
`AddressesScreenSkeleton`, `LabReportsScreenSkeleton`, `CheckoutScreenSkeleton`,
`DashboardScreenSkeleton`, `DataTableSkeleton`, …). **Loading states reuse these — do not invent new ones.**
There is `components/ui/EmptyState.tsx` but **no error-state component**; one must be added.

---

## 1. Cross-cutting foundation (build in this order, before any screen)

### F1 — Environment configuration
`.env.local` currently holds `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`, which is missing
the `/api/v1` prefix that every application route lives under.

- Change `.env.local` to `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1`.
- Add a committed `.env.example` with the same key and no secret values.
- Add `lib/config/env.ts` that reads the variable once and throws at module load if it is missing,
  so a misconfigured deploy fails loudly instead of silently issuing requests to relative URLs.
- No URL, token, or secret is hardcoded anywhere else. `next.config.ts` `images.remotePatterns`
  already allows `cdn.truzov.com` and `res.cloudinary.com`; the unsplash entry can stay until the
  fixture image URLs are gone.

### F2 — DTO types (`types/api.ts`)
New file mirroring the reference **exactly** (field names, optionality, nullability) so a future
backend change is traceable to the doc. Do not reshape here; adaptation happens at the component
boundary. Types needed:

`ApiEnvelope<T>`, `ApiErrorEnvelope`, `PagedData<T>`, `TokenResponse`, `UserProfileDto`,
`CategoryDto`, `BannerDto`, `HomeDto`, `ProductSummaryDto`, `ProductDetailDto`, `ProductVariantDto`,
`LabMetricDto`, `ReviewDto`, `SearchSuggestionsDto`, `LabReportDto`, `AddressDto`, `CartDto`,
`CartItemDto`, `WishlistItemDto`, `OrderSummaryDto`, `OrderDto`, `OrderItemDto`.

Keep the existing `types/index.ts` view-model types only where a component genuinely needs a
different shape; delete the ones that exist purely to describe fixtures (see §5).

### F3 — Error model (`lib/api/errors.ts`)
`ApiError extends Error` carrying `code`, `status`, `message`, `details?`, `traceId?`, `path?`,
and `retryAfterSeconds?`. Plus a frozen `ERROR_CODES` map for the stable codes the UI branches on:
`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `PHONE_NOT_VERIFIED`, `ACCOUNT_NOT_VERIFIED`,
`ACCOUNT_DISABLED`, `REFRESH_TOKEN_INVALID`, `OTP_INVALID`, `OTP_EXPIRED`,
`OTP_DELIVERY_UNAVAILABLE`, `RATE_LIMITED`, `RESOURCE_NOT_FOUND`, `CONFLICT`,
`SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.

The current client is wrong here: it does `body?.message ?? body?.error`, but the error envelope is
`{ error: { code, message, … } }`, so `body.error` is an object and `new Error(object)` renders as
`"[object Object]"` in the UI. Fixed by parsing the envelope properly.

### F4 — Token storage (`lib/api/token-store.ts`)
Today the access token is persisted in `localStorage['truzov-auth']` by Zustand `persist`, and
`lib/api/client.ts` reaches in and JSON-parses that blob to find it. That coupling is replaced with
one module that owns tokens:

- **Access token: in-memory only** (module-scoped variable). It is short-lived (`expiresIn: 900`),
  and keeping it out of `localStorage` means an XSS payload cannot read it by dumping storage.
- **Refresh token: `localStorage`**, under its own key, because the documented API offers no
  httpOnly-cookie flow and the session must survive a page reload. A deliberate, documented
  tradeoff — it carries a comment saying so and names the upgrade path (backend-set httpOnly
  cookie) if the backend ever adds one.
- On app boot, if a refresh token exists but no access token (normal after reload), call
  `POST /auth/refresh` once to rehydrate, then `GET /auth/me`.
- `store/auth.store.ts` stops persisting `token`. It may persist the `user` profile for instant
  first paint, but must revalidate via `GET /auth/me`.
- Never log token values.

### F5 — API client (`lib/api/client.ts`, rewritten)
One request function; everything else composes on top.

1. Prefix `env.apiBaseUrl`; JSON `Content-Type` on bodies; generate an `X-Request-Id` per request
   (the reference says it is client-suppliable and CORS-exposed) so a frontend report can be
   correlated with a backend `traceId`.
2. Attach `Authorization: Bearer <accessToken>` when the call is marked as authenticated.
3. `204` → resolve `undefined`; do not attempt `response.json()`.
4. `2xx` → unwrap `{ data }`.
5. Non-`2xx` → parse `{ error }` and throw `ApiError`.
6. **`401` → refresh once → retry once.** Guarded by a single module-level in-flight refresh
   promise so N concurrent 401s trigger exactly one `POST /auth/refresh` — otherwise each parallel
   request rotates the refresh token and invalidates the others (the reference states the old token
   is invalidated on rotation). If refresh fails, clear auth state and rethrow. Never retry more
   than once, so a genuinely-expired session cannot loop.
7. **`429`** → read `Retry-After`, attach it as `retryAfterSeconds`, and **do not retry**. React
   Query's retry predicate must also return `false` for it.
8. **`403` with `PHONE_NOT_VERIFIED` / `ACCOUNT_NOT_VERIFIED`** → throw a typed `ApiError`; a single
   subscriber (F8) routes to `/verify-otp`. The reference notes `details` contains
   `{ field: "otpRequired", issue: "true" }`. Routing cannot live inside the fetch function — the
   client has no access to `useRouter`.
9. **`503`** → surface `Retry-After: 5` the same way as 429.
10. Keep the existing 10 s `AbortController` timeout and its "Request timed out" message.

### F6 — Endpoint modules (`lib/api/endpoints/*.ts`)
Thin, typed, one file per reference section — `auth.ts`, `catalog.ts`, `cart.ts`, `wishlist.ts`,
`orders.ts`, `account.ts`, `vendor.ts`, `admin.ts`. Each function names the HTTP call and its DTO,
nothing more. No response reshaping here.

### F7 — Query layer (`lib/api/queries.ts` + `hooks/api/*.ts`)
- Centralised `queryKeys` factory so post-mutation invalidation is not guesswork.
- Configure the existing `QueryClient` in `app/providers.tsx`: `retry` must not retry `4xx`
  (a 404 or validation error will never succeed on retry) and must not retry `429`.
- Query hooks per resource; mutation hooks invalidate `queryKeys.cart`, `queryKeys.wishlist`,
  `queryKeys.orders` as appropriate.

### F8 — Auth-event bridge
A small client component mounted in `app/providers.tsx` subscribing to two events emitted by the
client/token store: "session cleared" (refresh failed) → reset stores and redirect to login; and
"OTP required" → push `/verify-otp`. This is the seam that keeps routing out of the fetch layer.

### F9 — Error UI primitive (`components/ui/ErrorState.tsx`)
Modelled on the existing `EmptyState` (same border/spacing/typography, `lucide-react` icon prop) but
with a `retry` callback instead of an `href`, and an optional error-code line for support. Every
screen that fetches gets: skeleton while loading → `ErrorState` on failure → `EmptyState` when the
response is legitimately empty → content. That three-state contract is the acceptance bar for every
checklist item below.

### F10 — Money handling
`lib/utils/money.ts` keeps `formatCurrency`. **`calculateCartTotals` is deleted** — the server owns
subtotal (`CartDto.subtotal`) and order money (`OrderDto.subtotal`, `deliveryFee`, `totalAmount`),
per the reference's instruction not to compute checkout totals client-side.

One conversion is unavoidable and must be centralised, because the reference documents two units:
product DTO prices are **integer rupees**, but the `/products` `minPrice`/`maxPrice` query
parameters are **paise**. The price-filter UI works in rupees, so the query builder multiplies by
100 at exactly one place, with a comment citing the doc.

---

## 2. Suggested build order

| Phase | Contents | Why here |
|---|---|---|
| **A** | F1–F10 foundation | Nothing else can be wired without it |
| **B** | Public read-only: home, categories, PLP, category, search, PDP, reviews, related, lab reports | No auth needed, so it validates the client, envelope, and error/loading UI in isolation |
| **C** | Auth: signup (+phone), OTP send/verify, password login, `/auth/me` bootstrap, logout, profile update, protected routes | Must be correct before any authenticated screen; catching a wrong refresh flow here is far cheaper than after cart/checkout |
| **D** | Authenticated commerce: cart, wishlist, addresses, checkout, orders list/detail, cancel | Depends on A + C |
| **E** | Vendor product CRUD (`POST/PUT/DELETE /vendor/products`), admin role change (`PUT /admin/users/{id}/role`) — the only vendor/admin endpoints that exist | Smallest real surface; everything else in these areas is a §6 gap |
| **F** | Delete `lib/data/fixtures.ts` + `mocks/`, drop the `mock` npm script, update tests, run build/lint/typecheck/test | Fixtures must survive until their last consumer is migrated |

**Verify against a locally running backend at the end of every phase**, not at the end of the job.
Per-phase check: `npm run typecheck && npm run lint && npm run test`, then exercise the phase's
screens in the browser against `http://localhost:8080`.

---

## 3. Migration checklist — one item per hardcoded-data location

Legend: **Shape** — `=` matches the DTO · `~` needs an adapter · `✗` no backend source (see §6).

### Phase B — public storefront

- [ ] **B1 · Homepage hero + categories + best-sellers**
  `components/screens/CustomerScreens.tsx` → `HomeScreen` (uses `banners[0]`, `categories`, `products.filter(isFeatured)`), `app/(shop)/page.tsx`
  → **`GET /home`** (single call returns `banners`, `categories`, `bestSellers`, `newArrivals`, `featured`). Public.
  Shape `~`: `BannerDto.placement` is a free string (`"hero"`), not the current `'homepage' | 'category'` union — select the hero by `placement === 'hero'` with a fallback to the first active banner instead of indexing `[0]` blindly. `CategoryDto` (`slug`, `name`, `image`) matches current usage `=`. Product cards move to `ProductSummaryDto` (B4).
  States: currently none → `HomeScreenSkeleton` + `ErrorState`.
  Note: `app/(shop)/page.tsx` has `revalidate = 60`; `HomeScreen` becomes a client component fetching via React Query, so that constant becomes meaningless and should be removed rather than left implying ISR.

- [ ] **B2 · Category list in the filter sidebar**
  `CustomerScreens.tsx` → `FilterPanel` (`categories` fixture)
  → **`GET /categories`**. Public. Shape `=`.
  States: skeleton rows in the sidebar; on error hide the category block rather than blocking the whole PLP.

- [ ] **B3 · Product listing / category / search results**
  `CustomerScreens.tsx` → `ProductListingScreen` + `SearchScreen`, `lib/utils/filters.ts` → `filterProducts`, pages `app/(shop)/products/page.tsx`, `app/(shop)/category/[slug]/page.tsx`, `app/(shop)/search/page.tsx`
  → **`GET /products`** with `category`, `brand`, `sort`, `minPrice`, `maxPrice`, `tags`, `inStock`, `labVerified`, `q`, `page`, `limit`; **`GET /search?q=`** when a query is present (same filter/sort/pagination contract; returns `422 INVALID_REQUEST` if `q` is missing).
  Shape `~`: response is `PagedData<ProductSummaryDto>`, so `Showing {n} products` must read `data.total`, not `items.length`. **`filterProducts` is deleted** — filtering and sorting move server-side. `parseFilters` is kept and repurposed as URL-params → query-params, adding the rupee→paise conversion (F10) and clamping `limit` to 1–100 and `page` to 1–1000 so the UI cannot generate a `VALIDATION_ERROR`.
  States: `ProductListingScreenSkeleton`; `ErrorState` with retry; existing `EmptyState` for `total === 0`.
  Also: there is no pagination UI today. The API pages at `limit: 24`, so the listing needs a pager or "Load more", otherwise the catalogue silently truncates.

- [ ] **B4 · Product card**
  `components/product/ProductCard.tsx`, `components/product/ProductGrid.tsx`
  → consumes `ProductSummaryDto` (`id`, `slug`, `name`, `brand`, `categorySlug`, `price`, `mrp`, `discount`, `rating`, `reviewCount`, `inStock`, `isLabVerified`, `isBestseller`, `isOrganic`, `isFeatured`, `isNewArrival`, `tags`, `images`).
  Shape `~`: the card reads `product.images[0].alt` / `.url`; the reference lists `images` without specifying element shape, so the adapter tolerates both `string[]` and `{url, alt}[]` and falls back to `name` for alt text — accessibility must not depend on an optional field. `product.category` → `categorySlug`. The `featured` variant renders `product.benefits[0]`, and `benefits` exists **only on `ProductDetailDto`** — that line is dropped, not faked.
  `ProductGrid` already accepts `loading` and renders `ProductCardSkeleton`; that path finally gets used.

- [ ] **B5 · Product detail page**
  `CustomerScreens.tsx` → `ProductDetailScreen`, `app/(shop)/products/[slug]/page.tsx` (`findProduct` in both the page and `generateMetadata`)
  → **`GET /products/{slugOrId}`** → `ProductDetailDto`.
  Shape `~`, and this screen holds the most fixture-specific rot in the codebase, all of which goes:
  - `displayName` / `compareAtPrice` branch on `product.id === 'prd-001'` → use `name` and `mrp`.
  - Certifications hardcoded to `'FSSAI, ISO 22000'` for `prd-001` → use `certifications`.
  - The gallery appends three hardcoded Unsplash honeycomb/lab/packaging images to **every** product → use `images` only.
  - Breadcrumb hardcodes `Health & Superfoods` → derive from `categorySlug` (display name from `GET /categories`).
  - The "Verification Summary" table is a hardcoded array `[['Heavy Metals','ND'], …]` with a hardcoded "Passed" pill → use `labMetrics` (`label`/`value`/`status`) and `verificationStatus`.
  - "In stock. Ready to ship." is unconditional → drive from `inStock`/`stockCount`.
  - "Delivery by Thu, Oct 24" and "4.9/5 Rating • 2k+ Sales" are invented → §6.
  - `product.batchId`, `product.sellerName`, `product.labReportId` are `✗` → §6.
  - Quantity `+` clamps to `stockCount`, which is on the detail DTO, so it survives.
  - `generateMetadata` fetches server-side through the same endpoint module and returns `Product Not Found` on `RESOURCE_NOT_FOUND`; the page renders Next's `notFound()` instead of the current silent `?? products[0]` fallback, which shows the wrong product.
  States: `ProductDetailScreenSkeleton`, `ErrorState`, 404 → `notFound()`.

- [ ] **B6 · Product reviews tab**
  `ProductDetailScreen` (`reviews` fixture, 2 items)
  → **`GET /products/{slugOrId}/reviews?page=1&limit=24`** → `PagedData<ReviewDto>`.
  Shape `~`: `ReviewDto` is `id`, `userName`, `rating`, `title`, `body`, `verified`, `createdAt` — no `userId`, so drop it from the view type. Only approved reviews are returned; no client-side filtering.
  States: inline skeleton in the tab, `ErrorState`, empty → "No reviews yet".

- [ ] **B7 · "Similar Verified Products" on the PDP**
  `ProductDetailScreen` → `similar` array (2 hardcoded objects — Organic Cinnamon, Premium Saffron — with literal prices and rating strings)
  → **`GET /products/{slugOrId}/related?limit=8`** → `ProductSummaryDto[]`.
  Shape `~`: delete the bespoke card markup and reuse `ProductCard`/`ProductGrid`, so there is one product-card implementation instead of two.
  States: skeleton grid; on error or empty, hide the section — a missing recommendation strip is not worth an error banner.

- [ ] **B8 · Public lab reports page**
  `CustomerScreens.tsx` → `LabReportsScreen` (`labReports` fixture joined to `products` for the title), `app/(shop)/trust/lab-reports/page.tsx`
  → **`GET /lab-reports?page=1&limit=20`** → paged reports (`id`, `productId`, `batchId`, `labName`, `status`, `summary`, `metrics`, `pdfUrl`, `uploadedAt`).
  Shape `~`: the report DTO carries `productId` but no product name, and the current code does `products.find(...) as Product` — an unchecked cast that throws on unmatched data. Resolve names with **`POST /products/batch`** (`{ ids: [...] }`, max 100) from the page's `productId`s, and render the batch ID alone when a product is missing.
  `pdfUrl` is optional → only render the download link when present.
  States: `LabReportsScreenSkeleton`, `ErrorState`, `EmptyState`.

- [ ] **B9 · Header search box**
  `components/layout/Header.tsx` — pushes `/search?q=` with no suggestions.
  → optional **`GET /search/suggestions?q=&limit=8`** (`products`, `categories`, `brands`). Debounce ≥250 ms and let a 429 disable suggestions temporarily rather than retrying — a per-keystroke endpoint is the most likely place to hit the rate limiter. Not a hardcoded-data fix; listed so it is a decision rather than an omission.

### Phase C — authentication

- [ ] **C1 · Signup**
  `store/auth.store.ts` → `mockAPI.signup` + `createMockUser`; `components/auth/SignupForm.tsx`; `lib/validations/auth.ts` → `signupSchema`
  → **`POST /auth/signup`** → `{ userId, otpSessionId, otpRequired, otpChannel, expiresInSeconds }`, `201`.
  Shape `~`, and this is a **functional bug fix, not just a swap**: the mock sets `isLoggedIn: true` immediately and never verifies an OTP. The real flow returns an OTP session and no tokens, so signup transitions to the OTP step and only logs in after `POST /auth/otp/verify`.
  Contract mismatches to fix:
  - `phone` is **required** by the API (10 digits or E.164) and the form has no phone field → add it.
  - `email` is **optional** in the API but required by `signupSchema` → make it optional, required only when `otpChannel === 'email'` ("Email channel requires an email").
  - Password rule: API is 8–128 with at least one letter and one digit; `signupSchema` demands an uppercase letter and no digit. Align to the API contract and keep the existing strength meter as advisory UI, so the client never rejects a password the server would accept.
  - Add `otpChannel` (`'phone' | 'email'`, default `'phone'`).
  States: existing inline spinner and error box are reused; field errors come from `ApiError.details[].field`/`.issue` (`VALIDATION_ERROR`).

- [ ] **C2 · OTP send / resend**
  `store/auth.store.ts` → `mockAPI.sendOTP`; `components/auth/LoginForm.tsx`; `components/auth/OTPVerification.tsx` (resend)
  → **`POST /auth/otp/send`** `{ identifier, purpose: 'login' | 'verify' }` → `{ otpSessionId, channel, expiresInSeconds }`.
  Shape `~`: store `otpSessionId`, `channel`, `expiresInSeconds` (drive the existing resend cooldown from `expiresInSeconds` instead of a hardcoded 30). The endpoint deliberately returns success for unknown identifiers to prevent enumeration — **the UI must not claim the account exists**; keep the message neutral. The OTP code is never returned; nothing may display it.
  Handle `OTP_DELIVERY_UNAVAILABLE` (503) with a retry that respects `Retry-After`.
  Current copy is email-specific ("code sent to your email", label "Email") while the default channel is phone → drive wording off `channel`.

- [ ] **C3 · OTP verify**
  `store/auth.store.ts` → `mockAPI.verifyOTP` (accepts any code except `000000`); `components/auth/OTPVerification.tsx`; `components/auth/AuthForm.tsx` (a second, duplicate OTP step)
  → **`POST /auth/otp/verify`** `{ otpSessionId, code }` → `TokenResponse`.
  Shape `~`: persist tokens via F4, set `user` from `TokenResponse.user`. Distinguish the two documented failures — `400 OTP_INVALID` ("wrong code, try again", keep the session) vs `410 OTP_EXPIRED` ("session expired, request a new code", clear `otpSessionId` and force a resend). Current code treats every failure identically.
  The API accepts 4–10 digits; both UIs hardcode six boxes. Keep six (the observed length) but do not block on a magic constant beyond that.
  Cleanup: `AuthForm` and `OTPVerification` implement the same OTP step twice — consolidate on `OTPVerification` so there is one verify path to audit.

- [ ] **C4 · Password login**
  `components/screens/AuthScreens.tsx` → `AuthScreen` (submits, then calls `loginAs(role)` with no credential check); pages `app/(auth)/login`, `app/(auth)/register`, `app/vendor/login`, `app/vendor/register`, `app/admin/login`, `app/lab/login`
  → **`POST /auth/login`** `{ identifier, password }` → `TokenResponse`.
  Shape `~`: role comes from `TokenResponse.user.role` — the client never chooses its own role. `loginAs(role)` is deleted (§6.5). `401` → "Invalid credentials"; `403 ACCOUNT_DISABLED` → distinct message; `403 PHONE_NOT_VERIFIED`/`ACCOUNT_NOT_VERIFIED` → route to `/verify-otp` via F8.
  After login, redirect by real role rather than by whichever role-flavoured URL the user visited.

- [ ] **C5 · Session bootstrap + current user**
  `store/auth.store.ts` (`user` persisted in `localStorage`, never verified); `components/auth/AccountMenu.tsx`; `components/account/AccountShell.tsx`; `hooks/useProtectedRoute.ts`
  → **`GET /auth/me`** (alias `GET /users/me`) → `UserProfileDto`.
  Shape `~`: `UserProfileDto` is `{ id, name, email, role, phone, avatarUrl, emailVerified, phoneVerified, createdAt }`. Local `UserProfile` adds `gender`, `dateOfBirth`, `location` → `✗` §6. `avatarUrl` is nullable — handle `null`, not just `undefined`.
  `useProtectedRoute` currently redirects whenever `isLoggedIn` is false, and `isLoading` starts `false`, so a hard refresh can bounce a logged-in user to `/login` before rehydration finishes. It must wait for the F4 bootstrap (refresh + `/auth/me`) to settle — a real bug that only becomes visible with real tokens.

- [ ] **C6 · Logout**
  `store/auth.store.ts` → `logout()` (local state only); `AccountMenu`, `DashboardShell`
  → **`POST /auth/logout`** (Bearer, optional body `{ refreshToken, allSessions }`) → `204`.
  Shape `=`. Send the current refresh token so the server session is actually revoked; clear local state even if the call fails, so a network error cannot trap the user in a logged-in shell. Optionally expose "log out of all devices" via `allSessions: true`.

- [ ] **C7 · Profile edit**
  `store/auth.store.ts` → `updateProfile` (local mutation); `CustomerScreens.tsx` → `AccountScreen`
  → **`PATCH /users/me`** `{ name?, email?, phone?, avatarUrl? }` → updated `UserProfileDto`.
  Shape `~`: only those four fields are accepted. The form's `gender`, `dateOfBirth`, `location` inputs have no backend field → §6; remove them rather than leaving inputs that silently discard user input.
  The reference notes changing email or phone clears that channel's verification — surface that consequence and handle the follow-up `PHONE_NOT_VERIFIED` on the next protected call.
  States: saving spinner on Save, field errors from `details`, `409 CONFLICT` for duplicate email/phone.

- [ ] **C8 · Password change**
  `CustomerScreens.tsx` → `SettingsScreen` — currently static rows plus the note "ready for password, notification, and privacy controls when those settings are backed by API endpoints".
  → **`POST /users/me/password`** `{ currentPassword, newPassword }` → `204`.
  The endpoint exists, so this is a missing **UI**, not a backend gap. It revokes all refresh tokens, so on success the app clears auth and returns the user to login. Also replace the hardcoded rows: `Login email` / `Mobile number` come from `GET /auth/me` (and can show `emailVerified` / `phoneVerified`); `Email notifications` and `Language` are `✗` §6.

### Phase D — authenticated commerce

- [ ] **D1 · Cart**
  `store/cart.store.ts` (entire file — local `CartItem[]`, `persist`, quantity clamped against `product.stockCount`), `components/checkout/BagItemRow.tsx`, `components/commerce/CartItemRow.tsx`, `components/checkout/CheckoutScreens.tsx` → `BagScreen`, `components/layout/Header.tsx` (badge count)
  → **`GET /cart`**, **`POST /cart/items`** `{ productId, variantId, quantity }` (`201`), **`PATCH /cart/items/{itemId}`** `{ quantity }`, **`DELETE /cart/items/{itemId}`**, **`DELETE /cart`** (`204`). All Bearer.
  Shape `~` — the largest single adaptation in this migration:
  - `CartDto` is `{ items, itemCount, subtotal }`; `CartItemDto` is `{ id, productId, variantId, name, slug, imageUrl, unitPrice, quantity, lineTotal, inStock, availableStock }`. The local model is `{ product: Product, variantId, quantity, unitPrice }` — it embeds a whole product.
  - Every mutation is keyed by **`itemId`**, but the store and both row components key everything by `productId`. `removeItem(productId)`, `updateQty(productId, …)`, `toggleItemSelection(productId)` all change signature.
  - `BagItemRow` reads `product.sellerName`, `batchId`, `stockCount`, `mrp`, `discount`, `weight`, `isLabVerified` — **none are on `CartItemDto`**. Rebuild the row against the DTO: `lineTotal` for line price, `availableStock` for the "N left" pill, and drop MRP/discount/seller/batch/COA badges from the cart row (they stay on the PDP, which has the detail DTO). Do not backfill with a per-item `GET /products/{id}` — that is an N+1 on the hottest screen.
  - `itemCount` comes from the server; the header badge stops summing quantities locally.
  - Server caps line quantity and checks stock, so client clamping is removed; a rejected quantity surfaces the server's message.
  - Cart is **server-side and per-user**. Guests have no cart. Adding to cart while logged out opens the existing auth modal (`useAuthModalStore`) instead of writing to `localStorage`. Visible behaviour change — see §8.
  - Drop `persist`; React Query cache plus server state replaces it.
  States: `CartScreenSkeleton`, `ErrorState`, existing `EmptyState`; optimistic quantity update with rollback on failure.

- [ ] **D2 · Cart item selection (checkboxes / Select All)**
  `store/cart.store.ts` → `selectedItems`, `toggleItemSelection`, `selectAll`, `deselectAll`; `BagScreen`; `BagItemRow`; `CheckoutPriceDetails`; `AddressScreen` → `DeliveryEstimateList`
  → **no endpoint.** `POST /checkout` places an order from the *entire* server-side cart; there is no partial-checkout parameter. Keeping selection would make the price panel and the actual charge disagree — exactly what the reference warns about. §6.

- [ ] **D3 · Price details panel**
  `components/checkout/CheckoutPriceDetails.tsx` (`calculateCartTotals`, `mrpTotal` summed from `product.mrp`, derived `productDiscount`, "Platform Fee" mapped from `shipping`)
  → **`GET /cart`** for `subtotal` pre-checkout, and `OrderDto` (`subtotal`, `deliveryFee`, `totalAmount`) once an order exists.
  Shape `~`: every displayed money value comes from the server. `CartDto` exposes only `subtotal`, so pre-checkout the panel honestly shows subtotal and item count — **not** a total, a discount, or a fee, none of which the cart endpoint returns. `deliveryFee` and `totalAmount` are known only after `POST /checkout`. "Total MRP" / "Discount on MRP" have no server source and are removed rather than recomputed.
  `FREE_SHIPPING_THRESHOLD` / `STANDARD_SHIPPING` in `lib/utils/money.ts` are client-side pricing policy → delete.

- [ ] **D4 · Coupons**
  `store/cart.store.ts` → `applyCoupon` with hardcoded `['TRUZOV10','WELCOME20','FIRST50']`; `CheckoutPriceDetails` coupon form; "10% off with TRUZOV10" copy in `BagScreen`; "7.5% assured cashback" in `PaymentScreen`
  → **no endpoint.** §6. Remove the coupon form and offer copy — a client-side discount would misstate the price the user is charged.

- [ ] **D5 · Wishlist**
  `store/wishlist.store.ts` (`ids: string[]`, `toggle`), `CustomerScreens.tsx` → `WishlistScreen` (filters the `products` fixture by id), `ProductCard` heart, `ProductDetailScreen` heart, `BagItemRow` "Move to Wishlist"
  → **`GET /wishlist`** → `WishlistItemDto[]`; **`POST /wishlist/items`** `{ productId }` (`201`, idempotent); **`DELETE /wishlist/items/{itemId}`** (`204`); **`POST /wishlist/items/{itemId}/move-to-cart`** → `CartDto`. All Bearer.
  Shape `~`: removal needs **`itemId`**, but a product card only knows `productId`. Keep a `productId → itemId` lookup derived from `GET /wishlist` in the query cache; the heart resolves the item id before deleting. Wishlist now requires login — the heart opens the auth modal for guests.
  "Move to Wishlist" in the cart row becomes `POST /wishlist/items` + `DELETE /cart/items/{itemId}`; the reverse uses the dedicated `move-to-cart` endpoint.
  States: `ProductGridSkeleton`, `ErrorState`, existing `EmptyState`.

- [ ] **D6 · Addresses**
  `store/address.store.ts` (seeded with `fixtureAddresses` — the clearest case of mock data leaking into shipped state), `CustomerScreens.tsx` → `AddressesScreen`, `components/checkout/AddressForm.tsx`, `AddressFormModal`, `CheckoutScreens.tsx` → `AddressScreen`/`AddressCard`, `lib/validations/checkout.ts`
  → **`GET /users/me/addresses`** → `AddressDto[]`; **`POST /users/me/addresses`** → `201` + `AddressDto`.
  Shape `~`:
  - Renames: `addressLine1` → **`line1`**, `addressLine2` → **`line2`**. `AddressDto` adds `label`; the UI hardcodes a `Home` pill on every card → drive it from `label`.
  - Server requires only `line1`; `pincode` must be six digits when supplied. The local `addressSchema` requires name/phone/city/state/pincode and `line1` ≥ 10 chars. Stricter client rules are fine for delivery quality but must not be presented as server errors.
  - `phone` regex `^[6-9]\d{9}$` is narrower than the API's "10 digits or E.164" → loosen to accept E.164 so valid international numbers are not blocked.
  - `saveAsDefault` in the schema vs `isDefault` in the DTO → unify on `isDefault`.
  - **Edit, delete, and set-default have no endpoints** → §6. The Edit/Remove/Set-as-Default buttons in `AddressesScreen` and `AddressCard` must be removed or disabled with an explanation; leaving them on local state would show a change that vanishes on reload.
  States: `AddressesScreenSkeleton`, `ErrorState`, `EmptyState` ("Add your first address").

- [ ] **D7 · Checkout / place order**
  `CheckoutScreens.tsx` → `PaymentScreen.payNow` (mints `{ id: 'TRZ-' + Date.now(), … }` locally, pushes it into `store/orders.store.ts`, then `setTimeout(700)` before redirecting), `store/checkout.store.ts`
  → **`POST /checkout`** `{ addressId }` → `201` + `OrderDto`. Bearer.
  Shape `~`: order id, number, status, and all money come from the response. `store/orders.store.ts` is deleted — orders are server state.
  Preconditions the reference states explicitly: verified phone and a saved address. So `403 PHONE_NOT_VERIFIED` routes to `/verify-otp` and returns the user to checkout afterwards, and a missing address blocks the CTA (the screen already has a "Select an address first" guard to reuse).
  Handle `409 CONFLICT` (stock changed / invalid state) by refetching the cart and showing what changed. Disable the CTA while in flight so a double-click cannot create two orders.
  `store/checkout.store.ts` keeps only `selectedAddressId` (a genuine client-side UI choice); `paymentMethod` → §6.

- [ ] **D8 · Payment method selection**
  `CheckoutScreens.tsx` → `paymentMethods` array (UPI/Card/COD/Wallet), `PaymentDetails` (card number, expiry, CVV, UPI ID, wallet number inputs), `store/checkout.store.ts` → `paymentMethod`, and the "Simulate payment failure" button
  → **no endpoint.** The only payment surface in the reference is `POST /payments/webhook`, which is gateway→server with HMAC and explicitly not a client call. §6.
  Security note: those card/CVV inputs post nowhere today, and they must never post to this API. Remove them; a real integration goes through a gateway SDK, not our own fields. `OrderDto.paymentStatus` is the honest thing to display after `POST /checkout`. Delete the "Simulate payment failure" button — a test affordance, not production UI.

- [ ] **D9 · Order confirmation**
  `CheckoutScreens.tsx` → `ConfirmationScreen` (reads `orders[0]` from the local store, renders `latestOrder.address`)
  → `OrderDto` returned by `POST /checkout`, or **`GET /orders/{orderId}`** on reload.
  Shape `~`: **`OrderDto` has no `address`**, so the delivery block cannot come from the order. Either keep the just-used address in checkout UI state for this screen, or resolve `selectedAddressId` against `GET /users/me/addresses`. Display `orderNumber` (use `id` for links). Money from `subtotal`/`deliveryFee`/`totalAmount`.
  The `useEffect` that clears the cart client-side goes away: `POST /checkout` consumes the server cart, so the fix is invalidating the cart query.

- [ ] **D10 · Orders list**
  `CustomerScreens.tsx` → `OrdersScreen` (`storeOrders.length > 0 ? storeOrders : orders` — falls back to fixtures when empty, so a new user sees someone else's orders), `app/(account)/account/orders/page.tsx`
  → **`GET /orders?page=1&limit=20`** → `PagedData<OrderSummaryDto>` (`id`, `orderNumber`, `status`, `paymentStatus`, `totalAmount`, `itemCount`, `createdAt`; `limit` 1–50).
  Shape `~`: the row renders `order.items.map(i => i.product.name)`, but the summary DTO has only `itemCount` → show "N items" and defer names to the detail page. Show `paymentStatus` alongside `status`. Remove the fixture fallback.
  States: `OrdersScreenSkeleton`, `ErrorState`, `EmptyState`.

- [ ] **D11 · Order detail**
  `CustomerScreens.tsx` → `OrderDetailScreen` (`findOrder(id)`, which **falls back to `orders[0]`**, so an unknown id silently renders the wrong order), `app/(account)/account/orders/[id]/page.tsx`
  → **`GET /orders/{orderId}`** → `OrderDto`.
  Shape `~`: order items are `OrderItemDto`, not `CartItem`, so `CartItemRow` cannot be reused — it reads `item.product.*` and wires quantity/remove buttons into the cart store, which is meaningless on a placed order. Needs a read-only line-item row.
  `order.address` `✗` (see D9). The timeline is hardcoded `['Confirmed','Processing','Shipped','Delivered']`; the real state machine is `pending → confirmed → packed → shipped → delivered` (plus `cancelled`, `returned`) → drive from `status`. "Download Invoice" `✗` §6.
  Add **`PATCH /orders/{orderId}/status`** `{ status: 'cancelled', reason }` as a Cancel action — customers may cancel their own order before fulfilment; hide it once `status` is past that point, and handle `409` for an invalid transition.
  States: `OrderDetailScreenSkeleton`, `ErrorState`, 404 → `notFound()`.

- [ ] **D12 · `OrderStatus` type alignment**
  `types/index.ts` → `OrderStatus` is `pending | confirmed | processing | shipped | delivered | cancelled | refunded`.
  → API allows `pending | confirmed | packed | shipped | delivered | cancelled | returned`. `processing`/`refunded` do not exist; `packed`/`returned` are missing. Replace the union with the API's and add `paymentStatus`.

### Phase E — vendor / admin (only what exists)

- [ ] **E1 · Vendor product create/edit/delete**
  `WorkspaceScreens.tsx` → `VendorProductWizardScreen` (a static form: placeholder-only inputs, no state, no submit handler), `app/vendor/products/new/page.tsx`, `lib/validations/vendor.ts`
  → **`POST /vendor/products`** (`201` + `ProductDetailDto`), **`PUT /vendor/products/{productId}`**, **`DELETE /vendor/products/{productId}`** (`204`). VENDOR role.
  Shape `~`: body is `{ name, slug, categorySlug, brand, price, mrp, stockCount, weight, description, tags, benefits, ingredients, certifications, isPublished }`. Required: `name`, `categorySlug`, `brand`. Constraints: `price`/`mrp`/`stockCount` ≥ 0 and **`mrp >= price`** — validate client-side too; it is the most likely `VALIDATION_ERROR`. **No `vendorId` is accepted** (server derives it from the token), so nothing may send one. The wizard's `SKU` and `Compliance certificate` fields have no DTO field → §6. `categorySlug` becomes a select populated from `GET /categories`, not free text.

- [ ] **E2 · Admin role change**
  `WorkspaceScreens.tsx` → `AdminRolesScreen` (three hardcoded rows: Ops Manager / Verification Lead / Content Editor), `app/admin/roles/page.tsx`
  → **`PUT /admin/users/{id}/role`** `{ role, reason? }` → `UserProfileDto`. ADMIN role. Roles: `customer | vendor | lab | admin`.
  Shape `~`: there is **no user-list endpoint**, so the table cannot be populated — §6. What can be built is a role-change action for a known user id. Handle the documented guard that the last active administrator cannot be demoted (`409`/`FORBIDDEN`) with a clear message.

### Phase F — cleanup

- [ ] **F-a** Delete `lib/data/fixtures.ts`; verify no imports remain (`categories`, `products`, `reviews`, `users`, `addresses`, `orders`, `vendors`, `labReports`, `verificationSubmissions`, `adminMetrics`, `banners`, `findProduct`, `findOrder`, `productsForCategory`).
- [ ] **F-b** Delete `mocks/handlers.ts` and `mocks/browser.ts`, remove `MockServiceWorker` from `app/providers.tsx`, drop the `mock` script from `package.json`, remove `msw` from dependencies. Its routes never matched the real API, so keeping it as a "backup backend" would only mislead.
- [ ] **F-c** Delete `filterProducts` from `lib/utils/filters.ts`, and `calculateCartTotals` / `FREE_SHIPPING_THRESHOLD` / `STANDARD_SHIPPING` from `lib/utils/money.ts`.
- [ ] **F-d** Prune fixture-only types from `types/index.ts`: `Vendor`, `VendorDocument`, `VerificationSubmission`, `AdminMetric`, `ContentBanner` (superseded by `BannerDto`), plus the fixture-shaped `Product`/`Order`/`CartItem`/`Address`/`UserProfile`. Keep `lib/utils/verification.ts` only if the verification kanban survives §6.
- [ ] **F-e** Remove the unsplash `remotePatterns` entry from `next.config.ts` once no fixture image URLs remain.
- [ ] **F-f** Update the tests in §4.

---

## 4. Tests that will need updating

| File | Why it breaks |
|---|---|
| `tests/utils.test.ts` | Imports `products` from fixtures; asserts `calculateCartTotals(...)` → `{subtotal: 998, discount: 100, shipping: 0, total: 898}` and `filterProducts`. Both functions are deleted. Rewrite around `parseFilters` → query-param mapping (including rupee→paise) and `formatCurrency`/`calculateDiscount`. |
| `tests/checkout.test.tsx` | Imports `addresses as fixtureAddresses` and `products`; seeds `useCartStore.setState({ items: [{ product, quantity, unitPrice }] })` and `useAddressStore.setState({ addresses: fixtureAddresses })`. Both store shapes change (D1, D6). Needs local DTO factories plus a mocked API client (MSW as a *test-only* dependency is reasonable even though the browser worker is removed). Also asserts `price details (1 item)` and delivery-estimate counts tied to per-item selection (D2). |
| `tests/payment-flow.test.ts` (Playwright) | Asserts the client-side order flow: clicks `Pay Rs…`, expects `truzov-cart` in `localStorage` to go from non-empty to empty. After D1/D7/D8 there is no `truzov-cart` key, no `Pay Rs` button, and order creation is a server call. Rewrite against a seeded backend or delete. |
| `e2e/critical-paths.spec.ts` | Expects the fixture product "Pure Wildflower Honey" on the homepage and an admin verification board that has no backend (§6.3). Needs backend seed data; the admin assertion should be dropped. |
| `tests/components.test.tsx` | Should pass unchanged — only `Button`, `Badge`, `DataTable` with inline rows. Verify, don't assume. |

New tests worth adding (small, targeted, existing Vitest setup): the 401 → refresh → retry-once path
including the single-flight guard; 429 producing `retryAfterSeconds` with no retry; 403
`PHONE_NOT_VERIFIED` emitting the OTP-required event; `{ error }` envelope → `ApiError` mapping;
`204` → `undefined`.

---

## 5. Files created / rewritten / deleted

**New:** `lib/config/env.ts`, `types/api.ts`, `lib/api/errors.ts`, `lib/api/token-store.ts`,
`lib/api/endpoints/*.ts`, `lib/api/queries.ts`, `hooks/api/*.ts`, `components/ui/ErrorState.tsx`,
`.env.example`.

**Rewritten:** `lib/api/client.ts`, `store/auth.store.ts`, `store/cart.store.ts` (thin UI state or
removed), `components/screens/CustomerScreens.tsx`, `components/checkout/CheckoutScreens.tsx`,
`components/checkout/BagItemRow.tsx`, `components/commerce/CartItemRow.tsx`,
`components/checkout/CheckoutPriceDetails.tsx`, `components/checkout/AddressForm.tsx`,
`components/product/ProductCard.tsx`, `components/auth/*`, `hooks/useProtectedRoute.ts`,
`app/providers.tsx`, `types/index.ts`, `lib/validations/*`.

**Deleted:** `lib/data/fixtures.ts`, `mocks/handlers.ts`, `mocks/browser.ts`,
`store/address.store.ts`, `store/orders.store.ts`, `store/wishlist.store.ts`,
`components/screens/AuthScreens.tsx` (fake role login).

---

## 6. Gaps — no backend endpoint exists

Called out explicitly so none is silently skipped or silently mocked forever. Each needs a decision:
**remove the UI**, **disable it with a note**, or **keep it and open a backend ticket**.

### 6.1 Customer-facing

| UI | Where | Situation |
|---|---|---|
| Coupons / promo codes | `cart.store.applyCoupon`, `CheckoutPriceDetails` coupon form, "TRUZOV10" copy in `BagScreen`, "7.5% cashback" in `PaymentScreen` | No coupon endpoint; `CartDto` has no discount field. **Remove** — a client-side discount misstates the charge. |
| Payment methods, card/UPI/wallet inputs | `CheckoutScreens.paymentMethods`, `PaymentDetails`, `checkout.store.paymentMethod` | Only a gateway HMAC webhook exists. **Remove**; display `OrderDto.paymentStatus`. |
| Per-item cart selection | `cart.store.selectedItems`, Select All, `DeliveryEstimateList` | `POST /checkout` uses the whole cart. **Remove**, or repurpose as a wishlist move. |
| Address edit / delete / set-default | `AddressesScreen`, `AddressCard`, `AddressForm` update path | Only `GET` and `POST` exist. **Disable with a note**; ticket `PATCH`/`DELETE /users/me/addresses/{id}`. |
| Delivery estimates ("Estimated delivery by 8 Jun 2026") | `DeliveryEstimateList` | Hardcoded dates, no endpoint. **Remove.** |
| "Delivery by Thu, Oct 24" / "Free delivery over ₹999" | `ProductDetailScreen` | Hardcoded, no endpoint. **Remove.** |
| Order address on order detail / confirmation | `OrderDetailScreen`, `ConfirmationScreen` | `OrderDto` has no `address`. Workaround in D9; ideally the backend adds a shipping-address snapshot. |
| Order timeline / tracking URL / `deliveredAt` / `paymentMethod` | `OrderDetailScreen`, `types/index.ts` `Order` | Not on `OrderDto`. Derive the timeline from `status`; **remove** tracking and payment method. |
| Download invoice | `OrderDetailScreen` | No endpoint. **Remove** or disable. |
| Download full lab report PDF | `ProductDetailScreen` | `LabReportDto.pdfUrl` exists on `/lab-reports`, but `ProductDetailDto` exposes `labMetrics` with no report id or PDF URL. Link out via `/lab-reports`, or ticket "add `labReportId`/`pdfUrl` to `ProductDetailDto`". |
| Product `batchId`, `vendorId`, `sellerName`, `reportAvailable`, `labReportId` | `types/index.ts`, `ProductDetailScreen`, `BagItemRow`, `CartItemRow` | None are in any product DTO. **Remove** the "Sold by", "Batch #", and COA affordances, or ticket them. |
| Seller rating "4.9/5 • 2k+ Sales" | `ProductDetailScreen` | Invented; no vendor-profile endpoint. **Remove.** |
| Profile `gender`, `dateOfBirth`, `location` | `AccountScreen` form, `UserProfile` | `PATCH /users/me` accepts only `name`, `email`, `phone`, `avatarUrl`. **Remove the inputs** — they currently discard user input silently. |
| Notification / language preferences | `SettingsScreen` | No endpoint. **Remove** or mark "coming soon". |
| Review submission | — | Reviews are read-only (`GET …/reviews`); no POST. No write UI exists today; noted so it is not assumed. |
| Guest cart | `cart.store` with `persist` | Cart is Bearer-only. Guests must log in to add items — **confirm this behaviour change** (§8). |

### 6.2 Vendor workspace — almost entirely unbacked

Only `POST/PUT/DELETE /vendor/products` exist. **No endpoint** for: `VendorDashboardScreen` stat
cards (18 products / 7 verification / 24 orders / ₹1.8L payout — all literals), `ChartPanel`
`salesData` (Jan–May literals), `VendorProductsScreen` and `VendorInventoryScreen` lists (there is no
vendor-scoped product **GET**), `VendorOrdersScreen`, `app/vendor/orders/[id]`,
`VendorPayoutsScreen`, `VendorAnalyticsScreen`, `VendorVerificationScreen`, `app/vendor/onboarding`,
`app/vendor/register`, `app/vendor/products/[id]`.
Recommendation: keep only product create/edit/delete in Phase E and gate the rest behind a
"not yet available" state, so the workspace stops presenting invented numbers as data.

### 6.3 Admin workspace — almost entirely unbacked

Only `PUT /admin/users/{id}/role` exists. **No endpoint** for: `adminMetrics` (GMV ₹18.4L etc.), the
hardcoded action queue, `AdminVendorsScreen` + `app/admin/vendors/[id]` (no vendor entity exists in
the API at all), `AdminProductsScreen`, `AdminOrdersScreen` + `app/admin/orders/[id]` (`GET /orders`
is user-scoped — note that `PATCH /orders/{orderId}/status` *does* support admin transitions, so an
admin can act on a known order id but cannot list orders), `AdminVerificationScreen` /
`VerificationKanban`, `AdminContentScreen` (banners are read-only via `GET /banners`),
`AdminConfigScreen`, and the user list needed to make `AdminRolesScreen` usable.

### 6.4 Lab workspace — entirely unbacked

`GET /lab-reports` is public, passed-reports-only, and read-only. **No endpoint** for:
`LabDashboardScreen` stats, `LabRequestsScreen` + `app/lab/requests/[id]`, `LabUploadScreen` (no
report-upload endpoint), `LabHistoryScreen` as a lab-scoped view, `app/lab/login` as a lab-specific
auth flow.

### 6.5 Auth gaps

| UI | Where | Situation |
|---|---|---|
| Google / "Vendor ID" social login | `AuthForm.completeSocialLogin` (calls `loginAs`, i.e. fake login) | No OAuth endpoint. **Remove** — it currently grants a session with no credentials. |
| `loginAs(role)` demo login | `auth.store`, `DashboardShell` "Demo {role} login" button | Client-side privilege selection. **Remove** — the real role comes from `TokenResponse.user.role`. The server enforces authorization regardless, but shipping a button that fakes admin state is indefensible. |
| Role-specific login pages | `app/vendor/login`, `app/admin/login`, `app/lab/login`, `app/vendor/register`, `app/(auth)/register` | One `POST /auth/login` for everyone; role comes from the response. Consolidate onto the single login page and redirect by role. |
| Password reset / forgot password | — | No endpoint, and no UI today either. Noted so it is not assumed to exist. |
| Verification-status entity (`VerificationSubmission`, `nextVerificationStatus`) | `lib/utils/verification.ts`, vendor + admin + lab screens | `ProductDetailDto.verificationStatus` is a read-only string on a product. There is no submission entity and no transition endpoint. |

---

## 7. Definition of done for each checklist item

1. No import from `lib/data/fixtures` or `mocks/` remains in the touched files.
2. Data comes from a `lib/api/endpoints/*` function typed against a `types/api.ts` DTO.
3. Loading state uses the matching export from `components/ui/Skeleton.tsx`.
4. Error state uses `ErrorState` and shows the server's message, not a generic string.
5. Empty state uses the existing `EmptyState`.
6. No money value on screen is computed client-side from prices.
7. Comments explain *why* (why retry-once on 401, why a field is optional, why a code is
   special-cased) — not what the line does.
8. `npm run typecheck && npm run lint && npm run test` pass, and the screen was exercised in a
   browser against a locally running backend.

---

## 8. Approved decisions (Phase 1 sign-off, 2026-08-22)

1. **Guest cart — require login.** No shadow local-cart layer. A client-side guest cart would need a
   merge-on-login step (merge conflicts, stale local data, duplicate-add bugs) for a feature the API
   does not support. Adding to cart while logged out prompts login via the existing auth modal.
   If guest-cart conversion matters later it is a backend ticket (a guest-cart-merge endpoint), not a
   frontend workaround. → §T3.
2. **Per-item cart checkboxes — remove.** A selection UI that implies checking out 2 of 5 items, when
   the API always charges for the whole cart, is a "charged for things I didn't select" bug waiting to
   happen. Removed rather than faked client-side.
3. **Coupon box and payment-method inputs — delete outright, not flag-off.** A flag can be flipped
   back on by accident, and any card-shaped input sitting in the DOM is scope creep for a future
   security/PCI review to reason about. `PaymentDetails` is deleted entirely, not disabled. Coupons
   return as a real feature when there is an endpoint; a coupon box that silently does nothing does
   not ship.
4. **Vendor/admin/lab unbacked screens — gate as "not yet available."** Fixture data must never be
   live on a screen a real user can reach; demo vendor/admin/user records get mistaken for real ones,
   which is a trust problem rather than a UX one. If stakeholders need the designs, the fixture
   version lives behind a separate **dev-only** flag excluded from the production build — not the
   same toggle a real user could hit. → §T2.
5. **Refresh token in `localStorage` — accepted risk, logged, with a follow-up.** Access token in
   memory + refresh token in `localStorage` is the least-bad option given the API has no
   httpOnly-cookie flow. Stated explicitly rather than silently: this trades CSRF exposure for
   XSS-driven token theft, since `localStorage` is readable by any successful XSS. Paired with two
   non-negotiables **in the same PR**: (a) a Content-Security-Policy and output sanitisation, and
   (b) a backend follow-up ticket for httpOnly refresh-cookie support before wider production
   rollout. This is the correct answer for now, not the permanent one. → §T1, §T4.
6. **Seed data — `data.sql` loaded manually, slugs queried from the DB, not assumed.** See §9.

---

## 9. Verified backend facts (read from the running backend's config, 2026-08-22)

Backend: `C:\Users\piyus\OneDrive\Desktop\database 2`.
Seed file: `src/main/resources/db/seed/data.sql` — **never executed at startup** (`spring.sql.init.mode: never`;
Flyway owns the schema). Load by hand:
`psql -U truzov -d truzov -f src/main/resources/db/seed/data.sql`.

**Database:** PostgreSQL `jdbc:postgresql://localhost:5432/truzov`, user `truzov`.

**Seeded catalog** — note `prd_honey` is an **id**, not a slug:

| id | slug | price / mrp | stock | flags |
|---|---|---|---|---|
| `prd_honey` | `raw-forest-honey-500g` | 449 / 599 | 120 | lab-verified, bestseller, featured, organic; 2 images; 3 variants; lab report `lab_honey` + 3 metrics (one `warning`) |
| `prd_ghee` | `a2-cow-ghee-1l` | 899 / 1199 | 60 | bestseller, organic; **not** lab-verified; 1 image; 2 variants |
| `prd_oil` | `cold-pressed-coconut-oil-1l` | 549 / 699 | **0** | new arrival; verification `pending`; **out of stock** |

Categories: `honey`, `ghee`, `cold-pressed-oils`. One banner, `placement = 'hero'` (confirms B1's
hero selection). Two approved reviews (on honey and ghee). One vendor, `ven_truzov`.

These three products are the fixtures for Phase B verification and for the rewritten Playwright
specs. `prd_oil` is a genuinely useful case: it exercises the out-of-stock path, and `prd_ghee`
exercises the not-lab-verified badge path.

**Config facts that change implementation:**

| Fact | Source | Consequence |
|---|---|---|
| Seeded users' `password_hash` is the literal filler `$2a$10$seedseed…`, not a real bcrypt hash | `data.sql` | `POST /auth/login` will always `401` for `owner@truzov.com` / `arya@example.com`. **Auth verification goes through the OTP flow, not password login.** A real password user must be created via `POST /auth/signup`. |
| `dev` profile sets `truzov.auth.otp.mode=mock`, `mock-code: 123456` | `application-dev.yml` | Run the backend with `SPRING_PROFILES_ACTIVE=dev` to verify C1–C3. Only code generation and delivery are mocked — verification, JWT issuance, and refresh rotation are the production paths, so a mock verify mints real tokens. |
| Auth rate limit: **5 requests / 15 min per IP**, enabled by default, covering signup, otp/send, otp/verify, login, refresh | `truzov.auth.rate-limit` | Iterative manual auth testing will hit `429` almost immediately. Set `TRUZOV_AUTH_RATE_LIMIT_ENABLED=false` while developing C1–C6, and turn it back **on** for one deliberate pass to verify the 429 path (F5.7). |
| Storefront rate limit: 100/min anonymous | `truzov.rate-limit` | Relevant to B9 search suggestions — debounce is not optional. |
| Seed image URLs are `https://placehold.co/...` | `data.sql` | **Blocker for B1/B4:** `placehold.co` is absent from `next.config.ts` `remotePatterns`, so `next/image` throws on every product card. Must be added (dev only) alongside the existing `cdn.truzov.com` / `res.cloudinary.com` entries. |
| CORS `allowed-origins` default `http://localhost:3000`; `allow-credentials: false` | `truzov.cors` | Confirms header-bearer auth, not cookies. An httpOnly refresh cookie would additionally require `allow-credentials: true` — include that in the §T1 ticket. |
| CORS `allowed-headers`: `Content-Type, Authorization, X-Truzov-Signature, X-Request-Id` | `truzov.cors` | `X-Request-Id` (F5.1) is explicitly allowed. Sending any *other* custom header will fail preflight. |
| `truzov.commerce.delivery-fee: 0` | `application.yml` | `OrderDto.deliveryFee` will be `0` locally. Do not treat `0` as "not loaded" or hide the line — it is a real value, and the column exists so a future pricing rule needs no migration. |
| `truzov.commerce.max-item-quantity: 20` | `application.yml` | The server cap behind D1's "server caps line quantity". The client does not hardcode 20; it surfaces the server's rejection. |
| `spring.jackson.deserialization.fail-on-unknown-properties: true` | `application.yml` | **Request bodies must contain only documented fields.** Sending a stray field (e.g. a leftover `vendorId`, `paymentMethod`, or `saveAsDefault`) is a hard `400`, not a silently ignored extra. This makes E1's "no `vendorId` is accepted" and D6's `saveAsDefault` → `isDefault` rename mandatory, not cosmetic. |
| `spring.jackson.default-property-inclusion: non_null` | `application.yml` | Null fields are **omitted** from responses, not sent as `null`. So every nullable DTO field must be typed optional (`field?: T`) and read with a presence check — `avatarUrl`, `pdfUrl`, `line2`, `traceId`, `details`, `message` will simply be absent. |
| `server.error.include-message: never` | `application.yml` | Unhandled framework errors carry no message. The UI must never depend on a message being present; `ErrorState` falls back to a code-derived string. |

---

## 10. Backend follow-up tickets to file

- **§T1 — httpOnly refresh-token cookie.** Add a `Set-Cookie` (httpOnly, `Secure`, `SameSite=Strict`)
  refresh flow so the refresh token is not reachable from JavaScript, and flip
  `truzov.cors.allow-credentials` to `true` for the storefront origin. Blocks removing the accepted
  risk in §8.5. Required before wider production rollout.
- **§T2 — Endpoints for the gated workspaces.** Vendor: a vendor-scoped `GET /vendor/products`,
  orders, payouts, analytics. Admin: user list (for `AdminRolesScreen`), vendor entity + list, order
  list, verification queue, banner/config writes. Lab: sample requests and report upload. See §6.2–6.4.
- **§T3 — Guest-cart merge endpoint**, if guest-to-customer conversion is ever measured (§8.1).
- **§T4 — Content-Security-Policy response headers** from the backend to complement the frontend CSP
  in §8.5.
- **§T5 — Order shipping-address snapshot on `OrderDto`.** `OrderDto` has no `address`, so order
  detail and confirmation cannot show where an order shipped (§6.1, D9/D11).
- **§T6 — Address mutations:** `PATCH` / `DELETE /users/me/addresses/{id}` and a set-default action.
  Blocks D6's edit/delete/set-default UI.
- **§T7 — `labReportId` / `pdfUrl` on `ProductDetailDto`**, so the PDP can link its own lab report
  instead of routing users to the global `/lab-reports` list (§6.1).
- **§T8 — `GET /home` returns `banners: []`.** Measured 2026-08-22 against the running backend with
  the seeded `ban_hero` record: `GET /banners` and `GET /banners?placement=hero` both return it,
  but the `/home` aggregate returned an empty `banners` array.
  **FIXED 2026-08-22.** Cause: `HomeService` asked for the placement literal `"homepage"`, while the
  seed data and the reference's own example both use `"hero"`, so the query matched nothing. Fixed in
  `application/home/HomeService.java` by naming the constant `HOMEPAGE_PLACEMENT = "hero"`. Verified:
  `/home` now returns the banner. The frontend's `useBanners` fallback is self-clearing and simply
  stops firing.
- **§T9 — ACCEPTED AND CLOSED (not fixed). `notFound()` produces a soft 404 (HTTP 200).**
  Frontend/Next.js, not backend. An unknown slug renders the not-found page and never leaks another
  product, but the status is 200. Measured in dev *and* a production build, with and without the
  route's `loading.tsx`, with `dynamic = 'force-dynamic'`, and with `notFound()` called from
  `generateMetadata` (which resolves before render) — none of them change it. The shell is flushed,
  committing 200, before the async server component throws.
  **Mitigation applied, and its limits, measured precisely (2026-08-25).** `generateMetadata` returns
  `robots: { index: false, follow: false }` for a missing product. An earlier note here claimed only
  that this was "verified present on a missing slug", which checked the wrong thing — presence rather
  than placement. Re-measured by raw `curl` against a production build (no JavaScript executed):
  `</head>` closes at byte 1864, while `<meta name="robots" content="noindex">` appears at byte 78411,
  roughly 76 KB into the `<body>`. The tag is therefore **server-rendered and requires no JavaScript
  to exist in the raw HTML**, but it sits outside `<head>` until React relocates it during hydration.
  Net effect: **effective for JS-executing crawlers (Googlebot, Bingbot), not effective for non-JS
  crawlers.** Not specific to the not-found path — a real product page's `<title>` is emitted outside
  `<head>` too; it is how Next streams metadata.
  **Decision: accepted, documented accurately, not fixed.** The only complete fix is a
  `middleware.ts` existence check, which would add a second backend round-trip to every product page
  view purely to cover non-JS crawlers on a soft 404. Rejected as the wrong trade: major search
  engines already handle soft 404s heuristically, and the crawlers that matter for ranking execute
  JavaScript and are covered. Revisit only given evidence of real non-JS-crawler traffic depending
  on it.
- **§T10 — Error responses from filters carry no CORS headers.** Found while verifying 429 handling,
  and the most consequential of these findings.
  Measured 2026-08-22: `200 /api/v1/categories` returns `Access-Control-Allow-Origin:
  http://localhost:3000` plus `Access-Control-Expose-Headers: X-Request-Id`. A rate-limited
  `429 /api/v1/products` returns `Retry-After: 1` and **no `Access-Control-*` headers at all**.
  The rate-limit filter short-circuits before the CORS filter, so the browser blocks the response and
  `fetch` rejects. The client cannot tell that apart from being offline, so a rate-limited user is
  told "Could not reach the server. Please check your connection." — and the whole 429 path
  (`Retry-After`, the wait message, suppressed retries) is unreachable from a browser even though it
  is implemented and unit-tested.
  It also explains intermittent e2e failures that looked unrelated: a product page rendering its
  error state because a 429 arrived as an opaque network failure.
  **Two fixes needed:** (a) apply CORS headers to error responses produced by filters, and (b) add
  `Retry-After` to `Access-Control-Expose-Headers` — it is not CORS-safelisted, so JavaScript cannot
  read it cross-origin unless the server exposes it.
  Pinned by `e2e/rate-limit.spec.ts` using `test.fail()`, so it passes while the bug exists and starts
  failing the moment it is fixed.

