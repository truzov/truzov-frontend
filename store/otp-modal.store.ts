'use client';

import { bindActionCreators, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';

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
}

const initialState: OtpModalState = { isOpen: false };

const otpModal = createSlice({
  name: 'otpModal',
  initialState,
  reducers: {
    openOtpModal(_, { payload }: PayloadAction<{ redirectTo?: string } | undefined>) {
      return { isOpen: true, redirectTo: payload?.redirectTo };
    },
    closeOtpModal: () => initialState,
  },
});

export const otpModalReducer = otpModal.reducer;
export function useOtpModalActions() {
  const dispatch = useDispatch();
  return useMemo(() => ({
    ...bindActionCreators(otpModal.actions, dispatch),
    closeOtpModal: () => { dispatch(otpModal.actions.closeOtpModal()); },
  }), [dispatch]);
}
