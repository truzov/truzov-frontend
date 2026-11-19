'use client';

import { useCart } from './useCart';
import { selectedCart } from '@/lib/cart/selection';
import { useAuthStore } from '@/store/auth.store';
import { useCheckoutStore } from '@/store/checkout.store';

export type BagSelectionMode = 'all' | 'selected';

export function useCheckoutSelection(bagMode?: BagSelectionMode) {
  const { cart, isLoading } = useCart();
  const owner = useAuthStore((state) => state.user?.id) ?? 'guest';
  const selectionOwner = useCheckoutStore((state) => state.selectionOwner);
  const excludedLineKeys = useCheckoutStore((state) => state.excludedLineKeys);
  const savedCoupon = useCheckoutStore((state) => state.couponCode);
  const directItem = useCheckoutStore((state) => state.buyNow);
  const item = !bagMode && owner !== 'guest' && selectionOwner === owner ? directItem : undefined;
  const selected = selectedCart(cart, bagMode !== 'all' && selectionOwner === owner ? excludedLineKeys : []);
  const selection = item
    ? { buyNow: { productId: item.productId, variantId: item.variantId, quantity: item.quantity } }
    : { cartItemIds: selected.items.map((line) => line.id) };
  return {
    owner,
    cart: item ? { items: [item], itemCount: item.quantity, subtotal: item.lineTotal } : selected,
    selection,
    hasItems: Boolean(item || cart.items.length),
    isLoading: !item && isLoading,
    couponCode: selectionOwner === owner ? savedCoupon : '',
  };
}
