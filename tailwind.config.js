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
        // Police de corps : Lora — un serif moderne plus lisible que
        // Cormorant Garamond à petite taille, tout en gardant le ton
        // élégant et littéraire du jeu.
        serif: ["Lora", "'Times New Roman'", "serif"],
        // Police décorative — utilisée pour les titres, codes de partie,
        // noms de rôles. Cormorant Garamond garde son rôle stylé sur les
        // grandes typos où sa finesse fait sens.
        display: ["'Cormorant Garamond'", "Lora", "'Times New Roman'", "serif"],
      },
    },
  },
  plugins: [],
};
