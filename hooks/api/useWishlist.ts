'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  addWishlistItem,
  getWishlist,
  moveWishlistItemToCart,
  removeWishlistItem,
} from '@/lib/api/endpoints/wishlist';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/queries';
import { useAuthModalActions } from '@/store/auth-modal.store';
import { useToastActions } from '@/store/ui.store';
import type { WishlistItemDto } from '@/types/api';
import { useAppSelector } from '@/store/redux';

const EMPTY: WishlistItemDto[] = [];

/**
 * Wishlist, plus the productId -> itemId lookup the UI needs.
 *
 * The lookup exists because the API is asymmetric: you SAVE by product id, but you REMOVE and
 * MOVE by wishlist item id. A heart on a product card only knows the product id, so without a
 * map there is no way to un-save from a listing page.
 */
export function useWishlist() {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const query = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: ({ signal }) => getWishlist(signal),
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  const items = query.data ?? EMPTY;

  const itemIdByProductId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.productId, item.id);
    }
    return map;
  }, [items]);

  return { ...query, items, itemIdByProductId };
}

/** Whether a given product is saved. Always false for guests, who have no wishlist. */
export function useIsWishlisted(productId: string): boolean {
  const { itemIdByProductId } = useWishlist();
  return itemIdByProductId.has(productId);
}

/**
 * One toggle for the heart icon, in both directions.
 *
 * Guests get the auth modal instead of a local list, for the same reason as the cart: the
 * endpoint is bearer-only, so a local list could not be synced without a merge step the API
 * does not offer.
 */
export function useToggleWishlist(redirectTo?: string) {
  const queryClient = useQueryClient();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const { openAuthModal } = useAuthModalActions();
  const { addToast } = useToastActions();
  const { itemIdByProductId } = useWishlist();

  const mutation = useMutation({
    mutationFn: async (productId: string) => {
      const existingItemId = itemIdByProductId.get(productId);

      if (existingItemId) {
        await removeWishlistItem(existingItemId);
        return 'removed' as const;
      }

      await addWishlistItem({ productId });
      return 'added' as const;
    },
    onSuccess: () => {
      // Refetch rather than patch the cache: an add returns an unspecified body, and the new
      // item's id is required for the next removal. Guessing it would break the toggle.
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Could not update wishlist', message: errorMessage(error) });
    },
  });

  const toggle = (productId: string) => {
    if (!isLoggedIn) {
      openAuthModal({ mode: 'login', redirectTo });
      return;
    }

    mutation.mutate(productId);
  };

  return { toggle, isPending: mutation.isPending };
}

/** Wishlist -> cart in one server-side step, so the item is never in both lists or neither. */
export function useMoveWishlistItemToCart() {
  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  return useMutation({
    mutationFn: (itemId: string) => moveWishlistItemToCart(itemId),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
      addToast({ type: 'success', title: 'Moved to cart', actionLabel: 'View cart', actionHref: '/cart' });
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Could not move to cart', message: errorMessage(error) });
    },
  });
}
