import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { DynamicallyPositionedRoom, BuildingBounds, generateDynamicLayout } from '../../utils/explorerLayout';
import { IllustrativeRoom } from '../../data/illustrativeHostel';
import { RotateCcw } from 'lucide-react';

export type Any3DRoom = DynamicallyPositionedRoom | IllustrativeRoom;

export interface Building3DProps {
  rooms: Any3DRoom[];
  bounds?: BuildingBounds;
  selectedFloor: number | 'all';
  selectedRoom: Any3DRoom | null;
  onSelectRoom: (room: any) => void;
  cutawayMode?: boolean;
  onToggleCutaway?: () => void;
  className?: string;
}

// Status color helper for room indicators
const getStatusTheme = (status: DynamicallyPositionedRoom['status']) => {
  switch (status) {
    case 'available':
      return {
        accent: '#10b981', // Emerald
        tileGlow: '#059669',
        blanket: '#10b981',
        label: 'Available',
      };
    case 'partially-occupied':
      return {
        accent: '#f59e0b', // Amber
        tileGlow: '#d97706',
        blanket: '#f59e0b',
        label: 'Partially Free',
      };
    case 'fully-occupied':
      return {
        accent: '#ef4444', // Rose Red
        tileGlow: '#dc2626',
        blanket: '#ef4444',
        label: 'Occupied',
      };
    case 'maintenance':
      return {
        accent: '#64748b', // Slate
        tileGlow: '#475569',
        blanket: '#64748b',
        label: 'Maintenance',
      };
    default:
      return {
        accent: '#10b981',
        tileGlow: '#059669',
        blanket: '#10b981',
        label: 'Available',
      };
  }
};

interface RoomMeshProps {
  room: Any3DRoom;
  floorOffset: number;
  isSelected: boolean;
  isDimmed: boolean;
  cutawayMode: boolean;
  onClick: () => void;
}

/**
 * Procedural Architectural Room Module
 * Generates an architectural room unit with walls, doorway, window, furniture,
 * and stable hitbox. Automatically handles row orientation (South vs North)
 * so doors always open toward the central corridor spine.
 */
const RoomMesh: React.FC<RoomMeshProps> = ({
  room,
  floorOffset,
  isSelected,
  isDimmed,
  cutawayMode,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const theme = getStatusTheme(room.status);

  const [width, height, depth] = room.dimensions;

  // Determine row orientation:
  // South row rooms (Z > 0) face North toward corridor (Z = 0)
  // North row rooms (Z < 0) face South toward corridor (Z = 0)
  const isSouth = ('row' in room && room.row === 'south') || (room.position3D[2] > 0);

  // Unified world position including dynamic floor explosion offset
  const posX = room.position3D[0];
  const posY = room.position3D[1] + floorOffset;
  const posZ = room.position3D[2];

  return (
    <group
      position={[posX, posY, posZ]}
      // Rotating 180 deg around Y for South row ensures:
      // - Doorway (at local +Z) always faces inward into central corridor
      // - Window (at local -Z) always faces outward to the exterior
      rotation={[0, isSouth ? Math.PI : 0, 0]}
    >
      {/* 1. Room Floor Tile Finish (Sits flush on top of floor slab) */}
      <mesh position={[0, -height / 2 + 0.015, 0]} receiveShadow>
        <boxGeometry args={[width - 0.04, 0.03, depth - 0.04]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : hovered ? '#60a5fa' : '#f8fafc'}
          roughness={0.5}
          metalness={0.05}
        />
      </mesh>

      {/* Decorative Wall Accent Trim Stripe on Floor */}
      <mesh position={[0, -height / 2 + 0.035, 0]}>
        <boxGeometry args={[width - 0.08, 0.005, depth - 0.08]} />
        <meshBasicMaterial
          color={theme.accent}
          transparent
          opacity={isDimmed ? 0.2 : hovered || isSelected ? 0.95 : 0.6}
        />
      </mesh>

      {/* 2. Architectural Walls (Solid, non-coplanar primitives) */}
      {/* Left Partition Wall (-X) */}
      <mesh position={[-width / 2 + 0.03, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, cutawayMode ? height * 0.75 : height * 0.92, depth - 0.08]} />
        <meshStandardMaterial
          color={isDimmed ? '#94a3b8' : '#e2e8f0'}
          roughness={0.8}
          transparent={isDimmed}
          opacity={isDimmed ? 0.25 : 1.0}
        />
      </mesh>

      {/* Right Partition Wall (+X) */}
      <mesh position={[width / 2 - 0.03, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, cutawayMode ? height * 0.75 : height * 0.92, depth - 0.08]} />
        <meshStandardMaterial
          color={isDimmed ? '#94a3b8' : '#e2e8f0'}
          roughness={0.8}
          transparent={isDimmed}
          opacity={isDimmed ? 0.25 : 1.0}
        />
      </mesh>

      {/* Exterior Facade (Local -Z, facing exterior) */}
      {cutawayMode ? (
        /* Open Architectural Cutaway View: Low balcony sill + translucent glass railing */
        <group position={[0, 0, -depth / 2 + 0.04]}>
          {/* Low Architectural Sill Wall */}
          <mesh position={[0, -height / 2 + 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[width - 0.04, 0.32, 0.08]} />
            <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          {/* Architectural Balcony Glass Railing */}
          <mesh position={[0, -height / 2 + 0.45, 0]}>
            <boxGeometry args={[width - 0.08, 0.36, 0.02]} />
            <meshPhysicalMaterial
              color="#38bdf8"
              transparent
              opacity={0.35}
              roughness={0.1}
              transmission={0.5}
              thickness={0.02}
            />
          </mesh>
          {/* Corner Structural Pillars */}
          <mesh position={[-width / 2 + 0.04, 0.04, 0]} castShadow>
            <boxGeometry args={[0.08, height * 0.9, 0.08]} />
            <meshStandardMaterial color="#64748b" roughness={0.6} />
          </mesh>
          <mesh position={[width / 2 - 0.04, 0.04, 0]} castShadow>
            <boxGeometry args={[0.08, height * 0.9, 0.08]} />
            <meshStandardMaterial color="#64748b" roughness={0.6} />
          </mesh>
        </group>
      ) : (
        /* Enclosed Exterior Facade: Full Height Wall with Architectural Window */
        <group position={[0, 0, -depth / 2 + 0.04]}>
          <mesh position={[-width * 0.35, 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.3, height * 0.92, 0.08]} />
            <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          <mesh position={[width * 0.35, 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.3, height * 0.92, 0.08]} />
            <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          <mesh position={[0, -height * 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.42, height * 0.34, 0.08]} />
            <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          <mesh position={[0, height * 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.42, height * 0.24, 0.08]} />
            <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#cbd5e1'} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[width * 0.4, height * 0.38, 0.02]} />
            <meshPhysicalMaterial
              color="#38bdf8"
              transparent
              opacity={0.5}
              roughness={0.1}
              transmission={0.4}
              thickness={0.02}
            />
          </mesh>
        </group>
      )}

      {/* Corridor Wall with Entrance Doorway (Local +Z, facing corridor spine) */}
      <group position={[0, 0, depth / 2 - 0.04]}>
        {cutawayMode ? (
          /* Cutaway Corridor: Low architectural partition with doorway archway opening */
          <group>
            {/* Low Corridor Partition */}
            <mesh position={[-width * 0.25, -height / 2 + 0.22, 0]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.5, 0.44, 0.06]} />
              <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#e2e8f0'} roughness={0.8} />
            </mesh>
            {/* Doorway Header Lintel */}
            <mesh position={[width * 0.25, height * 0.38, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.54, height * 0.24, 0.06]} />
              <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#cbd5e1'} roughness={0.8} />
            </mesh>
            {/* Open Door Frame */}
            <mesh position={[width * 0.12, -0.05, 0.1]} rotation={[0, -0.6, 0]}>
              <boxGeometry args={[0.46, height * 0.72, 0.03]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
          </group>
        ) : (
          /* Full Enclosed Corridor Wall */
          <group>
            <mesh position={[-width * 0.22, 0.04, 0]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.54, height * 0.92, 0.08]} />
              <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#e2e8f0'} roughness={0.8} />
            </mesh>
            <mesh position={[width * 0.25, height * 0.38, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.54, height * 0.24, 0.08]} />
              <meshStandardMaterial color={isDimmed ? '#94a3b8' : '#e2e8f0'} roughness={0.8} />
            </mesh>
            <mesh position={[width * 0.12, 0, 0.12]} rotation={[0, -0.45, 0]}>
              <boxGeometry args={[0.48, height * 0.78, 0.04]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
          </group>
        )}
      </group>

      {/* 3. Detailed Physical Furniture Inside Room */}
      {!isDimmed && (
        <group position={[0, -height / 2 + 0.03, 0]}>
          {/* Physical Wooden Beds with Occupancy Blankets */}
          {(() => {
            const rawBeds = 'beds' in room && Array.isArray(room.beds) ? room.beds : undefined;
            const physicalBeds = rawBeds && rawBeds.length > 0
              ? rawBeds
              : Array.from({ length: Math.min(room.Capacity ?? 0, 3) }).map((_, i) => ({
                  Bed_ID: room.Room_ID * 10 + i + 1,
                  Bed_Number: String.fromCharCode(65 + i), // A, B, C
                  Bed_Type: 'Single',
                  Bed_Status: i < (room.occupiedBeds ?? 0) ? 'Occupied' : 'Available',
                  is_occupied: i < (room.occupiedBeds ?? 0),
                }));

            const bedCount = physicalBeds.length;
            const bedWidth = 0.68;
            const bedLen = 1.35;

            return physicalBeds.map((bed: any, i: number) => {
              let xPos = 0;
              if (bedCount === 1) {
                xPos = 0;
              } else if (bedCount === 2) {
                xPos = i === 0 ? -width / 2 + 0.48 : width / 2 - 0.48;
              } else {
                xPos = i === 0 ? -width / 2 + 0.48 : i === 1 ? 0 : width / 2 - 0.48;
              }

              const isBedOccupied = bed.is_occupied || bed.Bed_Status === 'Occupied';
              const bedBlanketColor = room.status === 'maintenance' || bed.Bed_Status === 'Maintenance'
                ? '#64748b'
                : isBedOccupied
                ? '#ef4444'
                : '#10b981';

              return (
                <group key={`bed-${bed.Bed_ID || i}`} position={[xPos, 0, -0.15]}>
                  {/* Bed Frame */}
                  <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
                    <boxGeometry args={[bedWidth, 0.08, bedLen]} />
                    <meshStandardMaterial color="#451a03" roughness={0.7} />
                  </mesh>
                  {/* Headboard */}
                  <mesh position={[0, 0.28, -bedLen / 2 + 0.03]} castShadow>
                    <boxGeometry args={[bedWidth, 0.32, 0.06]} />
                    <meshStandardMaterial color="#451a03" roughness={0.7} />
                  </mesh>
                  {/* Mattress */}
                  <mesh position={[0, 0.18, 0]}>
                    <boxGeometry args={[bedWidth - 0.06, 0.12, bedLen - 0.08]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.3} />
                  </mesh>
                  {/* Blanket with Live Status Color */}
                  <mesh position={[0, 0.19, bedLen * 0.12]}>
                    <boxGeometry args={[bedWidth - 0.04, 0.13, bedLen * 0.6]} />
                    <meshStandardMaterial color={bedBlanketColor} roughness={0.5} />
                  </mesh>
                  {/* Pillow */}
                  <mesh position={[0, 0.26, -bedLen / 2 + 0.22]}>
                    <boxGeometry args={[bedWidth * 0.65, 0.06, 0.26]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.2} />
                  </mesh>
                </group>
              );
            });
          })()}

          {/* Study Desk against Window Wall */}
          <group position={[0, 0, -depth / 2 + 0.55]}>
            <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.45, 0.04, 0.48]} />
              <meshStandardMaterial color="#5c3818" roughness={0.6} />
            </mesh>
            <mesh position={[-width * 0.2, 0.16, 0]}>
              <boxGeometry args={[0.04, 0.32, 0.44]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[width * 0.2, 0.16, 0]}>
              <boxGeometry args={[0.04, 0.32, 0.44]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Chair */}
            <mesh position={[0, 0.22, 0.28]}>
              <boxGeometry args={[0.32, 0.04, 0.32]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
          </group>

          {/* Wardrobe Storage Unit */}
          <mesh position={[-width / 2 + 0.26, 0.52, depth / 2 - 0.38]} castShadow receiveShadow>
            <boxGeometry args={[0.38, 1.04, 0.48]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* 4. Billboard Room Label Facing Active Camera */}
      <Billboard position={[0, height / 2 + 0.35, 0]}>
        <Text
          fontSize={0.24}
          color={isSelected ? '#38bdf8' : hovered ? '#ffffff' : '#f1f5f9'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#090d16"
        >
          {room.Room_Number}
        </Text>
      </Billboard>

      {/* 5. Clean Non-Intersecting Selection Framing */}
      {isSelected && (
        <group>
          {/* Luminous Floor Frame */}
          <mesh position={[0, -height / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.min(width, depth) * 0.4, Math.min(width, depth) * 0.48, 32]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
          {/* Ceiling Downlight Halo */}
          <pointLight position={[0, height / 2 - 0.2, 0]} intensity={0.9} color="#38bdf8" distance={4} />
        </group>
      )}

      {/* 6. Click Interaction Hitbox (Invisible, zero coplanar artifacts) */}
      <mesh
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};

/**
 * Architectural Stairwell and Vertical Circulation Tower
 */
const StairwellTower: React.FC<{
  xPos: number;
  floors: number[];
  floorHeight: number;
  buildingDepth: number;
  isExploded: boolean;
}> = ({ xPos, floors, floorHeight, buildingDepth, isExploded }) => {
  const floorCount = floors.length;
  const towerHeight = floorCount * floorHeight;

  return (
    <group position={[xPos, 0, 0]}>
      {floors.map((fNum, idx) => {
        const floorY = idx * floorHeight + (isExploded ? idx * 3.0 : 0);
        return (
          <group key={`stair-${fNum}`} position={[0, floorY, 0]}>
            {/* Landing Platform */}
            <mesh position={[0, -0.05, 0]} receiveShadow>
              <boxGeometry args={[2.4, 0.1, 2.6]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            {/* Steps Representation */}
            <mesh position={[0, 0.4, 0]} rotation={[0, 0, -0.45]}>
              <boxGeometry args={[2.0, 0.1, 0.8]} />
              <meshStandardMaterial color="#64748b" roughness={0.6} />
            </mesh>
            {/* Handrail */}
            <mesh position={[0, 0.8, 0.45]}>
              <boxGeometry args={[1.8, 0.04, 0.04]} />
              <meshStandardMaterial color="#38bdf8" metalness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* Tower Exterior Frame when not exploded */}
      {!isExploded && (
        <group position={[0, towerHeight / 2, 0]}>
          {/* Back Glass Wall */}
          <mesh position={[0, 0, -1.3]}>
            <boxGeometry args={[2.4, towerHeight, 0.08]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.2} />
          </mesh>
          {/* Corner Structural Columns */}
          <mesh position={[-1.15, 0, 1.3]}>
            <boxGeometry args={[0.15, towerHeight, 0.15]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[1.15, 0, 1.3]}>
            <boxGeometry args={[0.15, towerHeight, 0.15]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const Building3D: React.FC<Building3DProps> = ({
  rooms,
  bounds,
  selectedFloor,
  selectedRoom,
  onSelectRoom,
  cutawayMode = true,
  onToggleCutaway,
  className,
}) => {
  const [isExploded, setIsExploded] = useState(false);
  const [internalCutaway, setInternalCutaway] = useState(cutawayMode);
  const [showRoof, setShowRoof] = useState(false);

  // Synchronize internal and external cutaway state
  const activeCutaway = onToggleCutaway ? cutawayMode : internalCutaway;
  const toggleCutaway = onToggleCutaway ?? (() => setInternalCutaway(!internalCutaway));

  const controlsRef = useRef<any>(null);

  // Auto-generate effective bounds from rooms if caller omitted bounds (e.g. HomePage)
  const effectiveBounds = useMemo(() => {
    if (bounds) return bounds;
    if (rooms && rooms.length > 0) {
      try {
        return generateDynamicLayout(rooms as any).bounds;
      } catch (e) {
        console.warn('Auto bounds generation fallback:', e);
      }
    }
    return undefined;
  }, [bounds, rooms]);

  // Structural Dimensions derived safely from effective bounds or computed defaults
  const floorHeight = effectiveBounds?.floorHeight ?? 1.7;
  const buildingWidth = effectiveBounds?.width ?? 16.2;
  const buildingDepth = effectiveBounds?.depth ?? 7.2;
  const renderedFloors = effectiveBounds?.floors && effectiveBounds.floors.length > 0 ? effectiveBounds.floors : [1, 2, 3];
  const floorCount = renderedFloors.length;
  const totalHeight = floorCount * floorHeight;

  const foundW = buildingWidth + 1.8;
  const foundD = buildingDepth + 1.8;

  const roofY = totalHeight;
  const roofW = buildingWidth + 0.4;
  const roofD = buildingDepth + 0.4;

  // Calibrated vertical centering and elevated isometric axonometric framing
  const baseDim = Math.max(buildingWidth, buildingDepth);
  const targetY = Number((totalHeight * 0.42).toFixed(2));
  const cameraTarget: [number, number, number] = useMemo(
    () => [0, targetY, 0],
    [targetY]
  );

  const framingDist = Math.max(16, baseDim * 1.35 + totalHeight * 0.65);
  const cameraPos: [number, number, number] = useMemo(
    () => [
      Number((buildingWidth * 0.72).toFixed(2)),
      Number((totalHeight * 1.05 + 3.2).toFixed(2)),
      Number((buildingDepth * 1.45 + framingDist * 0.42).toFixed(2)),
    ],
    [buildingWidth, totalHeight, buildingDepth, framingDist]
  );

  const maxCameraDistance = Math.max(40, framingDist * 2.2);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
      controlsRef.current.object.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
      controlsRef.current.update();
    }
  };

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
      controlsRef.current.update();
    }
  }, [cameraTarget]);

  const containerClass = className ?? "w-full h-[520px] sm:h-[620px]";

  return (
    <div className={`${containerClass} rounded-2xl overflow-hidden bg-gradient-to-b from-[#070b14] via-[#0b1329] to-[#0f172a] relative border border-slate-800 shadow-2xl select-none`}>
      <Canvas
        shadows
        camera={{
          position: cameraPos,
          fov: 36,
          near: 0.2, // Essential for high-precision 24-bit depth buffer
          far: 220,  // Prevents depth quantization Z-fighting
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: false,
        }}
      >
        {/* Architectural Lighting with calibrated normalBias & shadowBias */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[25, 45, 20]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={90}
          shadow-camera-left={-buildingWidth * 1.2}
          shadow-camera-right={buildingWidth * 1.2}
          shadow-camera-top={totalHeight * 2.5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0005} // ELIMINATES SHADOW ACNE AND DIAGONAL STRIPES
          shadow-normalBias={0.04} // ELIMINATES SURFACE FRAGMENTATION
        />
        <directionalLight position={[-20, 25, -25]} intensity={0.5} />
        <pointLight position={[0, totalHeight + 4, 0]} intensity={0.6} color="#38bdf8" />

        {/* Orbit Controls with Dynamic Target */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={4}
          maxDistance={maxCameraDistance}
          target={cameraTarget}
        />

        {/* Campus Ground Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.41, 0]} receiveShadow>
          <planeGeometry args={[Math.max(50, buildingWidth * 2.5), Math.max(50, buildingWidth * 2.5)]} />
          <meshStandardMaterial color="#080e1a" roughness={0.9} />
        </mesh>

        <Grid
          position={[0, -0.4, 0]}
          args={[Math.max(40, Math.ceil(buildingWidth * 2)), Math.max(40, Math.ceil(buildingWidth * 2))]}
          cellSize={1.2}
          cellThickness={0.7}
          cellColor="#1e293b"
          sectionSize={4.8}
          sectionThickness={1.2}
          sectionColor="#334155"
          fadeDistance={Math.max(30, buildingWidth * 2)}
          fadeStrength={1}
        />

        {/* Structural Building Foundation Plinth (Sits strictly beneath the floor slabs) */}
        <mesh position={[0, -0.25, 0]} receiveShadow>
          <boxGeometry args={[foundW, 0.3, foundD]} />
          <meshStandardMaterial color="#1e293b" roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[foundW - 0.2, 0.02, foundD - 0.2]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>

        {/* Dynamic Architectural Floor Slabs & Corridors for each storey */}
        {renderedFloors.map((floorNum, idx) => {
          const isDimmed = selectedFloor !== 'all' && selectedFloor !== floorNum;
          // When a single floor is selected, upper slabs become semi-transparent so view is unobstructed
          const isUpperFloorOccluding = selectedFloor !== 'all' && typeof selectedFloor === 'number' && floorNum > selectedFloor;
          const floorOffset = isExploded ? idx * 3.0 : 0;
          const slabBaseY = idx * floorHeight + floorOffset;

          const slabW = buildingWidth;
          const slabD = buildingDepth;
          const corrW = buildingWidth - 0.6;
          const corrD = effectiveBounds?.corridorWidth ?? 1.4;

          return (
            <group key={`floor-level-${floorNum}`}>
              {/* Storey Base Slab (Sits strictly beneath room floor plane) */}
              <mesh position={[0, slabBaseY - 0.05, 0]} receiveShadow>
                <boxGeometry args={[slabW, 0.08, slabD]} />
                <meshStandardMaterial
                  color={isDimmed ? '#1e293b' : '#334155'}
                  roughness={0.65}
                  transparent={isDimmed || isUpperFloorOccluding}
                  opacity={isUpperFloorOccluding ? 0.12 : isDimmed ? 0.25 : 1.0}
                />
              </mesh>

              {/* Central Circulation Corridor Floor (Flush tile finish) */}
              <mesh position={[0, slabBaseY + 0.005, 0]} receiveShadow>
                <boxGeometry args={[corrW, 0.01, corrD]} />
                <meshStandardMaterial
                  color={isDimmed ? '#334155' : '#475569'}
                  roughness={0.6}
                  transparent={isDimmed || isUpperFloorOccluding}
                  opacity={isUpperFloorOccluding ? 0.12 : isDimmed ? 0.25 : 1.0}
                />
              </mesh>

              {/* Corridor Directional Floor Guide Stripe */}
              <mesh position={[0, slabBaseY + 0.012, 0]}>
                <boxGeometry args={[corrW - 0.4, 0.004, 0.12]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={isDimmed ? 0.15 : 0.6} />
              </mesh>

              {/* East & West Corridor End-Cap Walls with Windows */}
              {!isDimmed && !isUpperFloorOccluding && (
                <group>
                  {/* West End Wall */}
                  <mesh position={[-slabW / 2 + 0.04, slabBaseY + floorHeight / 2 - 0.05, 0]} castShadow>
                    <boxGeometry args={[0.08, floorHeight - 0.1, corrD]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
                  </mesh>
                  {/* East End Wall */}
                  <mesh position={[slabW / 2 - 0.04, slabBaseY + floorHeight / 2 - 0.05, 0]} castShadow>
                    <boxGeometry args={[0.08, floorHeight - 0.1, corrD]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}

        {/* Vertical Circulation Stairwell Tower */}
        <StairwellTower
          xPos={-buildingWidth / 2 - 1.4}
          floors={renderedFloors}
          floorHeight={floorHeight}
          buildingDepth={buildingDepth}
          isExploded={isExploded}
        />

        {/* Architectural Roof (Rendered when showRoof is toggled on and not exploded) */}
        {showRoof && !isExploded && selectedFloor === 'all' && (
          <group position={[0, roofY, 0]}>
            {/* Main Roof Slab */}
            <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
              <boxGeometry args={[roofW, 0.1, roofD]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            {/* Perimeter Parapet Walls */}
            <mesh position={[0, 0.25, -roofD / 2 + 0.06]}>
              <boxGeometry args={[roofW, 0.3, 0.12]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.25, roofD / 2 - 0.06]}>
              <boxGeometry args={[roofW, 0.3, 0.12]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            <mesh position={[-roofW / 2 + 0.06, 0.25, 0]}>
              <boxGeometry args={[0.12, 0.3, roofD]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            <mesh position={[roofW / 2 - 0.06, 0.25, 0]}>
              <boxGeometry args={[0.12, 0.3, roofD]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>

            {/* Rooftop HVAC Equipment Units */}
            <mesh position={[roofW * 0.2, 0.45, 0]} castShadow>
              <boxGeometry args={[1.6, 0.7, 1.4]} />
              <meshStandardMaterial color="#475569" roughness={0.5} />
            </mesh>
            <mesh position={[-roofW * 0.25, 0.45, -0.6]} castShadow>
              <boxGeometry args={[1.2, 0.7, 1.2]} />
              <meshStandardMaterial color="#475569" roughness={0.5} />
            </mesh>
            {/* Staircase Rooftop Bulkhead Access */}
            <mesh position={[-roofW / 2 + 1.2, 0.6, 0]} castShadow>
              <boxGeometry args={[1.8, 1.0, 1.8]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
          </group>
        )}

        {/* Subtle Architectural Perimeter Cornice when roof is open */}
        {!showRoof && !isExploded && selectedFloor === 'all' && (
          <group position={[0, roofY, 0]}>
            <mesh position={[0, 0.04, -roofD / 2 + 0.04]}>
              <boxGeometry args={[roofW, 0.08, 0.08]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.04, roofD / 2 - 0.04]}>
              <boxGeometry args={[roofW, 0.08, 0.08]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            <mesh position={[-roofW / 2 + 0.04, 0.04, 0]}>
              <boxGeometry args={[0.08, 0.08, roofD]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            <mesh position={[roofW / 2 - 0.04, 0.04, 0]}>
              <boxGeometry args={[0.08, 0.08, roofD]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Individual Procedural 3D Room Meshes with Furniture */}
        {rooms.map((room) => {
          const isDimmed = selectedFloor !== 'all' && selectedFloor !== room.Floor;
          const isSelected = selectedRoom?.Room_ID === room.Room_ID;

          const floorIdx = effectiveBounds?.floors
            ? Math.max(0, effectiveBounds.floors.indexOf(room.Floor ?? 1))
            : ((room.Floor ?? 1) - 1);
          const floorOffset = isExploded ? floorIdx * 3.0 : 0;

          return (
            <RoomMesh
              key={room.Room_ID}
              room={room}
              floorOffset={floorOffset}
              isSelected={isSelected}
              isDimmed={isDimmed}
              cutawayMode={activeCutaway}
              onClick={() => onSelectRoom(room)}
            />
          );
        })}
      </Canvas>

      {/* Floating Canvas UI Controls - Sleek Header Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl text-white shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0"></span>
          <span className="text-xs font-bold text-slate-200">Interactive 3D Building Model</span>
        </div>

        {/* Quick View Controls: Explode Floors, Cutaway, Roof & Reset Camera */}
        <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setIsExploded(!isExploded)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-md ${
              isExploded
                ? 'bg-teal-500 text-white border-teal-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {isExploded ? 'Collapse Floors' : 'Explode Storeys (3D)'}
          </button>

          <button
            onClick={toggleCutaway}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-md ${
              activeCutaway
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {activeCutaway ? 'Cutaway View' : 'Exterior Facade'}
          </button>

          <button
            onClick={() => setShowRoof(!showRoof)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-md ${
              showRoof
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {showRoof ? 'Hide Roof' : 'Show Roof'}
          </button>

          <button
            onClick={resetCamera}
            className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer shadow-md"
            title="Reset Camera Angle"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend Status Bar */}
      <div className="absolute bottom-3 left-3 pointer-events-auto z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl text-white text-[11px] sm:text-xs flex items-center gap-3 sm:gap-4 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Partially Free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="text-slate-300">Fully Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span className="text-slate-300">Maintenance</span>
        </div>
      </div>
    </div>
  );
};
