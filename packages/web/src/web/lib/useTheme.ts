import { useState, useEffect } from "react";
import { getTheme, setTheme, applyTheme, type Theme } from "./store";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return { theme, toggle, isDark: theme === "dark" };
}
