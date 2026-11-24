import React, { useState } from 'react';
import { RotateCcw, Building2, Box } from 'lucide-react';
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
import { HostelExplorerView } from '../3d/HostelExplorerView';
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
  // 3D Layout sub-mode state (Explorer vs Model Management)
  const [layoutSubView, setLayoutSubView] = useState<'explorer' | 'models'>('explorer');

  // =========================================================================
  // 1. 3D Layout & Floors View (Complete Dynamic 3D Campus Explorer & GLB Management)
  // =========================================================================
  if (tab === 'layout') {
    return (
      <div className="space-y-6">
        {/* Sub-navigation bar for 3D module */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-slate-100 dark:bg-[#182235] rounded-2xl border border-slate-200 dark:border-[#334155]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLayoutSubView('explorer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                layoutSubView === 'explorer'
                  ? 'bg-institutional-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Interactive 3D Campus Explorer</span>
            </button>
            <button
              onClick={() => setLayoutSubView('models')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                layoutSubView === 'models'
                  ? 'bg-institutional-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Blender GLB Model Management</span>
            </button>
          </div>

          <div className="px-3 text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium hidden md:block">
            {layoutSubView === 'explorer' ? 'Live MySQL Accommodation Topology' : 'glTF 2.0 Architectural Imports'}
          </div>
        </div>

        {layoutSubView === 'explorer' ? (
          <HostelExplorerView
            isWardenView={true}
            onOpenModelManagement={() => setLayoutSubView('models')}
          />
        ) : (
          <ModelManagementSection
            hostels={hostels}
            onSwitchToExplorer={() => setLayoutSubView('explorer')}
          />
        )}
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
    return <GuestManagementSection rooms={rooms} />;
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
  // 11. Financial Payments
  // =========================================================================
  if (tab === 'payments') {
    return <PaymentsSection payments={payments} students={students} onRefresh={onRefresh} />;
  }

  return null;
};
