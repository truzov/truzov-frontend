'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** UI choices only. The backend owns prices, eligibility, and order creation. */
interface CheckoutStore {
  selectedAddressId?: string;
  selectionOwner: string;
  excludedLineKeys: string[];
  couponCode: string;
  setSelectedAddress: (addressId: string) => void;
  setLineSelected: (owner: string, key: string, selected: boolean) => void;
  selectAll: (owner: string) => void;
  setCouponCode: (owner: string, code: string) => void;
  resetCheckout: () => void;
}

const initial = { selectedAddressId: undefined, selectionOwner: 'guest', excludedLineKeys: [] as string[], couponCode: '' };

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      ...initial,
      setSelectedAddress: (addressId) => set({ selectedAddressId: addressId }),
      setLineSelected: (owner, key, selected) => set((state) => {
        const excluded = state.selectionOwner === owner ? state.excludedLineKeys : [];
        return { selectionOwner: owner,
          excludedLineKeys: selected ? excluded.filter((entry) => entry !== key) : [...new Set([...excluded, key])],
          couponCode: state.selectionOwner === owner ? state.couponCode : '',
        };
      }),
      selectAll: (owner) => set((state) => ({ selectionOwner: owner, excludedLineKeys: [], couponCode: state.selectionOwner === owner ? state.couponCode : '' })),
      setCouponCode: (owner, code) => set((state) => ({ selectionOwner: owner, couponCode: code, excludedLineKeys: state.selectionOwner === owner ? state.excludedLineKeys : [] })),
      resetCheckout: () => set({ ...initial }),
    }),
    { name: 'truzov-checkout' }
  )
);
