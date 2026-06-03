'use client';

import { create } from 'zustand';

interface CheckoutStore {
  selectedAddressId?: string;
  paymentMethod: string;
  setSelectedAddress: (addressId: string) => void;
  setPaymentMethod: (method: string) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  selectedAddressId: undefined,
  paymentMethod: 'UPI',
  setSelectedAddress: (addressId) => set({ selectedAddressId: addressId }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  resetCheckout: () => set({ selectedAddressId: undefined, paymentMethod: 'UPI' }),
}));
