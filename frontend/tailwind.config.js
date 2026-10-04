module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#00433e',
        'primary-container': '#145c55',
        surface: '#e9fef2',
        canvas: '#faf7f2',
        ink: '#0d1f18',
        muted: '#66716a',
      },
      fontFamily: {
        serif: ['Noto Serif', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
