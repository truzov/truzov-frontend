import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  href,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action: string;
  href: string;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-surface-border bg-surface-raised p-10 text-center">
      <Icon aria-hidden="true" className="mb-4 h-12 w-12 text-brand-primary" />
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-text-secondary">{message}</p>
      <Link
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-text-inverse transition-colors hover:bg-brand-secondary"
        href={href}
      >
        {action}
      </Link>
    </div>
  );
}
