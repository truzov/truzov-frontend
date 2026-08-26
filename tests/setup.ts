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
