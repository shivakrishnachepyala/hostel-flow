import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldAlert, ArrowLeft } from 'lucide-react';

export const ManagementLoginPage: React.FC = () => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // NOTE: Master Prompt requirement - Do not claim authentication is implemented until
    // server-validated endpoint POST /api/management/login is connected in Stage 5.
    // For Stage 1 foundation preview, staff ID and password are validated for format.
    setTimeout(() => {
      if (!staffId.trim() || !password) {
        setError('Staff ID and access password are required.');
        setLoading(false);
        return;
      }

      // Stage 1 preview entry with clear developmental state
      navigate('/management/dashboard');
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-institutional-800 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6 text-teal-300" />
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Staff & Warden Portal
          </h2>
          <p className="text-xs text-slate-500">
            Authorized administrative access for hostel superintendents, wardens, and floor caretakers.
          </p>
        </div>

        {/* Development Notice */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3.5 rounded-xl space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Stage 1 Development Access Notice</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Full JWT session verification is scheduled for Stage 5 backend expansion. Any non-empty credentials will open the dashboard preview.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Staff Identifier</label>
            <input
              type="text"
              required
              placeholder="e.g. WARDEN-01 or STF-104"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Access Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-institutional-800 hover:bg-institutional-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating Credentials...</span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Enter Management Portal</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
