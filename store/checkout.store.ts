'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Checkout UI state.
 *
 * Only `selectedAddressId` remains, because it is the one genuine client-side choice in this flow —
 * `POST /checkout` takes an `addressId` and nothing else.
 *
 * `paymentMethod` was removed with the payment-method UI: the API has no payment-intent or
 * payment-method endpoint, only a gateway-to-server HMAC webhook. Storing a method the server never
 * receives would have been state that influenced nothing (plan §6.1 / §8.3).
 */
interface CheckoutStore {
  selectedAddressId?: string;
  setSelectedAddress: (addressId: string) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      selectedAddressId: undefined,
      setSelectedAddress: (addressId) => set({ selectedAddressId: addressId }),
      resetCheckout: () => set({ selectedAddressId: undefined }),
    }),
    { name: 'truzov-checkout' }
  )
);
