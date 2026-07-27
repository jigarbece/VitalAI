/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#07111F',
          50: '#172B45',
          100: '#10243A',
          200: '#0B1B2D',
          900: '#040A12',
        },
        teal: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#60A5FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 12px 32px rgba(37, 99, 235, 0.18)',
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
