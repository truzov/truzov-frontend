'use client';

import { useState } from 'react';
import { Tag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { calculateCartTotals, formatCurrency } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { useCartStore } from '@/store/cart.store';

interface CheckoutPriceDetailsProps {
  ctaLabel?: string;
  disabled?: boolean;
  helperText?: string;
  termsText?: string;
  onCta?: () => void;
}

export function CheckoutPriceDetails({
  ctaLabel = 'Continue',
  disabled,
  helperText,
  termsText,
  onCta,
}: CheckoutPriceDetailsProps) {
  const items = useCartStore((state) => state.items);
  const selectedItems = useCartStore((state) => state.selectedItems);
  const coupon = useCartStore((state) => state.coupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const [couponError, setCouponError] = useState<string | null>(null);

  const selectedCartItems = items.filter((item) => selectedItems.includes(item.product.id));
  const totals = calculateCartTotals(selectedCartItems, coupon);
  const itemCount = selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const mrpTotal = selectedCartItems.reduce((sum, item) => sum + item.product.mrp * item.quantity, 0);
  const productDiscount = Math.max(0, mrpTotal - totals.subtotal);
  const noItemsSelected = selectedItems.length === 0;

  return (
    <aside className="rounded-md border border-surface-border bg-surface-base p-5 shadow-xs lg:sticky lg:top-28">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">
          Price Details ({itemCount} {itemCount === 1 ? 'Item' : 'Items'})
        </h2>
        <div className="mt-4 grid gap-3 text-sm">
          <PriceLine label="Total MRP" value={formatCurrency(mrpTotal || totals.subtotal)} />
          <PriceLine label="Discount on MRP" tone="success" value={`- ${formatCurrency(productDiscount + totals.discount)}`} />
          <PriceLine label="Platform Fee" value={totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)} />
        </div>
      </div>

      <div className="flex items-center justify-between py-4 text-lg font-bold">
        <span>Total Amount</span>
        <span>{formatCurrency(totals.total)}</span>
      </div>

      <form
        className="mb-4 grid gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const code = new FormData(event.currentTarget).get('coupon')?.toString().trim() || 'TRUZOV10';
          try {
            setCouponError(null);
            await applyCoupon(code);
          } catch {
            setCouponError('Invalid coupon code');
          }
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
          <Tag aria-hidden="true" className="h-4 w-4" />
          Apply Coupon
        </div>
        <div className="flex gap-2">
          <Input aria-label="Coupon code" className="h-10" name="coupon" placeholder={coupon ?? 'TRUZOV10'} />
          <Button size="md" type="submit" variant="outline">
            Apply
          </Button>
        </div>
        {couponError ? <p className="text-xs text-text-danger">{couponError}</p> : coupon ? <p className="text-xs font-semibold text-text-success">{coupon} applied.</p> : null}
      </form>

      {helperText ? <p className="mb-3 text-sm text-text-danger">{helperText}</p> : null}
      {noItemsSelected && !helperText ? (
        <p className="mb-3 text-sm text-text-danger">Select at least one item to continue</p>
      ) : null}
      <Button className="w-full" disabled={disabled || noItemsSelected} size="lg" onClick={onCta}>
        {ctaLabel}
      </Button>
      {termsText ? <p className="mt-3 text-xs leading-5 text-text-secondary">{termsText}</p> : null}
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-text-secondary">
        <Truck aria-hidden="true" className="h-4 w-4 text-brand-primary" />
        Safe checkout verified by Truzov Labs.
      </p>
    </aside>
  );
}

function PriceLine({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className={cn(tone === 'success' && 'text-text-success')}>{value}</span>
    </div>
  );
}
