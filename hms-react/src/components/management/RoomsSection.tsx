import React, { useState } from 'react';
import { 
  DoorClosed, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Layers, 
  Users, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Bed as BedIcon
} from 'lucide-react';
import { Room, HostelBlock, Hostel, Bed } from '../../types';
import { apiClient } from '../../services/apiClient';

interface RoomsSectionProps {
  rooms: Room[];
  blocks: HostelBlock[];
  hostels: Hostel[];
  beds: Bed[];
  onRefresh: () => void;
}

export const RoomsSection: React.FC<RoomsSectionProps> = ({
  rooms,
  blocks,
  hostels,
  beds,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [floorFilter, setFloorFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    Room_ID: number;
    Room_Number: string;
    Block_ID: number;
    Floor: number;
    Room_Type: string;
    Capacity: number;
    Facilities: string;
  }>({
    Room_ID: 0,
    Room_Number: '',
    Block_ID: blocks[0]?.Block_ID || 1,
    Floor: 1,
    Room_Type: 'Double',
    Capacity: 2,
    Facilities: 'Wi-Fi, Study Table, Wardrobe'
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
  const totalCapacity = rooms.reduce((sum, r) => sum + (r.Capacity || 0), 0);
  const singleRooms = rooms.filter(r => (r.Room_Type || '').toLowerCase() === 'single').length;
  const doubleRooms = rooms.filter(r => (r.Room_Type || '').toLowerCase() === 'double').length;
  const tripleRooms = rooms.filter(r => (r.Room_Type || '').toLowerCase() === 'triple').length;
  const otherTypes = rooms.length - singleRooms - doubleRooms - tripleRooms;

  // Floors set
  const availableFloors = Array.from(new Set(rooms.map(r => r.Floor).filter(f => f !== null && f !== undefined))) as number[];
  availableFloors.sort((a, b) => a - b);

  // Filtered rooms
  const filtered = rooms.filter(r => {
    const matchesSearch = r.Room_Number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBlock = blockFilter === 'All' || String(r.Block_ID) === blockFilter;
    const matchesType = typeFilter === 'All' || (r.Room_Type || '').toLowerCase() === typeFilter.toLowerCase();
    const matchesFloor = floorFilter === 'All' || String(r.Floor) === floorFilter;
    return matchesSearch && matchesBlock && matchesType && matchesFloor;
  });

  const openCreateModal = () => {
    const nextId = rooms.length > 0 ? Math.max(...rooms.map(r => r.Room_ID)) + 1 : 101;
    setFormData({
      Room_ID: nextId,
      Room_Number: '',
      Block_ID: blocks[0]?.Block_ID || 1,
      Floor: 1,
      Room_Type: 'Double',
      Capacity: 2,
      Facilities: 'Wi-Fi, Study Table, Wardrobe'
    });
    setModalMode('create');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: Room) => {
    setFormData({
      Room_ID: r.Room_ID,
      Room_Number: r.Room_Number,
      Block_ID: r.Block_ID,
      Floor: r.Floor ?? 1,
      Room_Type: r.Room_Type || 'Double',
      Capacity: r.Capacity ?? 2,
      Facilities: r.Facilities || ''
    });
    setModalMode('edit');
    setEditingId(r.Room_ID);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Room_Number.trim()) {
      showError('Room Number is required.');
      return;
    }
    if (formData.Capacity <= 0) {
      showError('Room Capacity must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiClient.post('/rooms/', formData);
        showSuccess('Room created successfully.');
      } else {
        await apiClient.put(`/rooms/${editingId}`, formData);
        showSuccess('Room updated successfully.');
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
    const linkedBeds = beds.filter(b => b.Room_ID === id).length;
    let confirmMsg = `Are you sure you want to delete Room "${number}" (ID: ${id})?`;
    if (linkedBeds > 0) {
      confirmMsg += `\nWarning: There are ${linkedBeds} beds registered inside this room.`;
    }
    if (!window.confirm(confirmMsg)) return;

    try {
      await apiClient.delete(`/rooms/${id}`);
      showSuccess(`Room "${number}" deleted successfully.`);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete room.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Living Spaces
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Room Inventory</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Room Inventory & Capacities
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Manage residential room numbers, floor plans, room configurations, and max bed capacity.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Room</span>
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
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Registered Rooms</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{rooms.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Across {blocks.length} blocks</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <DoorClosed className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Bed Capacity</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{totalCapacity}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Total slots</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <BedIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Room Configurations</div>
            <div className="text-xs font-bold text-slate-900 dark:text-[#F1F5F9] flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-indigo-600 dark:text-indigo-400">{singleRooms} Single</span>
              <span>·</span>
              <span className="text-sky-600 dark:text-sky-400">{doubleRooms} Double</span>
              {tripleRooms > 0 && <span>· <span className="text-teal-600 dark:text-teal-400">{tripleRooms} Triple</span></span>}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Layout variants</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Filter className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Floor Distribution</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">
              {availableFloors.length}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">
              {availableFloors.length > 0 ? `Floors ${Math.min(...availableFloors)} - ${Math.max(...availableFloors)}` : 'Ground floor'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search rooms by number (e.g. 101, 204)..."
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

          {/* Room Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="All">All Room Types</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Triple">Triple</option>
          </select>

          {/* Floor Filter */}
          {availableFloors.length > 0 && (
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="All">All Floors</option>
              {availableFloors.map(f => (
                <option key={f} value={String(f)}>Floor {f}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 5. Rooms Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Room No</th>
                <th className="py-3 px-4">Wing & Building</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Configuration</th>
                <th className="py-3 px-4">Beds & Occupancy</th>
                <th className="py-3 px-4">Facilities</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {filtered.map(r => {
                const block = blocks.find(b => b.Block_ID === r.Block_ID);
                const blockName = r.Block_Name || block?.Block_Name || `Block #${r.Block_ID}`;
                const hostelName = r.Hostel_Name || block?.Hostel_Name || 'Campus';
                const roomBeds = beds.filter(b => b.Room_ID === r.Room_ID);
                const occupiedBeds = r.Occupied_Beds !== undefined 
                  ? r.Occupied_Beds 
                  : roomBeds.filter(b => b.Bed_Status === 'Occupied').length;
                const capacity = r.Capacity || 2;
                const isFull = occupiedBeds >= capacity;

                return (
                  <tr key={r.Room_ID} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          <DoorClosed className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">Room {r.Room_Number}</span>
                          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">ID: #{r.Room_ID}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">{blockName}</span>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{hostelName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#182235] text-[11px] font-medium text-slate-700 dark:text-[#94A3B8]">
                        Floor {r.Floor ?? '1'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                        {r.Room_Type || 'Double'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`font-bold ${isFull ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-[#F1F5F9]'}`}>
                            {occupiedBeds}/{capacity}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Beds</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isFull 
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isFull ? 'Full' : `${capacity - occupiedBeds} Free`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8] max-w-[180px] truncate" title={r.Facilities || ''}>
                      {r.Facilities || 'Standard Amenities'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="Edit Room"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.Room_ID, r.Room_Number)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Room"
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
                    <DoorClosed className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-[#F1F5F9]">No rooms found</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your filters or register a new room.</p>
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
                  <DoorClosed className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">
                  {modalMode === 'create' ? 'Register New Room' : 'Edit Room Configuration'}
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Room ID *</label>
                  <input
                    type="number"
                    value={formData.Room_ID}
                    onChange={e => setFormData({ ...formData, Room_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">Unique primary key in the MySQL room table.</p>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Room Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 101, 102, 204B"
                  value={formData.Room_Number}
                  onChange={e => setFormData({ ...formData, Room_Number: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Hostel Block / Wing *</label>
                <select
                  value={formData.Block_ID}
                  onChange={e => setFormData({ ...formData, Block_ID: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {blocks.map(b => (
                    <option key={b.Block_ID} value={b.Block_ID}>
                      {b.Block_Name} ({b.Hostel_Name || 'Hostel'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Floor</label>
                  <input
                    type="number"
                    value={formData.Floor}
                    onChange={e => setFormData({ ...formData, Floor: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Type</label>
                  <select
                    value={formData.Room_Type}
                    onChange={e => setFormData({ ...formData, Room_Type: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Triple">Triple</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Bed Capacity *</label>
                  <input
                    type="number"
                    value={formData.Capacity}
                    onChange={e => setFormData({ ...formData, Capacity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Room Amenities & Facilities</label>
                <input
                  type="text"
                  placeholder="e.g. Attached Bath, Balcony, Wi-Fi, Air Conditioned"
                  value={formData.Facilities}
                  onChange={e => setFormData({ ...formData, Facilities: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Register Room' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
