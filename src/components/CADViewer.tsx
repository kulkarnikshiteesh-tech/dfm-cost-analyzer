import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox } from "@react-three/drei";
import { useRef, Suspense, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const BACKEND = "https://threed-backend-4v3g.onrender.com";

// ── Correct rounded box geometry ──────────────────────────────────────────────
// Single unified vertex buffer. No merging, no CSG.
// 6 flat face patches + 12 edge cylinder strips + 8 corner sphere patches.
function buildRoundedBox(size: number, radius: number, segs: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  let vc = 0; // vertex counter

  const h = size / 2 - radius; // half-extent of inner box

  // push one vertex
  const v = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    pos.push(x, y, z); nor.push(nx, ny, nz); return vc++;
  };

  // quad from 4 vertex indices (two triangles)
  const q = (a: number, b: number, c: number, d: number) => {
    idx.push(a, b, c, a, c, d);
  };

  // ── 6 flat face patches ────────────────────────────────────────────────────
  // Each face is a (segs+1)×(segs+1) grid of vertices
  type Axis = 0 | 1 | 2;
  const faces: { ax: Axis; sign: number; ua: Axis; va: Axis }[] = [
    { ax: 0, sign:  1, ua: 2, va: 1 },
    { ax: 0, sign: -1, ua: 1, va: 2 },
    { ax: 1, sign:  1, ua: 0, va: 2 },
    { ax: 1, sign: -1, ua: 2, va: 0 },
    { ax: 2, sign:  1, ua: 1, va: 0 },
    { ax: 2, sign: -1, ua: 0, va: 1 },
  ];
  for (const { ax, sign, ua, va } of faces) {
    const base = vc;
    for (let i = 0; i <= segs; i++) {
      for (let j = 0; j <= segs; j++) {
        const pu = -h + 2 * h * i / segs;
        const pv = -h + 2 * h * j / segs;
        const p: [number, number, number] = [0, 0, 0];
        p[ax] = sign * (size / 2); p[ua] = pu; p[va] = pv;
        const n: [number, number, number] = [0, 0, 0]; n[ax] = sign;
        v(p[0], p[1], p[2], n[0], n[1], n[2]);
      }
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < segs; j++) {
        const a = base + i * (segs + 1) + j;
        q(a, a + 1, a + segs + 2, a + segs + 1);
      }
    }
  }

  // ── 12 edge cylinder strips ────────────────────────────────────────────────
  // Each edge runs along one axis; the rounded strip sweeps a quarter-circle.
  // cx,cy,cz = centre of the edge strip; axis = direction along edge; 
  // na,nb = the two axes of the quarter-circle sweep
  type EdgeDef = { cx: number; cy: number; cz: number; axis: Axis; na: Axis; nb: Axis; aSign: number; bSign: number };
  const edges: EdgeDef[] = [
    // 4 edges along X axis
    { cx:0, cy: h, cz: h, axis:0, na:1, nb:2, aSign: 1, bSign: 1 },
    { cx:0, cy: h, cz:-h, axis:0, na:2, nb:1, aSign:-1, bSign: 1 },
    { cx:0, cy:-h, cz: h, axis:0, na:2, nb:1, aSign: 1, bSign:-1 },
    { cx:0, cy:-h, cz:-h, axis:0, na:1, nb:2, aSign:-1, bSign:-1 },
    // 4 edges along Y axis
    { cx: h, cy:0, cz: h, axis:1, na:2, nb:0, aSign: 1, bSign: 1 },
    { cx: h, cy:0, cz:-h, axis:1, na:0, nb:2, aSign:-1, bSign: 1 },
    { cx:-h, cy:0, cz: h, axis:1, na:0, nb:2, aSign: 1, bSign:-1 },
    { cx:-h, cy:0, cz:-h, axis:1, na:2, nb:0, aSign:-1, bSign:-1 },
    // 4 edges along Z axis
    { cx: h, cy: h, cz:0, axis:2, na:0, nb:1, aSign: 1, bSign: 1 },
    { cx: h, cy:-h, cz:0, axis:2, na:1, nb:0, aSign:-1, bSign: 1 },
    { cx:-h, cy: h, cz:0, axis:2, na:1, nb:0, aSign: 1, bSign:-1 },
    { cx:-h, cy:-h, cz:0, axis:2, na:0, nb:1, aSign:-1, bSign:-1 },
  ];
  for (const { cx, cy, cz, axis, na, nb, aSign, bSign } of edges) {
    const base = vc;
    for (let i = 0; i <= segs; i++) {         // along edge length
      const t = -h + 2 * h * i / segs;
      for (let j = 0; j <= segs; j++) {       // around quarter-circle
        const angle = (Math.PI / 2) * j / segs;
        const na_val = aSign * Math.cos(angle);
        const nb_val = bSign * Math.sin(angle);
        const p: [number, number, number] = [cx, cy, cz];
        p[axis] = t;
        p[na] += radius * na_val;
        p[nb] += radius * nb_val;
        v(p[0], p[1], p[2], na_val * aSign, nb_val * bSign,  0);
        // fix normal — it should point away from edge centre
        const nx2: [number, number, number] = [0, 0, 0];
        nx2[na] = na_val; nx2[nb] = nb_val;
        nor.splice(nor.length - 3, 3, nx2[0], nx2[1], nx2[2]);
      }
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < segs; j++) {
        const a = base + i * (segs + 1) + j;
        q(a, a + segs + 1, a + segs + 2, a + 1);
      }
    }
  }

  // ── 8 corner sphere patches ────────────────────────────────────────────────
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const base = vc;
    for (let i = 0; i <= segs; i++) {
      const phi = (Math.PI / 2) * i / segs;
      for (let j = 0; j <= segs; j++) {
        const theta = (Math.PI / 2) * j / segs;
        const nx2 = sx * Math.cos(phi) * Math.cos(theta);
        const ny2 = sy * Math.sin(phi);
        const nz2 = sz * Math.cos(phi) * Math.sin(theta);
        v(sx * h + nx2 * radius, sy * h + ny2 * radius, sz * h + nz2 * radius, nx2, ny2, nz2);
      }
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < segs; j++) {
        const a = base + i * (segs + 1) + j;
        q(a, a + segs + 1, a + segs + 2, a + 1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal",   new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}



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

    // Spinning cube — rounded box with small fillet
    const spin = new THREE.Mesh(
      buildRoundedBox(1.8, 0.12, 6),
      new THREE.MeshStandardMaterial({ color: 0x3b6bca, metalness: 0.2, roughness: 0.3 })
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
