import React from 'react';
import { Mail, Phone, MapPin, Clock, Building2, HelpCircle } from 'lucide-react';

export const ContactPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-2 pb-2 border-b border-slate-200">
        <span className="text-xs font-bold uppercase tracking-wider text-institutional-600 bg-institutional-50 px-3 py-1 rounded-full border border-institutional-200">
          Support & Inquiries
        </span>
        <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
          Hostel Administration & Warden Office
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Get in touch with residential wardens, accommodation counselors, and facility superintendents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-institutional-600" />
            <span>Chief Warden's Office</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>Room 104, Central Administrative Complex, North Campus</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>+91 11-2766-0000 / Ext: 401</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>warden.chief@university.edu</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Monday to Friday: 09:30 AM – 05:00 PM</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-institutional-600" />
            <span>Admissions & Guest Desk</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>Hostel Admissions Reception, Aryabhatta Foyer</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>+91 11-2766-0001 (Hostel Admissions Helpline)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>hostel.admissions@university.edu</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Saturday Public Hours: 10:00 AM – 01:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
