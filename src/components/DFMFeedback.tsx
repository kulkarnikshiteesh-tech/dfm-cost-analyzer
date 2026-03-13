import { AlertTriangle, CheckCircle2, Info, Ruler, RotateCcw } from "lucide-react";

interface DFMFeedbackProps {
  volumeCubicMm?: number | null;
  boundingBox?: { x: number; y: number; z: number } | null;
  hasUndercuts?: boolean | null;
  undercutSeverity?: string | null;
  undercutMessage?: string | null;
  onStartOver?: () => void;
}

function getDFMIssues(vol: number, bb: { x: number; y: number; z: number }) {
  const issues = [];
  const { x, y, z } = bb;
  const maxDim = x > 0 ? Math.max(x, y, z) : Math.pow(vol, 1 / 3) * 2;
  const wallEst = (x > 0 ? Math.min(x, y, z) : Math.pow(vol, 1 / 3)) / 10;

  issues.push(
    wallEst < 1.2
      ? { type: "warning" as const, text: `Est. wall ~${wallEst.toFixed(1)}mm — min 1.2mm recommended` }
      : { type: "success" as const, text: `Wall thickness within tolerance (≥1.2mm est.)` }
  );
  issues.push(
    maxDim > 300
      ? { type: "warning" as const, text: `Part size ${maxDim.toFixed(0)}mm — large tonnage machine required` }
      : { type: "success" as const, text: `Part fits standard mold dimensions` }
  );
  const volCm3 = vol / 1000;
  if (volCm3 < 0.5) {
    issues.push({ type: "info" as const, text: `Very small part (${volCm3.toFixed(2)} cm³) — consider multi-cavity mold` });
  } else if (volCm3 > 500) {
    issues.push({ type: "warning" as const, text: `Large volume (${volCm3.toFixed(0)} cm³) — long cycle times expected` });
  } else {
    issues.push({ type: "success" as const, text: `Volume in efficient molding range` });
  }
  return issues;
}

const rowStyle = {
  success: { border: "#5BB87E", bg: "#F4FBF6", dot: "#5BB87E" },
  warning: { border: "#E0A020", bg: "#FFFBF0", dot: "#E0A020" },
  info:    { border: "#4a7ed8", bg: "#EEF2FC", dot: "#4a7ed8" },
};

const severityRowStyle: Record<string, { border: string; bg: string }> = {
  high:     { border: "#E05050", bg: "#FFF4F4" },
  moderate: { border: "#E0A020", bg: "#FFFBF0" },
  low:      { border: "#5BB87E", bg: "#F4FBF6" },
  unknown:  { border: "#D0CDC8", bg: "#F8F7F4" },
};

const DFMFeedback = ({ volumeCubicMm, boundingBox, hasUndercuts, undercutSeverity, undercutMessage, onStartOver }: DFMFeedbackProps) => {
  const hasData = !!volumeCubicMm;
  const safeBB = boundingBox || { x: 0, y: 0, z: 0 };
  const issues = hasData ? getDFMIssues(volumeCubicMm!, safeBB) : [];
  const sevStyle = severityRowStyle[undercutSeverity || "unknown"];

  return (
    <div className="space-y-3 px-4 py-4">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">DFM Analysis</p>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-[#d8d5d0] px-4 py-6 text-center">
          <p className="text-[11px] text-[#b0ada8]">Awaiting model upload</p>
        </div>
      ) : (
        <div className="space-y-2">

          {/* Dimensions card */}
          <div className="rounded-xl border border-[#e0deda] bg-[#f8f7f4] px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
              <span className="text-[11px] text-[#6a6a6e]">
                Volume: <span className="font-bold font-mono text-[#1a1a1c]">{volumeCubicMm!.toLocaleString()} mm³</span>
              </span>
            </div>
            {safeBB.x > 0 && (
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
                <span className="text-[11px] text-[#6a6a6e]">
                  Box: <span className="font-bold font-mono text-[#1a1a1c]">{safeBB.x.toFixed(1)} × {safeBB.y.toFixed(1)} × {safeBB.z.toFixed(1)} mm</span>
                </span>
              </div>
            )}
          </div>

          {/* Undercut row */}
          {undercutMessage && (
            <div
              className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
              style={{ borderLeft: `3px solid ${sevStyle.border}`, background: sevStyle.bg, border: `0.5px solid ${sevStyle.border}40` }}
            >
              {hasUndercuts
                ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: sevStyle.border }} />
                : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: sevStyle.border }} />
              }
              <span className="text-[11px] leading-relaxed text-[#4a4a4e]">{undercutMessage}</span>
            </div>
          )}

          {/* DFM check rows */}
          {issues.map((item, i) => {
            const s = rowStyle[item.type];
            return (
              <div
                key={i}
                className="rounded-xl px-3 py-2 flex items-start gap-2.5"
                style={{ borderLeft: `3px solid ${s.border}`, background: s.bg, border: `0.5px solid ${s.border}30` }}
              >
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
                <span className="text-[11px] leading-snug text-[#4a4a4e]">{item.text}</span>
              </div>
            );
          })}

          {/* Draft angle — always pinned */}
          <div className="rounded-xl px-3 py-2.5 flex items-start gap-2.5" style={{ background: "#F5F0FF", border: "0.5px solid #C4B5F4" }}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-black" style={{ background: "#9A9AFF" }}>
              ∠
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9A9AFF" }}>Draft angle tip</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#5B4BAA" }}>
                Add 1–3° draft to all vertical walls to help the part release cleanly from the mold.
              </p>
            </div>
          </div>

          {/* Start over */}
          {onStartOver && (
            <button
              onClick={onStartOver}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#e0deda] px-4 py-2.5 text-[11px] font-bold text-[#6a6a6e] hover:bg-[#f8f7f4] transition-colors"
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
