import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Building3D 
} from './Building3D';
import { 
  FloorSelector 
} from './FloorSelector';
import { 
  RoomDetailModal 
} from './RoomDetailModal';
import { Campus3D } from './Campus3D';
import { HostelOverviewPanel } from './HostelOverviewPanel';
import { BlenderModelViewer } from './BlenderModelViewer';
import { 
  getAppliedModel, 
  CustomBuildingModel 
} from '../../services/modelStorage';
import { 
  generateDynamicLayout, 
  generateCampusLayout,
  DynamicallyPositionedRoom, 
  LayoutResult,
  CampusHostelData,
  CampusBlockSummary,
  CampusLayoutResult
} from '../../utils/explorerLayout';
import { apiClient } from '../../services/apiClient';
import { Hostel, HostelBlock } from '../../types';
import { 
  Box, 
  Layers, 
  Filter, 
  Building2,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Bed,
  DoorOpen,
  ArrowLeft,
  ChevronRight,
  Maximize2,
  Sliders,
  Eye
} from 'lucide-react';

interface CampusStats {
  total_hostels: number;
  total_blocks: number;
  total_rooms: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
}

interface ExplorerBlockResponse {
  hostel: {
    Hostel_ID: number;
    Hostel_Name: string;
    Hostel_Type: string;
    Location: string;
    Capacity: number;
  };
  block: {
    Block_ID: number;
    Block_Name: string;
    Gender: string;
    Capacity: number;
  };
  stats: {
    total_rooms: number;
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    occupancy_rate: number;
  };
  floors: number[];
  rooms: any[];
}

export interface HostelExplorerViewProps {
  isWardenView?: boolean;
  onOpenModelManagement?: () => void;
}

export const HostelExplorerView: React.FC<HostelExplorerViewProps> = ({
  isWardenView = false,
  onOpenModelManagement,
}) => {
  // Navigation & Hierarchy State
  const [viewLevel, setViewLevel] = useState<'campus' | 'building'>('campus');
  const [campusHostels, setCampusHostels] = useState<CampusHostelData[]>([]);
  const [campusStats, setCampusStats] = useState<CampusStats | null>(null);
  const [campusLayout, setCampusLayout] = useState<CampusLayoutResult | null>(null);
  const [selectedCampusHostel, setSelectedCampusHostel] = useState<CampusHostelData | null>(null);

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [blocks, setBlocks] = useState<HostelBlock[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);

  // 3D Canvas & Inspection State
  const [blockPayload, setBlockPayload] = useState<ExplorerBlockResponse | null>(null);
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedRoom, setSelectedRoom] = useState<DynamicallyPositionedRoom | null>(null);
  const [cutawayMode, setCutawayMode] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Network & Loading State
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [blockLoading, setBlockLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Applied Blender 3D Model state from IndexedDB
  const [appliedModel, setAppliedModel] = useState<CustomBuildingModel | null>(null);
  const [viewMode, setViewMode] = useState<'prototype' | 'applied'>('prototype');

  // Load custom Blender models for currently selected hostel
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await getAppliedModel(selectedHostelId ?? undefined);
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
  }, [selectedHostelId]);

  // 1. Initial Load: Fetch campus-wide metadata and basic hierarchy
  const fetchInventoryHierarchy = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError(null);

      const [campusRes, hostelsRes, blocksRes] = await Promise.all([
        apiClient.get('/explorer/campus'),
        apiClient.get('/hostels/'),
        apiClient.get('/hostel-blocks/'),
      ]);

      const cData = campusRes.data?.data;
      const rawCampusHostels: CampusHostelData[] = cData?.hostels ?? [];
      const stats: CampusStats = cData?.campus_stats ?? null;

      setCampusHostels(rawCampusHostels);
      setCampusStats(stats);

      // Compute procedural 3D Campus layout
      const layout = generateCampusLayout(rawCampusHostels);
      setCampusLayout(layout);

      const fetchedHostels: Hostel[] = hostelsRes.data?.data ?? [];
      const fetchedBlocks: HostelBlock[] = blocksRes.data?.data ?? [];

      setHostels(fetchedHostels);
      setBlocks(fetchedBlocks);

      if (rawCampusHostels.length > 0) {
        // Default selected campus hostel (Hostel A or first)
        const defaultHostel = rawCampusHostels.find((h) => h.Hostel_Name === 'Hostel A') || rawCampusHostels[0];
        setSelectedCampusHostel(defaultHostel);
        setSelectedHostelId(defaultHostel.Hostel_ID);

        // Find blocks belonging to this hostel
        const hostelBlocks = fetchedBlocks.filter((b) => b.Hostel_ID === defaultHostel.Hostel_ID);
        if (hostelBlocks.length > 0) {
          const defaultBlock = hostelBlocks.find((b) => b.Block_Name === 'Block A1') || hostelBlocks[0];
          setSelectedBlockId(defaultBlock.Block_ID);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch campus inventory hierarchy:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to connect to accommodation database.');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryHierarchy();
  }, [fetchInventoryHierarchy]);

  // Filter blocks for currently selected hostel
  const availableBlocks = useMemo(() => {
    if (!selectedHostelId) return [];
    return blocks.filter((b) => b.Hostel_ID === selectedHostelId);
  }, [blocks, selectedHostelId]);

  // Handle Hostel Selection in Campus 3D View
  const handleSelectHostelOnCampus = (hostel: CampusHostelData) => {
    setSelectedCampusHostel(hostel);
    setSelectedHostelId(hostel.Hostel_ID);
    setSelectedRoom(null);
    setSelectedFloor('all');

    const matchedBlocks = blocks.filter((b) => b.Hostel_ID === hostel.Hostel_ID);
    if (matchedBlocks.length > 0) {
      setSelectedBlockId(matchedBlocks[0].Block_ID);
    } else {
      setSelectedBlockId(null);
      setBlockPayload(null);
      setLayoutResult(null);
    }
  };

  // Transition from Campus Overview to Detailed Hostel/Block 3D View
  const handleEnterHostel = (hostel: CampusHostelData) => {
    handleSelectHostelOnCampus(hostel);
    setViewLevel('building');
  };

  // Direct selection of a specific block from the overview card
  const handleSelectBlockFromOverview = (hostel: CampusHostelData, block: CampusBlockSummary) => {
    setSelectedCampusHostel(hostel);
    setSelectedHostelId(hostel.Hostel_ID);
    setSelectedBlockId(block.Block_ID);
    setSelectedRoom(null);
    setSelectedFloor('all');
    setViewLevel('building');
  };

  // Handle Hostel Change in Building Mode
  const handleHostelChange = (hostelId: number) => {
    setSelectedHostelId(hostelId);
    const matchedHostel = campusHostels.find((h) => h.Hostel_ID === hostelId);
    if (matchedHostel) {
      setSelectedCampusHostel(matchedHostel);
    }
    setSelectedRoom(null);
    setSelectedFloor('all');
    const matchedBlocks = blocks.filter((b) => b.Hostel_ID === hostelId);
    if (matchedBlocks.length > 0) {
      setSelectedBlockId(matchedBlocks[0].Block_ID);
    } else {
      setSelectedBlockId(null);
      setBlockPayload(null);
      setLayoutResult(null);
    }
  };

  // Handle Block Change in Building Mode
  const handleBlockChange = (blockId: number) => {
    setSelectedBlockId(blockId);
    setSelectedRoom(null);
    setSelectedFloor('all');
  };

  // 2. Fetch Block 3D Hierarchy whenever selectedBlockId changes
  const fetchBlockExplorerData = useCallback(async (blockId: number) => {
    try {
      setBlockLoading(true);
      setError(null);

      const res = await apiClient.get(`/explorer/block/${blockId}`);
      const payload: ExplorerBlockResponse = res.data?.data;

      if (!payload) {
        throw new Error('Invalid block payload returned from server.');
      }

      setBlockPayload(payload);

      // Run pure algorithmic layout generator
      const layout = generateDynamicLayout(payload.rooms);
      setLayoutResult(layout);
    } catch (err: any) {
      console.error(`Failed to load 3D explorer data for Block ${blockId}:`, err);
      setError(err?.response?.data?.message || err.message || 'Failed to load block 3D inventory.');
      setBlockPayload(null);
      setLayoutResult(null);
    } finally {
      setBlockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBlockId) {
      fetchBlockExplorerData(selectedBlockId);
    }
  }, [selectedBlockId, fetchBlockExplorerData]);

  // Dynamic Floor Stats for FloorSelector
  const floorStats = useMemo(() => {
    if (!layoutResult || !layoutResult.bounds.floors) return [];
    return layoutResult.bounds.floors.map((f) => {
      const floorRooms = layoutResult.rooms.filter((r) => r.Floor === f);
      const availableBeds = floorRooms.reduce((sum, r) => sum + r.availableBeds, 0);
      return {
        floor: f,
        label: `Floor ${f}`,
        totalRooms: floorRooms.length,
        availableBeds,
      };
    });
  }, [layoutResult]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    if (!layoutResult) return [];
    return layoutResult.rooms.filter((room) => {
      if (selectedFloor !== 'all' && room.Floor !== selectedFloor) return false;
      if (statusFilter !== 'all' && room.status !== statusFilter) return false;
      if (typeFilter !== 'all' && room.Room_Type !== typeFilter) return false;
      return true;
    });
  }, [layoutResult, selectedFloor, statusFilter, typeFilter]);

  // Active hostel and block metadata for display
  const activeHostel = useMemo(() => {
    return hostels.find((h) => h.Hostel_ID === selectedHostelId) || blockPayload?.hostel || selectedCampusHostel;
  }, [hostels, selectedHostelId, blockPayload, selectedCampusHostel]);

  const activeBlock = useMemo(() => {
    return blocks.find((b) => b.Block_ID === selectedBlockId) || blockPayload?.block;
  }, [blocks, selectedBlockId, blockPayload]);

  const stats = blockPayload?.stats;

  return (
    <div className={`space-y-6 ${isWardenView ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
      {/* 1. Header, Hierarchical Breadcrumbs & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Live Database Explorer</span>
            </span>

            {/* Hierarchical Breadcrumb Navigation */}
            {viewLevel === 'building' ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                <button
                  onClick={() => setViewLevel('campus')}
                  className="hover:text-sky-600 dark:hover:text-sky-400 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Campus</span>
                </button>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeHostel?.Hostel_Name || 'Hostel'}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {activeBlock?.Block_Name || 'Block'} Interior
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
                {campusStats?.total_hostels ?? 4} Hostels • {campusStats?.total_blocks ?? 6} Blocks • {campusStats?.total_rooms ?? 98} Rooms • {campusStats?.total_beds ?? 228} Beds
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight">
            {viewLevel === 'campus'
              ? '3D Hostel Campus Visualization'
              : `${activeHostel?.Hostel_Name || 'Hostel'} — ${activeBlock?.Block_Name || 'Block'} 3D Model`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-2xl mt-1 leading-relaxed">
            {viewLevel === 'campus'
              ? 'Interactive procedural 3D model of the university campus quadrangle. Select any building to inspect its accommodation capacity, block divisions, and real-time physical bed vacancies.'
              : 'Rotate, zoom, and inspect physical accommodation modules in real time. Click any room unit to inspect bed availability, spatial orientation, and facilities.'}
          </p>
        </div>

        {/* View Mode Toggle Pill, Warden Action Button & Quick Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Level Switcher (Campus Overview vs Block Interior) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-[#334155] shadow-xs">
            <button
              onClick={() => setViewLevel('campus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewLevel === 'campus'
                  ? 'bg-institutional-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus 3D</span>
            </button>
            <button
              onClick={() => setViewLevel('building')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewLevel === 'building'
                  ? 'bg-institutional-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Block Interior</span>
            </button>
          </div>

          {/* Warden Shortcut: Open GLB Model Management */}
          {isWardenView && onOpenModelManagement && (
            <button
              onClick={onOpenModelManagement}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Manage custom Blender GLB 3D models"
            >
              <Box className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>GLB Models</span>
            </button>
          )}

          {/* Quick Refresh Button */}
          <button
            onClick={() => {
              fetchInventoryHierarchy();
              if (selectedBlockId) fetchBlockExplorerData(selectedBlockId);
            }}
            disabled={initialLoading || blockLoading}
            title="Refresh Live Database State"
            className="p-2 rounded-xl bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] transition-colors cursor-pointer border border-slate-200 dark:border-[#334155] shadow-xs"
          >
            <RotateCcw className={`w-4 h-4 ${initialLoading || blockLoading ? 'animate-spin text-teal-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW LEVEL 1: 3D CAMPUS QUADRANGLE OVERVIEW                             */}
      {/* ========================================================================= */}
      {viewLevel === 'campus' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 3D Campus Canvas (8 Cols on XL, 7 Cols on LG) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4 min-w-0">
              {initialLoading ? (
                <div className="w-full h-[540px] sm:h-[640px] rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RotateCcw className="w-8 h-8 animate-spin text-teal-400" />
                  <div className="text-sm font-semibold">Generating 3D Hostel Campus Layout...</div>
                  <p className="text-xs text-slate-500">Querying live database hostels, blocks, and inventory</p>
                </div>
              ) : campusLayout ? (
                <Campus3D
                  layout={campusLayout}
                  selectedHostel={selectedCampusHostel}
                  onSelectHostel={handleSelectHostelOnCampus}
                  onEnterHostel={handleEnterHostel}
                />
              ) : (
                <div className="w-full h-[540px] sm:h-[640px] rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Building2 className="w-10 h-10 text-slate-600" />
                  <div className="text-sm font-semibold">No Hostel Buildings Available</div>
                  <p className="text-xs text-slate-500">Could not retrieve campus buildings from the API.</p>
                </div>
              )}
            </div>

            {/* Right Column: Selected Hostel Overview Panel & Campus Statistics (4 Cols on XL, 5 Cols on LG) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4 min-w-0">
              <HostelOverviewPanel
                hostel={selectedCampusHostel}
                onEnterHostel={handleEnterHostel}
                onSelectBlock={handleSelectBlockFromOverview}
              />

              {campusStats && (
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider border-b border-slate-100 dark:border-[#334155] pb-2">
                    <span>Campus Total Inventory</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">100% Reconciled</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-100 dark:border-[#334155]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Hostels</div>
                      <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                        {campusStats.total_hostels} Buildings
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-100 dark:border-[#334155]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Blocks</div>
                      <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                        {campusStats.total_blocks} Blocks
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-100 dark:border-[#334155]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Rooms</div>
                      <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                        {campusStats.total_rooms} Rooms
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-100 dark:border-[#334155]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Physical Beds</div>
                      <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                        {campusStats.total_beds} Beds
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#334155] flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-[#94A3B8]">Available Free Beds:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {campusStats.available_beds} of {campusStats.total_beds}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW LEVEL 2: DETAILED 3D BLOCK INTERIOR & ROOM INSPECTION               */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Dynamic Hostel & Block Selection Control Bar */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Hostel Selector */}
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                  <span>Select Hostel Campus</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {hostels.map((h) => {
                    const isSelected = h.Hostel_ID === selectedHostelId;
                    const isGirls = (h.Hostel_Type || '').toLowerCase() === 'girls';
                    return (
                      <button
                        key={h.Hostel_ID}
                        onClick={() => handleHostelChange(h.Hostel_ID)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-institutional-900 dark:bg-sky-600 text-white border-institutional-900 dark:border-sky-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#182235]'
                        }`}
                      >
                        <span className="font-bold">{h.Hostel_Name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isGirls
                              ? 'bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {h.Hostel_Type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Block Selector */}
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                  <span>Select Building Block</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableBlocks.length === 0 ? (
                    <div className="text-xs text-slate-400 dark:text-[#64748B] py-2">
                      No blocks available for this hostel.
                    </div>
                  ) : (
                    availableBlocks.map((b) => {
                      const isSelected = b.Block_ID === selectedBlockId;
                      return (
                        <button
                          key={b.Block_ID}
                          onClick={() => handleBlockChange(b.Block_ID)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-institutional-700 dark:bg-sky-500 text-white border-institutional-700 dark:border-sky-500 shadow-xs'
                              : 'bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-[#F1F5F9] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#182235]'
                          }`}
                        >
                          <span className="font-bold">{b.Block_Name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-[#94A3B8]'
                            }`}
                          >
                            Cap: {b.Capacity}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Block Metrics Strip */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-[#334155] text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#94A3B8]">
                  <DoorOpen className="w-4 h-4 text-slate-400" />
                  <span><strong>{stats.total_rooms}</strong> Rooms</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#94A3B8]">
                  <Bed className="w-4 h-4 text-slate-400" />
                  <span><strong>{stats.total_beds}</strong> Physical Beds</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span><strong>{stats.available_beds}</strong> Available</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Users className="w-4 h-4" />
                  <span><strong>{stats.occupied_beds}</strong> Occupied</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#94A3B8]">
                  <span className="font-semibold">Occupancy:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{stats.occupancy_rate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => selectedBlockId && fetchBlockExplorerData(selectedBlockId)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* View Mode Switcher when Custom Blender Model is uploaded for this hostel */}
          {appliedModel && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#334155] shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/60">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-[#F1F5F9]">
                      Custom 3D CAD Model: {appliedModel.hostelName || appliedModel.fileName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                    Custom geometry loaded from IndexedDB ({appliedModel.fileName})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#1E293B] rounded-lg border border-slate-200 dark:border-[#334155]">
                <button
                  onClick={() => setViewMode('applied')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'applied'
                      ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Blender 3D Architecture</span>
                </button>
                <button
                  onClick={() => setViewMode('prototype')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'prototype'
                      ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Procedural 3D Inventory</span>
                </button>
              </div>
            </div>
          )}

          {/* Main 3D Canvas & Explorer Control Split */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: 3D Canvas & Interactive Building (3 Cols) */}
            <div className="lg:col-span-3 space-y-4">
              {blockLoading ? (
                <div className="w-full h-[520px] sm:h-[620px] rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RotateCcw className="w-8 h-8 animate-spin text-teal-400" />
                  <div className="text-sm font-semibold">Generating Dynamic 3D Spatial Layout...</div>
                  <p className="text-xs text-slate-500">Querying live database inventory & physical beds</p>
                </div>
              ) : viewMode === 'applied' && appliedModel ? (
                <div className="w-full h-[520px] sm:h-[620px] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 shadow-2xl relative">
                  <BlenderModelViewer
                    modelBuffer={appliedModel.fileData}
                    scale={appliedModel.scale ?? 1}
                    rotation={appliedModel.rotation ?? [0, 0, 0]}
                    position={appliedModel.position ?? [0, 0, 0]}
                  />
                </div>
              ) : layoutResult && layoutResult.rooms.length > 0 ? (
                <Building3D
                  rooms={layoutResult.rooms}
                  bounds={layoutResult.bounds}
                  selectedFloor={selectedFloor}
                  selectedRoom={selectedRoom}
                  onSelectRoom={setSelectedRoom}
                  cutawayMode={cutawayMode}
                  onToggleCutaway={() => setCutawayMode(!cutawayMode)}
                />
              ) : (
                <div className="w-full h-[520px] sm:h-[620px] rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Building2 className="w-10 h-10 text-slate-600" />
                  <div className="text-sm font-semibold">No Rooms Configured for this Block</div>
                  <p className="text-xs text-slate-500">Please select another hostel or block to inspect inventory.</p>
                </div>
              )}

              {/* Dynamic Responsive Floor Navigation Bar */}
              {floorStats.length > 0 && (
                <FloorSelector
                  selectedFloor={selectedFloor}
                  onSelectFloor={setSelectedFloor}
                  cutawayMode={cutawayMode}
                  onToggleCutaway={() => setCutawayMode(!cutawayMode)}
                  floorStats={floorStats}
                />
              )}
            </div>

            {/* Right Column: Filter Controls & Directory List (1 Col) */}
            <div className="space-y-4">
              {/* Filter Card */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider border-b border-slate-100 dark:border-[#334155] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                    <span>Filter Rooms</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFloor('all');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-[#F1F5F9] cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-slate-500 dark:text-[#94A3B8] font-medium mb-1">
                      Bed Availability:
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-800 dark:text-[#F1F5F9]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="available">Vacant (All Beds Free)</option>
                      <option value="partially-occupied">Partially Occupied</option>
                      <option value="fully-occupied">Fully Occupied</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-[#94A3B8] font-medium mb-1">
                      Room Configuration:
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-800 dark:text-[#F1F5F9]"
                    >
                      <option value="all">All Room Types</option>
                      <option value="Single">Single Rooms</option>
                      <option value="Double">Double Rooms</option>
                      <option value="Triple">Triple Rooms</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Room Directory List */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider border-b border-slate-100 dark:border-[#334155] pb-2">
                  <span>Room Directory</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {filteredRooms.length} of {layoutResult?.rooms.length ?? 0}
                  </span>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                  {filteredRooms.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No rooms match the selected filters.
                    </div>
                  ) : (
                    filteredRooms.map((r) => {
                      const isSelected = selectedRoom?.Room_ID === r.Room_ID;
                      return (
                        <div
                          key={r.Room_ID}
                          onClick={() => setSelectedRoom(r)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 shadow-xs'
                              : 'border-slate-200/80 dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/40 dark:bg-[#182235]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-[#F1F5F9]">
                              Room {r.Room_Number}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                r.status === 'available'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : r.status === 'partially-occupied'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {r.availableBeds} of {r.Capacity} free
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-1 flex items-center justify-between">
                            <span>Storey {r.Floor} • {r.Room_Type}</span>
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Click to Inspect</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Room Detail Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
};
