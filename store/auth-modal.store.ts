'use client';

import { create } from 'zustand';

export type AuthModalMode = 'login' | 'signup';

/**
 * Buy Now intent held while the auth modal is open. Memory only — never written to
 * localStorage, sessionStorage, cookies, or URL params (Requirement 2.11). This store
 * has no `persist` middleware; do not add one.
 */
export interface BuyNowIntent {
  productId: string;
  /** undefined for a product with no variants (Requirement 2.3) */
  variantId?: string;
  /** integer 1..99 (Requirement 2.2) */
  quantity: number;
}

interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
  redirectTo?: string;
  buyNow?: BuyNowIntent;
  openAuthModal: (options?: {
    mode?: AuthModalMode;
    redirectTo?: string;
    buyNow?: BuyNowIntent;
  }) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: 'login',
  redirectTo: undefined,
  buyNow: undefined,
  openAuthModal: (options) =>
    set({
      isOpen: true,
      mode: options?.mode ?? 'login',
      redirectTo: options?.redirectTo,
      buyNow: options?.buyNow,
    }),
  closeAuthModal: () => set({ isOpen: false, redirectTo: undefined, buyNow: undefined }),
  setAuthModalMode: (mode) => set({ mode }),
}));
