import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  RotateCcw,
  Trash2,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  AlertCircle,
  Moon,
  BookOpen,
  Utensils,
  Languages,
  HeartHandshake,
  ShieldCheck,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { RoommateMatch, RoommateMatchStats, Student } from '../../types';
import { apiClient } from '../../services/apiClient';

interface RoommateMatchesSectionProps {
  students: Student[];
  onRefresh?: () => void;
}

export const RoommateMatchesSection: React.FC<RoommateMatchesSectionProps> = ({
  students,
  onRefresh,
}) => {
  // Data state
  const [matches, setMatches] = useState<RoommateMatch[]>([]);
  const [stats, setStats] = useState<RoommateMatchStats>({
    total_matches: 0,
    proposed_count: 0,
    approved_count: 0,
    rejected_count: 0,
    average_score: 0.0,
    eligible_unmatched_count: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Notification banners
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationSummary, setGenerationSummary] = useState<{
    message: string;
    metrics: any;
    unmatched: any[];
  } | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('score_desc');

  // Modals state
  const [selectedMatch, setSelectedMatch] = useState<RoommateMatch | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);

  // Manual Match creation form state
  const [manualS1, setManualS1] = useState<number>(0);
  const [manualS2, setManualS2] = useState<number>(0);
  const [manualLoading, setManualLoading] = useState<boolean>(false);

  // =========================================================================
  // API Calls
  // =========================================================================

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/roommate-matches/stats');
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch roommate match stats:', err);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (sortBy) params.sort = sortBy;

      const res = await apiClient.get('/roommate-matches/', { params });
      if (res.data?.data) {
        setMatches(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch roommate matches:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load roommate matches.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, sortBy]);

  useEffect(() => {
    fetchStats();
    fetchMatches();
  }, [fetchStats, fetchMatches]);

  // Handle Generate Matches
  const handleGenerateMatches = async () => {
    setGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setGenerationSummary(null);

    try {
      const res = await apiClient.post('/roommate-matches/generate');
      const data = res.data;
      if (data?.status === 'success') {
        setSuccessMessage(data.message || 'Roommate matches generated successfully.');
        setGenerationSummary({
          message: data.message,
          metrics: data.metrics,
          unmatched: data.unmatched_students || [],
        });
        await fetchStats();
        await fetchMatches();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error('Error running roommate matching engine:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to run roommate matching engine.');
    } finally {
      setGenerating(false);
    }
  };

  // Handle Approve Match
  const handleApproveMatch = async (matchId: number) => {
    setActionLoading(matchId);
    try {
      const res = await apiClient.patch(`/roommate-matches/${matchId}/approve`);
      if (res.data?.status === 'success') {
        setSuccessMessage(`Match #${matchId} successfully approved.`);
        // Update local state
        setMatches((prev) =>
          prev.map((m) => (m.Match_ID === matchId ? { ...m, Match_Status: 'Approved' } : m))
        );
        if (selectedMatch && selectedMatch.Match_ID === matchId) {
          setSelectedMatch((prev) => (prev ? { ...prev, Match_Status: 'Approved' } : null));
        }
        await fetchStats();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to approve match.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Match
  const handleRejectMatch = async (matchId: number) => {
    setActionLoading(matchId);
    try {
      const res = await apiClient.patch(`/roommate-matches/${matchId}/reject`);
      if (res.data?.status === 'success') {
        setSuccessMessage(`Match #${matchId} rejected.`);
        // Update local state
        setMatches((prev) =>
          prev.map((m) => (m.Match_ID === matchId ? { ...m, Match_Status: 'Rejected' } : m))
        );
        if (selectedMatch && selectedMatch.Match_ID === matchId) {
          setSelectedMatch((prev) => (prev ? { ...prev, Match_Status: 'Rejected' } : null));
        }
        await fetchStats();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to reject match.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Delete Match
  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm(`Are you sure you want to delete Roommate Match #${matchId}?`)) {
      return;
    }
    setActionLoading(matchId);
    try {
      const res = await apiClient.delete(`/roommate-matches/${matchId}`);
      if (res.data?.status === 'success') {
        setSuccessMessage(`Match #${matchId} deleted successfully.`);
        setMatches((prev) => prev.filter((m) => m.Match_ID !== matchId));
        if (detailsModalOpen && selectedMatch?.Match_ID === matchId) {
          setDetailsModalOpen(false);
          setSelectedMatch(null);
        }
        await fetchStats();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete match.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Manual Match Submit
  const handleManualMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualS1 || !manualS2) {
      setErrorMessage('Please select two distinct students.');
      return;
    }
    if (manualS1 === manualS2) {
      setErrorMessage('A student cannot be matched with themselves.');
      return;
    }

    setManualLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post('/roommate-matches/', {
        Student_ID_1: manualS1,
        Student_ID_2: manualS2,
        Match_Date: new Date().toISOString().split('T')[0],
        Match_Status: 'Proposed',
      });
      if (res.data?.status === 'success') {
        setSuccessMessage('Manual match created successfully.');
        setManualModalOpen(false);
        setManualS1(0);
        setManualS2(0);
        await fetchStats();
        await fetchMatches();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to create manual match.');
    } finally {
      setManualLoading(false);
    }
  };

  // View Details Modal
  const openDetailsModal = (match: RoommateMatch) => {
    setSelectedMatch(match);
    setDetailsModalOpen(true);
  };

  // Filtered by Gender locally if needed
  const filteredMatches = matches.filter((m) => {
    if (genderFilter === 'All') return true;
    const g1 = m.Student_1_Gender?.toLowerCase() || '';
    const g2 = m.Student_2_Gender?.toLowerCase() || '';
    if (genderFilter === 'Male') return g1 === 'male' || g2 === 'male';
    if (genderFilter === 'Female') return g1 === 'female' || g2 === 'female';
    return true;
  });

  // Score Badge Color Helper
  const getScoreBadgeClass = (score: number | null) => {
    if (score === null || score === undefined) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80';
    if (score >= 60) return 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80';
    return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80';
  };

  // Status Badge Color Helper
  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case 'Approved':
      case 'Accepted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80';
      case 'Proposed':
      default:
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80';
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. Header & Engine Action Bar */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">
                Automatic Roommate Matching
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                AI-powered living compatibility engine optimizing roommate pairs from actual student preferences
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              fetchStats();
              fetchMatches();
            }}
            disabled={loading || generating}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#182235] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title="Refresh Roommate Matches"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Pair</span>
          </button>

          <button
            onClick={handleGenerateMatches}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-98"
          >
            {generating ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Running Engine...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Matches</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. Notification / Alert Banners */}
      {/* ===================================================================== */}
      {successMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200"
          >
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200"
          >
            &times;
          </button>
        </div>
      )}

      {generationSummary && (
        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs text-slate-800 dark:text-[#F1F5F9] space-y-2">
          <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Engine Run Summary
            </span>
            <button
              onClick={() => setGenerationSummary(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              &times;
            </button>
          </div>
          <p className="text-slate-600 dark:text-[#94A3B8]">
            Evaluated <strong className="text-slate-900 dark:text-[#F1F5F9]">{generationSummary.metrics?.candidate_combinations_evaluated || 0}</strong> candidate combinations across <strong className="text-slate-900 dark:text-[#F1F5F9]">{generationSummary.metrics?.total_eligible_students || 0}</strong> eligible unallocated students.
            Generated <strong className="text-indigo-600 dark:text-indigo-400">{generationSummary.metrics?.pairs_generated || 0} optimal pairs</strong> with average compatibility of <strong className="text-emerald-600 dark:text-emerald-400">{generationSummary.metrics?.average_compatibility || 0}%</strong>.
            Preserved <strong className="text-slate-900 dark:text-[#F1F5F9]">{generationSummary.metrics?.preserved_approved_matches || 0}</strong> previously approved matches.
          </p>
          {generationSummary.unmatched && generationSummary.unmatched.length > 0 && (
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 text-slate-600 dark:text-[#94A3B8]">
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                Awaiting Next Cohort ({generationSummary.unmatched.length}):
              </span>{' '}
              {generationSummary.unmatched.map((u: any, idx: number) => (
                <span key={u.Student_ID}>
                  {u.Name} (#{u.Student_ID}, {u.Gender}, {u.Department})
                  {idx < generationSummary.unmatched.length - 1 ? '; ' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. KPI Metrics Cards */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Total Pairs */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pairs</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-[#F1F5F9]">
            {stats.total_matches}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Configured in system</p>
        </div>

        {/* Card 2: Proposed */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Proposed</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.proposed_count}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Awaiting warden review</p>
        </div>

        {/* Card 3: Approved */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.approved_count}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Confirmed pairings</p>
        </div>

        {/* Card 4: Average Score */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Score</span>
            <HeartHandshake className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {stats.average_score}%
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Across all generated pairs</p>
        </div>

        {/* Card 5: Unmatched Pool */}
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Candidate Pool</span>
            <UserCheck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
            {stats.eligible_unmatched_count}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Eligible unallocated students</p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. Filter, Search & Sorting Controls */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] p-3.5 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student names, IDs, departments..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-[#94A3B8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Proposed">Proposed</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Gender Cohort Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male Cohort</option>
            <option value="Female">Female Cohort</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="score_desc">Highest Score First</option>
              <option value="score_asc">Lowest Score First</option>
              <option value="date_desc">Most Recent Date</option>
              <option value="id_asc">Match ID (Ascending)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. Matches Table */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182235] border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Match ID</th>
                <th className="py-3.5 px-4">Student 1</th>
                <th className="py-3.5 px-4 text-center">Compatibility</th>
                <th className="py-3.5 px-4">Student 2</th>
                <th className="py-3.5 px-4">Cohort</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-[#94A3B8]">
                    <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading roommate matches...</span>
                  </td>
                </tr>
              ) : filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-[#94A3B8]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No roommate matches found.</p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">
                      Click <strong className="text-indigo-600 dark:text-indigo-400">"Generate Matches"</strong> above to run the matching engine on registered student preferences.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMatches.map((m) => {
                  const s1Name = m.Student_1_Name || `Student #${m.Student_ID_1}`;
                  const s2Name = m.Student_2_Name || `Student #${m.Student_ID_2}`;
                  const s1Dept = m.Student_1_Department || 'Unspecified';
                  const s2Dept = m.Student_2_Department || 'Unspecified';
                  const gender = m.Student_1_Gender || m.Student_2_Gender || 'General';

                  return (
                    <tr
                      key={m.Match_ID}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#182235]/60 transition-colors"
                    >
                      {/* Match ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-[#F1F5F9]">
                          #{m.Match_ID}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]">
                          {m.Match_Date || 'Recent'}
                        </div>
                      </td>

                      {/* Student 1 */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {s1Name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-[#F1F5F9] leading-tight">
                              {s1Name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                              ID: #{m.Student_ID_1} &bull; {s1Dept}
                            </div>
                            {m.Student_1_Preferences?.Sleep_Schedule && (
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                                {m.Student_1_Preferences.Sleep_Schedule} &bull; {m.Student_1_Preferences.Food_Preference}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Compatibility Score */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black shadow-2xs ${getScoreBadgeClass(
                              m.Compatibility_Score
                            )}`}
                          >
                            {m.Compatibility_Score !== null ? `${m.Compatibility_Score}%` : '—'}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-[#94A3B8] mt-1 font-medium">
                            {m.Compatibility_Score && m.Compatibility_Score >= 80
                              ? 'High Match'
                              : m.Compatibility_Score && m.Compatibility_Score >= 60
                              ? 'Compatible'
                              : 'Moderate'}
                          </span>
                        </div>
                      </td>

                      {/* Student 2 */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {s2Name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-[#F1F5F9] leading-tight">
                              {s2Name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                              ID: #{m.Student_ID_2} &bull; {s2Dept}
                            </div>
                            {m.Student_2_Preferences?.Sleep_Schedule && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                                {m.Student_2_Preferences.Sleep_Schedule} &bull; {m.Student_2_Preferences.Food_Preference}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cohort / Gender */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#94A3B8] border border-slate-200 dark:border-[#334155]">
                          {gender}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusBadgeClass(
                            m.Match_Status
                          )}`}
                        >
                          {m.Match_Status || 'Proposed'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openDetailsModal(m)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          title="View Score Breakdown & Explanations"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {m.Match_Status !== 'Approved' && (
                          <button
                            onClick={() => handleApproveMatch(m.Match_ID)}
                            disabled={actionLoading === m.Match_ID}
                            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors disabled:opacity-50"
                            title="Approve Match"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {m.Match_Status !== 'Rejected' && (
                          <button
                            onClick={() => handleRejectMatch(m.Match_ID)}
                            disabled={actionLoading === m.Match_ID}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50"
                            title="Reject Match"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteMatch(m.Match_ID)}
                          disabled={actionLoading === m.Match_ID}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#334155] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50"
                          title="Delete Match"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6. Details & Preference Breakdown Modal */}
      {/* ===================================================================== */}
      {detailsModalOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#334155]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Match Breakdown #{selectedMatch.Match_ID}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeClass(
                      selectedMatch.Match_Status
                    )}`}
                  >
                    {selectedMatch.Match_Status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-[#F1F5F9]">
                  Roommate Living Compatibility
                </h2>
              </div>
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  setSelectedMatch(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182235]"
              >
                &times;
              </button>
            </div>

            {/* Side-by-Side Student Comparison Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-2xl items-center text-center">
              {/* Student 1 */}
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-sm">
                  {(selectedMatch.Student_1_Name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">
                  {selectedMatch.Student_1_Name || `Student #${selectedMatch.Student_ID_1}`}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  ID: #{selectedMatch.Student_ID_1} &bull; {selectedMatch.Student_1_Gender || 'Male'}
                </div>
                <div className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  {selectedMatch.Student_1_Department} ({selectedMatch.Student_1_Year ? `Year ${selectedMatch.Student_1_Year}` : 'Student'})
                </div>
              </div>

              {/* Central Compatibility Ring */}
              <div className="py-2 flex flex-col items-center">
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {selectedMatch.Compatibility_Score ?? '0'}%
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8]">
                  Overall Alignment
                </span>
                <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  Same Gender Cohort
                </span>
              </div>

              {/* Student 2 */}
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-sm">
                  {(selectedMatch.Student_2_Name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">
                  {selectedMatch.Student_2_Name || `Student #${selectedMatch.Student_ID_2}`}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  ID: #{selectedMatch.Student_ID_2} &bull; {selectedMatch.Student_2_Gender || 'Male'}
                </div>
                <div className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
                  {selectedMatch.Student_2_Department} ({selectedMatch.Student_2_Year ? `Year ${selectedMatch.Student_2_Year}` : 'Student'})
                </div>
              </div>
            </div>

            {/* AI Rationale Summary Banner */}
            {selectedMatch.Match_Explanation?.summary && (
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 dark:text-[#F1F5F9] leading-relaxed">
                  <strong className="text-indigo-900 dark:text-indigo-300">Matching Engine Rationale:</strong>{' '}
                  {selectedMatch.Match_Explanation.summary}
                </div>
              </div>
            )}

            {/* 4 Dimension Compatibility Breakdown */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                Dimension Compatibility Breakdown
              </h3>

              {/* Dimension 1: Sleep Schedule (30%) */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#182235]/60 border border-slate-200 dark:border-[#334155] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Sleep Schedule (30% weight)
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {selectedMatch.Match_Explanation?.sleep?.score ?? 0} / 30.0 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${((selectedMatch.Match_Explanation?.sleep?.score ?? 0) / 30.0) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  <span>
                    S1: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_1_Preferences?.Sleep_Schedule || 'Unspecified'}</strong>
                  </span>
                  <span>
                    S2: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_2_Preferences?.Sleep_Schedule || 'Unspecified'}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] italic">
                  {selectedMatch.Match_Explanation?.sleep?.detail || 'Analyzed sleep habit compatibility'}
                </p>
              </div>

              {/* Dimension 2: Study Habits (25%) */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#182235]/60 border border-slate-200 dark:border-[#334155] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                    Study Habits (25% weight)
                  </span>
                  <span className="font-black text-sky-600 dark:text-sky-400">
                    {selectedMatch.Match_Explanation?.study?.score ?? 0} / 25.0 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((selectedMatch.Match_Explanation?.study?.score ?? 0) / 25.0) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  <span>
                    S1: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_1_Preferences?.Study_Habits || 'Unspecified'}</strong>
                  </span>
                  <span>
                    S2: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_2_Preferences?.Study_Habits || 'Unspecified'}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] italic">
                  {selectedMatch.Match_Explanation?.study?.detail || 'Analyzed study environment routines'}
                </p>
              </div>

              {/* Dimension 3: Food Preferences (25%) */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#182235]/60 border border-slate-200 dark:border-[#334155] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                    Dietary Preferences (25% weight)
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {selectedMatch.Match_Explanation?.food?.score ?? 0} / 25.0 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((selectedMatch.Match_Explanation?.food?.score ?? 0) / 25.0) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  <span>
                    S1: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_1_Preferences?.Food_Preference || 'Unspecified'}</strong>
                  </span>
                  <span>
                    S2: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_2_Preferences?.Food_Preference || 'Unspecified'}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] italic">
                  {selectedMatch.Match_Explanation?.food?.detail || 'Analyzed dining and dietary overlap'}
                </p>
              </div>

              {/* Dimension 4: Language (20%) */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#182235]/60 border border-slate-200 dark:border-[#334155] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-[#F1F5F9] flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-purple-500" />
                    Spoken Languages (20% weight)
                  </span>
                  <span className="font-black text-purple-600 dark:text-purple-400">
                    {selectedMatch.Match_Explanation?.language?.score ?? 0} / 20.0 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((selectedMatch.Match_Explanation?.language?.score ?? 0) / 20.0) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  <span>
                    S1: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_1_Preferences?.Language || 'Unspecified'}</strong>
                  </span>
                  <span>
                    S2: <strong className="text-slate-700 dark:text-slate-300">{selectedMatch.Student_2_Preferences?.Language || 'Unspecified'}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] italic">
                  {selectedMatch.Match_Explanation?.language?.detail || 'Analyzed linguistic communication overlap'}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#334155]">
              <button
                onClick={() => handleDeleteMatch(selectedMatch.Match_ID)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Pair</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedMatch.Match_Status !== 'Approved' && (
                  <button
                    onClick={() => handleApproveMatch(selectedMatch.Match_ID)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Match</span>
                  </button>
                )}

                {selectedMatch.Match_Status !== 'Rejected' && (
                  <button
                    onClick={() => handleRejectMatch(selectedMatch.Match_ID)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Match</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setSelectedMatch(null);
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#182235]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. Manual Match Creation Modal */}
      {/* ===================================================================== */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#334155]">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                  Create Manual Roommate Pair
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Select two students to link. Compatibility will be calculated automatically.
                </p>
              </div>
              <button
                onClick={() => setManualModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualMatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">
                  Student 1
                </label>
                <select
                  value={manualS1}
                  onChange={(e) => setManualS1(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>Select Student 1...</option>
                  {students.map((s) => (
                    <option key={s.Student_ID} value={s.Student_ID} disabled={s.Student_ID === manualS2}>
                      #{s.Student_ID} - {s.Name} ({s.Gender || 'General'}, {s.Department || 'Dept'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-[#94A3B8]">
                  Student 2
                </label>
                <select
                  value={manualS2}
                  onChange={(e) => setManualS2(Number(e.target.value))}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>Select Student 2...</option>
                  {students.map((s) => (
                    <option key={s.Student_ID} value={s.Student_ID} disabled={s.Student_ID === manualS1}>
                      #{s.Student_ID} - {s.Name} ({s.Gender || 'General'}, {s.Department || 'Dept'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#94A3B8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualLoading || !manualS1 || !manualS2}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {manualLoading ? 'Creating...' : 'Create Pair'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
