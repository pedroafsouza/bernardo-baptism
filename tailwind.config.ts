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
          // The pastels are backgrounds. Text and icons in the same family need
          // a shade that actually reads on cream, so they get their own.
          plum: "#6a4b7a",
          moss: "#4f6b50",
        },
      },
    },
  },
  plugins: [],
};

export default config;
