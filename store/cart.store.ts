'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '@/types';
import { calculateCartTotals } from '@/lib/utils/money';

interface CartStore {
  items: CartItem[];
  coupon?: string;
  addItem: (product: Product, qty?: number, variantId?: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  applyCoupon: (code: string) => Promise<void>;
  clearCart: () => void;
  itemCount: () => number;
  totals: () => ReturnType<typeof calculateCartTotals>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: undefined,
      addItem: (product, qty = 1, variantId) => {
        set((state) => {
          const existing = state.items.find(
            (item) => item.product.id === product.id && item.variantId === variantId
          );

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id && item.variantId === variantId
                  ? {
                      ...item,
                      quantity: Math.min(product.stockCount || 99, item.quantity + qty),
                    }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                product,
                variantId,
                quantity: Math.min(product.stockCount || qty, qty),
                unitPrice: product.price,
              },
            ],
          };
        });
      },
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.product.id !== productId) })),
      updateQty: (productId, qty) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.max(1, Math.min(item.product.stockCount || 99, qty)) }
              : item
          ),
        })),
      applyCoupon: async (code) => {
        set({ coupon: code.trim().toUpperCase() });
      },
      clearCart: () => set({ items: [], coupon: undefined }),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      totals: () => calculateCartTotals(get().items, get().coupon),
    }),
    { name: 'truzov-cart' }
  )
);
