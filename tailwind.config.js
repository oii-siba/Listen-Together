/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#020403',
        ink: '#020403',
        surface: '#0A100D',
        panel: '#0A100D',
        'surface-2': '#101814',
        panel2: '#101814',
        'surface-3': '#16231D',
        accent: '#00FF87',
        'accent-dim': '#00C96B',
        'accent-glow': '#00FF87',
        spotify: '#00FF87',
        'neon-green': '#00FF87',
        'main-text': '#F5F7F5',
        'sec-text': '#9AA59F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'neon-sm': '0 0 15px rgba(0, 255, 135, 0.25)',
        'neon-md': '0 0 25px rgba(0, 255, 135, 0.45)',
        'neon-lg': '0 0 45px rgba(0, 255, 135, 0.65)',
        'silver-glow': '0 0 30px rgba(255, 255, 255, 0.15)',
        'glass-card': '0 20px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};

