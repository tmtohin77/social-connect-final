/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // ✅ এই লাইনটা যোগ করা হয়েছে
  theme: {
    extend: {},
  },
  plugins: [],
}