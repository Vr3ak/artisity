export type Theme = "light" | "dark" | "system";

// Sets .dark/.light on <html> from localStorage "theme", falling back to the system setting,
// and re-applies when the system setting changes. Injected before paint by app/layout.tsx
// (next/script beforeInteractive, so React never renders the <script> itself).
export const THEME_SCRIPT = `(() => {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    let t = null;
    try { t = localStorage.getItem("theme"); } catch {}
    const dark = t === "dark" || (t !== "light" && mq.matches);
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    root.style.colorScheme = dark ? "dark" : "light";
  };
  apply();
  mq.addEventListener("change", apply);
  window.__applyTheme = apply;
})()`;
