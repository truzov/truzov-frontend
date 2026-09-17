import { apiRequest } from '@/lib/api/client';
import type { AddCartItemRequest, CartDto, UpdateCartItemRequest } from '@/types/api';

/**
 * Server-side cart. Every call requires a bearer token — there is no guest cart in this API,
 * which is why the UI prompts login before an add rather than keeping a local basket
 * (see plan §8.1).
 *
 * Mutations are keyed by the LINE id (`CartItemDto.id`), not the product id: the same product
 * can occupy two lines via different variants, so a product-keyed update is ambiguous.
 *
 * Every mutation returns the full updated cart, so callers should write the response straight
 * into the cache instead of firing a follow-up GET.
 */

export function getCart(signal?: AbortSignal): Promise<CartDto> {
  return apiRequest<CartDto>('/cart', { auth: true, signal });
}

/**
 * Adds a product, or increments the line if it is already present. Returns 201 with the cart.
 *
 * The server caps line quantity (`truzov.commerce.max-item-quantity`, 20 locally) and checks
 * stock, so the client does not clamp — it surfaces the server's rejection instead. A local cap
 * would either disagree with the server or silently swallow a stock problem.
 */
export function addCartItem(body: AddCartItemRequest): Promise<CartDto> {
  return apiRequest<CartDto>('/cart/items', { method: 'POST', auth: true, body });
}

/** Replaces the line quantity outright — this is not a delta. */
export function updateCartItem(itemId: string, body: UpdateCartItemRequest): Promise<CartDto> {
  return apiRequest<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function removeCartItem(itemId: string): Promise<CartDto> {
  return apiRequest<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    auth: true,
  });
}

/** Empties the cart. Returns 204 — no cart body, so the cache must be reset by the caller. */
export function clearCart(): Promise<void> {
  return apiRequest<void>('/cart', { method: 'DELETE', auth: true });
}
