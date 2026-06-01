import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ✅ EXISTING BRAND COLORS (preserved from original design)
        brand: {
          primary: '#3B6B4A',
          secondary: '#5A8F6A',
          light: '#EAF2EC',
          accent: '#D4874E',
          accentLight: '#FAF0E6',
        },
        surface: {
          base: '#FFFFFF',
          raised: '#F7F5F2',
          overlay: '#F0EDE8',
          border: '#E2DDD7',
          borderStrong: '#C9C2B8',
        },
        text: {
          primary: '#1C1C1A',
          secondary: '#5C5A56',
          muted: '#9A9690',
          inverse: '#FFFFFF',
          link: '#3B6B4A',
          danger: '#C0392B',
          success: '#2E7D52',
          warning: '#A0522D',
        },
        status: {
          successBg: '#E8F5EE',
          warningBg: '#FEF3E2',
          dangerBg: '#FDECEA',
          infoBg: '#EAF2EC',
        },

        // ✅ MATERIAL DESIGN 3 COLORS (for auth pages)
        primary: '#00600a',
        'primary-container': '#a3f0b8',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#001f04',
        'on-primary-fixed-variant': '#00491e',
        'primary-fixed': '#a3f0b8',
        'primary-fixed-dim': '#78dda5',
        secondary: '#386a20',
        'secondary-container': '#b0f590',
        'on-secondary': '#ffffff',
        'on-secondary-fixed': '#0e2308',
        'on-secondary-fixed-variant': '#24550f',
        'surface-md': '#f6fbef',
        'surface-dim': '#d8ddd3',
        'surface-bright': '#f6fbef',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f0f5eb',
        'surface-container': '#eaefe5',
        'surface-container-high': '#e4e9df',
        'surface-container-highest': '#dfe4d9',
        'on-surface': '#1a1c18',
        'on-surface-variant': '#49483e',
        error: '#C82333',
        'error-container': '#f9dedc',
        'on-error': '#ffffff',
        outline: '#797973',
        'outline-variant': '#cac4b8',
        scrim: '#000000',
        'inverse-surface': '#2e312d',
        'inverse-on-surface': '#f1f5f0',
        'inverse-primary': '#78dda5',
        background: '#f6fbef',
      },

      fontFamily: {
        heading: ['Lora', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },

      fontSize: {
        // ✅ MATERIAL DESIGN 3 TYPOGRAPHY (for auth pages)
        'display-lg': ['57px', { lineHeight: '1.2', letterSpacing: '-0.25px', fontWeight: '400' }],
        'display-md': ['45px', { lineHeight: '1.2', letterSpacing: '0px', fontWeight: '400' }],
        'display-sm': ['36px', { lineHeight: '1.2', letterSpacing: '0px', fontWeight: '400' }],
        'h1': ['32px', { lineHeight: '1.25', letterSpacing: '0px', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '1.3', letterSpacing: '0px', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '1.33', letterSpacing: '0px', fontWeight: '700' }],
        'h4': ['22px', { lineHeight: '1.36', letterSpacing: '0px', fontWeight: '700' }],
        'h5': ['20px', { lineHeight: '1.4', letterSpacing: '0px', fontWeight: '700' }],
        'h6': ['18px', { lineHeight: '1.44', letterSpacing: '0px', fontWeight: '700' }],
        'h5-bold': ['20px', { lineHeight: '1.4', letterSpacing: '0px', fontWeight: '700' }],
        'h6-bold': ['18px', { lineHeight: '1.44', letterSpacing: '0px', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '1.5', letterSpacing: '0.15px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.43', letterSpacing: '0.25px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.33', letterSpacing: '0.4px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '1.43', letterSpacing: '0.1px', fontWeight: '500' }],
        'label-md': ['12px', { lineHeight: '1.33', letterSpacing: '0.5px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '1.27', letterSpacing: '0.5px', fontWeight: '500' }],
        'title-lg': ['22px', { lineHeight: '1.36', letterSpacing: '0px', fontWeight: '700' }],
        'title-md': ['16px', { lineHeight: '1.5', letterSpacing: '0.15px', fontWeight: '700' }],
        'title-sm': ['14px', { lineHeight: '1.43', letterSpacing: '0.1px', fontWeight: '700' }],
        'caption': ['12px', { lineHeight: '1.33', letterSpacing: '0.4px', fontWeight: '400' }],

        // ✅ LEGACY SIZES (preserve for compatibility)
        xs: ['11px', { lineHeight: '1.5', letterSpacing: '0' }],
        sm: ['13px', { lineHeight: '1.6', letterSpacing: '0' }],
        base: ['15px', { lineHeight: '1.7', letterSpacing: '0' }],
        md: ['16px', { lineHeight: '1.6', letterSpacing: '0' }],
        lg: ['18px', { lineHeight: '1.5', letterSpacing: '0' }],
        xl: ['20px', { lineHeight: '1.4', letterSpacing: '0' }],
        '2xl': ['24px', { lineHeight: '1.35', letterSpacing: '-0.2px' }],
        '3xl': ['30px', { lineHeight: '1.3', letterSpacing: '-0.3px' }],
        '4xl': ['38px', { lineHeight: '1.2', letterSpacing: '-0.4px' }],
        '5xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.5px' }],
      },

      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '64px',
        margin: '16px',
      },

      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },

      boxShadow: {
        xs: '0 1px 2px rgba(28,28,26,0.06)',
        sm: '0 2px 6px rgba(28,28,26,0.08)',
        md: '0 4px 16px rgba(28,28,26,0.10)',
      },

      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
};

export default config;
