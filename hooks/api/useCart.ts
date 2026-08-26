'use client';

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
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import type { CartDto } from '@/types/api';

/**
 * Cart hooks.
 *
 * The cart is server state, so there is no cart store any more. Everything reads from one
 * React Query entry, which is also what removed the old bug class of a persisted local cart
 * disagreeing with what the server would actually charge for.
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

/** Header badge count. Reads the same cache entry, so it cannot drift from the cart page. */
export function useCartItemCount(): number {
  const { cart } = useCart();
  return cart.itemCount;
}

/**
 * Add to cart, with the login gate.
 *
 * Guests are prompted to sign in rather than accumulating a local basket. That was a deliberate
 * decision (plan §8.1): the API has no guest cart and no merge endpoint, so a local one would
 * need reconciliation on login — merge conflicts, stale prices, duplicate lines — to support a
 * flow the backend cannot complete anyway.
 *
 * `redirectTo` lets the caller send the user back where they were after signing in.
 */
export function useAddToCart(redirectTo?: string) {
  const queryClient = useQueryClient();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const addToast = useUiStore((state) => state.addToast);

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
  }) => {
    if (!isLoggedIn) {
      openAuthModal({ mode: 'login', redirectTo });
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

  return { add, isPending: mutation.isPending };
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
