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
  if (volCm3 < 0.5)      issues.push({ type: "info"    as const, text: `Very small part (${volCm3.toFixed(2)} cm³) — consider multi-cavity mold` });
  else if (volCm3 > 500) issues.push({ type: "warning" as const, text: `Large volume (${volCm3.toFixed(0)} cm³) — long cycle times expected` });
  else                   issues.push({ type: "success" as const, text: `Volume in efficient molding range` });
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
  headerBg: string;
  headerBgDark: string;
  accentColor: string;
  leadTime?: string;
  compatibleMaterials: string[];
  notCompatibleMaterials?: string[];
}

const ALL_FINISHES: FinishOption[] = [
  {
    name: "Mirror Gloss",
    category: "in-mold",
    grade: "SPI A2",
    description: "Diamond-polished cavity. Gives a glass-like mirror surface.",
    costLabel: "Adds ~₹15,000–40,000 to tooling",
    costNote: "One-time mold cost",
    headerBg: "#D6E4FF",
    headerBgDark: "#1A2A4A",
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
    headerBg: "#C8F0D8",
    headerBgDark: "#0D2A1A",
    accentColor: "#2AA05A",
    compatibleMaterials: [],
  },
  {
    name: "Matte",
    category: "in-mold",
    grade: "SPI C2",
    description: "Paper-polished cavity. Soft matte look, practical for most parts.",
    costLabel: "Adds ~₹2,000–5,000 to tooling",
    costNote: "One-time mold cost",
    headerBg: "#E8E8E8",
    headerBgDark: "#2A2A2A",
    accentColor: "#666",
    compatibleMaterials: [],
  },
  {
    name: "Rough Industrial",
    category: "in-mold",
    grade: "SPI D2",
    description: "Sandblasted cavity. Coarse texture, hides all surface defects.",
    costLabel: "Adds ~₹1,000–3,000 to tooling",
    costNote: "One-time mold cost",
    headerBg: "#E0D8CC",
    headerBgDark: "#2A2218",
    accentColor: "#8A7050",
    compatibleMaterials: [],
  },
  {
    name: "Grain / Leather Texture",
    category: "in-mold",
    grade: "VDI 27–45",
    description: "EDM-etched cavity. Replicates leather, fabric, or custom grain patterns.",
    costLabel: "Adds ~₹8,000–25,000 to tooling",
    costNote: "One-time mold cost",
    headerBg: "#FFE0D0",
    headerBgDark: "#3A1808",
    accentColor: "#C85020",
    compatibleMaterials: [],
    notCompatibleMaterials: ["PMMA"],
  },
  {
    name: "Custom Mold-Tech",
    category: "in-mold",
    description: "Chemical etching. Wood grain, carbon fibre, brand-specific textures.",
    costLabel: "Adds ~₹20,000–60,000 to tooling",
    costNote: "One-time mold cost",
    headerBg: "#E0D8FF",
    headerBgDark: "#1E1440",
    accentColor: "#6040C8",
    compatibleMaterials: [],
    notCompatibleMaterials: ["PMMA", "TPU", "TPE"],
  },
  {
    name: "Spray Paint",
    category: "post-mold",
    description: "Most common post-mold finish. Full colour flexibility. Requires primer on PP.",
    costLabel: "₹8–25 per piece",
    costNote: "Per piece · varies by colour & complexity",
    headerBg: "#FFE8D0",
    headerBgDark: "#3A1800",
    accentColor: "#C86010",
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
    headerBg: "#D0DCFF",
    headerBgDark: "#101830",
    accentColor: "#2040A0",
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
    headerBg: "#C8F0D0",
    headerBgDark: "#082A10",
    accentColor: "#208040",
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
    headerBg: "#DDD0FF",
    headerBgDark: "#180A38",
    accentColor: "#5030A8",
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
    headerBg: "#FFD8C8",
    headerBgDark: "#380E00",
    accentColor: "#B03010",
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

// ── Colors ────────────────────────────────────────────────────────────────────

const rowColors = {
  success: { border: "#2AA05A", lightBg: "#C8F0D8", darkBg: "#0D2218", ink: "#0A4020", darkInk: "#80D8A8" },
  warning: { border: "#C88010", lightBg: "#FFE8B0", darkBg: "#2A1800", ink: "#5A3000", darkInk: "#E0A840" },
  info:    { border: "#2060C0", lightBg: "#D0E4FF", darkBg: "#0A1830", ink: "#102060", darkInk: "#80B0F0" },
};

const severityColors: Record<string, { border: string; lightBg: string; darkBg: string }> = {
  high:     { border: "#C02020", lightBg: "#FFD0D0", darkBg: "#280808" },
  moderate: { border: "#C88010", lightBg: "#FFE8B0", darkBg: "#2A1800" },
  low:      { border: "#2AA05A", lightBg: "#C8F0D8", darkBg: "#0D2218" },
  unknown:  { border: "#888",    lightBg: "#E8E8E8", darkBg: "#1E1E22" },
};

// ── Collapsible section wrapper ───────────────────────────────────────────────

function CollapsibleSection({
  title, defaultOpen = true, dm, border, cardBg, ink, muted, children
}: {
  title: string; defaultOpen?: boolean; dm: boolean;
  border: string; cardBg: string; ink: string; muted: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 transition-colors"
        style={{ background: open ? (dm ? "#1A1A1E" : "#F0EDE8") : cardBg }}
      >
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: muted }}>{title}</p>
        {open
          ? <ChevronUp   className="h-3 w-3 shrink-0" style={{ color: muted }} />
          : <ChevronDown className="h-3 w-3 shrink-0" style={{ color: muted }} />
        }
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 space-y-2" style={{ borderTop: `1px solid ${border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const DFMFeedback = ({
  volumeCubicMm, boundingBox, hasUndercuts, undercutSeverity,
  undercutMessage, onStartOver, darkMode: dm = false,
  recommendedMaterial, material,
}: DFMFeedbackProps) => {
  const [finishTab, setFinishTab] = useState<FinishCategory>("in-mold");

  const hasData = !!volumeCubicMm;
  const safeBB  = boundingBox || { x: 0, y: 0, z: 0 };
  const issues  = hasData ? getDFMIssues(volumeCubicMm!, safeBB) : [];
  const sevCol  = severityColors[undercutSeverity || "unknown"];

  const activeMat = material || recommendedMaterial;
  const { compatible, incompatible } = getFinishesForMaterial(activeMat);
  const visibleFinishes = compatible.filter(f => f.category === finishTab);
  const incompatibleInTab = incompatible.filter(f => f.category === finishTab);

  const cardBg = dm ? "#222226" : "#F8F7F4";
  const border = dm ? "#2A2A2E" : "#E0DEDA";
  const ink    = dm ? "#F0EFE8" : "#1A1A1C";
  const muted  = dm ? "#AAA"    : "#6A6A6E";
  const faint  = dm ? "#555"    : "#B0ADA8";

  return (
    <div className="space-y-2 px-4 py-4">
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: dm ? "#666" : "#9A9A9E" }}>DFM Analysis</p>

      {!hasData ? (
        <div className="rounded-xl px-4 py-6 text-center" style={{ border: `1px dashed ${border}` }}>
          <p className="text-[11px]" style={{ color: faint }}>Awaiting model upload</p>
        </div>
      ) : (
        <div className="space-y-2">

          {/* ── Surface Finish — first, always expanded ── */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
            {/* Header */}
            <div className="px-3 py-2.5 flex items-center justify-between"
              style={{ background: dm ? "#1A2540" : "#EEF2FC", borderBottom: `1px solid ${border}` }}>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: dm ? "#253050" : "#D6E4FF" }}>
                  <span className="text-[11px]">✦</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold" style={{ color: "#3B6BCA" }}>Surface Finish Options</p>
                  <p className="text-[9px]" style={{ color: faint }}>
                    {compatible.length} compatible · {incompatible.length} not recommended
                  </p>
                </div>
              </div>
            </div>

            {/* Material context */}
            {activeMat && (
              <div className="px-3 py-1.5" style={{ background: dm ? "#111114" : "#F8F7F4", borderBottom: `1px solid ${border}` }}>
                <p className="text-[9px]" style={{ color: faint }}>
                  For <span className="font-bold" style={{ color: "#3B6BCA" }}>{activeMat}</span>
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
            <div className="mx-3 mb-2 rounded-lg px-2.5 py-1.5"
              style={{ background: dm ? "#201800" : "#FFF8E0", border: "1px solid #C8900030" }}>
              <p className="text-[9px] leading-snug" style={{ color: dm ? "#B09030" : "#7A5800" }}>
                ⚠ Costs are approximate indicative ranges. Actual vendor quotes may vary.
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
                  <div key={i} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${f.accentColor}50` }}>
                    {/* Solid color header */}
                    <div className="px-3 py-1.5 flex items-center gap-2"
                      style={{ background: dm ? f.headerBgDark : f.headerBg }}>
                      <p className="text-[11px] font-black" style={{ color: dm ? "#F0EFE8" : "#1A1A1C" }}>{f.name}</p>
                      {f.grade && (
                        <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase"
                          style={{ background: f.accentColor, color: "#fff" }}>
                          {f.grade}
                        </span>
                      )}
                    </div>
                    {/* Body */}
                    <div className="px-3 py-2 space-y-1" style={{ background: dm ? "#1A1A1E" : "#FFFFFF" }}>
                      <p className="text-[10px] leading-snug" style={{ color: muted }}>{f.description}</p>
                      <p className="text-[11px] font-black" style={{ color: f.accentColor }}>{f.costLabel}</p>
                      <p className="text-[9px]" style={{ color: faint }}>{f.costNote}</p>
                      {f.leadTime && (
                        <p className="text-[9px] font-semibold" style={{ color: "#C88010" }}>⏱ {f.leadTime}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Incompatible */}
            {incompatibleInTab.length > 0 && (
              <div className="px-3 pb-3">
                <div className="rounded-lg px-3 py-2"
                  style={{ background: dm ? "#280808" : "#FFD0D0", border: "1px solid #C0202050" }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#C02020" }}>
                    Not recommended for {activeMat}
                  </p>
                  <p className="text-[10px] leading-snug" style={{ color: dm ? "#E08080" : "#6A1010" }}>
                    {incompatibleInTab.map(f => f.name).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Collapsible: Geometry ── */}
          <CollapsibleSection title="Geometry" defaultOpen={false} dm={dm} border={border} cardBg={cardBg} ink={ink} muted={muted}>
            <div className="rounded-lg px-3 py-2 space-y-1.5"
              style={{ background: dm ? "#101A30" : "#D6E4FF", border: "1px solid #3B6BCA40" }}>
              <div className="flex items-center gap-2">
                <Ruler className="h-3.5 w-3.5 shrink-0" style={{ color: "#3B6BCA" }} />
                <span className="text-[11px]" style={{ color: dm ? "#8AABDA" : "#102060" }}>
                  Volume: <span className="font-bold font-mono">{volumeCubicMm!.toLocaleString()} mm³</span>
                </span>
              </div>
              {safeBB.x > 0 && (
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0" style={{ color: "#3B6BCA" }} />
                  <span className="text-[11px]" style={{ color: dm ? "#8AABDA" : "#102060" }}>
                    Box: <span className="font-bold font-mono">{safeBB.x.toFixed(1)} × {safeBB.y.toFixed(1)} × {safeBB.z.toFixed(1)} mm</span>
                  </span>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* ── Collapsible: DFM Checks ── */}
          <CollapsibleSection title="DFM Checks" defaultOpen={false} dm={dm} border={border} cardBg={cardBg} ink={ink} muted={muted}>
            {undercutMessage && (
              <div className="rounded-lg px-3 py-2.5 flex items-start gap-2.5"
                style={{ background: dm ? sevCol.darkBg : sevCol.lightBg, border: `1px solid ${sevCol.border}60`, borderLeft: `3px solid ${sevCol.border}` }}>
                {hasUndercuts
                  ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: sevCol.border }} />
                  : <CheckCircle2  className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: sevCol.border }} />
                }
                <span className="text-[11px] leading-relaxed" style={{ color: dm ? "#DDD" : "#2A2A2A" }}>{undercutMessage}</span>
              </div>
            )}
            {issues.map((item, i) => {
              const c = rowColors[item.type];
              return (
                <div key={i} className="rounded-lg px-3 py-2 flex items-start gap-2.5"
                  style={{ background: dm ? c.darkBg : c.lightBg, border: `1px solid ${c.border}50`, borderLeft: `3px solid ${c.border}` }}>
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.border }} />
                  <span className="text-[11px] leading-snug" style={{ color: dm ? c.darkInk : c.ink }}>{item.text}</span>
                </div>
              );
            })}
            <div className="rounded-lg px-3 py-2.5 flex items-start gap-2.5"
              style={{ background: dm ? "#1E1630" : "#E8D8FF", border: `1px solid #8060C050` }}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-black"
                style={{ background: "#6040C8" }}>
                ∠
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#6040C8" }}>Draft angle tip</p>
                <p className="text-[11px] leading-relaxed" style={{ color: dm ? "#B0A0D8" : "#301870" }}>
                  Add 1–3° draft to all vertical walls to help the part release cleanly from the mold.
                </p>
              </div>
            </div>
          </CollapsibleSection>

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
