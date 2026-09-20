import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * One stable `push` spy for the whole file: the redirect tests below assert on the argument the
 * navigation actually receives, which a fresh `vi.fn()` per `useRouter()` call would throw away.
 */
const { push, openOtpModal } = vi.hoisted(() => ({
  push: vi.fn<(href: string) => void>(),
  openOtpModal: vi.fn<(options?: { redirectTo?: string }) => void>(),
}));

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

/**
 * The deleted `/verify-otp` page is replaced by a popup: the page-variant OTP path now calls
 * `openOtpModal({ redirectTo })` off this store instead of `router.push`. The mock mirrors the
 * real selector-based usage in `LoginForm` (`useOtpModalStore((state) => state.openOtpModal)`),
 * so the component receives the hoisted spy as its opener.
 */
vi.mock('@/store/otp-modal.store', () => ({
  useOtpModalStore: (
    selector: (state: {
      openOtpModal: typeof openOtpModal;
      closeOtpModal: () => void;
      isOpen: boolean;
      redirectTo?: string;
    }) => unknown
  ) => selector({ openOtpModal, closeOtpModal: vi.fn(), isOpen: false, redirectTo: undefined }),
}));

import { AuthEventBridge } from '@/components/auth/AuthEventBridge';
import { AuthModal } from '@/components/auth/AuthModal';
import { LoginForm } from '@/components/auth/LoginForm';
import { onAuthEvent, type AuthEvent } from '@/lib/api/auth-events';
import { useGuestCartStore } from '@/lib/cart/guest-cart.store';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { useUiStore } from '@/store/ui.store';

const GUEST_CART_KEY = 'truzov.guestCart';
const CHECKOUT_KEY = 'truzov-checkout';

describe('logout teardown', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useGuestCartStore.setState({ items: [], hydrated: true });
    useCheckoutStore.setState({ selectedAddressId: undefined });
    useUiStore.setState({ toasts: [] });
    useAuthModalStore.getState().closeAuthModal();
    useAuthStore.getState().resetSession();

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
      )
    );

    useAuthStore.setState({ status: 'authenticated', isLoggedIn: true });

    useGuestCartStore.getState().add({
      productId: 'p-honey',
      quantity: 2,
      name: 'Raw Forest Honey 500g',
      slug: 'raw-forest-honey-500g',
      unitPrice: 599,
    });
    useCheckoutStore.getState().setSelectedAddress('addr-1');
    // A retained Buy_Now_Intent, as if the auth modal were opened from a Buy Now click.
    useAuthModalStore.getState().openAuthModal({
      mode: 'login',
      buyNow: { productId: 'p-honey', quantity: 1 },
    });
    // Everything cached was fetched as the user who is about to log out.
    queryClient.setQueryData(['cart'], { items: [{ productId: 'p-honey' }], subtotal: 1198 });
    queryClient.setQueryData(['orders'], [{ id: 'order-1' }]);
    queryClient.setQueryData(['addresses'], [{ id: 'addr-1', line1: '12 Residency Road' }]);

    // The seeds are real, so an "everything is empty" assertion below cannot pass vacuously.
    expect(useGuestCartStore.getState().items).toHaveLength(1);
    expect(window.localStorage.getItem(GUEST_CART_KEY)).toContain('p-honey');
    expect(useCheckoutStore.getState().selectedAddressId).toBe('addr-1');
    expect(window.localStorage.getItem(CHECKOUT_KEY)).toContain('addr-1');
    expect(useAuthModalStore.getState().buyNow).toStrictEqual({
      productId: 'p-honey',
      quantity: 1,
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(3);

    await useAuthStore.getState().logout();

    // Auth_Session.
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(useAuthStore.getState().user).toBeNull();

    // Guest_Bag — in memory and in its localStorage key.
    expect(useGuestCartStore.getState().items).toStrictEqual([]);
    expect(useGuestCartStore.getState().itemCount()).toBe(0);
    expect(window.localStorage.getItem(GUEST_CART_KEY)).not.toContain('p-honey');

    // Persisted checkout state.
    expect(useCheckoutStore.getState().selectedAddressId).toBeUndefined();
    expect(window.localStorage.getItem(CHECKOUT_KEY) ?? '').not.toContain('addr-1');

    // Retained Buy_Now_Intent (Requirement 5.9).
    expect(useAuthModalStore.getState().buyNow).toBeUndefined();
    expect(useAuthModalStore.getState().isOpen).toBe(false);

    // Cached query data — the live defect. This is only empty because `clearSession('logout')`
    // now emits, which is the sole trigger for the bridge's `queryClient.clear()`.
    expect(queryClient.getQueryCache().getAll()).toStrictEqual([]);
    expect(queryClient.getQueryData(['cart'])).toBeUndefined();
    expect(queryClient.getQueryData(['orders'])).toBeUndefined();
    expect(queryClient.getQueryData(['addresses'])).toBeUndefined();

    // The event itself, emitted exactly once with the logout reason.
    expect(events).toStrictEqual([{ type: 'session-cleared', reason: 'logout' }]);

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
      React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(AuthModal))
    );
  }

  beforeEach(() => {
    push.mockClear();
    useAuthModalStore.getState().closeAuthModal();
  });

  for (const target of REJECTED_TARGETS) {
    // 5.8: `openAuthModal` is callable from anywhere, so `redirectTo` is untrusted input.
    it(`discards redirectTo ${JSON.stringify(target)} and navigates to /`, () => {
      useAuthModalStore.getState().openAuthModal({ mode: 'login', redirectTo: target });
      renderAuthModal();

      fireEvent.click(screen.getByRole('button', { name: 'login succeeded' }));

      expect(push.mock.calls).toStrictEqual([['/']]);
    });
  }

  for (const target of ACCEPTED_TARGETS) {
    // 5.7: a same-origin relative route is passed through untouched.
    it(`navigates to redirectTo ${target} as given`, () => {
      useAuthModalStore.getState().openAuthModal({ mode: 'login', redirectTo: target });
      renderAuthModal();

      fireEvent.click(screen.getByRole('button', { name: 'login succeeded' }));

      expect(push.mock.calls).toStrictEqual([[target]]);
    });
  }
});

describe('LoginForm.resolveRedirect', () => {
  beforeEach(() => {
    push.mockClear();
    openOtpModal.mockClear();
    window.history.replaceState({}, '', '/login');
    // Only the two network-backed actions are replaced. `resolveRedirect` and both pushes are the
    // component's own code and run for real.
    useAuthStore.setState({
      sendOtp: vi.fn(async () => {}),
      loginWithPassword: vi.fn(async () => {}),
      isLoading: false,
      error: null,
      errorCode: null,
    });
  });

  /** Renders the page variant (no `onSuccess`), so the component performs the navigation itself. */
  function renderLoginForm(redirectTo?: string) {
    render(React.createElement(LoginForm, { redirectTo }));
    fireEvent.change(screen.getByLabelText('Email or Phone Number'), {
      target: { value: 'shopper@example.com' },
    });
  }

  async function submitOtpLogin(redirectTo?: string) {
    renderLoginForm(redirectTo);
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => expect(openOtpModal).toHaveBeenCalledTimes(1));
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
      expect(openOtpModal).toHaveBeenCalledTimes(1);
      expect(openOtpModal).toHaveBeenCalledWith({ redirectTo: undefined });
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
      expect(openOtpModal).toHaveBeenCalledWith({ redirectTo: target });
    });
  }

  // The second, equally untrusted source: the `?redirect=` the route guard appended. Same gate.
  it('gates the ?redirect= query parameter, not just the prop', async () => {
    window.history.replaceState({}, '', `/login?redirect=${encodeURIComponent('//evil.com')}`);

    await submitOtpLogin();

    expect(push).not.toHaveBeenCalled();
    expect(openOtpModal).toHaveBeenCalledWith({ redirectTo: undefined });
  });

  it('carries a safe ?redirect= query parameter through', async () => {
    window.history.replaceState({}, '', '/login?redirect=%2Fcart');

    await submitOtpLogin();

    expect(push).not.toHaveBeenCalled();
    expect(openOtpModal).toHaveBeenCalledWith({ redirectTo: '/cart' });
  });
});
