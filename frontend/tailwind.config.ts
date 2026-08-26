import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF6EE",
        ink: "#22261F",
        ledger: {
          green: "#2F6F4E",
          "green-dark": "#234F38",
        },
        debt: "#B3492F",
        line: "#D8D0BC",
      },
      fontFamily: {
        mono: ["var(--font-space-mono)", "monospace"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
