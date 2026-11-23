import React, { useState } from 'react';
import { 
  Sliders, 
  Search, 
  Trash2, 
  Moon, 
  Sun, 
  BookOpen, 
  Utensils, 
  Languages, 
  User, 
  Eye, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  Sparkles
} from 'lucide-react';
import { StudentPreferences, Student } from '../../types';
import { apiClient } from '../../services/apiClient';

interface PreferencesSectionProps {
  preferences: StudentPreferences[];
  students: Student[];
  onRefresh: () => void;
}

export const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  preferences,
  students,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sleepFilter, setSleepFilter] = useState<string>('All');
  const [foodFilter, setFoodFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View details modal
  const [viewingPref, setViewingPref] = useState<StudentPreferences | null>(null);

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
  const earlyBirds = preferences.filter(p => (p.Sleep_Schedule || '').toLowerCase().includes('early')).length;
  const nightOwls = preferences.filter(p => (p.Sleep_Schedule || '').toLowerCase().includes('night')).length;
  const vegCount = preferences.filter(p => (p.Food_Preference || '').toLowerCase().includes('veg')).length;
  const quietStudy = preferences.filter(p => (p.Study_Habits || '').toLowerCase().includes('quiet') || (p.Study_Habits || '').toLowerCase().includes('silent')).length;

  // Filtered preferences
  const filtered = preferences.filter(p => {
    const student = students.find(s => s.Student_ID === p.Student_ID);
    const studentName = p.Student_Name || student?.Name || '';
    const language = p.Language || '';
    
    const matchesSearch = 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      language.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.Preference_ID).includes(searchTerm) ||
      String(p.Student_ID).includes(searchTerm);

    const matchesSleep = sleepFilter === 'All' || (p.Sleep_Schedule || '').toLowerCase().includes(sleepFilter.toLowerCase());
    const matchesFood = foodFilter === 'All' || (p.Food_Preference || '').toLowerCase().includes(foodFilter.toLowerCase());

    return matchesSearch && matchesSleep && matchesFood;
  });

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to remove preference profile #${id}?`)) return;

    try {
      await apiClient.delete(`/student-preferences/${id}`);
      showSuccess(`Preference profile #${id} deleted successfully.`);
      onRefresh();
    } catch (err: any) {
      showError(err.message || 'Failed to delete preference profile.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Resident Lifestyle Profiles
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">Matching Attributes</span>
          </div>
          <h2 className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Student Preferences & Lifestyle Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Self-reported habits driving automated roommate matching, compatibility scores, and harmony.
          </p>
        </div>
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
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Profiles Logged</div>
            <div className="text-2xl font-black font-display text-slate-900 dark:text-[#F1F5F9]">{preferences.length}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Out of {students.length} students</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Circadian Rhythm</div>
            <div className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2 mt-1">
              <span className="text-amber-600 dark:text-amber-400">{earlyBirds} Early</span>
              <span>·</span>
              <span className="text-indigo-600 dark:text-indigo-400">{nightOwls} Night</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Sleep schedule bias</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sun className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Dietary Preferences</div>
            <div className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">{vegCount}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Vegetarian profiles</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Silent Study Habit</div>
            <div className="text-2xl font-black font-display text-sky-600 dark:text-sky-400">{quietStudy}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Require silent environments</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by student name, language, or profile ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sleep Filter */}
          <select
            value={sleepFilter}
            onChange={(e) => setSleepFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="All">All Sleep Schedules</option>
            <option value="Early">Early Bird</option>
            <option value="Night">Night Owl</option>
          </select>

          {/* Food Filter */}
          <select
            value={foodFilter}
            onChange={(e) => setFoodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="All">All Diets</option>
            <option value="Veg">Vegetarian</option>
            <option value="Non-Veg">Non-Vegetarian</option>
          </select>
        </div>
      </div>

      {/* 5. Preferences Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Profile ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Sleep Rhythm</th>
                <th className="py-3 px-4">Study Environment</th>
                <th className="py-3 px-4">Dietary Habit</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {filtered.map(p => {
                const student = students.find(s => s.Student_ID === p.Student_ID);
                const studentName = p.Student_Name || student?.Name || `Student #${p.Student_ID}`;
                const studentDept = p.Student_Dept || student?.Department || 'Student';

                return (
                  <tr key={p.Preference_ID} className="hover:bg-slate-50 dark:hover:bg-[#182235]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">#{p.Preference_ID}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                          {studentName[0]}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{studentName}</span>
                          <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">
                            ID: #{p.Student_ID} · {studentDept}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        (p.Sleep_Schedule || '').toLowerCase().includes('early')
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80'
                      }`}>
                        {(p.Sleep_Schedule || '').toLowerCase().includes('early') ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                        <span>{p.Sleep_Schedule || 'Standard'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 inline-flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{p.Study_Habits || 'Moderate'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        (p.Food_Preference || '').toLowerCase().includes('veg')
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                      }`}>
                        <Utensils className="w-3 h-3" />
                        <span>{p.Food_Preference || 'Standard'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-[#94A3B8]">
                      <div className="flex items-center gap-1">
                        <Languages className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.Language || 'English'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewingPref(p)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.Preference_ID)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Preference"
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
                    <Sliders className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700 dark:text-[#F1F5F9]">No student preferences found</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your search criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. View Details Modal */}
      {viewingPref && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-[#F1F5F9]">
                    {viewingPref.Student_Name || `Student #${viewingPref.Student_ID}`}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8]">Preference Profile #{viewingPref.Preference_ID}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingPref(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8] font-medium flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Sleep Schedule:</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{viewingPref.Sleep_Schedule || 'Not stated'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8] font-medium flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                  <span>Study Habits:</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{viewingPref.Study_Habits || 'Not stated'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8] font-medium flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Food Preference:</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{viewingPref.Food_Preference || 'Not stated'}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8] font-medium flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-purple-500" />
                  <span>Primary Language:</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">{viewingPref.Language || 'English'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingPref(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#182235] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
