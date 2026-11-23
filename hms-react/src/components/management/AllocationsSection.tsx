import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User, 
  DoorClosed, 
  Bed as BedIcon, 
  Calendar, 
  X, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Building2,
  LogOut
} from 'lucide-react';
import { RoomAllocation, Student, Room, Bed, HostelBlock } from '../../types';
import { apiClient } from '../../services/apiClient';

interface AllocationsSectionProps {
  allocations: RoomAllocation[];
  students: Student[];
  rooms: Room[];
  beds: Bed[];
  blocks: HostelBlock[];
  onRefresh: () => void;
}

export const AllocationsSection: React.FC<AllocationsSectionProps> = ({
  allocations,
  students,
  rooms,
  beds,
  blocks,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deallocation modal state
  const [deallocatingAlloc, setDeallocatingAlloc] = useState<RoomAllocation | null>(null);

  const [formData, setFormData] = useState<{
    Allocation_ID: number;
    Student_ID: number;
    Room_ID: number;
    Bed_ID: number;
    Allocation_Date: string;
    Start_Date: string;
    End_Date: string;
    Allocation_Status: string;
  }>({
    Allocation_ID: 0,
    Student_ID: students[0]?.Student_ID || 1,
    Room_ID: rooms[0]?.Room_ID || 1,
    Bed_ID: beds[0]?.Bed_ID || 1,
    Allocation_Date: new Date().toISOString().split('T')[0],
    Start_Date: new Date().toISOString().split('T')[0],
    End_Date: '2027-05-31',
    Allocation_Status: 'Active'
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  // KPIs
  const activeCount = allocations.filter(a => a.Allocation_Status === 'Active' || !a.Allocation_Status).length;
  const completedCount = allocations.filter(a => a.Allocation_Status === 'Completed').length;
  const cancelledCount = allocations.filter(a => a.Allocation_Status === 'Cancelled').length;

  // Filtered allocations
  const filtered = allocations.filter(a => {
    const studentName = a.Student_Name || '';
    const roomNum = a.Room_Number || '';
    const matchesSearch = 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roomNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(a.Allocation_ID).includes(searchTerm) ||
      String(a.Student_ID || '').includes(searchTerm);

    const status = a.Allocation_Status || 'Active';
    const matchesStatus = statusFilter === 'All' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    const nextId = allocations.length > 0 ? Math.max(...allocations.map(a => a.Allocation_ID)) + 1 : 1;
    const defaultRoomId = rooms[0]?.Room_ID || 1;
    const availableBedInRoom = beds.find(b => b.Room_ID === defaultRoomId && b.Bed_Status === 'Available') || beds[0];

    setFormData({
      Allocation_ID: nextId,
      Student_ID: students[0]?.Student_ID || 1,
      Room_ID: defaultRoomId,
      Bed_ID: availableBedInRoom ? availableBedInRoom.Bed_ID : 1,
      Allocation_Date: new Date().toISOString().split('T')[0],
      Start_Date: new Date().toISOString().split('T')[0],
      End_Date: '2027-05-31',
      Allocation_Status: 'Active'
    });
    setModalMode('create');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (a: RoomAllocation) => {
    setFormData({
      Allocation_ID: a.Allocation_ID,
      Student_ID: a.Student_ID || students[0]?.Student_ID || 1,
      Room_ID: a.Room_ID,
      Bed_ID: a.Bed_ID,
      Allocation_Date: a.Allocation_Date ? a.Allocation_Date.substring(0, 10) : new Date().toISOString().split('T')[0],
      Start_Date: a.Start_Date ? a.Start_Date.substring(0, 10) : new Date().toISOString().split('T')[0],
      End_Date: a.End_Date ? a.End_Date.substring(0, 10) : '',
      Allocation_Status: a.Allocation_Status || 'Active'
    });
    setModalMode('edit');
    setEditingId(a.Allocation_ID);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleRoomChange = (newRoomId: number) => {
    const bedsInNewRoom = beds.filter(b => b.Room_ID === newRoomId);
    const firstBed = bedsInNewRoom[0]?.Bed_ID || formData.Bed_ID;
    setFormData({
      ...formData,
      Room_ID: newRoomId,
      Bed_ID: firstBed
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiClient.post('/room-allocations/', formData);
        showSuccess('Room allocation registered successfully.');
      } else {
        await apiClient.put(`/room-allocations/${editingId}`, formData);
        showSuccess('Room allocation updated successfully.');
      }
      closeModal();
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeallocate = async () => {
    if (!deallocatingAlloc) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/room-allocations/${deallocatingAlloc.Allocation_ID}`, {
        Allocation_Status: 'Completed',
        End_Date: new Date().toISOString().split('T')[0]
      });
      showSuccess(`Lease #${deallocatingAlloc.Allocation_ID} terminated and marked Completed. Bed is now available.`);
      setDeallocatingAlloc(null);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to complete deallocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to permanently delete allocation record #${id}?`)) return;

    try {
      await apiClient.delete(`/room-allocations/${id}`);
      showSuccess(`Allocation #${id} removed successfully.`);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete allocation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Residential Leases
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Occupancy Contracts</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Room Allocations & Leases
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Authoritative bindings connecting resident students to physical beds with active dates.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Allocation</span>
        </button>
      </div>

      {/* 2. Notification Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3. Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Active Leases</div>
            <div className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">{activeCount}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Current residents</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Completed Leases</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{completedCount}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Vacated / graduated</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Cancelled Contracts</div>
            <div className="text-2xl font-black font-display text-rose-600 dark:text-rose-400">{cancelledCount}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Revoked / transferred</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Total Leases Recorded</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{allocations.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Historical registry</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by student name, room number, or alloc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {['All', 'Active', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-[#182235] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Allocations Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Lease ID</th>
                <th className="py-3 px-4">Resident Student</th>
                <th className="py-3 px-4">Assigned Room & Cot</th>
                <th className="py-3 px-4">Tenancy Term</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {filtered.map(a => {
                const student = students.find(s => s.Student_ID === a.Student_ID);
                const studentName = a.Student_Name || student?.Name || `Student #${a.Student_ID}`;
                const studentDept = a.Student_Dept || student?.Department || 'Student';
                const roomNum = a.Room_Number || `Room #${a.Room_ID}`;
                const bedNum = a.Bed_Number || `Bed #${a.Bed_ID}`;
                const blockName = a.Block_Name || 'Wing';
                const isActive = a.Allocation_Status === 'Active' || !a.Allocation_Status;

                return (
                  <tr key={a.Allocation_ID} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">#{a.Allocation_ID}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                          {studentName[0]}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{studentName}</span>
                          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">
                            ID: #{a.Student_ID} · {studentDept}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400">
                          <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
                          <span>Room {roomNum}</span>
                          <span>·</span>
                          <span>{bedNum}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]">
                          {blockName} {a.Hostel_Name ? `(${a.Hostel_Name})` : ''}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{a.Start_Date || 'Immediate'}</span>
                        <span className="text-slate-400">→</span>
                        <span>{a.End_Date || 'Ongoing'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                          : a.Allocation_Status === 'Completed'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80'
                          : 'bg-slate-100 dark:bg-[#182235] text-slate-700 dark:text-[#94A3B8] border border-slate-200 dark:border-[#334155]'
                      }`}>
                        {a.Allocation_Status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isActive && (
                          <button
                            onClick={() => setDeallocatingAlloc(a)}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 rounded-lg text-[11px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="End Lease (Vacate)"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Vacate</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(a)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="Edit Allocation"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(a.Allocation_ID)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Allocation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-[#94A3B8]">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-[#F1F5F9]">No room allocations found</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your filters or create a new room allocation.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Deallocate / Vacate Confirmation Modal */}
      {deallocatingAlloc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">Terminate Residential Lease</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Allocation Contract #{deallocatingAlloc.Allocation_ID}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
              Are you sure you want to vacate <strong className="text-slate-900 dark:text-[#F1F5F9]">{deallocatingAlloc.Student_Name || `Student #${deallocatingAlloc.Student_ID}`}</strong> from <strong className="text-slate-900 dark:text-[#F1F5F9]">Room {deallocatingAlloc.Room_Number || deallocatingAlloc.Room_ID} · {deallocatingAlloc.Bed_Number || `Bed #${deallocatingAlloc.Bed_ID}`}</strong>?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-[#94A3B8]">Current Status:</span>
                <span className="font-bold text-emerald-600">{deallocatingAlloc.Allocation_Status || 'Active'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-[#94A3B8]">Action Outcome:</span>
                <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">Marked Completed · Bed freed</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeallocatingAlloc(null)}
                className="px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#182235] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeallocate}
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-amber-600/25 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Vacate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">
                  {modalMode === 'create' ? 'Register Room Allocation' : 'Edit Allocation Contract'}
                </h3>
              </div>
              <button 
                onClick={closeModal} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {modalMode === 'create' && (
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Allocation ID *</label>
                  <input
                    type="number"
                    value={formData.Allocation_ID}
                    onChange={e => setFormData({ ...formData, Allocation_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">Unique primary key in the MySQL room_allocation table.</p>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Resident Student *</label>
                <select
                  value={formData.Student_ID}
                  onChange={e => setFormData({ ...formData, Student_ID: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {students.map(s => (
                    <option key={s.Student_ID} value={s.Student_ID}>
                      {s.Name} (#{s.Student_ID} · {s.Department || 'Student'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Target Room *</label>
                <select
                  value={formData.Room_ID}
                  onChange={e => handleRoomChange(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {rooms.map(r => (
                    <option key={r.Room_ID} value={r.Room_ID}>
                      Room {r.Room_Number} ({r.Block_Name || 'Block'}, {r.Room_Type || 'Double'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Target Bed *</label>
                <select
                  value={formData.Bed_ID}
                  onChange={e => setFormData({ ...formData, Bed_ID: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {beds
                    .filter(b => b.Room_ID === formData.Room_ID)
                    .map(b => (
                      <option key={b.Bed_ID} value={b.Bed_ID}>
                        {b.Bed_Number} (Status: {b.Bed_Status || 'Available'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Start Date *</label>
                  <input
                    type="date"
                    value={formData.Start_Date}
                    onChange={e => setFormData({ ...formData, Start_Date: e.target.value, Allocation_Date: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">End Date</label>
                  <input
                    type="date"
                    value={formData.End_Date}
                    onChange={e => setFormData({ ...formData, End_Date: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Allocation Status *</label>
                <select
                  value={formData.Allocation_Status}
                  onChange={e => setFormData({ ...formData, Allocation_Status: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-[#334155]">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Allocation' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
