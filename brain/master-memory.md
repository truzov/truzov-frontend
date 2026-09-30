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

* **Current storefront work (2026-09):** Redesign the customer frontend in `zshivam` using the Truzov homepage brief. The backend is in `database 2`; the separate admin panel is in `admin panel`. Keep both outside frontend design edits.
* **Storefront rule:** Reuse implemented routes and live catalog data. Generated imagery is illustrative; screenshots are references. Never invent inventory, verification records, or counts. The current product summary and default lab-report page do not prove a specific SKU/batch has a passing report.
* **Design:** Forest/cream/sage/terracotta/amber palette, sentence-case UI, responsive layout, accessible navigation and controls, restrained motion with reduced-motion support. See `patterns.md` and `decisions.md` for details.
* **Customer flow (2026-09):** Carry the storefront palette through auth and bag/checkout, keep the footer white with an Allura script slogan, and expose the existing `/wishlist` route from the header.
* **Local sign-in:** The backend `dev` profile on port 8080 supports mock OTP `123456` for local testing; API/browser verification succeeded. Seeded password hashes are invalid placeholders, so seeded password login fails. This local OTP setting is not a production credential.
* **Account surfaces (2026-09):** Signed-in dropdown and responsive account pages share storefront colors; dropdown has no pointer and supports Escape focus return. The homepage's local Truzov Standards SVG tilts subtly, with reduced-motion support. It is process artwork, not product-specific lab evidence.
* **Motion (2026-09):** Storefront motion stays CSS-only and restrained: entrances, fine-pointer hover feedback, and supported scroll reveals. Account navigation reuses Lucide SVG icons; no motion dependency was added. Reduced-motion disables storefront effects.
* **Live preview (2026-09-30):** Local frontend `:3000` and backend `dev` `:8080` with PostgreSQL `:5434` displayed three real products. Homepage preview merges `/products` and `/home`, deduplicates and caps at four, shows stock state, and badges only products with a verified flag plus passing report ID. The report lookup is still first-page-only and cannot prove the current batch; see `mistakes.md`.
* **Latest polish:** Local licensed fonts ensure customer Inter actually renders; Allura remains the footer script. Shared Logo now uses the user's final `ChatGPT Image Sep 30, 2026, 05_16_16 PM.png`, copied unchanged to `public/truzov-logo-final.png`, across all wordmark placements. Address dialog fields scroll with actions visible. Unknown-account login carries a normalized signup draft in memory, clears stale OTP state and still requires fresh verification. Backend code is unchanged; auth review was focused, not exhaustive. See `qa-report.md` for final checks.
UI icons use official Lucide with shared1.75px strokes and role-based sizes; search has a10px icon gap. Account/cart/category roles are consistent across customer pages.
