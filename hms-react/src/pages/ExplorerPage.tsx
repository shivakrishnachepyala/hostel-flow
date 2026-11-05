import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building3D 
} from '../components/3d/Building3D';
import { 
  FloorSelector 
} from '../components/3d/FloorSelector';
import { 
  RoomDetailModal 
} from '../components/3d/RoomDetailModal';
import { BlenderModelViewer } from '../components/3d/BlenderModelViewer';
import { 
  getAppliedModel, 
  CustomBuildingModel 
} from '../services/modelStorage';
import { 
  ILLUSTRATIVE_ROOMS, 
  IllustrativeRoom 
} from '../data/illustrativeHostel';
import { 
  Box, 
  Layers, 
  Filter, 
  Info, 
  CheckCircle2, 
  RotateCcw,
  Maximize2,
  Building2,
  Sparkles
} from 'lucide-react';

export const ExplorerPage: React.FC = () => {
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedRoom, setSelectedRoom] = useState<IllustrativeRoom | null>(null);
  const [cutawayMode, setCutawayMode] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Applied Blender 3D Model state from IndexedDB
  const [appliedModel, setAppliedModel] = useState<CustomBuildingModel | null>(null);
  const [viewMode, setViewMode] = useState<'prototype' | 'applied'>('prototype');

  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await getAppliedModel();
        setAppliedModel(model);
        if (model) {
          setViewMode('applied');
        } else {
          setViewMode('prototype');
        }
      } catch (err) {
        console.error('Failed to load applied model:', err);
      }
    };

    loadModel();

    const handleModelUpdate = () => {
      loadModel();
    };

    window.addEventListener('hostelflow:model-updated', handleModelUpdate);
    return () => {
      window.removeEventListener('hostelflow:model-updated', handleModelUpdate);
    };
  }, []);

  // Floor stats calculation
  const floorStats = useMemo(() => {
    return [1, 2, 3].map((f) => {
      const floorRooms = ILLUSTRATIVE_ROOMS.filter((r) => r.Floor === f);
      const availableBeds = floorRooms.reduce((sum, r) => sum + r.availableBeds, 0);
      return {
        floor: f,
        label: `Floor ${f}`,
        totalRooms: floorRooms.length,
        availableBeds,
      };
    });
  }, []);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return ILLUSTRATIVE_ROOMS.filter((room) => {
      if (selectedFloor !== 'all' && room.Floor !== selectedFloor) return false;
      if (statusFilter !== 'all' && room.status !== statusFilter) return false;
      if (typeFilter !== 'all' && room.Room_Type !== typeFilter) return false;
      return true;
    });
  }, [selectedFloor, statusFilter, typeFilter]);

  const totalVacantBeds = useMemo(() => {
    return ILLUSTRATIVE_ROOMS.reduce((sum, r) => sum + r.availableBeds, 0);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header & Prototype Disclaimer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
              <Box className="w-3 h-3" />
              <span>Interactive 3D Prototype</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">Aryabhatta Block 3D View</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            3D Hostel Building Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Rotate, zoom, and inspect individual rooms across all three floors. Click any room unit to inspect bed availability, spatial orientation, and facilities.
          </p>
        </div>

        {/* Vacancy Summary Pill */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Prototype Vacancies
            </div>
            <div className="text-lg font-bold font-display text-slate-900">
              {totalVacantBeds} <span className="text-xs font-normal text-slate-500">of 24 beds free</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Switcher when Blender Model is applied */}
      {appliedModel && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Custom 3D Model Applied: {appliedModel.hostelName || appliedModel.fileName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Uploaded via Warden 3D Model Management ({appliedModel.fileName})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('applied')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'applied'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Blender 3D Architecture</span>
            </button>
            <button
              onClick={() => setViewMode('prototype')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'prototype'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Floor Plan & Bed Map</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Explorer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: 3D Viewport (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="h-[520px] sm:h-[600px] w-full rounded-2xl overflow-hidden relative shadow-lg border border-slate-800 bg-slate-950">
            {viewMode === 'applied' && appliedModel ? (
              <>
                <BlenderModelViewer
                  modelBuffer={appliedModel.fileData}
                  scale={appliedModel.scale}
                  rotation={appliedModel.rotation}
                  position={appliedModel.position}
                  className="w-full h-full"
                />
                <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 text-white flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Blender 3D Architecture: {appliedModel.hostelName || appliedModel.fileName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Scale: {appliedModel.scale.toFixed(2)}x • Calibrated Model
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Building3D
                rooms={filteredRooms}
                selectedFloor={selectedFloor}
                selectedRoom={selectedRoom}
                onSelectRoom={(r) => setSelectedRoom(r)}
                cutawayMode={cutawayMode}
              />
            )}

            {/* Instruction tooltip in corner */}
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-white text-[11px] flex items-center gap-2 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              <span>Left Click + Drag: Orbit • Scroll: Zoom • Right Click: Pan</span>
            </div>
          </div>

          {/* Floor Navigation Bar */}
          <FloorSelector
            selectedFloor={selectedFloor}
            onSelectFloor={(f) => {
              setSelectedFloor(f);
              if (viewMode === 'applied') setViewMode('prototype');
            }}
            cutawayMode={cutawayMode}
            onToggleCutaway={() => {
              setCutawayMode(!cutawayMode);
              if (viewMode === 'applied') setViewMode('prototype');
            }}
            floorStats={floorStats}
          />
        </div>

        {/* Right Side: Filters & Room Directory (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Filter Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-institutional-600" />
                <span>Filter Rooms</span>
              </span>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSelectedFloor('all');
                }}
                className="text-[11px] text-institutional-600 hover:underline font-medium"
              >
                Reset All
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Availability
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-institutional-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="partially-occupied">Partially Free</option>
                  <option value="fully-occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Room Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-institutional-500"
                >
                  <option value="all">All Types</option>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Triple">Triple</option>
                </select>
              </div>
            </div>
          </div>

          {/* Room Directory List */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span>Matching Rooms ({filteredRooms.length})</span>
              <span className="text-[11px] text-slate-400 lowercase">click to inspect</span>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No rooms match the selected filters.
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isSelected = selectedRoom?.Room_ID === room.Room_ID;
                  return (
                    <button
                      key={room.Room_ID}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-institutional-600 bg-institutional-50/70 font-semibold'
                          : 'border-slate-200/80 bg-slate-50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {room.Room_Number}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Floor {room.Floor} • {room.Room_Type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[210px]">
                          {room.Facilities}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            room.status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : room.status === 'partially-occupied'
                              ? 'bg-amber-100 text-amber-800'
                              : room.status === 'fully-occupied'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {room.availableBeds} / {room.Capacity} free
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Room Detail Modal Dialog */}
      <RoomDetailModal
        room={selectedRoom}
        onClose={() => setSelectedRoom(null)}
      />
    </div>
  );
};
