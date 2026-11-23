import React, { useState } from 'react';
import { 
  Bed as BedIcon, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  DoorClosed, 
  User, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  CheckCircle,
  Clock,
  Wrench,
  Building2
} from 'lucide-react';
import { Bed, Room, HostelBlock, Student } from '../../types';
import { apiClient } from '../../services/apiClient';

interface BedsSectionProps {
  beds: Bed[];
  rooms: Room[];
  blocks: HostelBlock[];
  students: Student[];
  onRefresh: () => void;
}

export const BedsSection: React.FC<BedsSectionProps> = ({
  beds,
  rooms,
  blocks,
  students,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [blockFilter, setBlockFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    Bed_ID: number;
    Bed_Number: string;
    Room_ID: number;
    Bed_Type: string;
    Bed_Status: string;
  }>({
    Bed_ID: 0,
    Bed_Number: '',
    Room_ID: rooms[0]?.Room_ID || 1,
    Bed_Type: 'Single Bed',
    Bed_Status: 'Available'
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
  const availableBeds = beds.filter(b => b.Bed_Status === 'Available' || !b.Bed_Status).length;
  const occupiedBeds = beds.filter(b => b.Bed_Status === 'Occupied').length;
  const maintBeds = beds.filter(b => b.Bed_Status === 'Maintenance').length;
  const occRate = beds.length > 0 ? Math.round((occupiedBeds / beds.length) * 100) : 0;

  // Filtered beds
  const filtered = beds.filter(b => {
    const occupant = b.Occupant_Name || '';
    const roomNum = b.Room_Number || '';
    const matchesSearch = 
      b.Bed_Number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roomNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      occupant.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || b.Bed_Status === statusFilter;
    
    let matchesBlock = true;
    if (blockFilter !== 'All') {
      const room = rooms.find(r => r.Room_ID === b.Room_ID);
      matchesBlock = room ? String(room.Block_ID) === blockFilter : false;
    }

    return matchesSearch && matchesStatus && matchesBlock;
  });

  const openCreateModal = () => {
    const nextId = beds.length > 0 ? Math.max(...beds.map(b => b.Bed_ID)) + 1 : 1;
    setFormData({
      Bed_ID: nextId,
      Bed_Number: '',
      Room_ID: rooms[0]?.Room_ID || 1,
      Bed_Type: 'Single Bed',
      Bed_Status: 'Available'
    });
    setModalMode('create');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: Bed) => {
    setFormData({
      Bed_ID: b.Bed_ID,
      Bed_Number: b.Bed_Number,
      Room_ID: b.Room_ID,
      Bed_Type: b.Bed_Type || 'Single Bed',
      Bed_Status: b.Bed_Status || 'Available'
    });
    setModalMode('edit');
    setEditingId(b.Bed_ID);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Bed_Number.trim()) {
      showError('Bed Number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiClient.post('/beds/', formData);
        showSuccess('Bed created successfully.');
      } else {
        await apiClient.put(`/beds/${editingId}`, formData);
        showSuccess('Bed updated successfully.');
      }
      closeModal();
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, number: string) => {
    const target = beds.find(b => b.Bed_ID === id);
    if (target?.Bed_Status === 'Occupied') {
      showError(`Cannot delete Bed "${number}" because it is currently occupied. Deallocate the student first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete Bed "${number}" (ID: ${id})?`)) return;

    try {
      await apiClient.delete(`/beds/${id}`);
      showSuccess(`Bed "${number}" deleted successfully.`);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete bed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Bedding Infrastructure
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Authoritative Bed Matrix</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Bed Inventory & Occupancy
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Real-time status tracking for every residential cot across all rooms and blocks.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bed</span>
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
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Total Inventory</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{beds.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">{rooms.length} rooms linked</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BedIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Available Beds</div>
            <div className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">{availableBeds}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Ready for allocation</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Occupied Beds</div>
            <div className="text-2xl font-black font-display text-rose-600 dark:text-rose-400">{occupiedBeds}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">{occRate}% occupancy rate</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Maintenance</div>
            <div className="text-2xl font-black font-display text-amber-600 dark:text-amber-400">{maintBeds}</div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Offline / repair</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by bed no, room no, or occupant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Block Filter */}
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="All">All Blocks</option>
            {blocks.map(b => (
              <option key={b.Block_ID} value={String(b.Block_ID)}>
                {b.Block_Name} ({b.Hostel_Name || 'Hostel'})
              </option>
            ))}
          </select>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1">
            {['All', 'Available', 'Occupied', 'Maintenance'].map((status) => (
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
      </div>

      {/* 5. Beds Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Bed ID</th>
                <th className="py-3 px-4">Bed Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Room & Wing</th>
                <th className="py-3 px-4">Cot Type</th>
                <th className="py-3 px-4">Current Resident</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {filtered.map(b => {
                const room = rooms.find(r => r.Room_ID === b.Room_ID);
                const roomNum = b.Room_Number || room?.Room_Number || `Room #${b.Room_ID}`;
                const blockName = b.Block_Name || room?.Block_Name || 'Wing';
                const occupantName = b.Occupant_Name;
                const isOccupied = b.Bed_Status === 'Occupied';
                const isMaint = b.Bed_Status === 'Maintenance';

                return (
                  <tr key={b.Bed_ID} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">#{b.Bed_ID}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                          isOccupied 
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400' 
                            : isMaint 
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <BedIcon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">{b.Bed_Number}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isOccupied 
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60' 
                          : isMaint 
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80' 
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                      }`}>
                        {b.Bed_Status || 'Available'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-[#F1F5F9]">
                        <DoorClosed className="w-3.5 h-3.5 text-slate-400 dark:text-[#94A3B8]" />
                        <span>Room {roomNum}</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-normal">({blockName})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      {b.Bed_Type || 'Single Cot'}
                    </td>
                    <td className="py-3.5 px-4">
                      {occupantName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="font-semibold text-indigo-700 dark:text-indigo-400">{occupantName}</span>
                          {b.Occupant_Student_ID && (
                            <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">#{b.Occupant_Student_ID}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-[#94A3B8] italic text-[11px]">Vacant</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="Edit Bed"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.Bed_ID, b.Bed_Number)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Bed"
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
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-[#94A3B8]">
                    <BedIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-[#F1F5F9]">No beds found</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your filters or register a new bed.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <BedIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">
                  {modalMode === 'create' ? 'Add New Bed' : 'Edit Bed Details'}
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Bed ID *</label>
                  <input
                    type="number"
                    value={formData.Bed_ID}
                    onChange={e => setFormData({ ...formData, Bed_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">Unique primary key in the MySQL bed table.</p>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Bed Number / Identifier *</label>
                <input
                  type="text"
                  placeholder="e.g. 101-A, Bed 1, Upper-1"
                  value={formData.Bed_Number}
                  onChange={e => setFormData({ ...formData, Bed_Number: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Assigned Room *</label>
                <select
                  value={formData.Room_ID}
                  onChange={e => setFormData({ ...formData, Room_ID: parseInt(e.target.value) || 0 })}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Cot Type</label>
                  <select
                    value={formData.Bed_Type}
                    onChange={e => setFormData({ ...formData, Bed_Type: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Single Bed">Single Bed</option>
                    <option value="Bunk Bed Upper">Bunk Bed Upper</option>
                    <option value="Bunk Bed Lower">Bunk Bed Lower</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Status *</label>
                  <select
                    value={formData.Bed_Status}
                    onChange={e => setFormData({ ...formData, Bed_Status: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Add Bed' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
