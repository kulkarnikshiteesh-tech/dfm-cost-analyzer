import { useState, useCallback } from "react";
import { Upload, FileBox, X, Loader2, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const BACKEND = "https://threed-backend-4v3g.onrender.com";

// ── Material database ─────────────────────────────────────────────────────────

interface MaterialProfile {
  id: string;
  label: string;
  tagline: string;
  density: number;   // g/cm³
  pricePerKg: number; // ₹
  scores: {
    impact: number;       // 0–3
    stiffness: number;
    finish: number;
    heatResist: number;
    chemResist: number;
    uvResist: number;
    foodSafe: number;
    costEfficiency: number;
    flexibility: number;
    softTouch: number;
  };
}

const MATERIALS: MaterialProfile[] = [
  { id: "ABS",    label: "ABS",              tagline: "Best all-rounder for enclosures",         density: 1.05, pricePerKg: 120,
    scores: { impact:2, stiffness:2, finish:3, heatResist:1, chemResist:1, uvResist:0, foodSafe:0, costEfficiency:3, flexibility:0, softTouch:0 } },
  { id: "PP",     label: "PP",               tagline: "Lightest, chemical-resistant, food-safe", density: 0.91, pricePerKg: 95,
    scores: { impact:2, stiffness:1, finish:2, heatResist:1, chemResist:3, uvResist:1, foodSafe:3, costEfficiency:3, flexibility:1, softTouch:0 } },
  { id: "Nylon",  label: "Nylon PA6",        tagline: "Strongest for mechanical parts",          density: 1.14, pricePerKg: 200,
    scores: { impact:3, stiffness:3, finish:2, heatResist:2, chemResist:2, uvResist:0, foodSafe:0, costEfficiency:1, flexibility:0, softTouch:0 } },
  { id: "PC",     label: "Polycarbonate",    tagline: "Transparent, tough, heat-resistant",      density: 1.20, pricePerKg: 280,
    scores: { impact:3, stiffness:2, finish:3, heatResist:3, chemResist:1, uvResist:2, foodSafe:0, costEfficiency:1, flexibility:0, softTouch:0 } },
  { id: "HIPS",   label: "HIPS",             tagline: "Cheapest rigid plastic, easy to paint",   density: 1.05, pricePerKg: 90,
    scores: { impact:1, stiffness:1, finish:2, heatResist:0, chemResist:0, uvResist:0, foodSafe:0, costEfficiency:3, flexibility:0, softTouch:0 } },
  { id: "TPU",    label: "TPU",              tagline: "Flexible, snaps back, absorbs impact",    density: 1.20, pricePerKg: 200,
    scores: { impact:3, stiffness:0, finish:2, heatResist:1, chemResist:2, uvResist:1, foodSafe:0, costEfficiency:1, flexibility:3, softTouch:1 } },
  { id: "TPE",    label: "TPE",              tagline: "Rubber-soft grip surfaces",               density: 0.90, pricePerKg: 180,
    scores: { impact:2, stiffness:0, finish:2, heatResist:0, chemResist:1, uvResist:1, foodSafe:1, costEfficiency:2, flexibility:2, softTouch:3 } },
  { id: "ASA",    label: "ASA",              tagline: "ABS but UV-stable — great outdoors",      density: 1.07, pricePerKg: 160,
    scores: { impact:2, stiffness:2, finish:3, heatResist:1, chemResist:1, uvResist:3, foodSafe:0, costEfficiency:2, flexibility:0, softTouch:0 } },
  { id: "POM",    label: "POM (Delrin)",     tagline: "Self-lubricating, precise — gears & clips", density: 1.41, pricePerKg: 250,
    scores: { impact:2, stiffness:3, finish:3, heatResist:2, chemResist:2, uvResist:0, foodSafe:1, costEfficiency:1, flexibility:0, softTouch:0 } },
  { id: "PMMA",   label: "PMMA (Acrylic)",   tagline: "Crystal clear — lenses, light pipes",     density: 1.19, pricePerKg: 220,
    scores: { impact:1, stiffness:2, finish:3, heatResist:1, chemResist:1, uvResist:2, foodSafe:0, costEfficiency:2, flexibility:0, softTouch:0 } },
  { id: "PA6GF",  label: "Nylon GF30",       tagline: "Glass-filled — maximum stiffness",        density: 1.36, pricePerKg: 300,
    scores: { impact:2, stiffness:3, finish:1, heatResist:3, chemResist:2, uvResist:0, foodSafe:0, costEfficiency:1, flexibility:0, softTouch:0 } },
];

const ALL_MATERIAL_IDS = MATERIALS.map(m => m.id);

// ── New answers shape ─────────────────────────────────────────────────────────

interface Answers {
  partType: string;           // single select
  environment: string[];      // multi-select
  requirements: string[];     // multi-select
}

// ── Scoring-based recommendation ──────────────────────────────────────────────

function recommendMaterial(answers: Answers): { id: string; label: string; reason: string } {
  // Build weight vector from answers
  const w = {
    impact:       0,
    stiffness:    0,
    finish:       0,
    heatResist:   0,
    chemResist:   0,
    uvResist:     0,
    foodSafe:     0,
    costEfficiency: 0,
    flexibility:  0,
    softTouch:    0,
  };

  // Part type weights
  if (answers.partType === "structural")  { w.stiffness += 2; w.impact += 1; }
  if (answers.partType === "enclosure")   { w.finish += 1; w.impact += 1; }
  if (answers.partType === "flexible")    { w.flexibility += 3; }
  if (answers.partType === "grip")        { w.softTouch += 3; w.flexibility += 1; }

  // Environment weights
  if (answers.environment.includes("outdoor"))  { w.uvResist += 2; w.heatResist += 1; }
  if (answers.environment.includes("heat"))     { w.heatResist += 3; }
  if (answers.environment.includes("chemical")) { w.chemResist += 3; }
  if (answers.environment.includes("food"))     { w.foodSafe += 3; w.chemResist += 1; }

  // Requirement weights
  if (answers.requirements.includes("drops"))   { w.impact += 2; }
  if (answers.requirements.includes("finish"))  { w.finish += 2; }
  if (answers.requirements.includes("stiff"))   { w.stiffness += 2; }
  if (answers.requirements.includes("cost"))    { w.costEfficiency += 3; }
  if (answers.requirements.includes("light"))   { w.costEfficiency += 1; } // PP is lightest + cheap

  // Score each material
  const scored = MATERIALS.map(mat => {
    let score = 0;
    for (const key of Object.keys(w) as (keyof typeof w)[]) {
      score += (mat.scores[key] ?? 0) * w[key];
    }
    return { mat, score };
  }).sort((a, b) => b.score - a.score);

  const winner = scored[0].mat;
  const runnerUp = scored[1].mat;

  // Build a plain-English reason from top contributing factors
  const reasons: string[] = [];
  if (answers.partType === "flexible")  reasons.push("it flexes and recovers without breaking");
  if (answers.partType === "grip")      reasons.push("it gives a rubber-soft feel");
  if (answers.partType === "structural") reasons.push("it handles load and wear");
  if (answers.environment.includes("outdoor"))  reasons.push("it holds up to UV and weather");
  if (answers.environment.includes("heat"))     reasons.push("it resists high temperatures");
  if (answers.environment.includes("chemical")) reasons.push("it resists chemicals and moisture");
  if (answers.environment.includes("food"))     reasons.push("it is food-safe");
  if (answers.requirements.includes("drops"))   reasons.push("it absorbs impact well");
  if (answers.requirements.includes("finish"))  reasons.push("it takes a great surface finish");
  if (answers.requirements.includes("stiff"))   reasons.push("it stays rigid under load");
  if (answers.requirements.includes("cost"))    reasons.push("it keeps material cost low");

  const reasonStr = reasons.length > 0
    ? `${winner.label} — ${winner.tagline}. Recommended because ${reasons.slice(0, 3).join(", ")}.`
    : `${winner.label} — ${winner.tagline}. Best all-round match for your requirements.`;

  return { id: winner.id, label: winner.label, reason: reasonStr };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDot({ n, current, done }: { n: number; current: number; done: boolean }) {
  const active = n === current;
  return (
    <div className="flex items-center gap-1">
      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black transition-all ${
        done ? "bg-[#4caf72] text-white" : active ? "bg-[#3b6bca] text-white" : "bg-[#f0ede8] text-[#b0ada8]"
      }`}>
        {done ? "✓" : n}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-widest ${
        active ? "text-[#3b6bca]" : done ? "text-[#4caf72]" : "text-[#b0ada8]"
      }`}>
        {n === 1 ? "Upload" : n === 2 ? "Configure" : "Dir."}
      </span>
    </div>
  );
}

function Option({ label, sub, selected, onClick }: {
  label: string; sub?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
        selected
          ? "border-[#3b6bca] bg-[#eef2fc]"
          : "border-[#e0deda] bg-[#f8f7f4] hover:border-[#3b6bca]/40"
      }`}
    >
      <p className={`text-xs font-bold ${selected ? "text-[#3b6bca]" : "text-[#1a1a1c]"}`}>{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[#9a9a9e]">{sub}</p>}
    </button>
  );
}

const QTY_STEPS = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];

// Multi-select option chip
function Chip({ label, sub, selected, onClick }: {
  label: string; sub?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
        selected
          ? "border-[#3b6bca] bg-[#eef2fc]"
          : "border-[#e0deda] bg-[#f8f7f4] hover:border-[#3b6bca]/40"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center transition-all ${
          selected ? "border-[#3b6bca] bg-[#3b6bca]" : "border-[#c0bdb8] bg-white"
        }`}>
          {selected && <span className="text-white text-[8px] font-black leading-none">✓</span>}
        </div>
        <div>
          <p className={`text-xs font-bold leading-tight ${selected ? "text-[#3b6bca]" : "text-[#1a1a1c]"}`}>{label}</p>
          {sub && <p className="mt-0.5 text-[10px] text-[#9a9a9e] leading-snug">{sub}</p>}
        </div>
      </div>
    </button>
  );
}

// ── Main WizardPanel ──────────────────────────────────────────────────────────

interface WizardPanelProps {
  onUploadSuccess: (data: any) => void;
  onAnalysisComplete: (data: any) => void;
  onMaterialChange: (m: string) => void;
  onQuantityChange: (q: number) => void;
  onRequestFaceSelection: () => void;
  uploadedData: any;
  quantity: number;
  material: string;
  faceConfirmed: boolean;
  analysisData?: any;
}

type Step = 1 | 2 | 3;

const WizardPanel = ({
  onUploadSuccess,
  onMaterialChange,
  onQuantityChange,
  onRequestFaceSelection,
  uploadedData,
  quantity,
  material,
  faceConfirmed,
  analysisData,
}: WizardPanelProps) => {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [answers, setAnswers] = useState<Partial<Answers>>({ environment: [], requirements: [] });
  const [recommendation, setRecommendation] = useState<{ id: string; label: string; reason: string } | null>(null);
  const [materialOverridden, setMaterialOverridden] = useState(false);

  const qtyIndex = QTY_STEPS.reduce(
    (best, val, i) => (Math.abs(val - quantity) < Math.abs(QTY_STEPS[best] - quantity) ? i : best), 0
  );

  // Upload
  const uploadFile = async (selectedFile: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${BACKEND}/upload`, { method: "POST", body: formData });

      if (response.status === 422) {
        const errData = await response.json();
        const titles: Record<string, string> = {
          assembly: "Assembly detected",
          not_moldable: "Not injection moldable",
          geometry_error: "Geometry error",
        };
        toast.error(`⚠️ ${titles[errData.error] ?? "Upload issue"} — ${errData.message}`, { duration: 8000 });
        setFile(null);
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.glb_url?.startsWith("/static/")) {
        data.glb_url = BACKEND + data.glb_url;
      }
      onUploadSuccess(data);
      setStep(2);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    const name = f?.name.toLowerCase() ?? "";
    if (name.endsWith(".step") || name.endsWith(".stp")) {
      setFile(f);
      uploadFile(f);
    } else {
      toast.error("Please upload a .step or .stp file");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); uploadFile(f); }
  };

  const allAnswered = !!(
    answers.partType &&
    (answers.environment?.length ?? 0) > 0 &&
    (answers.requirements?.length ?? 0) > 0
  );

  // Multi-select toggle helpers
  const toggleEnv = (val: string) => setAnswers(a => {
    const cur = a.environment ?? [];
    return { ...a, environment: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
  });
  const toggleReq = (val: string) => setAnswers(a => {
    const cur = a.requirements ?? [];
    return { ...a, requirements: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
  });

  const handleProceedToPull = () => {
    if (!allAnswered) return;
    const rec = recommendMaterial(answers as Answers);
    setRecommendation(rec);
    if (!materialOverridden) onMaterialChange(rec.id);
    setStep(3);
    onRequestFaceSelection();
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setAnswers({ environment: [], requirements: [] });
    setRecommendation(null);
    setMaterialOverridden(false);
  };

  const bb = uploadedData?.bounding_box_mm;

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Step indicators */}
      <div className="flex shrink-0 items-center border-b border-[#e0deda] px-3 py-3 gap-1">
        <StepDot n={1} current={step} done={step > 1} />
        <div className="h-px flex-1 mx-2 bg-[#e0deda]" />
        <StepDot n={2} current={step} done={step > 2} />
        <div className="h-px flex-1 mx-2 bg-[#e0deda]" />
        <StepDot n={3} current={step} done={faceConfirmed} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>

        {/* STEP 1 — Upload */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a9a9e]">Upload Geometry</p>

            <label
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
                isDragging ? "border-[#3b6bca] bg-[#eef2fc] scale-[1.02]"
                : "border-[#d8d5d0] bg-[#f8f7f4] hover:border-[#3b6bca]/50"
              } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
            >
              <input type="file" accept=".step,.stp" onChange={handleFileSelect} className="sr-only" disabled={isUploading} />
              {isUploading ? (
                <>
                  <Loader2 className="mb-2 h-7 w-7 animate-spin text-[#3b6bca]" />
                  <span className="text-sm font-bold text-[#3b6bca]">Analysing geometry…</span>
                  <span className="mt-1 text-[10px] text-[#9a9a9e]">This may take a moment</span>
                </>
              ) : (
                <>
                  <div className="mb-2 rounded-full bg-white p-2.5 shadow-sm border border-[#e8e5e0]">
                    <Upload className="h-5 w-5 text-[#3b6bca]" />
                  </div>
                  <span className="text-sm font-bold text-[#1a1a1c]">Drop .step here</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wider text-[#9a9a9e]">or click to browse</span>
                </>
              )}
            </label>

            {file && !isUploading && (
              <div className="flex items-center gap-3 rounded-lg border border-[#c8ddf8] bg-[#eef2fc] px-3 py-2.5">
                <FileBox className="h-4 w-4 text-[#3b6bca] shrink-0" />
                <span className="flex-1 truncate text-xs font-bold font-mono text-[#1a1a1c]">{file.name}</span>
                <button onClick={() => setFile(null)}><X className="h-3.5 w-3.5 text-[#9a9a9e]" /></button>
              </div>
            )}

            <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2.5">
              <p className="text-[11px] text-[#6a6a6e]">.STEP / .STP only · Single part · No assemblies</p>
            </div>
          </div>
        )}

        {/* STEP 2 — Configure */}
        {step === 2 && (
          <div className="space-y-4">

            {/* Bounding box */}
            {bb && (
              <div className="rounded-lg border border-[#c8ddf8] bg-[#eef2fc] px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6a9fd8] mb-1">Model dimensions — verify this</p>
                <p className="text-xs font-black font-mono text-[#1a1a1c]">
                  {bb.x.toFixed(1)} × {bb.y.toFixed(1)} × {bb.z.toFixed(1)} mm
                </p>
                <p className="mt-0.5 text-[10px] text-[#9a9a9e]">If wrong, re-export from your CAD tool</p>
              </div>
            )}

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a9a9e]">Tell us about your part</p>

            {/* Q1 — What is your part? (single select) */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-[#1a1a1c]">What is your part?</p>
              <p className="text-[10px] text-[#9a9a9e] -mt-1 mb-1.5">Pick the one that fits best</p>
              <div className="space-y-1.5">
                {[
                  { val: "enclosure",  label: "Housing or enclosure",     sub: "A shell that holds electronics or other parts inside" },
                  { val: "structural", label: "Structural or load-bearing", sub: "A bracket, frame, or part that takes force or weight" },
                  { val: "flexible",   label: "Flexible or spring-like",   sub: "A clip, snap-fit, or hinge that bends and springs back" },
                  { val: "grip",       label: "Grip or soft-touch surface", sub: "A handle, button, or surface that someone holds or presses" },
                ].map(({ val, label, sub }) => (
                  <Option key={val} label={label} sub={sub}
                    selected={answers.partType === val}
                    onClick={() => setAnswers(a => ({ ...a, partType: val }))} />
                ))}
              </div>
            </div>

            {/* Q2 — Where will it be used? (multi-select) */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-[#1a1a1c]">Where will it be used?</p>
              <p className="text-[10px] text-[#9a9a9e] -mt-1 mb-1.5">Select all that apply</p>
              <div className="space-y-1.5">
                {[
                  { val: "indoor",   label: "Indoors at room temperature", sub: "Normal home or office environment" },
                  { val: "outdoor",  label: "Outdoors or in direct sunlight", sub: "Exposed to UV rays, rain, or temperature swings" },
                  { val: "heat",     label: "Near heat sources",           sub: "Engine bay, kitchen, or anywhere above 60°C" },
                  { val: "chemical", label: "In contact with liquids or chemicals", sub: "Water, oils, cleaning sprays, fuels" },
                  { val: "food",     label: "Food or skin contact",        sub: "Needs to be safe for direct human contact" },
                ].map(({ val, label, sub }) => (
                  <Chip key={val} label={label} sub={sub}
                    selected={(answers.environment ?? []).includes(val)}
                    onClick={() => toggleEnv(val)} />
                ))}
              </div>
            </div>

            {/* Q3 — What does it need? (multi-select) */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-[#1a1a1c]">What does it need to do well?</p>
              <p className="text-[10px] text-[#9a9a9e] -mt-1 mb-1.5">Select all that apply</p>
              <div className="space-y-1.5">
                {[
                  { val: "drops",  label: "Survive drops and impacts",    sub: "It will be knocked, dropped, or hit in use" },
                  { val: "finish", label: "Look good — smooth surface",   sub: "Visible part, needs a clean paintable finish" },
                  { val: "stiff",  label: "Stay stiff under load",        sub: "Should not flex or deform when force is applied" },
                  { val: "cost",   label: "Keep material cost low",       sub: "Cost per unit is a priority" },
                  { val: "light",  label: "Be as light as possible",      sub: "Weight matters for the final product" },
                ].map(({ val, label, sub }) => (
                  <Chip key={val} label={label} sub={sub}
                    selected={(answers.requirements ?? []).includes(val)}
                    onClick={() => toggleReq(val)} />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-[#1a1a1c]">Production quantity</p>
                <span className="text-sm font-black tabular-nums text-[#1a1a1c]">{quantity.toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range" min={0} max={QTY_STEPS.length - 1} step={1} value={qtyIndex}
                onChange={(e) => onQuantityChange(QTY_STEPS[parseInt(e.target.value)])}
                className="w-full h-1.5 cursor-pointer appearance-none rounded-full accent-[#3b6bca]"
                style={{ background: "#e0deda" }}
              />
              <div className="flex justify-between text-[8px] text-[#b0ada8]">
                {QTY_STEPS.map((q) => (
                  <span key={q} className={quantity === q ? "text-[#3b6bca] font-bold" : ""}>
                    {q >= 1000 ? `${q / 1000}k` : q}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* STEP 3 — Face selection */}
        {step === 3 && (
          <div className="space-y-3">

            {recommendation && (
              <div className="rounded-lg border border-[#c8ddf8] bg-[#eef2fc] px-3 py-3 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6a9fd8]">Recommended material</p>
                <p className="text-sm font-black text-[#1a1a1c]">{recommendation.label}</p>
                <p className="text-[11px] text-[#6a6a6e] leading-relaxed">{recommendation.reason}</p>
                <div className="pt-1">
                  <p className="text-[9px] text-[#9a9a9e] mb-1">Override:</p>
                  <select
                    value={material}
                    onChange={(e) => { onMaterialChange(e.target.value); setMaterialOverridden(true); }}
                    className="w-full rounded-md border border-[#e0deda] bg-white px-2 py-1 text-xs font-semibold text-[#1a1a1c] focus:outline-none focus:border-[#3b6bca]"
                  >
                    {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Instruction card */}
            {!faceConfirmed && (
              <div className="rounded-lg border border-[#e0a020]/40 bg-[#fffbf0] px-3 py-3 space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#c08010]">Select Top / Bottom face</p>
                <p className="text-[11px] text-[#6a6a6e] leading-relaxed">
                  Click any face on your model in the 3D viewer. Try different faces — the one with the <strong>lowest undercut %</strong> is your best mould direction.
                </p>
                <p className="text-[10px] text-[#9a9a9e]">Cost bar updates live with each face you analyse.</p>
              </div>
            )}

            {/* Live result while exploring — before confirmed */}
            {!faceConfirmed && analysisData && (
              <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2.5 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Latest result</p>
                <p className={`text-xs font-bold ${
                  analysisData.has_undercuts
                    ? analysisData.undercut_severity === "high" ? "text-[#dc2626]" : "text-[#c08010]"
                    : "text-[#16a34a]"
                }`}>
                  {analysisData.has_undercuts
                    ? analysisData.undercut_severity === "high" ? "⚠ High undercut risk" : "⚠ Moderate undercut risk"
                    : "✓ No undercut risk"
                  }
                </p>
                <p className="text-[10px] text-[#9a9a9e]">{analysisData.undercut_message}</p>
                <p className="text-[10px] text-[#b0ada8] italic">Try another face to compare</p>
              </div>
            )}

            {/* Confirmed */}
            {faceConfirmed && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 rounded-lg border border-[#c8ecd0] bg-[#f0faf4] px-3 py-2.5">
                  <span className="text-[#4caf72] text-base">✓</span>
                  <span className="text-[11px] font-bold text-[#4caf72]">Top / Bottom face confirmed</span>
                </div>

                {/* Draft angle tip */}
                {analysisData?.has_undercuts && (
                  <div className="rounded-lg border border-[#c8ddf8] bg-[#eef2fc] px-3 py-2.5 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#3b6bca]">💡 Design tip</p>
                    <p className="text-[11px] text-[#4a5a7a] leading-relaxed">
                      Your part has near-vertical walls. Adding a <strong>1–2° draft angle</strong> will reduce undercut percentage, make ejection easier, and reduce cycle time.
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-[#9a9a9e] leading-relaxed px-1">
                  Cost estimates are live on the right panel. Adjust quantity or material to see how costs change.
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#e0deda] bg-white px-4 py-3 flex gap-2">
        {step > 1 && !faceConfirmed && (
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="flex items-center gap-1 rounded-lg border border-[#e0deda] px-3 py-2 text-[11px] font-bold text-[#6a6a6e] hover:bg-[#f8f7f4] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        {step === 2 && (
          <button
            onClick={handleProceedToPull}
            disabled={!allAnswered}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition-colors ${
              allAnswered ? "bg-[#3b6bca] hover:bg-[#4a7ad9]" : "bg-[#c0cde8] cursor-not-allowed"
            }`}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        {faceConfirmed && (
          <button
            onClick={handleReset}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e0deda] px-4 py-2 text-[11px] font-bold text-[#6a6a6e] hover:bg-[#f8f7f4] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Start over
          </button>
        )}
      </div>

    </div>
  );
};

export default WizardPanel;


