# Master Memory: Truzov (Entry Point)

> [!IMPORTANT]
> **READ THIS FIRST BEFORE COMMENCING ANY TASK.**
> This is the persistent intelligence layer of Truzov. Always read this file and cross-reference with `architecture.md`, `patterns.md`, and `decisions.md` before making modifications.

---

## 1. Project Mission & Essence

Truzov is a verified organic and lab-tested marketplace. Unlike other organic storefronts, Truzov provides complete chemical transparency by requiring physical product batches to pass lab testing (pesticides, heavy metals) before becoming purchaseable. The product verification lifecycle connects Customers, Vendors, Lab Analysts, and Admins into a unified, secure flow.

---

## 2. Technical Stack Summary

* **Frontend:** Next.js (App Router, TypeScript)
* **Styling:** Vanilla Tailwind CSS with dynamic utility helpers (`tailwind-merge`, `clsx`, `class-variance-authority`).
* **State Management:** Zustand stores with `persist` middleware.
* **API Isolation:** Standard fetch API wrapped in custom client `lib/api/client.ts`. MSW (Mock Service Worker) is used to mock backend endpoints locally.
* **Charts:** Recharts (guarded against Next.js hydration mismatches).
* **Forms:** React Hook Form + Zod.
* **Testing:** Playwright (E2E), Vitest (Unit/Integration).

---

## 3. Directory Mapping

* `/app`: Route groups separating workspaces (`(shop)`, `(account)`, `(checkout)`, `(auth)`, `admin`, `vendor`, `lab`).
* `/components/screens`: High-level views (e.g. `CustomerScreens.tsx`, `WorkspaceScreens.tsx`).
* `/components/dashboard`: Components for layouts, tables, and boards (e.g. `VerificationKanban.tsx`).
* `/components/ui`: Pure visual elements (`Badge.tsx`, `Button.tsx`).
* `/store`: Zustand state stores (`auth.store.ts`, `cart.store.ts`).
* `/lib/api/client.ts`: Shared fetching utility.
* `/mocks`: Mock service worker handlers.

---

## 4. Key Patterns & Decisions

1. **Page-Screen Split:** Keep Next.js page components in `/app` minimal. Put layout content and views inside `/components/screens/`.
2. **Local Authorization:** Authorization headers are injected automatically by the `apiFetch` wrapper. The client parses state from `localStorage` under `truzov-auth`.
3. **Route Security:** Use the `useProtectedRoute()` custom hook in client-rendered secure dashboards to verify logged-in states and handle redirect params.
4. **Mock API standard:** All mocked endpoints in `mocks/handlers.ts` return payloads in the standardized format: `{ data: T, message?: string }`.

---

## 5. Known Pitfalls & Solutions

* **SSR Window Guard:** Always check `typeof window !== 'undefined'` before accessing storage to avoid Next.js server compilation failures.
* **Hydration Mismatch:** Recharts components must be guarded by a `mounted` state check to avoid structure mismatches between server and client.
* **Timeout Errors:** The custom `apiFetch` timeout defaults to 10s and aborts connections via `AbortController`. The catch block formats this as a clear `'Request timed out'` message.

---

## 6. Roadmap Snapshot

* **Project paths (corrected 2026-10-02):** Customer frontend is `zshivam`; backend is `database 2`; the intended admin is `ADMIN/Main_File/Sellzy_Dashboard`. The earlier `admin panel` starter was the wrong project and is stopped.
* **Storefront rule:** Reuse implemented routes and live catalog data. Generated imagery is illustrative; screenshots are references. Never invent inventory, verification records, or counts. The current product summary and default lab-report page do not prove a specific SKU/batch has a passing report.
* **Design:** Forest/cream/sage/terracotta/amber palette, sentence-case UI, responsive layout, accessible navigation and controls, restrained motion with reduced-motion support. See `patterns.md` and `decisions.md` for details.
* **Customer flow (2026-09):** Carry the storefront palette through auth and bag/checkout, keep the footer white with an Allura script slogan, and expose the existing `/wishlist` route from the header.
* **Local sign-in:** The backend `dev` profile on port 8080 supports mock OTP `123456` for local testing; API/browser verification succeeded. Seeded password hashes are invalid placeholders, so seeded password login fails. This local OTP setting is not a production credential.
* **Account surfaces (2026-09):** Signed-in dropdown and responsive account pages share storefront colors; dropdown has no pointer and supports Escape focus return. The homepage's local Truzov Standards SVG tilts subtly, with reduced-motion support. It is process artwork, not product-specific lab evidence.
* **Motion (2026-09):** Storefront motion stays CSS-only and restrained: entrances, fine-pointer hover feedback, and supported scroll reveals. Account navigation reuses Lucide SVG icons; no motion dependency was added. Reduced-motion disables storefront effects.
* **Live preview (2026-09-30):** Local frontend `:3000` and backend `dev` `:8080` with PostgreSQL `:5434` displayed three real products. Homepage preview merges `/products` and `/home`, deduplicates and caps at four, shows stock state, and badges only products with a verified flag plus passing report ID. The report lookup is still first-page-only and cannot prove the current batch; see `mistakes.md`.
* **Latest polish:** Local licensed fonts ensure customer Inter actually renders; Allura remains the footer script. Shared Logo now uses the user's final `ChatGPT Image Sep 30, 2026, 05_16_16 PM.png`, copied unchanged to `public/truzov-logo-final.png`, across all wordmark placements. Address dialog fields scroll with actions visible. Unknown-account login carries a normalized signup draft in memory, clears stale OTP state and still requires fresh verification. Backend code is unchanged; auth review was focused, not exhaustive. See `qa-report.md` for final checks.
UI icons use official Lucide with shared1.75px strokes and role-based sizes; search has a10px icon gap. Account/cart/category roles are consistent across customer pages.
* **Current test setup (2026-10-02):** Backend :8080 selects Neon from `database 2/.env` (not `.env.branch`), superseding local PostgreSQL :5434. Correct admin :3001 is `ADMIN/Main_File/Sellzy_Dashboard`; storefront :3000. Fixed test admin uses existing BCrypt/normal role-checked auth. Manual `seed-demo.ps1` (PowerShell 7.2+) adds twelve labelled demo products with Cloudinary imagery and no lab/certification/review claims; 21 products total, rerun creates none. Real records preserved. Cloudinary fallback may use `.env.branch`, never its DB. See `database 2/DEMO_SETUP.md` and backend reports.
* **Render repair (2026-10-03):** Branch `feat/admin-panel-integration`, unchanged `f4ce79f`, is live after removing the assignment prefix from Render's `CLOUDINARY_URL` value via an environment merge. Products/categories 200; unauthenticated admin stats 401. Default profile still has mock OTP/ephemeral JWT: repair verified, production readiness and uploads unverified. See backend `qa-report.md`; keep hosted URI values free of assignment prefixes.
* **Eight marketplace fixes (2026-10-04, local):** Correct ADMIN sign-in branded; sort numbers stay editable strings until submit. Product quantity is editable and before details on mobile; account settings redirects to profile; mobile menu logs out. Checkout sends selected server line IDs and coupon code, retains other lines, and uses server-validated discount snapshots/per-user redemption limits. Seller website applications persist separately and appear in protected admin support. Product/variant stock reserves atomically; legacy-aware cancellation restores only stock actually reserved. Frontend 137 tests, admin 14, backend 287 unit + 6 isolated PostgreSQL integration tests and builds passed; browser checks passed. Deploy backend migration/API before frontends. Source changes are not pushed/deployed; see current root QA/review reports.

* Hosted rollout (2026-10-04): PRs31/11/2 pushed; Render backend bb5cf86 migration live, storefront ae525d6 and admin24f9489 production Ready. Vercel distDir fix uses .next when VERCEL is set. Backend CI372 tests pass but7 SpotBugs findings are under follow-up. Earlier local-only statements above are historical.

* PR #31 CI follow-up 6c26a04 reviewed: defensive collection snapshots, narrow Spring repository proxy exclusion; 287 local units and zero SpotBugs findings. GitHub replacement checks and Render rollout pending at push.

* Review fixes (2026-10-08, local source): checked all twelve items first; reused DB categories/tickets/onboarding. Added scoped panel auth, unused Firebase removal, header overlay/gap/breakpoint fixes, real /offers, lowercase brand/icons, admin auto/manual product flags/create/edit/rules settings and storefront /support/tickets. Featured/Live manual; existing flags preserved, new Auto. Onboarding unchanged. Forward V202610080100 migration verified on fresh/upgrade fixtures, unapplied live. Source review/diff checks, tests/builds and six browser checks passed; measured timing remains unverified. No push/deploy/live mutation. See FINDINGS.md and docs/review-fixes-report.md.

## Review fixes validation — 2026-10-08
Docker engine became available; user authorized temporary matching toolchain downloads. Passed storefront 142 tests/51-page production build, admin 20 tests/89-page production build, both typechecks, backend 291 unit + 117 affected integration tests, packaging/SpotBugs, fresh Flyway and existing-data SQL upgrade preservation/removal/defaults. Isolated no-network/readonly/scratch-only/env-allowlist/resource-capped execution; no live migration or deployment. All six Chromium header checks passed with full category navigation after explicit min-[1536px] header variants corrected the custom 1440px 2xl breakpoint; final storefront production build passed again. qa-report.md is authoritative. Admin build required two existing Next.js route parameter type fixes.

* Review fixes production rollout (2026-10-08): user authorized commit/live release via Render/Vercel. Backend e63ee0d live with V202610080100 applied; storefront fbea22b and admin7b73cd8 production READY. Public offers/products/categories and new frontend pages200; admin unauthorized401. Backend GitHub CI291 units+376 IT passed, SpotBugs0. Trivy image gate fails on two affected Spring dependency CVEs with no identified source reachability (XSLT/SSE view fragments); independent triage, no suppression/risk acceptance. Vercel runtime-log access403. See docs/review-fixes-release-20261008.md.
