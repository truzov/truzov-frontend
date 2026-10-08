# truzov review fixes — 2026-10-08

Checked current source in storefront `zshivam`, backend `database 2`, and actual admin `ADMIN/Main_File/Sellzy_Dashboard` before implementing. Existing category storage/filtering, seller application persistence, ticket APIs/admin management, coupon redemption and stock handling were reused. Only missing functionality and directly related bugs changed. No push, deployment, live requests or database mutation occurred.

**Status convention:** PASS (source) means inspected implementation and independent source review agree with the requirement. It does not mean runtime validation passed. Docker validation resumed after the user started the engine and authorized temporary matching toolchain downloads. Current runtime results and remaining limits are recorded below.

| # | Layers | Before check / action | Source result | Migration / checks |
|---|---|---|---|---|
| 1 | Admin, BE | Wrong portal returned a role-bearing token before UI refusal. Added scoped password/OTP send/verify routes and generic failure before token issuance; seller scope retains customer applicants. Privileged admin/lab identities no longer appear in public account lookup. | PASS (source); exact timing unmeasured | AuthServicePanelTest, AuthRateLimitTest; ReviewFixesIT; admin scoped API checks |
| 2 | FE | Desktop controls started too early and crowded the header. Mobile header layout through 1440px; explicit min-[1536px] desktop variants with reduced gaps (project 2xl is 1440px). | PASS (source + Chromium) | e2e/review-header.spec.ts: 375, 1024, 1152, 1280, 1440, 1536 |
| 3 | FE | Explicit 14px/10px hero margins caused gap. Removed. | PASS (source + Chromium) | Same browser check asserts hero touches header |
| 4 | FE | Mobile menu/search remained in normal flow. Positioned them below header as overlays; outside click/Escape close; Escape returns focus. | PASS (source + Chromium) | Same browser check asserts main position unchanged |
| 5 | FE, BE | Link targeted cart anchor. Both menus now use `/offers`; display-only public API lists actual active coupons, with loading/error/empty states. Redemption unchanged. | PASS (source) | tests/offers.test.tsx; ReviewFixesIT active/expired/future offers |
| 6 | FE, Admin, BE | Uppercase display text/metadata remained. Lowercased wordmarks, metadata, accessibility labels, auth/email text; reused original logo for icons; migration normalizes stored marketplace display values. | PASS (source); rendered/data upgrade unverified | Forward migration; source searches. Environment identifiers, class names and immutable history preserved |
| 7 | Admin, BE | Firebase existed as unused settings/menu/route only. Removed those and example env references. No SDK/provider dependency to replace found. Existing email/Twilio OTP, Cloudinary and payment/marketing settings retained. | PASS (source + SQL upgrade) | Forward migration deletes Firebase app_settings row incl secret_ciphertext; updated PanelOpsIT/PanelRouteSecurityIT and ReviewFixesIT |
| 8 | Admin, BE, FE consumption | Booleans only and admin couldn't create/edit. Added admin-only modes and reused product form/services. Database maintains existing final flags used by every storefront reader. Rules editable in `/settings/product-flags`. | PASS (source + integration/upgrade checks) | Forward migration; ReviewFixesIT; admin mode/API/permissions checks |
| 9 | FE, BE | DB product_categories plus category FK/backend filters already implemented. No rewrite. | PASS (source investigation) | FINDINGS.md; existing catalog paths reused |
| 10 | Admin, BE | Documented real vendor/admin flow; added required admin create/edit with approved active vendor owner. Fixed shared edit losing benefits/ingredients/certifications and stale form when changing IDs. | PASS (source); end-to-end unverified | ReviewFixesIT admin CRUD/owner/vendor denial; admin forms preservation check |
| 11 | FE, Admin, BE | Documented authenticated signup/OTP/KYC/admin approval vs public enquiry. Seller applicant login kept working. No onboarding redesign. | PASS (source investigation); decision pending for any redesign | FINDINGS.md; ReviewFixesIT customer applicant login |
| 12 | FE, Admin, BE | Existing secured ticket API/admin screen reused. Customer fake success replaced by tickets/list/status/thread/reply; seller page links there; legacy admin detail uses real ticket view. | PASS (source); end-to-end unverified | tests/support-tickets.test.tsx; existing ownership tests remain |

## Files by item

Paths below are relative to their named repository.

1. BE: `application/auth/AuthService.java`, `interfaces/rest/controller/AuthController.java`, `interfaces/rest/filter/AuthRateLimitFilter.java` under `src/main/java/com/truzov/`. Admin: `components/auth/sigin-form.tsx`, `lib/api/panel.ts`.
2–4. FE: `components/layout/Header.tsx`, `app/globals.css`.
5. FE: `app/(shop)/offers/page.tsx`, `components/screens/OffersScreen.tsx`, `lib/api/endpoints/coupons.ts`, Header. BE: `application/order/CouponService.java`, new `interfaces/rest/controller/OffersController.java`.
6. FE: root/home/policy metadata; shared Logo/Footer; PolicyScreens, CustomerScreens, WorkspaceScreens, CheckoutScreens; seal SVG; `app/icon.png` replaces `app/favicon.ico`. Admin: root/auth metadata and auth/sidebar/messages; `app/icon.png` replaces generic icon. BE: OpenApiConfig, OTP message text, UserEntity display fallback, seed display strings and migration display normalization.
7. Admin: `.env.local.example`, nav-data, settings/settings-fields, roles, removed firebase route. BE: SettingsService, SettingsCipher comments, SupportController comments, migration.
8–10. BE: CatalogOpsService, VendorProductService, AdminOpsController, new AdminProductController and ProductFlagRefreshJob, SettingsService, migration. Admin: `components/panel/ops.tsx`, `products.tsx`, new `product-flag-select.tsx`, settings-fields, settings route/nav, `lib/api/panel.ts`, `types/api.ts`, `lib/roles.ts`, keyed edit page, `lib/forms.ts`.
11. Investigation only; role scope adjustment preserves existing applicant flow.
12. FE: new `app/(shop)/support/tickets/page.tsx`, `components/screens/TicketScreen.tsx`, `lib/api/endpoints/support.ts`, SupportScreens, Footer/Header/AccountMenu links. Admin: `app/(dashboard)/support/[id]/page.tsx`, `components/panel/comms.tsx`, roles.

## Migration and flag rules

One new backend migration: `src/main/resources/db/migration/V202610080100__review_fixes.sql`. It removes the unused Firebase configuration row, adds mode columns/check constraints, initializes existing flags as matching force_on/force_off to preserve earlier manual choices, installs shared final-result recalculation, seeds settings and normalizes marketplace display data. No historical migration was edited and it has not been applied to a live database.

New products default to Auto. New arrival means creation within 30 days. Bestseller means at least 10 paid units in the last 30 days, excluding cancelled/returned orders; refunded orders cease to count. Admin settings adjust day windows/minimum units. Sales/status/settings changes recalculate flags; the scheduled refresh handles time-window expiry each minute. Force on/off always wins until Auto is restored. Existing manual choices are not silently reset. Featured and publication remain manual. Vendors cannot set merchandising modes.

## Focused security review

Independent review traced panel auth audience before token issuance, same password comparison path, unknown-account dummy comparison, shared IP/account rate limiting and retained OTP 429 behavior. Ticket identity comes from authenticated user claims, reads/replies are owner-scoped, bodies render as text, admin APIs retain role authorization, and mutations call live-admin audit authorization. Admin product owner cannot be reassigned; new owners must be approved/active. Public offers expose display fields only; cart eligibility and redemption remain authenticated server decisions.

Source review caught and corrected seller-login exclusion of pending customer applicants, product detail type mismatch, dropped arrays during edits and stale edit state. No additional actionable source defect remains in reviewed changes. This was a focused review, not a full codebase audit or deployment assessment. Normal authenticated account responses still include the user's role; public customer/vendor account lookup continues its existing onboarding purpose. Measured timing equality, production OTP/JWT configuration and effective deployed controls are not established here.

## Validation and decisions

All three git diff --check commands passed (CR-at-EOL allowed for Windows line endings). Tests run in disposable Docker containers with no external network, an empty allowlisted environment, read-only source/toolchain mounts, scratch-only writable tmpfs, and CPU/memory/process/file/disk/wall-clock limits. Only dummy identities, secrets and database data are used. User authorization allows matching temporary toolchain downloads; project dependencies are unchanged. See qa-report.md for the current results.

No user decision is needed for these source fixes. Changing the seller onboarding flow still needs confirmation; current recommendation is retain one verified customer identity for KYC and seller access, with public enquiries separate. A deployment must apply and validate the backend migration/API before these frontends use the new routes. No deployment or live migration is included. Measured timing equality and deployed provider/security settings remain unverified.

## Review fixes validation resumed — 2026-10-08
This supersedes the earlier Docker-engine blocker for this task. The user started Docker and explicitly authorized temporary matching Linux toolchain downloads; project manifests/lockfiles were not changed.

Passed:
- Storefront: exact Vitest 4.1.8, 142 tests in 15 files; standalone TypeScript 5.9.3; Next.js 16.2.7 production build (51 generated pages).
- Admin: exact Vitest 4.1.8 with Vite 8.3.1, 20 tests in 3 files; standalone TypeScript; Next.js 16.1.6 webpack production build, including generated route types (89 generated pages).
- Backend: 291 unit tests; 117 affected integration tests across VendorProductEndpointIT (10), SellerOnboardingIT (6), ReviewFixesIT (4), ProductEndpointsIT (12), PanelRouteSecurityIT (79), PanelOpsIT (6). Fresh Flyway migrations included V202610080100.
- Backend offline Maven packaging and SpotBugs check: BUILD SUCCESS, zero BugInstances/errors. The narrowly scoped AdminProductController constructor/products field exclusion matches only Spring-managed service injection; collection exposure checks remain enabled.
- Upgrade SQL fixture on PostgreSQL 16: all prior migrations applied first, dummy products seeded with opposite true/false manual flags, Firebase row with dummy ciphertext and mixed-case branding. New migration preserved force_on/force_off and final booleans, removed the complete Firebase row, normalized display data, and gave newly inserted products Auto modes with correct defaults.

Execution controls: --network none (or only a shared isolated loopback namespace for local browser/server), --read-only, --cap-drop ALL, no-new-privileges, env -i with explicit PATH/HOME/TMPDIR/cache/dummy URL values, read-only source/dependencies, writable /scratch tmpfs only. Limits: CPU 1–2 cores; memory 512 MiB for SQL and 2–3 GiB for Java/Node; pids 64–192; file-size 128–256 MiB; scratch disk 512 MiB–3 GiB; bounded timeout per run (180–600 seconds for completed checks). No Docker socket, host credentials, dotenv, shared database or production service was exposed.

The Windows dependency bind mount caused storefront worker startup timeouts and an admin build deadline. Copying immutable dependencies into read-only Docker volumes resolved the I/O bottleneck. The admin build then exposed two pre-existing Next.js dynamic-parameter type errors: removed unused draft-edit params and awaited stock-detail params. A fresh complete admin build passed afterward. The backend mock re-stubbing test fix uses doThrow to avoid invoking an earlier throwing stub.

Playwright 1.60.0 with matching Chrome Headless Shell 148.0.7778.96 (revision 1223): 6/6 checks passed at 375/1024/1152/1280/1440/1536px with active Personal care/Food categories. Verified no viewport overflow, hero/header adjacency, menu overlay without main displacement, correct Offers links and Escape focus return. Header uses explicit min-[1536px] variants because this project overrides Tailwind 2xl to 1440px. Storefront production build passed again after this correction. Browser/server used separate capped containers sharing only an isolated network-none loopback namespace; no retained browser output. Exact response timing, real provider configuration and deployed enforcement remain unverified. No push/deployment or live database mutation occurred.
