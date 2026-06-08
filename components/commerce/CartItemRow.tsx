'use client';

import { Minus, Plus, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CartItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/store/cart.store';
import { formatCurrency } from '@/lib/utils/money';

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="grid grid-cols-[80px_1fr] gap-4 rounded-md border border-surface-border bg-surface-base p-3">
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface-raised">
        <Image
          alt={item.product.images[0].alt}
          className="object-cover"
          fill
          sizes="80px"
          src={item.product.images[0].url}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link className="font-semibold hover:text-brand-primary" href={`/products/${item.product.slug}`}>
              {item.product.name}
            </Link>
            <p className="text-sm text-text-secondary">Batch #{item.product.batchId}</p>
          </div>
          <Button aria-label="Remove item" size="icon" variant="ghost" onClick={() => removeItem(item.product.id)}>
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.product.isLabVerified ? <Badge variant="success">Lab Verified</Badge> : null}
          <span className="text-xs text-text-muted">COA available</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center rounded-sm border border-surface-border">
            <Button aria-label="Decrease quantity" size="icon" variant="ghost" onClick={() => updateQty(item.product.id, item.quantity - 1)}>
              <Minus aria-hidden="true" className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-semibold">{item.quantity}</span>
            <Button aria-label="Increase quantity" size="icon" variant="ghost" onClick={() => updateQty(item.product.id, item.quantity + 1)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <span className="font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</span>
        </div>
      </div>
    </div>
  );
}
