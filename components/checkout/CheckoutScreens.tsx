'use client';

import { AlertCircle, MapPin, Minus, Phone, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AddressFormModal } from '@/components/checkout/AddressFormModal';
import { BagItemRow } from '@/components/checkout/BagItemRow';
import { CheckoutPriceDetails } from '@/components/checkout/CheckoutPriceDetails';
import { OrderItemRow } from '@/components/commerce/OrderItemRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, InlineError } from '@/components/ui/ErrorState';
import { CartScreenSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { useCart } from '@/hooks/api/useCart';
import {
  useAddresses,
  useCheckout,
  useCreatePaymentSession,
  useOrder,
} from '@/hooks/api/useCommerce';
import { ERROR_CODES, isApiError } from '@/lib/api/errors';
import { useGuestCartStore, type GuestCartItem } from '@/lib/cart/guest-cart.store';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/money';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { useOtpModalStore } from '@/store/otp-modal.store';
import type { AddressDto } from '@/types/api';

/**
 * Cart and checkout, backed by the server-side cart.
 *
 * The three structural changes from the previous version:
 *
 * 1. No per-item selection. `POST /checkout` orders the ENTIRE cart — there is no partial-checkout
 *    parameter — so a UI implying "check out 2 of 5 items" would have charged for all five. That is
 *    a "charged for things I didn't select" bug, so the checkboxes are gone (plan §8.2).
 * 2. No payment step. There is no payment-intent endpoint; the only payment surface is a
 *    gateway->server HMAC webhook. The card number / CVV / UPI inputs posted nowhere and have been
 *    deleted outright rather than hidden behind a flag, because a card-shaped field in the DOM is a
 *    liability for any future PCI review (plan §8.3). What was the payment step is now an order
 *    review that calls POST /checkout; `paymentStatus` comes back on the order.
 * 3. Orders are not minted client-side. The old flow built `{ id: 'TRZ-' + Date.now(), ... }`
 *    locally, pushed it into a store and waited 700ms to fake latency.
 */

/* ------------------------------------------------------------------ the bag */

export function BagScreen() {
  const router = useRouter();
  const { cart, isLoading, isError, error, refetch } = useCart();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const authStatus = useAuthStore((state) => state.status);

  // Session restore is a network round trip, so "not logged in" is only meaningful once it settles.
  if (authStatus === 'idle' || authStatus === 'restoring') {
    return <CartScreenSkeleton />;
  }

  // Guests see their local bag instead of a login wall. Checkout still requires an account
  // (orders are user-owned server-side), so the CTA signs in first; the merge-on-login replays
  // these lines into the server cart and this same page then shows the merged result.
  if (!isLoggedIn) {
    return <GuestBagScreen />;
  }

  if (isLoading) {
    return <CartScreenSkeleton />;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <ErrorState error={error} title="We could not load your bag" onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState
          action="Start Shopping"
          href="/products"
          icon={AlertCircle}
          message="Your bag feels light. Browse verified staples and add a few favorites."
          title="Your bag is empty"
        />
      </div>
    );
  }

  // Out-of-stock lines block checkout: the server would reject the order with a 409, so it is
  // clearer to say so here than to let the user reach the last step and fail.
  const blockedItems = cart.items.filter((item) => !item.inStock);

  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="grid gap-4">
            <section className="rounded-2xl border border-surface-border bg-surface-base p-5 shadow-xs sm:p-6">
              <h1 className="text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
                {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} in your bag
              </h1>
            </section>

            {blockedItems.length ? (
              <p className="rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger">
                {blockedItems.length === 1 ? 'One item is' : `${blockedItems.length} items are`} out
                of stock. Remove {blockedItems.length === 1 ? 'it' : 'them'} to continue.
              </p>
            ) : null}

            <div className="grid gap-3">
              {cart.items.map((item) => (
                <BagItemRow key={item.id} item={item} />
              ))}
            </div>
          </main>

          <CheckoutPriceDetails
            ctaLabel="Continue"
            disabled={blockedItems.length > 0}
            helperText={
              blockedItems.length > 0 ? 'Remove out-of-stock items to continue.' : undefined
            }
            termsText="By continuing, you agree to Truzov's terms and verified marketplace policies."
            onCta={() => router.push('/checkout/address')}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- address step */

/**
 * The anonymous bag: localStorage lines with a display snapshot.
 *
 * Prices here are the snapshot's, not the server's — the login-time merge re-prices and
 * stock-checks every line through `POST /cart/items`, so what the user sees is an estimate and
 * the CTA deliberately says so rather than implying a total the server never confirmed.
 */
function GuestBagScreen() {
  const items = useGuestCartStore((state) => state.items);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);

  // Hydrate from localStorage once on the client; SSR renders an empty frame either way.
  useEffect(() => {
    useGuestCartStore.getState().hydrate();
  }, []);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState
          action="Start Shopping"
          href="/products"
          icon={AlertCircle}
          message="Your bag feels light. Browse verified staples and add a few favorites."
          title="Your bag is empty"
        />
      </div>
    );
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="grid gap-4">
            <section className="rounded-2xl border border-surface-border bg-surface-base p-5 shadow-xs sm:p-6">
              <h1 className="text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in your bag
              </h1>
            </section>

            <div className="grid gap-3">
              {items.map((item) => (
                <GuestBagItemRow key={`${item.productId}:${item.variantId ?? ''}`} item={item} />
              ))}
            </div>
          </main>

          <aside className="h-fit rounded-2xl border border-surface-border bg-surface-base p-5 shadow-xs sm:p-6 lg:sticky lg:top-6">
            <h2 className="text-xl font-medium tracking-tight text-[#04342c]">Price details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-sm leading-6 text-text-secondary">
                Prices shown are from when you added each item; the total is confirmed at
                sign-in.
              </p>
            </div>
            <Button
              className="mt-6 w-full"
              variant="primary"
              onClick={() => openAuthModal({ mode: 'login', redirectTo: '/cart' })}
            >
              Sign in to continue
            </Button>
            <p className="mt-3 text-center text-sm leading-6 text-text-secondary">
              Your bag is saved to this device and merges into your account when you sign in.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** A guest line: same layout as the server row, local mutations, no stock/line id. */
function GuestBagItemRow({ item }: { item: GuestCartItem }) {
  const setQuantity = useGuestCartStore((state) => state.setQuantity);
  const remove = useGuestCartStore((state) => state.remove);

  return (
    <article className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-2xl border border-surface-border bg-surface-base p-4 shadow-xs sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-5 sm:p-5">
      <Link
        className="relative aspect-[4/5] self-start overflow-hidden rounded-xl bg-surface-raised"
        href={`/products/${item.slug}`}
      >
        {item.imageUrl ? (
          <Image
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
          <Link className="text-base font-medium leading-snug hover:text-brand-primary sm:text-lg" href={`/products/${item.slug}`}>
            {item.name}
          </Link>
          <Button
            aria-label={`Remove ${item.name}`}
            size="icon"
            variant="ghost"
            onClick={() => remove(item.productId, item.variantId)}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-xl border border-surface-border bg-surface-raised">
            <Button
              aria-label="Decrease quantity"
              disabled={item.quantity <= 1}
              size="icon"
              variant="ghost"
              onClick={() => setQuantity(item.productId, item.variantId, item.quantity - 1)}
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-sm font-medium">Qty: {item.quantity}</span>
            <Button
              aria-label="Increase quantity"
              size="icon"
              variant="ghost"
              onClick={() => setQuantity(item.productId, item.variantId, item.quantity + 1)}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-text-secondary">
            {formatCurrency(item.unitPrice)} each
          </span>
        </div>

        {/* Local arithmetic on the snapshot price — the only total the guest flow can show. */}
        <div className="mt-4">
          <span className="text-lg font-medium tabular-nums">
            {formatCurrency(item.unitPrice * item.quantity)}
          </span>
        </div>

        <div className="mt-3">
          <button
            className="min-h-11 rounded-sm text-sm font-medium text-text-secondary hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            type="button"
            onClick={() => remove(item.productId, item.variantId)}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

export function AddressScreen() {
  const router = useRouter();
  const { cart, isLoading: cartLoading } = useCart();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const authStatus = useAuthStore((state) => state.status);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const setSelectedAddress = useCheckoutStore((state) => state.setSelectedAddress);
  const { addresses, defaultAddress, isLoading, isError, error, refetch } = useAddresses();
  const [modalOpen, setModalOpen] = useState(false);

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);

  useEffect(() => {
    if (authStatus === 'anonymous' && cart.items.length) {
      openAuthModal({ mode: 'login', redirectTo: '/checkout/address' });
    }
  }, [authStatus, cart.items.length, openAuthModal]);

  // Preselect the default. Re-runs if the list changes, e.g. right after adding the first address.
  useEffect(() => {
    if (!selectedAddress && defaultAddress) {
      setSelectedAddress(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddress, setSelectedAddress]);

  if (authStatus === 'idle' || authStatus === 'restoring' || cartLoading) {
    return <CartScreenSkeleton />;
  }

  if (!isLoggedIn) {
    return <BlockedCheckoutAuthState />;
  }

  if (!cart.items.length) {
    return <BlockedCheckoutEmptyState />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-secondary">Address</p>
            <h1 className="mt-2 text-2xl font-medium leading-tight tracking-tight sm:text-3xl">Select delivery address</h1>
          </div>
          {(isLoading || isError || addresses.length > 0) && (
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add new address
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
        ) : isError ? (
          <ErrorState
            error={error}
            title="We could not load your addresses"
            onRetry={() => void refetch()}
          />
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-border bg-surface-base p-6 text-center sm:p-8">
            <MapPin aria-hidden="true" className="mx-auto h-10 w-10 text-brand-primary" />
            <h2 className="mt-4 text-2xl font-medium tracking-tight">No saved addresses</h2>
            <p className="mt-2 text-text-secondary">
              Checkout needs a delivery address. Add one to continue.
            </p>
            <Button className="mt-5" onClick={() => setModalOpen(true)}>
              Add an address
            </Button>
          </div>
        ) : (
          <div aria-label="Delivery addresses" className="grid gap-3" role="radiogroup">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                inputId={`delivery-address-${address.id}`}
                inputName="delivery-address"
                selected={selectedAddressId === address.id}
                onSelect={() => setSelectedAddress(address.id)}
              />
            ))}
          </div>
        )}
      </main>

      <AddressFormModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="grid gap-4 lg:sticky lg:top-6 lg:self-start">
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

/* --------------------------------------------------------------- review step */

/**
 * Order review and placement.
 *
 * Route is still `/checkout/payment` so existing links and the stepper keep working, but there is
 * no payment selection here: the server has no payment endpoint, so the honest final step is
 * "confirm and place", after which `OrderDto.paymentStatus` reports what the gateway did.
 */
export function PaymentScreen() {
  const router = useRouter();
  const { cart, isLoading: cartLoading } = useCart();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const resetCheckout = useCheckoutStore((state) => state.resetCheckout);
  const openOtpModal = useOtpModalStore((state) => state.openOtpModal);
  const { addresses } = useAddresses();
  const placeOrder = useCheckout();
  const openPayment = useCreatePaymentSession();

  /**
   * One key per visit to this screen, so pressing "place order" twice — or a retry after a
   * timeout — replays the first order instead of creating a second. Deliberately NOT derived from
   * the address or the cart: two genuine orders to the same address must not share a key, or the
   * second would be answered with the first.
   *
   * Navigating away and back mints a new key, which is correct: that is a new intent.
   */
  const idempotencyKey = useMemo(
    () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    []
  );

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);

  if (authStatus === 'idle' || authStatus === 'restoring' || cartLoading) {
    return <CartScreenSkeleton />;
  }

  if (!isLoggedIn) {
    return <BlockedCheckoutAuthState />;
  }

  if (!cart.items.length) {
    return <BlockedCheckoutEmptyState />;
  }

  if (!selectedAddress) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-surface-border bg-surface-base p-6 text-center shadow-xs sm:p-8">
        <MapPin aria-hidden="true" className="mx-auto h-10 w-10 text-brand-primary" />
        <h1 className="mt-4 text-2xl font-medium leading-tight tracking-tight sm:text-3xl">Select an address first</h1>
        <p className="mt-2 text-text-secondary">
          Your order cannot be placed until a delivery address is selected.
        </p>
        <Button className="mt-5" onClick={() => router.push('/checkout/address')}>
          Go to address
        </Button>
      </div>
    );
  }

  /**
   * The documented precondition: checkout requires a VERIFIED phone. Checked here so the user is
   * told before they press the button — otherwise the API client's 403 handler bounces them to
   * a verification popup mid-action, which feels like a crash.
   */
  const phoneUnverified = user ? !user.phoneVerified : false;

  const submit = () => {
    placeOrder.mutate(
      { addressId: selectedAddress.id, idempotencyKey },
      {
        onSuccess: (order) => {
          resetCheckout();
          // Open the payment attempt, then hand the customer to the provider's page. Done here
          // rather than inside the checkout call because paying is a separate, retryable step:
          // the order exists either way, and holding checkout open across a gateway round trip
          // would keep the cart lock alive across a network call.
          openPayment.mutate(order.id, {
            onSuccess: (session) => {
              // Internal navigation rather than following session.payUrl. For the mock the two
              // are the same destination, and client-side routing keeps the React Query cache.
              // A genuinely external provider would need window.location.assign(session.payUrl);
              // there is no such provider yet, so that branch is not written.
              //
              // orderId travels in the query string because there is no GET endpoint for a
              // session. Tampering with it is harmless: the confirmation screen fetches the order
              // with the caller's own token, so someone else's id answers 403.
              router.push(
                `/pay/${encodeURIComponent(session.sessionId)}?orderId=${encodeURIComponent(order.id)}`
              );
            },
            onError: () => {
              // The order is placed and is not lost. Send the customer to the confirmation, which
              // shows it as unpaid and offers payment again, rather than leaving them on a screen
              // that looks like nothing happened.
              router.push(`/checkout/confirm?orderId=${encodeURIComponent(order.id)}`);
            },
          });
        },
      }
    );
  };

  const conflict =
    isApiError(placeOrder.error) && placeOrder.error.code === ERROR_CODES.CONFLICT;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <main className="grid gap-5">
        <section className="rounded-2xl border border-surface-border bg-surface-base p-5 shadow-xs sm:p-6">
          <h1 className="text-2xl font-medium leading-tight tracking-tight sm:text-3xl">Review your order</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Delivering to <strong>{selectedAddress.fullName ?? 'your saved address'}</strong>,{' '}
            {formatAddress(selectedAddress)}
          </p>
        </section>

        <section className="grid gap-3">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-surface-border bg-surface-base p-4 sm:p-5"
            >
              <div className="min-w-0">
                <p className="font-medium leading-snug">{item.name}</p>
                <p className="text-sm text-text-secondary">
                  {formatCurrency(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <span className="shrink-0 font-semibold">{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
        </section>

        {phoneUnverified ? (
          <div className="rounded-2xl border border-brand-accent bg-surface-base p-5 text-sm leading-6">
            <p className="font-semibold">Verify your phone number to place an order</p>
            <p className="mt-1 text-text-secondary">
              Orders require a verified phone number on your account.
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() => openOtpModal({ redirectTo: '/checkout/payment' })}
            >
              Verify now
            </Button>
          </div>
        ) : null}

        {placeOrder.isError ? (
          <InlineError
            error={placeOrder.error}
            // A 409 means the cart no longer supports the order (stock moved). Sending the user
            // back to the bag is more useful than a retry that would fail the same way.
            onRetry={conflict ? () => router.push('/cart') : () => submit()}
          />
        ) : null}

        <p className="text-sm leading-6 text-text-secondary">
          Payment is collected by our payment provider after the order is placed. Your order&apos;s
          payment status is shown on the order once confirmed.
        </p>
      </main>

      <CheckoutPriceDetails
        ctaLabel="Place order"
        disabled={phoneUnverified}
        loading={placeOrder.isPending}
        termsText="By placing the order, you agree to Truzov's Terms of Use and Privacy Policy."
        onCta={submit}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- confirmation */

export function ConfirmationScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';
  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const { addresses } = useAddresses();

  /**
   * `OrderDto` has NO address field (plan §T5), so the delivery block cannot come from the order.
   * The address the user selected is resolved from their saved list instead. It can be absent on a
   * later visit, which is why the whole block is conditional rather than assumed.
   */
  const address = addresses.find((entry) => entry.id === selectedAddressId);

  if (!orderId) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <EmptyState
          action="View your orders"
          href="/account/orders"
          icon={AlertCircle}
          message="We could not tell which order to show. Your orders page lists everything you have placed."
          title="Order reference missing"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <ErrorState
          error={error}
          title="We could not load your order"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl border border-surface-border bg-surface-base p-5 shadow-xs sm:p-8">
        <div className="border-b border-surface-border pb-6 text-center sm:pb-8">
          <ShieldCheck
            aria-hidden="true"
            className="mx-auto h-14 w-14 text-brand-primary sm:h-16 sm:w-16"
          />
          <h1 className="mt-4 text-2xl font-medium leading-tight tracking-tight text-brand-primary sm:text-3xl">
            Order confirmed
          </h1>
          <p className="mt-2 text-sm text-text-secondary sm:text-base">
            Order <strong className="font-mono">{order.orderNumber}</strong> has been placed.
          </p>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-[1fr_auto] sm:py-8">
          <div>
            {address ? (
              <>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-secondary">
                  Delivering to:
                </p>
                <div className="mt-3">
                  {address.fullName ? (
                    <p className="font-semibold text-text-primary">{address.fullName}</p>
                  ) : null}
                  {address.phone ? (
                    <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                      <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-primary" />
                      <span>{address.phone}</span>
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                    {formatAddress(address)}
                  </p>
                </div>
              </>
            ) : null}

            <Button
              className="mt-4 border-brand-primary text-brand-primary hover:bg-brand-light"
              size="sm"
              variant="outline"
              onClick={() => router.push(`/account/orders/${order.id}`)}
            >
              Order details
            </Button>
          </div>

          <div className="border-t border-surface-border pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-secondary">
              Order summary
            </p>
            <div className="mt-4 space-y-2">
              <SummaryLine label="Items" value={String(order.items.length)} />
              <SummaryLine label="Subtotal" value={formatCurrency(order.subtotal)} />
              <SummaryLine
                label="Delivery"
                value={order.deliveryFee === 0 ? 'Free' : formatCurrency(order.deliveryFee)}
              />
              <div className="flex justify-between border-t border-surface-border pt-2 text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <SummaryLine label="Status" value={order.status} />
              {/* Real payment status from the gateway webhook, replacing a hardcoded
                  "Confirmed" pill. */}
              <SummaryLine label="Payment" value={order.paymentStatus} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-surface-border pt-6">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-surface-border pt-6 sm:flex-row sm:justify-between">
          <Button className="flex-1" variant="outline" onClick={() => router.push('/')}>
            Continue shopping
          </Button>
          <Button className="flex-1" onClick={() => router.push(`/account/orders/${order.id}`)}>
            View order
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- pieces */

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-secondary">{label}:</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}

/** Joins the parts an address actually has — every field except `line1` is optional. */
export function formatAddress(address: AddressDto): string {
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
}

function AddressCard({
  address,
  inputId,
  inputName,
  selected,
  onSelect,
}: {
  address: AddressDto;
  inputId: string;
  inputName: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface-base p-5 shadow-xs transition focus-within:ring-2 focus-within:ring-brand-light',
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
      <label className="flex min-h-11 cursor-pointer items-start gap-4 rounded-xl text-left" htmlFor={inputId}>
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
            <strong className="font-medium">{address.fullName ?? 'Saved address'}</strong>
            {/* From AddressDto.label. The old card hardcoded a "Home" pill on every address. */}
            {address.label ? (
              <span className="rounded-full bg-brand-light px-2 py-1 text-xs font-medium text-brand-primary">
                {address.label}
              </span>
            ) : null}
          </div>

          <div className="mt-3 text-sm leading-6 text-text-secondary">{formatAddress(address)}</div>

          {address.phone ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
              <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-primary" />
              <span>{address.phone}</span>
            </div>
          ) : null}
        </div>
      </label>
      {/*
        Edit and Remove used to sit here. There is no address update or delete endpoint (plan §T6),
        and buttons that changed local state then reverted on reload looked like data loss.
      */}
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
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);

  return (
    <div className="mx-auto max-w-4xl py-10">
      <EmptyState
        action="Sign In"
        icon={ShieldCheck}
        message="Sign in to continue to secure checkout."
        title="Authentication required"
        // Modal, not a /login navigation: the user keeps their place in the flow
        // (and their guest bag, which merges on sign-in) instead of a page change.
        onAction={() => openAuthModal({ redirectTo: '/cart' })}
      />
    </div>
  );
}
