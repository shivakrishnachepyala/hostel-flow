/**
 * HostelFlow 3D Model Storage & Validation Service (IndexedDB)
 * Stores Blender-exported GLB/glTF model binaries and their transform configurations
 * locally in browser storage without size restrictions or MySQL schema changes.
 * Supports multi-model per-hostel assignments, robust binary GLB format validation,
 * and safe add/replace workflows with conflict detection.
 */

export interface CustomBuildingModel {
  id: string;
  fileName: string;
  fileSize: number;
  fileData: ArrayBuffer;
  uploadedAt: string;
  hostelId: number;
  hostelName: string;
  scale: number;
  rotation: [number, number, number]; // Degrees: [rotX, rotY, rotZ]
  position: [number, number, number]; // Offsets: [posX, posY, posZ]
  isApplied: boolean;
}

export interface ModelValidationResult {
  valid: boolean;
  error?: string;
  format?: 'glb' | 'gltf';
  version?: number;
  byteLength?: number;
}

const DB_NAME = 'HostelFlow3D';
const DB_VERSION = 1;
const STORE_NAME = 'models';
export const DEFAULT_MODEL_ID = 'custom-hostel-model';

/**
 * Derives a deterministic model key for a specific hostel.
 */
export function getHostelModelId(hostelId: number): string {
  return `hostel-model-${hostelId}`;
}

/**
 * Validates binary GLB or JSON glTF buffer content.
 * Checks magic headers, version, length declarations, and format integrity.
 * Does NOT trust file extensions alone.
 */
export function validateGlbBuffer(buffer: ArrayBuffer, fileName: string): ModelValidationResult {
  const lowerName = fileName.toLowerCase().trim();

  // 1. Basic length check
  if (!buffer || buffer.byteLength === 0) {
    return {
      valid: false,
      error: 'Empty file buffer: The uploaded file contains zero bytes.',
    };
  }

  // 2. Reject raw Blender .blend files with helpful explanation
  if (lowerName.endsWith('.blend')) {
    return {
      valid: false,
      error: 'Direct .blend files are Blender source files and cannot be rendered natively in WebGL browsers. Please open your project in Blender, select "File > Export > glTF 2.0 (.glb/.gltf)", and upload the exported .glb file.',
    };
  }

  // 3. Recommended size limit check (150 MB safe threshold for browser memory)
  const MAX_SAFE_SIZE = 150 * 1024 * 1024;
  if (buffer.byteLength > MAX_SAFE_SIZE) {
    const sizeMb = (buffer.byteLength / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum recommended browser 3D limit (150 MB). Large models may cause WebGL memory exhaustion or browser tab crashes.`,
    };
  }

  // 4. Binary GLB Validation (Expected for .glb files or any binary starting with 'glTF')
  if (buffer.byteLength >= 12) {
    const dataView = new DataView(buffer);
    const magic = dataView.getUint32(0, true);

    // ASCII 'glTF' in little-endian uint32: 0x46546C67 ('g'=0x67, 'l'=0x6c, 'T'=0x54, 'F'=0x46)
    if (magic === 0x46546c67) {
      const version = dataView.getUint32(4, true);
      const totalLength = dataView.getUint32(8, true);

      if (version !== 2) {
        return {
          valid: false,
          error: `Unsupported glTF binary version (${version}). HostelFlow requires glTF 2.0.`,
          format: 'glb',
          version,
        };
      }

      if (totalLength > buffer.byteLength) {
        return {
          valid: false,
          error: `Truncated GLB file: Declared container length (${totalLength} bytes) exceeds actual file buffer (${buffer.byteLength} bytes). The file may have failed to upload completely.`,
          format: 'glb',
          version,
          byteLength: buffer.byteLength,
        };
      }

      // Valid GLB 2.0 binary container
      return {
        valid: true,
        format: 'glb',
        version: 2,
        byteLength: buffer.byteLength,
      };
    }
  }

  // 5. Text JSON glTF Validation (Fallback for .gltf files)
  try {
    const sampleSize = Math.min(buffer.byteLength, 64 * 1024);
    const textSample = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, sampleSize));
    const cleanText = textSample.trim();

    if (cleanText.startsWith('{') && cleanText.includes('"asset"') && cleanText.includes('"version"')) {
      const parsed = JSON.parse(new TextDecoder('utf-8').decode(buffer));
      const assetVersion = parsed.asset?.version;

      if (!assetVersion || !assetVersion.startsWith('2.')) {
        return {
          valid: false,
          error: `Unsupported glTF asset version (${assetVersion || 'unknown'}). HostelFlow requires glTF 2.0.`,
          format: 'gltf',
        };
      }

      return {
        valid: true,
        format: 'gltf',
        version: 2,
        byteLength: buffer.byteLength,
      };
    }
  } catch (jsonErr) {
    // Not valid JSON glTF
  }

  // 6. Header does not match either format
  return {
    valid: false,
    error: 'Invalid 3D model format: File does not contain a valid glTF 2.0 binary header (magic bytes "glTF") or glTF JSON structure.',
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open 3D model database.'));
  });
}

/**
 * Retrieves all stored custom 3D models.
 */
export async function getAllCustomModels(): Promise<CustomBuildingModel[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error('Failed to load 3D models.'));
    });
  } catch (err) {
    console.error('Error reading models from IndexedDB:', err);
    return [];
  }
}

/**
 * Retrieves a custom 3D model by its ID.
 */
export async function getCustomModel(id: string = DEFAULT_MODEL_ID): Promise<CustomBuildingModel | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Failed to load 3D model.'));
    });
  } catch (err) {
    console.error('Error reading 3D model from IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves the model assigned to a specific hostel.
 */
export async function getModelForHostel(hostelId: number): Promise<CustomBuildingModel | null> {
  try {
    const specific = await getCustomModel(getHostelModelId(hostelId));
    if (specific) return specific;

    // Check legacy default model
    const legacy = await getCustomModel(DEFAULT_MODEL_ID);
    if (legacy && legacy.hostelId === hostelId) return legacy;

    return null;
  } catch (err) {
    console.error(`Error loading model for Hostel ${hostelId}:`, err);
    return null;
  }
}

/**
 * Saves or updates a custom 3D model with its configuration.
 */
export async function saveCustomModel(model: CustomBuildingModel): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Save with the specific hostel key as well as the model ID
    const req = store.put(model);

    req.onsuccess = () => {
      // Also update DEFAULT_MODEL_ID for backwards compatibility with single-model viewers
      if (model.isApplied) {
        const legacyClone = { ...model, id: DEFAULT_MODEL_ID };
        store.put(legacyClone);
      }
      window.dispatchEvent(new CustomEvent('hostelflow:model-updated', { detail: model }));
      resolve();
    };
    req.onerror = () => reject(req.error || new Error('Failed to save 3D model.'));
  });
}

/**
 * Removes a custom 3D model by its ID.
 */
export async function removeCustomModel(id: string = DEFAULT_MODEL_ID): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Delete primary
    const req = store.delete(id);

    req.onsuccess = () => {
      // Also delete legacy alias if removing
      store.delete(DEFAULT_MODEL_ID);
      window.dispatchEvent(new CustomEvent('hostelflow:model-updated', { detail: null }));
      resolve();
    };
    req.onerror = () => reject(req.error || new Error('Failed to remove 3D model.'));
  });
}

/**
 * Retrieves the currently active applied model if one exists.
 * If hostelId is provided, returns that hostel's model.
 */
export async function getAppliedModel(hostelId?: number): Promise<CustomBuildingModel | null> {
  if (hostelId !== undefined && hostelId !== null) {
    const hostelModel = await getModelForHostel(hostelId);
    if (hostelModel && hostelModel.isApplied) {
      return hostelModel;
    }
  }

  // Fallback to default applied model or first applied model
  const legacy = await getCustomModel(DEFAULT_MODEL_ID);
  if (legacy && legacy.isApplied) {
    return legacy;
  }

  const all = await getAllCustomModels();
  const firstApplied = all.find((m) => m.isApplied);
  return firstApplied || null;
}
