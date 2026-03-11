import { useState } from "react";
import WizardPanel from "@/components/WizardPanel";
import DFMFeedback from "@/components/DFMFeedback";
import CADViewer from "@/components/CADViewer";
import CostBar from "@/components/CostBar";
import ReportModal from "@/components/ReportModal";

const Index = () => {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [uploadGlbFilename, setUploadGlbFilename] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [quantity, setQuantity] = useState(1000);
  const [material, setMaterial] = useState("ABS");
  const [selectionMode, setSelectionMode] = useState(false);
  const [faceConfirmed, setFaceConfirmed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [recommendedMaterial, setRecommendedMaterial] = useState<string | null>(null);

  const handleUploadSuccess = (data: any) => {
    setGlbUrl(data.glb_url);
    const filename = data.glb_url?.split("/static/")[1]?.split("?")[0] ?? null;
    setUploadGlbFilename(filename);
    setUploadData(data);
    setAnalysisData(null);
    setFaceConfirmed(false);
    setSelectionMode(false);
  };

  const handleRequestFaceSelection = () => {
    setSelectionMode(true);
    setFaceConfirmed(false);
  };

  const handleAnalysisResult = (result: any) => {
    setAnalysisData(result);
  };

  const handleFaceConfirmed = () => {
    setFaceConfirmed(true);
    setSelectionMode(false);
  };

  const handleTryAnother = () => {
    setFaceConfirmed(false);
    setSelectionMode(true);
  };

  const handleStartOver = () => {
    setGlbUrl(null);
    setUploadGlbFilename(null);
    setUploadData(null);
    setAnalysisData(null);
    setFaceConfirmed(false);
    setSelectionMode(false);
    setShowReport(false);
  };

  const canShowReport = !!(analysisData?.volume_cubic_mm && analysisData?.bounding_box_mm);

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

        {/* LEFT PANEL — wizard + DFM feedback */}
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[#e0deda] bg-white overflow-hidden">
          <WizardPanel
            onUploadSuccess={handleUploadSuccess}
            onAnalysisComplete={(data) => setAnalysisData(data)}
            onMaterialChange={setMaterial}
            onQuantityChange={setQuantity}
            uploadedData={uploadData}
            quantity={quantity}
            material={material}
            onRequestFaceSelection={handleRequestFaceSelection}
            faceConfirmed={faceConfirmed}
            analysisData={analysisData}
            onRecommendationChange={setRecommendedMaterial}
          />
          {/* DFM Feedback sits below wizard in left panel */}
          {analysisData && (
            <div className="shrink-0 border-t border-[#e0deda] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <DFMFeedback
                volumeCubicMm={analysisData.volume_cubic_mm}
                boundingBox={analysisData.bounding_box_mm ?? null}
                hasUndercuts={analysisData.has_undercuts}
                undercutSeverity={analysisData.undercut_severity}
                undercutMessage={analysisData.undercut_message}
              />
            </div>
          )}
        </aside>

        {/* CENTER — 3D viewer, full height, never shrinks */}
        <main className="flex min-w-0 flex-1">
          <CADViewer
            glbUrl={glbUrl}
            uploadGlbFilename={uploadGlbFilename}
            selectionMode={selectionMode}
            onAnalysisResult={handleAnalysisResult}
            onFaceConfirmed={handleFaceConfirmed}
            onTryAnother={handleTryAnother}
            onStartOver={handleStartOver}
            analysisComplete={faceConfirmed}
          />
        </main>

        {/* RIGHT PANEL — costing */}
        <aside className="flex w-[280px] shrink-0 flex-col border-l border-[#e0deda] bg-white overflow-hidden">
          <CostBar
            volumeCubicMm={analysisData?.volume_cubic_mm}
            boundingBox={analysisData?.bounding_box_mm ?? null}
            material={material}
            quantity={quantity}
            hasUndercuts={analysisData?.has_undercuts ?? null}
            undercutSeverity={analysisData?.undercut_severity ?? null}
            undercutMessage={analysisData?.undercut_message ?? null}
            onMaterialChange={setMaterial}
            onQuantityChange={setQuantity}
            onOpenReport={canShowReport ? () => setShowReport(true) : undefined}
            recommendedMaterial={recommendedMaterial}
          />
        </aside>

      </div>

      {/* REPORT MODAL — rendered once, shared by both triggers */}
      {showReport && canShowReport && (
        <ReportModal
          volumeCubicMm={analysisData.volume_cubic_mm}
          boundingBox={analysisData.bounding_box_mm}
          material={material}
          quantity={quantity}
          hasUndercuts={analysisData.has_undercuts}
          undercutSeverity={analysisData.undercut_severity}
          undercutMessage={analysisData.undercut_message}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default Index;
