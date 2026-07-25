import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1B4332',
          50: '#E8F5EE',
          100: '#C6E6D3',
          200: '#8FCBA8',
          300: '#57AF7D',
          400: '#2E7D56',
          500: '#1B4332',
          600: '#163828',
          700: '#112C1F',
          800: '#0C2115',
          900: '#07150C',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F97316',
          50: '#FFF4ED',
          100: '#FFE5D0',
          200: '#FFC89E',
          300: '#FFAA6C',
          400: '#FF8C3A',
          500: '#F97316',
          600: '#EA6508',
          700: '#C25305',
          800: '#9A4204',
          900: '#723102',
          foreground: '#FFFFFF',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        success: { DEFAULT: '#10B981', foreground: '#FFFFFF' },
        warning: { DEFAULT: '#F59E0B', foreground: '#FFFFFF' },
        error: { DEFAULT: '#EF4444', foreground: '#FFFFFF' },
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};

export default config;
