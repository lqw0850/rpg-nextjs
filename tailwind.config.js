/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        hand: ['var(--font-hand)', 'cursive'],
        serif: ['var(--font-serif)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        theme: ['"Theme"', 'cursive'],
      },
      colors: {
        ink: {
          DEFAULT: '#5D4037',
          light: '#8D6E63',
        },
        paper: '#F2EFE5',
        tribal: {
          dark: '#B09882',
          light: '#D7C9B6',
        },
        bg: {
          paper: '#FDFBF7',
          card: '#EFEBE9',
        },
        purple: '#9fa0d7',
        orange: '#FF7043',
        ocean: {
          900: '#0f172a',
          800: '#1e3a8a',
          700: '#1d4ed8',
          400: '#60a5fa',
          100: '#dbeafe',
        },
        shimmer: '#e0f2fe',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 60s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}

