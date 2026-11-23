import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
        isDark
          ? 'bg-[#1E293B] text-amber-400 hover:bg-[#182235] hover:text-amber-300 border border-[#334155] shadow-xs'
          : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 border border-slate-300 shadow-2xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45 text-amber-400" fill="currentColor" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 rotate-0 hover:-rotate-12" fill="currentColor" stroke="currentColor" strokeWidth={1.5} />
      )}
      {showLabel && (
        <span className="font-medium text-xs">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
