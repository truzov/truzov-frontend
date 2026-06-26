# Engineering Decisions: Truzov

This document records the foundational architectural decisions and tool selections made during the development of Truzov.

---

## Decision 1: Next.js App Router (v15/16)
* **Status:** Approved
* **Context:** Needed a framework supporting SSR, simple API endpoints, layout systems, and SEO features like metadata configurations out of the box.
* **Alternatives considered:** Vite + React (requires custom routers, page layouts, and manually managed SSR).
* **Rationale:** Next.js provides structured folders (App Router) which align perfectly with workspace separation (`admin`, `vendor`, `lab`), clean route groups, and automatic route performance splits.

---

## Decision 2: Zustand for Client State Management
* **Status:** Approved
* **Context:** Need to store authentication session keys, cart items, user UI layout preferences, and wishlist states globally.
* **Alternatives considered:** Redux Toolkit (too boilerplate-heavy), React Context (re-renders all child components, difficult persistence).
* **Rationale:** Zustand is a lightweight state library with minimal boilerplate. It integrates seamlessly with persistence middlewares, allowing states to survive browser reloads easily using simple local storage serialization.

---

## Decision 3: Mock Service Worker (MSW) for API Mocking
* **Status:** Approved
* **Context:** Need to develop, test, and iterate the entire frontend workspace features (Customer, Vendor, Admin, Lab) in isolation before the real backend database APIs are deployed.
* **Alternatives considered:** Local JSON server, mock services inside components.
* **Rationale:** MSW intercepts actual network requests at the browser service worker layer. This means `apiFetch` calls real-world URLs, and our components interact with authentic API structures. When switching to a real backend, we just disable the MSW flag and update `API_BASE_URL` without changing any component logic.

---

## Decision 4: Vanilla Tailwind CSS (v3/4)
* **Status:** Approved
* **Context:** Modern design requirement: vibrant color systems, sleek dashboards, fast loading, and clean typography.
* **Alternatives considered:** Styled Components (CSS-in-JS, adds bundle overhead), CSS Modules.
* **Rationale:** Tailwind offers utility classes and CSS properties which compile to raw static files. Using utility classes in combination with `class-variance-authority` (CVA) allows us to design premium interfaces while maintaining high speed and responsive layouts.

---

## Decision 5: Policy Curation and Structured Navigation Grouping
* **Status:** Approved
* **Context:** Need to support multiple separate policy pages (Refund Policy, Shipping Policy, Privacy Policy, Terms of Service) matching the website theme and easily accessible from the header and footer.
* **Alternatives considered:** Putting the policy text directly in page.tsx components or placing them outside route groupings.
* **Rationale:** Placing the routes under `app/(shop)/policies/` group automatically integrates them under `ShopLayout` (inheriting Header/Footer). Storing the screens in `components/screens/PolicyScreens.tsx` adheres to the Page-Screen Consolidation Pattern, keeping pages lightweight and modular.
