'use client';

import { BrandPanel } from './BrandPanel';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="flex-grow flex flex-col lg:flex-row w-full min-h-screen">
      <BrandPanel />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-margin lg:p-xxl bg-surface">
        <div className="w-full max-w-md mx-auto flex flex-col">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-xl">
            <img alt="truzov" className="h-6 w-auto object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuClnqjV13DWgz0Mf2kHv0V72mLZUlSw7KMT2W99aeeA2_Axxk3A63Gi2tGb_gdco5KiTLye_eXtzpIkBilm-Y6qXogB7LjjqVyb3a09QLsxojCLptY0dPE0YWEmBt96krwj4os6x-LzyxSRSUS8ab-jr0zB31TX_w2dRfLRvwlSaAx-tHnAYSpvkkW9unalLm0jYBtAZym_yTYc07ngPe1lwDufn9ZZQVIV9_NqSXoDk90Mw6Mgk1cyUX6kK4N6Qceuo26WMql5hAE" />
          </div>

          {/* Header */}
          <div className="mb-xl text-center lg:text-left">
            <h2 className="text-h2 font-heading text-on-surface mb-sm">{title}</h2>
            <p className="text-body-md font-body text-on-surface-variant">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
