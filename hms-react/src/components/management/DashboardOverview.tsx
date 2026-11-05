import React from 'react';
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
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  Hostel, 
  HostelBlock, 
  Room, 
  Bed, 
  Student, 
  RoomAllocation, 
  Payment 
} from '../../types';
import { ManagementTab } from './WardenSidebar';

interface DashboardOverviewProps {
  hostels: Hostel[];
  blocks: HostelBlock[];
  rooms: Room[];
  beds: Bed[];
  students: Student[];
  allocations: RoomAllocation[];
  payments: Payment[];
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
  onNavigateTab,
  loading,
}) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Operations Center
            </span>
            <span className="text-xs text-slate-400 font-medium">Session: 2026-2027</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">
            Warden Operations Command Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time campus occupancy, live bed map, and residential billing overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('layout')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all"
          >
            <Box className="w-4 h-4" />
            <span>3D Layout & Floors</span>
          </button>

          <button
            onClick={() => onNavigateTab('allocation')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>New Allocation</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-colors"
            title="Preview student portal experience"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>View Student Portal</span>
          </Link>
        </div>
      </div>

      {/* 2. High-Level KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Hostel Buildings */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs hover:border-slate-300 transition-colors flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">Hostel Buildings</div>
            <div className="text-2xl font-black font-display text-slate-900">
              {loading ? '...' : hostels.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {blocks.length} blocks configured
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Registered Rooms */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs hover:border-slate-300 transition-colors flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">Registered Rooms</div>
            <div className="text-2xl font-black font-display text-slate-900">
              {loading ? '...' : rooms.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {beds.length} total beds
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <DoorClosed className="w-5 h-5" />
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs hover:border-slate-300 transition-colors flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">Occupancy Rate</div>
            <div className="text-2xl font-black font-display text-slate-900">
              {loading ? '...' : `${occPercent}%`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {occupiedBeds} occupied / {availableBeds} free
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <BedIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Enrolled Residents */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs hover:border-slate-300 transition-colors flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">Enrolled Residents</div>
            <div className="text-2xl font-black font-display text-slate-900">
              {loading ? '...' : students.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {activeAllocCount} active leases
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Fee Collections */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs hover:border-slate-300 transition-colors flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">Fee Collections</div>
            <div className="text-2xl font-black font-display text-slate-900">
              {loading ? '...' : `₹${totalPaid.toLocaleString()}`}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
              ₹{totalPending.toLocaleString()} pending
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inventory Metrics, Live Occupancy & Financials (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Inventory Metrics */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Inventory Metrics</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                MySQL Schema
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {[
                { label: 'Hostel Buildings', count: hostels.length, icon: Building2 },
                { label: 'Blocks / Wings', count: blocks.length, icon: Layers },
                { label: 'Student Rooms', count: rooms.length, icon: DoorClosed },
                { label: 'Total Bed Inventory', count: beds.length, icon: BedIcon },
                { label: 'Registered Students', count: students.length, icon: Users },
              ].map((row, i) => {
                const Icon = row.icon;
                return (
                  <div key={i} className="py-2.5 flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{row.label}</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{row.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Occupancy Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Live Occupancy Status</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                occPercent > 80 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {occPercent}% Full
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Occupied Beds</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{occupiedBeds}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Available for Allocation</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{availableBeds}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span>Under Maintenance</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{maintBeds}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Active Leases</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{activeAllocCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
              Occupancy counts reflect authoritative active room allocations.
            </p>
          </div>

          {/* Financial Collections Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <span>Financial Collections Summary</span>
              </div>
              <button
                onClick={() => onNavigateTab('payments')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Ledger →
              </button>
            </div>

            {Object.keys(paymentBreakdown).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100">
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-center">Records</th>
                      <th className="pb-2 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(paymentBreakdown).map(([status, val]) => (
                      <tr key={status} className="hover:bg-slate-50">
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                            status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-medium text-slate-600">{val.count}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          ₹{val.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No payment transactions recorded.</p>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Campus Bed Map (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                <BedIcon className="w-5 h-5 text-indigo-600" />
                <span>Interactive Campus Bed Map</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                Visual Layout
              </span>
            </div>

            {/* Bed Map Container */}
            <div className="space-y-6 max-h-[640px] overflow-y-auto pr-1">
              {hostels.length > 0 ? (
                hostels.map((h) => {
                  const blocksInHostel = blocks.filter((b) => b.Hostel_ID === h.Hostel_ID);

                  return (
                    <div key={h.Hostel_ID} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                      {/* Hostel Building Header */}
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>{h.Hostel_Name}</span>
                        <span className="text-xs font-normal text-slate-500">
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
                            <div key={b.Block_ID} className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <div className="font-bold text-slate-800">
                                  {b.Block_Name} · <span className="font-normal text-slate-500">{b.Gender || 'Mixed'}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
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
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:border-indigo-300 transition-colors"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-bold text-xs text-slate-900 font-display">
                                            {r.Room_Number}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-medium">
                                            {r.Room_Type || 'Standard'}
                                          </span>
                                        </div>

                                        {/* Beds row in room */}
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                          {bedsInRoom.length > 0 ? (
                                            bedsInRoom.map((bd) => {
                                              const status = getBedStatus(bd);
                                              const alloc = allocationByBed.get(bd.Bed_ID);
                                              const studentName = alloc ? studentMap.get(alloc.Student_ID) : '';
                                              const tooltip = `${bd.Bed_Number}: ${status}${studentName ? ` (${studentName})` : ''}`;

                                              return (
                                                <div
                                                  key={bd.Bed_ID}
                                                  title={tooltip}
                                                  className={`
                                                    w-4 h-6 rounded-xs transition-transform hover:scale-125 cursor-pointer shadow-2xs
                                                    ${status === 'Occupied' ? 'bg-rose-500 ring-1 ring-rose-400' :
                                                      status === 'Maintenance' ? 'bg-slate-400 ring-1 ring-slate-300' :
                                                      'bg-emerald-500 ring-1 ring-emerald-400'}
                                                  `}
                                                />
                                              );
                                            })
                                          ) : (
                                            <span className="text-[10px] text-slate-400 italic">No beds</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 italic py-2">
                                  No rooms configured for this block.
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-400 italic py-2">
                          No blocks registered in this hostel building.
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center space-y-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">No Hostels Registered</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Configure hostel buildings, blocks, and rooms to populate the interactive bed layout.
                  </p>
                  <button
                    onClick={() => onNavigateTab('hostels')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Hostel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bed Map Legend */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-4 rounded-xs bg-emerald-500 ring-1 ring-emerald-400" />
                <span>Available Bed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-4 rounded-xs bg-rose-500 ring-1 ring-rose-400" />
                <span>Occupied (Allocated)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-4 rounded-xs bg-slate-400 ring-1 ring-slate-300" />
                <span>Under Maintenance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
