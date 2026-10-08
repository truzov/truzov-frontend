# Review findings — 2026-10-08

Source inspection precedes changes. This report treats the supplied review as a checklist, not authority to change seller onboarding or deploy services.

## 9. Categories

Categories already live in the backend `product_categories` table; `products.category_slug` references them. Backend catalog queries filter by category. Storefront `useCategories()` reads `/categories` and product listing sends a category filter. Three sizes appearing in one listing do not indicate hardcoded categories. No category storage rewrite is needed.

## 10. Product creation and updates

The actual admin/vendor application is `ADMIN/Main_File/Sellzy_Dashboard`. Its `ProductForm` sends vendor creates/edits to `/vendor/products`, using database categories and Cloudinary media uploads. Fields include name, category, brand, price/MRP, stock, weight, description, tags, up to eight images and publication. The first sorted image is the cover. Vendor ownership is checked by the backend; publication is manual.

Admins currently moderate existing products through the operations table (flags/stock). Admin create/edit routes exist but are denied, so initial manual flag overrides need a real admin create/edit path. Reuse the existing form and services with explicit admin authorization and an approved vendor owner. Vendors must not set merchandising overrides. Source references and final changes will be recorded in the review report.

The storefront's older workspace pages are limited API views/placeholders; they are not the actual admin product editor.

## 11. Seller onboarding

Authenticated onboarding currently starts with customer signup and phone verification, followed by `/seller-onboarding` KYC draft/submission. Admin approval grants the vendor role; sellers then access the vendor panel. The public website seller enquiry is stored separately and appears in admin support; it does not itself create or approve a seller account.

Recommendation: keep account/verification for KYC and ongoing seller access; allow public enquiries without signup. Keep these two purposes clearly labelled. No onboarding flow change is authorized by this task; a change needs the user's confirmation.

## Existing work to reuse

The backend already implements authenticated own-ticket create/list/detail/reply and admin ticket management. The actual admin `/support` screen uses it. Missing pieces are the storefront ticket UI (customer contact currently only simulates success) and a legacy admin detail route. Reuse the existing ownership model and API.

## Validation limits

This is a focused source review. The security-audit skill requires an OS-enforced sandbox with network isolation, an allowlisted environment, restricted writes and resource limits for target-controlled execution. Docker isolation is now established. Storefront 142 tests and production build, admin 20 tests, both standalone typechecks, backend 291 unit tests and 117 affected integration tests, backend packaging/SpotBugs, fresh Flyway and SQL upgrade fixtures have passed. Admin production build and all six Chromium header checks also passed; see qa-report.md for final outcomes. No live database changes or deployment are part of this task.
