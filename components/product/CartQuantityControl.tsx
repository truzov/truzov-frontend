'use client';

import { Minus, Plus } from 'lucide-react';
import { useCartQuantity } from '@/hooks/api/useCartQuantity';
import type { CartProduct } from '@/hooks/api/useCartQuantity';

export function CartQuantityControl({ product, disabled, max, className = '' }: {
  product: CartProduct; disabled?: boolean; max?: number; className?: string;
}) {
  const { quantity, availableStock, pending, change } = useCartQuantity({ ...product, availableStock: max });
  const limit = Math.min(20, max ?? 20, availableStock ?? 20);
  return <div className={`flex h-11 items-center justify-center rounded-lg border border-brand-primary bg-white text-brand-primary ${className}`}>
    {quantity === 0 ? <button aria-label={disabled ? 'Out of Stock' : `Add ${product.productName}`} className="h-full w-full font-semibold disabled:opacity-50" disabled={disabled || pending || limit < 1} onClick={() => change(1)} type="button">{disabled ? 'Out of Stock' : 'ADD'}</button> : <>
      <button aria-label={`Decrease quantity of ${product.productName}`} className="grid h-11 w-11 place-items-center disabled:opacity-50" disabled={pending} onClick={() => change(quantity - 1)} type="button"><Minus aria-hidden="true" size={18} /></button>
      <span aria-live="polite" className="min-w-8 text-center font-semibold">{quantity}</span>
      <button aria-label={`Increase quantity of ${product.productName}`} className="grid h-11 w-11 place-items-center disabled:opacity-50" disabled={disabled || pending || quantity >= limit} onClick={() => change(Math.min(limit, quantity + 1))} type="button"><Plus aria-hidden="true" size={18} /></button>
    </>}
  </div>;
}
