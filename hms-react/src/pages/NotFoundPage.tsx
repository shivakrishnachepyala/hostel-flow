import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
        404
      </div>
      <h1 className="text-2xl font-bold font-display text-slate-900">
        Page Not Found
      </h1>
      <p className="text-xs text-slate-500 max-w-sm">
        The requested residential portal section does not exist or has been relocated.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-institutional-800 text-white rounded-lg text-xs font-semibold hover:bg-institutional-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Homepage</span>
      </Link>
    </div>
  );
};
