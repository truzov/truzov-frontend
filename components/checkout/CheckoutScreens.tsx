'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BadgePercent,
  Banknote,
  CreditCard,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { CheckoutPriceDetails } from '@/components/checkout/CheckoutPriceDetails';
import { BagItemRow } from '@/components/checkout/BagItemRow';
import { AddressFormModal } from '@/components/checkout/AddressFormModal';
import { calculateCartTotals, formatCurrency } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useCartStore } from '@/store/cart.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAddressStore } from '@/store/address.store';
import { useOrdersStore } from '@/store/orders.store';
import type { Address, CartItem } from '@/types';

const paymentMethods = [
  { id: 'UPI', label: 'UPI', icon: Smartphone, helper: 'Pay via any UPI app' },
  { id: 'Card', label: 'Credit/Debit Card', icon: CreditCard, helper: 'Visa, Mastercard, RuPay' },
  { id: 'COD', label: 'Cash on Delivery', icon: Banknote, helper: 'Cash/UPI at doorstep' },
  { id: 'Wallet', label: 'Wallets', icon: Wallet, helper: 'Popular prepaid wallets' },
] as const;

export function BagScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const selectedItems = useCartStore((state) => state.selectedItems);
  const selectAll = useCartStore((state) => state.selectAll);
  const deselectAll = useCartStore((state) => state.deselectAll);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const continueToAddress = () => {
    if (isLoggedIn) {
      router.push('/checkout/address');
      return;
    }

    openAuthModal({ mode: 'login', redirectTo: '/checkout/address' });
  };

  if (!items.length) {
    return (
      <div className="mx-auto max-w-5xl">
        <div>
          <EmptyState
            action="Start Shopping"
            href="/products"
            icon={AlertCircle}
            message="Your bag feels light. Browse verified staples and add a few favorites."
            title="Your bag is empty"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="grid gap-4">
            <section className="rounded-md border border-surface-border bg-surface-base p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <BadgePercent aria-hidden="true" className="mt-1 h-5 w-5 text-brand-primary" />
                <div>
                  <h2 className="font-bold">Available Offers</h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    10% off with TRUZOV10 on verified wellness essentials. Coupon can be applied in
                    price details.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-surface-border bg-surface-base p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-heading text-2xl">
                  {itemCount} {itemCount === 1 ? 'Item' : 'Items'} in Your Bag
                </h1>
                <button
                  className="text-sm font-semibold text-brand-primary hover:underline"
                  onClick={allSelected ? deselectAll : selectAll}
                  type="button"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </section>

            <div className="grid gap-3">
              {items.map((item) => (
                <BagItemRow key={`${item.product.id}-${item.variantId ?? 'base'}`} item={item} />
              ))}
            </div>
          </main>

          <CheckoutPriceDetails
            ctaLabel={isLoggedIn ? 'Continue' : 'Login to Continue'}
            termsText="By continuing, you agree to Truzov's terms and verified marketplace policies."
            onCta={continueToAddress}
          />
        </div>
      </div>
    </div>
  );
}

export function AddressScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const selectedItems = useCartStore((state) => state.selectedItems);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const setSelectedAddress = useCheckoutStore((state) => state.setSelectedAddress);
  const addresses = useAddressStore((state) => state.addresses);
  const deleteAddress = useAddressStore((state) => state.deleteAddress);
  const { getAddress, getDefaultAddress } = useAddressStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | undefined>();
  const selectedAddress = getAddress(selectedAddressId ?? '');
  const selectedCartItems = useMemo(
    () => items.filter((item) => selectedItems.includes(item.product.id)),
    [items, selectedItems]
  );
  const defaultAddresses = useMemo(
    () => addresses.filter((address) => address.isDefault),
    [addresses]
  );
  const otherAddresses = useMemo(
    () => addresses.filter((address) => !address.isDefault),
    [addresses]
  );

  useEffect(() => {
    if (selectedAddress) {
      return;
    }

    const defaultAddr = getDefaultAddress();
    if (defaultAddr) {
      setSelectedAddress(defaultAddr.id);
    }
  }, [addresses, selectedAddress, selectedAddressId, getDefaultAddress, setSelectedAddress]);

  useEffect(() => {
    if (items.length && !isLoggedIn) {
      openAuthModal({ mode: 'login', redirectTo: '/checkout/address' });
    }
  }, [isLoggedIn, items.length, openAuthModal]);

  if (!items.length) {
    return <BlockedCheckoutEmptyState />;
  }

  if (!isLoggedIn) {
    return <BlockedCheckoutAuthState />;
  }

  const openAddModal = () => {
    setEditingAddress(undefined);
    setModalOpen(true);
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    setModalOpen(true);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">Address</p>
            <h1 className="font-heading text-3xl">Select Delivery Address</h1>
          </div>

          <Button variant="outline" onClick={openAddModal}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add New Address
          </Button>
        </div>

        <div className="grid gap-5" aria-label="Delivery addresses" role="radiogroup">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">
              Default Address
            </h2>

            {defaultAddresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                inputId={`delivery-address-${address.id}`}
                inputName="delivery-address"
                selected={selectedAddressId === address.id}
                onSelect={() => setSelectedAddress(address.id)}
                onDelete={() => deleteAddress(address.id)}
                onEdit={() => openEditModal(address)}
              />
            ))}
          </section>

          {otherAddresses.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">
                Other Addresses
              </h2>

              {otherAddresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  inputId={`delivery-address-${address.id}`}
                  inputName="delivery-address"
                  selected={selectedAddressId === address.id}
                  onSelect={() => setSelectedAddress(address.id)}
                  onDelete={() => deleteAddress(address.id)}
                  onEdit={() => openEditModal(address)}
                />
              ))}
            </section>
          ) : null}
        </div>
      </main>

      <AddressFormModal
        open={modalOpen}
        address={editingAddress}
        onClose={() => setModalOpen(false)}
      />

      <div className="grid gap-4 lg:sticky lg:top-6 lg:self-start">
        <DeliveryEstimateList items={selectedCartItems} />
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
  const selectedItems = useCartStore((state) => state.selectedItems);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const coupon = useCartStore((state) => state.coupon);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const setSelectedAddress = useCheckoutStore((state) => state.setSelectedAddress);
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod);
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod);
  const resetCheckout = useCheckoutStore((state) => state.resetCheckout);
  const getAddress = useAddressStore((state) => state.getAddress);
  const addresses = useAddressStore((state) => state.addresses);
  const { getDefaultAddress } = useAddressStore();
  const addOrder = useOrdersStore((state) => state.addOrder);

  const selectedCartItems = items.filter((item) => selectedItems.includes(item.product.id));
  const totals = calculateCartTotals(selectedCartItems, coupon);
  const selectedAddress = getAddress(selectedAddressId ?? '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length && !isLoggedIn) {
      openAuthModal({ mode: 'login', redirectTo: '/checkout/payment' });
    }
  }, [isLoggedIn, items.length, openAuthModal]);

  useEffect(() => {
    if (selectedAddress) {
      return;
    }

    const defaultAddr = getDefaultAddress();
    if (defaultAddr) {
      setSelectedAddress(defaultAddr.id);
    }
  }, [addresses, selectedAddress, selectedAddressId, getDefaultAddress, setSelectedAddress]);

  if (!items.length) {
    return <BlockedCheckoutEmptyState />;
  }

  if (!isLoggedIn) {
    return <BlockedCheckoutAuthState />;
  }

  if (!selectedAddressId || !selectedAddress) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border border-surface-border bg-surface-base p-6 text-center shadow-xs">
        <MapPin aria-hidden="true" className="mx-auto h-10 w-10 text-brand-primary" />
        <h1 className="mt-4 font-heading text-3xl">Select an address first</h1>
        <p className="mt-2 text-text-secondary">
          Payment can begin after a delivery address is selected.
        </p>
        <Button className="mt-5" onClick={() => router.push('/checkout/address')}>
          Go to Address
        </Button>
      </div>
    );
  }

  function payNow() {
    if (!selectedAddress) return;
    setProcessing(true);
    setError(null);

    const order = {
      id: `TRZ-${Date.now()}`,
      status: 'pending' as const,
      items: selectedCartItems,
      address: selectedAddress,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      paymentMethod,
      createdAt: new Date().toISOString(),
    };

    addOrder(order);
    resetCheckout();

    window.setTimeout(() => {
      setProcessing(false);
      router.push('/checkout/confirm');
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
              <p className="mt-2 text-sm text-text-secondary">
                    7.5% assured cashback on verified wellness orders above Rs 100. Terms apply.
              </p>
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
                onClick={() =>
                  setError('Payment failed. Please try again or use another payment method.')
                }
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
  const router = useRouter();
  const resetCheckout = useCheckoutStore((state) => state.resetCheckout);
  const clearCart = useCartStore((state) => state.clearCart);
  const orders = useOrdersStore((state) => state.orders);
  const latestOrder = orders[0];

  useEffect(() => {
    if (latestOrder) {
      resetCheckout();
      clearCart();
    }
  }, [latestOrder, resetCheckout, clearCart]);

  if (!latestOrder) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <EmptyState
          action="Continue Shopping"
          href="/products"
          icon={AlertCircle}
          message="No recent order found. Please complete the checkout process."
          title="Order not found"
        />
      </div>
    );
  }

  const orderId = latestOrder.id;
  const selectedAddress = latestOrder.address;
  const itemCount = latestOrder.items.length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-md border border-surface-border bg-surface-base p-6 shadow-xs sm:p-8">
        <div className="border-b border-surface-border pb-6 text-center sm:pb-8">
          <ShieldCheck
            aria-hidden="true"
            className="mx-auto h-14 w-14 fill-brand-primary text-brand-primary sm:h-16 sm:w-16"
          />
          <h1 className="mt-4 font-heading text-2xl text-brand-primary sm:text-3xl">
            Order confirmed
          </h1>
          <p className="mt-2 text-sm text-text-secondary sm:text-base">
            You will receive an order confirmation email/SMS shortly with the expected delivery date
            for your items.
          </p>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-[1fr_auto] sm:py-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Delivering to:
            </p>
            <div className="mt-3">
              <p className="font-semibold text-text-primary">
                {selectedAddress.fullName} | {selectedAddress.phone}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {selectedAddress.addressLine1}
                {selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''},{' '}
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="mt-4 border-brand-primary text-brand-primary hover:bg-brand-light"
              onClick={() => router.push('/account/orders')}
            >
              ORDER DETAILS
            </Button>

            <p className="mt-4 text-xs text-text-secondary">
              Track, view, or modify this order from your orders page.
            </p>
          </div>

          <div className="border-t border-surface-border pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Order Summary
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Order ID:</span>
                <span className="font-mono font-semibold">{orderId}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Items:</span>
                <span className="font-semibold">{itemCount}</span>
              </div>

              <div className="flex justify-between border-t border-surface-border pt-2 text-sm">
                <span className="text-text-secondary">Status:</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-text-success">
                  <span className="inline-block h-2 w-2 rounded-full bg-text-success" />
                  Confirmed
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-surface-border pt-6 sm:flex-row sm:justify-between">
          <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
            Continue Shopping
          </Button>
          <Button className="flex-1" onClick={() => router.push(`/account/orders/${orderId}`)}>
            View Order
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddressCard({
  address,
  inputId,
  inputName,
  selected,
  onSelect,
  onDelete,
  onEdit,
}: {
  address: Address;
  inputId: string;
  inputName: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-surface-base p-5 shadow-xs transition focus-within:ring-2 focus-within:ring-brand-light',
        selected ? 'border-brand-primary ring-2 ring-brand-light' : 'border-surface-border'
      )}
    >
      <input
        checked={selected}
        className="peer sr-only"
        id={inputId}
        name={inputName}
        type="radio"
        onChange={onSelect}
      />
      <label
        className="flex cursor-pointer items-start gap-4 rounded-md text-left peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-light"
        htmlFor={inputId}
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
            selected ? 'border-brand-primary bg-brand-light' : 'border-surface-border bg-white'
          )}
        >
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full bg-brand-primary transition-transform',
              selected ? 'scale-100' : 'scale-0'
            )}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{address.fullName}</strong>
            <span className="rounded-full border border-brand-primary px-2 py-0.5 text-xs font-bold uppercase text-brand-primary">
              Home
            </span>
          </div>

          <div className="mt-3 text-sm leading-6 text-text-secondary">
            {address.addressLine1}
            {address.addressLine2 ? ', ' + address.addressLine2 : ''}, {address.city}, {address.state} -{' '}
            {address.pincode}
          </div>

          <div className="mt-2 text-sm text-text-secondary">
            Mobile: <strong className="text-text-primary">{address.phone}</strong>
          </div>

          <div className="mt-3 text-sm font-semibold text-text-success">
            Pay on Delivery available
          </div>
        </div>
      </label>

      <div className="mt-4 flex gap-3 pl-9">
        {onEdit ? (
          <Button size="sm" type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
        ) : null}

        <Button size="sm" type="button" variant="ghost" onClick={onDelete}>
          Remove
        </Button>
      </div>
    </div>
  );
}

function DeliveryEstimateList({ items }: { items: CartItem[] }) {
  const estimates = useMemo(() => items.slice(0, 3), [items]);

  return (
    <aside className="rounded-md border border-surface-border bg-surface-base p-5 shadow-xs">
      <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">
        Delivery Estimates
      </h2>
      {estimates.length ? (
        <div className="mt-4 grid gap-3">
          {estimates.map((item, index) => (
            <div
              key={`${item.product.id}-${item.variantId ?? 'base'}`}
              className="flex items-center gap-3 border-b border-surface-border pb-3 last:border-0 last:pb-0"
            >
              <div className="relative h-14 w-12 overflow-hidden rounded-sm bg-surface-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="h-full w-full object-cover" src={item.product.images[0].url} />
              </div>
              <p className="text-sm text-text-secondary">
                Estimated delivery by{' '}
                <strong className="text-text-primary">
                  {index === 0 ? '8 Jun 2026' : '9 Jun 2026'}
                </strong>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-secondary">
          Select items in your bag to see delivery estimates.
        </p>
      )}
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
    return (
      <p className="mt-5 rounded-md bg-surface-raised p-4 text-sm text-text-secondary">
        Cash on Delivery is available for the selected address. Keep {formatCurrency(total)} ready
        at delivery.
      </p>
    );
  }

  if (method === 'Wallet') {
    return <Input className="mt-5" label="Wallet mobile number" placeholder="9876543210" />;
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex items-center justify-between rounded-md bg-surface-raised p-4">
        <label className="flex items-center gap-3 font-bold">
          <input
            defaultChecked
            className="h-5 w-5 accent-brand-primary"
            name="upi-mode"
            type="radio"
          />
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

function BlockedCheckoutAuthState() {
  return (
    <div className="mx-auto max-w-4xl py-10">
      <EmptyState
        action="Sign In"
        href="/login"
        icon={ShieldCheck}
        message="Sign in to continue to secure checkout."
        title="Authentication required"
      />
    </div>
  );
}