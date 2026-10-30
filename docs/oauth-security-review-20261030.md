# Security Code Review Report

**Scope:** lib/auth/google-oauth.ts, lib/auth/redirect.ts, their callers/tests, existing GoogleSignInButton/AuthForm/callback/store wiring and backend GoogleOAuthProvider/GoogleOAuthProperties identity-verification flow.
**Languages:** TypeScript/React/Next.js; Java/Spring backend context.
**Date:** 2026-10-30.
**Reviewer:** Independent Reviewer Agent using secure-code-review v1.0.0; implementation uses ponytail.

## Summary

No unresolved finding was identified in the focused new source diff. This is not a whole-site security certification. Existing authorization-code, S256 PKCE, single-use state, provider JWT validation and standard sessions are reused; no dependency or schema change.

Trust boundaries reviewed: query parameters, sessionStorage JSON, post-login navigation, Google code exchange and identity claims, server-side secrets and public deployment configuration. Applicable ASVS V2/V3/V4/V5/V7/V8/V9/V14. The skill's referenced fixer-policy.md is absent at its resolved relative path; named-file searches found no copy. No additional approval requirement was inferred. Narrow validation fixes were independently reviewed and tested; rollback needs no migration.

## Findings addressed

### SCR-001: Unvalidated restored OAuth destination

- **Severity:** Low; defense in depth, requiring a manipulated destination or stored flow.
- **CWE:** CWE-601, untrusted redirect.
- **ASVS:** V5.1.3.
- **Location:** lib/auth/google-oauth.ts, pending creation and completion; lib/auth/redirect.ts:7.
- **Evidence:** Previously redirectTo was saved and returned unchanged, then passed to callback router.replace. The shared guard also permitted ASCII newline/tab characters, which URL parsing can discard before determining an authority.
- **Remediation:** Reuse isValidRedirect at storage and consumption, default to '/'; reject ASCII controls and backslashes in the shared guard for all existing auth callers.
- **Status:** Mitigated in source; hosted verification pending.

### SCR-002: Parsed flow was trusted without shape validation

- **Severity:** Informational; malformed browser storage could fail unpredictably.
- **CWE:** CWE-20, improper input validation.
- **ASVS:** V5.1.1.
- **Location:** lib/auth/google-oauth.ts:136.
- **Evidence:** JSON.parse was cast directly to PendingFlow before reading state/verifier.
- **Remediation:** Require an object with the generator's 128-character base64url verifier and 22-character base64url state; malformed data is consumed and rejected before exchange. Guard the restored destination's string type.
- **Status:** Mitigated in source; hosted verification pending.

## Verification

Fresh isolated QA: 165/165 tests in18files, including20 OAuth tests; standalone TypeScript and whitespace checks passed. All four source/test files hash-match the sanitized tested snapshot. Tests cover valid checkout return, external/protocol-relative/backslash/control-character destinations, stored tampering, malformed flow, CSRF state mismatch, S256 verifier confidentiality and single-use callbacks. No secrets, dotenv, live data, network or dependency installation in test execution.

Independent review found no blocking issue in the diff. State equality and single-use removal remain before exchange; PKCE generation is unchanged. The backend continues to verify Google RS256 signature, issuer, audience, expiration and authorized-party claims, and controls account roles/linking.

## Deployment configuration and open boundaries

- User explicitly authorized the Google credentials supplied in their screenshot. Store only the public client ID in Vercel production; keep the client secret in Render. No credential values belong in this report or source.
- Merge only Google client ID/secret/redirect URI and a new persistent random JWT signing key into Render; preserve unrelated settings. Existing ephemeral signing was observed in runtime logs. Activation must be verified after its deploy.
- User explicitly chose to retain demo OTP temporarily. A shared demo code bypasses real identity verification; this remains an open deployment risk. Google login does not remove that alternative path.
- The screenshot disclosed a client secret. Rotation was recommended; user requested use of that credential. Do not characterize it as rotated or independently secure.
- Existing Spring WebMVC dependency findings remain open: CVE-2026-47884 and CVE-2026-47890; backend CI tests pass but overall image scan fails.
- Exact Google redirect registration and Testing-mode audience authorization are controlled in Google Console. Real consent/sign-in must be completed by the user and verified afterward; no success claim before observation.

## ASVS coverage matrix

| Section | Applicable | Reviewed result |
|---|---|---|
| V2 Authentication | Yes | Existing Google provider identity validation retained; real consent pending |
| V3 Sessions | Yes | PKCE/state/single-use retained; persistent signing key configuration pending live verification |
| V4 Access control | Yes | Backend roles retained; state checks preserved |
| V5 Validation | Yes | Two source boundaries addressed and regression-tested |
| V7 Errors/logging | Yes | No new sensitive logging; generic local errors |
| V8 Data protection | Yes | Secret server-only; ephemeral verifier stays in per-tab storage |
| V9 Communication | Yes | Existing HTTPS Google endpoints retained |
| V14 Configuration | Yes | Open demo OTP/dependency/credential/audience limitations above |

Rollback: disable Google configuration and rebuild the frontend if activation fails; retain validation improvements. No database rollback needed. A persistent signing-key change requires reauthentication of pre-existing sessions.
