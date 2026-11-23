import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Box, 
  CheckCircle2, 
  Users, 
  FileText, 
  Lock, 
  Menu, 
  X,
  GraduationCap
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { DatabaseStatusBadge } from '../common/DatabaseStatusBadge';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const location = useLocation();
  const { student } = useStudentAuth();

  const checkHealth = () => {
    setDbStatus('checking');
    apiClient.get('/health')
      .then((res) => {
        if (res.data?.status === 'success' || res.data?.status === 'ok' || res.data?.status === 'healthy') {
          setDbStatus('connected');
        } else {
          setDbStatus('error');
        }
      })
      .catch(() => {
        setDbStatus('error');
      });
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const navLinks = [
    { label: 'Home', path: '/', icon: Building2 },
    { label: '3D Explorer', path: '/explorer', icon: Box, badge: 'Interactive' },
    { label: 'Room Availability', path: '/availability', icon: CheckCircle2 },
    { label: 'Guest Stay', path: '/guest-accommodation', icon: Users },
    { label: 'Enrollment', path: '/enrollment', icon: FileText },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#334155] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-institutional-800 dark:bg-sky-600 text-white flex items-center justify-center font-display font-bold text-xl shadow-sm transition-transform group-hover:scale-105">
              H
            </div>
            <div>
              <span className="font-display font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight text-lg block leading-tight">
                HostelPortal
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium block">
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
                      ? 'text-institutional-700 dark:text-sky-300 bg-institutional-50/80 dark:bg-[#182235] font-semibold'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] hover:bg-slate-100/60 dark:hover:bg-[#182235]/60'
                  }`}
                >
                  <link.icon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded-full border border-teal-200 dark:border-teal-800">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right Action: Database Status, Theme Toggle, Student Portal & Management Portal */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Database Connection Indicator */}
            <DatabaseStatusBadge status={dbStatus} onRetry={checkHealth} />

            {/* Theme Toggle (Sun/Moon) */}
            <ThemeToggle />

            {/* Student Portal Action Button */}
            {student ? (
              <Link
                to="/student/portal"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-institutional-800 dark:bg-sky-600 text-white hover:bg-institutional-900 dark:hover:bg-sky-500 shadow-sm transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5 text-institutional-200" />
                <span>Portal ({student.Name.split(' ')[0]})</span>
              </Link>
            ) : (
              <Link
                to="/student/portal"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-institutional-50 dark:bg-[#1E293B] text-institutional-800 dark:text-sky-300 hover:bg-institutional-100 dark:hover:bg-[#182235] border border-institutional-200 dark:border-[#334155] transition-colors shadow-2xs"
              >
                <GraduationCap className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                <span>Student Portal</span>
              </Link>
            )}

            {/* Staff / Management Portal Button */}
            <Link
              to="/management/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#182235] shadow-2xs transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Staff</span>
            </Link>
          </div>

          {/* Mobile header controls: Exactly ONE DatabaseStatusBadge, ONE ThemeToggle and the Menu toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <DatabaseStatusBadge status={dbStatus} onRetry={checkHealth} compactOnMobile={true} />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#182235] focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0B1120] px-4 pt-3 pb-6 space-y-2 shadow-lg">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-institutional-50 dark:bg-[#182235] text-institutional-800 dark:text-sky-300 font-semibold'
                    : 'text-slate-700 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#182235]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <link.icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-100 dark:border-[#334155] space-y-2">
            <Link
              to="/student/portal"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-institutional-800 dark:bg-sky-600 text-white font-medium text-sm shadow-sm"
            >
              <GraduationCap className="w-4 h-4" />
              <span>{student ? `Student Portal (${student.Name})` : 'Student Portal Login'}</span>
            </Link>
            <Link
              to="/management/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-[#334155] text-slate-700 dark:text-[#F1F5F9] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#182235] font-medium text-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Staff & Warden Portal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
