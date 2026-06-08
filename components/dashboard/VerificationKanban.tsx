'use client';

import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type { VerificationStatus, VerificationSubmission } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { verificationColumns, verificationLabels } from '@/lib/utils/verification';

export function VerificationKanban({ submissions }: { submissions: VerificationSubmission[] }) {
  const [items, setItems] = useState(submissions);

  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over) {
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === event.active.id ? { ...item, status: event.over?.id as VerificationStatus } : item
      )
    );
  };

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 overflow-x-auto lg:grid-cols-6">
        {verificationColumns.map((status) => {
          const columnItems = items.filter((item) => item.status === status);

          return (
            <div
              key={status}
              id={status}
              className="min-h-[360px] min-w-[240px] rounded-lg border border-surface-border bg-surface-base p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{verificationLabels[status]}</h2>
                <Badge variant={status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'info'}>
                  {columnItems.length}
                </Badge>
              </div>
              <div className="grid gap-3">
                {columnItems.length === 0 ? (
                  <p className="rounded-md border border-dashed border-surface-border p-4 text-sm text-text-muted">
                    No items in this stage
                  </p>
                ) : (
                  columnItems.map((item) => <VerificationCard key={item.id} item={item} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}

function VerificationCard({ item }: { item: VerificationSubmission }) {
  return (
    <article className="rounded-md border border-surface-border bg-surface-raised p-3 shadow-xs">
      <div className="relative mb-3 aspect-video overflow-hidden rounded-md bg-surface-overlay">
        <Image
          alt={item.productName}
          className="object-cover"
          fill
          sizes="200px"
          src={item.thumbnail}
        />
      </div>
      <div className="flex items-start gap-2">
        <ShieldCheck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-primary" />
        <div>
          <h3 className="text-sm font-semibold">{item.productName}</h3>
          <p className="text-xs text-text-secondary">{item.vendorName}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-muted">Lab: {item.labPartner}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline">
          View Report
        </Button>
        <Button size="sm">Approve</Button>
      </div>
    </article>
  );
}
