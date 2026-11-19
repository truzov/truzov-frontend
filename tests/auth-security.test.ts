import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { renderWithRedux as render } from './redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * One stable `push` spy for the whole file: the redirect tests below assert on the argument the
 * navigation actually receives, which a fresh `vi.fn()` per `useRouter()` call would throw away.
 */
const push = vi.hoisted(() => vi.fn<(href: string) => void>());

/**
 * `AuthEventBridge` is a client component built on the App Router's hooks, which jsdom does not
 * provide. Those two hooks are the only things stubbed in this file — the teardown under test
 * (`auth.store.logout`, `token-store.clearSession`, the guest bag, the checkout store and the
 * React Query cache) all run for real, because the point of the test is that the real wiring
 * clears the previous user's data.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/account/orders',
}));

/**
 * The call site under test in `AuthModal` is `handleSuccess`, which is only reachable through
 * `AuthForm`'s `onSuccess`. The form is therefore replaced by a button that fires that same prop;
 * everything the assertion depends on — the modal's redirect gate, the modal store and the router
 * push — still runs for real.
 */
vi.mock('@/components/auth/AuthForm', async () => {
  const { createElement } = await import('react');

  return {
    AuthForm: ({ onSuccess }: { onSuccess?: () => void }) =>
      createElement('button', { type: 'button', onClick: onSuccess }, 'login succeeded'),
  };
});

import { AuthEventBridge } from '@/components/auth/AuthEventBridge';
import { AuthModal } from '@/components/auth/AuthModal';
import { LoginForm } from '@/components/auth/LoginForm';
import { onAuthEvent, type AuthEvent } from '@/lib/api/auth-events';
import { addGuestItem } from '@/lib/cart/guest-cart.store';
import { closeAuthModal, openAuthModal } from '@/store/auth-modal.store';
import { authActions, authChanged } from '@/store/auth.store';
import { setSelectedAddress } from '@/store/checkout.store';
import { makeStore } from '@/store/redux';

let store: ReturnType<typeof makeStore>;
beforeEach(() => { store = makeStore(); });

const GUEST_CART_KEY = 'truzov.guestCart';
const CHECKOUT_KEY = 'truzov-checkout';

describe('logout teardown', () => {
  beforeEach(() => {
    window.localStorage.clear();


    // `POST /auth/logout` is a real network call. Rejecting it is the harsher case on purpose:
    // a failed revoke must still tear everything down locally, or a user who clicks "log out"
    // offline stays logged in.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline in tests')))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Requirement 5.9: a completed logout clears the Auth_Session, the Guest_Bag, the persisted
  // checkout state and the cached query data before the unauthenticated view renders.
  it('empties the guest bag, the persisted checkout state and the query cache, and emits session-cleared', async () => {
    const events: AuthEvent[] = [];
    const unsubscribe = onAuthEvent((event) => events.push(event));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    // Mounted before the session is seeded so the bridge's boot-time `restoreSession` settles as
    // "anonymous" (no refresh token in storage) instead of racing the logout under test.
    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(AuthEventBridge)
      ), { store }
    );

    store.dispatch(authChanged({ status: 'authenticated', isLoggedIn: true }));

    store.dispatch(addGuestItem({
      productId: 'p-honey',
      quantity: 2,
      name: 'Raw Forest Honey 500g',
      slug: 'raw-forest-honey-500g',
      unitPrice: 599,
    }));
    store.dispatch(setSelectedAddress('addr-1'));
    // A retained Buy_Now_Intent, as if the auth modal were opened from a Buy Now click.
    store.dispatch(openAuthModal({
      mode: 'login',
      buyNow: { productId: 'p-honey', quantity: 1 },
    }));
    // Everything cached was fetched as the user who is about to log out.
    queryClient.setQueryData(['cart'], { items: [{ productId: 'p-honey' }], subtotal: 1198 });
    queryClient.setQueryData(['orders'], [{ id: 'order-1' }]);
    queryClient.setQueryData(['addresses'], [{ id: 'addr-1', line1: '12 Residency Road' }]);

    // The seeds are real, so an "everything is empty" assertion below cannot pass vacuously.
    expect(store.getState().guestCart.items).toHaveLength(1);
    expect(window.localStorage.getItem(GUEST_CART_KEY)).toContain('p-honey');
    expect(store.getState().checkout.selectedAddressId).toBe('addr-1');
    expect(window.localStorage.getItem(CHECKOUT_KEY)).toContain('addr-1');
    expect(store.getState().authModal.buyNow).toStrictEqual({
      productId: 'p-honey',
      quantity: 1,
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(3);

    await store.dispatch(authActions.logout());

    // Auth_Session.
    expect(store.getState().auth.isLoggedIn).toBe(false);
    expect(store.getState().auth.status).toBe('anonymous');
    expect(store.getState().auth.user).toBeNull();

    // Guest_Bag — in memory and in its localStorage key.
    expect(store.getState().guestCart.items).toStrictEqual([]);
    expect(window.localStorage.getItem(GUEST_CART_KEY)).not.toContain('p-honey');

    // Persisted checkout state.
    expect(store.getState().checkout.selectedAddressId).toBeUndefined();
    expect(window.localStorage.getItem(CHECKOUT_KEY) ?? '').not.toContain('addr-1');

    // Retained Buy_Now_Intent (Requirement 5.9).
    expect(store.getState().authModal.buyNow).toBeUndefined();
    expect(store.getState().authModal.isOpen).toBe(false);

    // Cached query data — the live defect. This is only empty because `clearSession('logout')`
    // now emits, which is the sole trigger for the bridge's `queryClient.clear()`.
    expect(queryClient.getQueryCache().getAll()).toStrictEqual([]);
    expect(queryClient.getQueryData(['cart'])).toBeUndefined();
    expect(queryClient.getQueryData(['orders'])).toBeUndefined();
    expect(queryClient.getQueryData(['addresses'])).toBeUndefined();

    expect(store.getState().ui.toasts).toMatchObject([{ type: 'success', title: 'Logged out' }]);
    expect(events).toStrictEqual([
      { type: 'session-cleared', reason: 'logout' },
      { type: 'logout-completed' },
    ]);

    unsubscribe();
  });
});


/**
 * The same adversarial table `tests/utils.test.ts` runs against the predicate, run here against
 * the two navigations that consume it. A correct predicate that a call site forgets to consult
 * still leaves the origin, so every assertion below is on the argument `router.push` receives.
 *
 * Validates: Requirements 5.7, 5.8
 */
const REJECTED_TARGETS = [
  '//evil.com',
  '/\\evil.com',
  'https://evil.com',
  'javascript:alert(1)',
  'http://localhost:3000/x',
  '\\\\evil.com',
];

const ACCEPTED_TARGETS = ['/cart', '/checkout/address', '/account/orders?page=2'];

describe('AuthModal.handleSuccess redirect', () => {
  // `AuthModal` now also calls `useBuyNow()` (it resumes a retained Buy_Now_Intent on success),
  // which reaches `useQueryClient()` through `useAddToCart()`. Production always renders
  // `AuthModal` inside `app/providers.tsx`'s `QueryClientProvider`; these renders need the same.
  function renderAuthModal() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(AuthModal)), { store }
    );
  }

  beforeEach(() => {
    push.mockClear();
  });

  it('closes from the button without passing the click event to Redux', () => {
    store.dispatch(openAuthModal());
    const dispatch = vi.spyOn(store, 'dispatch');
    renderAuthModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close account dialog' }));

    expect(dispatch).toHaveBeenCalledWith(closeAuthModal());
    expect(store.getState().authModal.isOpen).toBe(false);
  });

  for (const target of REJECTED_TARGETS) {
    // 5.8: `openAuthModal` is callable from anywhere, so `redirectTo` is untrusted input.
    it(`discards redirectTo ${JSON.stringify(target)} and navigates to /`, () => {
      store.dispatch(openAuthModal({ mode: 'login', redirectTo: target }));
      renderAuthModal();

      fireEvent.click(screen.getByRole('button', { name: 'login succeeded' }));

      expect(push.mock.calls).toStrictEqual([['/']]);
    });
  }

  for (const target of ACCEPTED_TARGETS) {
    // 5.7: a same-origin relative route is passed through untouched.
    it(`navigates to redirectTo ${target} as given`, () => {
      store.dispatch(openAuthModal({ mode: 'login', redirectTo: target }));
      renderAuthModal();

      fireEvent.click(screen.getByRole('button', { name: 'login succeeded' }));

      expect(push.mock.calls).toStrictEqual([[target]]);
    });
  }
});

describe('LoginForm.resolveRedirect', () => {
  beforeEach(() => {
    push.mockClear();
    window.history.replaceState({}, '', '/login');
    vi.spyOn(authActions, 'sendOtp').mockReturnValue(async () => {});
    vi.spyOn(authActions, 'checkAccountExists').mockReturnValue(async () => true);
    vi.spyOn(authActions, 'loginWithPassword').mockReturnValue(async () => {});
  });

  afterEach(() => vi.restoreAllMocks());

  /** Renders the page variant (no `onSuccess`), so the component performs the navigation itself. */
  function renderLoginForm(redirectTo?: string) {
    render(React.createElement(LoginForm, { redirectTo }), { store });
    fireEvent.change(screen.getByLabelText('Email or phone number'), {
      target: { value: 'shopper@example.com' },
    });
  }

  async function submitOtpLogin(redirectTo?: string) {
    renderLoginForm(redirectTo);
    fireEvent.click(screen.getByRole('button', { name: /send code/i }));
    await waitFor(() => expect(store.getState().otpModal.isOpen).toBe(true));
  }

  async function submitPasswordLogin(redirectTo?: string) {
    renderLoginForm(redirectTo);
    fireEvent.click(screen.getByRole('button', { name: /password instead/i }));
    fireEvent.change(screen.getByPlaceholderText('Your password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  }

  for (const target of REJECTED_TARGETS) {
    it(`discards ${JSON.stringify(target)} on the password path and navigates to /`, async () => {
      await submitPasswordLogin(target);

      expect(push.mock.calls).toStrictEqual([['/']]);
    });

    // The verification popup receives the redirect directly, so an unsafe value must be gated to
    // `undefined` here rather than propagated for the popup to push later.
    it(`gates ${JSON.stringify(target)} out of the verification popup redirect`, async () => {
      await submitOtpLogin(target);

      expect(push).not.toHaveBeenCalled();
      expect(store.getState().otpModal.isOpen).toBe(true);
      expect(store.getState().otpModal.redirectTo).toBeUndefined();
    });
  }

  for (const target of ACCEPTED_TARGETS) {
    it(`navigates to ${target} as given on the password path`, async () => {
      await submitPasswordLogin(target);

      expect(push.mock.calls).toStrictEqual([[target]]);
    });

    it(`passes safe ${target} to the verification popup`, async () => {
      await submitOtpLogin(target);

      expect(push).not.toHaveBeenCalled();
      expect(store.getState().otpModal.redirectTo).toBe(target);
    });
  }

  // The second, equally untrusted source: the `?redirect=` the route guard appended. Same gate.
  it('gates the ?redirect= query parameter, not just the prop', async () => {
    window.history.replaceState({}, '', `/login?redirect=${encodeURIComponent('//evil.com')}`);

    await submitOtpLogin();

    expect(push).not.toHaveBeenCalled();
    expect(store.getState().otpModal.redirectTo).toBeUndefined();
  });

  it('carries a safe ?redirect= query parameter through', async () => {
    window.history.replaceState({}, '', '/login?redirect=%2Fcart');

    await submitOtpLogin();

    expect(push).not.toHaveBeenCalled();
    expect(store.getState().otpModal.redirectTo).toBe('/cart');
  });
});
