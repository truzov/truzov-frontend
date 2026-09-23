'use client';

import { cn } from '@/lib/utils/cn';
import type { ProductVariantDto } from '@/types/api';

/**
 * The one variant control, shared by `ProductCard` and `ProductDetailScreen`.
 *
 * It exists only because the two surfaces must look identical; the classes here are the
 * extraction of the pill row that already lived inline on the product detail page, not a
 * redesign. Deliberately not a dropdown: every variant is always visible, so there is no open
 * state, no click-outside listener and no focus management. Native buttons give Tab to move and
 * Enter/Space to select, which is the whole of the keyboard requirement.
 *
 * `inStock === false` means unavailable; an absent flag means available, so a listing response
 * that omits the flag does not disable every pill. An out-of-stock pill is `disabled`, so it
 * cannot fire `onSelect` — "activating it changes nothing" holds by construction, with no guard.
 */
export function VariantPills({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariantDto[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      aria-label={`Select ${variants[0]?.label ?? 'option'}`}
      className="flex flex-wrap gap-2"
      role="group"
    >
      {variants.map((variant) => {
        const unavailable = variant.inStock === false;
        return (
          <button
            key={variant.id}
            aria-pressed={variant.id === selectedId}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition',
              variant.id === selectedId
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-outline-variant hover:border-primary/50',
              unavailable && 'line-through opacity-50'
            )}
            disabled={unavailable}
            onClick={() => onSelect(variant.id)}
            title={unavailable ? 'Unavailable' : undefined}
            type="button"
          >
            {variant.value}
          </button>
        );
      })}
    </div>
  );
}
