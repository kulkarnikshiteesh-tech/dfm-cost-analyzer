import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Ruler, RotateCcw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

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
  onFinishesChange?: (finishes: string[]) => void;
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

// ── SVG Texture Swatches ──────────────────────────────────────────────────────

function FinishSwatch({ name, accentColor }: { name: string; accentColor: string }) {
  const size = 40;

  const swatches: Record<string, JSX.Element> = {
    "Mirror Gloss": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="40%" stopColor={accentColor} stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#000033" stopOpacity="1"/>
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="6" fill="url(#mg)"/>
        <ellipse cx="13" cy="13" rx="6" ry="3" fill="white" fillOpacity="0.6" transform="rotate(-30 13 13)"/>
      </svg>
    ),
    "Semi-Gloss": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.7"/>
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.3"/>
        <rect width="40" height="40" rx="6" fill="url(#sg)" fillOpacity="0.5"/>
        <ellipse cx="15" cy="12" rx="8" ry="4" fill="white" fillOpacity="0.3" transform="rotate(-20 15 12)"/>
      </svg>
    ),
    "Matte": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.15"/>
        {[...Array(20)].map((_, i) => (
          <circle key={i} cx={Math.random() * 40} cy={Math.random() * 40} r="0.8"
            fill={accentColor} fillOpacity="0.3"/>
        ))}
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.08"/>
      </svg>
    ),
    "Rough Industrial": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <rect width="40" height="40" rx="6" fill="#888" fillOpacity="0.15"/>
        {[...Array(30)].map((_, i) => (
          <circle key={i}
            cx={(i * 7.3 + 3) % 38} cy={(i * 4.7 + 2) % 38}
            r={0.5 + (i % 3) * 0.5}
            fill="#666" fillOpacity="0.5"/>
        ))}
      </svg>
    ),
    "Grain / Leather Texture": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.12"/>
        {[0,1,2,3,4].map(row =>
          [0,1,2,3,4].map(col => (
            <path key={`${row}-${col}`}
              d={`M${col*8+4} ${row*8+2} L${col*8+6} ${row*8+4} L${col*8+4} ${row*8+6} L${col*8+2} ${row*8+4} Z`}
              fill="none" stroke={accentColor} strokeWidth="0.8" strokeOpacity="0.6"/>
          ))
        )}
      </svg>
    ),
    "Custom Mold-Tech": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.1"/>
        {[0,1,2,3,4,5].map(row =>
          [0,1,2,3,4,5].map(col => (
            <g key={`${row}-${col}`} transform={`translate(${col*7-1} ${row*7-1})`}>
              <line x1="0" y1="0" x2="5" y2="5" stroke={accentColor} strokeWidth="0.7" strokeOpacity="0.7"/>
              <line x1="5" y1="0" x2="0" y2="5" stroke={accentColor} strokeWidth="0.4" strokeOpacity="0.4"/>
            </g>
          ))
        )}
      </svg>
    ),
    "Spray Paint": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <radialGradient id="sp">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8"/>
            <stop offset="60%" stopColor={accentColor} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.6"/>
          </radialGradient>
        </defs>
        <rect width="40" height="40" rx="6" fill="url(#sp)"/>
        <circle cx="28" cy="12" r="6" fill="white" fillOpacity="0.3"/>
      </svg>
    ),
    "Electroplating": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <linearGradient id="ep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#888888"/>
            <stop offset="20%" stopColor="#dddddd"/>
            <stop offset="40%" stopColor="#ffffff"/>
            <stop offset="60%" stopColor="#aaaaaa"/>
            <stop offset="80%" stopColor="#eeeeee"/>
            <stop offset="100%" stopColor="#999999"/>
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="6" fill="url(#ep)"/>
        <ellipse cx="14" cy="14" rx="5" ry="2" fill="white" fillOpacity="0.7" transform="rotate(-40 14 14)"/>
      </svg>
    ),
    "UV Coating": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <defs>
          <linearGradient id="uv" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.1"/>
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.2"/>
        <rect width="40" height="40" rx="6" fill="url(#uv)"/>
        <rect x="2" y="2" width="36" height="36" rx="5" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.6"/>
        <ellipse cx="13" cy="10" rx="7" ry="3" fill="white" fillOpacity="0.4" transform="rotate(-30 13 10)"/>
      </svg>
    ),
    "Pad Printing": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.12"/>
        <rect x="8" y="14" width="24" height="3" rx="1.5" fill={accentColor} fillOpacity="0.7"/>
        <rect x="12" y="20" width="16" height="2" rx="1" fill={accentColor} fillOpacity="0.5"/>
        <rect x="10" y="25" width="20" height="2" rx="1" fill={accentColor} fillOpacity="0.4"/>
        <circle cx="20" cy="9" r="4" fill={accentColor} fillOpacity="0.6"/>
      </svg>
    ),
    "Hydrographics": (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.15"/>
        <path d="M0 20 Q10 10 20 20 Q30 30 40 20" fill="none" stroke={accentColor} strokeWidth="2" strokeOpacity="0.7"/>
        <path d="M0 25 Q10 15 20 25 Q30 35 40 25" fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.5"/>
        <path d="M0 15 Q10 5 20 15 Q30 25 40 15" fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.4"/>
        <path d="M0 30 Q10 20 20 30 Q30 40 40 30" fill="none" stroke={accentColor} strokeWidth="1" strokeOpacity="0.3"/>
      </svg>
    ),
  };

  return swatches[name] ?? (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect width="40" height="40" rx="6" fill={accentColor} fillOpacity="0.3"/>
    </svg>
  );
}

// ── Surface finish data ───────────────────────────────────────────────────────

type FinishCategory = "in-mold" | "post-mold";

interface FinishOption {
  id: string;
  name: string;
  category: FinishCategory;
  grade?: string;
  description: string;
  costLabel: string;
  costMidpoint: number; // for calculation — in-mold = tooling add, post-mold = per piece
  costNote: string;
  headerBg: string;
  headerBgDark: string;
  accentColor: string;
  leadTime?: string;
  searchQuery: string;
  compatibleMaterials: string[];
  notCompatibleMaterials?: string[];
}

const ALL_FINISHES: FinishOption[] = [
  {
    id: "mirror-gloss",
    name: "Mirror Gloss",
    category: "in-mold",
    grade: "SPI A2",
    description: "Diamond-polished cavity. Gives a glass-like mirror surface.",
    costLabel: "Adds ~₹15,000–40,000 to tooling",
    costMidpoint: 27500,
    costNote: "One-time mold cost",
    headerBg: "#D6E4FF", headerBgDark: "#1A2A4A", accentColor: "#3B6BCA",
    searchQuery: "SPI A2 mirror gloss injection moulded plastic part",
    compatibleMaterials: ["PC", "PMMA", "ABS"],
    notCompatibleMaterials: ["PP", "Nylon", "PA6GF", "TPU", "TPE", "HIPS", "POM"],
  },
  {
    id: "semi-gloss",
    name: "Semi-Gloss",
    category: "in-mold",
    grade: "SPI B2",
    description: "Stone-polished cavity. Slight sheen, hides minor sink marks.",
    costLabel: "Adds ~₹5,000–15,000 to tooling",
    costMidpoint: 10000,
    costNote: "One-time mold cost",
    headerBg: "#C8F0D8", headerBgDark: "#0D2A1A", accentColor: "#2AA05A",
    searchQuery: "SPI B2 semi gloss injection moulded plastic surface finish",
    compatibleMaterials: [],
  },
  {
    id: "matte",
    name: "Matte",
    category: "in-mold",
    grade: "SPI C2",
    description: "Paper-polished cavity. Soft matte look, practical for most parts.",
    costLabel: "Adds ~₹2,000–5,000 to tooling",
    costMidpoint: 3500,
    costNote: "One-time mold cost",
    headerBg: "#E8E8E8", headerBgDark: "#2A2A2A", accentColor: "#666",
    searchQuery: "SPI C2 matte injection moulded plastic surface",
    compatibleMaterials: [],
  },
  {
    id: "rough-industrial",
    name: "Rough Industrial",
    category: "in-mold",
    grade: "SPI D2",
    description: "Sandblasted cavity. Coarse texture, hides all surface defects.",
    costLabel: "Adds ~₹1,000–3,000 to tooling",
    costMidpoint: 2000,
    costNote: "One-time mold cost",
    headerBg: "#E0D8CC", headerBgDark: "#2A2218", accentColor: "#8A7050",
    searchQuery: "SPI D2 rough industrial sandblast injection mould surface",
    compatibleMaterials: [],
  },
  {
    id: "grain-leather",
    name: "Grain / Leather Texture",
    category: "in-mold",
    grade: "VDI 27–45",
    description: "EDM-etched cavity. Replicates leather, fabric, or custom grain patterns.",
    costLabel: "Adds ~₹8,000–25,000 to tooling",
    costMidpoint: 16500,
    costNote: "One-time mold cost",
    headerBg: "#FFE0D0", headerBgDark: "#3A1808", accentColor: "#C85020",
    searchQuery: "VDI texture grain leather injection moulded plastic",
    compatibleMaterials: [],
    notCompatibleMaterials: ["PMMA"],
  },
  {
    id: "custom-moldtech",
    name: "Custom Mold-Tech",
    category: "in-mold",
    description: "Chemical etching. Wood grain, carbon fibre, brand-specific textures.",
    costLabel: "Adds ~₹20,000–60,000 to tooling",
    costMidpoint: 40000,
    costNote: "One-time mold cost",
    headerBg: "#E0D8FF", headerBgDark: "#1E1440", accentColor: "#6040C8",
    searchQuery: "mold tech chemical etching texture injection moulded plastic",
    compatibleMaterials: [],
    notCompatibleMaterials: ["PMMA", "TPU", "TPE"],
  },
  {
    id: "spray-paint",
    name: "Spray Paint",
    category: "post-mold",
    description: "Most common post-mold finish. Full colour flexibility. Requires primer on PP.",
    costLabel: "₹8–25 per piece",
    costMidpoint: 16,
    costNote: "Per piece · varies by colour & complexity",
    headerBg: "#FFE8D0", headerBgDark: "#3A1800", accentColor: "#C86010",
    leadTime: "+2–4 days",
    searchQuery: "spray painted injection moulded plastic product finish",
    compatibleMaterials: [],
    notCompatibleMaterials: ["TPU", "TPE"],
  },
  {
    id: "electroplating",
    name: "Electroplating",
    category: "post-mold",
    description: "Chrome or nickel metallic finish. ABS only — requires chemical etching for adhesion.",
    costLabel: "₹40–120 per piece",
    costMidpoint: 80,
    costNote: "Per piece · ABS only",
    headerBg: "#D0DCFF", headerBgDark: "#101830", accentColor: "#2040A0",
    leadTime: "+5–7 days",
    searchQuery: "electroplated chrome plastic injection moulded part ABS",
    compatibleMaterials: ["ABS"],
    notCompatibleMaterials: ["PP", "PC", "Nylon", "PA6GF", "HIPS", "TPU", "TPE", "POM", "PMMA"],
  },
  {
    id: "uv-coating",
    name: "UV Coating",
    category: "post-mold",
    description: "Hard scratch-resistant coating. Best on optically clear materials like PC and acrylic.",
    costLabel: "₹10–30 per piece",
    costMidpoint: 20,
    costNote: "Per piece · varies by part size",
    headerBg: "#C8F0D0", headerBgDark: "#082A10", accentColor: "#208040",
    leadTime: "+1–2 days",
    searchQuery: "UV coating hard coat clear plastic injection moulded",
    compatibleMaterials: ["PC", "PMMA", "ABS"],
    notCompatibleMaterials: ["PP", "TPU", "TPE", "Nylon", "PA6GF"],
  },
  {
    id: "pad-printing",
    name: "Pad Printing",
    category: "post-mold",
    description: "Logos, labels, and markings on any rigid surface. Very common for consumer products.",
    costLabel: "₹3–12 per piece",
    costMidpoint: 7,
    costNote: "Per piece · per colour layer",
    headerBg: "#DDD0FF", headerBgDark: "#180A38", accentColor: "#5030A8",
    leadTime: "+2–3 days",
    searchQuery: "pad printing logo plastic injection moulded consumer product",
    compatibleMaterials: [],
    notCompatibleMaterials: ["TPU", "TPE"],
  },
  {
    id: "hydrographics",
    name: "Hydrographics",
    category: "post-mold",
    description: "Water-transfer printing. Camo, carbon fibre, wood — wraps around complex 3D shapes.",
    costLabel: "₹50–200 per piece",
    costMidpoint: 125,
    costNote: "Per piece · depends on pattern complexity",
    headerBg: "#FFD8C8", headerBgDark: "#380E00", accentColor: "#B03010",
    leadTime: "+3–5 days",
    searchQuery: "hydrographics water transfer printing plastic part camo carbon",
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

export { ALL_FINISHES };
export type { FinishOption };

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

function CollapsibleSection({
  title, defaultOpen = true, dm, border, cardBg, muted, children
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

const DFMFeedback = ({
  volumeCubicMm, boundingBox, hasUndercuts, undercutSeverity,
  undercutMessage, onStartOver, darkMode: dm = false,
  recommendedMaterial, material, onFinishesChange,
}: DFMFeedbackProps) => {
  const [finishTab, setFinishTab] = useState<FinishCategory>("in-mold");
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);

  const hasData = !!volumeCubicMm;
  const safeBB  = boundingBox || { x: 0, y: 0, z: 0 };
  const issues  = hasData ? getDFMIssues(volumeCubicMm!, safeBB) : [];
  const sevCol  = severityColors[undercutSeverity || "unknown"];

  const activeMat = material || recommendedMaterial;
  const { compatible, incompatible } = getFinishesForMaterial(activeMat);
  const visibleFinishes = compatible.filter(f => f.category === finishTab);
  const incompatibleInTab = incompatible.filter(f => f.category === finishTab);

  const toggleFinish = (id: string) => {
    const next = selectedFinishes.includes(id)
      ? selectedFinishes.filter(f => f !== id)
      : [...selectedFinishes, id];
    setSelectedFinishes(next);
    onFinishesChange?.(next);
  };

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

          {/* 1. GEOMETRY */}
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

          {/* 2. DFM CHECKS */}
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
                style={{ background: "#6040C8" }}>∠</div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#6040C8" }}>Draft angle tip</p>
                <p className="text-[11px] leading-relaxed" style={{ color: dm ? "#B0A0D8" : "#301870" }}>
                  Add 1–3° draft to all vertical walls to help the part release cleanly from the mold.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* 3. SURFACE FINISH */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
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
                    {selectedFinishes.length > 0 && (
                      <span style={{ color: "#3B6BCA", fontWeight: 700 }}> · {selectedFinishes.length} selected</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {activeMat && (
              <div className="px-3 py-1.5" style={{ background: dm ? "#111114" : "#F8F7F4", borderBottom: `1px solid ${border}` }}>
                <p className="text-[9px]" style={{ color: faint }}>
                  For <span className="font-bold" style={{ color: "#3B6BCA" }}>{activeMat}</span>
                </p>
              </div>
            )}

            <div className="flex px-3 pt-2.5 gap-2">
              {(["in-mold", "post-mold"] as FinishCategory[]).map(tab => (
                <button key={tab} onClick={() => setFinishTab(tab)}
                  className="flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
                  style={{ background: finishTab === tab ? "#3B6BCA" : (dm ? "#28282C" : "#F0EDE8"), color: finishTab === tab ? "#fff" : muted }}>
                  {tab === "in-mold" ? "In-Mold" : "Post-Mold"}
                </button>
              ))}
            </div>

            <p className="px-3 pt-1.5 pb-1 text-[9px] leading-relaxed" style={{ color: faint }}>
              {finishTab === "in-mold"
                ? "Set during mold making. Adds to tooling cost only — zero per-piece cost."
                : "Applied after ejection. Adds per-piece cost and lead time."}
            </p>

            <div className="mx-3 mb-2 rounded-lg px-2.5 py-1.5"
              style={{ background: dm ? "#201800" : "#FFF8E0", border: "1px solid #C8900030" }}>
              <p className="text-[9px] leading-snug" style={{ color: dm ? "#B09030" : "#7A5800" }}>
                ⚠ Costs are approximate indicative ranges. Tick finishes to add to total cost estimate.
              </p>
            </div>

            <div className="px-3 pb-3 space-y-1.5">
              {visibleFinishes.length === 0 ? (
                <p className="text-[11px] text-center py-3" style={{ color: faint }}>
                  No compatible {finishTab} finishes for this material.
                </p>
              ) : (
                visibleFinishes.map((f) => {
                  const selected = selectedFinishes.includes(f.id);
                  return (
                    <div key={f.id} className="rounded-lg overflow-hidden"
                      style={{ border: `2px solid ${selected ? f.accentColor : f.accentColor + "50"}`, transition: "border 0.15s" }}>
                      {/* Color header with swatch */}
                      <div className="px-3 py-2 flex items-center gap-2.5"
                        style={{ background: dm ? f.headerBgDark : f.headerBg }}>
                        {/* SVG Swatch */}
                        <div className="shrink-0 rounded-md overflow-hidden" style={{ width: 40, height: 40 }}>
                          <FinishSwatch name={f.name} accentColor={f.accentColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[11px] font-black" style={{ color: dm ? "#F0EFE8" : "#1A1A1C" }}>{f.name}</p>
                            {f.grade && (
                              <span className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase"
                                style={{ background: f.accentColor, color: "#fff" }}>{f.grade}</span>
                            )}
                          </div>
                          {/* See examples link */}
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(f.searchQuery)}&tbm=isch`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-0.5 mt-0.5"
                            style={{ color: f.accentColor, textDecoration: "none" }}
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="text-[9px] font-semibold">See examples</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleFinish(f.id)}
                          className="shrink-0 flex items-center justify-center rounded-md transition-all"
                          style={{
                            width: 22, height: 22,
                            background: selected ? f.accentColor : (dm ? "#28282C" : "#FFFFFF"),
                            border: `2px solid ${selected ? f.accentColor : (dm ? "#555" : "#CCC")}`,
                          }}
                        >
                          {selected && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
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
                  );
                })
              )}
            </div>

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

          {/* Start over */}
          {onStartOver && (
            <button onClick={onStartOver}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold transition-colors"
              style={{ border: `1px solid ${border}`, color: muted, background: "transparent" }}>
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default DFMFeedback;
