import { generateDynamicLayout, LayoutResult, DynamicallyPositionedRoom } from '../utils/explorerLayout';
import defaultRoomsData from './defaultBlockA1Rooms.json';

/**
 * Authoritative default 30-room inventory for Block A1 (Hostel A).
 * Matches live MySQL database state:
 * - 30 rooms total across 3 floors (10 rooms and 20 beds per floor)
 * - 60 physical beds total
 * - Real occupancy status (4 occupied, 56 available)
 */
export const DEFAULT_BLOCK_A1_ROOMS: any[] = defaultRoomsData;

/**
 * Pre-computed deterministic 3D spatial layout for Block A1.
 * Provides instant zero-latency initialization for 3D components.
 */
export const DEFAULT_BLOCK_A1_LAYOUT: LayoutResult = generateDynamicLayout(DEFAULT_BLOCK_A1_ROOMS);
