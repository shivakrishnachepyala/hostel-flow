import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Box, 
  CheckCircle2, 
  Users, 
  FileText, 
  HelpCircle, 
  Lock, 
  Menu, 
  X,
  Activity
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    apiClient.get('/health')
      .then((res) => {
        if (mounted && (res.data?.status === 'success' || res.data?.status === 'ok')) {
          setDbStatus('connected');
        } else if (mounted) {
          setDbStatus('error');
        }
      })
      .catch(() => {
        if (mounted) setDbStatus('error');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const navLinks = [
    { label: 'Home', path: '/', icon: Building2 },
    { label: '3D Explorer', path: '/explorer', icon: Box, badge: 'Interactive' },
    { label: 'Room Availability', path: '/availability', icon: CheckCircle2 },
    { label: 'Guest Stay', path: '/guest-accommodation', icon: Users },
    { label: 'Enrollment', path: '/enrollment', icon: FileText },
    { label: 'Contact', path: '/contact', icon: HelpCircle },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-institutional-800 text-white flex items-center justify-center font-display font-bold text-xl shadow-sm transition-transform group-hover:scale-105">
              H
            </div>
            <div>
              <span className="font-display font-bold text-slate-900 tracking-tight text-lg block leading-tight">
                HostelPortal
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                University Accommodation
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                    active
                      ? 'text-institutional-700 bg-institutional-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <link.icon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-teal-100 text-teal-800 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: DB Status & Management Portal */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Live Availability Verified Indicator */}
            {dbStatus === 'connected' ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200"
                title="Verified Live Availability from MySQL 8.4 database"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Availability</span>
              </div>
            ) : dbStatus === 'error' ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200"
                title="Backend API connection is currently unavailable"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Availability Offline</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-500 border-slate-200"
                title="Verifying database connection..."
              >
                <Activity className="w-3 h-3 animate-pulse" />
                <span>Checking Live DB...</span>
              </div>
            )}

            {/* Management Portal Button */}
            <Link
              to="/management/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Staff Login</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-institutional-50 text-institutional-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <link.icon className="w-4 h-4 text-slate-400" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-teal-100 text-teal-800 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-100">
            <Link
              to="/management/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-institutional-800 text-white font-medium text-sm shadow-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Management & Warden Portal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
