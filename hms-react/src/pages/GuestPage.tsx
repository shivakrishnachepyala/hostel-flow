import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Coffee,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const GuestPage: React.FC = () => {
  const [submitted, setSubmitted] = useState<boolean>(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-2 border-b border-slate-200">
        <span className="text-xs font-bold uppercase tracking-wider text-institutional-600 bg-institutional-50 px-3 py-1 rounded-full border border-institutional-200">
          Visitor Accommodation • Short-Term Campus Stay
        </span>
        <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
          Parent & Visitor Guest House Booking
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Request on-campus guest lodging during orientation, family visits, or university seminars. Maximum stay: 3 days per institutional regulations.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-slate-900">
              Booking Request Received
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your guest room reservation has been queued for warden approval under reference:
            </p>
            <div className="inline-block px-4 py-1.5 bg-slate-100 text-slate-900 font-mono font-bold text-sm rounded-lg border border-slate-200">
              GST-2026-STAY-4091
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Confirmation Timeline</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Guest suites are allocated based on availability. The management desk will confirm your reservation within 24 business hours. No payment is required until room assignment is validated.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="px-6 py-2.5 bg-institutional-800 text-white rounded-lg text-xs font-semibold hover:bg-institutional-900 transition-colors"
            >
              Return to Main Portal
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Booking Form (8 cols) */}
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Visitor Reservation Request
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Primary Guest Name *</label>
                  <input
                    type="text"
                    name="guestName"
                    required
                    placeholder="e.g. Dr. Anil Verma"
                    value={formData.guestName}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="parent@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+91 98220 00000"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purpose of Visit</label>
                  <select
                    name="studentRelation"
                    value={formData.studentRelation}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  >
                    <option value="Parent of Current Student">Parent of Current Student</option>
                    <option value="Orientation Attendee">New Admission Orientation</option>
                    <option value="Official University Guest">Academic Guest / Examiner</option>
                    <option value="Alumni Visitor">University Alumni</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Student Roll / Name (If Applicable)</label>
                  <input
                    type="text"
                    name="studentReference"
                    placeholder="e.g. Aarav Sharma (CS-2026)"
                    value={formData.studentReference}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expected Check-In Date *</label>
                  <input
                    type="date"
                    name="checkInDate"
                    required
                    value={formData.checkInDate}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expected Check-Out Date *</label>
                  <input
                    type="date"
                    name="checkOutDate"
                    required
                    value={formData.checkOutDate}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Number of Guests</label>
                  <select
                    name="guestCount"
                    value={formData.guestCount}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  >
                    <option value="1">1 Adult</option>
                    <option value="2">2 Adults</option>
                    <option value="3">Family (Up to 3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Room Category Preference</label>
                  <select
                    name="roomPreference"
                    value={formData.roomPreference}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  >
                    <option value="Air-Conditioned Deluxe Suite">AC Deluxe Suite (Double Bed)</option>
                    <option value="Standard Visitor Room">Standard Visitor Room (Twin Single)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Special Requirements (Optional)</label>
                  <textarea
                    name="specialRequests"
                    rows={2}
                    placeholder="Ground floor requirement, late check-in notice, etc."
                    value={formData.specialRequests}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-institutional-800 text-white rounded-lg text-xs font-semibold hover:bg-institutional-900 shadow-sm"
                >
                  <span>Submit Guest Reservation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Guidelines Sidebar (4 cols) */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-institutional-600" />
                <span>Guest Suite Amenities</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Furnished private room with queen or twin bed</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Attached western bath with hot water</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Complimentary campus Wi-Fi & tea service</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Access to Central Hall Dining facility</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-2.5">
              <div className="text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Guest House Location</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Guest suites are located in South Wing Complex, adjacent to the administrative lawns. Parking is available near Gate 3.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
