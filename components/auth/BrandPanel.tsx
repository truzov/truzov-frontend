'use client';

import Image from 'next/image';
import { BadgeCheck, Eye } from 'lucide-react';

export function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-xl bg-gradient-to-br from-primary to-primary-container relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10">
        <Image alt="truzov" className="h-8 w-auto mb-xxl object-contain" height={32} src="/truzov-logo.png" width={120} />

        <h1 className="text-h1 font-heading text-on-primary max-w-lg mb-xl tracking-tight leading-tight">
          Elevating Global Health Through Clinical Verification.
        </h1>

        <div className="flex flex-col gap-md">
          <div className="flex items-center gap-sm bg-white/10 backdrop-blur-sm border border-white/20 text-on-primary rounded-lg p-md w-max shadow-sm">
            <BadgeCheck aria-hidden="true" className="h-5 w-5 text-primary-fixed" />
            <span className="text-h6 font-bold font-body">Lab Certified</span>
          </div>
          <div className="flex items-center gap-sm bg-white/10 backdrop-blur-sm border border-white/20 text-on-primary rounded-lg p-md w-max shadow-sm">
            <Eye aria-hidden="true" className="h-5 w-5 text-primary-fixed" />
            <span className="text-h6 font-bold font-body">Full Transparency</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-xxl text-on-primary/70 text-caption font-body">
        Secure 256-bit encryption connection.
      </div>
    </div>
  );
}
