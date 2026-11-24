import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Box, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Rotate3d, 
  Move, 
  Maximize, 
  Building2, 
  Sliders, 
  FileCheck,
  Info,
  PlusCircle,
  Replace,
  ArrowRight,
  ShieldAlert,
  X
} from 'lucide-react';
import { BlenderModelViewer } from '../3d/BlenderModelViewer';
import { 
  CustomBuildingModel, 
  saveCustomModel, 
  getCustomModel, 
  getAllCustomModels,
  getModelForHostel,
  removeCustomModel, 
  validateGlbBuffer,
  getHostelModelId,
  DEFAULT_MODEL_ID 
} from '../../services/modelStorage';
import { Hostel } from '../../types';

interface ModelManagementSectionProps {
  hostels: Hostel[];
  onSwitchToExplorer?: () => void;
}

type ModelOperation = 'overview' | 'add' | 'replace';

export const ModelManagementSection: React.FC<ModelManagementSectionProps> = ({ 
  hostels,
  onSwitchToExplorer 
}) => {
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Stored models map: keyed by hostelId
  const [storedModels, setStoredModels] = useState<Record<number, CustomBuildingModel>>({});
  const [activeHostelId, setActiveHostelId] = useState<number>(hostels[0]?.Hostel_ID || 1);

  // Active operation mode
  const [currentOperation, setCurrentOperation] = useState<ModelOperation>('overview');

  // Draft / Staging model state for ADD / REPLACE
  const [draftBuffer, setDraftBuffer] = useState<ArrayBuffer | null>(null);
  const [draftFileName, setDraftFileName] = useState<string>('');
  const [draftFileSize, setDraftFileSize] = useState<number>(0);
  const [selectedTargetHostelId, setSelectedTargetHostelId] = useState<number>(hostels[0]?.Hostel_ID || 1);

  // Calibration transforms
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Replace confirmation modal state
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);
  const [preserveCalibration, setPreserveCalibration] = useState<boolean>(true);

  // UI feedback states
  const [isReading, setIsReading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load all custom models from IndexedDB on mount and on storage events
  const refreshStoredModels = async () => {
    try {
      const all = await getAllCustomModels();
      const map: Record<number, CustomBuildingModel> = {};
      all.forEach((m) => {
        if (m.hostelId) {
          map[m.hostelId] = m;
        }
      });
      // Also check legacy model
      const legacy = await getCustomModel(DEFAULT_MODEL_ID);
      if (legacy && legacy.hostelId && !map[legacy.hostelId]) {
        map[legacy.hostelId] = legacy;
      }
      setStoredModels(map);

      // If active hostel has a model, set it
      const currentActive = map[activeHostelId];
      if (currentActive && currentOperation === 'overview') {
        setScale(currentActive.scale);
        setRotation(currentActive.rotation);
        setPosition(currentActive.position);
      }
    } catch (err) {
      console.error('Failed to load custom 3D models:', err);
    }
  };

  useEffect(() => {
    refreshStoredModels();

    const handleModelUpdate = () => {
      refreshStoredModels();
    };

    window.addEventListener('hostelflow:model-updated', handleModelUpdate);
    return () => {
      window.removeEventListener('hostelflow:model-updated', handleModelUpdate);
    };
  }, [activeHostelId]);

  // Currently inspected model based on activeHostelId
  const currentAssignedModel = storedModels[activeHostelId] || null;

  // =========================================================================
  // FILE READING & BINARY VALIDATION
  // =========================================================================
  const handleProcessFile = (file: File, isReplacement: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const name = file.name;

    setIsReading(true);
    setProgressPercent(20);

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgressPercent(percent);
      }
    };

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        setIsReading(false);
        setErrorMessage('Failed to read file contents into memory.');
        return;
      }

      // Perform strict binary format validation
      const validation = validateGlbBuffer(buffer, name);
      setIsReading(false);
      setProgressPercent(100);

      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid 3D model file format.');
        setDraftBuffer(null);
        setDraftFileName('');
        setDraftFileSize(0);
        return;
      }

      // File is verified valid glTF 2.0
      setDraftBuffer(buffer);
      setDraftFileName(name);
      setDraftFileSize(file.size);

      if (isReplacement) {
        const existing = storedModels[selectedTargetHostelId];
        if (existing && preserveCalibration) {
          setScale(existing.scale);
          setRotation(existing.rotation);
          setPosition(existing.position);
        } else {
          setScale(1);
          setRotation([0, 0, 0]);
          setPosition([0, 0, 0]);
        }
        setSuccessMessage(`Valid 3D model "${name}" loaded. Review spatial calibrations and confirm replacement below.`);
      } else {
        setScale(1);
        setRotation([0, 0, 0]);
        setPosition([0, 0, 0]);
        setSuccessMessage(`Valid 3D model "${name}" loaded into preview. Calibrate scale and orientation below, then click "Add Model".`);
      }
    };

    reader.onerror = () => {
      setIsReading(false);
      setErrorMessage('A file reading error occurred during upload. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  };

  // =========================================================================
  // OPERATION 1: ADD MODEL ACTION
  // =========================================================================
  const handleStartAdd = (targetHostelId?: number) => {
    const target = targetHostelId ?? activeHostelId;
    setSelectedTargetHostelId(target);
    setCurrentOperation('add');
    setDraftBuffer(null);
    setDraftFileName('');
    setDraftFileSize(0);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleExecuteAdd = async () => {
    if (!draftBuffer) {
      setErrorMessage('Please select a validated .glb or .gltf 3D model file first.');
      return;
    }

    // Conflict Check: Does selected hostel already have a model?
    const existing = storedModels[selectedTargetHostelId];
    if (existing) {
      setErrorMessage(
        `Hostel "${existing.hostelName}" already has an assigned 3D model ("${existing.fileName}"). Each hostel supports one active architectural model. Please use the "Replace Model" action to swap this model.`
      );
      return;
    }

    try {
      const targetHostel = hostels.find((h) => h.Hostel_ID === selectedTargetHostelId);
      const hostelName = targetHostel?.Hostel_Name || `Hostel ${selectedTargetHostelId}`;
      const modelId = getHostelModelId(selectedTargetHostelId);

      const newModel: CustomBuildingModel = {
        id: modelId,
        fileName: draftFileName,
        fileSize: draftFileSize,
        fileData: draftBuffer,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        hostelId: selectedTargetHostelId,
        hostelName,
        scale,
        rotation,
        position,
        isApplied: true,
      };

      await saveCustomModel(newModel);
      await refreshStoredModels();

      setActiveHostelId(selectedTargetHostelId);
      setCurrentOperation('overview');
      setSuccessMessage(`3D model "${draftFileName}" successfully added and assigned to ${hostelName}!`);
      setErrorMessage(null);
      setDraftBuffer(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save 3D model.');
    }
  };

  // =========================================================================
  // OPERATION 2: REPLACE MODEL ACTION
  // =========================================================================
  const handleStartReplace = (targetHostelId?: number) => {
    const target = targetHostelId ?? activeHostelId;
    setSelectedTargetHostelId(target);
    setCurrentOperation('replace');
    setDraftBuffer(null);
    setDraftFileName('');
    setDraftFileSize(0);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowReplaceModal(false);
  };

  const handleConfirmReplace = async () => {
    if (!draftBuffer) {
      setErrorMessage('Please select a validated replacement 3D model file first.');
      setShowReplaceModal(false);
      return;
    }

    const existing = storedModels[selectedTargetHostelId];
    if (!existing) {
      setErrorMessage('No existing model found to replace for this hostel. Use Add Model instead.');
      setShowReplaceModal(false);
      return;
    }

    try {
      const targetHostel = hostels.find((h) => h.Hostel_ID === selectedTargetHostelId);
      const hostelName = targetHostel?.Hostel_Name || existing.hostelName;
      const modelId = getHostelModelId(selectedTargetHostelId);

      const updatedModel: CustomBuildingModel = {
        id: modelId,
        fileName: draftFileName,
        fileSize: draftFileSize,
        fileData: draftBuffer,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        hostelId: selectedTargetHostelId,
        hostelName,
        scale: preserveCalibration ? existing.scale : scale,
        rotation: preserveCalibration ? existing.rotation : rotation,
        position: preserveCalibration ? existing.position : position,
        isApplied: true,
      };

      // Safely replace in IndexedDB
      await saveCustomModel(updatedModel);
      await refreshStoredModels();

      setShowReplaceModal(false);
      setActiveHostelId(selectedTargetHostelId);
      setCurrentOperation('overview');
      setSuccessMessage(
        `3D Model for ${hostelName} successfully replaced with "${draftFileName}". The previous model has been archived safely.`
      );
      setErrorMessage(null);
      setDraftBuffer(null);
    } catch (err: any) {
      setShowReplaceModal(false);
      setErrorMessage(err.message || 'Failed to replace 3D model. The previous model remains intact.');
    }
  };

  // Safe Removal
  const handleRemoveModel = async (hostelId: number) => {
    const model = storedModels[hostelId];
    if (!model) return;

    if (!window.confirm(`Are you sure you want to remove the custom 3D model for ${model.hostelName}? The system will revert to the default procedural building model.`)) {
      return;
    }

    try {
      await removeCustomModel(model.id);
      await refreshStoredModels();
      setSuccessMessage(`Custom 3D model for ${model.hostelName} removed. Default procedural view restored.`);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove model.');
    }
  };

  // Quick Calibration Save for Overview mode
  const handleSaveCalibrationOnly = async () => {
    const existing = storedModels[activeHostelId];
    if (!existing) return;

    try {
      const updated = {
        ...existing,
        scale,
        rotation,
        position,
      };
      await saveCustomModel(updated);
      await refreshStoredModels();
      setSuccessMessage(`Calibration offsets updated for ${existing.hostelName}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update calibration.');
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* 1. Header Bar with Mode Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#334155]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Blender & glTF 2.0 Pipeline
            </span>
            <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">
              Architectural 3D Model Management
            </span>
          </div>
          <h3 className="text-xl font-bold font-display text-slate-900 dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>GLB Model Management</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Upload, validate, calibrate, and manage custom 3D architectural models (.glb) for individual campus hostels.
          </p>
        </div>

        {/* Action Buttons: Add Model, Replace Model, or Switch to Explorer */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleStartAdd()}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              currentOperation === 'add'
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>ADD MODEL</span>
          </button>

          <button
            onClick={() => handleStartReplace()}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              currentOperation === 'replace'
                ? 'bg-amber-600 text-white shadow-amber-600/30'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/80'
            }`}
          >
            <Replace className="w-3.5 h-3.5" />
            <span>REPLACE MODEL</span>
          </button>

          {currentOperation !== 'overview' && (
            <button
              onClick={() => {
                setCurrentOperation('overview');
                setDraftBuffer(null);
                setErrorMessage(null);
              }}
              className="px-3 py-2 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel Operation
            </button>
          )}

          {onSwitchToExplorer && (
            <button
              onClick={onSwitchToExplorer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <span>View in 3D Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Feedback Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Campus Hostels 3D Model Status Cards */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
          Campus Hostels Model Assignment Status
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {hostels.map((h) => {
            const model = storedModels[h.Hostel_ID];
            const isSelected = h.Hostel_ID === activeHostelId;
            return (
              <div
                key={h.Hostel_ID}
                onClick={() => {
                  setActiveHostelId(h.Hostel_ID);
                  if (model) {
                    setScale(model.scale);
                    setRotation(model.rotation);
                    setPosition(model.position);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs'
                    : 'border-slate-200 dark:border-[#334155] bg-slate-50/50 dark:bg-[#182235]/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-[#F1F5F9]">{h.Hostel_Name}</span>
                  {model ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Custom GLB</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8]">
                      Default Procedural
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-[#94A3B8] mb-2 truncate">
                  {model ? (
                    <span className="font-mono">{model.fileName} ({(model.fileSize / (1024 * 1024)).toFixed(1)} MB)</span>
                  ) : (
                    <span>Procedural algorithm</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-[#334155]/60 text-[11px]">
                  {model ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReplace(h.Hostel_ID);
                        }}
                        className="text-amber-600 dark:text-amber-400 hover:underline font-bold"
                      >
                        Replace
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveModel(h.Hostel_ID);
                        }}
                        className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartAdd(h.Hostel_ID);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      <span>Add Model</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. OPERATION PANEL: ADD MODEL                                            */}
      {/* ========================================================================= */}
      {currentOperation === 'add' && (
        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                  ADD MODEL — Upload New Architectural Model
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Select the target hostel and upload a validated GLB/glTF 2.0 file.
                </p>
              </div>
            </div>

            <button
              onClick={() => setCurrentOperation('overview')}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Target Hostel Picker */}
          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-700 dark:text-[#F1F5F9] mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Target Hostel Building</span>
            </label>
            <select
              value={selectedTargetHostelId}
              onChange={(e) => setSelectedTargetHostelId(parseInt(e.target.value) || 1)}
              className="w-full p-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl text-xs text-slate-900 dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {hostels.map((h) => {
                const hasModel = !!storedModels[h.Hostel_ID];
                return (
                  <option key={h.Hostel_ID} value={h.Hostel_ID}>
                    {h.Hostel_Name} ({h.Hostel_Type}) {hasModel ? '— [Model Already Assigned]' : '— [Default Available]'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Conflict Warning if Selected Hostel Already Has a Model */}
          {storedModels[selectedTargetHostelId] ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Conflict Detected: Model Already Assigned</span>
              </div>
              <p>
                Hostel <strong>{hostels.find((h) => h.Hostel_ID === selectedTargetHostelId)?.Hostel_Name}</strong> already has an active model (<em>{storedModels[selectedTargetHostelId].fileName}</em>). To protect existing assignments, the <strong>Add Model</strong> operation will not silently overwrite it.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleStartReplace(selectedTargetHostelId)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Replace className="w-3.5 h-3.5" />
                  <span>Switch to Replace Model</span>
                </button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone for ADD */
            <div className="bg-white dark:bg-[#182235] border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-500 rounded-2xl p-6 text-center space-y-3">
              <input
                ref={addFileInputRef}
                type="file"
                accept=".glb,.gltf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFile(file, false);
                }}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-[#F1F5F9]">
                  Select glTF 2.0 Architectural File (.glb)
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Binary .glb container verified with magic bytes header validation (max 150 MB).
                </p>
              </div>

              <button
                type="button"
                onClick={() => addFileInputRef.current?.click()}
                disabled={isReading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Choose GLB File</span>
              </button>

              {draftFileName && (
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{draftFileName} ({(draftFileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview & Action Buttons for Valid Draft */}
          {draftBuffer && !storedModels[selectedTargetHostelId] && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleExecuteAdd}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Save & Assign Model to Hostel</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. OPERATION PANEL: REPLACE MODEL                                        */}
      {/* ========================================================================= */}
      {currentOperation === 'replace' && (
        <div className="bg-amber-50/40 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800/80 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200 dark:border-amber-900/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-600 text-white">
                <Replace className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-[#F1F5F9]">
                  REPLACE MODEL — Update Existing Architectural Model
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Select the existing model to swap and choose the replacement .glb file.
                </p>
              </div>
            </div>

            <button
              onClick={() => setCurrentOperation('overview')}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Model to Replace Identification Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#182235] border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">
                Model Targeted for Replacement:
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {hostels.find((h) => h.Hostel_ID === selectedTargetHostelId)?.Hostel_Name}
              </div>
              <div className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-mono">
                {storedModels[selectedTargetHostelId] ? (
                  <>Current File: {storedModels[selectedTargetHostelId].fileName} • {(storedModels[selectedTargetHostelId].fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded: {storedModels[selectedTargetHostelId].uploadedAt}</>
                ) : (
                  <span className="text-rose-500 font-semibold">No custom model currently assigned to replace.</span>
                )}
              </div>
            </div>

            <div className="w-full sm:w-56">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase mb-1">
                Select Hostel to Replace
              </label>
              <select
                value={selectedTargetHostelId}
                onChange={(e) => setSelectedTargetHostelId(parseInt(e.target.value) || 1)}
                className="w-full p-2 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-lg text-xs font-semibold text-slate-800 dark:text-[#F1F5F9]"
              >
                {hostels.map((h) => (
                  <option key={h.Hostel_ID} value={h.Hostel_ID}>
                    {h.Hostel_Name} {storedModels[h.Hostel_ID] ? '✓' : '(No Model)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Replacement File */}
          <div className="bg-white dark:bg-[#182235] border-2 border-dashed border-amber-300 dark:border-amber-700/80 hover:border-amber-500 rounded-2xl p-6 text-center space-y-3">
            <input
              ref={replaceFileInputRef}
              type="file"
              accept=".glb,.gltf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleProcessFile(file, true);
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Replace className="w-6 h-6" />
            </div>

            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-[#F1F5F9]">
                Select New Replacement Model (.glb)
              </div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                The current model remains 100% active until you confirm the replacement.
              </p>
            </div>

            <button
              type="button"
              onClick={() => replaceFileInputRef.current?.click()}
              disabled={isReading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Choose Replacement File</span>
            </button>

            {draftFileName && (
              <div className="pt-2 flex flex-col items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Replacement Candidate: {draftFileName} ({(draftFileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                </span>

                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-[#F1F5F9] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveCalibration}
                    onChange={(e) => setPreserveCalibration(e.target.checked)}
                    className="rounded accent-amber-600"
                  />
                  <span>Preserve existing spatial calibration (scale, rotation & position offsets)</span>
                </label>
              </div>
            )}
          </div>

          {draftBuffer && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReplaceModal(true)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Replace className="w-4 h-4" />
                <span>Proceed to Confirmation Step...</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CONFIRMATION MODAL FOR REPLACEMENT                                    */}
      {/* ========================================================================= */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#334155] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-6 h-6" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm 3D Model Replacement
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              Are you sure you want to replace the active 3D model for{' '}
              <strong>{hostels.find((h) => h.Hostel_ID === selectedTargetHostelId)?.Hostel_Name}</strong>?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#334155] text-xs space-y-1.5 font-mono">
              <div className="text-rose-600 dark:text-rose-400">
                - Outgoing: {storedModels[selectedTargetHostelId]?.fileName || 'Existing Model'}
              </div>
              <div className="text-emerald-600 dark:text-emerald-400">
                + Incoming: {draftFileName} ({(draftFileSize / (1024 * 1024)).toFixed(2)} MB)
              </div>
              <div className="text-slate-500 pt-1 border-t border-slate-200 dark:border-[#334155]">
                Calibration: {preserveCalibration ? 'Preserving previous scale & offsets' : 'Resetting to defaults'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReplaceModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-700 dark:text-[#F1F5F9] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 cursor-pointer"
              >
                Confirm & Replace Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CALIBRATION CONTROLS & REAL-TIME 3D PREVIEW                           */}
      {/* ========================================================================= */}
      {(draftBuffer || currentAssignedModel) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2 border-t border-slate-100 dark:border-[#334155]">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50 dark:bg-[#182235]/60 border border-slate-200 dark:border-[#334155] p-5 rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#334155]">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#F1F5F9] flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Spatial Calibration Controls</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setRotation([0, 0, 0]);
                  setPosition([0, 0, 0]);
                }}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold"
              >
                Reset All
              </button>
            </div>

            {/* Scale Control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-[#F1F5F9] flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-slate-500 dark:text-[#94A3B8]" />
                  <span>Model Scale</span>
                </span>
                <span className="font-mono text-slate-600 dark:text-[#94A3B8] font-bold">{scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Rotation Controls */}
            <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-[#334155]">
              <div className="text-xs font-bold text-slate-700 dark:text-[#F1F5F9] flex items-center gap-1.5">
                <Rotate3d className="w-3.5 h-3.5 text-slate-500 dark:text-[#94A3B8]" />
                <span>Rotation (Degrees)</span>
              </div>

              {/* X Rotation */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#94A3B8] font-semibold w-14">Pitch (X)</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[0]}
                  onChange={(e) => setRotation([parseInt(e.target.value), rotation[1], rotation[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 dark:text-[#94A3B8] w-10 text-right">{rotation[0]}°</span>
              </div>

              {/* Y Rotation */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#94A3B8] font-semibold w-14">Yaw (Y)</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[1]}
                  onChange={(e) => setRotation([rotation[0], parseInt(e.target.value), rotation[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 dark:text-[#94A3B8] w-10 text-right">{rotation[1]}°</span>
              </div>

              {/* Z Rotation */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#94A3B8] font-semibold w-14">Roll (Z)</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[2]}
                  onChange={(e) => setRotation([rotation[0], rotation[1], parseInt(e.target.value)])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 dark:text-[#94A3B8] w-10 text-right">{rotation[2]}°</span>
              </div>
            </div>

            {/* Position Controls */}
            <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-[#334155]">
              <div className="text-xs font-bold text-slate-700 dark:text-[#F1F5F9] flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-slate-500 dark:text-[#94A3B8]" />
                <span>Spatial Position Offsets</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#94A3B8] font-semibold w-14">Left/Right</span>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={position[0]}
                  onChange={(e) => setPosition([parseFloat(e.target.value), position[1], position[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 dark:text-[#94A3B8] w-12 text-right">{position[0]}m</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#94A3B8] font-semibold w-14">Elevation</span>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.25"
                  value={position[1]}
                  onChange={(e) => setPosition([position[0], parseFloat(e.target.value), position[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 dark:text-[#94A3B8] w-12 text-right">{position[1]}m</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-[#94A3B8] font-semibold w-14">Depth</span>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={position[2]}
                  onChange={(e) => setPosition([position[0], position[1], parseFloat(e.target.value)])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 dark:text-[#94A3B8] w-12 text-right">{position[2]}m</span>
              </div>
            </div>

            {currentOperation === 'overview' && currentAssignedModel && (
              <div className="pt-2 border-t border-slate-200 dark:border-[#334155]">
                <button
                  type="button"
                  onClick={handleSaveCalibrationOnly}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Calibration Offsets
                </button>
              </div>
            )}
          </div>

          {/* 3D Preview Column (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-[#F1F5F9] pb-1">
              <span>Interactive Model Preview</span>
              <span className="text-[11px] text-slate-400 dark:text-[#94A3B8] font-normal">
                {draftBuffer ? `Previewing draft: ${draftFileName}` : `Active on ${currentAssignedModel?.hostelName}`}
              </span>
            </div>
            <div className="h-[460px] w-full rounded-2xl overflow-hidden shadow-md border border-slate-800 dark:border-[#334155] bg-gradient-to-b from-[#070b14] to-[#0f172a]">
              <BlenderModelViewer
                modelBuffer={draftBuffer || currentAssignedModel?.fileData || null}
                scale={scale}
                rotation={rotation}
                position={position}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
