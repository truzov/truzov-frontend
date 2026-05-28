import Link from 'next/link';

export function Logo() {
  return (
    <Link className="inline-flex items-center gap-2 font-heading text-2xl font-semibold text-brand-primary" href="/">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-primary text-sm text-text-inverse">
        t
      </span>
      truzov
    </Link>
  );
}
