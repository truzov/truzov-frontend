import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        xs: ['11px', '1.5'],
        sm: ['13px', '1.6'],
        base: ['15px', '1.7'],
        md: ['16px', '1.6'],
        lg: ['18px', '1.5'],
        xl: ['20px', '1.4'],
        '2xl': ['24px', '1.35'],
        '3xl': ['30px', '1.3'],
        '4xl': ['38px', '1.2'],
        '5xl': ['48px', '1.1'],
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
