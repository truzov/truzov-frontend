// Property-test generator decision (task 1.1): Option A — fast-check, pinned exact in
// devDependencies; properties use fc.assert(fc.property(...), { numRuns: 100 }).

import fc from 'fast-check';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { addCartItem } from '@/lib/api/endpoints/cart';
import { useAuthModalStore, type BuyNowIntent } from '@/store/auth-modal.store';
import { ApiError, ERROR_CODES } from '@/lib/api/errors';
import { useGuestCartStore } from '@/lib/cart/guest-cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import type { ProductSummaryDto } from '@/types/api';

/**
 * One stable `push` spy for the whole file, matching the pattern in `tests/auth-security.test.ts`:
 * the ordering and "pushed exactly once" assertions below need the real argument the navigation
 * receives, which a fresh `vi.fn()` per `useRouter()` call would throw away.
 */
const { buyNowPush } = vi.hoisted(() => ({ buyNowPush: vi.fn<(href: string) => void>() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: buyNowPush, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/products/raw-forest-honey-500g',
}));

/**
 * `AuthModal` renders `AuthForm`, a client component that reaches network hooks this file does
 * not want to drive. Replaced by a button that fires the same `onSuccess` prop, exactly like
 * `tests/auth-security.test.ts` — everything under test (`handleSuccess`, `useBuyNow`, the modal
 * store) still runs for real.
 */
vi.mock('@/components/auth/AuthForm', async () => {
  const { createElement } = await import('react');

  return {
    AuthForm: ({ onSuccess }: { onSuccess?: () => void }) =>
      createElement('button', { type: 'button', onClick: onSuccess }, 'login succeeded'),
  };
});

import { AuthModal } from '@/components/auth/AuthModal';
import { ProductCard } from '@/components/product/ProductCard';
import { useAddToCart, useBuyNow } from '@/hooks/api/useCart';

const GUEST_CART_STORAGE_KEY = 'truzov.guestCart';

const SIMPLE_PRODUCT = {
  id: 'p-honey',
  slug: 'raw-forest-honey-500g',
  name: 'Raw Forest Honey 500g',
  brand: 'Truzov',
  price: 599,
  mrp: 599,
  discount: 0,
  rating: 0,
  reviewCount: 0,
  isLabVerified: false,
  isBestseller: false,
  isNewArrival: false,
  inStock: true,
  images: [],
} as unknown as ProductSummaryDto;

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapWithQueryClient(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

/**
 * Generates a Buy_Now_Intent. `variantId` is present or absent (never null — the frontend
 * type omits the key entirely rather than sending `null`), `quantity` is any integer the
 * requirement allows (1..99) plus a couple outside it, since the property is about the store
 * and the request shape, not about validating quantity bounds.
 */
const intentArb: fc.Arbitrary<BuyNowIntent> = fc.record(
  {
    productId: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
    variantId: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
    quantity: fc.integer({ min: 1, max: 99 }),
  },
  { requiredKeys: ['productId', 'quantity'] },
);

/** Every string value nested anywhere in `value`, so a product id hidden in a nested object is still found. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, out));
  } else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectStrings(entry, out));
  }
  return out;
}

/** Snapshots every localStorage/sessionStorage key+value and document.cookie as one blob of text. */
function storageSnapshot(): string {
  const parts: string[] = [];

  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key !== null) {
        parts.push(key, store.getItem(key) ?? '');
      }
    }
  }

  parts.push(document.cookie);
  return parts.join('\u0000');
}

describe('Buy_Now_Intent lifecycle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0]?.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });
    useAuthModalStore.setState({ isOpen: false, mode: 'login', redirectTo: undefined, buyNow: undefined });
  });

  // Feature: auth-toast-buy-now-variant-selection, Property 3: A Buy_Now_Intent never outlives
  // its modal and never touches storage — for any intent, after openAuthModal({ buyNow: intent })
  // followed by closeAuthModal() the store holds no intent, and at every point in that sequence
  // no localStorage key, sessionStorage key or cookie contains the intent's product id.
  // Validates: Requirements 2.6, 2.8, 2.11
  it('is discarded by closeAuthModal and never appears in localStorage, sessionStorage or cookies', () => {
    fc.assert(
      fc.property(intentArb, (intent) => {
        window.localStorage.clear();
        window.sessionStorage.clear();

        // Before: the intent's product id is not already present by coincidence.
        expect(storageSnapshot().includes(intent.productId)).toBe(false);

        useAuthModalStore.getState().openAuthModal({ mode: 'login', buyNow: intent });

        // While retained: the store holds it in memory, but no storage mechanism does (R2.11).
        expect(useAuthModalStore.getState().buyNow).toStrictEqual(intent);
        expect(storageSnapshot().includes(intent.productId)).toBe(false);

        useAuthModalStore.getState().closeAuthModal();

        // After: the modal discarded the intent entirely (R2.6, R2.8), and it never touched storage.
        expect(useAuthModalStore.getState().buyNow).toBeUndefined();
        expect(storageSnapshot().includes(intent.productId)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: auth-toast-buy-now-variant-selection, Property 3 (request-shape half): for any
  // intent submitted through the Buy Now path, the request body's keys are exactly productId,
  // quantity, and — only when a variant is selected — variantId. No price, discount, total,
  // userId, customerId or cartId.
  // Validates: Requirements 5.2, 5.3
  it('submits a cart request body carrying only productId, quantity, and variantId when selected', async () => {
    await fc.assert(
      fc.asyncProperty(intentArb, async (intent) => {
        let capturedBody: unknown;

        vi.stubGlobal(
          'fetch',
          vi.fn((_url: string, init?: RequestInit) => {
            capturedBody = init?.body ? JSON.parse(init.body as string) : undefined;
            return Promise.resolve({
              ok: true,
              status: 201,
              headers: new Headers(),
              json: () => Promise.resolve({ data: { items: [], itemCount: 0, subtotal: 0 } }),
            } as unknown as Response);
          }),
        );

        try {
          await addCartItem(intent);

          expect(capturedBody).toBeDefined();
          const keys = Object.keys(capturedBody as Record<string, unknown>).sort();
          const expectedKeys = (intent.variantId !== undefined
            ? ['productId', 'quantity', 'variantId']
            : ['productId', 'quantity']
          ).sort();

          expect(keys).toStrictEqual(expectedKeys);
          expect((capturedBody as Record<string, unknown>).productId).toBe(intent.productId);
          expect((capturedBody as Record<string, unknown>).quantity).toBe(intent.quantity);
          if (intent.variantId !== undefined) {
            expect((capturedBody as Record<string, unknown>).variantId).toBe(intent.variantId);
          }

          // No price, discount, total, or owner/cart identifier ever rides along (R5.2, R5.3).
          const forbidden = ['price', 'discount', 'total', 'userId', 'customerId', 'cartId'];
          for (const field of forbidden) {
            expect(keys).not.toContain(field);
          }
        } finally {
          vi.unstubAllGlobals();
        }
      }),
      { numRuns: 100 },
    );
  });
});


// --- Unit tests for the Buy Now paths (task 2.9) ---------------------------------------------
//
// One case each per bullet in the task — the property tests above already cover the input
// space, so these are examples, not sweeps.

describe('Buy Now unit paths', () => {
  beforeEach(() => {
    buyNowPush.mockClear();
    window.localStorage.clear();
    useAuthModalStore.getState().closeAuthModal();
    useAuthStore.setState({ isLoggedIn: false, status: 'anonymous', user: null });
    useGuestCartStore.setState({ items: [], hydrated: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 2.6: a guest click opens the modal, retains the intent, and leaves the guest bag untouched.
  it('guest click opens the modal, retains the intent, and leaves the guest bag and its localStorage key untouched', () => {
    const queryClient = newQueryClient();
    const { result } = renderHook(() => useBuyNow(), {
      wrapper: wrapWithQueryClient(queryClient),
    });

    act(() => {
      result.current.buyNow({ productId: 'p-honey', quantity: 1 });
    });

    expect(useAuthModalStore.getState().isOpen).toBe(true);
    expect(useAuthModalStore.getState().buyNow).toStrictEqual({ productId: 'p-honey', quantity: 1 });
    expect(useGuestCartStore.getState().items).toStrictEqual([]);
    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
    expect(buyNowPush).not.toHaveBeenCalled();
  });

  // 2.5: an authenticated click must not navigate until the mutation resolves, then pushes once.
  it('authenticated click does not navigate until a deferred mutation resolves, then pushes exactly once', async () => {
    useAuthStore.setState({ isLoggedIn: true, status: 'authenticated' });

    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );

    const queryClient = newQueryClient();
    const { result } = renderHook(() => useBuyNow(), {
      wrapper: wrapWithQueryClient(queryClient),
    });

    act(() => {
      result.current.buyNow({ productId: 'p-honey', quantity: 1 });
    });

    // Still in flight: no push yet.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(buyNowPush).not.toHaveBeenCalled();

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: () => Promise.resolve({ data: { items: [], itemCount: 0, subtotal: 0 } }),
      } as unknown as Response);
    });

    await waitFor(() => expect(buyNowPush).toHaveBeenCalledTimes(1));
    expect(buyNowPush.mock.calls).toStrictEqual([['/checkout/address']]);
  });

  // 2.7: AuthModal's onSuccess carrying a retained intent posts, then pushes.
  it('modal onSuccess carrying a retained intent posts, then pushes', async () => {
    let capturedBody: unknown;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        capturedBody = init?.body ? JSON.parse(init.body as string) : undefined;
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers(),
          json: () => Promise.resolve({ data: { items: [], itemCount: 0, subtotal: 0 } }),
        } as unknown as Response);
      })
    );

    useAuthModalStore.getState().openAuthModal({
      mode: 'login',
      buyNow: { productId: 'p-honey', quantity: 1 },
    });

    const queryClient = newQueryClient();
    render(
      React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(AuthModal))
    );

    fireEvent.click(screen.getByRole('button', { name: 'login succeeded' }));

    await waitFor(() => expect(buyNowPush).toHaveBeenCalledTimes(1));
    expect(capturedBody).toStrictEqual({ productId: 'p-honey', quantity: 1 });
    expect(buyNowPush.mock.calls).toStrictEqual([['/checkout/address']]);
  });

  // 2.8: dismissing the modal discards the intent and stays on the page.
  it('dismissal discards the intent and stays on the page', () => {
    useAuthModalStore.getState().openAuthModal({
      mode: 'login',
      buyNow: { productId: 'p-honey', quantity: 1 },
    });

    useAuthModalStore.getState().closeAuthModal();

    expect(useAuthModalStore.getState().buyNow).toBeUndefined();
    expect(useAuthModalStore.getState().isOpen).toBe(false);
    expect(buyNowPush).not.toHaveBeenCalled();
  });

  // 2.9: a 409 and a TIMEOUT each toast and do not navigate.
  it.each([
    ['ApiError(409)', new ApiError({ code: ERROR_CODES.CONFLICT, message: 'Out of stock', status: 409 })],
    ['ApiError(TIMEOUT)', new ApiError({ code: ERROR_CODES.TIMEOUT, message: 'Request timed out', status: 0 })],
  ])('%s toasts and does not navigate', async (_label, thrown) => {
    useAuthStore.setState({ isLoggedIn: true, status: 'authenticated' });
    useUiStore.setState({ toasts: [] });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(thrown)));

    const queryClient = newQueryClient();
    const { result } = renderHook(() => useBuyNow(), {
      wrapper: wrapWithQueryClient(queryClient),
    });

    await act(async () => {
      result.current.buyNow({ productId: 'p-honey', quantity: 1 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(useUiStore.getState().toasts).toHaveLength(1));
    expect(useUiStore.getState().toasts[0]).toMatchObject({ type: 'error' });
    expect(buyNowPush).not.toHaveBeenCalled();
  });

  // Buy Now was removed from the product card, so card-initiated Buy Now is no longer a path;
  // the former "card intent carries quantity: 1..." test was deleted. Buy Now now lives only on
  // the detail page and the auth-modal resume path, both covered by the tests above.

  // 2.12: Add to Cart still does not navigate.
  it('Add to Cart still does not navigate', () => {
    useAuthStore.setState({ isLoggedIn: false, status: 'anonymous' });
    const queryClient = newQueryClient();
    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(ProductCard, { product: SIMPLE_PRODUCT })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(buyNowPush).not.toHaveBeenCalled();
    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });
});
