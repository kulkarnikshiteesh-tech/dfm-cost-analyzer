import { AlertTriangle, CheckCircle2, Info, Ruler } from "lucide-react";

interface DFMFeedbackProps {
  volumeCubicMm?: number | null;
  boundingBox?: { x: number; y: number; z: number } | null;
  hasUndercuts?: boolean | null;
  undercutSeverity?: string | null;
  undercutMessage?: string | null;
}

function getDFMIssues(vol: number, bb: { x: number; y: number; z: number }) {
  const issues = [];
  const { x, y, z } = bb;
  const maxDim = x > 0 ? Math.max(x, y, z) : Math.pow(vol, 1 / 3) * 2;
  const minDim = x > 0 ? Math.min(x, y, z) : Math.pow(vol, 1 / 3);
  const wallEst = minDim / 10;

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

const borderBySeverity: Record<string, string> = {
  high: "border-l-[#e05050]",
  moderate: "border-l-[#e0a020]",
  low: "border-l-[#4caf72]",
  unknown: "border-l-[#d0cdc8]",
};

const iconColor = {
  success: "text-[#4caf72]",
  warning: "text-[#e0a020]",
  info: "text-[#4a7ed8]",
};

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

const DFMFeedback = ({
  volumeCubicMm,
  boundingBox,
  hasUndercuts,
  undercutSeverity,
  undercutMessage,
}: DFMFeedbackProps) => {
  const hasData = !!volumeCubicMm;
  const safeBB = boundingBox || { x: 0, y: 0, z: 0 };
  const issues = hasData ? getDFMIssues(volumeCubicMm!, safeBB) : [];

  return (
    <div className="space-y-3 px-4 py-3">
      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9a9e]">
        DFM Analysis
      </h3>

      {!hasData ? (
        <div className="rounded-lg border border-dashed border-[#d8d5d0] px-4 py-8 text-center">
          <p className="text-[11px] text-[#b0ada8]">Awaiting model upload</p>
        </div>
      ) : (
        <div className="space-y-2">

          {/* Dimensions */}
          <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
              <span className="text-[11px] text-[#6a6a6e]">
                Volume:{" "}
                <span className="font-bold font-mono text-[#1a1a1c]">
                  {volumeCubicMm!.toLocaleString()} mm³
                </span>
              </span>
            </div>
            {safeBB.x > 0 && (
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
                <span className="text-[11px] text-[#6a6a6e]">
                  Box:{" "}
                  <span className="font-bold font-mono text-[#1a1a1c]">
                    {safeBB.x.toFixed(1)} × {safeBB.y.toFixed(1)} × {safeBB.z.toFixed(1)} mm
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Undercut result */}
          {undercutMessage && (
            <div className={`rounded-lg border border-[#e0deda] border-l-4 bg-[#f8f7f4] px-3 py-3 ${borderBySeverity[undercutSeverity || "low"]}`}>
              <div className="flex items-start gap-2">
                {hasUndercuts
                  ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e0a020]" />
                  : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4caf72]" />
                }
                <span className="text-[11px] leading-relaxed text-[#4a4a4e]">{undercutMessage}</span>
              </div>
            </div>
          )}

          {/* DFM checks */}
          <ul className="space-y-1.5">
            {issues.map((item, i) => {
              const Icon = icons[item.type];
              return (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2">
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconColor[item.type]}`} />
                  <span className="text-[11px] leading-snug text-[#6a6a6e]">{item.text}</span>
                </li>
              );
            })}
          </ul>

        </div>
      )}
    </div>
  );
};

export default DFMFeedback;
