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
  Sparkles,
  Flame
} from 'lucide-react';
import { StudentPreferences, Student } from '../../types';
import { apiClient } from '../../services/apiClient';

export type CanonicalDiet = 'Vegetarian' | 'Jain' | 'Non-Vegetarian' | 'Unknown';

/**
 * Classifies a raw food preference string into strict, mutually exclusive categories.
 * Prevents substring collisions where 'Non-Vegetarian' was erroneously matched by .includes('veg').
 */
export const classifyDiet = (diet?: string | null): CanonicalDiet => {
  if (!diet || typeof diet !== 'string') return 'Unknown';
  const clean = diet.trim().toLowerCase();
  if (!clean) return 'Unknown';

  // 1. Jain check first (must never be confused with veg or non-veg)
  if (clean.includes('jain')) {
    return 'Jain';
  }

  // 2. Non-Vegetarian check next (matches 'non-veg', 'non-vegetarian', 'non veg', 'egg', 'eggetarian')
  // CRITICAL: Must be checked BEFORE 'veg', because 'non-vegetarian' contains the substring 'veg'!
  if (clean.includes('non') || clean.includes('egg')) {
    return 'Non-Vegetarian';
  }

  // 3. Vegetarian check (matches 'vegetarian', 'veg', 'pure veg', 'vegan')
  if (clean.includes('veg')) {
    return 'Vegetarian';
  }

  // 4. Any other unrecognized value
  return 'Unknown';
};

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

  // Lifestyle & Habits KPIs
  const earlyBirds = preferences.filter(p => (p.Sleep_Schedule || '').toLowerCase().includes('early')).length;
  const nightOwls = preferences.filter(p => (p.Sleep_Schedule || '').toLowerCase().includes('night')).length;
  const quietStudy = preferences.filter(p => (p.Study_Habits || '').toLowerCase().includes('quiet') || (p.Study_Habits || '').toLowerCase().includes('silent')).length;

  // Strict, Mutually Exclusive Dietary KPIs
  const vegProfiles = preferences.filter(p => classifyDiet(p.Food_Preference) === 'Vegetarian').length;
  const jainProfiles = preferences.filter(p => classifyDiet(p.Food_Preference) === 'Jain').length;
  const nonVegProfiles = preferences.filter(p => classifyDiet(p.Food_Preference) === 'Non-Vegetarian').length;
  const unknownProfiles = preferences.filter(p => classifyDiet(p.Food_Preference) === 'Unknown').length;

  const totalProfiles = preferences.length;
  const vegPercent = totalProfiles > 0 ? Math.round((vegProfiles / totalProfiles) * 100) : 0;
  const jainPercent = totalProfiles > 0 ? Math.round((jainProfiles / totalProfiles) * 100) : 0;
  const nonVegPercent = totalProfiles > 0 ? Math.round((nonVegProfiles / totalProfiles) * 100) : 0;

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
    const matchesFood = foodFilter === 'All' || classifyDiet(p.Food_Preference) === foodFilter;

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

      {/* 3. Operational Lifestyle & Resident KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Silent Study Habit</div>
            <div className="text-2xl font-black font-display text-sky-600 dark:text-sky-400">{quietStudy}</div>
            <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Require silent environments</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Dietary Preferences Breakdown (Three Prominent Category Cards) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#CBD5E1]">
              Dietary Preferences
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700">
              {totalProfiles} Total Profiles
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Vegetarian Profiles (GREEN) */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-colors">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Vegetarian Profiles</div>
              <div className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">
                {vegProfiles}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {vegPercent}% of logged profiles
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Utensils className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Jain Profiles (ORANGE) */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between hover:border-amber-300 dark:hover:border-amber-700/60 transition-colors">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Jain Profiles</div>
              <div className="text-2xl font-black font-display text-amber-500 dark:text-amber-400">
                {jainProfiles}
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                {jainPercent}% of logged profiles
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Non-Vegetarian Profiles (RED) */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs flex items-center justify-between hover:border-rose-300 dark:hover:border-rose-700/60 transition-colors">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">Non-Vegetarian Profiles</div>
              <div className="text-2xl font-black font-display text-rose-600 dark:text-rose-400">
                {nonVegProfiles}
              </div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                {nonVegPercent}% of logged profiles
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
        </div>

        {unknownProfiles > 0 && (
          <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Note: {unknownProfiles} profile(s) have unstated or unrecognized dietary preferences and are not counted in the above categories.</span>
          </div>
        )}
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
            <option value="All">All Diets ({totalProfiles})</option>
            <option value="Vegetarian">Vegetarian ({vegProfiles})</option>
            <option value="Jain">Jain ({jainProfiles})</option>
            <option value="Non-Vegetarian">Non-Vegetarian ({nonVegProfiles})</option>
            {unknownProfiles > 0 && <option value="Unknown">Unspecified ({unknownProfiles})</option>}
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
                      {(() => {
                        const diet = classifyDiet(p.Food_Preference);
                        let badgeClass = 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                        let icon = <Utensils className="w-3 h-3" />;

                        if (diet === 'Vegetarian') {
                          badgeClass = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80';
                        } else if (diet === 'Jain') {
                          badgeClass = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80';
                          icon = <Sparkles className="w-3 h-3" />;
                        } else if (diet === 'Non-Vegetarian') {
                          badgeClass = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
                          icon = <Flame className="w-3 h-3" />;
                        }

                        return (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${badgeClass}`}>
                            {icon}
                            <span>{p.Food_Preference || 'Standard'}</span>
                          </span>
                        );
                      })()}
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
                {(() => {
                  const diet = classifyDiet(viewingPref.Food_Preference);
                  let textClass = 'text-slate-900 dark:text-[#F1F5F9]';
                  if (diet === 'Vegetarian') textClass = 'text-emerald-600 dark:text-emerald-400';
                  else if (diet === 'Jain') textClass = 'text-amber-500 dark:text-amber-400';
                  else if (diet === 'Non-Vegetarian') textClass = 'text-rose-600 dark:text-rose-400';
                  return <span className={`font-bold ${textClass}`}>{viewingPref.Food_Preference || 'Not stated'}</span>;
                })()}
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
