import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  Coffee,
  MapPin,
  Search,
  Loader2,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

export const GuestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'book' | 'track'>('book');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState<string>('');

  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    studentRelation: 'Parent of Current Student',
    studentReference: '',
    checkInDate: '',
    checkOutDate: '',
    guestCount: '1',
    roomPreference: 'Air-Conditioned Deluxe Suite',
    specialRequests: '',
  });

  // Track reference state
  const [trackRef, setTrackRef] = useState<string>('');
  const [trackLoading, setTrackLoading] = useState<boolean>(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackData, setTrackData] = useState<any | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post('/guests/public-request', formData);
      const ref = res.data?.referenceNo || res.data?.data?.Reference_No || 'GST-PROCESSED';
      setReferenceNo(ref);
      setSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit guest reservation request. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackRef.trim()) return;

    setTrackLoading(true);
    setTrackError(null);
    setTrackData(null);

    try {
      const res = await apiClient.get(`/guests/reference/${encodeURIComponent(trackRef.trim())}`);
      setTrackData(res.data?.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Booking reference not found. Please verify the code.';
      setTrackError(msg);
    } finally {
      setTrackLoading(false);
    }
  };

  const inputClass = 
    "w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] " +
    "rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 " +
    "focus:bg-white dark:focus:bg-[#182235] focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all";

  const labelClass = "block text-slate-700 dark:text-[#94A3B8] font-semibold mb-1 text-xs";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-4 border-b border-slate-200 dark:border-[#334155]">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-institutional-50 dark:bg-sky-950/60 text-institutional-700 dark:text-sky-300 border border-institutional-200 dark:border-sky-800/60">
          <Users className="w-3.5 h-3.5" />
          <span>Visitor Accommodation • Short-Term Campus Stay</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
          Parent & Visitor Guest House Booking
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          Request on-campus guest lodging during orientation, family visits, or university seminars. Maximum stay: 3 days per institutional regulations.
        </p>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => { setActiveTab('book'); setSubmitted(false); }}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'book'
                ? 'bg-institutional-800 dark:bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#182235]'
            }`}
          >
            New Reservation Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'track'
                ? 'bg-institutional-800 dark:bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#182235]'
            }`}
          >
            Track Existing Booking
          </button>
        </div>
      </div>

      {activeTab === 'track' ? (
        /* TRACK RESERVATION SECTION */
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9] font-display">
              Lookup Reservation Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Enter the reservation reference number issued when your request was submitted.
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Booking Reference Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GST-2026-STAY-3049"
                  value={trackRef}
                  onChange={(e) => setTrackRef(e.target.value.toUpperCase())}
                  className={inputClass}
                  required
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-5 py-2.5 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {trackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search</span>
                </button>
              </div>
            </div>
          </form>

          {trackError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{trackError}</span>
            </div>
          )}

          {trackData && (
            <div className="p-5 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#334155] pb-3">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Reference Number</div>
                  <div className="text-sm font-mono font-bold text-slate-900 dark:text-[#F1F5F9]">{trackData.Reference_No}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    trackData.Status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : trackData.Status === 'Rejected'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {trackData.Status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    trackData.Check_In_Status === 'Checked-In'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      : trackData.Check_In_Status === 'Checked-Out'
                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {trackData.Check_In_Status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 dark:text-[#94A3B8]">Guest Name:</span>
                  <div className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{trackData.Guest_Name}</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-[#94A3B8]">Purpose:</span>
                  <div className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{trackData.Purpose}</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-[#94A3B8]">Check-In Date:</span>
                  <div className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{trackData.Check_In_Date}</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-[#94A3B8]">Check-Out Date:</span>
                  <div className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{trackData.Check_Out_Date}</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-[#94A3B8]">Room Type:</span>
                  <div className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{trackData.Room_Preference}</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-[#94A3B8]">Request Submitted:</span>
                  <div className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{trackData.Created_At}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : submitted ? (
        /* CONFIRMATION SCREEN */
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-[#F1F5F9]">
              Booking Request Received & Queued
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-md mx-auto">
              Your guest room reservation has been saved in the hostel management database under reference:
            </p>
            <div className="inline-block px-5 py-2.5 bg-slate-100 dark:bg-[#182235] text-slate-900 dark:text-[#F1F5F9] font-mono font-bold text-sm sm:text-base rounded-xl border border-slate-200 dark:border-[#334155] shadow-xs">
              {referenceNo}
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-left text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>Confirmation Timeline & Warden Review</span>
            </div>
            <p className="text-slate-600 dark:text-[#94A3B8] text-[11px] leading-relaxed">
              Guest suites are allocated based on live availability. The hostel warden office will review your request. You can check the status at any time using your reference number above.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => { setTrackRef(referenceNo); setActiveTab('track'); setSubmitted(false); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#182235] transition-colors border border-slate-200 dark:border-[#334155] cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>View Booking Status</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 transition-colors shadow-sm"
            >
              <span>Return to Main Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* BOOKING FORM */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Booking Form (8 cols) */}
          <div className="md:col-span-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] uppercase tracking-wider border-b border-slate-100 dark:border-[#334155] pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
              <span>Visitor Reservation Request</span>
            </h3>

            {errorMessage && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Primary Guest Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="guestName"
                    required
                    placeholder="e.g. Dr. Anil Verma"
                    value={formData.guestName}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email Address <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="parent@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Contact Phone <span className="text-rose-500">*</span></label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+91 98220 00000"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Purpose of Visit</label>
                  <select
                    name="studentRelation"
                    value={formData.studentRelation}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="Parent of Current Student">Parent of Current Student</option>
                    <option value="Orientation Attendee">New Admission Orientation</option>
                    <option value="Official University Guest">Academic Guest / Examiner</option>
                    <option value="Alumni Visitor">University Alumni</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Student Roll / Name (If Applicable)</label>
                  <input
                    type="text"
                    name="studentReference"
                    placeholder="e.g. Rahul Sharma (1001)"
                    value={formData.studentReference}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Expected Check-In Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    name="checkInDate"
                    required
                    value={formData.checkInDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Expected Check-Out Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    name="checkOutDate"
                    required
                    value={formData.checkOutDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Number of Guests</label>
                  <select
                    name="guestCount"
                    value={formData.guestCount}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="1">1 Adult</option>
                    <option value="2">2 Adults</option>
                    <option value="3">Family (Up to 3)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Room Category Preference</label>
                  <select
                    name="roomPreference"
                    value={formData.roomPreference}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="Air-Conditioned Deluxe Suite">AC Deluxe Suite (Double Bed)</option>
                    <option value="Standard Visitor Room">Standard Visitor Room (Twin Single)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Special Requirements (Optional)</label>
                  <textarea
                    name="specialRequests"
                    rows={2}
                    placeholder="Ground floor requirement, late check-in notice, etc."
                    value={formData.specialRequests}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#334155] flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Guest Reservation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Guidelines Sidebar (4 cols) */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-[#F1F5F9] flex items-center gap-2">
                <Coffee className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
                <span>Guest Suite Amenities</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>En-suite bathroom & hot water</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>Complimentary campus Wi-Fi & tea service</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>Access to Central Hall Dining facility</span>
                </li>
              </ul>
            </div>

            <div className="bg-institutional-50 dark:bg-[#111827] text-institutional-950 dark:text-white rounded-2xl p-5 space-y-2.5 border border-institutional-200 dark:border-[#334155] shadow-xs">
              <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Guest House Location</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                Guest suites are located in South Wing Complex, adjacent to the administrative lawns. Parking is available near Gate 3.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
