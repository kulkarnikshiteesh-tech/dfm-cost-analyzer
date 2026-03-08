import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import type { Mesh } from "three";

const BACKEND = "https://threed-backend-4v3g.onrender.com";

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

function GLBModel({
  url,
  onFaceClick,
}: {
  url: string;
  onFaceClick: (normal: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(url, true);

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

  return <primitive object={scene} onClick={handleClick} />;
}

// Classify a face normal into top / bottom / side
function classifyFace(normal: THREE.Vector3): "top" | "bottom" | "side" {
  if (normal.z > 0.7) return "top";
  if (normal.z < -0.7) return "bottom";
  return "side";
}

interface CADViewerProps {
  glbUrl?: string | null;
  onAnalysisUpdate?: (data: any) => void;
}

const CADViewer = ({ glbUrl, onAnalysisUpdate }: CADViewerProps) => {
  const [faceType, setFaceType] = useState<"top" | "bottom" | "side" | null>(null);
  const [pullVector, setPullVector] = useState<{ x: number; y: number; z: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reanalysing, setReanalysing] = useState(false);
  const [sideWarning, setSideWarning] = useState(false);

  // Reset when new model loads
  useEffect(() => {
    setFaceType(null);
    setPullVector(null);
    setConfirmed(false);
    setSideWarning(false);
  }, [glbUrl]);

  const handleFaceClick = useCallback((normal: THREE.Vector3) => {
    if (confirmed) return; // locked after confirm
    const type = classifyFace(normal);
    if (type === "side") {
      setSideWarning(true);
      setTimeout(() => setSideWarning(false), 2500);
      return;
    }
    setSideWarning(false);
    setFaceType(type);
    setPullVector({ x: normal.x, y: normal.y, z: normal.z });
  }, [confirmed]);

  const handleConfirm = async () => {
    if (!pullVector || !glbUrl || !onAnalysisUpdate) return;
    setConfirmed(true);
    setReanalysing(true);

    // Extract glb filename from URL to pass as reference
    const glbFilename = glbUrl.split("/static/")[1];

    try {
      const res = await fetch(`${BACKEND}/reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glb_filename: glbFilename,
          pull_direction: pullVector,
        }),
      });

      if (res.ok) {
        const newData = await res.json();
        if (newData.glb_url && newData.glb_url.startsWith("/static/")) {
          newData.glb_url = BACKEND + newData.glb_url;
        }
        onAnalysisUpdate(newData);
      }
    } catch (err) {
      console.error("Reanalyze error:", err);
    } finally {
      setReanalysing(false);
    }
  };

  const handleReset = () => {
    setFaceType(null);
    setPullVector(null);
    setConfirmed(false);
    setSideWarning(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#141416]">

      {/* Top-left badge */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#1a1a1c]/90 px-3 py-1.5 backdrop-blur-sm">
        <div className="h-1.5 w-1.5 rounded-full bg-[#6abf6a] animate-pulse" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a8e]">3D Preview</span>
      </div>

      {/* Instruction — shown when model loaded, not yet confirmed */}
      {glbUrl && !confirmed && !faceType && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="rounded-xl border border-[#3b6bca]/50 bg-[#1a1a1c]/95 px-5 py-3 text-center shadow-xl backdrop-blur-sm">
            <p className="text-xs font-semibold text-[#e8e6e1]">
              Select the <span className="text-[#6a9fd8]">top</span> or <span className="text-[#6a9fd8]">bottom</span> surface of your model
            </p>
            <p className="mt-1 text-[10px] text-[#5a5a5e]">Click directly on the face</p>
          </div>
        </div>
      )}

      {/* Side face warning */}
      {sideWarning && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="rounded-xl border border-[#d4a017]/40 bg-[#1a1a1c]/95 px-5 py-3 text-center shadow-xl backdrop-blur-sm">
            <p className="text-xs font-semibold text-[#d4a017]">That's a side face</p>
            <p className="mt-1 text-[10px] text-[#8a8a8e]">Please click the top or bottom surface</p>
          </div>
        </div>
      )}

      {/* Face selected — confirm / reset */}
      {glbUrl && faceType && !confirmed && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="rounded-xl border border-[#2a2a2e] bg-[#1a1a1c]/98 px-5 py-4 shadow-xl backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-[#5a5a5e] text-center mb-1">Surface selected</p>
            <p className="text-sm font-bold text-[#e8e6e1] text-center mb-3 capitalize">
              {faceType === "top" ? "⬆ Top surface" : "⬇ Bottom surface"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-[#3b6bca] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#4a7ad9]"
              >
                Confirm & Reanalyse
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg bg-[#2a2a2e] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#8a8a8e] transition-colors hover:bg-[#333336]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reanalysing spinner */}
      {reanalysing && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#2a2a2e] bg-[#1a1a1c]/98 px-5 py-3 shadow-xl backdrop-blur-sm">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3b6bca] border-t-transparent" />
            <span className="text-[11px] font-semibold text-[#8a8a8e]">Reanalysing with your pull direction…</span>
          </div>
        </div>
      )}

      {/* Confirmed */}
      {confirmed && !reanalysing && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#2a4a2a] bg-[#1a1a1c]/95 px-4 py-2.5 shadow-xl backdrop-blur-sm">
            <span className="text-[#6abf6a] text-sm">✓</span>
            <span className="text-[11px] font-semibold text-[#6abf6a] capitalize">{faceType} surface confirmed</span>
            <button onClick={handleReset} className="ml-1 text-[9px] text-[#3a3a3e] underline hover:text-[#5a5a5e]">change</button>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [3, 3, 3], fov: 45 }} style={{ background: "#141416" }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.7} />
        <directionalLight position={[-4, -4, -4]} intensity={0.15} />
        <Suspense fallback={null}>
          {glbUrl
            ? <GLBModel url={glbUrl} onFaceClick={handleFaceClick} />
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
