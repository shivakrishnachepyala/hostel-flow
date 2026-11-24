import React, { useState, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { 
  CampusHostelData, 
  CampusBuildingLayout, 
  CampusLayoutResult 
} from '../../utils/explorerLayout';
import { 
  Building2, 
  RotateCcw,
  ArrowRight
} from 'lucide-react';

export interface Campus3DProps {
  layout: CampusLayoutResult;
  selectedHostel: CampusHostelData | null;
  onSelectHostel: (hostel: CampusHostelData) => void;
  onEnterHostel: (hostel: CampusHostelData) => void;
}

// Occupancy status color resolver
const getOccupancyBadgeColor = (status: CampusBuildingLayout['occupancyStatus']) => {
  switch (status) {
    case 'vacant':
      return '#10b981'; // Emerald Green
    case 'partially-occupied':
      return '#f59e0b'; // Amber
    case 'fully-occupied':
      return '#ef4444'; // Rose Red
    default:
      return '#10b981';
  }
};

interface CampusHostelMeshProps {
  building: CampusBuildingLayout;
  isSelected: boolean;
  onSelect: () => void;
  onEnter: () => void;
}

/**
 * Procedural 3D Model for an Individual Hostel on the Campus
 * Accurately represents floor count, block wings, and occupancy
 */
const CampusHostelMesh: React.FC<CampusHostelMeshProps> = ({
  building,
  isSelected,
  onSelect,
  onEnter,
}) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  const { hostel, position3D, dimensions, wings, floorCount, accentColor, occupancyStatus } = building;
  const [bWidth, bHeight, bDepth] = dimensions;
  const statusColor = getOccupancyBadgeColor(occupancyStatus);

  // Subtle hover lift
  const currentY = hovered ? position3D[1] + 0.35 : position3D[1];

  return (
    <group
      ref={groupRef}
      position={[position3D[0], currentY, position3D[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEnter();
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
      {/* 1. Ground Plinth / Foundation */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[bWidth + 1.2, 0.3, bDepth + 1.2]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : hovered ? '#475569' : '#1e293b'}
          roughness={0.8}
        />
      </mesh>

      {/* 2. Interactive Selection Ring / Ground Glow */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(bWidth, bDepth) * 0.65, Math.max(bWidth, bDepth) * 0.75, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3. Multi-Block Architectural Wings or Single Pavilion */}
      {wings.map((wing, idx) => {
        const [wW, wH, wD] = wing.dimensions;
        const [ox, oy, oz] = wing.offset;
        const wingCenterY = oy + 0.3 + wH / 2;

        return (
          <group key={wing.blockId} position={[ox, wingCenterY, oz]}>
            {/* Wing Main Structure Body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[wW, wH, wD]} />
              <meshStandardMaterial
                color={hovered ? '#1e293b' : '#0f172a'}
                roughness={0.65}
                metalness={0.15}
              />
            </mesh>

            {/* Architectural Cornices & Floor Division Bands */}
            {Array.from({ length: wing.floors }).map((_, fIdx) => {
              const slabY = -wH / 2 + (fIdx + 1) * (wH / wing.floors);
              return (
                <mesh key={fIdx} position={[0, slabY, 0]}>
                  <boxGeometry args={[wW + 0.15, 0.08, wD + 0.15]} />
                  <meshStandardMaterial color={accentColor} roughness={0.4} />
                </mesh>
              );
            })}

            {/* Glowing Window Matrices matching floors and room count */}
            {Array.from({ length: wing.floors }).map((_, fIdx) => {
              const windowY = -wH / 2 + fIdx * (wH / wing.floors) + (wH / wing.floors) * 0.5;
              const windowsPerRow = Math.min(6, Math.max(2, Math.ceil(wing.rooms / wing.floors)));

              return (
                <group key={`win-f-${fIdx}`} position={[0, windowY, 0]}>
                  {/* South Facade Windows */}
                  {Array.from({ length: windowsPerRow }).map((_, wIdx) => {
                    const wx = windowsPerRow === 1 ? 0 : (wIdx - (windowsPerRow - 1) / 2) * (wW / (windowsPerRow + 0.8));
                    return (
                      <mesh key={`s-${wIdx}`} position={[wx, 0, wD / 2 + 0.02]}>
                        <boxGeometry args={[wW / (windowsPerRow * 1.6), 0.7, 0.04]} />
                        <meshStandardMaterial
                          color={statusColor}
                          emissive={statusColor}
                          emissiveIntensity={hovered ? 0.9 : 0.45}
                          roughness={0.2}
                        />
                      </mesh>
                    );
                  })}
                  {/* North Facade Windows */}
                  {Array.from({ length: windowsPerRow }).map((_, wIdx) => {
                    const wx = windowsPerRow === 1 ? 0 : (wIdx - (windowsPerRow - 1) / 2) * (wW / (windowsPerRow + 0.8));
                    return (
                      <mesh key={`n-${wIdx}`} position={[wx, 0, -wD / 2 - 0.02]}>
                        <boxGeometry args={[wW / (windowsPerRow * 1.6), 0.7, 0.04]} />
                        <meshStandardMaterial
                          color={statusColor}
                          emissive={statusColor}
                          emissiveIntensity={hovered ? 0.9 : 0.45}
                          roughness={0.2}
                        />
                      </mesh>
                    );
                  })}
                </group>
              );
            })}

            {/* Roof Parapet & HVAC Accent */}
            <mesh position={[0, wH / 2 + 0.1, 0]}>
              <boxGeometry args={[wW + 0.2, 0.2, wD + 0.2]} />
              <meshStandardMaterial color="#334155" roughness={0.9} />
            </mesh>
            <mesh position={[wW * 0.2, wH / 2 + 0.35, 0]}>
              <boxGeometry args={[1.2, 0.4, 1.2]} />
              <meshStandardMaterial color="#64748b" roughness={0.7} />
            </mesh>

            {/* Block Entrance Sign / Badge */}
            <Billboard position={[0, -wH / 2 + 0.7, wD / 2 + 0.2]}>
              <Text
                fontSize={0.42}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.04}
                outlineColor="#090d16"
              >
                {wing.blockName}
              </Text>
            </Billboard>
          </group>
        );
      })}

      {/* 4. Central Connecting Lobby / Entrance Atrium for Multi-Block Hostels */}
      {wings.length > 1 && (
        <group position={[0, 0.3 + (bHeight * 0.6) / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.2, bHeight * 0.6, 7.5]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
          {/* Glass Atrium Entrance Canopy */}
          <mesh position={[0, -bHeight * 0.2, 4.0]}>
            <boxGeometry args={[3.2, 0.1, 1.8]} />
            <meshStandardMaterial color={accentColor} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -bHeight * 0.25, 3.8]}>
            <boxGeometry args={[2.0, 1.2, 0.05]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} roughness={0.1} />
          </mesh>
        </group>
      )}

      {/* 5. Floating 3D Building Title & Status Billboard */}
      <Billboard position={[0, bHeight + 2.2, 0]}>
        {/* Hostel Name Header */}
        <Text
          fontSize={0.85}
          color={isSelected ? '#38bdf8' : hovered ? '#ffffff' : '#f1f5f9'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor="#020617"
        >
          {hostel.Hostel_Name}
        </Text>

        {/* Sub-Badge: Type & Bed Metrics */}
        <Text
          position={[0, -0.65, 0]}
          fontSize={0.42}
          color="#cbd5e1"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#020617"
        >
          {`${hostel.Hostel_Type} • ${hostel.total_rooms} Rooms • ${hostel.available_beds}/${hostel.total_beds} Free`}
        </Text>

        {/* Occupancy Status Dot */}
        <mesh position={[-2.4, -0.65, 0.05]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color={statusColor} />
        </mesh>
      </Billboard>
    </group>
  );
};

/**
 * Campus Environment Ground, Plaza, Green Lawns and Pathways
 */
const CampusGround: React.FC<{ dimensions: [number, number]; buildings: CampusBuildingLayout[] }> = ({
  dimensions,
  buildings,
}) => {
  const [gW, gD] = dimensions;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Main Campus Ground Slate Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[gW, gD]} />
        <meshStandardMaterial color="#0b1120" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Subtle Spatial Coordinate Grid */}
      <Grid
        position={[0, -0.03, 0]}
        args={[gW, gD]}
        cellSize={3}
        cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={12}
        sectionThickness={1.2}
        sectionColor="#334155"
        fadeDistance={90}
        infiniteGrid
      />

      {/* 2. Central University Plaza / Courtyard */}
      <group position={[0, -0.02, 0]}>
        {/* Plaza Paving Disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[11, 48]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[10.6, 11.2, 48]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.4} />
        </mesh>

        {/* Central Campus Landmark / Plinth */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[2.5, 3.0, 0.8, 32]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.3, 0.6, 1.2, 16]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Central 3D Text Banner */}
        <Billboard position={[0, 2.5, 0]}>
          <Text
            fontSize={0.5}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor="#020617"
          >
            HOSTELFLOW CAMPUS
          </Text>
        </Billboard>
      </group>

      {/* 3. Paved Pedestrian Walkways Radiating from Central Plaza to Hostels */}
      {buildings.map((b) => {
        const [bx, , bz] = b.position3D;
        const dist = Math.hypot(bx, bz);
        const angle = Math.atan2(bz, bx);
        return (
          <group key={`path-${b.hostel.Hostel_ID}`} position={[bx / 2, -0.01, bz / 2]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.8, dist - 6]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* 4. Landscaped Campus Green Turf Patches */}
      {buildings.map((b) => {
        const [bx, , bz] = b.position3D;
        const [bw, , bd] = b.dimensions;
        return (
          <mesh
            key={`lawn-${b.hostel.Hostel_ID}`}
            position={[bx, -0.02, bz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[bw + 7, bd + 7]} />
            <meshStandardMaterial color="#0f291e" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Campus3D: React.FC<Campus3DProps> = ({
  layout,
  selectedHostel,
  onSelectHostel,
  onEnterHostel,
}) => {
  const controlsRef = useRef<any>(null);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[640px] rounded-2xl overflow-hidden bg-[#070b14] border border-slate-800 shadow-2xl select-none">
      <Canvas
        shadows
        camera={{
          position: [0, 36, layout.suggestedCameraDistance || 56],
          fov: 40,
          near: 0.5,
          far: 280,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: false,
        }}
      >
        {/* Architectural Lighting */}
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[45, 60, 35]}
          intensity={1.25}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={120}
          shadow-bias={-0.0005}
          shadow-normalBias={0.04}
        />
        <directionalLight position={[-40, 30, -30]} intensity={0.4} />
        <pointLight position={[0, 15, 0]} intensity={0.6} color="#38bdf8" />

        {/* Campus Ground & Landscaping */}
        <CampusGround
          dimensions={layout.groundDimensions}
          buildings={layout.buildings}
        />

        {/* Procedural 3D Hostel Buildings */}
        {layout.buildings.map((building) => {
          const isSelected = selectedHostel?.Hostel_ID === building.hostel.Hostel_ID;
          return (
            <CampusHostelMesh
              key={building.hostel.Hostel_ID}
              building={building}
              isSelected={isSelected}
              onSelect={() => onSelectHostel(building.hostel)}
              onEnter={() => onEnterHostel(building.hostel)}
            />
          );
        })}

        {/* Orbit Controls with Restricted Horizon */}
        <OrbitControls
          ref={controlsRef}
          target={layout.cameraTarget}
          enableDamping
          dampingFactor={0.06}
          minDistance={18}
          maxDistance={120}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.15}
        />
      </Canvas>

      {/* Floating HUD Controls: Camera Reset & Hints */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={resetCamera}
          className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Campus View</span>
        </button>
      </div>

      {/* Floating Campus Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 text-[11px] text-slate-300 flex items-center gap-4 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Vacant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Partially Free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Full</span>
        </div>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Double-click building to enter</span>
      </div>

      {/* Selected Hostel Action Bar Overlay (when a hostel is picked) */}
      {selectedHostel && (
        <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-sky-500/50 rounded-2xl p-4 text-xs text-white shadow-2xl max-w-sm w-full space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-sm text-white">{selectedHostel.Hostel_Name}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              (selectedHostel.Hostel_Type || '').toLowerCase() === 'girls'
                ? 'bg-pink-950 text-pink-300 border border-pink-800'
                : 'bg-blue-950 text-blue-300 border border-blue-800'
            }`}>
              {selectedHostel.Hostel_Type}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div>
              <div className="text-slate-400">Blocks</div>
              <div className="font-bold text-slate-200 text-xs">{selectedHostel.total_blocks} Blocks</div>
            </div>
            <div>
              <div className="text-slate-400">Rooms</div>
              <div className="font-bold text-slate-200 text-xs">{selectedHostel.total_rooms} Rooms</div>
            </div>
            <div>
              <div className="text-slate-400">Free Beds</div>
              <div className="font-bold text-emerald-400 text-xs">
                {selectedHostel.available_beds} / {selectedHostel.total_beds}
              </div>
            </div>
          </div>

          <button
            onClick={() => onEnterHostel(selectedHostel)}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-sky-500/25 transition-all cursor-pointer"
          >
            <span>Enter 3D Building (Inspect Interior)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
