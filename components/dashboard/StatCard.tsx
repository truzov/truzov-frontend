import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-base p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-light text-brand-primary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-text-success">{delta}</p>
    </div>
  );
}
