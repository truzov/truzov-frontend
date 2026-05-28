import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Stepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((step, index) => {
        const complete = index < active;
        const current = index === active;

        return (
          <li key={step} className="flex flex-1 items-center gap-3">
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold',
                complete || current
                  ? 'border-brand-primary bg-brand-primary text-text-inverse'
                  : 'border-surface-borderStrong bg-surface-base text-text-muted'
              )}
            >
              {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
            </span>
            <span className={cn('hidden text-sm font-semibold sm:block', current ? 'text-brand-primary' : 'text-text-secondary')}>
              {step}
            </span>
            {index < steps.length - 1 ? <span className="h-px flex-1 bg-surface-border" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
