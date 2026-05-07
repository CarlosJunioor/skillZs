"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "skillzs-theme";
const THEME_EVENT = "skillzs-theme-change";

type Theme = "light" | "dark";

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.dataset.theme as Theme) || "light";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_EVENT, onStoreChange);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore quota / privacy mode
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      onClick={toggle}
      className="tag-pill"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`switch to ${theme === "dark" ? "light" : "dark"}`}
    >
      {theme === "dark" ? "\u2600 light" : "\u263E dark"}
    </button>
  );
}
