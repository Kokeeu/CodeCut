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
          bg: '#0a0a0f',
          panel: '#101018',
          surface: '#16161f',
          border: '#22222e',
          hover: '#1d1d28',
        },
        ink: {
          900: '#08080c',
          800: '#0d0d12',
          700: '#14141a',
          600: '#1a1a22',
          500: '#22222c',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.03)',
          panel: 'rgba(255,255,255,0.03)',
          strong: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.06)',
          'border-strong': 'rgba(255,255,255,0.1)',
          hover: 'rgba(255,255,255,0.06)',
          active: 'rgba(168,85,247,0.12)',
        },
        accent: {
          DEFAULT: '#a855f7',
          hover: '#c084fc',
          dim: '#7c3aed',
          deep: '#6d28d9',
          bg: 'rgba(168, 85, 247, 0.12)',
          glow: 'rgba(168, 85, 247, 0.4)',
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      boxShadow: {
        'glow-accent': '0 0 24px -4px rgba(168, 85, 247, 0.45)',
        'glow-accent-lg': '0 0 48px -8px rgba(168, 85, 247, 0.55)',
        'glow-accent-sm': '0 0 12px -2px rgba(168, 85, 247, 0.35)',
        'inset-glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        'panel': '0 8px 32px -8px rgba(0, 0, 0, 0.6)',
        'panel-lg': '0 24px 64px -16px rgba(0, 0, 0, 0.7)',
        'card': '0 4px 24px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
        'card-hover': '0 12px 32px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
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
        'gradient-accent': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
        'gradient-accent-soft': 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(168,85,247,0.2) 100%)',
        'grid-pattern': "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
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
