import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Home, 
  Utensils, 
  CreditCard, 
  MessageSquare, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Bed, 
  Users, 
  ShieldCheck, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { apiClient } from '../services/apiClient';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const StudentPortalPage: React.FC = () => {
  const { student, logout, networkStatus } = useStudentAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'room' | 'room-change' | 'mess' | 'payments' | 'complaints' | 'preferences' | 'notifications' | 'profile'
  >('overview');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Sub-data states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [roomChangeRequests, setRoomChangeRequests] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsSummary, setPaymentsSummary] = useState<any>(null);
  const [messData, setMessData] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);

  // Forms states
  const [newComplaintModal, setNewComplaintModal] = useState<boolean>(false);
  const [complaintForm, setComplaintForm] = useState({
    category: 'Maintenance',
    title: '',
    description: '',
    priority: 'Medium',
  });

  const [newRoomChangeModal, setNewRoomChangeModal] = useState<boolean>(false);
  const [roomChangeForm, setRoomChangeForm] = useState({
    targetRoomType: 'Single',
    reason: '',
  });

  const [messForm, setMessForm] = useState({
    planName: 'Standard Veg',
    dietaryRemarks: '',
  });

  const [profileForm, setProfileForm] = useState({
    phone: '',
    email: '',
    dob: '',
  });

  const [prefForm, setPrefForm] = useState({
    language: '',
    foodPreference: 'Vegetarian',
    sleepSchedule: 'Early riser',
    studyHabits: 'Studies in room',
  });

  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/student/dashboard');
      if (res.data?.status === 'success') {
        const data = res.data.data;
        setDashboardData(data);
        if (data.mess) {
          setMessForm({
            planName: data.mess.Plan_Name || 'Standard Veg',
            dietaryRemarks: data.mess.Dietary_Remarks || '',
          });
        }
        if (data.student) {
          setProfileForm({
            phone: data.student.Phone || '',
            email: data.student.Email || '',
            dob: data.student.DOB || '',
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load student dashboard:', err);
      setError(err.message || 'Failed to load student dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Lazy load tab specific data
  useEffect(() => {
    if (activeTab === 'notifications') {
      apiClient.get('/student/notifications').then((r) => {
        if (r.data?.status === 'success') setNotifications(r.data.data);
      });
    } else if (activeTab === 'complaints') {
      apiClient.get('/student/complaints').then((r) => {
        if (r.data?.status === 'success') setComplaints(r.data.data);
      });
    } else if (activeTab === 'room-change') {
      apiClient.get('/student/room-change-requests').then((r) => {
        if (r.data?.status === 'success') setRoomChangeRequests(r.data.data);
      });
    } else if (activeTab === 'payments') {
      apiClient.get('/student/payments').then((r) => {
        if (r.data?.status === 'success') {
          setPayments(r.data.data);
          setPaymentsSummary(r.data.summary);
        }
      });
    } else if (activeTab === 'mess') {
      apiClient.get('/student/mess').then((r) => {
        if (r.data?.status === 'success') setMessData(r.data.data);
      });
    } else if (activeTab === 'preferences') {
      apiClient.get('/student/preferences').then((r) => {
        if (r.data?.status === 'success' && r.data.data) {
          setPreferences(r.data.data);
          setPrefForm({
            language: r.data.data.Language || '',
            foodPreference: r.data.data.Food_Preference || 'Vegetarian',
            sleepSchedule: r.data.data.Sleep_Schedule || 'Early riser',
            studyHabits: r.data.data.Study_Habits || 'Studies in room',
          });
        }
      });
    }
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // Submit Complaint
  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiClient.post('/student/complaints', complaintForm);
      if (res.data?.status === 'success') {
        setFormMsg({ type: 'success', text: 'Support ticket submitted successfully.' });
        setNewComplaintModal(false);
        setComplaintForm({ category: 'Maintenance', title: '', description: '', priority: 'Medium' });
        const cr = await apiClient.get('/student/complaints');
        if (cr.data?.status === 'success') setComplaints(cr.data.data);
        loadDashboard();
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to submit complaint.' });
    }
  };

  // Submit Room Change Request
  const handleRoomChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiClient.post('/student/room-change-requests', {
        target_room_type: roomChangeForm.targetRoomType,
        reason: roomChangeForm.reason,
      });
      if (res.data?.status === 'success') {
        setFormMsg({ type: 'success', text: 'Room change request submitted for review.' });
        setNewRoomChangeModal(false);
        setRoomChangeForm({ targetRoomType: 'Single', reason: '' });
        const rcr = await apiClient.get('/student/room-change-requests');
        if (rcr.data?.status === 'success') setRoomChangeRequests(rcr.data.data);
        loadDashboard();
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to submit request.' });
    }
  };

  // Update Mess Plan
  const handleMessUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiClient.put('/student/mess', {
        plan_name: messForm.planName,
        dietary_remarks: messForm.dietaryRemarks,
      });
      if (res.data?.status === 'success') {
        setFormMsg({ type: 'success', text: 'Mess subscription updated successfully.' });
        loadDashboard();
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to update mess.' });
    }
  };

  // Update Profile
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiClient.put('/student/profile', {
        email: profileForm.email,
        phone: profileForm.phone,
        dob: profileForm.dob || null,
      });
      if (res.data?.status === 'success') {
        setFormMsg({ type: 'success', text: 'Contact information updated successfully.' });
        loadDashboard();
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    }
  };

  // Update Preferences
  const handlePrefUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      const res = await apiClient.put('/student/preferences', {
        language: prefForm.language,
        food_preference: prefForm.foodPreference,
        sleep_schedule: prefForm.sleepSchedule,
        study_habits: prefForm.studyHabits,
      });
      if (res.data?.status === 'success') {
        setFormMsg({ type: 'success', text: 'Living preferences updated.' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to update preferences.' });
    }
  };

  // Mark notification read
  const handleMarkNotificationRead = async (id: number) => {
    try {
      await apiClient.put(`/student/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.Notification_ID === id ? { ...n, Is_Read: 1 } : n)));
      loadDashboard();
    } catch {
      // Ignore
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await apiClient.put('/student/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, Is_Read: 1 })));
      loadDashboard();
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-4 border-institutional-200 dark:border-sky-800 border-t-institutional-800 dark:border-t-sky-400 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-[#94A3B8]">Loading student records from MySQL...</p>
      </div>
    );
  }

  const alloc = dashboardData?.allocation;
  const roommates = dashboardData?.roommates || [];
  const mess = dashboardData?.mess;
  const paySummary = dashboardData?.payments_summary;

  // Reusable classes
  const inputStyle = 
    "w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] " +
    "rounded-xl text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 " +
    "focus:bg-white dark:focus:bg-[#182235] focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all";

  const cardStyle = "bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0B1120] text-slate-800 dark:text-[#F1F5F9] transition-colors duration-200 pb-16">
      {/* Top Bar Banner */}
      <div className="bg-institutional-900 dark:bg-[#111827] text-white border-b border-institutional-950 dark:border-[#334155] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-sky-500/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10 dark:border-sky-400/30 font-bold text-lg shadow-sm">
                {student?.Name?.charAt(0) || 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-display text-white tracking-tight">
                    {student?.Name}
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-institutional-700 dark:bg-[#1E293B] text-institutional-100 dark:text-sky-300 rounded-full border border-institutional-600 dark:border-[#334155]">
                    ID #{student?.Student_ID}
                  </span>
                </div>
                <p className="text-xs text-institutional-200 dark:text-[#94A3B8] font-medium">
                  {student?.Department} • Year {student?.Year_of_Study} • {student?.Email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Network Connectivity Badge */}
              {networkStatus === 'connected' ? (
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                  title="Directly connected to live MySQL 8.4 database"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Database</span>
                </div>
              ) : networkStatus === 'error' ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/80">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Backend Offline</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300">
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking...</span>
                </div>
              )}

              <ThemeToggle className="bg-white/10 dark:bg-[#1E293B] text-white" />

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh Live Data"
                className="p-2 text-slate-300 hover:text-white bg-white/5 dark:bg-[#1E293B] hover:bg-white/10 dark:hover:bg-[#182235] rounded-xl transition-colors border border-white/10 dark:border-[#334155] cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {formMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
              formMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {formMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              )}
              <span>{formMsg.text}</span>
            </div>
            <button onClick={() => setFormMsg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold ml-4 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-[#334155] text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'room', label: 'Accommodation', icon: Building2 },
            { id: 'room-change', label: 'Room Change', icon: Bed },
            { id: 'mess', label: 'Mess Plan', icon: Utensils },
            { id: 'payments', label: 'Fee Payments', icon: CreditCard },
            { id: 'complaints', label: 'Maintenance & Tickets', icon: MessageSquare },
            { id: 'preferences', label: 'Roommate Preferences', icon: Users },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: dashboardData?.unread_notifications },
            { id: 'profile', label: 'My Profile', icon: User },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  setFormMsg(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'bg-institutional-800 dark:bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#182235]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Room Allocation */}
              <div className={`${cardStyle} p-5 space-y-2`}>
                <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Room Allocation</span>
                  <Building2 className="w-5 h-5 text-institutional-600 dark:text-sky-400" />
                </div>
                {alloc ? (
                  <div>
                    <span className="text-xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] block">
                      Room {alloc.Room_Number} • Bed {alloc.Bed_Number}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                      {alloc.Hostel_Name} ({alloc.Block_Name})
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 block">
                      Under Review / Pending
                    </span>
                    <span className="text-xs text-slate-400 dark:text-[#64748B]">Awaiting committee assignment</span>
                  </div>
                )}
              </div>

              {/* Card 2: Mess Subscription */}
              <div className={`${cardStyle} p-5 space-y-2`}>
                <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Mess Subscription</span>
                  <Utensils className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                {mess ? (
                  <div>
                    <span className="text-xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] block">
                      {mess.Plan_Name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                      ₹{mess.Monthly_Cost} / mo • {mess.Status}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-[#F1F5F9] block">No Active Plan</span>
                    <span className="text-xs text-slate-400 dark:text-[#64748B]">Select a dining subscription</span>
                  </div>
                )}
              </div>

              {/* Card 3: Fee Balance */}
              <div className={`${cardStyle} p-5 space-y-2`}>
                <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Outstanding Dues</span>
                  <CreditCard className="w-5 h-5 text-institutional-600 dark:text-sky-400" />
                </div>
                <div>
                  <span className="text-xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] block">
                    ₹{paySummary?.total_pending || 0}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Total Paid: ₹{paySummary?.total_paid || 0}
                  </span>
                </div>
              </div>

              {/* Card 4: Unread Notifications */}
              <div className={`${cardStyle} p-5 space-y-2`}>
                <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Notices & Alerts</span>
                  <Bell className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <span className="text-xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] block">
                    {dashboardData?.unread_notifications || 0} Unread
                  </span>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                    {dashboardData?.open_complaints || 0} Open Tickets
                  </span>
                </div>
              </div>
            </div>

            {/* Allocation & Roommate Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Room Details (7 cols) */}
              <div className={`lg:col-span-7 ${cardStyle} p-6 sm:p-8 space-y-6`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-4">
                  <h2 className="text-base font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
                    <span>My Residential Unit</span>
                  </h2>
                  {alloc && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Active Lease
                    </span>
                  )}
                </div>

                {alloc ? (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155]">
                      <div>
                        <span className="text-slate-400 dark:text-[#94A3B8] block text-[11px]">Building & Block</span>
                        <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">
                          {alloc.Hostel_Name} • {alloc.Block_Name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#94A3B8] block text-[11px]">Room & Bed Slot</span>
                        <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">
                          Room {alloc.Room_Number} • Bed {alloc.Bed_Number}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#94A3B8] block text-[11px]">Room Layout Type</span>
                        <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">{alloc.Room_Type} Occupancy</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#94A3B8] block text-[11px]">Floor Level</span>
                        <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">Floor {alloc.Floor}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#94A3B8] block text-[11px]">Allocation Date</span>
                        <span className="font-mono text-slate-700 dark:text-[#F1F5F9]">{alloc.Start_Date || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-[#94A3B8] block text-[11px]">Valid Until</span>
                        <span className="font-mono text-slate-700 dark:text-[#F1F5F9]">{alloc.End_Date || 'End of Academic Year'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setActiveTab('room-change')}
                        className="text-xs font-semibold text-institutional-700 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Need a different room arrangement? Request Change</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-[#182235] rounded-xl border border-dashed border-slate-200 dark:border-[#334155]">
                    <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-[#F1F5F9]">
                      Room Assignment in Progress
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
                      Your enrollment application has been logged. The residential warden committee will allocate an available room based on your departmental batch and preferences.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Roommate Matching (5 cols) */}
              <div className={`lg:col-span-5 ${cardStyle} p-6 sm:p-8 space-y-5`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-4">
                  <h2 className="text-base font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                    <Users className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
                    <span>Roommates & Peers</span>
                  </h2>
                  <span className="text-xs text-slate-400 dark:text-[#94A3B8]">{roommates.length} Connected</span>
                </div>

                {roommates.length > 0 ? (
                  <div className="space-y-3">
                    {roommates.map((rm: any) => (
                      <div
                        key={rm.Student_ID}
                        className="p-3 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-institutional-800 dark:bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                            {rm.Name?.charAt(0) || 'R'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-[#F1F5F9] block">{rm.Name}</span>
                            <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] block">
                              {rm.Department} • Year {rm.Year_of_Study}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-200/80 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] rounded-md font-mono text-[10px]">
                          Bed #{rm.Bed_Number}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#182235] rounded-xl border border-dashed border-slate-200 dark:border-[#334155] space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-[#F1F5F9]">Single Occupancy or Pending Roommates</p>
                    <p>No other active students currently allocated to your unit.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ACCOMMODATION DETAILS */}
        {/* ========================================================================= */}
        {activeTab === 'room' && (
          <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-4">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
                  <span>My Residential Accommodation</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Verified details queried from MySQL allocation and bed inventories.
                </p>
              </div>

              {alloc && (
                <button
                  onClick={() => setActiveTab('room-change')}
                  className="px-4 py-2 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 transition-all shadow-sm cursor-pointer"
                >
                  Request Room Change
                </button>
              )}
            </div>

            {alloc ? (
              <div className="space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <span className="text-slate-400 dark:text-[#94A3B8] font-bold uppercase text-[10px]">Hostel Complex</span>
                    <span className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] block">{alloc.Hostel_Name}</span>
                    <span className="text-slate-500 dark:text-[#94A3B8] block">{alloc.Block_Name} Wing</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <span className="text-slate-400 dark:text-[#94A3B8] font-bold uppercase text-[10px]">Room Number</span>
                    <span className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] block">Room {alloc.Room_Number}</span>
                    <span className="text-slate-500 dark:text-[#94A3B8] block">Floor Level: {alloc.Floor}</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155] space-y-1">
                    <span className="text-slate-400 dark:text-[#94A3B8] font-bold uppercase text-[10px]">Bed Assignment</span>
                    <span className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] block">Bed {alloc.Bed_Number}</span>
                    <span className="text-slate-500 dark:text-[#94A3B8] block">{alloc.Room_Type} Layout</span>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155] space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-[#F1F5F9] uppercase tracking-wider text-xs">
                    Room Facilities & Rules
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 dark:text-[#94A3B8]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Wi-Fi Network</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Study Desk & Chair</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Wardrobe Locker</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Solar Water Supply</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#182235] rounded-xl border border-dashed border-slate-200 dark:border-[#334155] space-y-2">
                <p className="font-semibold text-slate-700 dark:text-[#F1F5F9]">No Active Room Allocation</p>
                <p>Your enrollment has been submitted. Check back soon once the warden committee confirms bed inventory.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ROOM CHANGE REQUESTS */}
        {/* ========================================================================= */}
        {activeTab === 'room-change' && (
          <div className="space-y-6">
            <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                    <Bed className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
                    <span>Room Change Requests</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Request a room transfer or different occupancy configuration.
                  </p>
                </div>
                <button
                  onClick={() => setNewRoomChangeModal(true)}
                  className="px-4 py-2 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Request</span>
                </button>
              </div>

              {roomChangeRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-[#182235] text-slate-700 dark:text-[#F1F5F9] font-semibold border-b border-slate-200 dark:border-[#334155]">
                      <tr>
                        <th className="p-3">Request #</th>
                        <th className="p-3">Target Room Type</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Warden Remarks</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                      {roomChangeRequests.map((r) => (
                        <tr key={r.Request_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50">
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-[#F1F5F9]">#{r.Request_ID}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-[#F1F5F9]">{r.Target_Room_Type}</td>
                          <td className="p-3 text-slate-600 dark:text-[#94A3B8] max-w-xs">{r.Reason}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                r.Status === 'Approved'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : r.Status === 'Rejected'
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {r.Status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-[#94A3B8] italic">
                            {r.Admin_Remarks || 'Pending review by warden committee'}
                          </td>
                          <td className="p-3 text-slate-400 dark:text-[#64748B] font-mono text-[11px]">
                            {r.Created_At ? r.Created_At.substring(0, 10) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#182235] rounded-xl border border-dashed border-slate-200 dark:border-[#334155]">
                  No room change requests submitted yet.
                </div>
              )}
            </div>

            {/* Modal */}
            {newRoomChangeModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">Request Room Change</h3>
                    <button
                      onClick={() => setNewRoomChangeModal(false)}
                      className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F1F5F9] font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleRoomChangeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                        Preferred Room Type *
                      </label>
                      <select
                        value={roomChangeForm.targetRoomType}
                        onChange={(e) =>
                          setRoomChangeForm({ ...roomChangeForm, targetRoomType: e.target.value })
                        }
                        className={inputStyle}
                      >
                        <option value="Single">Single Occupancy</option>
                        <option value="Double">Double Sharing</option>
                        <option value="Triple">Triple Sharing</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                        Reason for Change * (at least 10 chars)
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={roomChangeForm.reason}
                        onChange={(e) =>
                          setRoomChangeForm({ ...roomChangeForm, reason: e.target.value })
                        }
                        placeholder="Explain why you are requesting a change (e.g. academic quiet requirements, medical considerations, compatibility)..."
                        className={inputStyle}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#334155]">
                      <button
                        type="button"
                        onClick={() => setNewRoomChangeModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B] rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-institutional-800 dark:bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-institutional-900 dark:hover:bg-sky-500 shadow-sm cursor-pointer"
                      >
                        Submit Request
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MESS SUBSCRIPTION */}
        {/* ========================================================================= */}
        {activeTab === 'mess' && (
          <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                <Utensils className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Mess & Dining Subscriptions</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Switch your monthly meal plan or record dietary allergies.
              </p>
            </div>

            <form onSubmit={handleMessUpdate} className="max-w-xl space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Active Dining Plan
                </label>
                <select
                  value={messForm.planName}
                  onChange={(e) => setMessForm({ ...messForm, planName: e.target.value })}
                  className={inputStyle}
                >
                  <option value="Standard Veg">Standard Veg (₹3,200/mo)</option>
                  <option value="Special Non-Veg">Special Non-Veg (₹4,200/mo)</option>
                  <option value="Jain Meal Plan">Jain Meal Plan (₹3,500/mo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Dietary Remarks / Allergy Information
                </label>
                <input
                  type="text"
                  value={messForm.dietaryRemarks}
                  onChange={(e) => setMessForm({ ...messForm, dietaryRemarks: e.target.value })}
                  placeholder="e.g. Nut allergy, lactose intolerant, gluten sensitivity"
                  className={inputStyle}
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 dark:bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 dark:hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
              >
                Save Mess Subscription
              </button>
            </form>

            {messData?.history && messData.history.length > 0 && (
              <div className="pt-6 border-t border-slate-100 dark:border-[#334155] space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
                  Subscription History
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-[#182235] text-slate-700 dark:text-[#F1F5F9] font-semibold border-b border-slate-200 dark:border-[#334155]">
                      <tr>
                        <th className="p-3">Plan Name</th>
                        <th className="p-3">Monthly Cost</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Start Date</th>
                        <th className="p-3">Dietary Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                      {messData.history.map((m: any) => (
                        <tr key={m.Subscription_ID}>
                          <td className="p-3 font-semibold text-slate-900 dark:text-[#F1F5F9]">{m.Plan_Name}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-[#F1F5F9]">₹{m.Monthly_Cost}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              {m.Status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-[#94A3B8]">{m.Start_Date || '—'}</td>
                          <td className="p-3 text-slate-500 dark:text-[#94A3B8]">{m.Dietary_Remarks || 'None'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PAYMENTS & BILLING */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
                  <span>Fee Payments & Ledger</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Real transaction history recorded in MySQL for Student #{student?.Student_ID}.
                </p>
              </div>

              {paymentsSummary && (
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    Total Paid: ₹{paymentsSummary.total_paid}
                  </span>
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl">
                    Pending: ₹{paymentsSummary.total_pending}
                  </span>
                </div>
              )}
            </div>

            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 dark:bg-[#182235] text-slate-700 dark:text-[#F1F5F9] font-semibold border-b border-slate-200 dark:border-[#334155]">
                    <tr>
                      <th className="p-3">Payment ID</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment Date</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ref ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                    {payments.map((p) => (
                      <tr key={p.Payment_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-[#F1F5F9]">#{p.Payment_ID}</td>
                        <td className="p-3 text-slate-700 dark:text-[#94A3B8]">{p.Payment_Type || 'Hostel Fee'}</td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">₹{p.Amount}</td>
                        <td className="p-3 text-slate-500 dark:text-[#94A3B8]">{p.Payment_Date || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-[#94A3B8]">{p.Payment_Method || 'UPI / NetBanking'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.Payment_Status === 'Paid'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : p.Payment_Status === 'Pending'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {p.Payment_Status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400 dark:text-[#64748B] text-[11px]">
                          {p.Transaction_Reference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#182235] rounded-xl border border-dashed border-slate-200 dark:border-[#334155] space-y-1">
                <p className="font-semibold text-slate-700 dark:text-[#F1F5F9]">No Payment Records Found</p>
                <p>No fee transactions recorded for Student ID #{student?.Student_ID} in the MySQL database.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MAINTENANCE & COMPLAINTS */}
        {/* ========================================================================= */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span>Support & Maintenance Tickets</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    File tickets for room repairs, cleaning, wi-fi, or discipline.
                  </p>
                </div>
                <button
                  onClick={() => setNewComplaintModal(true)}
                  className="px-4 py-2 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Ticket</span>
                </button>
              </div>

              {complaints.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-[#182235] text-slate-700 dark:text-[#F1F5F9] font-semibold border-b border-slate-200 dark:border-[#334155]">
                      <tr>
                        <th className="p-3">Ticket #</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Resolution Notes</th>
                        <th className="p-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#334155]">
                      {complaints.map((c) => (
                        <tr key={c.Complaint_ID} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50">
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-[#F1F5F9]">#{c.Complaint_ID}</td>
                          <td className="p-3 font-medium text-slate-800 dark:text-[#F1F5F9]">{c.Category}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-[#F1F5F9] max-w-xs">{c.Title}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                c.Priority === 'Urgent'
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                  : c.Priority === 'High'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#94A3B8]'
                              }`}
                            >
                              {c.Priority}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                c.Status === 'Resolved'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                  : c.Status === 'In Progress'
                                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#94A3B8]'
                              }`}
                            >
                              {c.Status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-[#94A3B8] italic max-w-xs">
                            {c.Resolution_Notes || 'Ticket queued for hostel technician'}
                          </td>
                          <td className="p-3 text-slate-400 dark:text-[#64748B] font-mono text-[11px]">
                            {c.Created_At ? c.Created_At.substring(0, 10) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#182235] rounded-xl border border-dashed border-slate-200 dark:border-[#334155]">
                  No support tickets filed. Your room is in good order!
                </div>
              )}
            </div>

            {/* Modal */}
            {newComplaintModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">File Support / Maintenance Ticket</h3>
                    <button
                      onClick={() => setNewComplaintModal(false)}
                      className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F1F5F9] font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleComplaintSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                          Category *
                        </label>
                        <select
                          value={complaintForm.category}
                          onChange={(e) =>
                            setComplaintForm({ ...complaintForm, category: e.target.value })
                          }
                          className={inputStyle}
                        >
                          <option value="Maintenance">Maintenance</option>
                          <option value="Cleanliness">Cleanliness</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Plumbing">Plumbing</option>
                          <option value="Wi-Fi/Network">Wi-Fi / Network</option>
                          <option value="Noise/Discipline">Noise / Discipline</option>
                          <option value="Mess/Food">Mess / Food</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                          Priority *
                        </label>
                        <select
                          value={complaintForm.priority}
                          onChange={(e) =>
                            setComplaintForm({ ...complaintForm, priority: e.target.value })
                          }
                          className={inputStyle}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                        Brief Subject / Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={complaintForm.title}
                        onChange={(e) =>
                          setComplaintForm({ ...complaintForm, title: e.target.value })
                        }
                        placeholder="e.g. Broken study lamp switch or leaking tap"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                        Detailed Description *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={complaintForm.description}
                        onChange={(e) =>
                          setComplaintForm({ ...complaintForm, description: e.target.value })
                        }
                        placeholder="Provide details to assist the repair technician..."
                        className={inputStyle}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#334155]">
                      <button
                        type="button"
                        onClick={() => setNewComplaintModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B] rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-institutional-800 dark:bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-institutional-900 dark:hover:bg-sky-500 shadow-sm cursor-pointer"
                      >
                        Submit Ticket
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ROOMMATE PREFERENCES */}
        {/* ========================================================================= */}
        {activeTab === 'preferences' && (
          <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
            <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
              <Users className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
              <span>Roommate Living Preferences</span>
            </h2>

            <form onSubmit={handlePrefUpdate} className="max-w-xl space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Languages Spoken
                </label>
                <input
                  type="text"
                  value={prefForm.language}
                  onChange={(e) => setPrefForm({ ...prefForm, language: e.target.value })}
                  placeholder="e.g. English, Hindi, Telugu"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Food Preference
                </label>
                <select
                  value={prefForm.foodPreference}
                  onChange={(e) => setPrefForm({ ...prefForm, foodPreference: e.target.value })}
                  className={inputStyle}
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Jain">Jain Diet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Sleep Schedule
                </label>
                <select
                  value={prefForm.sleepSchedule}
                  onChange={(e) => setPrefForm({ ...prefForm, sleepSchedule: e.target.value })}
                  className={inputStyle}
                >
                  <option value="Early riser">Early riser (10 PM - 6 AM)</option>
                  <option value="Night owl">Night owl (1 AM - 9 AM)</option>
                  <option value="Flexible">Flexible schedule</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Study Habits
                </label>
                <select
                  value={prefForm.studyHabits}
                  onChange={(e) => setPrefForm({ ...prefForm, studyHabits: e.target.value })}
                  className={inputStyle}
                >
                  <option value="Studies in room">Studies in room</option>
                  <option value="Library">Library only</option>
                  <option value="Group study">Group study sessions</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-institutional-800 dark:bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-institutional-900 dark:hover:bg-sky-500 transition-colors shadow-sm cursor-pointer"
              >
                Save Roommate Preferences
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: NOTIFICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'notifications' && (
          <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                  <Bell className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
                  <span>Student Notification Inbox</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Official notices regarding your room, mess, payments, and tickets.
                </p>
              </div>

              {notifications.some((n) => !n.Is_Read) && (
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs font-semibold text-institutional-700 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.Notification_ID}
                    className={`p-4 rounded-xl border transition-all text-xs flex items-start justify-between gap-4 ${
                      n.Is_Read
                        ? 'bg-slate-50/60 dark:bg-[#182235] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#94A3B8]'
                        : 'bg-institutional-50/50 dark:bg-sky-950/40 border-institutional-200 dark:border-sky-800 text-slate-900 dark:text-[#F1F5F9] shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-[#F1F5F9]">{n.Title}</span>
                        {!n.Is_Read && (
                          <span className="w-2 h-2 rounded-full bg-institutional-600 dark:bg-sky-400" />
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] font-semibold text-[10px]">
                          {n.Category}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-[#94A3B8] leading-relaxed">{n.Message}</p>
                      <span className="text-[11px] text-slate-400 dark:text-[#64748B] font-mono block">
                        {n.Created_At ? n.Created_At.substring(0, 16).replace('T', ' ') : '—'}
                      </span>
                    </div>

                    {!n.Is_Read && (
                      <button
                        onClick={() => handleMarkNotificationRead(n.Notification_ID)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-institutional-700 dark:text-sky-300 bg-white dark:bg-[#1E293B] rounded-lg border border-institutional-200 dark:border-[#334155] hover:bg-institutional-50 dark:hover:bg-[#111827] transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#182235] rounded-xl border border-dashed border-slate-200 dark:border-[#334155]">
                No notifications in your inbox.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: STUDENT PROFILE */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className={`${cardStyle} p-6 sm:p-8 space-y-6`}>
            <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
              <User className="w-5 h-5 text-institutional-700 dark:text-sky-400" />
              <span>Student Profile & Contact Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-[#182235] rounded-xl border border-slate-200 dark:border-[#334155] text-xs">
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Student ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">#{student?.Student_ID}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Full Legal Name</span>
                <span className="font-bold text-slate-900 dark:text-[#F1F5F9] text-sm">{student?.Name}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Academic Department</span>
                <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{student?.Department}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Year of Study</span>
                <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">Year {student?.Year_of_Study}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Gender</span>
                <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{student?.Gender}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Account Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Active Student</span>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="max-w-xl space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
                Update Contact Information
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profileForm.dob}
                  onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                  className={inputStyle}
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-institutional-800 dark:bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-institutional-900 dark:hover:bg-sky-500 transition-colors shadow-sm cursor-pointer"
              >
                Update Contact Details
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
