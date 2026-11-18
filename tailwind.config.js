/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        card: v('card'),
        elevated: v('elevated'),
        line: v('line'),
        fg: v('fg'),
        muted: v('muted'),
        brand: { DEFAULT: v('brand'), hover: v('brand-hover') },
        primary: { DEFAULT: v('primary'), fg: v('primary-fg') },
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        info: v('info'),
      },
      fontFamily: { sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '16px' },
      opacity: { 12: '0.12' },
      boxShadow: {
        card: '0 1px 2px 0 rgb(var(--shadow) / 0.04), 0 1px 3px 0 rgb(var(--shadow) / 0.03)',
        pop: '0 24px 60px -20px rgb(var(--shadow) / 0.35), 0 4px 12px -4px rgb(var(--shadow) / 0.08)',
      },
    },
  },
  plugins: [],
};
