/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        imperial: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#0d1117',
        },
        rebel: {
          50: '#fef7f0',
          100: '#feeee0',
          200: '#fcd9c0',
          300: '#f9bb94',
          400: '#f59e72',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        roboto: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};