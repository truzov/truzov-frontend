'use client';

import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/api/useCart';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/money';

interface CheckoutPriceDetailsProps {
  ctaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  helperText?: string;
  termsText?: string;
  onCta?: () => void;
  /**
   * Order-level money, available only AFTER checkout returns an OrderDto. Before that the server
   * exposes no delivery fee or total, so the panel must not invent them.
   */
  orderTotals?: { subtotal: number; deliveryFee: number; totalAmount: number };
}

/**
 * Price summary.
 *
 * Every figure here comes from the server. What was removed, and why it matters:
 *
 *  - `calculateCartTotals()` — computed subtotal, a coupon discount, a shipping fee and a total in
 *    the browser from hardcoded policy (10% capped at Rs 150, free over Rs 499, else Rs 49). None of
 *    that is the server's pricing, so the "Total Amount" shown was not what the user would be
 *    charged. This is exactly what the API reference warns against.
 *  - "Total MRP" and "Discount on MRP" — derived by summing `product.mrp` across lines. `CartItemDto`
 *    has no MRP, and more importantly the server publishes no such breakdown, so both lines are gone
 *    rather than reconstructed.
 *  - The coupon form — there is no coupon endpoint (plan §6.1/§8.3). A box that silently did nothing
 *    while appearing to apply a discount is worse than no box.
 *
 * Before checkout the panel therefore shows subtotal and item count only, which is genuinely all the
 * cart endpoint returns. Delivery fee and total appear once there is an order.
 */
export function CheckoutPriceDetails({
  ctaLabel = 'Continue',
  disabled,
  loading,
  helperText,
  termsText,
  onCta,
  orderTotals,
}: CheckoutPriceDetailsProps) {
  const { cart, isLoading } = useCart();

  const subtotal = orderTotals?.subtotal ?? cart.subtotal;
  const itemCount = cart.itemCount;
  const hasItems = itemCount > 0 || Boolean(orderTotals);

  return (
    <aside className="h-fit rounded-2xl border border-surface-border bg-surface-base p-5 shadow-xs sm:p-6 lg:sticky lg:top-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-xl font-medium tracking-tight text-[#04342c]">
          Price details ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </h2>
        <div className="mt-4 grid gap-3 text-sm">
          <PriceLine label="Subtotal" value={formatCurrency(subtotal)} />
          {orderTotals ? (
            <PriceLine
              label="Delivery"
              // Zero is a real value here (truzov.commerce.delivery-fee defaults to 0), not a
              // missing one, so it renders as "Free" rather than being hidden.
              value={
                orderTotals.deliveryFee === 0 ? 'Free' : formatCurrency(orderTotals.deliveryFee)
              }
            />
          ) : null}
        </div>
      </div>

      {orderTotals ? (
        <div className="flex items-center justify-between py-4 text-lg font-medium">
          <span>Total amount</span>
          <span>{formatCurrency(orderTotals.totalAmount)}</span>
        </div>
      ) : (
        // No total before checkout, on purpose: GET /cart returns only `subtotal`, and any total
        // shown here would be a client-side guess at the server's pricing.
        <p className="py-4 text-sm leading-6 text-text-secondary">
          Delivery charges, if any, are calculated and confirmed when you place the order.
        </p>
      )}

      {helperText ? <p className="mb-3 text-sm text-text-danger">{helperText}</p> : null}

      <Button
        className="w-full"
        disabled={disabled || loading || (!hasItems && !isLoading)}
        loading={loading}
        size="lg"
        onClick={onCta}
      >
        {ctaLabel}
      </Button>

      {termsText ? <p className="mt-3 text-sm leading-6 text-text-secondary">{termsText}</p> : null}
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-text-secondary">
        <Truck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-primary" />
        Your order details are confirmed before payment.
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
