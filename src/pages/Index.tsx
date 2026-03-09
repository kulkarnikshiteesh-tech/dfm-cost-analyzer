import { useState } from "react";
import WizardPanel from "@/components/WizardPanel";
import DFMFeedback from "@/components/DFMFeedback";
import CADViewer from "@/components/CADViewer";
import CostBar from "@/components/CostBar";

const Index = () => {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1000);
  const [material, setMaterial] = useState("ABS");
  const [pullSelectionMode, setPullSelectionMode] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleUploadSuccess = (data: any) => {
    setGlbUrl(data.glb_url);
    setUploadData(data);
    setAnalysisData(null);
    setAnalysisComplete(false);
    setPullSelectionMode(false);
  };

  const handleRequestPullDirection = () => {
    setPullSelectionMode(true);
  };

  const handlePullConfirmed = async (pull: { x: number; y: number; z: number }) => {
    if (!uploadData?.glb_url) return;
    const glbFilename = uploadData.glb_url.split("/static/")[1]?.split("?")[0];
    try {
      const res = await fetch("https://threed-backend-4v3g.onrender.com/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glb_filename: glbFilename, pull_direction: pull }),
      });
      if (res.ok) {
        const newData = await res.json();
        if (newData.glb_url && newData.glb_url.startsWith("/static/")) {
          newData.glb_url = "https://threed-backend-4v3g.onrender.com" + newData.glb_url;
        }
        setGlbUrl(newData.glb_url);
        setAnalysisData(newData);
        setAnalysisComplete(true);
        setPullSelectionMode(false);
      }
    } catch (err) {
      console.error("Reanalyze error:", err);
    }
  };

  const dfmData = analysisData;

  return (
    <div
      className="flex flex-col font-sans text-[#1a1a1c]"
      style={{ height: "100vh", overflow: "hidden", background: "#f5f4f0" }}
    >
      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#e0deda] bg-white px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3b6bca]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 3.8V8.2L6 11L1 8.2V3.8L6 1Z" stroke="#ffffff" strokeWidth="1.4" fill="none"/>
              <circle cx="6" cy="6" r="1.8" fill="#ffffff"/>
            </svg>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase text-[#1a1a1c]">Makeable</span>
          <span className="rounded bg-[#f0ede8] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Beta</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[#b0ada8]">
          DFM · Costing · Manufacturing
        </div>
      </header>

      {/* BODY */}
      <div className="flex min-h-0 flex-1">

        {/* LEFT PANEL */}
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[#e0deda] bg-white overflow-hidden">
          <WizardPanel
            onUploadSuccess={handleUploadSuccess}
            onAnalysisComplete={(data) => {
              setAnalysisData(data);
              setAnalysisComplete(true);
            }}
            onMaterialChange={setMaterial}
            onQuantityChange={setQuantity}
            uploadedData={uploadData}
            quantity={quantity}
            material={material}
            onRequestPullDirection={handleRequestPullDirection}
            pullConfirmed={analysisComplete}
          />
        </aside>

        {/* CENTER */}
        <main className="flex min-w-0 flex-1 flex-col">

          {/* 3D VIEWER */}
          <div className="min-h-0 flex-1">
            <CADViewer
              glbUrl={glbUrl}
              pullSelectionMode={pullSelectionMode}
              onPullConfirmed={handlePullConfirmed}
              analysisComplete={analysisComplete}
            />
          </div>

          {/* DFM FEEDBACK — only after analysis */}
          {dfmData && (
            <div className="shrink-0 border-t border-[#e0deda] bg-white px-4 py-3 max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <DFMFeedback
                volumeCubicMm={dfmData.volume_cubic_mm}
                boundingBox={dfmData.bounding_box_mm ?? null}
                hasUndercuts={dfmData.has_undercuts}
                undercutSeverity={dfmData.undercut_severity}
                undercutMessage={dfmData.undercut_message}
                material={material}
                quantity={quantity}
              />
            </div>
          )}

          {/* COST BAR */}
          <div className="shrink-0 border-t border-[#e0deda] bg-white">
            <CostBar
              volumeCubicMm={dfmData?.volume_cubic_mm}
              boundingBox={dfmData?.bounding_box_mm ?? null}
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
