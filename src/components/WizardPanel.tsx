import { useState, useCallback } from "react";
import { Upload, FileBox, X, Loader2, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const BACKEND = import.meta.env.VITE_API_URL;

// ── Material database ─────────────────────────────────────────────────────────
interface MaterialProfile {
  id: string; label: string; tagline: string; density: number; pricePerKg: number;
  scores: { impact: number; stiffness: number; finish: number; heatResist: number; chemResist: number; uvResist: number; foodSafe: number; costEfficiency: number; flexibility: number; softTouch: number; };
}

const MATERIALS: MaterialProfile[] = [
  { id: "ABS",    label: "ABS",              tagline: "Best all-rounder for enclosures",           density: 1.05, pricePerKg: 120, scores: { impact:2, stiffness:2, finish:3, heatResist:1, chemResist:1, uvResist:0, foodSafe:0, costEfficiency:3, flexibility:0, softTouch:0 } },
  { id: "PP",     label: "PP",               tagline: "Lightest, chemical-resistant, food-safe",   density: 0.91, pricePerKg: 95,  scores: { impact:2, stiffness:1, finish:2, heatResist:1, chemResist:3, uvResist:1, foodSafe:3, costEfficiency:3, flexibility:1, softTouch:0 } },
  { id: "Nylon",  label: "Nylon PA6",        tagline: "Strongest for mechanical parts",            density: 1.14, pricePerKg: 200, scores: { impact:3, stiffness:3, finish:2, heatResist:2, chemResist:2, uvResist:0, foodSafe:0, costEfficiency:1, flexibility:0, softTouch:0 } },
  { id: "PC",     label: "Polycarbonate",    tagline: "Transparent, tough, heat-resistant",        density: 1.20, pricePerKg: 280, scores: { impact:3, stiffness:2, finish:3, heatResist:3, chemResist:1, uvResist:2, foodSafe:0, costEfficiency:1, flexibility:0, softTouch:0 } },
  { id: "HIPS",   label: "HIPS",             tagline: "Cheapest rigid plastic, easy to paint",     density: 1.05, pricePerKg: 90,  scores: { impact:1, stiffness:1, finish:2, heatResist:0, chemResist:0, uvResist:0, foodSafe:0, costEfficiency:3, flexibility:0, softTouch:0 } },
  { id: "TPU",    label: "TPU",              tagline: "Flexible, snaps back, absorbs impact",      density: 1.20, pricePerKg: 200, scores: { impact:3, stiffness:0, finish:2, heatResist:1, chemResist:2, uvResist:1, foodSafe:0, costEfficiency:1, flexibility:3, softTouch:1 } },
  { id: "TPE",    label: "TPE",              tagline: "Rubber-soft grip surfaces",                 density: 0.90, pricePerKg: 180, scores: { impact:2, stiffness:0, finish:2, heatResist:0, chemResist:1, uvResist:1, foodSafe:1, costEfficiency:2, flexibility:2, softTouch:3 } },
  { id: "ASA",    label: "ASA",              tagline: "ABS but UV-stable — great outdoors",        density: 1.07, pricePerKg: 160, scores: { impact:2, stiffness:2, finish:3, heatResist:1, chemResist:1, uvResist:3, foodSafe:0, costEfficiency:2, flexibility:0, softTouch:0 } },
  { id: "POM",    label: "POM (Delrin)",     tagline: "Self-lubricating, precise — gears & clips", density: 1.41, pricePerKg: 250, scores: { impact:2, stiffness:3, finish:3, heatResist:2, chemResist:2, uvResist:0, foodSafe:1, costEfficiency:1, flexibility:0, softTouch:0 } },
  { id: "PMMA",   label: "PMMA (Acrylic)",   tagline: "Crystal clear — lenses, light pipes",       density: 1.19, pricePerKg: 220, scores: { impact:1, stiffness:2, finish:3, heatResist:1, chemResist:1, uvResist:2, foodSafe:0, costEfficiency:2, flexibility:0, softTouch:0 } },
  { id: "PA6GF",  label: "Nylon GF30",       tagline: "Glass-filled — maximum stiffness",          density: 1.36, pricePerKg: 300, scores: { impact:2, stiffness:3, finish:1, heatResist:3, chemResist:2, uvResist:0, foodSafe:0, costEfficiency:1, flexibility:0, softTouch:0 } },
];

interface Answers { partType: string; environment: string[]; requirements: string[]; }

function recommendMaterial(answers: Answers): { id: string; label: string; reason: string } {
  const w = { impact:0, stiffness:0, finish:0, heatResist:0, chemResist:0, uvResist:0, foodSafe:0, costEfficiency:0, flexibility:0, softTouch:0 };
  if (answers.partType === "structural")  { w.stiffness += 2; w.impact += 1; }
  if (answers.partType === "enclosure")   { w.finish += 1; w.impact += 1; }
  if (answers.partType === "flexible")    { w.flexibility += 3; }
  if (answers.partType === "grip")        { w.softTouch += 3; w.flexibility += 1; }
  if (answers.environment.includes("outdoor"))  { w.uvResist += 2; w.heatResist += 1; }
  if (answers.environment.includes("heat"))     { w.heatResist += 3; }
  if (answers.environment.includes("chemical")) { w.chemResist += 3; }
  if (answers.environment.includes("food"))     { w.foodSafe += 3; w.chemResist += 1; }
  if (answers.requirements.includes("drops"))   { w.impact += 2; }
  if (answers.requirements.includes("finish"))  { w.finish += 2; }
  if (answers.requirements.includes("stiff"))   { w.stiffness += 2; }
  if (answers.requirements.includes("cost"))    { w.costEfficiency += 3; }
  if (answers.requirements.includes("light"))   { w.costEfficiency += 1; }
  const winner = MATERIALS.map(mat => ({ mat, score: (Object.keys(w) as (keyof typeof w)[]).reduce((s, k) => s + (mat.scores[k] ?? 0) * w[k], 0) })).sort((a, b) => b.score - a.score)[0].mat;
  const reasons: string[] = [];
  if (answers.partType === "flexible")           reasons.push("it flexes and recovers without breaking");
  if (answers.partType === "grip")               reasons.push("it gives a rubber-soft feel");
  if (answers.partType === "structural")         reasons.push("it handles load and wear");
  if (answers.environment.includes("outdoor"))   reasons.push("it holds up to UV and weather");
  if (answers.environment.includes("heat"))      reasons.push("it resists high temperatures");
  if (answers.environment.includes("chemical"))  reasons.push("it resists chemicals and moisture");
  if (answers.environment.includes("food"))      reasons.push("it is food-safe");
  if (answers.requirements.includes("drops"))    reasons.push("it absorbs impact well");
  if (answers.requirements.includes("finish"))   reasons.push("it takes a great surface finish");
  if (answers.requirements.includes("stiff"))    reasons.push("it stays rigid under load");
  if (answers.requirements.includes("cost"))     reasons.push("it keeps material cost low");
  return {
    id: winner.id, label: winner.label,
    reason: reasons.length > 0
      ? `${winner.label} — ${winner.tagline}. Recommended because ${reasons.slice(0, 3).join(", ")}.`
      : `${winner.label} — ${winner.tagline}. Best all-round match for your requirements.`,
  };
}

const QTY_STEPS = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];

// ── Small chip for Q cards ────────────────────────────────────────────────────
function QChip({ label, selected, onClick, dm = false, border = "#E0DEDA" }: {
  label: string; selected: boolean; onClick: () => void; dm?: boolean; border?: string;
}) {
  return (
    <button onClick={onClick} className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
      style={{
        border: `1px solid ${selected ? "#3B6BCA" : border}`,
        background: selected ? (dm ? "#1A2540" : "#EEF2FC") : (dm ? "#28282C" : "#F8F7F4"),
        color: selected ? "#3B6BCA" : (dm ? "#AAA" : "#6A6A6E"),
        fontWeight: selected ? 600 : 400,
      }}>
      {label}
    </button>
  );
}

// ── Option button (single select) ─────────────────────────────────────────────
function Option({ label, sub, selected, onClick, dm = false, border = "#E0DEDA", cardBg = "#F8F7F4", ink = "#1A1A1C", muted = "#9A9A9E" }: {
  label: string; sub?: string; selected: boolean; onClick: () => void;
  dm?: boolean; border?: string; cardBg?: string; ink?: string; muted?: string;
}) {
  return (
    <button onClick={onClick} className="w-full rounded-xl px-3 py-2.5 text-left transition-all"
      style={{ border: `1px solid ${selected ? "#3B6BCA" : border}`, background: selected ? (dm ? "#1A2540" : "#EEF2FC") : cardBg }}>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 shrink-0 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: selected ? "#3B6BCA" : (dm ? "#555" : "#C0BDB8") }}>
          {selected && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#3B6BCA" }} />}
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: selected ? "#3B6BCA" : ink }}>{label}</p>
          {sub && <p className="mt-0.5 text-[10px] leading-snug" style={{ color: muted }}>{sub}</p>}
        </div>
      </div>
    </button>
  );
}

// ── Progress bar for Q cards ──────────────────────────────────────────────────
function QProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1 mb-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{
          background: i < step - 1 ? "#5BB87E" : i === step - 1 ? "#3B6BCA" : "#E0DEDA"
        }} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface WizardPanelProps {
  onUploadSuccess: (data: any) => void;
  onAnalysisComplete: (data: any) => void;
  onMaterialChange: (m: string) => void;
  onQuantityChange: (q: number) => void;
  onRequestFaceSelection: () => void;
  onRecommendationChange?: (materialId: string) => void;
  uploadedData: any;
  quantity: number;
  material: string;
  faceConfirmed: boolean;
  analysisData?: any;
  darkMode?: boolean;
}

type Step = 1 | 2 | 3;
type QStep = 1 | 2 | 3 | 4;

const WizardPanel = ({
  onUploadSuccess, onMaterialChange, onQuantityChange, onRequestFaceSelection,
  onRecommendationChange, uploadedData, quantity, faceConfirmed, analysisData,
  darkMode: dm = false,
}: WizardPanelProps) => {
  const [step, setStep] = useState<Step>(1);
  const [qStep, setQStep] = useState<QStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [answers, setAnswers] = useState<Partial<Answers>>({ environment: [], requirements: [] });
  const [recommendation, setRecommendation] = useState<{ id: string; label: string; reason: string } | null>(null);
  const [materialOverridden, setMaterialOverridden] = useState(false);

  const qtyIndex = QTY_STEPS.reduce((best, val, i) => Math.abs(val - quantity) < Math.abs(QTY_STEPS[best] - quantity) ? i : best, 0);

  const uploadFile = async (selectedFile: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(`${BACKEND}/upload`, { method: "POST", body: formData });
      if (response.status === 422) {
        const errData = await response.json();
        const titles: Record<string, string> = { assembly: "Assembly detected", not_moldable: "Not injection moldable", geometry_error: "Geometry error" };
        toast.error(`⚠️ ${titles[errData.error] ?? "Upload issue"} — ${errData.message}`, { duration: 8000 });
        setFile(null); return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.glb_url?.startsWith("/static/")) data.glb_url = BACKEND + data.glb_url;
      onUploadSuccess(data);
      setStep(2); setQStep(1);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
      setFile(null);
    } finally { setIsUploading(false); }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    const name = f?.name.toLowerCase() ?? "";
    if (name.endsWith(".step") || name.endsWith(".stp")) { setFile(f); uploadFile(f); }
    else toast.error("Please upload a .step or .stp file");
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); uploadFile(f); }
  };

  const toggleEnv = (val: string) => setAnswers(a => { const cur = a.environment ?? []; return { ...a, environment: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] }; });
  const toggleReq = (val: string) => setAnswers(a => { const cur = a.requirements ?? []; return { ...a, requirements: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] }; });

  const canAdvanceQ1 = !!answers.partType;
  const canAdvanceQ2 = (answers.environment?.length ?? 0) > 0;
  const canAdvanceQ3 = (answers.requirements?.length ?? 0) > 0;

  const handleProceedToPull = () => {
    const rec = recommendMaterial(answers as Answers);
    setRecommendation(rec);
    if (!materialOverridden) onMaterialChange(rec.id);
    onRecommendationChange?.(rec.id);
    setStep(3);
    onRequestFaceSelection();
  };

  const handleReset = () => {
    setStep(1); setQStep(1); setFile(null);
    setAnswers({ environment: [], requirements: [] });
    setRecommendation(null); setMaterialOverridden(false);
  };

  const bb = uploadedData?.bounding_box_mm;

  // Theme tokens
  const panelBg = dm ? "#18181B" : "#FFFFFF";
  const cardBg  = dm ? "#222226" : "#F8F7F4";
  const border  = dm ? "#2A2A2E" : "#E0DEDA";
  const ink     = dm ? "#F0EFE8" : "#1A1A1C";
  const muted   = dm ? "#999"    : "#9A9A9E";
  const faint   = dm ? "#555"    : "#B0ADA8";

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: panelBg }}>

      {/* Gradient accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #3B6BCA 0%, #5BB87E 50%, #E67E5B 100%)", flexShrink: 0 }} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>

        {/* ── STEP 1 — Upload ── */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: muted }}>Upload Geometry</p>
            <label
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${isUploading ? "pointer-events-none opacity-60" : ""}`}
              style={{ borderColor: isDragging ? "#3B6BCA" : border, background: isDragging ? (dm ? "#1A2540" : "#EEF2FC") : cardBg }}
            >
              <input type="file" accept=".step,.stp" onChange={handleFileSelect} className="sr-only" disabled={isUploading} />
              {isUploading ? (
                <>
                  <Loader2 className="mb-2 h-7 w-7 animate-spin" style={{ color: "#3B6BCA" }} />
                  <span className="text-sm font-bold" style={{ color: "#3B6BCA" }}>Analysing geometry…</span>
                  <span className="mt-1 text-[10px]" style={{ color: muted }}>This may take a moment</span>
                </>
              ) : (
                <>
                  <div className="mb-3 rounded-xl p-3 shadow-sm" style={{ background: panelBg, border: `1px solid ${border}` }}>
                    <Upload className="h-5 w-5" style={{ color: "#3B6BCA" }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: ink }}>Drop .step here</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: muted }}>or click to browse</span>
                </>
              )}
            </label>
            {file && !isUploading && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ border: "1px solid #3B6BCA50", background: dm ? "#1A2540" : "#EEF2FC" }}>
                <FileBox className="h-4 w-4 shrink-0" style={{ color: "#3B6BCA" }} />
                <span className="flex-1 truncate text-xs font-bold font-mono" style={{ color: ink }}>{file.name}</span>
                <button onClick={() => setFile(null)}><X className="h-3.5 w-3.5" style={{ color: muted }} /></button>
              </div>
            )}
            <div className="rounded-xl px-3 py-2.5" style={{ border: `1px solid ${border}`, background: cardBg }}>
              <p className="text-[11px]" style={{ color: dm ? "#AAA" : "#6A6A6E" }}>.STEP / .STP only · Single part · No assemblies</p>
            </div>
          </div>
        )}

        {/* ── STEP 2 — Configure (card-by-card) ── */}
        {step === 2 && (
          <div className="space-y-4">
            {bb && (
              <div className="rounded-xl px-3 py-2.5" style={{ border: `1px solid #3B6BCA40`, background: dm ? "#1A2540" : "#EEF2FC" }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#6A9FD8" }}>Model dimensions</p>
                <p className="text-xs font-black font-mono" style={{ color: ink }}>{bb.x.toFixed(1)} × {bb.y.toFixed(1)} × {bb.z.toFixed(1)} mm</p>
              </div>
            )}

            {/* Q1 */}
            {qStep === 1 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}`, background: panelBg }}>
                <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
                  <QProgress step={1} total={4} />
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#3B6BCA" }}>Question 1 of 3</p>
                  <p className="text-sm font-bold" style={{ color: ink }}>What is your part?</p>
                  <p className="text-[10px] mt-0.5" style={{ color: muted }}>Pick the one that fits best</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    { val: "enclosure",  label: "Housing or enclosure",      sub: "A shell that holds electronics or other parts" },
                    { val: "structural", label: "Structural or load-bearing", sub: "A bracket, frame, or part that takes force" },
                    { val: "flexible",   label: "Flexible or spring-like",    sub: "A clip, snap-fit, or hinge that bends and springs back" },
                    { val: "grip",       label: "Grip or soft-touch surface", sub: "A handle, button, or surface someone holds" },
                  ].map(({ val, label, sub }) => (
                    <Option key={val} label={label} sub={sub} selected={answers.partType === val} onClick={() => setAnswers(a => ({ ...a, partType: val }))} dm={dm} border={border} cardBg={cardBg} ink={ink} muted={muted} />
                  ))}
                </div>
                <div className="flex justify-end px-4 pb-4">
                  <button onClick={() => setQStep(2)} disabled={!canAdvanceQ1}
                    className="flex items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-bold transition-all"
                    style={{ background: canAdvanceQ1 ? "#3B6BCA" : (dm ? "#2A2A2E" : "#E0DEDA"), color: canAdvanceQ1 ? "#fff" : muted, cursor: canAdvanceQ1 ? "pointer" : "not-allowed" }}>
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Q2 */}
            {qStep === 2 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}`, background: panelBg }}>
                <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
                  <QProgress step={2} total={4} />
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#E67E5B" }}>Question 2 of 3</p>
                  <p className="text-sm font-bold" style={{ color: ink }}>Where will it be used?</p>
                  <p className="text-[10px] mt-0.5" style={{ color: muted }}>Select all that apply</p>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {["Indoors","Outdoors / UV","Near heat","Chemicals / liquids","Food / skin contact"].map((label, i) => {
                    const vals = ["indoor","outdoor","heat","chemical","food"];
                    return <QChip key={label} label={label} selected={(answers.environment ?? []).includes(vals[i])} onClick={() => toggleEnv(vals[i])} dm={dm} border={border} />;
                  })}
                </div>
                <div className="flex justify-between px-4 pb-4">
                  <button onClick={() => setQStep(1)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors"
                    style={{ border: `1px solid ${border}`, background: "transparent", color: dm ? "#AAA" : "#6A6A6E" }}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <button onClick={() => setQStep(3)} disabled={!canAdvanceQ2}
                    className="flex items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-bold"
                    style={{ background: canAdvanceQ2 ? "#E67E5B" : (dm ? "#2A2A2E" : "#E0DEDA"), color: canAdvanceQ2 ? "#fff" : muted, cursor: canAdvanceQ2 ? "pointer" : "not-allowed" }}>
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Q3 */}
            {qStep === 3 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}`, background: panelBg }}>
                <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
                  <QProgress step={3} total={4} />
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#5BB87E" }}>Question 3 of 3</p>
                  <p className="text-sm font-bold" style={{ color: ink }}>What does it need to do well?</p>
                  <p className="text-[10px] mt-0.5" style={{ color: muted }}>Select all that apply</p>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {["Survive drops","Smooth finish","Stay stiff","Low cost","Lightweight"].map((label, i) => {
                    const vals = ["drops","finish","stiff","cost","light"];
                    return <QChip key={label} label={label} selected={(answers.requirements ?? []).includes(vals[i])} onClick={() => toggleReq(vals[i])} dm={dm} border={border} />;
                  })}
                </div>
                <div className="flex justify-between px-4 pb-4">
                  <button onClick={() => setQStep(2)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold"
                    style={{ border: `1px solid ${border}`, background: "transparent", color: dm ? "#AAA" : "#6A6A6E" }}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <button onClick={() => setQStep(4)} disabled={!canAdvanceQ3}
                    className="flex items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-bold"
                    style={{ background: canAdvanceQ3 ? "#5BB87E" : (dm ? "#2A2A2E" : "#E0DEDA"), color: canAdvanceQ3 ? "#fff" : muted, cursor: canAdvanceQ3 ? "pointer" : "not-allowed" }}>
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Q4 — Quantity */}
            {qStep === 4 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}`, background: panelBg }}>
                <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
                  <QProgress step={4} total={4} />
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#9A9AFF" }}>Almost there</p>
                  <p className="text-sm font-bold" style={{ color: ink }}>Production quantity</p>
                  <p className="text-[10px] mt-0.5" style={{ color: muted }}>This affects mold type and per-unit cost</p>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: dm ? "#AAA" : "#6A6A6E" }}>Quantity</span>
                    <span className="text-lg font-black tabular-nums" style={{ color: ink }}>{quantity.toLocaleString("en-IN")} <span className="text-[10px] font-normal" style={{ color: faint }}>units</span></span>
                  </div>
                  <input type="range" min={0} max={QTY_STEPS.length - 1} step={1} value={qtyIndex}
                    onChange={(e) => onQuantityChange(QTY_STEPS[parseInt(e.target.value)])}
                    className="w-full cursor-pointer appearance-none rounded-full accent-[#9a9aff]"
                    style={{ height: 4, background: border }} />
                  <div className="flex justify-between text-[8px]" style={{ color: faint }}>
                    {QTY_STEPS.map((q) => (
                      <span key={q} style={quantity === q ? { color: "#9A9AFF", fontWeight: 700 } : {}}>
                        {q >= 1000 ? `${q / 1000}k` : q}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between px-4 pb-4">
                  <button onClick={() => setQStep(3)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold"
                    style={{ border: `1px solid ${border}`, background: "transparent", color: dm ? "#AAA" : "#6A6A6E" }}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <button onClick={handleProceedToPull} className="flex items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-bold text-white hover:opacity-90"
                    style={{ background: "#9A9AFF" }}>
                    Get recommendation <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 — Recommendation only ── */}
        {step === 3 && recommendation && (
          <div className="rounded-2xl" style={{ border: `1px solid #3B6BCA40`, overflow: "visible" }}>
            <div className="px-4 py-3 rounded-2xl" style={{ background: dm ? "#1A2540" : "linear-gradient(135deg, #EEF2FC 0%, #F5F8FF 100%)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#6A9FD8" }}>Recommended material</p>
              <p className="text-base font-black" style={{ color: ink }}>{recommendation.label}</p>
              <p className="text-[11px] leading-relaxed mt-1" style={{ color: dm ? "#AAA" : "#6A6A6E" }}>{recommendation.reason}</p>
              <p className="text-[10px] mt-2" style={{ color: "#9A9AFF" }}>To override → material selector on the right panel.</p>
            </div>
          </div>
        )}

      </div>

      {/* Footer — only shown on step 2 q1 */}
      {step === 2 && qStep === 1 && (
        <div className="shrink-0 px-4 py-3 flex gap-2" style={{ borderTop: `1px solid ${border}`, background: panelBg }}>
          <button onClick={() => setStep(1)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors"
            style={{ border: `1px solid ${border}`, color: dm ? "#AAA" : "#6A6A6E", background: "transparent" }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>
      )}

    </div>
  );
};

export default WizardPanel;
