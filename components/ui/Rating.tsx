import { Star } from 'lucide-react';

export function Rating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-text-secondary">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${
            index < Math.round(rating) ? 'fill-brand-accent text-brand-accent' : 'text-surface-borderStrong'
          }`}
        />
      ))}
      <span>{rating.toFixed(1)}</span>
      {count ? <span>({count})</span> : null}
    </div>
  );
}
