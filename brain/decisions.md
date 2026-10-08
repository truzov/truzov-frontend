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

---

## Decision 6: Truzov Customer Storefront Direction
* **Status:** Active design direction (2026-09)
* **Context:** Redesign the customer frontend across mobile, tablet, and desktop using the supplied homepage brief and screenshots.
* **Decision:** Use the forest/cream/sage/terracotta/amber palette, restrained motion, product and process imagery made for Truzov, and a coherent responsive shell. Treat the screenshots as layout references and keep existing navigation routes and frontend API behavior. The backend and separate admin panel are outside this redesign.
* **Trust constraint:** Present verification badges and statistics only with appropriate live evidence. The design brief's example product names, counts, gift-card, newsletter, About, and Careers links do not authorize fabricated content or dead controls.

## Decision 7: Shared Customer Journey Styling and Local Auth
* **Status:** Active (2026-09)
* **Decision:** Extend the storefront palette to the auth modal/pages and bag/checkout using scoped styles; keep the footer white with an Allura script slogan and make the existing wishlist route visible in the header. Preserve frontend routes and backend contracts.
* **Local development:** Run the backend with its `dev` profile to enable mock OTP `123456` during local testing. Do not change backend code or treat seeded placeholder passwords as usable credentials.

## Decision 8: Account Navigation and Standards Seal
* **Status:** Active (2026-09)
* **Decision:** Apply the storefront palette to the signed-in account menu and account pages, retaining existing links and keyboard behavior. Replace the homepage's plain text standards circle with a local SVG seal and subtle reduced-motion-safe tilt. The seal conveys Truzov's process, not a per-product certification claim.

## Decision 9: Restrained Storefront Motion
* **Status:** Active (2026-09)
* **Decision:** Add brief native CSS entrance and hover motion to the customer storefront, with supported view-timeline reveals for sections. Reuse existing Lucide SVG icons in account navigation and add no animation dependency. The storefront's reduced-motion rule disables animations, transitions, smooth scrolling, and hover transforms.

## Decision 10: Live Homepage Collection Preview
* **Status:** Implemented (2026-09-30)
* **Decision:** Show up to four distinct current products from the live `/products` list plus `/home` fallback. Keep the collection label general, show stock availability, and gate individual lab badges on the product flag plus a passing report ID. Reuse product routes and leave backend code/data unchanged.

## Decision 11: Local Fonts and Shared Customer Theme
* **Status:** Implemented (2026-09-30)
* **Decision:** Self-host licensed Inter, Allura and Lora to remove remote-loading fallback differences. Use Inter throughout scoped customer screens and primitives, retain Allura only for the footer script, and preserve separate workspace typography. Reuse installed styling/icon utilities without a new dependency.

## Decision 12: Vector Wordmark and Usable Address Dialog
* **Status:** Implemented (2026-09-30)
* **Decision:** Recreate the supplied leaf wordmark in the existing forest palette using true lettering outlines and smooth leaf geometry in a shared SVG asset. A small raster trace was replaced after the user identified its jagged appearance. Keep address dialog heading/actions fixed, scroll the fields, and correct shared input grid sizing without changing address contracts.

## Decision 13: Signup Identifier Continuity
* **Status:** Implemented (2026-09-30)
* **Decision:** Reuse the existing auth store for an in-memory normalized email/phone draft across login-to-signup transitions; reset stale OTP state and require fresh verification. No backend change is needed for this frontend continuity defect. The existing account lookup's presence disclosure and IP limits were inspected as a narrow security tradeoff; broader authentication auditing is outside this result.

Final supplied PNG is the authoritative Truzov wordmark and supersedes the reconstructed SVG for all rendered Logo placements.
Curated Lucide variants and shared optical styling provide consistent UI icons without adding an icon dependency or replacing functional components.

## Decision 14: Configuration-only Render Deployment Repair
* **Status:** Verified (2026-10-03)
* **Decision:** Remove the assignment prefix from the existing Render `CLOUDINARY_URL` value through a merge update using the matching existing account. Preserve other environment variables, branch commit `f4ce79f`, source, migrations, and startup safeguards.
* **Evidence and boundary:** Deployment `dep-db0055psrm7s73djlhm0` is live; products/categories return 200 and unauthenticated admin stats returns 401. Default profile, mock OTP, and ephemeral JWT remain; production readiness and Cloudinary uploads were not established. See backend `qa-report.md`.

## Decision 15: Real selected checkout and shared admin workflows
* **Status:** Implemented and locally verified (2026-10-04), not deployed.
* **Decision:** Extend checkout with optional selected line IDs and coupon code; omitted IDs retain legacy whole-cart behavior, explicit empty/duplicate/missing/foreign selections reject. Reuse admin-managed flat coupons, enforce eligibility and per-user placed-order redemption limits transactionally, and retain discount snapshots on orders. Preserve unselected cart lines.
* **Seller intake:** Anonymous website applications have separate storage and protected admin listing; existing authenticated support tickets retain their ownership model.
* **UI:** Use approved Truzov assets in actual ADMIN sign-in, clearable numeric drafts, accessible mobile quantity/logout controls, and remove settings navigation with an old-route redirect. Deploy backend migration/contracts before frontends. See QA/review reports for isolated database and browser evidence.

## Decision 16: Deploy latest PR branches without merging
Use existing production services and domains. Vercel storefront tracks feat/storefront-redesign; admin now tracks codex/truzov-admin-branding and rebuilds previews with production environment. Hosted Next.js output stays .next while local build isolation stays .next-build.

* CI follow-up: use defensive request/record snapshots; preserve existing Bean Validation behavior. Repository proxy exclusion is narrowly scoped rather than disabling representation checks globally.

## Decision 17: Review-fix reuse and flag defaults (2026-10-08)
Source implemented; runtime validation pending. Featured and publication remain manual. New products default to Auto; migration preserves existing booleans as manual overrides. New window defaults 30 days; bestseller counts at least 10 paid, non-cancelled/non-returned units over 30 days. Admin /settings/product-flags adjusts rules; time expiry refreshed each minute. Vendor manual flag setting stays disallowed. Preserve verified identity/KYC onboarding pending user confirmation of any redesign. No live deployment authorized or performed in this task.

2026-10-08: User permits temporary matching toolchain downloads for verification; project dependencies unchanged. No live migration/deployment is authorized by these local checks.
