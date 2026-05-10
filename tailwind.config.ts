import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effbf3',
          100: '#d8f5e2',
          500: '#25a95a',
          600: '#198548',
          700: '#14683a'
        },
        ink: '#0f172a'
      },
      boxShadow: {
        floating: '0 12px 40px rgba(15, 23, 42, 0.16)'
      },
      animation: {
        pulseSoft: 'pulseSoft 2s ease-out infinite'
      },
      keyframes: {
        pulseSoft: {
          '0%': { transform: 'scale(0.9)', opacity: '0.9' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
