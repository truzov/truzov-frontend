'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BadgePercent, Banknote, CreditCard, MapPin, Plus, QrCode, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { CheckoutPriceDetails } from '@/components/checkout/CheckoutPriceDetails';
import { BagItemRow } from '@/components/checkout/BagItemRow';
import { addressSchema } from '@/lib/validations/checkout';
import { addresses as fixtureAddresses } from '@/lib/data/fixtures';
import { calculateCartTotals, formatCurrency } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useCheckoutStore } from '@/store/checkout.store';
import type { Address } from '@/types';

const paymentMethods = [
  { id: 'UPI', label: 'UPI', icon: Smartphone, helper: 'Pay via any UPI app' },
  { id: 'Card', label: 'Credit/Debit Card', icon: CreditCard, helper: 'Visa, Mastercard, RuPay' },
  { id: 'COD', label: 'Cash on Delivery', icon: Banknote, helper: 'Cash/UPI at doorstep' },
  { id: 'Wallet', label: 'Wallets', icon: Wallet, helper: 'Popular prepaid wallets' },
] as const;

export function BagScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <CheckoutProgress active={0} />
        <div className="mt-8">
          <EmptyState
            action="Start Shopping"
            href="/products"
            icon={AlertCircle}
            message="Your bag feels light. Browse lab-verified staples and add a few favorites."
            title="Your bag is empty"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
        <CheckoutProgress active={0} />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="grid gap-4">
            <section className="flex flex-col justify-between gap-3 rounded-md border border-surface-border bg-surface-base p-4 shadow-xs sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-text-secondary">Deliver to</p>
                <p className="font-bold">
                  {isLoggedIn ? user?.name ?? fixtureAddresses[0].fullName : 'Sign in to select your delivery address'}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {isLoggedIn
                    ? `${fixtureAddresses[0].city}, ${fixtureAddresses[0].state} - ${fixtureAddresses[0].pincode}`
                    : 'Bag is public. Address selection starts after login.'}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push(isLoggedIn ? '/checkout/address' : '/login?redirect=/checkout/address')}>
                {isLoggedIn ? 'Change Address' : 'Login to Continue'}
              </Button>
            </section>

            <section className="rounded-md border border-surface-border bg-surface-base p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <BadgePercent aria-hidden="true" className="mt-1 h-5 w-5 text-brand-primary" />
                <div>
                  <h2 className="font-bold">Available Offers</h2>
                  <p className="mt-2 text-sm text-text-secondary">10% off with TRUZOV10 on verified wellness essentials. Coupon can be applied in price details.</p>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-surface-border bg-surface-base p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-heading text-2xl">{itemCount} {itemCount === 1 ? 'Item' : 'Items'} in Your Bag</h1>
                <p className="text-sm font-semibold text-text-secondary">Review quantities before address selection</p>
              </div>
            </section>

            <div className="grid gap-3">
              {items.map((item) => (
                <BagItemRow key={`${item.product.id}-${item.variantId ?? 'base'}`} item={item} />
              ))}
            </div>
          </main>

          <CheckoutPriceDetails
            ctaLabel="Continue"
            termsText="By continuing, you agree to Truzov's terms and verified marketplace policies."
            onCta={() => router.push(isLoggedIn ? '/checkout/address' : '/login?redirect=/checkout/address')}
          />
        </div>
      </div>
    </div>
  );
}

export function AddressScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const setSelectedAddress = useCheckoutStore((state) => state.setSelectedAddress);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(fixtureAddresses);
  const [showForm, setShowForm] = useState(fixtureAddresses.length === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId);

  useEffect(() => {
    if (!selectedAddressId && savedAddresses[0]) {
      setSelectedAddress(savedAddresses.find((address) => address.isDefault)?.id ?? savedAddresses[0].id);
    }
  }, [savedAddresses, selectedAddressId, setSelectedAddress]);

  if (!items.length) {
    return <BlockedCheckoutEmptyState />;
  }

  function addAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const candidate = {
      fullName: form.get('fullName')?.toString() ?? '',
      phone: form.get('phone')?.toString() ?? '',
      pincode: form.get('pincode')?.toString() ?? '',
      addressLine1: form.get('addressLine1')?.toString() ?? '',
      addressLine2: form.get('addressLine2')?.toString() || undefined,
      city: form.get('city')?.toString() ?? '',
      state: form.get('state')?.toString() ?? '',
      saveAsDefault: false,
    };
    const result = addressSchema.safeParse(candidate);

    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0]?.toString() ?? 'form', issue.message])));
      return;
    }

    const nextAddress: Address = {
      id: `addr-${Date.now()}`,
      ...result.data,
      isDefault: savedAddresses.length === 0,
    };
    setSavedAddresses((current) => [...current, nextAddress]);
    setSelectedAddress(nextAddress.id);
    setShowForm(false);
    setErrors({});
    event.currentTarget.reset();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">Address</p>
            <h1 className="font-heading text-3xl">Select Delivery Address</h1>
          </div>
          <Button variant="outline" onClick={() => setShowForm((value) => !value)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add New Address
          </Button>
        </div>

        <section className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">Default Address</h2>
          {savedAddresses.filter((address) => address.isDefault).map((address) => (
            <AddressCard key={address.id} address={address} selected={selectedAddressId === address.id} onSelect={() => setSelectedAddress(address.id)} />
          ))}
        </section>

        {savedAddresses.some((address) => !address.isDefault) ? (
          <section className="grid gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">Other Addresses</h2>
            {savedAddresses.filter((address) => !address.isDefault).map((address) => (
              <AddressCard key={address.id} address={address} selected={selectedAddressId === address.id} onSelect={() => setSelectedAddress(address.id)} />
            ))}
          </section>
        ) : null}

        {showForm ? (
          <form className="grid gap-4 rounded-md border border-surface-border bg-surface-base p-5 shadow-xs md:grid-cols-2" onSubmit={addAddress}>
            <h2 className="font-heading text-2xl md:col-span-2">Add New Address</h2>
            <Input error={errors.fullName} label="Full name" name="fullName" placeholder="Asha Verma" />
            <Input error={errors.phone} label="Phone" name="phone" placeholder="9876543210" />
            <Input error={errors.pincode} label="Pincode" name="pincode" placeholder="560001" />
            <Input error={errors.city} label="City" name="city" placeholder="Bengaluru" />
            <Input error={errors.state} label="State" name="state" placeholder="Karnataka" />
            <Input error={errors.addressLine1} label="Address line 1" name="addressLine1" placeholder="Flat / house / street" />
            <Input className="md:col-span-2" error={errors.addressLine2} label="Address line 2" name="addressLine2" placeholder="Area / landmark" />
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit">Save Address</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </main>

      <div className="grid gap-4">
        <DeliveryEstimateList />
        <CheckoutPriceDetails
          ctaLabel="Continue"
          disabled={!selectedAddress}
          helperText={!selectedAddress ? 'Select or add an address to continue.' : undefined}
          onCta={() => router.push('/checkout/payment')}
        />
      </div>
    </div>
  );
}

export function PaymentScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const clearCart = useCartStore((state) => state.clearCart);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod);
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod);
  const totals = calculateCartTotals(items, coupon);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!items.length) {
    return <BlockedCheckoutEmptyState />;
  }

  if (!selectedAddressId) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border border-surface-border bg-surface-base p-6 text-center shadow-xs">
        <MapPin aria-hidden="true" className="mx-auto h-10 w-10 text-brand-primary" />
        <h1 className="mt-4 font-heading text-3xl">Select an address first</h1>
        <p className="mt-2 text-text-secondary">Payment can begin after a delivery address is selected.</p>
        <Button className="mt-5" onClick={() => router.push('/checkout/address')}>
          Go to Address
        </Button>
      </div>
    );
  }

  function payNow() {
    setProcessing(true);
    setError(null);
    window.setTimeout(() => {
      clearCart();
      router.push('/checkout/confirm?paid=1');
    }, 700);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main className="grid gap-5">
        <section className="rounded-md border border-surface-border bg-surface-base p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <BadgePercent aria-hidden="true" className="mt-1 h-5 w-5 text-brand-primary" />
            <div>
              <h1 className="font-bold">Bank Offer</h1>
              <p className="mt-2 text-sm text-text-secondary">7.5% assured cashback on verified wellness orders above Rs 100. Terms apply.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-3xl">Choose Payment Mode</h2>
          <div className="mt-5 overflow-hidden rounded-md border border-surface-border bg-surface-base shadow-xs lg:grid lg:grid-cols-[280px_1fr]">
            <div className="bg-surface-raised">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const active = paymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-surface-border px-4 py-4 text-left transition hover:bg-brand-light',
                      active && 'border-l-4 border-l-brand-primary bg-surface-base'
                    )}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method.id);
                      setError(null);
                    }}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5 text-brand-primary" />
                    <span>
                      <span className="block font-bold">{method.label}</span>
                      <span className="text-xs text-text-secondary">{method.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              <h3 className="font-heading text-2xl">Recommended Payment Options</h3>
              <PaymentDetails method={paymentMethod} total={totals.total} />
              {error ? (
                <div className="mt-4 rounded-md border border-text-danger bg-status-dangerBg p-3 text-sm text-text-danger">
                  {error}
                </div>
              ) : null}
              <Button className="mt-5 w-full" loading={processing} size="lg" onClick={payNow}>
                Pay {formatCurrency(totals.total)}
              </Button>
              <button
                className="mt-3 text-sm font-semibold text-text-secondary hover:text-text-danger"
                type="button"
                onClick={() => setError('Payment failed. Please try again or use another payment method.')}
              >
                Simulate payment failure
              </button>
            </div>
          </div>
        </section>
      </main>

      <CheckoutPriceDetails
        ctaLabel={`Pay ${formatCurrency(totals.total)}`}
        termsText="By placing the order, you agree to Truzov's Terms of Use and Privacy Policy."
        onCta={payNow}
      />
    </div>
  );
}

export function ConfirmationScreen() {
  const resetCheckout = useCheckoutStore((state) => state.resetCheckout);

  useEffect(() => {
    resetCheckout();
  }, [resetCheckout]);

  return (
    <section className="mx-auto max-w-3xl rounded-md border border-surface-border bg-surface-base p-8 text-center shadow-xs">
      <ShieldCheck aria-hidden="true" className="mx-auto h-16 w-16 fill-brand-primary text-brand-primary" />
      <h1 className="mt-5 font-heading text-4xl">Your order is confirmed!</h1>
      <p className="mt-3 text-text-secondary">
        Order ID <span className="font-mono">TRZ-2026-1042</span> has been placed successfully.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={() => window.location.assign('/account/orders/TRZ-2026-1042')}>Track Order</Button>
        <Button variant="outline" onClick={() => window.location.assign('/')}>Continue Shopping</Button>
      </div>
    </section>
  );
}

function AddressCard({ address, selected, onSelect }: { address: Address; selected: boolean; onSelect: () => void }) {
  return (
    <label className={cn('flex cursor-pointer gap-4 rounded-md border bg-surface-base p-5 shadow-xs transition', selected ? 'border-brand-primary ring-2 ring-brand-light' : 'border-surface-border')}>
      <input checked={selected} className="mt-1 h-5 w-5 accent-brand-primary" name="address" type="radio" onChange={onSelect} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <strong>{address.fullName}</strong>
          <span className="rounded-full border border-brand-primary px-2 py-0.5 text-xs font-bold uppercase text-brand-primary">Home</span>
        </span>
        <span className="mt-3 block text-sm leading-6 text-text-secondary">
          {address.addressLine1}
          {address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city}, {address.state} - {address.pincode}
        </span>
        <span className="mt-2 block text-sm text-text-secondary">Mobile: <strong className="text-text-primary">{address.phone}</strong></span>
        <span className="mt-3 block text-sm font-semibold text-text-success">Pay on Delivery available</span>
        <span className="mt-4 flex gap-3">
          <Button size="sm" type="button" variant="outline">Edit</Button>
          <Button size="sm" type="button" variant="ghost">Remove</Button>
        </span>
      </span>
    </label>
  );
}

function DeliveryEstimateList() {
  const items = useCartStore((state) => state.items);
  const estimates = useMemo(() => items.slice(0, 3), [items]);

  return (
    <aside className="rounded-md border border-surface-border bg-surface-base p-5 shadow-xs">
      <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">Delivery Estimates</h2>
      <div className="mt-4 grid gap-3">
        {estimates.map((item, index) => (
          <div key={item.product.id} className="flex items-center gap-3 border-b border-surface-border pb-3 last:border-0 last:pb-0">
            <div className="relative h-14 w-12 overflow-hidden rounded-sm bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={item.product.images[0].url} />
            </div>
            <p className="text-sm text-text-secondary">
              Estimated delivery by <strong className="text-text-primary">{index === 0 ? '8 Jun 2026' : '9 Jun 2026'}</strong>
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PaymentDetails({ method, total }: { method: string; total: number }) {
  if (method === 'Card') {
    return (
      <div className="mt-5 grid gap-4">
        <Input label="Card number" placeholder="4111 1111 1111 1111" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Expiry" placeholder="MM/YY" />
          <Input label="CVV" placeholder="123" />
        </div>
      </div>
    );
  }

  if (method === 'COD') {
    return <p className="mt-5 rounded-md bg-surface-raised p-4 text-sm text-text-secondary">Cash on Delivery is available for the selected address. Keep {formatCurrency(total)} ready at delivery.</p>;
  }

  if (method === 'Wallet') {
    return <Input className="mt-5" label="Wallet mobile number" placeholder="9876543210" />;
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex items-center justify-between rounded-md bg-surface-raised p-4">
        <label className="flex items-center gap-3 font-bold">
          <input defaultChecked className="h-5 w-5 accent-brand-primary" name="upi-mode" type="radio" />
          Scan & Pay
        </label>
        <QrCode aria-hidden="true" className="h-12 w-12 text-brand-primary" />
      </div>
      <Input label="UPI ID" placeholder="name@upi" />
    </div>
  );
}

function BlockedCheckoutEmptyState() {
  return (
    <div className="mx-auto max-w-4xl py-10">
      <EmptyState
        action="Start Shopping"
        href="/products"
        icon={AlertCircle}
        message="Your bag is empty, so checkout cannot continue yet."
        title="Add items to continue"
      />
    </div>
  );
}
