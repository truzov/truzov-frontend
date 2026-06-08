'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistStore {
  ids: string[];
  toggle: (id: string) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id) ? state.ids.filter((item) => item !== id) : [...state.ids, id],
        })),
    }),
    { name: 'truzov-wishlist' }
  )
);
