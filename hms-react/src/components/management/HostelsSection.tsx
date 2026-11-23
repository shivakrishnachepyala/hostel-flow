import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  Users, 
  Layers, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Filter
} from 'lucide-react';
import { Hostel, HostelBlock } from '../../types';
import { apiClient } from '../../services/apiClient';

interface HostelsSectionProps {
  hostels: Hostel[];
  blocks: HostelBlock[];
  onRefresh: () => void;
}

export const HostelsSection: React.FC<HostelsSectionProps> = ({
  hostels,
  blocks,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    Hostel_ID: number;
    Hostel_Name: string;
    Location: string;
    Capacity: number;
    Hostel_Type: string;
  }>({
    Hostel_ID: 0,
    Hostel_Name: '',
    Location: '',
    Capacity: 100,
    Hostel_Type: 'Boys'
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
  const totalCapacity = hostels.reduce((sum, h) => sum + (h.Capacity || 0), 0);
  const boysCount = hostels.filter(h => h.Hostel_Type === 'Boys').length;
  const girlsCount = hostels.filter(h => h.Hostel_Type === 'Girls').length;
  const coedCount = hostels.filter(h => h.Hostel_Type === 'Co-ed').length;

  // Filtered List
  const filtered = hostels.filter(h => {
    const matchesSearch = 
      h.Hostel_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.Location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || h.Hostel_Type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openCreateModal = () => {
    const nextId = hostels.length > 0 ? Math.max(...hostels.map(h => h.Hostel_ID)) + 1 : 1;
    setFormData({
      Hostel_ID: nextId,
      Hostel_Name: '',
      Location: '',
      Capacity: 100,
      Hostel_Type: 'Boys'
    });
    setModalMode('create');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (h: Hostel) => {
    setFormData({
      Hostel_ID: h.Hostel_ID,
      Hostel_Name: h.Hostel_Name,
      Location: h.Location || '',
      Capacity: h.Capacity || 0,
      Hostel_Type: h.Hostel_Type || 'Boys'
    });
    setModalMode('edit');
    setEditingId(h.Hostel_ID);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Hostel_Name.trim()) {
      showError('Hostel Name is required.');
      return;
    }
    if (formData.Capacity <= 0) {
      showError('Capacity must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiClient.post('/hostels/', formData);
        showSuccess('Hostel created successfully.');
      } else {
        await apiClient.put(`/hostels/${editingId}`, formData);
        showSuccess('Hostel updated successfully.');
      }
      closeModal();
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const linkedBlocks = blocks.filter(b => b.Hostel_ID === id).length;
    let confirmMsg = `Are you sure you want to delete "${name}" (ID: ${id})?`;
    if (linkedBlocks > 0) {
      confirmMsg += `\nWarning: There are ${linkedBlocks} blocks associated with this hostel building.`;
    }
    if (!window.confirm(confirmMsg)) return;

    try {
      await apiClient.delete(`/hostels/${id}`);
      showSuccess(`Hostel "${name}" deleted successfully.`);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete hostel.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Campus Infrastructure
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Buildings & Complexes</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Hostel Buildings Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Configure residential complexes, overall capacity, and gender designations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Hostel</span>
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
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Hostel Buildings</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{hostels.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">{blocks.length} total blocks</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Total Capacity</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{totalCapacity}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Approved beds</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Blocks / Wings</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{blocks.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Across all complexes</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Designation Breakdown</div>
            <div className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2 mt-1">
              <span className="text-blue-600 dark:text-blue-400">{boysCount} Boys</span>
              <span>·</span>
              <span className="text-rose-600 dark:text-rose-400">{girlsCount} Girls</span>
              {coedCount > 0 && <span>· {coedCount} Co-ed</span>}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Residential policy</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Filter className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search hostels by name or campus location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Boys', 'Girls', 'Co-ed'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                typeFilter === type
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-[#182235] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B]'
              }`}
            >
              {type === 'All' ? 'All Types' : `${type} Hostels`}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Hostels Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Building Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Wings</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {filtered.map(h => {
                const hostelBlocks = blocks.filter(b => b.Hostel_ID === h.Hostel_ID);
                return (
                  <tr key={h.Hostel_ID} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">#{h.Hostel_ID}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{h.Hostel_Name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-[#94A3B8]" />
                        <span>{h.Location || 'Campus Zone'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">{h.Capacity || 0}</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Beds</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        h.Hostel_Type === 'Boys' 
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                          : h.Hostel_Type === 'Girls'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                      }`}>
                        {h.Hostel_Type || 'Co-ed'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#182235] text-[11px] font-medium text-slate-700 dark:text-[#94A3B8]">
                        {hostelBlocks.length} {hostelBlocks.length === 1 ? 'Block' : 'Blocks'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="Edit Hostel"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(h.Hostel_ID, h.Hostel_Name)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Hostel"
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
                    <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-[#F1F5F9]">No hostel buildings found</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your search criteria or create a new building.</p>
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
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">
                  {modalMode === 'create' ? 'Register New Hostel Building' : 'Edit Hostel Building'}
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Hostel ID *</label>
                  <input
                    type="number"
                    value={formData.Hostel_ID}
                    onChange={e => setFormData({ ...formData, Hostel_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">Unique primary key in the MySQL hostel table.</p>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Building Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Aryabhatta Hostel, C.V. Raman Hall"
                  value={formData.Hostel_Name}
                  onChange={e => setFormData({ ...formData, Hostel_Name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Campus Location / Zone</label>
                <input
                  type="text"
                  placeholder="e.g. North Campus, Sector 4, Near Sports Complex"
                  value={formData.Location}
                  onChange={e => setFormData({ ...formData, Location: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Total Capacity *</label>
                  <input
                    type="number"
                    value={formData.Capacity}
                    onChange={e => setFormData({ ...formData, Capacity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Designation *</label>
                  <select
                    value={formData.Hostel_Type}
                    onChange={e => setFormData({ ...formData, Hostel_Type: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Boys">Boys Hostel</option>
                    <option value="Girls">Girls Hostel</option>
                    <option value="Co-ed">Co-ed Complex</option>
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Hostel' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
