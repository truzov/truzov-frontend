'use client';

import { useCart } from './useCart';
import { selectedCart } from '@/lib/cart/selection';
import { useAppSelector } from '@/store/redux';

export type BagSelectionMode = 'all' | 'selected';

export function useCheckoutSelection(bagMode?: BagSelectionMode) {
  const { cart, isLoading } = useCart();
  const owner = useAppSelector((state) => state.auth.user?.id) ?? 'guest';
  const { selectionOwner, excludedLineKeys, couponCode: savedCoupon, buyNow: directItem } =
    useAppSelector((state) => state.checkout);
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
