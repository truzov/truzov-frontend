# Release status — 2026-10-30

User authorized backend PR, Render backend release, Vercel storefront/admin release, and live integration checks using the connected secondary `truzov` accounts.

## PR stack and code

- Backend #32 (`codex/password-recovery-support-checkout`, 3115733) targets #31's `feat/admin-panel-integration` branch.
- Storefront #12 (`codex/storefront-recovery-cart-release`, 772853b) targets #11's `feat/storefront-redesign` branch.
- Admin #3 (`codex/panel-recovery-support-release`, e43dd81) targets #2's `codex/truzov-admin-branding` branch.
- Preserve this stack: inspect previous PRs and base new work on the last PR branch. Do not collapse the stack merely to trigger deployment.

Backend changes: OTP password recovery and credential-version revocation; refresh replay/concurrency containment without nested-connection starvation; private ticket attachments/order references/resolved status; coupon-free delivery quotes; variant stock and immutable order image/size snapshots. Two additive migrations must deploy before the new frontend contracts.

## Fresh verification

- GitHub backend run 41089100447: 295 unit +384 integration tests passed, coverage/package successful, SpotBugs zero. Gitleaks, Actionlint and filesystem scan passed.
- Overall CI FAILED: image scan still reports Spring WebMVC CVE-2026-47884 and CVE-2026-47890, also documented in the October 8 release. No suppression or acceptance added.
- QA agent: storefront 154 tests/18 files and standalone TypeScript passed; admin 22 tests/4 files and standalone TypeScript passed. All three whitespace checks passed. Cached exact Vitest4.1.8 and node22-alpine ran against sanitized sources, without network, live data or secrets. Generated route checks are covered by hosted builds rather than standalone admin tsc.
- Vercel preview builds for both exact new frontend commits are READY. These are not production deployments.
- Configured Neon connection: read-only query succeeds as neondb_owner against neondb. Latest applied Flyway version remains 202610080100; the two new migrations are not yet applied.
- Configured Cloudinary cloud sawjuzml: authenticated provider ping HTTP200 with status ok. This does not establish the deployed application's upload flow.

## Access and remaining release work

Vercel team access now succeeds through connected truzov05@gmail.com, team_4zTZGCbqL7R5j8zASPkoQy82. Frontend project prj_kqOV63o5GXAQTLesl7YqS1Wl3Fmo; admin project prj_ELuCsMKjUgnKBLTMfCcZz9wVvNgN.

Render secondary connection `truzov` lists CLOSEON OP's workspace tea-dapp3ejtqb8s73da34ug and existing srv-dapr5fdg1s2s73d58it0. It still tracks feat/admin-panel-integration at e63ee0d. Plugin can redeploy/monitor but cannot select a new branch. Browser control encountered minimized-window/user-input conflicts; user was asked to set Branch to codex/password-recovery-support-checkout and save in existing service settings.

After that action: monitor backend deploy to live, verify Flyway versions 202610270100 and202610280100 and new APIs; create production Vercel deployments from exact new PR commits; monitor READY/domain aliases; test public and authenticated site flows and private attachment access as available. Ask for login if necessary. Do not report deployment or complete live integration verification until observed.
