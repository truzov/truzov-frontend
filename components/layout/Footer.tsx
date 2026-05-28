import { Camera, Play, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Logo } from './Logo';

const groups: Array<[string, string[]]> = [
  ['Shop', ['All Products', 'Categories', 'Brands', 'Offers']],
  ['Help', ['FAQ', 'Shipping Policy', 'Returns & Refunds', 'Contact Us']],
  ['Company', ['About Truzov', 'Blog', 'Careers', 'Press']],
];

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-raised">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-text-secondary">
            The verification-first health marketplace. We combine lab-tested products with familiar shopping patterns.
          </p>
          <div className="mt-4 flex gap-3 text-brand-primary">
            <Camera aria-hidden="true" className="h-5 w-5" />
            <Share2 aria-hidden="true" className="h-5 w-5" />
            <Play aria-hidden="true" className="h-5 w-5" />
          </div>
        </div>
        {groups.map(([title, links]) => (
          <div key={title}>
            <h3 className="text-sm font-semibold uppercase text-text-primary">{title}</h3>
            <ul className="mt-4 grid gap-2 text-sm text-text-secondary">
              {links.map((link) => (
                <li key={link}>
                  <Link href="/products">{link}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-surface-border px-4 py-5 text-center text-xs text-text-muted">
        (c) {new Date().getFullYear()} Truzov Verification Health. All Lab Reports ISO/IEC 17025 Certified.
      </div>
    </footer>
  );
}
