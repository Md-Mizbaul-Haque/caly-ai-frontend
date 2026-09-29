/** @type {import('tailwindcss').Config} */
const tokens = require('./src/theme/tokens.js');
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        ink: tokens.colors.ink,
        muted: tokens.colors.muted,
        cream: tokens.colors.cream,
        success: tokens.colors.success,
      },
      borderRadius: {
        card: `${tokens.radii.card}px`,
        btn: `${tokens.radii.button}px`,
      },
    },
  },
  plugins: [],
};
