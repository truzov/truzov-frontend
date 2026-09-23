'use client';

import { create } from 'zustand';

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
  quantity: number;
  /** Display snapshot — the merge POSTs only productId/variantId/quantity. */
  name: string;
  slug: string;
  imageUrl?: string;
  unitPrice: number;
  addedAt: number;
}

const STORAGE_KEY = 'truzov.guestCart';
/** Mirrors the server's `truzov.commerce.max-item-quantity` (20 locally). */
const MAX_ITEM_QUANTITY = 20;

function load(): GuestCartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestCartItem[]) : [];
  } catch {
    // Corrupt or foreign data: an empty bag is the safe recovery, not a crash.
    return [];
  }
}

function persist(items: GuestCartItem[]) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked (private mode): the in-memory cart still works for this visit.
  }
}

function sameLine(a: Pick<GuestCartItem, 'productId' | 'variantId'>, b: GuestCartItem): boolean {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
}

interface GuestCartState {
  items: GuestCartItem[];
  hydrated: boolean;
  /** Reads localStorage once on the client. Safe to call repeatedly. */
  hydrate: () => void;
  add: (input: Omit<GuestCartItem, 'addedAt'>) => void;
  setQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  remove: (productId: string, variantId: string | undefined) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useGuestCartStore = create<GuestCartState>()((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) {
      return;
    }
    set({ items: load(), hydrated: true });
  },

  add: (input) => {
    set((state) => {
      const existing = state.items.find((item) => sameLine(input, item));
      const items = existing
        ? state.items.map((item) =>
            sameLine(input, item)
              ? { ...item, quantity: Math.min(item.quantity + input.quantity, MAX_ITEM_QUANTITY) }
              : item
          )
        : [...state.items, { ...input, addedAt: Date.now() }];
      persist(items);
      return { items };
    });
  },

  setQuantity: (productId, variantId, quantity) => {
    set((state) => {
      const items = state.items
        .map((item) =>
          sameLine({ productId, variantId }, item)
            ? { ...item, quantity: Math.min(Math.max(quantity, 1), MAX_ITEM_QUANTITY) }
            : item
        )
        // Quantity 0 means remove; the guest store has no separate delete semantics to keep.
        .filter((item) => item.quantity > 0);
      persist(items);
      return { items };
    });
  },

  remove: (productId, variantId) => {
    set((state) => {
      const items = state.items.filter((item) => !sameLine({ productId, variantId }, item));
      persist(items);
      return { items };
    });
  },

  clear: () => {
    persist([]);
    set({ items: [] });
  },

  itemCount: () => get().items.reduce((total, item) => total + item.quantity, 0),

  subtotal: () => get().items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
}));
