import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox } from "@react-three/drei";
import { useRef, Suspense, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const BACKEND = "https://threed-backend-4v3g.onrender.com";



function paintScene(model: THREE.Object3D, r: number, g: number, b: number) {
  model.traverse((child: any) => {
    if (!child.isMesh || !child.geometry) return;
    const count  = child.geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    }
    child.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    child.material.vertexColors = true;
    child.material.needsUpdate  = true;
  });
}

// ── Highlight the face group best matching clickedNormal ──────────────────────
// Strategy:
//   1. Compute average normal per triangle
//   2. Among all triangles, find the one whose normal is closest to clickedNormal
//      — this snaps to the dominant plane even if the ray hits a tiny chamfer
//   3. Highlight all triangles within 5° of that best-match normal (tight group)
function highlightFaceGroup(model: THREE.Object3D, clickedNormal: THREE.Vector3) {
  model.traverse((child: any) => {
    if (!child.isMesh || !child.geometry) return;
    const geo      = child.geometry;
    const normAttr = geo.attributes.normal;
    const posAttr  = geo.attributes.position;
    if (!posAttr || !normAttr) return;

    const vertCount = posAttr.count;
    const triCount  = Math.floor(vertCount / 3);

    // Step 1 — per-triangle world-space normals
    const triNormals: THREE.Vector3[] = [];
    for (let t = 0; t < triCount; t++) {
      const i  = t * 3;
      const nx = (normAttr.getX(i) + normAttr.getX(i+1) + normAttr.getX(i+2)) / 3;
      const ny = (normAttr.getY(i) + normAttr.getY(i+1) + normAttr.getY(i+2)) / 3;
      const nz = (normAttr.getZ(i) + normAttr.getZ(i+1) + normAttr.getZ(i+2)) / 3;
      triNormals.push(
        new THREE.Vector3(nx, ny, nz).transformDirection(child.matrixWorld).normalize()
      );
    }

    // Step 2 — find triangle with normal closest to clickedNormal
    let bestDot    = -Infinity;
    let bestNormal = clickedNormal.clone();
    for (const tn of triNormals) {
      const d = tn.dot(clickedNormal);
      if (d > bestDot) { bestDot = d; bestNormal = tn.clone(); }
    }

    // Step 3 — highlight all triangles within ~5° of bestNormal (cos5° ≈ 0.996)
    const TIGHT   = 0.996;
    const colors  = new Float32Array(vertCount * 3);
    for (let t = 0; t < triCount; t++) {
      const match = triNormals[t].dot(bestNormal) > TIGHT;
      for (let v = 0; v < 3; v++) {
        const idx = (t * 3 + v);
        if (match) {
          colors[idx*3]=1.0; colors[idx*3+1]=0.85; colors[idx*3+2]=0.0; // yellow
        } else {
          colors[idx*3]=0.23; colors[idx*3+1]=0.42; colors[idx*3+2]=0.79; // blue
        }
      }
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    child.material.vertexColors = true;
    child.material.needsUpdate  = true;
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  glb_url:          string;
  volume_cubic_mm:  number;
  bounding_box_mm:  { x: number; y: number; z: number };
  has_undercuts:    boolean;
  undercut_severity: string;
  undercut_message: string;
}

interface CADViewerProps {
  glbUrl?:             string | null;
  uploadGlbFilename?:  string | null;
  selectionMode?:      boolean;
  onAnalysisResult?:   (result: AnalysisResult) => void;
  onFaceConfirmed?:    () => void;
  onTryAnother?:       () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const CADViewer = ({
  glbUrl,
  uploadGlbFilename,
  selectionMode = false,
  onAnalysisResult,
  onFaceConfirmed,
  onTryAnother,
}: CADViewerProps) => {
  const mountRef        = useRef<HTMLDivElement>(null);
  const rendererRef     = useRef<THREE.WebGLRenderer | null>(null);
  const threeSceneRef   = useRef<THREE.Scene | null>(null);
  const cameraRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef        = useRef<THREE.Object3D | null>(null);
  const controlsRef     = useRef<any>(null);
  const originalGlbUrl  = useRef<string | null>(null);
  const animFrameRef    = useRef<number>(0);
  const spinRef         = useRef<THREE.Mesh | null>(null);
  const spinActiveRef   = useRef(true);

  const [pendingNormal, setPendingNormal]   = useState<THREE.Vector3 | null>(null);
  const [analysing,     setAnalysing]       = useState(false);
  const [latestResult,  setLatestResult]    = useState<AnalysisResult | null>(null);
  const [confirmed,     setConfirmed]       = useState(false);
  const [hasModel,      setHasModel]        = useState(false);

  // ── Bootstrap Three.js once ──────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current!;
    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    threeSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera.position.set(3, 3, 3);
    cameraRef.current = camera;

    // Studio lighting — CAD render quality
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    scene.add(new THREE.HemisphereLight(0xddeeff, 0xfff4e0, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(5, 9, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d8f8, 0.3);
    fill.position.set(-7, 2, -3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.15);
    rim.position.set(1, -5, -7);
    scene.add(rim);

    // Spinning cube placeholder
    const spin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.8, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x5b8ee6, metalness: 0.2, roughness: 0.3 })
    );
    scene.add(spin);
    spinRef.current = spin;

    // OrbitControls
    import("three/examples/jsm/controls/OrbitControls").then(({ OrbitControls }) => {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping  = true;
      controls.dampingFactor  = 0.06;
      controlsRef.current     = controls;
    });

    // Resize
    const onResize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight;
      renderer.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (spinActiveRef.current && spinRef.current) {
        spinRef.current.rotation.x += 0.005;
        spinRef.current.rotation.y += 0.008;
      }
      controlsRef.current?.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
      controlsRef.current?.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── Imperative GLB loader — no useGLTF cache ─────────────────────────────
  const loadGlb = useCallback((url: string, onLoaded?: (model: THREE.Object3D) => void) => {
    const scene = threeSceneRef.current!;

    // Remove previous model
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    // Hide spinner
    if (spinRef.current) {
      spinActiveRef.current = false;
      spinRef.current.visible = false;
    }

    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const model = gltf.scene;

      // Scale + centre
      const box    = new THREE.Box3().setFromObject(model);
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale  = 3 / maxDim;
      model.scale.setScalar(scale);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center.multiplyScalar(scale));

      // Always reset to solid blue first (overrides any baked orange from backend)
      paintScene(model, 0.23, 0.42, 0.79);

      // CAD-render quality shader — MeshPhysicalMaterial with clearcoat
      model.traverse((child: any) => {
        if (!child.isMesh) return;
        const oldMat = child.material;
        child.material = new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          metalness: 0.15,
          roughness: 0.25,
          reflectivity: 0.8,
          clearcoat: 0.5,
          clearcoatRoughness: 0.1,
          envMapIntensity: 0.8,
        });
        if (oldMat) oldMat.dispose();
      });

      scene.add(model);
      modelRef.current = model;
      setHasModel(true);

      onLoaded?.(model);
    }, undefined, (err) => {
      console.error("GLB load error:", err);
    });
  }, []);

  // ── Load on new upload ────────────────────────────────────────────────────
  useEffect(() => {
    if (!glbUrl) return;
    originalGlbUrl.current = glbUrl;
    setPendingNormal(null);
    setLatestResult(null);
    setConfirmed(false);
    loadGlb(glbUrl);
  }, [uploadGlbFilename]);

  // ── Canvas click → raycast → highlight ───────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionMode || confirmed || analysing || !modelRef.current) return;

    // Don't register clicks on the overlay cards
    if ((e.target as HTMLElement).closest("[data-overlay]")) return;

    const mount  = mountRef.current!;
    const rect   = mount.getBoundingClientRect();
    const mouse  = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current!);
    const hits = raycaster.intersectObject(modelRef.current, true);

    if (hits.length > 0) {
      const hit    = hits[0];
      const normal = hit.face!.normal.clone()
        .transformDirection(hit.object.matrixWorld).normalize();

      setPendingNormal(normal);
      setLatestResult(null);

      // Highlight the face group immediately
      highlightFaceGroup(modelRef.current!, normal);
    }
  }, [selectionMode, confirmed, analysing]);

  // ── Analyse ───────────────────────────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!pendingNormal || !uploadGlbFilename) return;
    setAnalysing(true);
    try {
      const res = await fetch(`${BACKEND}/reanalyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          glb_filename:   uploadGlbFilename,
          pull_direction: { x: pendingNormal.x, y: pendingNormal.y, z: pendingNormal.z },
        }),
      });
      if (res.ok) {
        const data: AnalysisResult = await res.json();
        if (data.glb_url?.startsWith("/static/")) data.glb_url = BACKEND + data.glb_url;

        // Load coloured analysis GLB — paintScene resets to blue, then backend colours show
        loadGlb(`${data.glb_url}?t=${Date.now()}`);
        setLatestResult(data);
        onAnalysisResult?.(data);
      }
    } catch (err) {
      console.error("Analyse error:", err);
    } finally {
      setAnalysing(false);
    }
  };

  // ── Try another face ──────────────────────────────────────────────────────
  const handleTryAnother = useCallback(() => {
    const base = originalGlbUrl.current?.split("?")[0];
    if (base) loadGlb(`${base}?t=${Date.now()}`);
    setPendingNormal(null);
    setLatestResult(null);
    setConfirmed(false);
    onTryAnother?.();
  }, [loadGlb, onTryAnother]);

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    setConfirmed(true);
    onFaceConfirmed?.();
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "#f5f4f0" }}>

      {/* Three.js canvas mount */}
      <div
        ref={mountRef}
        className="absolute inset-0"
        onClick={handleCanvasClick}
        style={{ cursor: selectionMode && !confirmed ? "crosshair" : "default" }}
      />

      {/* Badge */}
      <div
        data-overlay
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[#e0deda] bg-white/90 px-3 py-1.5 backdrop-blur-sm shadow-sm pointer-events-none"
      >
        <div className="h-1.5 w-1.5 rounded-full bg-[#4caf72] animate-pulse" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9a9a9e]">3D Preview</span>
      </div>

      {/* Prompt — waiting for face click */}
      {selectionMode && !pendingNormal && !analysing && !confirmed && hasModel && (
        <div data-overlay className="absolute top-4 left-1/2 z-10 -translate-x-1/2 pointer-events-none">
          <div className="rounded-xl border border-[#e0a020]/50 bg-white/95 px-5 py-3 text-center shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold text-[#c08010]">Select Top / Bottom face</p>
            <p className="mt-1 text-[10px] text-[#9a9a9e]">Click a face — it highlights yellow, then analyse</p>
          </div>
        </div>
      )}

      {/* Face highlighted — Analyse + Cancel */}
      {selectionMode && pendingNormal && !analysing && !latestResult && !confirmed && (
        <div data-overlay className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="rounded-xl border border-[#e0deda] bg-white/98 px-5 py-4 shadow-lg backdrop-blur-sm text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#9a9a9e] mb-1">Face selected</p>
            <p className="text-xs text-[#6a6a6e] mb-3">Yellow face highlighted — click Analyse to check undercuts</p>
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
        <div data-overlay className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#e0deda] bg-white/98 px-5 py-3 shadow-lg backdrop-blur-sm">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3b6bca] border-t-transparent" />
            <span className="text-[11px] font-semibold text-[#6a6a6e]">Analysing…</span>
          </div>
        </div>
      )}

      {/* Result — Accept as Top / Bottom face? */}
      {latestResult && !analysing && !confirmed && (
        <div data-overlay className="absolute top-4 left-1/2 z-10 -translate-x-1/2 w-80">
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
                  ? latestResult.undercut_severity === "high"
                    ? "⚠ High undercut risk" : "⚠ Moderate undercut risk"
                  : "✓ No undercut risk"}
              </p>
              <p className="text-[10px] text-[#6a6a6e] mt-0.5 leading-snug">{latestResult.undercut_message}</p>
              <p className="text-[10px] text-[#9a9a9e] mt-1 italic">Cost bar updated for this face</p>
            </div>
            <p className="text-[11px] font-bold text-[#1a1a1c] text-center mb-2">
              Accept as Top / Bottom face?
            </p>
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
        <div data-overlay className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
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
    </div>
  );
};

export default CADViewer;
