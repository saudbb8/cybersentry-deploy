export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#060912', 800: '#0a0e1a', 700: '#0f1629',
          600: '#1a2140', 500: '#1e293b',
        },
        cyber: {
          blue: '#38bdf8', green: '#22c55e', red: '#ef4444',
          yellow: '#f59e0b', purple: '#a855f7',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.3s ease',
        'slide-up':   'slideUp 0.3s ease',
      },
    },
  },
  plugins: [],
}
