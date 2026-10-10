'use client';

import { useQuery } from '@tanstack/react-query';
import { Tag, Truck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useCheckoutSelection } from '@/hooks/api/useCheckoutSelection';
import { validateCoupon } from '@/lib/api/endpoints/coupons';
import { errorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils/money';
import { useCheckoutStore } from '@/store/checkout.store';

interface CheckoutPriceDetailsProps {
  ctaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  helperText?: string;
  termsText?: string;
  onCta?: () => void;
  orderTotals?: { subtotal: number; deliveryFee: number; totalAmount: number; discountAmount?: number; couponCode?: string };
}

/** A quote is display-only; checkout independently validates eligibility and money. */
export function CheckoutPriceDetails({ ctaLabel = 'Continue', disabled, loading, helperText, termsText, onCta, orderTotals }: CheckoutPriceDetailsProps) {
  const { owner, cart, couponCode } = useCheckoutSelection();
  const setCouponCode = useCheckoutStore((state) => state.setCouponCode);
  const [draft, setDraft] = useState(couponCode);
  const quote = useQuery({
    queryKey: ['coupon-quote', owner, couponCode, cart.items.map((item) => [item.id, item.quantity, item.lineTotal])],
    queryFn: ({ signal }) => validateCoupon(couponCode, cart.items.map((item) => item.id), signal),
    enabled: !orderTotals && Boolean(couponCode) && cart.items.length > 0 && owner !== 'guest',
    retry: false,
    staleTime: 0,
  });
  const activeQuote = couponCode && !quote.isFetching && !quote.isError ? quote.data : undefined;
  const subtotal = orderTotals?.subtotal ?? activeQuote?.subtotal ?? cart.subtotal;
  const discount = orderTotals?.discountAmount ?? activeQuote?.discountAmount ?? 0;
  const total = orderTotals?.totalAmount ?? activeQuote?.total;
  const couponBlocked = !orderTotals && Boolean(couponCode) && (!activeQuote || quote.isFetching || quote.isError);

  return <aside className="h-fit rounded-2xl border border-surface-border bg-surface-base p-5 shadow-xs sm:p-6 lg:sticky lg:top-6">
    <h2 className="text-xl font-medium tracking-tight text-[#04342c]">Price details</h2>
    <div className="mt-4 grid gap-3 border-b border-surface-border pb-4 text-sm">
      <PriceLine label={orderTotals ? 'Subtotal' : `Subtotal (${cart.itemCount} selected ${cart.itemCount === 1 ? 'unit' : 'units'})`} value={formatCurrency(subtotal)} />
      {discount > 0 && <PriceLine label={`Coupon (${orderTotals?.couponCode ?? activeQuote?.code})`} value={`−${formatCurrency(discount)}`} />}
      {orderTotals && <PriceLine label="Delivery" value={orderTotals.deliveryFee === 0 ? 'Free' : formatCurrency(orderTotals.deliveryFee)} />}
    </div>
    {!orderTotals && <form className="mt-4 grid gap-2" onSubmit={(event) => { event.preventDefault(); const code = draft.trim().toUpperCase(); if (code) { if (code === couponCode) void quote.refetch(); else setCouponCode(owner, code); } }}>
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor="coupon-code"><Tag aria-hidden="true" size={18} />Have an offer or coupon?</label>
      <div className="flex gap-2">
        <input className="min-w-0 flex-1 rounded-lg border border-surface-border bg-white px-3 py-2 uppercase focus-visible:outline-brand-primary" id="coupon-code" maxLength={100} value={draft} placeholder="Enter coupon code" onChange={(event) => setDraft(event.target.value)} />
        <Button type="submit" variant="outline" disabled={!draft.trim() || !cart.items.length || quote.isFetching}>Apply</Button>
      </div>
      {couponCode && <button className="min-h-11 w-fit text-sm text-brand-primary underline" type="button" onClick={() => { setCouponCode(owner, ''); setDraft(''); }}>Remove coupon</button>}
      {quote.isFetching && couponCode && <p className="text-sm text-text-secondary" role="status">Checking coupon…</p>}
      {quote.isError && couponCode && <p className="text-sm text-text-danger" role="alert">{errorMessage(quote.error)}</p>}
      {activeQuote && <p className="text-sm text-text-success" role="status">{activeQuote.code} applied. You save {formatCurrency(activeQuote.discountAmount)}.</p>}
    </form>}
    {total !== undefined ? <div className="flex items-center justify-between py-4 text-lg font-medium"><span>Total amount</span><span>{formatCurrency(total)}</span></div> : <p className="py-4 text-sm leading-6 text-text-secondary">Delivery charges, if any, are confirmed when you place the order.</p>}
    {helperText && <p className="mb-3 text-sm text-text-danger">{helperText}</p>}
    <Button className="w-full" disabled={disabled || loading || couponBlocked || (!orderTotals && !cart.items.length)} loading={loading} size="lg" onClick={onCta}>{ctaLabel}</Button>
    {termsText && <p className="mt-3 text-sm leading-6 text-text-secondary">{termsText}</p>}
    <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-text-secondary"><Truck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-primary" />Unselected items stay in your bag. Coupon eligibility is checked again when you order.</p>
  </aside>;
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span>{label}</span><span>{value}</span></div>;
}
