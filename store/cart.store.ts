'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];
  selectedItems: string[];
  coupon?: string;
  addItem: (product: Product, qty?: number, variantId?: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  toggleItemSelection: (productId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  applyCoupon: (code: string) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedItems: [],
      coupon: undefined,

      addItem: (product, qty = 1, variantId) => {
        if (!product.inStock) return;
        set((state) => {
          const existing = state.items.find(
            (item) => item.product.id === product.id && item.variantId === variantId
          );

          let newItems: CartItem[];
          if (existing) {
            newItems = state.items.map((item) =>
              item.product.id === product.id && item.variantId === variantId
                ? { ...item, quantity: Math.min(product.stockCount, item.quantity + qty) }
                : item
            );
          } else {
            newItems = [
              ...state.items,
              {
                product,
                variantId,
                quantity: Math.min(product.stockCount > 0 ? product.stockCount : qty, qty),
                unitPrice: product.price,
              },
            ];
          }

          return {
            items: newItems,
            selectedItems: [...new Set([...state.selectedItems, product.id])],
          };
        });
      },

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
          selectedItems: state.selectedItems.filter((id) => id !== productId),
        })),

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.min(item.product.stockCount || 99, qty) }
              : item
          ),
        }));
      },

      toggleItemSelection: (productId) =>
        set((state) => ({
          selectedItems: state.selectedItems.includes(productId)
            ? state.selectedItems.filter((id) => id !== productId)
            : [...state.selectedItems, productId],
        })),

      selectAll: () =>
        set((state) => ({
          selectedItems: state.items.map((item) => item.product.id),
        })),

      deselectAll: () => set({ selectedItems: [] }),

      applyCoupon: async (code) => {
        const trimmed = code.trim().toUpperCase();
        const validCoupons = ['TRUZOV10', 'WELCOME20', 'FIRST50'];
        if (!validCoupons.includes(trimmed)) {
          throw new Error('Invalid coupon code');
        }
        set({ coupon: trimmed });
      },

      clearCart: () => set({ items: [], selectedItems: [], coupon: undefined }),
    }),
    { name: 'truzov-cart' }
  )
);
