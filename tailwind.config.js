/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'deep-navy': '#0a192f',
        'light-navy': '#112240',
        'status-success': '#16a34a',
        'status-danger': '#dc2626',
        'status-warning': '#f59e0b',
      },
      boxShadow: {
        'glow-blue': '0 0 12px 3px rgba(29, 78, 216, 0.25)',
        'glow-secondary': '0 0 15px 4px rgba(100, 255, 218, 0.4)',
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out forwards',
        'subtle-bounce-in': 'subtle-bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
      },
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
            '0%, 100%': { boxShadow: '0 0 10px 2px rgba(100, 255, 218, 0.3)' },
            '50%': { boxShadow: '0 0 20px 5px rgba(100, 255, 218, 0.6)' },
        },
        'subtle-bounce-in': {
            '0%': { transform: 'scale(0.9)', opacity: '0' },
            '60%': { transform: 'scale(1.05)', opacity: '1' },
            '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};
