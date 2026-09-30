import { cn } from '@/lib/utils/cn';

const styles = {
  organic: 'bg-brand-light text-brand-primary',
  sale: 'bg-brand-accentLight text-brand-accent',
  new: 'bg-status-infoBg text-brand-primary',
  bestseller: 'bg-status-warningBg text-text-warning',
  lowstock: 'bg-status-warningBg text-text-warning',
  outofstock: 'bg-surface-overlay text-text-muted',
  info: 'bg-status-infoBg text-brand-primary',
  success: 'bg-status-successBg text-text-success',
  danger: 'bg-status-dangerBg text-text-danger',
};

export type BadgeVariant = keyof typeof styles;

export function Badge({
  children,
  variant = 'info',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'ui-badge inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-semibold uppercase tracking-normal',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
