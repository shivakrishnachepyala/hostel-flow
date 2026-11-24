import React from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';

interface FloorSelectorProps {
  selectedFloor: number | 'all';
  onSelectFloor: (floor: number | 'all') => void;
  cutawayMode: boolean;
  onToggleCutaway: () => void;
  floorStats: {
    floor: number;
    label: string;
    totalRooms: number;
    availableBeds: number;
  }[];
}

export const FloorSelector: React.FC<FloorSelectorProps> = ({
  selectedFloor,
  onSelectFloor,
  cutawayMode,
  onToggleCutaway,
  floorStats,
}) => {
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-4 shadow-sm space-y-3.5 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#334155] pb-3">
        <div className="flex items-center gap-2 text-slate-800 dark:text-[#F1F5F9] font-display font-semibold text-sm">
          <Layers className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
          <span>Floor Architecture & Storey Navigation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
            {selectedFloor === 'all' ? 'All Floors Visible' : `Filtering Storey ${selectedFloor}`}
          </span>
          <button
            onClick={onToggleCutaway}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              cutawayMode
                ? 'bg-institutional-50 dark:bg-sky-950/60 text-institutional-700 dark:text-sky-300 border-institutional-200 dark:border-sky-800/60'
                : 'bg-slate-50 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#182235]'
            }`}
            title="Cutaway view hides the roof to inspect top-floor corridors"
          >
            {cutawayMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{cutawayMode ? 'Roof Hidden' : 'Cutaway View'}</span>
          </button>
        </div>
      </div>

      {/* Responsive Floor Buttons Grid (Never squishes or overlaps badges) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        <button
          onClick={() => onSelectFloor('all')}
          className={`min-w-[130px] p-3 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
            selectedFloor === 'all'
              ? 'bg-institutional-900 dark:bg-sky-600 text-white border-institutional-900 dark:border-sky-600 shadow-sm'
              : 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#182235]'
          }`}
        >
          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Whole Building</div>
          <div className="font-bold text-sm mt-0.5">All Storeys</div>
        </button>

        {floorStats.map((stat) => {
          const isSelected = selectedFloor === stat.floor;
          return (
            <button
              key={stat.floor}
              onClick={() => onSelectFloor(stat.floor)}
              className={`min-w-[130px] p-3 text-xs font-medium rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-institutional-700 dark:bg-sky-600 text-white border-institutional-700 dark:border-sky-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#182235]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span className="font-bold text-sm truncate">{stat.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0 ${
                    isSelected
                      ? 'bg-institutional-800 dark:bg-sky-700 text-teal-300'
                      : stat.availableBeds > 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-[#94A3B8]'
                  }`}
                >
                  {stat.availableBeds} beds free
                </span>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-1">
                {stat.totalRooms} rooms configured
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
