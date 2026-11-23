import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const ManagementLoginPage: React.FC = () => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/management/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!staffId.trim() || !password) {
      setError('Staff identifier/username and password are required.');
      return;
    }

    setLoading(true);

    try {
      await login(staffId.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-[#0B1120] transition-colors duration-200 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-8 rounded-2xl shadow-sm transition-colors duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-institutional-800 dark:bg-sky-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6 text-teal-300 dark:text-sky-100" />
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Staff & Warden Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
            Authorized administrative access for hostel superintendents, wardens, and floor caretakers.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-[#94A3B8] font-semibold mb-1">
              Staff Identifier / Username
            </label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              placeholder="e.g. warden_admin"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:bg-white dark:focus:bg-[#182235]"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-[#94A3B8] font-semibold mb-1">
              Access Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:bg-white dark:focus:bg-[#182235] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#F1F5F9] cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-institutional-800 dark:bg-sky-600 hover:bg-institutional-900 dark:hover:bg-sky-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In to Management'}
          </button>
        </form>

        <div className="pt-2 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F1F5F9]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Campus Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
