'use client';

import { Logo } from '@/components/layout/Logo';
import { BrandPanel } from './BrandPanel';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="auth-surface flex-grow flex flex-col lg:flex-row w-full min-h-screen">
      <BrandPanel />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 py-12 lg:p-16 bg-[#fdfbf7]">
        <div className="w-full max-w-md mx-auto flex flex-col">
          <div className="lg:hidden flex justify-center mb-8">
            <Logo className="w-[128px]" />
          </div>

          {/* Header */}
          <div className="mb-xl text-center lg:text-left">
            <h2 className="text-[clamp(28px,4vw,42px)] font-medium leading-tight text-[#04342c] mb-3">{title}</h2>
            <p className="text-base text-[#547064]">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
