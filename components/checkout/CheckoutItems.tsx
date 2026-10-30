'use client';

import { OrderItemRow } from '@/components/commerce/OrderItemRow';
import type { OrderItemDto } from '@/types/api';

/** Both steps render their authoritative cart/order snapshots through the same row. */
export function CheckoutItems({ items }: { items: OrderItemDto[] }) {
  return <section aria-label="Order items">
    <h2 className="mb-3 text-lg font-medium">{items.reduce((count, item) => count + item.quantity, 0)} items</h2>
    <div className="grid max-h-[28rem] gap-3 overflow-y-auto">{items.map((item) => <OrderItemRow key={item.id} item={item} />)}</div>
  </section>;
}
