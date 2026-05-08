"use client";

import { useEffect } from "react";

/**
 * Setter .dark-klassen på <html> basert på:
 * 1. Lagret preferanse i localStorage ("qlumio-theme")
 * 2. Systempreferanse (prefers-color-scheme: dark)
 *
 * Monteres én gang i root layout – trenger ikke re-render.
 */
export default function ThemeProvider() {
  useEffect(() => {
    const stored = localStorage.getItem("qlumio-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return null;
}

/** Veksle mellom lyst og mørkt tema og lagre valget. */
export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("qlumio-theme", isDark ? "dark" : "light");
  return isDark;
}
