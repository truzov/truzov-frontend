'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/money';
import type { OrderItemDto } from '@/types/api';

/**
 * A line on a PLACED order. Read-only by design.
 *
 * Replaces the use of `CartItemRow` on the order detail screen. That component read
 * `item.product.*` and wired its +/- and remove buttons into the cart store, which is meaningless
 * on an order that has already been placed — quantities on a completed order are history, not
 * something to edit.
 *
 * `totalPrice` is the server's figure. Nothing here recomputes money.
 *
 * Field names come from the ORDER line, not the cart line: `productName` and `totalPrice`, where
 * the cart uses `name` and `lineTotal`. Getting that wrong rendered blank names and "₹NaN" on the
 * confirmation and detail screens, because the fields simply did not exist on the response.
 */
export function OrderItemRow({ item }: { item: OrderItemDto }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-4 rounded-md border border-surface-border bg-surface-base p-3">
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface-raised">
        {item.imageUrl ? (
          // No alt on the order DTO, so the product name is the accessible label.
          <Image alt={item.productName} className="object-cover" fill sizes="80px" src={item.imageUrl} />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Linked only when the order carries a slug; `slug` is optional on the order line, and
                a link to /products/undefined would 404. */}
            {item.slug ? (
              <Link
                className="font-semibold hover:text-brand-primary"
                href={`/products/${item.slug}`}
              >
                {item.productName}
              </Link>
            ) : (
              <span className="font-semibold">{item.productName}</span>
            )}
            <p className="mt-1 text-sm text-text-secondary">
              {formatCurrency(item.unitPrice)} × {item.quantity}
            </p>
          </div>
          <span className="shrink-0 font-semibold">{formatCurrency(item.totalPrice)}</span>
        </div>
      </div>
    </div>
  );
}
