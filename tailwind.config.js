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
        vbg:      '#02040f',
        vbg2:     '#050815',
        vbg3:     '#080c1a',
        vblue:    '#2D7CF6',
        vblue2:   '#5599ff',
        vcyan:    '#00d4ff',
        vpurple:  '#7c3aed',
        vgreen:   '#00e676',
        vamber:   '#ffab00',
        vred:     '#ff4444',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'pulse-dot':    'pulse-dot 2s infinite',
        'orb-breathe':  'orb-breathe 3s ease-in-out infinite',
        'ring-spin':    'ring-spin 20s linear infinite',
        'ring-spin-rev':'ring-spin 30s linear infinite reverse',
        'bar-grow':     'bar-grow 0.8s ease both',
        'fade-up':      'fade-up 0.4s ease both',
      },
      keyframes: {
        'pulse-dot': {
          '0%,100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(0,230,118,0.4)' },
          '50%':     { opacity: '.8', boxShadow: '0 0 0 6px rgba(0,230,118,0)' },
        },
        'orb-breathe': {
          '0%,100%': { transform: 'translateY(-50%) scale(1)' },
          '50%':     { transform: 'translateY(-50%) scale(1.06)' },
        },
        'ring-spin': {
          from: { transform: 'translate(50%,-50%) rotate(0deg)' },
          to:   { transform: 'translate(50%,-50%) rotate(360deg)' },
        },
        'bar-grow': {
          from: { transform: 'scaleY(0)', transformOrigin: 'bottom' },
          to:   { transform: 'scaleY(1)', transformOrigin: 'bottom' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
