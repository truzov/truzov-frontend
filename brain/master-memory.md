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

* **Phase 2 (Active):** Transitioning custom stores and components from local MSW mocking to a live backend database API service.
* **Phase 3 (Next):** Automatically parsing PDF documents for pesticide/heavy metal results within the Lab Portal.
