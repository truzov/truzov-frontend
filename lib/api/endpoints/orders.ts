import { apiRequest } from '@/lib/api/client';
import type {
  CheckoutRequest,
  OrderDto,
  OrderSummaryDto,
  PagedData,
  UpdateOrderStatusRequest,
} from '@/types/api';

/** Server-side bound: `GET /orders` accepts limit 1-50, not the usual 1-100. */
export const ORDER_PAGE_LIMIT = 20;

/**
 * Places an order from the SERVER-SIDE cart. The only input is which address to ship to — the
 * items, quantities and every money value come from the server.
 *
 * Documented preconditions: the user must have a verified phone and a saved address. An unverified
 * phone comes back as 403 PHONE_NOT_VERIFIED, which the API client turns into an OTP redirect.
 *
 * A 409 means the cart no longer supports the order (stock moved, or the cart changed underneath),
 * so callers should refetch the cart and show what changed rather than retrying blindly.
 *
 * @param idempotencyKey optional but strongly recommended. This is the request most damaging to
 *        submit twice, and without a key a retry after a timeout cannot be answered honestly: the
 *        first attempt already cleared the cart, so the retry reports an empty cart and the caller
 *        cannot tell whether an order exists. The key must be generated once per user intent, not
 *        derived from the address — reusing a key across two genuine orders would replay the first.
 */
export function checkout(body: CheckoutRequest, idempotencyKey?: string): Promise<OrderDto> {
  return apiRequest<OrderDto>('/checkout', { method: 'POST', auth: true, body, idempotencyKey });
}

export function listOrders(
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal
): Promise<PagedData<OrderSummaryDto>> {
  return apiRequest<PagedData<OrderSummaryDto>>('/orders', {
    query: {
      page: Math.max(1, params.page ?? 1),
      limit: Math.min(50, Math.max(1, params.limit ?? ORDER_PAGE_LIMIT)),
    },
    auth: true,
    signal,
  });
}

export function getOrder(orderId: string, signal?: AbortSignal): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/orders/${encodeURIComponent(orderId)}`, { auth: true, signal });
}

/**
 * Changes an order's status, subject to the server's state machine and the caller's role.
 *
 * A customer may only cancel their own order, and only before fulfilment — anything else is a 409
 * invalid transition. That is why the UI hides Cancel once an order is packed or later, rather than
 * offering it and letting the server refuse.
 */
export function updateOrderStatus(
  orderId: string,
  body: UpdateOrderStatusRequest
): Promise<OrderDto> {
  return apiRequest<OrderDto>(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}
