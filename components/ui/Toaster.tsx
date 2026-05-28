'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useUiStore, type ToastType } from '@/store/ui.store';
import { Button } from './Button';

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) => window.setTimeout(() => removeToast(toast.id), 3000));
    return () => timers.forEach(window.clearTimeout);
  }, [removeToast, toasts]);

  return (
    <div className="fixed right-4 top-4 z-[60] grid w-[calc(100%-2rem)] max-w-sm gap-3 sm:right-6">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];

        return (
          <div
            key={toast.id}
            className="rounded-md border border-surface-border bg-surface-base p-4 shadow-md"
          >
            <div className="flex gap-3">
              <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 text-brand-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{toast.title}</p>
                {toast.message ? <p className="text-sm text-text-secondary">{toast.message}</p> : null}
                {toast.actionHref && toast.actionLabel ? (
                  <Link className="mt-2 inline-block text-sm font-semibold text-brand-primary" href={toast.actionHref}>
                    {toast.actionLabel}
                  </Link>
                ) : null}
              </div>
              <Button
                aria-label="Dismiss notification"
                className="h-7 w-7"
                size="icon"
                variant="ghost"
                onClick={() => removeToast(toast.id)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
