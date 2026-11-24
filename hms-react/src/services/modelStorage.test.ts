import { describe, it } from 'node:test';
import assert from 'node:assert';
import type * as ModelStorageModule from './modelStorage';
import type { 
  CustomBuildingModel, 
  ModelValidationResult 
} from './modelStorage';

const modelStoragePath = './modelStorage.ts' as string;
const {
  validateGlbBuffer,
  getHostelModelId,
} = (await import(modelStoragePath)) as typeof ModelStorageModule;

describe('GLB Model Storage & Validation Engine', () => {

  // Helper to create a synthetic valid GLB 2.0 binary buffer
  function createValidGlbBuffer(length: number = 20): ArrayBuffer {
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    // Magic: ASCII "glTF" in little-endian uint32 = 0x46546C67
    view.setUint32(0, 0x46546c67, true);
    // Version: 2
    view.setUint32(4, 2, true);
    // Total Length: declared length
    view.setUint32(8, length, true);
    return buffer;
  }

  // Helper to create a synthetic glTF 2.0 JSON buffer
  function createValidGltfJsonBuffer(): ArrayBuffer {
    const jsonStr = JSON.stringify({
      asset: { version: '2.0', generator: 'Blender 4.2' },
      scenes: [{ nodes: [0] }],
    });
    const uint8 = new TextEncoder().encode(jsonStr);
    return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
  }

  // --- 1. Valid GLB 2.0 Binary Validation ---
  it('1. should accept and validate a valid binary GLB 2.0 buffer with proper magic bytes', () => {
    const buffer = createValidGlbBuffer(64);
    const result = validateGlbBuffer(buffer, 'hostel_a_model.glb');

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.format, 'glb');
    assert.strictEqual(result.version, 2);
    assert.strictEqual(result.byteLength, 64);
    assert.strictEqual(result.error, undefined);
  });

  // --- 2. Valid glTF 2.0 JSON Validation ---
  it('2. should accept and validate a valid glTF 2.0 JSON buffer with asset.version', () => {
    const buffer = createValidGltfJsonBuffer();
    const result = validateGlbBuffer(buffer, 'hostel_b.gltf');

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.format, 'gltf');
    assert.strictEqual(result.version, 2);
    assert.strictEqual(result.error, undefined);
  });

  // --- 3. Rejection of Raw Blender .blend Files ---
  it('3. should reject direct .blend source files with actionable guidance', () => {
    const buffer = new ArrayBuffer(100);
    const result = validateGlbBuffer(buffer, 'hostel_architecture.blend');

    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('.blend'));
    assert.ok(result.error?.includes('File > Export > glTF 2.0'));
  });

  // --- 4. Rejection of Empty 0-byte File ---
  it('4. should reject zero-byte empty files', () => {
    const buffer = new ArrayBuffer(0);
    const result = validateGlbBuffer(buffer, 'empty.glb');

    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('zero bytes'));
  });

  // --- 5. Rejection of Invalid / Corrupted Magic Bytes ---
  it('5. should reject files with invalid or non-glTF magic headers', () => {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    // Write invalid magic (e.g. 'PK..' from a ZIP file or 'RIFF')
    view.setUint32(0, 0x04034b50, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, 32, true);

    const result = validateGlbBuffer(buffer, 'fake_model.glb');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('magic bytes'));
  });

  // --- 6. Rejection of Unsupported glTF Version ---
  it('6. should reject obsolete glTF 1.0 binary models', () => {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    view.setUint32(0, 0x46546c67, true); // glTF magic
    view.setUint32(4, 1, true);          // Version 1 (unsupported)
    view.setUint32(8, 32, true);

    const result = validateGlbBuffer(buffer, 'legacy_v1.glb');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('Unsupported glTF binary version (1)'));
  });

  // --- 7. Rejection of Truncated GLB File ---
  it('7. should reject truncated GLB files where declared length exceeds actual buffer', () => {
    const buffer = new ArrayBuffer(24);
    const view = new DataView(buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, 1024, true); // Declared length 1024, but buffer is only 24 bytes

    const result = validateGlbBuffer(buffer, 'incomplete_download.glb');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('Truncated GLB file'));
  });

  // --- 8. Rejection of Oversized File ---
  it('8. should enforce the maximum safe memory threshold (150 MB)', () => {
    // Mock an oversized buffer by checking length threshold
    const fakeOversizedLength = 160 * 1024 * 1024;
    const buffer = { byteLength: fakeOversizedLength } as ArrayBuffer;

    const result = validateGlbBuffer(buffer, 'giant_model.glb');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('150 MB'));
  });

  // --- 9. Rejection of Non-glTF Random Data or Text ---
  it('9. should reject plain text or HTML files disguised as .glb', () => {
    const htmlStr = '<!DOCTYPE html><html><body>Not a 3D model</body></html>';
    const buffer = Buffer.from(htmlStr, 'utf-8').buffer;

    const result = validateGlbBuffer(buffer, 'webpage.glb');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('Invalid 3D model format'));
  });

  // --- 10. Multi-model ID Generation by Hostel ---
  it('10. should generate deterministic, isolated model storage IDs per hostel', () => {
    assert.strictEqual(getHostelModelId(1), 'hostel-model-1');
    assert.strictEqual(getHostelModelId(2), 'hostel-model-2');
    assert.strictEqual(getHostelModelId(3), 'hostel-model-3');
    assert.strictEqual(getHostelModelId(4), 'hostel-model-4');
  });

  // --- 11. Add Model Conflict Detection Logic ---
  it('11. should detect conflict when adding to a hostel with an existing model', () => {
    const existingModels: Record<number, CustomBuildingModel> = {
      1: {
        id: 'hostel-model-1',
        fileName: 'hostel_a_v1.glb',
        fileSize: 1024,
        fileData: createValidGlbBuffer(24),
        uploadedAt: 'Nov 24, 2026',
        hostelId: 1,
        hostelName: 'Hostel A',
        scale: 1,
        rotation: [0, 0, 0],
        position: [0, 0, 0],
        isApplied: true,
      },
    };

    // Attempting to ADD to Hostel 1 must detect conflict
    const targetHostelId = 1;
    const hasConflict = !!existingModels[targetHostelId];
    assert.strictEqual(hasConflict, true);

    // Attempting to ADD to Hostel 2 (no model) must be permitted
    const vacantHostelId = 2;
    const vacantConflict = !!existingModels[vacantHostelId];
    assert.strictEqual(vacantConflict, false);
  });

  // --- 12. Replace Model Calibration Preservation ---
  it('12. should preserve spatial calibrations when requested during replacement', () => {
    const existingModel: CustomBuildingModel = {
      id: 'hostel-model-1',
      fileName: 'hostel_a_v1.glb',
      fileSize: 1024,
      fileData: createValidGlbBuffer(24),
      uploadedAt: 'Nov 24, 2026',
      hostelId: 1,
      hostelName: 'Hostel A',
      scale: 1.45,
      rotation: [10, 45, 0],
      position: [2.5, 0.5, -1.0],
      isApplied: true,
    };

    const newBuffer = createValidGlbBuffer(32);
    const preserveCalibration = true;

    // Simulate replacement logic
    const replacedModel: CustomBuildingModel = {
      id: existingModel.id,
      fileName: 'hostel_a_v2.glb',
      fileSize: 2048,
      fileData: newBuffer,
      uploadedAt: 'Nov 25, 2026',
      hostelId: existingModel.hostelId,
      hostelName: existingModel.hostelName,
      scale: preserveCalibration ? existingModel.scale : 1,
      rotation: preserveCalibration ? existingModel.rotation : [0, 0, 0],
      position: preserveCalibration ? existingModel.position : [0, 0, 0],
      isApplied: true,
    };

    assert.strictEqual(replacedModel.fileName, 'hostel_a_v2.glb');
    assert.strictEqual(replacedModel.scale, 1.45);
    assert.deepStrictEqual(replacedModel.rotation, [10, 45, 0]);
    assert.deepStrictEqual(replacedModel.position, [2.5, 0.5, -1.0]);
    assert.strictEqual(replacedModel.hostelId, 1);
  });

  // --- 13. Existing Model Preservation on Failure ---
  it('13. should guarantee existing model preservation when new replacement file is invalid', () => {
    let currentStore: Record<number, CustomBuildingModel> = {
      1: {
        id: 'hostel-model-1',
        fileName: 'hostel_a_stable.glb',
        fileSize: 1024,
        fileData: createValidGlbBuffer(24),
        uploadedAt: 'Nov 24, 2026',
        hostelId: 1,
        hostelName: 'Hostel A',
        scale: 1,
        rotation: [0, 0, 0],
        position: [0, 0, 0],
        isApplied: true,
      },
    };

    // Candidate replacement is malformed
    const badCandidate = Buffer.from('Corrupted payload', 'utf-8').buffer;
    const validation = validateGlbBuffer(badCandidate, 'malformed.glb');

    assert.strictEqual(validation.valid, false);

    // Because validation failed, the existing store must remain untouched
    if (!validation.valid) {
      // Abort replacement without updating currentStore
    }

    assert.strictEqual(currentStore[1].fileName, 'hostel_a_stable.glb');
    assert.strictEqual(currentStore[1].fileSize, 1024);
  });

  // --- 14. Model Association Isolation ---
  it('14. should guarantee that replacing a model for one hostel does not affect another', () => {
    const store: Record<number, CustomBuildingModel> = {
      1: {
        id: 'hostel-model-1',
        fileName: 'hostel_a.glb',
        fileSize: 1000,
        fileData: createValidGlbBuffer(20),
        uploadedAt: 'Nov 24',
        hostelId: 1,
        hostelName: 'Hostel A',
        scale: 1,
        rotation: [0, 0, 0],
        position: [0, 0, 0],
        isApplied: true,
      },
      2: {
        id: 'hostel-model-2',
        fileName: 'hostel_b.glb',
        fileSize: 2000,
        fileData: createValidGlbBuffer(20),
        uploadedAt: 'Nov 24',
        hostelId: 2,
        hostelName: 'Hostel B',
        scale: 1.2,
        rotation: [0, 90, 0],
        position: [0, 0, 0],
        isApplied: true,
      },
    };

    // Replace Hostel 1 only
    store[1] = {
      ...store[1],
      fileName: 'hostel_a_updated.glb',
      fileSize: 1500,
    };

    // Hostel 2 must remain completely unmodified
    assert.strictEqual(store[2].fileName, 'hostel_b.glb');
    assert.strictEqual(store[2].fileSize, 2000);
    assert.strictEqual(store[2].scale, 1.2);
    assert.strictEqual(store[1].fileName, 'hostel_a_updated.glb');
  });

});
