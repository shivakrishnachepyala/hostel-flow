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
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-slate-800 font-display font-semibold text-sm">
          <Layers className="w-4 h-4 text-institutional-600" />
          <span>Floor Navigation</span>
        </div>
        <button
          onClick={onToggleCutaway}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
            cutawayMode
              ? 'bg-institutional-50 text-institutional-700 border-institutional-200'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
          className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all ${
            selectedFloor === 'all'
              ? 'bg-institutional-900 text-white border-institutional-900 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Overview</div>
          <div className="font-bold text-sm">All Floors</div>
        </button>

        {floorStats.map((stat) => {
          const isSelected = selectedFloor === stat.floor;
          return (
            <button
              key={stat.floor}
              onClick={() => onSelectFloor(stat.floor)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-institutional-700 text-white border-institutional-700 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{stat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected
                      ? 'bg-institutional-800 text-teal-300'
                      : stat.availableBeds > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {stat.availableBeds} beds free
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {stat.totalRooms} rooms configured
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
