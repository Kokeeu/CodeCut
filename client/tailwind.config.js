/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      aspectRatio: {
        '9-16': '9 / 16',
      },
      colors: {
        editor: {
          bg: '#0d0d0d',
          panel: '#1a1a1a',
          surface: '#222222',
          border: '#2a2a2a',
          hover: '#333333',
        },
        accent: {
          DEFAULT: '#a855f7',
          hover: '#c084fc',
          dim: '#7c3aed',
          bg: 'rgba(168, 85, 247, 0.12)',
        },
      },
    },
  },
  plugins: [],
};
