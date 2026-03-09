import { useState, useCallback } from "react";
import { Upload, FileBox, X, Loader2, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const BACKEND = "https://threed-backend-4v3g.onrender.com";

// ── Material recommendation engine ───────────────────────────────────────────

interface Answers {
  partType: string;
  flexible: string;
  environment: string;
  priority: string;
}

const MATERIAL_RULES: Array<{
  id: string;
  label: string;
  reason: string;
  match: (a: Answers) => boolean;
}> = [
  {
    id: "TPU",
    label: "TPU",
    reason: "Flexible snap-fit parts need TPU — it recovers after deformation and absorbs impact.",
    match: (a) => a.flexible === "flex-snap",
  },
  {
    id: "TPE",
    label: "TPE",
    reason: "Soft-touch grips and overmolds are best in TPE — rubber feel, easy to process.",
    match: (a) => a.flexible === "soft-touch",
  },
  {
    id: "PC",
    label: "Polycarbonate (PC)",
    reason: "Outdoor UV exposure with impact resistance is where PC excels.",
    match: (a) => a.flexible === "rigid" && a.environment === "outdoor" && a.priority === "impact",
  },
  {
    id: "Nylon",
    label: "Nylon PA6",
    reason: "Mechanical and structural parts with wear resistance need Nylon — strong and durable.",
    match: (a) => a.flexible === "rigid" && (a.partType === "mechanical" || a.priority === "stiffness"),
  },
  {
    id: "PC",
    label: "Polycarbonate (PC)",
    reason: "High heat environments (>60°C) need PC — ABS warps above 80°C.",
    match: (a) => a.flexible === "rigid" && a.environment === "high-heat",
  },
  {
    id: "PP",
    label: "PP",
    reason: "Chemical and moisture contact is where PP shines — excellent resistance at low cost.",
    match: (a) => a.flexible === "rigid" && (a.environment === "chemical" || a.priority === "food-safe"),
  },
  {
    id: "ABS",
    label: "ABS",
    reason: "Indoor enclosure with good surface finish at low cost — ABS is the ideal choice.",
    match: (a) => a.flexible === "rigid" && a.environment === "indoor" && (a.priority === "cost" || a.priority === "finish"),
  },
  {
    id: "HIPS",
    label: "HIPS",
    reason: "For prototypes and non-structural indoor parts, HIPS gives the lowest material cost.",
    match: (a) => a.flexible === "rigid" && a.partType === "prototype",
  },
  {
    id: "ABS",
    label: "ABS",
    reason: "ABS is the most versatile general-purpose engineering plastic — a safe default.",
    match: () => true,
  },
];

function recommendMaterial(answers: Answers) {
  return MATERIAL_RULES.find((r) => r.match(answers))!;
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
const ALL_MATERIALS = ["ABS", "PP", "Nylon", "PC", "HIPS", "TPU", "TPE"];

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
  const [answers, setAnswers] = useState<Partial<Answers>>({});
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

  const allAnswered = !!(answers.partType && answers.flexible && answers.environment && answers.priority);

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
    setAnswers({});
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

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a9a9e]">Configure Part</p>

            {/* Q1 */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#4a4a4e]">1. What type of part is this?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { val: "enclosure", label: "Enclosure", sub: "Housing / shell" },
                  { val: "mechanical", label: "Mechanical", sub: "Gears / brackets" },
                  { val: "consumer", label: "Consumer", sub: "Product / retail" },
                  { val: "prototype", label: "Prototype", sub: "Low-volume test" },
                ].map(({ val, label, sub }) => (
                  <Option key={val} label={label} sub={sub}
                    selected={answers.partType === val}
                    onClick={() => setAnswers((a) => ({ ...a, partType: val }))} />
                ))}
              </div>
            </div>

            {/* Q2 */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#4a4a4e]">2. Does it need to flex or compress?</p>
              <div className="space-y-1.5">
                {[
                  { val: "rigid", label: "No — must be rigid", sub: "Structural, dimensional accuracy" },
                  { val: "flex-snap", label: "Yes — flex / snap fit", sub: "Springs back after deformation" },
                  { val: "soft-touch", label: "Yes — soft touch / grip", sub: "Rubber feel, overmold" },
                ].map(({ val, label, sub }) => (
                  <Option key={val} label={label} sub={sub}
                    selected={answers.flexible === val}
                    onClick={() => setAnswers((a) => ({ ...a, flexible: val }))} />
                ))}
              </div>
            </div>

            {/* Q3 */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#4a4a4e]">3. Where will it be used?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { val: "indoor", label: "Indoors", sub: "Room temperature" },
                  { val: "outdoor", label: "Outdoors", sub: "UV / weather" },
                  { val: "high-heat", label: "High heat", sub: ">60°C" },
                  { val: "chemical", label: "Chemical", sub: "Moisture / solvents" },
                ].map(({ val, label, sub }) => (
                  <Option key={val} label={label} sub={sub}
                    selected={answers.environment === val}
                    onClick={() => setAnswers((a) => ({ ...a, environment: val }))} />
                ))}
              </div>
            </div>

            {/* Q4 */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-[#4a4a4e]">4. What matters most?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { val: "cost", label: "Lowest cost" },
                  { val: "impact", label: "Impact resist." },
                  { val: "stiffness", label: "Stiffness" },
                  { val: "finish", label: "Surface finish" },
                  { val: "food-safe", label: "Food safe" },
                ].map(({ val, label }) => (
                  <Option key={val} label={label}
                    selected={answers.priority === val}
                    onClick={() => setAnswers((a) => ({ ...a, priority: val }))} />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#4a4a4e]">5. Production quantity</p>
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
                    {ALL_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-[#c8ecd0] bg-[#f0faf4] px-3 py-2.5">
                  <span className="text-[#4caf72] text-base">✓</span>
                  <span className="text-[11px] font-bold text-[#4caf72]">Top / Bottom face confirmed</span>
                </div>

                {/* Draft angle tip — shown when undercuts present */}
                {analysisData?.has_undercuts && (
                  <div className="rounded-lg border border-[#c8ddf8] bg-[#eef2fc] px-3 py-2.5 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#3b6bca]">💡 Design tip</p>
                    <p className="text-[11px] text-[#4a5a7a] leading-relaxed">
                      Your part has near-vertical walls. Adding a <strong>1–2° draft angle</strong> to these walls will reduce undercut percentage, make ejection easier, and reduce cycle time.
                    </p>
                  </div>
                )}
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


