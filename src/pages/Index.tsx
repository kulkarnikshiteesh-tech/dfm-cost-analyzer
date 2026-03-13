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
  const [darkMode, setDarkMode] = useState(false);

  const wizardStep = !glbUrl ? 1 : !faceConfirmed ? 2 : 3;

  const handleUploadSuccess = (data: any) => {
    setGlbUrl(data.glb_url);
    const filename = data.glb_url?.split("/static/")[1]?.split("?")[0] ?? null;
    setUploadGlbFilename(filename);
    setUploadData(data);
    setAnalysisData(null);
    setFaceConfirmed(false);
    setSelectionMode(false);
  };

  const handleRequestFaceSelection = () => { setSelectionMode(true); setFaceConfirmed(false); };
  const handleAnalysisResult = (result: any) => { setAnalysisData(result); };
  const handleFaceConfirmed = () => { setFaceConfirmed(true); setSelectionMode(false); };
  const handleTryAnother = () => { setFaceConfirmed(false); setSelectionMode(true); };

  const handleStartOver = () => {
    setGlbUrl(null); setUploadGlbFilename(null); setUploadData(null);
    setAnalysisData(null); setFaceConfirmed(false); setSelectionMode(false); setShowReport(false);
  };

  const canShowReport = !!(analysisData?.volume_cubic_mm && analysisData?.bounding_box_mm);

  const stepLabels = ["Upload", "Configure", "Direction"];
  const accentColors = ["#3B6BCA", "#E67E5B", "#5BB87E"];

  // Dark mode tokens
  const dm = darkMode;
  const bg      = dm ? "#0F0F11" : "#F5F4F0";
  const panelBg = dm ? "#18181B" : "#FFFFFF";
  const border  = dm ? "#2A2A2E" : "#E0DEDA";
  const ink     = dm ? "#F0EFE8" : "#1A1A1C";
  const muted   = dm ? "#888" : "#9A9A9E";

  return (
    <div className="flex flex-col font-sans" style={{ height: "100vh", overflow: "hidden", background: bg, color: ink, transition: "background 0.2s, color 0.2s" }}>

      {/* ── HEADER ── */}
      <header className="flex shrink-0 items-center justify-between px-6" style={{ height: 48, background: panelBg, borderBottom: `1px solid ${border}` }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#3B6BCA" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.2V9.8L7 13L1 9.8V4.2L7 1Z" stroke="#ffffff" strokeWidth="1.4" fill="none"/>
              <circle cx="7" cy="7" r="2" fill="#ffffff"/>
            </svg>
          </div>
          <span className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: ink }}>Makeable</span>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ background: dm ? "#28282C" : "#F0EDE8", color: muted }}>Beta</span>
        </div>

        {/* Step indicators — center */}
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const done = wizardStep > n;
            const active = wizardStep === n;
            return (
              <div key={n} className="flex items-center gap-1">
                {n > 1 && <div className="w-5 h-px" style={{ background: border }} />}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all" style={active ? { background: `${accentColors[i]}18` } : {}}>
                  <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-black transition-all"
                    style={{ background: done ? "#5BB87E" : active ? accentColors[i] : dm ? "#2A2A2E" : "#F0EDE8", color: done || active ? "#fff" : muted }}>
                    {done ? "✓" : n}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={{ color: done ? "#5BB87E" : active ? accentColors[i] : muted }}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right — dark mode toggle */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: muted }}>{dm ? "Dark" : "Light"}</span>
          <button
            onClick={() => setDarkMode(d => !d)}
            className="relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none"
            style={{ background: dm ? "#3B6BCA" : "#D4D0CA" }}
            aria-label="Toggle dark mode"
          >
            <span className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: dm ? "translateX(22px)" : "translateX(2px)" }} />
            <span className="absolute left-1.5 text-[9px]">{dm ? "" : "☀️"}</span>
            <span className="absolute right-1.5 text-[9px]">{dm ? "🌙" : ""}</span>
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex min-h-0 flex-1">

        {/* LEFT — wizard + DFM */}
        <aside className="flex w-[308px] shrink-0 flex-col overflow-hidden" style={{ background: panelBg, borderRight: `1px solid ${border}` }}>
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
            darkMode={darkMode}
          />
          {analysisData && (
            <div className="shrink-0 overflow-y-auto" style={{ borderTop: `1px solid ${border}`, scrollbarWidth: "none" }}>
              <DFMFeedback
                volumeCubicMm={analysisData.volume_cubic_mm}
                boundingBox={analysisData.bounding_box_mm ?? null}
                hasUndercuts={analysisData.has_undercuts}
                undercutSeverity={analysisData.undercut_severity}
                undercutMessage={analysisData.undercut_message}
                onStartOver={handleStartOver}
                darkMode={darkMode}
              />
            </div>
          )}
        </aside>

        {/* CENTER — 3D viewer */}
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
            darkMode={darkMode}
          />
        </main>

        {/* RIGHT — costing */}
        <aside className="flex w-[308px] shrink-0 flex-col overflow-hidden" style={{ background: panelBg, borderLeft: `1px solid ${border}` }}>
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
            darkMode={darkMode}
          />
        </aside>

      </div>

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
