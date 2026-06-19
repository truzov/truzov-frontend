'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Address } from '@/types';
import { addresses as fixtureAddresses } from '@/lib/data/fixtures';

interface AddressStore {
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => void;
  updateAddress: (id: string, updates: Partial<Omit<Address, 'id'>>) => void;
  deleteAddress: (id: string) => void;
  setDefault: (id: string) => void;
  getAddress: (id: string) => Address | undefined;
  getDefaultAddress: () => Address | undefined;
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set, get) => ({
      addresses: fixtureAddresses,

      addAddress: (address) => {
        const isFirst = get().addresses.length === 0;
        set((state) => ({
          addresses: [
            ...state.addresses,
            {
              ...address,
              id: `addr-${Date.now()}`,
              isDefault: isFirst || address.isDefault,
            },
          ],
        }));
      },

      updateAddress: (id, updates) => {
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === id ? { ...addr, ...updates } : addr
          ),
        }));
      },

      deleteAddress: (id) => {
        const { addresses } = get();
        const deleting = addresses.find((a) => a.id === id);
        set((state) => {
          const remaining = state.addresses.filter((addr) => addr.id !== id);
          // If deleted address was default, make first one default
          if (deleting?.isDefault && remaining.length > 0) {
            remaining[0].isDefault = true;
          }
          return { addresses: remaining };
        });
      },

      setDefault: (id) => {
        set((state) => ({
          addresses: state.addresses.map((addr) => ({
            ...addr,
            isDefault: addr.id === id,
          })),
        }));
      },

      getAddress: (id) => get().addresses.find((a) => a.id === id),

      getDefaultAddress: () => get().addresses.find((a) => a.isDefault) ?? get().addresses[0],
    }),
    { name: 'truzov-addresses' }
  )
);