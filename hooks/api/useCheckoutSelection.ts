'use client';

import { useCart } from './useCart';
import { selectedCart } from '@/lib/cart/selection';
import { useAuthStore } from '@/store/auth.store';
import { useCheckoutStore } from '@/store/checkout.store';

export function useCheckoutSelection() {
  const { cart } = useCart();
  const owner = useAuthStore((state) => state.user?.id) ?? 'guest';
  const selectionOwner = useCheckoutStore((state) => state.selectionOwner);
  const excludedLineKeys = useCheckoutStore((state) => state.excludedLineKeys);
  const savedCoupon = useCheckoutStore((state) => state.couponCode);
  return {
    owner,
    cart: selectedCart(cart, selectionOwner === owner ? excludedLineKeys : []),
    couponCode: selectionOwner === owner ? savedCoupon : '',
  };
}
