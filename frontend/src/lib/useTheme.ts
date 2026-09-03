"use client";

import { useEffect, useState } from "react";
import { applyTheme, getResolvedTheme, subscribeToThemeChange, ThemePreference } from "./theme";

export function useTheme(): { theme: ThemePreference; toggleTheme: () => void } {
  const [theme, setTheme] = useState<ThemePreference>("light");

  useEffect(() => {
    setTheme(getResolvedTheme());
    return subscribeToThemeChange(() => setTheme(getResolvedTheme()));
  }, []);

  function toggleTheme() {
    applyTheme(getResolvedTheme() === "dark" ? "light" : "dark");
  }

  return { theme, toggleTheme };
}
