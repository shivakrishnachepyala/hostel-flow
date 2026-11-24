/**
 * Test Suite for Dynamic 3D Explorer Layout Engine
 *
 * Verifies algorithmic positioning, double-loaded corridor geometry,
 * dynamic building bounds, determinism, and data safety.
 *
 * Executed via native Node.js test runner:
 * node --test src/utils/explorerLayout.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Room } from '../types';
import type * as LayoutModule from './explorerLayout';

// Cast specifier to string variable to satisfy TypeScript bundler mode while enabling Node.js native ESM execution
const layoutPath = './explorerLayout.ts' as string;
const {
  generateDynamicLayout,
  generateCampusLayout,
  getRoomDimensions,
  parseFloorNumber,
  DEFAULT_ROOM_DIMENSIONS,
  FALLBACK_ROOM_DIMENSIONS,
  DEFAULT_LAYOUT_CONFIG,
} = (await import(layoutPath)) as typeof LayoutModule;

describe('Dynamic 3D Explorer Layout Engine', () => {

  // --- Scenario 1: One room on one floor ---
  it('1. should correctly position one room on one floor', () => {
    const rooms: Partial<Room>[] = [
      { Room_ID: 101, Room_Number: 'A-101', Floor: 1, Room_Type: 'Single', Capacity: 1 },
    ];

    const { rooms: positioned, bounds } = generateDynamicLayout(rooms);

    assert.strictEqual(positioned.length, 1);
    const r = positioned[0];
    assert.strictEqual(r.Room_ID, 101);
    assert.strictEqual(r.Floor, 1);
    assert.strictEqual(r.row, 'south');
    assert.strictEqual(r.rowIndex, 0);

    // X should be centered at 0
    assert.strictEqual(r.position3D[0], 0);
    // Y elevation: floor 0 elevation = 0.75
    assert.strictEqual(r.position3D[1], 0.75);
    // Z: south row = +2.0
    assert.strictEqual(r.position3D[2], 2.0);

    // Dimensions for Single
    assert.deepStrictEqual(r.dimensions, [2.2, 1.4, 2.6]);

    // Bounds
    assert.strictEqual(bounds.floorCount, 1);
    assert.deepStrictEqual(bounds.floors, [1]);
    assert.strictEqual(bounds.highestFloor, 1);
    assert.strictEqual(bounds.lowestFloor, 1);
    assert.strictEqual(bounds.width, DEFAULT_LAYOUT_CONFIG.minBuildingWidth);
    assert.strictEqual(bounds.depth, 7.2);
  });

  // --- Scenario 2: Five rooms across two floors (Block A1 archetype) ---
  it('2. should correctly position five rooms distributed across two floors', () => {
    const rooms: Partial<Room>[] = [
      { Room_ID: 301, Room_Number: '101', Floor: 1, Room_Type: 'Double', Capacity: 2 },
      { Room_ID: 302, Room_Number: '102', Floor: 1, Room_Type: 'Double', Capacity: 2 },
      { Room_ID: 303, Room_Number: '103', Floor: 1, Room_Type: 'Double', Capacity: 2 },
      { Room_ID: 304, Room_Number: '201', Floor: 2, Room_Type: 'Triple', Capacity: 3 },
      { Room_ID: 305, Room_Number: '202', Floor: 2, Room_Type: 'Triple', Capacity: 3 },
    ];

    const { rooms: positioned, bounds } = generateDynamicLayout(rooms);

    assert.strictEqual(positioned.length, 5);
    assert.strictEqual(bounds.floorCount, 2);
    assert.deepStrictEqual(bounds.floors, [1, 2]);
    assert.strictEqual(bounds.roomsPerFloor[1], 3);
    assert.strictEqual(bounds.roomsPerFloor[2], 2);
    assert.strictEqual(bounds.maxRoomsOnAnyFloor, 3);

    // Floor 1: 3 rooms -> South has 2 rooms, North has 1 room
    const floor1South = positioned.filter((r) => r.Floor === 1 && r.row === 'south');
    const floor1North = positioned.filter((r) => r.Floor === 1 && r.row === 'north');
    assert.strictEqual(floor1South.length, 2);
    assert.strictEqual(floor1North.length, 1);

    // South rooms should be at x = -1.5 and x = 1.5, z = 2.0
    assert.strictEqual(floor1South[0].position3D[0], -1.5);
    assert.strictEqual(floor1South[0].position3D[2], 2.0);
    assert.strictEqual(floor1South[1].position3D[0], 1.5);
    assert.strictEqual(floor1South[1].position3D[2], 2.0);

    // North room should be centered at x = 0, z = -2.0
    assert.strictEqual(floor1North[0].position3D[0], 0);
    assert.strictEqual(floor1North[0].position3D[2], -2.0);

    // Floor 2 rooms elevation = 2.45
    const floor2Rooms = positioned.filter((r) => r.Floor === 2);
    assert.strictEqual(floor2Rooms.length, 2);
    floor2Rooms.forEach((r) => {
      assert.strictEqual(r.position3D[1], 2.45);
    });
  });

  // --- Scenario 3: Thirty rooms across three floors (Block A2 / D1 / D2 archetype) ---
  it('3. should correctly position thirty rooms across three floors with 10 rooms per floor', () => {
    const rooms: Partial<Room>[] = [];
    for (let f = 1; f <= 3; f++) {
      for (let i = 1; i <= 10; i++) {
        rooms.push({
          Room_ID: 500 + (f - 1) * 10 + i,
          Room_Number: `A2-${f}${i.toString().padStart(2, '0')}`,
          Floor: f,
          Room_Type: i <= 2 ? 'Single' : i <= 8 ? 'Double' : 'Triple',
          Capacity: i <= 2 ? 1 : i <= 8 ? 2 : 3,
        });
      }
    }

    const { rooms: positioned, bounds } = generateDynamicLayout(rooms);

    assert.strictEqual(positioned.length, 30);
    assert.strictEqual(bounds.floorCount, 3);
    assert.strictEqual(bounds.maxRoomsOnAnyFloor, 10);
    // In row: ceil(10/2) = 5 rooms. Width = 5 * 3.0 + 1.2 = 16.2
    assert.strictEqual(bounds.width, 16.2);
    assert.strictEqual(bounds.height, 5.1);

    // Each floor must have exactly 5 South and 5 North rooms
    for (let f = 1; f <= 3; f++) {
      const south = positioned.filter((r) => r.Floor === f && r.row === 'south');
      const north = positioned.filter((r) => r.Floor === f && r.row === 'north');
      assert.strictEqual(south.length, 5);
      assert.strictEqual(north.length, 5);

      const expectedX = [-6.0, -3.0, 0.0, 3.0, 6.0];
      south.forEach((r, idx) => {
        assert.strictEqual(r.position3D[0], expectedX[idx]);
        assert.strictEqual(r.position3D[2], 2.0);
      });
      north.forEach((r, idx) => {
        assert.strictEqual(r.position3D[0], expectedX[idx]);
        assert.strictEqual(r.position3D[2], -2.0);
      });
    }
  });

  // --- Scenario 4: One hundred rooms across multiple floors ---
  it('4. should scale correctly to one hundred rooms across multiple floors', () => {
    const rooms: Partial<Room>[] = [];
    const floorCount = 5;
    const roomsPerFloor = 20;

    for (let f = 1; f <= floorCount; f++) {
      for (let i = 1; i <= roomsPerFloor; i++) {
        rooms.push({
          Room_ID: f * 100 + i,
          Room_Number: `${f}-${i.toString().padStart(2, '0')}`,
          Floor: f,
          Room_Type: 'Double',
        });
      }
    }

    const { rooms: positioned, bounds } = generateDynamicLayout(rooms);

    assert.strictEqual(positioned.length, 100);
    assert.strictEqual(bounds.floorCount, 5);
    assert.strictEqual(bounds.maxRoomsOnAnyFloor, 20);
    // 10 rooms per row -> 10 * 3.0 + 1.2 = 31.2
    assert.strictEqual(bounds.width, 31.2);

    // Verify all coordinates are finite and bounded
    positioned.forEach((r) => {
      assert.ok(Number.isFinite(r.position3D[0]));
      assert.ok(Number.isFinite(r.position3D[1]));
      assert.ok(Number.isFinite(r.position3D[2]));
    });
  });

  // --- Scenario 5: Non-contiguous floors ---
  it('5. should handle non-contiguous floor numbers gracefully', () => {
    const rooms: Partial<Room>[] = [
      { Room_ID: 101, Room_Number: '101', Floor: 1, Room_Type: 'Single' },
      { Room_ID: 301, Room_Number: '301', Floor: 3, Room_Type: 'Double' },
      { Room_ID: 701, Room_Number: '701', Floor: 7, Room_Type: 'Triple' },
    ];

    const { rooms: positioned, bounds } = generateDynamicLayout(rooms);

    assert.strictEqual(positioned.length, 3);
    assert.deepStrictEqual(bounds.floors, [1, 3, 7]);
    assert.strictEqual(bounds.lowestFloor, 1);
    assert.strictEqual(bounds.highestFloor, 7);
    assert.strictEqual(bounds.floorCount, 3);

    // Relative elevations: Floor 1 index 0 -> 0.75, Floor 3 index 1 -> 2.45, Floor 7 index 2 -> 4.15
    const r1 = positioned.find((r) => r.Floor === 1)!;
    const r3 = positioned.find((r) => r.Floor === 3)!;
    const r7 = positioned.find((r) => r.Floor === 7)!;

    assert.strictEqual(r1.position3D[1], 0.75);
    assert.strictEqual(r3.position3D[1], 2.45);
    assert.strictEqual(r7.position3D[1], 4.15);
  });

  // --- Scenario 6: Empty input ---
  it('6. should handle empty input without exceptions or NaN', () => {
    const { rooms: positioned, bounds } = generateDynamicLayout([]);

    assert.strictEqual(positioned.length, 0);
    assert.strictEqual(bounds.floorCount, 0);
    assert.deepStrictEqual(bounds.floors, []);
    assert.strictEqual(bounds.highestFloor, 0);
    assert.strictEqual(bounds.lowestFloor, 0);
    assert.strictEqual(bounds.maxRoomsOnAnyFloor, 0);
    assert.strictEqual(bounds.width, DEFAULT_LAYOUT_CONFIG.minBuildingWidth);

    // Verify all bound values are finite numbers
    assert.ok(Number.isFinite(bounds.width));
    assert.ok(Number.isFinite(bounds.depth));
    assert.ok(Number.isFinite(bounds.height));
    assert.ok(!Number.isNaN(bounds.cameraTarget[0]));
    assert.ok(!Number.isNaN(bounds.cameraTarget[1]));
    assert.ok(!Number.isNaN(bounds.cameraTarget[2]));
  });

  // --- Scenario 7: Unknown room type ---
  it('7. should fall back to safe default dimensions for unknown room types', () => {
    const rooms: Partial<Room>[] = [
      { Room_ID: 1, Room_Number: 'U1', Floor: 1, Room_Type: 'Executive Suite' },
      { Room_ID: 2, Room_Number: 'U2', Floor: 1, Room_Type: null },
      { Room_ID: 3, Room_Number: 'U3', Floor: 1, Room_Type: '' },
    ];

    const { rooms: positioned } = generateDynamicLayout(rooms);

    assert.strictEqual(positioned.length, 3);
    positioned.forEach((r) => {
      assert.deepStrictEqual(r.dimensions, FALLBACK_ROOM_DIMENSIONS);
    });
  });

  // --- Scenario 8: Uneven number of rooms per floor ---
  it('8. should independently center rows on floors with uneven room counts', () => {
    const rooms: Partial<Room>[] = [
      // Floor 1: 7 rooms (4 South, 3 North)
      { Room_ID: 1, Room_Number: '101', Floor: 1 },
      { Room_ID: 2, Room_Number: '102', Floor: 1 },
      { Room_ID: 3, Room_Number: '103', Floor: 1 },
      { Room_ID: 4, Room_Number: '104', Floor: 1 },
      { Room_ID: 5, Room_Number: '105', Floor: 1 },
      { Room_ID: 6, Room_Number: '106', Floor: 1 },
      { Room_ID: 7, Room_Number: '107', Floor: 1 },
    ];

    const { rooms: positioned } = generateDynamicLayout(rooms);

    const south = positioned.filter((r) => r.row === 'south');
    const north = positioned.filter((r) => r.row === 'north');

    assert.strictEqual(south.length, 4);
    assert.strictEqual(north.length, 3);

    // 4 south rooms: (i - 1.5) * 3 -> [-4.5, -1.5, 1.5, 4.5]
    assert.deepStrictEqual(
      south.map((r) => r.position3D[0]),
      [-4.5, -1.5, 1.5, 4.5]
    );

    // 3 north rooms: (i - 1) * 3 -> [-3.0, 0.0, 3.0]
    assert.deepStrictEqual(
      north.map((r) => r.position3D[0]),
      [-3.0, 0.0, 3.0]
    );

    // Average X of both rows should be exactly 0 (symmetric centering)
    const avgSouth = south.reduce((sum, r) => sum + r.position3D[0], 0) / south.length;
    const avgNorth = north.reduce((sum, r) => sum + r.position3D[0], 0) / north.length;
    assert.strictEqual(Math.abs(avgSouth) < 1e-6, true);
    assert.strictEqual(Math.abs(avgNorth) < 1e-6, true);
  });

  // --- Scenario 9: Deterministic coordinate generation ---
  it('9. should generate identical positions regardless of input array order', () => {
    const roomsA: Partial<Room>[] = [
      { Room_ID: 101, Room_Number: 'A-101', Floor: 1, Room_Type: 'Single' },
      { Room_ID: 102, Room_Number: 'A-102', Floor: 1, Room_Type: 'Double' },
      { Room_ID: 201, Room_Number: 'A-201', Floor: 2, Room_Type: 'Triple' },
      { Room_ID: 202, Room_Number: 'A-202', Floor: 2, Room_Type: 'Single' },
    ];

    // Shuffled version of roomsA
    const roomsB: Partial<Room>[] = [
      { Room_ID: 202, Room_Number: 'A-202', Floor: 2, Room_Type: 'Single' },
      { Room_ID: 101, Room_Number: 'A-101', Floor: 1, Room_Type: 'Single' },
      { Room_ID: 201, Room_Number: 'A-201', Floor: 2, Room_Type: 'Triple' },
      { Room_ID: 102, Room_Number: 'A-102', Floor: 1, Room_Type: 'Double' },
    ];

    const resA = generateDynamicLayout(roomsA);
    const resB = generateDynamicLayout(roomsB);

    assert.strictEqual(resA.rooms.length, resB.rooms.length);

    for (let i = 0; i < resA.rooms.length; i++) {
      const roomA = resA.rooms[i];
      const roomB = resB.rooms.find((r) => r.Room_ID === roomA.Room_ID)!;
      assert.ok(roomB, `Room ${roomA.Room_ID} must exist in resB`);
      assert.deepStrictEqual(roomA.position3D, roomB.position3D);
      assert.deepStrictEqual(roomA.dimensions, roomB.dimensions);
      assert.strictEqual(roomA.Floor, roomB.Floor);
      assert.strictEqual(roomA.row, roomB.row);
    }
  });

  // --- Scenario 10: No overlapping positions (AABB collision test) ---
  it('10. should ensure zero physical collisions between any pair of room bounding boxes', () => {
    const rooms: Partial<Room>[] = [];
    // Dense building with 3 floors and 10 rooms per floor of mixed sizes
    for (let f = 1; f <= 3; f++) {
      for (let i = 1; i <= 10; i++) {
        rooms.push({
          Room_ID: f * 100 + i,
          Room_Number: `${f}-${i.toString().padStart(2, '0')}`,
          Floor: f,
          Room_Type: i % 3 === 0 ? 'Triple' : i % 2 === 0 ? 'Double' : 'Single',
        });
      }
    }

    const { rooms: positioned } = generateDynamicLayout(rooms);

    // Helper: Checks if two 3D Axis-Aligned Bounding Boxes strictly overlap
    function boxesOverlap(
      posA: [number, number, number],
      dimA: [number, number, number],
      posB: [number, number, number],
      dimB: [number, number, number]
    ): boolean {
      const [wA, hA, dA] = dimA;
      const [wB, hB, dB] = dimB;

      const minXA = posA[0] - wA / 2;
      const maxXA = posA[0] + wA / 2;
      const minYA = posA[1] - hA / 2;
      const maxYA = posA[1] + hA / 2;
      const minZA = posA[2] - dA / 2;
      const maxZA = posA[2] + dA / 2;

      const minXB = posB[0] - wB / 2;
      const maxXB = posB[0] + wB / 2;
      const minYB = posB[1] - hB / 2;
      const maxYB = posB[1] + hB / 2;
      const minZB = posB[2] - dB / 2;
      const maxZB = posB[2] + dB / 2;

      // Allow 0.01 tolerance for adjacent faces
      const xOverlap = minXA < maxXB - 0.01 && maxXA > minXB + 0.01;
      const yOverlap = minYA < maxYB - 0.01 && maxYA > minYB + 0.01;
      const zOverlap = minZA < maxZB - 0.01 && maxZA > minZB + 0.01;

      return xOverlap && yOverlap && zOverlap;
    }

    // Pairwise collision test across all 30 rooms
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const r1 = positioned[i];
        const r2 = positioned[j];

        const collides = boxesOverlap(r1.position3D, r1.dimensions, r2.position3D, r2.dimensions);
        assert.strictEqual(
          collides,
          false,
          `Room ${r1.Room_Number} collides with Room ${r2.Room_Number}`
        );
      }
    }
  });

  // --- Scenario 11: Invalid floor input handling ---
  it('11. should safely infer or default invalid or missing floor inputs', () => {
    assert.strictEqual(parseFloorNumber(null, 'A-201'), 2);
    assert.strictEqual(parseFloorNumber(undefined, 'D2-305'), 3);
    assert.strictEqual(parseFloorNumber(-1, '104'), 1);
    assert.strictEqual(parseFloorNumber('invalid', '405'), 4);
    assert.strictEqual(parseFloorNumber(null, 'Office'), 1); // cannot infer -> fallback 1

    const rooms: Partial<Room>[] = [
      { Room_ID: 1, Room_Number: 'A-201', Floor: null },
      { Room_ID: 2, Room_Number: '302', Floor: undefined },
      { Room_ID: 3, Room_Number: 'Special', Floor: (null as unknown) as number },
    ];

    const { rooms: positioned } = generateDynamicLayout(rooms);
    assert.strictEqual(positioned.length, 3);
    assert.strictEqual(positioned.find((r) => r.Room_ID === 1)?.Floor, 2);
    assert.strictEqual(positioned.find((r) => r.Room_ID === 2)?.Floor, 3);
    assert.strictEqual(positioned.find((r) => r.Room_ID === 3)?.Floor, 1);
  });

  // --- Scenario 12: Correct building bounds ---
  it('12. should calculate complete, structurally consistent building bounds', () => {
    const rooms: Partial<Room>[] = [
      { Room_ID: 1, Room_Number: '101', Floor: 1, Room_Type: 'Single' },
      { Room_ID: 2, Room_Number: '102', Floor: 1, Room_Type: 'Double' },
      { Room_ID: 3, Room_Number: '201', Floor: 2, Room_Type: 'Triple' },
    ];

    const { bounds } = generateDynamicLayout(rooms);

    assert.ok(bounds.width >= DEFAULT_LAYOUT_CONFIG.minBuildingWidth);
    assert.strictEqual(bounds.depth, 7.2);
    assert.strictEqual(bounds.height, 3.4); // 2 floors * 1.7
    assert.strictEqual(bounds.floorCount, 2);
    assert.strictEqual(bounds.highestFloor, 2);
    assert.strictEqual(bounds.lowestFloor, 1);

    // Foundation slab must be larger than building width & depth
    assert.ok(bounds.foundationDimensions[0] > bounds.width);
    assert.ok(bounds.foundationDimensions[2] > bounds.depth);

    // Storey slab should match building width & depth
    assert.strictEqual(bounds.slabDimensions[0], bounds.width);
    assert.strictEqual(bounds.slabDimensions[2], bounds.depth);

    // Camera target should be centered at midpoint height
    assert.strictEqual(bounds.cameraTarget[0], 0);
    assert.strictEqual(bounds.cameraTarget[1], 1.7);
    assert.strictEqual(bounds.cameraTarget[2], 0);

    // Suggested camera distance should be reasonable
    assert.ok(bounds.suggestedCameraDistance >= 15);

    // Extents should enclose room coordinates
    assert.ok(bounds.extents.maxX > bounds.extents.minX);
    assert.ok(bounds.extents.maxY > bounds.extents.minY);
    assert.ok(bounds.extents.maxZ > bounds.extents.minZ);
  });

  // --- Scenario 13: Empty campus handling ---
  it('13. should handle empty campus gracefully', () => {
    const res = generateCampusLayout([]);
    assert.strictEqual(res.buildings.length, 0);
    assert.deepStrictEqual(res.cameraTarget, [0, 2, 0]);
    assert.ok(res.groundDimensions[0] >= 50);
  });

  // --- Scenario 14: Symmetrical 4-hostel quadrangle layout (Actual DB dataset) ---
  it('14. should arrange 4 actual campus hostels in a quadrangle without collisions', () => {
    const mockHostels: LayoutModule.CampusHostelData[] = [
      {
        Hostel_ID: 3,
        Hostel_Name: 'Hostel C',
        Hostel_Type: 'Girls',
        Location: 'North Campus',
        Capacity: 150,
        blocks: [
          {
            Block_ID: 1,
            Block_Name: 'Block C1',
            Gender: 'Female',
            Capacity: 50,
            total_rooms: 1,
            total_beds: 2,
            occupied_beds: 0,
            available_beds: 2,
            occupancy_rate: 0.0,
            floors: [1],
          },
        ],
        total_blocks: 1,
        total_rooms: 1,
        total_beds: 2,
        occupied_beds: 0,
        available_beds: 2,
        occupancy_rate: 0.0,
        floors: [1],
        floor_count: 1,
      },
      {
        Hostel_ID: 1,
        Hostel_Name: 'Hostel A',
        Hostel_Type: 'Boys',
        Location: 'North Campus',
        Capacity: 120,
        blocks: [
          {
            Block_ID: 201,
            Block_Name: 'Block A1',
            Gender: 'Male',
            Capacity: 60,
            total_rooms: 5,
            total_beds: 12,
            occupied_beds: 4,
            available_beds: 8,
            occupancy_rate: 33.3,
            floors: [1, 2],
          },
          {
            Block_ID: 202,
            Block_Name: 'Block A2',
            Gender: 'Male',
            Capacity: 60,
            total_rooms: 30,
            total_beds: 60,
            occupied_beds: 0,
            available_beds: 60,
            occupancy_rate: 0.0,
            floors: [1, 2, 3],
          },
        ],
        total_blocks: 2,
        total_rooms: 35,
        total_beds: 72,
        occupied_beds: 4,
        available_beds: 68,
        occupancy_rate: 5.6,
        floors: [1, 2, 3],
        floor_count: 3,
      },
      {
        Hostel_ID: 2,
        Hostel_Name: 'Hostel B',
        Hostel_Type: 'Girls',
        Location: 'South Campus',
        Capacity: 100,
        blocks: [
          {
            Block_ID: 203,
            Block_Name: 'Block B1',
            Gender: 'Female',
            Capacity: 100,
            total_rooms: 2,
            total_beds: 4,
            occupied_beds: 2,
            available_beds: 2,
            occupancy_rate: 50.0,
            floors: [1],
          },
        ],
        total_blocks: 1,
        total_rooms: 2,
        total_beds: 4,
        occupied_beds: 2,
        available_beds: 2,
        occupancy_rate: 50.0,
        floors: [1],
        floor_count: 1,
      },
      {
        Hostel_ID: 4,
        Hostel_Name: 'Hostel D',
        Hostel_Type: 'Boys',
        Location: 'North Campus',
        Capacity: 150,
        blocks: [
          {
            Block_ID: 204,
            Block_Name: 'Block D1',
            Gender: 'Male',
            Capacity: 75,
            total_rooms: 30,
            total_beds: 75,
            occupied_beds: 0,
            available_beds: 75,
            occupancy_rate: 0.0,
            floors: [1, 2, 3],
          },
          {
            Block_ID: 205,
            Block_Name: 'Block D2',
            Gender: 'Male',
            Capacity: 75,
            total_rooms: 30,
            total_beds: 75,
            occupied_beds: 0,
            available_beds: 75,
            occupancy_rate: 0.0,
            floors: [1, 2, 3],
          },
        ],
        total_blocks: 2,
        total_rooms: 60,
        total_beds: 150,
        occupied_beds: 0,
        available_beds: 150,
        occupancy_rate: 0.0,
        floors: [1, 2, 3],
        floor_count: 3,
      },
    ];

    const campus = generateCampusLayout(mockHostels);
    assert.strictEqual(campus.buildings.length, 4);

    // Multi-block wing checks (Alphabetical IDs: 1=A, 2=B, 3=C, 4=D)
    const hostelA = campus.buildings.find((b) => b.hostel.Hostel_ID === 1)!;
    const hostelB = campus.buildings.find((b) => b.hostel.Hostel_ID === 2)!;
    const hostelC = campus.buildings.find((b) => b.hostel.Hostel_ID === 3)!;
    const hostelD = campus.buildings.find((b) => b.hostel.Hostel_ID === 4)!;

    assert.ok(hostelA);
    assert.strictEqual(hostelA.wings.length, 2);
    assert.strictEqual(hostelA.floorCount, 3);
    assert.strictEqual(hostelA.occupancyStatus, 'partially-occupied');
    assert.deepStrictEqual(hostelA.position3D, [-24, 0, -18]);

    assert.ok(hostelB);
    assert.strictEqual(hostelB.wings.length, 1);
    assert.strictEqual(hostelB.floorCount, 1);
    assert.strictEqual(hostelB.occupancyStatus, 'partially-occupied');
    assert.deepStrictEqual(hostelB.position3D, [20, 0, 18]);

    assert.ok(hostelC);
    assert.strictEqual(hostelC.wings.length, 1);
    assert.strictEqual(hostelC.floorCount, 1);
    assert.strictEqual(hostelC.occupancyStatus, 'vacant');
    assert.deepStrictEqual(hostelC.position3D, [-20, 0, 18]);

    assert.ok(hostelD);
    assert.strictEqual(hostelD.wings.length, 2);
    assert.strictEqual(hostelD.floorCount, 3);
    assert.strictEqual(hostelD.occupancyStatus, 'vacant');
    assert.deepStrictEqual(hostelD.position3D, [24, 0, -18]);

    // 2D Ground Footprint collision test
    for (let i = 0; i < campus.buildings.length; i++) {
      for (let j = i + 1; j < campus.buildings.length; j++) {
        const b1 = campus.buildings[i];
        const b2 = campus.buildings[j];

        const [x1, , z1] = b1.position3D;
        const [w1, , d1] = b1.dimensions;
        const [x2, , z2] = b2.position3D;
        const [w2, , d2] = b2.dimensions;

        const xOverlap = Math.abs(x1 - x2) < (w1 / 2 + w2 / 2);
        const zOverlap = Math.abs(z1 - z2) < (d1 / 2 + d2 / 2);

        assert.ok(
          !(xOverlap && zOverlap),
          `Building ${b1.hostel.Hostel_Name} overlaps with ${b2.hostel.Hostel_Name}`
        );
      }
    }
  });

  // --- Scenario 15: Arbitrary N scaling ---
  it('15. should scale deterministically for arbitrary N hostels', () => {
    const single = generateCampusLayout([
      {
        Hostel_ID: 1,
        Hostel_Name: 'Solo',
        Hostel_Type: 'Boys',
        Location: 'Main',
        Capacity: 10,
        blocks: [],
        total_blocks: 1,
        total_rooms: 5,
        total_beds: 10,
        occupied_beds: 0,
        available_beds: 10,
        occupancy_rate: 0,
        floors: [1],
        floor_count: 1,
      },
    ]);
    assert.strictEqual(single.buildings.length, 1);
    assert.deepStrictEqual(single.buildings[0].position3D, [0, 0, 0]);

    // Six hostels grid test
    const sixHostels: LayoutModule.CampusHostelData[] = Array.from({ length: 6 }, (_, i) => ({
      Hostel_ID: i + 1,
      Hostel_Name: `Hostel ${i + 1}`,
      Hostel_Type: i % 2 === 0 ? 'Girls' : 'Boys',
      Location: 'Campus',
      Capacity: 50,
      blocks: [],
      total_blocks: 1,
      total_rooms: 10,
      total_beds: 20,
      occupied_beds: 5,
      available_beds: 15,
      occupancy_rate: 25,
      floors: [1, 2],
      floor_count: 2,
    }));

    const sixRes = generateCampusLayout(sixHostels);
    assert.strictEqual(sixRes.buildings.length, 6);
    // Check no overlaps
    for (let i = 0; i < sixRes.buildings.length; i++) {
      for (let j = i + 1; j < sixRes.buildings.length; j++) {
        const b1 = sixRes.buildings[i];
        const b2 = sixRes.buildings[j];
        const [x1, , z1] = b1.position3D;
        const [w1, , d1] = b1.dimensions;
        const [x2, , z2] = b2.position3D;
        const [w2, , d2] = b2.dimensions;
        const xOverlap = Math.abs(x1 - x2) < (w1 / 2 + w2 / 2);
        const zOverlap = Math.abs(z1 - z2) < (d1 / 2 + d2 / 2);
        assert.ok(
          !(xOverlap && zOverlap),
          `Hostel ${b1.hostel.Hostel_ID} overlaps with ${b2.hostel.Hostel_ID}`
        );
      }
    }
  });
});
