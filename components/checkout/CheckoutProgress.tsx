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
  const isConfirmation = current === 3;

  return (
    <div className="flex w-full items-center justify-center">
      <ol aria-label="Checkout progress" className="flex w-full max-w-md items-center justify-center gap-2 text-sm font-medium text-[#547064]">
        {steps.map((step, index) => {
          const complete = index < current;
          const activeStep = index === current && !isConfirmation;
          const canNavigate = index <= current && !isConfirmation;
          const content = (
            <span
              className={cn(
                'inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-1',
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
              {canNavigate ? <Link aria-current={activeStep ? 'step' : undefined} className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#04342c]" href={step.href}>{content}</Link> : content}
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
    <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-[#547064] sm:text-sm">
      <ShieldCheck aria-hidden="true" className="h-5 w-5 text-[#04342c] sm:h-6 sm:w-6" />
      secure checkout
    </div>
  );
}
