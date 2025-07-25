/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#d85050',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#d85050',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        dark: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.bg-brand': {
          background:
            'linear-gradient(135deg,#f3f4f6 0%,#d1d5db 15%,#ffffff 30%,#9ca3af 50%,#ffffff 70%,#d1d5db 85%,#f3f4f6 100%)',
          color: '#111827',
          'box-shadow': 'inset 0 1px 3px rgba(255,255,255,.4), inset 0 -1px 1px rgba(0,0,0,.15)',
        },
        '.hover\\:bg-brand\\/90:hover': {
          filter: 'brightness(1.1)',
        },
        '.bg-brand\\/60': {
          background:
            'linear-gradient(135deg,#f3f4f6 0%,#d1d5db 15%,#ffffff 30%,#9ca3af 50%,#ffffff 70%,#d1d5db 85%,#f3f4f6 100%)',
          opacity: '0.6',
          color: '#111827',
        },
        '.text-brand': {
          background:
            'linear-gradient(135deg,#f3f4f6 0%,#d1d5db 15%,#ffffff 30%,#9ca3af 50%,#ffffff 70%,#d1d5db 85%,#f3f4f6 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      })
    }
  ],
} 