import React from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Bed as BedIcon, 
  Users, 
  Wifi, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { IllustrativeRoom } from '../../data/illustrativeHostel';

interface RoomDetailModalProps {
  room: IllustrativeRoom | null;
  onClose: () => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, onClose }) => {
  if (!room) return null;

  const facilitiesList = room.Facilities ? room.Facilities.split(',').map((f: string) => f.trim()) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-[#111827] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-[#334155] transition-colors duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with status badge */}
        <div className="bg-slate-900 dark:bg-[#070D18] text-white p-5 flex items-start justify-between relative border-b border-slate-800 dark:border-[#334155]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-teal-400">
                Floor {room.Floor} • {room.Room_Type} Accommodation
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  room.status === 'available'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : room.status === 'partially-occupied'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : room.status === 'fully-occupied'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                }`}
              >
                {room.status.replace('-', ' ')}
              </span>
            </div>
            <h2 className="text-2xl font-bold font-display tracking-tight text-white">
              Room {room.Room_Number}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Aryabhatta Block • University North Campus</p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 dark:hover:bg-[#1E293B] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Bed Occupancy Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-2.5">
              Bed Capacity & Allocation
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] p-3 rounded-xl">
                <div className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Total Beds</div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] font-display mt-0.5">
                  {room.Capacity}
                </div>
              </div>
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 p-3 rounded-xl">
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Available</div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-display mt-0.5">
                  {room.availableBeds}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] p-3 rounded-xl">
                <div className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Occupied</div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] font-display mt-0.5">
                  {room.occupiedBeds}
                </div>
              </div>
            </div>
          </div>

          {/* Room Specs & Facilities */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-2.5">
              Room Features & Amenities
            </h3>
            <div className="flex flex-wrap gap-2">
              {facilitiesList.map((facility: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] rounded-lg text-xs font-medium border border-slate-200 dark:border-[#334155]"
                >
                  <Wifi className="w-3 h-3 text-institutional-600 dark:text-sky-400" />
                  <span>{facility}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Layout specs */}
          {room.Layout_Data && (
            <div className="bg-institutional-50/70 dark:bg-[#182235] border border-institutional-100 dark:border-[#334155] p-3.5 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-institutional-900 dark:text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                <span>Architectural Layout Notes</span>
              </div>
              <p className="text-institutional-700 dark:text-[#94A3B8]">{room.Layout_Data}</p>
            </div>
          )}

          {/* Prototype Notice */}
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Illustrative Model Note:</span> Room 3D coordinates and occupancy counts are illustrative demonstration data. Formal allocation requires completed enrollment review.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-[#182235] border-t border-slate-100 dark:border-[#334155] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] hover:bg-slate-200/60 dark:hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
          
          <Link
            to="/enrollment"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 bg-institutional-800 dark:bg-sky-600 hover:bg-institutional-900 dark:hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <span>Apply For This Room Type</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
