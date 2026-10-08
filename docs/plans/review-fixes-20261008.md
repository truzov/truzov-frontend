# Missing review fixes — implementation plan

Inspect each checklist item first; reuse completed category, seller enquiry, support API, stock and coupon work. Keep the onboarding flow unchanged. Apply ponytail minimal implementation and focused security-audit source checks.

1. Backend/admin: role-scoped login with indistinguishable credential failures and unchanged rate limiting; remove unused Firebase settings/UI using a new cleanup migration after dependency inspection.
2. Storefront: align header desktop breakpoint/spacing, remove explicit hero top margins, overlay menu/search, route offers to a dedicated real page and lowercase customer-facing branding.
3. Backend/admin: configurable sales/recentness rules, per-product auto/force_on/force_off overrides, admin create/edit support; preserve manual publication and Featured.
4. Write FINDINGS before product/category/onboarding changes. Category storage/filtering already implemented; preserve onboarding.
5. Reuse existing ticket endpoints for storefront authenticated tickets/status/replies and repair legacy admin detail navigation.
6. Independent source review, meaningful regression checks, explicit runtime limitations, and Project Brain update. No push/deploy/live database mutation.
