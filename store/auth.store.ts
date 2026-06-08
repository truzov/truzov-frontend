'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, UserRole } from '@/types';

interface AuthStore {
  isLoggedIn: boolean;
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  otpSessionId: string | null;
  pendingIdentifier: string | null;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  sendOTP: (identifier: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  loginAs: (role: UserRole) => void;
  logout: () => void;
  clearError: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'gender' | 'dateOfBirth' | 'location'>>) => void;
}

const createMockUser = (emailOrPhone: string, fullName?: string): UserProfile => ({
  id: `user_${Date.now()}`,
  name: fullName?.trim() || (emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : 'User'),
  email: emailOrPhone.includes('@') ? emailOrPhone : `${emailOrPhone}@truzov.test`,
  phone: emailOrPhone.includes('@') ? undefined : emailOrPhone,
  role: 'customer',
  createdAt: new Date().toISOString(),
});

// Mock API — replace each method body with apiFetch() calls when backend is ready
const mockAPI = {
  signup: async (_fullName: string, _email: string, _password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { sessionId: `session_${Date.now()}` };
  },
  sendOTP: async (_identifier: string) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { sessionId: `session_${Date.now()}` };
  },
  verifyOTP: async (_sessionId: string, code: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (code === '000000') throw new Error('Invalid OTP code');
    return { token: `token_${Date.now()}` };
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
      otpSessionId: null,
      pendingIdentifier: null,

      signup: async (fullName, email, password) => {
        try {
          set({ isLoading: true, error: null });
          await mockAPI.signup(fullName, email, password);
          set({ isLoggedIn: true, user: createMockUser(email, fullName), otpSessionId: null, pendingIdentifier: null, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Signup failed', isLoading: false });
          throw err;
        }
      },

      sendOTP: async (identifier) => {
        try {
          set({ isLoading: true, error: null });
          const normalized = identifier.includes('@') ? identifier.trim() : identifier.replace(/\D/g, '');
          const response = await mockAPI.sendOTP(normalized);
          set({ otpSessionId: response.sessionId, pendingIdentifier: normalized, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to send OTP', isLoading: false });
          throw err;
        }
      },

      verifyOTP: async (code) => {
        try {
          set({ isLoading: true, error: null });
          const { otpSessionId, pendingIdentifier } = get();
          if (!otpSessionId) throw new Error('OTP session not found');
          const response = await mockAPI.verifyOTP(otpSessionId, code);
          set({ isLoggedIn: true, user: createMockUser(pendingIdentifier ?? 'user@example.com'), token: response.token, otpSessionId: null, pendingIdentifier: null, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'OTP verification failed', isLoading: false });
          throw err;
        }
      },

      loginAs: (role) => {
        set({
          isLoggedIn: true,
          user: { id: `user_${Date.now()}`, name: role.charAt(0).toUpperCase() + role.slice(1), email: `${role}@truzov.test`, role, createdAt: new Date().toISOString() },
        });
      },

      logout: () => set({ isLoggedIn: false, user: null, token: null, otpSessionId: null, pendingIdentifier: null, error: null }),

      clearError: () => set({ error: null }),

      updateProfile: (updates) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, ...updates } });
      },
    }),
    { name: 'truzov-auth' }
  )
);
