import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  User, 
  Sparkles, 
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EnrollmentPage: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: 'Computer Science',
    yearOfStudy: '1',
    gender: 'Male',
    preferredHostel: 'Aryabhatta Block',
    roomType: 'Double',
    foodPreference: 'Vegetarian',
    sleepSchedule: 'Early riser',
    studyHabits: 'Studies in room',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) setStep(step + 1);
    else {
      setSubmitted(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-2 border-b border-slate-200">
        <span className="text-xs font-bold uppercase tracking-wider text-institutional-600 bg-institutional-50 px-3 py-1 rounded-full border border-institutional-200">
          Student Portal • No Password Required
        </span>
        <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
          Hostel Enrollment Application
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Submit your residential preferences for the upcoming academic session. Room allocations are vetted and assigned by the university warden committee.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-slate-900">
              Application Submitted for Review
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your details and living preferences have been recorded under reference code:
            </p>
            <div className="inline-block px-4 py-1.5 bg-slate-100 text-slate-900 font-mono font-bold text-sm rounded-lg border border-slate-200">
              APP-2026-ARYA-8411
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Next Steps: Committee Allocation</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Submission of this application registers your profile. Authorized staff will review allocations in Stage 5 backend integration. Keep your application reference handy.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-4">
            <Link
              to="/"
              className="px-5 py-2.5 bg-institutional-800 text-white rounded-lg text-xs font-semibold hover:bg-institutional-900 transition-colors"
            >
              Back to Home
            </Link>
            <Link
              to="/explorer"
              className="px-5 py-2.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              Continue 3D Exploring
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            {[
              { num: 1, label: 'Student Info' },
              { num: 2, label: 'Room & Living Preferences' },
              { num: 3, label: 'Review & Confirm' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.num
                      ? 'bg-institutional-800 text-white'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s.num}
                </span>
                <span className="text-xs font-medium hidden sm:inline text-slate-700">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleNext} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Step 1: Student Personal Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Institutional Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="student@university.edu"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mobile Contact *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="+91 98100 00000"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Academic Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    >
                      <option value="Computer Science">Computer Science & Engineering</option>
                      <option value="Electronics">Electronics & Communication</option>
                      <option value="Mechanical">Mechanical Engineering</option>
                      <option value="Civil">Civil Engineering</option>
                      <option value="Sciences">Physical & Biological Sciences</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Year of Study</label>
                    <select
                      name="yearOfStudy"
                      value={formData.yearOfStudy}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    >
                      <option value="1">Year 1 (Freshman)</option>
                      <option value="2">Year 2 (Sophomore)</option>
                      <option value="3">Year 3 (Junior)</option>
                      <option value="4">Year 4 (Senior)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Step 2: Room & Roommate Preferences
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Preferred Hostel Block</label>
                    <select
                      name="preferredHostel"
                      value={formData.preferredHostel}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    >
                      <option value="Aryabhatta Block">Aryabhatta Block (Boys Residence)</option>
                      <option value="Gargi Block">Gargi Block (Girls Residence)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Preferred Room Type</label>
                    <select
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    >
                      <option value="Single">Single Occupancy</option>
                      <option value="Double">Double Sharing</option>
                      <option value="Triple">Triple Suite</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Dietary Preference</label>
                    <select
                      name="foodPreference"
                      value={formData.foodPreference}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    >
                      <option value="Vegetarian">Vegetarian (Campus Hall Dining)</option>
                      <option value="Non-vegetarian">Non-vegetarian</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Sleep Schedule</label>
                    <select
                      name="sleepSchedule"
                      value={formData.sleepSchedule}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-institutional-600"
                    >
                      <option value="Early riser">Early Riser (Sleep by 10 PM)</option>
                      <option value="Night owl">Night Owl (Studies late)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Step 3: Review Application Information
                </h3>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400">Applicant:</span>{' '}
                      <span className="font-semibold text-slate-900">{formData.fullName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Department:</span>{' '}
                      <span className="font-semibold text-slate-900">{formData.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>{' '}
                      <span className="font-semibold text-slate-900">{formData.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Room Category:</span>{' '}
                      <span className="font-semibold text-slate-900">{formData.roomType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Hostel Choice:</span>{' '}
                      <span className="font-semibold text-slate-900">{formData.preferredHostel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Habits:</span>{' '}
                      <span className="font-semibold text-slate-900">{formData.sleepSchedule}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  By submitting, you certify that personal and academic details are genuine. Room allocation remains subject to university availability.
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div></div>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-institutional-800 text-white rounded-lg text-xs font-semibold hover:bg-institutional-900 shadow-sm"
              >
                <span>{step === 3 ? 'Confirm & Submit Application' : 'Continue to Next Step'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
