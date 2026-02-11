/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#d2673d',
          red: '#FF5A3C',
          dark: '#05070B',
          card: '#121826',
          muted: '#1F2A3C',
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#C7CED9',
          muted: '#9CA3AF',
        },
      },
    },
  },
  plugins: [],
};
