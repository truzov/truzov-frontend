'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order } from '@/types';

interface OrdersStore {
  orders: Order[];
  addOrder: (order: Order) => void;
  getOrder: (id: string) => Order | undefined;
}

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order) => {
        set((state) => ({
          orders: [order, ...state.orders],
        }));
      },

      getOrder: (id) => get().orders.find((o) => o.id === id),
    }),
    { name: 'truzov-orders' }
  )
);