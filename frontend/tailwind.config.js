/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Основные цвета через CSS переменные
        bg: 'var(--bg)',
        'bg-secondary': 'var(--bg-secondary)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        card: 'var(--card)',
        border: 'var(--border)',
        primary: 'var(--primary)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        'container': '1600px',
      },
      borderRadius: {
        'card': '14px',
        'btn': '10px',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0,0,0,0.1)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
