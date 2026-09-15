import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        night: { 900: '#05090f', 800: '#0a1018', 700: '#111a26', 600: '#1a2636' },
        emerald: { 350: '#4ade9f' },
        gold: { 100: '#fdf3d3', 200: '#f7e3a1', 300: '#efcd6b', 400: '#e0b23c', 500: '#c8932a' },
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
