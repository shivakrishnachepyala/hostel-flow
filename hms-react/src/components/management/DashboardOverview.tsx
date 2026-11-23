import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  DoorClosed, 
  Bed as BedIcon, 
  Users, 
  CreditCard, 
  Box, 
  Plus, 
  Eye, 
  Layers, 
  Activity, 
  CheckCircle2,
  Sparkles,
  Hotel,
  UserCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Wrench,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  Hostel, 
  HostelBlock, 
  Room, 
  Bed, 
  Student, 
  RoomAllocation, 
  Payment,
  RoommateMatch,
  GuestStats
} from '../../types';
import { ManagementTab } from './WardenSidebar';
import { apiClient } from '../../services/apiClient';

interface DashboardOverviewProps {
  hostels: Hostel[];
  blocks: HostelBlock[];
  rooms: Room[];
  beds: Bed[];
  students: Student[];
  allocations: RoomAllocation[];
  payments: Payment[];
  matches?: RoommateMatch[];
  onNavigateTab: (tab: ManagementTab) => void;
  loading: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  hostels,
  blocks,
  rooms,
  beds,
  students,
  allocations,
  payments,
  matches = [],
  onNavigateTab,
  loading,
}) => {
  // Live guest stats for operational summary
  const [guestStats, setGuestStats] = useState<GuestStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    roomAssignedCount: 0,
    unassignedApprovedCount: 0,
    checkedInGuests: 0,
    checkedOutGuests: 0,
  });

  useEffect(() => {
    let isMounted = true;
    apiClient.get('/guests/stats')
      .then((res) => {
        if (isMounted && res.data?.data) {
          setGuestStats(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load guest stats for dashboard:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper for determining authoritative bed status
  const getBedStatus = (bed: Bed): 'Available' | 'Occupied' | 'Maintenance' => {
    if (bed.Bed_Status === 'Maintenance') return 'Maintenance';
    const hasActiveAlloc = allocations.some(
      (a) => a.Bed_ID === bed.Bed_ID && a.Allocation_Status === 'Active'
    );
    if (hasActiveAlloc || bed.Bed_Status === 'Occupied') return 'Occupied';
    return 'Available';
  };

  const occupiedBeds = beds.filter((b) => getBedStatus(b) === 'Occupied').length;
  const maintBeds = beds.filter((b) => getBedStatus(b) === 'Maintenance').length;
  const availableBeds = Math.max(0, beds.length - occupiedBeds - maintBeds);
  const occPercent = beds.length ? Math.round((occupiedBeds / beds.length) * 100) : 0;
  const activeAllocCount = allocations.filter((a) => a.Allocation_Status === 'Active').length;

  // Unallocated students count
  const allocatedStudentIds = new Set(
    allocations
      .filter((a) => a.Allocation_Status === 'Active' && a.Student_ID)
      .map((a) => a.Student_ID as number)
  );
  const unallocatedStudentsCount = Math.max(0, students.length - allocatedStudentIds.size);

  // Proposed matches count
  const proposedMatchesCount = matches.filter((m) => m.Match_Status === 'Proposed').length;

  // Payments aggregation
  const paymentBreakdown = payments.reduce((acc, p) => {
    const status = p.Payment_Status || 'Pending';
    acc[status] = acc[status] || { count: 0, total: 0 };
    acc[status].count += 1;
    acc[status].total += Number(p.Amount) || 0;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const totalPaid = paymentBreakdown['Paid']?.total || 0;
  const totalPending = paymentBreakdown['Pending']?.total || 0;

  // Student name map for Bed Map tooltips
  const studentMap = new Map<number, string>();
  students.forEach((s) => studentMap.set(s.Student_ID, s.Name));

  const allocationByBed = new Map<number, RoomAllocation>();
  allocations.forEach((a) => {
    if (a.Allocation_Status === 'Active') {
      allocationByBed.set(a.Bed_ID, a);
    }
  });

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Quick Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-5 sm:p-6 rounded-2xl shadow-xs transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Operations Center
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Session: 2026-2027</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Warden Operations Command Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Real-time campus occupancy, guest stays, automated roommate matching, and residential billing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('guests')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-purple-600/25 transition-all cursor-pointer"
          >
            <Hotel className="w-4 h-4" />
            <span>Guest Stays</span>
            {guestStats.pendingRequests > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-purple-700 font-black text-[10px] flex items-center justify-center">
                {guestStats.pendingRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigateTab('matches')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Roommate AI</span>
          </button>

          <button
            onClick={() => onNavigateTab('layout')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Box className="w-4 h-4 text-indigo-500" />
            <span>3D Architecture</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 dark:bg-[#182235] hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] rounded-xl text-xs font-bold transition-colors"
            title="Preview student portal experience"
          >
            <Eye className="w-4 h-4 text-slate-400 dark:text-[#94A3B8]" />
            <span>View Student Portal</span>
          </Link>
        </div>
      </div>

      {/* 2. Operational Action Banners (Actionable Alerts) */}
      {(guestStats.pendingRequests > 0 || (guestStats.unassignedApprovedCount ?? 0) > 0 || proposedMatchesCount > 0 || maintBeds > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {guestStats.pendingRequests > 0 && (
            <div 
              onClick={() => onNavigateTab('guests')}
              className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {guestStats.pendingRequests}
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">Guest Stays Pending</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Awaiting approval</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          )}

          {(guestStats.unassignedApprovedCount ?? 0) > 0 && (
            <div 
              onClick={() => onNavigateTab('guests')}
              className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {guestStats.unassignedApprovedCount}
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-900 dark:text-purple-200">Guests Need Room</div>
                  <div className="text-[10px] text-purple-700 dark:text-purple-400">Approved, no room assigned</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          )}

          {proposedMatchesCount > 0 && (
            <div 
              onClick={() => onNavigateTab('matches')}
              className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {proposedMatchesCount}
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Roommate Matches</div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400">Proposed by matching engine</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          )}

          {maintBeds > 0 && (
            <div 
              onClick={() => onNavigateTab('beds')}
              className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {maintBeds}
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-200">Beds in Maintenance</div>
                  <div className="text-[10px] text-rose-700 dark:text-rose-400">Offline for repairs</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
          )}
        </div>
      )}

      {/* 3. High-Level KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Hostel Buildings */}
        <div 
          onClick={() => onNavigateTab('hostels')}
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Hostel Buildings</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">
              {loading ? '...' : hostels.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">
              {blocks.length} blocks configured
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Registered Rooms */}
        <div 
          onClick={() => onNavigateTab('rooms')}
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Registered Rooms</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">
              {loading ? '...' : rooms.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">
              {beds.length} total beds
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <DoorClosed className="w-5 h-5" />
          </div>
        </div>

        {/* Occupancy Rate */}
        <div 
          onClick={() => onNavigateTab('beds')}
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Occupancy Rate</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">
              {loading ? '...' : `${occPercent}%`}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">
              {occupiedBeds} occupied / {availableBeds} free
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <BedIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Enrolled Residents */}
        <div 
          onClick={() => onNavigateTab('students')}
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Enrolled Residents</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">
              {loading ? '...' : students.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">
              {activeAllocCount} active leases {unallocatedStudentsCount > 0 ? `· ${unallocatedStudentsCount} unallocated` : ''}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Fee Collections */}
        <div 
          onClick={() => onNavigateTab('payments')}
          className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Fee Collections</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">
              {loading ? '...' : `₹${totalPaid.toLocaleString()}`}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              ₹{totalPending.toLocaleString()} pending
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Main Dashboard Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Operations, Inventory Metrics & Financials (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Guest Accommodation Workflow Summary */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F5F9] font-bold text-sm">
                <Hotel className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Guest Accommodation Operations</span>
              </div>
              <button
                onClick={() => onNavigateTab('guests')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 cursor-pointer"
              >
                Manage →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60">
                <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase">Active In</div>
                <div className="text-xl font-black text-purple-800 dark:text-purple-200 mt-0.5">{guestStats.checkedInGuests}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase">Pending</div>
                <div className="text-xl font-black text-amber-800 dark:text-amber-200 mt-0.5">{guestStats.pendingRequests}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold uppercase">Need Room</div>
                <div className="text-xl font-black text-indigo-800 dark:text-indigo-200 mt-0.5">{guestStats.unassignedApprovedCount}</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-[#94A3B8]">
              Automated conflict checks prevent room double-booking with resident student leases.
            </p>
          </div>

          {/* Roommate Matching AI Engine Widget */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F5F9] font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Roommate Matching AI Engine</span>
              </div>
              <button
                onClick={() => onNavigateTab('matches')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
              >
                Matches →
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] text-xs">
              <div>
                <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">Pairs Configured:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 ml-1.5">{matches.length}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">Proposed:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 ml-1.5">{proposedMatchesCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-3">
              Matches students using four-dimensional lifestyle scoring (Sleep, Study, Diet, Language).
            </p>
          </div>

          {/* Live Occupancy Status */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F5F9] font-bold text-sm">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Live Occupancy Status</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                occPercent > 80 
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
              }`}>
                {occPercent}% Full
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#334155] text-xs">
              <div className="py-2.5 flex items-center justify-between text-slate-700 dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Occupied Beds</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">{occupiedBeds}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between text-slate-700 dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Available for Allocation</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">{availableBeds}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between text-slate-700 dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span>Under Maintenance</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">{maintBeds}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between text-slate-700 dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Active Student Leases</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">{activeAllocCount}</span>
              </div>
            </div>
          </div>

          {/* Financial Collections Summary */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F5F9] font-bold text-sm">
                <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Financial Collections Summary</span>
              </div>
              <button
                onClick={() => onNavigateTab('payments')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
              >
                Ledger →
              </button>
            </div>

            {Object.keys(paymentBreakdown).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-[#94A3B8] font-semibold border-b border-slate-100 dark:border-[#334155]">
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-center">Records</th>
                      <th className="pb-2 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                    {Object.entries(paymentBreakdown).map(([status, val]) => (
                      <tr key={status} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60">
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                            status === 'Pending' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-medium text-slate-600 dark:text-[#94A3B8]">{val.count}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900 dark:text-[#F1F5F9]">
                          ₹{val.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-[#94A3B8] py-4 text-center">No payment transactions recorded.</p>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Campus Bed Map (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F5F9] font-bold text-sm sm:text-base">
                <BedIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Interactive Campus Bed Map</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                Visual Layout
              </span>
            </div>

            {/* Bed Map Container */}
            <div className="space-y-6 max-h-[640px] overflow-y-auto pr-1">
              {hostels.length > 0 ? (
                hostels.map((h) => {
                  const blocksInHostel = blocks.filter((b) => b.Hostel_ID === h.Hostel_ID);

                  return (
                    <div key={h.Hostel_ID} className="bg-slate-50 dark:bg-[#182235]/60 border border-slate-200 dark:border-[#334155] rounded-xl p-4 space-y-4">
                      {/* Hostel Building Header */}
                      <div className="flex items-center gap-2 text-slate-900 dark:text-[#F1F5F9] font-bold text-sm">
                        <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{h.Hostel_Name}</span>
                        <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">
                          ({h.Hostel_Type || 'Co-ed'})
                        </span>
                      </div>

                      {/* Blocks Section */}
                      {blocksInHostel.length > 0 ? (
                        blocksInHostel.map((b) => {
                          const roomsInBlock = rooms.filter((r) => r.Block_ID === b.Block_ID);
                          const bedsInBlock = beds.filter((bd) => roomsInBlock.some((r) => r.Room_ID === bd.Room_ID));
                          const occupiedInBlock = bedsInBlock.filter((bd) => getBedStatus(bd) === 'Occupied').length;

                          return (
                            <div key={b.Block_ID} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-lg p-3 space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <div className="font-bold text-slate-800 dark:text-[#F1F5F9]">
                                  {b.Block_Name} · <span className="font-normal text-slate-500 dark:text-[#94A3B8]">{b.Gender || 'Mixed'}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-[#94A3B8]">
                                  {occupiedInBlock} of {bedsInBlock.length} beds occupied
                                </span>
                              </div>

                              {/* Room Grid */}
                              {roomsInBlock.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                  {roomsInBlock.map((r) => {
                                    const bedsInRoom = beds.filter((bd) => bd.Room_ID === r.Room_ID);

                                    return (
                                      <div
                                        key={r.Room_ID}
                                        className="bg-slate-50 dark:bg-[#182235]/80 border border-slate-200 dark:border-[#334155] rounded-lg p-2.5 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-bold text-xs text-slate-900 dark:text-[#F1F5F9] font-display">
                                            {r.Room_Number}
                                          </span>
                                          <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-medium">
                                            {r.Room_Type || 'Standard'}
                                          </span>
                                        </div>

                                        {/* Beds row in room */}
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          {bedsInRoom.length > 0 ? (
                                            bedsInRoom.map((bd) => {
                                              const status = getBedStatus(bd);
                                              const alloc = allocationByBed.get(bd.Bed_ID);
                                              const studentName = (alloc && alloc.Student_ID) ? studentMap.get(alloc.Student_ID) : '';
                                              const tooltip = `${bd.Bed_Number}: ${status}${studentName ? ` (${studentName})` : ''}`;

                                              return (
                                                <div
                                                  key={bd.Bed_ID}
                                                  title={tooltip}
                                                  className={`
                                                    w-4 h-6 rounded-xs transition-transform hover:scale-125 cursor-pointer shadow-2xs
                                                    ${status === 'Occupied' ? 'bg-rose-500 ring-1 ring-rose-400' :
                                                      status === 'Maintenance' ? 'bg-slate-400 ring-1 ring-slate-300 dark:bg-slate-600' :
                                                      'bg-emerald-500 ring-1 ring-emerald-400'}
                                                  `}
                                                />
                                              );
                                            })
                                          ) : (
                                            <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic">No beds</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] italic py-2">
                                  No rooms configured for this block.
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-400 dark:text-[#94A3B8] italic py-2">
                          No blocks registered in this hostel building.
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-[#182235]/40 border border-dashed border-slate-300 dark:border-[#334155] rounded-2xl">
                  <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-700 dark:text-[#F1F5F9]">No Hostels Registered</div>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8] max-w-sm mx-auto">
                    Configure hostel buildings, blocks, and rooms to populate the interactive bed layout.
                  </p>
                  <button
                    onClick={() => onNavigateTab('hostels')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Hostel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bed Map Legend */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#334155] flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-4 rounded-xs bg-emerald-500 ring-1 ring-emerald-400" />
                <span>Available Bed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-4 rounded-xs bg-rose-500 ring-1 ring-rose-400" />
                <span>Occupied (Allocated)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-4 rounded-xs bg-slate-400 ring-1 ring-slate-300 dark:bg-slate-600" />
                <span>Under Maintenance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
