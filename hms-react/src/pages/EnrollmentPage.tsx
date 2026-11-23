import React, { useState } from 'react';
import { 
  CheckCircle2, 
  User, 
  Sparkles, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Building,
  Home,
  Utensils,
  Moon,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

export const EnrollmentPage: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [registrationResult, setRegistrationResult] = useState<{
    student_id: number;
    email: string;
    name: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: 'Male',
    dob: '',
    department: 'Computer Science',
    yearOfStudy: '1',
    preferredHostel: 'Aryabhatta Block',
    roomType: 'Double',
    foodPreference: 'Vegetarian',
    sleepSchedule: 'Early riser',
    studyHabits: 'Studies in room',
    language: 'English, Hindi',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
        setError('Please enter your full legal name (at least 2 characters).');
        return;
      }
      if (!formData.email.trim() || !formData.email.includes('@') || !formData.email.includes('.')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!formData.phone.trim() || formData.phone.trim().length < 8) {
        setError('Please enter a valid phone number (at least 8 digits).');
        return;
      }
      if (!formData.password || formData.password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match. Please verify both password fields.');
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 3) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        gender: formData.gender,
        dob: formData.dob || null,
        department: formData.department,
        yearOfStudy: parseInt(formData.yearOfStudy, 10) || 1,
        foodPreference: formData.foodPreference,
        sleepSchedule: formData.sleepSchedule,
        studyHabits: formData.studyHabits,
        language: formData.language,
        roomType: formData.roomType,
      };

      const res = await apiClient.post<{
        status: string;
        message: string;
        student_id: number;
        email: string;
        name: string;
      }>('/student/auth/register', payload);

      if (res.data?.status === 'success') {
        setRegistrationResult({
          student_id: res.data.student_id,
          email: res.data.email,
          name: res.data.name,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(res.data?.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reusable input style classes
  const inputClassName = 
    "w-full px-3.5 py-2.5 text-xs rounded-xl transition-all duration-150 " +
    "bg-slate-50 text-slate-900 border border-slate-300 placeholder-slate-400 " +
    "focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 " +
    "dark:bg-[#1E293B] dark:text-[#F1F5F9] dark:border-[#334155] dark:placeholder-[#64748B] " +
    "dark:focus:bg-[#182235] dark:focus:border-sky-400 dark:focus:ring-sky-400/30";

  const selectClassName = 
    "w-full px-3.5 py-2.5 text-xs rounded-xl transition-all duration-150 cursor-pointer " +
    "bg-slate-50 text-slate-900 border border-slate-300 " +
    "focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 " +
    "dark:bg-[#1E293B] dark:text-[#F1F5F9] dark:border-[#334155] " +
    "dark:focus:bg-[#182235] dark:focus:border-sky-400 dark:focus:ring-sky-400/30";

  const labelClassName = "block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1.5";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2 pb-4 border-b border-slate-200 dark:border-[#334155]">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-institutional-50 dark:bg-sky-950/60 text-institutional-700 dark:text-sky-300 border border-institutional-200 dark:border-sky-800/60">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Official University Residential Admissions</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
          Hostel Enrollment Application
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          Submit your student credentials and residential lifestyle preferences. Your record will be directly saved in the university MySQL database.
        </p>
      </div>

      {registrationResult ? (
        /* Registration Success View */
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Account Created & Verified
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-[#F1F5F9]">
              Registration Successful!
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-md mx-auto">
              Welcome, <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{registrationResult.name}</span>. Your student profile is active in the database:
            </p>
            <div className="inline-block px-6 py-2.5 bg-institutional-50 dark:bg-[#182235] text-institutional-900 dark:text-sky-300 font-mono font-extrabold text-lg sm:text-xl rounded-xl border border-institutional-200 dark:border-[#334155] shadow-xs">
              Permanent Student ID: #{registrationResult.student_id}
            </div>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Primary Login Email: <span className="font-mono text-slate-700 dark:text-[#F1F5F9] font-medium">{registrationResult.email}</span>
            </p>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-left text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>Student Portal Account Activated</span>
            </div>
            <p className="text-slate-600 dark:text-[#94A3B8] text-[11px] leading-relaxed">
              Your default mess subscription and welcome notification have been generated in the database. You can now log in to the Student Portal using your Student ID or registered email along with your password.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/student/login"
              className="w-full sm:w-auto px-6 py-3 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>Proceed to Student Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-5 py-3 bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] hover:bg-slate-200 dark:hover:bg-[#182235] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        /* Multi-Step Form Container */
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 shadow-sm space-y-8 transition-colors duration-200">
          {/* Step Progress Bar */}
          <div className="relative">
            {/* Step Connection Track */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-[#334155] -z-0" />
            <div 
              className="absolute top-4 left-6 h-0.5 bg-institutional-600 dark:bg-sky-500 transition-all duration-300 -z-0"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '95%' }}
            />

            <div className="relative z-10 flex items-center justify-between">
              {[
                { num: 1, label: 'Student Identity' },
                { num: 2, label: 'Preferences' },
                { num: 3, label: 'Confirmation' },
              ].map((s) => {
                const isCompleted = step > s.num;
                const isCurrent = step === s.num;
                return (
                  <div key={s.num} className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted) setStep(s.num);
                      }}
                      disabled={!isCompleted && !isCurrent}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700'
                          : isCurrent
                          ? 'bg-institutional-800 dark:bg-sky-600 text-white shadow-md ring-4 ring-sky-100 dark:ring-sky-950/60'
                          : 'bg-slate-100 dark:bg-[#1E293B] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#334155]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                    </button>
                    <span className={`text-[11px] mt-1.5 font-medium transition-colors ${
                      isCurrent
                        ? 'text-slate-900 dark:text-[#F1F5F9] font-bold'
                        : isCompleted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-[#64748B]'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation Alert */}
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleNext} className="space-y-6">
            {/* STEP 1: Student Credentials & Personal Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] uppercase tracking-wider">
                      Student Credentials & Personal Information
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-[#64748B]">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Legal Name */}
                  <div className="sm:col-span-2">
                    <label className={labelClassName}>
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      className={inputClassName}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelClassName}>
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="student@example.com"
                      className={inputClassName}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={labelClassName}>
                      Contact Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className={inputClassName}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-[#94A3B8]">
                        Create Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                      className={inputClassName}
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className={labelClassName}>
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      minLength={8}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className={inputClassName}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className={labelClassName}>
                      Gender Identity <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={selectClassName}
                    >
                      <option value="Male">Male (Boys Residence)</option>
                      <option value="Female">Female (Girls Residence)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className={labelClassName}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className={labelClassName}>
                      Academic Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className={selectClassName}
                    >
                      <option value="Computer Science">Computer Science & Engineering</option>
                      <option value="Electrical Engineering">Electrical & Electronics</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Biotechnology">Biotechnology</option>
                      <option value="Management Studies">Management Studies</option>
                    </select>
                  </div>

                  {/* Year of Study */}
                  <div>
                    <label className={labelClassName}>
                      Current Year of Study <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="yearOfStudy"
                      value={formData.yearOfStudy}
                      onChange={handleChange}
                      className={selectClassName}
                    >
                      <option value="1">1st Year (Undergraduate Fresher)</option>
                      <option value="2">2nd Year (Sophomore)</option>
                      <option value="3">3rd Year (Junior)</option>
                      <option value="4">4th Year (Senior / Final Year)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Residential & Lifestyle Preferences */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] uppercase tracking-wider">
                      Room Configuration & Roommate Compatibility
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-[#64748B]">Step 2 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preferred Room Type */}
                  <div>
                    <label className={labelClassName}>
                      Preferred Room Arrangement <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleChange}
                      className={selectClassName}
                    >
                      <option value="Single">Single Occupancy (Private Room)</option>
                      <option value="Double">Double Sharing (2 Beds)</option>
                      <option value="Triple">Triple Sharing (3 Beds Suite)</option>
                    </select>
                  </div>

                  {/* Mess Preference */}
                  <div>
                    <label className={labelClassName}>
                      Dietary & Mess Subscription <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="foodPreference"
                      value={formData.foodPreference}
                      onChange={handleChange}
                      className={selectClassName}
                    >
                      <option value="Vegetarian">Standard Vegetarian Plan</option>
                      <option value="Non-Vegetarian">Special Non-Vegetarian Plan</option>
                      <option value="Jain">Jain Diet (No Root Vegetables)</option>
                    </select>
                  </div>

                  {/* Sleep Schedule */}
                  <div>
                    <label className={labelClassName}>
                      Sleep & Lifestyle Schedule <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="sleepSchedule"
                      value={formData.sleepSchedule}
                      onChange={handleChange}
                      className={selectClassName}
                    >
                      <option value="Early riser">Early Riser (Sleep by 10:30 PM)</option>
                      <option value="Night owl">Night Owl (Late Night Study / Research)</option>
                      <option value="Flexible">Flexible / Balanced Hours</option>
                    </select>
                  </div>

                  {/* Study Habits */}
                  <div>
                    <label className={labelClassName}>
                      Study Preference <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="studyHabits"
                      value={formData.studyHabits}
                      onChange={handleChange}
                      className={selectClassName}
                    >
                      <option value="Studies in room">Prefers studying in room</option>
                      <option value="Library">Prefers Central Campus Library</option>
                      <option value="Group study">Enjoys Collaborative Group Study</option>
                    </select>
                  </div>

                  {/* Languages */}
                  <div className="sm:col-span-2">
                    <label className={labelClassName}>
                      Languages Spoken (comma separated)
                    </label>
                    <input
                      type="text"
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      placeholder="e.g. English, Hindi, Telugu, Marathi"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="p-3 bg-sky-50 dark:bg-[#182235] border border-sky-200 dark:border-[#334155] rounded-xl text-sky-900 dark:text-sky-200 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Our automated roommate matching engine compares these lifestyle preferences to pair compatible peers and minimize room disputes.
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: Review & Confirmation */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] uppercase tracking-wider">
                      Review Application Details
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-[#64748B]">Step 3 of 3</span>
                </div>

                <div className="bg-slate-50 dark:bg-[#182235] rounded-xl p-5 border border-slate-200 dark:border-[#334155] space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-[#334155]">
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Full Legal Name</span>
                      <span className="font-semibold text-slate-900 dark:text-[#F1F5F9] text-sm">{formData.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Contact Email</span>
                      <span className="font-semibold text-slate-900 dark:text-[#F1F5F9] text-sm">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Phone Number</span>
                      <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">{formData.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Gender & Date of Birth</span>
                      <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">
                        {formData.gender} {formData.dob ? `• ${formData.dob}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Department & Year</span>
                      <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">
                        {formData.department} (Year {formData.yearOfStudy})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Room Preference</span>
                      <span className="font-semibold text-slate-900 dark:text-[#F1F5F9]">
                        {formData.roomType} Sharing
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-[#94A3B8]">
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Diet & Mess</span>
                      <span className="font-medium text-slate-800 dark:text-[#F1F5F9]">{formData.foodPreference}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Schedule</span>
                      <span className="font-medium text-slate-800 dark:text-[#F1F5F9]">{formData.sleepSchedule}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Study Habit</span>
                      <span className="font-medium text-slate-800 dark:text-[#F1F5F9]">{formData.studyHabits}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-[#64748B] block text-[11px]">Languages</span>
                      <span className="font-medium text-slate-800 dark:text-[#F1F5F9]">{formData.language || 'English'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    By confirming, your student record, secure password hash, mess subscription, and preferences will be written to the live MySQL database.
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#334155]">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  disabled={submitting}
                  className="px-4 py-2.5 border border-slate-300 dark:border-[#334155] text-slate-700 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1E293B] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Previous Step</span>
                </button>
              ) : (
                <Link
                  to="/student/login"
                  className="text-xs text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F1F5F9] font-medium"
                >
                  Already have an account? Log In
                </Link>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Writing to Database...</span>
                  </>
                ) : step < 3 ? (
                  <>
                    <span>Next: {step === 1 ? 'Lifestyle Preferences' : 'Review & Confirm'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Submit & Register Account</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
