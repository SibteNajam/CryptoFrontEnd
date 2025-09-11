/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // This is REQUIRED for the theme toggle to work
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Add any other directories where you use Tailwind classes
  ],
  theme: {
    extend: {
     
    },
  },
  plugins: [],
}