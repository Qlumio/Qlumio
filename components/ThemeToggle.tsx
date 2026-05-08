"use client";

import { useState, useEffect } from "react";
import { toggleTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Sync initial state etter at ThemeProvider har kjørt
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function handleToggle() {
    const isDark = toggleTheme();
    setDark(isDark);
  }

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors text-xs font-medium"
      title={dark ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
    >
      {dark ? (
        /* Sol */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        /* Måne */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
