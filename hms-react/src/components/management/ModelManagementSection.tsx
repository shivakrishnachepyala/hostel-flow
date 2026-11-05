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
  Info
} from 'lucide-react';
import { BlenderModelViewer } from '../3d/BlenderModelViewer';
import { 
  CustomBuildingModel, 
  saveCustomModel, 
  getCustomModel, 
  removeCustomModel, 
  DEFAULT_MODEL_ID 
} from '../../services/modelStorage';
import { Hostel } from '../../types';

interface ModelManagementSectionProps {
  hostels: Hostel[];
}

export const ModelManagementSection: React.FC<ModelManagementSectionProps> = ({ hostels }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stored / Applied model state
  const [persistedModel, setPersistedModel] = useState<CustomBuildingModel | null>(null);

  // Active working / draft model state
  const [modelBuffer, setModelBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [selectedHostelId, setSelectedHostelId] = useState<number>(hostels[0]?.Hostel_ID || 1);

  // Transform controls
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Loading, progress & notification states
  const [isReading, setIsReading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing applied model from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    getCustomModel().then((stored) => {
      if (mounted && stored) {
        setPersistedModel(stored);
        setModelBuffer(stored.fileData);
        setFileName(stored.fileName);
        setFileSize(stored.fileSize);
        setSelectedHostelId(stored.hostelId);
        setScale(stored.scale);
        setRotation(stored.rotation);
        setPosition(stored.position);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const name = file.name;
    const lowerName = name.toLowerCase();

    // Check for raw Blender .blend files
    if (lowerName.endsWith('.blend')) {
      setErrorMessage(
        'Direct .blend files are not natively rendered by WebGL. Please export your Blender model as glTF 2.0 (.glb or .gltf) using Blender\'s "File > Export > glTF 2.0" menu, then upload the .glb file.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check for valid extensions (.glb or .gltf)
    if (!lowerName.endsWith('.glb') && !lowerName.endsWith('.gltf')) {
      setErrorMessage('Invalid file type. Please upload a .glb or .gltf file exported from Blender.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
      if (buffer) {
        setModelBuffer(buffer);
        setFileName(name);
        setFileSize(file.size);
        setProgressPercent(100);
        setIsReading(false);
        setSuccessMessage(`"${name}" loaded into preview. Adjust scale, rotation, and position below, then click "Apply Model".`);
      }
    };

    reader.onerror = () => {
      setIsReading(false);
      setErrorMessage('Failed to read the 3D model file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleApplyModel = async () => {
    if (!modelBuffer) {
      setErrorMessage('No 3D model selected to apply.');
      return;
    }

    try {
      const targetHostel = hostels.find((h) => h.Hostel_ID === selectedHostelId);
      const hostelName = targetHostel?.Hostel_Name || 'Selected Hostel Building';

      const modelData: CustomBuildingModel = {
        id: DEFAULT_MODEL_ID,
        fileName,
        fileSize,
        fileData: modelBuffer,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        hostelId: selectedHostelId,
        hostelName,
        scale,
        rotation,
        position,
        isApplied: true,
      };

      await saveCustomModel(modelData);
      setPersistedModel(modelData);
      setSuccessMessage(`3D model "${fileName}" successfully applied to ${hostelName}! You can now inspect it in the 3D Explorer.`);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply custom 3D model.');
    }
  };

  const handleRemoveModel = async () => {
    if (!window.confirm('Are you sure you want to remove the custom 3D model? The system will revert to the default illustrative 3D prototype.')) {
      return;
    }

    try {
      await removeCustomModel();
      setPersistedModel(null);
      setModelBuffer(null);
      setFileName('');
      setFileSize(0);
      setScale(1);
      setRotation([0, 0, 0]);
      setPosition([0, 0, 0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccessMessage('Custom 3D model removed. Restored the default illustrative 3D prototype.');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove model.');
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Blender Pipeline
            </span>
            <span className="text-xs text-slate-400 font-medium">glTF 2.0 / GLB Support</span>
          </div>
          <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <span>3D Model Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Import, preview, calibrate, and apply custom Blender architectural 3D building models to campus hostels.
          </p>
        </div>

        {/* Current Active Status Pill */}
        <div className="flex items-center gap-2">
          {persistedModel?.isApplied ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Model Active on {persistedModel.hostelName}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              <Info className="w-3.5 h-3.5" />
              <span>Default Prototype Active</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Feedback Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* 3. Upload & Dropzone Area */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 transition-colors text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf,.blend"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center shadow-xs">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <div className="text-sm font-bold text-slate-800">
              {modelBuffer ? 'Upload or Replace 3D Model' : 'Upload Blender 3D Model (.glb / .gltf)'}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports binary glTF (<span className="font-mono text-slate-700 font-bold">.glb</span>) or text glTF (<span className="font-mono text-slate-700 font-bold">.gltf</span>) exported from Blender.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={triggerUpload}
              disabled={isReading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{modelBuffer ? 'Replace 3D Model' : 'Upload 3D Model'}</span>
            </button>

            {modelBuffer && (
              <button
                type="button"
                onClick={handleRemoveModel}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Model</span>
              </button>
            )}
          </div>

          {/* Reading progress bar */}
          {isReading && (
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Reading model bytes...</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {fileName && !isReading && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium mt-1">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono">{fileName}</span>
              <span className="text-slate-400">({(fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Configuration Controls & 3D Interactive Preview (Visible when a model is selected) */}
      {modelBuffer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Model Calibration Controls</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setRotation([0, 0, 0]);
                  setPosition([0, 0, 0]);
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Reset All
              </button>
            </div>

            {/* Target Hostel Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Target Hostel Building</span>
              </label>
              <select
                value={selectedHostelId}
                onChange={(e) => setSelectedHostelId(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {hostels.map((h) => (
                  <option key={h.Hostel_ID} value={h.Hostel_ID}>
                    {h.Hostel_Name} ({h.Hostel_Type || 'Campus Hostel'})
                  </option>
                ))}
              </select>
            </div>

            {/* Scale Control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-slate-500" />
                  <span>Model Scale</span>
                </span>
                <span className="font-mono text-slate-600 font-bold">{scale.toFixed(2)}x</span>
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
            <div className="space-y-3 pt-1 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Rotate3d className="w-3.5 h-3.5 text-slate-500" />
                <span>Rotation (Degrees)</span>
              </div>

              {/* X Rotation */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-semibold w-12">Pitch (X)</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[0]}
                  onChange={(e) => setRotation([parseInt(e.target.value), rotation[1], rotation[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 w-10 text-right">{rotation[0]}°</span>
              </div>

              {/* Y Rotation */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-semibold w-12">Yaw (Y)</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[1]}
                  onChange={(e) => setRotation([rotation[0], parseInt(e.target.value), rotation[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 w-10 text-right">{rotation[1]}°</span>
              </div>

              {/* Z Rotation */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-semibold w-12">Roll (Z)</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation[2]}
                  onChange={(e) => setRotation([rotation[0], rotation[1], parseInt(e.target.value)])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 w-10 text-right">{rotation[2]}°</span>
              </div>
            </div>

            {/* Position Controls */}
            <div className="space-y-3 pt-1 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-slate-500" />
                <span>Spatial Position Offsets</span>
              </div>

              {/* X Position */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-semibold w-12">Left/Right</span>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={position[0]}
                  onChange={(e) => setPosition([parseFloat(e.target.value), position[1], position[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 w-10 text-right">{position[0]}m</span>
              </div>

              {/* Y Position */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-semibold w-12">Elevation</span>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.25"
                  value={position[1]}
                  onChange={(e) => setPosition([position[0], parseFloat(e.target.value), position[2]])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 w-10 text-right">{position[1]}m</span>
              </div>

              {/* Z Position */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-semibold w-12">Depth</span>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={position[2]}
                  onChange={(e) => setPosition([position[0], position[1], parseFloat(e.target.value)])}
                  className="flex-1 accent-indigo-600 cursor-pointer"
                />
                <span className="font-mono text-slate-600 w-10 text-right">{position[2]}m</span>
              </div>
            </div>

            {/* Apply Action Button */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleApplyModel}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Model to Campus</span>
              </button>
            </div>
          </div>

          {/* 3D Preview Column (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1">
              <span>Interactive Model Preview</span>
              <span className="text-[11px] text-slate-400 font-normal">Real-time Three.js Rendering</span>
            </div>
            <div className="h-[440px] w-full rounded-2xl overflow-hidden shadow-md border border-slate-800">
              <BlenderModelViewer
                modelBuffer={modelBuffer}
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
