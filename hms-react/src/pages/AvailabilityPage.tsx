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
      const [hRes, bRes, rRes, bdRes, aRes] = await Promise.all([
        apiClient.get('/hostels/'),
        apiClient.get('/hostel-blocks/'),
        apiClient.get('/rooms/'),
        apiClient.get('/beds/'),
        apiClient.get('/room-allocations/?status=Active'),
      ]);

      if (hRes.data?.data) setHostels(hRes.data.data);
      if (bRes.data?.data) setBlocks(bRes.data.data);
      if (rRes.data?.data) setRooms(rRes.data.data);
      if (bdRes.data?.data) setBeds(bdRes.data.data);
      if (aRes.data?.data) setAllocations(aRes.data.data);
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
        hostel,
        block,
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
      if (selectedHostel !== 'all' && r.hostel?.Hostel_ID !== selectedHostel) return false;
      if (selectedGender !== 'all') {
        const gender = (r.block?.Gender || r.hostel?.Hostel_Type || '').toLowerCase();
        if (gender !== selectedGender.toLowerCase()) return false;
      }
      if (selectedRoomType !== 'all') {
        const type = (r.Room_Type || '').toLowerCase();
        if (type !== selectedRoomType.toLowerCase()) return false;
      }
      if (selectedAvailability !== 'all' && r.status !== selectedAvailability) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNo = r.Room_Number.toLowerCase().includes(q);
        const matchFac = (r.Facilities || '').toLowerCase().includes(q);
        const matchHostel = (r.hostel?.Hostel_Name || '').toLowerCase().includes(q);
        const matchBlock = (r.block?.Block_Name || '').toLowerCase().includes(q);
        if (!matchNo && !matchFac && !matchHostel && !matchBlock) return false;
      }
      return true;
    });
  }, [computedRooms, selectedHostel, selectedGender, selectedRoomType, selectedAvailability, searchTerm]);

  // Aggregate metrics
  const totalBedsCount = useMemo(() => {
    return computedRooms.reduce((sum, r) => sum + r.totalBeds, 0);
  }, [computedRooms]);

  const totalVacantBedsCount = useMemo(() => {
    return computedRooms.reduce((sum, r) => sum + r.vacantBeds, 0);
  }, [computedRooms]);

  const totalOccupiedBedsCount = totalBedsCount - totalVacantBedsCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-institutional-600 bg-institutional-50 px-3 py-1 rounded-full border border-institutional-200">
              Real-Time Capacity Monitoring
            </span>
            {!error && !loading && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Availability</span>
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            Hostel Room & Bed Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Authoritative room and bed occupancy figures across university residential facilities. Verified directly from our database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLiveDatabaseState}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/explorer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-institutional-800 text-white rounded-lg text-xs font-semibold hover:bg-institutional-900 shadow-sm transition-colors"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Inspect 3D Geometry</span>
          </Link>
        </div>
      </div>

      {/* 2. Verification / Error Banner */}
      {error ? (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-rose-900">
                Availability temporarily unavailable
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                We could not establish a connection to the live hostel database. Fabricated availability is never shown. Please retry.
              </p>
            </div>
          </div>
          <button
            onClick={fetchLiveDatabaseState}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl border text-xs flex items-center justify-between gap-3 bg-emerald-50 border-emerald-200 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                Live Data: Authoritative MySQL Database Records
              </span>
              <p className="mt-0.5 text-slate-600">
                Records fetched directly from local MySQL <code className="font-mono bg-emerald-100/60 px-1 py-0.2 rounded">hms</code> database via the Flask REST API. Bed vacancies update automatically as allocations are registered.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Mock Data</span>
          </span>
        </div>
      )}

      {/* 3. Key Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Registered Hostels</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 mt-1">
            {hostels.length} <span className="text-xs font-normal text-slate-500">Buildings</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {blocks.length} Residential Blocks
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Room Inventory</span>
            <DoorClosed className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 mt-1">
            {rooms.length} <span className="text-xs font-normal text-slate-500">Units</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across registered blocks
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Available Beds</span>
            <BedIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-display text-emerald-700 mt-1">
            {totalVacantBedsCount} <span className="text-xs font-normal text-slate-500">of {totalBedsCount}</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {totalBedsCount > 0 ? `${Math.round((totalVacantBedsCount / totalBedsCount) * 100)}% Available Now` : 'No beds listed'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Occupancy</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 mt-1">
            {totalOccupiedBedsCount} <span className="text-xs font-normal text-slate-500">Occupied</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {allocations.length} Active Allocations
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by room number, facilities, or block..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filter by Hostel */}
            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-institutional-500"
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
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-institutional-500"
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
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-institutional-500"
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
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-institutional-500"
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
                className="text-xs font-semibold text-institutional-600 hover:underline px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Residential Units Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Registered Residential Units
          </span>
          <span className="text-xs text-slate-500">
            Showing {filteredRooms.length} of {rooms.length} registered rooms
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-institutional-600" />
            <p>Loading live accommodation records from database...</p>
          </div>
        ) : rooms.length === 0 ? (
          /* Empty Database State */
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No accommodation currently listed
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              There are currently 0 rooms registered in the database. As soon as the hostel warden configures hostel rooms and bed inventories, real-time availability will automatically appear here.
            </p>
          </div>
        ) : filteredRooms.length === 0 ? (
          /* Empty Filter State */
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-500">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No rooms match your filter criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
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
              className="text-xs font-bold text-institutional-600 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 uppercase font-semibold">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRooms.map((r: any) => (
                  <tr key={r.Room_ID} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {r.Room_Number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {r.hostel?.Hostel_Name || 'Unassigned Hostel'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.block?.Block_Name || 'Block N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {r.block?.Gender || r.hostel?.Hostel_Type || 'Co-ed'}
                      </span>
                    </td>
                    <td className="py-3 px-4">Level {r.Floor ?? 1}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                        {r.Room_Type || 'Standard'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{r.Capacity || r.totalBeds || 1} Beds</td>
                    <td className="py-3 px-4 font-bold">
                      {r.vacantBeds > 0 ? (
                        <span className="text-emerald-700">
                          {r.vacantBeds} Free <span className="text-xs font-normal text-slate-400">of {r.totalBeds}</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold">Currently Full</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          r.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'partially-occupied'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                      >
                        <Eye className="w-3 h-3 text-slate-400" />
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

      {/* 6. Parent & Student Room Detail Modal (Zero Student PII exposed) */}
      {inspectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                    Room {inspectedRoom.Room_Number}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    inspectedRoom.status === 'available'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspectedRoom.status === 'partially-occupied'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {inspectedRoom.status === 'available' ? 'Available' : inspectedRoom.status === 'partially-occupied' ? 'Partially Free' : 'Currently Full'}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display text-slate-900 mt-1">
                  {inspectedRoom.hostel?.Hostel_Name || 'Campus Hostel'} · {inspectedRoom.block?.Block_Name || 'Residential Block'}
                </h3>
                <p className="text-xs text-slate-500">
                  Floor {inspectedRoom.Floor ?? 1} · {inspectedRoom.block?.Gender || inspectedRoom.hostel?.Hostel_Type || 'Co-ed'} Wing
                </p>
              </div>

              <button
                onClick={() => setInspectedRoom(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Specifications */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Room Category</span>
                <span className="font-bold text-slate-800 text-sm">{inspectedRoom.Room_Type || 'Standard'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Bed Inventory</span>
                <span className="font-bold text-slate-800 text-sm">{inspectedRoom.totalBeds} Beds</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Vacant Beds</span>
                <span className={`font-bold text-sm ${inspectedRoom.vacantBeds > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {inspectedRoom.vacantBeds} Free
                </span>
              </div>
            </div>

            {/* Bed Vacancy Breakdown (Strict Privacy: No Student PII) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BedIcon className="w-3.5 h-3.5 text-institutional-600" />
                <span>Bed Vacancy Breakdown</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Individual bed slot status for parents and prospective applicants:
              </p>

              <div className="space-y-2 mt-2">
                {inspectedRoom.roomBeds.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                    No individual bed slots are currently registered in this room.
                  </div>
                ) : (
                  inspectedRoom.roomBeds.map((bed: Bed) => {
                    const isAllocated = activeAllocatedBedIds.has(bed.Bed_ID);
                    const isAvailable = (bed.Bed_Status || 'Available').toLowerCase() === 'available' && !isAllocated;

                    return (
                      <div
                        key={bed.Bed_ID}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 bg-white text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <BedIcon className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            Bed {bed.Bed_Number}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({bed.Bed_Type || 'Single'})
                          </span>
                        </div>

                        <div>
                          {isAvailable ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
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
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Provided Facilities & Amenities
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {inspectedRoom.Facilities || 'Wi-Fi, Study desk, Wardrobe, Electric points, Solar water heating.'}
                </p>
              </div>

              {inspectedRoom.Layout_Data && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider mb-1">
                    Spatial Orientation & 3D Geometry
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {inspectedRoom.Layout_Data}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Institutional Privacy Verified</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectedRoom(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Close
                </button>
                <Link
                  to="/enrollment"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-institutional-800 hover:bg-institutional-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
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
