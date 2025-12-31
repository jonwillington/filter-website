import { heroui } from "@heroui/react";

export default heroui({
  themes: {
    light: {
      colors: {
        background: '#FFFFFF',
        foreground: '#1A1A1A',
        primary: {
          DEFAULT: '#3D2A1F',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#4A3B2E',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#17C964',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F5A524',
          foreground: '#1A1A1A',
        },
        danger: {
          DEFAULT: '#F31260',
          foreground: '#FFFFFF',
        },
        focus: '#8B6F47',
      },
    },
    dark: {
      colors: {
        background: '#1A1A1A',
        foreground: '#FFFFFF',
        primary: {
          DEFAULT: '#8B6F47',
          foreground: '#1A1A1A',
        },
        secondary: {
          DEFAULT: '#6B5645',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#17C964',
          foreground: '#000000',
        },
        warning: {
          DEFAULT: '#F5A524',
          foreground: '#000000',
        },
        danger: {
          DEFAULT: '#F31260',
          foreground: '#FFFFFF',
        },
        focus: '#8B6F47',
      },
    },
  },
});
