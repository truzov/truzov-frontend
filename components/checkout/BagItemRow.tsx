'use client';

import { Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CartItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/money';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';

export function BagItemRow({ item }: { item: CartItem }) {
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const lowStock = item.product.stockCount > 0 && item.product.stockCount <= 7;

  return (
    <article className="grid grid-cols-[96px_1fr] gap-4 rounded-md border border-surface-border bg-surface-base p-3 shadow-xs sm:grid-cols-[132px_1fr] sm:p-4">
      <Link className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-raised" href={`/products/${item.product.slug}`}>
        <Image alt={item.product.images[0].alt} className="object-cover" fill sizes="132px" src={item.product.images[0].url} />
      </Link>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link className="font-bold hover:text-brand-primary" href={`/products/${item.product.slug}`}>
              {item.product.name}
            </Link>
            <p className="mt-1 line-clamp-1 text-sm text-text-secondary">Sold by: {item.product.sellerName}</p>
            <p className="text-xs text-text-muted">Batch #{item.product.batchId}</p>
          </div>
          <Button aria-label={`Remove ${item.product.name}`} size="icon" variant="ghost" onClick={() => removeItem(item.product.id)}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.product.isLabVerified ? <Badge variant="success">Lab Verified</Badge> : null}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-brand-primary" />
            COA available
          </span>
          {lowStock ? <span className="rounded-sm border border-brand-accent px-2 py-0.5 text-xs font-bold text-brand-accent">{item.product.stockCount} left</span> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-sm border border-surface-border bg-surface-raised">
            <Button aria-label="Decrease quantity" size="icon" variant="ghost" onClick={() => updateQty(item.product.id, item.quantity - 1)}>
              <Minus aria-hidden="true" className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-sm font-bold">Qty: {item.quantity}</span>
            <Button aria-label="Increase quantity" size="icon" variant="ghost" onClick={() => updateQty(item.product.id, item.quantity + 1)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          {item.product.weight ? <span className="rounded-sm bg-surface-raised px-3 py-2 text-sm font-semibold">Size: {item.product.weight}</span> : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span>
          <span className="text-sm text-text-muted line-through">{formatCurrency(item.product.mrp * item.quantity)}</span>
          <span className="text-sm font-semibold text-text-danger">{item.product.discount}% OFF</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
          <button className="text-text-secondary hover:text-brand-primary" type="button" onClick={() => removeItem(item.product.id)}>
            Remove
          </button>
          <button
            className="text-text-secondary hover:text-brand-primary"
            type="button"
            onClick={() => {
              toggleWishlist(item.product.id);
              removeItem(item.product.id);
            }}
          >
            Move to Wishlist
          </button>
        </div>
      </div>
    </article>
  );
}
