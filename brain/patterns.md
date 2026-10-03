# Approved Coding & Implementation Patterns: Truzov

To maintain consistency and code reuse across the application, developers should follow these established implementation patterns.

---

## 1. Page-Screen Consolidation Pattern
* **Rule:** Next.js route pages (`app/**/page.tsx`) must remain minimal. They should only handle static configuration (like titles, metadata, revalidate constants, or page metadata) and import their corresponding layout screens from `@/components/screens/`.
* **Rationale:** Keeps route logic isolated, allows screens to be highly reusable, and facilitates easier unit testing and layout modularity.
* **Example:**
  ```tsx
  // app/(shop)/page.tsx
  import type { Metadata } from 'next';
  import { HomeScreen } from '@/components/screens/CustomerScreens';

  export const revalidate = 60;
  export const metadata: Metadata = {
    title: 'Verified Organic Marketplace',
    description: 'Shop lab-verified organic products with transparent reports.',
  };

  export default function Page() {
    return <HomeScreen />;
  }
  ```

---

## 2. Client-Side Route Protection Pattern
* **Rule:** Secure pages must use the `useProtectedRoute` custom React hook within their component body to enforce user login status and handle automatic redirect query parameters.
* **Rationale:** Ensures unified client-side checking and carries the user's return location seamlessly.
* **Example:**
  ```tsx
  'use client';
  import { useProtectedRoute } from '@/hooks/useProtectedRoute';

  export function SecureDashboard() {
    const { isLoggedIn, isLoading } = useProtectedRoute('/login');

    if (isLoading || !isLoggedIn) {
      return <LoadingSpinner />;
    }

    return <div>Protected Content</div>;
  }
  ```

---

## 3. Zustand Persistent Store Pattern
* **Rule:** Stores that must survive page reloads (e.g. user authentication tokens, persistent cart/wishlist state) must implement Zustand's `persist` middleware. All custom properties must handle undefined states cleanly to prevent hydration errors during Next.js rendering.
* **Key Guidelines:**
  * Define explicit TS interfaces for the state and actions.
  * Access local storage safely (avoiding reference errors during server-side compilation).
* **Example:**
  ```typescript
  import { create } from 'zustand';
  import { persist } from 'zustand/middleware';

  interface AuthState {
    token: string | null;
    setToken: (token: string | null) => void;
  }

  export const useAuthStore = create<AuthState>()(
    persist(
      (set) => ({
        token: null,
        setToken: (token) => set({ token }),
      }),
      {
        name: 'truzov-auth',
      }
    )
  );
  ```

---

## 4. Mock API Endpoint Pattern (MSW)
* **Rule:** Any mock endpoints must be added to the centralized handlers array (`mocks/handlers.ts`). Mocked responses should wrap returning data objects in the standardized JSON structure: `{ data: T, message?: string }`.
* **Example:**
  ```typescript
  import { http, HttpResponse } from 'msw';

  export const handlers = [
    http.get('*/api/v1/resource', () => {
      return HttpResponse.json({
        data: { id: 1, name: 'Sample Item' },
        message: 'Loaded successfully'
      });
    })
  ];
  ```

---

## 5. Customer Storefront Design Pattern
* Scope storefront colors and typography through the `storefront` shell and homepage classes so vendor, lab, auth, and admin workspaces keep their own semantics.
* Keep the `app/(shop)` page thin; place the homepage view in `components/screens/` and reuse the shared `Header`, `Footer`, and `MobileNav`.
* Use the Truzov palette (forest green, cream, sage, terracotta, amber), sentence-case copy, outline icons, responsive spacing, visible focus, 44px mobile controls, and reduced-motion support. Mobile product browsing may scroll horizontally; desktop uses a grid.
* Point CTAs to implemented routes. If category data is absent, label an `/products` fallback as all products. Do not render newsletter, gift-card, About, Careers, or other calls to action without a working destination.
* Product cards and verification copy must come from live API data. Never fill a sparse section with invented products, report counts, verification dates, or example metrics. A `lab verified` badge needs evidence for the listed item; a first page of reports is not a complete verification index.

## 6. Customer Journey Styling
* Use the shared `storefront`, `auth-surface`, and `checkout-shell` scopes for the forest/cream/sage/coral palette. Keep customer pages visually aligned without changing vendor, lab, or admin workspaces.
* Use real destinations such as `/wishlist` for visible header controls. Maintain keyboard focus styles and responsive spacing across modal, bag, and navigation surfaces.
* Local OTP testing uses the backend `dev` profile and mock code `123456`; do not present that code as a production sign-in path.

## 7. Account Menu and Trust Artwork
* Keep signed-in account navigation on its existing routes, with 44px minimum controls, conditional `aria-expanded`/`aria-controls`, outside-click dismissal, and Escape returning focus to the trigger. Avoid decorative pointers that overlap the header.
* Keep account page header, sidebar, and profile cards within the storefront palette across screen sizes. Use the local Truzov Standards SVG as an illustration, not proof of a specific product's lab result; disable its tilt under `prefers-reduced-motion`.

## 8. Storefront Motion
* Prefer small CSS transitions and supported view-timeline reveals over JavaScript observers or a motion package. Use the existing Lucide SVG icon set for account navigation instead of adding an icon dependency.
* Scope motion to the storefront, keep hover effects to fine pointers, and override all storefront animation, transition, smooth scrolling, and hover transforms for `prefers-reduced-motion: reduce`.

## 9. Homepage Collection Preview
* Use the live `/products` list for the homepage preview, fill a short result from `/home`, deduplicate by product ID, and cap the row at four. Link each card to its existing `/products/[slug]` page and “shop all” to `/products`.
* Show actual API name, image, price, and stock state. Reserve the `lab verified` badge for products with `isLabVerified` and a passing report product ID; the general collection itself makes no blanket verification claim.

## 10. Reliable Customer Typography and Brand Assets
* Keep licensed font files local under `public/fonts`; preload the main Latin Inter face and retain proper subsets. Verify the actual rendered font in browser tooling rather than trusting only a computed family or `document.fonts.check`.
* Scope the customer font, palette and primitive hooks to `storefront`, `checkout-shell` and `auth-surface`. Cover every heading level and `.font-heading`; preserve workspace typography and the deliberate footer script exception.
* Reuse the shared Logo and outlined `truzov-wordmark.svg`. Use genuine vector lettering and smooth geometry instead of scaling or tracing a tiny raster. Keep the home link accessible and dark-surface treatment legible.

## 11. Address Dialog Layout
* Constrain input labels, wrappers and fields with `min-w-0` and full width inside grids. Group contact, delivery and preference fields; give street lines enough width and retain existing validation/API payloads.
* Bound the modal by viewport height, keep its heading and action row visible, and let only the field region scroll. Preserve focus trapping, Escape handling, body scroll locking and 44px actions. Other Modal callers retain their default scrolling body.

## 12. Authentication Draft Transfer
* Carry normalized email/phone from unknown-account login into signup through existing in-memory auth state, not URL parameters or persisted identifier drafts.
* Clear stale OTP/session-step state when switching identifiers. Prefilling never authenticates: signup must request and verify a fresh OTP through the existing backend contract before obtaining a session.

All wordmark placements reuse components/layout/Logo.tsx; use the final supplied local PNG with native dimensions and responsive CSS sizing.
Use installed Lucide components for UI icons; global .lucide defines1.75px stroke and shrink0. Keep role-based sizes(20px navigation,18px input icons,24px section artwork), currentColor for semantics, decorative aria-hidden and labels on controls. Google brand artwork and Truzov assets remain separate.

## 13. Hosted Environment Value Repair
* Render environment value fields contain the URI alone; dotenv/shell files contain the variable assignment. Validate scheme and account identity without printing credentials.
* Correct a confirmed configuration defect with a merge update that preserves unrelated variables. Verify successful startup, live deployment status, and read-only API responses; record production-profile and authentication limitations separately.

## 14. Selected checkout, coupons, and seller applications
* Keep numerical input drafts as strings so users can clear/type values; normalize and validate only at submission/blur. Product quantity controls precede long descriptions on mobile and use actual product/variant ceilings.
* UI checkout selection identifies server cart lines; never delete unselected lines temporarily to simulate partial checkout. Server owns prices, discount eligibility, stock, and order creation. Order discount/code are immutable snapshots; redemption usage is per placed order.
* Quote keys include owner, selection, quantities and line totals. Disable ordering while a coupon is invalid/pending; revalidate at checkout and allow same-code retries. Random intent keys rotate when address/selection/quantity/coupon changes, remaining stable for unchanged retries.
* Public seller applications use separate bounded persistence with admin-only reads, not fake accounts or anonymous writes to authenticated ticket endpoints. Show success only after receiving a saved reference.
* Reserve product and variant stock together under deterministic locks. Record whether variant stock was reserved so legacy cancellation cannot inflate inventory.
