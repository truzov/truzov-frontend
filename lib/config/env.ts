/**
 * Single source of truth for runtime configuration.
 *
 * Why this file exists at all: the base URL was previously read inline as
 * `process.env.NEXT_PUBLIC_API_BASE_URL ?? ''`, and that empty-string fallback is the
 * dangerous part. With it, a deploy that forgets the variable does not fail — it silently
 * issues every request against a *relative* path, which means the Next.js server answers
 * with its own 404 HTML. The symptom is "the API returns garbage", days away from the cause.
 * Reading the variable once here converts that into a boot-time failure.
 *
 * NEXT_PUBLIC_ prefix is required by Next.js to expose the value to browser bundles. That
 * also means the value is public — so nothing secret may ever be read through this module.
 */

/**
 * The variable holds the backend's ORIGIN only — `http://localhost:8080`,
 * `https://truzov-backend.onrender.com` — not a path.
 *
 * This is the opposite of the previous convention (NEXT_PUBLIC_API_BASE_URL, which carried
 * `/api/v1` in the value) and the change is deliberate. An origin is what a deployment
 * dashboard actually gives you: Render shows `https://truzov-backend.onrender.com`, and the
 * natural thing to paste into Vercel is exactly that. Under the old convention, pasting it
 * produced requests to `/products` at the server root, which the backend's catch-all security
 * rule answers with **401 Unauthorized** rather than 404 — a misconfiguration that looks
 * convincingly like an auth bug and costs hours. Owning the version prefix in code removes
 * that failure mode entirely.
 */
const API_ORIGIN_VAR = 'NEXT_PUBLIC_API_URL';

/** Local backend default — see the backend's application.yml (`server.port: 8080`). */
const DEV_FALLBACK_ORIGIN = 'http://localhost:8080';

/**
 * Version prefix every endpoint in lib/api/endpoints hangs off. Bumping to /api/v2 is a
 * one-line change here; it is not something a deployer should be able to get wrong.
 */
const API_VERSION_PATH = '/api/v1';

/** Matches a value that already carries its own `/api/v<n>` suffix. */
const VERSIONED_SUFFIX = /\/api\/v\d+$/;

function resolveApiBaseUrl(): string {
  // Trim first: a trailing space in a .env file is invisible in an editor but produces a
  // malformed URL that fails with an opaque "Failed to parse URL" much later.
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configured) {
    // A localhost fallback is right for dev and catastrophic in production: a deployed bundle
    // would tell every visitor's browser to call *their own* machine on port 8080, which fails
    // as an opaque network error with no hint that a variable is missing. So the fallback is
    // scoped to non-production and a production build without the variable fails loudly.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variable ${API_ORIGIN_VAR}. ` +
          `Set it to the backend origin (e.g. https://truzov-backend.onrender.com) in the ` +
          `deployment environment. See .env.local.example.`
      );
    }

    return `${DEV_FALLBACK_ORIGIN}${API_VERSION_PATH}`;
  }

  // Strip trailing slashes so callers can always pass paths beginning with `/` without
  // producing a double slash (which some gateways treat as a distinct, 404-ing path).
  const origin = configured.replace(/\/+$/, '');

  // Tolerate a value that already ends in /api/v1. The variable was previously documented as
  // carrying that suffix, so an existing .env.local or a Vercel project configured against the
  // old convention keeps working instead of silently requesting /api/v1/api/v1/products.
  return VERSIONED_SUFFIX.test(origin) ? origin : `${origin}${API_VERSION_PATH}`;
}

/**
 * Fully-qualified base URL for the versioned API, e.g. `http://localhost:8080/api/v1`.
 * Never has a trailing slash.
 */
const apiBaseUrl = resolveApiBaseUrl();

export const env = {
  apiBaseUrl,
} as const;
