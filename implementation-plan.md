# Truzov storefront redesign: implementation plan

## Scope and source of truth

Redesign the customer-facing frontend in `zshivam` using the supplied mobile and desktop references and `truzov-homepage-design-spec.md` as visual/copy guidance. Preserve existing application routes, catalog/cart/auth behavior, and the backend in `database 2`. The reference's example products, counts, and claims are illustrative; only live API data may be presented as facts.

## Existing architecture

- Next.js App Router keeps `/` minimal in `app/(shop)/page.tsx`; `HomeScreen` lives in `components/screens/CustomerScreens.tsx`, wrapped by `ShopLayout` (`Header`, `Footer`, `MobileNav`).
- `useHome()` fetches `GET /home` through React Query and supplies categories, best sellers, arrivals, featured, and banners. `useBanners('hero')` is a conditional fallback because `/home` may return no banners.
- Catalog product summaries expose `isLabVerified` but no per-SKU report ID. Detail has `verificationStatus`; reports have a separate `/lab-reports` feed. Do not invent a verification record, date, or count. Use only backend-approved/verified products for verified sections and badges; a more specific per-SKU report claim needs a joined record that this summary contract currently lacks.
- Existing routes include `/products`, `/products?labVerified=true`, `/category/[slug]`, `/products/[slug]`, `/trust/how-it-works`, `/trust/lab-reports`, `/vendor/register`, `/support/seller`, `/policies/privacy-policy`, and `/policies/terms-of-service`. Reuse them. There is no About, Careers, or newsletter endpoint in the current frontend contract; do not add dead links or a fake signup.

## Implementation

1. Establish a storefront-scoped visual system in `tailwind.config.ts` / `app/globals.css`: forest green, cream, sage, terracotta, amber; clean sans headings/body; regular and medium weight; responsive spacing and 44px touch targets. Avoid changing dashboard/auth visual semantics accidentally, since they share global tokens. Support `prefers-reduced-motion`.
2. Update the shared customer shell (`Header`, `Footer`, `MobileNav`, `Logo`) to the reference layout: compact sticky header, functional search/cart/account, desktop category/process links, accessible mobile menu, and responsive footer. Keep existing destinations and current auth/cart handlers. Show only actionable footer links; newsletter needs a working integration or should be omitted. Ensure sticky header and bottom nav do not hide anchors or page content.
3. Recompose `HomeScreen` in reference order: forest hero, four trust points, paired category cards, verified products, gift-oriented discovery, a four-step verification explanation, coral mission block, forest seller CTA, and dark footer. The verification steps must describe the real submission, lab testing, review, and approved listing flow, with `/trust/how-it-works` as the destination. Gift discovery should curate existing products and link to live product/catalog routes; there is no gift-card endpoint, so do not imply gift cards can be purchased. Use live category slugs and product URLs, `/products?labVerified=true`, and `/vendor/register` for application. Empty data should produce useful navigation/empty states without fabricated products or statistics. Keep API loading/error behavior.
4. Replace the current automatic marquee with a responsive product grid on desktop and user-controlled horizontal scroll on mobile. Reuse `ProductCard` where feasible; keep image fallback behavior, correct product pricing, and verified badges gated by `isLabVerified`. Animate entrance/hover/scroll sparingly with CSS or the installed Framer Motion; no perpetual motion and no hidden content when JavaScript or reduced motion is active.
5. Add deliberate hero/category photography or generated assets in `public/` with useful alt text, responsive `next/image` sizing, and background placeholders. Do not reuse the screenshot as site imagery. If visual generation is unavailable, keep a polished CSS composition using real catalog images rather than generic external stock.
6. Review linked customer pages (`/products`, category, search, product detail, trust pages) for shell, typography, spacing, and CTA consistency at mobile/tablet/desktop widths without refactoring workspace routes.

## Verification

- Run lint, typecheck, build, and relevant Vitest/Playwright tests; inspect existing unrelated changes before resolving failures.
- Browser-check 375/428px mobile, tablet, and desktop for header/menu/search/cart, category and product navigation, seller CTA, keyboard focus, overflow, image loading, and reduced motion.
- Confirm no dead links or placeholder counts/claims. Use the existing backend configuration for live data if available; a local database is only needed if the API cannot supply representative data and may be created without backend code changes.

## Dependency implications

No new runtime dependency or backend change is required. Existing Lucide icons, Tailwind, `next/image`, React Query, and optional Framer Motion cover the design. The separate `admin panel` project remains untouched.

## Follow-up: site-wide polish and sign-in (2026-09-27)

The four newer screenshots are visual references, not assets to embed. Keep the current forest/cream/sage/coral/amber homepage palette and existing routes/data contracts. Coordinate edits in the already modified frontend files; preserve unrelated local changes.

1. Give the homepage hero breathing room below the sticky header at desktop, tablet, and mobile widths without breaking the sticky navigation or trust strip. The hero is in `components/screens/HomeScreen.tsx`; the shared header is `components/layout/Header.tsx`.
2. Render the footer maxim ("good products. checked first.") in a restrained, legible cursive face while keeping other footer copy readable. Change `components/layout/Footer.tsx` to a white footer with forest text, matching the homepage palette. Check contrast and accordion dividers on mobile. Load one font only if the current CSS/font stack cannot provide the requested script style.
3. Apply the same visual tokens and spacing to the customer experience: storefront catalog/category/search/product detail and trust pages (`components/screens/CustomerScreens.tsx`); sign-in and signup modal/forms (`components/auth/AuthModal.tsx`, `AuthForm.tsx`, `LoginForm.tsx`, `SignupForm.tsx`, `OTPVerification.tsx`); bag/checkout (`components/checkout/CheckoutScreens.tsx`, `BagItemRow.tsx`, `CheckoutPriceDetails.tsx`, `CheckoutLayout.tsx`). Include account/wishlist/support/policy pages where their UI visibly conflicts. Prefer shared classes/tokens over page-specific duplicates. Avoid changing the separate admin panel or backend code for appearance.
4. Restore a visible heart icon in the shared desktop header (`components/layout/Header.tsx`) linking to existing `/wishlist`, with an accessible label and touch target. Verify the existing mobile wishlist entry remains reachable and any product-card wishlist controls remain usable.
5. Diagnose sign-in with actual local API responses before changing behavior. `LoginForm` calls `POST /auth/account/exists`, then `POST /auth/otp/send`; `OTPVerification` calls `POST /auth/otp/verify`. The frontend uses `NEXT_PUBLIC_API_URL=http://localhost:8080`. Local GET `/actuator/health` and `/api/v1/home` return 200; Docker PostgreSQL is healthy and has nine active users. The backend dev profile defaults to mock OTP code `123456` (`application-dev.yml`); SMTP is not required for this local mode. Test a known account through the modal, including response errors, token storage, return to `/cart`, and guest-cart merge. Also test unknown account transition to signup. Fix verified frontend defects; preserve backend auth and database security contracts. If local backend runs outside the dev profile, first establish the active profile/OTP mode from its process or logs rather than assuming mock delivery.
6. Verify mobile (375/428px), tablet, and desktop for hero offset, footer, modal scroll/focus, checkout layout, wishlist navigation, horizontal overflow, and reduced motion. Run targeted auth/cart tests, typecheck, and build. Distinguish pre-existing lint issues from changed-file failures.

## Follow-up: account menu, standards seal, and account page (2026-09-28)

Use the existing forest/cream/sage storefront palette. Restyle the signed-in account dropdown without changing its five destinations or logout behavior; remove its decorative pointer and keep keyboard Escape/focus behavior. Replace the footer's plain standards circle with a local vector seal bearing the exact Truzov Standards text and a subtle tilt disabled for reduced motion. Update the shared account shell/sidebar and profile panel for desktop, tablet, and narrow phones while preserving profile edit, verification, and account routing. Verify visually, run typecheck/lint/build, and keep the backend unchanged.

## Follow-up: restrained motion and SVG details

Add only native CSS motion: short entrance cues for the existing hero note, account welcome area, and menus; hover feedback on navigation, verification steps, and product cards. Reuse installed Lucide SVG icons in the account navigation. Keep touch layouts steady and remove animation, hover displacement, and smooth scrolling under `prefers-reduced-motion`. No animation dependency or JavaScript observer is needed.

## Follow-up: standards seal refresh

Replace the existing light-outline standards SVG with a higher-contrast forest seal that remains legible at mobile footer size. Increase desktop size modestly and shorten the gentle tilt from 8 seconds to about 3 seconds. Preserve its accessible name and reduced-motion override; do not change the header wordmark or footer links.

## Follow-up: local preview with multiple real products (2026-09-30)

The existing frontend and backend are listening on localhost ports 3000 and 8080. Live `GET /api/v1/home` and `/products` return three distinct products: honey, ghee, and coconut oil. Only honey has `isLabVerified: true` and a passing `/lab-reports` record. `HomeScreen.tsx` currently shows only products matching both flags in a section titled “recently verified,” so one card is accurate; repeating it or labelling the other two verified would be misleading.

1. Change the existing product row into an “explore the collection” section fed by `/products` and deduplicated `/home` items so it can fill up to four slots. Show the true stock state, and reserve the lab badge for items with both the verified flag and a passing report. Let the section render while reports load. Reuse the existing URL/image/price helpers and link each card to its real `/products/[slug]` route.
2. Ensure the live local backend remains the frontend data source (`NEXT_PUBLIC_API_URL=http://localhost:8080`), and preview the homepage at localhost:3000. Do not seed invented inventory or change backend code merely to fill a visual grid. If the catalog grows, the section should naturally show more distinct items.
3. Verify API-to-UI identity, badge visibility, product detail links, mobile horizontal overflow, and desktop card spacing. Run typecheck and targeted storefront tests. Report that the current local catalog has three products and one report-backed verified product; the requested broader selection requires additional legitimate catalog records.

## Follow-up: consistent customer typography and UI (2026-09-30)

The root `app/globals.css` sets body to Inter but all `h1`–`h6` to Lora at weight 600. `.storefront` and `.checkout-shell` override only `h1`–`h3`; `.font-heading` maps to Lora in Tailwind outside those selectors. The header/footer logo deliberately uses `font-serif`, and the footer maxim uses Allura. Consequently an `h4`–`h6`, an unscoped heading utility, or a nested customer component can still pick up Lora, while homepage headings use Inter/500. Root font loading currently requests Inter, Lora, and Allura from Google Fonts.

1. Establish one scoped customer typography rule for `.storefront`, `.checkout-shell`, and `.auth-surface`: Inter for body, all heading levels, form controls, and `.font-heading`; normal/medium weights and the homepage's restrained tracking. Keep the script maxim as a deliberate exception. Decide whether the wordmark remains serif as a brand mark; avoid leaving any other accidental Lora usage. Do not alter admin, vendor, or lab typography.
2. Harmonize the `/products` listing and reusable `ProductCard` with homepage typography, forest text/buttons, cream surfaces, sage borders, terracotta accents, and consistent card/grid spacing. Preserve filtering, pagination, cart/wishlist actions, live product data, and evidence-gated badges.
3. Apply the same shared visual language to account index and subpages (`/account/orders`, order detail, addresses, settings), `/wishlist`, `/cart`, checkout address/payment/confirmation, and their loading, empty, and error states. Reuse existing components and behaviors; tune hierarchy, control size, spacing, surfaces, and focus states rather than replacing route logic.
4. Validate at 375/428px, tablet, and desktop: computed fonts/weights, heading scale, form controls, card alignment, no clipped navigation or horizontal overflow, minimum 44px interactive targets, keyboard focus, and reduced motion. Run typecheck, lint on touched files, build, and relevant storefront/account/checkout tests.

## Follow-up: supplied logo, address form, and signup handoff (2026-09-30)

Recreate the supplied leaf wordmark as a local SVG in forest and muted sage, preserving its lettering and transparent background. Reuse the Logo component across navigation, footer, authentication and checkout. Remove the homepage eyebrow's pill background while retaining its text.

Fix input grid overflow at the shared Input primitive. Group address fields by contact, delivery and preferences, give street fields full width, and keep the modal heading and actions visible while only fields scroll. Preserve address validation and API payloads.

Retain the normalized email or phone in memory when account lookup switches login to signup. Prefilling must never count as verification; OTP and backend checks still apply. Restyle authentication dialogs using the existing customer theme and review the narrow authentication flow in database 2. Validate identifier transfer, phone/desktop dialogs, keyboard focus, and security behavior.

## Follow-up: use the final supplied PNG logo (2026-09-30)

Copy the user's `trzov ogo.png` unchanged into public assets. Point the shared Logo and organization metadata at that image, preserving responsive sizing and the existing dark-background variant. Check all wordmark placements and the rendered image at mobile and desktop widths.
Latest logo replacement: use ChatGPT Image Sep 30, 2026, 05_16_16 PM.png unchanged as public/truzov-logo-final.png. New asset URL ensures browsers receive the updated image.
Reduce logo widths by about15percent to better match navigation scale; retain native aspect ratio and existing accessible link target.

Icon refinement (2026-09-30): reuse official Lucide components demonstrated by shadcn resources. Apply one1.75px SVG stroke, retain semantic colours and icon dimensions by role. Use CircleUserRound/ShoppingCart for account/cart, LayoutGrid for categories, Droplets/Utensils for care/food, and SVG chevrons/arrows instead of text symbols. Keep44px targets, accessible labels, active/disabled states and routes. Verify375/1440 render and search cursor spacing; run types/lint and existingtests.

## Follow-up: fixed admin and database-backed demo catalogue (2026-10-02)

The authorized admin application is `ADMIN/Main_File/Sellzy_Dashboard`, not the separate Clerk dashboard starter. Use the backend in `database 2` and the Neon database selected by that backend's `.env` (not `.env.branch`). Preserve unrelated storefront work.

1. Provision one fixed administrator email and password through the existing database account model. Store the password as a BCrypt hash; keep the normal backend authentication, admin role checks, and token handling. Verify a real login through the intended admin application and give the user the working credentials.
2. Add and manually apply `database 2/src/main/resources/db/seed/data-demo.sql` after Flyway migrations. Its transaction creates an isolated demo seller, four demo categories, twelve published demo products, images, and pack variants. Inserts are idempotent and do not overwrite real catalogue rows. The seller owner account is disabled; products retain pending verification with no lab claims, no fabricated reviews, and no certification entries.
3. Upload sample source photographs to the configured Cloudinary account and replace the seed image URLs with the returned secure URLs before applying it. Database rows store image references; Cloudinary stores image media. Never expose database or image service secrets in logs or the frontend.
4. Keep all product reads on the existing backend API and Neon tables. Do not add frontend arrays or mock API responses. Verify catalogue, home sections, individual product details, and admin product listing return the saved rows across application restarts.
5. Verify the backend uses Neon, local frontend and admin origin configuration/CORS are connected, and Render-compatible datasource/migration configuration remains intact. Report deployment status accurately; local testing does not establish a Render deployment.

Validation: fixed admin valid and invalid password responses, role authorization, seed rerun without duplication, at least twelve demo rows from the API, image accessibility, browser display, and relevant existing tests/build checks. Document outcomes in review/QA reports and Project Brain.

## Checkout route recovery (2026-10-02)
Pin Turbopack root to frontend workspace and use an ignored .next-build directory to avoid stale/locked generated artifacts. Preserve existing checkout and authentication logic. Verify checkout routes, browser sign-in gate, and targeted cart/auth/API tests.


## Admin Truzov branding
Replace old sidebar wordmarks with the unchanged transparent approved Truzov PNG, apply forest/cream/sage semantic tokens and amber/terracotta order-chart colors. Keep existing dashboard structure and database integration.

## Eight marketplace fixes (2026-10-04)

Scope spans this storefront, `../database 2` backend, and the existing `../ADMIN/Main_File/Sellzy_Dashboard` admin. Preserve existing working-tree changes. Reuse API wrappers, query hooks, approved logo, theme tokens, and authenticated server contracts. No push or hosted deployment is implied by this local implementation request.

1. **Admin login branding:** Reuse the approved transparent Truzov PNG and forest/cream/sage palette on the live admin login flow. Keep role-checked authentication intact.
2. **Editable admin sort order:** Numeric fields must hold a string draft while editing so zero can be cleared and replaced. Parse and validate only on submit/blur as appropriate; persist genuine numeric zero and reject invalid/noninteger/out-of-range values. Apply to the live resource forms rather than unused template tables.
3. **Visible product quantity:** A quantity stepper already exists in `ProductDetailScreen`, but its purchase aside follows all descriptive tabs on narrow layouts. Put purchase controls beside the product summary on desktop and before long descriptions on mobile. Keep one quantity state, current variant, stock ceiling, and add/buy payload. Verify adding quantity three yields the real server cart quantity three.
4. **Persist seller applications:** The current anonymous seller form only sets local success state. Add public `POST /api/v1/support/seller-applications` with `{brand,contact,email,phone,category,website?,gstin?,about?}` and a 201 envelope containing `{id,submittedAt}`. Persist in a separate `seller_applications` table without creating fake users or opening existing authenticated ticket endpoints. Validate lengths/contact fields/HTTP(S) website and apply existing abuse controls. Add authenticated admin `GET /api/v1/admin/support/seller-applications?page=1&limit=20` returning `PagedData` with original fields, id, status, createdAt. Show these in the existing admin support surface. Display success only after persistence; preserve entered data on failure and show the returned reference.
5. **Real offers/coupons:** Existing admin coupon CRUD stores flat `couponAmount`, `minAmount`, `userLimit`, eligible `productIds`, start/end dates and active status; storefront application does not exist. Add a storefront offers entry and coupon input in selected-cart checkout. Proposed authenticated `POST /api/v1/coupons/validate` takes `{code,cartItemIds?}` and returns `{code,discountAmount,subtotal,total}` in the API envelope. If public offers are listed, expose only currently usable coupon metadata through a dedicated public listing. Normalize code consistently; validate dates/status/minimum spend/product scope and per-user usage on server. Recompute discount within checkout, cap it at eligible merchandise subtotal, and persist order coupon/discount snapshot plus redemptions. Do not trust preview prices or send client-controlled totals. Backend/frontend developers must agree final DTO fields before integration.
6. **Checkout selected cart lines:** Extend checkout to `{addressId,cartItemIds?,couponCode?}`. Omitted IDs retain existing all-cart behavior; explicit empty selection fails. IDs are cart-line IDs, not product IDs, because variants create distinct lines. Reject duplicates/missing/foreign IDs with a clear client error. Lock and price current selected lines, reserve their stock, and remove only those lines atomically; untouched lines remain in cart. Carry selected IDs from bag through address/payment, reconcile removed lines, disable checkout with no selection, and recompute displayed selected totals. New idempotency intent must reflect changed selection/coupon; retries retain the original key.
7. **Remove account settings option:** Remove customer settings links from shared account navigation and menu while retaining unrelated workspace settings and customer profile/address/orders flows.
8. **Mobile logout:** The existing account menu is hidden below desktop and the mobile menu lacks logout. Add a signed-in mobile logout action reusing the actual auth logout/token/cache cleanup and routing behavior; close the menu and expose pending/failure states consistently. Logged-out users must not see logout.

### Required verification

Backend tests cover subset checkout ownership/empty selection, untouched lines, stock rollback, current pricing, coupon date/status/minimum/eligible-product/user-limit rejection, and concurrent redemption safety. Verify anonymous application persistence and admin-only reads; existing support-ticket ownership remains enforced. Add migrations rather than modifying applied migrations.

Frontend/admin tests cover blank-to-number sort editing including zero, actual API payloads, seller failure/success reference, coupon preview failure and checkout recomputation, line-selection reconciliation, visible mobile quantity and logout, removed settings links, and unchanged admin login authentication. Run relevant Vitest/typecheck/build suites and focused browser checks at mobile and desktop sizes. Record evidence in review/QA reports and Project Brain; do not claim end-to-end success from mocked responses alone.


## Review fixes — 2026-10-08
See docs/plans/review-fixes-20261008.md. Check existing work before editing; only missing fixes are in scope. FINDINGS.md records investigations before implementation.
