'use client';

import { Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useRemoveCartItem, useUpdateCartItem } from '@/hooks/api/useCart';
import { useToggleWishlist } from '@/hooks/api/useWishlist';
import { formatCurrency } from '@/lib/utils/money';
import type { CartItemDto } from '@/types/api';

/**
 * One cart line.
 *
 * Rebuilt around `CartItemDto`, which is much thinner than the old local model — that embedded a
 * whole Product object per line. Fields this row USED to show and no longer can, because they are
 * not on the cart DTO: `sellerName`, `batchId`, `mrp`, `discount`, `weight`, `isLabVerified` and a
 * "COA available" badge. They were not back-filled with a per-item `GET /products/{id}`: that would
 * be an N+1 on the busiest screen in the funnel, and the PDP already shows all of it.
 *
 * Mutations are keyed by `item.id` (the LINE id), not `productId` — the same product can occupy two
 * lines through different variants, so a product-keyed update is ambiguous.
 */
export function BagItemRow({ item }: { item: CartItemDto }) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const wishlist = useToggleWishlist();

  const isBusy = updateItem.isPending || removeItem.isPending;
  // `availableStock` is the server's number. The client does not clamp quantity — the server caps
  // it (truzov.commerce.max-item-quantity) and rejects what it will not accept.
  const lowStock = item.availableStock > 0 && item.availableStock <= 7;

  return (
    <article className="grid grid-cols-[96px_1fr] gap-3 rounded-md border border-surface-border bg-surface-base p-3 shadow-xs sm:grid-cols-[132px_1fr] sm:p-4">
      <Link
        className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-raised"
        href={`/products/${item.slug}`}
      >
        {item.imageUrl ? (
          <Image
            // The cart DTO has no alt text, so the product name is the accessible label.
            alt={item.name}
            className="object-cover"
            fill
            sizes="132px"
            src={item.imageUrl}
          />
        ) : null}
      </Link>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link className="font-bold hover:text-brand-primary" href={`/products/${item.slug}`}>
              {item.name}
            </Link>
            {!item.inStock ? (
              <p className="mt-1 text-sm font-semibold text-text-danger">
                Out of stock — remove it to continue
              </p>
            ) : lowStock ? (
              <p className="mt-1 text-sm text-brand-accent">Only {item.availableStock} left</p>
            ) : null}
          </div>
          <Button
            aria-label={`Remove ${item.name}`}
            disabled={isBusy}
            size="icon"
            variant="ghost"
            onClick={() => removeItem.mutate(item.id)}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-sm border border-surface-border bg-surface-raised">
            <Button
              aria-label="Decrease quantity"
              // At quantity 1 the decrement would be 0, which the server rejects; removing is the
              // intended action, and it has its own button.
              disabled={isBusy || item.quantity <= 1}
              size="icon"
              variant="ghost"
              onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-sm font-bold">Qty: {item.quantity}</span>
            <Button
              aria-label="Increase quantity"
              disabled={isBusy}
              size="icon"
              variant="ghost"
              onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-brand-primary" />
            {formatCurrency(item.unitPrice)} each
          </span>
        </div>

        <div className="mt-4">
          {/* The server's own arithmetic. Never `unitPrice * quantity` computed here — the whole
              point of the migration is that displayed money is what the server will charge. */}
          <span className="text-lg font-bold">{formatCurrency(item.lineTotal)}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
          <button
            className="text-text-secondary hover:text-brand-primary disabled:opacity-50"
            disabled={isBusy}
            type="button"
            onClick={() => removeItem.mutate(item.id)}
          >
            Remove
          </button>
          <button
            className="text-text-secondary hover:text-brand-primary disabled:opacity-50"
            disabled={isBusy || wishlist.isPending}
            type="button"
            onClick={() => {
              // Two requests rather than one: there is a wishlist -> cart endpoint but no
              // cart -> wishlist one. Saving first means a failure leaves the item in the cart,
              // which is the safer order — the reverse could drop it from both.
              wishlist.toggle(item.productId);
              removeItem.mutate(item.id);
            }}
          >
            Move to Wishlist
          </button>
        </div>
      </div>
    </article>
  );
}
