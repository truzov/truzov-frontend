# Frontend redesign review

Rechecked the current storefront changes against the supplied homepage spec. Static review only; visual and runtime checks belong in QA.

## Findings

1. **P1 — Badge evidence is only checked against the first report page.** `components/screens/HomeScreen.tsx:27,37-40` calls `useLabReports()` with its default page and selects passing product IDs from `reportPage.items`. `getLabReports()` defaults to 20 reports, so verified products with older reports disappear from the homepage. Fetch a product-filtered or complete published passing set. Confirm that a passing report is for the currently listed SKU/batch; the DTO has a `batchId` but the product summary has no batch ID to compare. Report failures now have a distinct message, which resolves that part of the earlier finding.

2. **P2 — Linked storefront routes still mix old and new styling.** `app/globals.css:101-110` now remaps some shared tokens and headings, improving consistency, but linked product, search, category, trust, and account screens still contain older heavy weights, Title Case, and layout spacing. Complete the customer-route pass called for in the implementation plan.

3. **P3 — Mobile process descriptions remain below the supplied type size.** `app/globals.css:256` now uses 12px, an improvement from 11px, but the spec calls for 13–14px mobile body copy. Raise these short descriptions to at least 13px if they fit the two-column cards at 375px.

4. **P3 — Mobile legal links are still narrower than the 44px target.** `components/layout/Footer.tsx:19` gives privacy and terms anchors `min-h-11`, resolving their height, but their width is only the rendered text. Add `min-w-11` with centered content if enforcing the spec's 44×44px target. Accordion links now have full-width 44px rows.

5. **P2 — Existing desktop utility navigation remains reduced.** The new desktop header no longer exposes wishlist directly, and several former footer entry points were removed. Keep useful existing destinations accessible through a compact account menu or footer, consistent with the request to retain existing links and redirects.

## Resolved in this recheck

- Homepage badges now require both `isLabVerified` and a passing lab report product ID. The remaining data scope caveats are above.
- Mobile footer has bottom clearance beneath the fixed navigation bar.
- Homepage sections now have CSS scroll entry animation with reduced-motion handling.
- Homepage category cards now label the `/products` fallback as “browse all products.”
- Header now includes a skip link to the main content region.
- Header category links now appear only when a matching live category exists, so they no longer mislabel an all-products fallback.
- The new process CTA and gift CTA use existing `/trust/how-it-works` and `/products` routes; the four process steps make no invented numerical claims.
- The dark footer has strong text/background contrast and responsive `<details>` navigation on mobile.
- Process step numbers now use a darker `#526a59` for sufficient contrast.
- Mobile footer accordion links and legal links now reach 44px height.

## Latest requested refinements (review in progress)

1. **P2 — OTP boxes overflow narrow mobile dialogs.** `components/auth/OTPVerification.tsx` gives six inputs `w-12` (288px total) plus five gaps. At a 375px viewport, `AuthModal` leaves about 295px of inner width after its outer and inner horizontal padding; the code row therefore exceeds the available width. At 320px it is more pronounced. Use flexible equal-width inputs with `min-w-0` or a smaller responsive width, then test 320px and 375px.

2. **P2 — Login delivery still needs end-to-end confirmation.** Local backend's default profile had no OTP delivery provider, while development mode exposes a mock code. Seeded account password hashes are placeholders, so password login cannot work for those accounts. Verify send and redeem with a seeded identity on the running development profile, and label the local mock-code behavior as development-only. This finding is about verification and local data, not a recommendation to loosen production authentication.

3. **P3 — Checkout button hover can revert to the old palette.** `components/ui/Button.tsx` uses `hover:bg-brand-secondary` for its primary variant, but the new `.checkout-shell` scoped tokens in `app/globals.css` override only `bg-brand-primary`. Add a scoped hover mapping or explicit checkout button variant so the bag/address/payment CTA stays forest on hover.

4. **P3 — Footer legal links remain below the specified touch width.** The legal anchors in `components/layout/Footer.tsx` have `min-h-11`, but no minimum width. Give each at least 44px width and center it to meet the same 44×44px target used elsewhere.

5. **Previously reported homepage lab-report scope remains unresolved.** The first-page lab report join in `HomeScreen.tsx` can omit verified products with older reports; see Finding 1 above.

The latest hero offset, visible header wishlist link, white footer, scripted footer slogan, auth/checkout color scoping, and responsive footer navigation are present in the source. Visual QA and live auth verification remain with QA.

## Final disposition for the requested refinements (supersedes older status above)

- **Resolved:** OTP inputs now use a six-column grid with flexible widths; modal padding was reduced on small screens. QA confirmed the code entry fits at 375px and completed a browser OTP sign-in with the local development mock code. The backend remains unchanged.
- **Resolved:** Checkout and storefront primary-button hover now map to forest; footer legal links have both `min-h-11` and `min-w-11`; the header wishlist link is visible; the homepage hero has a header gap; the footer is white with a cursive slogan.
- **Resolved:** Homepage product images have a positioned parent. Category-related client hydration and product filter behavior were addressed, with no overflow or page errors in QA at 375px, 768px, and 1440px.
- **Remaining P1 data correctness:** `HomeScreen.tsx` still joins homepage products to only the default first page of lab reports. An older valid passing report can be omitted from the “recently verified” section, and the available product summary does not identify the batch associated with the report. Use a complete/paginated product-specific published report set or a backend-provided verified product collection before treating the badge as comprehensive batch evidence.
- **Remaining local account limitation:** Seeded password hashes are placeholders, so password sign-in for those seeded identities remains unavailable. The dev-profile OTP path is verified and uses a mock code with no email/SMS delivery. Production delivery needs its configured provider; the redesign did not alter backend authentication.

QA's browser and automated results are recorded in `qa-report.md`. Earlier “in progress” findings above are retained as review history and are superseded by this disposition.

## Account dropdown and standards seal review

Static review of `AccountMenu.tsx`, `Footer.tsx`, `app/globals.css`, and `public/truzov-standards-seal.svg` for the latest request:

- **P2 accessibility:** The account button always has `aria-controls="account-panel"`, but that panel is absent while closed and is never used for guests. For guests, `aria-expanded` instead reports the unrelated auth modal state. Apply these attributes only for the signed-in dropdown, and keep the auth modal's trigger semantics separate.
- **P3 keyboard focus:** Escape closes the dropdown while focus can remain inside it. When the focused link is removed, focus falls back to the document. Return focus to the Account button when Escape closes the menu.
- **P3 motion:** The seal's reduced-motion rule removes continuous rotation, but the hover rule still applies a static 8° transform. This is mild and optional; if strict reduced-motion behavior is desired, disable that transform within the media query as well.

The five dropdown destinations resolve to existing routes; user text is React-escaped; no security issue was found in this change. The menu uses 44px rows, the seal has descriptive alt text, and its continuous animation respects `prefers-reduced-motion`. Responsive appearance and keyboard behavior still need browser QA.

**Recheck disposition (supersedes the three findings immediately above):** The account button now sets `aria-controls` only while the signed-in panel is present, omits `aria-expanded` for guests, and returns focus to the trigger when Escape closes the panel. The decorative pointer was removed as requested. The seal hover rule now only pauses rotation, while the reduced-motion rule removes animation entirely. No remaining issue was found in these targeted changes during static review; browser QA remains separate.

## Account dashboard styling review

Static review of `components/account/AccountShell.tsx` and the account-related changes in `components/screens/CustomerScreens.tsx`:

- **P2 responsive:** The new welcome heading interpolates `userName` inside a banner with `overflow-hidden` but has no wrapping rule for a long unbroken name. A long valid account name can be clipped on mobile. Apply `break-words` or `overflow-wrap:anywhere` to the heading and check 320px.
- **P3 responsive:** The profile edit actions remain a single `flex` row. At 320px, the “save changes” and “cancel” buttons plus their padding can exceed the panel's available width. Allow wrapping or stack them on the narrowest viewport.

The Profile, Orders & Returns, Addresses, and Settings links and their route targets are preserved. Mobile account navigation scrolls horizontally instead of forcing page width, active links have `aria-current="page"`, and the shared panel restyle applies to the other account pages without removing their controls. The existing nested `<main>` inside the outer storefront `<main>` predates this change and is worth fixing separately for landmark semantics. Browser QA is still needed for the narrow-screen cases.

## Motion and SVG icon review

Static review of the new `app/globals.css` motion rules and account navigation icons in `CustomerScreens.tsx`:

- **P2 reduced motion:** `html { scroll-behavior: smooth; }` remains active because the reduced-motion override targets only `.storefront` descendants. Add an `html { scroll-behavior: auto; }` override within `prefers-reduced-motion` so skip and anchor links do not animate for those users.
- **P2 reduced motion:** The scroll-linked `home-rise` animation uses `animation-timeline: view()`. A near-zero `animation-duration` does not reliably disable a view timeline's scroll-driven transform; explicitly set `animation: none` on those sections within the reduced-motion query.

The new account icons are consistent Lucide SVGs, marked `aria-hidden`, and paired with text labels. Their 44px navigation rows and `shrink-0` icon sizing preserve tap targets and layout. Hover motion is gated to fine pointers; no other static layout regression was found in this targeted pass.

**Recheck disposition:** Both reduced-motion findings above are resolved. The media query now disables smooth scrolling on `html`, sets `animation: none` and `transition: none` throughout the storefront (including the scroll-linked sections and standards seal), and removes hover displacement. No remaining issue was found in this targeted static recheck.

## Standards seal revamp review

The new seal has a clear forest/cream/coral palette, a descriptive image alternative, and a simpler central flask/check mark. Footer sizing stays at 128px on mobile and 160px from the small breakpoint, without forcing the footer row wider. The faster 3.2-second, 16-degree alternating tilt is modest and pauses on hover; the storefront reduced-motion rule disables it.

- **P3 readability:** At the 128px mobile size, the curved “STANDARDS” lettering renders at roughly 9px. The image alternative preserves its meaning for assistive technology, but the visible lettering may be hard to read on small screens. A larger mobile seal or slightly larger lettering would improve legibility if the graphic's words need to be read rather than serve as decorative branding.

No blocking issue found in this targeted static review. Browser visual verification remains with QA.

## Local preview with multiple products — current-task review

`HomeScreen.tsx` now requests four live best-selling products and fills any short result with distinct products from the existing home response. The grid uses each product's actual name, image, price, stock state, and `/products/[slug]` link. It no longer labels the whole collection as verified; a badge appears only when both the product flag and a passing lab-report product ID are present. Desktop shows four columns, tablet two, and mobile a horizontally scrollable row. The “shop all” link resolves to `/products`.

- **Resolved:** `HomeScreen.tsx:38-40` now merges the best-selling and home collections, deduplicates by product ID, then takes four. A short best-selling response can still produce a four-product preview when the home feed has enough distinct products.
- **Resolved:** `HomeScreen.tsx:27-29` waits only for the home feed. Product and lab-report requests can complete later without blocking the page; badges appear when passing report data arrives.
- **Existing verification caveat:** The badge join still uses only the first report page and cannot match a report to the current batch. This predates the current change and remains in the report above.

No new actionable finding was found in this targeted recheck. No invented prices or product claims were found in this change. Live browser checks remain with QA.

## Shared typography and customer theme review

Reviewed self-hosted Inter/Allura, root preload, customer-scoped globals, shared Button/Badge hooks, catalogue cards and grid, account/wishlist/settings, and checkout styling. The font files and license texts are present. Allura remains limited to the footer script, and the wordmark remains a separate branded element. The new component attributes and theme rules are visual; no backend request, pricing, or auth behavior changed in this pass.

- **Resolved:** The shared border mapping now keeps `.border-brand-primary` forest and maps only `.border-outline-variant` to the muted border, preserving active checkout and outline-button emphasis.

Other static checks passed: the product grid has 2/3/4 responsive columns, product cards retain their existing add-to-cart and wishlist actions, 16px customer form inputs avoid mobile zoom, and checkout pricing still uses server totals. Main-agent browser verification should confirm long labels and the checkout header at narrow widths.

## Logo, address modal, and auth identifier review

The final wordmark is a compact SVG path asset used by the shared `Logo` in the header, footer, auth surfaces, and checkout. The dark brand panel uses the light variant. The hero eyebrow no longer has a pill background. Links still resolve to `/`, and the logo has an accessible home label.

The shared modal now limits itself to viewport height, and the address modal gives the form a shrinking flex column with its own scrollable field region. Save and Cancel remain outside that field region at 44px minimum height, so the action row remains reachable on short mobile screens. Other Modal callers retain the default scrolling body. The shared Input preserves label, error, and password reveal behavior; fields are `min-w-0` and customer text inputs remain 16px.

The auth flow keeps the entered email/phone as an in-memory signup draft after an unknown-account lookup. The draft does not grant a session or skip verification: `SignupForm` calls the existing signup API, then its OTP step calls `verifyOtp` before authentication. Existing login OTP and password routes remain. No backend code changed in this pass.

No new actionable static finding was found in these targeted changes. Browser QA should still confirm that the address form's inner scroll reaches its last field and that Save/Cancel stay visible with a short viewport and mobile keyboard open.

## Supplied PNG logo swap (2026-09-30)

The shared Logo now references the supplied `/truzov-logo.png` with its original 2137 by 736 aspect ratio. Header, both footer variants, auth surfaces, checkout, and dashboard reuse that component; organization metadata references the same PNG. Existing responsive widths and the light variant are preserved. No task-specific static issue was found.

## Latest supplied logo asset (2026-09-30)

Shared Logo and organization metadata now reference `/truzov-logo-final.png`. The original 2137 by 736 dimensions and unoptimized rendering preserve the supplied file and its aspect ratio. Existing shared-component coverage remains intact. No static issue found.

## Smaller logo sizing (2026-09-30)

Shared default logo width is now 112px; header uses 96px on mobile and 112px on desktop, while auth surfaces use 128px. Source asset, aspect ratio, accessible home label, and 44px link target remain preserved. No static issue found.

## Consistent SVG icon pass (2026-09-30)

Existing Lucide icons are reused without new dependencies. Shared styling applies 1.75px stroke and prevents flex shrink; header search, account, wishlist, and cart controls retain accessible labels and 44px targets. Account navigation destinations, search submission, and native footer disclosure remain unchanged. Category icons now distinguish personal care and food. The footer chevron state transform needs the native open selector to work reliably; browser QA identified the unused group-open transform.

## Neon demo setup and fixed administrator review (2026-10-02)

Scope: PowerShell `database 2/start-demo.ps1`, `seed-demo.ps1`, `DEMO_SETUP.md`, SQL `src/main/resources/db/seed/data-demo.sql`, and the existing first-admin bootstrap/hash path. Trust boundaries are local operator-controlled environment files, Cloudinary HTTPS upload, and PostgreSQL. Relevant security review areas: ASVS V2 authentication, V4 authorization, V5 interpreter boundaries, V8 data protection, and V14 configuration. This is a focused review, not an exhaustive application audit.

The explicit user-requested fixed test administrator uses the existing BCrypt/bootstrap and normal backend login/role checks. The launcher does not grant roles or compare passwords in frontend code, and the bootstrap leaves any existing administrator unchanged. Database credentials come from ignored `.env`; only Cloudinary may fall back to `.env.branch`. No database or Cloudinary secrets are logged. PowerShell invokes native commands with separate arguments, and the SQL seed is static; the Cloudinary response contributes only image URLs, not end-user input.

The seed is transactional, foreign-key ordered, idempotent, and isolated by demo IDs/slugs. It leaves real catalogue records intact. Twelve published products are clearly named and described as demo items; verification remains pending, lab flags false, certifications empty, and ratings/reviews zero. The disabled demo seller-owner account cannot authenticate. Category-image references populate each product image record. Existing nine products retain their prior images; only the twelve new demo products were uploaded to Cloudinary.

Resolved operational findings: declare PowerShell 7.2+ for the seed script's .NET hashing APIs; propagate the Java exit status from the launcher. PowerShell parser checks passed after both changes, and setup instructions now state the runtime requirement. Render production deployment was neither performed nor established; the local dev-profile launcher must remain a local testing command. No further task-blocking issue found in this focused review.

## Checkout route recovery
Existing address/payment pages were present; runtime404 reproduced. next.config.ts now pins workspace root and isolated generated .next-build path; .gitignore excludes it and Next adds its generated types to tsconfig. Auth review found no session handling cause of404; initial auth/me401 can be recovered by refresh. No authentication bypass or purchase mutation introduced.


## Admin branding review
Focused reviewer confirmed active sidebar uses Truzov PNG for expanded/collapsed modes, no active Sellzy references, appropriate forest/sage contrast. Follow-up removed old teal literals from legacy charts and updated secondary shadow to terracotta.

## Eight marketplace fixes review (2026-10-04)

Scope: TypeScript/React storefront cart, quantity, coupon, seller form, account navigation and logout; TypeScript/React admin login, resource forms and seller enquiry list; Java/Spring REST checkout, coupons and seller application services; PostgreSQL migration for order discount snapshots, redemptions and applications. Existing unrelated configuration, demo setup and report changes were excluded. Trust boundaries are anonymous onboarding input, authenticated cart-line IDs and coupon codes, admin resource input, database prices/stock and browser persistence. Applied the secure-code-review skill with ASVS V3 session management, V4 authorization, V5 validation, V7 errors, V8 data protection and transactional business logic/CWE-362 concurrency in scope. This is a focused review rather than an application-wide audit.

Access and validation: coupon routes require authentication; cart selection resolves only against caller-owned locked cart rows and rejects empty, duplicate, missing and foreign IDs. Selected lines alone are deleted. The anonymous seller POST remains separate from protected support-ticket routes, uses existing global rate limiting, bounded validated contact fields and HTTP(S) website validation, and parameterized JDBC. Seller enquiry reads have both admin URL authorization and service role checks; the admin view renders submitted fields as text. No credential, card or client-provided price/total is added to the new request contracts.

Checkout and discounts: current product rows are now locked in product-ID order before price calculation and stock reservation. Coupon status, dates, minimum spend, eligible product subtotal and per-user limit are computed on the server; a coupon row lock serializes redemption checks, and redemption, stock, order snapshot and selected-cart deletion share the checkout transaction. Discount cannot reduce delivery charges or exceed eligible merchandise. The order retains code and amount snapshots.

Resolved findings: checkout originally reused a screen-wide idempotency key after coupon/selection changes (P2, transaction-intent consistency); the key now depends on user, address, normalized coupon and sorted selected IDs/quantities while remaining stable for unchanged retries. Checkout previously read prices before the product lock (P2, CWE-362); the backend now uses a locked sellable-product lookup before computation. Both changes were inspected after implementation.

Frontend/admin: sort fields retain a string draft and validate integer bounds on submit, including genuine zero and blank-to-zero behavior. Coupon forms use authenticated backend CRUD, and seller application success follows a persisted receipt; errors preserve form inputs. Selection uses product/variant keys across guest-cart merge while checkout submits actual server line IDs. Mobile purchase controls precede descriptive tabs, quantity is bounded, and mobile logout reuses token/cache/cart cleanup. Customer settings links are removed without altering workspace settings.

Verification boundary: backend developer reports the final package build and 287 unit tests passed. The reviewed integration suite now also includes concurrent distinct selected checkouts enforcing a per-user coupon limit, variant rollback/cancellation restoration, admin coupon creation and used-coupon deletion rejection. QA owns database execution; its results belong in `qa-report.md`. Static lock reasoning alone does not establish concurrency test success.

Additional resolved findings: selected variants previously had separate stock fields but checkout reserved only product stock. Checkout now locks the owned product/variant pair, conditionally decrements both inventories, and rolls back both on failure. Cancellation restores variant units only when a new `variant_stock_reserved` order-line marker is true; the migration defaults existing orders to false, avoiding inflation of historical inventory. The storefront quantity ceiling now uses variant stock where supplied and prevents explicitly sold-out variants. Used-coupon deletion now holds the coupon row lock and returns a clear conflict explaining that deactivation preserves history. The offers entry links to the real checkout coupon input; guest users see sign-in guidance.

Final static disposition: approved, with no outstanding task-blocking code finding in the reviewed final changes. Frontend root agent reports 136 passing tests and typecheck success. Final browser/build and database integration outcomes must be recorded by QA; this review does not claim hosted deployment or live end-to-end purchase verification.

