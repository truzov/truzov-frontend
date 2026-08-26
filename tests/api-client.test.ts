import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/lib/api/client';
import { onAuthEvent, type AuthEvent } from '@/lib/api/auth-events';
import { ApiError, ERROR_CODES, isRetryableError } from '@/lib/api/errors';
import { clearSession, getAccessToken, setSession } from '@/lib/api/token-store';

/**
 * Tests for the cross-cutting behaviour in lib/api/client.ts.
 *
 * These are unit tests rather than e2e for a reason: token expiry, concurrent 401s and rate limiting
 * are all painful to provoke against a live backend, and the single-flight refresh in particular is
 * a race that only shows up under concurrency. Getting it wrong silently logs users out
 * mid-session, which is exactly the class of bug worth pinning down here.
 */

/** Minimal Response stand-in — jsdom has fetch types but we control the body precisely. */
function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
  } as unknown as Response;
}

function noBodyResponse(status: number) {
  return {
    ok: true,
    status,
    headers: { get: () => null },
    json: async () => {
      throw new Error('204 has no body — json() must not be called');
    },
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  clearSession('logout', { silent: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession('logout', { silent: true });
});

describe('response envelope', () => {
  it('unwraps the data property', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { slug: 'raw-forest-honey-500g' } }));

    await expect(apiRequest<{ slug: string }>('/products/x')).resolves.toEqual({
      slug: 'raw-forest-honey-500g',
    });
  });

  it('resolves undefined for 204 without reading a body', async () => {
    // json() throws in this fixture, so this fails loudly if the client ever parses a 204.
    fetchMock.mockResolvedValue(noBodyResponse(204));

    await expect(apiRequest<void>('/cart', { method: 'DELETE', auth: true })).resolves.toBeUndefined();
  });
});

describe('error mapping', () => {
  it('maps the error envelope onto ApiError fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, {
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Product not found: nope',
          traceId: 'a90ef203',
          status: 404,
          path: '/api/v1/products/nope',
        },
      })
    );

    const error = await apiRequest('/products/nope').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).traceId).toBe('a90ef203');
    // Regression guard: the previous client did `body.message ?? body.error`, and since `error` is
    // an OBJECT that produced the literal string "[object Object]" for users.
    expect((error as ApiError).message).toBe('Product not found: nope');
  });

  it('falls back to a readable message when the body carries none', async () => {
    // `server.error.include-message: never` means unhandled framework errors have no message.
    fetchMock.mockResolvedValue(jsonResponse(500, null));

    const error = (await apiRequest('/products').catch((caught) => caught)) as ApiError;

    expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(error.message).not.toBe('');
    expect(error.message).not.toContain('object');
  });

  it('captures Retry-After on 429 and marks it non-retryable', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, { error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, {
        'Retry-After': '30',
      })
    );

    const error = (await apiRequest('/search?q=a').catch((caught) => caught)) as ApiError;

    expect(error.retryAfterSeconds).toBe(30);
    // The reference is explicit: respect Retry-After, do not retry immediately. Retrying a limiter
    // is how a client earns a longer block.
    expect(isRetryableError(error)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats 5xx as retryable but 4xx as final', () => {
    expect(isRetryableError(new ApiError({ code: 'X', message: '', status: 503 }))).toBe(true);
    expect(isRetryableError(new ApiError({ code: 'X', message: '', status: 404 }))).toBe(false);
    expect(isRetryableError(new ApiError({ code: 'X', message: '', status: 422 }))).toBe(false);
    // status 0 is a transport failure (offline, DNS), which genuinely may succeed on a retry.
    expect(isRetryableError(new ApiError({ code: 'X', message: '', status: 0 }))).toBe(true);
  });
});

describe('401 refresh and retry', () => {
  it('refreshes once, retries once, and stores the rotated pair', async () => {
    setSession({ accessToken: 'stale-access', refreshToken: 'refresh-1' });

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'nope' } }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: { accessToken: 'fresh-access', refreshToken: 'refresh-2', tokenType: 'Bearer', expiresIn: 900 },
        })
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: { itemCount: 2 } }));

    await expect(apiRequest<{ itemCount: number }>('/cart', { auth: true })).resolves.toEqual({
      itemCount: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/auth/refresh');
    expect(getAccessToken()).toBe('fresh-access');

    // The retry must carry the NEW token; sending the stale one again would 401 forever.
    const retryHeaders = (fetchMock.mock.calls[2]?.[1] as RequestInit).headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer fresh-access');
  });

  it('does not retry more than once when the fresh token is also rejected', async () => {
    setSession({ accessToken: 'stale', refreshToken: 'refresh-1' });

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'nope' } }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: { accessToken: 'fresh', refreshToken: 'refresh-2', tokenType: 'Bearer', expiresIn: 900 },
        })
      )
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'nope' } }));

    await expect(apiRequest('/cart', { auth: true })).rejects.toBeInstanceOf(ApiError);

    // Original + refresh + one retry. A loop here would spin against a revoked session.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('issues exactly ONE refresh for concurrent 401s', async () => {
    setSession({ accessToken: 'stale', refreshToken: 'refresh-1' });

    let refreshCalls = 0;

    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse(200, {
          data: { accessToken: 'fresh', refreshToken: 'refresh-2', tokenType: 'Bearer', expiresIn: 900 },
        });
      }

      // Anything still presenting the stale token gets a 401; the retry presents the fresh one.
      return getAccessToken() === 'fresh'
        ? jsonResponse(200, { data: { ok: true } })
        : jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'nope' } });
    });

    await Promise.all([
      apiRequest('/cart', { auth: true }),
      apiRequest('/wishlist', { auth: true }),
      apiRequest('/auth/me', { auth: true }),
    ]);

    /**
     * The core of the single-flight guard. Refresh ROTATES and invalidates the previous token, so
     * three parallel refreshes would mean the first succeeds and the other two fail with
     * REFRESH_TOKEN_INVALID — logging the user out at precisely the moment their session was
     * recoverable.
     */
    expect(refreshCalls).toBe(1);
  });

  it('clears the session and announces it when refresh fails', async () => {
    setSession({ accessToken: 'stale', refreshToken: 'dead-refresh' });

    const events: AuthEvent[] = [];
    const unsubscribe = onAuthEvent((event) => events.push(event));

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'nope' } }))
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { code: 'REFRESH_TOKEN_INVALID', message: 'expired' } })
      );

    await expect(apiRequest('/cart', { auth: true })).rejects.toBeInstanceOf(ApiError);

    expect(getAccessToken()).toBeNull();
    expect(events).toEqual([{ type: 'session-cleared', reason: 'refresh-failed' }]);

    unsubscribe();
  });

  it('does not attempt a refresh for an unauthenticated request', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'no' } }));

    await expect(apiRequest('/products')).rejects.toBeInstanceOf(ApiError);

    // A public endpoint answering 401 is not a token problem, so refreshing would be pointless.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('403 verification required', () => {
  it('announces otp-required for PHONE_NOT_VERIFIED', async () => {
    setSession({ accessToken: 'good', refreshToken: 'r' });

    const events: AuthEvent[] = [];
    const unsubscribe = onAuthEvent((event) => events.push(event));

    fetchMock.mockResolvedValue(
      jsonResponse(403, {
        error: {
          code: 'PHONE_NOT_VERIFIED',
          message: 'Verify your phone number',
          details: [{ field: 'otpRequired', issue: 'true' }],
        },
      })
    );

    await expect(apiRequest('/checkout', { method: 'POST', auth: true, body: {} })).rejects.toBeInstanceOf(
      ApiError
    );

    // Routing lives in AuthEventBridge; the client only reports, because it has no router.
    expect(events).toContainEqual({ type: 'otp-required' });

    unsubscribe();
  });
});

describe('request construction', () => {
  it('sends a correlation id and omits Authorization when unauthenticated', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }));

    await apiRequest('/categories');

    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    // X-Request-Id is one of the four headers the backend's CORS config allows, and it links a
    // client report to the backend's traceId.
    expect(headers['X-Request-Id']).toBeTruthy();
    expect(headers.Authorization).toBeUndefined();
  });

  it('drops empty and undefined query values and repeats arrays', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }));

    await apiRequest('/products', {
      query: { category: 'honey', brand: undefined, q: '', tags: ['raw', 'organic'] },
    });

    const url = String(fetchMock.mock.calls[0]?.[0]);

    expect(url).toContain('category=honey');
    // Sending "undefined"/"" as literal strings would come back as a VALIDATION_ERROR.
    expect(url).not.toContain('brand');
    expect(url).not.toContain('q=');
    // Repeated key, not comma-joined: Spring binds String[] from ?tags=a&tags=b, and a joined
    // value would arrive as one long tag.
    expect(url).toContain('tags=raw');
    expect(url).toContain('tags=organic');
  });
});
