import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        ledger: {
          green: "rgb(var(--color-ledger-green) / <alpha-value>)",
          "green-dark": "rgb(var(--color-ledger-green-dark) / <alpha-value>)",
        },
        debt: "rgb(var(--color-debt) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
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
