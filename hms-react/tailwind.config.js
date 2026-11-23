/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B1120',
          card: '#111827',
          elevated: '#182235',
          input: '#1E293B',
          inputFocus: '#182235',
          border: '#334155',
          borderSubtle: '#1E293B',
          text: '#F1F5F9',
          textMuted: '#94A3B8',
          textSubtle: '#64748B',
        },
        institutional: {
          50: '#f0f5f9',
          100: '#e1ecf2',
          200: '#c3d9e6',
          300: '#94bcd3',
          400: '#5e9bbd',
          500: '#387ea5',
          600: '#2a6589',
          700: '#235270',
          800: '#1b3f57',
          900: '#0f2636',
          950: '#091823',
        },
        navy: {
          900: '#0b1329',
          800: '#111d3d',
          700: '#182955',
        },
        brass: {
          500: '#c59b27',
          600: '#a37e1b',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
