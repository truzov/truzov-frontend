'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '@/lib/api/endpoints/cart';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/queries';
import { addGuestItem, clearGuestCart } from '@/lib/cart/guest-cart.store';
import { useAuthModalActions, type BuyNowIntent } from '@/store/auth-modal.store';
import { useToastActions } from '@/store/ui.store';
import { adoptGuestSelection, setBuyNow } from '@/store/checkout.store';
import { useAppSelector, useAppStore } from '@/store/redux';
import { getProduct } from '@/lib/api/endpoints/catalog';
import { primaryImage } from '@/lib/utils/product';
import { effectivePrice } from '@/lib/utils/money';
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
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const query = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: ({ signal }) => getCart(signal),
    // Guests have no cart at all (the endpoint is bearer-only), so requesting one would be a
    // guaranteed 401 on every page load.
    enabled: isLoggedIn,
    // Short: stock and quantity caps are enforced server-side, and a stale cart is the one
    // place where showing an old number turns into a wrong price at checkout.
    staleTime: 15_000,
    refetchOnWindowFocus: 'always',
    refetchInterval: 30_000,
  });

  return {
    ...query,
    cart: query.data ?? EMPTY_CART,
  };
}

/** Header badge count. Guests count their local bag; the merge replaces it after sign-in. */
export function useCartItemCount(): number {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const guestItems = useAppSelector((state) => state.guestCart.items);
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
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const { addToast } = useToastActions();
  const store = useAppStore();
  const writes = useIsMutating({ mutationKey: ['cart-write'] });

  const mutation = useMutation({
    mutationKey: ['cart-write'],
    mutationFn: async (input: { productId: string; variantId?: string; quantity?: number; ownerId?: string }) => {
      if (!store.getState().auth.isLoggedIn || store.getState().auth.user?.id !== input.ownerId) throw new Error('Your account changed. Please try again.');
      const cart = await addCartItem({
        productId: input.productId,
        variantId: input.variantId,
        quantity: input.quantity ?? 1,
      });
      if (!store.getState().auth.isLoggedIn || store.getState().auth.user?.id !== input.ownerId) throw new Error('Your account changed. Please try again.');
      return cart;
    },
    onSuccess: async (cart, input) => {
      // The mutation returns the whole cart, so seed the cache directly instead of
      // invalidating — that keeps the header badge and cart page correct with no extra request.
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      if (store.getState().auth.user?.id === input.ownerId) queryClient.setQueryData(queryKeys.cart(), cart);
    },
    onError: (error) => {
      // Surfaced rather than swallowed: the common failures here are meaningful to the user —
      // out of stock, or the server's per-line quantity cap.
      addToast({ type: 'error', title: 'Could not add to cart', message: errorMessage(error) });
    },
  });

  const add = async (input: {
    productId: string;
    productName: string;
    variantId?: string;
    variantLabel?: string;
    quantity?: number;
    availableStock?: number;
    slug: string;
    imageUrl?: string;
    unitPrice: number;
  }) => {
    if (queryClient.isMutating({ mutationKey: ['cart-write'] })) return false;
    const quantity = input.quantity ?? 1;
    if (!isLoggedIn) {
      const existing = store.getState().guestCart.items.find((item) =>
        item.productId === input.productId && item.variantId === input.variantId);
      const remaining = Math.max(0, Math.min(20, input.availableStock ?? existing?.availableStock ?? 20) - (existing?.quantity ?? 0));
      if (quantity > remaining) {
        addToast({ type: 'warning', title: remaining ? `Only ${remaining} more can be added` : 'You have reached the limit for this item' });
        if (!remaining) return false;
      }
      store.dispatch(addGuestItem({
        productId: input.productId,
        variantId: input.variantId,
        variantLabel: input.variantLabel,
        availableStock: input.availableStock,
        quantity: Math.min(quantity, remaining),
        name: input.productName,
        slug: input.slug,
        imageUrl: input.imageUrl,
        unitPrice: input.unitPrice,
      }));
    } else {
      try {
        await mutation.mutateAsync({
          productId: input.productId, variantId: input.variantId, quantity,
          ownerId: store.getState().auth.user?.id,
        });
      } catch {
        return false;
      }
    }
    addToast({ type: 'success', title: 'Added to cart', message: input.productName, actionLabel: 'View cart', actionHref: '/cart' });
    return true;
  };
  return { add, isPending: mutation.isPending || Boolean(writes) };
}

/** Prepare a single-item checkout. AuthModal resumes the same intent after sign-in. */
export function useBuyNow() {
  const store = useAppStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const { openAuthModal } = useAuthModalActions();
  const { addToast } = useToastActions();
  const isPending = Boolean(useIsMutating({ mutationKey: ['buy-now'] }));
  const mutation = useMutation({
    mutationKey: ['buy-now'],
    mutationFn: async (intent: BuyNowIntent) => {
      const product = await getProduct(intent.productId);
      const variant = product.variants?.find((option) => option.id === intent.variantId);
      const availableStock = Math.min(product.stockCount, variant?.stockCount ?? product.stockCount);
      if ((product.variants?.length || intent.variantId) && !variant) throw new Error('Select an available option.');
      if (!product.inStock || variant?.inStock === false || intent.quantity > Math.min(20, availableStock)) {
        throw new Error(availableStock > 0 ? `Only ${Math.min(20, availableStock)} available for this option.` : 'This option is out of stock.');
      }
      const unitPrice = effectivePrice(product.price, variant);
      return {
        ...intent, id: `buy-now:${intent.productId}:${intent.variantId ?? ''}`, variantLabel: variant?.value,
        name: product.name, slug: product.slug, imageUrl: primaryImage(product)?.url,
        unitPrice, lineTotal: unitPrice * intent.quantity, inStock: true, availableStock,
      };
    },
    onError: (error) => addToast({ type: 'error', title: 'Could not start checkout', message: errorMessage(error) }),
  });
  const checkout = (intent: BuyNowIntent) => {
    const owner = store.getState().auth.user?.id;
    if (!owner || queryClient.isMutating({ mutationKey: ['buy-now'] })) return;
    mutation.mutate(intent, {
      onSuccess: (line) => {
        if (store.getState().auth.user?.id !== owner) return;
        store.dispatch(setBuyNow({ owner, item: line }));
        router.push('/checkout/address');
      },
    });
  };

  const buyNow = (intent: BuyNowIntent) => {
    if (!isLoggedIn) {
      openAuthModal({ mode: 'login', buyNow: intent }); // R2.6
      return;
    }
    checkout(intent);
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
  const store = useAppStore();
  const queryClient = useQueryClient();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const authStatus = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (!isLoggedIn || authStatus !== 'authenticated') {
      return;
    }

    const { guestCart: { items }, checkout: { selectionOwner } } = store.getState();
    if (items.length === 0) {
      return;
    }
    const owner = store.getState().auth.user?.id;
    if (owner && selectionOwner === 'guest') {
      store.dispatch(adoptGuestSelection(owner));
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
        store.dispatch(clearGuestCart());
      }
    })();

    return () => {
      cancelled = true;
    };
    // isLoggedIn/authStatus transitions are the only trigger; re-running on a cache change
    // would re-merge an already-cleared bag (a no-op, but a pointless effect chain).
  }, [isLoggedIn, authStatus, queryClient, store]);
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  return useMutation({
    mutationKey: ['cart-write'],
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
  const store = useAppStore();
  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  return useMutation({
    mutationKey: ['cart-write'],
    mutationFn: async (selection: string | string[]) => {
      const owner = store.getState().auth.user?.id;
      for (const itemId of Array.isArray(selection) ? selection : [selection]) {
        if (!owner || store.getState().auth.user?.id !== owner) throw new Error('Your account changed. Please try again.');
        const cart = await removeCartItem(itemId);
        if (store.getState().auth.user?.id !== owner) return;
        await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
        if (store.getState().auth.user?.id !== owner) return;
        queryClient.setQueryData(queryKeys.cart(), cart);
      }
    },
    onError: (error, selection) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      addToast({ type: 'error', title: Array.isArray(selection) ? 'Could not remove every selected item' : 'Could not remove item', message: errorMessage(error) });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['cart-write'],
    mutationFn: () => clearCart(),
    onSuccess: () => {
      // 204 returns no body, so there is nothing to seed — write the known-empty state.
      queryClient.setQueryData(queryKeys.cart(), EMPTY_CART);
    },
  });
}
