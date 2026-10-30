# UI fixes — local implementation and verification

Date: 2026-10-29. Scope: the sixteen tasks in truzov-ui-fixes (1).md. Existing source was checked before editing. Work proceeded through storefront, missing backend contracts, then the seller/admin panel. Ponytail: reuse existing stores, forms, upload validation, APIs, query cache, and database transactions; no new dependencies.

| Task | Status | Result |
|---|---|---|
| 1 Focus | Done with stated assumption | One focus stylesheet per app replaces colored focus rings with neutral keyboard focus, retaining active selections and accessible focus. Applies to storefront, account, workspaces and admin. |
| 2 Gallery | Done | Thumbnails select the fixed main image without zoom; vertical tablet/desktop rail, phone swipe, selected border, overflow image-count tile, share/wishlist controls. Main-image zoom remains optional. |
| 3 Auth navigation | Done | Guest Login / Signup and signed-in My Account are exclusive. Session restoration reserves space without rendering the wrong identity. |
| 4 Product tabs | Done | Tab row remains fixed; equal-height scrollable content/loading space; corrected grid placement removes the gallery-driven blank gap. |
| 5 Filters | Done with stated assumption | Existing category, price, stock, verified and sort controls compose in URLs, survive refresh/back and support mobile Apply/Clear. Fixed category/search routes dropping parameters, local pagination losing URL state, stale mobile drafts, clear not resetting sort, rupee/paise mismatch, and rapid desktop navigation losing selections. |
| 6 Product administration | Investigation complete | No feature expansion for this task. Screens, fields, image upload, ownership and remaining editor gaps are documented in ui-product-investigation-20261027.md. |
| 7 Order summary | Done | Review and payment reuse the same bounded thumbnail list, quantities, prices and size labels. Server quote supplies shipping/total without requiring a coupon; checkout still independently revalidates all money/stock. New orders retain actual image/variant snapshots; legacy unknown values remain empty. |
| 8 Responsive navigation | Done | One explicit 1536px account breakpoint, bottom safe-area spacing and keyboard handling. Fixed 320px homepage skeleton overflow; no duplicate account entry in mobile menu. |
| 9 Guest account | Done | Compact sign-in action and compact resolving state; full authenticated account layout retained. |
| 10 Cart quantity | Done | Shared ADD/−quantity+ control across cards/detail/server bag, optimistic rollback and duplicate-write guard. Guest controls synchronize, cap observed stock and remove at zero. Server owns final prices/inventory; selected-variant stock ceiling is included. |
| 11 Offers | Done | Existing real /offers API/page reused. Navigation targets remain /offers; added clipboard action with manual-copy fallback. No fabricated offers. |
| 12 Brand | Done | Previously completed lowercase wordmark/icons/text retained; new pages use lowercase truzov. Technical identifiers and user-entered business names are not silently renamed. |
| 13 Navigation label style | Done with stated assumption | Lowercase navigation/footer labels through one CSS variable, with readable footer links. Change --navigation-label-case to capitalize for title-case labels, or none for source casing. |
| 14 Seller application | Done with stated assumption | Public seller-panel /apply persists the existing application/enquiry record. Shared configurable seller destination sends customers/guests to /apply and vendors to the dashboard. Approval/account activation remains staff-controlled through verified identity/KYC; no anonymous privilege grants or automatic credentials. |
| 15 Tickets | Done | Existing owner-scoped tickets extended with optional own-order reference, private JPEG/PNG/WEBP attachment, resolved status, guest FAQ/contact and admin status controls. Conversation/list/reply behavior reused. |
| 16 Recovery | Done | Real marketplace and panel OTP recovery screens; bounded generic request responses, single-use purpose-specific codes, signup-equivalent password rules, old-password rejection and access/refresh revocation. |

## Security and concurrent users

Review is focused on changed paths, not an exhaustive certification of the website or deployment.

- Authenticated principals determine ticket/cart/order ownership. Foreign order references, ticket reads, image ownership and admin actions are checked server-side. Text is rendered as text; queries bind values.
- Ticket uploads reuse the server's byte-signature and 5 MB limits. The exact attachment route shares the bounded 6 MB multipart envelope; files themselves remain capped at 5 MB. They are private authenticated assets; client-supplied image IDs must be in the authenticated user's random upload namespace. Signed viewing URLs are returned only after ticket-owner/admin authorization.
- Reset tokens cannot become login tokens. Wrong codes spend the existing attempt budget. Known/unknown account requests share neutral response structure and IP/account limiting. Password changes increment credential versions; both access tokens and refresh families bind that version. This also rejects a late-committing old-generation refresh after reset.
- Concurrent refresh/replay behavior is tested with real database transactions. A baseline reproduction exposed an ancestor/descendant revocation race: the new child could survive a revocation UPDATE's earlier snapshot. Session-family database serialization addresses it without a global server mutex. Revocation uses the same transaction/connection and commits the expected 401 containment path, avoiding a nested-connection dependency. Final regression results are recorded in qa-report.md.
- Shared cart UI serializes writes only inside the current browser/query client, checks owner changes before accepting async results, and rolls back failed optimistic writes. Different shoppers do not share a client cache or browser lock. Server row locks, ownership, stock and idempotency remain authoritative.
- Catalog filtering stays on the backend; no per-card detail fetching or client filtering of one results page. Snapshot fields avoid fetching today's image/variant to invent old order history. Credential-version checking adds one indexed primary-key lookup per authenticated request for immediate revocation.
- Bounded concurrent fixture tests establish isolation and race behavior, not a production capacity or throughput guarantee. No production load test or live provider test was performed.

## Assumptions and decisions

Retain a neutral keyboard-only focus policy, plain lowercase rather than typographic small capitals, and existing supported filter choices pending Shivam/Rohit confirmation. No new rating-threshold API was invented; rating sort remains available.

Keep initial seller applications public and staff-reviewed. Pros: less initial friction and no unverified seller access. Trade-off: staff follow-up, verified account setup and KYC remain separate; automatic approval invitations are outside this change. Configure NEXT_PUBLIC_SELLER_PLATFORM_URL as an HTTP(S) origin for local/testing/live. Default is the existing live seller-panel origin; links never forward credentials.

Two additive forward migrations are local only: V202610270100__password_recovery_and_ticket_details.sql and V202610280100__order_item_presentation.sql. Fresh migration and an existing-data upgrade fixture were checked. Legacy user/refresh generations default to zero; old ticket/order rows are preserved and no historical image/variant values are fabricated.

## Local checks

Authoritative final counts and sandbox commands/limits are in qa-report.md. Tests use cached exact toolchains, dummy users/secrets/providers and isolated PostgreSQL or fixture HTTP APIs. No external network, live database, host secrets, dotenv, Docker socket or production identity was exposed to target code. Source/dependencies are read-only; writes are confined to capped scratch tmpfs, with an empty allowlisted environment and CPU/memory/process/file/disk/time limits.

No commit, push, deployment, live database migration or live customer mutation was performed for this UI task. Historical deployment notes in this repository describe the earlier October 8 release.

Final result: 295 backend unit +384 integration tests,154 storefront tests,22 admin tests,13 storefront browser +3admin browser cases passed (871 automated cases). Both frontend builds/typechecks passed (52 storefront and90 admin generated pages), backend Maven verify/packaging/coverage and SpotBugs passed with zero findings. Existing-data SQL upgrade fixture and all three diff checks passed. Both concurrency negative baselines reproduced the failures; final regressions pass. No production load-capacity claim or dependency-vulnerability clearance is made.

## Remaining-work recheck — 2026-10-29
Task16 had one incomplete detail: both recovery screens displayed success but required a manual login link. Both now clear the old local session, show the existing success notification and automatically replace the route with the fixed local login destination. The storefront reuses its login-modal route; the panel returns to /signin. Failed confirmation neither navigates nor shows success. No identifier, code, password or redirect input is added to URLs, storage or notifications; backend revocation and limits are unchanged.

Rechecked Task7 against the earlier selected-checkout requirement: summaries include all selected checkout lines, while unselected bag lines remain in the bag. Task6 remains investigation-only as explicitly requested. Public seller intake remains staff-reviewed with existing verified account/KYC activation; automated invitations remain outside this implementation. Source searches found no visible mixed-case brand literals in app/components/lib storefront code or app/components panel code.

Follow-up validation: 154 storefront tests plus TypeScript passed; 22 panel tests plus TypeScript passed. The panel production build passed again (90 generated pages). Chromium checks against that production build passed at 375/768/1440px (3/3), including automatic /signin navigation and the visible global success notification. The storefront recovery regression verifies no navigation/notification on rejection and exactly one fixed /login navigation after confirmation. All three repository whitespace checks pass. Backend source is unchanged by this follow-up; the earlier 295-unit/384-integration results remain its validation. No fresh storefront production build was needed for this routing-only change after TypeScript and the complete storefront suite passed.

Verification used the same isolated Docker controls described above. Initial panel build/browser attempts failed because the runner omitted cached native modules or selected an incompatible libc/SWC combination; the final runner used Node22 Alpine and the existing read-only exact dependency, native, shared binary and font caches. No packages were installed or changed. Follow-up source review was performed by the coordinating agent; a fresh delegated review was unavailable due to the account usage limit. No new security defect was identified in this small routing change. Existing live-provider, current dependency-vulnerability and production-load limitations still apply. No commit, push or deployment.
