import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

const BACKEND = "https://threed-backend-4v3g.onrender.com";

// ── Spinning cube (empty state) ───────────────────────────────────────────────
function SpinningCube() {
  const meshRef = useRef<any>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  return (
    <RoundedBox ref={meshRef} args={[1.8, 1.8, 1.8]} radius={0.15} smoothness={4}>
      <meshStandardMaterial color="#5b8ee6" metalness={0.2} roughness={0.3} />
    </RoundedBox>
  );
}

// ── GLB model ─────────────────────────────────────────────────────────────────
function GLBModel({
  url,
  onFaceClick,
  highlightNormal,
  pullDirection,
}: {
  url: string;
  onFaceClick: (normal: THREE.Vector3) => void;
  highlightNormal: THREE.Vector3 | null;
  pullDirection: THREE.Vector3 | null;
}) {
  const { scene } = useGLTF(url, true);
  const colorDirtyRef = useRef(true);
  const prevHighlight = useRef<THREE.Vector3 | null>(null);
  const prevPull = useRef<THREE.Vector3 | null>(null);

  // Scale + centre + prepare geometry on first load
  useEffect(() => {
    scene.traverse((child: any) => {
      if (!child.isMesh || !child.geometry) return;
      if (child.geometry.index) {
        child.geometry = child.geometry.toNonIndexed();
        // Do NOT recompute normals — keep original flat face normals from the STEP/GLB
        // These match the trimesh face normals the backend uses for undercut detection
      }
      const oldMat = child.material;
      child.material = (Array.isArray(oldMat) ? oldMat[0] : oldMat).clone();
      child.material.metalness = 0.1;
      child.material.roughness = 0.4;
      const count = child.geometry.attributes.position.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i*3]=0.36; colors[i*3+1]=0.56; colors[i*3+2]=0.9;
      }
      child.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      child.material.vertexColors = true;
      child.material.needsUpdate  = true;
    });
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    scene.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center.multiplyScalar(scale));
    colorDirtyRef.current = true;
  }, [scene]);

  useEffect(() => { colorDirtyRef.current = true; }, [highlightNormal, pullDirection]);

  // All coloring happens inside useFrame — matrixWorld is guaranteed current
  useFrame(() => {
    if (!colorDirtyRef.current) return;
    // Only skip if nothing changed
    if (prevHighlight.current === highlightNormal && prevPull.current === pullDirection) return;
    colorDirtyRef.current = false;
    prevHighlight.current = highlightNormal;
    prevPull.current = pullDirection;

    scene.traverse((child: any) => {
      if (!child.isMesh || !child.geometry) return;
      if (child.geometry.index) {
        child.geometry = child.geometry.toNonIndexed();
        // Keep original normals — do NOT recompute
        child.material.vertexColors = true;
        child.material.needsUpdate = true;
      }
      const geo        = child.geometry;
      const normalAttr = geo.attributes.normal;
      const posAttr    = geo.attributes.position;
      if (!posAttr || !normalAttr) return;

      const count    = posAttr.count;
      const triCount = Math.floor(count / 3);
      const colors   = new Float32Array(count * 3);

      for (let t = 0; t < triCount; t++) {
        const i  = t * 3;
        const nx = (normalAttr.getX(i) + normalAttr.getX(i+1) + normalAttr.getX(i+2)) / 3;
        const ny = (normalAttr.getY(i) + normalAttr.getY(i+1) + normalAttr.getY(i+2)) / 3;
        const nz = (normalAttr.getZ(i) + normalAttr.getZ(i+1) + normalAttr.getZ(i+2)) / 3;
        const faceNormal = new THREE.Vector3(nx, ny, nz)
          .transformDirection(child.matrixWorld)
          .normalize();

        let r = 0.36, g = 0.56, b = 0.9; // default blue

        if (pullDirection) {
          const dotPull = faceNormal.dot(pullDirection);
          if (Math.abs(dotPull) < 0.5) {
            r=0.9; g=0.15; b=0.1;  // red — undercut
          } else {
            r=0.36; g=0.56; b=0.9; // blue — reachable
          }
        } else if (highlightNormal) {
          if (faceNormal.dot(highlightNormal) > 0.97) {
            r=1.0; g=0.85; b=0.0; // yellow
          }
        }

        for (let v = 0; v < 3; v++) {
          const idx = t * 3 + v;
          colors[idx*3]=r; colors[idx*3+1]=g; colors[idx*3+2]=b;
        }
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.attributes.color.needsUpdate = true;
      child.material.vertexColors = true;
      child.material.needsUpdate  = true;
    });
  });

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (e.face && e.object) {
      const normal = e.face.normal.clone();
      normal.transformDirection(e.object.matrixWorld).normalize();
      onFaceClick(normal);
    }
  }, [onFaceClick]);

  return <primitive object={scene} onClick={handleClick} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  glb_url: string;
  volume_cubic_mm: number;
  bounding_box_mm: { x: number; y: number; z: number };
  has_undercuts: boolean;
  undercut_severity: string;
  undercut_message: string;
}

interface CADViewerProps {
  glbUrl?: string | null;
  uploadGlbFilename?: string | null;
  selectionMode?: boolean;
  onAnalysisResult?: (result: AnalysisResult, faceNormal: { x: number; y: number; z: number }) => void;
  onFaceConfirmed?: () => void;
  onTryAnother?: () => void;
  onStartOver?: () => void;
  analysisComplete?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
const CADViewer = ({
  glbUrl,
  uploadGlbFilename,
  selectionMode = false,
  onAnalysisResult,
  onFaceConfirmed,
  onTryAnother,
  onStartOver,
  analysisComplete = false,
}: CADViewerProps) => {
  const [viewerGlbUrl, setViewerGlbUrl] = useState<string | null>(null);
  const [highlightNormal, setHighlightNormal] = useState<THREE.Vector3 | null>(null);
  const [pullDirection, setPullDirection] = useState<THREE.Vector3 | null>(null);
  const [pendingNormal, setPendingNormal] = useState<THREE.Vector3 | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [latestResult, setLatestResult] = useState<AnalysisResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Reset all state on new upload
  useEffect(() => {
    setViewerGlbUrl(glbUrl ?? null);
    setHighlightNormal(null);
    setPullDirection(null);
    setPendingNormal(null);
    setAnalysing(false);
    setLatestResult(null);
    setConfirmed(false);
  }, [uploadGlbFilename]);

  // Re-enter selection mode
  useEffect(() => {
    if (selectionMode) {
      setHighlightNormal(null);
      setPullDirection(null);
      setPendingNormal(null);
      setLatestResult(null);
      setConfirmed(false);
    }
  }, [selectionMode]);

  const handleFaceClick = useCallback((normal: THREE.Vector3) => {
    if (!selectionMode || confirmed || analysing) return;
    if (pendingNormal) return;
    setHighlightNormal(normal.clone());
    setPendingNormal(normal.clone());
    setPullDirection(null); // clear any previous analysis coloring
    setLatestResult(null);
  }, [selectionMode, confirmed, analysing, pendingNormal]);

  const handleAnalyse = async () => {
    if (!pendingNormal || !uploadGlbFilename) return;
    setAnalysing(true);
    try {
      const res = await fetch(`${BACKEND}/reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glb_filename: uploadGlbFilename,
          pull_direction: { x: pendingNormal.x, y: pendingNormal.y, z: pendingNormal.z },
        }),
      });
      if (res.ok) {
        const data: AnalysisResult = await res.json();
        if (data.glb_url?.startsWith("/static/")) {
          data.glb_url = BACKEND + data.glb_url;
        }
        // Don't swap the GLB — color the existing model using pull direction
        setHighlightNormal(null);
        setPullDirection(pendingNormal.clone()); // triggers undercut coloring in useFrame
        setLatestResult(data);
        onAnalysisResult?.(data, { x: pendingNormal.x, y: pendingNormal.y, z: pendingNormal.z });
      }
    } catch (err) {
      console.error("Analyse error:", err);
    } finally {
      setAnalysing(false);
    }
  };

  const handleTryAnother = () => {
    setHighlightNormal(null);
    setPullDirection(null); // clears undercut coloring — model goes back to flat blue
    setPendingNormal(null);
    setLatestResult(null);
    setConfirmed(false);
    onTryAnother?.();
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setHighlightNormal(null);
    // Keep pullDirection — so undercut colors remain visible after confirmation
    onFaceConfirmed?.();
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "#f5f4f0" }}>

      {/* Badge */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[#e0deda] bg-white/90 px-3 py-1.5 backdrop-blur-sm shadow-sm">
        <div className="h-1.5 w-1.5 rounded-full bg-[#4caf72] animate-pulse" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9a9a9e]">3D Preview</span>
      </div>

      {/* Prompt — waiting for face click */}
      {selectionMode && !pendingNormal && !analysing && !confirmed && viewerGlbUrl && (
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div className="rounded-xl border border-[#e0a020]/50 bg-white/95 px-5 py-3 text-center shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold text-[#c08010]">Select Top / Bottom face</p>
            <p className="mt-1 text-[10px] text-[#9a9a9e]">Click a face — highlighted in yellow, then analyse</p>
          </div>
        </div>
      )}

      {/* Face highlighted — show Analyse + Cancel */}
      {selectionMode && pendingNormal && !analysing && !latestResult && !confirmed && (
        <div className="absolute top-4 right-4 z-10">
          <div className="rounded-xl border border-[#e0deda] bg-white/98 px-5 py-4 shadow-lg backdrop-blur-sm text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#9a9a9e] mb-1">Face selected</p>
            <p className="text-xs text-[#6a6a6e] mb-3">Yellow face highlighted — analyse to see undercut % and cost</p>
            <div className="flex gap-2">
              <button
                onClick={handleAnalyse}
                className="flex-1 rounded-lg bg-[#3b6bca] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#4a7ad9] transition-colors"
              >
                Analyse this face
              </button>
              <button
                onClick={handleTryAnother}
                className="rounded-lg bg-[#f0ede8] px-3 py-2 text-[11px] font-bold text-[#6a6a6e] hover:bg-[#e8e5e0] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysing spinner */}
      {analysing && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#e0deda] bg-white/98 px-5 py-3 shadow-lg backdrop-blur-sm">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3b6bca] border-t-transparent" />
            <span className="text-[11px] font-semibold text-[#6a6a6e]">Analysing…</span>
          </div>
        </div>
      )}

      {/* Result — "Accept as Top / Bottom face?" */}
      {latestResult && !analysing && !confirmed && (
        <div className="absolute top-4 right-4 z-10 w-72">
          <div className="rounded-xl border border-[#e0deda] bg-white/98 px-5 py-4 shadow-lg backdrop-blur-sm">

            <div className={`rounded-lg px-3 py-2 mb-3 ${
              latestResult.has_undercuts
                ? latestResult.undercut_severity === "high"
                  ? "bg-[#fff0f0] border border-[#fca5a5]"
                  : "bg-[#fffbf0] border border-[#fcd34d]"
                : "bg-[#f0faf4] border border-[#86efac]"
            }`}>
              <p className={`text-xs font-bold ${
                latestResult.has_undercuts
                  ? latestResult.undercut_severity === "high" ? "text-[#dc2626]" : "text-[#c08010]"
                  : "text-[#16a34a]"
              }`}>
                {latestResult.has_undercuts
                  ? latestResult.undercut_severity === "high" ? "⚠ High undercut risk" : "⚠ Moderate undercut risk"
                  : "✓ No undercut risk"
                }
              </p>
              <p className="text-[10px] text-[#6a6a6e] mt-0.5 leading-snug">{latestResult.undercut_message}</p>
              <p className="text-[10px] text-[#9a9a9e] mt-1 italic">Cost bar updated for this face</p>
            </div>

            <p className="text-[11px] font-bold text-[#1a1a1c] text-center mb-2">Accept as Top / Bottom face?</p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-lg bg-[#3b6bca] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#4a7ad9] transition-colors"
              >
                Accept
              </button>
              <button
                onClick={handleTryAnother}
                className="flex-1 rounded-lg bg-[#f0ede8] px-3 py-2 text-[11px] font-bold text-[#6a6a6e] hover:bg-[#e8e5e0] transition-colors"
              >
                Try another face
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed */}
      {confirmed && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#c8ecd0] bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <span className="text-[#4caf72]">✓</span>
            <span className="text-[11px] font-semibold text-[#4caf72]">Top / Bottom face confirmed</span>
            <button
              onClick={handleTryAnother}
              className="ml-1 text-[9px] text-[#b0ada8] underline hover:text-[#6a6a6e]"
            >
              change
            </button>
          </div>
        </div>
      )}

      {/* Start over button */}
      {onStartOver && viewerGlbUrl && (
        <button
          onClick={onStartOver}
          className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 rounded-lg border border-[#e0deda] bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-[#9a9a9e] backdrop-blur-sm hover:text-[#6a6a6e] transition-colors"
        >
          ↺ Upload new model
        </button>
      )}

      <Canvas camera={{ position: [3, 3, 3], fov: 45 }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} />
        <directionalLight position={[-4, -4, -4]} intensity={0.1} />
        <Suspense fallback={null}>
          {viewerGlbUrl
            ? <GLBModel url={viewerGlbUrl} onFaceClick={handleFaceClick} highlightNormal={highlightNormal} pullDirection={pullDirection} />
            : <SpinningCube />
          }
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.06} />
        <Environment preset="city" environmentIntensity={0.4} />
      </Canvas>
    </div>
  );
};

export default CADViewer;
