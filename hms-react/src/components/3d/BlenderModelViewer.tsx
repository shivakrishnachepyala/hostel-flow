import React, { useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface BlenderModelViewerProps {
  modelBuffer: ArrayBuffer | null;
  scale?: number;
  rotation?: [number, number, number]; // In degrees: [x, y, z]
  position?: [number, number, number]; // [x, y, z]
  className?: string;
  onLoaded?: () => void;
  onError?: (error: Error) => void;
}

const ModelPrimitive: React.FC<{
  scene: THREE.Group;
  scale: number;
  rotation: [number, number, number];
  position: [number, number, number];
}> = ({ scene, scale, rotation, position }) => {
  // Convert degrees to radians
  const radRotation: [number, number, number] = useMemo(() => [
    (rotation[0] * Math.PI) / 180,
    (rotation[1] * Math.PI) / 180,
    (rotation[2] * Math.PI) / 180,
  ], [rotation]);

  return (
    <primitive
      object={scene}
      scale={[scale, scale, scale]}
      rotation={radRotation}
      position={position}
    />
  );
};

export const BlenderModelViewer: React.FC<BlenderModelViewerProps> = ({
  modelBuffer,
  scale = 1,
  rotation = [0, 0, 0],
  position = [0, 0, 0],
  className = 'w-full h-full',
  onLoaded,
  onError,
}) => {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!modelBuffer) {
      setScene(null);
      setErrorMsg(null);
      return;
    }

    setParsing(true);
    setErrorMsg(null);

    const loader = new GLTFLoader();

    // Parse the ArrayBuffer from Blender GLB/glTF export
    loader.parse(
      modelBuffer.slice(0),
      '',
      (gltf) => {
        try {
          // Enable shadow casting and receiving for imported Blender meshes
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Compute bounding box and normalize if height is 0 or invalid
          const box = new THREE.Box3().setFromObject(gltf.scene);
          if (box.isEmpty()) {
            console.warn('Imported GLTF model has an empty bounding box.');
          }

          setScene(gltf.scene);
          setParsing(false);
          onLoaded?.();
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to process 3D scene.');
          setParsing(false);
          onError?.(err);
        }
      },
      (err) => {
        const message = 'Invalid or corrupted Blender GLB/glTF file. Make sure the model was exported properly from Blender.';
        setErrorMsg(message);
        setParsing(false);
        onError?.(new Error(message));
      }
    );
  }, [modelBuffer, onLoaded, onError]);

  if (errorMsg) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900 text-slate-300 p-6 rounded-xl border border-rose-900/50 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center font-bold mb-2">!</div>
        <p className="text-xs text-rose-300 text-center max-w-sm">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 rounded-xl overflow-hidden shadow-inner ${className}`}>
      {parsing && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
          <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-semibold text-teal-300">Parsing Blender 3D Model...</div>
        </div>
      )}

      <Canvas
        shadows
        camera={{ position: [12, 10, 14], fov: 42 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Natural Sun & Ambient Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight
          position={[15, 22, 15]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <pointLight position={[-12, 10, -12]} intensity={0.5} />

        {/* Orbit Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={3}
          maxDistance={45}
        />

        {/* Campus Ground Plane & Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
        <Grid
          position={[0, 0, 0]}
          args={[36, 36]}
          cellSize={1}
          cellThickness={0.7}
          cellColor="#1e293b"
          sectionSize={4}
          sectionThickness={1.2}
          sectionColor="#334155"
          fadeDistance={30}
          fadeStrength={1}
        />

        {/* Render Imported Blender 3D Scene */}
        {scene && (
          <ModelPrimitive
            scene={scene}
            scale={scale}
            rotation={rotation}
            position={position}
          />
        )}
      </Canvas>

      {/* Viewport Help Overlay */}
      <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg text-white text-[11px] flex items-center gap-2 pointer-events-none shadow-md">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
        <span>Blender 3D Viewport (Rotate: Left-Click • Zoom: Scroll • Pan: Right-Click)</span>
      </div>
    </div>
  );
};
