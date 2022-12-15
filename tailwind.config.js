/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark': '#1C1D22',
        'gray':'#7B7B7E',
        'primary':'#D8464E',
        'graybg':'#2B2A2E'
      },
    },
    fontFamily: {
      'custom': ['roboto-mono', 'sans-serif'],
  },
  },
  plugins: [],
}
