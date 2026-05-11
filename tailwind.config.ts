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
        floating: '0 12px 40px rgba(15, 23, 42, 0.16)',
        followPulse: '0 16px 40px rgba(5, 150, 105, 0.34)'
      },
      animation: {
        pulseSoft: 'pulseSoft 2s ease-out infinite',
        followBreath: 'followBreath 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        followNoticeIn: 'followNoticeIn 220ms ease-out'
      },
      keyframes: {
        pulseSoft: {
          '0%': { transform: 'scale(0.9)', opacity: '0.9' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' }
        },
        followBreath: {
          '0%': {
            backgroundColor: '#047857',
            boxShadow: '0 10px 22px rgba(16, 185, 129, 0.12)'
          },
          '50%': {
            backgroundColor: '#10b981',
            boxShadow: '0 16px 34px rgba(16, 185, 129, 0.24)'
          },
          '100%': {
            backgroundColor: '#047857',
            boxShadow: '0 10px 22px rgba(16, 185, 129, 0.12)'
          }
        },
        followNoticeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-0.5rem) scale(0.95)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
