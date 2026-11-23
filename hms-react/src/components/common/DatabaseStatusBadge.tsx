import React from 'react';
import { Database, AlertCircle, RefreshCw } from 'lucide-react';

export type DbStatus = 'connected' | 'error' | 'checking';

interface DatabaseStatusBadgeProps {
  status: DbStatus;
  className?: string;
  onRetry?: () => void;
  compactOnMobile?: boolean;
}

export const DatabaseStatusBadge: React.FC<DatabaseStatusBadgeProps> = ({
  status,
  className = '',
  onRetry,
  compactOnMobile = true,
}) => {
  if (status === 'connected') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors duration-200 select-none bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 shadow-2xs ${className}`}
        title="MySQL 8.4 database connection is healthy and verified"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className={compactOnMobile ? 'hidden sm:inline' : 'inline'}>Database Connected</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors duration-200 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 shadow-2xs ${
          onRetry ? 'cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60' : 'cursor-default'
        } ${className}`}
        title="Database connection is currently unavailable. Click to retry."
      >
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
        <span className={compactOnMobile ? 'hidden sm:inline' : 'inline'}>Database Offline</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-200 select-none bg-slate-50 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#334155] shadow-2xs ${className}`}
      title="Checking database connection status..."
    >
      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400 dark:text-slate-500" />
      <span className={compactOnMobile ? 'hidden sm:inline' : 'inline'}>Checking...</span>
    </div>
  );
};
