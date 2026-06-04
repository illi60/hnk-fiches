import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: { DEFAULT: "#FF5722", hot: "#FF8A4C" },
        bone: "#DBDEE2",
        white2: "#F5F1EA",
        smoke: "#6C7079",
        blood: "#6B1F1A",
        ink: { 900: "#07080A", 800: "#0B0D11", 700: "#0E1116", 600: "#14171C", 500: "#15181E" },
      },
      fontFamily: {
        ui: ["Inter", "system-ui", "sans-serif"],
        display: ["Oswald", "Impact", "sans-serif"],
        serif: ["Cinzel", "Georgia", "serif"],
        jp: ['"Noto Serif JP"', '"Noto Sans JP"', "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
