'use client';

import { cn } from '@/lib/utils/cn';
import type { ProductVariantDto } from '@/types/api';

/**
 * Size / variant selector rendered as a dropdown on the product card.
 *
 * Same contract as VariantPills (`variants` / `selectedId` / `onSelect`) so it is a drop-in on
 * the listing grid, but presented as a single rounded <select> — the selected size is shown and
 * the rest appear on open, matching the shop's card design. The detail page keeps VariantPills.
 *
 * `inStock === false` disables that option; an absent flag counts as available, so a listing
 * response that omits the flag does not disable everything. A native <select> gives keyboard and
 * assistive-tech support for free, so there is no open-state, click-outside or focus bookkeeping.
 */
export function VariantSelect({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariantDto[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const label = variants[0]?.label ?? 'option';

  return (
    <select
      aria-label={`Select ${label}`}
      className={cn(
        'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2',
        'text-sm font-medium text-on-surface shadow-xs transition-colors',
        'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
      )}
      onChange={(event) => onSelect(event.target.value)}
      value={selectedId ?? ''}
    >
      {variants.map((variant) => (
        <option key={variant.id} disabled={variant.inStock === false} value={variant.id}>
          {variant.value}
          {variant.inStock === false ? ' (unavailable)' : ''}
        </option>
      ))}
    </select>
  );
}