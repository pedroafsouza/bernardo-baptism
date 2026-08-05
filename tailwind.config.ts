import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Pixelify Sans"', '"Trebuchet MS"', "system-ui", "sans-serif"],
      },
      colors: {
        pastel: {
          pink: "#f7c8d8",
          blue: "#bcd8f0",
          green: "#c8e6c9",
          yellow: "#fff3c4",
          purple: "#e1bee7",
          cream: "#fdf6ec",
        },
      },
    },
  },
  plugins: [],
};

export default config;
