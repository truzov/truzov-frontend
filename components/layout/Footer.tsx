import Link from 'next/link';
import { Logo } from './Logo';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterGroup {
  title: string;
  links: FooterLink[];
}

const groups: FooterGroup[] = [
  {
    title: 'Shop Verified',
    links: [
      { label: 'New Lab Arrivals', href: '/products' },
      { label: 'Verified Bestsellers', href: '/products' },
      { label: 'Wholesale Inquiries', href: '/products' },
      { label: 'Gift Certificates', href: '/products' },
    ],
  },
  {
    title: 'Transparency',
    links: [
      { label: 'Lab Partners', href: '/trust/how-it-works' },
      { label: 'Audit Methodology', href: '/trust/how-it-works' },
      { label: 'Privacy Policy', href: '/policies/privacy-policy' },
      { label: 'Terms of Service', href: '/policies/terms-of-service' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Customer Support', href: '/support/customer' },
      { label: 'Seller Support', href: '/support/seller' },
      { label: 'Shipping & Logistics', href: '/policies/shipping-policy' },
      { label: 'Refund Policy', href: '/policies/refund-policy' },
      { label: 'Health Knowledge Base', href: '/trust/how-it-works' },
    ],
  },
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
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="font-body text-sm font-semibold uppercase tracking-normal text-on-surface">
              {group.title}
            </h3>
            <ul className="mt-4 grid gap-2 text-base text-on-surface-variant">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link className="transition hover:text-primary" href={link.href}>
                    {link.label}
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
