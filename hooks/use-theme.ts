"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type Theme } from "@/lib/theme";

// Light/Dark/System choice in localStorage "theme"; THEME_SCRIPT (lib/theme.ts) applies it to <html>.
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    read,
    () => "system" as Theme,
  );

  const setTheme = useCallback((next: Theme) => {
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
    (window as Window & { __applyTheme?: () => void }).__applyTheme?.();
    listeners.forEach((l) => l());
  }, []);

  return { theme, setTheme };
}
