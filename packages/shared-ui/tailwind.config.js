/** @type {import('tailwindcss').Config} */
import kfPreset from '@kitchenasty/shared/tailwind-preset';

export default {
  presets: [kfPreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../storefront/src/**/*.{js,ts,jsx,tsx}',
    '../admin/src/**/*.{js,ts,jsx,tsx}',
    '../mobile/src/**/*.{js,ts,jsx,tsx}',
    '../mobile/app/**/*.{js,ts,jsx,tsx}',
  ],
};
