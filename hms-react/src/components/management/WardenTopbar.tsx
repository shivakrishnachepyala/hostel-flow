import React from 'react';
import { Menu, LogOut, ExternalLink, Database } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left section: Breadcrumbs & Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 leading-none mb-1">
            <span>HostelFlow</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 font-bold">{pageTitle}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 tracking-tight leading-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right section: DB pill, Portal switch, Profile, Sign out */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Status Pill */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Database className="w-3 h-3 text-emerald-600" />
          <span>MySQL Live (hms)</span>
        </div>

        {/* Portal Switcher Button */}
        <Link
          to="/"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span>Student Portal</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </Link>

        {/* Warden Profile Info */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
            {getInitials(warden?.Warden_Name)}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {warden?.Warden_Name || 'Chief Warden'}
            </div>
            <div className="text-[10px] font-medium text-slate-400">
              {warden?.Role || 'Hostel Admin'} {warden?.Username ? `(@${warden.Username})` : ''}
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer"
          title="Sign out of administration session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
