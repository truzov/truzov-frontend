'use client';

import { X } from 'lucide-react';
import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from './Button';

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-lg bg-surface-base p-6 shadow-md"
        tabIndex={-1}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-title" className="font-heading text-2xl">
            {title}
          </h2>
          <Button aria-label="Close modal" size="icon" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
