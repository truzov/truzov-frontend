'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, UserRole } from '@/types';
import { users } from '@/lib/data/fixtures';

interface AuthStore {
  isLoggedIn: boolean;
  user: UserProfile | null;
  loginAs: (role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      loginAs: (role) => {
        const user = users.find((item) => item.role === role) ?? users[0];
        set({ isLoggedIn: true, user });
      },
      logout: () => set({ isLoggedIn: false, user: null }),
    }),
    { name: 'truzov-auth' }
  )
);
