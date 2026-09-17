import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type = 'text', ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = error ? `${inputId}-error` : undefined;
    const isPassword = type === 'password';
    const [revealed, setRevealed] = useState(false);

    const inputClassName = cn(
      'h-11 rounded-sm border border-surface-border bg-surface-base px-3 text-base text-text-primary shadow-xs outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-light',
      error && 'border-text-danger focus:border-text-danger focus:ring-status-dangerBg',
      className
    );

    return (
      <label className="grid gap-1.5 text-sm font-medium text-text-secondary" htmlFor={inputId}>
        {label}
        {isPassword ? (
          <div className="relative grid">
            <input
              id={inputId}
              ref={ref}
              type={revealed ? 'text' : 'password'}
              aria-describedby={errorId}
              aria-invalid={Boolean(error)}
              className={cn(inputClassName, 'pr-11')}
              {...props}
            />
            <button
              type="button"
              aria-label={revealed ? 'Hide password' : 'Show password'}
              aria-pressed={revealed}
              // preventDefault keeps the click from blurring the field before it toggles.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setRevealed((current) => !current)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-text-secondary transition hover:text-text-primary"
            >
              {revealed ? (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : (
          <input
            id={inputId}
            ref={ref}
            type={type}
            aria-describedby={errorId}
            aria-invalid={Boolean(error)}
            className={inputClassName}
            {...props}
          />
        )}
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
