import { env } from '@/lib/config/env';
import type { ApiEnvelope, ApiErrorEnvelope, TokenResponse } from '@/types/api';
import { emitAuthEvent } from './auth-events';
import { ApiError, ERROR_CODES, defaultMessageForStatus, isOtpRequiredError } from './errors';
import { clearSession, getAccessToken, getRefreshToken, setSession } from './token-store';

/**
 * The one function that talks to the network. Everything in lib/api/endpoints composes on top
 * of it, so cross-cutting behaviour (auth, the response envelope, error mapping, the 401
 * refresh dance, rate-limit handling) is implemented exactly once.
 */

/** A hung request is worse than a failed one: the user sees a spinner forever. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Serialised as JSON. Omit for GET/DELETE. */
  body?: unknown;
  /**
   * Query parameters. `undefined` and `null` values are dropped rather than sent as the
   * strings "undefined"/"null", which the backend would reject as validation errors.
   * Arrays are repeated (`?tags=a&tags=b`), matching how Spring binds a `String[]`.
   */
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  /** Attach the bearer token. Default false, so a public endpoint cannot leak one by accident. */
  auth?: boolean;
  /** Caller-supplied cancellation (React Query passes one on unmount). */
  signal?: AbortSignal;
  /**
   * Makes a retried POST safe: the server replays the original response instead of performing
   * the operation twice. Only meaningful on POST.
   *
   * A dedicated option rather than a general `headers` bag, because the browser silently drops
   * any header the backend's CORS allow-list does not name. Keeping the set closed means an
   * unsendable header is a compile error here rather than a silently-duplicated order in
   * production.
   */
  idempotencyKey?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  // A 401 on an authenticated call is the one case worth a second attempt: the access token
  // is short-lived (<=15 min) and expiring mid-session is normal, not exceptional.
  if (response.status === 401 && options.auth) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Exactly one retry. Not a loop: if the freshly-minted token is also rejected, the
      // problem is not staleness (revoked session, changed role, clock skew), and retrying
      // would spin without ever succeeding.
      const retried = await send(path, options);
      return handleResponse<T>(retried, path);
    }

    // Refresh failed, so the session is unrecoverable. clearSession emits `session-cleared`,
    // which the auth bridge turns into a redirect.
    clearSession('refresh-failed');
  }

  return handleResponse<T>(response, path);
}

/* ----------------------------------------------------------------- transport */

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, query, auth = false, signal, idempotencyKey } = options;

  const headers: Record<string, string> = {
    // Correlation id. The backend's CORS config explicitly allows X-Request-Id, and it
    // surfaces in the error envelope's traceId — which is what makes a user-reported failure
    // findable in the backend logs. Note: only the allow-listed headers may be sent;
    // any other custom header fails the browser preflight.
    'X-Request-Id': requestId(),
  };

  if (idempotencyKey) {
    // Allow-listed in the backend's CORS config alongside X-Request-Id. Without that entry the
    // browser drops it on a cross-origin request and the server, seeing no key, performs the
    // operation again — the exact duplicate this is meant to prevent, with no visible error.
    headers['Idempotency-Key'] = idempotencyKey;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // No token and auth required: the request still goes out, so the server produces the
    // authoritative 401 and the normal refresh/redirect path runs. Short-circuiting here
    // would duplicate that decision on the client.
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  // Abort if either our timeout or the caller's signal fires.
  const abortHandler = () => timeout.abort();
  signal?.addEventListener('abort', abortHandler);

  try {
    return await fetch(`${env.apiBaseUrl}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeout.signal,
    });
  } catch (error) {
    // fetch only rejects for transport-level problems: offline, DNS, CORS rejection, abort.
    // Everything HTTP (including 500) resolves, so this is genuinely "never reached the server".
    if (signal?.aborted) {
      // Caller cancelled (component unmounted). Propagate so React Query treats it as a
      // cancellation rather than surfacing an error to the user.
      throw error;
    }

    if (timeout.signal.aborted) {
      throw new ApiError({
        code: ERROR_CODES.TIMEOUT,
        message: 'The request timed out. Please check your connection and try again.',
        status: 0,
      });
    }

    throw new ApiError({
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Could not reach the server. Please check your connection.',
      status: 0,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortHandler);
  }
}

async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (response.ok) {
    // 204 has no body at all, so calling .json() would throw on an empty stream.
    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json()) as ApiEnvelope<T> | T;

    // Success responses use the `{ data }` envelope. The guard keeps us honest if an endpoint
    // ever answers unwrapped, rather than silently handing back `undefined`.
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as ApiEnvelope<T>).data;
    }

    return payload as T;
  }

  throw await toApiError(response, path);
}

async function toApiError(response: Response, path: string): Promise<ApiError> {
  // Retry-After is seconds on 429 and on the 503 database responses. Parsed before the body,
  // because a malformed body must not lose it.
  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
  const retryAfter =
    retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds
      : undefined;

  const body = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;

  const error =
    body && body.error
      ? ApiError.fromBody(body.error, response.status, retryAfter)
      : new ApiError({
          // No parseable envelope: a gateway/proxy error page, or an empty body from
          // `server.error.include-message: never`. A blank message would render an empty error
          // box, so the status-derived fallback is used instead.
          code: fallbackCode(response.status),
          message: defaultMessageForStatus(response.status),
          status: response.status,
          path,
          retryAfterSeconds: retryAfter,
        });

  // 403 PHONE_NOT_VERIFIED / ACCOUNT_NOT_VERIFIED means "authenticated, but finish OTP first".
  // Announced here so a single subscriber routes to /verify-otp; the error is still thrown so
  // the calling screen can also stop its own loading state.
  if (isOtpRequiredError(error)) {
    emitAuthEvent({ type: 'otp-required' });
  }

  return error;
}

/* ------------------------------------------------------------------- refresh */

/**
 * In-flight refresh, shared by every caller.
 *
 * This single-flight guard is the whole reason this is a module variable rather than a local:
 * a page typically fires several authenticated requests at once (cart, profile, wishlist). If
 * the access token has expired they all get 401 simultaneously, and without this each would
 * POST /auth/refresh with the same token. Refresh ROTATES and invalidates the old token, so the
 * first call would succeed and every other one would fail with REFRESH_TOKEN_INVALID —
 * logging the user out precisely when their session was recoverable.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  // Late arrivals await the existing attempt instead of starting a competing one.
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    // Deliberately a raw fetch, not apiRequest: routing the refresh through apiRequest would
    // let a 401 from the refresh endpoint trigger another refresh, recursively.
    const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId(),
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as ApiEnvelope<TokenResponse>;

    if (!payload?.data?.accessToken || !payload.data.refreshToken) {
      // Defensive: a 200 without both tokens would otherwise store `undefined` and produce a
      // confusing "Bearer undefined" on the retry.
      return false;
    }

    // Both tokens are replaced — the old refresh token is now invalid server-side.
    setSession(payload.data);
    return true;
  } catch {
    // Network failure during refresh. Reported as "not refreshed"; the caller clears the
    // session, which is the safe direction when we cannot prove the session is still valid.
    return false;
  }
}

/* --------------------------------------------------------------------- utils */

function buildQuery(
  query: RequestOptions['query']
): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      // Repeated key rather than a comma-joined string: Spring binds `String[] tags` from
      // `?tags=a&tags=b`, and a joined value would arrive as one 3-character tag.
      for (const entry of value) {
        if (entry !== '') {
          params.append(key, entry);
        }
      }
      continue;
    }

    params.append(key, String(value));
  }

  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}

function requestId(): string {
  // randomUUID needs a secure context; older Safari and plain-HTTP dev hosts lack it. The
  // fallback only needs to be unique enough to correlate one request in a log.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fallbackCode(status: number): string {
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.RESOURCE_NOT_FOUND;
  if (status === 409) return ERROR_CODES.CONFLICT;
  if (status === 429) return ERROR_CODES.RATE_LIMITED;
  if (status === 503) return ERROR_CODES.SERVICE_UNAVAILABLE;
  return ERROR_CODES.INTERNAL_ERROR;
}
