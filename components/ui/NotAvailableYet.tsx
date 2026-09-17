import { Construction } from 'lucide-react';
import Link from 'next/link';

/**
 * Shown in place of a screen whose data has no backend endpoint yet.
 *
 * Why this exists rather than leaving the fixture version live: a demo vendor, order or user
 * record that a real user can reach WILL eventually be mistaken for real data, and that is a
 * trust problem rather than a cosmetic one. Someone acts on an invented payout figure, or reports
 * a customer record that does not exist. An explicit "not available" is honest and cheap; plausible
 * fake data is neither.
 *
 * `endpoint` names the missing capability so the reader knows what has to exist for this screen
 * to come back, and `ticket` points at the entry in FRONTEND_API_MIGRATION_PLAN.md §6.
 */
export function NotAvailableYet({
  title,
  needs,
  ticket = '§6',
  backHref,
  backLabel = 'Back to dashboard',
}: {
  title: string;
  /** Plain-language description of the missing endpoint(s). */
  needs: string;
  ticket?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div
      className="grid place-items-center rounded-lg border border-dashed border-surface-border bg-surface-raised p-10 text-center"
      role="status"
    >
      <Construction aria-hidden="true" className="mb-4 h-12 w-12 text-text-muted" />
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mt-2 max-w-lg text-text-secondary">
        This screen is not available yet because the backend does not expose the data it needs.
      </p>
      <p className="mt-3 max-w-lg text-sm text-text-secondary">
        <span className="font-semibold">Waiting on:</span> {needs}
      </p>
      <p className="mt-3 font-mono text-xs text-text-muted">
        Tracked in FRONTEND_API_MIGRATION_PLAN.md {ticket}
      </p>
      {backHref ? (
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-text-inverse transition-colors hover:bg-brand-secondary"
          href={backHref}
        >
          {backLabel}
        </Link>
      ) : null}
    </div>
  );
}
