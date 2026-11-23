import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  GraduationCap, 
  DoorClosed, 
  Bed as BedIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Building2,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Student, RoomAllocation } from '../../types';
import { apiClient } from '../../services/apiClient';

interface StudentsSectionProps {
  students: Student[];
  allocations: RoomAllocation[];
  onRefresh: () => void;
}

export const StudentsSection: React.FC<StudentsSectionProps> = ({
  students,
  allocations,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile modal
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState<{
    Student_ID: number;
    Name: string;
    Email: string;
    Phone: string;
    Department: string;
    Year_of_Study: number;
    Gender: string;
    DOB: string;
  }>({
    Student_ID: 0,
    Name: '',
    Email: '',
    Phone: '',
    Department: 'Computer Science',
    Year_of_Study: 1,
    Gender: 'Male',
    DOB: '2004-01-01'
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
  const activeAllocStudentIds = new Set(
    allocations
      .filter(a => a.Allocation_Status === 'Active' && a.Student_ID)
      .map(a => a.Student_ID as number)
  );

  const allocatedCount = students.filter(s => activeAllocStudentIds.has(s.Student_ID) || s.Allocation_ID).length;
  const unallocatedCount = Math.max(0, students.length - allocatedCount);
  const departments = Array.from(new Set(students.map(s => s.Department).filter(Boolean)));

  // Filtered students
  const filtered = students.filter(s => {
    const matchesSearch = 
      s.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.Email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.Department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.Student_ID).includes(searchTerm);

    const isAllocated = activeAllocStudentIds.has(s.Student_ID) || !!s.Allocation_ID;
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Allocated' && isAllocated) || 
      (statusFilter === 'Unallocated' && !isAllocated);

    const matchesYear = yearFilter === 'All' || String(s.Year_of_Study) === yearFilter;

    return matchesSearch && matchesStatus && matchesYear;
  });

  const openCreateModal = () => {
    const nextId = students.length > 0 ? Math.max(...students.map(s => s.Student_ID)) + 1 : 1001;
    setFormData({
      Student_ID: nextId,
      Name: '',
      Email: '',
      Phone: '',
      Department: 'Computer Science',
      Year_of_Study: 1,
      Gender: 'Male',
      DOB: '2004-01-01'
    });
    setModalMode('create');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setFormData({
      Student_ID: s.Student_ID,
      Name: s.Name,
      Email: s.Email || '',
      Phone: s.Phone || '',
      Department: s.Department || 'Computer Science',
      Year_of_Study: s.Year_of_Study ?? 1,
      Gender: s.Gender || 'Male',
      DOB: s.DOB || '2004-01-01'
    });
    setModalMode('edit');
    setEditingId(s.Student_ID);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Name.trim()) {
      showError('Student Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiClient.post('/students/', formData);
        showSuccess('Student registered successfully.');
      } else {
        await apiClient.put(`/students/${editingId}`, formData);
        showSuccess('Student profile updated successfully.');
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
    const isAllocated = activeAllocStudentIds.has(id);
    let confirmMsg = `Are you sure you want to remove Student "${name}" (ID: #${id})?`;
    if (isAllocated) {
      confirmMsg += `\nWarning: This student currently holds an active room allocation lease.`;
    }
    if (!window.confirm(confirmMsg)) return;

    try {
      await apiClient.delete(`/students/${id}`);
      showSuccess(`Student "${name}" deleted successfully.`);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete student.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Campus Population
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Resident Students</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Student Residents Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Authoritative records of registered students, department enrollments, and room assignments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
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
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Enrolled Students</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{students.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Campus directory</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Allocated Residents</div>
            <div className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">{allocatedCount}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Active room lease</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Unallocated</div>
            <div className="text-2xl font-black font-display text-amber-600 dark:text-amber-400">{unallocatedCount}</div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Awaiting assignment</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Departments</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{departments.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Academic divisions</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by student name, email, department, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {['All', 'Allocated', 'Unallocated'].map((status) => (
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

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="All">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>
      </div>

      {/* 5. Students Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Department & Year</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Housing Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {filtered.map(s => {
                const isAllocated = activeAllocStudentIds.has(s.Student_ID) || !!s.Allocation_ID;
                const alloc = allocations.find(a => a.Student_ID === s.Student_ID && a.Allocation_Status === 'Active');
                const roomInfo = s.Room_Number 
                  ? `Room ${s.Room_Number} · Bed ${s.Bed_Number || '1'} (${s.Block_Name || 'Wing'})`
                  : alloc?.Room_Number
                  ? `Room ${alloc.Room_Number} · Bed ${alloc.Bed_Number || '1'} (${alloc.Block_Name || 'Wing'})`
                  : null;

                const initials = s.Name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                  <tr key={s.Student_ID} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-[#F1F5F9] hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => setViewingStudent(s)}>
                            {s.Name}
                          </span>
                          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">
                            ID: #{s.Student_ID}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">{s.Department || 'Undeclared'}</span>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]">
                          {s.Year_of_Study ? `Year ${s.Year_of_Study} Undergraduate` : '—'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.Email || 'No email registered'}</span>
                        </div>
                        {s.Phone && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-[#94A3B8]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.Phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#182235] text-slate-700 dark:text-[#94A3B8]">
                        {s.Gender || 'Male'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {isAllocated && roomInfo ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                          <DoorClosed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{roomInfo}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Unallocated</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewingStudent(s)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.Student_ID, s.Name)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Student"
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
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-[#F1F5F9]">No student records found</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your filters or register a new student.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. View Profile Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {viewingStudent.Name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">{viewingStudent.Name}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Student ID #{viewingStudent.Student_ID}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingStudent(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]">Department</span>
                <p className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{viewingStudent.Department || 'Undeclared'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]">Year of Study</span>
                <p className="font-semibold text-slate-900 dark:text-[#F1F5F9]">Year {viewingStudent.Year_of_Study ?? 1}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]">Email Address</span>
                <p className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{viewingStudent.Email || 'None'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]">Contact Phone</span>
                <p className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{viewingStudent.Phone || 'None'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]">Gender Policy</span>
                <p className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{viewingStudent.Gender || 'Male'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#94A3B8]">Date of Birth</span>
                <p className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{viewingStudent.DOB || 'Not recorded'}</p>
              </div>
            </div>

            {/* Room Allocation Info */}
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 text-xs">
              <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 block mb-1">Residential Lease Status</span>
              {viewingStudent.Room_Number ? (
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">
                    Room {viewingStudent.Room_Number} · Bed {viewingStudent.Bed_Number || '1'}
                  </p>
                  <p className="text-slate-600 dark:text-[#94A3B8]">
                    {viewingStudent.Block_Name || 'Block'} · {viewingStudent.Hostel_Name || 'Hostel'}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-[#94A3B8]">
                  No active residential room allocation found for this student.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#182235] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
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
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">
                  {modalMode === 'create' ? 'Register Student Resident' : 'Edit Student Profile'}
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Student ID *</label>
                  <input
                    type="number"
                    value={formData.Student_ID}
                    onChange={e => setFormData({ ...formData, Student_ID: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">Unique primary key in the MySQL student table.</p>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe, Aditi Sharma"
                  value={formData.Name}
                  onChange={e => setFormData({ ...formData, Name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@hostelflow.edu"
                    value={formData.Email}
                    onChange={e => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={formData.Phone}
                    onChange={e => setFormData({ ...formData, Phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Mechanical"
                    value={formData.Department}
                    onChange={e => setFormData({ ...formData, Department: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Year of Study</label>
                  <select
                    value={formData.Year_of_Study}
                    onChange={e => setFormData({ ...formData, Year_of_Study: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Gender Policy</label>
                  <select
                    value={formData.Gender}
                    onChange={e => setFormData({ ...formData, Gender: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.DOB}
                    onChange={e => setFormData({ ...formData, DOB: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Register Student' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
