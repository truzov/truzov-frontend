'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCartStore } from '@/store/cart.store';
import { useUiStore } from '@/store/ui.store';
import { CartItemRow } from './CartItemRow';
import { OrderSummary } from './OrderSummary';

export function CartDrawer() {
  const open = useUiStore((state) => state.cartOpen);
  const closeCart = useUiStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const itemCount = useCartStore((state) => state.itemCount());

  return (
    <Drawer open={open} title={`Your Cart (${itemCount})`} onClose={closeCart}>
      <div className="grid max-h-[calc(100vh-74px)] gap-4 overflow-y-auto p-4">
        {items.length === 0 ? (
          <EmptyState
            action="Start Shopping"
            href="/products"
            icon={ShoppingBag}
            message="Add lab-verified staples and wellness essentials to begin."
            title="Your cart feels light"
          />
        ) : (
          <>
            <div className="grid gap-3">
              {items.map((item) => (
                <CartItemRow key={`${item.product.id}-${item.variantId ?? 'base'}`} item={item} />
              ))}
            </div>
            <OrderSummary />
            <Link className="text-center text-sm font-semibold text-brand-primary" href="/products" onClick={closeCart}>
              Continue Shopping
            </Link>
          </>
        )}
      </div>
    </Drawer>
  );
}
