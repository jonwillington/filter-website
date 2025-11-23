/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Filterexpo color scheme
        background: '#FFFFFF',
        surface: '#FAFAFA',
        contrastBlock: '#2E1F17',
        contrastText: '#FFFDFB',
        accent: '#8B6F47',
        secondary: '#4A3B2E',
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
  plugins: [],
}

