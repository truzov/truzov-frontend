'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, UserRole } from '@/types';

interface AuthStore {
  // State
  isLoggedIn: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  otpSessionId: string | null;
  pendingEmail: string | null;
  pendingIdentifier: string | null;
  
  // Actions
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  sendOTP: (identifier: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginAs: (role: UserRole) => void; // For demo/testing purposes
  logout: () => void;
  clearError: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'email' | 'phone'>>) => void;
}

// Mock user for testing
const createMockUser = (emailOrPhone: string, fullName?: string): UserProfile => ({
  id: `user_${Date.now()}`,
  name: fullName?.trim() || (emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : 'Darrell Steward'),
  email: emailOrPhone.includes('@') ? emailOrPhone : 'darrell.s@example.com',
  phone: emailOrPhone.includes('@') ? undefined : emailOrPhone,
  role: 'customer',
  createdAt: new Date().toISOString(),
});

// Simple mock API calls (replace with real API later)
const mockAPI = {
  signup: async (fullName: string, email: string, password: string) => {
    void fullName;
    void email;
    void password;
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { sessionId: `session_${Date.now()}`, message: 'OTP sent to email' };
  },
  
  sendOTP: async (identifier: string) => {
    void identifier;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { sessionId: `session_${Date.now()}`, expiresIn: 600 };
  },
  
  verifyOTP: async (sessionId: string, code: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (code === '000000') throw new Error('Invalid OTP code');
    return { token: `token_${Date.now()}`, user: { email: 'user@example.com' } };
  },
  
  login: async (email: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (password.length < 6) throw new Error('Invalid password');
    return { token: `token_${Date.now()}`, user: { email } };
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      isLoading: false,
      error: null,
      otpSessionId: null,
      pendingEmail: null,
      pendingIdentifier: null,

      signup: async (fullName, email, password) => {
        try {
          set({ isLoading: true, error: null });
          await mockAPI.signup(fullName, email, password);
          set({
            isLoggedIn: true,
            user: createMockUser(email, fullName),
            otpSessionId: null,
            pendingEmail: null,
            pendingIdentifier: null,
            isLoading: false,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Signup failed';
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      sendOTP: async (identifier) => {
        try {
          set({ isLoading: true, error: null });
          const normalizedIdentifier = identifier.includes('@')
            ? identifier.trim()
            : identifier.replace(/\D/g, '');
          const response = await mockAPI.sendOTP(normalizedIdentifier);
          set({
            otpSessionId: response.sessionId,
            pendingEmail: normalizedIdentifier.includes('@') ? normalizedIdentifier : null,
            pendingIdentifier: normalizedIdentifier,
            isLoading: false,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      verifyOTP: async (code) => {
        try {
          set({ isLoading: true, error: null });
          const currentState = get();
          
          if (!currentState.otpSessionId) {
            throw new Error('OTP session not found');
          }

          await mockAPI.verifyOTP(currentState.otpSessionId, code);
          
          const mockUser = createMockUser(
            currentState.pendingIdentifier || currentState.pendingEmail || 'user@example.com'
          );
          set({
            isLoggedIn: true,
            user: mockUser,
            otpSessionId: null,
            pendingEmail: null,
            pendingIdentifier: null,
            isLoading: false,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'OTP verification failed';
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          await mockAPI.login(email, password);
          const mockUser = createMockUser(email);
          set({
            isLoggedIn: true,
            user: mockUser,
            isLoading: false,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({
          isLoggedIn: false,
          user: null,
          otpSessionId: null,
          pendingEmail: null,
          pendingIdentifier: null,
          error: null,
        });
      },

      loginAs: (role) => {
        // Demo/testing utility to quickly log in as a specific role
        const mockUser: UserProfile = {
          id: `user_${Date.now()}`,
          name: role.charAt(0).toUpperCase() + role.slice(1),
          email: `${role}@truzov.test`,
          role,
          createdAt: new Date().toISOString(),
        };
        set({ isLoggedIn: true, user: mockUser });
      },

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
