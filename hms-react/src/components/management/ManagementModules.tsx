import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { 
  Hostel, 
  HostelBlock, 
  Room, 
  Bed, 
  Student, 
  StudentPreferences, 
  RoomAllocation, 
  RoommateMatch, 
  Payment 
} from '../../types';
import { Building3D } from '../3d/Building3D';
import { FloorSelector } from '../3d/FloorSelector';
import { RoomDetailModal } from '../3d/RoomDetailModal';
import { ILLUSTRATIVE_ROOMS, IllustrativeRoom } from '../../data/illustrativeHostel';

import { ModelManagementSection } from './ModelManagementSection';
import { GuestManagementSection } from './GuestManagementSection';
import { RoommateMatchesSection } from './RoommateMatchesSection';
import { HostelsSection } from './HostelsSection';
import { BlocksSection } from './BlocksSection';
import { RoomsSection } from './RoomsSection';
import { BedsSection } from './BedsSection';
import { StudentsSection } from './StudentsSection';
import { AllocationsSection } from './AllocationsSection';
import { PreferencesSection } from './PreferencesSection';
import { PaymentsSection } from './PaymentsSection';

interface ModulesProps {
  tab: string;
  hostels: Hostel[];
  blocks: HostelBlock[];
  rooms: Room[];
  beds: Bed[];
  students: Student[];
  preferences: StudentPreferences[];
  allocations: RoomAllocation[];
  matches: RoommateMatch[];
  payments: Payment[];
  onRefresh: () => void;
}

export const ManagementModules: React.FC<ModulesProps> = ({
  tab,
  hostels,
  blocks,
  rooms,
  beds,
  students,
  preferences,
  allocations,
  matches,
  payments,
  onRefresh,
}) => {
  // 3D Layout states
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedRoom, setSelectedRoom] = useState<IllustrativeRoom | null>(null);
  const [cutawayMode, setCutawayMode] = useState(false);

  // =========================================================================
  // 1. 3D Layout & Floors View
  // =========================================================================
  if (tab === 'layout') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80">
                Interactive Spatial Module
              </span>
              <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Aryabhatta Campus Prototype</span>
            </div>
            <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
              3D Layout & Floor Architecture
            </h2>
          </div>
          <button
            onClick={() => {
              setSelectedFloor('all');
              setCutawayMode(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-lg text-xs font-semibold text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#1E293B] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Camera</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-[520px] w-full rounded-2xl overflow-hidden relative shadow-lg border border-slate-800 dark:border-[#334155]">
              <Building3D
                rooms={ILLUSTRATIVE_ROOMS.filter(r => selectedFloor === 'all' || r.Floor === selectedFloor)}
                selectedFloor={selectedFloor}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                cutawayMode={cutawayMode}
              />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-5">
            <FloorSelector
              selectedFloor={selectedFloor}
              onSelectFloor={setSelectedFloor}
              floorStats={[1, 2, 3].map(f => {
                const flr = ILLUSTRATIVE_ROOMS.filter(r => r.Floor === f);
                return {
                  floor: f,
                  label: `Floor ${f}`,
                  totalRooms: flr.length,
                  availableBeds: flr.reduce((sum, r) => sum + r.availableBeds, 0)
                };
              })}
              cutawayMode={cutawayMode}
              onToggleCutaway={() => setCutawayMode(!cutawayMode)}
            />
          </div>
        </div>

        {selectedRoom && (
          <RoomDetailModal
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
          />
        )}

        {/* 3D Model Management Section */}
        <ModelManagementSection hostels={hostels} />
      </div>
    );
  }

  // =========================================================================
  // 2. Hostel Management
  // =========================================================================
  if (tab === 'hostels') {
    return <HostelsSection hostels={hostels} blocks={blocks} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 3. Block Management
  // =========================================================================
  if (tab === 'blocks') {
    return <BlocksSection blocks={blocks} hostels={hostels} rooms={rooms} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 4. Room Management
  // =========================================================================
  if (tab === 'rooms') {
    return <RoomsSection rooms={rooms} blocks={blocks} hostels={hostels} beds={beds} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 5. Bed Management
  // =========================================================================
  if (tab === 'beds') {
    return <BedsSection beds={beds} rooms={rooms} blocks={blocks} students={students} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 6. Student Management
  // =========================================================================
  if (tab === 'students') {
    return <StudentsSection students={students} allocations={allocations} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 7. Visitor & Guest Stay Management
  // =========================================================================
  if (tab === 'guests') {
    return <GuestManagementSection rooms={rooms} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 8. Room Allocation
  // =========================================================================
  if (tab === 'allocation') {
    return (
      <AllocationsSection 
        allocations={allocations} 
        students={students} 
        rooms={rooms} 
        beds={beds} 
        blocks={blocks} 
        onRefresh={onRefresh} 
      />
    );
  }

  // =========================================================================
  // 9. Roommate Matching
  // =========================================================================
  if (tab === 'matches') {
    return <RoommateMatchesSection students={students} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 10. Student Preferences
  // =========================================================================
  if (tab === 'preferences') {
    return <PreferencesSection preferences={preferences} students={students} onRefresh={onRefresh} />;
  }

  // =========================================================================
  // 11. Payments & Ledger
  // =========================================================================
  if (tab === 'payments') {
    return <PaymentsSection payments={payments} students={students} onRefresh={onRefresh} />;
  }

  return null;
};
