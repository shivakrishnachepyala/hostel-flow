/**
 * HostelFlow 3D Model Storage Service (IndexedDB)
 * Stores Blender-exported GLB/glTF model binaries and their transform configurations
 * locally in browser storage without size restrictions or MySQL schema changes.
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

const DB_NAME = 'HostelFlow3D';
const DB_VERSION = 1;
const STORE_NAME = 'models';
export const DEFAULT_MODEL_ID = 'custom-hostel-model';

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
 * Saves or updates a custom 3D model with its configuration.
 */
export async function saveCustomModel(model: CustomBuildingModel): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(model);

    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('hostelflow:model-updated', { detail: model }));
      resolve();
    };
    req.onerror = () => reject(req.error || new Error('Failed to save 3D model.'));
  });
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
 * Removes a custom 3D model by its ID.
 */
export async function removeCustomModel(id: string = DEFAULT_MODEL_ID): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('hostelflow:model-updated', { detail: null }));
      resolve();
    };
    req.onerror = () => reject(req.error || new Error('Failed to remove 3D model.'));
  });
}

/**
 * Retrieves the currently active applied model if one exists.
 */
export async function getAppliedModel(): Promise<CustomBuildingModel | null> {
  const model = await getCustomModel(DEFAULT_MODEL_ID);
  if (model && model.isApplied) {
    return model;
  }
  return null;
}
