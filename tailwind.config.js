/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ops-bg': '#0f1117',
        'ops-sidebar': '#1a1d27',
        'ops-text': '#e2e4ec',
        'ops-purple': '#7c6aff',
        'ops-surface': '#252836',
        'ops-border': '#2e3147',
      },
      animation: {
        'pulse-dot': 'pulse 1.2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
