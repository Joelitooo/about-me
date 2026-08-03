import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { trackEvent } from "../lib/analytics.js";

type Theme = "light" | "dark";
export type Palette = "paper" | "slate";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  palette: Palette;
  togglePalette: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getInitialPalette(): Palette {
  const attr = document.documentElement.getAttribute("data-palette");
  return attr === "slate" ? "slate" : "paper";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [palette, setPalette] = useState<Palette>(getInitialPalette);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem("palette", palette);
  }, [palette]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const togglePalette = useCallback(() => {
    setPalette((prev) => {
      const next = prev === "paper" ? "slate" : "paper";
      trackEvent("palette_change", { palette: next });
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, palette, togglePalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
