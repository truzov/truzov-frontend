# Review fixes production release — 2026-10-08

The user explicitly authorized committing and making the backend, storefront and admin panel live, and confirmed CLOSEON OP's Render workspace. The existing Git integrations deployed the reviewed production branches. No force push, branch switch, new infrastructure, dependency upgrade, provider-secret change or security-gate suppression was performed. Local logs, PID files, tools and unrelated pre-existing demo scripts were excluded from commits.

| Application | Code commit | Production branch | Provider deployment | Verified URL |
|---|---|---|---|---|
| Backend (Spring Boot) | e63ee0db85cac67bd39f331d94d1b1052c1f6e59 | feat/admin-panel-integration | Render dep-db3sbjbl550s739mjj20, live | https://truzov-backend.onrender.com |
| Storefront (Next.js) | fbea22bc04182e1f17bd0841e22e35dc0c159ce5 | feat/storefront-redesign | Vercel dpl_3qj4s5kXzACZF3oEwkRVGqUUvTDs, READY, production | https://truzov-frontend-sepia.vercel.app |
| Admin (Next.js) | 7b73cd88cd8e9a5dc1b3cd059fe303c9a6063232 | codex/truzov-admin-branding | Vercel dpl_9tq9fSo5QjhT3fTyqf3gqCuYbjjX, READY, production | https://truzov-admin.vercel.app |

Provider durations: backend rollout about 5m53s; storefront build about 37s; admin build about 57s after its queue. Provider metadata confirms exact code SHA, production target and domain aliases. A documentation-only follow-up records this release without changing application behavior.

Backend Flyway logs show the prior schema version 202610040100, successful execution of V202610080100, and current version 202610080100. Backend became live before the frontend/admin commits were pushed. Public GET /api/v1/offers, /api/v1/products?limit=1 and /api/v1/categories returned 200 JSON; unauthenticated /api/v1/admin/stats returned 401. Production storefront /offers and /support/tickets returned 200 with the new lowercase titles; admin /signin returned 200 with its lowercase title. No live test account, ticket, order, coupon redemption or product mutation was created.

## Verification

The local isolated checks remain recorded in qa-report.md: storefront 142 tests, admin 20 tests, both production builds/typechecks, six Chromium header/hero cases, backend 291 unit plus 117 affected integration tests, packaging/SpotBugs, fresh Flyway and existing-data upgrade fixtures.

GitHub CI at the exact backend release commit subsequently passed 291 unit tests and all 376 integration tests (667 total, zero failures/errors/skips), coverage, packaging and SpotBugs (zero findings). Actionlint, filesystem vulnerability scan and Gitleaks passed. The image scan failed on the two dependency advisories below; do not describe the overall CI run as green. CI run: https://github.com/truzov/truzov-backend/actions/runs/37809709762

## Dependency findings — independent source triage

Trivy reports CVE-2026-47884 and CVE-2026-47890 in org.springframework:spring-webmvc 6.2.19 as critical. The affected dependency/version match is real; no suppression or risk acceptance was applied.

- CVE-2026-47884 requires XsltView plus an implicit wildcard mapping that renders a view. Spring rates it Medium: https://spring.io/security/cve-2026-47884/
- CVE-2026-47890 requires SSE view fragments with attacker-controlled content streamed to other users. Spring rates it Low: https://spring.io/security/cve-2026-47890/

An independent reviewer checked committed src/main and pom.xml at e63ee0d. All 32 application controllers use @RestController. No XsltView, view resolver/controller registration, ModelAndView, implicit wildcard view handler, SSE emitter/event-stream response, FragmentsRendering, XML imports or dynamic class loading was found. Determination: affected dependency present, no identified reachable application exploit path in this commit. This is not a false package/version match; source inspection cannot establish all deployed runtime or transitive behavior.

Follow-up: move to a supported patched Spring stack after compatibility verification. Spring lists 6.2.20 as enterprise-only and 7.0.9 as OSS. Reassess immediately if XSLT views, implicit wildcard view rendering or SSE view fragments are introduced. The gate remains failed and visible; no owner/security risk acceptance is fabricated.

## Observability limits

Vercel production deployment/domain metadata was verified through the Vercel plugin. Its runtime-log read returned 403 for both projects; the CLI has no existing credentials, so a runtime error scan is unavailable. Do not infer zero runtime errors from READY status or public-route checks. Drains are not configured for either project. Authenticated production mutations and real-provider flows were not smoke-tested.

Earlier statements in source-review documents that no deployment or live migration occurred describe the pre-release validation stage. This authorized rollout supersedes those statements.
