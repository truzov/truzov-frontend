'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils/cn';
import { Button } from './Button';

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
  bodyClassName,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  bodyClassName?: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(modalRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={modalRef}
        className={cn(
          'flex max-h-[calc(100dvh-24px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-base shadow-md sm:max-h-[calc(100dvh-32px)]',
          className
        )}
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-5 py-4 sm:px-6">
          <h2 id={titleId} className="min-w-0 break-words font-heading text-2xl">
            {title}
          </h2>
          <Button
            aria-label="Close modal"
            className="h-11 w-11 shrink-0"
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
        <div className={cn('min-h-0 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
