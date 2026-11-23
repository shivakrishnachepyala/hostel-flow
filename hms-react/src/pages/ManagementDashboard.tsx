import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WardenSidebar, ManagementTab } from '../components/management/WardenSidebar';
import { WardenTopbar } from '../components/management/WardenTopbar';
import { DashboardOverview } from '../components/management/DashboardOverview';
import { ManagementModules } from '../components/management/ManagementModules';
import { apiClient } from '../services/apiClient';
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
} from '../types';

const TAB_TITLES: Record<ManagementTab, string> = {
  dashboard: 'Operations Dashboard',
  layout: '3D Layout & Floors',
  hostels: 'Hostel Management',
  blocks: 'Block Management',
  rooms: 'Room Management',
  beds: 'Bed Management',
  students: 'Student Management',
  guests: 'Visitor & Guest Stay Management',
  allocation: 'Room Allocation',
  matches: 'Roommate Matching',
  preferences: 'Student Preferences',
  payments: 'Financial Payments',
};

export const ManagementDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as ManagementTab;
  const activeTab: ManagementTab = (rawTab && TAB_TITLES[rawTab]) ? rawTab : 'dashboard';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hostelflow_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);

  // Authoritative MySQL Entities from Flask
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [blocks, setBlocks] = useState<HostelBlock[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [preferences, setPreferences] = useState<StudentPreferences[]>([]);
  const [allocations, setAllocations] = useState<RoomAllocation[]>([]);
  const [matches, setMatches] = useState<RoommateMatch[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const handleSelectTab = (tab: ManagementTab) => {
    setSearchParams(tab === 'dashboard' ? {} : { tab });
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hostelflow_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const fetchDatabaseState = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiClient.get('/hostels/'),
        apiClient.get('/hostel-blocks/'),
        apiClient.get('/rooms/'),
        apiClient.get('/beds/'),
        apiClient.get('/students/'),
        apiClient.get('/student-preferences/'),
        apiClient.get('/room-allocations/'),
        apiClient.get('/roommate-matches/'),
        apiClient.get('/payments/'),
      ]);

      const [hRes, bRes, rRes, bdRes, sRes, spRes, aRes, mRes, pRes] = results;

      if (hRes.status === 'fulfilled' && hRes.value.data?.data) setHostels(hRes.value.data.data);
      if (bRes.status === 'fulfilled' && bRes.value.data?.data) setBlocks(bRes.value.data.data);
      if (rRes.status === 'fulfilled' && rRes.value.data?.data) setRooms(rRes.value.data.data);
      if (bdRes.status === 'fulfilled' && bdRes.value.data?.data) setBeds(bdRes.value.data.data);
      if (sRes.status === 'fulfilled' && sRes.value.data?.data) setStudents(sRes.value.data.data);
      if (spRes.status === 'fulfilled' && spRes.value.data?.data) setPreferences(spRes.value.data.data);
      if (aRes.status === 'fulfilled' && aRes.value.data?.data) setAllocations(aRes.value.data.data);
      if (mRes.status === 'fulfilled' && mRes.value.data?.data) setMatches(mRes.value.data.data);
      if (pRes.status === 'fulfilled' && pRes.value.data?.data) setPayments(pRes.value.data.data);
    } catch (err) {
      console.error('Error loading MySQL authoritative records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabaseState();
  }, [fetchDatabaseState]);

  return (
    <div className="flex min-h-screen bg-[#F5F7FB] dark:bg-[#0B1120] text-slate-800 dark:text-[#F1F5F9] antialiased font-sans transition-colors duration-200">
      {/* 1. Left-side Navigation Sidebar */}
      <WardenSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* 2. Main Content Area smoothly adjusting its width */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <WardenTopbar
          pageTitle={TAB_TITLES[activeTab]}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' ? (
            <DashboardOverview
              hostels={hostels}
              blocks={blocks}
              rooms={rooms}
              beds={beds}
              students={students}
              allocations={allocations}
              payments={payments}
              matches={matches}
              onNavigateTab={handleSelectTab}
              loading={loading}
            />
          ) : (
            <ManagementModules
              tab={activeTab}
              hostels={hostels}
              blocks={blocks}
              rooms={rooms}
              beds={beds}
              students={students}
              preferences={preferences}
              allocations={allocations}
              matches={matches}
              payments={payments}
              onRefresh={fetchDatabaseState}
            />
          )}
        </main>
      </div>
    </div>
  );
};
