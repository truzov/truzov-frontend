'use client';

import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils/cn';

export function Drawer({
  open,
  title,
  children,
  onClose,
  side = 'right',
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  side?: 'right' | 'bottom';
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" role="dialog" aria-modal="true">
      <div
        className={cn(
          'fixed bg-surface-base shadow-md',
          side === 'right'
            ? 'bottom-0 right-0 top-0 w-full max-w-md'
            : 'bottom-0 left-0 right-0 max-h-[88vh] rounded-t-xl'
        )}
      >
        <div className="flex items-center justify-between border-b border-surface-border p-4">
          <h2 className="font-heading text-2xl">{title}</h2>
          <Button aria-label="Close drawer" size="icon" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
