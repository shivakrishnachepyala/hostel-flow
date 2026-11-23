import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  ShieldCheck, 
  Building2, 
  Bed, 
  Wifi, 
  ChevronRight, 
  HelpCircle, 
  Info, 
  Calendar, 
  Coffee,
  Sparkles
} from 'lucide-react';
import { Building3D } from '../components/3d/Building3D';
import { RoomDetailModal } from '../components/3d/RoomDetailModal';
import { ILLUSTRATIVE_ROOMS, IllustrativeRoom } from '../data/illustrativeHostel';
import { apiClient } from '../services/apiClient';
import { Hostel, HostelBlock, Room, Bed as BedType, RoomAllocation } from '../types';

export const HomePage: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<IllustrativeRoom | null>(null);

  // Authoritative MySQL Entities from Flask Backend
  const [dbHostels, setDbHostels] = useState<Hostel[]>([]);
  const [dbBlocks, setDbBlocks] = useState<HostelBlock[]>([]);
  const [dbRooms, setDbRooms] = useState<Room[]>([]);
  const [dbBeds, setDbBeds] = useState<BedType[]>([]);
  const [dbAllocations, setDbAllocations] = useState<RoomAllocation[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      apiClient.get('/hostels/'),
      apiClient.get('/hostel-blocks/'),
      apiClient.get('/rooms/'),
      apiClient.get('/beds/'),
      apiClient.get('/room-allocations/active').catch(() => apiClient.get('/room-allocations/?status=Active')),
    ])
      .then(([hRes, bRes, rRes, bdRes, aRes]) => {
        if (!mounted) return;
        if (hRes.status === 'fulfilled' && hRes.value.data?.data) setDbHostels(hRes.value.data.data);
        if (bRes.status === 'fulfilled' && bRes.value.data?.data) setDbBlocks(bRes.value.data.data);
        if (rRes.status === 'fulfilled' && rRes.value.data?.data) setDbRooms(rRes.value.data.data);
        if (bdRes.status === 'fulfilled' && bdRes.value.data?.data) setDbBeds(bdRes.value.data.data);
        if (aRes.status === 'fulfilled' && aRes.value.data?.data) setDbAllocations(aRes.value.data.data);
        if (hRes.status === 'fulfilled') setIsLiveConnected(true);
      })
      .catch((err) => {
        console.error('HomePage failed to fetch live database metrics:', err);
        if (mounted) setIsLiveConnected(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const activeAllocatedBedIds = useMemo(() => {
    const set = new Set<number>();
    dbAllocations.forEach(a => {
      if (a.Allocation_Status === 'Active' && a.Bed_ID) {
        const startOk = !a.Start_Date || a.Start_Date <= todayStr;
        const endOk = !a.End_Date || a.End_Date >= todayStr;
        if (startOk && endOk) set.add(a.Bed_ID);
      }
    });
    return set;
  }, [dbAllocations, todayStr]);

  const totalBedsCount = dbBeds.length;
  const vacantBedsCount = useMemo(() => {
    return dbBeds.filter(b => {
      const isAvail = (b.Bed_Status || 'Available').toLowerCase() === 'available';
      return isAvail && !activeAllocatedBedIds.has(b.Bed_ID);
    }).length;
  }, [dbBeds, activeAllocatedBedIds]);

  const liveStats = useMemo(() => {
    return [
      { 
        label: 'Hostel Buildings', 
        value: isLiveConnected ? `${dbHostels.length} Active` : '—', 
        sub: isLiveConnected ? `${dbBlocks.length} Residential Blocks` : 'Checking MySQL...' 
      },
      { 
        label: 'Configured Beds', 
        value: isLiveConnected ? `${totalBedsCount}` : '—', 
        sub: isLiveConnected ? `${dbRooms.length} Registered Units` : 'Live Inventory' 
      },
      { 
        label: 'Live Vacancies', 
        value: isLiveConnected ? (vacantBedsCount > 0 ? `${vacantBedsCount} Free` : 'Currently Full') : '—', 
        sub: isLiveConnected && totalBedsCount > 0 ? `${Math.round((vacantBedsCount / totalBedsCount) * 100)}% Available Now` : 'Verified Database' 
      },
      { 
        label: 'Active Leases', 
        value: isLiveConnected ? `${dbAllocations.length} Active` : '—', 
        sub: 'Room Allocations' 
      },
    ];
  }, [isLiveConnected, dbHostels, dbBlocks, dbRooms, totalBedsCount, vacantBedsCount, dbAllocations]);

  const roomTypes = [
    {
      type: 'Single Occupancy Room',
      occupancy: '1 Student',
      area: '14 - 16 sqm',
      amenities: ['Private Study Desk', 'Ergonomic Chair', 'Attached Washroom', 'Air Conditioning Options', 'High-Speed Wi-Fi'],
      suitable: 'Research scholars & final year students',
    },
    {
      type: 'Double Sharing Room',
      occupancy: '2 Students',
      area: '18 - 20 sqm',
      amenities: ['Dual Study Desks', 'Twin Wardrobes', 'Shared Attached Bath', 'Balcony Access', 'Individual Bedside Power'],
      suitable: 'Undergraduate and postgraduate students',
    },
    {
      type: 'Triple Suite Room',
      occupancy: '3 Students',
      area: '24 - 26 sqm',
      amenities: ['Three Bed Units', 'Triple Locker Wardrobes', 'Spacious Common Area', 'Corner Room Ventilation', 'Dedicated Wi-Fi Hub'],
      suitable: 'First-year students & group applicants',
    },
  ];

  const faqs = [
    {
      q: 'Can students select their exact room number in the 3D Explorer?',
      a: 'The 3D explorer enables students to explore room orientations, floor levels, and layout geometry. During enrollment, students record preferences (e.g. single/double room, floor level); final room allocations are confirmed by the warden based on institutional criteria.',
    },
    {
      q: 'Do parents need student credentials to book guest accommodation?',
      a: 'No. Parents and visitors can request short-term campus housing (typically 2 to 3 days) directly through the public Guest Accommodation portal without needing management or student login accounts.',
    },
    {
      q: 'What is the distinction between illustrative 3D data and MySQL records?',
      a: 'The 3D model currently represents a mathematically constructed illustrative architectural model. Live allocation and student records are queried from the MySQL hms database. Structural scans and CAD blueprints will replace the illustrative geometry in future institutional surveys.',
    },
    {
      q: 'What are the check-in and curfew timings for hostel residents?',
      a: 'Main hostel perimeter gates close at 10:00 PM on weekdays. Extended research library passes are authorized via the hostel warden office.',
    },
  ];

  return (
    <div className="space-y-16 lg:space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-institutional-50/70 via-white to-slate-50 dark:from-[#0B1120] dark:via-[#070D18] dark:to-[#0B1120] text-slate-900 dark:text-white pt-16 pb-24 border-b border-slate-200 dark:border-[#334155] transition-colors duration-200">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & Actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-700 dark:text-teal-300 text-xs font-semibold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Next-Generation Campus Living</span>
                </div>
                {isLiveConnected && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>Live Availability</span>
                  </div>
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight leading-tight text-slate-900 dark:text-white">
                Find Your Place. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-institutional-700 to-sky-700 dark:from-teal-400 dark:via-sky-300 dark:to-cyan-200">
                  Explore Your Hostel.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-[#94A3B8] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Explore hostel facilities, discover room layouts in interactive 3D, check available accommodation, and submit your enrollment application through one convenient portal.
              </p>

              {/* Primary Actions */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/explorer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all hover:scale-102"
                >
                  <Box className="w-4 h-4" />
                  <span>Explore 3D Hostel</span>
                </Link>

                <Link
                  to="/enrollment"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-institutional-800 hover:bg-institutional-900 text-white dark:bg-white/10 dark:hover:bg-white/15 dark:text-white font-semibold text-sm border border-transparent dark:border-white/20 shadow-sm transition-all"
                >
                  <span>Apply for Hostel</span>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </Link>

                <Link
                  to="/availability"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-white text-sm font-medium dark:hover:bg-white/5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Check Availability</span>
                </Link>
              </div>

              {/* Secondary link */}
              <div className="pt-2 text-xs text-slate-500 dark:text-[#94A3B8] flex items-center justify-center lg:justify-start gap-2">
                <span>Visiting parent or university guest?</span>
                <Link to="/guest-accommodation" className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:underline font-semibold flex items-center gap-1">
                  <span>Book Guest Stay</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Right Column: Interactive 3D Teaser Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-white/90 dark:bg-[#111827]/80 p-2.5 border border-slate-200 dark:border-[#334155] shadow-lg dark:shadow-2xl backdrop-blur-md">
                <div className="h-[360px] w-full rounded-xl overflow-hidden relative">
                  <Building3D
                    rooms={ILLUSTRATIVE_ROOMS}
                    selectedFloor="all"
                    selectedRoom={selectedRoom}
                    onSelectRoom={(r) => setSelectedRoom(r)}
                    cutawayMode={false}
                  />
                </div>
                <div className="p-3 text-center flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                    <span>Interactive 3D Prototype</span>
                  </span>
                  <Link
                    to="/explorer"
                    className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-semibold flex items-center gap-1"
                  >
                    <span>Full Screen Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip (Live Database Metrics) */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200 dark:border-[#334155] pt-8">
            {liveStats.map((s, idx) => (
              <div key={idx} className="bg-white/80 dark:bg-[#111827]/60 border border-slate-200 dark:border-[#334155] p-4 rounded-xl shadow-xs">
                <div className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">{s.label}</div>
                <div className="text-2xl font-bold font-display text-slate-900 dark:text-white mt-1">{s.value}</div>
                <div className="text-[11px] text-teal-600 dark:text-teal-400/90 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. AVAILABLE HOSTEL BLOCKS (Authoritative MySQL Records) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-institutional-700 dark:text-sky-300 bg-institutional-50 dark:bg-[#182235] px-3 py-1 rounded-full border border-institutional-200 dark:border-[#334155]">
            Residential Facilities
          </span>
          <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Designed for Academic Focus & Community
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
            Our campus offers dedicated residence blocks designed specifically for safety, study comfort, and community development.
          </p>
        </div>

        {dbHostels.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-[#F1F5F9]">No accommodation currently listed</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto">
              No hostel buildings have been registered in the database yet. When management configures hostels and blocks, live occupancy will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {dbHostels.map((hostel) => {
              const hostelBlocks = dbBlocks.filter(b => b.Hostel_ID === hostel.Hostel_ID);
              const hostelRooms = dbRooms.filter(r => hostelBlocks.some(b => b.Block_ID === r.Block_ID));
              const hostelBeds = dbBeds.filter(bd => hostelRooms.some(r => r.Room_ID === bd.Room_ID));
              const hostelVacantBeds = hostelBeds.filter(bd => {
                const isAvail = (bd.Bed_Status || 'Available').toLowerCase() === 'available';
                return isAvail && !activeAllocatedBedIds.has(bd.Bed_ID);
              }).length;

              return (
                <div
                  key={hostel.Hostel_ID}
                  className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all space-y-6 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                          {hostel.Hostel_Type || 'Campus'} Residence
                        </span>
                        <h3 className="text-2xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] mt-0.5">
                          {hostel.Hostel_Name}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {hostelVacantBeds > 0 ? `${hostelVacantBeds} Beds Free` : 'Currently Full'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                      Official student residential facility located at {hostel.Location || 'Main Campus'}. Central residence hall equipped with study lounges, high-speed fibre internet, and solar water heating.
                    </p>

                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 dark:border-[#334155] text-center">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Location</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-[#F1F5F9] mt-0.5">{hostel.Location || 'Campus'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Blocks</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-[#F1F5F9] mt-0.5">{hostelBlocks.length || 1} Blocks</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Total Capacity</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-[#F1F5F9] mt-0.5">{hostel.Capacity || hostelBeds.length || 'N/A'} Beds</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      to="/availability"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-institutional-700 dark:text-sky-400 hover:text-institutional-900 dark:hover:text-sky-300"
                    >
                      <span>Check Live Room Availability</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      to="/enrollment"
                      className="px-4 py-2 bg-slate-900 dark:bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors shadow-sm"
                    >
                      Apply for Hostel
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. ROOM TYPES & SPECIFICATIONS */}
      <section className="bg-slate-100/70 dark:bg-[#0B1120]/70 border-y border-slate-200 dark:border-[#334155] py-16 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-institutional-700 dark:text-sky-300 bg-white dark:bg-[#182235] px-3 py-1 rounded-full border border-slate-200 dark:border-[#334155]">
              Accommodation Types
            </span>
            <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
              Curated Room Categories
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
              Select an accommodation arrangement tailored to your study preferences and personal lifestyle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roomTypes.map((rt, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 flex flex-col justify-between shadow-sm space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                      {rt.occupancy} • {rt.area}
                    </div>
                    <h3 className="text-xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] mt-1">
                      {rt.type}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                    Ideal for: <span className="text-slate-800 dark:text-[#F1F5F9] font-semibold">{rt.suitable}</span>
                  </p>

                  <ul className="space-y-2 text-xs text-slate-600 dark:text-[#94A3B8] border-t border-slate-100 dark:border-[#334155] pt-3">
                    {rt.amenities.map((amenity, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{amenity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to="/enrollment"
                  className="w-full text-center py-2.5 rounded-xl border border-slate-300 dark:border-[#334155] text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors"
                >
                  Choose in Enrollment
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FOUR-STEP ENROLLMENT WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-institutional-700 dark:text-sky-300 bg-institutional-50 dark:bg-[#182235] px-3 py-1 rounded-full border border-institutional-200 dark:border-[#334155]">
            Admissions Journey
          </span>
          <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            How Hostel Enrollment Works
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
            A transparent four-step application process with zero administrative barriers for incoming students.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Student Details',
              desc: 'Submit your personal identification, departmental enrollment, and contact credentials.',
            },
            {
              step: '02',
              title: 'Living Preferences',
              desc: 'Configure room types, sleep cycle, language background, and dietary preferences.',
            },
            {
              step: '03',
              title: '3D Exploration',
              desc: 'Inspect floor plans, orientations, and facility distributions across both hostel blocks.',
            },
            {
              step: '04',
              title: 'Warden Allocation',
              desc: 'Receive confirmation and room allocation upon verification by the admissions committee.',
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-6 relative space-y-3 shadow-sm">
              <span className="text-3xl font-extrabold font-display text-institutional-300/60 dark:text-sky-500/30 block">
                {item.step}
              </span>
              <h4 className="text-base font-bold font-display text-slate-900 dark:text-[#F1F5F9]">{item.title}</h4>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/enrollment"
            className="inline-flex items-center gap-2 px-6 py-3 bg-institutional-800 dark:bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-institutional-900 dark:hover:bg-sky-500 shadow-sm transition-colors"
          >
            <span>Start Online Application</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 5. GUEST ACCOMMODATION CALLOUT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-institutional-900 to-slate-900 dark:from-[#111827] dark:to-[#182235] text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-800 dark:border-[#334155] flex flex-col lg:flex-row items-center justify-between gap-8 transition-colors duration-200">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-teal-300">
              <Coffee className="w-3.5 h-3.5" />
              <span>Dedicated Family & Visitor Housing</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
              Visiting Parents & Guest Accommodation
            </h3>
            <p className="text-sm text-slate-300 dark:text-[#94A3B8] leading-relaxed">
              Parents attending orientation, convocation, or family visits can reserve on-campus guest suites for short-term stays (2 to 3 days). Clean, air-conditioned rooms with campus dining privileges.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-shrink-0">
            <Link
              to="/guest-accommodation"
              className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl text-center shadow-lg transition-colors"
            >
              Request Guest Suite
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium text-sm rounded-xl border border-white/20 text-center transition-colors"
            >
              Inquire Policies
            </Link>
          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
            Common questions regarding residential policies, allocations, and digital portal operations.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-5 space-y-2 shadow-sm transition-colors duration-200">
              <h4 className="text-sm font-bold text-slate-900 dark:text-[#F1F5F9] flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-institutional-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                <span>{f.q}</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed pl-6">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal for inspect room when clicked in hero 3D preview */}
      <RoomDetailModal
        room={selectedRoom}
        onClose={() => setSelectedRoom(null)}
      />
    </div>
  );
};
