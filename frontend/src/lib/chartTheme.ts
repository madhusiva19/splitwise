import { ThemePreference } from "@/lib/theme";

// Recharts renders raw SVG, so its axis/tooltip colors can't be Tailwind classes — each mode
// needs its own literal hex values mirroring the palette tokens in globals.css. Shared by every
// chart component so the two can't drift out of sync with each other.
export const CHART_THEME: Record<ThemePreference, { axisLine: string; tick: string; tooltipBg: string; tooltipBorder: string }> = {
  light: { axisLine: "#E6E3F0", tick: "#17161D", tooltipBg: "#FFFFFF", tooltipBorder: "#E6E3F0" },
  dark: { axisLine: "#2C2B35", tick: "#F5F3FA", tooltipBg: "#26252D", tooltipBorder: "#2C2B35" },
};

// The single-series trend bar color (matches the primary token).
export const CHART_COLOR: Record<ThemePreference, string> = {
  light: "#7C5CFC",
  dark: "#9178FF",
};

// Categorical palette for the spending-by-category breakdown — built from the primary/accent/
// positive/negative tokens plus a couple of complementary hues so all 8 ExpenseCategory values
// read as distinct bars.
export const CATEGORY_COLORS: Record<ThemePreference, string[]> = {
  light: ["#7C5CFC", "#FFC629", "#2EB67D", "#F0615A", "#4C9FE0", "#E4609C", "#5B3FD1", "#34B3A6"],
  dark: ["#9178FF", "#FFD666", "#34C98A", "#F46F67", "#6FB6EC", "#EE85B3", "#A594FF", "#4ECDC0"],
};
