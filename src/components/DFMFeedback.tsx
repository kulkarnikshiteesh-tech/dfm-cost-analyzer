import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Ruler, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface DFMFeedbackProps {
  volumeCubicMm?: number | null;
  boundingBox?: { x: number; y: number; z: number } | null;
  hasUndercuts?: boolean | null;
  undercutSeverity?: string | null;
  undercutMessage?: string | null;
  onStartOver?: () => void;
  darkMode?: boolean;
  recommendedMaterial?: string | null;
  material?: string;
}

function getDFMIssues(vol: number, bb: { x: number; y: number; z: number }) {
  const issues = [];
  const { x, y, z } = bb;
  const maxDim = x > 0 ? Math.max(x, y, z) : Math.pow(vol, 1 / 3) * 2;
  const wallEst = (x > 0 ? Math.min(x, y, z) : Math.pow(vol, 1 / 3)) / 10;
  issues.push(wallEst < 1.2
    ? { type: "warning" as const, text: `Est. wall ~${wallEst.toFixed(1)}mm — min 1.2mm recommended` }
    : { type: "success" as const, text: `Wall thickness within tolerance (≥1.2mm est.)` });
  issues.push(maxDim > 300
    ? { type: "warning" as const, text: `Part size ${maxDim.toFixed(0)}mm — large tonnage machine required` }
    : { type: "success" as const, text: `Part fits standard mold dimensions` });
  const volCm3 = vol / 1000;
  if (volCm3 < 0.5)       issues.push({ type: "info"    as const, text: `Very small part (${volCm3.toFixed(2)} cm³) — consider multi-cavity mold` });
  else if (volCm3 > 500)  issues.push({ type: "warning" as const, text: `Large volume (${volCm3.toFixed(0)} cm³) — long cycle times expected` });
  else                    issues.push({ type: "success" as const, text: `Volume in efficient molding range` });
  return issues;
}

// ── Surface finish data ───────────────────────────────────────────────────────

type FinishCategory = "in-mold" | "post-mold";

interface FinishOption {
  name: string;
  category: FinishCategory;
  grade?: string;
  description: string;
  costLabel: string;
  costNote: string;
  accentColor: string;
  leadTime?: string;
  compatibleMaterials: string[];
  notCompatibleMaterials?: string[];
}

const ALL_FINISHES: FinishOption[] = [
  // ── In-mold ──
  {
    name: "Mirror Gloss",
    category: "in-mold",
    grade: "SPI A2",
    description: "Diamond-polished cavity. Gives a glass-like mirror surface.",
    costLabel: "Adds ~₹15,000–40,000 to tooling",
    costNote: "One-time mold cost",
    accentColor: "#3B6BCA",
    compatibleMaterials: ["PC", "PMMA", "ABS"],
    notCompatibleMaterials: ["PP", "Nylon", "PA6GF", "TPU", "TPE", "HIPS", "POM"],
  },
  {
    name: "Semi-Gloss",
    category: "in-mold",
    grade: "SPI B2",
    description: "Stone-polished cavity. Slight sheen, hides minor sink marks.",
    costLabel: "Adds ~₹5,000–15,000 to tooling",
    costNote: "One-time mold cost",
    accentColor: "#5BB87E",
    compatibleMaterials: [],
  },
  {
    name: "Matte",
    category: "in-mold",
    grade: "SPI C2",
    description: "Paper-polished cavity. Soft matte look, practical for most parts.",
    costLabel: "Minimal — standard finish",
    costNote: "One-time mold cost",
    accentColor: "#5BB87E",
    compatibleMaterials: [],
  },
  {
    name: "Rough Industrial",
    category: "in-mold",
    grade: "SPI D2",
    description: "Sandblasted cavity. Coarse texture, hides all surface defects.",
    costLabel: "Minimal — standard finish",
    costNote: "One-time mold cost",
    accentColor: "#888",
    compatibleMaterials: [],
  },
  {
    name: "Grain / Leather Texture",
    category: "in-mold",
    grade: "VDI 27–45",
    description: "EDM-etched cavity. Replicates leather, fabric, or custom grain patterns.",
    costLabel: "Adds ~₹8,000–25,000 to tooling",
    costNote: "One-time mold cost",
    accentColor: "#E67E5B",
    compatibleMaterials: [],
    notCompatibleMaterials: ["PMMA"],
  },
  {
    name: "Custom Mold-Tech",
    category: "in-mold",
    description: "Chemical etching on cavity. Wood grain, carbon fibre, brand-specific textures.",
    costLabel: "Adds ~₹20,000–60,000 to tooling",
    costNote: "One-time mold cost",
    accentColor: "#9A9AFF",
    compatibleMaterials: [],
    notCompatibleMaterials: ["PMMA", "TPU", "TPE"],
  },
  // ── Post-mold ──
  {
    name: "Spray Paint",
    category: "post-mold",
    description: "Most common post-mold finish. Full colour flexibility. Requires primer on PP.",
    costLabel: "₹8–25 per piece",
    costNote: "Per piece · varies by colour & complexity",
    accentColor: "#E67E5B",
    leadTime: "+2–4 days",
    compatibleMaterials: [],
    notCompatibleMaterials: ["TPU", "TPE"],
  },
  {
    name: "Electroplating",
    category: "post-mold",
    description: "Chrome or nickel metallic finish. ABS only — requires chemical etching for adhesion.",
    costLabel: "₹40–120 per piece",
    costNote: "Per piece · ABS only",
    accentColor: "#3B6BCA",
    leadTime: "+5–7 days",
    compatibleMaterials: ["ABS"],
    notCompatibleMaterials: ["PP", "PC", "Nylon", "PA6GF", "HIPS", "TPU", "TPE", "POM", "PMMA"],
  },
  {
    name: "UV Coating",
    category: "post-mold",
    description: "Hard scratch-resistant coating. Best on optically clear materials like PC and acrylic.",
    costLabel: "₹10–30 per piece",
    costNote: "Per piece · varies by part size",
    accentColor: "#5BB87E",
    leadTime: "+1–2 days",
    compatibleMaterials: ["PC", "PMMA", "ABS"],
    notCompatibleMaterials: ["PP", "TPU", "TPE", "Nylon", "PA6GF"],
  },
  {
    name: "Pad Printing",
    category: "post-mold",
    description: "Logos, labels, and markings on any rigid surface. Very common for consumer products.",
    costLabel: "₹3–12 per piece",
    costNote: "Per piece · per colour layer",
    accentColor: "#9A9AFF",
    leadTime: "+2–3 days",
    compatibleMaterials: [],
    notCompatibleMaterials: ["TPU", "TPE"],
  },
  {
    name: "Hydrographics",
    category: "post-mold",
    description: "Water-transfer printing. Camo, carbon fibre, wood — wraps around complex 3D shapes.",
    costLabel: "₹50–200 per piece",
    costNote: "Per piece · depends on pattern complexity",
    accentColor: "#E67E5B",
    leadTime: "+3–5 days",
    compatibleMaterials: [],
    notCompatibleMaterials: ["TPU", "TPE"],
  },
];

function getFinishesForMaterial(matId: string | null | undefined) {
  if (!matId) return { compatible: ALL_FINISHES, incompatible: [] as FinishOption[] };
  const compatible = ALL_FINISHES.filter(f => {
    if (f.notCompatibleMaterials?.includes(matId)) return false;
    if (f.compatibleMaterials.length > 0 && !f.compatibleMaterials.includes(matId)) return false;
    return true;
  });
  const incompatible = ALL_FINISHES.filter(f =>
    f.notCompatibleMaterials?.includes(matId) ||
    (f.compatibleMaterials.length > 0 && !f.compatibleMaterials.includes(matId))
  );
  return { compatible, incompatible };
}

// ── Row and severity colors ───────────────────────────────────────────────────

const rowColors = {
  success: { border: "#5BB87E", lightBg: "#F4FBF6", darkBg: "#0D2218" },
  warning: { border: "#E0A020", lightBg: "#FFFBF0", darkBg: "#211800" },
  info:    { border: "#4A7ED8", lightBg: "#EEF2FC", darkBg: "#101A30" },
};

const severityColors: Record<string, { border: string; lightBg: string; darkBg: string }> = {
  high:     { border: "#E05050", lightBg: "#FFF4F4", darkBg: "#200A0A" },
  moderate: { border: "#E0A020", lightBg: "#FFFBF0", darkBg: "#211800" },
  low:      { border: "#5BB87E", lightBg: "#F4FBF6", darkBg: "#0D2218" },
  unknown:  { border: "#888",    lightBg: "#F8F7F4", darkBg: "#1E1E22" },
};

// ── Component ─────────────────────────────────────────────────────────────────

const DFMFeedback = ({
  volumeCubicMm, boundingBox, hasUndercuts, undercutSeverity,
  undercutMessage, onStartOver, darkMode: dm = false,
  recommendedMaterial, material,
}: DFMFeedbackProps) => {
  const [finishExpanded, setFinishExpanded] = useState(false);
  const [finishTab, setFinishTab] = useState<FinishCategory>("in-mold");

  const hasData = !!volumeCubicMm;
  const safeBB  = boundingBox || { x: 0, y: 0, z: 0 };
  const issues  = hasData ? getDFMIssues(volumeCubicMm!, safeBB) : [];
  const sevCol  = severityColors[undercutSeverity || "unknown"];

  const activeMat = material || recommendedMaterial;
  const { compatible, incompatible } = getFinishesForMaterial(activeMat);
  const visibleFinishes = compatible.filter(f => f.category === finishTab);
  const incompatibleInTab = incompatible.filter(f => f.category === finishTab);

  // Theme tokens
  const cardBg  = dm ? "#222226" : "#F8F7F4";
  const border  = dm ? "#2A2A2E" : "#E0DEDA";
  const ink     = dm ? "#F0EFE8" : "#1A1A1C";
  const muted   = dm ? "#AAA"    : "#6A6A6E";
  const faint   = dm ? "#555"    : "#B0ADA8";

  return (
    <div className="space-y-2 px-4 py-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: dm ? "#666" : "#9A9A9E" }}>DFM Analysis</p>

      {!hasData ? (
        <div className="rounded-xl px-4 py-6 text-center" style={{ border: `1px dashed ${border}` }}>
          <p className="text-[11px]" style={{ color: dm ? "#555" : "#B0ADA8" }}>Awaiting model upload</p>
        </div>
      ) : (
        <div className="space-y-2">

          {/* Dimensions card — blue tint */}
          <div className="rounded-xl px-3 py-2.5 space-y-1.5" style={{ border: `1px solid #3B6BCA40`, background: dm ? "#101A30" : "#EEF2FC" }}>
            <div className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 shrink-0" style={{ color: "#3B6BCA" }} />
              <span className="text-[11px]" style={{ color: dm ? "#8AABDA" : "#3A5A9A" }}>
                Volume: <span className="font-bold font-mono" style={{ color: dm ? "#C0D8F8" : "#1A2A5A" }}>{volumeCubicMm!.toLocaleString()} mm³</span>
              </span>
            </div>
            {safeBB.x > 0 && (
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0" style={{ color: "#3B6BCA" }} />
                <span className="text-[11px]" style={{ color: dm ? "#8AABDA" : "#3A5A9A" }}>
                  Box: <span className="font-bold font-mono" style={{ color: dm ? "#C0D8F8" : "#1A2A5A" }}>{safeBB.x.toFixed(1)} × {safeBB.y.toFixed(1)} × {safeBB.z.toFixed(1)} mm</span>
                </span>
              </div>
            )}
          </div>

          {/* Undercut row */}
          {undercutMessage && (
            <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5" style={{
              background: dm ? sevCol.darkBg : sevCol.lightBg,
              border: `1px solid ${sevCol.border}40`,
              borderLeft: `3px solid ${sevCol.border}`,
            }}>
              {hasUndercuts
                ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: sevCol.border }} />
                : <CheckCircle2  className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: sevCol.border }} />
              }
              <span className="text-[11px] leading-relaxed" style={{ color: dm ? "#CCC" : "#4A4A4E" }}>{undercutMessage}</span>
            </div>
          )}

          {/* DFM check rows */}
          {issues.map((item, i) => {
            const c = rowColors[item.type];
            return (
              <div key={i} className="rounded-xl px-3 py-2 flex items-start gap-2.5" style={{
                background: dm ? c.darkBg : c.lightBg,
                border: `1px solid ${c.border}30`,
                borderLeft: `3px solid ${c.border}`,
              }}>
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.border }} />
                <span className="text-[11px] leading-snug" style={{ color: dm ? "#CCC" : "#4A4A4E" }}>{item.text}</span>
              </div>
            );
          })}

          {/* Draft angle tip */}
          <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5" style={{
            background: dm ? "#1E1630" : "#F5F0FF",
            border: `1px solid ${dm ? "#4A3A7A" : "#C4B5F4"}`,
          }}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-black" style={{ background: "#9A9AFF" }}>
              ∠
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9A9AFF" }}>Draft angle tip</p>
              <p className="text-[11px] leading-relaxed" style={{ color: dm ? "#B0A0D8" : "#5B4BAA" }}>
                Add 1–3° draft to all vertical walls to help the part release cleanly from the mold.
              </p>
            </div>
          </div>

          {/* ── Surface finish expandable section ── */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>

            {/* Header */}
            <button
              onClick={() => setFinishExpanded(e => !e)}
              className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
              style={{ background: finishExpanded ? (dm ? "#1A2540" : "#EEF2FC") : cardBg }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: dm ? "#1E2A3D" : "#EEF2FC" }}>
                  <span className="text-[11px]">✦</span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold" style={{ color: finishExpanded ? "#3B6BCA" : ink }}>Surface Finish Options</p>
                  <p className="text-[9px]" style={{ color: faint }}>
                    {compatible.length} compatible · {incompatible.length} not recommended
                  </p>
                </div>
              </div>
              {finishExpanded
                ? <ChevronUp  className="h-3.5 w-3.5 shrink-0" style={{ color: muted }} />
                : <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: muted }} />
              }
            </button>

            {/* Expanded content */}
            {finishExpanded && (
              <div style={{ borderTop: `1px solid ${border}` }}>

                {/* Material context */}
                {activeMat && (
                  <div className="px-3 py-1.5" style={{ background: dm ? "#111114" : "#F8F7F4", borderBottom: `1px solid ${border}` }}>
                    <p className="text-[9px]" style={{ color: faint }}>
                      Showing finishes for <span className="font-bold" style={{ color: "#3B6BCA" }}>{activeMat}</span>
                    </p>
                  </div>
                )}

                {/* Tab toggle */}
                <div className="flex px-3 pt-2.5 gap-2">
                  {(["in-mold", "post-mold"] as FinishCategory[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFinishTab(tab)}
                      className="flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
                      style={{
                        background: finishTab === tab ? "#3B6BCA" : (dm ? "#28282C" : "#F0EDE8"),
                        color: finishTab === tab ? "#fff" : muted,
                      }}
                    >
                      {tab === "in-mold" ? "In-Mold" : "Post-Mold"}
                    </button>
                  ))}
                </div>

                {/* Tab description */}
                <p className="px-3 pt-1.5 pb-1 text-[9px] leading-relaxed" style={{ color: faint }}>
                  {finishTab === "in-mold"
                    ? "Set during mold making. Adds to tooling cost only — zero per-piece cost."
                    : "Applied after ejection. Adds per-piece cost and lead time."}
                </p>

                {/* Disclaimer */}
                <div className="mx-3 mb-2 rounded-lg px-2.5 py-1.5" style={{ background: dm ? "#1A1A00" : "#FFFDF0", border: "1px solid #E0A02030" }}>
                  <p className="text-[9px] leading-snug" style={{ color: dm ? "#AA9040" : "#8A6020" }}>
                    ⚠ Costs are approximate indicative ranges. Actual quotes from vendors may vary based on part complexity, order quantity, and finish quality.
                  </p>
                </div>

                {/* Finish cards */}
                <div className="px-3 pb-3 space-y-1.5">
                  {visibleFinishes.length === 0 ? (
                    <p className="text-[11px] text-center py-3" style={{ color: faint }}>
                      No compatible {finishTab} finishes for this material.
                    </p>
                  ) : (
                    visibleFinishes.map((f, i) => (
                      <div key={i} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${f.accentColor}30` }}>
                        {/* Color accent header */}
                        <div className="px-3 py-1.5" style={{ background: dm ? `${f.accentColor}18` : `${f.accentColor}12`, borderBottom: `1px solid ${f.accentColor}20` }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: f.accentColor }} />
                            <p className="text-[11px] font-bold" style={{ color: ink }}>{f.name}</p>
                            {f.grade && (
                              <span className="rounded px-1 py-0.5 text-[8px] font-bold uppercase"
                                style={{ background: `${f.accentColor}20`, color: f.accentColor }}>
                                {f.grade}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Body */}
                        <div className="px-3 py-2 space-y-1" style={{ background: dm ? "#1E1E22" : "#FAFAFA" }}>
                          <p className="text-[10px] leading-snug" style={{ color: muted }}>{f.description}</p>
                          <p className="text-[10px] font-bold" style={{ color: f.accentColor }}>{f.costLabel}</p>
                          <p className="text-[9px]" style={{ color: faint }}>{f.costNote}</p>
                          {f.leadTime && (
                            <p className="text-[9px] font-semibold" style={{ color: "#E0A020" }}>⏱ {f.leadTime}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Incompatible warning */}
                {incompatibleInTab.length > 0 && (
                  <div className="px-3 pb-3">
                    <div className="rounded-lg px-3 py-2" style={{ background: dm ? "#1A0A0A" : "#FFF5F5", border: "1px solid #E0505030" }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#E05050" }}>
                        Not recommended for {activeMat}
                      </p>
                      <p className="text-[10px] leading-snug" style={{ color: dm ? "#CC9090" : "#6A3A3A" }}>
                        {incompatibleInTab.map(f => f.name).join(", ")}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Start over */}
          {onStartOver && (
            <button onClick={onStartOver}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold transition-colors"
              style={{ border: `1px solid ${border}`, color: muted, background: "transparent" }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default DFMFeedback;
