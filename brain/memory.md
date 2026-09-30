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

* **Current state (2026-09):** The customer storefront uses the Next.js frontend in `zshivam`; the backend is a separate project in `database 2`, and the separate admin panel is in `admin panel`. The storefront fetches live catalog/home data through API hooks; MSW remains available for local mocking. Do not assume mock fixtures describe production inventory.
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
