'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

interface UiStore {
  cartOpen: boolean;
  searchOpen: boolean;
  activeModal?: string;
  toasts: ToastMessage[];
  openCart: () => void;
  closeCart: () => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  cartOpen: false,
  searchOpen: false,
  activeModal: undefined,
  toasts: [],
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        { ...toast, id: crypto.randomUUID?.() ?? `${Date.now()}` },
        ...state.toasts,
      ].slice(0, 3),
    })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
