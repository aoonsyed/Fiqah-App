import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      /**
       * Every palette colour resolves through a CSS variable, so switching
       * theme is a change of values rather than of class names — the ~300
       * `text-white/55`-style utilities already in the components keep working.
       *
       * `white` is redefined as the foreground: near-white in dark mode,
       * near-black in light. `night` stays the dark surface family, which in
       * light mode holds the light surfaces.
       */
      colors: {
        white: 'rgb(var(--c-fg) / <alpha-value>)',
        black: 'rgb(var(--c-shadow) / <alpha-value>)',
        night: {
          900: 'rgb(var(--c-bg) / <alpha-value>)',
          800: 'rgb(var(--c-surface) / <alpha-value>)',
          700: 'rgb(var(--c-surface-2) / <alpha-value>)',
          600: 'rgb(var(--c-surface-3) / <alpha-value>)',
        },
        emerald: {
          350: 'rgb(var(--c-emerald-350) / <alpha-value>)',
          500: 'rgb(var(--c-emerald-500) / <alpha-value>)',
          800: 'rgb(var(--c-emerald-800) / <alpha-value>)',
          900: 'rgb(var(--c-emerald-900) / <alpha-value>)',
          950: 'rgb(var(--c-emerald-950) / <alpha-value>)',
        },
        gold: {
          100: 'rgb(var(--c-gold-100) / <alpha-value>)',
          200: 'rgb(var(--c-gold-200) / <alpha-value>)',
          300: 'rgb(var(--c-gold-300) / <alpha-value>)',
          400: 'rgb(var(--c-gold-400) / <alpha-value>)',
          500: 'rgb(var(--c-gold-500) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        arabic: ['Amiri', '"Noto Naskh Arabic"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'none' } },
        float: { '0%,100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(0,-22px,0)' } },
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(40px,-30px,0) scale(1.1)' },
          '66%': { transform: 'translate3d(-30px,20px,0) scale(0.95)' },
        },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '70%,100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        draw: { to: { strokeDashoffset: '0' } },
        'grow-y': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        float: 'float 7s ease-in-out infinite',
        drift: 'drift 22s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(.24,.6,.35,1) infinite',
        draw: 'draw 1.6s ease-out both',
        'grow-y': 'grow-y .9s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};

export default config;
