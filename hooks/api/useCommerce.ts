'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAddress, getAddresses, updateAddress } from '@/lib/api/endpoints/addresses';
import { checkout, getOrder, listOrders, updateOrderStatus } from '@/lib/api/endpoints/orders';
import { completeMockPayment, createPaymentSession } from '@/lib/api/endpoints/payments';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/queries';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import type { AddressDto, CreateAddressRequest } from '@/types/api';

const EMPTY_ADDRESSES: AddressDto[] = [];

export function useAddresses() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const query = useQuery({
    queryKey: queryKeys.addresses(),
    queryFn: ({ signal }) => getAddresses(signal),
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  const addresses = query.data ?? EMPTY_ADDRESSES;

  return {
    ...query,
    addresses,
    // The server marks one address default; falling back to the first keeps checkout usable if
    // none is flagged (possible, since `isDefault` is only set at creation time and there is no
    // set-default endpoint).
    defaultAddress: addresses.find((address) => address.isDefault) ?? addresses[0],
  };
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  return useMutation({
    mutationFn: (body: CreateAddressRequest) => createAddress(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses() });
      addToast({ type: 'success', title: 'Address saved' });
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Could not save address', message: errorMessage(error) });
    },
  });
}

/** Edits a saved address; the response updates the list cache in place. */
export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ addressId, body }: { addressId: string; body: CreateAddressRequest }) =>
      updateAddress(addressId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<AddressDto[]>(queryKeys.addresses(), (current) =>
        (current ?? []).map((address) => (address.id === updated.id ? updated : address))
      );
      addToast({ type: 'success', title: 'Address updated' });
    },
    onError: (error) => {
      addToast({ type: 'error', title: 'Could not update address', message: errorMessage(error) });
    },
  });
}

/**
 * Places the order.
 *
 * Cache handling matters here: `POST /checkout` CONSUMES the server-side cart, so the cached cart
 * is stale the instant this succeeds. Invalidating it is what replaced the old client-side
 * `clearCart()` on the confirmation screen.
 */
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    // Takes the key alongside the address so a retry of the SAME attempt replays the original
    // order instead of placing a second one. The caller owns the key's lifetime, because only it
    // knows where one user intent ends and the next begins.
    mutationFn: ({ addressId, idempotencyKey }: { addressId: string; idempotencyKey?: string }) =>
      checkout({ addressId }, idempotencyKey),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      // Seed the order so the confirmation screen renders without a second request.
      queryClient.setQueryData(queryKeys.order(order.id), order);
    },
    onError: () => {
      // Deliberately not toasted here. Checkout failures are specific and worth explaining in
      // place (unverified phone, stock conflict), so the screen renders them next to the button
      // rather than as a transient toast the user may miss.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

/**
 * Opens a payment for a placed order.
 *
 * The idempotency key is derived from the order id rather than generated: "open a payment for
 * order X" is idempotent by definition, so a retry — or a customer who reloads the payment page —
 * must reach the same session rather than a second one.
 */
export function useCreatePaymentSession() {
  return useMutation({
    mutationFn: (orderId: string) =>
      createPaymentSession({ orderId }, `payment-session-${orderId}`),
  });
}

/**
 * Completes a simulated payment, then makes the order re-read itself.
 *
 * Invalidation is the whole point. The endpoint returns 204 and deliberately tells us nothing about
 * the outcome, because the authoritative value was written by the webhook — not by the request we
 * just made. Anything shown from an optimistic guess here would be this screen's opinion of whether
 * money moved.
 */
export function useCompleteMockPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      outcome,
    }: {
      sessionId: string;
      orderId: string;
      outcome: 'success' | 'failure';
    }) => completeMockPayment(sessionId, { outcome }),
    onSuccess: (_result, { orderId }) => {
      // Both the detail cache and the list: an order whose badge still reads "unpaid" in the
      // history after payment succeeded is the same bug as one on the confirmation screen.
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
    },
  });
}

export function useOrders(page = 1) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return useQuery({
    queryKey: queryKeys.orderList(page),
    queryFn: ({ signal }) => listOrders({ page }, signal),
    enabled: isLoggedIn,
    placeholderData: (previous) => previous,
  });
}

export function useOrder(orderId: string) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    enabled: isLoggedIn && Boolean(orderId),
  });
}

/** Customer-facing cancellation. The server rejects it once the order is past fulfilment. */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      updateOrderStatus(orderId, { status: 'cancelled', reason }),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      addToast({ type: 'success', title: 'Order cancelled' });
    },
    onError: (error) => {
      // A 409 here usually means the order already moved on (packed or shipped), which is worth
      // stating plainly rather than as a generic failure.
      addToast({ type: 'error', title: 'Could not cancel order', message: errorMessage(error) });
    },
  });
}
