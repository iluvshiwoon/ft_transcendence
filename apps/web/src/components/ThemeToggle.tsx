/**
 * ThemeToggle — React island, mounted with `client:only="react"`.
 *
 * Why client:only and not client:load?
 *   The current theme lives on document.documentElement.classList, which only
 *   exists in the browser. Server-side rendering would have to guess, causing
 *   a hydration mismatch. Going client-only skips SSR for this component and
 *   the parent layout reserves the same-sized slot, so there's no layout shift.
 *
 * The bootstrap script in RootLayout runs *before* this hydrates and sets the
 * <html> class. We just read what's already there.
 */

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readCurrentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(next: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(next);
  root.style.colorScheme = next;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    // useState initializer runs on first render only — safe to touch DOM since this is client-only.
    if (typeof document === "undefined") return "light";
    return readCurrentTheme();
  });

  // When the user has never explicitly toggled, follow the OS preference live.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handle = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("theme") === null) {
        const next: Theme = e.matches ? "dark" : "light";
        applyTheme(next);
        setTheme(next);
      }
    };
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  }

  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full text-foreground transition-all duration-75 ease-linear hover:bg-muted active:scale-[0.96]"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
