/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian:  '#0a0a0f',
        surface:   '#12121a',
        panel:     '#1a1a26',
        border:    '#2a2a3d',
        gold:      '#d4a843',
        'gold-lt': '#e8c56e',
        crimson:   '#e03355',
        jade:      '#2ed573',
        sapphire:  '#3b82f6',
        muted:     '#6b6b8a',
        text:      '#e8e8f0',
      },
      boxShadow: {
        glow:        '0 0 24px rgba(212,168,67,0.25)',
        'glow-red':  '0 0 24px rgba(224,51,85,0.3)',
        'glow-jade': '0 0 20px rgba(46,213,115,0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up':   'slideUp 0.4s ease-out',
        'fade-in':    'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      },
    },
  },
  plugins: [],
};
