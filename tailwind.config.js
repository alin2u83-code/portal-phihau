
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'brand-primary': '#3b82f6', // Albastru Phi Hau
        'brand-dark': '#0f172a',
        'brand-card': '#1e293b',
        'brand-secondary': '#64ffda',
        'deep-navy': '#0f172a',
        'light-navy': '#1e293b',
        'status-danger': '#dc2626',
        'status-success': '#16a34a',
        'status-warning': '#f59e0b',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'glow-blue': '0 0 15px 0 rgba(59, 130, 246, 0.4)',
        'glow-secondary': '0 0 20px 0 rgba(100, 255, 218, 0.3)',
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
      },
      keyframes: {
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-15px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      }
    },
  },
  plugins: [],
};
