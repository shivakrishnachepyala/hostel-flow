import React from 'react';
import { Menu, LogOut, ExternalLink, Database } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';

interface WardenTopbarProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
}

export const WardenTopbar: React.FC<WardenTopbarProps> = ({
  pageTitle,
  onOpenMobileMenu,
}) => {
  const { warden, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/management/login', { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'WA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#334155] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Left section: Breadcrumbs & Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#1E293B]"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] flex items-center gap-1.5 leading-none mb-1">
            <span>HostelFlow</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-600 dark:text-[#F1F5F9] font-bold">{pageTitle}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight leading-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right section: Theme Toggle, DB pill, Portal switch, Profile, Sign out */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Global Dark / Light Theme Toggle */}
        <ThemeToggle />

        {/* Status Pill */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>MySQL Live (hms)</span>
        </div>

        {/* Portal Switcher Button */}
        <Link
          to="/"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#182235] hover:text-slate-900 dark:hover:text-[#F1F5F9] transition-colors"
        >
          <span>Student Portal</span>
          <ExternalLink className="w-3 h-3 text-slate-400 dark:text-[#94A3B8]" />
        </Link>

        {/* Warden Profile Info */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-[#334155]">
          <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm border border-transparent dark:border-[#334155]">
            {getInitials(warden?.Warden_Name)}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-[#F1F5F9] leading-tight">
              {warden?.Warden_Name || 'Chief Warden'}
            </div>
            <div className="text-[10px] font-medium text-slate-400 dark:text-[#94A3B8]">
              {warden?.Role || 'Hostel Admin'} {warden?.Username ? `(@${warden.Username})` : ''}
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
          title="Sign out of administration session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
