'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItemDto } from '@/types/api';

/** UI choices only. The backend owns prices, eligibility, and order creation. */
interface CheckoutStore {
  selectedAddressId?: string;
  selectionOwner: string;
  excludedLineKeys: string[];
  couponCode: string;
  buyNow?: CartItemDto;
  directAttempt?: { intent: string; key: string };
  setBuyNow: (owner: string, item?: CartItemDto) => void;
  setDirectAttempt: (attempt: { intent: string; key: string }) => void;
  setSelectedAddress: (addressId: string) => void;
  setLineSelected: (owner: string, key: string, selected: boolean) => void;
  setBagSelection: (owner: string, excludedLineKeys: string[]) => void;
  setCouponCode: (owner: string, code: string) => void;
  resetCheckout: () => void;
}

const initial = { selectedAddressId: undefined, selectionOwner: 'guest', excludedLineKeys: [] as string[], couponCode: '', buyNow: undefined, directAttempt: undefined };

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      ...initial,
      setBuyNow: (owner, item) => set((state) => ({
        selectionOwner: owner,
        buyNow: item,
        directAttempt: undefined,
        excludedLineKeys: state.selectionOwner === owner ? state.excludedLineKeys : [],
        couponCode: state.selectionOwner === owner ? state.couponCode : '',
      })),
      setDirectAttempt: (directAttempt) => set({ directAttempt }),
      setSelectedAddress: (addressId) => set({ selectedAddressId: addressId }),
      setLineSelected: (owner, key, selected) => set((state) => {
        const excluded = state.selectionOwner === owner ? state.excludedLineKeys : [];
        return { selectionOwner: owner,
          excludedLineKeys: selected ? excluded.filter((entry) => entry !== key) : [...new Set([...excluded, key])],
          couponCode: state.selectionOwner === owner ? state.couponCode : '',
          buyNow: state.selectionOwner === owner ? state.buyNow : undefined,
          directAttempt: state.selectionOwner === owner ? state.directAttempt : undefined,
        };
      }),
      setBagSelection: (owner, excludedLineKeys) => set((state) => ({ selectionOwner: owner, excludedLineKeys, couponCode: state.selectionOwner === owner ? state.couponCode : '', buyNow: undefined, directAttempt: undefined })),
      setCouponCode: (owner, code) => set((state) => ({ selectionOwner: owner, couponCode: code, excludedLineKeys: state.selectionOwner === owner ? state.excludedLineKeys : [], buyNow: state.selectionOwner === owner ? state.buyNow : undefined, directAttempt: state.selectionOwner === owner ? state.directAttempt : undefined })),
      resetCheckout: () => set({ ...initial }),
    }),
    { name: 'truzov-checkout' }
  )
);
