import type { CartItem } from '@/types';

export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING = 49;

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateDiscount(price: number, mrp: number) {
  if (mrp <= 0 || price >= mrp) {
    return 0;
  }

  return Math.round((1 - price / mrp) * 100);
}

export function calculateCartTotals(items: CartItem[], coupon?: string) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = coupon ? Math.min(150, Math.round(subtotal * 0.1)) : 0;
  const shipping = subtotal - discount >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : STANDARD_SHIPPING;
  const total = Math.max(0, subtotal - discount + shipping);

  return { subtotal, discount, shipping, total };
}
