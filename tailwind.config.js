/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
      colors: {
        aqi: {
          good: "#22C55E",
          moderate: "#EAB308",
          poor: "#F97316",
          unhealthy: "#EF4444",
          severe: "#A855F7",
          hazardous: "#7F1D1D",
        },
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.35)",
        glow: "0 0 0 1px rgba(148, 163, 184, 0.18), 0 25px 70px rgba(8, 47, 73, 0.35)",
      },
    },
  },
  plugins: [],
};
