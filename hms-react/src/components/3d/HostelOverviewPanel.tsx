import React from 'react';
import { CampusHostelData, CampusBlockSummary } from '../../utils/explorerLayout';
import { 
  Building2, 
  Layers, 
  DoorOpen, 
  CheckCircle2, 
  ShieldCheck, 
  MapPin, 
  ArrowRight,
  TrendingUp,
  Maximize2
} from 'lucide-react';

export interface HostelOverviewPanelProps {
  hostel: CampusHostelData | null;
  onEnterHostel: (hostel: CampusHostelData) => void;
  onSelectBlock: (hostel: CampusHostelData, block: CampusBlockSummary) => void;
}

export const HostelOverviewPanel: React.FC<HostelOverviewPanelProps> = ({
  hostel,
  onEnterHostel,
  onSelectBlock,
}) => {
  if (!hostel) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 shadow-sm text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-[#1E293B] flex items-center justify-center text-slate-400">
          <Building2 className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-[#F1F5F9]">
            Select a Hostel Building
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-xs mx-auto mt-1">
            Click any 3D hostel building on the campus quadrangle to inspect its architectural profile, room inventory, and physical bed occupancy.
          </p>
        </div>
      </div>
    );
  }

  const isGirls = (hostel.Hostel_Type || '').toLowerCase() === 'girls';

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 sm:space-y-5 animate-in fade-in duration-200 overflow-hidden">
      {/* Header Profile */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#334155]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                isGirls
                  ? 'bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {hostel.Hostel_Type} Accommodation
            </span>
            <span className="text-xs text-slate-400 dark:text-[#64748B] flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3" />
              <span>{hostel.Location || 'Main Campus'}</span>
            </span>
          </div>
          <h2 className="text-xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] truncate">
            {hostel.Hostel_Name}
          </h2>
        </div>

        <button
          onClick={() => onEnterHostel(hostel)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-[#1E293B] hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-600 dark:text-[#94A3B8] hover:text-sky-600 dark:hover:text-sky-400 transition-colors border border-slate-200 dark:border-[#334155] cursor-pointer shrink-0"
          title="Enter 3D Building View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Aggregate Reconciled Inventory Metrics */}
      <div 
        className="grid grid-cols-2 gap-2 sm:gap-2.5 text-xs"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))'
        }}
      >
        <div className="bg-slate-50 dark:bg-[#182235] p-3 rounded-xl border border-slate-200/80 dark:border-[#334155] flex flex-col justify-between min-w-0">
          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase font-bold flex items-center gap-1.5 truncate">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Blocks</span>
          </div>
          <div className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] mt-1 truncate">
            {hostel.total_blocks}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#182235] p-3 rounded-xl border border-slate-200/80 dark:border-[#334155] flex flex-col justify-between min-w-0">
          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase font-bold flex items-center gap-1.5 truncate">
            <DoorOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Rooms</span>
          </div>
          <div className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] mt-1 truncate">
            {hostel.total_rooms}
          </div>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 flex flex-col justify-between min-w-0">
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Free Beds</span>
          </div>
          <div className="text-lg font-bold font-display text-emerald-800 dark:text-emerald-300 mt-1 flex items-baseline flex-wrap gap-x-1 min-w-0">
            <span>{hostel.available_beds}</span>
            <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              / {hostel.total_beds}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#182235] p-3 rounded-xl border border-slate-200/80 dark:border-[#334155] flex flex-col justify-between min-w-0">
          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase font-bold flex items-center gap-1.5 truncate">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Occupancy</span>
          </div>
          <div className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] mt-1 truncate">
            {hostel.occupancy_rate}%
          </div>
        </div>
      </div>

      {/* Structural Blocks Breakdown List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider">
          <span>Building Blocks ({hostel.blocks?.length ?? 0})</span>
          <span className="text-[11px] text-slate-400 lowercase font-normal">click to enter interior</span>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {hostel.blocks?.map((block) => (
            <div
              key={block.Block_ID}
              onClick={() => onSelectBlock(hostel, block)}
              className="p-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#182235] hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                    {block.Block_Name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-[#94A3B8] shrink-0 font-medium">
                    {block.Gender}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5 leading-snug">
                  <span>{block.total_rooms} Rooms</span>
                  <span className="mx-1">•</span>
                  <span>{block.total_beds} Beds</span>
                  <span className="mx-1">•</span>
                  <span>{block.floors?.length ?? 1} Storeys</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2.5">
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {block.available_beds} free
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-[#64748B] whitespace-nowrap">
                    {block.occupied_beds} occ
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={() => onEnterHostel(hostel)}
        className="w-full py-3 px-4 rounded-xl bg-institutional-900 dark:bg-sky-600 hover:bg-institutional-800 dark:hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
      >
        <span>Inspect 3D Block Interior</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#334155] text-[11px] text-slate-500 dark:text-[#94A3B8]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <span>Privacy-Safe: Aggregated live bed inventory. Zero student PII is exposed.</span>
      </div>
    </div>
  );
};
