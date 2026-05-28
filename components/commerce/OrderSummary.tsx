'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCartStore } from '@/store/cart.store';
import { formatCurrency } from '@/lib/utils/money';

export function OrderSummary({ checkoutHref = '/checkout/address' }: { checkoutHref?: string }) {
  const coupon = useCartStore((state) => state.coupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const totals = useCartStore((state) => state.totals());
  const itemCount = useCartStore((state) => state.itemCount());

  return (
    <aside className="rounded-lg border border-surface-border bg-surface-base p-5 shadow-xs">
      <h2 className="font-heading text-2xl">Order Summary</h2>
      <div className="mt-5 grid gap-3 text-sm">
        <div className="flex justify-between">
          <span>Items</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {totals.discount ? (
          <div className="flex justify-between text-text-success">
            <span>Discount</span>
            <span>-{formatCurrency(totals.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)}</span>
        </div>
        <div className="border-t border-surface-border pt-3 text-lg font-semibold">
          <div className="flex justify-between">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const code = new FormData(event.currentTarget).get('coupon')?.toString() ?? '';
          void applyCoupon(code || 'TRUZOV10');
        }}
      >
        <Input aria-label="Promo code" className="h-10" name="coupon" placeholder={coupon ?? 'TRUZOV10'} />
        <Button size="md" type="submit" variant="outline">
          Apply
        </Button>
      </form>
      <Link className="mt-5 block" href={checkoutHref}>
        <Button className="w-full" disabled={itemCount === 0} size="lg">
          Proceed to Checkout
        </Button>
      </Link>
      <p className="mt-3 text-sm text-text-secondary">Safe checkout verified by Truzov Labs.</p>
    </aside>
  );
}
