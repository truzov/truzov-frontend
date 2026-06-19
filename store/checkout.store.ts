'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CheckoutStore {
  selectedAddressId?: string;
  paymentMethod: string;
  setSelectedAddress: (addressId: string) => void;
  setPaymentMethod: (method: string) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      selectedAddressId: undefined,
      paymentMethod: 'UPI',
      setSelectedAddress: (addressId) => set({ selectedAddressId: addressId }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      resetCheckout: () => set({ selectedAddressId: undefined, paymentMethod: 'UPI' }),
    }),
    { name: 'truzov-checkout' }
  )
);
