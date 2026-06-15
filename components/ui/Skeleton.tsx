import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-raised', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-md border border-surface-border bg-surface-base p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <Skeleton className="mt-4 h-9 w-full" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HomeScreenSkeleton() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-primary">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1fr_0.9fr] lg:py-20">
          <div>
            <Skeleton className="h-6 w-40 bg-brand-secondary/40" />
            <Skeleton className="mt-6 h-12 w-3/4 bg-brand-secondary/30" />
            <Skeleton className="mt-3 h-10 w-2/3 bg-brand-secondary/30" />
            <Skeleton className="mt-4 h-4 w-full max-w-lg bg-brand-secondary/20" />
            <Skeleton className="mt-2 h-4 w-3/4 max-w-lg bg-brand-secondary/20" />
            <div className="mt-8 flex gap-3">
              <Skeleton className="h-[52px] w-40 bg-brand-secondary/30" />
              <Skeleton className="h-[52px] w-44 bg-brand-secondary/20" />
            </div>
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-xl bg-brand-secondary/30" />
        </div>
      </section>
      {/* Trust strip */}
      <div className="border-y border-surface-border bg-surface-overlay">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-md border border-surface-border bg-surface-base p-3 text-center">
              <Skeleton className="mx-auto aspect-square w-24 rounded-md" />
              <Skeleton className="mx-auto mt-3 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>
      {/* Featured products */}
      <section className="bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-28" />
          </div>
          <ProductGridSkeleton count={4} />
        </div>
      </section>
      {/* Reviews */}
      <section className="bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Skeleton className="mb-6 h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-md border border-surface-border bg-surface-base p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-5/6" />
                <Skeleton className="mt-4 h-5 w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function ProductListingScreenSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filter sidebar */}
        <div className="hidden rounded-lg border border-surface-border bg-surface-base p-4 lg:block">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="mt-5 grid gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20" />
                <div className="mt-3 grid gap-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}

export function ProductDetailScreenSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-6 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[5fr_4fr_3fr] lg:items-start">
        {/* Image gallery */}
        <div className="grid gap-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        {/* Product info */}
        <div className="grid gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="flex gap-8 border-b border-surface-border pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24" />
            ))}
          </div>
          <div className="grid gap-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
        {/* Purchase aside */}
        <div className="grid gap-4">
          <div className="rounded-xl border border-surface-border bg-surface-base p-6">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="mt-2 h-4 w-36" />
            <Skeleton className="mt-5 h-4 w-20" />
            <Skeleton className="mt-2 h-10 w-32 rounded-lg" />
            <div className="mt-6 grid gap-3">
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="h-12 w-full rounded-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            </div>
            <div className="mt-6 grid gap-4 border-t border-surface-border pt-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function CartScreenSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <section>
        <Skeleton className="mb-6 h-10 w-56" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-lg border border-surface-border bg-surface-base p-4">
              <Skeleton className="h-24 w-24 shrink-0 rounded-md" />
              <div className="flex-1 grid gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="rounded-lg border border-surface-border bg-surface-base p-5 h-fit">
        <Skeleton className="h-6 w-36 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
        <Skeleton className="mt-4 h-12 w-full rounded-md" />
      </div>
    </div>
  );
}

export function AccountScreenSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="h-10 w-48 mb-6" />
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr]">
        <div className="rounded-lg border border-surface-border bg-surface-base p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-6 h-8 w-36" />
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersScreenSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="h-10 w-40 mb-6" />
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <div className="flex justify-between gap-3">
              <div>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-2 h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderDetailScreenSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-10 w-48 mb-6" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-lg border border-surface-border bg-surface-base p-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-md" />
              <div className="flex-1 grid gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-surface-border bg-surface-base p-5">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-base p-5 h-fit">
          <Skeleton className="h-6 w-20 mb-4" />
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-4 w-48" />
          <Skeleton className="mt-4 h-8 w-28" />
          <Skeleton className="mt-5 h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function AddressesScreenSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-10 w-48 mb-6" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <Skeleton className="h-5 w-5 mb-3" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LabReportsScreenSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Skeleton className="h-12 w-48 mb-3" />
      <Skeleton className="h-4 w-72 mb-8" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-2 h-4 w-36" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between rounded-md bg-surface-raised p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustScreenSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Skeleton className="h-12 w-3/4 max-w-xl mb-4" />
      <Skeleton className="h-4 w-full max-w-2xl mb-2" />
      <Skeleton className="h-4 w-3/4 max-w-2xl mb-10" />
      <div className="grid gap-5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <Skeleton className="h-8 w-8 mb-4" />
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardScreenSkeleton() {
  return (
    <div className="p-6">
      {/* Stat cards */}
      <div className="grid gap-5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      {/* Chart + panel */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="h-80 rounded-lg border border-surface-border bg-surface-base p-5">
          <Skeleton className="h-7 w-36 mb-4" />
          <Skeleton className="h-full w-full rounded-md" />
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-base p-5">
          <Skeleton className="h-7 w-40 mb-4" />
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-base overflow-hidden">
      {/* Header */}
      <div className="grid border-b border-surface-border bg-surface-raised p-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-3/4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid border-b border-surface-border p-4 last:border-0" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-2/3" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CheckoutScreenSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-surface-border bg-surface-base p-6">
        {/* Stepper */}
        <div className="flex items-center gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
              {i < 2 && <Skeleton className="h-px w-8" />}
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-64 mb-5" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="mt-6 h-12 w-48 rounded-md" />
      </div>
      {/* Order summary */}
      <div className="rounded-lg border border-surface-border bg-surface-base p-5 h-fit">
        <Skeleton className="h-6 w-36 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 mb-3">
            <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
          </div>
        ))}
        <div className="border-t border-surface-border pt-4 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between py-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
