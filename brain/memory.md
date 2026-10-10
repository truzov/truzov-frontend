# Central Project Memory: Truzov

Truzov is a Next.js-based verified organic and lab-tested marketplace. The application connects customers with vendors, offering an end-to-end e-commerce flow coupled with a scientific verification process to ensure product quality and authenticity.

---

## Core Business Value

In traditional organic markets, customers have no way to verify if a product is truly organic or chemical-free. Truzov bridges this trust gap by requiring third-party laboratory verification for all listed products. No product is sellable on the marketplace until it passes lab testing for pesticides, heavy metals, and organic claims.

---

## Key Roles

The platform supports four primary user roles, each with its own layout, dashboard, and workflow:

1. **Customer (Consumer):**
   * Browses categories, searches for products.
   * Views verified lab metrics, certificates, and test results on the product page.
   * Adds products to cart/wishlist, checks out, tracks orders.
   * Rates and reviews products.

2. **Vendor (Seller):**
   * Lists products, specifies product claims, batches, and SKUs.
   * Submits products for verification (this initiates the lab testing flow).
   * Manages inventory, pricing, orders, and payouts.
   * Tracks verification status of their listings.

3. **Lab Analyst (Verifier):**
   * Receives verification requests when product samples are collected.
   * Runs tests (e.g., pesticides, heavy metal screens).
   * Uploads reports, logs metrics, and marks tests as `pass` or `fail`.

4. **Admin (Operations):**
   * Manages vendors (approves or rejects onboarding/documents).
   * Reviews lab reports and coordinates verification submissions.
   * Configures site settings (commission rates, shipping thresholds).
   * Manages banners and static homepage configurations.

---

## Key Features

* **Verification Lifecycle:** Seamless transition of submissions through states (`submitted` -> `samples_collected` -> `in_lab` -> `report_uploaded` -> `approved`/`rejected`).
* **Lab Report Transparency:** Embedded lab metrics (e.g., Pesticides, Heavy Metals status) directly accessible to customers on product detail pages.
* **Unified Workspace Shell:** An adaptive workspace layout (`DashboardShell` and screen sets) that styles itself dynamically based on whether the active user is a Vendor, Admin, or Lab Analyst.
* **API Mocking Integration:** MSW (Mock Service Worker) integration allowing local front-end developers to test complete complex role workflows without requiring a live backend database.

---

## Current State & Active Work

* **Current state (corrected 2026-10-02):** The customer storefront is `zshivam`; backend is `database 2`; the intended separate admin is `ADMIN/Main_File/Sellzy_Dashboard`. The unrelated `admin panel` starter was the wrong project and is stopped. Storefront catalogue/home hooks read backend API data; MSW fixtures do not describe production inventory.
* **Storefront redesign:** The homepage uses a forest green, cream, sage, terracotta, and amber visual system, responsive category/product sections, process explanation, seller CTA, and generated Truzov imagery. Supplied screenshots are design references, not site assets.
* **Trust standard:** Verification badges and numeric claims require backend evidence. Product summaries expose `isLabVerified`, and a published lab-report feed exists, but the current summary contract does not establish a matching report for a specific SKU/batch. Avoid asserting a stronger claim than the available data proves.
* **Customer journey polish:** The homepage, auth screens/modal, and bag/checkout share forest, cream, sage, and coral styling. The homepage hero has breathing room below the header; the white footer uses an Allura script slogan. The header exposes the existing `/wishlist` destination.
* **Local auth diagnosis:** Backend/database connectivity was healthy. The default backend profile lacked an OTP delivery provider; the `dev` profile enables mock OTP `123456`, verified through API and browser. Seeded accounts have malformed placeholder password hashes, explaining password-login failures. Treat the mock code as a local testing facility only.
* **Account surfaces (2026-09):** The signed-in account menu now uses the storefront forest/cream/sage palette without a pointer decoration. The responsive account shell/profile/sidebar follow the same palette. The homepage uses a local SVG `truzov-standards-seal.svg` with restrained tilt instead of a plain text circle; reduced-motion preferences disable its animation.
* **Storefront motion (2026-09):** Subtle CSS entrance, hover, and supported scroll reveals enliven the customer storefront without a new dependency. Account navigation continues to use Lucide SVG icons. Reduced-motion settings disable storefront animation, transitions, smooth scrolling, and hover transforms.
* **Local collection preview (2026-09-30):** With the frontend on `localhost:3000` and the backend `dev` profile on `localhost:8080` using local PostgreSQL on port 5434, the homepage showed three live products. QA confirmed their names, links, badge state, and stock state at 375px, 768px, and 1440px. This was a frontend-only change; backend code and data were unchanged.
* **Customer typography and controls (2026-09-30):** Inter, Allura and Lora are now licensed local WOFF2 assets. Customer scopes consistently use Inter for all headings and form controls, while the footer keeps its deliberate Allura script and workspace typography stays separate. Shop filters/cards, account panels, wishlist states, bag and checkout share the existing palette and responsive spacing; live routes, cart actions and server totals remain intact.
* **Logo and address form:** The shared Logo uses `public/truzov-wordmark.svg` across customer navigation, footer, auth and checkout, with a light treatment for the dark brand panel. Genuine Inter 700 lettering outlines and a smooth leaf replace the visibly jagged trace of the supplied small raster. The home eyebrow keeps its copy without its pill background. Address fields are grouped, full-width street fields wrap within the panel, and the modal fixes its heading/actions while only the field area scrolls. Shared Input width constraints and generated fallback IDs prevent grid overflow and improve label associations.
* **Login-to-signup handoff:** The frontend carries a normalized unknown email or phone into signup through existing in-memory auth state. This draft does not prove ownership or create a session; stale OTP state is cleared and fresh signup OTP verification is required. Existing backend endpoints and database contracts are unchanged. A focused auth inspection noted the account-exists endpoint intentionally reveals account presence under existing IP limits; this remains a known flow tradeoff, not a claim of exhaustive backend security assurance.
* **Current verification:** Final production build, 123 unit tests, targeted lint, typecheck and diff checks passed. Read-only mocked page/address browser checks passed at 375px, 768px and 1440px; a physical mobile keyboard was not tested. Final auth-browser disposition belongs in `qa-report.md`. Mocked fixtures are test coverage, not legitimate inventory or production-security evidence.

Final logo replacement (2026-09-30): copied supplied trzov ogo.png unchanged to public/truzov-logo.png; shared Logo and organization metadata now use it. Native image dimensions and unoptimized loading retain its resolution. Existing dark-background variant and responsive wordmark links remain.
Latest supplied logo supersedes previous PNG: public/truzov-logo-final.png is now used by shared Logo and organization metadata. Original 2137x736 transparent PNG retained.
Logo sizing reduced per user feedback: shared wordmark112px, header96px mobile/112px desktop, authentication128px. Aspect ratio and 44px home-link target retained.
Icon refinement: reused official Lucide SVGs and shadcn guidance, unified1.75px strokes,20px navigation/18px search, clear circled account/cart/grid/care/food roles. Search icon-to-input gap10px prevents caret collision. Native footer chevron rotates when expanded; labels/actions/44px targets retained.123tests,types,lints pass and375/1440 browser checks passed.

* **Neon test environment (2026-10-02):** Local backend now selects Neon from `database 2/.env`, superseding the older local PostgreSQL :5434 preview. Intended admin is `ADMIN/Main_File/Sellzy_Dashboard` on :3001, customer storefront :3000, backend :8080. Existing first-admin bootstrap stores the fixed test administrator with BCrypt; normal authentication/role checks remain. `start-demo.ps1` retains the local dev profile, and bootstrap never resets an existing admin.
* **Database-only demo catalogue:** `seed-demo.ps1` (PowerShell 7.2+) uploads four sample images to Cloudinary and transactionally applies `db/seed/data-demo.sql`: twelve explicitly labelled demo products, four demo categories, image references and variants. Neon has 21 total products after preserving nine originals; rerun adds none. Only the twelve new entries have the newly uploaded Cloudinary imagery. Demo entries have no certification/lab/review claims. Database credentials always come from `.env`; `.env.branch` supplies only an optional Cloudinary fallback. Render configuration is documented in `database 2/DEMO_SETUP.md`; the later deployment repair was verified on 2026-10-03 as recorded below.

- Checkout runtime recovery (2026-10-02): existing routes returned404 with inferred parent workspace root. Explicit turbopack.root and ignored .next-build output restored pages; old cache was locked and recursive cleanup rejected.53 cart/auth/API tests passed. auth/me401 alone may indicate normal token restoration rather than a route bug.


- Correct ADMIN panel rebranded with unchanged transparent Truzov logo, forest/cream/sage primary palette and amber/terracotta order status chart. Expanded/collapsed logos use same transparent asset; cream header surface supports original dark lettering.

* **Render deployment repair (2026-10-03):** `feat/admin-panel-integration` at unchanged commit `f4ce79f` reached live deployment `dep-db0055psrm7s73djlhm0` at 00:48:42 IST. Startup failed because the Render `CLOUDINARY_URL` value included the variable-assignment prefix; an environment merge corrected only that value using the matching existing local account. No source changes were made. Public products/categories returned HTTP 200 JSON; unauthenticated admin stats returned 401. Default profile still uses mock OTP and an ephemeral JWT key, so this verifies the repair, not production readiness. Uploads and authenticated flows remain unverified; local packaging was blocked by a locked JAR. Evidence: backend `implementation-plan.md`, `review-report.md`, and `qa-report.md`.

## Eight marketplace fixes — 2026-10-04

Implemented across `zshivam`, `database 2`, and the actual admin app `ADMIN/Main_File/Sellzy_Dashboard`. Admin sign-in uses the approved logo/brand palette; category/shared sort-order drafts remain strings until valid numeric submission. Coupon add/edit/details use real resource CRUD. Public seller applications now save brand/contact/channel/category/optional business details and admin support lists them with full details and a persisted reference.

Product quantity is editable with product/variant stock ceilings, placed before descriptive tabs on mobile. Signed-in mobile navigation uses existing logout/session cleanup. Account settings links are removed and the old route redirects to profile. Cart checkboxes carry selected server IDs through address/review; unselected lines remain after checkout. Guest choices transfer during login and choices/coupons are account scoped. Offers entry leads to the coupon form; invalid/pending quotes block ordering and the same code can be retried after transient failure.

Backend revalidates active/date/minimum/product scope/per-user coupon limits against current locked prices. The discount and code are order snapshots; redemptions count placed orders. Concurrent redemption is serialized by coupon-row locks. Product and variant reservation rolls back on failure; new order-item reservation flags prevent cancellation from inflating historical variant stock. Migration: `V202610040100__cart_coupons_seller_applications.sql`.

Verification: storefront 137 tests and build/type checks, admin 14 tests and build/type checks, backend 287 unit tests/package and 6 isolated PostgreSQL integration tests passed. Browser checks covered mobile product controls/cart/logout, removed settings, admin login/sort zero-to-blank-to-17, and 1024/1280 overflow. Browser screens used an isolated fixture API; persistence/concurrency were verified separately against local PostgreSQL. No live database writes, pushes, or deployments. Backend API/migration must deploy before the updated frontends.


## Hosted rollout — 2026-10-04

Backend PR #31 commit bb5cf86 went live on Render with migration V202610040100 applied; public products/categories returned 200 and unauthenticated admin stats returned 401. Storefront PR #11 originally failed because Vercel expected .next/routes-manifest.json while local config used .next-build. Commit ae525d6 selects .next when VERCEL is present; a VERCEL=1 local production build passed all 49 routes and the hosted production deployment is Ready at https://truzov-frontend-sepia.vercel.app/. Admin PR #2 commit24f9489 was rebuilt with production environment and is Ready at https://truzov-admin.vercel.app/. Admin production branch tracking now uses codex/truzov-admin-branding; storefront uses feat/storefront-redesign. Live catalog loaded21 products and branded admin login rendered. Deployment dashboard screenshots are local qa-artifacts/vercel-storefront-live.png and vercel-admin-live.png.

Backend GitHub CI ran372 tests with0 failures, but SpotBugs rejected7 mutable representation findings. Follow-up defensive copies and a scoped repository injection exclusion are being verified separately. Runtime auth limitations recorded earlier remain; no production purchase or seller submission was created during smoke checks.

## Backend CI follow-up — 2026-10-04

PR #31 follow-up commit 6c26a04 defensively snapshots Coupon.productIds, ValidateRequest.cartItemIds and CheckoutRequest.cartItemIds. Optional null cart selection and null element Bean Validation semantics are preserved. One existing XML-pattern exclusion matches only CouponService constructor/carts field EI_EXPOSE_REP2 for the private final Spring repository proxy. Reviewer found no material issue. Final isolated build ran 287 unit tests with zero failures/errors and SpotBugs with zero findings. Earlier GitHub run passed all 372 tests but failed only these seven representation findings. Render auto-deploy and replacement GitHub checks started after push.

## Review checklist fixes — 2026-10-08
Inspected existing functionality first across storefront, database 2 and actual ADMIN/Main_File/Sellzy_Dashboard. Reused DB category/filtering, ticket APIs/admin support, public seller enquiry and coupon redemption. Added missing scoped panel password/OTP checks, removed unused Firebase settings, fixed header breakpoints/overlay/hero gap, dedicated real offers listing, lowercase brand/icons, admin-only auto/force-on/force-off product flags plus admin create/edit, rules settings and storefront own-ticket UI. Preserved seller onboarding and existing manual choices. Source review corrected product array loss and stale ID editor. New forward migration V202610080100__review_fixes.sql not applied. All diff checks pass; target builds/tests/browser/timing not run due security-audit mandated unavailable OS sandbox. No push/deploy/live requests. Reports: docs/review-fixes-report.md, FINDINGS.md, latest QA/review appendices.

## Review fixes validation — 2026-10-08
Docker engine became available; user authorized temporary matching toolchain downloads. Passed storefront 142 tests/51-page production build, admin 20 tests/89-page production build, both typechecks, backend 291 unit + 117 affected integration tests, packaging/SpotBugs, fresh Flyway and existing-data SQL upgrade preservation/removal/defaults. Isolated no-network/readonly/scratch-only/env-allowlist/resource-capped execution; no live migration or deployment. All six Chromium header checks passed with full category navigation after explicit min-[1536px] header variants corrected the custom 1440px 2xl breakpoint; final storefront production build passed again. qa-report.md is authoritative. Admin build required two existing Next.js route parameter type fixes.

* Review fixes production rollout (2026-10-08): user authorized commit/live release via Render/Vercel. Backend e63ee0d live with V202610080100 applied; storefront fbea22b and admin7b73cd8 production READY. Public offers/products/categories and new frontend pages200; admin unauthorized401. Backend GitHub CI291 units+376 IT passed, SpotBugs0. Trivy image gate fails on two affected Spring dependency CVEs with no identified source reachability (XSLT/SSE view fragments); independent triage, no suppression/risk acceptance. Vercel runtime-log access403. See docs/review-fixes-release-20261008.md.
