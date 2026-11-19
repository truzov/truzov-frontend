'use client';

import { bindActionCreators, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';

export type AuthModalMode = 'login' | 'signup';

/**
 * Buy Now intent held while the auth modal is open. Memory only — never written to
 * localStorage, sessionStorage, cookies, or URL params (Requirement 2.11).
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
}

const initialState: AuthModalState = { isOpen: false, mode: 'login' };
type OpenOptions = Partial<Omit<AuthModalState, 'isOpen'>>;

const authModal = createSlice({
  name: 'authModal',
  initialState,
  reducers: {
    openAuthModal(_, { payload }: PayloadAction<OpenOptions | undefined>): AuthModalState {
      return {
        isOpen: true,
        mode: payload?.mode ?? 'login',
        redirectTo: payload?.redirectTo,
        buyNow: payload?.buyNow,
      };
    },
    closeAuthModal(state) {
      state.isOpen = false;
      state.redirectTo = undefined;
      state.buyNow = undefined;
    },
    setAuthModalMode(state, { payload }: PayloadAction<AuthModalMode>) {
      state.mode = payload;
    },
  },
});

export const authModalReducer = authModal.reducer;
export const { openAuthModal, closeAuthModal, setAuthModalMode } = authModal.actions;

export function useAuthModalActions() {
  const dispatch = useDispatch();
  return useMemo(() => ({
    ...bindActionCreators(authModal.actions, dispatch),
    closeAuthModal: () => { dispatch(closeAuthModal()); },
  }), [dispatch]);
}
