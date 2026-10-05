/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--ag-canvas) / <alpha-value>)',
        surface: 'rgb(var(--ag-surface) / <alpha-value>)',
        border: 'rgb(var(--ag-border) / <alpha-value>)',
        ink: 'rgb(var(--ag-ink) / <alpha-value>)',
        muted: 'rgb(var(--ag-muted) / <alpha-value>)',
        accent: 'rgb(var(--ag-accent) / <alpha-value>)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
      boxShadow: { card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)' },
    },
  },
  plugins: [],
};
