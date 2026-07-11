import { useEffect, useState, useCallback } from "react";

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("wintozo_dark") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("wintozo_dark", String(darkMode));
  }, [darkMode]);

  const toggle = useCallback(() => setDarkMode((v) => !v), []);

  return { darkMode, setDarkMode, toggle };
}
