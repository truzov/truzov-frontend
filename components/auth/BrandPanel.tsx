'use client';

export function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-xl bg-gradient-to-br from-primary to-primary-container relative overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Content */}
      <div className="relative z-10">
        {/* Logo */}
        <img alt="truzov" className="h-8 mb-xxl object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuClnqjV13DWgz0Mf2kHv0V72mLZUlSw7KMT2W99aeeA2_Axxk3A63Gi2tGb_gdco5KiTLye_eXtzpIkBilm-Y6qXogB7LjjqVyb3a09QLsxojCLptY0dPE0YWEmBt96krwj4os6x-LzyxSRSUS8ab-jr0zB31TX_w2dRfLRvwlSaAx-tHnAYSpvkkW9unalLm0jYBtAZym_yTYc07ngPe1lwDufn9ZZQVIV9_NqSXoDk90Mw6Mgk1cyUX6kK4N6Qceuo26WMql5hAE" />

        {/* Headline */}
        <h1 className="font-h1 text-h1 text-on-primary max-w-lg mb-xl tracking-tight leading-tight">
          Elevating Global Health Through Clinical Verification.
        </h1>

        {/* Trust Badges */}
        <div className="flex flex-col gap-md">
          <div className="flex items-center gap-sm bg-white/10 backdrop-blur-sm border border-white/20 text-on-primary rounded-lg p-md w-max shadow-sm">
            <span className="material-symbols-outlined text-primary-fixed">verified</span>
            <span className="font-h6-bold text-h6-bold">Lab Certified</span>
          </div>
          <div className="flex items-center gap-sm bg-white/10 backdrop-blur-sm border border-white/20 text-on-primary rounded-lg p-md w-max shadow-sm">
            <span className="material-symbols-outlined text-primary-fixed">visibility</span>
            <span className="font-h6-bold text-h6-bold">Full Transparency</span>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="relative z-10 pt-xxl text-on-primary/70 font-caption text-caption">
        Secure 256-bit encryption connection.
      </div>
    </div>
  );
}
