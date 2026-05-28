/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A0F1E',
          50: '#1A2238',
          100: '#141B30',
          200: '#0F1626',
          900: '#06091A',
        },
        teal: {
          DEFAULT: '#00D4AA',
          dark: '#00B894',
          light: '#33DDB9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 212, 170, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 12px rgba(0, 212, 170, 0.3)' }, '50%': { boxShadow: '0 0 28px rgba(0, 212, 170, 0.6)' } },
      },
    },
  },
  plugins: [],
};
