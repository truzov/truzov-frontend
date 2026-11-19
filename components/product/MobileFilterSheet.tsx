'use client';

import { ArrowDownUp, Check, SlidersHorizontal, X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import type { ProductFilterState } from '@/lib/utils/filters';

export type MobileFilterGroupKey = 'category' | 'brand' | 'price' | 'rating' | 'discount' | 'availability';

interface MobileFilterGroup {
  key: MobileFilterGroupKey;
  label: string;
  count?: (draft: ProductFilterState) => number;
}

function CatalogDialog({ children, label, onClose, sheet = false }: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  sheet?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);

  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    const desktop = matchMedia('(min-width: 1024px)');
    if (desktop.matches) {
      closeRef.current();
      return;
    }

    const dialog = dialogRef.current!;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const onResize = () => { if (desktop.matches) closeRef.current(); };
    root.style.overflow = 'hidden';
    dialog.showModal();
    desktop.addEventListener('change', onResize);

    const animation = sheet && !matchMedia('(prefers-reduced-motion: reduce)').matches
      ? dialog.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' })
      : undefined;

    return () => {
      animation?.cancel();
      desktop.removeEventListener('change', onResize);
      root.style.overflow = previousOverflow;
      dialog.close();
    };
  }, [sheet]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      className={cn(
        'fixed m-0 w-full max-w-none overscroll-contain border-0 bg-surface-base p-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] text-text-primary backdrop:bg-black/45',
        sheet
          ? 'inset-x-0 bottom-0 top-auto max-h-[58dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]'
          : 'inset-0 h-dvh max-h-none overflow-hidden'
      )}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (sheet && event.target === event.currentTarget) onClose(); }}
    >
      {children}
    </dialog>
  );
}

interface MobileFilterSheetProps {
  open: boolean;
  filters: ProductFilterState;
  groups: readonly MobileFilterGroup[];
  onClose: () => void;
  onApply: (draft: ProductFilterState) => void;
  renderControls: (draft: ProductFilterState, setDraft: (next: ProductFilterState) => void, group: MobileFilterGroupKey) => ReactNode;
}

export function MobileFilterSheet(props: MobileFilterSheetProps) {
  return props.open ? <MobileFilterPage {...props} /> : null;
}

function MobileFilterPage({ filters, groups, onClose, onApply, renderControls }: MobileFilterSheetProps) {
  const [draft, setDraft] = useState(filters);
  const [group, setGroup] = useState<MobileFilterGroupKey>(groups[0]?.key ?? 'category');

  return (
    <CatalogDialog label="Filters" onClose={onClose}>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="flex items-center justify-between gap-4 border-b border-surface-border px-4 pt-[env(safe-area-inset-top)]">
          <h2 className="py-4 text-base font-semibold uppercase tracking-wide">Filters</h2>
          <button
            className="min-h-11 px-2 text-sm font-semibold uppercase text-brand-primary"
            type="button"
            onClick={() => setDraft({ query: filters.query, sort: filters.sort })}
          >
            Clear all
          </button>
        </header>
        <div className="grid min-h-0 grid-cols-[minmax(7rem,35%)_minmax(0,1fr)]">
          <nav aria-label="Filter groups" className="overflow-y-auto overscroll-contain border-r border-surface-border bg-surface-raised">
            {groups.map(({ key, label, count }) => {
              const selectedCount = count?.(draft) ?? 0;
              return (
                <button
                  key={key}
                  aria-pressed={key === group}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between gap-1 border-b border-surface-border px-3 py-2 text-left text-sm',
                    key === group && 'bg-surface-base font-semibold text-brand-primary'
                  )}
                  type="button"
                  onClick={() => setGroup(key)}
                >
                  {label}
                  {selectedCount > 0 && <span className="rounded-full bg-brand-light px-1.5 text-xs font-semibold text-brand-primary">{selectedCount}</span>}
                </button>
              );
            })}
          </nav>
          <div key={group} className="min-w-0 overflow-y-auto overscroll-contain p-4">
            {renderControls(draft, setDraft, group)}
          </div>
        </div>
        <footer className="grid grid-cols-2 gap-3 border-t border-surface-border bg-surface-base p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button className="min-h-11 uppercase" type="button" variant="outline" onClick={onClose}>Close</Button>
          <Button className="min-h-11 uppercase" type="button" onClick={() => { onApply(draft); onClose(); }}>Apply</Button>
        </footer>
      </div>
    </CatalogDialog>
  );
}

export function MobileCatalogControls({ filters, filterCount, sortOptions, onChange, onOpenFilters }: {
  filters: ProductFilterState;
  filterCount: number;
  sortOptions: readonly (readonly [string, string])[];
  onChange: (patch: Partial<ProductFilterState>) => void;
  onOpenFilters: () => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const filterDescriptionId = useId();
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const close = () => { dragStart.current = null; setSortOpen(false); };
  const selected = filters.sort ?? 'relevance';
  const controlClassName = 'flex min-h-14 min-w-0 items-center justify-center gap-1 px-1.5 text-xs font-semibold uppercase text-brand-primary';

  return (
    <>
      <div
        aria-label="Product list controls"
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-2 divide-x divide-surface-border border-y border-surface-border bg-surface-base pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden"
        role="group"
      >
        <button aria-haspopup="dialog" aria-expanded={sortOpen} className={controlClassName} type="button" onClick={() => setSortOpen(true)}>
          <ArrowDownUp aria-hidden="true" className="h-4 w-4" /> Sort
        </button>
        <button aria-haspopup="dialog" aria-describedby={filterCount ? filterDescriptionId : undefined} className={controlClassName} type="button" onClick={onOpenFilters}>
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> Filter
          {filterCount > 0 && <span aria-hidden="true" className="rounded-full bg-brand-light px-1.5 text-brand-primary">{filterCount}</span>}
        </button>
      </div>
      {filterCount > 0 && <span hidden id={filterDescriptionId}>{filterCount} active filters</span>}

      {sortOpen && (
        <CatalogDialog label="Sort by" onClose={close} sheet>
          <div className="sticky top-0 z-10 bg-surface-base">
            <div
              className="grid h-8 touch-none place-items-center"
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0) return;
                dragStart.current = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerCancel={() => { dragStart.current = null; }}
              onPointerUp={(event) => {
                const start = dragStart.current;
                dragStart.current = null;
                if (start && event.clientY - start.y > Math.max(50, Math.abs(event.clientX - start.x))) close();
              }}
            >
              <span aria-hidden="true" className="h-1 w-10 rounded-full bg-surface-borderStrong" />
            </div>
            <header className="flex items-center justify-between border-b border-surface-border px-4">
              <h2 className="text-base font-semibold uppercase tracking-wide">Sort by</h2>
              <Button aria-label="Close sort by" className="h-11 w-11" size="icon" type="button" variant="ghost" onClick={close}>
                <X aria-hidden="true" className="h-5 w-5" />
              </Button>
            </header>
          </div>
          <div className="divide-y divide-surface-border px-4">
            {sortOptions.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={value === selected}
                className={cn('flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm', value === selected && 'font-semibold text-brand-primary')}
                type="button"
                onClick={() => {
                  onChange({ sort: value });
                  close();
                }}
              >
                {label}
                {value === selected && <Check aria-hidden="true" className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </CatalogDialog>
      )}
    </>
  );
}
