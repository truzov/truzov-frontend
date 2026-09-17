'use client';

import { AlertCircle, FlaskConical, LogIn, ShieldOff } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, InlineError } from '@/components/ui/ErrorState';
import { CartScreenSkeleton } from '@/components/ui/Skeleton';
import { useCompleteMockPayment, useOrder } from '@/hooks/api/useCommerce';
import { formatCurrency } from '@/lib/utils/money';
import { useAuthModalStore } from '@/store/auth-modal.store';
import { useAuthStore } from '@/store/auth.store';

/**
 * The mock gateway's payment page.
 *
 * <p>Stands in for a hosted checkout while no real gateway is connected. Two things about it are
 * deliberate and should survive future edits:
 *
 * 1. There are NO card, CVV, expiry or UPI inputs, and none should ever be added. Card-shaped
 *    fields were removed from this app on purpose: collecting them puts the whole frontend in PCI
 *    scope, and a real gateway collects them on its own page precisely so this one never does.
 *    A test screen that grows a fake card form is how that boundary quietly gets crossed.
 *
 * 2. Nothing here decides whether the order is paid. Both buttons call the mock provider's
 *    settle endpoint, which runs the SAME conditional order transition a captured webhook
 *    event runs; the confirmation screen then re-reads the order. This screen never guesses,
 *    which is why it navigates away instead of rendering a success message of its own.
 */
export function MockPaymentScreen() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = params?.sessionId ?? '';
  const orderId = searchParams.get('orderId') ?? '';

  const authStatus = useAuthStore((state) => state.status);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);

  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId);
  const complete = useCompleteMockPayment();

  if (authStatus === 'idle' || authStatus === 'restoring') {
    return <CartScreenSkeleton />;
  }

  if (!isLoggedIn) {
    return (
      <EmptyState
        action="Sign in"
        icon={LogIn}
        message="Sign in to complete this payment. The order is already placed and is not lost."
        title="You are signed out"
        // Modal so the user stays on this payment page: signing in re-renders it
        // authenticated, with the session id still in the URL.
        onAction={() => openAuthModal()}
      />
    );
  }

  // Without an order reference there is nothing to pay for and nowhere to return to. Better to say
  // so than to render buttons that cannot work.
  if (!orderId) {
    return (
      <EmptyState
        action="Go to your orders"
        href="/account/orders"
        icon={AlertCircle}
        message="This payment link is missing its order reference. Open it from your order instead."
        title="Incomplete payment link"
      />
    );
  }

  if (isLoading) {
    return <CartScreenSkeleton />;
  }

  if (isError || !order) {
    return (
      <ErrorState
        error={error}
        onRetry={() => void refetch()}
        title="We could not load the order this payment belongs to"
      />
    );
  }

  const settle = (outcome: 'success' | 'failure') => {
    complete.mutate(
      { sessionId, orderId, outcome },
      {
        // Both outcomes go to the confirmation, which reports the real payment status rather than
        // this screen's expectation of it. A failed payment therefore shows the order as unpaid,
        // which is the truth, instead of an error page that hides the fact the order exists.
        onSuccess: () => {
          router.push(`/checkout/confirm?orderId=${encodeURIComponent(orderId)}`);
        },
      }
    );
  };

  const alreadySettled = order.paymentStatus !== 'unpaid';

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-md border-2 border-dashed border-amber-500 bg-amber-50 p-4 text-amber-900">
        <p className="flex items-center gap-2 font-heading text-lg">
          <FlaskConical aria-hidden="true" className="h-5 w-5" />
          Test Mode — Simulate Payment
        </p>
        <p className="mt-1 text-sm">
          No real payment is taken and no money moves. This page exists only until a real payment
          provider is connected.
        </p>
      </div>

      <section className="mt-6 rounded-md border border-surface-border bg-surface-base p-5 shadow-xs">
        <h1 className="font-heading text-2xl">Pay for order {order.orderNumber}</h1>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-text-secondary">Amount due</dt>
            <dd className="font-heading text-2xl">{formatCurrency(order.totalAmount)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-secondary">Current payment status</dt>
            <dd>
              <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'info'}>
                {order.paymentStatus}
              </Badge>
            </dd>
          </div>
        </dl>

        <p className="mt-4 flex items-start gap-2 text-sm text-text-secondary">
          <ShieldOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No card, UPI or bank details are asked for here, and none should ever be entered. A real
            provider collects those on its own page.
          </span>
        </p>

        {alreadySettled ? (
          <div className="mt-5">
            <p className="text-sm text-text-secondary">
              This order is already <strong>{order.paymentStatus}</strong>, so there is nothing left
              to pay.
            </p>
            <Button
              className="mt-3"
              onClick={() =>
                router.push(`/checkout/confirm?orderId=${encodeURIComponent(orderId)}`)
              }
            >
              View order
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              data-testid="simulate-payment-success"
              disabled={complete.isPending}
              onClick={() => settle('success')}
            >
              {complete.isPending ? 'Working…' : 'Simulate Success'}
            </Button>
            <Button
              data-testid="simulate-payment-failure"
              disabled={complete.isPending}
              onClick={() => settle('failure')}
              variant="secondary"
            >
              Simulate Failure
            </Button>
          </div>
        )}

        {complete.isError ? (
          <div className="mt-4">
            <InlineError error={complete.error} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
