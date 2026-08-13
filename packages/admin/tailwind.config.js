/** @type {import('tailwindcss').Config} */
import kfPreset from '@kitchenasty/shared/tailwind-preset';
export default {
  presets: [kfPreset],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // King Food V3 Design Tokens
        cream: '#E2DDCF',
        ink: '#221D25',
        gold: '#FFD100',
        // primary = alias dourado (compatibilidade com classes existentes)
        primary: {
          50: '#fffbe6',
          100: '#fff3b8',
          200: '#ffe97a',
          300: '#ffdf3d',
          400: '#ffd700',
          500: '#ffd100',
          600: '#e6bc00',
          700: '#c29e00',
          800: '#9e8200',
          900: '#7a6500',
          950: '#4d3f00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '48px',
      },
      boxShadow: {
        soft: '0 12px 40px -16px rgba(34,29,37,0.18)',
        cta: '0 10px 28px -8px rgba(34,29,37,0.35)',
      },
    },
  },
  plugins: [],
};
