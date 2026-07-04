/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.ejs",
    "./server.js",
    "./src/**/*.js",
    "./public/**/*.html",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        pingSlow: {
          '75%, 100%': { transform: 'scale(5)', opacity: '0' }
        }
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'ping-slow': 'pingSlow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite'
      }
    },
  },
  plugins: [],
}
