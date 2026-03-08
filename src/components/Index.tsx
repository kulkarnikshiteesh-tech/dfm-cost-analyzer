import { useState } from "react";
import FileUploadZone from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import CADViewer from "@/components/CADViewer";
import CostBar from "@/components/CostBar";

const Index = () => {
  const [data, setData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1000);
  const [material, setMaterial] = useState("ABS");

  return (
    <div className="flex flex-col bg-[#1a1a1c] font-sans text-[#e8e6e1]" style={{ height: "100vh", overflow: "hidden" }}>

      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#2a2a2e] px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3b6bca]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 3.8V8.2L6 11L1 8.2V3.8L6 1Z" stroke="#e8e6e1" strokeWidth="1.4" fill="none"/>
              <circle cx="6" cy="6" r="1.8" fill="#e8e6e1"/>
            </svg>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-[#e8e6e1]">Makeable</span>
          <span className="rounded bg-[#2a2a2e] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#5a5a5e]">Beta</span>
        </div>

        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest">
          {!data
            ? <span className="text-[#5a5a5e]">Upload a STEP file to begin</span>
            : <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#6abf6a] animate-pulse" />
                <span className="text-[#6abf6a]">Model analysed</span>
              </div>
          }
        </div>

        <div className="text-[10px] uppercase tracking-widest text-[#3a3a3e]">
          DFM · Costing · Manufacturing
        </div>
      </header>

      {/* BODY */}
      <div className="flex min-h-0 flex-1">

        {/* LEFT PANEL */}
        <aside className="flex w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-[#2a2a2e] p-4" style={{ scrollbarWidth: "none" }}>
          <FileUploadZone onUploadSuccess={(res) => setData(res)} />
          <div className="h-px shrink-0 bg-[#2a2a2e]" />
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

        {/* CENTER */}
        <main className="flex min-w-0 flex-1 flex-col">

          {/* 3D VIEWER */}
          <div className="min-h-0 flex-1">
            <CADViewer
              glbUrl={data?.glb_url || null}
              onAnalysisUpdate={(newData) => setData(newData)}
            />
          </div>

          {/* COST BAR */}
          <div className="shrink-0 border-t border-[#2a2a2e] bg-[#161618]">
            <CostBar
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
