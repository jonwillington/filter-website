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
        // App-specific custom colors (not HeroUI semantic colors)
        // Light mode defaults
        surface: '#FAFAFA',
        contrastBlock: '#2E1F17',
        contrastText: '#FFFDFB',
        accent: '#8B6F47',
        text: '#1A1A1A',
        textSecondary: '#9A9A9A',
        border: '#E5DDD5',
        buttonPrimary: '#3D2A1F',
        buttonText: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
}
