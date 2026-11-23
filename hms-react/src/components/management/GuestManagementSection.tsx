import React, { useState, useEffect, useCallback } from 'react';
import { 
  Hotel, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  LogIn, 
  LogOut, 
  Eye, 
  RotateCcw, 
  AlertCircle, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  DoorClosed, 
  Users, 
  Check, 
  X, 
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Bed,
  Sparkles,
  MapPin,
  Tag
} from 'lucide-react';
import { GuestStay, GuestStats, Room, AvailableRoomOption } from '../../types';
import { apiClient } from '../../services/apiClient';

interface GuestManagementSectionProps {
  rooms?: Room[];
  onRefresh?: () => void;
}

export const GuestManagementSection: React.FC<GuestManagementSectionProps> = ({ onRefresh }) => {
  // Data state
  const [guests, setGuests] = useState<GuestStay[]>([]);
  const [stats, setStats] = useState<GuestStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    roomAssignedCount: 0,
    unassignedApprovedCount: 0,
    checkedInGuests: 0,
    checkedOutGuests: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [checkInStatusFilter, setCheckInStatusFilter] = useState<string>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals state
  const [selectedGuest, setSelectedGuest] = useState<GuestStay | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Reject modal state
  const [rejectingGuest, setRejectingGuest] = useState<GuestStay | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectRemarks, setRejectRemarks] = useState<string>('');

  // Assign Room modal state
  const [assigningGuest, setAssigningGuest] = useState<GuestStay | null>(null);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [assignRemarks, setAssignRemarks] = useState<string>('');
  const [roomFilterBlock, setRoomFilterBlock] = useState<string>('All');

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Clear alerts after timeout
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 7000);
  };

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/guests/stats');
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load guest statistics:', err);
    }
  }, []);

  // Fetch Guest Requests
  const fetchGuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 15,
        sort: sortBy,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'All') params.status = statusFilter;
      if (checkInStatusFilter !== 'All') params.checkInStatus = checkInStatusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await apiClient.get('/guests', { params });
      if (res.data?.data) {
        let rows: GuestStay[] = res.data.data;
        if (assignmentFilter === 'Assigned') {
          rows = rows.filter(g => g.Assigned_Room_ID !== null);
        } else if (assignmentFilter === 'Unassigned') {
          rows = rows.filter(g => g.Assigned_Room_ID === null && g.Status === 'Approved');
        }
        setGuests(rows);
        setTotalCount(res.data.total || rows.length);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Failed to load guest list:', err);
      showError(err.message || 'Failed to load guest reservations from server.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, searchTerm, statusFilter, checkInStatusFilter, assignmentFilter, startDate, endDate]);

  useEffect(() => {
    fetchStats();
    fetchGuests();
  }, [fetchStats, fetchGuests]);

  const handleRefresh = () => {
    fetchStats();
    fetchGuests();
    if (onRefresh) onRefresh();
  };

  // =========================================================================
  // Operational Actions
  // =========================================================================

  // 1. Approve Request
  const handleApprove = async (guest: GuestStay) => {
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/guests/${guest.Guest_ID}/approve`, {});
      showSuccess(`Reservation for ${guest.Guest_Name} approved. Please assign a room.`);
      handleRefresh();
      if (selectedGuest?.Guest_ID === guest.Guest_ID && res.data?.data) {
        setSelectedGuest(res.data.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to approve guest request.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Reject Request
  const handleConfirmReject = async () => {
    if (!rejectingGuest) return;
    if (!rejectionReason.trim()) {
      showError('Please provide a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/guests/${rejectingGuest.Guest_ID}/reject`, {
        rejectionReason: rejectionReason.trim(),
        adminRemarks: rejectRemarks.trim() || undefined,
      });
      showSuccess(`Reservation for ${rejectingGuest.Guest_Name} marked as Rejected.`);
      setRejectingGuest(null);
      setRejectionReason('');
      setRejectRemarks('');
      handleRefresh();
      if (selectedGuest?.Guest_ID === rejectingGuest.Guest_ID && res.data?.data) {
        setSelectedGuest(res.data.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to reject guest request.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Open Room Assignment Modal
  const openAssignModal = async (guest: GuestStay) => {
    setAssigningGuest(guest);
    setSelectedRoomId(guest.Assigned_Room_ID || null);
    setAssignRemarks(guest.Admin_Remarks || '');
    setLoadingRooms(true);
    try {
      const res = await apiClient.get(`/guests/${guest.Guest_ID}/available-rooms`);
      if (res.data?.data) {
        setAvailableRooms(res.data.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to fetch available rooms for this reservation.');
    } finally {
      setLoadingRooms(false);
    }
  };

  // 4. Confirm Room Assignment
  const handleConfirmAssignRoom = async () => {
    if (!assigningGuest) return;
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/guests/${assigningGuest.Guest_ID}/assign-room`, {
        roomId: selectedRoomId,
        adminRemarks: assignRemarks.trim() || undefined,
      });
      showSuccess(res.data?.message || 'Room assigned successfully.');
      setAssigningGuest(null);
      setSelectedRoomId(null);
      setAssignRemarks('');
      handleRefresh();
      if (selectedGuest?.Guest_ID === assigningGuest.Guest_ID && res.data?.data) {
        setSelectedGuest(res.data.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to assign room.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Check-In Guest
  const handleCheckIn = async (guest: GuestStay) => {
    if (!guest.Assigned_Room_ID) {
      showError('Cannot check in guest without an assigned room. Please assign a room first.');
      openAssignModal(guest);
      return;
    }
    if (!window.confirm(`Confirm guest arrival and check-in for ${guest.Guest_Name} into Room ${guest.Assigned_Room_Number || `#${guest.Assigned_Room_ID}`}?`)) return;
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/guests/${guest.Guest_ID}/check-in`);
      showSuccess(`Guest ${guest.Guest_Name} checked in successfully.`);
      handleRefresh();
      if (selectedGuest?.Guest_ID === guest.Guest_ID && res.data?.data) {
        setSelectedGuest(res.data.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to check-in guest.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Check-Out Guest
  const handleCheckOut = async (guest: GuestStay) => {
    if (!window.confirm(`Confirm departure and check-out for ${guest.Guest_Name}? This will free up the room inventory.`)) return;
    setActionLoading(true);
    try {
      const res = await apiClient.patch(`/guests/${guest.Guest_ID}/check-out`);
      showSuccess(`Guest ${guest.Guest_Name} checked out successfully.`);
      handleRefresh();
      if (selectedGuest?.Guest_ID === guest.Guest_ID && res.data?.data) {
        setSelectedGuest(res.data.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to check-out guest.');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Delete Request
  const handleDelete = async (guest: GuestStay) => {
    if (!window.confirm(`Permanently delete guest reservation for ${guest.Guest_Name} (${guest.Reference_No})?`)) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/guests/${guest.Guest_ID}`);
      showSuccess(`Guest reservation ${guest.Reference_No} deleted.`);
      if (selectedGuest?.Guest_ID === guest.Guest_ID) {
        setIsDetailModalOpen(false);
        setSelectedGuest(null);
      }
      handleRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete guest reservation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Details Modal
  const openDetailModal = async (guest: GuestStay) => {
    try {
      const res = await apiClient.get(`/guests/${guest.Guest_ID}`);
      setSelectedGuest(res.data?.data || guest);
    } catch {
      setSelectedGuest(guest);
    }
    setIsDetailModalOpen(true);
  };

  // Filter available rooms in modal by block
  const filteredAvailableRooms = availableRooms.filter(r => {
    if (roomFilterBlock === 'All') return true;
    return r.Block_Name === roomFilterBlock;
  });

  const uniqueBlocks = Array.from(new Set(availableRooms.map(r => r.Block_Name))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. Header & Controls */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">
                Guest Stay & Accommodation Workflow
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Review campus visitor reservations, assign guest rooms, and log arrivals and departures
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#182235] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. Notification Banners */}
      {/* ===================================================================== */}
      {successMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200">&times;</button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 dark:hover:text-rose-200">&times;</button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. Operational KPI Cards */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
            <Hotel className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-[#F1F5F9]">{stats.totalRequests}</div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">All records</p>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.pendingRequests}</div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Awaiting review</p>
        </div>

        {/* Room Assigned */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Assigned</span>
            <Bed className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.roomAssignedCount || 0}</div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Room ready</p>
        </div>

        {/* Needs Room */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Needs Room</span>
            <DoorClosed className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.unassignedApprovedCount || 0}</div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Approved, no room</p>
        </div>

        {/* Checked-In */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Checked In</span>
            <LogIn className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-xl font-black text-sky-600 dark:text-sky-400">{stats.checkedInGuests}</div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Currently on campus</p>
        </div>

        {/* Checked-Out */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-700 dark:text-slate-300">{stats.checkedOutGuests}</div>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Checked out stays</p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. Filter, Search & Sorting Controls */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by guest name, phone, email, reference ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400 dark:placeholder:text-[#94A3B8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="All">All Approvals</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Check-In Status */}
          <select
            value={checkInStatusFilter}
            onChange={(e) => setCheckInStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="All">All Operations</option>
            <option value="Pending">Pending Arrival</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Checked-Out">Checked-Out</option>
          </select>

          {/* Room Assignment Filter */}
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="All">All Room States</option>
            <option value="Assigned">Room Assigned</option>
            <option value="Unassigned">Awaiting Room</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="created_desc">Most Recent</option>
            <option value="checkin_asc">Upcoming Arrival</option>
            <option value="checkin_desc">Latest Arrival</option>
            <option value="name_asc">Guest Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. Main Guest Requests Table */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Reference & Dates</th>
                <th className="py-3.5 px-4">Guest Information</th>
                <th className="py-3.5 px-4">Purpose & Host</th>
                <th className="py-3.5 px-4">Assigned Room</th>
                <th className="py-3.5 px-4">Approval</th>
                <th className="py-3.5 px-4">Operation</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-[#94A3B8]">
                    <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                    <span>Loading guest stay records...</span>
                  </td>
                </tr>
              ) : guests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-[#94A3B8]">
                    <Hotel className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No guest stay requests match current filters.</p>
                  </td>
                </tr>
              ) : (
                guests.map((g) => {
                  const isPending = g.Status === 'Pending';
                  const isApproved = g.Status === 'Approved';
                  const isRejected = g.Status === 'Rejected';
                  const isCheckedIn = g.Check_In_Status === 'Checked-In';
                  const isCheckedOut = g.Check_In_Status === 'Checked-Out';
                  const hasRoom = !!g.Assigned_Room_ID;

                  return (
                    <tr key={g.Guest_ID} className="hover:bg-slate-50/80 dark:hover:bg-[#182235]/60 transition-colors">
                      {/* Reference & Dates */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">
                          {g.Reference_No}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{g.Check_In_Date} &rarr; {g.Check_Out_Date}</span>
                        </div>
                      </td>

                      {/* Guest Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {g.Guest_Name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-[#F1F5F9] leading-tight">
                              {g.Guest_Name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                              {g.Phone} &bull; {g.Guest_Count} guest{g.Guest_Count > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Purpose & Host */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-[#F1F5F9]">
                          {g.Purpose}
                        </div>
                        {g.Matched_Student_Name ? (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                            Host: {g.Matched_Student_Name} (#{g.Student_ID})
                          </div>
                        ) : g.Student_Reference ? (
                          <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                            Ref: {g.Student_Reference}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">Official Guest</div>
                        )}
                      </td>

                      {/* Assigned Room */}
                      <td className="py-3.5 px-4">
                        {hasRoom ? (
                          <div>
                            <div className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <DoorClosed className="w-3 h-3 text-emerald-600" />
                              <span>Room {g.Assigned_Room_Number || `#${g.Assigned_Room_ID}`}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                              {g.Assigned_Block_Name || 'Campus Wing'}
                            </div>
                          </div>
                        ) : isApproved ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/80">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            <span>Room Not Assigned</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                            {g.Room_Preference}
                          </span>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80' :
                          isRejected ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80' :
                          'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80'
                        }`}>
                          {isApproved && <Check className="w-3 h-3" />}
                          {isRejected && <X className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          <span>{g.Status}</span>
                        </span>
                      </td>

                      {/* Operation / Check-In Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                          isCheckedIn ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80' :
                          isCheckedOut ? 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' :
                          'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-[#1E293B] dark:text-slate-400 dark:border-[#334155]'
                        }`}>
                          {isCheckedIn && <LogIn className="w-3 h-3 text-sky-600" />}
                          {isCheckedOut && <LogOut className="w-3 h-3 text-slate-500" />}
                          <span>{g.Check_In_Status}</span>
                        </span>
                      </td>

                      {/* Contextual Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* View Details */}
                        <button
                          onClick={() => openDetailModal(g)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#94A3B8] hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                          title="View complete details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Pending: Approve & Reject */}
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(g)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors disabled:opacity-50"
                              title="Approve Request"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setRejectingGuest(g); setRejectionReason(''); setRejectRemarks(''); }}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50"
                              title="Reject Request"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Approved & Unassigned: Assign Room Action */}
                        {isApproved && !hasRoom && (
                          <button
                            onClick={() => openAssignModal(g)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                            title="Assign Guest Room"
                          >
                            <Bed className="w-3 h-3" />
                            <span>Assign Room</span>
                          </button>
                        )}

                        {/* Approved & Has Room & Pending Arrival: Check-In or Modify Room */}
                        {isApproved && hasRoom && !isCheckedIn && !isCheckedOut && (
                          <>
                            <button
                              onClick={() => openAssignModal(g)}
                              className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                              title="Change Assigned Room"
                            >
                              <Bed className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCheckIn(g)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors"
                              title="Check In Guest"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>Check In</span>
                            </button>
                          </>
                        )}

                        {/* Checked-In: Check-Out Action */}
                        {isCheckedIn && (
                          <button
                            onClick={() => handleCheckOut(g)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white shadow-xs transition-colors"
                            title="Check Out Guest"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check Out</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-slate-100 dark:border-[#334155] text-xs text-slate-500 dark:text-[#94A3B8]">
            <div>
              Showing {guests.length} of {totalCount} records (Page {currentPage} of {totalPages})
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 border border-slate-200 dark:border-[#334155] rounded-lg disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-bold">{currentPage}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 border border-slate-200 dark:border-[#334155] rounded-lg disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 6. Dedicated Room Assignment Modal */}
      {/* ===================================================================== */}
      {assigningGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#334155]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    Room Assignment Workflow
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {assigningGuest.Reference_No}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-[#F1F5F9]">
                  Assign Guest Accommodation
                </h2>
              </div>
              <button
                onClick={() => setAssigningGuest(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            {/* Guest Reservation Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-2xl text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Guest Name</span>
                <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{assigningGuest.Guest_Name}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Stay Dates</span>
                <p className="font-bold text-teal-600 dark:text-teal-400">{assigningGuest.Check_In_Date} &rarr; {assigningGuest.Check_Out_Date}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Guest Count</span>
                <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{assigningGuest.Guest_Count} Person(s)</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Preference</span>
                <p className="font-bold text-indigo-600 dark:text-indigo-400">{assigningGuest.Room_Preference}</p>
              </div>
            </div>

            {/* Wing / Block Filter */}
            {uniqueBlocks.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">Filter Wing/Block:</span>
                <button
                  type="button"
                  onClick={() => setRoomFilterBlock('All')}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                    roomFilterBlock === 'All'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  All Wings
                </button>
                {uniqueBlocks.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setRoomFilterBlock(b)}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                      roomFilterBlock === b
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {/* Available Rooms Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-[#94A3B8]">
                <span>Available Eligible Accommodation ({filteredAvailableRooms.length})</span>
                <span className="text-[11px] font-normal">Evaluated against actual student & guest lease records</span>
              </div>

              {loadingRooms ? (
                <div className="text-center py-8 text-slate-400">
                  <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-500" />
                  <span>Checking room inventory and lease overlaps...</span>
                </div>
              ) : filteredAvailableRooms.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-[#334155] rounded-2xl text-xs text-slate-400">
                  No rooms match criteria for this wing.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                  {filteredAvailableRooms.map((r) => {
                    const isSelected = selectedRoomId === r.Room_ID;
                    const disabled = !r.is_available;

                    return (
                      <div
                        key={r.Room_ID}
                        onClick={() => {
                          if (!disabled) setSelectedRoomId(r.Room_ID);
                        }}
                        className={`p-3.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
                            : disabled
                            ? 'border-slate-200 dark:border-[#334155] opacity-50 bg-slate-50 dark:bg-[#182235]/40 cursor-not-allowed'
                            : 'border-slate-200 dark:border-[#334155] hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-[#182235]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-1.5">
                            <DoorClosed className="w-4 h-4 text-teal-600" />
                            <span>Room {r.Room_Number}</span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-[#94A3B8]">({r.Hostel_Name} &bull; {r.Block_Name})</span>
                          </div>
                          {r.is_currently_assigned ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                              Currently Assigned
                            </span>
                          ) : r.is_available ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              Occupied / Conflict
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1">
                          <span>Type: <strong>{r.Room_Type}</strong> &bull; Floor {r.Floor ?? 1}</span>
                          <span>Avail: <strong className="text-emerald-600 dark:text-emerald-400">{r.available_capacity} / {r.Capacity} beds</strong></span>
                        </div>

                        {r.Facilities && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                            {r.Facilities}
                          </div>
                        )}

                        {r.active_reservations && (
                          <div className="text-[9px] text-amber-700 dark:text-amber-400 mt-1 italic">
                            Conflicts: {r.active_reservations}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Remarks Input */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">
                Warden Room Assignment Notes (Optional)
              </label>
              <input
                type="text"
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                placeholder="e.g. Assigned ground floor suite near entrance"
                className="w-full p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#334155]">
              {assigningGuest.Assigned_Room_ID ? (
                <button
                  type="button"
                  onClick={() => { setSelectedRoomId(null); handleConfirmAssignRoom(); }}
                  disabled={actionLoading}
                  className="px-3 py-1.5 border border-rose-200 dark:border-rose-800 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  Unassign Room
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningGuest(null)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignRoom}
                  disabled={actionLoading || !selectedRoomId}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Room Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. Rejection Reason Modal */}
      {/* ===================================================================== */}
      {rejectingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#334155]">
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                Reject Guest Reservation
              </h2>
              <button onClick={() => setRejectingGuest(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <div className="text-xs text-slate-600 dark:text-[#94A3B8]">
              Rejecting request for <strong className="text-slate-900 dark:text-[#F1F5F9]">{rejectingGuest.Guest_Name}</strong> ({rejectingGuest.Reference_No}). Please state the institutional reason.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Guest rooms undergoing scheduled plumbing maintenance, or maximum campus capacity reached."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">
                  Internal Admin Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="e.g. Advised to re-apply next week"
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <button
                type="button"
                onClick={() => setRejectingGuest(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. Comprehensive 8-Section Details Modal */}
      {/* ===================================================================== */}
      {isDetailModalOpen && selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#334155]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    Guest Booking Record
                  </span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#182235] text-slate-700 dark:text-[#94A3B8]">
                    {selectedGuest.Reference_No}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-[#F1F5F9]">
                  {selectedGuest.Guest_Name}
                </h2>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {/* Section 1: Guest Profile & Visit Purpose */}
            <div className="p-4 bg-slate-50 dark:bg-[#182235] rounded-2xl border border-slate-200 dark:border-[#334155] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                1. Guest & Visit Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Primary Purpose:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Purpose}</p>
                </div>
                <div>
                  <span className="text-slate-400">Guest Count:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Guest_Count} Person(s)</p>
                </div>
                <div>
                  <span className="text-slate-400">Contact Email:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Email}</p>
                </div>
                <div>
                  <span className="text-slate-400">Phone Number:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Phone}</p>
                </div>
              </div>
              {selectedGuest.Special_Requests && (
                <div className="pt-2 border-t border-slate-200 dark:border-[#334155] text-xs">
                  <span className="text-slate-400">Special Requests:</span>
                  <p className="text-slate-800 dark:text-slate-200 italic mt-0.5">{selectedGuest.Special_Requests}</p>
                </div>
              )}
            </div>

            {/* Section 2: Visiting Student / Host Information */}
            {(selectedGuest.Matched_Student_Name || selectedGuest.Student_Reference) && (
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-2 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  2. University Student Host
                </h3>
                <div className="grid grid-cols-2 gap-2 text-slate-800 dark:text-slate-200">
                  <div>
                    <span className="text-slate-400">Student Host:</span>
                    <p className="font-bold">{selectedGuest.Matched_Student_Name || `Ref: ${selectedGuest.Student_Reference}`}</p>
                  </div>
                  {selectedGuest.Matched_Student_Dept && (
                    <div>
                      <span className="text-slate-400">Department:</span>
                      <p className="font-bold">{selectedGuest.Matched_Student_Dept} {selectedGuest.Matched_Student_Year ? `(Year ${selectedGuest.Matched_Student_Year})` : ''}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Schedule & Assigned Room */}
            <div className="p-4 bg-slate-50 dark:bg-[#182235] rounded-2xl border border-slate-200 dark:border-[#334155] space-y-3 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                3. Reservation & Assigned Accommodation
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400">Scheduled Arrival:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Check_In_Date}</p>
                </div>
                <div>
                  <span className="text-slate-400">Scheduled Departure:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Check_Out_Date}</p>
                </div>
                <div>
                  <span className="text-slate-400">Room Preference:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Room_Preference}</p>
                </div>
                <div>
                  <span className="text-slate-400">Assigned Room:</span>
                  {selectedGuest.Assigned_Room_ID ? (
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      Room {selectedGuest.Assigned_Room_Number || `#${selectedGuest.Assigned_Room_ID}`} ({selectedGuest.Assigned_Block_Name || 'Campus Wing'})
                    </p>
                  ) : (
                    <p className="font-bold text-amber-600 dark:text-amber-400">Not Yet Assigned</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Operational Audit & Rejection Reasons */}
            <div className="p-4 bg-slate-50 dark:bg-[#182235] rounded-2xl border border-slate-200 dark:border-[#334155] space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                4. Operational Timestamps & Audit
              </h3>
              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-[#94A3B8]">
                <div>
                  <span>Approval State:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Status} {selectedGuest.Approved_By_Name ? `(By ${selectedGuest.Approved_By_Name})` : ''}</p>
                </div>
                <div>
                  <span>Operation State:</span>
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9]">{selectedGuest.Check_In_Status}</p>
                </div>
                {selectedGuest.Actual_Check_In && (
                  <div>
                    <span>Checked In At:</span>
                    <p className="font-bold text-sky-600">{selectedGuest.Actual_Check_In}</p>
                  </div>
                )}
                {selectedGuest.Actual_Check_Out && (
                  <div>
                    <span>Checked Out At:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{selectedGuest.Actual_Check_Out}</p>
                  </div>
                )}
              </div>

              {selectedGuest.Rejection_Reason && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-800 dark:text-rose-300 mt-2">
                  <span className="font-bold">Rejection Reason:</span> {selectedGuest.Rejection_Reason}
                </div>
              )}

              {selectedGuest.Admin_Remarks && (
                <div className="text-slate-600 dark:text-[#94A3B8] italic mt-1">
                  Remarks: {selectedGuest.Admin_Remarks}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#334155]">
              <button
                type="button"
                onClick={() => handleDelete(selectedGuest)}
                className="px-3 py-1.5 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50"
              >
                Delete Record
              </button>

              <div className="flex items-center gap-2">
                {selectedGuest.Status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { handleApprove(selectedGuest); setIsDetailModalOpen(false); }}
                      className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectingGuest(selectedGuest); setIsDetailModalOpen(false); }}
                      className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
                    >
                      Reject
                    </button>
                  </>
                )}

                {selectedGuest.Status === 'Approved' && (
                  <button
                    type="button"
                    onClick={() => { openAssignModal(selectedGuest); setIsDetailModalOpen(false); }}
                    className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                  >
                    {selectedGuest.Assigned_Room_ID ? 'Change Room' : 'Assign Room'}
                  </button>
                )}

                {selectedGuest.Status === 'Approved' && selectedGuest.Assigned_Room_ID && selectedGuest.Check_In_Status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => { handleCheckIn(selectedGuest); setIsDetailModalOpen(false); }}
                    className="px-3.5 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-500"
                  >
                    Check In
                  </button>
                )}

                {selectedGuest.Check_In_Status === 'Checked-In' && (
                  <button
                    type="button"
                    onClick={() => { handleCheckOut(selectedGuest); setIsDetailModalOpen(false); }}
                    className="px-3.5 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
                  >
                    Check Out
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#94A3B8]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
