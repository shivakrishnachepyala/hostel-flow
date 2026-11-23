import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Box, 
  ShieldCheck, 
  ArrowRight,
  Search,
  Building2,
  Filter,
  Layers,
  DoorClosed,
  Bed as BedIcon,
  Info,
  X,
  Eye,
  Calendar,
  Lock
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { Hostel, HostelBlock, Room, Bed, RoomAllocation } from '../types';

export const AvailabilityPage: React.FC = () => {
  // Authoritative MySQL entities
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [blocks, setBlocks] = useState<HostelBlock[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [allocations, setAllocations] = useState<RoomAllocation[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedHostel, setSelectedHostel] = useState<number | 'all'>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');

  // Modal for Room Inspection (Student/Parent View)
  const [inspectedRoom, setInspectedRoom] = useState<any | null>(null);

  const fetchLiveDatabaseState = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [hRes, bRes, rRes, bdRes, aRes] = await Promise.allSettled([
        apiClient.get('/hostels/'),
        apiClient.get('/hostel-blocks/'),
        apiClient.get('/rooms/'),
        apiClient.get('/beds/'),
        apiClient.get('/room-allocations/active').catch(() => apiClient.get('/room-allocations/?status=Active')),
      ]);

      if (hRes.status === 'fulfilled' && hRes.value.data?.data) setHostels(hRes.value.data.data);
      if (bRes.status === 'fulfilled' && bRes.value.data?.data) setBlocks(bRes.value.data.data);
      if (rRes.status === 'fulfilled' && rRes.value.data?.data) setRooms(rRes.value.data.data);
      if (bdRes.status === 'fulfilled' && bdRes.value.data?.data) setBeds(bdRes.value.data.data);
      if (aRes.status === 'fulfilled' && aRes.value.data?.data) setAllocations(aRes.value.data.data);

      if (hRes.status === 'rejected' && rRes.status === 'rejected') {
        throw new Error('Core accommodation inventory unavailable');
      }
    } catch (err: any) {
      console.error('Failed to retrieve live availability from MySQL:', err);
      setError('Availability temporarily unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDatabaseState();
  }, [fetchLiveDatabaseState]);

  // Today's date string for date-aware allocation checking
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Map of actively allocated beds covering today
  const activeAllocatedBedIds = useMemo(() => {
    const set = new Set<number>();
    allocations.forEach(a => {
      if (a.Allocation_Status === 'Active' && a.Bed_ID) {
        const startOk = !a.Start_Date || a.Start_Date <= todayStr;
        const endOk = !a.End_Date || a.End_Date >= todayStr;
        if (startOk && endOk) {
          set.add(a.Bed_ID);
        }
      }
    });
    return set;
  }, [allocations, todayStr]);

  // Compute live availability per room
  const computedRooms = useMemo(() => {
    return rooms.map(room => {
      const block = blocks.find(b => b.Block_ID === room.Block_ID);
      const hostel = block ? hostels.find(h => h.Hostel_ID === block.Hostel_ID) : null;
      const roomBeds = beds.filter(b => b.Room_ID === room.Room_ID);

      const totalBeds = roomBeds.length;
      const vacantBeds = roomBeds.filter(b => {
        const isAvailableStatus = (b.Bed_Status || 'Available').toLowerCase() === 'available';
        const isAllocated = activeAllocatedBedIds.has(b.Bed_ID);
        return isAvailableStatus && !isAllocated;
      }).length;

      const occupiedBeds = totalBeds - vacantBeds;

      let status: 'available' | 'partially-occupied' | 'fully-occupied' = 'available';
      if (totalBeds === 0 || vacantBeds === 0) {
        status = 'fully-occupied';
      } else if (vacantBeds === totalBeds) {
        status = 'available';
      } else {
        status = 'partially-occupied';
      }

      return {
        ...room,
        block,
        hostel,
        roomBeds,
        totalBeds,
        vacantBeds,
        occupiedBeds,
        status,
      };
    });
  }, [rooms, blocks, hostels, beds, activeAllocatedBedIds]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return computedRooms.filter(r => {
      // Search Term (room number, block name, hostel name, facilities)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const roomNum = String(r.Room_Number || '').toLowerCase();
        const blockName = String(r.block?.Block_Name || '').toLowerCase();
        const hostelName = String(r.hostel?.Hostel_Name || '').toLowerCase();
        const facilities = String(r.Facilities || '').toLowerCase();

        if (
          !roomNum.includes(term) &&
          !blockName.includes(term) &&
          !hostelName.includes(term) &&
          !facilities.includes(term)
        ) {
          return false;
        }
      }

      // Hostel Filter
      if (selectedHostel !== 'all') {
        if (r.hostel?.Hostel_ID !== selectedHostel) return false;
      }

      // Gender Filter
      if (selectedGender !== 'all') {
        const gender = r.block?.Gender || r.hostel?.Hostel_Type;
        if (gender !== selectedGender) return false;
      }

      // Room Type Filter
      if (selectedRoomType !== 'all') {
        if (r.Room_Type !== selectedRoomType) return false;
      }

      // Availability Filter
      if (selectedAvailability !== 'all') {
        if (r.status !== selectedAvailability) return false;
      }

      return true;
    });
  }, [computedRooms, searchTerm, selectedHostel, selectedGender, selectedRoomType, selectedAvailability]);

  // Aggregated totals
  const totalBedsCount = beds.length;
  const totalVacantBedsCount = useMemo(() => {
    return beds.filter(b => {
      const isAvailable = (b.Bed_Status || 'Available').toLowerCase() === 'available';
      return isAvailable && !activeAllocatedBedIds.has(b.Bed_ID);
    }).length;
  }, [beds, activeAllocatedBedIds]);

  const totalOccupiedBedsCount = totalBedsCount - totalVacantBedsCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Database Records</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">Authoritative MySQL hms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Hostel Room & Bed Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-2xl mt-1 leading-relaxed">
            Real-time occupancy tracking across university residential hostels. Check current room capacities, vacant beds, and living arrangements before applying.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLiveDatabaseState}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#182235] shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-institutional-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>Refresh Live Data</span>
          </button>

          <Link
            to="/enrollment"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-institutional-800 dark:bg-sky-600 text-white hover:bg-institutional-900 dark:hover:bg-sky-500 shadow-sm transition-colors"
          >
            <span>Apply for Bed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Error / Offline Banner */}
      {error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Live database connectivity is temporarily interrupted.</span>
              <p className="mt-0.5 text-rose-700 dark:text-rose-400">
                The application could not reach the Flask backend at <code className="font-mono bg-rose-100/60 dark:bg-rose-900/40 px-1 py-0.5 rounded">/api/hostels/</code>. Please check backend server status.
              </p>
            </div>
          </div>
          <button
            onClick={fetchLiveDatabaseState}
            className="px-3 py-1 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 rounded-lg font-bold hover:bg-rose-200 text-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                Live Data: Authoritative MySQL Database Records
              </span>
              <p className="mt-0.5 text-slate-600 dark:text-[#94A3B8]">
                Records fetched directly from local MySQL <code className="font-mono bg-emerald-100/60 dark:bg-emerald-900/40 px-1 py-0.2 rounded">hms</code> database via the Flask REST API.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Mock Data</span>
          </span>
        </div>
      )}

      {/* 3. Key Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
            <span>Registered Hostels</span>
            <Building2 className="w-4 h-4 text-slate-400 dark:text-[#64748B]" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] mt-1">
            {hostels.length} <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">Buildings</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
            {blocks.length} Residential Blocks
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
            <span>Room Inventory</span>
            <DoorClosed className="w-4 h-4 text-slate-400 dark:text-[#64748B]" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] mt-1">
            {rooms.length} <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">Units</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
            Across registered blocks
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
            <span>Available Beds</span>
            <BedIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-display text-emerald-600 dark:text-emerald-400 mt-1">
            {totalVacantBedsCount} <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">of {totalBedsCount}</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            {totalBedsCount > 0 ? `${Math.round((totalVacantBedsCount / totalBedsCount) * 100)}% Available Now` : 'No beds listed'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
            <span>Active Occupancy</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] mt-1">
            {totalOccupiedBedsCount} <span className="text-xs font-normal text-slate-500 dark:text-[#94A3B8]">Occupied</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
            {allocations.length} Active Allocations
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by room number, facilities, or block..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filter by Hostel */}
            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl p-2 text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Hostels ({hostels.length})</option>
              {hostels.map(h => (
                <option key={h.Hostel_ID} value={h.Hostel_ID}>
                  {h.Hostel_Name}
                </option>
              ))}
            </select>

            {/* Filter by Gender Eligibility */}
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl p-2 text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Gender Eligibility</option>
              <option value="Male">Boys / Male Residence</option>
              <option value="Female">Girls / Female Residence</option>
              <option value="Co-ed">Co-ed Residence</option>
            </select>

            {/* Filter by Room Type */}
            <select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl p-2 text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Room Types</option>
              <option value="Single">Single Occupancy</option>
              <option value="Double">Double Sharing</option>
              <option value="Triple">Triple Suite</option>
            </select>

            {/* Filter by Availability */}
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl p-2 text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Availability</option>
              <option value="available">Available Rooms</option>
              <option value="partially-occupied">Partially Free</option>
              <option value="fully-occupied">Currently Full</option>
            </select>

            {(searchTerm || selectedHostel !== 'all' || selectedGender !== 'all' || selectedRoomType !== 'all' || selectedAvailability !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedHostel('all');
                  setSelectedGender('all');
                  setSelectedRoomType('all');
                  setSelectedAvailability('all');
                }}
                className="text-xs font-semibold text-institutional-600 dark:text-sky-400 hover:underline px-2 py-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Residential Units Directory Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#182235] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#F1F5F9]">
            Registered Residential Units
          </span>
          <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
            Showing {filteredRooms.length} of {rooms.length} registered rooms
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 dark:text-[#94A3B8] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-institutional-600 dark:text-sky-400" />
            <p>Loading live accommodation records from database...</p>
          </div>
        ) : rooms.length === 0 ? (
          /* Empty Database State */
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1E293B] flex items-center justify-center mx-auto text-slate-400 dark:text-[#64748B]">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-[#F1F5F9]">
              No accommodation currently listed
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              There are currently 0 rooms registered in the database. As soon as the hostel warden configures hostel rooms and bed inventories, real-time availability will automatically appear here.
            </p>
          </div>
        ) : filteredRooms.length === 0 ? (
          /* Empty Filter State */
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mx-auto text-amber-500">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-[#F1F5F9]">
              No rooms match your filter criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              No rooms were found for the selected hostel, room type, or availability status. Try adjusting or resetting your search filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedHostel('all');
                setSelectedGender('all');
                setSelectedRoomType('all');
                setSelectedAvailability('all');
              }}
              className="text-xs font-bold text-institutional-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#94A3B8] uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Room No.</th>
                  <th className="py-3 px-4">Hostel & Block</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Vacant Beds</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-slate-700 dark:text-[#94A3B8]">
                {filteredRooms.map((r: any) => (
                  <tr key={r.Room_ID} className="hover:bg-slate-50 dark:hover:bg-[#1E293B]/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-[#F1F5F9]">
                      {r.Room_Number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-[#F1F5F9]">
                        {r.hostel?.Hostel_Name || 'Unassigned Hostel'}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-[#64748B]">
                        {r.block?.Block_Name || 'Block N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-[#94A3B8]">
                        {r.block?.Gender || r.hostel?.Hostel_Type || 'Co-ed'}
                      </span>
                    </td>
                    <td className="py-3 px-4">Level {r.Floor ?? 1}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] font-medium border border-slate-200 dark:border-[#334155]">
                        {r.Room_Type || 'Standard'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{r.Capacity || r.totalBeds || 1} Beds</td>
                    <td className="py-3 px-4 font-bold">
                      {r.vacantBeds > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {r.vacantBeds} Free <span className="text-xs font-normal text-slate-400 dark:text-[#64748B]">of {r.totalBeds}</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Currently Full</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          r.status === 'available'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            : r.status === 'partially-occupied'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {r.status === 'available'
                          ? 'Available'
                          : r.status === 'partially-occupied'
                          ? 'Partially Free'
                          : 'Currently Full'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectedRoom(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#182235] shadow-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-400 dark:text-[#64748B]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Parent & Student Room Detail Modal */}
      {inspectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-[#334155] space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#334155] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                    Room {inspectedRoom.Room_Number}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    inspectedRoom.status === 'available'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                      : inspectedRoom.status === 'partially-occupied'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                  }`}>
                    {inspectedRoom.status === 'available' ? 'Available' : inspectedRoom.status === 'partially-occupied' ? 'Partially Free' : 'Currently Full'}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] mt-1">
                  {inspectedRoom.hostel?.Hostel_Name || 'Campus Hostel'} · {inspectedRoom.block?.Block_Name || 'Residential Block'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Floor {inspectedRoom.Floor ?? 1} · {inspectedRoom.block?.Gender || inspectedRoom.hostel?.Hostel_Type || 'Co-ed'} Wing
                </p>
              </div>

              <button
                onClick={() => setInspectedRoom(null)}
                className="p-1 rounded-lg text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#1E293B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Specifications */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-100 dark:border-[#334155] text-center text-xs">
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[10px] uppercase font-bold">Room Category</span>
                <span className="font-bold text-slate-800 dark:text-[#F1F5F9] text-sm">{inspectedRoom.Room_Type || 'Standard'}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[10px] uppercase font-bold">Bed Inventory</span>
                <span className="font-bold text-slate-800 dark:text-[#F1F5F9] text-sm">{inspectedRoom.totalBeds} Beds</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[10px] uppercase font-bold">Vacant Beds</span>
                <span className={`font-bold text-sm ${inspectedRoom.vacantBeds > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {inspectedRoom.vacantBeds} Free
                </span>
              </div>
            </div>

            {/* Bed Vacancy Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5">
                <BedIcon className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                <span>Bed Vacancy Breakdown</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                Individual bed slot status for parents and prospective applicants:
              </p>

              <div className="space-y-2 mt-2">
                {inspectedRoom.roomBeds.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
                    No individual bed slots are currently registered in this room.
                  </div>
                ) : (
                  inspectedRoom.roomBeds.map((bed: Bed) => {
                    const isAllocated = activeAllocatedBedIds.has(bed.Bed_ID);
                    const isAvailable = (bed.Bed_Status || 'Available').toLowerCase() === 'available' && !isAllocated;

                    return (
                      <div
                        key={bed.Bed_ID}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <BedIcon className="w-4 h-4 text-slate-400 dark:text-[#64748B]" />
                          <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">
                            Bed {bed.Bed_Number}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                            ({bed.Bed_Type || 'Single'})
                          </span>
                        </div>

                        <div>
                          {isAvailable ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-[#94A3B8]">
                              Occupied / Reserved
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Facilities & Layout Specs */}
            <div className="space-y-3 border-t border-slate-100 dark:border-[#334155] pt-3">
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-[#94A3B8] block uppercase tracking-wider mb-1">
                  Provided Facilities & Amenities
                </span>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed bg-slate-50 dark:bg-[#182235] p-2.5 rounded-xl border border-slate-100 dark:border-[#334155]">
                  {inspectedRoom.Facilities || 'Wi-Fi, Study desk, Wardrobe, Electric points, Solar water heating.'}
                </p>
              </div>

              {inspectedRoom.Layout_Data && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-[#94A3B8] block uppercase tracking-wider mb-1">
                    Spatial Orientation & 3D Geometry
                  </span>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed bg-slate-50 dark:bg-[#182235] p-2.5 rounded-xl border border-slate-100 dark:border-[#334155]">
                    {inspectedRoom.Layout_Data}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#334155]">
              <span className="text-[11px] text-slate-400 dark:text-[#94A3B8] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Institutional Privacy Verified</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectedRoom(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F1F5F9] cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to="/enrollment"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-institutional-800 dark:bg-sky-600 hover:bg-institutional-900 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Apply for Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
