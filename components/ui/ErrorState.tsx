'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { errorMessage, isApiError } from '@/lib/api/errors';

/**
 * The failure counterpart to EmptyState, whose markup and spacing this mirrors so the two read
 * as one family.
 *
 * The distinction matters and is easy to blur: EmptyState means "the request succeeded and
 * there is nothing here", which is a normal outcome with a forward action ("Browse products").
 * ErrorState means "we could not find out", which needs a retry rather than a suggestion.
 * Showing an empty state for a failed request is how a broken API ends up looking like an empty
 * catalogue.
 */
export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
  retryLabel = 'Try again',
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const message = errorMessage(error);
  // Surfaced so a user can quote it in a support request; the backend logs the same value as
  // `traceId`, which is what makes an individual failure findable.
  const traceId = isApiError(error) ? error.traceId : undefined;
  const retryAfter = isApiError(error) ? error.retryAfterSeconds : undefined;

  return (
    <div
      className="grid place-items-center rounded-lg border border-dashed border-surface-border bg-surface-raised p-10 text-center"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="mb-4 h-12 w-12 text-text-danger" />
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-text-secondary">{message}</p>

      {/*
        Rate limiting gets an explicit wait time instead of a retry button. The reference is
        specific that a 429 must respect Retry-After and avoid immediate retries, and offering
        a button here would invite the user to do exactly what extends the block.
      */}
      {retryAfter !== undefined ? (
        <p className="mt-2 text-sm font-semibold text-text-secondary">
          Please wait {retryAfter} second{retryAfter === 1 ? '' : 's'} before trying again.
        </p>
      ) : onRetry ? (
        <Button className="mt-6" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {retryLabel}
        </Button>
      ) : null}

      {traceId ? (
        <p className="mt-4 font-mono text-xs text-text-muted">Reference: {traceId}</p>
      ) : null}
    </div>
  );
}

/**
 * Compact variant for a section inside an already-rendered page (a PDP tab, a sidebar block),
 * where a full bordered panel would be louder than the failure warrants.
 */
export function InlineError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-md border border-text-danger/30 bg-status-dangerBg p-3 text-sm text-text-danger"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{errorMessage(error)}</span>
      {onRetry ? (
        <button
          className="font-semibold underline hover:no-underline"
          type="button"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
