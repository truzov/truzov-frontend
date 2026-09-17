/**
 * Single source of truth for runtime configuration.
 *
 * Why this file exists at all: the base URL was previously read inline as
 * `process.env.NEXT_PUBLIC_API_BASE_URL ?? ''`, and that empty-string fallback is the
 * dangerous part. With it, a deploy that forgets the variable does not fail — it silently
 * issues every request against a *relative* path, which means the Next.js server answers
 * with its own 404 HTML. The symptom is "the API returns garbage", days away from the cause.
 * Reading the variable once here, and throwing, converts that into a boot-time failure.
 *
 * NEXT_PUBLIC_ prefix is required by Next.js to expose the value to browser bundles. That
 * also means the value is public — so nothing secret may ever be read through this module.
 */

function required(name: string, value: string | undefined): string {
  // Trim first: a trailing space in a .env file is invisible in an editor but produces a
  // malformed URL that fails with an opaque "Failed to parse URL" much later.
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env.local and set it (see FRONTEND_API_MIGRATION_PLAN.md §F1).`
    );
  }

  return trimmed;
}

/**
 * Base URL for the versioned API, e.g. `http://localhost:8080/api/v1`.
 *
 * The `/api/v1` prefix belongs in the variable rather than being appended in code, because
 * the reference documents the version as part of the deployed API's address — a future
 * /api/v2 should be a config change, not a code change.
 *
 * Any trailing slash is stripped so callers can always pass paths beginning with `/`
 * without producing a double slash (which some gateways treat as a distinct, 404-ing path).
 */
const apiBaseUrl = required(
  'NEXT_PUBLIC_API_BASE_URL',
  process.env.NEXT_PUBLIC_API_BASE_URL
).replace(/\/+$/, '');

export const env = {
  apiBaseUrl,
} as const;
