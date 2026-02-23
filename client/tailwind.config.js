/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        surface: {
          0: '#ffffff',
          1: '#fafafa',
          2: '#f3f4f6',
          3: '#e5e7eb',
          4: '#d1d5db',
          5: '#9ca3af',
        },
        ink: {
          DEFAULT: '#111827',
          light: '#374151',
          muted: '#6b7280',
          faint: '#9ca3af',
        },
        accent: {
          cyan: '#06b6d4',
          violet: '#7c3aed',
          pink: '#ec4899',
          blue: '#3b82f6',
        },
        like: '#ef4444',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        'modal': '0 20px 60px rgba(0,0,0,0.15)',
      },
      animation: {
        'heart-pop': 'heartPop 0.4s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        heartPop: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    }
  },
  plugins: []
};
