'use client';

import { create } from 'zustand';

/**
 * Drives the phone-verification popup (components/auth/VerifyPhoneModal).
 *
 * Auth verification is a popup, not a page (spec §3): when a 403 PHONE_NOT_VERIFIED comes back,
 * or the user presses "Verify now" at checkout, this store opens the modal in place instead of
 * navigating to a full /verify-otp screen. Memory only — no persist, mirroring auth-modal.store.
 *
 * `redirectTo` is where to land once the phone is verified (e.g. back to /checkout/payment). It
 * is optional: an unverified-phone 403 raised mid-action just needs the modal, not a navigation.
 */
interface OtpModalState {
  isOpen: boolean;
  redirectTo?: string;
  openOtpModal: (options?: { redirectTo?: string }) => void;
  closeOtpModal: () => void;
}

export const useOtpModalStore = create<OtpModalState>((set) => ({
  isOpen: false,
  redirectTo: undefined,
  openOtpModal: (options) => set({ isOpen: true, redirectTo: options?.redirectTo }),
  closeOtpModal: () => set({ isOpen: false, redirectTo: undefined }),
}));
