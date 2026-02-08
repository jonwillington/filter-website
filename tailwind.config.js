const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens - use CSS variables for dark mode support
        // Usage: bg-surface, text-primary, border-default etc.
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-warm': 'var(--surface-warm)',
        contrastBlock: 'var(--contrast-block)',
        contrastText: 'var(--contrast-text)',
        accent: 'var(--accent)',
        secondary: 'var(--secondary)',
        primary: 'var(--text)',
        text: 'var(--text-body)',
        'text-secondary': 'var(--text-secondary)',
        'border-default': 'var(--border)',
        error: 'var(--error)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        // Legacy static colors (avoid using - prefer semantic tokens above)
        buttonPrimary: '#3D2A1F',
        buttonText: '#FFFFFF',
      },
      fontFamily: {
        sans: ['PPNeueYork', 'system-ui', 'sans-serif'],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
}
