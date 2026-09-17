// Property-test generator decision (task 1.1): Option A — fast-check, pinned exact in devDependencies; properties use fc.assert(fc.property(...), { numRuns: 100 }). Tasks 1.4, 2.2 and 3.4 follow this.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { Toaster } from '@/components/ui/Toaster';
import { ApiError, ERROR_CODES, isApiError } from '@/lib/api/errors';
import { loginFailureToast, useAuthStore } from '@/store/auth.store';
import { useUiStore, type ToastMessage, type ToastType } from '@/store/ui.store';
import type { TokenResponse, UserProfileDto } from '@/types/api';

/** The only two strings the mapper is allowed to put in `title`. */
const NETWORK_TITLE = 'Network error, please try again';
const FAILED_TITLE = 'Login failed';

const MULTI_BYTE = ['é', '中', '😀', 'ने', '🇮🇳'];

/** A toast may carry these fields and nothing else. */
const ALLOWED_KEYS = ['type', 'title', 'message'];

/** Exactly `length` UTF-16 code units built from `unit`, so the 200-char boundary is hit exactly. */
function repeatTo(unit: string, length: number): string {
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

const messageArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc.constantFrom(' ', '   ', '\t', '\n', ' \t\n '),
  // 199/200/201 straddle the truncation boundary; 400 is well past it.
  fc
    .tuple(fc.constantFrom('a', ...MULTI_BYTE), fc.constantFrom(199, 200, 201, 400))
    .map(([unit, length]) => repeatTo(unit, length)),
  fc.string(),
  fc.string({ minLength: 1, maxLength: 300 }),
  fc.constantFrom(...MULTI_BYTE.map((glyph) => `Invalid credentials ${glyph}`)),
  // Leading/trailing whitespace, so the trim is exercised rather than assumed away.
  fc.string().map((body) => `  ${body}\n`),
  fc.constant('<img src=x onerror=alert(1)>'),
);

const apiErrorArb: fc.Arbitrary<ApiError> = fc
  .record({
    code: fc.oneof(
      fc.constantFrom(
        ERROR_CODES.NETWORK_ERROR,
        ERROR_CODES.TIMEOUT,
        ERROR_CODES.UNAUTHORIZED,
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_CODES.ACCOUNT_NOT_VERIFIED,
      ),
      fc.string(),
    ),
    message: messageArb,
    // 0 is the client-side "never reached the server" marker; the rest are real HTTP statuses.
    status: fc.oneof(fc.constant(0), fc.integer({ min: 100, max: 599 }), fc.integer()),
    // Both construction paths: the raw constructor, and the envelope parser that substitutes a
    // default message for a blank one.
    viaBody: fc.boolean(),
  })
  .map(({ code, message, status, viaBody }) =>
    viaBody ? ApiError.fromBody({ code, message }, status) : new ApiError({ code, message, status }),
  );

/** Values a login path could throw that are not `ApiError` — a bug in our own code, say. */
const nonApiErrorArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.string(),
  messageArb.map((message) => new Error(message)),
  // A look-alike: has `message` and `status: 0`, but is not an ApiError. Must not be read.
  messageArb.map((message) => ({ message, status: 0 })),
  fc.anything(),
);

describe('loginFailureToast', () => {
  // Feature: auth-toast-buy-now-variant-selection, Property 1: Login failure toast is bounded,
  // typed, and carries nothing local — for any thrown value the toast is type 'error', its
  // message is absent or at most 200 characters and a prefix of the error's own message, and its
  // title is exactly 'Network error, please try again' or 'Login failed'.
  // Validates: Requirements 1.3, 1.4, 1.5, 1.15, 5.6
  it('is type error, bounded to 200 chars of the error’s own message, and titled from a fixed set', () => {
    fc.assert(
      fc.property(fc.oneof(apiErrorArb, nonApiErrorArb), (thrown) => {
        const toast = loginFailureToast(thrown);

        // 1.3/1.4/1.5: error-styled, and the only fields present are the ones asserted below,
        // so there is no third slot for anything local to travel in (1.15).
        expect(toast.type).toBe('error');
        expect(Object.keys(toast).filter((key) => !ALLOWED_KEYS.includes(key))).toStrictEqual([]);

        if (isApiError(thrown) && thrown.status === 0) {
          // 1.5: the request never reached the server, so there is no server message to show.
          expect(toast.title).toBe(NETWORK_TITLE);
          expect(toast.message).toBeUndefined();
          return;
        }

        // 1.4/5.6: everything else carries the generic wording in the title.
        expect(toast.title).toBe(FAILED_TITLE);

        if (!isApiError(thrown)) {
          // 1.15: a non-ApiError is never read for text, not even a `message` look-alike.
          expect(toast.message).toBeUndefined();
          return;
        }

        const own = thrown.message.trim();

        if (own === '') {
          expect(toast.message).toBeUndefined();
          return;
        }

        // 1.3: present, bounded, and drawn only from the error's own words.
        expect(toast.message).toBeDefined();
        expect(toast.message!.length).toBeLessThanOrEqual(200);
        expect(own.startsWith(toast.message!)).toBe(true);
        expect(toast.message!.length).toBe(Math.min(own.length, 200));
      }),
      { numRuns: 300 },
    );
  });
});


/**
 * A toast request as any call site writes one: `type` and `title` always, the optional slots
 * sometimes. `requiredKeys` keeps the optional keys genuinely absent rather than set to
 * `undefined`, so the queue is compared against the real shape callers pass.
 */
const toastRequestArb: fc.Arbitrary<Omit<ToastMessage, 'id'>> = fc
  .record(
    {
      type: fc.constantFrom<ToastType>('success', 'error', 'info', 'warning'),
      title: fc.oneof(
        fc.constantFrom('Login successful', 'Login failed', 'Logged out', NETWORK_TITLE),
        fc.string(),
      ),
      message: messageArb,
      actionLabel: fc.string(),
      actionHref: fc.oneof(fc.constantFrom('/cart', '/checkout/address'), fc.string()),
    },
    { requiredKeys: ['type', 'title'] },
  )
  // `fc.record` builds null-prototype objects; a real call site passes an object literal, and the
  // spread keeps the comparison below about keys and values rather than about the prototype.
  .map((request) => ({ ...request }));

describe('ui.store toast queue', () => {
  // Feature: auth-toast-buy-now-variant-selection, Property 2: The toast queue is capped at 3,
  // newest first — for any non-empty sequence of toast requests, after replaying them into
  // store/ui.store.ts the queue holds at most 3 toasts, holds exactly the last 3 requested (or
  // all of them if fewer), in newest-first order, with unique ids.
  // Validates: Requirements 1.12, 1.13
  it('holds at most the 3 most recently requested toasts, newest first, with unique ids', () => {
    fc.assert(
      fc.property(fc.array(toastRequestArb, { minLength: 1, maxLength: 12 }), (requests) => {
        // The store is a module singleton, so each iteration starts from an empty queue.
        useUiStore.setState({ toasts: [] });

        for (const request of requests) {
          useUiStore.getState().addToast(request);
        }

        const { toasts } = useUiStore.getState();
        // 1.13: the newest 3 survive, oldest first out; newest-first order (1.12).
        const expected = requests.slice(-3).reverse();

        expect(toasts.length).toBeLessThanOrEqual(3);
        expect(toasts).toHaveLength(expected.length);

        toasts.forEach((toast, index) => {
          const { id, ...requested } = toast;
          // Contents are exactly what was requested — nothing dropped, reordered or rewritten.
          expect(requested).toStrictEqual(expected[index]);
          expect(typeof id).toBe('string');
          expect(id).not.toBe('');
        });

        // Unique ids: `removeToast` filters by id, so a collision would dismiss two toasts at once.
        expect(new Set(toasts.map((toast) => toast.id)).size).toBe(toasts.length);
      }),
      { numRuns: 200 },
    );
  });
});


/* ------------------------------------------------------------------------- */
/* Task 1.6 — wording, timing and inert rendering. One case each: the two    */
/* properties above already cover the input space, so nothing here sweeps.   */
/*                                                                          */
/* This file stays `.ts`: `Toaster` is mounted with `React.createElement`,   */
/* the same pattern `tests/auth-security.test.ts` uses, so no rename is      */
/* needed to render a component here.                                       */
/* ------------------------------------------------------------------------- */

const TEST_USER: UserProfileDto = {
  id: 'u-1',
  name: 'Asha Rao',
  role: 'customer',
  emailVerified: true,
  phoneVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const TOKENS: TokenResponse = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: TEST_USER,
};

/**
 * The parts of `Response` that `lib/api/client.ts` actually reads, and nothing else.
 *
 * `fetch` is stubbed rather than `lib/api/endpoints/auth`, matching `tests/auth-security.test.ts`:
 * the real endpoint module, the real `{ data }` envelope unwrapping and the real store transitions
 * all run, so a toast raised here is raised by the same code path a browser would take.
 */
function okEnvelope(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () => Promise.resolve({ data }),
  } as unknown as Response;
}

describe('auth toast wording', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUiStore.setState({ toasts: [] });
    useAuthStore.getState().resetSession();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(okEnvelope(TOKENS)))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const onlyToast = () => {
    const { toasts } = useUiStore.getState();
    expect(toasts).toHaveLength(1);
    return toasts[0];
  };

  // 1.2: all three ways to become logged in toast, because the toast is raised in the store
  // rather than in whichever screen started the login.
  it('raises “Login successful” for a password login', async () => {
    await useAuthStore.getState().loginWithPassword('9876543210', 'correct-horse-battery');

    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(onlyToast()).toMatchObject({ type: 'success', title: 'Login successful' });
  });

  it('raises “Login successful” for an OTP login', async () => {
    useAuthStore.setState({ otpSessionId: 'otp-session-1' });

    await useAuthStore.getState().verifyOtp('123456');

    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(onlyToast()).toMatchObject({ type: 'success', title: 'Login successful' });
  });

  it('raises “Login successful” for a Google login', async () => {
    await useAuthStore.getState().loginWithGoogle('google-auth-code', 'pkce-verifier');

    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(onlyToast()).toMatchObject({ type: 'success', title: 'Login successful' });
  });

  // 1.6: the toast lives in `logout`'s `finally`, so a failed server-side revoke still confirms
  // the local teardown the user asked for. Rejecting the call is the harsher case on purpose.
  it('raises “Logged out” once the session is cleared, even when the revoke call fails', async () => {
    useAuthStore.setState({ status: 'authenticated', isLoggedIn: true, user: TEST_USER });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline in tests')))
    );

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(onlyToast()).toMatchObject({ type: 'success', title: 'Logged out' });
  });

  // A silent session restore is not a login request, so it must stay silent. `status` moving off
  // `idle` is what proves the method ran rather than returning early for some other reason.
  it('raises nothing when a session is restored', async () => {
    useAuthStore.setState({ status: 'idle' });

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(useUiStore.getState().toasts).toStrictEqual([]);
  });
});

const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

describe('Toaster rendering', () => {
  beforeEach(() => {
    useUiStore.setState({ toasts: [] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const renderToaster = () => render(React.createElement(Toaster));

  /** Toasts are raised the way the app raises them — through the store, not through props. */
  const raise = (toast: Omit<ToastMessage, 'id'>) => {
    act(() => {
      useUiStore.getState().addToast(toast);
    });
  };

  const tick = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  /** The container is the Toaster's single root node, present even when the queue is empty. */
  const region = (container: HTMLElement) => container.firstElementChild as HTMLElement;

  // 1.8: 7000 ms ±250 for an error toast. 6749 is the last instant removal is not yet allowed;
  // 7250 is the last instant it must have happened.
  it('removes an error toast within the 7000 ms window and not before it', () => {
    vi.useFakeTimers();
    renderToaster();
    raise({ type: 'error', title: FAILED_TITLE });

    expect(screen.getByText(FAILED_TITLE)).toBeInTheDocument();

    tick(6749);
    expect(screen.getByText(FAILED_TITLE)).toBeInTheDocument();

    tick(501);
    expect(screen.queryByText(FAILED_TITLE)).not.toBeInTheDocument();
  });

  // 1.8: 5000 ms ±250 for every other type.
  it('removes a non-error toast within the 5000 ms window and not before it', () => {
    vi.useFakeTimers();
    renderToaster();
    raise({ type: 'success', title: 'Login successful' });

    tick(4749);
    expect(screen.getByText('Login successful')).toBeInTheDocument();

    tick(501);
    expect(screen.queryByText('Login successful')).not.toBeInTheDocument();
  });

  // 1.9: immediately, i.e. with no timer advanced at all.
  it('removes a toast the moment its dismiss control is activated', () => {
    vi.useFakeTimers();
    renderToaster();
    raise({ type: 'success', title: 'Logged out' });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(screen.queryByText('Logged out')).not.toBeInTheDocument();
    expect(useUiStore.getState().toasts).toStrictEqual([]);
  });

  // 1.14 / 5.5: `Toaster` renders `message` as a JSX text child, so markup arrives as characters.
  // The payload is the one a backend `message` could carry straight from an ErrorResponse.
  it('renders a markup-bearing message as literal characters and creates no element', () => {
    renderToaster();
    raise({ type: 'error', title: FAILED_TITLE, message: XSS_PAYLOAD });

    // Found by its text content, which is only possible if the angle brackets were escaped.
    expect(screen.getByText(XSS_PAYLOAD)).toBeInTheDocument();
    // The payload's own element never came into being, so its `onerror` never had a host.
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
  });

  // 1.11: above AuthModal's `z-[80]`, and `pointer-events-none` so the empty container cannot
  // swallow clicks on the modal's own `absolute right-4 top-4` close button.
  it('renders the container above the auth modal overlay without capturing clicks', () => {
    const { container } = renderToaster();

    expect(region(container).classList.contains('z-[90]')).toBe(true);
    expect(region(container).classList.contains('pointer-events-none')).toBe(true);
  });

  // 1.12: three separate nodes in the one gapped grid, so they stack instead of overlapping.
  it('lays three active toasts out as three nodes in a single grid', () => {
    const { container } = renderToaster();
    raise({ type: 'success', title: 'Login successful' });
    raise({ type: 'error', title: FAILED_TITLE });
    raise({ type: 'success', title: 'Logged out' });

    expect(region(container).classList.contains('grid')).toBe(true);
    expect(region(container).classList.contains('gap-3')).toBe(true);
    expect(region(container).children).toHaveLength(3);

    for (const card of Array.from(region(container).children)) {
      // Each card re-enables pointer events, so the dismiss button stays clickable.
      expect(card.classList.contains('pointer-events-auto')).toBe(true);
    }
  });
});
