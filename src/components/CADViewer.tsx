import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useEffect } from "react";
import * as THREE from "three";
import type { Mesh } from "three";

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
      <meshStandardMaterial color="hsl(220, 80%, 56%)" metalness={0.1} roughness={0.3} />
    </RoundedBox>
  );
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, true);

  useEffect(() => {
    // Color override: make imported models blue like the cube
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.material = child.material.clone(); // Avoid mutating original
        child.material.color.set("hsl(220, 80%, 56%)");
        child.material.metalness = 0.1;
        child.material.roughness = 0.3;
      }
    });

    // Existing scale/center logic
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    scene.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center.multiplyScalar(scale));
  }, [scene]);

  return <primitive object={scene} />;
}

interface CADViewerProps {
  glbUrl?: string | null;
}

const CADViewer = ({ glbUrl }: CADViewerProps) => (
  <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-card shadow-card">
    <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-card/80 px-3 py-1.5 shadow-card backdrop-blur-sm">
      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
      <span className="text-xs font-medium text-muted-foreground">3D Preview</span>
    </div>
    <Canvas camera={{ position: [3, 3, 3], fov: 45 }} style={{ background: "#1a1a2e" }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <directionalLight position={[-5, -5, -5]} intensity={0.15} />
      <Suspense fallback={null}>
        {glbUrl ? <GLBModel url={glbUrl} /> : <SpinningCube />}
      </Suspense>
      <OrbitControls enableDamping dampingFactor={0.05} />
      <Environment preset="warehouse" environmentIntensity={0.4} />
    </Canvas>
  </div>
);

export default CADViewer;
