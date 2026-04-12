/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper:   '#ffffff',
        ink:     '#0a0a0a',
        red:     '#cc0000',
        orange:  '#e87000',
        blue:    '#0050c8',
        muted:   '#767676',
        rule:    '#e8e4de',
        soft:    '#f5f4f1',
      },
      fontFamily: {
        serif: ["'Playfair Display'", 'Georgia', 'serif'],
        mono:  ["'DM Mono'", "'Courier New'", 'monospace'],
      },
    },
  },
  plugins: [],
};
