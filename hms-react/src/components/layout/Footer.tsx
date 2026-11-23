import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 dark:bg-[#070D18] text-slate-300 dark:text-[#94A3B8] border-t border-slate-800 dark:border-[#334155] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Institutional Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500 text-slate-900 flex items-center justify-center font-display font-bold text-lg">
                H
              </div>
              <div>
                <span className="font-display font-bold text-white tracking-tight text-base block">
                  HostelPortal
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
                  Campus Housing Management
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-[#94A3B8] leading-relaxed">
              Official university portal for hostel enrollment, 3D room exploration, occupancy tracking, and parental guest housing reservations.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400 bg-slate-800/80 dark:bg-[#111827] px-3 py-1.5 rounded border border-slate-700/60 dark:border-[#334155]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Institutional Access & Privacy Compliant</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-display">
              Accommodation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/explorer" className="hover:text-teal-400 transition-colors">
                  Interactive 3D Explorer
                </Link>
              </li>
              <li>
                <Link to="/availability" className="hover:text-teal-400 transition-colors">
                  Live Bed Availability
                </Link>
              </li>
              <li>
                <Link to="/enrollment" className="hover:text-teal-400 transition-colors">
                  Student Enrollment Form
                </Link>
              </li>
              <li>
                <Link to="/guest-accommodation" className="hover:text-teal-400 transition-colors">
                  Parent & Guest Booking
                </Link>
              </li>
              <li>
                <Link to="/management/login" className="hover:text-teal-400 transition-colors">
                  Staff & Warden Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Hostel Blocks */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-display">
              Hostel Blocks
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 dark:text-[#94A3B8]">
              <li className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Aryabhatta Block (Boys Residence)</span>
              </li>
              <li className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Gargi Block (Girls Residence)</span>
              </li>
              <li className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Visitor & Guest Suites (South Wing)</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Helpdesk */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-display">
              Warden Office & Assistance
            </h4>
            <div className="space-y-2 text-xs text-slate-400 dark:text-[#94A3B8]">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <span>North Campus, Central University Housing Block, Office #104</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>+91 11-2766-0000 / Ext: 401</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>warden.chief@university.edu</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 dark:border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} University Housing Board. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/contact" className="hover:text-slate-400 transition-colors">Support Helpline</Link>
            <Link to="/management/login" className="hover:text-slate-400 transition-colors">Management Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
