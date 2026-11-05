import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { IllustrativeRoom } from '../../data/illustrativeHostel';

interface Building3DProps {
  rooms: IllustrativeRoom[];
  selectedFloor: number | 'all';
  selectedRoom: IllustrativeRoom | null;
  onSelectRoom: (room: IllustrativeRoom) => void;
  cutawayMode: boolean;
}

// Color map for room status
const getStatusColor = (status: IllustrativeRoom['status']) => {
  switch (status) {
    case 'available':
      return '#10b981'; // Green
    case 'partially-occupied':
      return '#f59e0b'; // Amber
    case 'fully-occupied':
      return '#ef4444'; // Red
    case 'maintenance':
      return '#64748b'; // Slate
    default:
      return '#10b981';
  }
};

interface RoomMeshProps {
  room: IllustrativeRoom;
  isSelected: boolean;
  isDimmed: boolean;
  isExploded: boolean;
  onClick: () => void;
}

const RoomMesh: React.FC<RoomMeshProps> = ({ room, isSelected, isDimmed, isExploded, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const baseColor = getStatusColor(room.status);
  const color = isSelected ? '#38bdf8' : hovered ? '#60a5fa' : baseColor;
  const opacity = isDimmed ? 0.2 : 0.88;

  const width = room.dimensions[0];
  const height = room.dimensions[1];
  const depth = room.dimensions[2];

  // Adjust Y offset if exploded view is enabled
  const floorOffset = isExploded ? ((room.Floor ?? 1) - 1) * 2.2 : 0;
  const pos: [number, number, number] = [
    room.position3D[0],
    room.position3D[1] + floorOffset,
    room.position3D[2]
  ];

  return (
    <group position={pos}>
      {/* 1. Room Floor Tile Finish */}
      <mesh position={[0, -height / 2 + 0.02, 0]} receiveShadow>
        <boxGeometry args={[width - 0.08, 0.04, depth - 0.08]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>

      {/* 2. Architectural Walls (Cutaway top so interior is visible) */}
      <mesh position={[-width / 2 + 0.04, 0, 0]}>
        <boxGeometry args={[0.08, height * 0.9, depth]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>
      <mesh position={[width / 2 - 0.04, 0, 0]}>
        <boxGeometry args={[0.08, height * 0.9, depth]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, -depth / 2 + 0.04]}>
        <boxGeometry args={[width, height * 0.9, 0.08]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>

      {/* Window on exterior wall */}
      <mesh position={[0, 0.2, -depth / 2 + 0.06]}>
        <boxGeometry args={[width * 0.5, height * 0.45, 0.05]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} />
      </mesh>

      {/* 3. Detailed Furniture Inside the Room */}
      {!isDimmed && (
        <group position={[0, -height / 2, 0]}>
          {/* Wooden Beds */}
          {Array.from({ length: Math.min(room.Capacity ?? 0, 3) }).map((_, i) => {
            const bedWidth = 0.75;
            const bedLen = 1.45;
            const xPos = (room.Capacity ?? 0) === 1 ? 0 : (i === 0 ? -width / 2 + 0.55 : width / 2 - 0.55);
            const isBedOccupied = i < room.occupiedBeds;
            const bedBlanketColor = room.status === 'maintenance' ? '#64748b' : isBedOccupied ? '#ef4444' : '#10b981';

            return (
              <group key={`bed-${i}`} position={[xPos, 0, -0.1]}>
                {/* Bed Frame & Headboard */}
                <mesh position={[0, 0.1, 0]}>
                  <boxGeometry args={[bedWidth, 0.08, bedLen]} />
                  <meshStandardMaterial color="#5c3818" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.3, -bedLen / 2 + 0.04]}>
                  <boxGeometry args={[bedWidth, 0.35, 0.08]} />
                  <meshStandardMaterial color="#5c3818" roughness={0.7} />
                </mesh>
                {/* Mattress */}
                <mesh position={[0, 0.2, 0]}>
                  <boxGeometry args={[bedWidth - 0.06, 0.12, bedLen - 0.08]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.4} />
                </mesh>
                {/* Blanket with occupancy status color */}
                <mesh position={[0, 0.21, bedLen * 0.12]}>
                  <boxGeometry args={[bedWidth - 0.04, 0.13, bedLen * 0.6]} />
                  <meshStandardMaterial color={bedBlanketColor} roughness={0.5} />
                </mesh>
                {/* Pillow */}
                <mesh position={[0, 0.28, -bedLen / 2 + 0.22]}>
                  <boxGeometry args={[bedWidth * 0.65, 0.06, 0.28]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.3} />
                </mesh>
              </group>
            );
          })}

          {/* Study Desk & Chair */}
          <group position={[-width / 2 + 0.5, 0, depth / 2 - 0.55]}>
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.75, 0.04, 0.4]} />
              <meshStandardMaterial color="#854d0e" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.2, 0.25]}>
              <boxGeometry args={[0.3, 0.03, 0.3]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, 0.35, 0.38]}>
              <boxGeometry args={[0.3, 0.24, 0.03]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>

          {/* Wardrobe Storage Cupboard */}
          <mesh position={[width / 2 - 0.45, 0.55, depth / 2 - 0.4]}>
            <boxGeometry args={[0.55, 1.1, 0.35]} />
            <meshStandardMaterial color="#475569" roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* 4. Clickable Bounding Volume */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={room.dimensions} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isDimmed ? 0.12 : isSelected ? 0.4 : hovered ? 0.3 : 0.18}
          roughness={0.3}
          metalness={0.1}
          emissive={isSelected ? '#0284c7' : hovered ? '#1e40af' : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.2 : 0}
        />
      </mesh>

      {/* Wireframe Architectural Edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...room.dimensions)]} />
        <lineBasicMaterial color={isSelected ? '#38bdf8' : hovered ? '#60a5fa' : '#475569'} transparent opacity={isDimmed ? 0.2 : 0.75} />
      </lineSegments>

      {/* Room Number Signage */}
      {!isDimmed && (
        <Text
          position={[0, 0.3, depth / 2 + 0.08]}
          fontSize={0.24}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#0f172a"
        >
          {room.Room_Number}
        </Text>
      )}
    </group>
  );
};

export const Building3D: React.FC<Building3DProps> = ({
  rooms,
  selectedFloor,
  selectedRoom,
  onSelectRoom,
  cutawayMode,
}) => {
  const [isExploded, setIsExploded] = useState(false);

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 rounded-xl overflow-hidden shadow-inner">
      <Canvas
        shadows
        camera={{ position: [11, 9, 12], fov: 42 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Natural Sun & Ambient Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[14, 20, 12]}
          intensity={1.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <pointLight position={[-10, 8, -10]} intensity={0.4} />

        {/* Orbit Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={5}
          maxDistance={30}
        />

        {/* Campus Ground & Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[45, 45]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
        <Grid
          position={[0, 0, 0]}
          args={[32, 32]}
          cellSize={1}
          cellThickness={0.7}
          cellColor="#1e293b"
          sectionSize={4}
          sectionThickness={1.2}
          sectionColor="#334155"
          fadeDistance={25}
          fadeStrength={1}
        />

        {/* Building Foundation Plinth & Steps */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[11, 0.12, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* Floor Slabs (Ground, Floor 1, Floor 2) */}
        {[0, 1.7, 3.4].map((baseY, idx) => {
          const floorNum = idx + 1;
          const isDimmed = selectedFloor !== 'all' && selectedFloor !== floorNum;
          const yPos = baseY + (isExploded ? (floorNum - 1) * 2.2 : 0);

          return (
            <group key={`floor-slab-${idx}`} position={[0, yPos, 0]}>
              {/* Floor Base Slab */}
              <mesh receiveShadow>
                <boxGeometry args={[10.2, 0.08, 7.2]} />
                <meshStandardMaterial
                  color="#475569"
                  transparent
                  opacity={isDimmed ? 0.25 : 0.95}
                  roughness={0.5}
                />
              </mesh>

              {/* Central Corridor Floor */}
              <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[9.6, 0.02, 1.4]} />
                <meshStandardMaterial
                  color="#94a3b8"
                  transparent
                  opacity={isDimmed ? 0.15 : 0.85}
                  roughness={0.6}
                />
              </mesh>
            </group>
          );
        })}

        {/* Roof (Hidden in Cutaway or Exploded Mode) */}
        {!cutawayMode && !isExploded && selectedFloor === 'all' && (
          <group position={[0, 5.15, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[10.4, 0.15, 7.4]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} />
            </mesh>
            {/* Parapet */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(10.4, 0.4, 7.4)]} />
              <lineBasicMaterial color="#64748b" />
            </lineSegments>
          </group>
        )}

        {/* Individual 3D Room Meshes with Furniture */}
        {rooms.map((room) => {
          const isDimmed = selectedFloor !== 'all' && selectedFloor !== room.Floor;
          const isSelected = selectedRoom?.Room_ID === room.Room_ID;

          return (
            <RoomMesh
              key={room.Room_ID}
              room={room}
              isSelected={isSelected}
              isDimmed={isDimmed}
              isExploded={isExploded}
              onClick={() => onSelectRoom(room)}
            />
          );
        })}
      </Canvas>

      {/* Floating Canvas UI Controls / Legend */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2.5 rounded-lg text-white space-y-1 shadow-lg">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Architectural 3D Hostel Block</span>
          </div>
          <p className="text-[11px] text-slate-400">Click any room to inspect 3D interior & beds</p>
        </div>

        {/* Explode View Toggle Button */}
        <button
          onClick={() => setIsExploded(!isExploded)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isExploded
              ? 'bg-teal-500 text-white border-teal-400 shadow-md'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          {isExploded ? 'Collapse Floors' : 'Explode Floors (3D)'}
        </button>
      </div>

      {/* Legend Badge Bar */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-lg text-white text-xs flex items-center justify-between sm:justify-start gap-4 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="text-slate-300">Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span className="text-slate-300">Maintenance</span>
        </div>
      </div>
    </div>
  );
};
