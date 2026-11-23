import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Lock, 
  User, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';
import { useStudentAuth } from '../context/StudentAuthContext';

export const StudentLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, networkStatus } = useStudentAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/student/portal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your student credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setIdentifier('rahul@example.com');
    setPassword('Student123!');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-[#0B1120] transition-colors duration-200">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-institutional-800 dark:bg-sky-600 text-white rounded-2xl shadow-md">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Student Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] max-w-xs mx-auto">
            Log in to manage your hostel room, mess subscriptions, payments, and campus tickets.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors duration-200">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Student ID / College Email / Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="student-identifier"
                  name="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. rahul@example.com or 1001"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:bg-white dark:focus:bg-[#182235] focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="student-password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:bg-white dark:focus:bg-[#182235] focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-institutional-800 dark:bg-sky-600 hover:bg-institutional-900 dark:hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo student credentials pill */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#334155]">
            <div className="p-3 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155] flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-700 dark:text-[#F1F5F9] block">Pre-seeded Student Account:</span>
                <span className="text-slate-500 dark:text-[#94A3B8] font-mono text-[11px]">rahul@example.com • Student123!</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-2.5 py-1 text-[11px] font-semibold text-institutional-700 dark:text-sky-300 bg-institutional-50 dark:bg-[#1E293B] hover:bg-institutional-100 dark:hover:bg-[#111827] rounded-lg border border-institutional-200 dark:border-[#334155] transition-colors cursor-pointer"
              >
                Auto Fill
              </button>
            </div>
          </div>

          {/* Links */}
          <div className="pt-2 text-center space-y-2 text-xs">
            <p className="text-slate-500 dark:text-[#94A3B8]">
              Not registered for hostel yet?{' '}
              <Link to="/enrollment" className="font-semibold text-institutional-700 dark:text-sky-400 hover:underline">
                Complete Enrollment Application
              </Link>
            </p>
            <p className="text-slate-400 dark:text-[#64748B] text-[11px]">
              Hostel Warden or Staff?{' '}
              <Link to="/management/login" className="text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] font-medium underline">
                Management Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
