'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const themeContext = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !themeContext) {
    return (
      <button className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 text-sm font-medium">
        🌙 Dark
      </button>
    );
  }

  const { theme, toggleTheme } = themeContext;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium text-sm flex items-center gap-1.5"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
