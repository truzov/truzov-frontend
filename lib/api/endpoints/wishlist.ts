import { apiRequest } from '@/lib/api/client';
import type { AddWishlistItemRequest, CartDto, WishlistItemDto } from '@/types/api';

/**
 * Saved products. Bearer-only, like the cart — so the heart icon prompts login for guests
 * rather than storing ids locally.
 *
 * The asymmetry to watch: adding takes a PRODUCT id, while removing and moving take a WISHLIST
 * ITEM id. A product card only knows the product id, so the UI keeps a productId -> itemId
 * lookup derived from `getWishlist()`. That mapping is what makes a single heart toggle work in
 * both directions.
 */

export function getWishlist(signal?: AbortSignal): Promise<WishlistItemDto[]> {
  return apiRequest<WishlistItemDto[]>('/wishlist', { auth: true, signal });
}

/**
 * Saves a product. Idempotent server-side, so double-clicking the heart cannot create two
 * entries — which is why the UI does not need its own guard against that.
 *
 * Returns 201. The response body is not relied upon: the reference does not specify it, and the
 * caller refetches the list to pick up the new item id it needs for removal.
 */
export function addWishlistItem(body: AddWishlistItemRequest): Promise<unknown> {
  return apiRequest<unknown>('/wishlist/items', { method: 'POST', auth: true, body });
}

/** Takes the wishlist ITEM id, not the product id. Returns 204. */
export function removeWishlistItem(itemId: string): Promise<void> {
  return apiRequest<void>(`/wishlist/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    auth: true,
  });
}

/**
 * Moves one saved product into the cart and returns the updated cart.
 *
 * Preferred over add-to-cart-then-remove-from-wishlist: it is one request, and the server does
 * both halves atomically, so there is no window where the item sits in both lists (or neither,
 * if the second call fails).
 */
export function moveWishlistItemToCart(itemId: string): Promise<CartDto> {
  return apiRequest<CartDto>(`/wishlist/items/${encodeURIComponent(itemId)}/move-to-cart`, {
    method: 'POST',
    auth: true,
  });
}
