"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

/** Light/dark switch, styled like a segmented toggle. Renders a neutral
 * placeholder until mounted so the server-rendered markup always matches
 * the client (theme is only known once next-themes reads localStorage). */
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === "dark" : true;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center w-14 h-8 rounded-full px-1 bg-dark-300 border border-light-600/30 cursor-pointer transition-colors shrink-0"
    >
      <span
        className={`absolute top-1 left-1 flex items-center justify-center size-6 rounded-full bg-primary-200 text-dark-100 transition-transform duration-200 ${
          isDark ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      </span>
    </button>
  );
};

export default ThemeToggle;
