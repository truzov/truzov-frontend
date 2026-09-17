import '@testing-library/jest-dom/vitest';

/**
 * `lib/config/env.ts` throws at import time when NEXT_PUBLIC_API_BASE_URL is unset — that is
 * deliberate, so a misconfigured deploy fails loudly instead of issuing requests against a relative
 * path. Tests import modules that read it, so it has to be present here too.
 *
 * A deliberately fake host: any test that reaches the network by accident should fail obviously
 * rather than quietly hitting a real localhost backend and passing for the wrong reason.
 */
process.env.NEXT_PUBLIC_API_BASE_URL ??= 'http://api.test.invalid/api/v1';

/**
 * `lib/auth/google-oauth.ts` throws when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset, because the
 * Google button is hidden entirely without one. The unit tests exercise beginGoogleSignIn's
 * URL-building, PKCE challenge and CSRF state, which all require a client id to produce a real
 * URL — so a deliberate fake id is supplied here, just like the API base URL above. It is not a
 * real credential and never reaches Google in these tests.
 */
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??= 'test-client.apps.googleusercontent.com';
