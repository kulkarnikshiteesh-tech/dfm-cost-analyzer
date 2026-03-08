import { useState } from "react";
import FileUploadZone from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import CADViewer from "@/components/CADViewer";
import CostChart from "@/components/CostChart";

const steps = ["Upload", "Analyse", "Costing"];

const Index = () => {
  const [data, setData] = useState<any>(null);
  const [material, setMaterial] = useState("ABS");
  const [quantity, setQuantity] = useState(1000);

  const currentStep = !data ? 0 : 1;

  return (
    <div className="flex min-h-screen flex-col bg-[#1c1c1e] font-sans text-[#e8e6e1]">

      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#2e2e30] px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#3b6bca]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="#e8e6e1" strokeWidth="1.5" fill="none"/>
              <path d="M7 5L9.5 6.5V9.5L7 11L4.5 9.5V6.5L7 5Z" fill="#e8e6e1"/>
            </svg>
          </div>
          <span className="text-sm font-bold tracking-[0.18em] uppercase text-[#e8e6e1]">Makeable</span>
          <span className="ml-1 rounded bg-[#2e2e30] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#8a8a8e]">Beta</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-all ${
                i < currentStep
                  ? "bg-[#2a4a2a] text-[#6abf6a]"
                  : i === currentStep
                  ? "bg-[#1e3358] text-[#6a9fd8]"
                  : "text-[#4a4a4e]"
              }`}>
                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold ${
                  i < currentStep ? "bg-[#6abf6a] text-[#1c1c1e]" : i === currentStep ? "bg-[#3b6bca] text-white" : "bg-[#2e2e30] text-[#4a4a4e]"
                }`}>{i < currentStep ? "✓" : i + 1}</span>
                {step}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-5 ${i < currentStep ? "bg-[#6abf6a]" : "bg-[#2e2e30]"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-widest text-[#4a4a4e]">
          DFM · Costing · Manufacturing
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL — 300px fixed */}
        <aside className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-[#2e2e30] bg-[#1c1c1e] p-5">

          <FileUploadZone onUploadSuccess={(res) => setData(res)} />

          <div className="h-px bg-[#2e2e30]" />

          <DFMFeedback
            volumeCubicMm={data?.volume_cubic_mm}
            boundingBox={data?.bounding_box_mm ?? null}
            hasUndercuts={data?.has_undercuts}
            undercutSeverity={data?.undercut_severity}
            undercutMessage={data?.undercut_message}
            material={material}
            quantity={quantity}
          />
        </aside>

        {/* CENTER + BOTTOM — flex column */}
        <main className="flex flex-1 flex-col overflow-hidden">

          {/* 3D Viewer — takes majority of space */}
          <div className="relative flex-1 min-h-0">
            <CADViewer glbUrl={data?.glb_url || null} />

            {/* Overlay hint when no model */}
            {!data && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-xl border border-[#2e2e30] bg-[#1c1c1e]/80 px-8 py-6 text-center backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#4a4a4e]">Upload a STEP file</p>
                  <p className="mt-1 text-xs text-[#3a3a3e]">to begin analysis</p>
                </div>
              </div>
            )}
          </div>

          {/* COST PANEL — bottom band */}
          <div className="border-t border-[#2e2e30] bg-[#191919] px-6 py-5" style={{ maxHeight: "42vh", overflowY: "auto" }}>
            <CostChart
              volumeCubicMm={data?.volume_cubic_mm}
              boundingBox={data?.bounding_box_mm ?? null}
              material={material}
              quantity={quantity}
              onMaterialChange={setMaterial}
              onQuantityChange={setQuantity}
            />
          </div>

        </main>
      </div>
    </div>
  );
};

export default Index;
