'use client';

import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { filtersToSearchParams, type ProductFilterState } from '@/lib/utils/filters';

/**
 * Bottom sheet for filters on small/medium screens (`lg:hidden` at the call site).
 *
 * Selections here only mutate a local draft — nothing is applied until "Apply" is tapped, which
 * is the behaviour the mobile "Filters" control was missing entirely (it used to be a `<Link>`
 * to a single hardcoded filter value that navigated immediately). "Cancel"/backdrop/Escape
 * discard the draft and leave the current results untouched.
 *
 * `renderControls` receives the draft and a setter rather than this component owning the
 * control markup, so it can render the exact same `FilterPanel` desktop uses (in its
 * controlled/draft mode) without duplicating category/labVerified/sort UI.
 */
export function MobileFilterSheet({
  open,
  filters,
  onClose,
  renderControls,
}: {
  open: boolean;
  filters: ProductFilterState;
  onClose: () => void;
  renderControls: (draft: ProductFilterState, setDraft: (next: ProductFilterState) => void) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ProductFilterState>(filters);

  useFocusTrap(sheetRef, open, onClose);

  if (!open) {
    return null;
  }

  const apply = () => {
    const search = filtersToSearchParams(draft);

    // Same reattachment as FilterPanel.commit: filtersToSearchParams excludes `q` on purpose.
    if (filters.query) {
      search.set('q', filters.query);
    }

    router.push(`${pathname}?${search.toString()}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
      <button
        aria-label="Close filters"
        className="absolute inset-0 bg-black/40"
        type="button"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        aria-label="Filters"
        aria-modal="true"
        className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface-base p-4 shadow-md"
        role="dialog"
        tabIndex={-1}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl">Filters</h2>
          <Button aria-label="Close filters" size="icon" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>

        {renderControls(draft, setDraft)}

        <div className="sticky bottom-0 mt-6 flex gap-3 border-t border-surface-border bg-surface-base pt-4">
          <Button className="flex-1" variant="outline" onClick={() => setDraft({ sort: draft.sort })}>
            Clear
          </Button>
          <Button className="flex-1" onClick={apply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
