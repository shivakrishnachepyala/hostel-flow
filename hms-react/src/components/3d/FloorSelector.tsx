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
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-4 shadow-sm space-y-4 transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
        <div className="flex items-center gap-2 text-slate-800 dark:text-[#F1F5F9] font-display font-semibold text-sm">
          <Layers className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
          <span>Floor Navigation</span>
        </div>
        <button
          onClick={onToggleCutaway}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
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

      {/* Floor Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => onSelectFloor('all')}
          className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
            selectedFloor === 'all'
              ? 'bg-institutional-900 dark:bg-sky-600 text-white border-institutional-900 dark:border-sky-600 shadow-sm'
              : 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#182235]'
          }`}
        >
          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Overview</div>
          <div className="font-bold text-sm">All Floors</div>
        </button>

        {floorStats.map((stat) => {
          const isSelected = selectedFloor === stat.floor;
          return (
            <button
              key={stat.floor}
              onClick={() => onSelectFloor(stat.floor)}
              className={`px-3 py-2 text-xs font-medium rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-institutional-700 dark:bg-sky-600 text-white border-institutional-700 dark:border-sky-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#182235]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{stat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
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
              <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">
                {stat.totalRooms} rooms configured
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
