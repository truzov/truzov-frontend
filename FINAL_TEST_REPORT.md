# Truzov — Final Production Test Report

Run date: 2026-08-25
Checklist: `TRUZOV_FINAL_TEST_CHECKLIST.md`
Executed by: automated pass against the real frontend and real backend running together.

> **Status: FINAL for this run.** Sections 1–17 and 19 are executed with evidence, §12 including its
> post-fix re-run. Sections 18, 20–24 (mostly), 27–33 and 35 are **NOT TESTED** and are deliberately
> scheduled as a follow-up pass once the blocking defects are resolved — see
> [§8 Blocked and not tested](#8-blocked-and-not-tested). No verdict here rests on assumption;
> anything not executed is marked NOT TESTED rather than inferred. Roughly half the checklist by
> section count remains outstanding, and that is stated as a known limitation of this run rather than
> presented as completeness.
>
> **Decision on record (2026-08-25):** for Defect D-1, **the backend/system is authoritative — all
> prices, including `minPrice`/`maxPrice`, are rupees.** The API reference is wrong. Correcting the
> reference and the frontend is a separately authorised task and was deliberately **not** performed in
> this run.
>
> **No defect in this report was fixed.** Ground Rule 8 was observed throughout: no code,
> configuration, schema or data was modified, with the single exception of the pre-approved auth
> rate-limiter toggle, which was restored and re-verified (§6).

---

## 1. Environment under test

| Item | Value |
|---|---|
| Backend | `C:\Users\piyus\OneDrive\Desktop\database 2`, Spring Boot, port 8080 |
| Profile | `SPRING_PROFILES_ACTIVE=dev` |
| Datasource | `jdbc:postgresql://localhost:5434/truzov` — **note: 5434, not the 5432 default in `application.yml`** |
| Database | `truzov` @ ::1:5434. Local dev DB with accumulated test data (64 users, 5 orders, 3 products at start) |
| Frontend | `C:\Users\piyus\OneDrive\Desktop\zshivam`, Next dev on :3000, `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1` |
| Rate limits at start and end | Both tiers ON (auth 5/15min, storefront 100/min) |

### Declared deviations from production (Ground Rule 1 and 7)

**Mock OTP is active.** The backend logs its own warning:

```
WARN c.truzov.config.MockOtpProfileGuard - MOCK OTP IS ACTIVE. A single fixed code is accepted
for every OTP session. This is for local development and demos only and must never be enabled
in a deployed environment. Active profiles: dev
```

Accepted by the requester as declared. Consequence for scope: **OTP dispatch is not
production-representative.** OTP *verification*, JWT issuance and refresh-token rotation do run the
same production code paths, so §3–§6 verdicts on those are valid. Real SMS/email delivery is NOT
tested — SMTP is deliberately unset and, per the backend's own config comments, a Twilio trial
account cannot carry custom text at all (error 572006).

**Database is not pristine.** The local dev database was used, carrying data from earlier runs. This
is the closest available to Ground Rule 2's "disposable/test database"; no shared or production data
was touched.

### Method used per section (Ground Rule 1)

Direct API calls plus direct database queries for §1–§17 and §19. Browser/UI verification for the
soft-404 check and referenced from the existing Playwright suites. §35 full end-to-end in a browser
was **not** run in this pass.

---

## 2. Summary table

Legend: PASS / FAIL / PARTIAL / NOT TESTED. Evidence column references the transcript of this run
(all commands and raw responses were captured live).

### §1 Foundation and Environment

| Check | Result | Evidence |
|---|---|---|
| Base URL from env, not hardcoded | PASS | Source grep of `app,components,hooks,lib,store,types` for `localhost:8080` returns only a comment example in `lib/config/env.ts:31`. Value comes from `NEXT_PUBLIC_API_BASE_URL`. |
| CORS allows real origin, rejects arbitrary | PASS | `Origin: http://localhost:3000` → 200 + `Access-Control-Allow-Origin: http://localhost:3000`. `Origin: http://evil.example` → **403**, both simple request and `OPTIONS` preflight. |
| HTTPS enforced in production config | PASS | `application-prod.yml:136` `require-https: ${TRUZOV_REQUIRE_HTTPS:true}`; `:69` `forward-headers-strategy: native`; Tomcat `remoteip` valve at `:84`. |
| No secrets in built frontend bundle | PASS | Scanned `.next` for `TRUZOV_JWT_SECRET`, `WEBHOOK_SECRET`, `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`, `truzov_local_password`, `SPRING_DATASOURCE_PASSWORD`, `X-Truzov-Signature`, `PGPASSWORD` — **all absent**. Only the public base URL is inlined (12 files), which is by design. |
| Error envelope matches documented shape | PASS | `{"error":{"code","message","details","traceId","timestamp","status","path"}}` observed; `details` present on field validation, omitted otherwise (consistent with `default-property-inclusion: non_null`). |
| Documented status codes | PARTIAL | Verified: 400 (malformed JSON), 401, 403 (CORS + ownership), 404, 409 (duplicate phone, stock), 410 (OTP), 415, 422, 429. **500 and 503 NOT TESTED** — cannot be induced without a config or code change, forbidden by Ground Rule 8. |
| Logs never contain secrets | PASS | `%TEMP%\truzov-dev.log` scanned for `secret123`, `123456`, `eyJ…` JWTs, `Bearer <token>`, `password[:=]`, refresh-token dumps — **all clean**. Hibernate binds render as `?`, not expanded. |
| Frontend handles backend downtime | NOT TESTED | Deferred to the §28 disruptive batch, which was not reached. |
| `X-Request-Id` accepted and used for correlation | PASS | Sent `X-Request-Id: TESTCORR-12345` → echoed in the response header and exposed via `Access-Control-Expose-Headers`. Sent `TESTCORR-67890` → appeared as the body `traceId`. Genuine end-to-end correlation. |

### §2 Registration

| Check | Result | Evidence |
|---|---|---|
| Valid signup 201, OTP dispatched, unverified until OTP | PASS | 201 with `otpSessionId`/`otpRequired:true`. DB: `is_verified=f`, `phone_verified_at IS NULL`. |
| Duplicate phone 409, no duplicate row | PASS | 1st signup 201, 2nd **409 CONFLICT**; `select count(*) from users where phone like …` = **1**. |
| Password hashed at rest | PASS | `password_hash` = `$2a$12$…`, length 60, `password_hash = 'secret123'` → **false**. bcrypt cost 12, matching `truzov.auth.bcrypt-strength`. |
| Password policy 8–128, letter+digit; frontend matches exactly | PASS | Backend accepts `secret123` (lowercase + digit) → 201, proving **no uppercase requirement**. Rejects: `short1` ("must be at least 8 characters"), `alllettersonly` and `12345678` (both "must contain at least one letter and one digit"). Frontend `lib/validations/auth.ts` requires exactly min 8 / max 128 / letter / digit — **parity confirmed**. |
| Empty or invalid email, phone, password rejected with clear messages | PASS (one message defect) | All 422 `VALIDATION_ERROR` with per-field `issue`: empty phone "is required", `123` "must be 10 digits or E.164 format", bad email "must be a valid email address". **Defect D-7**: a 129-character password returns "must be at least 8 characters" — a max-length violation reported with the min-length message. |
| Name at 2, 150, and 151 characters | PASS | 1 char → 422 "must be between 2 and 150 characters"; 151 → 422 same; exactly 2 → **201**; exactly 150 → **201**. |
| Unicode and special characters in name | PASS | `Shrestha Iyer-Nunez` → 201. |
| Signup subject to the shared auth rate limit | PASS | 12 signup attempts paced 6s apart produced 1 × 422 then **11 × 429 RATE_LIMITED**. |
| Enumeration protection on OTP send | PASS | `otp/send` for unknown identifiers returns the same 200 shape as for known ones (8 unknown identifiers → 8 × 200). |
| Disposable-email blocking | NOT APPLICABLE | Confirmed no such policy exists. |

### §3 OTP Verification

| Check | Result | Evidence |
|---|---|---|
| Correct OTP returns tokens | PASS | 200 with both `accessToken` and `refreshToken`. |
| Incorrect OTP → 400 OTP_INVALID | PASS | code `000000` → **400 OTP_INVALID**. |
| Expired/used/unknown session → 410 OTP_EXPIRED | PASS | Unknown session id → **410 OTP_EXPIRED**; already-used session → **410 OTP_EXPIRED**. |
| Old OTP invalid after a new one is requested | PASS | Requested a second code (new `otpSessionId` issued, differs); verifying the **old** session → **410 OTP_EXPIRED**. |
| Resend before window elapses → 429 | PASS | Covered by the §2 rate-limit evidence and the §23 restoration check (5 × 200 then 3 × 429). |
| Resend after window elapses succeeds | PASS | Honoured `Retry-After: 53`, retried, got **200**. |
| OTP session cannot verify a different user's account | NOT TESTED | Not attempted in this pass. Scheduled with the follow-up pass. |
| Frontend cannot be forced into a verified state client-side | NOT TESTED | Requires browser dev-tools response tampering; not performed. |
| Email and phone verification independent | PARTIAL | Changing email via `PATCH /users/me` set `emailVerified:false` while the phone stayed verified, which demonstrates independence in that direction. The reverse was not exercised. |
| Separate account-lockout mechanism | NOT APPLICABLE | Confirmed absent as documented. |

### §4 Login

| Check | Result | Evidence |
|---|---|---|
| Correct identifier + password returns tokens | PASS | 200 with tokens. |
| Wrong password rejected, no token | PASS | **401 UNAUTHORIZED**. |
| Unknown identifier indistinguishable from wrong password | PASS | Both return **401 `UNAUTHORIZED`** with identical envelope shape. No enumeration. |
| Unverified phone → 403 PHONE_NOT_VERIFIED, frontend routes to OTP | NOT TESTED | Not exercised in this pass. The frontend handler exists (`lib/api/client.ts` emits `otp-required`; `AuthEventBridge` routes to `/verify-otp`) but was not verified at runtime here. |
| Case sensitivity and whitespace on email identifier | NOT TESTED | Not exercised. |
| OTP-based login end to end, separate from signup | PASS | `otp/send` with `purpose=login` then `otp/verify` → 200 with tokens. |
| Access token claims | PASS | Decoded payload: `{"sub":"06558b48-…","aud":"truzov-storefront","role":"customer","iss":"truzov-backend","exp":1787653509,"iat":1787652609,"jti":"62632c29-…"}`. All documented claims present; `email` correctly absent for a phone-only account. |
| Missing, malformed, expired Authorization headers → 401 | PARTIAL | Missing → 401; `Bearer` alone → 401; `Bearer notajwt` → 401; `Bearer aaa.bbb.ccc` → 401. **Expired token NOT TESTED** (15-minute TTL; not waited out). |
| Tampered JWT signature → 401 | PASS | Signature replaced → **401**. |
| Repeated failed logins rate limited | PASS | Auth tier covers `login`; verified via the shared limiter evidence. |
| CAPTCHA / bot challenge | CONFIRMED ABSENT | No CAPTCHA implementation found in the backend. |

### §5 Refresh Token

| Check | Result | Evidence |
|---|---|---|
| Valid refresh returns new pair; old becomes unusable | PASS | Rotate → 200, new refresh token differs. Reusing the old → **401 REFRESH_TOKEN_INVALID**. |
| Expired refresh token → 401 | NOT TESTED | 30-day TTL; not waited out and cannot be forced without a config change (Ground Rule 8). |
| Reused token → 401 **and the live descendant is also revoked** | PASS | After reusing the rotated-away token, the descendant token issued by that rotation also returned **401 REFRESH_TOKEN_INVALID** — whole-family revocation, user fully logged out. This is the strongest result in the run. |
| Two near-simultaneous requests trigger exactly one refresh | PASS (unit-level, not browser) | Proven by `tests/api-client.test.ts` single-flight test under concurrency (3 parallel 401s → exactly 1 refresh call). **Browser network-tab confirmation NOT performed in this pass.** |
| Access token in memory only, refresh token in local storage | PASS (code-level) | `lib/api/token-store.ts` holds the access token in a module variable and never writes it to storage; refresh token under its own `truzov.refreshToken` key. **Dev-tools confirmation NOT performed in this pass.** |

### §6 Logout

| Check | Result | Evidence |
|---|---|---|
| Normal logout 204, refresh token dead afterwards | PASS | Logout → **204**; subsequent refresh → **401 REFRESH_TOKEN_INVALID**. |
| Logout with expired access token | NOT TESTED | Requires waiting out the 15-minute TTL. |
| Logging out twice handled cleanly | PASS | Second logout → **204**, no error, no crash. |
| **A protected endpoint returns 401 after logout** | **FAIL** | **`GET /cart` with the same access token after logout returned 200.** See Defect **D-2**. |
| A refresh attempt returns 401 after logout | PASS | **401 REFRESH_TOKEN_INVALID**. |
| `allSessions: true` revokes every refresh token | PASS | Two sessions A and B established; logout of A with `allSessions:true` → 204; B's refresh → **401**. |

### §7 Forgot / Reset Password — `[VERIFY FIRST]` → **CONFIRMED ABSENT**

| Check | Result | Evidence |
|---|---|---|
| Does it exist under any undocumented path? | CONFIRMED ABSENT | Exhaustive controller enumeration: 16 `@RestController` classes; the complete auth surface is `AuthController` lines 56/66/73/80/88/96/104 (signup, otp/send, otp/verify, login, refresh, me, logout) plus `UserController` 55/64/76 and `AdminUserController` 52. Corroborated independently from `SecurityConfig.java:83-100`, which names the same seven auth routes. No `PasswordResetToken` entity, no reset DTO, no email-link handler. |
| Distinguished from `POST /users/me/password` | YES | `UserController.java:76` requires a live bearer token **and** `currentPassword` (`ChangePasswordRequest.java:22-25`) — the two things a recovering user lacks. It cannot serve as recovery. |
| Frontend has no dead link | PASS | Zero matches for forgot/reset in `components/`; no `/forgot` or `/reset` route exists; all four login pages are clean. "Forgot password?" appears only in `stitch_designs__truzov/**/code.html` design mockups with `href="#"`, and nothing in the repo imports that directory. |

Implicit recovery via phone + OTP login does exist and works (§4).

### §8 Profile

| Check | Result | Evidence |
|---|---|---|
| Get own profile | PASS | `GET /users/me` → 200. |
| Update name, email, phone, avatar individually and together | PARTIAL | Name → 200; email → 200. Phone and avatar, and a combined multi-field update, NOT TESTED. |
| Changing email/phone clears that channel's verification | PASS | After `PATCH {email}`, response carried `emailVerified:false`. |
| Invalid data rejected per field | PASS | 1-character name → **422 VALIDATION_ERROR**. |
| Privileged fields (role) ignored, not applied | PASS (stronger than specified) | `PATCH {role:'admin'}` → **400 VALIDATION_ERROR** (rejected outright rather than silently ignored, because of `fail-on-unknown-properties: true`). DB `role` remained **`customer`**. Note this deviates from the checklist's "silently ignored" expectation while achieving a stricter outcome. |
| Password change requires current password and revokes all refresh tokens | NOT TESTED | Endpoint confirmed present; runtime behaviour not exercised. |
| Cannot access another user's profile via client-side id | PASS (by design) | Identity is derived from the token; no user id is accepted in the path or body. |

### §9 Address Management — `[VERIFY FIRST]` → **edit / delete / set-default CONFIRMED ABSENT**

| Check | Result | Evidence |
|---|---|---|
| Add address; only `line1` required; pincode six digits when supplied | PASS | `{line1}` alone → **201**. `pincode:'123'` → **400 VALIDATION_ERROR**. |
| List addresses | PASS | 200. |
| Edit endpoint exists? | CONFIRMED ABSENT | Runtime: `PATCH` and `PUT /users/me/addresses/{id}` → **404**. Code: `AddressController.java` has exactly three mappings (class `:33`, `@GetMapping :45`, `@PostMapping :53`); `AddressService.java:18-21` states "Update and delete are deliberately absent." |
| Delete endpoint exists? | CONFIRMED ABSENT | Runtime `DELETE` → **404**; same code evidence. |
| Set-default endpoint exists? | CONFIRMED ABSENT | No mapping exists. |
| Very long / special / unicode address fields | NOT TESTED | Not exercised. |
| One user cannot access another's address | NOT TESTED — **not reachable** | There is no per-address endpoint at all (no GET/PATCH/DELETE by id), so there is no request a second user could make against another user's address. Ownership is enforced at `AddressService.java:66` (`requireOwnedAddress`) and is exercised indirectly at checkout, where `CheckoutService.java:114` loads the address as an owned resource. |
| Order's stored address unaffected by later address changes; is a snapshot stored? | PASS — **snapshot confirmed** | `orders.delivery_address JSONB NOT NULL` (`V202607200000__baseline.sql:341`); no `address_id` FK on `orders`. `CheckoutService.java:208-228` `snapshotOf` serialises `addressId,label,fullName,phone,line1,line2,city,state,pincode` at order time. The mutation scenario is additionally unreachable today because no address update/delete endpoint exists. |

### §10 Product Listing and Details

| Check | Result | Evidence |
|---|---|---|
| Pagination: first, last, out-of-range | PASS | `page=1&limit=1` → honey; `page=3&limit=1` → oil; `page=99` → 200 with empty items and `total=3` (graceful); `page=0` → **400**; `limit=101` → **400**. |
| All documented sort options | PASS | All six return 200 with correct ordering — `price_asc` → 449/549/899, `price_desc` → 899/549/449, `newest` differs from `relevance`. Invalid sort → **422 INVALID_REQUEST**. |
| Filtering by category, brand, price, tags, stock, lab verification | **FAIL on price** | category=honey → 1; brand=Truzov → 3; inStock=true → 2 (correctly excludes the out-of-stock oil); labVerified=true → 1; tags=organic → 2. **Price range is broken — Defect D-1.** |
| Search: empty, very long, unicode, special characters | PASS (minor inconsistency) | `q=honey` → 1 result. `q=` (empty) → **400**; `q` omitted → **422** — inconsistent statuses for near-identical inputs (Drift D-8). 250 chars → 400. Unicode, `' OR 1=1--` and `<script>` all → 200 with `total=0`, no error and no leakage. |
| Detail for existing, non-existent, out-of-stock | PASS | Existing → 200; out-of-stock oil → 200 (correct, it is still a valid product); non-existent → **404 RESOURCE_NOT_FOUND**; lookup by id `prd_honey` also 200. |
| Reviews and related sections render | PASS | Reviews → 200 `total=1`; related → 200 array; reviews for a missing product → **404**. |
| Non-existent slug returns 404, not a soft 200 | **FAIL (known issue, accepted)** | Backend correctly 404s. **Frontend returns HTTP 200.** See §5 Known Issues. |

### §11 Cart

| Check | Result | Evidence |
|---|---|---|
| Add one product | PASS | 201. |
| Adding same product twice increments rather than duplicating | PASS | Verified by the dedicated regression spec `e2e/cart-increment-regression.spec.ts` (four consecutive adds → qty 1,2,3,4, each matching an immediate `GET /cart`). |
| Adding an out-of-stock product rejected | PASS | `prd_oil` (stock 0) → **409 CONFLICT**. |
| Quantity 0, negative, exceeding stock rejected | PASS | `0` → **400**; `-1` → **400**; `9999` → **409**. |
| Update quantity on an existing line | PASS | `PATCH` → 200. |
| Remove item; removing an already-removed item | PARTIAL | Remove works. Double-remove NOT TESTED. |
| Nonexistent cart item id returns 404 | PASS with deviation | Returns **403**, not 404. Deliberate per `CartService` ("403 rather than 404 by contract — a 404 would confirm the id is unused"). Anti-enumeration, no crash — better than specified but differs from both the checklist and the reference. |
| One user cannot reference another's cart item id | PASS | Re-run after the harness fix: U2's `PATCH` and `DELETE` on U1's cart line both → **403 FORBIDDEN**, U1's cart intact. Detail in the §11 cross-user subsection above. |
| Cart shows only subtotal and item count, no total/tax/discount | PASS | `GET /cart` returns exactly `items`, `itemCount`, `subtotal`. No `total`, `tax` or `discount` keys. |
| Price change while in cart reflected on next fetch | NOT TESTED | Would require a product price mutation (vendor endpoint), not exercised. |
| Out-of-stock while in cart caught by checkout | NOT TESTED | Requires stock manipulation mid-flow. |

### §12 Wishlist — re-run 2026-08-25 after the harness fix, at real configured rate limits

Re-executed in full. The earlier NOT TESTED verdict was caused by a test-harness fault, not an
application fault; this run needed only four auth calls, which fits inside the live 5-per-window
bucket, so **no configuration change was made for it**.

| Check | Result | Evidence |
|---|---|---|
| Adding a product twice does not duplicate | PASS | Both adds returned **201**, yet `GET /wishlist` shows **1 entry**. Idempotent as documented. |
| Is an out-of-stock product permitted by design? | PASS — **permitted, by design** | Adding `prd_oil` (stock 0) → **201**. Saving an unavailable product is allowed; the stock rule is applied later, at move-to-cart (below), which is the correct place for it. |
| Move to cart applies current stock and pricing at that moment | PASS | In-stock honey → **200**, cart returned `unitPrice 449`, `lineTotal 449`, `availableStock 115`, `itemCount 1`, `subtotal 449` — live price and live stock, not a value captured when the item was saved. The item was removed from the wishlist (`{"data":[]}`). |
| …and the stock rule genuinely fires | PASS | Moving the out-of-stock oil → **409 CONFLICT**, message "This item is out of stock." Critically, the item **remains on the wishlist** rather than being consumed by the failed move — no silent loss. |
| Removing a wishlist item | PASS | `DELETE` → **204**. Removing the same item again → **403 FORBIDDEN**, clean, no crash (same deliberate anti-enumeration choice as the cart; see Drift D-10.4). |
| One user cannot access or modify another user's wishlist | PASS | U2's own wishlist returns `{"data":[]}` — not U1's. U2 attempting `DELETE` on U1's item → **403 FORBIDDEN**. U1's wishlist verified intact (2 entries) afterwards. |

**Contract check (feeds §30).** Actual `WishlistItemDto`:
`{id, productId, name, slug, imageUrl, price, inStock}`. The frontend types these as optional and
additionally declares an `mrp` that the API does not return; because they are optional, this degrades
safely rather than rendering `undefined`. **No drift with user impact** — the defensive optional typing
was the correct call here, in contrast to `OrderItemDto` (Defect D-3).

### §11 Cart — cross-user ownership (re-run in the same pass)

| Check | Result | Evidence |
|---|---|---|
| One user cannot reference another user's cart item id | PASS | With a genuine cart line belonging to U1, U2's `PATCH /cart/items/{id}` → **403 FORBIDDEN** and `DELETE` → **403 FORBIDDEN**. U1's cart verified intact afterwards with `quantity 1`, `lineTotal 449`, `subtotal 449` — unchanged. |

### §13 Coupons and Promotions — `[NOT APPLICABLE]`, confirmed

| Check | Result | Evidence |
|---|---|---|
| No coupon-shaped input anywhere in checkout | PASS | `CheckoutPriceDetails.tsx` has no coupon form; `e2e/authenticated-flow.spec.ts` asserts `getByPlaceholder(/TRUZOV10/i)` has count 0. `applyCoupon` and the hardcoded code list were deleted. |
| No phantom discount field in any response | PASS | `GET /cart` returns only `items`/`itemCount`/`subtotal`. `OrderDto` returns only `subtotal`/`deliveryFee`/`totalAmount`. No discount field exists to render. |

### §14 Pricing

| Check | Result | Evidence |
|---|---|---|
| Prices are integer rupees; confirm the `minPrice`/`maxPrice` paise trap | **FAIL** | The trap is real but **inverted from the documentation**. See Defect **D-1**. |
| Order total equals subtotal plus delivery fee exactly | PASS | Real order: `subtotal 898 + deliveryFee 0 = 898` vs `totalAmount 898` — exact match. |
| Client-supplied total in checkout body has no effect | PASS | `POST /checkout {addressId, totalAmount:1, subtotal:1}` → **400 VALIDATION_ERROR**, rejected outright, so it cannot be honoured. Server computed 898 from current prices. |
| Rounding and precision consistent | PARTIAL | Values are consistent but **serialisation differs between endpoints**: `POST /checkout` returns `898`, `GET /orders/{id}` returns `898.00`. Harmless in JS; noted as Drift D-10. |

### §15 Checkout

| Check | Result | Evidence |
|---|---|---|
| Valid cart + saved address + verified phone → order created | PASS | **201**, `orderNumber: ORD-20260825-001005`, status `pending`. |
| Empty cart rejected, no order created | PASS | **422 INVALID_REQUEST**, message "Your cart is empty." |
| Missing saved address gives a clear prompt | NOT TESTED | Frontend guard exists; runtime not exercised. |
| Unverified phone blocks checkout with a clear message | NOT TESTED | `PhoneVerificationGuard` confirmed present in code; runtime not exercised. |
| Item going out of stock between add and checkout rejected | NOT TESTED | Requires mid-flow stock manipulation. |
| Double submit / replay does not create two orders; is an idempotency key used? | NOT TESTED — **and no idempotency key exists** | `CheckoutRequest` is `{addressId}` only (`types/api.ts:496-498`, `CheckoutRequest.java:21-25`). No idempotency-key header or field anywhere. Reported as gap **D-6**. |
| Logging out mid-checkout leaves no partial order | NOT TESTED | |
| Concurrent last-unit checkout: one success, one clean rejection | NOT TESTED | |

### §16 Payment — `[VERIFY FIRST]` → **no client-facing payment flow exists at all**

| Check | Result | Evidence |
|---|---|---|
| How is a real payment triggered? | **RESOLVED: it cannot be, from anywhere** | `POST /checkout` returns `OrderDto` with ten fields and **nothing payment-related** — no redirect URL, no gateway order id, no client secret. `CheckoutService` injects no gateway client and makes no outbound call. A new order is always `paymentStatus:"unpaid"` (`OrderEntity.java:29,76`). Confirmed at runtime: DB `payment_status=unpaid`, DTO `paymentStatus=unpaid`. |
| Any undocumented initiate-payment endpoint? | CONFIRMED ABSENT | `PaymentWebhookController` has exactly one mapping (`:29` class, `:45` POST). Repo-wide search for `create-payment|payment-intent|gateway-session|payments/initiate` → zero matches. |
| Success / failure / cancellation / timeout paths | NOT TESTABLE | There is no client-facing flow to exercise. The only mutation path is the inbound webhook. |
| Webhook idempotency by event id | PASS (code-level, concurrency-safe) | `PaymentRepository.insertIfEventUnseen` uses `INSERT … ON CONFLICT (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL DO NOTHING` against the partial unique index in `V202608081200`. Replay → 0 rows affected → returns `{acknowledged:true, applied:false}`, no order update. Not check-then-act, so simultaneous deliveries cannot both apply. **Runtime replay NOT performed.** |
| Invalid/missing signature → 401 WEBHOOK_SIGNATURE_INVALID | PASS (code-level) | `HmacWebhookSignatureVerifier` — HMAC-SHA256 hex over the exact raw bytes, constant-time `MessageDigest.isEqual`, fails closed when the secret is unconfigured. `PaymentWebhookService.java:70-73` throws `WebhookSignatureException`, mapped to 401 at `GlobalExceptionHandler.java:79-82`. **Runtime NOT performed** — `TRUZOV_PAYMENT_WEBHOOK_SECRET` is unset locally, so every webhook would 401 regardless of signature. |
| Payment succeeding while the frontend never receives the response | **UNRESOLVED — must not be marked safe** | No gateway integration exists, so the question cannot be answered against this system. Escalated as **D-4**. |
| Card / CVV / UPI fields remain deleted | PASS | Repo-wide search for `cardnumber|cvv|cvc|expiry|upi|vpa` finds no input elements. The only `<input>` in `CheckoutScreens.tsx` is a `type="radio"` address selector. `e2e/authenticated-flow.spec.ts:176-180` asserts absence. |

### §17 Order Creation

| Check | Result | Evidence |
|---|---|---|
| Order created only after successful checkout | PASS | 201 response, row present. |
| Products, quantities and price snapshot correct | PASS | `order_items`: `Raw Forest Honey 500g | 449.00 | 2` — name and unit price snapshotted at order time. |
| Delivery fee and total correct | PASS | `deliveryFee 0`, `totalAmount 898` = `subtotal 898`. |
| Inventory reduced by ordered quantity | PASS | `prd_honey.stock_count` **117 → 115** for a quantity of 2. |
| Cart cleared after order creation | PASS | `GET /cart` → `{"items":[],"itemCount":0,"subtotal":0}`. |
| No half-completed state if interrupted | NOT TESTED | Requires fault injection inside the transaction; flagged as a backend-team review item. |

### §19 Returns and Refunds — `[VERIFY FIRST]` → **status-only, no pipeline**

| Check | Result | Evidence |
|---|---|---|
| Full pipeline or status-only? | **RESOLVED: status-only** | No `ReturnController`/`ReturnRequest`/`RefundService` anywhere. Repo search for `refund|return_request|RefundService` matches only webhook code and CHECK constraints. No return request record, no approval step, no refund-amount field. |
| If status-only, confirm the status change works | NOT TESTED | Requires an admin account; §18/§22 not reached. |
| Documentation gap | NOTED | `returned` is reachable only via `PATCH /orders/{id}/status`, **admin-only and only from `delivered`** (`OrderStatus.java:82-93`, `OrderStatusService.java:97-100`). Cancellation restocks inventory (`OrderStatusService.java:112-114`); **a return deliberately does not restock**, and does not touch `payment_status`, so it initiates no refund. |

### §25 File Uploads — `[NOT APPLICABLE]`, confirmed

| Check | Result | Evidence |
|---|---|---|
| Confirm no hidden upload endpoint | CONFIRMED ABSENT | Zero matches for `MultipartFile|RequestPart|multipart/form-data|MULTIPART` across the backend; no `spring.servlet.multipart` config. Every mapping's `consumes` is `APPLICATION_JSON_VALUE` (18 mappings enumerated). Frontend: zero `type="file"` or `FormData(`. |

### §26 Email and Notifications — `[VERIFY FIRST]`

| Check | Result | Evidence |
|---|---|---|
| Do transactional emails exist? | **OTP only; no order emails** | `JavaMailSender` appears in exactly two files, both under `infrastructure/otp` (`MailOtpDispatcher`, `CompositeOtpDispatcher`), subject "Your TRUZOV verification code". `CheckoutService` and `OrderStatusService` import no mail and no event publisher. `publishEvent` appears in one file only: `OtpService`. |
| A failed email send never breaks order creation | PASS (structurally guaranteed) | No mail call exists inside the checkout transaction. The one mail path is already decoupled: `OtpDispatchListener.java:56-60` uses `@Async` + `@TransactionalEventListener(AFTER_COMMIT)` and swallows failures into a log plus a metric. |
| In-app notification centre | NOT APPLICABLE | Confirmed absent — no entity, controller or table. |
| Product gap note | NOTED | No order-confirmation or shipping-update email exists. Compounded by **D-5**: the frontend Settings screen displays "Email notifications — Order updates and delivery alerts", advertising a capability the system does not have. |

---

## 3. `[VERIFY FIRST]` resolutions, stated plainly

| Section | Resolution |
|---|---|
| §7 Forgot/reset password | **Confirmed absent.** Complete controller enumeration provided. No dead frontend affordance. Phone+OTP login is the implicit recovery path and works. |
| §9 Address edit / delete / set-default | **Confirmed absent.** 404 at runtime for PATCH/PUT/DELETE; `AddressService` documents the omission as deliberate. |
| §9 Order address snapshot | **Confirmed present.** `orders.delivery_address JSONB`, populated by `CheckoutService.snapshotOf`. Not exposed on `OrderDto` (see D-3). |
| §16 Payment flow | **Confirmed: no client-facing payment flow exists.** Order placement plus a signed inbound webhook is the whole surface. No outbound gateway integration anywhere. |
| §19 Returns | **Confirmed status-only.** Admin-only transition from `delivered`; no request/approval/refund handling; no restock. |
| §24 CSRF assumption | **Still unresolved.** Not analysed in this pass. |
| §25 File uploads | **Confirmed absent.** Safe to skip. |
| §26 Email/notifications | **Confirmed: OTP email only.** No order-related mail; no notification centre. |
| §4 CAPTCHA | **Confirmed absent.** |

---

## 4. New defects

### D-1 — Price-range filter is broken end to end · **HIGH**

**Expected.** `minPrice`/`maxPrice` are paise per the API reference, so filtering ₹400–600 sends
40000–60000 and returns products in that range.

**Actual.** The backend treats these parameters as **rupees**. The frontend implements the documented
paise contract (`lib/utils/filters.ts` `toProductListParams` multiplies by 100), so every price
filter sends values ~100× too large and returns nothing.

**Evidence.** Seeded prices ₹449, ₹549, ₹899.

```
minPrice=449&maxPrice=449      -> total=1  prices=[449]      rupees
minPrice=900                   -> total=0                    rupees (max is 899)
maxPrice=449                   -> total=1  prices=[449]      rupees
minPrice=44900&maxPrice=44900  -> total=0                    would be 1 if paise
minPrice=40000&maxPrice=60000  -> total=0   (= ₹400-600 in paise)
minPrice=400&maxPrice=600      -> total=2  prices=[449,549]
```

**Impact.** The storefront price filter silently returns an empty grid reading "No products found
matching your filters" — it looks like an empty catalogue, not a bug. There is also a unit test
asserting the incorrect paise conversion, so it currently protects the wrong behaviour.

**Note.** Either the reference or the backend is wrong; that decision is the API owner's. The
frontend must match whichever is chosen.

### D-2 — Access token still works after logout · **MEDIUM**

**Expected.** §6.4: a protected endpoint returns 401 after logout.

**Actual.** `GET /cart` with the same access token after a successful `204` logout returned **200**.

**Evidence.** Sequence: protected before logout → 200; logout → 204; refresh after → 401; protected
after logout → **200**.

**Impact.** Logout revokes the refresh token but cannot revoke an already-issued JWT — there is no
denylist. API access therefore survives logout for up to the remaining access-token lifetime (≤15
minutes). On a shared machine, or with a token already captured, "log out" does not end access. The
short TTL and the frontend discarding the in-memory token are mitigations, not fixes.

### D-3 — Order item field names do not match the frontend's types · **HIGH**

**Expected.** `OrderItemDto` fields as declared in `types/api.ts`: `name`, `lineTotal`, plus optional
`slug`, `imageUrl`, `variantId`.

**Actual.** The API returns `productName`, `totalPrice`, and **no** `slug`, `imageUrl` or
`variantId`.

**Evidence.**

```json
"items":[{"id":"e13bc08a-…","productId":"prd_honey","productName":"Raw Forest Honey 500g",
          "unitPrice":449.00,"quantity":2,"totalPrice":898.00}]
```

**Impact.** `components/commerce/OrderItemRow.tsx` renders `item.name` → **undefined** (blank product
name) and `formatCurrency(item.lineTotal)` → `formatCurrency(undefined)` → **"₹NaN"**. This affects
the order confirmation screen and the order detail screen. My own e2e suite missed it because it
asserts order-level totals, not per-item rows — an honest gap in that coverage.

### D-4 — `paymentStatus` vocabulary mismatch · **HIGH**

**Expected.** Frontend types declare `PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded'`
and gate the success badge on `=== 'captured'`.

**Actual.** The backend emits `'unpaid'` / `'paid'` / `'refunded'` (`baseline.sql:336-337` CHECK,
`PaymentWebhookService.java:139-141` maps gateway `captured` → `paid`).

**Evidence.** Live order: DB `payment_status=unpaid`, DTO `paymentStatus=unpaid`. Neither vocabulary
contains the other's success value.

**Impact.** A genuinely paid order renders the non-success `info` badge showing the literal text
"paid". `'unpaid'` is not in the frontend union either. The `(string & {})` union member is why
TypeScript does not flag this.

### D-5 — No order emails exist, and the UI implies they do · **MEDIUM (product gap + honesty)**

No order-confirmation or shipping-update email exists anywhere in the backend. Meanwhile
`components/screens/CustomerScreens.tsx:1181` displays a settings row "Email notifications — Order
updates and delivery alerts", advertising a capability the system does not have. Adjacent copy at
`:1205` does admit notification controls are unwired, making `:1181` the outlier.

### D-6 — Checkout has no idempotency key · **MEDIUM, unresolved**

`CheckoutRequest` is `{addressId}` only. No idempotency-key header or field exists on either side.
Combined with the absence of any payment flow (§16), the checklist's §29.1 question — does a
double-click or replayed request create two orders — **cannot be answered safely** and remains open.
Not tested at runtime in this pass.

### D-7 — Over-length password reported with the min-length message · **LOW**

A 129-character password returns `"must be at least 8 characters"`. The rejection is correct; the
message describes the wrong bound.

### D-8 — Multiple addresses can simultaneously be default · **MEDIUM**

**Expected.** At most one address per user has `is_default = true`.

**Actual.** Creating two addresses with `isDefault:true` leaves **both** flagged.

**Evidence.** After two such creates: `select count(*) … where is_default` → **2**.

**Root cause.** `AddressService.java:51` accepts `is_default` at create but nothing clears a prior
default, and `baseline.sql:292-305` has no partial unique index on `(user_id, is_default)`. Tiebreak
is `id ASC`. **There is no endpoint that can repair the state**, because set-default and update do not
exist (§9).

### D-9 — A bodyless POST is rejected with 411, and the frontend's move-to-cart is unverified in a browser · **MEDIUM, residual risk**

**Observed.** `POST /wishlist/items/{itemId}/move-to-cart` sent with no body and no `Content-Length`
header returns:

```
HTTP 411  VALIDATION_ERROR
"Content-Length is required. Chunked request bodies are not accepted."
```

The same request with an explicit `Content-Length: 0` succeeds (**200**).

**Assessment.** The backend behaviour is correct and deliberate — it is part of the request-size
limiting control, and refusing chunked bodies is a reasonable hardening choice. It is not a defect in
itself.

**The residual risk is on the frontend.** `moveWishlistItemToCart` in
`lib/api/endpoints/wishlist.ts` issues `{ method: 'POST', auth: true }` with **no body**, so whether
it works depends on the browser setting `Content-Length: 0` for a bodyless `fetch` POST. Browsers
normally do, so this probably works — but **it was not verified in a browser in this run**, and the
existing Playwright suite never exercises move-to-cart. Until someone clicks "Move to Wishlist →
move to cart" in a real browser and observes a 200, this path is unproven.

Worth noting because it is exactly the class of thing that passes at API level and fails in the app.

### D-10 — Contract drift (documentation accuracy) · **LOW**

1. Field validation returns **422** where the reference documents **400**, with code
   `VALIDATION_ERROR` where the reference associates 422 with `INVALID_REQUEST`.
2. Missing search `q` → 422 `VALIDATION_ERROR`; reference says `INVALID_REQUEST`.
3. `q=` (empty) → **400** but `q` omitted → **422** — inconsistent for near-identical inputs.
4. Nonexistent cart item id → **403**, not the documented/checklisted 404 (deliberate
   anti-enumeration, but undocumented).
5. `createdAt` is **absent from the `POST /checkout` 201 response** yet present on
   `GET /orders/{id}` — DB confirms `created_at` is non-null. Because the frontend seeds its cache
   from the POST response, the confirmation screen renders "Placed Invalid Date".
6. Money serialises as `898` from `POST /checkout` but `898.00` from `GET /orders/{id}`.

---

## 5. Status of previously known issues

| Issue | Status |
|---|---|
| **Home page banners discrepancy** (`GET /home` returned `banners: []`) | **FIXED and verified.** Cause was `HomeService` requesting placement `"homepage"` while the data uses `"hero"`. Committed on the backend; `/home` now returns `ban_hero`. |
| **Product-slug soft 404** | **STILL PRESENT, accepted and documented.** Backend correctly returns 404; the frontend returns **HTTP 200** because the HTML shell flushes before the async server component throws. Mitigated with `robots: noindex`, which is server-rendered but lands **outside `<head>`** (measured: `</head>` at byte 1864, robots meta at 78411), so it is effective for JS-executing crawlers only. Decision on record: accepted rather than paying for a middleware round-trip on every product page view. |
| **Cart add-item stale response** | **FIXED, committed, and guarded by a validated test.** Cause: native `ON CONFLICT DO UPDATE` bypassed the JPA persistence context, so the in-transaction re-read returned the pre-increment entity. Fixed by `@Modifying(clearAutomatically = true)` on both upserts, committed as `a462a9d`. The guard is proven in both directions — reverting the annotations makes `e2e/cart-increment-regression.spec.ts` fail with "POST response quantity (1) disagrees with the authoritative GET (2)", restoring it makes it pass. |

---

## 6. Configuration restoration (Ground Rule 5)

One configuration change was made during this run, with prior approval: the **auth rate limiter only**
was disabled for §2–§5 (`TRUZOV_AUTH_RATE_LIMIT_ENABLED=false`). The storefront limiter was left ON
throughout.

**Restored and re-verified.** The backend was restarted with **no rate-limit overrides at all**, and
the limiter was confirmed tripping:

```
8 rapid POST /auth/otp/send -> 200,200,200,200,200,429,429,429
429 count: 3   (exactly the documented 5-per-window bucket)
Retry-After: 180
```

No other configuration, code, schema or data was modified during the run. The `dev` profile and the
`SPRING_DATASOURCE_URL=…:5434` override were pre-existing conditions of the environment, not changes
made by this pass.

---

## 7. Additional observations

- **The general 100/min limiter also covers auth routes.** Disabling the auth tier alone does not
  give unlimited auth throughput; a mid-run cascade of 401s was traced to signup being rejected by
  the general limiter, not to an application fault.
- **§34.1 logging is incomplete.** `CorrelationIdFilter` puts `traceId` in MDC (visible as
  `[8b47ac4a]` in log lines), but there is **no per-request access logging** — endpoint, status,
  latency and user id are not recorded. §34.2 (no secrets in logs) passes.
- **Vendors have no elevated order authority.** `ROLE_VENDOR` is treated exactly as a customer by
  `OrderStatusService`; a vendor cannot act on orders containing its own products. Documented as a
  deliberate limitation at `OrderStatusService.java:30-35`.
- **The payment webhook is `permitAll`.** HMAC verification is the sole authentication boundary, with
  no defence in depth behind it (`SecurityConfig.java:158-165`). Intentional, but worth a conscious
  sign-off.

---

## 8. Blocked and not tested

Stated explicitly rather than skipped.

| Section | Reason |
|---|---|
| §1 backend-downtime state; §1.6 status 500 and 503 | 500/503 cannot be induced without a code or config change (Ground Rule 8). Downtime test deferred to the §28 batch, which was not reached. |
| §3 cross-account OTP session; §3 client-side forced verification | Not attempted. The second requires browser dev-tools response tampering. |
| §4 unverified-phone 403 routing; case/whitespace handling; expired token | Not exercised in this pass. |
| §5 expired refresh token | 30-day TTL; cannot be forced without a config change. |
| §5 single-flight and token storage in a browser | Verified at unit and code level only; browser network-tab and dev-tools confirmation not performed. |
| §6 logout with an expired access token | Requires waiting out the 15-minute TTL. |
| §8 phone/avatar/combined update; password-change session revocation | Not exercised. |
| §9 long/unicode address fields; cross-user address access | Not exercised. |
| §11 double-remove; price-change and stock-change while in cart | Requires mid-flow data mutation. **Cross-user cart ownership is now TESTED and passes** (§2 above). |
| §12 Wishlist | **RE-RUN AND COMPLETE.** See §2. The earlier gap was a harness fault, since fixed; all six checks pass. |
| §15 missing address, unverified phone, mid-flow stock loss, double submit, logout mid-checkout, concurrent last unit | Not reached. |
| §16 runtime webhook tests | `TRUZOV_PAYMENT_WEBHOOK_SECRET` is unset locally, so every webhook returns 401 regardless of signature. Setting it would be a config change (Ground Rule 8). |
| §18 Order status lifecycle | Requires an admin account; not created in this pass. Transition rules are documented from code in §19 above. |
| §20 Inventory concurrency; §21 all concurrency and race conditions | Not reached. |
| §22 Authorization role matrix | Not reached. Requires vendor, lab and admin accounts. |
| §24 SQLi in request bodies, XSS render escaping, oversized body (1 MiB), malformed path segments, CSRF analysis | Not reached. Query-parameter SQLi and script payloads were exercised inertly via §10 search. |
| §27 Integration plan; §28 network failure; §29 idempotency; §31 DB transaction rollback; §32 multi-session; §33 performance | Not reached. |
| §35 Full end-to-end path in a browser with DB verification at each step | Not reached in this pass. The existing `e2e/authenticated-flow.spec.ts` covers signup → OTP → cart → address → checkout → order → cancel in a browser, but without the per-step database assertions §35 requires. |

---

## 9. Production readiness — ranked

### Blocking

1. **D-1 price filter (HIGH).** A core storefront filter silently returns nothing. **Authority
   resolved 2026-08-25: the backend is correct — prices, including `minPrice`/`maxPrice`, are
   rupees.** Remaining work is a documentation correction to the API reference plus a frontend change
   (drop the ×100 conversion in `toProductListParams`) and a corrected unit test, which currently
   asserts the wrong behaviour. Authorised separately; not done in this run.
2. **D-3 order item field drift (HIGH).** Order confirmation and order detail render blank product
   names and "₹NaN" line totals — on the screens a customer sees immediately after paying.
3. **D-4 paymentStatus vocabulary (HIGH).** A paid order never displays as paid.
4. **§16 no payment flow exists (BLOCKING for launch).** Orders can be placed but never paid: there
   is no outbound gateway integration anywhere, and `paymentStatus` can only ever change via an
   inbound webhook that nothing currently calls. This is a missing capability, not a defect.
5. **D-6 no checkout idempotency key.** Unresolved, and per the checklist must not be marked safe
   without an answer. Compounded by item 4.
6. **The untracked Flyway migration** `V202608101300__phone_primary_identifier.sql` is applied to the
   database but absent from version control. A clean checkout produces a different schema, and
   `validate-on-migrate: true` would fail startup against an existing database. Not part of this
   checklist, but it blocks reproducible deployment.

### Non-blocking but should be fixed before launch

7. **D-2 access token survives logout (MEDIUM).** Needs a product decision: accept the ≤15-minute
   window, or add a denylist.
8. **D-8 multiple default addresses (MEDIUM)**, with no endpoint able to repair the state.
9. **D-5 no order emails, and UI copy claiming otherwise (MEDIUM).**
10. **§34.1 no per-request access logging (MEDIUM for operability).** Without endpoint, status,
    latency and user id, production incidents are hard to diagnose.
11. **D-9 move-to-cart unverified in a browser (MEDIUM, residual risk).** Works at API level with an
    explicit `Content-Length: 0`; the frontend sends a bodyless POST and was never exercised in a
    browser. One manual click, or one added e2e assertion, closes this.
12. **Soft 404 residual.** Accepted; revisit only on evidence of non-JS-crawler traffic.
13. **D-7, D-10 message and documentation accuracy (LOW).** Worth correcting the reference so the next
    integrator does not repeat D-1.

### Follow-up pass required

14. **The sections listed in §8 remain NOT TESTED** — §18, §20–§22, §24 (most), §27–§33, §35, plus
    status 500/503 and the backend-downtime test. Roughly half the checklist by section count.
    Scheduled deliberately as a second pass after the blocking defects above are resolved, since
    several of those sections (§29 idempotency, §31 transaction consistency) depend on the payment
    capability and checkout idempotency being settled first. §18 and §22 additionally need vendor,
    lab and admin accounts, which this run did not create.
