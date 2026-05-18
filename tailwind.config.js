/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#fbf5ea',
          100: '#f3e3c1',
          200: '#e6c281',
          300: '#d09f54',
          400: '#b77f36',
          500: '#8d5f29',
          600: '#6b4720',
          700: '#4f341a',
          800: '#332111',
          900: '#1d1208',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
