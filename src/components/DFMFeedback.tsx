import { AlertTriangle, CheckCircle2, Info, Ruler, RotateCcw } from "lucide-react";

interface DFMFeedbackProps {
  volumeCubicMm?: number | null;
  boundingBox?: { x: number; y: number; z: number } | null;
  hasUndercuts?: boolean | null;
  undercutSeverity?: string | null;
  undercutMessage?: string | null;
  onStartOver?: () => void;
  darkMode?: boolean;
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

// Light vs dark row backgrounds — keep the hue but darken for dark mode
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

const DFMFeedback = ({
  volumeCubicMm, boundingBox, hasUndercuts, undercutSeverity,
  undercutMessage, onStartOver, darkMode: dm = false,
}: DFMFeedbackProps) => {
  const hasData = !!volumeCubicMm;
  const safeBB  = boundingBox || { x: 0, y: 0, z: 0 };
  const issues  = hasData ? getDFMIssues(volumeCubicMm!, safeBB) : [];
  const sevCol  = severityColors[undercutSeverity || "unknown"];

  // Theme tokens
  const cardBg  = dm ? "#222226" : "#F8F7F4";
  const border  = dm ? "#2A2A2E" : "#E0DEDA";
  const ink     = dm ? "#F0EFE8" : "#1A1A1C";
  const muted   = dm ? "#AAA"    : "#6A6A6E";

  return (
    <div className="space-y-3 px-4 py-4">
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: dm ? "#666" : "#9A9A9E" }}>DFM Analysis</p>

      {!hasData ? (
        <div className="rounded-xl px-4 py-6 text-center" style={{ border: `1px dashed ${border}` }}>
          <p className="text-[11px]" style={{ color: dm ? "#555" : "#B0ADA8" }}>Awaiting model upload</p>
        </div>
      ) : (
        <div className="space-y-2">

          {/* Dimensions card */}
          <div className="rounded-xl px-3 py-2.5 space-y-1.5" style={{ border: `1px solid ${border}`, background: cardBg }}>
            <div className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 shrink-0" style={{ color: "#3B6BCA" }} />
              <span className="text-[11px]" style={{ color: muted }}>
                Volume: <span className="font-bold font-mono" style={{ color: ink }}>{volumeCubicMm!.toLocaleString()} mm³</span>
              </span>
            </div>
            {safeBB.x > 0 && (
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0" style={{ color: "#3B6BCA" }} />
                <span className="text-[11px]" style={{ color: muted }}>
                  Box: <span className="font-bold font-mono" style={{ color: ink }}>{safeBB.x.toFixed(1)} × {safeBB.y.toFixed(1)} × {safeBB.z.toFixed(1)} mm</span>
                </span>
              </div>
            )}
          </div>

          {/* Undercut row */}
          {undercutMessage && (
            <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5" style={{
              borderLeft: `3px solid ${sevCol.border}`,
              background: dm ? sevCol.darkBg : sevCol.lightBg,
              border: `1px solid ${sevCol.border}40`,
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
                borderLeft: `3px solid ${c.border}`,
                background: dm ? c.darkBg : c.lightBg,
                border: `1px solid ${c.border}30`,
              }}>
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.border }} />
                <span className="text-[11px] leading-snug" style={{ color: dm ? "#CCC" : "#4A4A4E" }}>{item.text}</span>
              </div>
            );
          })}

          {/* Draft angle tip — always pinned */}
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
