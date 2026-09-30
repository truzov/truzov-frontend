'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, FlaskConical } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export function BrandPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#04342c] text-[#e1f5ee] lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
      <Image alt="Care products, botanicals and ingredients selected for truzov" className="object-cover opacity-45" fill priority sizes="50vw" src="/truzov-hero.webp" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#04342c]/70 via-[#04342c]/75 to-[#04342c]" />
      <div className="relative z-10 p-12">
        <Logo className="w-[128px]" light />
      </div>
      <div className="relative z-10 max-w-xl p-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#b9e8d8]/40 bg-[#b9e8d8]/15 px-4 py-2 text-sm"><FlaskConical size={18} /> checked before listing</span>
        <h1 className="mt-6 text-[clamp(38px,4vw,62px)] font-medium leading-[1.1] tracking-[-.04em]">every label, verified.<br />every claim, tested.</h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-[#c1e7d8]">Shop with more confidence and less guesswork.</p>
        <Link className="mt-7 inline-flex min-h-11 items-center gap-2 border-b border-current text-sm" href="/trust/how-it-works">how we verify products <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div>
    </div>
  );
}
