'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '@/lib/api/endpoints/cart';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/queries';
import { useGuestCartStore } from '@/lib/cart/guest-cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useAuthModalStore, type BuyNowIntent } from '@/store/auth-modal.store';
import { useUiStore } from '@/store/ui.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { cartLineKey } from '@/lib/cart/selection';
import type { CartDto } from '@/types/api';

/**
 * Cart hooks.
 *
 * Logged-in users get the server cart (one React Query entry; the server is the single source
 * of truth for stock and prices). Guests accumulate a localStorage bag instead of a login wall —
 * it replays into the server cart on sign-in via `useGuestCartMerge`, so the merge, the quantity
 * caps and the stock checks all happen server-side.
 */

/** Empty cart used while unauthenticated, so callers never have to null-check. */
const EMPTY_CART: CartDto = { items: [], itemCount: 0, subtotal: 0 };

export function useCart() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const query = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: ({ signal }) => getCart(signal),
    // Guests have no cart at all (the endpoint is bearer-only), so requesting one would be a
    // guaranteed 401 on every page load.
    enabled: isLoggedIn,
    // Short: stock and quantity caps are enforced server-side, and a stale cart is the one
    // place where showing an old number turns into a wrong price at checkout.
    staleTime: 15_000,
  });

  return {
    ...query,
    cart: query.data ?? EMPTY_CART,
  };
}

/** Header badge count. Guests count their local bag; the merge replaces it after sign-in. */
export function useCartItemCount(): number {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const guestItems = useGuestCartStore((state) => state.items);
  const guestCount = guestItems.reduce((total, item) => total + item.quantity, 0);
  const { cart } = useCart();
  return isLoggedIn ? cart.itemCount : guestCount;
}

/**
 * Add to cart. Guests write to the local bag; logged-in users hit the server. No login gate —
 * the Myntra-style flow lets anonymous users fill a bag and only authenticates at checkout.
 *
 * The snapshot fields (name, slug, image, price) are display-only for the guest bag; the merge
 * sends just productId/variantId/quantity, and the server re-prices and re-checks stock anyway.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const addToast = useUiStore((state) => state.addToast);
  const guestAdd = useGuestCartStore((state) => state.add);

  const mutation = useMutation({
    mutationFn: (input: { productId: string; variantId?: string; quantity?: number }) =>
      addCartItem({
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity ?? 1,
      }),
    onSuccess: (cart) => {
      // The mutation returns the whole cart, so seed the cache directly instead of
      // invalidating — that keeps the header badge and cart page correct with no extra request.
      queryClient.setQueryData(queryKeys.cart(), cart);
    },
    onError: (error) => {
      // Surfaced rather than swallowed: the common failures here are meaningful to the user —
      // out of stock, or the server's per-line quantity cap.
      addToast({ type: 'error', title: 'Could not add to cart', message: errorMessage(error) });
    },
  });

  const add = (input: {
    productId: string;
    productName: string;
    variantId?: string;
    quantity?: number;
    slug: string;
    imageUrl?: string;
    unitPrice: number;
  }) => {
    if (!isLoggedIn) {
      guestAdd({
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity ?? 1,
        name: input.productName,
        slug: input.slug,
        imageUrl: input.imageUrl,
        unitPrice: input.unitPrice,
      });
      addToast({
        type: 'success',
        title: 'Added to cart',
        message: input.productName,
        actionLabel: 'View cart',
        actionHref: '/cart',
      });
      return;
    }

    mutation.mutate(
      { productId: input.productId, variantId: input.variantId, quantity: input.quantity },
      {
        onSuccess: () => {
          addToast({
            type: 'success',
            title: 'Added to cart',
            message: input.productName,
            actionLabel: 'View cart',
            actionHref: '/cart',
          });
        },
      }
    );
  };

  // addAsync lets a caller await the POST before navigating (Buy Now); `add` stays fire-and-forget.
  return { add, addAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

/**
 * Buy Now: add the single item to the server cart, then go to checkout.
 *
 * Logged out, this opens the auth modal carrying the intent instead of writing to the guest bag
 * (Requirement 2.6) — so `useAddToCart`'s guest branch is unreachable from here. `checkout` is
 * returned as well because `AuthModal` resumes the intent after a login (Requirement 2.7).
 */
export function useBuyNow() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const { addAsync, isPending } = useAddToCart();

  const checkout = async (intent: BuyNowIntent) => {
    try {
      const cart = await addAsync(intent);
      const owner = useAuthStore.getState().user?.id;
      if (owner) {
        useCheckoutStore.getState().selectAll(owner);
        for (const line of cart.items) {
          const same = line.productId === intent.productId && (line.variantId ?? '') === (intent.variantId ?? '');
          if (!same) useCheckoutStore.getState().setLineSelected(owner, cartLineKey(line), false);
        }
      }
      router.push('/checkout/address'); // only after success (R2.5, R2.7)
    } catch {
      // useAddToCart.onError already raised the error toast, including the backend message and
      // the 10s TIMEOUT case. Nothing retained, no navigation (R2.9).
    }
  };

  const buyNow = (intent: BuyNowIntent) => {
    if (!isLoggedIn) {
      openAuthModal({ mode: 'login', buyNow: intent }); // R2.6
      return;
    }
    void checkout(intent);
  };

  return { buyNow, checkout, isPending };
}

/**
 * Replays the guest bag into the caller's server cart after sign-in.
 *
 * Must run inside `QueryClientProvider`. Sequential, not Promise.all: the server upserts lines
 * (same product/variant merges), and a burst of concurrent posts buys nothing but contention.
 * Each item is tolerated independently — a 409 (out of stock) or 400 (product gone) skips that
 * line and keeps the rest, which is the honest outcome after a price/stock change.
 */
export function useGuestCartMerge() {
  const queryClient = useQueryClient();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const authStatus = useAuthStore((state) => state.status);

  useEffect(() => {
    if (!isLoggedIn || authStatus !== 'authenticated') {
      return;
    }

    const items = useGuestCartStore.getState().items;
    if (items.length === 0) {
      return;
    }
    const owner = useAuthStore.getState().user?.id;
    if (owner && useCheckoutStore.getState().selectionOwner === 'guest') {
      useCheckoutStore.setState({ selectionOwner: owner, couponCode: '' });
    }

    let cancelled = false;

    void (async () => {
      for (const item of items) {
        try {
          const cart = await addCartItem({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          });
          if (!cancelled) {
            // The last successful response is the freshest cart; seed as we go so the UI is
            // right even if a later item fails.
            queryClient.setQueryData(queryKeys.cart(), cart);
          }
        } catch {
          // Line skipped deliberately (see docblock). The server's cart stays authoritative.
        }
      }
      if (!cancelled) {
        useGuestCartStore.getState().clear();
      }
    })();

    return () => {
      cancelled = true;
    };
    // isLoggedIn/authStatus transitions are the only trigger; re-running on a cache change
    // would re-merge an already-cleared bag (a no-op, but a pointless effect chain).
  }, [isLoggedIn, authStatus, queryClient]);
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, { quantity }),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
    },
    onError: (error) => {
      // No optimistic update to roll back here on purpose: quantity is bounded by server-side
      // stock and a per-line cap, so an optimistic number would frequently be wrong and then
      // snap back. Showing the server's answer is slower but never lies.
      addToast({ type: 'error', title: 'Could not update quantity', message: errorMessage(error) });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Could not remove item', message: errorMessage(error) });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => {
      // 204 returns no body, so there is nothing to seed — write the known-empty state.
      queryClient.setQueryData(queryKeys.cart(), EMPTY_CART);
    },
  });
}
