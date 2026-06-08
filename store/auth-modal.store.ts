'use client';

import { create } from 'zustand';

export type AuthModalMode = 'login' | 'signup';

interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
  redirectTo?: string;
  openAuthModal: (options?: { mode?: AuthModalMode; redirectTo?: string }) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: 'login',
  redirectTo: undefined,
  openAuthModal: (options) =>
    set({
      isOpen: true,
      mode: options?.mode ?? 'login',
      redirectTo: options?.redirectTo,
    }),
  closeAuthModal: () => set({ isOpen: false, redirectTo: undefined }),
  setAuthModalMode: (mode) => set({ mode }),
}));
