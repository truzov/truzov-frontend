'use client';

import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import { readCartStorage, savedCartSnapshot, writeCartStorage } from '@/lib/cart/storage';
import type { CartItemDto } from '@/types/api';

const CHECKOUT_STORAGE_KEY = 'truzov-checkout';

/** UI choices only. The backend owns prices, eligibility, and order creation. */
interface CheckoutState {
  selectedAddressId?: string;
  selectionOwner: string;
  excludedLineKeys: string[];
  couponCode: string;
  buyNow?: CartItemDto;
  directAttempt?: { intent: string; key: string };
}

const initialState: CheckoutState = { selectionOwner: 'guest', excludedLineKeys: [], couponCode: '' };

const savedCheckout = z.object({
  version: z.literal(0),
  state: z.object({
    selectedAddressId: z.string().min(1).optional().catch(undefined),
    selectionOwner: z.string().min(1).catch('guest'),
    excludedLineKeys: z.array(z.unknown()).catch([]).transform((keys) => keys.filter((key): key is string => typeof key === 'string')),
    couponCode: z.string().max(100).catch(''),
    buyNow: savedCartSnapshot.extend({
      id: z.string().min(1),
      quantity: savedCartSnapshot.shape.quantity.max(20),
      lineTotal: z.number().nonnegative(),
      inStock: z.boolean(),
      availableStock: z.number().int().nonnegative(),
    }).optional().catch(undefined),
    directAttempt: z.object({
      intent: z.string(),
      key: z.string().min(1).max(200).refine((key) => !/[^!-~]/.test(key)),
    }).optional().catch(undefined),
  }),
});

export function readCheckout(): CheckoutState {
  const saved = savedCheckout.safeParse(readCartStorage(CHECKOUT_STORAGE_KEY));
  if (!saved.success) return initialState;
  const state = saved.data.state;
  if (state.selectionOwner === 'guest' || !state.buyNow) {
    return { ...state, buyNow: undefined, directAttempt: undefined };
  }
  return state;
}

export function saveCheckout(state: CheckoutState) {
  writeCartStorage(CHECKOUT_STORAGE_KEY, { state, version: 0 });
}

function changeSelectionOwner(state: CheckoutState, owner: string) {
  if (state.selectionOwner === owner) return;
  state.selectionOwner = owner;
  state.excludedLineKeys = [];
  state.couponCode = '';
  state.buyNow = undefined;
  state.directAttempt = undefined;
}

const checkout = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    restoreCheckout: (_state, { payload }: PayloadAction<CheckoutState>) => payload,
    setBuyNow(state, { payload }: PayloadAction<{ owner: string; item?: CartItemDto }>) {
      changeSelectionOwner(state, payload.owner);
      state.buyNow = payload.item;
      state.directAttempt = undefined;
    },
    setDirectAttempt(state, { payload }: PayloadAction<NonNullable<CheckoutState['directAttempt']>>) {
      state.directAttempt = payload;
    },
    setSelectedAddress(state, { payload }: PayloadAction<string>) {
      state.selectedAddressId = payload;
    },
    setLineSelected(state, { payload: { owner, key, selected } }: PayloadAction<{ owner: string; key: string; selected: boolean }>) {
      changeSelectionOwner(state, owner);
      state.excludedLineKeys = selected
        ? state.excludedLineKeys.filter((entry) => entry !== key)
        : [...new Set([...state.excludedLineKeys, key])];
    },
    setBagSelection(state, { payload }: PayloadAction<{ owner: string; excludedLineKeys: string[] }>) {
      changeSelectionOwner(state, payload.owner);
      state.excludedLineKeys = payload.excludedLineKeys;
      state.buyNow = undefined;
      state.directAttempt = undefined;
    },
    setCouponCode(state, { payload }: PayloadAction<{ owner: string; code: string }>) {
      changeSelectionOwner(state, payload.owner);
      state.couponCode = payload.code;
    },
    adoptGuestSelection(state, { payload: owner }: PayloadAction<string>) {
      if (state.selectionOwner === 'guest') {
        state.selectionOwner = owner;
        state.couponCode = '';
      }
    },
    resetCheckout: () => initialState,
  },
});

export const checkoutReducer = checkout.reducer;
export const {
  restoreCheckout, setBuyNow, setDirectAttempt, setSelectedAddress, setLineSelected,
  setBagSelection, setCouponCode, adoptGuestSelection, resetCheckout,
} = checkout.actions;
export const isCheckoutMutation = isAnyOf(
  setBuyNow, setDirectAttempt, setSelectedAddress, setLineSelected,
  setBagSelection, setCouponCode, adoptGuestSelection, resetCheckout,
);
