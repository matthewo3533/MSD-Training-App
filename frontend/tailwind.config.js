/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
          text: '#f1f5f9',
          'text-secondary': '#cbd5e1',
          'text-muted': '#94a3b8',
          border: '#334155',
          'border-secondary': '#475569',
          accent: '#10b981',
        },
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'success-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'danger-gradient': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
    },
  },
  plugins: [],
}

