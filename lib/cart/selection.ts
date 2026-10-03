import type { CartDto } from '@/types/api';

export function cartLineKey(item: { productId: string; variantId?: string }): string {
  return `${item.productId}:${item.variantId ?? ''}`;
}

export function selectedCart(cart: CartDto, excludedKeys: string[]): CartDto {
  const excluded = new Set(excludedKeys);
  const items = cart.items.filter((item) => !excluded.has(cartLineKey(item)));
  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
  };
}
