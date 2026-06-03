'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const steps = [
  { label: 'Bag', href: '/cart' },
  { label: 'Address', href: '/checkout/address' },
  { label: 'Payment', href: '/checkout/payment' },
] as const;

function inferActive(pathname: string) {
  if (pathname.startsWith('/checkout/payment')) return 2;
  if (pathname.startsWith('/checkout/address')) return 1;
  return 0;
}

export function CheckoutProgress({ active }: { active?: number }) {
  const pathname = usePathname();
  const current = active ?? inferActive(pathname);

  return (
    <div className="flex w-full items-center justify-center">
      <ol aria-label="Checkout progress" className="flex w-full max-w-md items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-text-muted sm:text-sm">
        {steps.map((step, index) => {
          const complete = index < current;
          const activeStep = index === current;
          const canNavigate = index <= current;
          const content = (
            <span
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent py-1',
                activeStep && 'border-brand-primary text-brand-primary',
                complete && 'text-text-secondary'
              )}
            >
              {complete ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : null}
              {step.label}
            </span>
          );

          return (
            <li key={step.label} className="flex min-w-0 items-center gap-2">
              {canNavigate ? <Link href={step.href}>{content}</Link> : content}
              {index < steps.length - 1 ? <span className="h-px w-8 bg-surface-borderStrong sm:w-14" /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SecureCheckoutMark() {
  return (
    <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.32em] text-text-secondary sm:flex">
      <ShieldCheck aria-hidden="true" className="h-8 w-8 fill-brand-primary text-brand-primary" />
      100% Secure
    </div>
  );
}
