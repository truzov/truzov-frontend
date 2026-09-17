import type { ApiErrorBody, ApiErrorDetail } from '@/types/api';

/**
 * The backend's stable error codes. Only codes the UI actually branches on need to be here;
 * anything else is handled generically by showing the server's message.
 *
 * These are worth naming rather than comparing string literals inline, because a typo in
 * `'PHONE_NOT_VERIFED'` would silently disable the OTP redirect — the comparison just never
 * matches, and the user sees a bare 403 instead of being routed to verification.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  /**
   * A correct OTP was submitted for an identifier with no account. Only the identifier's owner
   * can reach it (they had to receive the code), so the UI may offer signup prefilled with it.
   */
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_DELIVERY_UNAVAILABLE: 'OTP_DELIVERY_UNAVAILABLE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** Client-side only: the request never reached the server (offline, DNS, CORS, abort). */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Client-side only: our own AbortController fired before the server answered. */
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Every failed API call throws this, so callers can branch on `code`/`status` instead of
 * regex-matching a message string.
 *
 * Replaces the previous `new Error(body?.message ?? body?.error ?? ...)`, which was broken:
 * the error envelope is `{ error: { code, message } }`, so `body.error` is an *object* and
 * that expression rendered `"[object Object]"` to users whenever `message` was absent.
 */
export class ApiError extends Error {
  readonly code: string;
  /** HTTP status, or 0 when the request never completed (network failure / timeout). */
  readonly status: number;
  readonly details?: ApiErrorDetail[];
  /** Backend correlation id — worth surfacing in support-facing UI. */
  readonly traceId?: string;
  readonly path?: string;
  /** Seconds from `Retry-After`, present on 429 and on 503 database responses. */
  readonly retryAfterSeconds?: number;

  constructor(init: {
    code: string;
    message: string;
    status: number;
    details?: ApiErrorDetail[];
    traceId?: string;
    path?: string;
    retryAfterSeconds?: number;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
    this.traceId = init.traceId;
    this.path = init.path;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** Build from a parsed `{ error }` envelope, falling back when fields are absent. */
  static fromBody(body: ApiErrorBody, status: number, retryAfterSeconds?: number): ApiError {
    return new ApiError({
      code: body.code || ERROR_CODES.INTERNAL_ERROR,
      // `server.error.include-message: never` means unhandled framework errors carry no
      // message at all, so a readable fallback is not optional.
      message: body.message || defaultMessageForStatus(status),
      status,
      details: body.details,
      traceId: body.traceId,
      path: body.path,
      retryAfterSeconds,
    });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * True for the two codes that mean "you are authenticated but must verify an OTP first".
 * The reference specifies that `details` carries `{ field: 'otpRequired', issue: 'true' }`,
 * but the code alone is the reliable signal, so that detail is not required to match.
 */
export function isOtpRequiredError(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.code === ERROR_CODES.PHONE_NOT_VERIFIED ||
      error.code === ERROR_CODES.ACCOUNT_NOT_VERIFIED)
  );
}

/**
 * Whether a failure could plausibly succeed on a retry.
 *
 * Used by the React Query retry predicate. 4xx are excluded because they are deterministic —
 * a 404 or a validation error will fail identically every time, and retrying only delays the
 * error the user needs to see. 429 is excluded even though it is transient, because the
 * reference explicitly says to respect `Retry-After` and avoid immediate retries; retrying
 * a rate limiter is how a client gets itself banned for longer.
 */
export function isRetryableError(error: unknown): boolean {
  if (!isApiError(error)) {
    return false;
  }

  if (error.status === 0) {
    // Network blip or timeout — genuinely worth one more attempt.
    return true;
  }

  if (error.status === 429) {
    return false;
  }

  return error.status >= 500;
}

/** First validation issue for a given field, for wiring server errors into form inputs. */
export function fieldError(error: unknown, field: string): string | undefined {
  if (!isApiError(error)) {
    return undefined;
  }

  return error.details?.find((detail) => detail.field === field)?.issue;
}

/**
 * Human-readable fallback for a status with no usable message.
 *
 * Exported because the client needs it on two paths: an error envelope whose `message` is empty,
 * and a response with no parseable envelope at all (a gateway error page, or an empty body from
 * `server.error.include-message: never`). Without it those surfaced as a blank error box.
 */
export function defaultMessageForStatus(status: number): string {
  if (status === 401) return 'Please sign in to continue.';
  if (status === 403) return 'You do not have access to this.';
  if (status === 404) return 'We could not find what you were looking for.';
  if (status === 409) return 'That conflicts with the current state. Please refresh and retry.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server had a problem. Please try again shortly.';
  return 'Something went wrong with that request.';
}

/**
 * User-facing message for any thrown value. Centralised so error UI never has to decide what
 * to do with a non-`ApiError` (a bug in our own code, say) and never leaks a stack trace.
 */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
