'use client';

import { bindActionCreators, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

const ui = createSlice({
  name: 'ui',
  initialState: { toasts: [] as ToastMessage[] },
  reducers: {
    addToast: {
      prepare(toast: Omit<ToastMessage, 'id'>) {
        return { payload: { ...toast, id: crypto.randomUUID?.() ?? `${Date.now()}` } };
      },
      reducer(state, { payload }: PayloadAction<ToastMessage>) {
        state.toasts = [payload, ...state.toasts].slice(0, 3);
      },
    },
    removeToast(state, { payload }: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== payload);
    },
  },
});

export const uiReducer = ui.reducer;
export const { addToast, removeToast } = ui.actions;

export function useToastActions() {
  const dispatch = useDispatch();
  return useMemo(() => bindActionCreators(ui.actions, dispatch), [dispatch]);
}
