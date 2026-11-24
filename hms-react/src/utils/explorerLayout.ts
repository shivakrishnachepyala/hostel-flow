/**
 * Dynamic 3D Building Layout Engine for HostelFlow
 *
 * Transforms arbitrary collections of database room records into
 * mathematically sound, deterministic 3D spatial coordinates,
 * procedural dimensions, and dynamic building boundaries.
 *
 * Architecture:
 * - Pure algorithmic engine with zero React, DOM, or database side effects.
 * - Double-loaded corridor circulation with independent row centering.
 * - Adapts dynamically to any number of floors, rooms per floor, and room types.
 */

import type { Room } from '../types';

/**
 * Standard visualization dimensions [width, height, depth] in 3D world units.
 * Note: These are procedural visualization proportions, not architectural blueprints.
 */
export const DEFAULT_ROOM_DIMENSIONS: Record<string, [number, number, number]> = {
  single: [2.2, 1.4, 2.6],
  double: [2.6, 1.4, 2.6],
  triple: [3.0, 1.4, 2.6],
};

/** Safe fallback room dimensions for unspecified or custom room categories */
export const FALLBACK_ROOM_DIMENSIONS: [number, number, number] = [2.6, 1.4, 2.6];

/** Standard procedural layout parameters */
export const DEFAULT_LAYOUT_CONFIG = {
  floorHeight: 1.7, // Vertical clearance between consecutive floor slabs
  corridorWidth: 1.4, // Central corridor spine width along Z-axis
  roomDepth: 2.6, // Exterior-to-corridor depth along Z-axis
  roomSpacing: 3.0, // Slot spacing interval along horizontal X-axis
  minBuildingWidth: 10.0, // Minimum architectural width for aesthetic foundation
  slabThickness: 0.08, // Floor slab vertical thickness
  foundationThickness: 0.12, // Plinth thickness
  roofThickness: 0.15, // Roof slab thickness
} as const;

export interface LayoutOptions {
  floorHeight?: number;
  corridorWidth?: number;
  roomSpacing?: number;
  minBuildingWidth?: number;
  customDimensionsMap?: Record<string, [number, number, number]>;
}

export interface ExplorerBed {
  Bed_ID: number;
  Bed_Number: string;
  Bed_Type: string | null;
  Bed_Status: string;
  is_occupied?: boolean;
}

/**
 * Enhanced room interface with procedural 3D spatial positioning and occupancy metrics.
 * Retains 100% of the original room record attributes.
 */
export type DynamicallyPositionedRoom<T = Room> = T & {
  position3D: [number, number, number]; // [x, y, z] relative to building origin
  dimensions: [number, number, number]; // [width, height, depth]
  Floor?: number | null; // Floor number
  row?: 'south' | 'north'; // Spatial orientation (South: Z > 0, North: Z < 0)
  rowIndex?: number; // 0-based horizontal index along that row
  beds?: ExplorerBed[];
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  status: 'available' | 'partially-occupied' | 'fully-occupied' | 'maintenance' | string;
};

/**
 * Calculated architectural extents and structural bounds for procedural building rendering.
 */
export interface BuildingBounds {
  width: number; // Total building width along X-axis
  depth: number; // Total building depth along Z-axis
  height: number; // Total building height along Y-axis
  floors: number[]; // Sorted array of unique floor numbers present
  floorCount: number; // Number of unique floors
  highestFloor: number; // Maximum floor number (0 if empty)
  lowestFloor: number; // Minimum floor number (0 if empty)
  floorHeight: number; // Vertical spacing per floor
  corridorWidth: number; // Circulation width
  roomsPerFloor: Record<number, number>; // Distribution map of rooms per floor
  maxRoomsOnAnyFloor: number; // Maximum room count on any single storey
  foundationDimensions: [number, number, number]; // [width, height, depth] for ground plinth
  slabDimensions: [number, number, number]; // [width, height, depth] for storey slabs
  roofDimensions: [number, number, number]; // [width, height, depth] for top roof
  corridorDimensions: [number, number, number]; // [width, height, depth] for corridor floor
  cameraTarget: [number, number, number]; // Ideal OrbitControls focal target [x, y, z]
  suggestedCameraDistance: number; // Recommended initial distance for complete framing
  extents: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export interface LayoutResult<T = Room> {
  rooms: DynamicallyPositionedRoom<T>[];
  bounds: BuildingBounds;
}

/**
 * Campus View Interfaces for procedural multi-hostel visualization
 */
export interface CampusBlockSummary {
  Block_ID: number;
  Block_Name: string;
  Gender: string;
  Capacity: number;
  total_rooms: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  floors: number[];
}

export interface CampusHostelData {
  Hostel_ID: number;
  Hostel_Name: string;
  Hostel_Type: string;
  Location: string;
  Capacity: number;
  blocks: CampusBlockSummary[];
  total_blocks: number;
  total_rooms: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  floors: number[];
  floor_count: number;
}

export interface CampusBuildingWing {
  blockId: number;
  blockName: string;
  gender: string;
  offset: [number, number, number]; // [x, y, z] relative to building position
  dimensions: [number, number, number]; // [width, height, depth]
  rooms: number;
  beds: number;
  floors: number;
}

export interface CampusBuildingLayout {
  hostel: CampusHostelData;
  position3D: [number, number, number]; // [x, y, z] on campus ground plane
  dimensions: [number, number, number]; // [width, height, depth]
  wings: CampusBuildingWing[];
  floorCount: number;
  accentColor: string;
  occupancyStatus: 'vacant' | 'partially-occupied' | 'fully-occupied';
}

export interface CampusLayoutResult {
  buildings: CampusBuildingLayout[];
  groundDimensions: [number, number]; // [width, depth]
  campusBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  cameraTarget: [number, number, number];
  suggestedCameraDistance: number;
}

/**
 * Resolves 3D box dimensions [width, height, depth] for a given room category.
 */
export function getRoomDimensions(
  roomType?: string | null,
  customMap?: Record<string, [number, number, number]>
): [number, number, number] {
  if (!roomType) return [...FALLBACK_ROOM_DIMENSIONS];

  const normalized = roomType.trim().toLowerCase();

  if (customMap && customMap[normalized]) {
    return [...customMap[normalized]];
  }

  if (DEFAULT_ROOM_DIMENSIONS[normalized]) {
    return [...DEFAULT_ROOM_DIMENSIONS[normalized]];
  }

  return [...FALLBACK_ROOM_DIMENSIONS];
}

/**
 * Safely parses or extracts an integer floor number from room metadata.
 * If floor is null/missing/invalid, infers floor from Room_Number (e.g. 'A-101' -> 1, 'D2-305' -> 3).
 * Defaults safely to 1 if no valid floor can be inferred.
 */
export function parseFloorNumber(floorValue: unknown, roomNumber?: string | null): number {
  if (typeof floorValue === 'number' && Number.isFinite(floorValue) && floorValue > 0) {
    return Math.floor(floorValue);
  }

  if (typeof floorValue === 'string') {
    const parsed = parseInt(floorValue.trim(), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Fallback: infer from room number (e.g. "A2-105" -> 1, "302" -> 3)
  if (roomNumber && typeof roomNumber === 'string') {
    const clean = roomNumber.trim();
    // Match floor digit in patterns like "A-101", "D1-205", "101", "201"
    const match = clean.match(/(?:^|[A-Za-z0-9]+-)?([1-9])\d{2}$/);
    if (match && match[1]) {
      const inferred = parseInt(match[1], 10);
      if (!Number.isNaN(inferred) && inferred > 0) {
        return inferred;
      }
    }
  }

  return 1;
}

/**
 * Natural alphanumeric comparator for room numbers (e.g. "101", "102" ... "110", "A-101", "A-102")
 */
function naturalRoomCompare(a: { Room_Number?: string; Room_ID?: number }, b: { Room_Number?: string; Room_ID?: number }): number {
  const numA = (a.Room_Number ?? '').trim();
  const numB = (b.Room_Number ?? '').trim();

  if (numA && numB) {
    const cmp = numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
  }

  // Fallback to primary key Room_ID
  const idA = a.Room_ID ?? 0;
  const idB = b.Room_ID ?? 0;
  return idA - idB;
}

/**
 * Pure algorithmic function that transforms an arbitrary array of room records
 * into deterministically positioned 3D room objects and calculated building bounds.
 */
export function generateDynamicLayout<T extends Partial<Room>>(
  rooms: T[],
  options?: LayoutOptions
): LayoutResult<T> {
  const config = {
    floorHeight: options?.floorHeight ?? DEFAULT_LAYOUT_CONFIG.floorHeight,
    corridorWidth: options?.corridorWidth ?? DEFAULT_LAYOUT_CONFIG.corridorWidth,
    roomSpacing: options?.roomSpacing ?? DEFAULT_LAYOUT_CONFIG.roomSpacing,
    minBuildingWidth: options?.minBuildingWidth ?? DEFAULT_LAYOUT_CONFIG.minBuildingWidth,
    roomDepth: DEFAULT_LAYOUT_CONFIG.roomDepth,
    customMap: options?.customDimensionsMap,
  };

  // 1. Handle empty input safely
  if (!rooms || rooms.length === 0) {
    const defaultDepth = 2 * config.roomDepth + config.corridorWidth + 0.6;
    return {
      rooms: [],
      bounds: {
        width: config.minBuildingWidth,
        depth: defaultDepth,
        height: config.floorHeight,
        floors: [],
        floorCount: 0,
        highestFloor: 0,
        lowestFloor: 0,
        floorHeight: config.floorHeight,
        corridorWidth: config.corridorWidth,
        roomsPerFloor: {},
        maxRoomsOnAnyFloor: 0,
        foundationDimensions: [config.minBuildingWidth + 0.8, DEFAULT_LAYOUT_CONFIG.foundationThickness, defaultDepth + 0.8],
        slabDimensions: [config.minBuildingWidth, DEFAULT_LAYOUT_CONFIG.slabThickness, defaultDepth],
        roofDimensions: [config.minBuildingWidth + 0.2, DEFAULT_LAYOUT_CONFIG.roofThickness, defaultDepth + 0.2],
        corridorDimensions: [config.minBuildingWidth - 0.6, 0.02, config.corridorWidth],
        cameraTarget: [0, config.floorHeight / 2, 0],
        suggestedCameraDistance: 15,
        extents: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 },
      },
    };
  }

  // 2. Normalize and group rooms by floor
  // Clone room records to guarantee immutability of the original input
  const normalizedRooms = rooms.map((room) => {
    const floor = parseFloorNumber(room.Floor, room.Room_Number);
    return {
      source: room,
      floor,
    };
  });

  // Extract unique sorted floor values
  const uniqueFloors = Array.from(new Set(normalizedRooms.map((r) => r.floor))).sort((a, b) => a - b);

  const roomsPerFloor: Record<number, number> = {};
  uniqueFloors.forEach((f) => {
    roomsPerFloor[f] = 0;
  });

  const floorGroups = new Map<number, typeof normalizedRooms>();
  uniqueFloors.forEach((f) => {
    floorGroups.set(f, []);
  });

  normalizedRooms.forEach((item) => {
    floorGroups.get(item.floor)!.push(item);
    roomsPerFloor[item.floor] = (roomsPerFloor[item.floor] ?? 0) + 1;
  });

  // 3. Compute building dimensions based on the largest floor
  let maxRoomsOnAnyFloor = 0;
  uniqueFloors.forEach((f) => {
    const count = roomsPerFloor[f] ?? 0;
    if (count > maxRoomsOnAnyFloor) {
      maxRoomsOnAnyFloor = count;
    }
  });

  // In a double-loaded corridor, rooms on a floor are split between South and North rows
  const maxRoomsInAnyRow = Math.max(1, Math.ceil(maxRoomsOnAnyFloor / 2));
  const calculatedBuildingWidth = Math.max(
    config.minBuildingWidth,
    maxRoomsInAnyRow * config.roomSpacing + 1.2
  );
  const buildingDepth = 2 * config.roomDepth + config.corridorWidth + 0.6;
  const totalBuildingHeight = uniqueFloors.length * config.floorHeight;

  // Track 3D room bounding box extents
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  // 4. Position rooms floor-by-floor using double-loaded corridor algorithm
  const positionedRooms: DynamicallyPositionedRoom<T>[] = [];

  uniqueFloors.forEach((floorNumber, floorIndex) => {
    const floorItems = floorGroups.get(floorNumber)!;

    // Stable sort rooms within this floor to guarantee deterministic coordinates
    floorItems.sort((a, b) => naturalRoomCompare(a.source, b.source));

    // Vertical elevation Y:
    // Sits directly on top of the floor slab for this storey index
    const floorBaseY = floorIndex * config.floorHeight;
    const roomCenterY = floorBaseY + 0.75; // 0.75 = roomHeight/2 (0.70) + slab clearance (0.05)

    // Double-loaded corridor division:
    // South Row (Z > 0): first ceil(N / 2) rooms
    // North Row (Z < 0): remaining floor(N / 2) rooms
    const southCount = Math.ceil(floorItems.length / 2);
    const southItems = floorItems.slice(0, southCount);
    const northItems = floorItems.slice(southCount);

    // Helper to position a single row with independent centering along X-axis
    const positionRow = (
      items: typeof floorItems,
      row: 'south' | 'north',
      zPos: number
    ) => {
      const count = items.length;
      if (count === 0) return;

      items.forEach((item, index) => {
        const rawRoom = item.source;
        const dims = getRoomDimensions(rawRoom.Room_Type, config.customMap);

        // Independent centering:
        // x_i = (i - (count - 1) / 2) * spacing
        const xPos = count === 1 ? 0 : (index - (count - 1) / 2) * config.roomSpacing;
        const yPos = roomCenterY;

        // Update geometric bounding box extents
        const halfW = dims[0] / 2;
        const halfH = dims[1] / 2;
        const halfD = dims[2] / 2;

        minX = Math.min(minX, xPos - halfW);
        maxX = Math.max(maxX, xPos + halfW);
        minY = Math.min(minY, yPos - halfH);
        maxY = Math.max(maxY, yPos + halfH);
        minZ = Math.min(minZ, zPos - halfD);
        maxZ = Math.max(maxZ, zPos + halfD);

        // Calculate occupancy counts cleanly from actual beds if present, or fallback gracefully
        const rawBeds = (rawRoom as { beds?: ExplorerBed[] }).beds;
        const totalBeds = rawBeds && Array.isArray(rawBeds) && rawBeds.length > 0
          ? rawBeds.length
          : (rawRoom.Total_Beds ?? rawRoom.Capacity ?? (dims[0] >= 3.0 ? 3 : dims[0] >= 2.5 ? 2 : 1));
        const occupiedBeds = rawBeds && Array.isArray(rawBeds) && rawBeds.length > 0
          ? rawBeds.filter((b) => b.is_occupied || b.Bed_Status === 'Occupied').length
          : (rawRoom.Occupied_Beds ?? 0);
        const availableBeds = Math.max(0, totalBeds - occupiedBeds);

        let status: 'available' | 'partially-occupied' | 'fully-occupied' | 'maintenance' = 'available';
        if (totalBeds === 0 || availableBeds === 0) {
          status = 'fully-occupied';
        } else if (occupiedBeds > 0 && availableBeds > 0) {
          status = 'partially-occupied';
        } else {
          status = 'available';
        }

        const positioned: DynamicallyPositionedRoom<T> = {
          ...rawRoom,
          position3D: [
            Number(xPos.toFixed(3)),
            Number(yPos.toFixed(3)),
            Number(zPos.toFixed(3)),
          ],
          dimensions: dims,
          Floor: floorNumber,
          row,
          rowIndex: index,
          totalBeds,
          occupiedBeds,
          availableBeds,
          status,
        };

        positionedRooms.push(positioned);
      });
    };

    // South row placement (Z = +2.0)
    const southZ = config.roomDepth / 2 + config.corridorWidth / 2;
    positionRow(southItems, 'south', southZ);

    // North row placement (Z = -2.0)
    const northZ = -(config.roomDepth / 2 + config.corridorWidth / 2);
    positionRow(northItems, 'north', northZ);
  });

  // Calculate camera distance to frame the entire building
  const maxSpan = Math.max(calculatedBuildingWidth, totalBuildingHeight);
  const suggestedCameraDistance = Math.max(15, Number((maxSpan * 1.5).toFixed(1)));

  // If bounds resulted in Infinity (e.g. defensive check), fallback cleanly
  const safeExtents = {
    minX: Number.isFinite(minX) ? Number(minX.toFixed(3)) : 0,
    maxX: Number.isFinite(maxX) ? Number(maxX.toFixed(3)) : 0,
    minY: Number.isFinite(minY) ? Number(minY.toFixed(3)) : 0,
    maxY: Number.isFinite(maxY) ? Number(maxY.toFixed(3)) : 0,
    minZ: Number.isFinite(minZ) ? Number(minZ.toFixed(3)) : 0,
    maxZ: Number.isFinite(maxZ) ? Number(maxZ.toFixed(3)) : 0,
  };

  const bounds: BuildingBounds = {
    width: Number(calculatedBuildingWidth.toFixed(2)),
    depth: Number(buildingDepth.toFixed(2)),
    height: Number(totalBuildingHeight.toFixed(2)),
    floors: uniqueFloors,
    floorCount: uniqueFloors.length,
    highestFloor: uniqueFloors[uniqueFloors.length - 1] ?? 0,
    lowestFloor: uniqueFloors[0] ?? 0,
    floorHeight: config.floorHeight,
    corridorWidth: config.corridorWidth,
    roomsPerFloor,
    maxRoomsOnAnyFloor,
    foundationDimensions: [
      Number((calculatedBuildingWidth + 0.8).toFixed(2)),
      DEFAULT_LAYOUT_CONFIG.foundationThickness,
      Number((buildingDepth + 0.8).toFixed(2)),
    ],
    slabDimensions: [
      Number(calculatedBuildingWidth.toFixed(2)),
      DEFAULT_LAYOUT_CONFIG.slabThickness,
      Number(buildingDepth.toFixed(2)),
    ],
    roofDimensions: [
      Number((calculatedBuildingWidth + 0.2).toFixed(2)),
      DEFAULT_LAYOUT_CONFIG.roofThickness,
      Number((buildingDepth + 0.2).toFixed(2)),
    ],
    corridorDimensions: [
      Number((calculatedBuildingWidth - 0.6).toFixed(2)),
      0.02,
      config.corridorWidth,
    ],
    cameraTarget: [0, Number((totalBuildingHeight / 2).toFixed(2)), 0],
    suggestedCameraDistance,
    extents: safeExtents,
  };

  return {
    rooms: positionedRooms,
    bounds,
  };
}

/**
 * Procedural Campus Layout Engine
 *
 * Arranges arbitrary N database hostels onto a simulated university campus quadrangle.
 * Computes deterministic 3D positions, realistic architectural proportions,
 * multi-block wings, campus ground bounds, and camera framing.
 */
export function generateCampusLayout(
  hostels: CampusHostelData[],
  options?: {
    buildingSpacing?: number;
    quadrangleRadius?: number;
  }
): CampusLayoutResult {
  const quadRadius = options?.quadrangleRadius ?? 22;
  const spacing = options?.buildingSpacing ?? 36;

  // 1. Handle empty hostels safely
  if (!hostels || hostels.length === 0) {
    return {
      buildings: [],
      groundDimensions: [70, 70],
      campusBounds: { minX: -35, maxX: 35, minZ: -35, maxZ: 35 },
      cameraTarget: [0, 2, 0],
      suggestedCameraDistance: 50,
    };
  }

  // 2. Stable sort hostels alphabetically by Hostel_Name (then by Hostel_ID) to guarantee deterministic spatial placement
  const sortedHostels = [...hostels].sort((a, b) => {
    const cmp = (a.Hostel_Name || '').localeCompare(b.Hostel_Name || '');
    if (cmp !== 0) return cmp;
    return a.Hostel_ID - b.Hostel_ID;
  });
  const n = sortedHostels.length;

  const buildings: CampusBuildingLayout[] = [];

  // Track campus-wide extents
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  sortedHostels.forEach((hostel, index) => {
    // A. Calculate Position [x, y, z] on Campus Ground
    let posX = 0;
    let posZ = 0;

    if (n === 1) {
      posX = 0;
      posZ = 0;
    } else if (n === 2) {
      posX = index === 0 ? -18 : 18;
      posZ = 0;
    } else if (n === 3) {
      const angle = (index * 2 * Math.PI) / 3 - Math.PI / 2;
      posX = Number((Math.cos(angle) * quadRadius).toFixed(2));
      posZ = Number((Math.sin(angle) * quadRadius).toFixed(2));
    } else if (n === 4) {
      // Symmetrical 2x2 Campus Quadrangle (Alphabetical: A -> B -> C -> D)
      // Slot 0 (Hostel A - ID 1): North-West [-24, -18]
      // Slot 1 (Hostel B - ID 2): South-East [+20, +18]
      // Slot 2 (Hostel C - ID 3): South-West [-20, +18]
      // Slot 3 (Hostel D - ID 4): North-East [+24, -18]
      const quadPositions: [number, number][] = [
        [-24, -18], // Hostel A (North-West)
        [20, 18],   // Hostel B (South-East)
        [-20, 18],  // Hostel C (South-West)
        [24, -18],  // Hostel D (North-East)
      ];
      posX = quadPositions[index][0];
      posZ = quadPositions[index][1];
    } else {
      // General Grid layout for N > 4
      const cols = Math.ceil(Math.sqrt(n));
      const col = index % cols;
      const row = Math.floor(index / cols);
      const rows = Math.ceil(n / cols);
      posX = Number(((col - (cols - 1) / 2) * spacing).toFixed(2));
      posZ = Number(((row - (rows - 1) / 2) * spacing).toFixed(2));
    }

    // B. Calculate Floor Count & Vertical Proportions
    const floorCount = Math.max(1, hostel.floor_count || (hostel.floors?.length ?? 1));
    const floorHeight = 1.9; // Campus view floor clearance
    const buildingHeight = Number((floorCount * floorHeight + 0.8).toFixed(2)); // + plinth & roof parapet

    // C. Structural Wings calculation
    const wings: CampusBuildingWing[] = [];
    let totalWidth = 10;
    const buildingDepth = 10;

    const blocks = hostel.blocks && hostel.blocks.length > 0 ? hostel.blocks : [];

    if (blocks.length > 1) {
      // Multi-wing architectural composition (e.g. Hostel A with 2 blocks, Hostel D with 2 blocks)
      const wingCount = blocks.length;
      let calculatedTotalWidth = 6.0; // Central lobby width

      blocks.forEach((block, bIdx) => {
        const blockFloors = Math.max(1, block.floors?.length ?? floorCount);
        const wingHeight = Number((blockFloors * floorHeight + 0.6).toFixed(2));
        // Sizing scaled by room count: 8m minimum, up to 14m
        const wingWidth = Math.min(14, Math.max(8.5, 7.5 + (block.total_rooms ?? 0) * 0.18));
        const wingDepth = 9.0;

        // Position wings left and right of central lobby
        const sign = bIdx === 0 ? -1 : 1;
        const xOffset = sign * (wingWidth / 2 + 2.5);

        wings.push({
          blockId: block.Block_ID,
          blockName: block.Block_Name,
          gender: block.Gender,
          offset: [Number(xOffset.toFixed(2)), 0, 0],
          dimensions: [Number(wingWidth.toFixed(2)), wingHeight, wingDepth],
          rooms: block.total_rooms ?? 0,
          beds: block.total_beds ?? 0,
          floors: blockFloors,
        });

        calculatedTotalWidth += wingWidth;
      });

      totalWidth = Number(calculatedTotalWidth.toFixed(2));
    } else {
      // Single compact pavilion (e.g. Hostel C with 1 room, Hostel B with 2 rooms)
      const singleBlock = blocks[0];
      const singleWidth = Math.min(13, Math.max(8.5, 7.0 + (hostel.total_rooms ?? 0) * 0.6));
      totalWidth = Number(singleWidth.toFixed(2));

      wings.push({
        blockId: singleBlock?.Block_ID ?? hostel.Hostel_ID,
        blockName: singleBlock?.Block_Name ?? `${hostel.Hostel_Name} Main`,
        gender: singleBlock?.Gender ?? hostel.Hostel_Type,
        offset: [0, 0, 0],
        dimensions: [totalWidth, buildingHeight, buildingDepth],
        rooms: hostel.total_rooms ?? 0,
        beds: hostel.total_beds ?? 0,
        floors: floorCount,
      });
    }

    // D. Occupancy Status
    let occupancyStatus: 'vacant' | 'partially-occupied' | 'fully-occupied' = 'vacant';
    if (hostel.total_beds > 0 && hostel.available_beds === 0) {
      occupancyStatus = 'fully-occupied';
    } else if (hostel.occupied_beds > 0 && hostel.available_beds > 0) {
      occupancyStatus = 'partially-occupied';
    } else {
      occupancyStatus = 'vacant';
    }

    // E. Accent Color by Type
    const isGirls = (hostel.Hostel_Type || '').toLowerCase() === 'girls';
    const accentColor = isGirls ? '#ec4899' : '#0284c7';

    // F. Track overall extents
    const halfW = totalWidth / 2;
    const halfD = buildingDepth / 2;
    minX = Math.min(minX, posX - halfW);
    maxX = Math.max(maxX, posX + halfW);
    minZ = Math.min(minZ, posZ - halfD);
    maxZ = Math.max(maxZ, posZ + halfD);

    buildings.push({
      hostel,
      position3D: [posX, 0, posZ],
      dimensions: [totalWidth, buildingHeight, buildingDepth],
      wings,
      floorCount,
      accentColor,
      occupancyStatus,
    });
  });

  // Calculate safe ground plane with margin
  const campusSpanX = Math.max(70, (maxX - minX) + 30);
  const campusSpanZ = Math.max(70, (maxZ - minZ) + 30);
  const groundDimensions: [number, number] = [
    Number(campusSpanX.toFixed(1)),
    Number(campusSpanZ.toFixed(1)),
  ];

  const suggestedCameraDistance = Math.max(48, Math.min(85, Math.max(campusSpanX, campusSpanZ) * 0.85));

  return {
    buildings,
    groundDimensions,
    campusBounds: {
      minX: Number(minX.toFixed(2)),
      maxX: Number(maxX.toFixed(2)),
      minZ: Number(minZ.toFixed(2)),
      maxZ: Number(maxZ.toFixed(2)),
    },
    cameraTarget: [0, 2.0, 0],
    suggestedCameraDistance: Number(suggestedCameraDistance.toFixed(1)),
  };
}
