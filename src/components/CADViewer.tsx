import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import type { Mesh } from "three";

// Spinning placeholder cube shown before any model is uploaded
function SpinningCube() {
  const meshRef = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  return (
    <RoundedBox ref={meshRef} args={[1.8, 1.8, 1.8]} radius={0.15} smoothness={4}>
      <meshStandardMaterial color="#3b6bca" metalness={0.2} roughness={0.3} />
    </RoundedBox>
  );
}

// Highlight face clicked by user for pull direction
function FaceHighlight({ normal }: { normal: THREE.Vector3 | null }) {
  if (!normal) return null;
  const arrowDir = normal.clone().normalize();
  const origin = new THREE.Vector3(0, 0, 0);
  return (
    <arrowHelper
      args={[arrowDir, origin, 2.5, "#6abf6a", 0.4, 0.25]}
    />
  );
}

// The actual GLB model with face click detection
function GLBModel({
  url,
  onFaceClick,
  pullNormal,
}: {
  url: string;
  onFaceClick: (normal: THREE.Vector3) => void;
  pullNormal: THREE.Vector3 | null;
}) {
  const { scene } = useGLTF(url, true);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.set("#3b6bca");
        child.material.metalness = 0.15;
        child.material.roughness = 0.35;
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    scene.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center.multiplyScalar(scale));
  }, [scene]);

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (e.face && e.object) {
        const normal = e.face.normal.clone();
        normal.transformDirection(e.object.matrixWorld).normalize();
        onFaceClick(normal);
      }
    },
    [onFaceClick]
  );

  return (
    <group ref={groupRef}>
      <primitive object={scene} onClick={handleClick} />
      <FaceHighlight normal={pullNormal} />
    </group>
  );
}

interface CADViewerProps {
  glbUrl?: string | null;
  onPullDirectionSet?: (normal: THREE.Vector3) => void;
}

const CADViewer = ({ glbUrl, onPullDirectionSet }: CADViewerProps) => {
  const [pullNormal, setPullNormal] = useState<THREE.Vector3 | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Show hint when model first loads
  useEffect(() => {
    if (glbUrl) {
      setPullNormal(null);
      setConfirmed(false);
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [glbUrl]);

  const handleFaceClick = useCallback(
    (normal: THREE.Vector3) => {
      setPullNormal(normal);
      setConfirmed(false);
    },
    []
  );

  const handleConfirm = () => {
    if (pullNormal && onPullDirectionSet) {
      onPullDirectionSet(pullNormal);
    }
    setConfirmed(true);
  };

  const handleReset = () => {
    setPullNormal(null);
    setConfirmed(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#141416]">

      {/* Top-left badge */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-[#1c1c1e]/90 px-3 py-1.5 backdrop-blur-sm border border-[#2e2e30]">
        <div className="h-2 w-2 rounded-full bg-[#6abf6a] animate-pulse" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8e]">3D Preview</span>
      </div>

      {/* Pull direction hint — fades in when model loads */}
      {glbUrl && showHint && !pullNormal && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-[#3b6bca]/40 bg-[#1e3358]/90 px-4 py-2 backdrop-blur-sm transition-opacity">
          <p className="text-[11px] font-semibold text-[#6a9fd8] text-center">
            Click the <span className="text-[#e8e6e1]">top face</span> of your part to set pull direction
          </p>
        </div>
      )}

      {/* Pull direction panel — shows after click */}
      {glbUrl && pullNormal && !confirmed && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-[#2e2e30] bg-[#1c1c1e]/95 px-5 py-3 backdrop-blur-sm shadow-xl">
          <p className="text-[10px] uppercase tracking-widest text-[#8a8a8e] mb-2 text-center">Pull direction selected</p>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#6abf6a] mb-3 justify-center">
            <span>↑ {pullNormal.x.toFixed(2)}</span>
            <span>→ {pullNormal.y.toFixed(2)}</span>
            <span>↗ {pullNormal.z.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-[#3b6bca] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#4a7ad9] transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleReset}
              className="flex-1 rounded-lg bg-[#2e2e30] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8a8a8e] hover:bg-[#3a3a3e] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Confirmed state */}
      {glbUrl && confirmed && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-[#2a4a2a] bg-[#1a2e1a]/90 px-4 py-2 backdrop-blur-sm">
          <span className="text-[#6abf6a] text-xs">✓</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6abf6a]">Pull direction confirmed</span>
          <button onClick={handleReset} className="ml-2 text-[9px] text-[#4a4a4e] hover:text-[#8a8a8e] underline">change</button>
        </div>
      )}

      <Canvas camera={{ position: [3, 3, 3], fov: 45 }} style={{ background: "#141416" }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.7} />
        <directionalLight position={[-4, -4, -4]} intensity={0.15} />
        <Suspense fallback={null}>
          {glbUrl
            ? <GLBModel url={glbUrl} onFaceClick={handleFaceClick} pullNormal={pullNormal} />
            : <SpinningCube />
          }
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.06} />
        <Environment preset="warehouse" environmentIntensity={0.3} />
      </Canvas>
    </div>
  );
};

export default CADViewer;
