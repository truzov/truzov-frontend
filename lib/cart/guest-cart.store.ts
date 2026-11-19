'use client';

import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import { cartLineKey } from '@/lib/cart/selection';
import { readCartStorage, savedCartSnapshot, writeCartStorage } from '@/lib/cart/storage';

/**
 * Guest cart, kept in localStorage.
 *
 * A snapshot of what was added (name, price, image) so the bag screen can render without a
 * server round trip — the server has no guest-cart surface by design (an unauthenticated write
 * endpoint is an abuse vector), so the client holds the bag and replays it through the
 * idempotent `POST /cart/items` upsert on login (see `mergeGuestCartIntoServer`). Stock, price
 * caps and merges are all decided server-side at that point; the snapshot is display-only.
 */

export interface GuestCartItem {
  productId: string;
  /** Key part of a line: the same product with two variants is two lines. */
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  /** Display snapshot — the merge POSTs only productId/variantId/quantity. */
  name: string;
  slug: string;
  imageUrl?: string;
  unitPrice: number;
  /** Last observed stock, display-only; the server revalidates on merge/checkout. */
  availableStock?: number;
  addedAt: number;
}

export const GUEST_CART_STORAGE_KEY = 'truzov.guestCart';
/** Mirrors the server's `truzov.commerce.max-item-quantity` (20 locally). */
const MAX_ITEM_QUANTITY = 20;

const savedGuestItem = savedCartSnapshot.extend({
  availableStock: z.number().int().nonnegative().optional().catch(undefined),
  addedAt: z.number().nonnegative().catch(0),
});

export function readGuestCart(): GuestCartItem[] {
  const saved = readCartStorage(GUEST_CART_STORAGE_KEY);
  if (!Array.isArray(saved)) return [];
  return saved.flatMap((line) => {
    const parsed = savedGuestItem.safeParse(line);
    return parsed.success ? [parsed.data] : [];
  });
}

export function saveGuestCart(items: GuestCartItem[]) {
  writeCartStorage(GUEST_CART_STORAGE_KEY, items);
}

type Line = Pick<GuestCartItem, 'productId' | 'variantId'>;

function sameLine(a: Line, b: Line): boolean {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
}

const guestCart = createSlice({
  name: 'guestCart',
  initialState: { items: [] as GuestCartItem[], hydrated: false },
  reducers: {
    restoreGuestCart(_state, { payload }: PayloadAction<GuestCartItem[]>) {
      return { items: payload, hydrated: true };
    },
    addGuestItem: {
      prepare(item: Omit<GuestCartItem, 'addedAt'>) {
        return { payload: { ...item, addedAt: Date.now() } };
      },
      reducer(state, { payload: item }: PayloadAction<GuestCartItem>) {
        const matching = state.items.filter((line) => sameLine(item, line));
        if (!matching.length) {
          state.items.push({
            ...item,
            quantity: Math.min(item.quantity, MAX_ITEM_QUANTITY, item.availableStock ?? MAX_ITEM_QUANTITY),
          });
          return;
        }
        for (const line of matching) {
          line.variantLabel = item.variantLabel ?? line.variantLabel;
          line.availableStock = item.availableStock ?? line.availableStock;
          const limit = Math.min(MAX_ITEM_QUANTITY, line.availableStock ?? MAX_ITEM_QUANTITY);
          line.quantity = Math.max(line.quantity, Math.min(line.quantity + item.quantity, limit));
        }
      },
    },
    setGuestQuantity(state, { payload }: PayloadAction<Line & { quantity: number }>) {
      for (const item of state.items) {
        if (sameLine(payload, item)) {
          item.quantity = Math.min(Math.max(payload.quantity, 0), MAX_ITEM_QUANTITY, item.availableStock ?? MAX_ITEM_QUANTITY);
        }
      }
      state.items = state.items.filter((item) => item.quantity > 0);
    },
    removeGuestItem(state, { payload }: PayloadAction<Line>) {
      state.items = state.items.filter((item) => !sameLine(payload, item));
    },
    removeGuestSelection(state, { payload }: PayloadAction<string[]>) {
      const selected = new Set(payload);
      state.items = state.items.filter((item) => !selected.has(cartLineKey(item)));
    },
    clearGuestCart(state) {
      state.items = [];
    },
  },
});

export const guestCartReducer = guestCart.reducer;
export const {
  restoreGuestCart, addGuestItem, setGuestQuantity, removeGuestItem, removeGuestSelection, clearGuestCart,
} = guestCart.actions;
export const isGuestCartMutation = isAnyOf(addGuestItem, setGuestQuantity, removeGuestItem, removeGuestSelection, clearGuestCart);
