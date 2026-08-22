import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <label className="grid gap-1.5 text-sm font-medium text-text-secondary" htmlFor={inputId}>
        {label}
        <input
          id={inputId}
          ref={ref}
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-11 rounded-sm border border-surface-border bg-surface-base px-3 text-base text-text-primary shadow-xs outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-light',
            error && 'border-text-danger focus:border-text-danger focus:ring-status-dangerBg',
            className
          )}
          {...props}
        />
        <span
          id={errorId}
          className={cn('min-h-4 text-xs font-medium text-text-danger', !error && 'invisible')}
          aria-live="polite"
        >
          {error ?? ''}
        </span>
      </label>
    );
  }
);

Input.displayName = 'Input';
