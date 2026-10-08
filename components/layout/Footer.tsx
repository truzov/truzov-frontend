import Link from 'next/link';
import Image from 'next/image';
import { Logo } from './Logo';
import { ChevronDown } from 'lucide-react';

const groups = [
  { title: 'shop', links: [{ label: 'all products', href: '/products' }, { label: 'verified products', href: '/products?labVerified=true' }, { label: 'lab reports', href: '/trust/lab-reports' }] },
  { title: 'company', links: [{ label: 'our verification process', href: '/trust/how-it-works' }, { label: 'become a seller', href: '/vendor/register' }, { label: 'seller support', href: '/support/seller' }] },
  { title: 'help', links: [{ label: 'support & tickets', href: '/support/tickets' }, { label: 'shipping', href: '/policies/shipping-policy' }, { label: 'refunds', href: '/policies/refund-policy' }] },
];

export function Footer() {
  return <footer className="border-t border-[#dce6d8] bg-white pb-16 font-body text-[#04342c] lg:pb-0">
    <div className="mx-auto max-w-[1240px] px-5 pt-14 lg:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-8 border-b border-[#dce6d8] pb-10"><div><span className="text-[12px] tracking-[.08em] text-[#27500a]">the truzov way</span><p className="footer-script mt-3 max-w-[720px] text-[clamp(34px,5vw,70px)] leading-[1.35] text-[#04342c]">good products.<br />checked first.</p></div><Image className="standards-seal h-32 w-32 shrink-0 sm:h-40 sm:w-40" src="/truzov-standards-seal.svg" alt="truzov Standards — checked first" width={160} height={160} /></div>
      <div className="hidden gap-10 py-12 lg:grid lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div><Logo /><p className="mt-4 max-w-[270px] text-[14px] leading-relaxed text-[#476158]">A marketplace for products checked before they reach your shelf.</p></div>
        {groups.map((group) => <div key={group.title}><h2 className="font-body text-[15px] font-medium">{group.title}</h2><ul className="mt-5 space-y-3">{group.links.map((link) => <li key={link.label}><Link className="text-[13px] text-[#476158] transition-colors hover:text-[#d85a30]" href={link.href}>{link.label}</Link></li>)}</ul></div>)}
      </div>
      <div className="py-7 lg:hidden"><Logo /><p className="my-4 max-w-[330px] text-[13px] leading-relaxed text-[#476158]">A marketplace for products checked before they reach your shelf.</p>{groups.map((group) => <details className="group border-t border-[#dce6d8] py-1 last:border-b" key={group.title}><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px]">{group.title}<ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary><ul className="grid pb-2">{group.links.map((link) => <li key={link.label}><Link className="flex min-h-11 items-center text-[13px] text-[#476158]" href={link.href}>{link.label}</Link></li>)}</ul></details>)}</div>
    </div>
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 border-t border-[#dce6d8] px-5 py-5 text-[12px] text-[#476158]"><span>© {new Date().getFullYear()} truzov. all rights reserved.</span><div className="flex gap-5"><Link className="inline-flex min-h-11 min-w-11 items-center" href="/policies/privacy-policy">privacy</Link><Link className="inline-flex min-h-11 min-w-11 items-center" href="/policies/terms-of-service">terms</Link></div></div>
  </footer>;
}
