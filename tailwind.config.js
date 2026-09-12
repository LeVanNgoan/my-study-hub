/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter Variable', 'Inter', 'Segoe UI', 'sans-serif'] },
      colors: {
        ink: '#0f172a',
        shell: '#f4f7fb',
        brand: { 50:'#eef6ff',100:'#d9ebff',200:'#bcdcff',300:'#91c5ff',400:'#5aa6ff',500:'#2f80ed',600:'#1967d2',700:'#1554ad',800:'#16498c',900:'#173f73' }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15,23,42,.07)',
        lift: '0 18px 50px rgba(15,23,42,.12)'
      }
    }
  },
  plugins: []
}
