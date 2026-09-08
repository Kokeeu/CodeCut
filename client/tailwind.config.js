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
          bg: '#060b15',
          panel: '#0a1323',
          surface: '#101d31',
          border: '#1d3049',
          hover: '#172942',
        },
        ink: {
          900: '#050914',
          800: '#08101e',
          700: '#0c1829',
          600: '#122239',
          500: '#1a2d47',
        },
        glass: {
          DEFAULT: 'rgba(143,181,225,0.035)',
          panel: 'rgba(143,181,225,0.04)',
          strong: 'rgba(143,181,225,0.075)',
          border: 'rgba(141,185,232,0.105)',
          'border-strong': 'rgba(141,185,232,0.18)',
          hover: 'rgba(143,181,225,0.085)',
          active: 'rgba(22,136,255,0.14)',
        },
        accent: {
          DEFAULT: '#1688ff',
          hover: '#42a5ff',
          dim: '#0a66d8',
          deep: '#064da8',
          bg: 'rgba(22,136,255,0.12)',
          glow: 'rgba(22,136,255,0.4)',
        },
        signal: {
          DEFAULT: '#22d3ee',
          soft: '#7ee9f7',
          deep: '#0e91a8',
        },
        flare: {
          DEFAULT: '#ff2d78',
          soft: '#ff6aa0',
          deep: '#c91658',
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      boxShadow: {
        'glow-accent': '0 0 24px -4px rgba(22,136,255,0.42)',
        'glow-accent-lg': '0 0 48px -8px rgba(22,136,255,0.48)',
        'glow-accent-sm': '0 0 12px -2px rgba(22,136,255,0.32)',
        'inset-glass': 'inset 0 1px 0 0 rgba(184, 218, 255, 0.07)',
        'panel': '0 8px 32px -8px rgba(0, 5, 18, 0.68)',
        'panel-lg': '0 24px 64px -16px rgba(0, 5, 18, 0.78)',
        'card': '0 4px 24px -8px rgba(0, 5, 18, 0.58), inset 0 1px 0 0 rgba(184, 218, 255, 0.05)',
        'card-hover': '0 12px 32px -8px rgba(0, 5, 18, 0.68), inset 0 1px 0 0 rgba(184, 218, 255, 0.08)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInBottom: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        toastIn: {
          '0%': { transform: 'translateX(120%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-bottom': 'slideInBottom 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'toast-in': 'toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #0a66d8 0%, #1688ff 55%, #22d3ee 100%)',
        'gradient-accent-soft': 'linear-gradient(135deg, rgba(10,102,216,0.22) 0%, rgba(34,211,238,0.12) 100%)',
        'grid-pattern': "linear-gradient(rgba(104,160,216,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(104,160,216,0.035) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid-sm': '16px 16px',
        'grid-md': '24px 24px',
      },
      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
