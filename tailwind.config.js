/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pn: {
          bg: '#0f0f23',
          surface: '#1a1a2e',
          'surface-light': '#242444',
          red: '#cd2026',
          'red-hover': '#e52028',
          blue: '#3b82f6',
          border: '#2d2d44',
          'text-primary': '#ffffff',
          'text-secondary': '#94a3b8',
          success: '#10b981',
          warning: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
