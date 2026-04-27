/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.ts",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Cormorant Garamond'", "'Times New Roman'", "serif"],
      },
    },
  },
  plugins: [],
};
