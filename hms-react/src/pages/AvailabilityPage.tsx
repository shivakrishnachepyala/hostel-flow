import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw, Box, ShieldCheck, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { ILLUSTRATIVE_ROOMS, IllustrativeRoom } from '../data/illustrativeHostel';

export const AvailabilityPage: React.FC = () => {
  const [dbRooms, setDbRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [usingIllustrative, setUsingIllustrative] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // Attempt to fetch actual rooms from Flask backend /api/room
    apiClient.get('/room')
      .then((res: any) => {
        if (mounted) {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setDbRooms(res.data);
            setUsingIllustrative(false);
          } else {
            // MySQL table has 0 rows currently, display prototype data
            setUsingIllustrative(true);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setUsingIllustrative(true);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-institutional-600 bg-institutional-50 px-3 py-1 rounded-full border border-institutional-200">
            Real-Time Capacity Monitoring
          </span>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-2">
            Hostel Room & Bed Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Authoritative room and bed occupancy figures across university residential facilities.
          </p>
        </div>

        <Link
          to="/explorer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-institutional-800 text-white rounded-lg text-xs font-semibold hover:bg-institutional-900 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Box className="w-3.5 h-3.5" />
          <span>Inspect 3D Geometry</span>
        </Link>
      </div>

      {/* Live vs Illustrative Notice Banner */}
      <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
        usingIllustrative 
          ? 'bg-amber-50 border-amber-200 text-amber-900' 
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${usingIllustrative ? 'text-amber-600' : 'text-emerald-600'}`} />
        <div>
          <span className="font-bold">
            {usingIllustrative ? 'Notice: Displaying Stage 1 Illustrative Model Data' : 'Live Data: Authoritative MySQL Database Records'}
          </span>
          <p className="mt-0.5 text-slate-600">
            {usingIllustrative 
              ? 'Your MySQL `hms` database contains 0 room records. Showing structured prototype demonstration vacancies until room allocations are populated by the warden.'
              : 'Records fetched directly from local MySQL `hms` database via the Flask REST API.'}
          </p>
        </div>
      </div>

      {/* Availability Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Residential Units
          </span>
          <span className="text-xs text-slate-500">
            Showing {usingIllustrative ? ILLUSTRATIVE_ROOMS.length : dbRooms.length} rooms
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Room No.</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Vacant Beds</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {usingIllustrative ? (
                ILLUSTRATIVE_ROOMS.map((r: IllustrativeRoom) => (
                  <tr key={r.Room_ID} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.Room_Number}</td>
                    <td className="py-3 px-4">Level {r.Floor}</td>
                    <td className="py-3 px-4">{r.Room_Type}</td>
                    <td className="py-3 px-4">{r.Capacity} Beds</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">
                      {r.availableBeds} Free
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          r.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'partially-occupied'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'fully-occupied'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to="/enrollment"
                        className="text-institutional-700 hover:text-institutional-900 font-semibold inline-flex items-center gap-1"
                      >
                        <span>Apply</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                dbRooms.map((r: any) => (
                  <tr key={r.Room_ID} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.Room_Number}</td>
                    <td className="py-3 px-4">Level {r.Floor}</td>
                    <td className="py-3 px-4">{r.Room_Type || 'Standard'}</td>
                    <td className="py-3 px-4">{r.Capacity || 2} Beds</td>
                    <td className="py-3 px-4 text-slate-500">—</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        Registered
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to="/enrollment"
                        className="text-institutional-700 hover:text-institutional-900 font-semibold"
                      >
                        Apply
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
