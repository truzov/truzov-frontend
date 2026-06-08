import Link from 'next/link';
import { Logo } from './Logo';

const groups: Array<[string, string[]]> = [
  ['Shop Verified', ['New Lab Arrivals', 'Verified Bestsellers', 'Wholesale Inquiries', 'Gift Certificates']],
  ['Transparency', ['Lab Partners', 'Audit Methodology', 'Privacy Protocol', 'Terms of Service']],
  ['Support', ['Quality Support', 'Vendor Onboarding', 'Shipping & Logistics', 'Health Knowledge Base']],
];

export function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-background font-body">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-12">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-base leading-relaxed text-on-surface-variant">
            The world&apos;s first verification-led health marketplace. We use science to bridge
            the gap between marketing claims and nutritional truth.
          </p>
        </div>
        {groups.map(([title, links]) => (
          <div key={title}>
            <h3 className="font-body text-sm font-semibold uppercase tracking-normal text-on-surface">
              {title}
            </h3>
            <ul className="mt-4 grid gap-2 text-base text-on-surface-variant">
              {links.map((link) => (
                <li key={link}>
                  <Link className="transition hover:text-primary" href="/products">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1340px] border-t border-outline-variant px-4 py-6 text-center text-xs text-on-surface-variant">
        &copy; {new Date().getFullYear()} truzov Verification Health. All Lab Reports ISO/IEC 17025
        Certified.
      </div>
    </footer>
  );
}
