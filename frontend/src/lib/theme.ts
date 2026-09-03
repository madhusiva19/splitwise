export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "splitwise:theme-change";

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function getSystemTheme(): ThemePreference {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// The theme actually in effect: an explicit user choice, falling back to the OS preference.
export function getResolvedTheme(): ThemePreference {
  return getStoredThemePreference() ?? getSystemTheme();
}

export function applyTheme(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, preference);
  document.documentElement.setAttribute("data-theme", preference);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

// Notifies on both explicit theme changes (this tab) and OS-level scheme changes,
// so every mounted consumer (e.g. the nav toggle and the chart) stays in sync.
export function subscribeToThemeChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    media.removeEventListener("change", callback);
  };
}
