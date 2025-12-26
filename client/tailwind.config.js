/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terminal-bg': '#0d1117',
        'terminal-panel': '#161b22',
        'terminal-border': '#21262d',
        'terminal-text': '#c9d1d9',
        'terminal-accent': '#58a6ff',
        'terminal-green': '#3fb950',
        'terminal-red': '#f85149',
        'terminal-yellow': '#d29922',
        'terminal-blue': '#58a6ff',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '16px' }],
        'sm': ['12px', { lineHeight: '18px' }],
      },
    },
  },
  plugins: [],
}

