import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Building2, 
  Layers, 
  DoorClosed, 
  Bed as BedIcon, 
  Users, 
  CheckCircle2, 
  UserCheck, 
  Sliders, 
  CreditCard,
  Box,
  RotateCcw,
  X,
  AlertCircle
} from 'lucide-react';
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
import { apiClient } from '../../services/apiClient';
import { Building3D } from '../3d/Building3D';
import { FloorSelector } from '../3d/FloorSelector';
import { RoomDetailModal } from '../3d/RoomDetailModal';
import { ILLUSTRATIVE_ROOMS, IllustrativeRoom } from '../../data/illustrativeHostel';
import { ModelManagementSection } from './ModelManagementSection';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // 3D Layout states
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedRoom, setSelectedRoom] = useState<IllustrativeRoom | null>(null);
  const [cutawayMode, setCutawayMode] = useState(false);

  const resetMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const openCreateModal = (defaults: Record<string, any> = {}) => {
    resetMessages();
    setModalMode('create');
    setEditingId(null);
    setFormData(defaults);
    setIsModalOpen(true);
  };

  const openEditModal = (id: number, data: Record<string, any>) => {
    resetMessages();
    setModalMode('edit');
    setEditingId(id);
    setFormData(data);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  const handleDelete = async (url: string, id: number) => {
    if (!window.confirm(`Are you sure you want to delete this record (ID: ${id})?`)) return;
    resetMessages();
    try {
      await apiClient.delete(`${url}${id}`);
      setSuccessMsg('Record deleted successfully.');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete record.');
    }
  };

  const handleSubmit = async (url: string) => {
    resetMessages();
    try {
      if (modalMode === 'create') {
        await apiClient.post(url, formData);
        setSuccessMsg('Record created successfully.');
      } else {
        await apiClient.put(`${url}${editingId}`, formData);
        setSuccessMsg('Record updated successfully.');
      }
      closeModal();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed.');
    }
  };

  // =========================================================================
  // 1. 3D Layout & Floors View
  // =========================================================================
  if (tab === 'layout') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                Interactive Spatial Module
              </span>
              <span className="text-xs text-slate-400 font-medium">Aryabhatta Campus Prototype</span>
            </div>
            <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">
              3D Layout & Floor Architecture
            </h2>
          </div>
          <button
            onClick={() => {
              setSelectedFloor('all');
              setCutawayMode(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Camera</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-[520px] w-full rounded-2xl overflow-hidden relative shadow-lg border border-slate-800">
              <Building3D
                rooms={ILLUSTRATIVE_ROOMS.filter(r => selectedFloor === 'all' || r.Floor === selectedFloor)}
                selectedFloor={selectedFloor}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                cutawayMode={cutawayMode}
              />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-5">
            <FloorSelector
              selectedFloor={selectedFloor}
              onSelectFloor={setSelectedFloor}
              floorStats={[1, 2, 3].map(f => {
                const flr = ILLUSTRATIVE_ROOMS.filter(r => r.Floor === f);
                return {
                  floor: f,
                  label: `Floor ${f}`,
                  totalRooms: flr.length,
                  availableBeds: flr.reduce((sum, r) => sum + r.availableBeds, 0)
                };
              })}
              cutawayMode={cutawayMode}
              onToggleCutaway={() => setCutawayMode(!cutawayMode)}
            />
          </div>
        </div>

        {selectedRoom && (
          <RoomDetailModal
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
          />
        )}

        {/* 3D Model Management Section */}
        <ModelManagementSection hostels={hostels} />
      </div>
    );
  }

  // =========================================================================
  // 2. Generic Header & Alerts for Management Modules
  // =========================================================================
  const renderMessages = () => (
    <>
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </>
  );

  // =========================================================================
  // 3. Hostel Management
  // =========================================================================
  if (tab === 'hostels') {
    const filtered = hostels.filter(h => 
      h.Hostel_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.Location || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search hostels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => openCreateModal({ Hostel_ID: hostels.length + 1, Capacity: 100, Hostel_Type: 'Boys' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hostel</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Hostel Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(h => (
                <tr key={h.Hostel_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{h.Hostel_ID}</td>
                  <td className="py-3 px-4 font-semibold text-indigo-700">{h.Hostel_Name}</td>
                  <td className="py-3 px-4 text-slate-600">{h.Location || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{h.Capacity || 0}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {h.Hostel_Type || 'Standard'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(h.Hostel_ID, h)}
                      className="p-1 text-slate-500 hover:text-indigo-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('/hostels/', h.Hostel_ID)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">No hostel records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  {modalMode === 'create' ? 'Add Hostel' : 'Edit Hostel'}
                </h3>
                <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 text-xs">
                {modalMode === 'create' && (
                  <div>
                    <label className="block font-semibold mb-1">Hostel ID *</label>
                    <input
                      type="number"
                      value={formData.Hostel_ID || ''}
                      onChange={e => setFormData({ ...formData, Hostel_ID: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold mb-1">Hostel Name *</label>
                  <input
                    type="text"
                    value={formData.Hostel_Name || ''}
                    onChange={e => setFormData({ ...formData, Hostel_Name: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.Location || ''}
                    onChange={e => setFormData({ ...formData, Location: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.Capacity || ''}
                    onChange={e => setFormData({ ...formData, Capacity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hostel Type</label>
                  <select
                    value={formData.Hostel_Type || 'Boys'}
                    onChange={e => setFormData({ ...formData, Hostel_Type: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                    <option value="Co-ed">Co-ed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={closeModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold">Cancel</button>
                <button onClick={() => handleSubmit('/hostels/')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 4. Block Management
  // =========================================================================
  if (tab === 'blocks') {
    const filtered = blocks.filter(b => b.Block_Name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search blocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => openCreateModal({ Block_ID: blocks.length + 1, Hostel_ID: hostels[0]?.Hostel_ID || 1, Gender: 'Male' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Block</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Block Name</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Hostel ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(b => (
                <tr key={b.Block_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{b.Block_ID}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{b.Block_Name}</td>
                  <td className="py-3 px-4 text-slate-600">{b.Gender || 'Mixed'}</td>
                  <td className="py-3 px-4 text-slate-600">{b.Capacity || 0}</td>
                  <td className="py-3 px-4 font-medium text-indigo-600">Hostel #{b.Hostel_ID}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 italic">No hostel blocks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Add Hostel Block</h3>
                <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Block ID *</label>
                  <input
                    type="number"
                    value={formData.Block_ID || ''}
                    onChange={e => setFormData({ ...formData, Block_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Block Name *</label>
                  <input
                    type="text"
                    value={formData.Block_Name || ''}
                    onChange={e => setFormData({ ...formData, Block_Name: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hostel *</label>
                  <select
                    value={formData.Hostel_ID || ''}
                    onChange={e => setFormData({ ...formData, Hostel_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    {hostels.map(h => (
                      <option key={h.Hostel_ID} value={h.Hostel_ID}>
                        {h.Hostel_Name} (#{h.Hostel_ID})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Gender</label>
                  <select
                    value={formData.Gender || 'Male'}
                    onChange={e => setFormData({ ...formData, Gender: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.Capacity || ''}
                    onChange={e => setFormData({ ...formData, Capacity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={closeModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold">Cancel</button>
                <button onClick={() => handleSubmit('/hostel-blocks/')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 5. Room Management
  // =========================================================================
  if (tab === 'rooms') {
    const filtered = rooms.filter(r => r.Room_Number.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search rooms by number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => openCreateModal({ Room_ID: rooms.length + 1, Block_ID: blocks[0]?.Block_ID || 1, Floor: 1, Capacity: 2, Room_Type: 'Double' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Room No</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Block</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <tr key={r.Room_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.Room_ID}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{r.Room_Number}</td>
                  <td className="py-3 px-4 text-slate-600">Floor {r.Floor ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {r.Room_Type || 'Standard'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.Capacity ?? 0} Beds</td>
                  <td className="py-3 px-4 font-medium text-slate-700">Block #{r.Block_ID}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button onClick={() => openEditModal(r.Room_ID, r)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('/rooms/', r.Room_ID)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">No rooms registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-base text-slate-900">{modalMode === 'create' ? 'Add Room' : 'Edit Room'}</h3>
                <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 text-xs">
                {modalMode === 'create' && (
                  <div>
                    <label className="block font-semibold mb-1">Room ID *</label>
                    <input
                      type="number"
                      value={formData.Room_ID || ''}
                      onChange={e => setFormData({ ...formData, Room_ID: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold mb-1">Room Number *</label>
                  <input
                    type="text"
                    value={formData.Room_Number || ''}
                    onChange={e => setFormData({ ...formData, Room_Number: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Block *</label>
                  <select
                    value={formData.Block_ID || ''}
                    onChange={e => setFormData({ ...formData, Block_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    {blocks.map(b => (
                      <option key={b.Block_ID} value={b.Block_ID}>{b.Block_Name} (#{b.Block_ID})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Floor</label>
                  <input
                    type="number"
                    value={formData.Floor || ''}
                    onChange={e => setFormData({ ...formData, Floor: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Room Type</label>
                  <input
                    type="text"
                    value={formData.Room_Type || ''}
                    onChange={e => setFormData({ ...formData, Room_Type: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.Capacity || ''}
                    onChange={e => setFormData({ ...formData, Capacity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={closeModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold">Cancel</button>
                <button onClick={() => handleSubmit('/rooms/')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 6. Bed Management
  // =========================================================================
  if (tab === 'beds') {
    const filtered = beds.filter(b => b.Bed_Number.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search beds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => openCreateModal({ Bed_ID: beds.length + 1, Room_ID: rooms[0]?.Room_ID || 1, Bed_Status: 'Available' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bed</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Bed Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Room ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(b => (
                <tr key={b.Bed_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{b.Bed_ID}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{b.Bed_Number}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.Bed_Status === 'Occupied' ? 'bg-rose-50 text-rose-700' :
                      b.Bed_Status === 'Maintenance' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {b.Bed_Status || 'Available'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">Room #{b.Room_ID}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button onClick={() => openEditModal(b.Bed_ID, b)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('/beds/', b.Bed_ID)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 italic">No beds registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-base text-slate-900">{modalMode === 'create' ? 'Add Bed' : 'Edit Bed'}</h3>
                <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 text-xs">
                {modalMode === 'create' && (
                  <div>
                    <label className="block font-semibold mb-1">Bed ID *</label>
                    <input
                      type="number"
                      value={formData.Bed_ID || ''}
                      onChange={e => setFormData({ ...formData, Bed_ID: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold mb-1">Bed Number *</label>
                  <input
                    type="text"
                    value={formData.Bed_Number || ''}
                    onChange={e => setFormData({ ...formData, Bed_Number: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Room *</label>
                  <select
                    value={formData.Room_ID || ''}
                    onChange={e => setFormData({ ...formData, Room_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    {rooms.map(r => (
                      <option key={r.Room_ID} value={r.Room_ID}>Room {r.Room_Number} (#{r.Room_ID})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={formData.Bed_Status || 'Available'}
                    onChange={e => setFormData({ ...formData, Bed_Status: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={closeModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold">Cancel</button>
                <button onClick={() => handleSubmit('/beds/')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 7. Student Management
  // =========================================================================
  if (tab === 'students') {
    const filtered = students.filter(s => 
      s.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.Email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.Department || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search students by name, email, dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => openCreateModal({ Student_ID: students.length + 1, Gender: 'Male', Year_of_Study: 1 })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.Student_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{s.Student_ID}</td>
                  <td className="py-3 px-4 font-bold text-indigo-700">{s.Name}</td>
                  <td className="py-3 px-4 text-slate-600">{s.Department || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{s.Year_of_Study ? `Year ${s.Year_of_Study}` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{s.Email || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{s.Phone || '—'}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button onClick={() => openEditModal(s.Student_ID, s)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('/students/', s.Student_ID)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">No student records registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-base text-slate-900">{modalMode === 'create' ? 'Add Student' : 'Edit Student'}</h3>
                <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 text-xs">
                {modalMode === 'create' && (
                  <div>
                    <label className="block font-semibold mb-1">Student ID *</label>
                    <input
                      type="number"
                      value={formData.Student_ID || ''}
                      onChange={e => setFormData({ ...formData, Student_ID: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.Name || ''}
                    onChange={e => setFormData({ ...formData, Name: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.Email || ''}
                    onChange={e => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.Phone || ''}
                    onChange={e => setFormData({ ...formData, Phone: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.Department || ''}
                    onChange={e => setFormData({ ...formData, Department: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Year of Study</label>
                  <input
                    type="number"
                    value={formData.Year_of_Study || ''}
                    onChange={e => setFormData({ ...formData, Year_of_Study: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={closeModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold">Cancel</button>
                <button onClick={() => handleSubmit('/students/')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 8. Room Allocation
  // =========================================================================
  if (tab === 'allocation') {
    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Active residential leases and bed occupancy records.
          </div>
          <button
            onClick={() => openCreateModal({
              Allocation_ID: allocations.length + 1,
              Student_ID: students[0]?.Student_ID || 1,
              Room_ID: rooms[0]?.Room_ID || 1,
              Bed_ID: beds[0]?.Bed_ID || 1,
              Allocation_Date: new Date().toISOString().split('T')[0],
              Start_Date: new Date().toISOString().split('T')[0],
              End_Date: '2027-05-31',
              Allocation_Status: 'Active'
            })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Allocation</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Alloc ID</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Room ID</th>
                <th className="py-3 px-4">Bed ID</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.map(a => (
                <tr key={a.Allocation_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">#{a.Allocation_ID}</td>
                  <td className="py-3 px-4 font-semibold text-indigo-700">Student #{a.Student_ID}</td>
                  <td className="py-3 px-4 text-slate-700">Room #{a.Room_ID}</td>
                  <td className="py-3 px-4 text-slate-700">Bed #{a.Bed_ID}</td>
                  <td className="py-3 px-4 text-slate-600">{a.Start_Date}</td>
                  <td className="py-3 px-4 text-slate-600">{a.End_Date || 'Open'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      a.Allocation_Status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {a.Allocation_Status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button onClick={() => openEditModal(a.Allocation_ID, a)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('/room-allocations/', a.Allocation_ID)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 italic">No room allocations active.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-base text-slate-900">{modalMode === 'create' ? 'Create Room Allocation' : 'Edit Allocation'}</h3>
                <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 text-xs">
                {modalMode === 'create' && (
                  <div>
                    <label className="block font-semibold mb-1">Allocation ID *</label>
                    <input
                      type="number"
                      value={formData.Allocation_ID || ''}
                      onChange={e => setFormData({ ...formData, Allocation_ID: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold mb-1">Student *</label>
                  <select
                    value={formData.Student_ID || ''}
                    onChange={e => setFormData({ ...formData, Student_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    {students.map(s => (
                      <option key={s.Student_ID} value={s.Student_ID}>{s.Name} (#{s.Student_ID})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Room *</label>
                  <select
                    value={formData.Room_ID || ''}
                    onChange={e => setFormData({ ...formData, Room_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    {rooms.map(r => (
                      <option key={r.Room_ID} value={r.Room_ID}>Room {r.Room_Number} (#{r.Room_ID})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Bed *</label>
                  <select
                    value={formData.Bed_ID || ''}
                    onChange={e => setFormData({ ...formData, Bed_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    {beds.filter(b => !formData.Room_ID || b.Room_ID === formData.Room_ID).map(b => (
                      <option key={b.Bed_ID} value={b.Bed_ID}>{b.Bed_Number} (#{b.Bed_ID})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={formData.Start_Date || ''}
                      onChange={e => setFormData({ ...formData, Start_Date: e.target.value, Allocation_Date: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.End_Date || ''}
                      onChange={e => setFormData({ ...formData, End_Date: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={formData.Allocation_Status || 'Active'}
                    onChange={e => setFormData({ ...formData, Allocation_Status: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={closeModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold">Cancel</button>
                <button onClick={() => handleSubmit('/room-allocations/')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 9. Roommate Matching
  // =========================================================================
  if (tab === 'matches') {
    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="flex justify-end">
          <button
            onClick={() => openCreateModal({
              Match_ID: matches.length + 1,
              Student_ID_1: students[0]?.Student_ID || 1,
              Student_ID_2: students[1]?.Student_ID || 2,
              Compatibility_Score: 85.0,
              Match_Date: new Date().toISOString().split('T')[0],
              Match_Status: 'Proposed'
            })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Match</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Match ID</th>
                <th className="py-3 px-4">Student 1</th>
                <th className="py-3 px-4">Student 2</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matches.map(m => (
                <tr key={m.Match_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">#{m.Match_ID}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">Student #{m.Student_ID_1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">Student #{m.Student_ID_2}</td>
                  <td className="py-3 px-4 font-bold text-indigo-600">{m.Compatibility_Score ?? '—'}%</td>
                  <td className="py-3 px-4 text-slate-600">{m.Match_Date || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {m.Match_Status || 'Proposed'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button onClick={() => handleDelete('/roommate-matches/', m.Match_ID)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">No roommate matches configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 10. Student Preferences
  // =========================================================================
  if (tab === 'preferences') {
    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4">Food</th>
                <th className="py-3 px-4">Sleep Schedule</th>
                <th className="py-3 px-4">Study Habits</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preferences.map(p => (
                <tr key={p.Preference_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.Preference_ID}</td>
                  <td className="py-3 px-4 font-semibold text-indigo-700">Student #{p.Student_ID}</td>
                  <td className="py-3 px-4 text-slate-700">{p.Language || '—'}</td>
                  <td className="py-3 px-4 text-slate-700">{p.Food_Preference || '—'}</td>
                  <td className="py-3 px-4 text-slate-700">{p.Sleep_Schedule || '—'}</td>
                  <td className="py-3 px-4 text-slate-700">{p.Study_Habits || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => handleDelete('/student-preferences/', p.Preference_ID)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {preferences.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">No student preferences recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 11. Payments
  // =========================================================================
  if (tab === 'payments') {
    return (
      <div className="space-y-5">
        {renderMessages()}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.Payment_ID} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.Payment_ID}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">Student #{p.Student_ID}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">₹{Number(p.Amount).toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-600">{p.Payment_Date || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{p.Payment_Method || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.Payment_Status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                      p.Payment_Status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {p.Payment_Status || 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.Transaction_Reference || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => handleDelete('/payments/', p.Payment_ID)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 italic">No payments recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};
